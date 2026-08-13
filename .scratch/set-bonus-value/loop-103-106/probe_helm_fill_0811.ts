// Throwaway probe: isolate fill vs repairMeta on the helm swap.
import { readFileSync } from "node:fs";
import { gemsForPhase } from "../../../packages/core/src/gems.js";
import { gemContext, fillEmptyCandidateGems } from "../../../packages/core/src/candidate-gems.js";
import { migrateGemsToItem } from "../../../packages/core/src/migrate-gems.js";
import { repairMeta } from "../../../packages/core/src/meta-repair.js";
const ROOT = "C:/Users/dgree/Code/lulz/tbc-gear-prio";
const base = JSON.parse(readFileSync(ROOT + "/.scratch/set-bonus-value/loop-103-106/uigems-arms-simplerot/OWNER2_BASE.req.json","utf8"));
const weights = JSON.parse(readFileSync(ROOT + "/data/presets/feral/p1.ep-weights.json","utf8")).weights;
const items = base.raid.parties[0].players[0].equipment.items;
const ctx = gemContext(gemsForPhase(3), weights);
console.log("palette size", ctx.palette.length, "fillPalette size", ctx.fillPalette.length);
console.log("fillPalette max quality", Math.max(...ctx.fillPalette.map((g:any)=>g.quality)));
for (const helm of [32235, 33672]) {
  const migrated = migrateGemsToItem([], 8345, helm);
  const filled = fillEmptyCandidateGems(helm, migrated, ctx.fillPalette, ctx.weightRecord, {} as any);
  console.log(helm, "after fill (rare-capped):", JSON.stringify(filled));
  const socketed = items.map((it:any,i:number)=>({ itemId: i===0?helm:(it.id??0), gems: i===0?[...filled]:[...(it.gems??[])] }));
  const rep = repairMeta({ items: socketed, epWeights: weights, palette: ctx.palette });
  console.log(helm, "after repairMeta:", JSON.stringify(rep.items[0]));
}
