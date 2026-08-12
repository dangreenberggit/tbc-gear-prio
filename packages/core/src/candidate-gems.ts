/**
 * Fill empty sockets on a candidate item with highest-EP gems from the phase
 * palette. Chooses between colour-matched (keeps socket bonus) and unrestricted
 * layouts using gem-fill weights that zero softcapped ratings — uncapped hit
 * EP otherwise prefers Glinting over Bold on sets that are already hit-capped.
 *
 * Empty-fill also respects set-wide unique gems and, when meta context is
 * provided, prefers near-EP gems that reduce meta deficit (avoids fill→repair
 * thrash). See `.scratch/handoffs/gem-optimizer-comparison.md`.
 */

import { fillEligibleGems, getGem, type GemEntry } from "./gems.js";
import { getItem, socketsFor } from "./items.js";
import { gemColorCounts, gemColorMatchesSocket, metaDeficit } from "./meta.js";
import { GemColor } from "./proto/common_pb.js";
import { epScore, Stat, type EpWeights } from "./stats.js";

/**
 * Record-only weights. Narrower than `stats.ts`'s `EpWeights` union — this
 * module never receives the dense-array form, so keep the record shape
 * explicit here rather than importing the wider union.
 */
type EpWeightRecord = Readonly<Record<string, number>>;

/**
 * The three values every gem decision needs, which previously travelled as
 * separate parameters through the whole candidate-swap chain (ticket 24's
 * data clump).
 *
 * `weights` and `weightRecord` are the *same* weights in the two shapes the
 * code below needs: `epScore` in `stats.ts` accepts the dense-array form, the
 * gem fillers only ever want the record. Deriving the record once at
 * construction is why this is a context object and not just a tuple — callers
 * previously had to remember to pass both, in the right order, and nothing
 * stopped them passing weights that disagreed.
 */
export type GemContext = {
  readonly palette: readonly GemEntry[];
  /**
   * The palette both auto-fill and meta repair may draw from — `palette`
   * capped at rare. Ticket 111 left repair on the full `palette`, but repair
   * only ever touches coloured sockets (never the meta socket), and on those
   * it was quietly handing out epic gems the fill had deliberately avoided
   * (ticket 117). Every colour exists at rare and all 18 TBC meta gems are
   * quality 3, so nothing becomes unsolvable under the cap.
   */
  readonly fillPalette: readonly GemEntry[];
  readonly weights: EpWeights;
  readonly weightRecord: EpWeightRecord;
};

export function gemContext(
  palette: readonly GemEntry[],
  weights: EpWeights
): GemContext {
  return {
    palette,
    // Chokepoint: `fillEligibleGems` (gems.ts) owns both the cap value and
    // its enforcement, so there is exactly one way to build a fill-eligible
    // palette rather than a call-site convention every caller has to
    // remember (ticket 114).
    fillPalette: fillEligibleGems(palette),
    weights,
    weightRecord: toWeightRecord(weights),
  };
}

/** Dense-array weights are index-keyed; the record form keys by the same index. */
function toWeightRecord(weights: EpWeights): EpWeightRecord {
  if (!Array.isArray(weights)) return weights as EpWeightRecord;
  const out: Record<string, number> = {};
  for (let i = 0; i < weights.length; i++) out[String(i)] = weights[i] ?? 0;
  return out;
}

/** Absolute EP slack for meta-aware near-ties (fill weights). */
const META_NEAR_EP = 1.0;

/**
 * Stat EP cannot rank meta gems: their headline effects are not stats. Nine of
 * the eighteen TBC metas score exactly 0.00 against ret weights, and the two
 * that matter here invert — Swift Skyfire's flat +24 AP scores 9.84 while
 * Relentless scores 9.00 on +12 Agi alone, because its +3% critical damage is
 * a multiplier (`CritDamageMultiplier *= 1.03` in wowsims
 * `sim/core/item_effects.go`) and additive EP cannot see it.
 *
 * The effect enters average damage as `crit * (critDmgMult - 1)`
 * (`sim/core/spell_outcome.go`), so its absolute value scales with crit and is
 * **not** a constant — roughly 0.6% of damage at 10% crit up to 2.4% at 40%.
 * The *ordering* is what is durable: against Swift Skyfire's +24 AP,
 * Relentless leads by ~7x at 10% crit and ~28x at 40%, so it never flips in
 * any realistic ret range.
 *
 * Ret's meta is Relentless Earthstorm Diamond in all three upstream wowsims
 * ret gear presets (preraid, p1, p2 under
 * `ui/paladin/retribution/gear_sets/`), which carry no other meta.
 *
 * Activation is deliberately not checked. Relentless requires 2 red / 2 yellow
 * / 2 blue elsewhere, and a player who slots a meta arranges their other gems
 * to switch it on. Gating on the colours they happen to wear today would
 * understate a genuine upgrade.
 */
const PREFERRED_META_IDS: readonly number[] = [32409];

export type FillEmptyOpts = {
  /** Unique gem ids already socketed elsewhere on the set. */
  usedUnique?: ReadonlySet<number>;
  /**
   * Meta gem + gems on **other slots only**. Gems kept on the piece under fill
   * are contributed by the fill itself — listing them here double-counts their
   * colour and can zero the deficit before any candidate is scored.
   */
  meta?: { metaId: number; otherGemIds: readonly number[] };
};

/**
 * Keep already-placed gems; EP-fill only empty sockets (after UI-style migrate).
 *
 * Deliberate simplification, not a mirror of wowsims' suggest-gems button
 * (ticket 111 "Two behavioural facts", observed in the owner's web session):
 * the button re-gems existing body gems and skips meta sockets, whereas we
 * keep every worn gem and fill only what migration left empty. Do not "fix"
 * this toward the button — silently re-gemming worn slots breaks the owner's
 * consistency principle (the user must know which gems were used).
 */
export function fillEmptyCandidateGems(
  itemId: number,
  gems: readonly number[],
  palette: readonly GemEntry[],
  epWeights: EpWeightRecord,
  opts: FillEmptyOpts = {}
): number[] {
  const sockets = socketsFor(itemId);
  if (sockets.length === 0) return [];

  const weights = gemFillWeights(epWeights);
  const base = sockets.map((_, i) => gems[i] ?? 0);
  const matched = fillEmpties(sockets, base, palette, weights, true, opts);
  const free = fillEmpties(sockets, base, palette, weights, false, opts);
  return layoutScore(itemId, sockets, free, weights) >
    layoutScore(itemId, sockets, matched, weights)
    ? free
    : matched;
}

/**
 * Softcaps: melee hit / expertise EP overstates gems on capped raid sets.
 * Used only for candidate socket fills — meta-repair keeps full EP weights.
 */
export function gemFillWeights(
  epWeights: EpWeightRecord
): Record<string, number> {
  const out: Record<string, number> = { ...epWeights };
  out[String(Stat.StatMeleeHitRating)] = 0;
  out[String(Stat.StatExpertiseRating)] = 0;
  return out;
}

function fillEmpties(
  sockets: readonly number[],
  base: readonly number[],
  palette: readonly GemEntry[],
  epWeights: EpWeightRecord,
  matchColors: boolean,
  opts: FillEmptyOpts
): number[] {
  const out = [...base];
  const usedUnique = new Set(opts.usedUnique ?? []);
  for (const id of out) {
    const g = getGem(id);
    if (g?.unique) usedUnique.add(id);
  }

  for (let i = 0; i < sockets.length; i++) {
    if ((out[i] ?? 0) > 0) continue;
    const placed = out.filter((id) => id > 0);
    const pick = bestGemForSocket(
      sockets[i]!,
      palette,
      epWeights,
      usedUnique,
      matchColors,
      opts.meta
        ? {
            metaId: opts.meta.metaId,
            setGemIds: [...opts.meta.otherGemIds, ...placed],
          }
        : undefined
    );
    if (pick) {
      out[i] = pick.id;
      if (pick.unique) usedUnique.add(pick.id);
    } else {
      out[i] = 0;
    }
  }

  return out;
}

function bestGemForSocket(
  socket: number,
  palette: readonly GemEntry[],
  epWeights: EpWeightRecord,
  usedUnique: ReadonlySet<number>,
  matchColors: boolean,
  metaCtx: { metaId: number; setGemIds: readonly number[] } | undefined
): GemEntry | undefined {
  const eligible: { gem: GemEntry; ep: number }[] = [];

  for (const gem of palette) {
    if (gem.unique && usedUnique.has(gem.id)) continue;

    if (socket === GemColor.GemColorMeta) {
      if (gem.colour !== GemColor.GemColorMeta) continue;
    } else if (gem.colour === GemColor.GemColorMeta) {
      continue;
    } else if (matchColors && !gemColorMatchesSocket(gem.colour, socket)) {
      continue;
    }

    eligible.push({ gem, ep: epScore(gem.stats, epWeights) });
  }

  if (eligible.length === 0) return undefined;

  if (socket === GemColor.GemColorMeta) {
    for (const preferred of PREFERRED_META_IDS) {
      const hit = eligible.find((e) => e.gem.id === preferred);
      if (hit) return hit.gem;
    }
  }

  let bestEp = -Infinity;
  for (const e of eligible) {
    if (e.ep > bestEp) bestEp = e.ep;
  }

  const near = eligible.filter((e) => bestEp - e.ep <= META_NEAR_EP);
  const pool = near.length > 0 ? near : eligible;

  if (!metaCtx) {
    return pool.reduce((a, b) => (b.ep > a.ep ? b : a)).gem;
  }

  let best: { gem: GemEntry; ep: number; deficit: number } | undefined;
  for (const e of pool) {
    const afterDeficit = metaDeficit(
      metaCtx.metaId,
      gemColorCounts([...metaCtx.setGemIds, e.gem.id])
    );
    if (
      !best ||
      afterDeficit < best.deficit ||
      (afterDeficit === best.deficit && e.ep > best.ep)
    ) {
      best = { gem: e.gem, ep: e.ep, deficit: afterDeficit };
    }
  }

  return best?.gem;
}

function layoutScore(
  itemId: number,
  sockets: readonly number[],
  gemIds: readonly number[],
  epWeights: EpWeightRecord
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

/**
 * Whether the socket bonus is active. Only the coloured sockets gate it — an
 * unfilled or mismatched meta socket does not forfeit the bonus (matches
 * upstream `sim/core/reforge_optimizer/gear.go:socketBonusActive`, and the
 * game rule it encodes).
 */
function allSocketsMatched(
  sockets: readonly number[],
  gemIds: readonly number[]
): boolean {
  if (gemIds.length < sockets.length) return false;

  for (let i = 0; i < sockets.length; i++) {
    if (sockets[i] === GemColor.GemColorMeta) continue;

    const gem = getGem(gemIds[i] ?? 0);
    if (!gem) return false;
    if (!gemColorMatchesSocket(gem.colour, sockets[i]!)) return false;
  }

  return true;
}

/** Test helper — resolve palette gem by id after fill. */
export function gemEp(gemId: number, epWeights: EpWeightRecord): number {
  const gem = getGem(gemId);
  return gem ? epScore(gem.stats, epWeights) : 0;
}
