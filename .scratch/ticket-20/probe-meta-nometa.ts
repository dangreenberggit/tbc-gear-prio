import { socketsFor } from "../../packages/core/src/items.js";
import { migrateGemsToItem } from "../../packages/core/src/migrate-gems.js";
import { GemColor } from "../../packages/core/src/proto/common_pb.js";
import uni from "../../data/universes/ret-p3.json" with { type: "json" };

// A helm with NO meta socket, or an ungemmed helm: what happens then?
const cases: [string, number, number[]][] = [
  ["ungemmed helm w/ meta socket (32461, no gems)", 32461, []],
  ["helm with only the yellow filled", 32461, [0, 24054]],
];
for (const [label, wornId, wornGems] of cases) {
  console.log(`\n=== ${label} ===`);
  let empty = 0,
    total = 0;
  for (const e of (uni as any).entries) {
    if (e.slot !== "head") continue;
    const sock = socketsFor(e.itemId);
    if (!sock.includes(GemColor.GemColorMeta)) continue;
    total++;
    const m = migrateGemsToItem(wornGems, wornId, e.itemId);
    if ((m[sock.indexOf(GemColor.GemColorMeta)] ?? 0) === 0) empty++;
  }
  console.log(`  candidates ${total}, meta socket empty afterwards: ${empty}`);
}
