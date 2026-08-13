// Throwaway diagnostic (subagent 08). Builds T6 four-piece package arms several
// ways on the CORRECTED owner gear (owner-settings-export-v2.json), to price the
// sequential-re-gem mechanism under the owner's TypeSimple rotation.
//
//  PKG_PROD      — the exact production payload (4 sequential equipmentForCandidateSwap)
//  PKG_UIMIGRATE — upstream wowsims `EquippedItem.withItem` semantics ONLY:
//                  migrate gems, leave leftover sockets EMPTY, no EP fill, no repairMeta.
//                  Uses the REAL exported migrateGemsToItem (a faithful port of
//                  withItem — verified line-by-line against upstream source).
//  PKG_NOFILL_*  — intermediates isolating which of the four swaps diverges:
//                  swap i uses UI semantics, the rest use production semantics.
//
// Run: pnpm exec tsx .scratch/set-bonus-value/loop-103-106/build-uigems-arms.ts
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import {
  equipmentForCandidateSwap,
  type SimItemSpec,
} from "../../../packages/core/src/rank.js";
import { migrateGemsToItem } from "../../../packages/core/src/migrate-gems.js";
import { gemContext } from "../../../packages/core/src/candidate-gems.js";
import { gemsForPhase } from "../../../packages/core/src/gems.js";
import { compose } from "../../../packages/core/src/compose.js";
import { SIM_ORDER } from "../../../packages/core/src/slots.js";

const ROOT = resolve(process.cwd());
const loadJson = <T,>(rel: string): T =>
  JSON.parse(readFileSync(resolve(ROOT, rel), "utf-8")) as T;

const epWeights = loadJson<{ weights: Record<string, number> }>(
  "data/presets/feral/p1.ep-weights.json"
).weights;
const palette = gemsForPhase(3);
const gems = gemContext(palette, epWeights);

type OwnerItem = { id?: number; enchant?: number; gems?: number[] };
const ownerExport = loadJson<{
  player: { equipment: { items: OwnerItem[] } };
}>(".scratch/set-bonus-value/loop-103-106/owner-settings-export-v2.json");
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

const T6: ReadonlyArray<readonly [number, number, string]> = [
  [idx("shoulder"), 31048, "shoulder"],
  [idx("chest"), 31042, "chest"],
  [idx("hands"), 31034, "hands"],
  [idx("legs"), 31044, "legs"],
];

/**
 * REIMPLEMENTATION of one swap under wowsims web UI semantics.
 * Upstream `EquippedItem.withItem` (ui/core/proto_utils/equipped_item.ts:138-168
 * @ commit 8aa378b) migrates gems by colour and leaves leftover sockets NULL.
 * It does NOT EP-fill, and there is no repairMeta equivalent. The migration
 * itself uses the REAL exported migrateGemsToItem, whose docstring states it
 * is a port of withItem — so only the fill/repair steps are suppressed here.
 */
function uiSwap(
  equipment: readonly SimItemSpec[],
  slotIndex: number,
  itemId: number
): SimItemSpec[] {
  return equipment.map((spec, i) => {
    if (i !== slotIndex) return spec;
    const migrated = migrateGemsToItem(spec.gems ?? [], spec.id ?? 0, itemId);
    const out: SimItemSpec = { id: itemId, gems: migrated };
    if (spec.enchant !== undefined) out.enchant = spec.enchant;
    return out;
  });
}

function pkgArm(base: SimItemSpec[], uiSlots: ReadonlySet<number>): SimItemSpec[] {
  let eq = base;
  for (const [slot, id] of T6) {
    eq = uiSlots.has(slot)
      ? uiSwap(eq, slot, id)
      : equipmentForCandidateSwap(eq, slot, id, gems);
  }
  return eq;
}

const ALL = new Set(T6.map(([s]) => s));
const NONE = new Set<number>();

const arms: Record<string, SimItemSpec[]> = {
  OWNER2_BASE: ownerBaseline,
  PKG_PROD: pkgArm(ownerBaseline, NONE),
  PKG_UIMIGRATE: pkgArm(ownerBaseline, ALL),
};
for (const [slot, , name] of T6) {
  arms[`PKG_UIONLY_${name}`] = pkgArm(ownerBaseline, new Set([slot]));
}

const out = resolve(ROOT, ".scratch/set-bonus-value/loop-103-106/uigems-arms");
mkdirSync(out, { recursive: true });
for (const [k, eq] of Object.entries(arms)) {
  const req = compose(skeleton, {
    name: "shredzepelin",
    race: race as never,
    equipment: eq,
  });
  writeFileSync(resolve(out, `${k}.req.json`), JSON.stringify(req, null, 2) + "\n");
  const gemCount = eq.reduce(
    (n, i) => n + (i.gems ?? []).filter((g) => g > 0).length,
    0
  );
  console.log(
    k.padEnd(22),
    "gems=",
    String(gemCount).padStart(2),
    " T6slots=",
    T6.map(([s]) => `${eq[s]?.id}:[${(eq[s]?.gems ?? []).join(",")}]`).join(" ")
  );
}
