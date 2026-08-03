/**
 * Slot-grouped HTML report for human review of a Ranking.
 * Self-contained: one file, no build step, open in any browser.
 */

import type { ItemSlot } from "./items.js";
import type { ItemSource } from "./pool.js";
import type { RankedItem, Ranking } from "./rank.js";

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

export type RankReportMeta = {
  character: string;
  realm: string;
  region: string;
  spec: string;
  maxPhase: number;
  fullPool: boolean;
  poolSize: number;
  generatedAt: string;
};

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

export function partitionShortlist(items: RankedItem[]): {
  raid: RankedItem[];
  pvp: RankedItem[];
} {
  const above = items.filter((i) => !i.belowCutoff && !i.magnitudeWarning);
  return {
    raid: above.filter((i) => i.source.kind !== "pvp"),
    pvp: above.filter((i) => i.source.kind === "pvp"),
  };
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

function fmtSlotChoice(item: RankedItem): string {
  if (item.replacesEquipped) {
    return `Replaces ${item.replacesEquipped.name}`;
  }
  return item.slotChoice ?? "";
}

function fmtAlternateSlot(item: RankedItem): string {
  if (!item.alternateSlot) return "";
  return `Also ${fmtDelta(item.alternateSlot.deltaDps)} if replacing ${item.alternateSlot.replacesName}`;
}

function wowheadUrl(itemId: number): string {
  return `https://www.wowhead.com/tbc/item=${itemId}`;
}

export function renderRankHtml(ranking: Ranking, meta: RankReportMeta): string {
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
          const cls = item.belowCutoff ? "row muted" : "row hit";
          const softRank =
            !item.belowCutoff &&
            Math.abs(item.deltaDps) < ranking.baseline.stdev;
          const rank =
            item.rank == null
              ? `<span class="rank dash">—</span>`
              : `<span class="rank${softRank ? " soft-rank" : ""}">#${item.rank}</span>`;
          const choiceText = fmtSlotChoice(item);
          const choice = choiceText
            ? `<span class="choice">${esc(choiceText)}</span>`
            : "";
          const alternate = item.alternateSlot
            ? `<div class="alt-slot">${esc(fmtAlternateSlot(item))}</div>`
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
          const magnitude = item.magnitudeWarning
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
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=Manrope:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet" />
<style>
  :root {
    --ink: #1a2430;
    --ink-soft: #4a5a6a;
    --muted: #7a8a9a;
    --paper: #eef3f6;
    --paper-2: #e2ebf1;
    --panel: #f7fafc;
    --line: #c8d4de;
    --accent: #c45c26;
    --accent-soft: #f3e0d4;
    --up: #1f6b4a;
    --up-bg: #d8f0e4;
    --down: #8a3a3a;
    --down-bg: #f3e0e0;
    --hit-glow: #fff6ef;
    --radius: 14px;
    --font-display: "Syne", sans-serif;
    --font-body: "Manrope", sans-serif;
    --font-mono: "IBM Plex Mono", monospace;
  }
  * { box-sizing: border-box; }
  html { scroll-behavior: smooth; }
  body {
    margin: 0;
    color: var(--ink);
    font-family: var(--font-body);
    background:
      radial-gradient(1200px 600px at 10% -10%, #d9e8f2 0%, transparent 55%),
      radial-gradient(900px 500px at 100% 0%, #f0ddd0 0%, transparent 50%),
      linear-gradient(180deg, var(--paper) 0%, var(--paper-2) 100%);
    min-height: 100vh;
  }
  .wrap { max-width: 920px; margin: 0 auto; padding: 2.5rem 1.25rem 4rem; }
  .brand {
    font-family: var(--font-display);
    font-weight: 800;
    font-size: clamp(2rem, 5vw, 2.75rem);
    letter-spacing: -0.03em;
    line-height: 1.05;
    margin: 0 0 0.35rem;
  }
  .lede {
    color: var(--ink-soft);
    font-size: 1.05rem;
    max-width: 36rem;
    margin: 0 0 1.75rem;
  }
  .stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: 0.75rem;
    margin-bottom: 1.5rem;
  }
  .stat {
    background: var(--panel);
    border: 1px solid var(--line);
    border-radius: var(--radius);
    padding: 0.9rem 1rem;
  }
  .stat .label {
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--muted);
    margin-bottom: 0.25rem;
  }
  .stat .value {
    font-family: var(--font-mono);
    font-size: 1.15rem;
    font-weight: 500;
  }
  .stat .value em { font-style: normal; color: var(--accent); }
  .nav {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    margin: 0 0 2rem;
    position: sticky;
    top: 0;
    z-index: 5;
    padding: 0.65rem 0;
    background: color-mix(in srgb, var(--paper) 88%, transparent);
    backdrop-filter: blur(8px);
  }
  .nav a {
    text-decoration: none;
    color: var(--ink-soft);
    font-size: 0.82rem;
    font-weight: 600;
    padding: 0.35rem 0.65rem;
    border-radius: 999px;
    border: 1px solid var(--line);
    background: var(--panel);
    transition: background 160ms ease, color 160ms ease, border-color 160ms ease;
  }
  .nav a:hover { color: var(--ink); border-color: var(--accent); }
  .nav-hit {
    margin-left: 0.35rem;
    background: var(--accent);
    color: #fff;
    border-radius: 999px;
    padding: 0.05rem 0.4rem;
    font-size: 0.7rem;
  }
  .panel {
    background: var(--panel);
    border: 1px solid var(--line);
    border-radius: var(--radius);
    padding: 0.85rem 1rem;
    margin-bottom: 1rem;
  }
  .panel summary {
    cursor: pointer;
    font-weight: 600;
    color: var(--ink-soft);
  }
  .panel ul { margin: 0.75rem 0 0; padding-left: 1.1rem; color: var(--ink-soft); }
  .panel li { margin: 0.35rem 0; }
  .panel code {
    font-family: var(--font-mono);
    font-size: 0.8rem;
    color: var(--accent);
  }
  .shortlist {
    margin-bottom: 2rem;
  }
  .shortlist h2 {
    font-family: var(--font-display);
    font-size: 1.35rem;
    margin: 0 0 0.75rem;
  }
  .shortlist.pvp-shortlist h2 {
    font-size: 1.1rem;
    color: var(--ink-soft);
  }
  .noise-note {
    margin: 0 0 1.5rem;
    font-size: 0.88rem;
    color: var(--muted);
  }
  .chips { display: flex; flex-wrap: wrap; gap: 0.5rem; }
  .chip {
    display: inline-flex;
    align-items: baseline;
    gap: 0.5rem;
    padding: 0.55rem 0.85rem;
    border-radius: 999px;
    background: var(--accent-soft);
    border: 1px solid color-mix(in srgb, var(--accent) 35%, var(--line));
    text-decoration: none;
    color: var(--ink);
    transition: transform 160ms ease;
  }
  .chip:hover { transform: translateY(-1px); }
  .chip .n { font-family: var(--font-display); font-weight: 700; }
  .chip .d { font-family: var(--font-mono); font-size: 0.85rem; color: var(--up); }
  .slot { margin-bottom: 2.25rem; scroll-margin-top: 3.5rem; }
  .slot-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 0.65rem;
    border-bottom: 1px solid var(--line);
    padding-bottom: 0.4rem;
  }
  .slot-head h2 {
    font-family: var(--font-display);
    font-size: 1.45rem;
    margin: 0;
    text-transform: capitalize;
  }
  .slot-head p { margin: 0; color: var(--muted); font-size: 0.9rem; }
  .rows { display: flex; flex-direction: column; gap: 0.45rem; }
  .row {
    display: grid;
    grid-template-columns: 3.2rem 1fr auto;
    gap: 0.75rem;
    align-items: start;
    padding: 0.75rem 0.9rem;
    border-radius: 12px;
    border: 1px solid var(--line);
    background: var(--panel);
    transition: border-color 160ms ease, background 160ms ease;
  }
  .row.hit {
    background: var(--hit-glow);
    border-color: color-mix(in srgb, var(--accent) 40%, var(--line));
  }
  .row.muted { opacity: 0.72; }
  .row:hover { border-color: var(--accent); opacity: 1; }
  .rank {
    font-family: var(--font-display);
    font-weight: 700;
    font-size: 1.05rem;
  }
  .rank.dash { color: var(--muted); font-weight: 600; }
  .rank.soft-rank { color: var(--muted); font-weight: 600; }
  .choice {
    display: block;
    margin-top: 0.15rem;
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--muted);
  }
  .name {
    font-weight: 700;
    color: var(--ink);
    text-decoration: none;
  }
  .name:hover { color: var(--accent); text-decoration: underline; }
  .meta {
    margin-top: 0.2rem;
    font-size: 0.82rem;
    color: var(--ink-soft);
  }
  .set {
    margin-top: 0.35rem;
    font-size: 0.8rem;
    color: var(--down);
  }
  .pill {
    display: inline-block;
    margin-left: 0.35rem;
    padding: 0.05rem 0.4rem;
    border-radius: 999px;
    font-size: 0.68rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  .pill.owned { background: var(--up-bg); color: var(--up); }
  .pill.pvp { background: var(--accent-soft); color: var(--accent); }
  .pill.warn { background: var(--down-bg); color: var(--down); }
  .pill.tag { background: var(--paper-2); color: var(--ink-soft); }
  .alt-slot {
    margin-top: 0.25rem;
    font-size: 0.78rem;
    color: var(--ink-soft);
  }
  .nums { text-align: right; white-space: nowrap; }
  .delta { font-family: var(--font-mono); font-weight: 500; font-size: 1rem; }
  .delta .unit { font-size: 0.7rem; color: var(--muted); }
  .delta.up { color: var(--up); }
  .delta.down { color: var(--down); }
  .delta.flat { color: var(--muted); }
  .pct { font-family: var(--font-mono); font-size: 0.78rem; color: var(--muted); margin-top: 0.15rem; }
  footer {
    margin-top: 2.5rem;
    padding-top: 1rem;
    border-top: 1px solid var(--line);
    color: var(--muted);
    font-size: 0.8rem;
  }
  @media (max-width: 560px) {
    .row { grid-template-columns: 2.4rem 1fr; }
    .nums { grid-column: 2; text-align: left; }
  }
</style>
</head>
<body>
  <div class="wrap">
    <p class="brand">tbc gear prio</p>
    <p class="lede">
      Offline rank for <strong>${esc(meta.character)}</strong> on
      ${esc(meta.realm)}-${esc(meta.region)} · ${esc(meta.spec)} · max phase ${meta.maxPhase}.
      Cutoff ${ranking.cutoff.absDps} DPS / ${ranking.cutoff.pct}%.
      ${meta.fullPool ? "Full pool (no EP prefilter)." : "EP prefilter on."}
    </p>

    <div class="stats">
      <div class="stat"><div class="label">Baseline</div><div class="value"><em>${ranking.baseline.dps.toFixed(1)}</em> DPS</div></div>
      <div class="stat"><div class="label">Stdev</div><div class="value">± ${ranking.baseline.stdev.toFixed(1)}</div></div>
      <div class="stat"><div class="label">Above cutoff</div><div class="value">${above.length}</div></div>
      <div class="stat"><div class="label">Simmed</div><div class="value">${ranking.items.length} / ${meta.poolSize}</div></div>
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
