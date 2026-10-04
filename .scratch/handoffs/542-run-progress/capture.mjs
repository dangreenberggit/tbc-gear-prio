// Records a timed Upgrades-tab run for ticket 542 (the run progress panel).
//
// Modelled on scripts/tab-fixtures/record.mjs: the same fork harness, the same
// refusal of a dirty fork tree, and the same feral setup as the feral-p3-p2bis
// fixture (phase 3, preset tab "Phase 2", preset "BiS 6%"). A fresh headless
// profile per call keeps the run cold: the ranking cache is one MemoryStore
// per tab instance.
//
// `--mode base` records every text change of the tab's status element, which
// on the unchanged UI shows each progress event ("Simming 12/246…").
// `--mode panel` records one sample of the progress panel per change of its
// `data-*` attributes or class, taken synchronously in the observer callback,
// and the in-page t50/est50 at the first sample with done/total >= 0.5.
// Both record when "Took" appears, every announcement, long tasks and the
// run's meta.
// `--mode checks` runs plan Step 5's interactive checks (a)-(d) on a headless
// page (plan "Gate C K2 rulings": never the Claude app's Browser pane).
//
// Load control (plan "Load control for timing runs"): before the Run click a
// 60 s loadmon gate must pass (the :3333 backend idle, no foreign client); it
// is retried for up to 15 minutes, then this exits 3 without running. During
// the run loadmon samples into <out>.load.jsonl for replay.mjs's D0-D3 rules.
// `--candidates N` caps the run, and `--captures` takes the Step 5a clips,
// axe scan, style probe and 375 px check; either one makes the run untimed:
// no gate, the monitor still runs, and the trace says `timing: false`.
//
// usage: node capture.mjs --mode base|panel|checks --out <trace.json>
//          [--base http://localhost:5174] [--shots <dir>] [--candidates N]
//          [--captures]

import { execFileSync, spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { fileURLToPath, pathToFileURL } from "node:url";

import { holdKeepAwake } from "../../../scripts/tab-fixtures/keep-awake.mjs";
import {
  armRunDeadline,
  guardPage,
  withTimeout,
} from "../../../scripts/tab-fixtures/run-guard.mjs";

const H = path.dirname(fileURLToPath(import.meta.url));
const W = path.resolve(H, "../../..");
const FORK = path.join(W, "vendor", "tbc-new-fork");
const LOADMON = path.join(H, "loadmon.ps1");
const PAGE = "/tbc/druid/feralcat/";
const PHASE = 3;
const PRESET_TAB = "Phase 2";
const PRESET = "BiS 6%";
const GEAR_FILE = "ui/druid/feralcat/gear_sets/p2_6p.gear.json";
const ITERATIONS = 3000;
const RUN_LIMIT_MS = 25 * 60 * 1000;
const CALL_TIMEOUT_MS = 90 * 1000;
const GATE_SECONDS = 60;
const GATE_RETRY_WAIT_MS = 60 * 1000;
const GATE_GIVE_UP_MS = 15 * 60 * 1000;
const WIDTH = 1280;
const HEIGHT = 900;
const PANEL = ".upgrades-run-progress";
const TAB = "#upgrades-tab";
const TICKET = "542";
// Plan Step 6 (round 3, with Gate B round-3 ruling F7).
const ACCEPTANCE =
  "At 1280 px, mid-run, the progress component sits at the top of the results area and spans its width. It reads as the Bulk Sim dialog laid out for the tab: a title over a divider; on the left, the phase name over a bar that spans the column, with the done/total count under it; on the right, Elapsed Time, rows landed and time remaining, and a Stop button with the Bulk dialog's cancel styling. Before the first sim count the bar shows moving stripes, not a filled bar. From the first count it is the Bulk dialog's green bar at the done/total width. Two differences from the Bulk dialog are deliberate: the count under the bar is a lighter grey, for contrast, and the title is left-aligned, for the wide layout. The phase names follow the run (preparing, Simming candidates, Measuring set bonuses, Re-simming the top rows). Rows appear in the table under the component as they finish, with no empty status row above the component. The component covers and dims nothing. Fact `panelFits375` is true: at 375 px the progress component itself fits the viewport width.";

function parseArgs(argv) {
  const out = { base: "http://localhost:5174", captures: false };
  const keys = {
    "--base": "base",
    "--mode": "mode",
    "--out": "out",
    "--shots": "shots",
    "--candidates": "candidates",
  };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--captures") out.captures = true;
    else if (keys[argv[i]]) out[keys[argv[i]]] = argv[++i];
    else throw new Error(`unknown argument ${argv[i]}`);
  }
  if (!["base", "panel", "checks"].includes(out.mode))
    throw new Error("--mode must be base, panel or checks");
  if (!out.out) throw new Error("--out is required");
  if (out.candidates !== undefined) {
    out.candidates = Number(out.candidates);
    if (!Number.isInteger(out.candidates) || out.candidates <= 0)
      throw new Error("--candidates must be a positive integer");
  }
  if (out.captures && out.mode !== "panel")
    throw new Error("--captures needs --mode panel");
  if (out.captures && !out.shots) throw new Error("--captures needs --shots");
  if (out.mode === "checks" && out.candidates === undefined)
    throw new Error("--mode checks needs --candidates");
  out.out = path.resolve(out.out);
  if (out.shots) out.shots = path.resolve(out.shots);
  return out;
}

const git = (...args) =>
  execFileSync("git", ["-C", FORK, ...args], { encoding: "utf8" }).trim();

function loadmonArgs(chromePid, out, gateSeconds) {
  return [
    "-NoProfile",
    "-ExecutionPolicy",
    "Bypass",
    "-File",
    LOADMON,
    "-ChromePid",
    String(chromePid),
    "-Out",
    out,
    "-GateSeconds",
    String(gateSeconds),
  ];
}

async function gateUntilQuiet(chromePid, gateLog, log) {
  const started = Date.now();
  for (let attempt = 1; ; attempt++) {
    const r = spawnSync(
      "powershell.exe",
      loadmonArgs(chromePid, gateLog, GATE_SECONDS),
      { stdio: "inherit", windowsHide: true }
    );
    log(`gate ${attempt}: loadmon exit ${r.status}`);
    if (r.status === 0) return 0;
    if (r.status === 2) return 2;
    if (Date.now() - started + GATE_RETRY_WAIT_MS >= GATE_GIVE_UP_MS) return 3;
    await sleep(GATE_RETRY_WAIT_MS);
  }
}

// Installed in the same evaluate as the Run click, so t = 0 is the click.
// Panel samples are taken synchronously in the observer callback, so a
// sample's t and values do not wait on the Node side (plan round-2 N8).
const OBSERVE_AND_CLICK = (mode) => `(() => {
  const btn = document.querySelector('.upgrades-run-button');
  if (!btn) return { error: 'run button not found' };
  const tab = document.querySelector('${TAB}');
  const cap = window.__cap542 = { mode: ${JSON.stringify(mode)}, t0: performance.now(), t0Epoch: Date.now(), records: [], announces: [], panel: [], endT: null, endText: null, t50: null, est50: null, i50: null, longTasks: null };
  const now = () => performance.now() - cap.t0;
  if (PerformanceObserver.supportedEntryTypes && PerformanceObserver.supportedEntryTypes.includes('longtask')) {
    cap.longTasks = [];
    new PerformanceObserver(list => {
      for (const e of list.getEntries()) cap.longTasks.push({ start: e.startTime - cap.t0, dur: e.duration });
    }).observe({ type: 'longtask' });
  }
  if (cap.mode === 'panel') {
    const p = tab.querySelector('${PANEL}');
    if (!p) return { error: 'no ${PANEL}' };
    const status = tab.querySelector('.upgrades-status');
    const num = v => (v === undefined ? null : Number(v));
    const notify = typeof window.__cap542Notify === 'function' ? window.__cap542Notify : null;
    const fired = {};
    const fire = (key, i, t) => {
      if (fired[key]) return;
      fired[key] = true;
      if (notify) notify(JSON.stringify({ key, i, t }));
    };
    const sample = () => {
      const d = p.dataset;
      const bar = p.querySelector('[role=progressbar]');
      const cs = getComputedStyle(bar);
      const rem = p.querySelector('.upgrades-run-progress-remaining');
      const s = {
        t: now(),
        phase: d.phase ?? null,
        done: num(d.done),
        total: num(d.total),
        boundary: num(d.boundary),
        remainingMs: num(d.remainingMs),
        remainingText: rem.classList.contains('d-none') ? null : rem.textContent,
        rows: p.querySelector('.upgrades-run-progress-rows').textContent,
        elapsedText: p.querySelector('.upgrades-run-progress-elapsed').textContent,
        hidden: p.classList.contains('d-none'),
        hasValueNow: bar.hasAttribute('aria-valuenow'),
        barAnim: cs.animationName,
        barImg: cs.backgroundImage.slice(0, 22),
        qualifyingRows: num(d.qualifyingRows),
        concurrency: num(d.concurrency),
        statusHidden: status ? status.classList.contains('d-none') : null,
      };
      cap.panel.push(s);
      const i = cap.panel.length - 1;
      if (cap.t50 === null && s.done !== null && s.total > 0 && s.done / s.total >= 0.5) {
        cap.t50 = s.t;
        cap.est50 = s.remainingMs;
        cap.i50 = i;
        if (!s.hidden) fire('half', i, s.t);
      }
      if (!s.hidden && (s.phase === 'preparing' || s.phase === 'set-bonuses' || s.phase === 'replication')) fire(s.phase, i, s.t);
      // A capped run reaches 50% near the end of its candidates, so the 50%
      // clip can land in the next phase; this one shows "Simming candidates"
      // with the remaining time on screen.
      if (!s.hidden && s.phase === 'candidates' && s.remainingMs !== null) fire('candidates', i, s.t);
    };
    new MutationObserver(sample).observe(p, { attributes: true });
  }
  let lastStatus = null, lastAnnounce = null;
  const look = () => {
    const t = now();
    if (cap.mode === 'base') {
      const s = tab.querySelector('.upgrades-status');
      const text = s ? s.textContent : null;
      if (text !== lastStatus) { lastStatus = text; cap.records.push({ t, text }); }
    }
    const a = tab.querySelector('.upgrades-status-announce');
    const at = a ? a.textContent : null;
    if (at !== lastAnnounce) { lastAnnounce = at; cap.announces.push({ t, text: at }); }
    if (cap.endT === null) {
      const b = tab.querySelector('.upgrades-baseline-summary');
      const bt = b ? b.textContent : '';
      if (/Took/.test(bt)) { cap.endT = t; cap.endText = bt; obs.disconnect(); }
    }
  };
  const obs = new MutationObserver(look);
  obs.observe(tab, { subtree: true, childList: true, characterData: true, attributes: true });
  btn.click();
  look();
  return { ok: true };
})()`;

// Plan round-2 N8 style probe, with round-3's "drop the title text-align
// pair": a hidden real Bootstrap modal next to the panel, compared property
// by property.
const STYLE_PROBE = `(() => {
  const p = document.querySelector('${PANEL}');
  const probe = document.createElement('div');
  probe.className = 'modal progress-tracker-modal';
  probe.style.display = 'block';
  probe.style.visibility = 'hidden';
  probe.innerHTML = '<div class="modal-dialog"><div class="modal-content"><div class="modal-header"><h5 class="modal-title">Probe</h5></div><div class="modal-body"></div></div></div>';
  document.body.appendChild(probe);
  const pick = (el, props) => { const cs = getComputedStyle(el); return Object.fromEntries(props.map(k => [k, cs.getPropertyValue(k)])); };
  const box = ['background-color', 'border-top-color', 'border-top-width', 'border-top-left-radius'];
  const header = ['border-bottom-color', 'border-bottom-width'];
  const title = ['font-size', 'font-weight'];
  const ref = {
    box: pick(probe.querySelector('.modal-content'), box),
    header: pick(probe.querySelector('.modal-header'), header),
    title: pick(probe.querySelector('.modal-title'), title),
  };
  const ours = {
    box: pick(p, box),
    header: pick(p.querySelector('.modal-header'), header),
    title: pick(p.querySelector('.modal-title'), title),
  };
  probe.remove();
  const pairs = {};
  for (const part of ['box', 'header', 'title'])
    for (const k of Object.keys(ref[part])) pairs[part + ' ' + k] = { bulk: ref[part][k], panel: ours[part][k], equal: ref[part][k] === ours[part][k] };
  return { pairs, allEqual: Object.values(pairs).every(x => x.equal), panelHidden: p.classList.contains('d-none'), phase: p.dataset.phase ?? null };
})()`;

const PANEL_FACTS = `(() => {
  const p = document.querySelector('${PANEL}');
  const ref = document.createElement('span');
  ref.style.color = 'var(--bs-gray-500)';
  p.appendChild(ref);
  const gray500 = getComputedStyle(ref).color;
  ref.remove();
  const countColor = getComputedStyle(p.querySelector('.progress-tracker-modal-progress-text')).color;
  const live = '[aria-live],[role=status],[role=alert],[role=log],[role=marquee],[role=timer]';
  return {
    panelAriaLive: (p.matches('[aria-live]') ? 1 : 0) + p.querySelectorAll('[aria-live]').length,
    panelRoleTimer: p.querySelectorAll('[role=timer]').length,
    panelInLiveRegion: p.closest(live) !== null,
    countColor,
    gray500,
    reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
    progressbarAriaLabel: p.querySelector('[role=progressbar]').getAttribute('aria-label'),
    panelHidden: p.classList.contains('d-none'),
    phase: p.dataset.phase ?? null,
  };
})()`;

/** Loads the feral page and applies the fixed setup; returns the browser env. */
async function setupPage({ send, evaluate, activateTabExpression, args, log, expectNames }) {
  const url = `${args.base}${PAGE}`;
  log("opening", url);
  await send("Page.navigate", { url });
  await sleep(5000);

  const setPhase = async () => {
    const r = await evaluate(
      send,
      `(async () => {
        const end = Date.now() + 15000;
        let s; while (!(s = document.getElementById('phase-selector')) && Date.now() < end) await new Promise(r => setTimeout(r, 100));
        if (!s) return { error: 'no #phase-selector' };
        s.value = ${JSON.stringify(String(PHASE))};
        s.dispatchEvent(new Event('change', { bubbles: true }));
        await new Promise(r => setTimeout(r, 1500));
        return { after: document.getElementById('phase-selector').value };
      })()`
    );
    if (r?.error) throw new Error(r.error);
    if (r.after !== String(PHASE))
      throw new Error(`phase did not stick: ${JSON.stringify(r)}`);
  };
  await setPhase();
  const loaded = await evaluate(
    send,
    `(async () => {
      const tab = [...document.querySelectorAll('.preset-group-phase-tab')].find(t => t.textContent.trim() === ${JSON.stringify(PRESET_TAB)});
      if (!tab) return { error: 'no preset phase tab' };
      tab.click();
      await new Promise(r => setTimeout(r, 400));
      const chips = [...document.querySelector('.preset-group-picker').querySelectorAll('.preset-group-section')]
        .filter(s => s.querySelector('h6')?.textContent.trim() === 'Gear Sets')
        .flatMap(s => [...s.querySelectorAll('.saved-data-set-chip')])
        .filter(c => c.offsetParent);
      const chip = chips.find(c => c.textContent.trim() === ${JSON.stringify(PRESET)});
      if (!chip) return { error: 'no Gear Sets chip; visible: ' + chips.map(c => c.textContent.trim()).join(', ') };
      (chip.querySelector('.saved-data-set-name') ?? chip).click();
      await new Promise(r => setTimeout(r, 1500));
      return { ok: true };
    })()`
  );
  if (loaded?.error) throw new Error(loaded.error);
  await setPhase();

  const act = await evaluate(send, activateTabExpression());
  if (act?.error) throw new Error(act.error);

  const gearNames = `[...document.querySelectorAll('.item-picker-root')].map(e => e.innerText.split('\\n')[0]).filter(Boolean).join(' | ')`;
  let missing = expectNames;
  for (let i = 0; i < 30 && missing.length; i++) {
    await sleep(1000);
    const worn = await evaluate(send, gearNames);
    missing = expectNames.filter((n) => !worn.includes(n));
  }
  if (missing.length)
    throw new Error(`gear not loaded; missing ${missing.join(", ")}`);

  const iterations = await evaluate(
    send,
    `(() => {
      const input = document.querySelector('.upgrades-iterations-picker input');
      if (!input) return null;
      if (input.value !== ${JSON.stringify(String(ITERATIONS))}) {
        input.value = ${JSON.stringify(String(ITERATIONS))};
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }
      return input.value;
    })()`
  );
  if (iterations !== String(ITERATIONS))
    throw new Error(`iterations field reads ${iterations}`);

  if (args.candidates !== undefined) {
    const r = await evaluate(
      send,
      `(async () => {
        const input = document.querySelector('.upgrades-candidates-picker input');
        if (!input) return { error: 'no candidates input' };
        const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        set.call(input, '${args.candidates}');
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        await new Promise(r => setTimeout(r, 400));
        return { settled: document.querySelector('.upgrades-candidates-picker input').value };
      })()`
    );
    if (r?.error || r.settled !== String(args.candidates))
      throw new Error(`candidates did not stick: ${JSON.stringify(r)}`);
  }

  return evaluate(
    send,
    `({ hardwareConcurrency: navigator.hardwareConcurrency, deviceMemory: navigator.deviceMemory ?? null, wasmConcurrencySetting: localStorage.getItem('__tbc_new_wasmconcurrency'), runnerKey: localStorage.getItem('upgradesTab.runner') })`
  );
}

/** Waits for `expression` to return a truthy value; returns it, or null on timeout. */
async function waitFor(evaluate, send, expression, ms, every = 100) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    const v = await evaluate(send, expression);
    if (v) return v;
    await sleep(every);
  }
  return null;
}

/**
 * Plan Step 5 interactive checks (a)-(c) and R4-d-4 check (d), each on a
 * fresh load of the feral page with the fixed setup and `--candidates`.
 */
async function runChecks({ send, evaluate, setup, log }) {
  const out = {};
  const runEnded = `(() => { const b = document.querySelector('.upgrades-baseline-summary'); return b && /Took|Stopped early/.test(b.textContent) ? b.textContent.trim() : null; })()`;
  const clickRun = async () => {
    const r = await evaluate(send, `(() => { const b = document.querySelector('.upgrades-run-button'); if (!b) return { error: 'no run button' }; b.click(); return { ok: true }; })()`);
    if (r?.error) throw new Error(r.error);
  };
  const doneNow = `(() => { const p = document.querySelector('${PANEL}'); return p && p.dataset.done !== undefined ? Number(p.dataset.done) : null; })()`;

  // (a) focus survives progress events; (b) the panel's Stop stops the run.
  await setup();
  await clickRun();
  const d0 = await waitFor(evaluate, send, doneNow, 60000);
  const focused = await evaluate(send, `(() => { const b = document.querySelector('.upgrades-run-progress-stop'); b.focus(); return document.activeElement === b; })()`);
  let d1 = d0;
  const grewEnd = Date.now() + 60000;
  while (Date.now() < grewEnd && d0 !== null) {
    d1 = await evaluate(send, doneNow);
    if (d1 !== null && d1 >= d0 + 3) break;
    if (await evaluate(send, runEnded)) break;
    await sleep(50);
  }
  const a = await evaluate(send, `(() => { const b = document.querySelector('.upgrades-run-progress-stop'); return { activeIsStop: document.activeElement === b, activeClass: document.activeElement ? document.activeElement.className : null, hidden: document.querySelector('${PANEL}').classList.contains('d-none') }; })()`);
  out.a = { d0, d1, focusedAtStart: focused, ...a, pass: focused === true && d0 !== null && d1 >= d0 + 3 && a.activeIsStop && !a.hidden };
  log(`check (a): ${JSON.stringify(out.a)}`);

  const box = await evaluate(send, `(() => { const b = document.querySelector('.upgrades-run-progress-stop'); b.scrollIntoView({ block: 'center' }); const r = b.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, disabled: b.disabled }; })()`);
  await sleep(100);
  const dAtStop = await evaluate(send, doneNow);
  for (const type of ["mousePressed", "mouseReleased"])
    await send("Input.dispatchMouseEvent", { type, x: box.x, y: box.y, button: "left", clickCount: 1 });
  const stopped = await waitFor(evaluate, send, runEnded, 120000, 200);
  const b = await evaluate(send, `(() => ({ hidden: document.querySelector('${PANEL}').classList.contains('d-none'), statusHidden: document.querySelector('.upgrades-status').classList.contains('d-none') }))()`);
  out.b = { dAtStop, stopButtonDisabledBefore: box.disabled, summary: stopped, ...b, pass: b.hidden && typeof stopped === "string" && stopped.startsWith("Stopped early.") };
  log(`check (b): ${JSON.stringify(out.b)}`);

  // (c) a Sources tick during the run leaves the stale warning visible after.
  await setup();
  await clickRun();
  await waitFor(evaluate, send, doneNow, 60000);
  const toggled = await evaluate(send, `(() => {
    const input = document.querySelector('.upgrades-sources-modal .upgrades-source-row input[type=checkbox]');
    if (!input) return { error: 'no Sources checkbox' };
    const before = input.checked;
    input.click();
    return { source: input.closest('.upgrades-source-row').dataset.source, before, after: input.checked, panelPhase: document.querySelector('${PANEL}').dataset.phase };
  })()`);
  if (toggled?.error) throw new Error(toggled.error);
  const endedC = await waitFor(evaluate, send, runEnded, 300000, 250);
  await sleep(300);
  const c = await evaluate(send, `(() => {
    const s = document.querySelector('.upgrades-status');
    const w = s.querySelector('.text-warning');
    const r = w ? w.getBoundingClientRect() : null;
    return { statusHasDNone: s.classList.contains('d-none'), warningText: w ? w.textContent.trim() : null, warningVisible: !!(w && w.offsetParent !== null && r.width > 0 && r.height > 0), panelHidden: document.querySelector('${PANEL}').classList.contains('d-none') };
  })()`);
  out.c = { toggled, summary: endedC, ...c, pass: !c.statusHasDNone && c.warningVisible };
  log(`check (c): ${JSON.stringify(out.c)}`);

  // (d) R4-d-4: the panel's phase, remaining and qualifying rows over a run.
  await setup();
  const installed = await evaluate(send, `(() => {
    const p = document.querySelector('${PANEL}');
    if (!p) return { error: 'no panel' };
    window.__r4d = [];
    new MutationObserver(() => window.__r4d.push({ t: performance.now(), phase: p.dataset.phase, rem: p.dataset.remainingMs, q: p.dataset.qualifyingRows, done: p.dataset.done, hidden: p.classList.contains('d-none') })).observe(p, { attributes: true });
    return { ok: true };
  })()`);
  if (installed?.error) throw new Error(installed.error);
  await clickRun();
  const endedD = await waitFor(evaluate, send, runEnded, 300000, 250);
  await sleep(300);
  const log4d = await evaluate(send, `window.__r4d`);
  const shown = log4d.filter((x) => !x.hidden);
  const last = shown[shown.length - 1] ?? null;
  const phases = [...new Set(shown.map((x) => x.phase))];
  const rankingSample = shown.find((x) => x.phase === "ranking") ?? null;
  let verdict;
  if (!last) verdict = "no samples";
  else if (Number(last.q) === 0)
    verdict = !phases.includes("replication") && rankingSample && rankingSample.rem === "0" ? "pass (q 0)" : "fail (q 0)";
  else verdict = "n/a (q > 0)";
  out.d = { summary: endedD, samples: log4d.length, phases, last, rankingSample, verdict };
  log(`check (d): ${JSON.stringify({ ...out.d, samples: log4d.length })}`);
  out.d.log = log4d;
  await send("Page.navigate", { url: "about:blank" });
  return out;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const timing = args.candidates === undefined && !args.captures;
  const label = `capture ${path.basename(args.out)}`;
  const log = (...a) => console.log(`[${label}]`, ...a);
  if (git("status", "--porcelain")) {
    console.error(
      "capture: vendor/tbc-new-fork has uncommitted changes; commit them first so the trace names a real commit."
    );
    return 2;
  }
  const forkHead = git("rev-parse", "HEAD");
  const expectIds = JSON.parse(
    fs.readFileSync(path.join(FORK, GEAR_FILE), "utf8")
  )
    .items.filter((i) => i && i.id)
    .map((i) => i.id);
  const db = new Map(
    JSON.parse(
      fs.readFileSync(path.join(FORK, "assets/database/db.json"), "utf8")
    ).items.map((i) => [i.id, i.name])
  );
  const expectNames = expectIds.map((id) => db.get(id)).filter(Boolean);

  const harness = await import(
    pathToFileURL(path.join(FORK, "test-tab-harness.mjs")).href
  );
  const { launchChrome, cdp, attachPage, evaluate, activateTabExpression, axeRun } =
    harness;

  fs.mkdirSync(path.dirname(args.out), { recursive: true });
  if (args.shots) fs.mkdirSync(args.shots, { recursive: true });
  const loadOut = args.out.replace(/\.json$/, "") + ".load.jsonl";
  const gateLog = path.join(
    process.env.TEMP ?? H,
    `542-gate-${path.basename(args.out, ".json")}-${Date.now()}.jsonl`
  );
  const releaseKeepAwake = await holdKeepAwake(label);
  const chrome = await launchChrome();
  const client = cdp(chrome.wsUrl);
  let disarmDeadline = () => {};
  let monitor = null;
  const stopMonitor = () => {
    if (monitor && monitor.exitCode === null)
      spawnSync("taskkill", ["/PID", String(monitor.pid), "/T", "/F"], {
        stdio: "ignore",
      });
  };
  try {
    await withTimeout(client.ready, CALL_TIMEOUT_MS, "the CDP connection");
    const guard = guardPage(client, { callTimeoutMs: CALL_TIMEOUT_MS });
    const page = await withTimeout(
      attachPage(client),
      CALL_TIMEOUT_MS,
      "attaching to the page"
    );
    const send = guard.wrap(page.send);
    const browserSend = guard.wrap(client.send);
    await send("Inspector.enable", {});
    const desktop = () =>
      send("Emulation.setDeviceMetricsOverride", {
        width: WIDTH,
        height: HEIGHT,
        deviceScaleFactor: 1,
        mobile: false,
      });
    await desktop();
    await browserSend("Target.activateTarget", { targetId: page.targetId });
    await send("Emulation.setFocusEmulationEnabled", { enabled: true });
    const setup = () =>
      setupPage({ send, evaluate, activateTabExpression, args, log, expectNames });

    if (args.mode === "checks") {
      const checks = await runChecks({ send, evaluate, setup, log });
      if (git("rev-parse", "HEAD") !== forkHead || git("status", "--porcelain"))
        throw new Error("vendor/tbc-new-fork changed during the checks");
      fs.writeFileSync(
        args.out,
        JSON.stringify(
          {
            meta: { date: new Date().toISOString(), base: args.base, mode: "checks", candidates: args.candidates, forkHead, forkDirty: false, page: PAGE, phase: PHASE, preset: `${PRESET_TAB} / ${PRESET}`, method: "headless Chrome over CDP (capture.mjs --mode checks), not the Browser pane" },
            ...checks,
          },
          null,
          1
        ) + "\n"
      );
      log(`wrote ${args.out}`);
      return ["a", "b", "c"].every((k) => checks[k].pass) ? 0 : 1;
    }

    const notes = [];
    if (args.captures) {
      await send("Runtime.addBinding", { name: "__cap542Notify" });
      client.onEvent((msg) => {
        if (msg.method === "Runtime.bindingCalled" && msg.params?.name === "__cap542Notify")
          notes.push(JSON.parse(msg.params.payload));
      });
    }

    const env = await setup();
    // The tab's runner with no saved setting (makeSimRunner, bulk off):
    // WorkerPoolSimRunner(max(2, min(4, hc, memCap))), whose concurrency is
    // min(numWorkers, memCap); memCap = floor(deviceMemory GiB * 512 / 183.8).
    const memCap =
      env.deviceMemory == null
        ? 4
        : Math.max(1, Math.floor((env.deviceMemory * 1024) / 2 / 183.8));
    const numWorkers = Math.max(
      2,
      Math.min(4, env.hardwareConcurrency || 4, memCap)
    );
    const N = Math.max(1, Math.min(numWorkers, memCap));

    if (timing) {
      log(`load gate: ${GATE_SECONDS} s quiet window, up to 15 min`);
      const g = await gateUntilQuiet(chrome.proc.pid, gateLog, log);
      if (g === 2) {
        console.error("capture: nothing listens on :3333");
        return 5;
      }
      if (g === 3) {
        console.error(
          `capture: backend busy -- no quiet ${GATE_SECONDS} s window in 15 minutes (gate log ${gateLog})`
        );
        return 3;
      }
    }

    // The panel appears where the status slot is; with that slot in view
    // first, a clip needs no scroll and so no paint wait, which matters for
    // the short preparing phase.
    if (args.captures)
      await evaluate(
        send,
        `document.querySelector('${TAB} .upgrades-status').scrollIntoView({ block: 'start' })`
      );

    fs.rmSync(loadOut, { force: true });
    monitor = spawn("powershell.exe", loadmonArgs(chrome.proc.pid, loadOut, 0), {
      stdio: "ignore",
      windowsHide: true,
    });
    await sleep(1500);

    // Step 5a capture work. Phase clips run before the slower checks queued
    // at the 50% sample, so a short phase is not lost behind them.
    const shots = { files: [], errors: [], captures: {}, facts: {} };
    const heavy = [];
    const clip = async (sel, file, expectPhase) => {
      const before = await evaluate(
        send,
        `(() => {
          const el = document.querySelector(${JSON.stringify(sel)});
          const p = document.querySelector('${PANEL}');
          if (!el) return null;
          let r = el.getBoundingClientRect();
          const inView = r.top >= 0 && r.bottom <= innerHeight && r.width > 0 && r.height > 0;
          if (!inView) { el.scrollIntoView({ block: 'start' }); r = el.getBoundingClientRect(); }
          return { x: r.left + scrollX, y: r.top + scrollY, width: r.width, height: r.height, scrolled: !inView, inViewAfter: r.top >= 0 && r.bottom <= innerHeight, phase: p.dataset.phase ?? null, hidden: p.classList.contains('d-none'), done: p.dataset.done ?? null };
        })()`
      );
      if (!before || before.width === 0 || before.height === 0) {
        shots.errors.push(`${file}: selector missing or zero-size: ${sel}`);
        return { missed: true, reason: "zero-size", before };
      }
      if (before.hidden || (expectPhase && before.phase !== expectPhase))
        return { missed: true, reason: `phase was ${before.hidden ? "hidden" : before.phase} at clip time`, before };
      if (before.scrolled) await sleep(150);
      const { data } = await send("Page.captureScreenshot", {
        format: "png",
        clip: { x: before.x, y: before.y, width: before.width, height: before.height, scale: 1 },
        captureBeyondViewport: !before.inViewAfter,
      });
      fs.writeFileSync(path.join(args.shots, file), Buffer.from(data, "base64"));
      shots.files.push(file);
      const after = await evaluate(
        send,
        `(() => { const p = document.querySelector('${PANEL}'); return { phase: p.dataset.phase ?? null, done: p.dataset.done ?? null, hidden: p.classList.contains('d-none') }; })()`
      );
      return { file, phaseBefore: before.phase, doneBefore: before.done, phaseAfter: after.phase, doneAfter: after.done, hiddenAfter: after.hidden };
    };
    const job = (name, fn) => async () => {
      try {
        await fn();
      } catch (err) {
        shots.errors.push(`${name}: ${err?.message ?? err}`);
      }
    };
    const handleNote = async (n) => {
      const at = { sampleIndex: n.i, sampleT: n.t };
      if (["preparing", "candidates", "set-bonuses", "replication"].includes(n.key)) {
        shots.captures[n.key] = { ...at, ...(await clip(PANEL, `${TICKET}-${n.key}-${WIDTH}-panel.png`, n.key)) };
      } else if (n.key === "half") {
        shots.captures.half = {
          ...at,
          panel: await clip(PANEL, `${TICKET}-half-${WIDTH}-panel.png`, null),
          tab: await clip(TAB, `${TICKET}-half-${WIDTH}-tab.png`, null),
        };
        heavy.push(
          job("axe", async () => {
            const r = await axeRun(send, PANEL);
            const p = await evaluate(send, `document.querySelector('${PANEL}').dataset.phase ?? null`);
            shots.a11y = { scope: PANEL, state: "mid-run", width: WIDTH, phase: p, ms: r.ms, error: r.error ?? null, violations: r.violations };
          }),
          job("panel facts", async () => {
            Object.assign(shots.facts, await evaluate(send, PANEL_FACTS));
            const { root } = await send("DOM.getDocument", { depth: 0 });
            const { nodeId } = await send("DOM.querySelector", { nodeId: root.nodeId, selector: `${PANEL} [role=progressbar]` });
            const ax = await send("Accessibility.getPartialAXTree", { nodeId, fetchRelatives: false });
            const node = ax.nodes.find((x) => x.role?.value === "progressbar") ?? ax.nodes[0];
            shots.facts.progressbarName = node?.name?.value ?? null;
            shots.facts.progressbarRole = node?.role?.value ?? null;
          }),
          job("style probe", async () => {
            shots.facts.styleProbe = await evaluate(send, STYLE_PROBE);
          }),
          job("375 check", async () => {
            // Mobile emulation, as the plan says. A page wider than the
            // device zooms out to fit, which also makes scrollWidth equal
            // innerWidth, so the layout width and the outermost elements
            // past 375 px are recorded too, and the same check is repeated
            // without mobile emulation, where an overflow scrolls instead.
            const measure = `(() => {
              const p = document.querySelector('${PANEL}');
              const r = p.getBoundingClientRect();
              const over = [];
              for (const el of document.querySelectorAll('body *')) {
                const b = el.getBoundingClientRect();
                if (b.width === 0 || b.right <= 376) continue;
                const pb = el.parentElement ? el.parentElement.getBoundingClientRect() : null;
                if (pb && pb.right > 376) continue;
                over.push({ tag: el.tagName.toLowerCase(), cls: String(el.className).slice(0, 80), left: Math.round(b.left), right: Math.round(b.right) });
              }
              return { innerWidth, scrollWidth: document.documentElement.scrollWidth, panelLeft: Math.round(r.left), panelRight: Math.round(r.right), panelWidth: Math.round(r.width), panelHidden: p.classList.contains('d-none'), phase: p.dataset.phase ?? null, outermostPast375: over.slice(0, 10) };
            })()`;
            const at = {};
            for (const mobile of [true, false]) {
              await send("Emulation.setDeviceMetricsOverride", { width: 375, height: 812, deviceScaleFactor: 1, mobile });
              await sleep(1500);
              at[mobile ? "mobile" : "desktopEmulation"] = await evaluate(send, measure);
            }
            await desktop();
            await sleep(300);
            shots.facts.at375 = at;
            shots.facts.noHScroll375 = at.mobile.scrollWidth <= at.mobile.innerWidth;
            shots.facts.layoutWidth375 = at.mobile.innerWidth;
            const d = at.desktopEmulation;
            shots.facts.panelFits375 = !d.panelHidden && d.panelLeft >= 0 && d.panelRight <= 375;
          })
        );
      }
    };

    guard.armNavigation();
    disarmDeadline = armRunDeadline(RUN_LIMIT_MS, chrome.kill, label);
    const clicked = await evaluate(send, OBSERVE_AND_CLICK(args.mode));
    if (clicked?.error) throw new Error(clicked.error);
    const startedAt = Date.now();
    log("run started");
    let endT = null;
    while (Date.now() - startedAt < RUN_LIMIT_MS) {
      if (args.captures) {
        if (notes.length) {
          await handleNote(notes.shift());
          continue;
        }
        if (heavy.length) {
          await heavy.shift()();
          continue;
        }
        await sleep(100);
      } else {
        await sleep(5000);
      }
      endT = await evaluate(send, `window.__cap542.endT`);
      if (endT !== null) break;
    }
    if (endT === null)
      throw new Error(`run did not settle in ${RUN_LIMIT_MS / 60000} min`);
    stopMonitor();
    if (!fs.existsSync(loadOut) || fs.statSync(loadOut).size === 0)
      throw new Error(`loadmon wrote no samples to ${loadOut}`);
    // Notes that arrived after the run ended are clipped too late to count.
    for (const n of notes) shots.captures[n.key] ??= { missed: true, reason: "run ended before the clip", sampleIndex: n.i };
    if (heavy.length) shots.errors.push(`${heavy.length} checks queued at the 50% sample did not run before the run ended`);
    const cap = await evaluate(
      send,
      `JSON.parse(JSON.stringify(window.__cap542))`
    );
    log("settled:", cap.endText.trim(), `${Math.round(cap.endT / 1000)}s`);
    if (git("status", "--porcelain"))
      throw new Error("vendor/tbc-new-fork changed during the run");
    if (git("rev-parse", "HEAD") !== forkHead)
      throw new Error("vendor/tbc-new-fork HEAD moved during the run");

    const trace = {
      meta: {
        date: new Date().toISOString(),
        base: args.base,
        mode: args.mode,
        timing,
        captures: args.captures,
        candidates: args.candidates ?? null,
        forkHead,
        forkDirty: false,
        page: PAGE,
        phase: PHASE,
        preset: `${PRESET_TAB} / ${PRESET}`,
        iterations: ITERATIONS,
        chromePid: chrome.proc.pid,
        hardwareConcurrency: env.hardwareConcurrency,
        deviceMemory: env.deviceMemory,
        wasmConcurrencySetting: env.wasmConcurrencySetting,
        runnerKey: env.runnerKey,
        N,
        loadFile: path.basename(loadOut),
      },
      t0Epoch: cap.t0Epoch,
      endT: cap.endT,
      endText: cap.endText,
      t50: cap.t50,
      est50: cap.est50,
      i50: cap.i50,
      records: cap.records,
      panel: cap.panel,
      announces: cap.announces,
      longTasks: cap.longTasks,
    };
    fs.writeFileSync(args.out, JSON.stringify(trace, null, 1) + "\n");
    log(
      `wrote ${args.out} (${trace.records.length} status records, ${trace.panel.length} panel samples, ${trace.longTasks === null ? "no" : trace.longTasks.length} long tasks, N=${N})`
    );

    if (args.captures) {
      const rel = path.relative(args.shots, args.out).replace(/\\/g, "/");
      const index = {
        forkHead,
        forkDirty: false,
        generatedAt: new Date().toISOString(),
        manifest: "manifest.json",
        trace: rel,
        entries: [
          { ticket: TICKET, state: "mid-run", width: WIDTH, files: shots.files, errors: shots.errors },
        ],
      };
      const facts = {
        source: `capture.mjs --mode panel --captures (${rel}); replay.mjs --shown adds the trace-derived facts`,
        ...shots.facts,
        countColorIsGray500: shots.facts.countColor !== undefined && shots.facts.countColor === shots.facts.gray500,
        styleProbeAllEqual: shots.facts.styleProbe?.allEqual ?? null,
        captures: shots.captures,
      };
      const manifest = {
        note: "Plan Step 6: mid-run captures from capture.mjs --captures on the Step 5a dry run. tab-review has no running state (plan C26), so state \"mid-run\" is a stated deviation from the test-review.mjs schema. 375 px is the noHScroll375 fact only (Gate B round-3 ruling F1).",
        entries: [
          {
            ticket: TICKET,
            state: "mid-run",
            widths: [WIDTH],
            capture: [PANEL, TAB],
            facts: {},
            acceptance: ACCEPTANCE,
          },
        ],
      };
      const write = (name, v) =>
        fs.writeFileSync(path.join(args.shots, name), JSON.stringify(v, null, 2) + "\n");
      write("index.json", index);
      write("facts.json", facts);
      write("a11y.json", shots.a11y ?? { scope: PANEL, error: "axe did not run" });
      write("manifest.json", manifest);
      log(`captures: ${shots.files.join(", ")}; errors: ${shots.errors.length ? shots.errors.join("; ") : "none"}`);
    }
    return 0;
  } finally {
    stopMonitor();
    disarmDeadline();
    client.close();
    chrome.kill();
    releaseKeepAwake();
  }
}

main().then(
  (code) => process.exit(code),
  (err) => {
    console.error(`capture: ${err?.stack ?? err}`);
    process.exit(1);
  }
);
