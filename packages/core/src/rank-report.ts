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
  formatSetBonusLine,
  formatSetPotentialLine,
  groupBySlot,
  isCuratedBis,
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

function renderShortlistChips(items: RankedItem[]): string {
  return items
    .slice()
    .sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99))
    .map((i) => {
      const weighted = weightedSetPotentialDps(i);
      const full = weightedSetPotentialDps(i, "full");
      return `<a class="chip${isCuratedBis(i) ? " is-bis" : ""}" href="#slot-${i.slot}" data-delta="${i.deltaDps}" data-weighted="${weighted}" data-full="${full}"><span class="n">#${i.rank} ${esc(i.name)}</span><span class="d" data-plain="${esc(fmtDelta(i.deltaDps))}" data-weighted-label="${esc(fmtDelta(weighted))}" data-full-label="${esc(fmtDelta(full))}">${fmtDelta(i.deltaDps)}</span></a>`;
    })
    .join("\n");
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

function poolScopeNote(meta: RankReportMeta): string {
  const base = `Universe pool (ret-p${meta.maxPhase}).`;
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
          // The "with set" column (§4): under the toggle, every row with a
          // setContext shows its prospective value or, when unmeasured, the
          // reason — never a blank and never a silent 0 (§8.5).
          const setPotential =
            withSetPotential && item.setContext
              ? `<div class="set-potential">${esc(formatSetPotentialLine(item) ?? setPotentialUnmeasuredText(item))}</div>`
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
          const deltaClsFor = (n: number) =>
            n > 0 ? "delta up" : n < 0 ? "delta down" : "delta flat";
          const weightedCls = deltaClsFor(weighted);
          const fullCls = deltaClsFor(full);
          return `<article class="${cls}" data-delta="${item.deltaDps}" data-weighted="${weighted}" data-full="${full}">
  <div class="lead">${rank}${choice}</div>
  <div class="body">
    <a class="name" href="${wowheadUrl(item.itemId)}" target="_blank" rel="noreferrer">${esc(item.name)}</a>
    <div class="meta">${esc(formatItemSource(item.source))} ${owned}${pvp}${magnitude}${tags}</div>
    ${alternate}
    ${set}
    ${setPotential}
    ${hitNote}
    ${hitLoss}
  </div>
  <div class="nums">
    <div class="${deltaCls} delta-plain">${fmtDelta(item.deltaDps)} <span class="unit">DPS</span></div>
    <div class="${weightedCls} delta-weighted">${fmtDelta(weighted)} <span class="unit">DPS</span></div>
    <div class="${fullCls} delta-full">${fmtDelta(full)} <span class="unit">DPS</span></div>
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
    .map((s) => `<li><code>${esc(s.field)}</code> ${esc(s.detail)}</li>`)
    .join("\n")}</ul>
</details>`;

  // The "with set" block (§4), the report's counterpart to the CLI's set
  // block: one row per SetBonusValue, unmeasured reasons rendered as text
  // rather than a blank or a 0 (§8.5), plus the standing-assumption line
  // naming the measurement method (PLAN.md §9 R7).
  const setPotentialPanel =
    withSetPotential && ranking.setBonuses && ranking.setBonuses.length > 0
      ? `<details class="panel" open>
  <summary>Set potential (${ranking.setBonuses.length})</summary>
  <p class="set-potential-assumption">${esc(setPotentialDisclosureLine())}</p>
  <ul>${ranking.setBonuses
    .map((b) => `<li>${esc(formatSetBonusLine(b))}</li>`)
    .join("\n")}</ul>
</details>`
      : "";

  // Offered only where some row would actually move: a page with no
  // unrealised prospective bonus gets an inert control otherwise. Measured on
  // `full`, the wider of the two credits — a row `weighted` leaves still can
  // move under `full`, so testing `weighted` alone could hide a live control.
  const anyWeighted = ranking.items.some(
    (i) => weightedSetPotentialDps(i, "full") !== i.deltaDps
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
      <p class="set-weight-note">Re-sorts and re-labels rows and chips. Display only — which items count as above cutoff is unchanged. <strong>Full</strong> credits every piece of a set with the entire bonus, so it is an upper bound, not an estimate: it is the right lens when the set's other pieces are upgrades you would take regardless, and too generous when they are not.</p>
    </div>`
    : "";

  // Same availability rule as the set control: no curated rows, no filter.
  const bisCount = ranking.items.filter(isCuratedBis).length;
  // Deliberately not scoped to above-cutoff rows. A curated pick is BiS as a
  // member of a whole optimized set, so several are below cutoff as single
  // swaps (Wolfshead Helm, Bloodlust Brooch) — showing 10 of 17 under a
  // control labelled "BiS only" would misdescribe the list it names.
  const bisFilter =
    bisCount > 0
      ? `<div class="set-weight-toggle bis-filter">
      <p class="set-weight-title">Curated list</p>
      <label><input type="checkbox" id="bis-only" /> <span>BiS only — the ${bisCount} items on this phase's curated set${meta.spec ? ` (${esc(meta.spec)} P${meta.maxPhase})` : ""}</span></label>
      <p class="set-weight-note">Upstream's pinned gear sets for this phase, not an absolute verdict. Below-cutoff picks stay visible and stay muted: an item is BiS as part of a whole optimized set, which is why some are downgrades as a single swap.</p>
    </div>`
      : "";

  // Re-sorts in place, swaps the visible number, and toggles the BiS filter.
  // Deliberately the whole of the client-side behaviour: every value was
  // computed at generation time, so nothing here recomputes DPS, re-derives
  // the cutoff, or decides what counts as BiS. The two controls are
  // independent — either may be absent, and neither gates the other.
  const setWeightScript =
    anyWeighted || bisCount > 0
      ? `<script>
(function () {
  var radios = [].slice.call(
    document.querySelectorAll('input[name="set-weight"]')
  );
  var bisBox = document.getElementById("bis-only");
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
  function apply() {
    var m = mode();
    var attr = m === "full" ? "data-full" : "data-weighted";
    document.body.classList.toggle("weighted", m === "weighted");
    document.body.classList.toggle("full", m === "full");
    document.body.classList.toggle("bis-only", !!bisBox && bisBox.checked);
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
        entry.container.appendChild(k);
      });
    });
    [].slice.call(document.querySelectorAll(".chip .d")).forEach(function (d) {
      d.textContent = d.getAttribute(
        m === "full"
          ? "data-full-label"
          : m === "weighted"
            ? "data-weighted-label"
            : "data-plain"
      );
    });
    // The nav badge counts what is actually on screen.
    [].slice.call(document.querySelectorAll(".nav-slot")).forEach(function (a) {
      var badge = a.querySelector(".nav-hit");
      if (!badge) return;
      badge.textContent =
        bisBox && bisBox.checked
          ? a.getAttribute("data-bis-hits")
          : a.getAttribute("data-hits");
    });
  }
  radios.forEach(function (r) {
    r.addEventListener("change", apply);
  });
  if (bisBox) bisBox.addEventListener("change", apply);
  apply();
})();
</script>`
      : "";

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
      aboveRaid.length
        ? `<div class="shortlist">
      <h2>Act on tonight</h2>
      <div class="chips">
        ${renderShortlistChips(aboveRaid)}
      </div>
    </div>`
        : ""
    }
    ${
      abovePvp.length
        ? `<div class="shortlist pvp-shortlist">
      <h2>PvP upgrades (optional)</h2>
      <div class="chips">
        ${renderShortlistChips(abovePvp)}
      </div>
    </div>`
        : ""
    }
    ${bisFilter}
    ${setWeightToggle}
    ${noiseNote}
    ${capBanner}
    ${provenance}

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
