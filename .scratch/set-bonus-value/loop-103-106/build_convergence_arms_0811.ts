// Throwaway diagnostic (convergence check 2026-08-11). Rebuilds the helm A/B and
// a belt single-swap through the CURRENT engine's equipmentForCandidateSwap, so
// repairMeta runs (the trap from iterations 2/4/5) and the post-ticket-111 rare
// fill cap applies. Base gear is the owner's v2 export as already frozen in
// uigems-arms-simplerot/OWNER2_BASE.req.json (owner settings + TypeSimple).
// Run: pnpm exec tsx .scratch/set-bonus-value/loop-103-106/build_convergence_arms_0811.ts
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
const ROOT = "C:/Users/dgree/Code/lulz/tbc-gear-prio";
import { gemsForPhase } from "../../../packages/core/src/gems.js";
import { gemContext } from "../../../packages/core/src/candidate-gems.js";
import { equipmentForCandidateSwap } from "../../../packages/core/src/rank.js";

const DIR = ROOT + "/.scratch/set-bonus-value/loop-103-106/convergence-arms-0811";
mkdirSync(DIR, { recursive: true });

const base = JSON.parse(
  readFileSync(
    ROOT + "/.scratch/set-bonus-value/loop-103-106/uigems-arms-simplerot/OWNER2_BASE.req.json",
    "utf8"
  )
);
const weights = JSON.parse(
  readFileSync(ROOT + "/data/presets/feral/p1.ep-weights.json", "utf8")
).weights;
const items = base.raid.parties[0].players[0].equipment.items;
const equipment0 = items.map((it: any) => ({
  id: it.id ?? 0,
  gems: [...(it.gems ?? [])],
  ...(it.enchant ? { enchant: it.enchant } : {}),
}));
const ctx = gemContext(gemsForPhase(3), weights);

const HEAD = 0;
const WAIST = 7;

const arms: Record<string, { slot: number; id: number }> = {
  CURSED: { slot: HEAD, id: 32235 }, // Cursed Vision of Sargeras
  VENG: { slot: HEAD, id: 33672 }, // Vengeful Gladiator's Dragonhide Helm
  BELT100: { slot: WAIST, id: 30106 }, // Belt of One-Hundred Deaths
};

function emit(tag: string, eq: any[]) {
  const out = JSON.parse(JSON.stringify(base));
  out.raid.parties[0].players[0].equipment.items = eq.map((e: any) => {
    const o: any = { id: e.id };
    if (e.enchant) o.enchant = e.enchant;
    if (e.gems && e.gems.length) o.gems = e.gems;
    return o;
  });
  writeFileSync(DIR + `/${tag}.req.json`, JSON.stringify(out));
}

emit("OWNER2_BASE", equipment0);
console.log("OWNER2_BASE head=", JSON.stringify(equipment0[HEAD]), "waist=", JSON.stringify(equipment0[WAIST]));
for (const [tag, { slot, id }] of Object.entries(arms)) {
  const eq = equipmentForCandidateSwap(equipment0, slot, id, ctx);
  emit(tag, eq as any[]);
  console.log(tag, "slot", slot, "->", JSON.stringify((eq as any[])[slot]));
}
console.log("written to", DIR);
