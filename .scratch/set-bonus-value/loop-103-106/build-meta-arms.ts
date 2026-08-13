// Throwaway diagnostic (subagent 05). Builds three controlled helm arms from
// the production CURSED request, and reports the REAL metaStatus of each.
// No production edits. Run:
//   pnpm exec tsx .scratch/set-bonus-value/loop-103-106/build-meta-arms.ts
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { metaStatus } from "../../../packages/core/src/meta.js";
import { getItem } from "../../../packages/core/src/items.js";

const ROOT = resolve(process.cwd());
const REQ = resolve(
  ROOT,
  ".scratch/set-bonus-value/loop-103-106/prod-requests/CURSED.req.json"
);
const OUT = resolve(ROOT, ".scratch/set-bonus-value/loop-103-106/meta-arms");
mkdirSync(OUT, { recursive: true });

type Item = { id?: number; enchant?: number; gems?: number[] };
const base = JSON.parse(readFileSync(REQ, "utf-8"));

function clone(): { req: unknown; items: Item[] } {
  const req = JSON.parse(JSON.stringify(base));
  return { req, items: req.raid.parties[0].players[0].equipment.items };
}

// META_ACTIVE = the production payload, untouched.
const A = clone();

// META_DEAD = restore the four recoloured gems to 24028; meta stays socketed.
const D = clone();
D.items[2]!.gems = [24028, 24028];
D.items[4]!.gems = [24028, 24028, 24028];

// NO_META = meta socket gets the best ordinary red instead (32194, Delicate
// Crimson Spinel: 10 agi, phase 3, non-unique, best red agi gem in the palette
// and already the gem production picks for the helm's other socket).
const N = clone();
N.items[0]!.gems = [32194, 32194];
N.items[2]!.gems = [24028, 24028];
N.items[4]!.gems = [24028, 24028, 24028];

const arms: Record<string, { req: unknown; items: Item[] }> = {
  META_ACTIVE: A,
  META_DEAD: D,
  NO_META: N,
};

for (const [tag, arm] of Object.entries(arms)) {
  const head = arm.items[0]!;
  const headItem = getItem(head.id!);
  const allGems = arm.items.flatMap((i) => i.gems ?? []).filter(Boolean);
  const st = metaStatus(headItem!.sockets, allGems);
  console.log(`${tag}:`);
  console.log(`  head ${head.id} sockets ${JSON.stringify(headItem!.sockets)}`);
  console.log(`  head gems ${JSON.stringify(head.gems)}`);
  console.log(`  shoulder 29100 gems ${JSON.stringify(arm.items[2]!.gems)}`);
  console.log(`  chest 29096 gems ${JSON.stringify(arm.items[4]!.gems)}`);
  console.log(`  metaStatus = ${JSON.stringify(st)}`);
  writeFileSync(
    resolve(OUT, `${tag}.req.json`),
    JSON.stringify(arm.req, null, 2) + "\n"
  );
}
console.log("written to", OUT);
