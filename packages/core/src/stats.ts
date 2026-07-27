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

/**
 * EP of a dense stats array under sparse (`{"17": 0.41}`) or dense weights.
 * Missing weight → 0.
 */
export function epScore(
  stats: readonly number[],
  weights: Readonly<Record<string, number>> | readonly number[]
): number {
  if (Array.isArray(weights)) {
    let total = 0;
    for (let i = 0; i < weights.length; i++) {
      total += (stats[i] ?? 0) * (weights[i] ?? 0);
    }
    return total;
  }
  let total = 0;
  for (const [k, w] of Object.entries(weights)) {
    total += (stats[Number(k)] ?? 0) * w;
  }
  return total;
}
