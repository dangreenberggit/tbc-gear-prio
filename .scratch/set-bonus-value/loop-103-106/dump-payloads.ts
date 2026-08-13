// Throwaway diagnostic script — payload dump only, no sims, no production edits.
// Run: pnpm exec tsx .scratch/set-bonus-value/loop-103-106/dump-payloads.ts
import { readFileSync } from "node:fs";
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

// applyRepairedGems is NOT exported from rank.ts (only equipmentForCandidateSwap
// is, per its own doc comment about tests needing to exercise the real thing).
// This is a byte-for-byte copy of rank.ts's private applyRepairedGems, used
// ONLY to reconstruct the BASELINE equipment the same way rank.ts:472-475
// does. It is NOT used for either swap arm — equipmentForCandidateSwap
// (imported above) is the real, unmodified, exported production function and
// does its own internal applyRepairedGems call.
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
import { gemContext } from "../../../packages/core/src/candidate-gems.js";
import { gemsForPhase } from "../../../packages/core/src/gems.js";
import {
  feralOfflineRecordings,
  SHREDZEPELIN_REF,
  type FeralRawFixture,
} from "../../../packages/core/src/fixtures/feral-offline.js";
import { SIM_ORDER } from "../../../packages/core/src/slots.js";

const ROOT = resolve(process.cwd());

function loadJson<T>(rel: string): T {
  return JSON.parse(readFileSync(resolve(ROOT, rel), "utf-8")) as T;
}

const raw = loadJson<FeralRawFixture>(
  "test/fixtures/shredzepelin-cat.raw.json"
);
const gearData = feralOfflineRecordings(raw, SHREDZEPELIN_REF);
const key = [...gearData.gear.keys()][0];
if (!key) throw new Error("no gear entries for shredzepelin");
const logged = gearData.gear.get(key)!;

const epWeights = loadJson<{ weights: Record<string, number> }>(
  "data/presets/feral/p1.ep-weights.json"
).weights;
const maxPhase = 3;
const palette = gemsForPhase(maxPhase);

// Mirror rank.ts:448-475 exactly for the baseline.
let socketed = socketedItemsFromLoggedGear(logged);
const repairedBaseline = repairMeta({ items: socketed, epWeights, palette });
socketed = repairedBaseline.items;
const baselineEquipment: SimItemSpec[] = applyRepairedGemsForBaselineOnly(
  equipmentFromLoggedGear(logged),
  socketed
);

const gems = gemContext(palette, epWeights);

// --- (a) four-piece T6 package, applied SEQUENTIALLY exactly as rank.ts:1066-1074 ---
const IDX = { shoulder: 2, chest: 4, hands: 6, legs: 8 } as const;
const TIER = { shoulder: 31048, chest: 31042, hands: 31034, legs: 31044 } as const;
let packageEquipment: SimItemSpec[] = [...baselineEquipment];
for (const slot of ["shoulder", "chest", "hands", "legs"] as const) {
  packageEquipment = equipmentForCandidateSwap(
    packageEquipment,
    IDX[slot],
    TIER[slot],
    gems
  );
}

// --- (b)/(c) single helm swaps ---
const HEAD_IDX = SIM_ORDER.indexOf("head" as (typeof SIM_ORDER)[number]);
const CURSED_VISION = 32235;
const VENGEFUL_GLAD = 33672;

const cursedVisionEquipment = equipmentForCandidateSwap(
  baselineEquipment,
  HEAD_IDX,
  CURSED_VISION,
  gems
);
const vengefulGladEquipment = equipmentForCandidateSwap(
  baselineEquipment,
  HEAD_IDX,
  VENGEFUL_GLAD,
  gems
);

const dump = {
  simOrder: SIM_ORDER,
  headIdx: HEAD_IDX,
  baseline: baselineEquipment,
  t6Package: packageEquipment,
  cursedVisionHelm: cursedVisionEquipment,
  vengefulGladHelm: vengefulGladEquipment,
};

console.log(JSON.stringify(dump, null, 2));
