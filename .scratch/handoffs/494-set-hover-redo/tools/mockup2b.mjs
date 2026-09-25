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


const results2 = {};
try {
	const bare = `(() => { for (const td of document.querySelectorAll('.upgrades-results-table tbody td:nth-child(4)')) { const n = [...td.childNodes].find(n => n.nodeType === 3 && n.textContent.trim()); if (n) n.textContent = n.textContent.replace(/\s*DPS\s*$/, ''); } return true; })()`;
	const measureTable = `(() => { document.querySelectorAll('#upgrades-tab details').forEach(d => { d.open = true; }); const rows = [...document.querySelectorAll('.upgrades-results-table')].filter(t => t.getBoundingClientRect().height > 0).flatMap(t => [...t.querySelectorAll('tbody tr')]).filter(r => r.querySelector('.upgrades-item-name')); let over = -1e9, gap = 1e9, slotTall = 0; for (const tr of rows) { const td = tr.children[3]; const n = [...td.childNodes].find(n => n.nodeType === 3 && n.textContent.trim()); const r = document.createRange(); r.selectNodeContents(n); const f = r.getBoundingClientRect(); const b = td.getBoundingClientRect(); const s = getComputedStyle(td); over = Math.max(over, f.right - (b.right - parseFloat(s.paddingRight)), (b.left + parseFloat(s.paddingLeft)) - f.left); const sr = document.createRange(); sr.selectNodeContents(tr.children[2]); const rects = [...sr.getClientRects()].filter(x => x.width > 0); gap = Math.min(gap, f.left - Math.max(...rects.map(x => x.right))); slotTall = Math.max(slotTall, new Set(rects.map(x => Math.round(x.top))).size); } const names = rows.map(r => r.querySelector('.upgrades-item-name')); const itemTd = rows[0].children[1].getBoundingClientRect(); return { rows: rows.length, worstFigureOverflowPx: +over.toFixed(1), minSlotDpsGapPx: +gap.toFixed(1), maxSlotLines: slotTall, namesCutOff: names.filter(n => n.scrollWidth > n.clientWidth).length, itemCellPx: +itemTd.width.toFixed(1) }; })()`;
	const variants = {
		'today': src => `.upgrades-results-table .upgrades-col-source{width:${src}rem !important}`,
		'first pass: Slot 6.25rem, DPS 4.75rem': src => `.upgrades-results-table .upgrades-col-source{width:${src}rem !important} .upgrades-results-table .upgrades-col-slot{width:6.25rem !important} .upgrades-results-table .upgrades-col-dps{width:4.75rem !important} .upgrades-results-table td:nth-child(4){padding-left:0.5rem !important}`,
		'tight: Slot 5.75rem (left padding 0.5rem), DPS 4.5rem': src => `.upgrades-results-table .upgrades-col-source{width:${src}rem !important} .upgrades-results-table .upgrades-col-slot{width:5.75rem !important} .upgrades-results-table td:nth-child(3){padding-left:0.5rem !important} .upgrades-results-table .upgrades-col-dps{width:4.5rem !important} .upgrades-results-table td:nth-child(4){padding-left:0.5rem !important}`,
	};
	const text = fs.readFileSync(`${ROOT}/data/tab-fixtures/feral-p3-p2bis.json`, 'utf8');
	for (const src of [8, 11]) for (const w of [1280, 768]) for (const [name, css] of Object.entries(variants)) {
		await load('feral-p3-p2bis', w);
		await style(css(src));
		if (name !== 'today') await evaluate(send, bare);
		await sleep(400);
		results2[`src${src} ${w} ${name}`] = await evaluate(send, measureTable);
		if (w === 1280 && name.startsWith('tight')) results2[`src${src} ${w} ${name}`].file = await clip(`499v2-tight-src${src}-1280.png`, TABLE_CLIP(12));
		console.log(src, w, name, JSON.stringify(results2[`src${src} ${w} ${name}`]));
	}
} finally {
	fs.writeFileSync(path.join(OUT, 'results-499-tight.json'), JSON.stringify(results2, null, 2));
	client.close();
	chrome.proc.kill();
}
