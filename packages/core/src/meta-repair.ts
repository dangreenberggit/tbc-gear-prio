/**
 * Minimum-EP-loss meta repair (PLAN.md §9 / R4).
 *
 * Recolour non-meta sockets until the meta condition is met. Cost of a swap:
 *   EP(old gem) − EP(new gem) + EP(socket bonus) if the swap breaks a match.
 * Never re-optimizes the whole layout — stays recognisably the player's gems.
 */

import { getGem, type GemEntry } from "./gems.js";
import { getItem } from "./items.js";
import {
  gemColorCounts,
  gemColorMatchesSocket,
  metaDeficit,
  metaStatus,
  type GemColorCounts,
} from "./meta.js";
import { GemColor } from "./proto/common_pb.js";
import { epScore, type EpWeights } from "./stats.js";

export type SocketedItem = {
  itemId: number;
  /** One entry per socket; 0 means empty. */
  gems: number[];
};

export type MetaRepairSwap = {
  itemId: number;
  socketIndex: number;
  from: number;
  to: number;
  cost: number;
};

export type MetaRepairResult = {
  items: SocketedItem[];
  metaAdjusted: boolean;
  swaps: MetaRepairSwap[];
};

/**
 * Common base so a caller that only wants "meta repair failed, skip this
 * result" can still catch one type — RankError's meta-unsolvable branch does
 * this today and stays a single branch. Callers that care about *why* (to
 * decide whether widening the palette could help, say) catch the subclasses.
 */
export abstract class MetaRepairError extends Error {}

/**
 * No legal single-gem recolour ever reduces the deficit — e.g. the palette
 * has no gem in a colour the meta condition needs. Retrying will not help;
 * this layout genuinely cannot activate the meta with what is available.
 */
export class MetaInfeasibleError extends MetaRepairError {
  constructor(message: string) {
    super(message);
    this.name = "MetaInfeasibleError";
  }
}

/**
 * The loop kept finding strictly-improving moves but ran out of steps before
 * reaching zero deficit. Distinct from MetaInfeasibleError: this is "gave up
 * searching", not "no answer exists" — conflating them previously meant a
 * pathological-but-solvable layout was reported the same way as a genuinely
 * broken one (review-corrections.md item, upheld from investigation2-comment
 * finding 3).
 */
export class MetaStepBudgetExceededError extends MetaRepairError {
  constructor(message: string) {
    super(message);
    this.name = "MetaStepBudgetExceededError";
  }
}

export function repairMeta(opts: {
  items: readonly SocketedItem[];
  epWeights: EpWeights;
  palette: readonly GemEntry[];
}): MetaRepairResult {
  const items = opts.items.map((it) => ({
    itemId: it.itemId,
    gems: [...it.gems],
  }));

  const head = items[0];
  if (!head) {
    return { items, metaAdjusted: false, swaps: [] };
  }
  const headItem = getItem(head.itemId);
  if (!headItem?.sockets.includes(GemColor.GemColorMeta)) {
    return { items, metaAdjusted: false, swaps: [] };
  }

  const initial = metaStatus(headItem.sockets, allGemIds(items));
  if (initial.kind !== "inactive") {
    return { items, metaAdjusted: false, swaps: [] };
  }

  const swaps: MetaRepairSwap[] = [];
  const maxSteps = 32;

  for (let step = 0; step < maxSteps; step++) {
    const status = metaStatus(headItem.sockets, allGemIds(items));
    if (status.kind === "active") {
      return { items, metaAdjusted: swaps.length > 0, swaps };
    }
    if (status.kind !== "inactive") {
      throw new MetaInfeasibleError(`unexpected meta status ${status.kind}`);
    }

    const move = bestRepairMove(items, status.metaId, status.counts, opts);
    if (!move) {
      throw new MetaInfeasibleError(
        `no legal recolour activates meta ${status.metaId} (${status.description})`
      );
    }

    const slot = items[move.itemIndex]!;
    slot.gems[move.socketIndex] = move.to;
    swaps.push({
      itemId: slot.itemId,
      socketIndex: move.socketIndex,
      from: move.from,
      to: move.to,
      cost: move.cost,
    });
  }

  throw new MetaStepBudgetExceededError("meta repair exceeded step budget");
}

function allGemIds(items: readonly SocketedItem[]): number[] {
  const ids: number[] = [];
  for (const it of items) {
    for (const g of it.gems) {
      if (g) ids.push(g);
    }
  }
  return ids;
}

/**
 * After `repairMeta`, put the player's own gems back wherever the repaired
 * layout still allows — recommendations should use gems they already own,
 * not just the cheapest gems that would have solved the meta from scratch
 * (investigation2-comment.md §1, "minimizeRegems spec").
 *
 * `repairMeta`'s greedy loop only ever makes a move that is individually
 * necessary *at the moment it is made*, but a later swap can make an earlier
 * one redundant in hindsight (see the `compareColors` case: two swaps that
 * were each needed to close a 2-unit deficit can leave a 1-unit margin once
 * both land, at which point either one alone could be undone). This checks
 * each swap in turn — independently, against the fully repaired layout — and
 * reverts it if the meta condition survives without it.
 *
 * Never touches the meta socket: `repairMeta` never recolours it either
 * (`bestRepairMove` skips `GemColorMeta` sockets), so nothing here should
 * treat it as optional.
 */
export function minimizeRegems(opts: {
  original: readonly SocketedItem[];
  repaired: readonly SocketedItem[];
  swaps: readonly MetaRepairSwap[];
  headId: number;
}): MetaRepairResult {
  const { original, repaired, swaps, headId } = opts;
  const items = repaired.map((it) => ({
    itemId: it.itemId,
    gems: [...it.gems],
  }));
  const headItem = getItem(headId);
  if (!headItem) {
    return { items, metaAdjusted: swaps.length > 0, swaps: [...swaps] };
  }

  const originalByItem = new Map(original.map((it) => [it.itemId, it]));
  const survivingSwaps: MetaRepairSwap[] = [];

  for (const swap of swaps) {
    const slot = items.find((it) => it.itemId === swap.itemId);
    const orig = originalByItem.get(swap.itemId);
    const originalGem = orig?.gems[swap.socketIndex];
    if (!slot || originalGem == null) {
      survivingSwaps.push(swap);
      continue;
    }

    const before = slot.gems[swap.socketIndex];
    slot.gems[swap.socketIndex] = originalGem;
    const status = metaStatus(headItem.sockets, allGemIds(items));
    if (status.kind === "active") {
      // Revert kept — the swap is dropped from the report because the final
      // layout no longer contains it, not appended alongside a stale entry.
      continue;
    }
    slot.gems[swap.socketIndex] = before ?? 0;
    survivingSwaps.push(swap);
  }

  return {
    items,
    metaAdjusted: survivingSwaps.length > 0,
    swaps: survivingSwaps,
  };
}

/**
 * Whether the item's socket bonus is active. The bonus is gated on the
 * *coloured* sockets only — the meta socket does not participate (matches
 * upstream `sim/core/reforge_optimizer/gear.go:socketBonusActive`, and the
 * game itself: an empty meta socket does not forfeit a chest's socket
 * bonus). Exported as a test helper so the predicate can be pinned directly
 * instead of only through repair-cost side effects.
 */
export function socketsMatch(itemId: number, gems: readonly number[]): boolean {
  const item = getItem(itemId);
  if (!item || item.sockets.length === 0) return true;
  if (gems.length < item.sockets.length) return false;
  for (let i = 0; i < item.sockets.length; i++) {
    if (item.sockets[i] === GemColor.GemColorMeta) continue;
    const gemId = gems[i] ?? 0;
    if (!gemId) return false;
    const gem = getGem(gemId);
    if (!gem) return false;
    if (!gemColorMatchesSocket(gem.colour, item.sockets[i]!)) return false;
  }
  return true;
}

function gemEp(gemId: number, weights: EpWeights): number {
  if (!gemId) return 0;
  const gem = getGem(gemId);
  if (!gem) return 0;
  return epScore(gem.stats, weights);
}

function socketBonusEp(itemId: number, weights: EpWeights): number {
  const item = getItem(itemId);
  if (!item) return 0;
  return epScore(item.socketBonus, weights);
}

type Move = {
  itemIndex: number;
  socketIndex: number;
  from: number;
  to: number;
  cost: number;
};

function bestRepairMove(
  items: SocketedItem[],
  metaId: number,
  beforeCounts: GemColorCounts,
  opts: { epWeights: EpWeights; palette: readonly GemEntry[] }
): Move | null {
  const beforeDeficit = metaDeficit(metaId, beforeCounts);
  let best: Move | null = null;

  for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
    const slot = items[itemIndex]!;
    const item = getItem(slot.itemId);
    if (!item) continue;

    for (
      let socketIndex = 0;
      socketIndex < item.sockets.length;
      socketIndex++
    ) {
      const socketColor = item.sockets[socketIndex]!;
      if (socketColor === GemColor.GemColorMeta) continue;

      const from = slot.gems[socketIndex] ?? 0;
      const matchedBefore = socketsMatch(slot.itemId, slot.gems);

      for (const candidate of opts.palette) {
        if (candidate.colour === GemColor.GemColorMeta) continue;
        if (candidate.unique && alreadyHasUnique(items, candidate.id, from)) {
          continue;
        }
        if (candidate.id === from) continue;

        const trialGems = [...slot.gems];
        while (trialGems.length < item.sockets.length) trialGems.push(0);
        trialGems[socketIndex] = candidate.id;

        const trialItems = items.map((it, i) =>
          i === itemIndex ? { itemId: it.itemId, gems: trialGems } : it
        );
        const afterCounts = gemColorCounts(allGemIds(trialItems));
        const afterDeficit = metaDeficit(metaId, afterCounts);
        if (afterDeficit >= beforeDeficit) continue;

        let cost =
          gemEp(from, opts.epWeights) - gemEp(candidate.id, opts.epWeights);
        if (matchedBefore && !socketsMatch(slot.itemId, trialGems)) {
          cost += socketBonusEp(slot.itemId, opts.epWeights);
        }

        const move: Move = {
          itemIndex,
          socketIndex,
          from,
          to: candidate.id,
          cost,
        };
        if (!best || move.cost < best.cost) best = move;
      }
    }
  }

  return best;
}

function alreadyHasUnique(
  items: readonly SocketedItem[],
  gemId: number,
  replacing: number
): boolean {
  for (const it of items) {
    for (const g of it.gems) {
      if (g === gemId && g !== replacing) return true;
    }
  }
  return false;
}
