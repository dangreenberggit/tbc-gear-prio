/**
 * Why a slot has no upgrade in it (ticket 94).
 *
 * A mechanical "best delta ≤ 0" scan finds dead slots but cannot say why one
 * is dead, and the causes want opposite responses from a reader: a set-break
 * toll is a real cost the ranking is charging, a unique-effect item is working
 * as intended, and a thin pool is a statement about the pool rather than the
 * gear. Reporting them as one signal invites treating a benign slot as a defect
 * — the over-collection ticket 94 exists to stop being rediscovered.
 *
 * The join lives here rather than in the renderer because "is the worn item's
 * set at or above an implemented threshold" is a domain question about set
 * mechanics, and the renderer has no access to `setId` at all.
 */

import { getItem } from "./items.js";
import {
  isBonusImplemented,
  SET_THRESHOLDS,
  type SetThreshold,
} from "./set-value.js";

/**
 * The minimum a slot's pool must offer before "nothing here is better" is a
 * statement about the gear rather than about the pool. Below this a slot is
 * `thin-pool`: the feral ranged/idol pool has four items total, so the worn
 * item being best is unremarkable and says nothing about the other three.
 */
export const THIN_POOL_CANDIDATES = 4;

/**
 * How far below the worn item the runner-up must sit before a setless dead zone
 * reads as a unique effect rather than a flat pool. Wolfshead Helm's slot shows
 * −202 DPS: no stat-stick candidate can reach an on-shift energy proc, which is
 * a different claim from "the alternatives are marginally worse".
 */
export const UNIQUE_EFFECT_GAP_DPS = -50;

export type DeadSlotCause =
  /** Every candidate displaces a worn set piece and pays that set's lost bonus. */
  | "set-break-toll"
  /** The worn item's effect has no equivalent in the pool; no set involved. */
  | "unique-effect"
  /** Too few candidates for "worn item is best" to mean anything. */
  | "thin-pool"
  /**
   * The worn item is not in `data/items/index.json`, so its set membership is
   * unknowable and a `set-break-toll` cannot be ruled in or out. Distinct from
   * every other cause because those are findings and this is a data gap — the
   * classifier has no cause, and saying `unique-effect` here would state a
   * confident wrong one.
   */
  | "unknown-item"
  /** A real pool, no set, nothing better — not a defect. */
  | "benign-nothing-better";

/** The ranked-row fields this classifier reads; a `RankedItem` satisfies it. */
export type DeadSlotRow = {
  itemId: number;
  name: string;
  slot: string;
  deltaDps: number;
  /**
   * This item is the one currently equipped (`RankedItem.owned`). The direct
   * signal for "worn", where `deltaDps === 0` is only a proxy for it — see
   * `wornRowOf`.
   */
  owned?: boolean;
};

export type DeadSlot = {
  slot: string;
  cause: DeadSlotCause;
  wornItemId: number;
  wornItemName: string;
  /** The worn item's set, or `null` when it belongs to none. */
  wornSetId: number | null;
  wornSetName: string | null;
  /**
   * The implemented threshold the worn set currently meets and would drop
   * below. Present only for `set-break-toll` — it is the toll being charged.
   */
  brokenThreshold?: SetThreshold;
  /**
   * Best *strictly worse* candidate's delta: how much the nearest real
   * alternative loses by. Candidates tying the worn item at 0 are excluded, so
   * a clone cannot report a gap of 0 — see `tiedCandidates`.
   */
  runnerUpGapDps: number;
  /**
   * Candidates measuring the worn item's delta exactly. At 3000 iterations a
   * genuine tie is ordinary, and the gap is silent about them by construction,
   * so the count is carried rather than folded into `runnerUpGapDps`.
   */
  tiedCandidates: number;
  /** Candidates considered, excluding the worn item itself. */
  poolSize: number;
};

export type ClassifyDeadSlotsOptions = {
  /**
   * Pieces worn per set, as `setCounts(equipment)` returns. Needed because a
   * set's threshold is met by the whole outfit, not by the one slot being
   * examined — a lone worn piece breaks nothing.
   */
  wornSetCounts: ReadonlyMap<number, number>;
};

/**
 * The highest implemented threshold `setId` currently meets and would fall
 * below if one piece left. `null` when losing a piece costs no measurable
 * bonus, which is the case that must not be reported as a toll.
 */
function thresholdLostByDroppingOnePiece(
  setId: number,
  piecesWorn: number
): SetThreshold | null {
  const lost = [...SET_THRESHOLDS]
    .reverse()
    .find(
      (t) =>
        piecesWorn >= t && piecesWorn - 1 < t && isBonusImplemented(setId, t)
    );
  return lost ?? null;
}

/**
 * The equipped row, or `null` when the slot has no unambiguous one.
 *
 * `owned` is the direct signal and is preferred wherever a row carries it;
 * `deltaDps === 0` is only a *proxy* for "this is the item you are wearing",
 * and it stops being a reliable one the moment a second candidate measures
 * identically to baseline — ordinary at 3000 iterations with rounding. Picking
 * the first such row silently decided which item's set membership got joined,
 * and the arbitrary pick could suppress a real `set-break-toll`.
 *
 * Ambiguity resolves to `null` rather than a guess: the caller drops the slot,
 * which is the honest outcome when the worn item cannot be identified.
 */
function wornRowOf(slotRows: readonly DeadSlotRow[]): DeadSlotRow | null {
  const owned = slotRows.filter((r) => r.owned === true);
  const candidates = owned.length > 0 ? owned : slotRows;
  const zeroed = candidates.filter((r) => r.deltaDps === 0);
  return zeroed.length === 1 ? (zeroed[0] ?? null) : null;
}

/**
 * Classify every slot in `rows` that has no positive candidate.
 *
 * Slots with a positive candidate are not dead and are omitted entirely, as are
 * slots whose worn item cannot be identified (nothing to join against, so no
 * cause can be established). A worn item that *is* identified but absent from
 * the item index is a different matter and gets `unknown-item`, because there
 * the report would otherwise state a cause it cannot have established.
 */
export function classifyDeadSlots(
  rows: readonly DeadSlotRow[],
  options: ClassifyDeadSlotsOptions
): DeadSlot[] {
  const bySlot = new Map<string, DeadSlotRow[]>();
  for (const row of rows) {
    const list = bySlot.get(row.slot);
    if (list) list.push(row);
    else bySlot.set(row.slot, [row]);
  }

  const dead: DeadSlot[] = [];
  for (const [slot, slotRows] of bySlot) {
    const best = Math.max(...slotRows.map((r) => r.deltaDps));
    if (best > 0) continue;

    const wornRow = wornRowOf(slotRows);
    if (!wornRow) continue;

    const candidates = slotRows.filter((r) => r !== wornRow);
    if (candidates.length === 0) continue;

    // Only strictly-worse rows can be the runner-up. A tie leaves the gap
    // undefined rather than 0: reporting 0 would say "an alternative is this
    // close" using a row that is not an alternative at all, which is how a
    // clone at 0 used to force `benign-nothing-better` and suppress the warning.
    const strictlyWorse = candidates.filter((r) => r.deltaDps < 0);
    const tiedCandidates = candidates.length - strictlyWorse.length;
    const runnerUpGapDps =
      strictlyWorse.length > 0
        ? Math.max(...strictlyWorse.map((r) => r.deltaDps))
        : 0;

    const wornItem = getItem(wornRow.itemId);
    const wornSetId = wornItem?.setId ?? null;
    const wornSetName = wornItem?.setName ?? null;

    const brokenThreshold =
      wornSetId === null
        ? null
        : thresholdLostByDroppingOnePiece(
            wornSetId,
            options.wornSetCounts.get(wornSetId) ?? 0
          );

    // Order matters: a real toll outranks the pool-shape explanations, because
    // a set-holding slot can also be thin, and the toll is the actionable fact.
    // `unknown-item` comes first of all — with no index entry the toll test
    // never ran, so every cause below it would be asserting more than is known.
    let cause: DeadSlotCause;
    if (wornItem === undefined) {
      cause = "unknown-item";
    } else if (brokenThreshold !== null) {
      cause = "set-break-toll";
    } else if (candidates.length < THIN_POOL_CANDIDATES) {
      cause = "thin-pool";
    } else if (runnerUpGapDps <= UNIQUE_EFFECT_GAP_DPS) {
      cause = "unique-effect";
    } else {
      cause = "benign-nothing-better";
    }

    const entry: DeadSlot = {
      slot,
      cause,
      wornItemId: wornRow.itemId,
      wornItemName: wornRow.name,
      wornSetId,
      wornSetName,
      runnerUpGapDps,
      tiedCandidates,
      poolSize: candidates.length,
    };
    if (brokenThreshold !== null) entry.brokenThreshold = brokenThreshold;
    dead.push(entry);
  }
  return dead;
}
