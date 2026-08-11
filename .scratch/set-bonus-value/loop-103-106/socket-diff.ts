// Empty-socket and dropped-gem check across all four dumped arms, using the
// real db.json gemSockets counts.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(process.cwd());
const dump = JSON.parse(
  readFileSync(
    resolve(ROOT, ".scratch/set-bonus-value/loop-103-106/payload-dump.json"),
    "utf-8"
  )
);
const db = JSON.parse(
  readFileSync(resolve(ROOT, "vendor/wowsims/db.json"), "utf-8")
);
const socketsById = new Map<number, number>(
  db.items.map((i: { id: number; gemSockets?: number[] }) => [
    i.id,
    (i.gemSockets ?? []).length,
  ])
);
const namesById = new Map<number, string>(
  db.items.map((i: { id: number; name: string }) => [i.id, i.name])
);

function multiset(gemIds: number[]): Map<number, number> {
  const m = new Map<number, number>();
  for (const id of gemIds) m.set(id, (m.get(id) ?? 0) + 1);
  return m;
}

for (const arm of [
  "baseline",
  "t6Package",
  "cursedVisionHelm",
  "vengefulGladHelm",
]) {
  const equipment: Array<{ id?: number; gems: number[] }> = dump[arm];
  console.log(`\n=== ${arm} ===`);
  for (const item of equipment) {
    if (!item.id) continue;
    const expected = socketsById.get(item.id) ?? 0;
    const got = (item.gems ?? []).length;
    const flag = got < expected ? "  <-- EMPTY SOCKET" : "";
    if (expected > 0 || got > 0) {
      console.log(
        `  ${item.id} ${namesById.get(item.id) ?? "?"} sockets=${expected} gems=${got}${flag}`
      );
    }
  }
}

console.log("\n=== gem multiset diffs ===");
const baselineGems = (dump.baseline as Array<{ gems: number[] }>).flatMap(
  (i) => i.gems ?? []
);
const baseMs = multiset(baselineGems);

for (const arm of ["t6Package", "cursedVisionHelm", "vengefulGladHelm"]) {
  const armGems = (dump[arm] as Array<{ gems: number[] }>).flatMap(
    (i) => i.gems ?? []
  );
  const armMs = multiset(armGems);
  console.log(`\n-- baseline vs ${arm} --`);
  const allIds = new Set([...baseMs.keys(), ...armMs.keys()]);
  for (const id of allIds) {
    const b = baseMs.get(id) ?? 0;
    const a = armMs.get(id) ?? 0;
    if (a !== b) {
      console.log(`  gem ${id}: baseline=${b} arm=${a} (${a - b >= 0 ? "+" : ""}${a - b})`);
    }
  }
  console.log(`  total gem count: baseline=${baselineGems.length} arm=${armGems.length}`);
}

console.log("\n=== cursedVisionHelm vs vengefulGladHelm gem diff ===");
const cvGems = (dump.cursedVisionHelm as Array<{ gems: number[] }>).flatMap(
  (i) => i.gems ?? []
);
const vgGems = (dump.vengefulGladHelm as Array<{ gems: number[] }>).flatMap(
  (i) => i.gems ?? []
);
const cvMs = multiset(cvGems);
const vgMs = multiset(vgGems);
const allIds2 = new Set([...cvMs.keys(), ...vgMs.keys()]);
let anyDiff = false;
for (const id of allIds2) {
  const c = cvMs.get(id) ?? 0;
  const v = vgMs.get(id) ?? 0;
  if (c !== v) {
    anyDiff = true;
    console.log(`  gem ${id}: cursedVision=${c} vengefulGlad=${v}`);
  }
}
if (!anyDiff) console.log("  IDENTICAL gem multisets");
console.log(`  total: cursedVision=${cvGems.length} vengefulGlad=${vgGems.length}`);
