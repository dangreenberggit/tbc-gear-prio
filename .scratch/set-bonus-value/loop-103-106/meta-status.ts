// Compute meta status for each dumped arm using the real production
// `metaStatus` function (packages/core/src/meta.ts). Reads the payload dump
// produced by dump-payloads.ts.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { metaStatus } from "../../../packages/core/src/meta.js";

const ROOT = resolve(process.cwd());
const dump = JSON.parse(
  readFileSync(
    resolve(
      ROOT,
      ".scratch/set-bonus-value/loop-103-106/payload-dump.json"
    ),
    "utf-8"
  )
);

// Head sockets for the meta-socket check. Wolfshead Helm (8345, baseline)
// has no gemSockets entry in db.json at all -> no meta socket.
// Cursed Vision of Sargeras (32235) and Vengeful Gladiator's Dragonhide Helm
// (33672) both have gemSockets:[1,4] (from vendor/wowsims/db.json), where
// GemColor 1 = Meta per proto/common_pb.js (checked below).
const HEAD_SOCKETS: Record<string, number[]> = {
  baseline: [], // Wolfshead Helm 8345 has no gemSockets field at all
  cursedVisionHelm: [1, 4],
  vengefulGladHelm: [1, 4],
};

for (const arm of ["baseline", "cursedVisionHelm", "vengefulGladHelm"]) {
  const equipment: Array<{ id?: number; gems: number[] }> = dump[arm];
  const allGemIds = equipment.flatMap((i) => i.gems ?? []);
  const status = metaStatus(HEAD_SOCKETS[arm]!, allGemIds);
  console.log(arm, JSON.stringify(status));
}
