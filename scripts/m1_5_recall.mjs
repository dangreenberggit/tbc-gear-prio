#!/usr/bin/env node
/**
 * M1.5 (plan §5a) — does EP ordering lose real upgrades?
 *
 * Reuses the 5,000-iteration deltaDps measured by E-W5 §3.2
 * (experiments/e-w5-rank.json, committed on this branch) rather than
 * re-simming: that file already ran the full eligible pool for both roster
 * fixtures through the real rankUpgrades seam. This script only calls the
 * already-merged ordering function, orderCandidatesByEp
 * (packages/core/src/candidate-order.ts:52), against that data and reports
 * where each above-cutoff row falls in the EP order.
 *
 * Run: npx tsx scripts/m1_5_recall.mjs
 *
 * Plain `node scripts/m1_5_recall.mjs` fails with ERR_MODULE_NOT_FOUND: the
 * `.js`-suffixed specifiers below are TypeScript's NodeNext convention (they
 * resolve to `.ts` at typecheck time) but Node's own ESM resolver does not
 * do that substitution at runtime without a loader. `tsx` (a devDependency,
 * see package.json) provides it; this mirrors how scripts/ew5_rank.mjs must
 * also be run despite its own comment saying plain `node`.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { orderCandidatesByEp } from "../packages/core/src/candidate-order.js";
import { getItem } from "../packages/core/src/items.js";
import {
  poolFromUniverse,
  filterPoolByPhase,
} from "../packages/core/src/pool.js";
import { mapWclGearToSim } from "../packages/core/src/slots.js";
import { meetsCutoff } from "../packages/core/src/cutoff.js";

const ROOT = resolve(fileURLToPath(import.meta.url), "../..");

function readJson(path) {
  return JSON.parse(readFileSync(join(ROOT, path), "utf8"));
}

function loggedGearFromRaw(rawPath, playerName) {
  const raw = readJson(rawPath);
  const actors = new Map(raw.actors.map((a) => [a.id, a]));
  for (const ev of raw.combatant_info_events) {
    if (
      actors.get(ev.sourceID)?.name.toLowerCase() !== playerName.toLowerCase()
    )
      continue;
    return mapWclGearToSim(ev.gear);
  }
  throw new Error(`${playerName} not found in ${rawPath}`);
}

// F10 / plan §3.2's fixed cutoff, used for both specs "for consistency with
// §3.2" per this task's instructions. Feral's own cutoffForSpec() value
// ({absDps: 3.6, pct: 0.15}, packages/core/src/cutoff.ts:27) is reported
// separately below (task instruction: "report if that choice changes any
// conclusion").
const CUTOFF_F10 = { absDps: 3.4, pct: 0.15 };
const CUTOFF_FERAL_OWN = { absDps: 3.6, pct: 0.15 };

const FIXTURES = {
  ret: {
    universePath: "data/universes/ret-p5.json",
    maxPhase: 2,
    epWeightsPath: "data/presets/ret/p2.ep-weights.json",
    equippedIdsSource: () =>
      loggedGearFromRaw("test/fixtures/slamaltman.raw.json", "slamaltman"),
  },
  feral: {
    universePath: "data/universes/feral-p2.json",
    maxPhase: 2,
    epWeightsPath: "data/presets/feral/p1.ep-weights.json",
    equippedIdsSource: () =>
      loggedGearFromRaw(
        "test/fixtures/shredzepelin-cat.raw.json",
        "shredzepelin"
      ),
  },
};

const stats = (itemId) => getItem(itemId)?.stats ?? [];

function ownedIdSet(equipment) {
  return new Set(
    equipment.map((spec) => spec.id).filter((id) => id !== undefined)
  );
}

function analyzeFixture(name, cfg, ew5) {
  const epWeights = readJson(cfg.epWeightsPath).weights;
  const universe = readJson(cfg.universePath);
  const pool = filterPoolByPhase(poolFromUniverse(universe), cfg.maxPhase);
  const equipment = cfg.equippedIdsSource();
  const owned = ownedIdSet(equipment);

  const ordered = orderCandidatesByEp(pool, equipment, epWeights, stats);
  const rankById = new Map(ordered.map((e, i) => [e.itemId, i + 1])); // 1-based

  const full = ew5.raw[name].points["5000"];
  if (!full) {
    throw new Error(
      `experiments/e-w5-rank.json has no 5000-iteration point for ${name} — ` +
        "cannot proceed without re-running E-W5 §3.2"
    );
  }
  const baselineDps = full.baselineDps;
  const deltas = full.deltas; // itemId(string) -> deltaDps

  // Rows the pool has but E-W5 lacks a measured delta for (should not
  // happen — same pool both passes) are reported, not silently dropped.
  const missingFromEw5 = pool
    .map((e) => e.itemId)
    .filter((id) => !(String(id) in deltas));

  function classify(cutoff) {
    const rows = pool
      .map((e) => {
        const deltaDps = deltas[String(e.itemId)];
        if (deltaDps === undefined) return null;
        const deltaPct = baselineDps === 0 ? 0 : (deltaDps / baselineDps) * 100;
        return {
          itemId: e.itemId,
          name: e.name,
          slot: e.slot,
          deltaDps,
          deltaPct,
          owned: owned.has(e.itemId),
          aboveCutoff: meetsCutoff(deltaDps, deltaPct, cutoff),
          orderingRank: rankById.get(e.itemId) ?? null,
        };
      })
      .filter((r) => r !== null);

    const aboveCutoff = rows.filter((r) => r.aboveCutoff);
    const aboveCutoffNonOwned = aboveCutoff.filter((r) => !r.owned);
    const top5ByDelta = [...rows]
      .sort((a, b) => b.deltaDps - a.deltaDps)
      .slice(0, 5);

    const worstAboveCutoffRank = aboveCutoff.length
      ? Math.max(...aboveCutoff.map((r) => r.orderingRank))
      : null;
    const worstAboveCutoffNonOwnedRank = aboveCutoffNonOwned.length
      ? Math.max(...aboveCutoffNonOwned.map((r) => r.orderingRank))
      : null;

    return {
      cutoff,
      poolSize: pool.length,
      aboveCutoffCount: aboveCutoff.length,
      aboveCutoffNonOwnedCount: aboveCutoffNonOwned.length,
      aboveCutoff: aboveCutoff
        .slice()
        .sort((a, b) => a.orderingRank - b.orderingRank),
      top5ByDelta,
      worstAboveCutoffRank,
      worstAboveCutoffNonOwnedRank,
    };
  }

  return {
    poolSize: pool.length,
    missingFromEw5,
    f10: classify(CUTOFF_F10),
    ownCutoff: name === "feral" ? classify(CUTOFF_FERAL_OWN) : null,
  };
}

function renderMd(results) {
  let md = `# M1.5 — EP-ordering recall on committed full-sweep fixtures

Command: \`npx tsx scripts/m1_5_recall.mjs\`

Calls the already-merged \`orderCandidatesByEp\`
(\`packages/core/src/candidate-order.ts:52\`) over each roster fixture's
eligible pool, and reads the measured 5,000-iteration \`deltaDps\` per
candidate from \`experiments/e-w5-rank.json\` (committed by slice B, produced
by \`node scripts/ew5_rank.mjs\`) rather than re-simming. Cutoff \`{absDps:
3.4, pct: 0.15}\` (F10) is used for both specs, matching §3.2; feral's own
\`cutoffForSpec()\` value (\`{absDps: 3.6, pct: 0.15}\`,
\`packages/core/src/cutoff.ts:27\`) is reported separately per fixture to
show whether it changes the conclusion.

This script writes only the data tables below. The "Interpretation"
section at the end of the committed \`experiments/m1-5-ep-recall.md\` is
hand-written judgment over these numbers — re-running this script
regenerates the tables above it but does not touch or regenerate that
section; re-add it by hand (or re-review it) after any re-run that changes
the numbers it cites.
`;

  for (const [name, r] of Object.entries(results)) {
    if (r.missingFromEw5.length > 0) {
      md += `**${name}: WARNING — ${r.missingFromEw5.length} pool row(s) have no measured delta in e-w5-rank.json** (ids: ${r.missingFromEw5.join(", ")}). These rows are excluded from the analysis below.\n\n`;
    }

    md += `## ${name} (eligible pool: ${r.poolSize})\n\n`;
    md += `### Cutoff {absDps: 3.4, pct: 0.15} (F10)\n\n`;
    md += renderCutoffSection(r.f10);

    if (r.ownCutoff) {
      md += `### Feral's own cutoff {absDps: 3.6, pct: 0.15} (\`cutoffForSpec('feral')\`)\n\n`;
      md += renderCutoffSection(r.ownCutoff);
    }
  }

  return md;
}

function renderCutoffSection(c) {
  let md = `Above-cutoff rows: **${c.aboveCutoffCount}** (${c.aboveCutoffNonOwnedCount} non-owned). Worst (highest) ordering rank among above-cutoff rows: **${c.worstAboveCutoffRank ?? "n/a"}**. Worst among non-owned above-cutoff rows: **${c.worstAboveCutoffNonOwnedRank ?? "n/a"}**.\n\n`;

  md += `#### Every above-cutoff row, by ordering rank\n\n`;
  md += `| ordering rank | item id | name | slot | owned | deltaDps | deltaPct |\n`;
  md += `| --- | --- | --- | --- | --- | --- | --- |\n`;
  for (const row of c.aboveCutoff) {
    md += `| ${row.orderingRank} | ${row.itemId} | ${row.name} | ${row.slot} | ${row.owned ? "yes" : "no"} | ${row.deltaDps.toFixed(2)} | ${row.deltaPct.toFixed(3)}% |\n`;
  }
  md += "\n";

  md += `#### Top 5 by measured deltaDps, with their ordering rank\n\n`;
  md += `| measured rank | ordering rank | item id | name | slot | owned | deltaDps |\n`;
  md += `| --- | --- | --- | --- | --- | --- | --- |\n`;
  c.top5ByDelta.forEach((row, i) => {
    md += `| ${i + 1} | ${row.orderingRank} | ${row.itemId} | ${row.name} | ${row.slot} | ${row.owned ? "yes" : "no"} | ${row.deltaDps.toFixed(2)} |\n`;
  });
  md += "\n";

  return md;
}

function main() {
  const ew5 = readJson("experiments/e-w5-rank.json");
  const results = {};
  for (const [name, cfg] of Object.entries(FIXTURES)) {
    console.error(
      `[${name}] ordering ${cfg.universePath} at maxPhase ${cfg.maxPhase}...`
    );
    results[name] = analyzeFixture(name, cfg, ew5);
    console.error(
      `[${name}] done. pool=${results[name].poolSize} f10.aboveCutoff=${results[name].f10.aboveCutoffCount} f10.worstRank=${results[name].f10.worstAboveCutoffRank}`
    );
  }

  writeFileSync(
    join(ROOT, "experiments/m1-5-ep-recall.json"),
    JSON.stringify(
      { command: "npx tsx scripts/m1_5_recall.mjs", results },
      null,
      2
    ) + "\n"
  );
  writeFileSync(join(ROOT, "experiments/m1-5-ep-recall.md"), renderMd(results));
  console.log("wrote experiments/m1-5-ep-recall.json and .md");
}

main();
