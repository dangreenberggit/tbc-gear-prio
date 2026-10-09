// How the harness scripts read the Upgrades tab's result rows (ticket 565).
// The tab renders only the rows in or near the page's view, so counting
// `[data-testid="upgrades-result-row"]` elements counts what is on screen, not
// the ranking. Two reads replace that count:
//
//   - a count: each table's `<tbody data-testid="upgrades-result-rows">`
//     carries its ranked row count in `data-row-count`;
//   - content: `collectRows` scrolls the page's scroll box through one table
//     and reads each row once, while it is rendered.
//
// The scripts drive the page with in-page expression strings over CDP, so a
// Node-side function cannot read a DOM row. ROW_HELPERS is page-side source
// text that a script puts inside its expression, the way it already puts WF or
// WAIT_FOR there. It defines:
//
//   tableRowCount(table)       a table's ranked row count;
//   paneRowCount(pane)         the sum over the pane's tables;
//   documentRowCount()         the sum over every table on the page;
//   collectRows(table, readRow)  for one table, readRow(tr) on every result
//                              row; resolves { rows } in table order, or
//                              { error, rows } when it read fewer rows than
//                              the table's count.
//
// collectRows takes one table, never a pane: `data-index` starts at 0 in each
// table. It selects result rows only, so the spacer rows that stand in for the
// rows not rendered are never read.

const RESULT_ROWS = '[data-testid="upgrades-result-rows"]';
const RESULT_ROW = '[data-testid="upgrades-result-row"]';
// The page scrolls this box, not the window (`ui/app/SimShell.tsx` in the fork).
const SCROLL_BOX = '[data-testid="sim-ui"]';

export const ROW_HELPERS = `
	const tableRowCount = table => Number(table?.querySelector(${JSON.stringify(RESULT_ROWS)})?.dataset.rowCount ?? 0);
	const paneRowCount = pane => [...(pane?.querySelectorAll(${JSON.stringify(RESULT_ROWS)}) ?? [])].reduce((sum, rows) => sum + Number(rows.dataset.rowCount ?? 0), 0);
	const documentRowCount = () => paneRowCount(document);
	const collectRows = async (table, readRow) => {
		const box = document.querySelector(${JSON.stringify(SCROLL_BOX)}) ?? document.scrollingElement;
		// A scroll reaches the virtualiser on the next frame and its rows render in that frame; the timeout
		// keeps a page whose frames have stopped (a hidden tab) from hanging the walk.
		const settle = () => new Promise(resolve => {
			let done = false;
			const finish = () => { if (!done) { done = true; setTimeout(resolve, 50); } };
			requestAnimationFrame(() => requestAnimationFrame(finish));
			setTimeout(finish, 500);
		});
		const count = tableRowCount(table);
		const seen = new Map();
		const read = () => {
			for (const tr of table.querySelectorAll(${JSON.stringify(RESULT_ROW)})) {
				const index = Number(tr.dataset.index);
				if (!seen.has(index)) seen.set(index, readRow(tr));
			}
		};
		const restore = box.scrollTop;
		box.scrollTop = 0;
		await settle();
		for (let step = 0; step < 10000; step++) {
			read();
			if (seen.size >= count || box.scrollTop + box.clientHeight >= box.scrollHeight - 1) break;
			box.scrollTop += box.clientHeight;
			await settle();
		}
		read();
		box.scrollTop = restore;
		await settle();
		const rows = [...seen.keys()].sort((a, b) => a - b).map(index => seen.get(index));
		return seen.size === count ? { rows } : { error: 'read ' + seen.size + ' of ' + count + ' rows', rows };
	};
`;

/** An in-page expression: the ranked row count summed over every results table on the page. */
export const documentRowCountExpression = `(() => {
	${ROW_HELPERS}
	return documentRowCount();
})()`;
