/**
 * Presentation for the rank report (ticket 24: rank-report.ts held slot
 * ordering, source formatting, shortlist rules, HTML structure and ~260 lines
 * of CSS, so restyling and changing shortlist rules edited one file for
 * unrelated reasons).
 *
 * The CSS stays **inline in the emitted document** rather than becoming a
 * .css file: the report is written to disk and opened straight from there, so
 * it has to be a single self-contained artifact with no sibling assets. This
 * module only moves it out of the template's way -- `renderRankHtml`
 * interpolates REPORT_CSS back into the same `<style>` element.
 */

export const REPORT_CSS = `
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
    /* No webfont link: the report must render offline, so the named faces are
       used only if already installed and every stack falls back to a system
       one. */
    --font-display: "Syne", "Segoe UI", system-ui, sans-serif;
    --font-body: "Manrope", "Segoe UI", system-ui, sans-serif;
    --font-mono: "IBM Plex Mono", ui-monospace, Consolas, monospace;
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
  /* The cap banner qualifies every "widens your gap" row below it, so it
     reads at body weight rather than as fine print. */
  .cap-banner {
    margin: 0 0 0.75rem;
    padding: 0.7rem 0.9rem;
    border-left: 3px solid var(--accent);
    background: var(--accent-soft);
    font-size: 0.92rem;
  }
  .provenance {
    margin: 0 0 1.5rem;
    font-size: 0.85rem;
    color: var(--muted);
    line-height: 1.6;
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
  .hit-note {
    margin-top: 0.25rem;
    font-size: 0.78rem;
    color: var(--ink-soft);
  }
  .hit-note.down { color: var(--down); }
  .set-potential {
    margin-top: 0.25rem;
    font-size: 0.78rem;
    color: var(--accent);
  }
  .set-potential-assumption {
    font-size: 0.8rem;
    color: var(--ink-soft);
  }
  .set-weight-toggle {
    margin: 1rem 0;
    padding: 0.75rem 1rem;
    background: var(--panel);
    border: 1px solid var(--line);
    border-radius: var(--radius);
  }
  .set-weight-title {
    margin: 0 0 0.4rem;
    font-family: var(--font-display);
    font-weight: 700;
  }
  .set-weight-toggle label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
    padding: 0.1rem 0;
  }
  .set-weight-note {
    margin: 0.5rem 0 0;
    font-size: 0.78rem;
    color: var(--ink-soft);
  }
  /* Exactly one of the three figures is live at a time, so the row never shows
     a number whose meaning depends on remembering the control's state. */
  .delta-weighted, .delta-full { display: none; }
  body.weighted .delta-plain, body.full .delta-plain { display: none; }
  body.weighted .delta-weighted { display: block; }
  body.full .delta-full { display: block; }
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
`;
