import { fillEmptyCandidateGems } from "../../packages/core/src/candidate-gems.js";
import { gemsForPhase } from "../../packages/core/src/gems.js";
import ep from "../../data/presets/ret/p2.ep-weights.json" with { type: "json" };
import db from "../../vendor/wowsims/db.json" with { type: "json" };

const names = new Map<number, string>(
  (db as any).gems.map((g: any) => [g.id, g.name])
);
const w = ep.weights as Record<string, number>;
const palette = gemsForPhase(3);
const metas = palette.filter((g: any) => g.colour === 1);
const score = (g: any) =>
  Object.entries(w).reduce(
    (t, [k, v]) => t + ((g.stats?.[Number(k)] ?? 0) as number) * v,
    0
  );
console.log("=== meta gems by ret stat-EP ===");
for (const g of [...metas].sort((a: any, b: any) => score(b) - score(a))) {
  console.log(
    `  ${g.id}  EP=${score(g).toFixed(2).padStart(6)}  ${names.get(g.id)}`
  );
}
// Furious Gizmatic Goggles (32461): meta + yellow, both empty.
const filled = fillEmptyCandidateGems(32461, [0, 0], palette, w, {});
console.log("\n=== fill of 32461 with two empty sockets ===");
console.log(
  "  picked:",
  filled.map((id) => `${id} ${names.get(id) ?? ""}`).join(" | ")
);
