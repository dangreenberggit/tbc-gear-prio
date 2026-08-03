/**
 * The rank report's HTML template: escaping, number/label formatting, and
 * document structure. What to show and in what order lives in
 * `rank-report-rules.ts`; the stylesheet lives in `rank-report-css.ts`.
 *
 * Self-contained output by design: one file, no build step, no sibling
 * assets, open in any browser.
 */

import type { ItemSource } from "./pool.js";
import type { RankedItem, Ranking } from "./rank.js";
import { REPORT_CSS } from "./rank-report-css.js";
import {
  groupBySlot,
  partitionShortlist,
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
      return `Crafted · ${source.profession}`;
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
  }
}

function renderShortlistChips(items: RankedItem[]): string {
  return items
    .slice()
    .sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99))
    .map(
      (i) =>
        `<a class="chip" href="#slot-${i.slot}"><span class="n">#${i.rank} ${esc(i.name)}</span><span class="d">${fmtDelta(i.deltaDps)}</span></a>`
    )
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

export function renderRankHtml(ranking: Ranking, meta: RankReportMeta): string {
  const reportItems = ranking.items as ReportItem[];
  const bySlot = groupBySlot(ranking.items);
  const { raid: aboveRaid, pvp: abovePvp } = partitionShortlist(ranking.items);
  const above = ranking.items.filter((i) => !i.belowCutoff);
  const noiseNote =
    ranking.baseline.stdev > 0
      ? `<p class="noise-note">Order within ~±${ranking.baseline.stdev.toFixed(1)} DPS is run noise, not a ranked wishlist.</p>`
      : "";
  const slotsWithItems = SLOT_ORDER.filter(
    (s) => (bySlot.get(s) ?? []).length > 0
  );

  const nav = slotsWithItems
    .map((slot) => {
      const n = (bySlot.get(slot) ?? []).filter((i) => !i.belowCutoff).length;
      const badge = n > 0 ? `<span class="nav-hit">${n}</span>` : "";
      return `<a href="#slot-${slot}">${esc(slot)}${badge}</a>`;
    })
    .join("\n");

  const sections = slotsWithItems
    .map((slot) => {
      const list = bySlot.get(slot) ?? [];
      const hits = list.filter((i) => !i.belowCutoff).length;
      const rows = list
        .map((item) => {
          const reportItem = item as ReportItem;
          const cls = item.belowCutoff ? "row muted" : "row hit";
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
          const tags = (item.bisTags ?? [])
            .map((t) => `<span class="pill tag">${esc(t)}</span>`)
            .join("");
          const deltaCls =
            item.deltaDps > 0
              ? "delta up"
              : item.deltaDps < 0
                ? "delta down"
                : "delta flat";
          return `<article class="${cls}">
  <div class="lead">${rank}${choice}</div>
  <div class="body">
    <a class="name" href="${wowheadUrl(item.itemId)}" target="_blank" rel="noreferrer">${esc(item.name)}</a>
    <div class="meta">${esc(formatItemSource(item.source))} ${owned}${pvp}${magnitude}${tags}</div>
    ${alternate}
    ${set}
  </div>
  <div class="nums">
    <div class="${deltaCls}">${fmtDelta(item.deltaDps)} <span class="unit">DPS</span></div>
    <div class="pct">${fmtDelta(item.deltaPct)}%</div>
  </div>
</article>`;
        })
        .join("\n");

      return `<section class="slot" id="slot-${slot}">
  <header class="slot-head">
    <h2>${esc(slot)}</h2>
    <p>${list.length} candidates${hits ? ` · <strong>${hits} above cutoff</strong>` : ""}</p>
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
    ${noiseNote}

    <nav class="nav" aria-label="Slots">${nav}</nav>

    <details class="panel">
      <summary>Standing assumptions</summary>
      <ul>${assumptions}</ul>
    </details>
    ${subs}

    ${sections}

    <footer>
      Generated ${esc(meta.generatedAt)} · contentHash ${esc(ranking.contentHash)} ·
      metaAdjusted=${ranking.baseline.metaAdjusted}
    </footer>
  </div>
</body>
</html>
`;
}
