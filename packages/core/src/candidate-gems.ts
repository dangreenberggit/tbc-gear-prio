/**
 * Fill empty sockets on a candidate item with highest-EP gems from the phase
 * palette. Chooses between colour-matched (keeps socket bonus) and unrestricted
 * layouts using gem-fill weights that zero softcapped ratings — uncapped hit
 * EP otherwise prefers Glinting over Bold on sets that are already hit-capped.
 */

import { getGem, type GemEntry } from "./gems.js";
import { getItem, socketsFor } from "./items.js";
import { gemColorMatchesSocket } from "./meta.js";
import { GemColor } from "./proto/common_pb.js";
import { epScore, Stat } from "./stats.js";

type EpWeights = Readonly<Record<string, number>>;

export function fillCandidateGems(
  itemId: number,
  palette: readonly GemEntry[],
  epWeights: EpWeights
): number[] {
  const sockets = socketsFor(itemId);
  if (sockets.length === 0) return [];

  const weights = gemFillWeights(epWeights);
  const matched = fillSockets(sockets, palette, weights, true);
  const free = fillSockets(sockets, palette, weights, false);
  const matchedScore = layoutScore(itemId, sockets, matched, weights);
  const freeScore = layoutScore(itemId, sockets, free, weights);
  return freeScore > matchedScore ? free : matched;
}

/**
 * Keep already-placed gems; EP-fill only empty sockets (after UI-style migrate).
 */
export function fillEmptyCandidateGems(
  itemId: number,
  gems: readonly number[],
  palette: readonly GemEntry[],
  epWeights: EpWeights
): number[] {
  const sockets = socketsFor(itemId);
  if (sockets.length === 0) return [];

  const filled = fillCandidateGems(itemId, palette, epWeights);
  const out: number[] = [];
  for (let i = 0; i < sockets.length; i++) {
    const kept = gems[i] ?? 0;
    out.push(kept > 0 ? kept : (filled[i] ?? 0));
  }
  return out;
}

/**
 * Softcaps: melee hit / expertise EP overstates gems on capped raid sets.
 * Used only for candidate socket fills — meta-repair keeps full EP weights.
 */
export function gemFillWeights(epWeights: EpWeights): Record<string, number> {
  const out: Record<string, number> = { ...epWeights };
  out[String(Stat.StatMeleeHitRating)] = 0;
  out[String(Stat.StatExpertiseRating)] = 0;
  return out;
}

function fillSockets(
  sockets: readonly number[],
  palette: readonly GemEntry[],
  epWeights: EpWeights,
  matchColors: boolean
): number[] {
  const gems: number[] = [];
  const usedUnique = new Set<number>();

  for (const socket of sockets) {
    const pick = bestGemForSocket(
      socket,
      palette,
      epWeights,
      usedUnique,
      matchColors
    );
    if (pick) {
      gems.push(pick.id);
      if (pick.unique) usedUnique.add(pick.id);
    } else {
      gems.push(0);
    }
  }

  return gems;
}

function bestGemForSocket(
  socket: number,
  palette: readonly GemEntry[],
  epWeights: EpWeights,
  usedUnique: ReadonlySet<number>,
  matchColors: boolean
): GemEntry | undefined {
  let best: GemEntry | undefined;
  let bestEp = -Infinity;

  for (const gem of palette) {
    if (gem.unique && usedUnique.has(gem.id)) continue;

    if (socket === GemColor.GemColorMeta) {
      if (gem.colour !== GemColor.GemColorMeta) continue;
    } else if (gem.colour === GemColor.GemColorMeta) {
      continue;
    } else if (matchColors && !gemColorMatchesSocket(gem.colour, socket)) {
      continue;
    }

    const ep = epScore(gem.stats, epWeights);
    if (ep > bestEp) {
      bestEp = ep;
      best = gem;
    }
  }

  return best;
}

function layoutScore(
  itemId: number,
  sockets: readonly number[],
  gemIds: readonly number[],
  epWeights: EpWeights
): number {
  let score = 0;
  for (const id of gemIds) {
    const gem = getGem(id);
    if (gem) score += epScore(gem.stats, epWeights);
  }

  if (allSocketsMatched(sockets, gemIds)) {
    const bonus = getItem(itemId)?.socketBonus;
    if (bonus) score += epScore(bonus, epWeights);
  }

  return score;
}

function allSocketsMatched(
  sockets: readonly number[],
  gemIds: readonly number[]
): boolean {
  if (gemIds.length < sockets.length) return false;

  for (let i = 0; i < sockets.length; i++) {
    const gem = getGem(gemIds[i] ?? 0);
    if (!gem) return false;

    if (sockets[i] === GemColor.GemColorMeta) {
      if (gem.colour !== GemColor.GemColorMeta) return false;
      continue;
    }

    if (!gemColorMatchesSocket(gem.colour, sockets[i]!)) return false;
  }

  return true;
}

/** Test helper — resolve palette gem by id after fill. */
export function gemEp(
  gemId: number,
  epWeights: Readonly<Record<string, number>>
): number {
  const gem = getGem(gemId);
  return gem ? epScore(gem.stats, epWeights) : 0;
}
