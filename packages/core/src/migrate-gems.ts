/**
 * Move gems from a worn piece onto a candidate item the way wowsims UI
 * `EquippedItem.withItem` does: prefer colour-matched sockets, else any
 * eligible non-meta / meta socket. Empty leftover sockets stay 0.
 *
 * Ranking then may EP-fill only those empties — full EP re-gem of the piece
 * is what made real upgrades look like losses vs the UI.
 */

import { getGem } from "./gems.js";
import { socketsFor } from "./items.js";
import { gemColorMatchesSocket } from "./meta.js";
import { GemColor } from "./proto/common_pb.js";

export function migrateGemsToItem(
  wornGems: readonly number[],
  wornItemId: number,
  newItemId: number
): number[] {
  const newSockets = socketsFor(newItemId);
  if (newSockets.length === 0) return [];

  const wornSocketCount = socketsFor(wornItemId).length;
  const source = wornGems
    .slice(0, wornSocketCount > 0 ? wornSocketCount : wornGems.length)
    .filter((id) => id > 0);

  const out: number[] = new Array(newSockets.length).fill(0);

  for (const gemId of source) {
    const gem = getGem(gemId);
    if (!gem) continue;

    const matchIdx = newSockets.findIndex(
      (socket, i) =>
        out[i] === 0 &&
        gemEligibleForSocket(gem.colour, socket) &&
        gemColorMatchesSocket(gem.colour, socket)
    );
    if (matchIdx >= 0) {
      out[matchIdx] = gemId;
      continue;
    }

    const eligibleIdx = newSockets.findIndex(
      (socket, i) => out[i] === 0 && gemEligibleForSocket(gem.colour, socket)
    );
    if (eligibleIdx >= 0) out[eligibleIdx] = gemId;
  }

  return out;
}

/** Meta gems only in meta sockets; non-meta never in meta. */
export function gemEligibleForSocket(
  gemColour: number,
  socketColour: number
): boolean {
  if (socketColour === GemColor.GemColorMeta) {
    return gemColour === GemColor.GemColorMeta;
  }
  return gemColour !== GemColor.GemColorMeta;
}
