// Record an Upgrades-tab fixture from a real run (ticket 504).
//
// Drives the fork's dev server (:5173, or TBC_FORK_PORT; WASM_WORKER=1 or the backend on :3333) in a
// headless Chromium over CDP, the way the round-2b scenario captures did
// (.scratch/.../set-rule-scenarios/tools/capture3.mjs): set the page phase,
// load the gear, run the tab, wait for "Took", then read the finished Ranking
// through the dev-only `window.__upgradesRanking()` hook and write it to
// data/tab-fixtures/<spec>-p<phase>-<name>.json. Schema and re-record commands:
// data/tab-fixtures/README.md.
//
// Refuses to record from an uncommitted fork tree: a fixture names the fork
// commit its figures came from, and a dirty tree has no such commit.
// `--allow-dirty` (only with an `--out` folder outside data/tab-fixtures)
// records an uncommitted fork for review before it is committed, as the
// ticket 502 owner render gate needs; the file then names the diff by hash
// instead, and tab-fixtures:check would reject it (`forkDirty: true`).

import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { fileURLToPath, pathToFileURL } from "node:url";

import { holdKeepAwake } from "./keep-awake.mjs";
import { armRunDeadline, guardPage, withTimeout } from "./run-guard.mjs";

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../.."
);
const FORK = path.join(ROOT, "vendor", "tbc-new-fork");
const OUT_DIR = path.join(ROOT, "data", "tab-fixtures");
const PAGE_BY_SPEC = {
  feral: "/tbc/druid/feralcat/",
  ret: "/tbc/paladin/retribution/",
};
const RUN_LIMIT_MS = 25 * 60 * 1000;
// Above the longest single call: activateTabExpression polls for up to 45 s.
const CALL_TIMEOUT_MS = 90 * 1000;

const USAGE = `usage: node scripts/tab-fixtures/record.mjs --spec feral|ret --phase N --name NAME
         (--preset-tab "Phase 2" --preset "BiS 6%" --expect-gear-file <fork-relative .gear.json>
          | --gear-url <page link> --expect-item-ids 1,2,3)
         [--iterations 3000] [--base http://localhost:$TBC_FORK_PORT, default 5173]
         [--out <dir> [--allow-dirty]]

Writes data/tab-fixtures/<spec>-p<phase>-<name>.json, or the same name under
--out. Needs the fork dev server on :5173 (or TBC_FORK_PORT), served with WASM_WORKER=1 or with the backend on :3333, and a
committed fork tree. --allow-dirty records an uncommitted fork tree; it needs
an --out folder other than data/tab-fixtures, stamps forkDirty: true and the
sha256 of the fork's diff, and refuses to write if that diff changed during
the run. --preset loads a chip from the page's "Gear Sets" presets under the
named phase tab; --gear-url opens a gear link. Either way the worn gear is
checked item by item before the run, and the run is refused on a mismatch.`;

function parseArgs(argv) {
  const port = process.env.TBC_FORK_PORT ?? "5173";
  const out = { iterations: 3000, base: `http://localhost:${port}` };
  const flags = { "--allow-dirty": "allowDirty" };
  const keys = {
    "--spec": "spec",
    "--phase": "phase",
    "--name": "name",
    "--preset-tab": "presetTab",
    "--preset": "preset",
    "--expect-gear-file": "expectGearFile",
    "--gear-url": "gearUrl",
    "--expect-item-ids": "expectItemIds",
    "--iterations": "iterations",
    "--base": "base",
    "--out": "out",
  };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--help" || argv[i] === "-h") out.help = true;
    else if (flags[argv[i]]) out[flags[argv[i]]] = true;
    else if (keys[argv[i]]) out[keys[argv[i]]] = argv[++i];
    else throw new Error(`unknown argument ${argv[i]}`);
  }
  return out;
}

function validate(args) {
  if (!PAGE_BY_SPEC[args.spec])
    return `--spec must be one of ${Object.keys(PAGE_BY_SPEC).join(", ")}`;
  args.phase = Number(args.phase);
  if (!Number.isInteger(args.phase)) return "--phase must be an integer";
  if (!args.name || !/^[a-z0-9-]+$/.test(args.name))
    return "--name must be lower-case letters, digits and dashes";
  args.iterations = Number(args.iterations);
  if (!Number.isInteger(args.iterations) || args.iterations <= 0)
    return "--iterations must be a positive integer";
  const viaPreset = args.preset !== undefined;
  const viaUrl = args.gearUrl !== undefined;
  if (viaPreset === viaUrl) return "give exactly one of --preset or --gear-url";
  if (viaPreset && (!args.presetTab || !args.expectGearFile))
    return "--preset needs --preset-tab and --expect-gear-file";
  if (viaUrl && !args.expectItemIds)
    return "--gear-url needs --expect-item-ids";
  args.outDir = args.out === undefined ? OUT_DIR : path.resolve(args.out);
  const samePath = (a, b) =>
    process.platform === "win32"
      ? a.toLowerCase() === b.toLowerCase()
      : a === b;
  if (
    args.allowDirty &&
    (args.out === undefined || samePath(args.outDir, OUT_DIR))
  )
    return "--allow-dirty needs an --out folder other than data/tab-fixtures: a fixture there must name a real fork commit";
  return null;
}

function git(...args) {
  return execFileSync("git", ["-C", FORK, ...args], {
    encoding: "utf8",
  }).trim();
}

function forkDiffSha256() {
  const diff = execFileSync("git", ["-C", FORK, "diff", "--binary", "HEAD"], {
    maxBuffer: 256 * 1024 * 1024,
  });
  return crypto.createHash("sha256").update(diff).digest("hex");
}

function expectedItemIds(args) {
  if (args.expectItemIds)
    return args.expectItemIds.split(",").map((s) => Number(s.trim()));
  const file = JSON.parse(
    fs.readFileSync(path.join(FORK, args.expectGearFile), "utf8")
  );
  return file.items.filter((i) => i && i.id).map((i) => i.id);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(USAGE);
    return 0;
  }
  const bad = validate(args);
  if (bad) {
    console.error(`record: ${bad}\n\n${USAGE}`);
    return 2;
  }
  const statusBefore = git("status", "--porcelain");
  if (statusBefore && !args.allowDirty) {
    console.error(
      "record: vendor/tbc-new-fork has uncommitted changes; commit them first so the fixture names a real commit."
    );
    return 2;
  }
  const forkSha = git("rev-parse", "HEAD");
  const diffShaBefore = args.allowDirty ? forkDiffSha256() : undefined;
  const expectIds = expectedItemIds(args);
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

  const log = (...a) =>
    console.log(`[record ${args.spec}-p${args.phase}-${args.name}]`, ...a);
  // A committed gear link names the server it was made on (:5173); with
  // TBC_FORK_PORT set, open the same link on the server this run drives.
  let url = args.gearUrl ?? `${args.base}${PAGE_BY_SPEC[args.spec]}`;
  if (args.gearUrl !== undefined && process.env.TBC_FORK_PORT !== undefined) {
    const rewritten = new URL(args.gearUrl);
    const base = new URL(args.base);
    rewritten.protocol = base.protocol;
    rewritten.host = base.host;
    url = rewritten.href;
    log("gear link rewritten to", url);
  }
  const releaseKeepAwake = await holdKeepAwake(
    `record ${args.spec}-p${args.phase}-${args.name}`
  );
  const chrome = await launchChrome();
  const client = cdp(chrome.wsUrl);
  let disarmDeadline = () => {};
  try {
    await withTimeout(client.ready, CALL_TIMEOUT_MS, "the CDP connection");
    const guard = guardPage(client, { callTimeoutMs: CALL_TIMEOUT_MS });
    const page = await withTimeout(
      attachPage(client),
      CALL_TIMEOUT_MS,
      "attaching to the page"
    );
    const { targetId } = page;
    const send = guard.wrap(page.send);
    const browserSend = guard.wrap(client.send);
    await send("Inspector.enable", {});
    await send("Emulation.setDeviceMetricsOverride", {
      width: 1280,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await browserSend("Target.activateTarget", { targetId });
    await send("Emulation.setFocusEmulationEnabled", { enabled: true });
    log("opening", url);
    await send("Page.navigate", { url });
    await sleep(5000);

    if (args.preset !== undefined) {
      const loaded = await evaluate(
        send,
        `(async () => {
          const end = Date.now() + 30000;
          let tab;
          while (!(tab = [...document.querySelectorAll('[data-testid="preset-group-phase-tabs"] button')].find(t => t.textContent.trim() === ${JSON.stringify(args.presetTab)})) && Date.now() < end) await new Promise(r => setTimeout(r, 100));
          if (!tab) return { error: 'no preset phase tab ' + ${JSON.stringify(args.presetTab)} };
          tab.click();
          // On a fresh page the chips render seconds after the tabs.
          const gearChips = () =>
            [...document.querySelectorAll('[data-testid="preset-group-picker"] [data-testid="content-block"]')]
              .filter(s => s.querySelector('[data-testid="content-block-title"]')?.textContent.trim() === 'Gear Sets')
              .flatMap(s => [...s.querySelectorAll('[data-testid="saved-data-set-chip"]')])
              .filter(c => c.offsetParent);
          let chips = gearChips();
          let chip;
          while (!(chip = chips.find(c => c.textContent.trim() === ${JSON.stringify(args.preset)})) && Date.now() < end) {
            await new Promise(r => setTimeout(r, 100));
            chips = gearChips();
          }
          if (!chip) return { error: 'no Gear Sets chip ' + ${JSON.stringify(args.preset)} + '; visible: ' + chips.map(c => c.textContent.trim()).join(', ') };
          (chip.querySelector('[data-testid="saved-data-set-name"]') ?? chip).click();
          await new Promise(r => setTimeout(r, 1500));
          return { ok: true };
        })()`
      );
      if (loaded?.error) throw new Error(loaded.error);
    }

    // Names render after item levels, so poll. The id check after the run is
    // the exact one; this one stops a wrong-gear run before it costs minutes.
    const gearNames = `[...document.querySelectorAll('[data-testid="gear-picker-root"] [data-testid="item-picker-name"]')].map(e => e.textContent.trim()).filter(Boolean).join(' | ')`;
    let missing = expectNames;
    for (let i = 0; i < 30 && missing.length; i++) {
      await sleep(1000);
      const worn = await evaluate(send, gearNames);
      missing = expectNames.filter((n) => !worn.includes(n));
    }
    if (missing.length)
      throw new Error(`gear not loaded; missing ${missing.join(", ")}`);

    const act = await evaluate(send, activateTabExpression());
    if (act?.error) throw new Error(act.error);

    // The phase selector is in the tab's settings column, so it is set once
    // the tab is open, and after the preset, which can carry its own phase.
    const pagePhase = await evaluate(
      send,
      `(async () => {
        const end = Date.now() + 15000;
        let s; while (!(s = document.querySelector('[data-testid="phase-selector"] select')) && Date.now() < end) await new Promise(r => setTimeout(r, 100));
        if (!s) return { error: 'no [data-testid="phase-selector"] select' };
        s.value = ${JSON.stringify(String(args.phase))};
        s.dispatchEvent(new Event('change', { bubbles: true }));
        await new Promise(r => setTimeout(r, 1500));
        return { after: document.querySelector('[data-testid="phase-selector"] select').value };
      })()`
    );
    if (pagePhase?.error) throw new Error(pagePhase.error);
    if (pagePhase.after !== String(args.phase))
      throw new Error(`phase did not stick: ${JSON.stringify(pagePhase)}`);

    const iterations = await evaluate(
      send,
      `(() => {
        const input = document.querySelector('[data-testid="upgrades-iterations-picker"] input');
        if (!input) return null;
        if (input.value !== ${JSON.stringify(String(args.iterations))}) {
          input.value = ${JSON.stringify(String(args.iterations))};
          input.dispatchEvent(new Event('change', { bubbles: true }));
        }
        return input.value;
      })()`
    );
    if (iterations !== String(args.iterations))
      throw new Error(`iterations field reads ${iterations}`);

    const started = Date.now();
    guard.armNavigation();
    disarmDeadline = armRunDeadline(
      RUN_LIMIT_MS,
      chrome.kill,
      `record ${args.spec}-p${args.phase}-${args.name}`
    );
    const clicked = await evaluate(
      send,
      `(() => { const b = document.querySelector('[data-testid="upgrades-run-button"]'); if (!b) return false; b.click(); return true; })()`
    );
    if (!clicked) throw new Error("run button not found");
    log("run started");
    let summary = "";
    while (Date.now() - started < RUN_LIMIT_MS) {
      await sleep(10000);
      summary = await evaluate(
        send,
        `document.querySelector('[data-testid="upgrades-baseline-summary"]')?.textContent ?? ''`
      );
      if (/Took/.test(summary)) break;
    }
    if (!/Took/.test(summary))
      throw new Error(`run did not settle in ${RUN_LIMIT_MS / 60000} min`);
    log(
      "settled:",
      summary.trim(),
      `${Math.round((Date.now() - started) / 1000)}s`
    );

    // Serialised in the page with a replacer that throws on NaN/Infinity:
    // returnByValue would silently turn them into null.
    const got = await evaluate(
      send,
      `(() => {
        if (typeof window.__upgradesRanking !== 'function') return { error: 'no window.__upgradesRanking (fixture hooks not in this build)' };
        const r = window.__upgradesRanking();
        if (!r) return { error: 'no finished ranking on the page' };
        try {
          return { json: JSON.stringify(r, (k, v) => { if (typeof v === 'number' && !Number.isFinite(v)) throw new Error('non-finite number at key "' + k + '"'); return v; }) };
        } catch (e) { return { error: String(e) }; }
      })()`
    );
    if (got?.error) throw new Error(got.error);
    const { ranking, spec, phase, gear } = JSON.parse(got.json);
    if (spec !== args.spec)
      throw new Error(`page spec is ${spec}, asked for ${args.spec}`);
    if (phase !== args.phase)
      throw new Error(`page phase is ${phase}, asked for ${args.phase}`);
    const wornIds = new Set(
      (gear.items ?? []).map((i) => i?.id).filter(Boolean)
    );
    const missingIds = expectIds.filter((id) => !wornIds.has(id));
    if (missingIds.length)
      throw new Error(
        `worn gear lacks expected item ids ${missingIds.join(", ")}`
      );

    // `git diff` does not see untracked files, so the dirty mode also
    // requires the status listing itself to be unchanged.
    const changed = args.allowDirty
      ? forkDiffSha256() !== diffShaBefore ||
        git("status", "--porcelain") !== statusBefore
      : Boolean(git("status", "--porcelain"));
    if (changed)
      throw new Error(
        "vendor/tbc-new-fork changed during the run; not writing a fixture"
      );
    if (git("rev-parse", "HEAD") !== forkSha)
      throw new Error("vendor/tbc-new-fork HEAD moved during the run");

    const fixture = {
      schemaVersion: 1,
      forkSha,
      forkDirty: Boolean(args.allowDirty && statusBefore),
      ...(args.allowDirty && statusBefore
        ? { forkDiffSha256: diffShaBefore }
        : {}),
      spec: args.spec,
      phase: args.phase,
      ...(args.preset !== undefined
        ? { preset: `${args.presetTab} / ${args.preset}` }
        : { gearUrl: args.gearUrl }),
      gear,
      recordedAt: new Date().toISOString(),
      iterations: args.iterations,
      ranking,
    };
    fs.mkdirSync(args.outDir, { recursive: true });
    const out = path.join(
      args.outDir,
      `${args.spec}-p${args.phase}-${args.name}.json`
    );
    fs.writeFileSync(out, JSON.stringify(fixture, null, 2) + "\n");
    log(
      `wrote ${path.relative(ROOT, out)} (${fs.statSync(out).size} bytes, ${ranking.items.length} items)`
    );
    return 0;
  } finally {
    disarmDeadline();
    client.close();
    chrome.kill();
    releaseKeepAwake();
  }
}

main().then(
  (code) => process.exit(code),
  (err) => {
    console.error(`record: ${err?.stack ?? err}`);
    process.exit(1);
  }
);
