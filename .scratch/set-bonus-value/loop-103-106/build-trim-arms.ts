// Throwaway (subagent 07). Isolates the THREE trim differences between our
// fixture baseline and the owner's corrected (v2) gear, one at a time, and
// builds CURSED/VENG helm arms on each so the helm gap can be attributed.
// Run: pnpm exec tsx .scratch/set-bonus-value/loop-103-106/build-trim-arms.ts
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

const patch = (
  base: SimItemSpec[],
  i: number,
  fields: Partial<SimItemSpec>
): SimItemSpec[] => base.map((s, j) => (j === i ? { ...s, ...fields } : s));

// T1: shoulder enchant 2983 -> 2986 (Greater Inscription of Vengeance)
const T1 = patch(oursBaseline, 2, { enchant: 2986 } as Partial<SimItemSpec>);
// T2: feet gems [24028,24028] -> [24028,24058]
const T2 = patch(oursBaseline, 9, { gems: [24028, 24058] } as Partial<SimItemSpec>);
// T3: both rings gain enchant 2929 (Enchant Ring - Striking, +2 wpn dmg)
const T3 = patch(patch(oursBaseline, 10, { enchant: 2929 } as Partial<SimItemSpec>), 11, {
  enchant: 2929,
} as Partial<SimItemSpec>);

const bases: Record<string, SimItemSpec[]> = { T1, T2, T3 };

const arms: Record<string, SimItemSpec[]> = {};
for (const [tag, b] of Object.entries(bases)) {
  arms[`${tag}_BASE`] = b;
  arms[`${tag}_CURSED`] = equipmentForCandidateSwap(b, HEAD, 32235, gems);
  arms[`${tag}_VENG`] = equipmentForCandidateSwap(b, HEAD, 33672, gems);
}

const out = resolve(ROOT, ".scratch/set-bonus-value/loop-103-106/trim-arms");
mkdirSync(out, { recursive: true });
const ownerRot = loadJson<{ player: { rotation: unknown } }>(
  ".scratch/set-bonus-value/loop-103-106/owner-settings-export-v2.json"
).player.rotation;
for (const [k, eq] of Object.entries(arms)) {
  const req = compose(skeleton, {
    name: "shredzepelin",
    race: race as never,
    equipment: eq,
  }) as unknown as {
    raid: { parties: { players: { rotation: unknown }[] }[] };
  };
  req.raid.parties[0]!.players[0]!.rotation = ownerRot;
  writeFileSync(resolve(out, `${k}.req.json`), JSON.stringify(req, null, 2) + "\n");
  console.log(k, "written; ids=", eq.map((i) => i.id ?? 0).join(","));
}
