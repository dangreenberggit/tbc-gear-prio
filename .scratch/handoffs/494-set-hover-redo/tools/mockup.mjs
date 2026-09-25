// Round 2c Step 8: rendered mock-ups by throwaway injection on :5173.
// Nothing in either tree is edited. Hover content is computed here from the
// recorded fixture's setContext with the grouped rule (plan § Approach, as
// amended by N5/N8) and with the flat Candidate A rule, then swapped into the
// row's tippy; placement, DPS cell and focus ring are changed in the page only.
// Usage: node mockup.mjs <plan.json>
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = 'C:/Users/dgree/Code/lulz/tbc-gear-prio';
const FORK = `${ROOT}/vendor/tbc-new-fork`;
const OUT = `${ROOT}/.scratch/stage-gate/upgrades-tab-closeout/round-2c/mockups`;
const h = await import(pathToFileURL(`${FORK}/test-tab-harness.mjs`).href);
const { launchChrome, cdp, attachPage, evaluate, sleep, loadFixtureExpression, fixtureSettledExpression, pagePathFor } = h;
fs.mkdirSync(OUT, { recursive: true });

const plan = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const results = [];

// ---------------------------------------------------------------------------
// The two hover rules, from a SetContext.
// ---------------------------------------------------------------------------
const THRESHOLDS = [2, 4, 5, 8];
const f1 = v => v.toFixed(1);
const signed = v => (v < 0 ? `\u2212${f1(-v)}` : `+${f1(v)}`);

export function walk(ctx, deltaDps, floor) {
	const fl = v => (v !== undefined && v > floor ? v : 0);
	const futures = [...(ctx.futureBonuses ?? [])].sort((a, b) => a.threshold - b.threshold);
	const unmeasured = futures.some(f => f.dps === undefined || (f.breaks ?? []).some(b => b.dps === undefined)) || (ctx.commitBreaks ?? []).some(b => b.dps === undefined);
	const charged = new Set();
	let total = 0;
	let best = 0;
	let stop = -1;
	const steps = futures.map((f, i) => {
		const full = fl(f.dps);
		const breaks = [];
		for (const b of f.breaks ?? []) {
			const key = `${b.setId}:${b.threshold}`;
			if (charged.has(key)) continue;
			charged.add(key);
			breaks.push({ set: b.setName, n: b.threshold, dps: fl(b.dps), raw: b.dps });
		}
		total += full - breaks.reduce((s, b) => s + b.dps, 0);
		if (total > best) {
			best = total;
			stop = i;
		}
		return { set: ctx.setName, n: f.threshold, full, raw: f.dps, breaks, unmeasured: f.dps === undefined || (f.breaks ?? []).some(b => b.dps === undefined) };
	});
	const singles = ctx.singleBreaks ?? [];
	const own = deltaDps + singles.reduce((s, b) => s + (b.dps ?? 0), 0);
	const crossed = ctx.crossesThreshold ? THRESHOLDS.find(t => t > ctx.piecesWornBefore && t <= ctx.piecesAfterSwap) ?? ctx.piecesAfterSwap : null;
	return { steps, stop: unmeasured ? -1 : stop, credit: unmeasured ? 0 : best, unmeasured, singles, own, crossed };
}

// Lines for one future step: its value (or "too small"), then its printable breaks.
function stepLines(s, style) {
	const shown = s.breaks.filter(b => b.dps > 0);
	const out = [];
	if (s.unmeasured) return [style === 'grouped' ? `${s.set} ${s.n}pc: not measured` : `${s.set} ${s.n}pc: break value not measured \u2014 set bonus not counted`];
	if (s.full > 0) out.push(style === 'grouped' ? `${s.set} ${s.n}pc: +${f1(s.full)}` : null);
	else if (shown.length) out.push(`${s.set} ${s.n}pc: too small to count`);
	else return [];
	for (const b of shown) out.push(`\u2003needs breaking ${b.set} ${b.n}pc: \u2212${f1(b.dps)}`);
	return out.filter(Boolean);
}

export function grouped(ctx, row, floor) {
	const w = walk(ctx, row.deltaDps, floor);
	const now = [];
	if (w.crossed) now.push(`activates ${ctx.setName} ${w.crossed}pc`);
	for (const b of w.singles) now.push(b.dps === undefined ? `breaks ${b.setName} ${b.threshold}pc: not measured` : `breaks ${b.setName} ${b.threshold}pc: \u2212${f1(b.dps)}`);
	const adds = [];
	const notCounted = [];
	w.steps.forEach((s, i) => {
		const lines = stepLines(s, 'grouped');
		if (!lines.length) return;
		if (i <= w.stop) adds.push(...lines);
		else {
			let reason;
			if (s.unmeasured) reason = null;
			else if (w.stop >= 0) reason = s.full > 0 ? 'costs more than it gains' : null;
			else reason = s.breaks.some(b => b.dps > s.full) ? 'costs more than it gains' : s.full > 0 ? 'too small to count' : null;
			notCounted.push(...lines, ...(reason ? [`\u2003(${reason})`] : []));
		}
	});
	const groups = [];
	if (!now.length && !adds.length && !notCounted.length) return { groups, credit: w.credit, walk: w };
	groups.push({ head: 'In this DPS now', lines: [`${row.name} itself: ${signed(w.own)}`, ...now] });
	if (adds.length) groups.push({ head: `Set potential adds ${signed(w.credit)}`, lines: adds });
	if (notCounted.length) groups.push({ head: 'Not counted', lines: notCounted });
	return { groups, credit: w.credit, walk: w };
}

export function flat(ctx, row, floor) {
	const w = walk(ctx, row.deltaDps, floor);
	const lines = [];
	if (w.crossed) lines.push(`Activates ${ctx.setName} ${w.crossed}pc \u2014 included in this DPS`);
	for (const b of w.singles) lines.push(b.dps === undefined ? `Breaks ${b.setName} ${b.threshold}pc: value not measured` : `Breaks ${b.setName} ${b.threshold}pc: \u2212${f1(b.dps)} \u2014 included in this DPS`);
	for (const s of w.steps) {
		if (s.unmeasured) {
			lines.push(`${s.set} ${s.n}pc: break value not measured \u2014 set bonus not counted`);
			continue;
		}
		const shown = s.breaks.filter(b => b.dps > 0);
		if (s.full > 0) lines.push(`${s.set} ${s.n}pc (${ctx.piecesWornBefore}/${s.n} worn): +${f1(s.full)}`);
		else if (shown.length) lines.push(`${s.set} ${s.n}pc: too small to count`);
		else continue;
		for (const b of shown) lines.push(`\u2003needs breaking ${b.set} ${b.n}pc: \u2212${f1(b.dps)}`);
	}
	const hasFutures = w.steps.some(s => s.full > 0 || s.breaks.some(b => b.dps > 0) || s.unmeasured);
	if (w.unmeasured) lines.push('Not counted: a break could not be measured.');
	else if (w.credit > 0) lines.push(`Counted with Set potential: +${f1(w.credit)} (stops at ${ctx.setName} ${w.steps[w.stop].n}pc)`);
	else if (hasFutures) lines.push(`Not counted: no ${ctx.setName} bonus outweighs what it breaks.`);
	return { lines, credit: w.credit, walk: w };
}

const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const groupedHtml = g => g.groups.map(gr => `<div style="margin-bottom:.35rem"><div style="font-weight:600">${esc(gr.head)}</div>${gr.lines.map(l => `<div style="padding-left:.75rem">${esc(l)}</div>`).join('')}</div>`).join('');
const flatHtml = f => f.lines.map(l => `<div>${esc(l)}</div>`).join('');
const toText = g => g.groups ? g.groups.map(gr => [gr.head, ...gr.lines.map(l => `  ${l}`)].join('\n')).join('\n') : g.lines.join('\n');

// ---------------------------------------------------------------------------
// Page helpers.
// ---------------------------------------------------------------------------
const chrome = await launchChrome();
const client = cdp(chrome.wsUrl);
await client.ready;
const { send, targetId } = await attachPage(client);
await client.send('Target.activateTarget', { targetId });
await send('Emulation.setFocusEmulationEnabled', { enabled: true });
const setWidth = w => send('Emulation.setDeviceMetricsOverride', { width: w, height: 1000, deviceScaleFactor: 1, mobile: false });
const style = css => evaluate(send, `(() => { let st = document.getElementById('__mk'); if (!st) { st = document.createElement('style'); st.id = '__mk'; document.head.appendChild(st); } st.textContent = ${JSON.stringify(css)}; return true; })()`);

const FIND = name => `(() => { document.querySelectorAll('#upgrades-tab details').forEach(d => { d.open = true; }); const rows = [...document.querySelectorAll('.upgrades-results-table')].filter(t => t.getBoundingClientRect().height > 0).flatMap(t => [...t.querySelectorAll('tbody tr')]); return rows.find(r => r.querySelector('.upgrades-item-name')?.innerText.trim() === ${JSON.stringify(name)}); })()`;

async function clip(file, rectExpr) {
	const rect = await evaluate(send, rectExpr);
	if (!rect || !(rect.width > 0)) throw new Error(`bad clip for ${file}: ${JSON.stringify(rect)}`);
	await sleep(200);
	const { data } = await send('Page.captureScreenshot', { format: 'png', clip: { ...rect, scale: 1 }, captureBeyondViewport: true });
	fs.writeFileSync(path.join(OUT, file), Buffer.from(data, 'base64'));
	return file;
}
// Union of the row, one row above and below, and any shown tippy box, in document coordinates.
const ROW_CLIP = (name, extra = 60) => `(() => { const tr = ${FIND(name)}; if (!tr) return null; tr.scrollIntoView({ block: 'center' }); const els = [tr, tr.previousElementSibling, tr.nextElementSibling, tr.nextElementSibling?.nextElementSibling, ...document.querySelectorAll('[data-tippy-root]')].filter(Boolean); const rs = els.map(e => e.getBoundingClientRect()).filter(r => r.width > 0); const table = tr.closest('table').getBoundingClientRect(); const l = Math.min(table.left, ...rs.map(r => r.left)), t = Math.min(...rs.map(r => r.top)), r = Math.max(table.right, ...rs.map(r => r.right)), b = Math.max(...rs.map(r => r.bottom)); return { x: Math.max(0, l + scrollX - 6), y: Math.max(0, t + scrollY - ${extra}), width: r - l + 12, height: b - t + ${extra} + 10 }; })()`;

async function loadFixture(name, width) {
	const text = fs.readFileSync(`${ROOT}/data/tab-fixtures/${name}.json`, 'utf8');
	const fx = JSON.parse(text);
	await setWidth(width);
	await send('Page.navigate', { url: `http://localhost:5173${pagePathFor(fx.spec)}?upgrades-dev` });
	await sleep(3000);
	const loaded = await evaluate(send, loadFixtureExpression(text));
	if (!loaded?.ok) throw new Error(`${name}: ${JSON.stringify(loaded)}`);
	for (let i = 0; i < 120 && !(await evaluate(send, fixtureSettledExpression)); i++) await sleep(250);
	return fx;
}

async function setPotential(on) {
	return evaluate(send, `(async () => { const cb = document.getElementById('upgrades-set-potential'); if (!cb || cb.disabled) return { disabled: true }; if (cb.checked !== ${on}) { cb.click(); await new Promise(r => setTimeout(r, 800)); } return { checked: cb.checked }; })()`);
}

async function showTip(name, html, placement = 'top') {
	return evaluate(
		send,
		`(async () => { const tr = ${FIND(name)}; if (!tr) return { error: 'row not found' }; tr.scrollIntoView({ block: 'center' }); await new Promise(r => setTimeout(r, 150)); const td = tr.children[3]; if (!td._tippy) return { error: 'row has no tip' }; ${html === null ? '' : `td._tippy.setContent(${JSON.stringify(html)});`} td._tippy.setProps({ placement: ${JSON.stringify(placement)}, popperOptions: { modifiers: [{ name: 'flip', options: { fallbackPlacements: ['bottom', 'top'] } }] } }); td._tippy.show(); await new Promise(r => setTimeout(r, 300)); return { ok: true, dpsCell: td.innerText.trim(), tip: td._tippy.popper.innerText }; })()`,
	);
}
const hideTips = () => evaluate(send, `(() => { document.querySelectorAll('.upgrades-results-table td').forEach(td => td._tippy && td._tippy.hide()); return true; })()`);

// ---------------------------------------------------------------------------
// The mock-ups.
// ---------------------------------------------------------------------------
try {
	for (const job of plan.jobs) {
		const fx = await loadFixture(job.fixture, job.width ?? 1280);
		const floor = Math.SQRT2 * fx.ranking.cutoff.absDps;
		await setPotential(job.setPotential ?? true);
		if (job.css) await style(job.css);
		const row = fx.ranking.items.find(i => i.name === job.row);
		if (job.row && !row) throw new Error(`${job.fixture}: no item ${job.row}`);
		const entry = { job: job.id, fixture: job.fixture, row: job.row, width: job.width ?? 1280, files: [] };
		if (row) {
			entry.setContext = row.setContext ?? null;
			entry.deltaDps = row.deltaDps;
			entry.floor = floor;
		}
		if (job.kind === 'hover') {
			const g = grouped(row.setContext, row, floor);
			const f = flat(row.setContext, row, floor);
			entry.groupedText = toText(g);
			entry.flatText = toText(f);
			entry.credit = g.credit;
			for (const [label, html] of [['grouped', groupedHtml(g)], ['flat', flatHtml(f)]]) {
				for (const w of job.widths ?? [1280, 768]) {
					await setWidth(w);
					await sleep(300);
					const shown = await showTip(job.row, html, job.placement ?? 'top');
					if (shown.error) throw new Error(`${job.id}: ${shown.error}`);
					entry.dpsCell = shown.dpsCell;
					entry.files.push(await clip(`${job.id}-${label}-${w}.png`, ROW_CLIP(job.row)));
					await hideTips();
				}
			}
		} else if (job.kind === 'no-hover') {
			const g = grouped(row.setContext ?? {}, row, floor);
			entry.groupedText = toText(g) || '(no lines)';
			entry.groupsEmpty = g.groups.length === 0;
			await evaluate(send, `(() => { const tr = ${FIND(job.row)}; const td = tr.children[3]; td.querySelector('.upgrades-set-bonus')?.remove(); td._tippy?.destroy(); td.removeAttribute('tabindex'); tr.scrollIntoView({ block: 'center' }); return true; })()`);
			for (const w of job.widths ?? [1280, 768]) {
				await setWidth(w);
				await sleep(300);
				entry.files.push(await clip(`${job.id}-${w}.png`, ROW_CLIP(job.row)));
			}
		} else if (job.kind === 'placement') {
			const g = grouped(row.setContext, row, floor);
			entry.groupedText = toText(g);
			const html = groupedHtml(g);
			for (const w of job.widths ?? [1280, 768, 375]) {
				await setWidth(w);
				await sleep(300);
				for (const pl of ['top', 'left']) {
					const shown = await showTip(job.row, html, pl);
					if (shown.error) throw new Error(`${job.id}: ${shown.error}`);
					entry.placements = entry.placements ?? [];
					entry.placements.push({ width: w, placement: pl, ...(await evaluate(send, `(() => { const tr = ${FIND(job.row)}; const td = tr.children[3]; const box = td._tippy.popper.querySelector('.tippy-box'); const t = box.getBoundingClientRect(); const used = box.getAttribute('data-placement'); const hits = []; const tr0 = tr.previousElementSibling, tr1 = tr.nextElementSibling; for (const [lab, nb] of [['above', tr0], ['below', tr1]]) { if (!nb) continue; for (const [ci, col] of [[1, 'Item'], [2, 'Slot'], [3, 'DPS'], [4, 'Source']]) { const r = document.createRange(); r.selectNodeContents(nb.children[ci]); if ([...r.getClientRects()].some(x => x.width > 0 && x.left < t.right && x.right > t.left && x.top < t.bottom && x.bottom > t.top)) hits.push(lab + ' ' + col); } } return { used, hits, tipHeight: t.height, onScreen: t.left >= 0 && t.right <= innerWidth && t.top >= 0 && t.bottom <= innerHeight }; })()`)) });
					entry.files.push(await clip(`${job.id}-${pl}-${w}.png`, ROW_CLIP(job.row, 20)));
					await hideTips();
				}
				await evaluate(
					send,
					`(() => { const tr = ${FIND(job.row)}; const cols = tr.children.length; const d = document.createElement('tr'); d.id = '__detail'; d.innerHTML = '<td colspan="' + cols + '" style="padding:.4rem 1rem .6rem 3rem !important;font-size:.875rem;text-align:left !important;white-space:normal !important;background:rgba(255,255,255,.06) !important;color:inherit">' + ${JSON.stringify(html)} + '</td>'; tr.after(d); tr.scrollIntoView({ block: 'center' }); return true; })()`,
				);
				await sleep(200);
				entry.files.push(await clip(`${job.id}-detailrow-${w}.png`, ROW_CLIP(job.row, 20)));
				await evaluate(send, `(() => { document.getElementById('__detail')?.remove(); return true; })()`);
			}
		} else if (job.kind === 'dps-cell') {
			// Two options on the whole table, then clip the widest row.
			const widest = await evaluate(send, `(() => { document.querySelectorAll('#upgrades-tab details').forEach(d => { d.open = true; }); let best = null; for (const tr of document.querySelectorAll('.upgrades-results-table tbody tr')) { if (tr.children.length < 4) continue; const n = [...tr.children[3].childNodes].find(n => n.nodeType === 3 && n.textContent.trim()); if (!n || !tr.getBoundingClientRect().width) continue; const r = document.createRange(); r.selectNodeContents(n); const w = r.getBoundingClientRect().width; if (!best || w > best.w) best = { w, name: tr.querySelector('.upgrades-item-name').innerText.trim(), text: n.textContent.trim() }; } return best; })()`);
			entry.widest = widest;
			entry.row = widest.name;
			const bare = `(() => { for (const td of document.querySelectorAll('.upgrades-results-table tbody td:nth-child(4)')) { const n = [...td.childNodes].find(n => n.nodeType === 3 && n.textContent.trim()); if (n) n.textContent = n.textContent.replace(/\\s*DPS\\s*$/, ''); } return true; })()`;
			const unbare = `(() => { for (const td of document.querySelectorAll('.upgrades-results-table tbody td:nth-child(4)')) { const n = [...td.childNodes].find(n => n.nodeType === 3 && n.textContent.trim()); if (n && !/DPS$/.test(n.textContent)) n.textContent = n.textContent.trim() + ' DPS'; } return true; })()`;
			const rootPx = await evaluate(send, `parseFloat(getComputedStyle(document.documentElement).fontSize)`);
			const widenRem = ((widest.w + 8) / rootPx).toFixed(2);
			entry.rootPx = rootPx;
			const trunc = `(() => { const names = [...document.querySelectorAll('.upgrades-results-table')].filter(t => t.getBoundingClientRect().height > 0).flatMap(t => [...t.querySelectorAll('tbody tr .upgrades-item-name')]); return { rows: names.length, truncated: names.filter(n => n.scrollWidth > n.clientWidth).length }; })()`;
			const fit = `(() => { let worst = -1e9, minGap = 1e9; for (const tr of document.querySelectorAll('.upgrades-results-table tbody tr')) { if (!tr.getBoundingClientRect().width || tr.children.length < 4) continue; const td = tr.children[3]; const n = [...td.childNodes].find(n => n.nodeType === 3 && n.textContent.trim()); if (!n) continue; const r = document.createRange(); r.selectNodeContents(n); const f = r.getBoundingClientRect(); const b = td.getBoundingClientRect(); const s = getComputedStyle(td); worst = Math.max(worst, f.right - (b.right - parseFloat(s.paddingRight)), (b.left + parseFloat(s.paddingLeft)) - f.left); const sr = document.createRange(); sr.selectNodeContents(tr.children[2]); const slotRight = Math.max(...[...sr.getClientRects()].map(x => x.right)); minGap = Math.min(minGap, f.left - slotRight); } return { worstOverflowPx: worst, minGapPx: minGap }; })()`;
			entry.measures = {};
			for (const src of [8, 11]) {
				for (const w of [1280, 768]) {
					await setWidth(w);
					await style(`.upgrades-results-table .upgrades-col-source{width:${src}rem !important} .upgrades-results-table .upgrades-col-dps{width:6rem !important} .upgrades-results-table td:nth-child(4){padding-left:.5rem !important}`);
					await evaluate(send, bare);
					await sleep(300);
					entry.measures[`bare src${src} ${w}`] = { ...(await evaluate(send, fit)), ...(await evaluate(send, trunc)) };
					entry.files.push(await clip(`${job.id}-bare-src${src}-${w}.png`, ROW_CLIP(widest.name, 20)));
					await style(`.upgrades-results-table .upgrades-col-source{width:${src}rem !important} .upgrades-results-table td:nth-child(4){padding-left:.5rem !important}`);
					await sleep(300);
					entry.measures[`bare at today's 5.5rem src${src} ${w}`] = { ...(await evaluate(send, fit)), ...(await evaluate(send, trunc)) };
					await evaluate(send, unbare);
					await style(`.upgrades-results-table .upgrades-col-source{width:${src}rem !important} .upgrades-results-table .upgrades-col-dps{width:${widenRem}rem !important}`);
					await sleep(300);
					entry.measures[`widen src${src} ${w}`] = { ...(await evaluate(send, fit)), ...(await evaluate(send, trunc)) };
					entry.files.push(await clip(`${job.id}-widen-src${src}-${w}.png`, ROW_CLIP(widest.name, 20)));
					await style(`.upgrades-results-table .upgrades-col-source{width:${src}rem !important}`);
					await sleep(300);
					entry.measures[`today src${src} ${w}`] = { ...(await evaluate(send, fit)), ...(await evaluate(send, trunc)) };
				}
			}
			entry.widenRem = widenRem;
			await style('');
		} else if (job.kind === 'focus') {
			await style(`.upgrades-results-table tr:has(> td[tabindex]:focus-visible){outline:2px solid var(--bs-link-color);outline-offset:-2px} .upgrades-results-table td[tabindex]:focus-visible{outline:none}`);
			const name = await evaluate(send, `(() => { const td = [...document.querySelectorAll('.upgrades-results-table td[tabindex]')].find(t => t.getBoundingClientRect().width > 0); td.scrollIntoView({ block: 'center' }); td.focus({ focusVisible: true }); return td.parentElement.querySelector('.upgrades-item-name').innerText.trim(); })()`);
			entry.row = name;
			await hideTips();
			for (const w of job.widths ?? [1280, 768]) {
				await setWidth(w);
				await sleep(300);
				await evaluate(send, `(() => { const td = [...document.querySelectorAll('.upgrades-results-table td[tabindex]')].find(t => t.parentElement.querySelector('.upgrades-item-name').innerText.trim() === ${JSON.stringify(name)}); td.focus({ focusVisible: true }); td._tippy?.hide(); return true; })()`);
				await sleep(150);
				entry.outline = await evaluate(send, `(() => { const tr = document.activeElement.parentElement; const s = getComputedStyle(tr); return { focusVisible: document.activeElement.matches(':focus-visible'), trOutline: s.outlineStyle + ' ' + s.outlineWidth, tdOutline: getComputedStyle(document.activeElement).outlineStyle }; })()`);
				entry.files.push(await clip(`${job.id}-rowoutline-${w}.png`, ROW_CLIP(name, 20)));
			}
			await style('');
		} else if (job.kind === 'toggle') {
			entry.toggle = await evaluate(send, `(() => { const cb = document.getElementById('upgrades-set-potential'); return { disabled: cb?.disabled, checked: cb?.checked }; })()`);
			for (const [key, text] of Object.entries(job.reasons)) {
				await evaluate(send, `(async () => { const root = document.getElementById('upgrades-set-potential').closest('.form-check'); root.scrollIntoView({ block: 'center' }); root._tippy.setContent(${JSON.stringify(text)}); root._tippy.show(); await new Promise(r => setTimeout(r, 300)); return true; })()`);
				entry.files.push(await clip(`${job.id}-${key}.png`, `(() => { const root = document.getElementById('upgrades-set-potential').closest('.upgrades-view-controls') ?? document.getElementById('upgrades-set-potential').closest('.form-check'); const rs = [root, ...document.querySelectorAll('[data-tippy-root]')].map(e => e.getBoundingClientRect()).filter(r => r.width > 0); const l = Math.min(...rs.map(r => r.left)), t = Math.min(...rs.map(r => r.top)), r = Math.max(...rs.map(r => r.right)), b = Math.max(...rs.map(r => r.bottom)); return { x: Math.max(0, l + scrollX - 8), y: Math.max(0, t + scrollY - 8), width: r - l + 16, height: b - t + 16 }; })()`));
				await evaluate(send, `(() => { document.getElementById('upgrades-set-potential').closest('.form-check')._tippy.hide(); return true; })()`);
			}
			entry.reasons = job.reasons;
		}
		results.push(entry);
		console.log(job.id, entry.files.length, 'files');
	}
} finally {
	fs.writeFileSync(path.join(OUT, `mockups-${path.basename(process.argv[2], '.json')}.json`), JSON.stringify(results, null, 2));
	client.close();
	chrome.proc.kill();
}
