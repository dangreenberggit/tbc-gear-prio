// Throwaway diagnostic (subagent 06). Builds the 103 and 106 comparison arms on
// BOTH baselines -- ours (shredzepelin, from the fixture) and the OWNER's gear
// (from owner-settings-export.json) -- every candidate arm going through the
// real equipmentForCandidateSwap so repairMeta runs. No production edits.
// Run: pnpm exec tsx .scratch/set-bonus-value/loop-103-106/build-owner-gear-arms.ts
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import {
  equipmentForCandidateSwap,
  type SimItemSpec,
} from "../../../packages/core/src/rank.js";
import {
  equipmentFromLoggedGear,
  socketedItemsFromLoggedGear,
} from "../../../packages/core/src/logged-gear.js";
import { repairMeta } from "../../../packages/core/src/meta-repair.js";
import type { SocketedItem } from "../../../packages/core/src/candidate-gems.js";
import { gemContext } from "../../../packages/core/src/candidate-gems.js";
import { gemsForPhase } from "../../../packages/core/src/gems.js";
import { compose } from "../../../packages/core/src/compose.js";
import {
  feralOfflineRecordings,
  SHREDZEPELIN_REF,
  type FeralRawFixture,
} from "../../../packages/core/src/fixtures/feral-offline.js";
import { SIM_ORDER } from "../../../packages/core/src/slots.js";

function applyRepairedGemsForBaselineOnly(
  equipment: readonly SimItemSpec[],
  socketed: SocketedItem[]
): SimItemSpec[] {
  return equipment.map((spec, i) => {
    const repaired = socketed[i];
    if (!repaired || !spec.id) return spec;
    return { ...spec, gems: [...repaired.gems] };
  });
}

const ROOT = resolve(process.cwd());
const loadJson = <T,>(rel: string): T =>
  JSON.parse(readFileSync(resolve(ROOT, rel), "utf-8")) as T;

const raw = loadJson<FeralRawFixture>("test/fixtures/shredzepelin-cat.raw.json");
const gearData = feralOfflineRecordings(raw, SHREDZEPELIN_REF);
const key = [...gearData.gear.keys()][0]!;
const logged = gearData.gear.get(key)!;

const epWeights = loadJson<{ weights: Record<string, number> }>(
  "data/presets/feral/p1.ep-weights.json"
).weights;
const palette = gemsForPhase(3);
let socketed = socketedItemsFromLoggedGear(logged);
socketed = repairMeta({ items: socketed, epWeights, palette }).items;
const oursBaseline = applyRepairedGemsForBaselineOnly(
  equipmentFromLoggedGear(logged),
  socketed
);
const gems = gemContext(palette, epWeights);

// The owner's baseline, read straight out of their export. Empty {} slots (the
// ranged/relic-adjacent hole at index 15) become an id-less spec, same shape as
// equipmentFromLoggedGear produces for an unfilled slot.
type OwnerItem = { id?: number; enchant?: number; gems?: number[] };
const ownerExport = loadJson<{
  player: { equipment: { items: OwnerItem[] } };
}>(".scratch/set-bonus-value/loop-103-106/owner-settings-export.json");
const ownerBaseline: SimItemSpec[] = ownerExport.player.equipment.items.map(
  (it) =>
    ({
      ...(it.id === undefined ? {} : { id: it.id }),
      ...(it.enchant === undefined ? {} : { enchant: it.enchant }),
      gems: [...(it.gems ?? [])],
    }) as SimItemSpec
);

const skeleton = loadJson<Parameters<typeof compose>[0]>(
  "data/presets/feral/p2.raid-sim-skeleton.json"
);
const race = (
  skeleton as unknown as {
    raid: { parties: { players: { race: unknown }[] }[] };
  }
).raid.parties[0]!.players[0]!.race;

const idx = (s: string) => SIM_ORDER.indexOf(s as (typeof SIM_ORDER)[number]);
const HEAD = idx("head");

// The four-piece T6 package (Thunderheart Harness), ids confirmed in 03's log.
const T6: ReadonlyArray<readonly [number, number]> = [
  [idx("shoulder"), 31048],
  [idx("chest"), 31042],
  [idx("hands"), 31034],
  [idx("legs"), 31044],
];

// Packages apply sequentially through the same builder (rank.ts:1066-1074).
function pkgArm(base: SimItemSpec[]): SimItemSpec[] {
  let eq = base;
  for (const [slot, id] of T6) eq = equipmentForCandidateSwap(eq, slot, id, gems);
  return eq;
}

const arms: Record<string, SimItemSpec[]> = {
  OURS_BASE: oursBaseline,
  OURS_PKG: pkgArm(oursBaseline),
  OURS_CURSED: equipmentForCandidateSwap(oursBaseline, HEAD, 32235, gems),
  OURS_VENG: equipmentForCandidateSwap(oursBaseline, HEAD, 33672, gems),
  OWNER_BASE: ownerBaseline,
  OWNER_PKG: pkgArm(ownerBaseline),
  OWNER_CURSED: equipmentForCandidateSwap(ownerBaseline, HEAD, 32235, gems),
  OWNER_VENG: equipmentForCandidateSwap(ownerBaseline, HEAD, 33672, gems),
};

const out = resolve(ROOT, ".scratch/set-bonus-value/loop-103-106/owner-arms");
mkdirSync(out, { recursive: true });
for (const [k, eq] of Object.entries(arms)) {
  const req = compose(skeleton, {
    name: "shredzepelin",
    race: race as never,
    equipment: eq,
  });
  writeFileSync(resolve(out, `${k}.req.json`), JSON.stringify(req, null, 2) + "\n");
  const gemCount = eq.reduce((n, i) => n + (i.gems?.length ?? 0), 0);
  console.log(k, "written; ids=", eq.map((i) => i.id ?? 0).join(","), "gems=", gemCount);
}
