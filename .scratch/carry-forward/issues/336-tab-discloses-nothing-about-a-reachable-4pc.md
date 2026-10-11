Status: open
Type: bug
Origin: SME verdict 2026-08-29 (stage-gate wowsims-tab-tickets, Execution B/D;
  handoff .scratch/handoffs/sme-rank-judgment-330-4pc-set-bonus-display.md)
Blocks: none
Blocked by: none
Related: 91 (built the report-path disclosure this ticket ports), 330 (wording
  of the single-threshold line — separate axis), 331 (re-filed core report bug)

# The tab discloses nothing about a reachable 4pc

The row's set-bonus number is CORRECT and stays unchanged: single-nearest-
threshold credit is deliberate (ticket 91 rejected smearing per-row 4pc credit;
the noise floor suppresses sub-noise). Do not credit the 4pc onto the row or
touch the sort — that is the rejected, game-wrong path.

The defect is disclosure. The tab never mentions a reachable 4pc even when the
data is already on the row. Committed evidence (not ret-specific): a Thunderheart
member row (e.g. Thunderheart Leggings) at 0->1 piece shows only its 2pc line
while setContext.packages[] carries a +64.09 DPS 4pc that never reaches the
screen. Whether a large 4pc surfaces today is an accident of whether the set's
2pc is implemented, not a DPS fact (same mechanism ticket 331 documents for the
report path).

Evidence fixture: .scratch/set-bonus-value/*/artifacts/shredzepelin-p3.json
(verified path; the +64.09 4pc package deltaDps is read here). The SME handoff
cites a second valid copy at .scratch/rank-reports/shredzepelin-p3.json — same
data, different scratch location; use either.

Ticket 91 built a package-as-card disclosure for exactly this on the
report/core path; it was never ported into the tab (verify: grep the tab for
any packages[]-driven rendering).

## What would close this

- A tab disclosure (card or secondary line) naming the reachable 4pc, its DPS
  figure, and the pieces that assemble it, fed from the packages[] data the
  rows already carry — presentation only; row numbers and ordering unchanged.
- Consistent with the noise floor and the crosses/confounded distinctions
  (tickets 313/315/90); a sub-noise 4pc is not shown as a real figure.
- Verified by DOM readback on a fixture where the 4pc is large (Thunderheart
  +64) and one where it is sub-noise (ret), desktop and mobile.

## Comments

**2026-10-11 — re-checked on the React tab (Chunk 3b of
`.scratch/plans/upgrades-tab-finish-line.md`).** The disclosure this ticket
asks for renders only when the user ticks "Set potential". After a run the
tab offers that view toggle (`offeredToggles`, `model/results_view.ts:93`),
but it starts unticked unless the page restores a saved choice: the
store's view state is `{ ...NO_VIEW_TOGGLES, ...restored.view }`
(`model/upgrades_store.ts:120`), `NO_VIEW_TOGGLES` sets
`withSetPotential: false` (`model/results_view.ts:80`), and the page saves
the toggles with its settings (`model/upgrades_store.ts:51-54`), so a
user who ticked it once sees it ticked on later visits. The popover
adds the set-potential lines only when the toggle is on
(`model/set_bonus_tip.ts:187`, `:197`). With the toggle ticked, the
popover lists each reachable bonus with its partner pieces and DPS. The
Chunk 3b capture ticked it first (its `313-tip` entry clicks the unticked
box) and then showed, on the fixture `feral-p3-th-hands-legs`, row 31042
(Thunderheart Chestguard), at all four widths:
"Item stats +26.3 / Set potential / Thunderheart Pauldrons (4pc) +74.1 /
Total +100.4" (`facts.json`, key `313-tip`, in the main checkout's
gitignored `.scratch/tab-scope-refresh/review/`; that folder's
`manifest.json` is gitignored too, so a re-check needs a new
`pnpm tab-review` manifest entry that ticks the toggle and hovers that
row). The figure comes from `setContext.futureBonuses`
(`model/engine/view.ts:5-20`), not `packages[]`, after the 467/511
set-credit redesign.

Not checked, and still needed to close: whether the default view (toggle
unticked) tells the user a 4pc is reachable at all; the sub-noise case in
§ What would close this (a ret fixture whose 4pc is below the noise floor
must not show as a real figure); and a DOM readback of both at desktop
and mobile widths. Corrected 2026-10-11 by the pre-merge review of
`feat/tab-scope-refresh` (finding A1): the first version of this comment
said the toggle was on by default.
