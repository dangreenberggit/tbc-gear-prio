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
// `--mode panel` records the progress panel's attributes; Step 5 extends it.
// Both record when "Took" appears, every announcement and the run's meta.
//
// Load control (plan "Load control for timing runs"): before the Run click a
// 60 s loadmon gate must pass (the :3333 backend idle, no foreign client); it
// is retried for up to 15 minutes, then this exits 3 without running. During
// the run loadmon samples into <out>.load.jsonl for replay.mjs's D0-D3 rules.
// `--candidates N` caps the run for a quick untimed check; such a run skips
// the gate, still runs the monitor, and is marked `timing: false`.
//
// usage: node capture.mjs --mode base|panel --out <trace.json>
//          [--base http://localhost:5174] [--shots <dir>] [--candidates N]

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

function parseArgs(argv) {
  const out = { base: "http://localhost:5174" };
  const keys = {
    "--base": "base",
    "--mode": "mode",
    "--out": "out",
    "--shots": "shots",
    "--candidates": "candidates",
  };
  for (let i = 0; i < argv.length; i++) {
    if (keys[argv[i]]) out[keys[argv[i]]] = argv[++i];
    else throw new Error(`unknown argument ${argv[i]}`);
  }
  if (out.mode !== "base" && out.mode !== "panel")
    throw new Error("--mode must be base or panel");
  if (!out.out) throw new Error("--out is required");
  if (out.candidates !== undefined) {
    out.candidates = Number(out.candidates);
    if (!Number.isInteger(out.candidates) || out.candidates <= 0)
      throw new Error("--candidates must be a positive integer");
  }
  out.out = path.resolve(out.out);
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
const OBSERVE_AND_CLICK = (mode) => `(() => {
  const btn = document.querySelector('.upgrades-run-button');
  if (!btn) return { error: 'run button not found' };
  const tab = document.querySelector('#upgrades-tab');
  const cap = window.__cap542 = { mode: ${JSON.stringify(mode)}, t0: performance.now(), t0Epoch: Date.now(), records: [], announces: [], panel: [], endT: null, endText: null };
  const now = () => performance.now() - cap.t0;
  let lastStatus = null, lastAnnounce = null, lastPanel = null;
  const look = () => {
    const t = now();
    if (cap.mode === 'base') {
      const s = tab.querySelector('.upgrades-status');
      const text = s ? s.textContent : null;
      if (text !== lastStatus) { lastStatus = text; cap.records.push({ t, text }); }
    } else {
      const p = tab.querySelector('.upgrades-run-progress');
      const snap = p ? JSON.stringify({ cls: p.className, data: { ...p.dataset } }) : null;
      if (snap !== lastPanel) { lastPanel = snap; cap.panel.push({ t, snap: snap && JSON.parse(snap) }); }
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

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const timing = args.candidates === undefined;
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
  const { launchChrome, cdp, attachPage, evaluate, activateTabExpression } =
    harness;

  fs.mkdirSync(path.dirname(args.out), { recursive: true });
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
    await send("Emulation.setDeviceMetricsOverride", {
      width: 1280,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await browserSend("Target.activateTarget", { targetId: page.targetId });
    await send("Emulation.setFocusEmulationEnabled", { enabled: true });
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

    if (!timing) {
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

    const env = await evaluate(
      send,
      `({ hardwareConcurrency: navigator.hardwareConcurrency, deviceMemory: navigator.deviceMemory ?? null, wasmConcurrencySetting: localStorage.getItem('__tbc_new_wasmconcurrency'), runnerKey: localStorage.getItem('upgradesTab.runner') })`
    );
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

    fs.rmSync(loadOut, { force: true });
    monitor = spawn("powershell.exe", loadmonArgs(chrome.proc.pid, loadOut, 0), {
      stdio: "ignore",
      windowsHide: true,
    });
    await sleep(1500);

    guard.armNavigation();
    disarmDeadline = armRunDeadline(RUN_LIMIT_MS, chrome.kill, label);
    const clicked = await evaluate(send, OBSERVE_AND_CLICK(args.mode));
    if (clicked?.error) throw new Error(clicked.error);
    const startedAt = Date.now();
    log("run started");
    let endT = null;
    while (Date.now() - startedAt < RUN_LIMIT_MS) {
      await sleep(5000);
      endT = await evaluate(send, `window.__cap542.endT`);
      if (endT !== null) break;
    }
    if (endT === null)
      throw new Error(`run did not settle in ${RUN_LIMIT_MS / 60000} min`);
    stopMonitor();
    if (!fs.existsSync(loadOut) || fs.statSync(loadOut).size === 0)
      throw new Error(`loadmon wrote no samples to ${loadOut}`);
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
      records: cap.records,
      panel: cap.panel,
      announces: cap.announces,
    };
    fs.writeFileSync(args.out,JSON.stringify(trace, null, 1) + "\n");
    log(
      `wrote ${args.out} (${trace.records.length} status records, ${trace.panel.length} panel records, N=${N})`
    );
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
