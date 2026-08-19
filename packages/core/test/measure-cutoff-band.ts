/**
 * What is inside the `feral-p3` cutoff's screening error bar, for ticket 225.
 *
 * Ticket 225 asks a cheap question before any redesign: the items packed
 * within one screening SE of the cutoff — what are they? If they are
 * interchangeable the way ticket 222 found the trinkets to be, screening
 * that cannot order them is behaving correctly and the ticket reduces to a
 * presentation problem (ticket 224). This script enumerates the band so an
 * SME can answer that, and measures two properties that decide it
 * mechanically:
 *
 *   P1 — slots whose best *candidate* by truth lies inside the band.
 *   P2 — band rows above the cutoff that are the only above-cutoff row of
 *        their slot.
 *
 * Either being non-zero means a slot's best or only upgrade is undecidable
 * at screening precision, which is a decision, not a tie.
 *
 * **Why P1 counts candidates and not every row.** A worn item ranks as a
 * swap of itself and scores exactly 0.00 DPS by construction, so it is not
 * a measurement at all — but it lands inside a band that spans −2.199 DPS,
 * and it can be its slot's argmax when the slot holds no upgrade. Counting
 * those would report "the screen may lose this slot's best upgrade" for
 * slots that have no upgrade to lose. Eight of this fixture's sixteen worn
 * items fall in the band on exactly this arithmetic; head and ranged are
 * argmax that way, and both have zero above-cutoff candidates. P1 excludes
 * them and the excluded slots are printed separately, with their
 * above-cutoff count, so the exclusion is auditable rather than silent.
 *
 * **Why the band is centred on 2.9288 DPS and not 3.6.** `meetsCutoff`
 * (cutoff.ts) fires on `deltaDps >= 3.6 || deltaPct >= 0.15`, and
 * `deltaPct` is a percentage. On this fixture's baseline of 1952.5249…
 * DPS the pct arm binds at `0.15 * 1952.5249… / 100` = 2.9288 DPS, below
 * the absDps arm, so the pct arm is what actually decides `belowCutoff`
 * for every row. The probes in `.scratch/carry-forward/probes/` banded
 * around 3.6 and inferred a baseline from the rank-86 delta; their counts
 * therefore differ from these. The header prints the 3.6-centred counts
 * alongside so that drift is visible rather than silent.
 *
 * **Why rows below the boundary are included.** A band of ±1 SE around
 * 2.9288 DPS spans −2.199..+8.057 DPS, so it contains true downgrades.
 * That is deliberate: those are the rows screening can wrongly promote.
 * They cost sims and can surface in output as upgrades, but recall depends
 * only on the rows genuinely above the cutoff. `band-above` and
 * `band-below` are therefore counted and printed separately.
 *
 * Screening SE is 5.128 DPS at 1,000 iterations — a settled input from
 * ticket 222 section 1, not re-measured here.
 *
 * **What this script does not tell you.** It measures where rows sit
 * relative to the cutoff; it does not ask whether a row belongs in the
 * comparison. Ten of the 28 band-above rows on this fixture are healer
 * gear — intellect/healing/spellpower/spirit/mp5 with zero agility,
 * strength, attack power, crit, hit, expertise or armour penetration —
 * scoring +4.61 to +7.80 DPS for a feral druid. See ticket 227. Read the
 * zone counts as "where the measurement put each row", not as "these are
 * the candidates a player is choosing between".
 *
 * Two further limits worth knowing. The worn-row exclusion in P1 matches on
 * **item id only** and does not check that the row's slot is the one the
 * item is worn in; on this fixture no item is pooled for a slot other than
 * the one it occupies, so the two are equivalent here, but a fixture where
 * that stopped holding would need a slot check. And the committed output
 * under `.scratch/handoffs/` is captured stdout, not a machine-readable
 * artifact — nothing gates it against a re-run, so treat it as a snapshot
 * and re-run the command when the numbers matter.
 *
 * Not a vitest test — a measurement script, same convention as
 * `measure-within-slot-ordering.ts` (§7.12: "record numbers"). Named
 * without a `.test.ts` suffix so vitest's default include glob does not
 * collect it. Run with:
 *
 *   npx tsx packages/core/test/measure-cutoff-band.ts
 *
 * It replays the committed recordings, so it needs no sim binary and no
 * network. One full-sweep rank, a few seconds. Output is deterministic:
 * two consecutive runs produce identical text.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { filterPoolByPhase, poolFromUniverse } from "../src/pool.js";
import { rankUpgrades, type RankedItem } from "../src/rank.js";
import { RecordedGearSource } from "../src/seams/gear-source.js";
import {
  RecordedSimRunner,
  type RaidSimRequest,
  type SimObservation,
} from "../src/seams/sim-runner.js";
import { MemoryStore } from "../src/seams/store.js";
import type { ContentPhase, SpecId } from "../src/types.js";
import {
  syntheticOfflineRecordings,
  FERAL_SYNTHETIC_REF,
  FERAL_SYNTHETIC_FIGHT,
  FERAL_P3_SYNTHETIC_ROW,
  type PresetGearFile,
} from "../src/fixtures/synthetic-offline.js";
import { CUTOFF_FERAL } from "../src/cutoff.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");
function loadJson<T>(rel: string): T {
  return JSON.parse(readFileSync(join(root, rel), "utf8")) as T;
}

type RosterRecordingsFile = {
  simVersion: string;
  seed: number;
  iterations: number;
  rows: Record<
    string,
    {
      spec: SpecId;
      presetPhase: ContentPhase;
      maxPhase: ContentPhase;
      poolSize: number;
      aboveCutoffCount: number;
      baselineDps: number;
      iterations: number;
      seed: number;
      simVersion: string;
      recordings: Record<string, SimObservation>;
    }
  >;
};

const recordingsFile = loadJson<RosterRecordingsFile>(
  "packages/core/test/fixtures/synthetic-roster-recordings.json"
);
const recorded = recordingsFile.rows["feral-p3"]!;

const epWeights = loadJson<{ weights: Record<string, number> }>(
  "data/presets/feral/p1.ep-weights.json"
).weights;
const skeleton = loadJson<RaidSimRequest>(
  "data/presets/feral/p2.raid-sim-skeleton.json"
);
const presetGear = loadJson<PresetGearFile>(
  "vendor/wowsims/feral_preraid.gear.json"
);
const gearData = syntheticOfflineRecordings({
  ref: FERAL_SYNTHETIC_REF,
  spec: "feral",
  presetGear,
  fight: FERAL_SYNTHETIC_FIGHT,
});

const maxPhase = FERAL_P3_SYNTHETIC_ROW.maxPhase;
const pool = filterPoolByPhase(
  poolFromUniverse(
    loadJson<Parameters<typeof poolFromUniverse>[0]>(
      "data/universes/feral-p3.json"
    )
  ),
  maxPhase
);

/**
 * Ticket 222 §1, measured from the recorded per-candidate stdevs at 1,000
 * screening iterations. A hand-copied constant: if the fixture is ever
 * re-recorded this does not follow it, and `measure-within-slot-ordering.ts`
 * section 1 is what re-derives it.
 */
const SCREEN_SE = 5.128;

// Read from the fixture rather than hand-written, so a re-record moves the
// assertion with the data instead of failing a stale literal.
const EXPECTED_POOL_SIZE = recorded.poolSize;
const EXPECTED_ABOVE_CUTOFF = recorded.aboveCutoffCount;

/** Rebuilds the recorded full-sweep truth exactly as `racing.test.ts` does. */
async function fullSweepTruthP3() {
  const recordings = new Map(Object.entries(recorded.recordings));
  const sim = new RecordedSimRunner(recorded.simVersion, recordings);
  return rankUpgrades(
    {
      character: FERAL_SYNTHETIC_REF,
      spec: "feral" as const,
      maxPhase,
      iterations: recorded.iterations,
      seeds: [recorded.seed],
      race: "RaceTauren" as const,
      fullPool: true,
    },
    {
      gear: new RecordedGearSource(gearData),
      sim: sim as never,
      store: new MemoryStore(),
      clock: () => new Date("2026-08-15T12:00:00.000Z"),
      raidSimSkeleton: skeleton,
      epWeights,
      pool,
    }
  );
}

type Zone = "clear-above" | "band-above" | "band-below" | "clear-below";

function zoneOf(deltaDps: number, boundary: number): Zone {
  if (deltaDps >= boundary + SCREEN_SE) return "clear-above";
  if (deltaDps >= boundary) return "band-above";
  if (deltaDps > boundary - SCREEN_SE) return "band-below";
  return "clear-below";
}

function fmt(n: number, places = 2): string {
  return n.toFixed(places);
}

function pad(s: string, width: number): string {
  return s.length >= width ? s : s + " ".repeat(width - s.length);
}

function padLeft(s: string, width: number): string {
  return s.length >= width ? s : " ".repeat(width - s.length) + s;
}

async function main(): Promise<void> {
  const truth = await fullSweepTruthP3();
  const items = truth.items;

  // With `fullPool: true` racing never runs, so no row can be a screened
  // row wearing `belowCutoff: false` by construction. Every verdict below
  // is a full-iteration verdict. Assert it rather than trust it.
  if (!items.every((i) => i.screened === undefined)) {
    throw new Error(
      "expected no screened rows under fullPool: true — the truth sweep is not a full sweep"
    );
  }
  if (items.length !== EXPECTED_POOL_SIZE) {
    throw new Error(
      `expected ${EXPECTED_POOL_SIZE} truth rows, got ${items.length}`
    );
  }

  const baselineDps = recorded.baselineDps;
  const pctArmDps = (CUTOFF_FERAL.pct * baselineDps) / 100;
  const boundary = Math.min(CUTOFF_FERAL.absDps, pctArmDps);

  const aboveCutoff = items.filter((i) => !i.belowCutoff);
  if (aboveCutoff.length !== EXPECTED_ABOVE_CUTOFF) {
    throw new Error(
      `expected ${EXPECTED_ABOVE_CUTOFF} above-cutoff rows, got ${aboveCutoff.length}`
    );
  }

  const ranked = [...items].sort((a, b) => b.deltaDps - a.deltaDps);
  const zones = new Map<number, Zone>();
  for (const i of ranked) zones.set(i.itemId, zoneOf(i.deltaDps, boundary));

  const inZone = (z: Zone) => ranked.filter((i) => zones.get(i.itemId) === z);
  const bandAbove = inZone("band-above");
  const bandBelow = inZone("band-below");
  const clearAbove = inZone("clear-above");
  const band = [...bandAbove, ...bandBelow].sort(
    (a, b) => b.deltaDps - a.deltaDps
  );

  // The probes centred on absDps 3.6 against an inferred baseline. Same
  // arithmetic here against the recorded baseline, printed only so the
  // drift between the two framings is visible.
  const abs = CUTOFF_FERAL.absDps;
  const probeBand = ranked.filter(
    (i) => Math.abs(i.deltaDps - abs) < SCREEN_SE
  ).length;
  const probeClearAbove = ranked.filter(
    (i) => i.deltaDps > abs + SCREEN_SE
  ).length;

  console.log("measure-cutoff-band — ticket 225, fixture feral-p3");
  console.log("");
  console.log(`  eligible rows            ${items.length}`);
  console.log(`  above cutoff             ${aboveCutoff.length}`);
  console.log(`  baseline DPS             ${baselineDps}`);
  console.log(
    `  cutoff absDps arm        ${fmt(abs)} DPS   (CUTOFF_FERAL.absDps)`
  );
  console.log(
    `  cutoff pct arm           ${fmt(pctArmDps, 4)} DPS   (${fmt(
      CUTOFF_FERAL.pct,
      2
    )}% of baseline)`
  );
  console.log(
    `  effective boundary       ${fmt(boundary, 4)} DPS   (the binding arm)`
  );
  console.log(
    `  screening SE @1000 it    ${fmt(SCREEN_SE, 3)} DPS (ticket 222)`
  );
  console.log(
    `  band span                ${fmt(boundary - SCREEN_SE, 3)} .. ${fmt(
      boundary + SCREEN_SE,
      3
    )} DPS`
  );
  console.log("");
  console.log("  zone counts (centred on the effective boundary)");
  console.log(`    clear-above            ${clearAbove.length}`);
  console.log(`    band-above             ${bandAbove.length}`);
  console.log(`    band-below             ${bandBelow.length}`);
  console.log(`    clear-below            ${inZone("clear-below").length}`);
  console.log(`    band total             ${band.length}`);
  console.log("");
  console.log("  for comparison, centred on absDps 3.6 as the probes were");
  console.log(`    within +/-1 SE of 3.6  ${probeBand}`);
  console.log(`    clearly above 3.6+SE   ${probeClearAbove}`);
  console.log("");

  console.log("Band contents, by truth delta descending");
  console.log("");
  console.log(
    `  ${pad("rank", 6)}${pad("itemId", 8)}${pad("slot", 12)}${padLeft(
      "deltaDps",
      10
    )}${padLeft("deltaPct", 10)}  ${pad("zone", 12)}${pad("cutoff", 8)}name`
  );
  for (const i of band) {
    const overallRank = ranked.indexOf(i) + 1;
    console.log(
      `  ${pad(String(overallRank), 6)}${pad(String(i.itemId), 8)}${pad(
        String(i.slot),
        12
      )}${padLeft(fmt(i.deltaDps), 10)}${padLeft(
        fmt(i.deltaPct, 4),
        10
      )}  ${pad(zones.get(i.itemId)!, 12)}${pad(
        i.belowCutoff ? "below" : "above",
        8
      )}${i.name}`
    );
  }
  console.log("");

  const slotsOf = (rows: readonly RankedItem[]) => {
    const m = new Map<string, number>();
    for (const r of rows)
      m.set(String(r.slot), (m.get(String(r.slot)) ?? 0) + 1);
    return m;
  };
  const aboveBySlot = slotsOf(bandAbove);
  const belowBySlot = slotsOf(bandBelow);
  const allSlots = [
    ...new Set([...aboveBySlot.keys(), ...belowBySlot.keys()]),
  ].sort();

  console.log("Per-slot band histogram");
  console.log("");
  console.log(
    `  ${pad("slot", 14)}${padLeft("band-above", 12)}${padLeft(
      "band-below",
      12
    )}${padLeft("slot rows", 11)}${padLeft("slot above-cut", 16)}`
  );
  for (const slot of allSlots) {
    const slotRows = items.filter((i) => String(i.slot) === slot);
    const slotAbove = slotRows.filter((i) => !i.belowCutoff);
    console.log(
      `  ${pad(slot, 14)}${padLeft(
        String(aboveBySlot.get(slot) ?? 0),
        12
      )}${padLeft(String(belowBySlot.get(slot) ?? 0), 12)}${padLeft(
        String(slotRows.length),
        11
      )}${padLeft(String(slotAbove.length), 16)}`
    );
  }
  console.log("");

  // A worn item ranks as a swap of itself and therefore scores exactly 0.00
  // DPS by construction. That is not a measurement, so a worn row landing in
  // the band says nothing about screening precision — but it can still be a
  // slot's argmax when the slot holds no upgrade at all, which would make a
  // naive P1 count slots that have nothing to lose. Excluded from P1 below,
  // and reported separately so the exclusion is visible rather than silent.
  const wornIds = new Set(
    presetGear.items.filter((i) => i.id !== undefined).map((i) => i.id!)
  );
  const wornInBand = band.filter((i) => wornIds.has(i.itemId));

  // P1 — a slot whose best *candidate* by truth is itself undecidable at
  // screening precision, which would mean the screen can lose that slot's
  // best upgrade. Computed over every slot present in the pool, not only
  // the slots that have band rows, and over candidates only: a slot whose
  // argmax is the worn item has no upgrade for the screen to lose.
  const poolSlots = [...new Set(items.map((i) => String(i.slot)))].sort();
  const p1: { slot: string; item: RankedItem }[] = [];
  const p1WornArgmax: { slot: string; item: RankedItem }[] = [];
  for (const slot of poolSlots) {
    const slotRows = items.filter((i) => String(i.slot) === slot);
    const argmax = slotRows.reduce((best, r) =>
      r.deltaDps > best.deltaDps ? r : best
    );
    const z = zones.get(argmax.itemId)!;
    if (z !== "band-above" && z !== "band-below") continue;
    if (wornIds.has(argmax.itemId)) p1WornArgmax.push({ slot, item: argmax });
    else p1.push({ slot, item: argmax });
  }

  // P2 — a band row that is the only above-cutoff row of its slot. If the
  // screen loses it, the slot shows no upgrade at all.
  const p2: RankedItem[] = [];
  for (const r of bandAbove) {
    const slotAbove = items.filter(
      (i) => String(i.slot) === String(r.slot) && !i.belowCutoff
    );
    if (slotAbove.length === 1 && slotAbove[0]!.itemId === r.itemId) p2.push(r);
  }

  console.log(
    `Worn rows inside the band (0.00 DPS by construction, not measurements): ${wornInBand.length}`
  );
  for (const r of wornInBand) {
    console.log(
      `  ${pad(String(r.slot), 14)}${padLeft(fmt(r.deltaDps), 9)} DPS  ${r.name}`
    );
  }
  console.log("");
  console.log(
    `P1 — slots whose best candidate by truth is inside the band: ${p1.length}`
  );
  for (const { slot, item } of p1) {
    console.log(
      `  ${pad(slot, 14)}${padLeft(fmt(item.deltaDps), 9)} DPS  ${pad(
        zones.get(item.itemId)!,
        12
      )}${item.name}`
    );
  }
  console.log("");
  console.log(
    `  excluded — slots whose argmax is the worn item (no upgrade to lose): ${p1WornArgmax.length}`
  );
  for (const { slot, item } of p1WornArgmax) {
    const slotAbove = items.filter(
      (i) => String(i.slot) === slot && !i.belowCutoff
    ).length;
    console.log(
      `  ${pad(slot, 14)}${padLeft(fmt(item.deltaDps), 9)} DPS  ${pad(
        item.name,
        28
      )}slot above-cutoff rows: ${slotAbove}`
    );
  }
  console.log("");
  console.log(
    `P2 — band-above rows that are their slot's only above-cutoff row: ${p2.length}`
  );
  for (const r of p2) {
    console.log(
      `  ${pad(String(r.slot), 14)}${padLeft(fmt(r.deltaDps), 9)} DPS  ${r.name}`
    );
  }
  console.log("");
}

await main();
