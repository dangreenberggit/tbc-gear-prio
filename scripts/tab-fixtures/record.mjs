// Record an Upgrades-tab fixture from a real run (ticket 504).
//
// Drives the fork's dev server (:5173, with the backend on :3333) in a
// headless Chromium over CDP, the way the round-2b scenario captures did
// (.scratch/.../set-rule-scenarios/tools/capture3.mjs): set the page phase,
// load the gear, run the tab, wait for "Took", then read the finished Ranking
// through the dev-only `window.__upgradesRanking()` hook and write it to
// data/tab-fixtures/<spec>-p<phase>-<name>.json. Schema and re-record commands:
// data/tab-fixtures/README.md.
//
// Refuses to record from an uncommitted fork tree: a fixture names the fork
// commit its figures came from, and a dirty tree has no such commit.

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { fileURLToPath, pathToFileURL } from "node:url";

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

const USAGE = `usage: node scripts/tab-fixtures/record.mjs --spec feral|ret --phase N --name NAME
         (--preset-tab "Phase 2" --preset "BiS 6%" --expect-gear-file <fork-relative .gear.json>
          | --gear-url <page link> --expect-item-ids 1,2,3)
         [--iterations 3000] [--base http://localhost:5173]

Writes data/tab-fixtures/<spec>-p<phase>-<name>.json. Needs the fork dev
server on :5173 and the backend on :3333, and a committed fork tree.
--preset loads a chip from the page's "Gear Sets" presets under the named
phase tab; --gear-url opens a gear link. Either way the worn gear is checked
item by item before the run, and the run is refused on a mismatch.`;

function parseArgs(argv) {
  const out = { iterations: 3000, base: "http://localhost:5173" };
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
  };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--help" || argv[i] === "-h") out.help = true;
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
  return null;
}

function git(...args) {
  return execFileSync("git", ["-C", FORK, ...args], {
    encoding: "utf8",
  }).trim();
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
  if (git("status", "--porcelain")) {
    console.error(
      "record: vendor/tbc-new-fork has uncommitted changes; commit them first so the fixture names a real commit."
    );
    return 2;
  }
  const forkSha = git("rev-parse", "HEAD");
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

  const url = args.gearUrl ?? `${args.base}${PAGE_BY_SPEC[args.spec]}`;
  const log = (...a) =>
    console.log(`[record ${args.spec}-p${args.phase}-${args.name}]`, ...a);
  const chrome = await launchChrome();
  const client = cdp(chrome.wsUrl);
  await client.ready;
  try {
    const { send, targetId } = await attachPage(client);
    await send("Emulation.setDeviceMetricsOverride", {
      width: 1280,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await client.send("Target.activateTarget", { targetId });
    await send("Emulation.setFocusEmulationEnabled", { enabled: true });
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
          s.value = ${JSON.stringify(String(args.phase))};
          s.dispatchEvent(new Event('change', { bubbles: true }));
          await new Promise(r => setTimeout(r, 1500));
          return { after: document.getElementById('phase-selector').value };
        })()`
      );
      if (r?.error) throw new Error(r.error);
      if (r.after !== String(args.phase))
        throw new Error(`phase did not stick: ${JSON.stringify(r)}`);
    };
    await setPhase();

    if (args.preset !== undefined) {
      const loaded = await evaluate(
        send,
        `(async () => {
          const tab = [...document.querySelectorAll('.preset-group-phase-tab')].find(t => t.textContent.trim() === ${JSON.stringify(args.presetTab)});
          if (!tab) return { error: 'no preset phase tab ' + ${JSON.stringify(args.presetTab)} };
          tab.click();
          await new Promise(r => setTimeout(r, 400));
          const chips = [...document.querySelector('.preset-group-picker').querySelectorAll('.preset-group-section')]
            .filter(s => s.querySelector('h6')?.textContent.trim() === 'Gear Sets')
            .flatMap(s => [...s.querySelectorAll('.saved-data-set-chip')])
            .filter(c => c.offsetParent);
          const chip = chips.find(c => c.textContent.trim() === ${JSON.stringify(args.preset)});
          if (!chip) return { error: 'no Gear Sets chip; visible: ' + chips.map(c => c.textContent.trim()).join(', ') };
          (chip.querySelector('.saved-data-set-name') ?? chip).click();
          await new Promise(r => setTimeout(r, 1500));
          return { ok: true };
        })()`
      );
      if (loaded?.error) throw new Error(loaded.error);
      // A preset can carry its own phase; put the page back on the asked one.
      await setPhase();
    }

    const act = await evaluate(send, activateTabExpression());
    if (act?.error) throw new Error(act.error);

    // Names render after item levels, so poll. The id check after the run is
    // the exact one; this one stops a wrong-gear run before it costs minutes.
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
    const clicked = await evaluate(
      send,
      `(() => { const b = document.querySelector('.upgrades-run-button'); if (!b) return false; b.click(); return true; })()`
    );
    if (!clicked) throw new Error("run button not found");
    log("run started");
    let summary = "";
    while (Date.now() - started < RUN_LIMIT_MS) {
      await sleep(10000);
      summary = await evaluate(
        send,
        `document.querySelector('.upgrades-baseline-summary')?.textContent ?? ''`
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

    if (git("status", "--porcelain"))
      throw new Error(
        "vendor/tbc-new-fork changed during the run; not writing a fixture"
      );
    if (git("rev-parse", "HEAD") !== forkSha)
      throw new Error("vendor/tbc-new-fork HEAD moved during the run");

    const fixture = {
      schemaVersion: 1,
      forkSha,
      forkDirty: false,
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
    fs.mkdirSync(OUT_DIR, { recursive: true });
    const out = path.join(
      OUT_DIR,
      `${args.spec}-p${args.phase}-${args.name}.json`
    );
    fs.writeFileSync(out, JSON.stringify(fixture, null, 2) + "\n");
    log(
      `wrote ${path.relative(ROOT, out)} (${fs.statSync(out).size} bytes, ${ranking.items.length} items)`
    );
    return 0;
  } finally {
    client.close();
    chrome.proc.kill();
  }
}

main().then(
  (code) => process.exit(code),
  (err) => {
    console.error(`record: ${err?.stack ?? err}`);
    process.exit(1);
  }
);
