import { readFileSync, writeFileSync } from "node:fs";
const ROOT = "C:/Users/dgree/Code/lulz/tbc-gear-prio";
import { gemsForPhase } from "C:/Users/dgree/Code/lulz/tbc-gear-prio/packages/core/src/gems.js";
import { gemContext } from "C:/Users/dgree/Code/lulz/tbc-gear-prio/packages/core/src/candidate-gems.js";
import { equipmentForCandidateSwap } from "C:/Users/dgree/Code/lulz/tbc-gear-prio/packages/core/src/rank.js";

const base = JSON.parse(readFileSync(ROOT + "/.scratch/set-bonus-value/loop-103-106/uigems-arms-simplerot/OWNER2_BASE.req.json", "utf8"));
const weights = JSON.parse(readFileSync(ROOT + "/data/presets/feral/p1.ep-weights.json", "utf8")).weights;
const items = base.raid.parties[0].players[0].equipment.items;
let equipment = items.map((it: any) => ({ id: it.id ?? 0, gems: [...(it.gems ?? [])], ...(it.enchant ? { enchant: it.enchant } : {}) }));
const ctx = gemContext(gemsForPhase(3), weights);
for (const [slot, id] of [[2, 31048], [4, 31042], [6, 31034], [8, 31044]] as const) {
  equipment = equipmentForCandidateSwap(equipment, slot, id, ctx);
}
for (const i of [2, 4, 6, 8]) console.log(i, JSON.stringify(equipment[i]));
const out = JSON.parse(JSON.stringify(base));
out.raid.parties[0].players[0].equipment.items = equipment.map((e: any) => {
  const o: any = { id: e.id };
  if (e.enchant) o.enchant = e.enchant;
  if (e.gems && e.gems.length) o.gems = e.gems;
  return o;
});
writeFileSync(ROOT + "/.scratch/set-bonus-value/loop-103-106/uigems-arms-simplerot/PKG_PROD_POSTFIX.req.json", JSON.stringify(out));
console.log("written PKG_PROD_POSTFIX.req.json");
