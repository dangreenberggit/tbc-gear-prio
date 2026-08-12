/**
 * What the rank report shows and in what order — the decisions, with no
 * markup in sight (ticket 24: `rank-report.ts` mixed these with the HTML
 * template and the stylesheet, so changing a shortlist rule and restyling the
 * page edited one file for unrelated reasons).
 *
 * Everything here is pure and directly unit-tested. The renderer next door
 * consumes these and owns escaping, formatting and structure.
 */

import { getItem, type ItemSlot } from "./items.js";
import type { SimSlotName } from "./pool.js";
import type { ViewOptions } from "./view.js";
import type { RankedItem, SetBonusValue } from "./rank.js";
import type { SetThreshold } from "./set-value.js";

/** Display order for slot sections; also seeds `groupBySlot`'s empty buckets. */
export const SLOT_ORDER: readonly ItemSlot[] = [
  "head",
  "neck",
  "shoulder",
  "back",
  "chest",
  "wrist",
  "hands",
  "waist",
  "legs",
  "feet",
  "finger",
  "trinket",
  "weapon",
  "ranged",
] as const;

/** Optional enrichments the renderer understands when present on ranked items. */
export type ReportItem = RankedItem & {
  magnitudeWarning?: boolean;
  replacesEquipped?: {
    slot: string;
    itemId: number;
    name: string;
  };
  alternateSlot?: {
    /** Sim slot name, same vocabulary as `RankedItem.slotChoice`. */
    choice: SimSlotName;
    deltaDps: number;
    deltaPct: number;
    replacesName: string;
  };
};

export type RankReportMeta = {
  character: string;
  realm: string;
  region: string;
  spec: string;
  maxPhase: number;
  poolSize: number;
  generatedAt: string;
  /** Report-time zone filter (CLI `--raid`); not applied during rank. */
  raid?: string;
  /**
   * Every view control that shaped the rows in this report (§4.1). Recorded
   * because the rows are a filtered re-render: a report that names only
   * `raid` while `--boss` or `--hide-owned` also cut rows misdescribes itself,
   * and these files outlive the command that made them.
   */
  view?: ViewOptions;
};

/**
 * Split the above-cutoff items into the two shortlists.
 *
 * PvP is separated because it is not lootable tonight, and
 * `magnitudeWarning` items are dropped from both: a weapon whose sim delta is
 * implausible should not head a list captioned "act on tonight".
 */
export function partitionShortlist(items: RankedItem[]): {
  raid: RankedItem[];
  pvp: RankedItem[];
} {
  const reportItems = items as ReportItem[];
  const above = reportItems.filter(
    (i) => !i.belowCutoff && !i.magnitudeWarning
  );
  return {
    raid: above.filter((i) => i.source.kind !== "pvp"),
    pvp: above.filter((i) => i.source.kind === "pvp"),
  };
}

/**
 * Below-cutoff rows the curated list admits **for package mode only**.
 *
 * Package mode exists to organise the report's shopping-list area, and it could
 * not reach the rows it was built for. Chips come from `partitionShortlist`,
 * which keeps only above-cutoff rows, so a piece that is a downgrade as a single
 * swap but positive as part of its package — 31048 at −106.16 inside a +64.07
 * package — had no chip element at all. The client script re-sorts and filters
 * chips; it cannot conjure one, so no toggle state could ever surface these.
 *
 * Render-but-hide, at the owner's direction (ADR-0024 amendment, 2026-08-10):
 * the chips are in every document and only package mode displays them, so the
 * other three modes stay byte-identical to what they showed before.
 *
 * **No cutoff data moves.** `belowCutoff` is untouched, these rows stay muted
 * and stay out of every count, and nothing here feeds a sort key or the bar.
 * This is admission into a presentation area under an opt-in mode — ADR-0024's
 * re-sort-not-repartition principle, extended from rows to the chip strip.
 *
 * `magnitudeWarning` is excluded on the same grounds `partitionShortlist`
 * excludes it: an implausible sim delta should not reach a curated list under
 * any mode.
 */
export function packageOnlyShortlist(items: RankedItem[]): RankedItem[] {
  const reportItems = items as ReportItem[];
  return reportItems.filter(
    (i) =>
      i.belowCutoff &&
      !i.magnitudeWarning &&
      i.source.kind !== "pvp" &&
      packageSetPotentialDps(i) !== i.deltaDps
  );
}

/**
 * Bucket by slot in `SLOT_ORDER`, best delta first within each.
 *
 * Every slot gets a bucket even when empty, so the renderer can decide
 * whether to show an empty section rather than inferring it from a gap.
 */
export function groupBySlot(items: RankedItem[]): Map<ItemSlot, RankedItem[]> {
  const map = new Map<ItemSlot, RankedItem[]>();
  for (const slot of SLOT_ORDER) map.set(slot, []);
  for (const item of items) {
    const list = map.get(item.slot);
    if (list) list.push(item);
    else map.set(item.slot, [item]);
  }
  for (const list of map.values()) {
    list.sort((a, b) => b.deltaDps - a.deltaDps);
  }
  return map;
}

/**
 * Human-readable reason a `SetBonusValue` shows no `bonusDps` (spec §2.3,
 * acceptance §8.5). Every `unmeasured` value must render as a reason here —
 * never a blank and never a `0`, which would read as "measured, worth
 * nothing" when the truth is "we don't know".
 */
const UNMEASURED_REASON_TEXT: Record<
  NonNullable<SetBonusValue["unmeasured"]>,
  string
> = {
  "not-implemented-in-sim": "not implemented in the pinned sim",
  "insufficient-pieces": "not enough pieces in the pool to build the package",
  "sim-failed": "the package sim failed",
  "unmeasurable-at-this-worn-count":
    "can't be measured from this starting gear — one piece short of this " +
    "threshold, so the completing piece's own swap already carries the bonus",
};

/**
 * One line per `SetBonusValue`: set, threshold, pieces worn, and either the
 * measured bonus or the reason it could not be measured (§4). A measured
 * ≈0 bonus (e.g. Crystalforge, a mana/heal effect) renders as a number, not
 * as unmeasured — §2.3 draws that line and this function preserves it.
 *
 * This panel is the *only* surface some bonuses reach. At 0 worn pieces every
 * single-swap candidate lands at `piecesAfterSwap === 1`, so
 * `nextMeasurableThreshold` stops at an implemented 2pc and the 4pc figure is
 * credited to no row in any display mode (ticket 91). Rather than smear a
 * fraction of it across member rows — which would put a break-confounded
 * number into the sort, and the confound is large: the engine reports 193.89
 * for the Thunderheart 4pc where an isolated measurement gives 73.5 ± 6.3 DPS
 * (`.scratch/set-bonus-value/measurements-2026-08-10.md`) — set completion is
 * surfaced here as its own thing, named by the items that would complete it.
 */
export function formatSetBonusLine(b: SetBonusValue): string {
  const sign = b.bonusDps !== undefined && b.bonusDps > 0 ? "+" : "";
  const measured =
    b.unmeasured !== undefined
      ? UNMEASURED_REASON_TEXT[b.unmeasured]
      : `${sign}${(b.bonusDps ?? 0).toFixed(2)} DPS`;
  const head = `${b.setName} ${b.threshold}pc (${b.piecesWorn} worn) — ${formatBreaksPrefix(b)}${measured}`;
  return `${head}${formatPackageDelta(b)}${formatPackageContents(b)}`;
}

/**
 * Qualifies the figure *before* it is read, not after. A break inflates the
 * measured number by `(k−1)·B` with no way to separate it after the fact (see
 * the closed form on `brokenSetBonuses` in `set-value.ts`), so a trailing
 * suffix let a reader take the number away before reaching the caveat.
 *
 * The wording says the break **inflates** this figure, never that it is netted
 * in. `bonusDps` is derived as `packageDelta − Σ singles`, which is exactly the
 * quantity the `(k−1)·B` inflation lands on — on the shredzepelin P3 artifact it
 * reads 193.89 against a de-confounded ~62.8. The figure that genuinely nets the
 * break in is `packageDeltaDps`, rendered separately by `formatPackageDelta`.
 */
export function formatBreaksPrefix(b: SetBonusValue): string {
  if (!b.breaks || b.breaks.length === 0) return "";
  const parts = b.breaks.map(
    (x) => `${x.setName} ${x.threshold}pc (${x.piecesBefore}→${x.piecesAfter})`
  );
  return `[breaks ${parts.join("; ")}; figure inflated by it] `;
}

/**
 * The one wording for `packageDeltaDps`'s gem-model statement, shared by every
 * surface that states the figure (tickets 103, 111).
 *
 * This states the model rather than apologising for it: swapping in an item
 * migrates the worn gems that fit (wowsims equip semantics), and sockets the
 * migration leaves empty are auto-gemmed capped at rare quality within the
 * run's phase — gems the player could actually have (owner decision, ticket
 * 111). It deliberately does NOT claim the figure matches a wowsims run:
 * nobody has measured that, and part of the original gap to the owner's run
 * remains unattributed.
 *
 * One constant rather than two strings: the panel and the member row state the
 * same quantity, and the wording drifting between them would read as two
 * different claims about one number.
 */
export const GEM_POLICY_QUALIFIER =
  "uses our gem model: worn gems are kept, and sockets a swap leaves empty are auto-gemmed with rare-or-lower gems of the run's phase";

/**
 * The whole-package delta: one sim of the assembled package against the
 * baseline. This is the figure that answers "what if I equip all of these?",
 * and the only one that is genuinely **net of any break** — the displaced set's
 * loss is inside the measurement rather than derived back out of it, so it
 * carries none of `bonusDps`'s `(k−1)·B` inflation (ADR-0023 decision 3).
 *
 * Disclosure only. It is deliberately not credited to any row, not summed into
 * a sort key, and not compared against the cutoff: ADR-0020 keeps the bar
 * absolute and spec §7 keeps whole packages out of the ranking. It is stated
 * here so a reader looking at a member row's large negative delta can see the
 * package figure that row is a step toward — on the shredzepelin P3 artifact
 * the four Thunderheart rows read −106/−100/+22/+23 while the package they
 * belong to is +64.07 (loop log iteration 5).
 *
 * Omitted when the bonus is unmeasured, where `packageDeltaDps` is a structural
 * zero and never a simmed one.
 */
export function formatPackageDelta(b: SetBonusValue): string {
  if (b.unmeasured !== undefined) return "";
  const sign = b.packageDeltaDps >= 0 ? "+" : "";
  return ` — whole package ${sign}${b.packageDeltaDps.toFixed(2)} DPS vs current gear (${GEM_POLICY_QUALIFIER})`;
}

/**
 * A panel entry, decomposed — the same facts `formatSetBonusLine` states, in a
 * fixed order the renderer can lay out instead of one em-dash chain.
 *
 * `kind` exists so the stylesheet can rank the parts without parsing prose: the
 * two figures read as figures, the contents as the actionable list, and the
 * qualifiers as the small print that constrains both. Order is fixed here
 * rather than at the call site, because "consistent across entries" is the
 * whole point — the flat line's order was the order the clauses were written
 * in over five commits, so a reader scanning the panel found the break caveat
 * in a different place in each entry.
 */
export type SetBonusEntryLine = {
  kind: "bonus" | "package" | "contents" | "qualifier";
  text: string;
};

export type SetBonusEntry = {
  heading: string;
  lines: SetBonusEntryLine[];
};

/**
 * The panel's structured form of a `SetBonusValue`.
 *
 * Loses nothing `formatSetBonusLine` says — the same bonus figure, package
 * figure, package contents, break caveat and gem caveat — and adds no number.
 * The CLI keeps the flat line, which is the right shape for a terminal; only
 * the HTML panel takes this.
 *
 * The break caveat moves from a *prefix* to a qualifier line, which the flat
 * line could not do: in one run of text a trailing caveat let a reader take the
 * number away before reaching it, so `formatBreaksPrefix` front-loaded it. In a
 * laid-out entry the qualifiers sit under the figures as their own visible
 * block, so they are read with the figures rather than after them.
 */
export function setBonusEntry(b: SetBonusValue): SetBonusEntry {
  const heading = `${b.setName} ${b.threshold}pc — ${b.piecesWorn} worn`;
  if (b.unmeasured !== undefined) {
    return {
      heading,
      lines: [{ kind: "bonus", text: UNMEASURED_REASON_TEXT[b.unmeasured] }],
    };
  }
  const bonus = b.bonusDps ?? 0;
  const lines: SetBonusEntryLine[] = [
    {
      kind: "bonus",
      text: `set bonus ${bonus > 0 ? "+" : ""}${bonus.toFixed(2)} DPS`,
    },
    {
      kind: "package",
      text: `whole package ${b.packageDeltaDps >= 0 ? "+" : ""}${b.packageDeltaDps.toFixed(2)} DPS vs current gear`,
    },
  ];
  if (b.packageItemIds.length > 0) {
    const names = b.packageItemIds.map(
      (id) => getItem(id)?.name ?? `item ${id}`
    );
    lines.push({ kind: "contents", text: `add ${names.join(", ")}` });
  }
  if (b.breaks && b.breaks.length > 0) {
    const parts = b.breaks.map(
      (x) =>
        `${x.setName} ${x.threshold}pc (${x.piecesBefore}→${x.piecesAfter})`
    );
    lines.push({
      kind: "qualifier",
      text: `breaks ${parts.join("; ")} — the set bonus figure is inflated by it, and is not counted in ranking`,
    });
  }
  lines.push({
    kind: "qualifier",
    text: `the package figure ${GEM_POLICY_QUALIFIER}`,
  });
  return { heading, lines };
}

/**
 * Names the items that would complete the package. Without this the panel
 * states a bonus with no way to act on it — and for a threshold no row carries,
 * "which items" is the whole of the actionable information.
 */
export function formatPackageContents(b: SetBonusValue): string {
  // An unmeasured bonus has no value to chase, so naming the items that would
  // assemble it would invite acting on a number that does not exist.
  if (b.unmeasured !== undefined) return "";
  if (b.packageItemIds.length === 0) return "";
  const names = b.packageItemIds.map((id) => getItem(id)?.name ?? `item ${id}`);
  return ` — add ${names.join(", ")}`;
}

/**
 * The visible upgrade list as wowsims-shaped JSON: `{"items":[{"id":N}, ...]}`,
 * the same envelope as `vendor/wowsims/*.gear.json` and what its importer
 * accepts.
 *
 * One deliberate difference from a gear-set file, and it matters: a gear set is
 * **positional** — 17 slots in `SIM_ORDER`, `{}` for empty — whereas this is a
 * *list of upgrades* in the order the page displays them, which is neither 17
 * long nor slot-indexed. Two rows here can share a slot (both rings, several
 * legs candidates), so it cannot be read as an equipment set, and pasting it
 * where a full set is expected will not reconstruct a character.
 *
 * Ids only. Enchants and gems belong to the *worn* item; a ranked candidate is
 * an item the player does not have yet, so emitting either would invent gear
 * the sim never measured.
 */
export function wowsimsItemIdsJson(
  items: ReadonlyArray<Pick<RankedItem, "itemId">>
): string {
  return JSON.stringify(
    { items: items.map((i) => ({ id: i.itemId })) },
    null,
    2
  );
}

/**
 * The phase a curated gear-set label is BiS *for*, or `null` if unrecognised.
 *
 * Mirrors `CURATED_SET_PHASE` / `curated_set_phase` in
 * `scripts/assemble_universe.py` — **that file is the source of truth**; the
 * labels are produced there, and this only reads them back to decide whether to
 * warn that a list is stale. Pre-raid is phase 1: it is the set you take *into*
 * a phase-1 raid.
 *
 * Do not edit this map alone. `scripts/check_curated_set_phase.py` re-derives it
 * from this file and fails `pnpm verify` on any divergence — it exists because
 * the mirror drifted once and failed *silently*, suppressing the staleness
 * warning rather than erroring (carry-forward 102).
 *
 * The suffix on a variant label (`p2_6p`, `p2_9p`) is not part of the phase, so
 * only the leading `pN` is read. That suffix is a hit percentage rather than a
 * piece count — see carry-forward 88.
 */
const CURATED_SET_PHASE: Record<string, number> = {
  preraid: 1,
  p1: 1,
  p2: 2,
  p3: 3,
};

export function curatedSetPhase(label: string): number | null {
  return CURATED_SET_PHASE[label.split("_", 1)[0] ?? ""] ?? null;
}

/**
 * Is this row on a curated BiS list for the ranked phase?
 *
 * Reads `bisTags`, which `assemble_universe.py` scopes to the *current* stage
 * — an item BiS for an earlier stage keeps `curatedSets` and loses its tag, so
 * this never badges "was BiS two phases ago" as a recommendation
 * (carry-forward 47 §1).
 *
 * Deliberately not `curatedSets`: on feral P2 that field also carries five
 * `preraid` rows, and "in the pre-raid set" is a different claim from "BiS
 * now" — the opposite one, mostly.
 */
export function isCuratedBis(item: Pick<RankedItem, "bisTags">): boolean {
  return (item.bisTags ?? []).includes("BiS");
}

/**
 * Reconciles the one row that asserts two true things at once: a "BiS" badge
 * and a large negative delta. Both are right — the swap really does forfeit the
 * worn set's bonus, and the completed package really is upstream's pick — so
 * this is a framing mismatch between a single swap and a package, not a wrong
 * number (carry-forward 96).
 *
 * The pointer states the set's measured whole-package figures itself (ticket
 * 118, folding in ticket 96's live case). Before that, it read "see Set
 * potential" with no number, which implied the package redeems the row — and
 * on a set whose every package measured negative, the panel then said the
 * opposite. With the figures inline the destination cannot contradict the
 * pointer: the numbers are the data, and no advice is added either way.
 *
 * The figures are `packageDeltaDps` — the same measured quantity every other
 * surface shows — never the break-confounded derived `bonusDps`
 * (carry-forward 90), and nothing here reaches a sort key.
 */
export function formatCuratedPackagePointer(
  item: Pick<RankedItem, "bisTags" | "belowCutoff" | "setContext">,
  setBonuses: readonly SetBonusValue[] = []
): string {
  if (!isCuratedBis(item) || !item.belowCutoff) return "";
  const ctx = item.setContext;
  if (ctx?.setName === undefined) return "";
  const head = `BiS as part of ${ctx.setName}, not as this swap alone`;
  const measured = setBonuses.filter(
    (b) => b.setId === ctx.setId && b.unmeasured === undefined
  );
  if (measured.length === 0) return `${head} — see Set potential`;
  const figures = [...measured]
    .sort((a, b) => a.threshold - b.threshold)
    .map(
      (b) =>
        `${b.threshold}pc ${b.packageDeltaDps > 0 ? "+" : ""}${b.packageDeltaDps.toFixed(2)}`
    )
    .join(" / ");
  return `${head} — its measured packages: ${figures} DPS vs current gear (see Set potential)`;
}

/**
 * How much of a prospective bonus counts toward a row's displayed value, by
 * the threshold that would unlock it. A 2pc is nearer and cheaper than a 4pc,
 * so it is discounted less.
 *
 * Flat per threshold, deliberately: the weight does not scale by how many
 * pieces are still missing. A row three pieces short of 4pc therefore carries
 * the same 0.25x credit as one that is a single piece away. That was chosen
 * over a pieces-remaining divisor, so the toggle stays the arithmetic the
 * reader can do in their head against `formatSetPotentialLine`'s number.
 */
export const SET_POTENTIAL_WEIGHTS: Record<SetThreshold, number> = {
  2: 0.5,
  4: 0.25,
};

/**
 * How much of a prospective bonus a row's displayed value credits.
 *
 * - `weighted` — `SET_POTENTIAL_WEIGHTS`, discounting by threshold.
 * - `full` — the whole bonus, no discount. Answers a different question than
 *   `weighted`: not "what fraction of this bonus does this piece deliver" but
 *   "what is this piece worth *if* I end up completing the set anyway", which
 *   is the realistic case when the remaining pieces are upgrades on their own
 *   merits. It over-credits every row of the set equally, so it reads as an
 *   upper bound rather than an estimate.
 *
 * The two are alternatives, never combined — `full` is not `weighted` with a
 * different constant, it is a different question.
 */
export type SetPotentialCredit = "weighted" | "full";

/**
 * A member row's value as the **best of its set's measured whole-package
 * figures**, or its own `deltaDps` when no measured package for the set is
 * positive.
 *
 * The owner's decision of 2026-08-10 (spec §4): under the opt-in view, the
 * question a tier row should answer is not "what does this piece do tonight"
 * but "is starting this set worth it at all" — so every member row of one
 * package carries the same whole-package figure and they sort as a block.
 *
 * "Best of the measured values" is the owner's ticket-118 refinement
 * (2026-08-11). A row carries every measured threshold's figure, and the sort
 * takes the highest: on the ret artifact the Lightbringer 2pc measures +11.31
 * while the 4pc measures -6.83, so a Lightbringer row sorts by +11.31 rather
 * than being pinned to the larger threshold's negative number. Plain
 * arithmetic over simmed data, not a judgment about which goal matters.
 *
 * Three things this deliberately is not:
 *
 * - **Not a per-piece split.** Spec §2.1 stands: no fraction of a package is
 *   attributed to any piece. Every member shows the identical number, which is
 *   why `formatPackageMembershipLine` must label it as the package's.
 * - **Not the confounded quantity.** Ticket 90 suppresses `bonusDps`, the
 *   derived `packageDelta − Σ singles` split that inflates by `(k−1)·B`.
 *   `packageDeltaDps` is a single simmed delta with any broken set's cost
 *   already netted inside it, so the confound never lands on it and
 *   `setPotentialIsConfounded` is correctly not consulted here.
 * - **Not a maximum against the row's own delta.** A positive package figure
 *   replaces the row's own value rather than being maxed with it, so the
 *   member rows stay one block instead of splitting around whichever pieces
 *   happen to be upgrades alone.
 *
 * Only a **positive** package is credited. A set whose every measured package
 * is ≤ 0 is not worth starting on this gear, and crediting it would move rows
 * on figures that argue against them.
 */
export function packageSetPotentialDps(
  item: Pick<RankedItem, "deltaDps" | "setContext">
): number {
  const pkgs = item.setContext?.packages;
  if (!pkgs || pkgs.length === 0) return item.deltaDps;
  const finiteDeltas = pkgs
    .map((p) => p.deltaDps)
    .filter((d) => Number.isFinite(d));
  if (finiteDeltas.length === 0) return item.deltaDps;
  const best = Math.max(...finiteDeltas);
  return best > 0 ? best : item.deltaDps;
}

/**
 * The member row's package line: the row's own single-swap delta first, then
 * one figure per measured threshold — "2pc package +11.31 / 4pc package
 * -6.83" — so the number that moved the row is never the only one on screen,
 * and no threshold's measurement is hidden behind another's (ticket 118).
 *
 * Negative figures render too. The owner's direction: we sim things and
 * present data; a package that measured badly is a measurement, not a secret.
 * (Only the *sort* ignores non-positive packages — `packageSetPotentialDps`.)
 *
 * The wording says each figure is the **whole package**'s, because every
 * member row shows the same figures and a reader must not take one for this
 * piece's share. And it carries `GEM_POLICY_QUALIFIER`, the same caveat the
 * panel states about the same figures.
 */
export function formatPackageMembershipLine(
  item: Pick<RankedItem, "deltaDps" | "setContext">
): string | undefined {
  const ctx = item.setContext;
  const pkgs = ctx?.packages;
  if (!ctx || !pkgs || pkgs.length === 0) return undefined;
  const own = `${item.deltaDps > 0 ? "+" : ""}${item.deltaDps.toFixed(2)}`;
  const figures = pkgs
    .map(
      (p) =>
        `${p.threshold}pc package ${p.deltaDps > 0 ? "+" : ""}${p.deltaDps.toFixed(2)} (${p.piecesNeeded} pieces)`
    )
    .join(" / ");
  return (
    `this swap alone: ${own} — ${figures} — each figure is that whole ` +
    `package of ${ctx.setName} pieces vs current gear (${GEM_POLICY_QUALIFIER})`
  );
}

/**
 * A row's value with prospective set potential credited in — the quantity the
 * report's client-side toggle sorts and displays on.
 *
 * Falls back to plain `deltaDps` whenever there is no prospective bonus to
 * credit: no `setContext`, a candidate that already crosses its threshold (the
 * bonus is inside `deltaDps` already, §2.1, so crediting it would double-count),
 * or a threshold whose bonus the sim never measured.
 */
/**
 * Is this row's prospective bonus too confounded to rank on (ticket 90)?
 *
 * `bonus = packageDelta − Σ singles` charges a displaced set's lost bonus once
 * inside `packageDelta` but k times across the singles, so a figure whose
 * package breaks another worn set reads as `true + (k−1)·B`. `B` is not known
 * to within a factor of 4, so the figure is suppressed from ranking rather than
 * corrected — it stays visible in the Set potential panel, qualified by what it
 * breaks.
 */
export function setPotentialIsConfounded(
  item: Pick<RankedItem, "setContext">
): boolean {
  const breaks = item.setContext?.prospectiveBonusBreaks;
  return breaks !== undefined && breaks.length > 0;
}

export function weightedSetPotentialDps(
  item: Pick<RankedItem, "deltaDps" | "setContext">,
  credit: SetPotentialCredit = "weighted"
): number {
  const ctx = item.setContext;
  if (
    !ctx ||
    ctx.crossesThreshold ||
    ctx.nextThreshold === null ||
    ctx.prospectiveBonusDps === undefined ||
    setPotentialIsConfounded(item)
  ) {
    return item.deltaDps;
  }
  const factor =
    credit === "full" ? 1 : SET_POTENTIAL_WEIGHTS[ctx.nextThreshold];
  return item.deltaDps + ctx.prospectiveBonusDps * factor;
}

/**
 * The per-item annotation under `--with-set-potential` (§4): "+X set
 * potential (needs N more pieces)". Absent when the row has no prospective
 * value to show — already at/above the top threshold, already crossing one,
 * or the relevant bonus is unmeasured (nothing numeric to add).
 */
export function formatSetPotentialLine(
  item: Pick<RankedItem, "setContext">
): string | undefined {
  const ctx = item.setContext;
  if (!ctx || ctx.crossesThreshold || ctx.prospectiveBonusDps === undefined) {
    return undefined;
  }
  const needed =
    ctx.nextThreshold === null ? 0 : ctx.nextThreshold - ctx.piecesAfterSwap;
  // `nextThreshold` (§2.3) is always strictly above `piecesAfterSwap`, so
  // `needed` should always be positive here; a non-positive value means the
  // caller passed a `setContext` that does not match its own invariant
  // (e.g. crossesThreshold mis-set) rather than a real "0 more" state.
  if (needed <= 0) return undefined;
  const sign = ctx.prospectiveBonusDps >= 0 ? "+" : "";
  const base = `${sign}${ctx.prospectiveBonusDps.toFixed(2)} set potential (needs ${needed} more piece${needed === 1 ? "" : "s"})`;
  const breaks = ctx.prospectiveBonusBreaks;
  if (breaks === undefined || breaks.length === 0) return base;
  // Suppress-and-disclose: the figure is inflated by an unseparable break, so
  // it is shown with its cause but excluded from the sort key and cutoff. No
  // numeric correction is applied — the `(k−1)·B` inflation is not subtracted
  // here or anywhere, because `B` is gear-dependent (see `brokenSetBonuses` in
  // `set-value.ts`). "Correct" would promise arithmetic this does not do.
  const names = breaks.map((b) => `${b.setName} ${b.threshold}pc`).join("; ");
  return `${base} — inflated by breaking ${names}, not counted in ranking`;
}
