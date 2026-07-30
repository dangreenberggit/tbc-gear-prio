import { socketsFor } from "../../packages/core/src/items.js";
import { migrateGemsToItem } from "../../packages/core/src/migrate-gems.js";
import { GemColor } from "../../packages/core/src/proto/common_pb.js";
import uni from "../../data/universes/ret-p3.json" with { type: "json" };
import gear from "../../.scratch/rank-reports/slamaltman-baseline-gear.json" with { type: "json" };

const items = (gear as any).gear[0].items as any[];
const helm = items.find((i) => i.slot === "head");
console.log(`worn helm ${helm.id} ${helm.name} gems=[${helm.gems}]`);
console.log(`  sockets: ${JSON.stringify(socketsFor(helm.id))}`);

let metaCandidates = 0,
  carried = 0,
  empty = 0;
const emptyOnes: string[] = [];
for (const e of (uni as any).entries) {
  if (e.slot !== "head") continue;
  const sock = socketsFor(e.itemId);
  if (!sock.includes(GemColor.GemColorMeta)) continue;
  metaCandidates++;
  const migrated = migrateGemsToItem(helm.gems, helm.id, e.itemId);
  const metaIdx = sock.indexOf(GemColor.GemColorMeta);
  if ((migrated[metaIdx] ?? 0) > 0) carried++;
  else {
    empty++;
    emptyOnes.push(`${e.itemId} ${e.name}`);
  }
}
console.log(`\nhead candidates with a meta socket: ${metaCandidates}`);
console.log(`  meta carried over from worn helm : ${carried}`);
console.log(`  meta socket left EMPTY (EP picks): ${empty}`);
for (const n of emptyOnes) console.log(`     ${n}`);
