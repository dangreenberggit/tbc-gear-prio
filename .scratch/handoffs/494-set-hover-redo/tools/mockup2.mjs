// Round 2c STOP 2b: second mock-up pass, throwaway injection on :5173 only.
// 1. 494 wording alternatives A and B on four rows (TOP placement, 1280).
// 2. 499 widths: bare figure, Slot just wide enough for "Main Hand", Item the rest.
// 3. 495 right placement with those widths.
// 4. 489 item-name wrap variants on feral-p3-p2bis.
// Usage: node mockup2.mjs
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = 'C:/Users/dgree/Code/lulz/tbc-gear-prio';
const FORK = `${ROOT}/vendor/tbc-new-fork`;
const OUT = `${ROOT}/.scratch/stage-gate/upgrades-tab-closeout/round-2c/mockups-2`;
const h = await import(pathToFileURL(`${FORK}/test-tab-harness.mjs`).href);
const { launchChrome, cdp, attachPage, evaluate, sleep, loadFixtureExpression, fixtureSettledExpression, pagePathFor } = h;
fs.mkdirSync(OUT, { recursive: true });
const results = { hovers: [], widths: {}, right: [], wrap: {} };

// ---------------------------------------------------------------------------
// Wording. Values come from the fixture; the walk is view.ts's best-stop rule.
// ---------------------------------------------------------------------------
const MINUS = '\u2212';
const f1 = v => Math.abs(v).toFixed(1);
const sg = v => (v < 0 ? `${MINUS}${f1(v)}` : `+${f1(v)}`);
const THRESHOLDS = [2, 4, 5, 8];

function walk(ctx, floor) {
	const fl = v => (v !== undefined && v > floor ? v : 0);
	const futures = [...(ctx.futureBonuses ?? [])].sort((a, b) => a.threshold - b.threshold);
	const charged = new Set();
	let total = 0;
	let best = 0;
	let stop = -1;
	const steps = futures.map((f, i) => {
		const breaks = [];
		for (const b of f.breaks ?? []) {
			const key = `${b.setId}:${b.threshold}`;
			if (charged.has(key)) continue;
			charged.add(key);
			breaks.push({ set: b.setName, n: b.threshold, dps: fl(b.dps) });
		}
		const full = fl(f.dps);
		total += full - breaks.reduce((s, b) => s + b.dps, 0);
		if (total > best) {
			best = total;
			stop = i;
		}
		return { set: ctx.setName, n: f.threshold, full, raw: f.dps, breaks };
	});
	return { steps, stop, credit: best };
}

// One future as a single line: gain, loss on the same line, or the reason it is 0.
function futureLine(s) {
	const loss = s.breaks.filter(b => b.dps > 0);
	const lossText = loss.map(b => `${b.set} ${b.n}pc ${MINUS}${f1(b.dps)}`).join(', ');
	if (s.full > 0) return loss.length ? `${s.set} ${s.n}pc: +${f1(s.full)}, but loses ${lossText}` : `${s.set} ${s.n}pc: +${f1(s.full)}`;
	return `${s.set} ${s.n}pc: ${s.raw <= 0 ? 'no gain' : 'too small'}`;
}

function parts(ctx, row, floor) {
	const w = walk(ctx, floor);
	const singles = (ctx.singleBreaks ?? []).filter(b => b.dps !== undefined);
	const own = row.deltaDps + singles.reduce((s, b) => s + b.dps, 0);
	const crossed = ctx.crossesThreshold ? THRESHOLDS.find(t => t > ctx.piecesWornBefore && t <= ctx.piecesAfterSwap) : null;
	const counted = [];
	const notCounted = [];
	w.steps.forEach((s, i) => {
		// A future that is 0 and costs nothing changes no total: left out, as before.
		if (s.full === 0 && !s.breaks.some(b => b.dps > 0)) return;
		(i <= w.stop ? counted : notCounted).push(s);
	});
	return { w, singles, own, crossed, counted, notCounted, off: row.deltaDps, on: row.deltaDps + w.credit };
}

// Alternative A: headings carry their figure.
function altA(p) {
	const g = [];
	g.push({ head: `Swap: ${sg(p.off)}`, lines: [`Item stats: ${sg(p.own)}`, ...(p.crossed ? [`Completes ${p.ctxSet} ${p.crossed}pc (in item stats)`] : []), ...p.singles.map(b => `Loses ${b.setName} ${b.threshold}pc: ${MINUS}${f1(b.dps)}`)] });
	if (p.counted.length) g.push({ head: `Set potential: ${sg(p.w.credit)}`, lines: p.counted.map(futureLine) });
	if (p.notCounted.length) g.push({ head: 'Not counted', lines: p.notCounted.map(futureLine) });
	return g;
}

// Alternative B: a receipt, figures in a right-aligned column, two total lines.
function altB(p) {
	const r = [];
	r.push({ label: 'Item stats', v: sg(p.own) });
	for (const b of p.singles) r.push({ label: `Loses ${b.setName} ${b.threshold}pc`, v: `${MINUS}${f1(b.dps)}` });
	r.push({ label: 'Set potential off', v: sg(p.off), total: true });
	for (const s of p.counted) {
		if (s.full > 0) r.push({ label: `${s.set} ${s.n}pc`, v: `+${f1(s.full)}` });
		for (const b of s.breaks.filter(b => b.dps > 0)) r.push({ label: `Loses ${b.set} ${b.n}pc`, v: `${MINUS}${f1(b.dps)}` });
	}
	if (p.w.credit !== 0) r.push({ label: 'Set potential on', v: sg(p.on), total: true });
	if (p.notCounted.length) {
		r.push({ label: 'Not counted', head: true });
		for (const s of p.notCounted) r.push({ label: futureLine(s), plain: true });
	}
	return r;
}

const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const htmlA = g => g.map(x => `<div style="margin-bottom:.3rem"><div style="font-weight:600">${esc(x.head)}</div>${x.lines.map(l => `<div style="padding-left:.75rem">${esc(l)}</div>`).join('')}</div>`).join('');
const htmlB = r =>
	`<div style="display:grid;grid-template-columns:auto auto;column-gap:1.25rem">${r
		.map(x =>
			x.head
				? `<div style="grid-column:1/-1;margin-top:.3rem">${esc(x.label)}</div>`
				: x.plain
					? `<div style="grid-column:1/-1">${esc(x.label)}</div>`
					: `<div style="${x.total ? 'font-weight:600;border-top:1px solid rgba(255,255,255,.35);padding-top:1px' : ''}">${esc(x.label)}</div><div style="text-align:right;font-variant-numeric:tabular-nums;${x.total ? 'font-weight:600;border-top:1px solid rgba(255,255,255,.35);padding-top:1px' : ''}">${esc(x.v)}</div>`,
		)
		.join('')}</div>`;
const textA = g => g.map(x => [x.head, ...x.lines.map(l => `  ${l}`)].join('\n')).join('\n');
const textB = r => r.map(x => (x.head || x.plain ? x.label : `${x.label.padEnd(34)}${x.v.padStart(8)}${x.total ? '   (bold, rule above)' : ''}`)).join('\n');

// ---------------------------------------------------------------------------
// Page helpers.
// ---------------------------------------------------------------------------
const chrome = await launchChrome();
const client = cdp(chrome.wsUrl);
await client.ready;
const { send, targetId } = await attachPage(client);
await client.send('Target.activateTarget', { targetId });
const setWidth = w => send('Emulation.setDeviceMetricsOverride', { width: w, height: 1000, deviceScaleFactor: 1, mobile: false });
const style = css => evaluate(send, `(() => { let st = document.getElementById('__mk2'); if (!st) { st = document.createElement('style'); st.id = '__mk2'; document.head.appendChild(st); } st.textContent = ${JSON.stringify(css)}; return true; })()`);
const FIND = name => `(() => { document.querySelectorAll('#upgrades-tab details').forEach(d => { d.open = true; }); return [...document.querySelectorAll('.upgrades-results-table')].filter(t => t.getBoundingClientRect().height > 0).flatMap(t => [...t.querySelectorAll('tbody tr')]).find(r => r.querySelector('.upgrades-item-name')?.innerText.trim() === ${JSON.stringify(name)}); })()`;
const CLIP = (name, above = 20, rowsBelow = 2) => `(() => { const tr = ${FIND(name)}; if (!tr) return null; tr.scrollIntoView({ block: 'center' }); const els = [tr, tr.previousElementSibling]; let n = tr; for (let i = 0; i < ${rowsBelow}; i++) { n = n?.nextElementSibling; els.push(n); } els.push(...document.querySelectorAll('[data-tippy-root]')); const rs = els.filter(Boolean).map(e => e.getBoundingClientRect()).filter(r => r.width > 0); const tb = tr.closest('table').getBoundingClientRect(); const l = Math.min(tb.left, ...rs.map(r => r.left)), t = Math.min(...rs.map(r => r.top)), r = Math.max(tb.right, ...rs.map(r => r.right)), b = Math.max(...rs.map(r => r.bottom)); return { x: Math.max(0, l + scrollX - 6), y: Math.max(0, t + scrollY - ${above}), width: r - l + 12, height: b - t + ${above} + 10 }; })()`;
const TABLE_CLIP = rows => `(() => { const t = [...document.querySelectorAll('.upgrades-results-table')].find(t => t.getBoundingClientRect().height > 0); t.scrollIntoView({ block: 'start' }); const rs = [...t.querySelectorAll('tbody tr')]; const last = rs[Math.min(rs.length, ${rows}) - 1]; const a = t.getBoundingClientRect(), b = last.getBoundingClientRect(); return { x: a.left + scrollX - 4, y: a.top + scrollY - 4, width: a.width + 8, height: b.bottom - a.top + 8 }; })()`;

async function clip(file, rectExpr) {
	const rect = await evaluate(send, rectExpr);
	if (!rect || !(rect.width > 0)) throw new Error(`bad clip ${file}`);
	await sleep(250);
	const { data } = await send('Page.captureScreenshot', { format: 'png', clip: { ...rect, scale: 1 }, captureBeyondViewport: true });
	fs.writeFileSync(path.join(OUT, file), Buffer.from(data, 'base64'));
	return file;
}

async function load(name, width = 1280) {
	const text = fs.readFileSync(`${ROOT}/data/tab-fixtures/${name}.json`, 'utf8');
	const fx = JSON.parse(text);
	await setWidth(width);
	await send('Page.navigate', { url: `http://localhost:5173${pagePathFor(fx.spec)}?upgrades-dev` });
	await sleep(3000);
	const loaded = await evaluate(send, loadFixtureExpression(text));
	if (!loaded?.ok) throw new Error(`${name}: ${JSON.stringify(loaded)}`);
	for (let i = 0; i < 120 && !(await evaluate(send, fixtureSettledExpression)); i++) await sleep(250);
	await evaluate(send, `(async () => { const cb = document.getElementById('upgrades-set-potential'); if (cb && !cb.disabled && !cb.checked) { cb.click(); await new Promise(r => setTimeout(r, 800)); } return true; })()`);
	return fx;
}

const showTip = (name, html, placement) =>
	evaluate(
		send,
		`(async () => { const tr = ${FIND(name)}; tr.scrollIntoView({ block: 'center' }); await new Promise(r => setTimeout(r, 150)); const td = tr.children[3]; td._tippy.setContent(${JSON.stringify(html)}); td._tippy.setProps({ placement: ${JSON.stringify(placement)} }); td._tippy.show(); await new Promise(r => setTimeout(r, 300)); const box = td._tippy.popper.querySelector('.tippy-box'); const b = box.getBoundingClientRect(); const c = td.getBoundingClientRect(); return { used: box.getAttribute('data-placement'), tip: { left: b.left, right: b.right, top: b.top, bottom: b.bottom, width: b.width, height: b.height }, cell: { left: c.left, right: c.right }, innerWidth }; })()`,
	);
const hideTips = () => evaluate(send, `(() => { document.querySelectorAll('.upgrades-results-table td').forEach(td => td._tippy && td._tippy.hide()); return true; })()`);

// ---------------------------------------------------------------------------
// 1. 494 wording.
// ---------------------------------------------------------------------------
const ROWS = [
	['F', 'feral-p3-th-hands-legs', 'Breastplate of Malorne'],
	['D', 'feral-p3-nordrassil4', 'Thunderheart Chestguard'],
	['E', 'feral-p3-th-hands-legs', 'Nordrassil Chestplate'],
	['C', 'feral-p2-malorne4', 'Nordrassil Chestplate'],
];
try {
	let loadedName = null;
	let fx = null;
	for (const [label, fixture, rowName] of ROWS) {
		if (loadedName !== fixture) {
			fx = await load(fixture);
			loadedName = fixture;
		}
		const floor = Math.SQRT2 * fx.ranking.cutoff.absDps;
		const row = fx.ranking.items.find(i => i.name === rowName);
		const p = parts(row.setContext, row, floor);
		p.ctxSet = row.setContext.setName;
		const a = altA(p);
		const b = altB(p);
		const rec = { label, fixture, row: rowName, off: p.off, on: p.on, credit: p.w.credit, textA: textA(a), textB: textB(b), files: [], tips: {} };
		for (const [alt, html] of [['A', htmlA(a)], ['B', htmlB(b)]]) {
			const shown = await showTip(rowName, html, 'top');
			rec.dpsCell = await evaluate(send, `${FIND(rowName)}.children[3].innerText.trim()`);
			rec.tips[alt] = shown.tip;
			rec.files.push(await clip(`494v2-${label}-${alt}-1280.png`, CLIP(rowName, 20, 1)));
			await hideTips();
		}
		results.hovers.push(rec);
		console.log('494', label, 'done');
	}

	// -------------------------------------------------------------------------
	// 2. 499 widths, measured over all five fixtures' labels and figures.
	// -------------------------------------------------------------------------
	const probeWidths = `(() => { document.querySelectorAll('#upgrades-tab details').forEach(d => { d.open = true; }); const rows = [...document.querySelectorAll('.upgrades-results-table tbody tr')].filter(r => r.children.length >= 5); let slot = 0, slotText = '', fig = 0, figText = ''; const cv = document.createElement('span'); for (const tr of rows) { const s = tr.children[2]; const span = document.createElement('span'); span.style.whiteSpace = 'nowrap'; span.style.font = getComputedStyle(s).font; span.textContent = s.innerText.trim(); document.body.appendChild(span); const w = span.getBoundingClientRect().width; span.remove(); if (w > slot) { slot = w; slotText = span.textContent; } const n = [...tr.children[3].childNodes].find(n => n.nodeType === 3 && n.textContent.trim()); if (n) { const t = n.textContent.trim().replace(/\\s*DPS$/, ''); const sp = document.createElement('span'); sp.style.whiteSpace = 'nowrap'; sp.style.font = getComputedStyle(tr.children[3]).font; sp.textContent = t; document.body.appendChild(sp); const fw = sp.getBoundingClientRect().width; sp.remove(); if (fw > fig) { fig = fw; figText = t; } } } const td3 = rows[0].children[2]; const s3 = getComputedStyle(td3); return { slot, slotText, fig, figText, slotPadLeft: parseFloat(s3.paddingLeft), slotPadRight: parseFloat(s3.paddingRight), rootPx: parseFloat(getComputedStyle(document.documentElement).fontSize) }; })()`;
	let slotMax = { w: 0 };
	let figMax = { w: 0 };
	let pads = null;
	for (const name of ['feral-p3-p2bis', 'feral-p3-nordrassil4', 'feral-p3-th-hands-legs', 'ret-p3-p2', 'feral-p2-malorne4']) {
		await load(name);
		const m = await evaluate(send, probeWidths);
		pads = m;
		if (m.slot > slotMax.w) slotMax = { w: m.slot, text: m.slotText, fixture: name };
		if (m.fig > figMax.w) figMax = { w: m.fig, text: m.figText, fixture: name };
	}
	const rem = pads.rootPx;
	const DPS_PAD = 0.5 * rem;
	// Quarter-rem steps; 1px of slack against sub-pixel rounding.
	const up = px => Math.ceil(((px + 1) / rem) * 4) / 4;
	const slotRem = up(slotMax.w + pads.slotPadLeft + pads.slotPadRight);
	const dpsRem = up(figMax.w + DPS_PAD);
	results.widths.inputs = { slotMax, figMax, rootPx: rem, slotPadLeft: pads.slotPadLeft, slotPadRight: pads.slotPadRight, dpsPadLeft: DPS_PAD, slotRem, dpsRem, freedRem: 11 - slotRem - dpsRem };
	console.log('widths', JSON.stringify(results.widths.inputs));

	const bare = `(() => { for (const td of document.querySelectorAll('.upgrades-results-table tbody td:nth-child(4)')) { const n = [...td.childNodes].find(n => n.nodeType === 3 && n.textContent.trim()); if (n) n.textContent = n.textContent.replace(/\\s*DPS\\s*$/, ''); } return true; })()`;
	const newCss = src => `.upgrades-results-table .upgrades-col-source{width:${src}rem !important} .upgrades-results-table .upgrades-col-slot{width:${slotRem}rem !important} .upgrades-results-table .upgrades-col-dps{width:${dpsRem}rem !important} .upgrades-results-table td:nth-child(4){padding-left:0.5rem !important}`;
	const oldCss = src => `.upgrades-results-table .upgrades-col-source{width:${src}rem !important}`;
	const measureTable = `(() => { document.querySelectorAll('#upgrades-tab details').forEach(d => { d.open = true; }); const rows = [...document.querySelectorAll('.upgrades-results-table')].filter(t => t.getBoundingClientRect().height > 0).flatMap(t => [...t.querySelectorAll('tbody tr')]).filter(r => r.querySelector('.upgrades-item-name')); let over = -1e9, gap = 1e9, slotTall = 0, slotTallText = ''; for (const tr of rows) { const td = tr.children[3]; const n = [...td.childNodes].find(n => n.nodeType === 3 && n.textContent.trim()); const r = document.createRange(); r.selectNodeContents(n); const f = r.getBoundingClientRect(); const b = td.getBoundingClientRect(); const s = getComputedStyle(td); over = Math.max(over, f.right - (b.right - parseFloat(s.paddingRight)), (b.left + parseFloat(s.paddingLeft)) - f.left); const sr = document.createRange(); sr.selectNodeContents(tr.children[2]); const rects = [...sr.getClientRects()].filter(x => x.width > 0); gap = Math.min(gap, f.left - Math.max(...rects.map(x => x.right))); const lines = new Set(rects.map(x => Math.round(x.top))).size; if (lines > slotTall) { slotTall = lines; slotTallText = tr.children[2].innerText.trim(); } } const names = rows.map(r => r.querySelector('.upgrades-item-name')); return { rows: rows.length, worstFigureOverflowPx: +over.toFixed(1), minSlotDpsGapPx: +gap.toFixed(1), maxSlotLines: slotTall, maxSlotLinesText: slotTallText, namesCutOff: names.filter(n => n.scrollWidth > n.clientWidth).length, itemColPx: [...document.querySelectorAll('col')].find(c => c.className === '' || c.classList.contains('upgrades-col-item'))?.getBoundingClientRect().width ?? null }; })()`;
	await load('feral-p3-p2bis');
	for (const src of [8, 11]) {
		for (const w of [1280, 768]) {
			await setWidth(w);
			await style(oldCss(src));
			await sleep(300);
			const today = await evaluate(send, measureTable);
			await style(newCss(src));
			await evaluate(send, bare);
			await sleep(300);
			const next = await evaluate(send, measureTable);
			results.widths[`src${src} ${w}`] = { today, proposed: next };
			if (w === 1280) results.widths[`src${src} ${w}`].file = await clip(`499v2-table-src${src}-1280.png`, TABLE_CLIP(12));
			await send('Page.reload', {});
			await sleep(2500);
			await evaluate(send, loadFixtureExpression(fs.readFileSync(`${ROOT}/data/tab-fixtures/feral-p3-p2bis.json`, 'utf8')));
			for (let i = 0; i < 120 && !(await evaluate(send, fixtureSettledExpression)); i++) await sleep(250);
		}
	}
	console.log('499 done');

	// -------------------------------------------------------------------------
	// 3. 495 right placement with the new widths (Thunderheart Chestguard, B).
	// -------------------------------------------------------------------------
	{
		const d = results.hovers.find(x => x.label === 'D');
		const fxD = await load('feral-p3-nordrassil4');
		const floor = Math.SQRT2 * fxD.ranking.cutoff.absDps;
		const row = fxD.ranking.items.find(i => i.name === d.row);
		const p = parts(row.setContext, row, floor);
		p.ctxSet = row.setContext.setName;
		for (const src of [8, 11]) {
			for (const w of [1280, 768]) {
				await setWidth(w);
				await style(newCss(src));
				await evaluate(send, bare);
				await sleep(300);
				for (const [alt, html] of [['A', htmlA(altA(p))], ['B', htmlB(altB(p))]]) {
					const shown = await showTip(d.row, html, 'right');
					const entry = { src, width: w, alt, used: shown.used, tipWidth: shown.tip.width, roomRightPx: +(shown.innerWidth - shown.cell.right - 10).toFixed(1), figureRightPx: shown.cell.right, innerWidth: shown.innerWidth };
					entry.fits = entry.roomRightPx >= entry.tipWidth;
					if (src === 8 && w === 1280 && alt === 'B') entry.file = await clip('495v2-right-src8-1280.png', CLIP(d.row, 20, 2));
					results.right.push(entry);
					await hideTips();
				}
			}
		}
	}
	console.log('495 done');

	// -------------------------------------------------------------------------
	// 4. 489 item-name wrap on feral-p3-p2bis at 1280.
	// -------------------------------------------------------------------------
	const wrapCss = `.upgrades-results-table .upgrades-item-name{white-space:normal !important;display:-webkit-box !important;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden !important;text-overflow:ellipsis}`;
	const rowStats = `(() => { document.querySelectorAll('#upgrades-tab details').forEach(d => { d.open = true; }); const rows = [...document.querySelectorAll('.upgrades-results-table')].filter(t => t.getBoundingClientRect().height > 0).flatMap(t => [...t.querySelectorAll('tbody tr')]).filter(r => r.querySelector('.upgrades-item-name')); const names = rows.map(r => r.querySelector('.upgrades-item-name')); return { heights: rows.map(r => +r.getBoundingClientRect().height.toFixed(2)), cut: names.filter(n => n.scrollWidth > n.clientWidth + 1 || n.scrollHeight > n.clientHeight + 1).length }; })()`;
	await load('feral-p3-p2bis');
	await setWidth(1280);
	const med = a => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
	for (const src of [8, 11]) {
		await style(oldCss(src));
		await sleep(400);
		const base = await evaluate(send, rowStats);
		await style(oldCss(src) + wrapCss);
		await sleep(400);
		const wrap = await evaluate(send, rowStats);
		const grew = wrap.heights.filter((v, i) => v > base.heights[i] + 0.5).length;
		const shrank = wrap.heights.filter((v, i) => v < base.heights[i] - 0.5).length;
		results.wrap[`${src}rem`] = {
			rows: base.heights.length,
			today: { namesCutOff: base.cut, medianRowPx: med(base.heights), tallestRowPx: Math.max(...base.heights), totalHeightPx: +base.heights.reduce((a, b) => a + b, 0).toFixed(0) },
			wrap: { namesCutOff: wrap.cut, medianRowPx: med(wrap.heights), tallestRowPx: Math.max(...wrap.heights), totalHeightPx: +wrap.heights.reduce((a, b) => a + b, 0).toFixed(0), grew, shrank, same: wrap.heights.length - grew - shrank },
		};
		if (src === 8) results.wrap['8rem'].file = await clip('489-wrap-src8-1280.png', TABLE_CLIP(12));
	}
	console.log('489 done');
} finally {
	fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(results, null, 2));
	client.close();
	chrome.proc.kill();
}
