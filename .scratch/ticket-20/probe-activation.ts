import { gemsForPhase } from "../../packages/core/src/gems.js";
import { metaDeficit, gemColorCounts } from "../../packages/core/src/meta.js";
import gear from "../../.scratch/rank-reports/slamaltman-baseline-gear.json" with { type: "json" };
import db from "../../vendor/wowsims/db.json" with { type: "json" };

const names = new Map<number, string>(
  (db as any).gems.map((g: any) => [g.id, g.name])
);
const items = (gear as any).gear[0].items as any[];
const worn = items.flatMap((i) => i.gems ?? []).filter((g: number) => g > 0);
console.log("worn gems:", worn.length);
const nonMeta = worn.filter((id: number) => {
  const g = (db as any).gems.find((x: any) => x.id === id);
  return g && g.color !== 1;
});
const counts = gemColorCounts(nonMeta);
console.log("non-meta colour counts:", JSON.stringify(counts));
for (const meta of [32409, 25894, 34220]) {
  console.log(
    `  ${meta} ${String(names.get(meta)).padEnd(32)} deficit=${metaDeficit(meta, counts)}`
  );
}
