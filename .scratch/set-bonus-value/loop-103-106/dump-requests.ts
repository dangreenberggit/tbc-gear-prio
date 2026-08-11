// Throwaway diagnostic — builds the EXACT production sim request for the two
// helm arms + baseline via the real compose(), for byte-diffing against
// subagent 02's harness .req.json files. No sims, no production edits.
// Run: pnpm exec tsx .scratch/set-bonus-value/loop-103-106/dump-requests.ts
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
const baselineEquipment = applyRepairedGemsForBaselineOnly(
  equipmentFromLoggedGear(logged),
  socketed
);
const gems = gemContext(palette, epWeights);

const skeleton = loadJson<Parameters<typeof compose>[0]>(
  "data/presets/feral/p2.raid-sim-skeleton.json"
);

const HEAD = SIM_ORDER.indexOf("head" as (typeof SIM_ORDER)[number]);
const name = "shredzepelin";
const race = (
  skeleton as unknown as {
    raid: { parties: { players: { race: unknown }[] }[] };
  }
).raid.parties[0]!.players[0]!.race;

const arms: Record<string, SimItemSpec[]> = {
  BASE: baselineEquipment,
  CURSED: equipmentForCandidateSwap(baselineEquipment, HEAD, 32235, gems),
  VENG: equipmentForCandidateSwap(baselineEquipment, HEAD, 33672, gems),
};

const out = resolve(ROOT, ".scratch/set-bonus-value/loop-103-106/prod-requests");
mkdirSync(out, { recursive: true });
for (const [k, eq] of Object.entries(arms)) {
  const req = compose(skeleton, {
    name,
    race: race as never,
    equipment: eq,
  });
  writeFileSync(
    resolve(out, `${k}.req.json`),
    JSON.stringify(req, null, 2) + "\n"
  );
  console.log(k, "written");
}
console.log("race used:", JSON.stringify(race));
