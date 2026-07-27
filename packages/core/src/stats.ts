/**
 * Stat-index helpers for raw stats / socketBonus arrays in
 * data/items/index.json and data/gems/palette.json.
 *
 * Indices match proto.Stat in data/proto/common.proto (generated into
 * packages/core/src/proto/common_pb.ts). Ticket 04's EP cost function needs
 * this before it can price a forfeited socket bonus.
 */

import { Stat } from "./proto/common_pb.js";

export { Stat };

/** Read one stat from a dense wowsims stats array. Missing/short → 0. */
export function statAt(stats: readonly number[], stat: Stat): number {
  return stats[stat] ?? 0;
}
