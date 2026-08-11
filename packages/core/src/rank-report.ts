/**
 * The rank report's HTML template: escaping, number/label formatting, and
 * document structure. What to show and in what order lives in
 * `rank-report-rules.ts`; the stylesheet lives in `rank-report-css.ts`.
 *
 * Self-contained output by design: one file, no build step, no sibling
 * assets, open in any browser.
 */

import {
  fightProvenanceLines,
  hitCapBanner,
  setPotentialDisclosureLine,
} from "./disclosure.js";
import type { ItemSource } from "./pool.js";
import type { RankedItem, Ranking } from "./rank.js";
import { REPORT_CSS } from "./rank-report-css.js";
import {
  curatedSetPhase,
  setBonusEntry,
  formatSetPotentialLine,
  groupBySlot,
  formatCuratedPackagePointer,
  GEM_POLICY_QUALIFIER,
  isCuratedBis,
  formatPackageMembershipLine,
  packageSetPotentialDps,
  packageOnlyShortlist,
  partitionShortlist,
  SET_POTENTIAL_WEIGHTS,
  weightedSetPotentialDps,
  SLOT_ORDER,
  type ReportItem,
  type RankReportMeta,
} from "./rank-report-rules.js";

// Re-exported so `rank-report.js` stays the one import site for the report,
// as index.ts and the CLI already use it.
export {
  groupBySlot,
  packageOnlyShortlist,
  partitionShortlist,
  SLOT_ORDER,
  type RankReportMeta,
} from "./rank-report-rules.js";

export function formatItemSource(source: ItemSource): string {
  switch (source.kind) {
    case "raid":
      return source.boss ? `${source.zone} · ${source.boss}` : source.zone;
    case "token":
      return source.boss
        ? `${source.zone} · ${source.boss} (${source.token})`
        : `${source.zone} (${source.token})`;
    case "badge":
      return `${source.cost} badges`;
    case "crafted":
      // The profession alone does not tell a player whether they can make it.
      // A recipe gated behind a reputation is a grind, and that is the part
      // worth surfacing (ticket 65 step 4). `recipeZone` stays unrendered, as
      // it always has — raid attribution is a filter concern, not a label.
      return source.recipeFaction
        ? `Crafted · ${source.profession} · ${source.recipeFaction}${
            source.recipeStanding ? ` ${source.recipeStanding}` : ""
          }`
        : `Crafted · ${source.profession}`;
    case "rep":
      return `${source.faction} · ${source.standing}`;
    case "heroic":
      return `Heroic · ${source.dungeon}`;
    case "pvp":
      return source.season != null
        ? `PvP · ${source.via} S${source.season}`
        : `PvP · ${source.via}`;
    case "world":
      return "World drop";
    case "unknown":
      return "Source not recorded";
  }
}

/**
 * The curated ranked list's chips.
 *
 * The leading number is the item's **position in this list**, renumbered
 * 1..N by the script whenever a filter changes, so it always describes the
 * list on screen. That is deliberately not `RankedItem.rank`, which stays
 * absolute across the whole ranking (§12) and is carried alongside as
 * `data-abs-rank` — shown dimmed and in the tooltip, because a chip reading
 * "3" while the same item reads "#7" in its slot section would otherwise be
 * two unexplained numbers for one item.
 *
 * §12's objection is to renumbering *`rank` itself* inside a filter, which
 * would claim an item is better than it is. Nothing here writes `rank`.
 */
function renderShortlistChips(
  items: RankedItem[],
  // Package-only chips are appended after the ordinary ones and marked, so the
  // three modes that do not show them render exactly the list they always did.
  packageOnly: RankedItem[] = []
): string {
  const ordinary = items
    .slice()
    .sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99))
    .map((i) => chipHtml(i, false));
  const admitted = packageOnly
    .slice()
    .sort((a, b) => packageSetPotentialDps(b) - packageSetPotentialDps(a))
    .map((i) => chipHtml(i, true));
  return [...ordinary, ...admitted].join("\n");
}

function chipHtml(i: RankedItem, packageOnly: boolean): string {
  const weighted = weightedSetPotentialDps(i);
  const full = weightedSetPotentialDps(i, "full");
  const pkg = packageSetPotentialDps(i);
  const absRank = i.rank == null ? "" : `#${i.rank}`;
  // An admitted chip is below cutoff, so the tooltip has to say what it is
  // doing in a curated list at all — the figure it carries is the package's,
  // not this swap's.
  const title = packageOnly
    ? `below cutoff as a single swap — shown for its ${fmtDelta(pkg)} DPS package`
    : i.rank == null
      ? "not ranked overall"
      : `#${i.rank} of every candidate simmed`;
  const cls = `chip${isCuratedBis(i) ? " is-bis" : ""}${packageOnly ? " package-only muted" : ""}`;
  // The package figures are a group's numbers, not this piece's, so they never
  // replace `.d` — they ride in their own subordinate span, shown only under
  // package mode, with a literal marker so the pair cannot read as a range
  // (ticket 112). Each measured threshold shows separately (ticket 118):
  // "pkg 2pc +11.31 / 4pc -6.83". Emitted only when the row is in a measured
  // package, so ordinary chips keep byte-identical markup.
  const memberPkgs = i.setContext?.packages ?? [];
  const pkgSpan =
    memberPkgs.length > 0
      ? `<span class="pkg">pkg ${memberPkgs
          .map((p) => `${p.threshold}pc ${fmtDelta(p.deltaDps)}`)
          .join(" / ")}</span>`
      : "";
  return `<a class="${cls}" href="#slot-${i.slot}" title="${esc(title)}" data-item-id="${i.itemId}" data-abs-rank="${esc(absRank)}" data-sources="${esc(sourceKeysOf(i).join(SOURCE_KEY_SEP))}" data-delta="${i.deltaDps}" data-weighted="${weighted}" data-full="${full}" data-package="${pkg}"><span class="pos"></span><span class="n">${esc(i.name)}</span><span class="abs">${esc(absRank)}</span><span class="d" data-plain="${esc(fmtDelta(i.deltaDps))}" data-weighted-label="${esc(fmtDelta(weighted))}" data-full-label="${esc(fmtDelta(full))}" data-package-label="${esc(fmtDelta(pkg))}">${fmtDelta(i.deltaDps)}</span>${pkgSpan}</a>`;
}

/**
 * Ticket 123: a substitution caused by a sim crash carries the whole Go stack
 * trace in its detail — 2.4KB of goroutine frames on the ret artifact — and
 * the first line of the error already says what went wrong. Only the HTML
 * rendering trims; the JSON artifact keeps the full text as the diagnostic
 * record. The trace's newlines arrive both as real newline characters and as
 * written-out backslash-n pairs (the sim's error object is stringified into
 * the detail), so both count as a line break here.
 */
function firstLineOf(detail: string): string {
  const line = detail.split(/\r?\n|\\n/, 1)[0] ?? detail;
  return line === detail ? detail : `${line} … (full text in the JSON report)`;
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function fmtDelta(n: number): string {
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}`;
}

function fmtSlotChoice(item: ReportItem): string {
  if (item.replacesEquipped) {
    return `Replaces ${item.replacesEquipped.name}`;
  }
  // A bare sim slot name reads as jargon on its own; the empty slot is why
  // there is no item to name here.
  return item.slotChoice ? `Into ${item.slotChoice}` : "";
}

function fmtAlternateSlot(item: ReportItem): string {
  if (!item.alternateSlot) return "";
  return `Also ${fmtDelta(item.alternateSlot.deltaDps)} if replacing ${item.alternateSlot.replacesName}`;
}

function wowheadUrl(itemId: number): string {
  return `https://www.wowhead.com/tbc/item=${itemId}`;
}

/**
 * The filter buckets a row belongs to — a zone key per raid it drops in, plus
 * its non-raid source kinds. Every source is read, not just the primary one:
 * a tier piece reaches its raid through `kind: "token"`, and filtering on
 * `source` alone is the two-hop bug §15's risk table names (a "Karazhan"
 * filter that omits every T4 piece).
 */
function sourceKeysOf(item: RankedItem): string[] {
  const keys = new Set<string>();
  for (const s of item.sources ?? [item.source]) {
    if ("zone" in s) keys.add(`zone:${s.zone}`);
    else keys.add(`kind:${s.kind}`);
  }
  return [...keys].sort();
}

/**
 * `data-sources` is a delimited list, and zone names contain spaces
 * ("Black Temple"), so it cannot be space-separated — splitting on space gave
 * every multi-word zone a key that matched no checkbox, and those rows
 * vanished with their own filter switched on. Tab is safe: it cannot occur in
 * a zone name or an `ItemSource` kind.
 */
const SOURCE_KEY_SEP = "\t";

/** Reader-facing label for a `sourceKeysOf` key. */
function sourceKeyLabel(key: string): string {
  const [prefix, ...rest] = key.split(":");
  const value = rest.join(":");
  if (prefix === "zone") return value;
  return ZONELESS_SOURCE_LABELS[value] ?? value;
}

// Mirrors `view.ts`'s labels for the same zone-less kinds, so the filter and
// `--group-by raid` name a bucket the same way.
const ZONELESS_SOURCE_LABELS: Record<string, string> = {
  badge: "Badge vendor",
  crafted: "Crafted",
  rep: "Reputation vendor",
  pvp: "PvP vendor",
  world: "World drop",
  heroic: "Heroic dungeon",
  unknown: "Source not recorded",
};

// The spec was hardcoded to `ret`, so every feral report claimed it had loaded
// `ret-p2` while the CLI had in fact loaded `feral-p2.json`. The name here has
// to match `loadUniversePool`'s `data/universes/${spec}-p${maxPhase}.json`.
function poolScopeNote(meta: RankReportMeta): string {
  const base = `Universe pool (${meta.spec}-p${meta.maxPhase}).`;
  return meta.raid ? `${base} Filtered to ${meta.raid}.` : base;
}

/**
 * A row's `setContext` exists but `formatSetPotentialLine` returned nothing
 * — the crossing case (bonus already in `deltaDps`) or a set at/above its
 * top measurable threshold. Neither is "unmeasured", so this names the
 * crossing case explicitly rather than rendering a misleading blank.
 */
function setPotentialUnmeasuredText(item: RankedItem): string {
  const ctx = item.setContext;
  if (ctx?.crossesThreshold) {
    return `completes ${ctx.piecesAfterSwap}pc (included in delta)`;
  }
  return "no further threshold to measure";
}

export function renderRankHtml(ranking: Ranking, meta: RankReportMeta): string {
  // Report-time toggle semantics, same as the other optional facts this
  // report already gates on `meta.view` (§4) — the ranking always computes
  // setBonuses/setContext, but rendering them is a display choice.
  const withSetPotential = meta.view?.withSetPotential === true;
  const reportItems = ranking.items as ReportItem[];
  const bySlot = groupBySlot(ranking.items);
  const { raid: aboveRaid, pvp: abovePvp } = partitionShortlist(ranking.items);
  // Admitted into the curated strip for package mode only; hidden by CSS in
  // every other mode, so those modes render the list they always did.
  const packageOnlyChips = packageOnlyShortlist(ranking.items);
  const above = ranking.items.filter((i) => !i.belowCutoff);
  const noiseNote =
    ranking.baseline.stdev > 0
      ? `<p class="noise-note">Order within ~±${ranking.baseline.stdev.toFixed(1)} DPS is run noise, not a ranked wishlist.</p>`
      : "";
  // Rows say "widens your gap to N", so the page has to say what the gap is
  // and carry the Heroic Presence caveat that makes it uncertain. Rendered
  // from `ranking.caps` / `ranking.fight`, which `renderRankHtml` already
  // receives — the CLI and the report read one source rather than two
  // (carry-forward 76).
  const capBanner = `<p class="cap-banner">${esc(hitCapBanner(ranking.caps.hit))}</p>`;
  const provenanceLines = fightProvenanceLines(ranking.fight);
  const provenance = provenanceLines.length
    ? `<p class="provenance">${provenanceLines.map(esc).join("<br />")}</p>`
    : "";

  const slotsWithItems = SLOT_ORDER.filter(
    (s) => (bySlot.get(s) ?? []).length > 0
  );

  // Both counts ride on the nav link so the BiS filter can swap the badge
  // without recomputing anything client-side.
  const nav = slotsWithItems
    .map((slot) => {
      const list = bySlot.get(slot) ?? [];
      const n = list.filter((i) => !i.belowCutoff).length;
      const bisN = list.filter(isCuratedBis).length;
      const badge = n > 0 ? `<span class="nav-hit">${n}</span>` : "";
      const bisCls = bisN > 0 ? "" : " no-bis";
      return `<a href="#slot-${slot}" class="nav-slot${bisCls}" data-hits="${n}" data-bis-hits="${bisN}">${esc(slot)}${badge}</a>`;
    })
    .join("\n");

  const sections = slotsWithItems
    .map((slot) => {
      const list = bySlot.get(slot) ?? [];
      const hits = list.filter((i) => !i.belowCutoff).length;
      const rows = list
        .map((item) => {
          const reportItem = item as ReportItem;
          // `is-bis` drives the BiS-only filter in CSS. Marked per row rather
          // than filtered here, because the filter is a client-side view and
          // the artifact must still hold every row (§10, hidden not deleted).
          const bisCls = isCuratedBis(item) ? " is-bis" : "";
          const cls = (item.belowCutoff ? "row muted" : "row hit") + bisCls;
          const softRank =
            !item.belowCutoff &&
            Math.abs(item.deltaDps) < ranking.baseline.stdev;
          const rank =
            item.rank == null
              ? `<span class="rank dash">—</span>`
              : `<span class="rank${softRank ? " soft-rank" : ""}">#${item.rank}</span>`;
          const choiceText = fmtSlotChoice(reportItem);
          const choice = choiceText
            ? `<span class="choice">${esc(choiceText)}</span>`
            : "";
          const alternate = reportItem.alternateSlot
            ? `<div class="alt-slot">${esc(fmtAlternateSlot(reportItem))}</div>`
            : "";
          const set = item.setBonusNote
            ? `<div class="set">${esc(item.setBonusNote)}</div>`
            : "";
          // The set clauses below were four sibling divs hung off the body,
          // which read as four unrelated sentences competing with the item
          // name. They are one subject — what this swap does to your sets — so
          // they render as one labelled block, keeping the row's own delta as
          // the primary figure in the numbers column.
          // The "with set" column (§4): under the toggle, every row with a
          // setContext shows its prospective value or, when unmeasured, the
          // reason — never a blank and never a silent 0 (§8.5).
          const setPotential =
            withSetPotential && item.setContext
              ? `<div class="set-potential">${esc(formatSetPotentialLine(item) ?? setPotentialUnmeasuredText(item))}</div>`
              : "";
          // Ungated, unlike `setPotential` above: this carries no figure, and
          // the contradiction it reconciles is visible by default
          // (carry-forward 96).
          // Ungated like the curated pointer below: it carries the row's own
          // delta beside the package figure, so it explains the package mode
          // rather than asserting a ranking. Rendered whenever a measured,
          // positive package claims this row.
          const packageLineText = formatPackageMembershipLine(item);
          const packageLine = packageLineText
            ? `<div class="package-line">${esc(packageLineText)}</div>`
            : "";
          const curatedPointerText = formatCuratedPackagePointer(
            item,
            ranking.setBonuses ?? []
          );
          const curatedPointer = curatedPointerText
            ? `<div class="curated-pointer">${esc(curatedPointerText)}</div>`
            : "";
          // The HTML report rendered neither cap annotation, so the page could
          // banner a hit gap and then recommend an item that widened it with
          // nothing on the row saying so (carry-forward 47 §2).
          const hitNote = item.hitDriven
            ? `<div class="hit-note">most of this gain is hit rating, and you are under the cap</div>`
            : "";
          const hitLoss = item.hitRegression
            ? `<div class="hit-note down">costs ${item.hitRegression.lost} hit rating — widens your gap to ${Math.round(item.hitRegression.gapAfter)}</div>`
            : "";
          const owned = item.owned
            ? `<span class="pill owned">owned</span>`
            : "";
          const pvp =
            item.source.kind === "pvp"
              ? `<span class="pill pvp">PvP</span>`
              : "";
          const magnitude = reportItem.magnitudeWarning
            ? `<span class="pill warn">sim magnitude</span>`
            : "";
          // "BiS" is a claim about a stage, exactly as upstream scopes it, so
          // the badge names the stage rather than implying an absolute verdict
          // (carry-forward 47 §1).
          const bisSets = item.bisSets;
          const tags = (item.bisTags ?? [])
            .map((t) =>
              t === "BiS" && bisSets?.length
                ? `<span class="pill tag" title="equipped by the pinned upstream ${bisSets.join(" and ")} gear set${bisSets.length > 1 ? "s" : ""}">${esc(bisSets.join("/"))} BiS</span>`
                : `<span class="pill tag">${esc(t)}</span>`
            )
            .join("");
          // Emitted only when something is in it, so a row with no set
          // involvement keeps exactly today's markup and the block never
          // renders as an empty bordered strip.
          const setInfoParts = [set, setPotential, packageLine, curatedPointer]
            .filter((p) => p !== "")
            .join("\n      ");
          const setInfo = setInfoParts
            ? `<div class="set-info">
      <p class="set-info-title">Set</p>
      ${setInfoParts}
    </div>`
            : "";
          const deltaCls =
            item.deltaDps > 0
              ? "delta up"
              : item.deltaDps < 0
                ? "delta down"
                : "delta flat";
          // All three values ride on the row so the control is a re-sort and a
          // label swap in the browser, never a re-run of the pipeline. They
          // differ from `deltaDps` only where a row carries an unrealised
          // prospective bonus.
          const weighted = weightedSetPotentialDps(item);
          const full = weightedSetPotentialDps(item, "full");
          const pkg = packageSetPotentialDps(item);
          const deltaClsFor = (n: number) =>
            n > 0 ? "delta up" : n < 0 ? "delta down" : "delta flat";
          const weightedCls = deltaClsFor(weighted);
          const fullCls = deltaClsFor(full);
          const pkgCls = deltaClsFor(pkg);
          return `<article class="${cls}" data-item-id="${item.itemId}" data-sources="${esc(sourceKeysOf(item).join(SOURCE_KEY_SEP))}" data-delta="${item.deltaDps}" data-weighted="${weighted}" data-full="${full}" data-package="${pkg}">
  <div class="lead">${rank}${choice}</div>
  <div class="body">
    <a class="name" href="${wowheadUrl(item.itemId)}" target="_blank" rel="noreferrer">${esc(item.name)}</a>
    <div class="meta">${esc(formatItemSource(item.source))} ${owned}${pvp}${magnitude}${tags}</div>
    ${alternate}
    ${setInfo}
    ${hitNote}
    ${hitLoss}
  </div>
  <div class="nums">
    <div class="${deltaCls} delta-plain">${fmtDelta(item.deltaDps)} <span class="unit">DPS</span></div>
    <div class="${weightedCls} delta-weighted">${fmtDelta(weighted)} <span class="unit">DPS</span></div>
    <div class="${fullCls} delta-full">${fmtDelta(full)} <span class="unit">DPS</span></div>
    <div class="${pkgCls} delta-package">${fmtDelta(pkg)} <span class="unit">DPS</span></div>
    <div class="pct">${fmtDelta(item.deltaPct)}%</div>
  </div>
</article>`;
        })
        .join("\n");

      // A slot with no BiS row is hidden wholesale under the filter, rather
      // than left as an empty heading.
      const bisCount = list.filter(isCuratedBis).length;
      const sectionCls = bisCount > 0 ? "slot" : "slot no-bis";
      return `<section class="${sectionCls}" id="slot-${slot}">
  <header class="slot-head">
    <h2>${esc(slot)}</h2>
    <p class="slot-count-all">${list.length} candidates${hits ? ` · <strong>${hits} above cutoff</strong>` : ""}</p>
    <p class="slot-count-bis">${bisCount} BiS candidate${bisCount === 1 ? "" : "s"}</p>
  </header>
  <div class="rows">${rows}</div>
</section>`;
    })
    .join("\n");

  const assumptions = ranking.assumptions.standing
    .map((a) => `<li><code>${esc(a.id)}</code> ${esc(a.detail)}</li>`)
    .join("\n");

  const subs =
    ranking.substitutions.length === 0
      ? ""
      : `<details class="panel">
  <summary>Substitutions (${ranking.substitutions.length})</summary>
  <ul>${ranking.substitutions
    .map(
      (s) =>
        `<li><code>${esc(s.field)}</code> ${esc(firstLineOf(s.detail))}</li>`
    )
    .join("\n")}</ul>
</details>`;

  // The "with set" block (§4), the report's counterpart to the CLI's set
  // block: one row per SetBonusValue, unmeasured reasons rendered as text
  // rather than a blank or a 0 (§8.5), plus the standing-assumption line
  // naming the measurement method (PLAN.md §9 R7).
  //
  // Deliberately NOT gated on `withSetPotential`, unlike the per-row
  // annotation above. Spec §4's default-off rule is about keeping the *sort
  // key and cutoff* unchanged; this panel moves no number, and it is the only
  // surface a 4pc bonus at 0 pieces worn can reach at all (carry-forward 91).
  // Gating disclosure on the ranking toggle hid that figure from every default
  // reader — carry-forward 100.
  const setPotentialPanel =
    ranking.setBonuses && ranking.setBonuses.length > 0
      ? `<details class="panel" open>
  <summary>Set potential (${ranking.setBonuses.length})</summary>
  <p class="set-potential-assumption">${esc(setPotentialDisclosureLine())}</p>
  <ul class="set-entries">${ranking.setBonuses
    .map((b) => {
      const entry = setBonusEntry(b);
      const lines = entry.lines
        .map(
          (l) => `<div class="set-entry-line ${l.kind}">${esc(l.text)}</div>`
        )
        .join("\n      ");
      return `<li class="set-entry">
      <p class="set-entry-head">${esc(entry.heading)}</p>
      ${lines}
    </li>`;
    })
    .join("\n")}</ul>
</details>`
      : "";

  // Ticket 98's gates. Open, and above the rows rather than filed in a
  // details drawer, because each one qualifies a figure the reader is about to
  // act on. Nothing is suppressed — the flagged bonus still renders in the Set
  // potential panel, and the dead slot still shows all its rows.
  const warnings = ranking.plausibilityWarnings ?? [];
  const plausibilityPanel = warnings.length
    ? `<details class="panel plausibility" open>
  <summary>Plausibility warnings (${warnings.length})</summary>
  <ul>${warnings.map((w) => `<li>${esc(w.message)}</li>`).join("\n")}</ul>
</details>`
    : "";

  // Offered only where some row would actually move: a page with no
  // unrealised prospective bonus gets an inert control otherwise. Measured on
  // `full`, the wider of the two credits — a row `weighted` leaves still can
  // move under `full`, so testing `weighted` alone could hide a live control.
  //
  // Package mode is tested separately rather than folded in: a member row can
  // carry a package while carrying no prospective bonus at all (its
  // `nextThreshold` bonus may be unmeasured, or point at a threshold it does
  // not advance), so a `full`-only test would hide a control that has work to
  // do — exactly the T6 shoulders case the owner asked for.
  const anyWeighted = ranking.items.some(
    (i) =>
      weightedSetPotentialDps(i, "full") !== i.deltaDps ||
      packageSetPotentialDps(i) !== i.deltaDps
  );
  // Radios rather than two checkboxes: the modes are alternative answers to
  // "how much of this bonus counts", so the markup itself has to make picking
  // both impossible rather than leaving the script to referee it.
  const setWeightToggle = anyWeighted
    ? `<div class="set-weight-toggle">
      <p class="set-weight-title">Set-bonus potential</p>
      <label><input type="radio" name="set-weight" value="off" checked /> <span>Off — measured DPS only</span></label>
      <label><input type="radio" name="set-weight" value="weighted" /> <span>Weighted — ${SET_POTENTIAL_WEIGHTS[2]}× a 2pc bonus, ${SET_POTENTIAL_WEIGHTS[4]}× a 4pc</span></label>
      <label><input type="radio" name="set-weight" value="full" /> <span>Full — the whole bonus, as if the set gets completed anyway</span></label>
      <label><input type="radio" name="set-weight" value="package" /> <span>Package — score each set piece by the whole set it completes</span></label>
      <p class="set-weight-note">Re-sorts and re-labels rows and chips. Display only — which items count as above cutoff is unchanged. <strong>Full</strong> credits every piece of a set with the entire bonus, so it is an upper bound, not an estimate: it is the right lens when the set's other pieces are upgrades you would take regardless, and too generous when they are not. <strong>Package</strong> answers a different question again — not what a piece is worth tonight, but whether starting the set is worth it: every piece of one completion package shows that package's own simmed value against your current gear, breaks included, so a piece that is a downgrade alone can still be worth collecting. Each row keeps its own single-swap delta beside the figure. Every package value ${esc(GEM_POLICY_QUALIFIER)}.</p>
    </div>`
    : "";

  // Same availability rule as the set control: no curated rows, no filter.
  const bisCount = ranking.items.filter(isCuratedBis).length;
  // Deliberately not scoped to above-cutoff rows. A curated pick is BiS as a
  // member of a whole optimized set, so several are below cutoff as single
  // swaps (Wolfshead Helm, Bloodlust Brooch) — showing 10 of 17 under a
  // control labelled "BiS only" would misdescribe the list it names.
  // Name the sets the tags actually came from, never the requested phase.
  // Where no set is vendored for the ranked phase,
  // `bis_set_labels_for_max_phase` degrades to the newest one that is, so the
  // rows can carry an older stage's list. Labelling that "P3 BiS" would assert
  // a curation nobody made — the per-item overclaim carry-forward 47 §1 was
  // filed for, one level up. The warning below says so rather than hiding it.
  const bisSetLabels = [
    ...new Set(
      ranking.items.filter(isCuratedBis).flatMap((i) => i.bisSets ?? [])
    ),
  ].sort();
  const bisStale = bisSetLabels.some((s) => {
    const phase = curatedSetPhase(s);
    return phase !== null && phase < meta.maxPhase;
  });
  const bisProvenance = bisSetLabels.length
    ? ` (${esc(bisSetLabels.join(", "))})`
    : "";
  const bisStaleNote = bisStale
    ? ` <strong>No curated set is pinned for P${meta.maxPhase}</strong>, so these are the newest that is — an older phase's list, not a P${meta.maxPhase} recommendation.`
    : "";
  const bisFilter =
    bisCount > 0
      ? `<div class="set-weight-toggle bis-filter">
      <p class="set-weight-title">Curated list</p>
      <label><input type="checkbox" id="bis-only" /> <span>BiS only — the ${bisCount} items on upstream's ${esc(meta.spec)} gear set${bisSetLabels.length === 1 ? "" : "s"}${bisProvenance}</span></label>
      <p class="set-weight-note">Upstream's pinned gear sets, not an absolute verdict.${bisStaleNote} Below-cutoff picks stay visible and stay muted: an item is BiS as part of a whole optimized set, which is why some are downgrades as a single swap.</p>
    </div>`
      : "";

  // One checkbox per source bucket present in the data, raids first (by row
  // count, the order a reader scans) then the zone-less kinds alphabetically.
  // All start checked, so the default page is unfiltered and the control reads
  // as "uncheck what you cannot raid tonight".
  const sourceCounts = new Map<string, number>();
  for (const item of ranking.items) {
    for (const key of sourceKeysOf(item)) {
      sourceCounts.set(key, (sourceCounts.get(key) ?? 0) + 1);
    }
  }
  const sourceKeys = [...sourceCounts.entries()].sort((a, b) => {
    const aZone = a[0].startsWith("zone:");
    const bZone = b[0].startsWith("zone:");
    if (aZone !== bZone) return aZone ? -1 : 1;
    if (aZone && a[1] !== b[1]) return b[1] - a[1];
    return sourceKeyLabel(a[0]).localeCompare(sourceKeyLabel(b[0]));
  });
  const sourceFilter =
    sourceKeys.length > 1
      ? `<div class="set-weight-toggle source-filter">
      <p class="set-weight-title">Sources</p>
      <div class="source-boxes">${sourceKeys
        .map(
          ([key, n]) =>
            `<label><input type="checkbox" class="source-box" value="${esc(key)}" checked /> <span>${esc(sourceKeyLabel(key))} <span class="source-n">${n}</span></span></label>`
        )
        .join("\n      ")}</div>
      <p class="set-weight-note"><button type="button" id="source-all">All</button> <button type="button" id="source-none">None</button> — a row shows if <em>any</em> of its sources is checked, so a tier piece stays under its raid via the token that drops there.</p>
    </div>`
      : "";

  // Exports what is on screen, so it composes with every filter above rather
  // than being a second, silently different selection.
  const exportPanel = `<div class="set-weight-toggle export-panel">
      <p class="set-weight-title">Export</p>
      <p class="set-weight-note"><span id="export-count">0</span> items: <strong>the curated list, top to bottom, as currently filtered and sorted</strong> — the same order the chips above read, so changing the mode or a filter changes this. Where both a raid and a PvP list are shown they concatenate in that order, raid first. Item ids only, wowsims-shaped: a ranked list of candidates, <strong>not</strong> a 17-slot gear set, so it will not reconstruct a character on import.</p>
      <p><button type="button" id="export-copy">Copy JSON</button> <span id="export-status" class="export-status"></span></p>
      <textarea id="export-json" readonly rows="6" spellcheck="false"></textarea>
    </div>`;

  // Re-sorts in place, swaps the visible number, and toggles the BiS filter.
  // Deliberately the whole of the client-side behaviour: every value was
  // computed at generation time, so nothing here recomputes DPS, re-derives
  // the cutoff, or decides what counts as BiS. The two controls are
  // independent — either may be absent, and neither gates the other.
  const setWeightScript = `<script>
(function () {
  var radios = [].slice.call(
    document.querySelectorAll('input[name="set-weight"]')
  );
  var bisBox = document.getElementById("bis-only");
  var sourceBoxes = [].slice.call(document.querySelectorAll(".source-box"));
  var exportArea = document.getElementById("export-json");
  var exportCount = document.getElementById("export-count");
  var exportCopy = document.getElementById("export-copy");
  var exportStatus = document.getElementById("export-status");
  var containers = [].slice.call(document.querySelectorAll(".rows, .chips"));
  var originals = containers.map(function (c) {
    return { container: c, order: [].slice.call(c.children) };
  });
  function mode() {
    for (var i = 0; i < radios.length; i++) {
      if (radios[i].checked) return radios[i].value;
    }
    return "off";
  }
  // null means "no source filtering", which is not the same as the empty set:
  // unchecking every box legitimately shows nothing.
  function allowedSources() {
    if (!sourceBoxes.length) return null;
    var on = {};
    sourceBoxes.forEach(function (b) {
      if (b.checked) on[b.value] = true;
    });
    return on;
  }
  function sourceOk(el, allowed) {
    if (!allowed) return true;
    var raw = el.getAttribute("data-sources");
    if (!raw) return false;
    var keys = raw.split("	");
    for (var i = 0; i < keys.length; i++) {
      if (allowed[keys[i]]) return true;
    }
    return false;
  }
  function apply() {
    var m = mode();
    var attr =
      m === "full"
        ? "data-full"
        : m === "package"
          ? "data-package"
          : "data-weighted";
    var allowed = allowedSources();
    var bisOn = !!bisBox && bisBox.checked;
    document.body.classList.toggle("weighted", m === "weighted");
    document.body.classList.toggle("full", m === "full");
    document.body.classList.toggle("package", m === "package");
    document.body.classList.toggle("bis-only", bisOn);
    originals.forEach(function (entry) {
      var kids = entry.order.slice();
      if (m !== "off") {
        kids.sort(function (a, b) {
          return (
            parseFloat(b.getAttribute(attr)) - parseFloat(a.getAttribute(attr))
          );
        });
      }
      kids.forEach(function (k) {
        k.classList.toggle("source-hidden", !sourceOk(k, allowed));
        entry.container.appendChild(k);
      });
    });
    // No package arm: under package mode .d keeps the piece's own delta and
    // the .pkg span carries the package figure (ticket 112) -- the group's
    // number must never display as the piece's.
    [].slice.call(document.querySelectorAll(".chip .d")).forEach(function (d) {
      d.textContent = d.getAttribute(
        m === "full"
          ? "data-full-label"
          : m === "weighted"
            ? "data-weighted-label"
            : "data-plain"
      );
    });
    // Visibility is computed from the row's own classes, never from layout:
    // reading offsetParent here is circular, because hiding a section makes
    // its rows report hidden, so the next apply() sees an empty section and
    // the page can never come back. (It did exactly that.)
    function rowShown(r) {
      return (
        r.className.indexOf("source-hidden") < 0 &&
        (!bisOn || r.className.indexOf("is-bis") >= 0)
      );
    }
    // A slot section hides when the filters leave it with nothing, so the page
    // never shows a heading over an empty list.
    [].slice.call(document.querySelectorAll("section.slot")).forEach(function (s) {
      var shown = [].slice.call(s.querySelectorAll("article.row")).filter(rowShown);
      s.classList.toggle("empty-under-filter", shown.length === 0);
      var link = document.querySelector('.nav-slot[href="#' + s.id + '"]');
      if (link) {
        link.classList.toggle("empty-under-filter", shown.length === 0);
        var badge = link.querySelector(".nav-hit");
        if (badge) {
          badge.textContent = String(
            shown.filter(function (r) {
              return r.className.indexOf("hit") >= 0;
            }).length
          );
        }
      }
    });
    // Each chip strip renumbers 1..N over what is visible *in that strip*, so
    // the raid list and the PvP list each read from 1 rather than the PvP one
    // continuing the raid one's count.
    //
    // The same pass collects the export's payload. Chips are already sorted
    // into the displayed order by the block above and already carry the
    // visibility rules, so reading them here is what makes the export and the
    // list impossible to disagree -- and the strips are walked in document
    // order, which is the concatenation the caption promises.
    var exportChips = [];
    [].slice.call(document.querySelectorAll(".shortlist")).forEach(function (strip) {
      var chips = [].slice.call(strip.querySelectorAll(".chip"));
      var n = 0;
      chips.forEach(function (c) {
        var visible = c.className.indexOf("source-hidden") < 0 &&
          (!bisOn || c.className.indexOf("is-bis") >= 0) &&
          // A package-only chip is in the document in every mode but displayed
          // only under package mode, so the export has to test the mode rather
          // than the class -- reading layout here would be the circular bug the
          // row-visibility comment above warns about.
          (m === "package" || c.className.indexOf("package-only") < 0);
        var pos = c.querySelector(".pos");
        if (!visible) {
          if (pos) pos.textContent = "";
          return;
        }
        n += 1;
        if (pos) pos.textContent = String(n);
        exportChips.push(c);
      });
      var counter = strip.querySelector(".list-count");
      if (counter) counter.textContent = n === 0 ? "" : "(" + n + ")";
      strip.classList.toggle("empty-under-filter", n === 0);
    });
    updateExport(exportChips);
  }
  // The curated list, in the order it is displayed. Deliberately not the slot
  // rows: those are grouped slot by slot in document order, so exporting them
  // threw away the cross-slot ranked order that is the whole payload for a
  // thatsmybis priority list.
  function updateExport(chips) {
    if (!exportArea) return;
    var seen = {};
    var ids = [];
    chips.forEach(function (c) {
      var id = c.getAttribute("data-item-id");
      if (!id || seen[id]) return;
      seen[id] = true;
      ids.push({ id: parseInt(id, 10) });
    });
    exportArea.value = JSON.stringify({ items: ids }, null, 2);
    if (exportCount) exportCount.textContent = String(ids.length);
  }
  radios.forEach(function (r) {
    r.addEventListener("change", apply);
  });
  if (bisBox) bisBox.addEventListener("change", apply);
  sourceBoxes.forEach(function (b) {
    b.addEventListener("change", apply);
  });
  var allBtn = document.getElementById("source-all");
  var noneBtn = document.getElementById("source-none");
  if (allBtn)
    allBtn.addEventListener("click", function () {
      sourceBoxes.forEach(function (b) {
        b.checked = true;
      });
      apply();
    });
  if (noneBtn)
    noneBtn.addEventListener("click", function () {
      sourceBoxes.forEach(function (b) {
        b.checked = false;
      });
      apply();
    });
  if (exportCopy)
    exportCopy.addEventListener("click", function () {
      exportArea.select();
      var ok = false;
      // execCommand is deprecated but works from a file:// page, where the
      // async clipboard API is blocked in some browsers. Try the modern one
      // first and fall back rather than leaving the button dead.
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(exportArea.value).then(
          function () {
            if (exportStatus) exportStatus.textContent = "copied";
          },
          function () {
            try {
              ok = document.execCommand("copy");
            } catch (e) {
              ok = false;
            }
            if (exportStatus)
              exportStatus.textContent = ok ? "copied" : "press Ctrl+C";
          }
        );
        return;
      }
      try {
        ok = document.execCommand("copy");
      } catch (e) {
        ok = false;
      }
      if (exportStatus)
        exportStatus.textContent = ok ? "copied" : "press Ctrl+C";
    });
  apply();
})();
</script>`;

  const title = `${meta.character} · ${meta.spec} P${meta.maxPhase}`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(title)} — gear rank</title>
<style>${REPORT_CSS}</style>
</head>
<body>
  <div class="wrap">
    <p class="brand">tbc gear prio</p>
    <p class="lede">
      Offline rank for <strong>${esc(meta.character)}</strong> on
      ${esc(meta.realm)}-${esc(meta.region)} · ${esc(meta.spec)} · max phase ${meta.maxPhase}.
      Cutoff ${ranking.cutoff.absDps} DPS / ${ranking.cutoff.pct}%.
      ${poolScopeNote(meta)}
    </p>

    <div class="stats">
      <div class="stat"><div class="label">Baseline</div><div class="value"><em>${ranking.baseline.dps.toFixed(1)}</em> DPS</div></div>
      <div class="stat"><div class="label">Stdev</div><div class="value">± ${ranking.baseline.stdev.toFixed(1)}</div></div>
      <div class="stat"><div class="label">Above cutoff</div><div class="value">${above.length}</div></div>
      <div class="stat"><div class="label">Simmed</div><div class="value">${reportItems.length} / ${meta.poolSize}</div></div>
    </div>

    ${
      aboveRaid.length || packageOnlyChips.length
        ? `<div class="shortlist">
      <h2>Curated ranked list <span class="list-count"></span></h2>
      <div class="chips">
        ${renderShortlistChips(aboveRaid, packageOnlyChips)}
      </div>
    </div>`
        : ""
    }
    ${
      abovePvp.length
        ? `<div class="shortlist pvp-shortlist">
      <h2>PvP upgrades (optional) <span class="list-count"></span></h2>
      <div class="chips">
        ${renderShortlistChips(abovePvp)}
      </div>
    </div>`
        : ""
    }
    ${bisFilter}
    ${sourceFilter}
    ${setWeightToggle}
    ${exportPanel}
    ${noiseNote}
    ${capBanner}
    ${provenance}${plausibilityPanel ? `\n    ${plausibilityPanel}` : ""}

    <nav class="nav" aria-label="Slots">${nav}</nav>

    <details class="panel">
      <summary>Standing assumptions</summary>
      <ul>${assumptions}</ul>
    </details>
    ${subs}
    ${setPotentialPanel}

    ${sections}

    <footer>
      Generated ${esc(meta.generatedAt)} · contentHash ${esc(ranking.contentHash)} ·
      metaAdjusted=${ranking.baseline.metaAdjusted}
    </footer>
  </div>
  ${setWeightScript}
</body>
</html>
`;
}
