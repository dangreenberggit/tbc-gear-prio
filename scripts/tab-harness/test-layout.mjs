// The Upgrades tab's layout gate on the React tab (ticket 560; the old tab's
// gate was ticket 322). No static check renders the page, so an element past
// the viewport or a control below the results it governs passes all of them.
// This gate renders the tab at four widths and measures the live DOM:
//
//   pre-run, at each width:
//     (1) nothing inside the tab extends past the viewport (a table's own
//         scroll box may scroll);
//     (2) below `xl` the settings are behind the summary button, which opens
//         them; at 1280 they show and the button is hidden;
//     (3) below `xl` the run card sits above the results;
//     axe on the tab.
//   then for each fixture -- every data/tab-fixtures/*.json (the made-up
//   results from `pnpm tab-fixtures:mock`, one per UI difference between
//   specs), or only the one `--fixture <name-or-path>` or TBC_TAB_FIXTURE
//   names -- on that fixture's own spec page, at each width, in the open
//   pane with its below-cutoff group open:
//     (15) the open pane has result rows, so the checks below measured some
//         (the fixture loader settles on a row anywhere on the page);
//         only the rows in view are rendered (ticket 565), so the per-row
//         checks read each table by scrolling through it (rows.mjs);
//     (6) slot and ΔDPS figures on one line;
//     (1) the page does not scroll sideways (a table scrolls inside its own
//         box, and nothing positioned inside it escapes that box);
//     (7) no clipped text, and nothing in a table cell past the cell;
//     (12) the ΔDPS figure inside its cell;
//     (14) no item name breaks inside a word (a break sits at a space or
//         after a hyphen; A-K5-name-wrap);
//     (13) at 1280, at least 8 px between the two columns;
//     (18) at 375, the first row's ΔDPS cell lies inside the table's
//         scroll box while that box is not scrolled sideways, so a phone
//         shows the figure without scrolling sideways (ticket 606);
//     (17) hovering the first set-bonus figure opens its popover to the
//         right of the figure when the room right of it fits the widest
//         popup (the component's own rule), and above it otherwise, never
//         left or below, inside the viewport either way (ticket 605; the
//         ticket 495 ruling, kept by Q-606-popover-side);
//     the A1 fact: how far each below-cutoff column sits from its head;
//     axe once, at 653, on one fixture only (mock-set-bonus when it is
//     rendered, else the first), as before the pass had more than one.
//
// An unbaselined critical or serious WCAG violation fails the gate
// (TBC_A11Y_BASELINE holds the accepted debt). The verdict is one
// LAYOUT_GATE_VERDICT line (test-tab-harness.mjs `verdict`) that
// scripts/check_layout_gate.py parses: "measured" when every width ran, or
// when any check failed; "unmeasured" with a reason when a prerequisite
// stopped it before any check failed. A fixture that cannot be loaded or
// measured is skipped and named, and the other fixtures still run, so a
// failure measured on one fixture is never lost to a later one's load error.
//
// Server: test-tab-harness.mjs `serveTab` (TBC_FORK_PORT reuses a running
// server; otherwise the fixture-enabled bundle is built into dist/ and served).
//
// The run prints its own wall time (and the verdict holds wallMs) because the
// gate's time budget is checked from that line. An agent may be able to run
// the harness only as a bare command, with no `time` around it (the agent
// sandbox's permission rule; hypothesis, untested).

import fs from "node:fs";
import path from "node:path";

import { RESULT_ROW, ROW_HELPERS } from "./rows.mjs";
import * as H from "./test-tab-harness.mjs";

const WIDTHS = [375, 653, 768, 1280];
const HEIGHT = 900;
const XL = 1200; // ui/styles/theme/breakpoints.css --breakpoint-xl
const POST_RUN_AXE_WIDTH = 653;
const PHONE_WIDTH = 375;
const TOL = 2; // px of sub-pixel slack
const MIN_COLUMN_GAP = 8;
// Check 17 expects the side by the fork's SetBonusPopover.tsx `sideFor` rule:
// right when the room right of the figure holds the widest popup (30rem), its
// 10 px gap and the 6 px Base UI's flip keeps from the window's edge; above
// otherwise. Copied, because this script cannot import that module.
const POPOVER_WIDEST_REM = 30;
const POPOVER_GAP_PX = 10;
const POPOVER_FLIP_MARGIN_PX = 6;
const ROOT = '[data-testid="upgrades-tab-root"]';
const FIXTURE_DIR = path.resolve(
  import.meta.dirname,
  "..",
  "..",
  "data",
  "tab-fixtures"
);
const AXE_FIXTURE = "mock-set-bonus.json";

class Unmeasured extends Error {}

const results = [];
// The fixture the post-run checks are measuring; null during the pre-run pass.
let currentFixture = null;
const check = (id, width, ok, detail) => {
  results.push({
    check: id,
    width,
    ok,
    ...(currentFixture === null ? {} : { fixture: currentFixture }),
    ...(detail === undefined ? {} : { detail }),
  });
  const where = currentFixture === null ? "" : ` [${currentFixture}]`;
  console.log(
    `${ok ? "PASS" : "FAIL"} (${id}) @${width}${where}${detail === undefined ? "" : ` ${JSON.stringify(detail)}`}`
  );
};

// Page-side helpers, prepended to every measuring expression.
const PAGE_HELPERS = `
	const TOL = ${TOL};
	const sleep = ms => new Promise(r => setTimeout(r, ms));
	const waitFor = async (fn, ms) => { const end = Date.now() + ms; while (Date.now() < end) { const v = fn(); if (v) return v; await sleep(100); } return fn(); };
	const root = document.querySelector(${JSON.stringify(ROOT)});
	const byTestId = id => root.querySelector('[data-testid="' + id + '"]');
	const shown = el => !!el && el.getClientRects().length > 0 && el.getBoundingClientRect().width > 0;
	const name = el => el.tagName.toLowerCase() + (el.dataset.testid ? '[' + el.dataset.testid + ']' : '') + (el.textContent ? ' "' + el.textContent.trim().slice(0, 30) + '"' : '');
	const lineCount = node => { const range = document.createRange(); range.selectNodeContents(node); return new Set([...range.getClientRects()].filter(r => r.width > 0).map(r => Math.round(r.top))).size; };
	const openPane = () => [...root.querySelectorAll('[id^="upgrades-pane-"][data-testid="tab-pane"]:not([inert])')].find(p => !p.hidden);
	const rect = el => { if (!el) return null; const b = el.getBoundingClientRect(); return { left: Math.round(b.left), right: Math.round(b.right), top: Math.round(b.top), bottom: Math.round(b.bottom) }; };
`;

const preRunExpression = (width) => `(async () => {
	${PAGE_HELPERS}
	const vw = document.documentElement.clientWidth;
	const past = [];
	for (const el of root.querySelectorAll('*')) {
		if (!shown(el) || el.closest('[data-testid="upgrades-table-scroll"] *')) continue;
		const r = el.getBoundingClientRect();
		if (r.right > vw + TOL || r.left < -TOL) past.push({ el: name(el), left: Math.round(r.left), right: Math.round(r.right), vw });
	}
	const summary = byTestId('upgrades-run-settings-summary');
	const body = byTestId('upgrades-run-settings-body');
	const disclosure = { summaryShown: shown(summary), bodyShown: shown(body), expanded: summary?.getAttribute('aria-expanded') };
	if (${width < XL} && disclosure.summaryShown && !disclosure.bodyShown) {
		summary.click();
		await waitFor(() => shown(body), 2000);
		Object.assign(disclosure, { bodyShownAfterClick: shown(body), expandedAfterClick: summary.getAttribute('aria-expanded') });
	}
	const card = byTestId('upgrades-run-settings').getBoundingClientRect();
	const results = byTestId('upgrades-tab-left').getBoundingClientRect();
	return { past: past.slice(0, 10), pastCount: past.length, disclosure, cardBottom: Math.round(card.bottom), resultsTop: Math.round(results.top) };
})()`;

const postRunExpression = `(async () => {
	${PAGE_HELPERS}
	${ROW_HELPERS}
	const pane = openPane();
	if (!pane) return { error: 'no open results pane' };
	const group = pane.querySelector('[data-testid="upgrades-below-cutoff"]');
	if (group && !group.querySelector('[data-testid="upgrades-results-table"]')) {
		group.querySelector('[data-testid="upgrades-below-cutoff-trigger"]')?.click();
		await waitFor(() => group.querySelector(${JSON.stringify(`[data-testid="upgrades-results-table"] ${RESULT_ROW}`)}), 5000);
		await sleep(200);
	}
	const multiLine = [], clipped = [], pastCell = [], figureOutside = [], midWord = [];
	let firstDelta = null;
	const tables = [...pane.querySelectorAll('[data-testid="upgrades-results-table"]')];
	const rows = paneRowCount(pane);
	const charTop = (node, i) => { const r = document.createRange(); r.setStart(node, i); r.setEnd(node, i + 1); return Math.round(r.getBoundingClientRect().top); };
	const isClipped = el => {
		const style = getComputedStyle(el);
		if (!shown(el) || style.clip !== 'auto' || style.position === 'absolute') return false;
		return (style.overflowX === 'hidden' || style.overflowX === 'clip') && el.scrollWidth > el.clientWidth + TOL && !!el.textContent.trim();
	};
	const checkCell = cell => {
		const c = cell.getBoundingClientRect();
		for (const el of cell.querySelectorAll('*')) {
			const r = el.getBoundingClientRect();
			if (r.width > 1 && (r.right > c.right + TOL || r.left < c.left - TOL)) { pastCell.push(name(el)); break; }
		}
	};
	const head = tables[0]?.querySelectorAll('thead th') ?? [];
	const offsets = [...head].map(() => 0);
	const groupTable = group?.querySelector('[data-testid="upgrades-results-table"]');
	// Checks 6, 7, 12 and 14 and the A1 offsets measure each row while it is rendered.
	const readRow = (tr, below) => {
		const { dps: delta, slot } = dpsAndSlotCells(tr);
		if (!below && !firstDelta && tr.dataset.index === '0') {
			const scroller = tr.closest('[data-testid="upgrades-table-scroll"]');
			firstDelta = { deltaRect: rect(delta), scrollerRect: rect(scroller), scrollLeft: scroller.scrollLeft };
		}
		const figure = delta.querySelector(':scope > span')?.firstChild;
		if (lineCount(slot) > 1) multiLine.push('slot: ' + slot.textContent);
		if (figure && lineCount(figure) > 1) multiLine.push('dps: ' + delta.textContent);
		if (figure) {
			const range = document.createRange(); range.selectNodeContents(figure);
			const f = range.getBoundingClientRect(), c = delta.getBoundingClientRect();
			if (f.left < c.left - TOL || f.right > c.right + TOL) figureOutside.push(delta.textContent.trim());
		}
		for (const a of tr.querySelectorAll('[data-testid="upgrades-item-name"]')) {
			const text = a.textContent, node = a.firstChild;
			for (let i = 1; i < text.length; i++) {
				if (charTop(node, i) <= charTop(node, i - 1)) continue;
				if (text[i - 1] !== ' ' && text[i] !== ' ' && text[i - 1] !== '-') midWord.push(text.slice(0, i) + '|' + text.slice(i));
			}
		}
		for (const td of tr.children) checkCell(td);
		for (const el of tr.querySelectorAll('*')) if (isClipped(el)) clipped.push(name(el));
		if (below) {
			[...tr.children].forEach((td, i) => {
				if (!head[i]) return;
				const d = Math.round(td.getBoundingClientRect().left - head[i].getBoundingClientRect().left);
				if (Math.abs(d) > Math.abs(offsets[i])) offsets[i] = d;
			});
		}
		return true;
	};
	let groupRowsMeasured = 0;
	for (const table of tables) {
		const below = table === groupTable;
		const read = await collectRows(table, tr => readRow(tr, below));
		if (read.error) return { error: (below ? 'below-cutoff table: ' : 'main table: ') + read.error };
		if (below) groupRowsMeasured = read.rows.length;
	}
	for (const cell of tables.flatMap(t => [...t.querySelectorAll('thead th')])) checkCell(cell);
	for (const el of root.querySelectorAll('*')) {
		if (!el.closest(${JSON.stringify(RESULT_ROW)}) && isClipped(el)) clipped.push(name(el));
	}
	const left = byTestId('upgrades-tab-left').getBoundingClientRect();
	const card = byTestId('upgrades-run-settings').getBoundingClientRect();
	return {
		pane: pane.id, rows, multiLine: multiLine.slice(0, 10), clipped: clipped.slice(0, 10), pastCell: pastCell.slice(0, 10),
		figureOutside: figureOutside.slice(0, 10), midWord: midWord.slice(0, 10), firstDelta,
		counts: [multiLine.length, clipped.length, pastCell.length, figureOutside.length, midWord.length],
		a1: { measuredRows: groupRowsMeasured, offsets, maxAbs: Math.max(0, ...offsets.map(Math.abs)) },
		columnGap: Math.round(card.left - left.right), cardBesideResults: card.top < left.bottom && card.left > left.left,
		page: { scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth },
	};
})()`;

// Check 17's hover target and what it reads once the popover is open. The
// popover is portaled, so it is looked up in the document, not the tab root.
const SET_BONUS_FIGURE = `${RESULT_ROW}:has(small[data-testid="upgrades-set-bonus"]) [data-testid="upgrades-delta-cell"] button`;
const SET_BONUS_TIP = '[data-testid="upgrades-set-bonus-tip"]';
const figureCentreExpression = `(async () => {
	${PAGE_HELPERS}
	// Only the rows near the view are rendered (rows.mjs), so walk the page's
	// scroll box down until a row with a set-bonus figure renders.
	const box = document.querySelector('[data-testid="sim-ui"]') ?? document.scrollingElement;
	const find = () => [...(openPane()?.querySelectorAll(${JSON.stringify(SET_BONUS_FIGURE)}) ?? [])].find(shown);
	box.scrollTop = 0;
	await sleep(200);
	let figure = find();
	for (let step = 0; !figure && step < 200 && box.scrollTop + box.clientHeight < box.scrollHeight - 1; step++) {
		box.scrollTop += Math.round(box.clientHeight / 2);
		await sleep(150);
		figure = find();
	}
	if (!figure) return null;
	figure.scrollIntoView({ block: 'center', inline: 'nearest' });
	await sleep(250);
	const r = figure.getBoundingClientRect();
	return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
})()`;
const popoverExpression = `(async () => {
	${PAGE_HELPERS}
	const tip = await waitFor(() => document.querySelector(${JSON.stringify(SET_BONUS_TIP)}), 2000);
	if (!tip) return { error: 'no popover after hovering the figure' };
	await sleep(300);
	const figure = [...openPane().querySelectorAll(${JSON.stringify(SET_BONUS_FIGURE)})].find(el => el.matches(':hover')) ?? null;
	// Measured as SetBonusPopover.tsx's sideFor measures it.
	const room = figure ? (document.documentElement.clientWidth || window.innerWidth) - figure.getBoundingClientRect().right : null;
	return {
		side: tip.closest('[data-testid="sim-popover-positioner"]')?.getAttribute('data-side') ?? null,
		tipRect: rect(tip), figureRect: rect(figure), vw: document.documentElement.clientWidth,
		room, rootPx: parseFloat(getComputedStyle(document.documentElement).fontSize) || 16,
	};
})()`;

async function moveMouse(send, x, y) {
  await send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y });
}

/** Check 17: hovers the first set-bonus figure in the open pane, reads where its popover opened, then closes it. */
async function judgePopover(send, width) {
  const at = await H.evaluate(send, figureCentreExpression);
  if (!at) {
    check(17, width, false, { error: "no set-bonus figure in the open pane" });
    return;
  }
  // Two moves, as test-review.mjs does: a pointer that starts on the figure
  // never enters it.
  await moveMouse(send, 2, 2);
  await H.sleep(150);
  await moveMouse(send, at.x, at.y);
  await H.sleep(700);
  const m = await H.evaluate(send, popoverExpression);
  await moveMouse(send, 2, 2);
  await H.sleep(700);
  if (m.error || !m.figureRect) {
    check(17, width, false, m.error ? m : { ...m, error: "no hovered figure" });
    return;
  }
  // Only ever "right" or "top", so `m.side === expected` also fails a popover
  // that opened left or below.
  const expected =
    m.room >=
    POPOVER_WIDEST_REM * m.rootPx + POPOVER_GAP_PX + POPOVER_FLIP_MARGIN_PX
      ? "right"
      : "top";
  const t = m.tipRect;
  const f = m.figureRect;
  const insideViewport = t.left >= -TOL && t.right <= m.vw + TOL;
  const besideFigure =
    expected === "right" ? t.left >= f.right - TOL : t.bottom <= f.top + TOL;
  check(17, width, m.side === expected && insideViewport && besideFigure, {
    expected,
    ...m,
  });
}

// `--fixture <name-or-path>` beats TBC_TAB_FIXTURE, for a caller that cannot
// put an env-var prefix before the command (an agent sandbox that allows the
// harness only as a bare command; hypothesis, untested).
// check_layout_gate.py still passes the env var.
function askedFixture(argv) {
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--fixture") {
      if (!argv[i + 1]) throw new Unmeasured("--fixture needs a value");
      return argv[i + 1];
    }
    if (argv[i].startsWith("--fixture=")) return argv[i].slice(10);
  }
  return process.env.TBC_TAB_FIXTURE || null;
}

function fixturePaths() {
  const asked = askedFixture(process.argv.slice(2));
  if (asked) {
    const candidates = [path.resolve(asked), path.join(FIXTURE_DIR, asked)];
    const found = candidates.find((p) => fs.existsSync(p));
    if (!found)
      throw new Unmeasured(
        `fixture ${asked} not found (looked in ${candidates.join(", ")})`
      );
    return [found];
  }
  const files = fs.existsSync(FIXTURE_DIR)
    ? fs
        .readdirSync(FIXTURE_DIR)
        .filter((f) => f.endsWith(".json"))
        .sort()
    : [];
  if (files.length === 0)
    throw new Unmeasured("no fixtures in data/tab-fixtures");
  return files.map((f) => path.join(FIXTURE_DIR, f));
}

async function setWidth(send, width) {
  await send("Emulation.setDeviceMetricsOverride", {
    width,
    height: HEIGHT,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await H.sleep(400);
}

async function loadFixture(send, base, name, text) {
  const loaded = await H.loadFixturePage(send, base, text);
  if (loaded.error)
    throw new Unmeasured(`fixture ${name}: load failed: ${loaded.error}`);
}

function judgePreRun(width, m) {
  check(1, width, m.pastCount === 0, m.pastCount === 0 ? undefined : m.past);
  const d = m.disclosure;
  const disclosureOk =
    width < XL
      ? d.summaryShown &&
        !d.bodyShown &&
        d.expanded === "false" &&
        d.bodyShownAfterClick === true &&
        d.expandedAfterClick === "true"
      : !d.summaryShown && d.bodyShown;
  check(2, width, disclosureOk, d);
  if (width < XL)
    check(3, width, m.cardBottom <= m.resultsTop + TOL, {
      cardBottom: m.cardBottom,
      resultsTop: m.resultsTop,
    });
}

function judgePostRun(width, m, facts) {
  if (m.error)
    throw new Unmeasured(
      `fixture ${currentFixture}: post-run @${width}: ${m.error}`
    );
  check(
    15,
    width,
    m.rows > 0,
    m.rows > 0 ? undefined : { pane: m.pane, rows: m.rows }
  );
  const pageFits = m.page.scrollWidth <= m.page.clientWidth + TOL;
  check(1, width, pageFits, pageFits ? undefined : m.page);
  check(
    6,
    width,
    m.multiLine.length === 0,
    m.multiLine.length ? m.multiLine : undefined
  );
  check(
    7,
    width,
    m.clipped.length === 0 && m.pastCell.length === 0,
    m.clipped.length || m.pastCell.length
      ? { clipped: m.clipped, pastCell: m.pastCell }
      : undefined
  );
  check(
    12,
    width,
    m.figureOutside.length === 0,
    m.figureOutside.length ? m.figureOutside : undefined
  );
  check(
    14,
    width,
    m.midWord.length === 0,
    m.midWord.length ? m.midWord : undefined
  );
  if (width === PHONE_WIDTH) {
    const d = m.firstDelta;
    check(
      18,
      width,
      !!d &&
        d.scrollLeft === 0 &&
        d.deltaRect.left >= d.scrollerRect.left - TOL &&
        d.deltaRect.right <= d.scrollerRect.right + TOL,
      d ?? { error: "no first row in the main table" }
    );
  }
  if (width >= XL)
    check(13, width, m.cardBesideResults && m.columnGap >= MIN_COLUMN_GAP, {
      columnGap: m.columnGap,
    });
  facts.push({
    fact: "a1-below-cutoff-column-offsets",
    fixture: currentFixture,
    width,
    pane: m.pane,
    rows: m.rows,
    ...m.a1,
  });
}

async function main() {
  const startedAt = performance.now();
  const baseline = H.readA11yBaseline();
  const fixtures = fixturePaths().map((p) => ({
    name: path.basename(p),
    text: fs.readFileSync(p, "utf8"),
  }));
  const axeFixture = fixtures.some((f) => f.name === AXE_FIXTURE)
    ? AXE_FIXTURE
    : fixtures[0].name;
  const fixtureMs = {};
  const unmeasuredFixtures = [];
  const violations = [];
  const matched = new Set();
  const facts = [];
  const audit = async (send, state, width) => {
    const { violations: found, ms } = await H.axeRun(send, ROOT);
    const cls = H.a11yClassify(found, baseline);
    for (const i of cls.matched) matched.add(i);
    for (const v of [
      ...cls.fail.map((f) => ({ ...f, fail: true })),
      ...cls.warn,
    ])
      violations.push({ ...v, state, width });
    console.log(
      `axe [${state} ${width}] ${cls.fail.length} failing, ${cls.warn.length} warning (${ms} ms)`
    );
    for (const f of cls.fail)
      console.log(
        `FAIL a11y [${state} ${width}] ${f.id} ${f.selector} (${f.impact})`
      );
  };

  let preRunAt = startedAt;
  let fixtureAt = startedAt;
  let fixtureDoneAt = startedAt;
  const { base, stop } = await H.serveTab();
  const chrome = await H.launchChrome();
  const client = H.cdp(chrome.wsUrl, { callTimeoutMs: 120000 });
  try {
    await client.ready;
    const { send } = await H.attachPage(client);
    preRunAt = performance.now();
    for (const width of WIDTHS) {
      await setWidth(send, width);
      await send("Page.navigate", { url: `${base}${H.PAGE_PATH}` });
      await H.sleep(300);
      const opened = await H.evaluate(send, H.activateTabExpression());
      if (!opened?.ok)
        throw new Unmeasured(
          `pre-run @${width}: ${opened?.error ?? "tab did not open"}`
        );
      judgePreRun(width, await H.evaluate(send, preRunExpression(width)));
      await audit(send, "pre-run", width);
    }
    fixtureAt = performance.now();
    for (const { name, text } of fixtures) {
      const t0 = performance.now();
      currentFixture = name;
      try {
        await loadFixture(send, base, name, text);
        for (const width of WIDTHS) {
          await setWidth(send, width);
          judgePostRun(width, await H.evaluate(send, postRunExpression), facts);
          if (width === POST_RUN_AXE_WIDTH && name === axeFixture)
            await audit(send, "post-run", width);
          // Last at each width: the open popover must not be in the page when
          // the other checks measure it.
          await judgePopover(send, width);
        }
      } catch (err) {
        if (!(err instanceof Unmeasured)) throw err;
        unmeasuredFixtures.push({ fixture: name, reason: err.message });
        console.log(`UNMEASURED [${name}] ${err.message}`);
      }
      fixtureMs[name] = Math.round(performance.now() - t0);
      console.log(`fixture ${name}: ${fixtureMs[name]} ms`);
    }
    currentFixture = null;
    fixtureDoneAt = performance.now();
  } finally {
    client.close();
    chrome.kill();
    stop();
  }

  const stale = baseline
    .filter((e, i) => !matched.has(i) && e.mayNotFire !== true)
    .map((e) => `${e.ruleId} ${e.selector}`);
  for (const s of stale)
    console.log(
      `WARN a11y stale-baseline ${s} (never fired this run -- remove it)`
    );
  const failed = results.filter((r) => !r.ok).length;
  const a11yFailed = violations.filter((v) => v.fail).length;
  const wallMs = Math.round(performance.now() - startedAt);
  const phaseMs = {
    setup: Math.round(preRunAt - startedAt),
    preRun: Math.round(fixtureAt - preRunAt),
    fixtures: Math.round(fixtureDoneAt - fixtureAt),
  };
  console.log(
    `layout harness: phases setup ${(phaseMs.setup / 1000).toFixed(1)} s, ` +
      `pre-run ${(phaseMs.preRun / 1000).toFixed(1)} s, ` +
      `fixtures ${(phaseMs.fixtures / 1000).toFixed(1)} s`
  );
  console.log(`layout harness: wall time ${(wallMs / 1000).toFixed(1)} s`);
  if (failed === 0 && a11yFailed === 0 && unmeasuredFixtures.length > 0) {
    H.verdict("unmeasured", {
      reason: unmeasuredFixtures
        .map((u) => `fixture ${u.fixture}: ${u.reason}`)
        .join("; "),
      wallMs,
      unmeasuredFixtures,
    });
    return 1;
  }
  const pass = failed === 0 && a11yFailed === 0;
  H.verdict("measured", {
    pass,
    wallMs,
    phaseMs,
    failed,
    a11yFailed,
    widths: WIDTHS,
    fixtures: fixtures.map((f) => f.name),
    fixtureMs,
    unmeasuredFixtures,
    checks: results,
    facts,
    violations: violations.map(
      ({ id, selector, impact, state, width, fail, baselined }) => ({
        id,
        selector,
        impact,
        state,
        width,
        fail: !!fail,
        baselined: !!baselined,
      })
    ),
    staleBaseline: stale,
  });
  return pass ? 0 : 1;
}

main().then(
  (code) => process.exit(code),
  (err) => {
    console.error(`test-layout: ${err?.stack ?? err}`);
    const reason = String(err?.message ?? err);
    // Checks that already failed are a measured failure, whatever stopped the
    // run afterwards; reporting "unmeasured" would let the merge through.
    const failed = results.filter((r) => !r.ok).length;
    if (failed > 0)
      H.verdict("measured", {
        pass: false,
        failed,
        stoppedBy: reason,
        checks: results,
      });
    else H.verdict("unmeasured", { reason });
    process.exit(1);
  }
);
