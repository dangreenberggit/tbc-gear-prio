Status: closed
Type: bug
Origin: .scratch/agent-reports/2026-11-07-general-task-candidate-cap-options.md (main checkout, gitignored; investigation of tickets 820 and 821)
Blocks: none
Blocked by: none
Related: 800, 820, 821

# The uncapped desktop gate run always fails its row-count check

## What a developer sees

`pnpm desktop-gate:check --spec enh --full` ran the enhancement page
(`P3 Preset`, phase 4) with no candidate cap on 2026-11-07, at fork
`c9bb0acd3`. Every check passed except (e):

```
(e) FAIL: rowCount=1024 expected=1039 eligibleCount=1039 expected_eligible=1039 cap=1092 (uncapped uses full_rows=None, C14 false)
```

The rogue page (`--spec rogue --full`) failed the same way: 809 rows against
826 eligible. Logs: `enh-full.log` and `rogue-full.log` in
`.scratch/agent-reports/2026-11-07-candidate-cap-evidence/` (main checkout,
gitignored).

The tab is right. The pool holds the items the player already wears; the tab
sims them but leaves them out of the list (the comment above `GATED` in
`scripts/check_desktop_tab.py` names fork `model/results_view.ts`
`paneRows`). So an uncapped run lists eligible minus the worn items in the
pool: 1039 - 15 = 1024 for enhancement.

## Where

`scripts/check_desktop_tab.py`, the (e) check (about line 750 at `dev`
`e905cb5f`): an uncapped run expects `full_rows`, and falls back to
`eligibleCount` when the spec's `GATED` entry has none. No entry has
`full_rows` (the comment above `GATED`, about line 174), so every `--full`
run on a page whose worn items are in the pool fails (e).

## Done when

`pnpm desktop-gate:check --spec enh --full` passes (e) on a correct run, and
so does `--spec rogue --full`. Either pin `full_rows` per spec from a
measured run, as the comment above `GATED` says, or derive the expected
count from the eligible count and the worn items in the pool. Say in the
comment above `GATED` which was chosen.

## Comments

**2026-11-07, branch `fix/821-weapon-damage-order`.** The same cause, a worn
item simmed and not listed, also hit a capped run. The owner's
`desktop-gate:check --spec enh --update-golden` at fork `6cc79f742` refused
at (e) with 39 rows against 40: the new weapon-damage order puts the worn
Bloodlust Brooch (29383) at place 29 of 1039 (it scores above the worn
Dragonspine Trophy in the other trinket slot), so it took one of the 40 cap
places and showed no row (the order measured offline with
`orderCandidatesByEp` and `itemEpFor` over `dbPoolFor('enh', 4, 'exclude')`
and `p3.gear.json`; agent report
`.scratch/agent-reports/2026-11-07-general-task-enh-39-rows.md` in the pair,
gitignored). That one was a tab defect, since the player asks for 40 and
sees 39, and fork `b71e25086` fixes it: the cap keeps the first N items the
player does not wear plus every worn one. This ticket's uncapped case is
unchanged: an uncapped run still sims every worn item in the pool and lists
none, so (e) still needs `full_rows` or the eligible count minus the worn
items in the pool.

**2026-11-17, branch `fix/desktop-gate-twin-counts`.** Fork `690fcdeb5`
(ticket 753) dropped 28379 and 28380 from every pool, so enh's eligible
count is now 1037, not 1039, and rogue's is 824, not 826. A fix here starts
from the new counts in `GATED`.

## Closed (2026-11-17, branch `fix/884-854-desktop-gate-counts`)

The (e) check of an uncapped run now expects `expected_eligible -
worn_in_pool` rows, with `worn_in_pool` pinned per spec: the start preset's
distinct item ids that are in the eligible pool. `full_rows` is gone. The
comment above `GATED` says why: the count is derived from the pinned eligible
count, so a pool change that touches no worn item needs no new uncapped run,
and neither the harness readback (`presetWorn` holds names) nor the pool
fixture (sizes only) gives the worn-in-pool count, so that one number is
pinned. Values, measured at fork `1410a775e` with `dbPoolFor` over each
preset's ids (probe in the main checkout, gitignored:
`.scratch/desktop-gate/worn-in-pool-probe/`): ret 15 (27484 Libram of
Avengement is not in the pool), mage 16, rogue 17, enh 15 (27815 Totem of
the Astral Winds is not in the pool). The enh and rogue values agree with
this ticket's runs (1039 - 1024 = 15, 826 - 809 = 17). No preset wears 28379
or 28380, so fork `690fcdeb5` changed the eligible counts only: a correct
uncapped run should now show enh 1022 of 1037 and rogue 807 of 824, and the
2026-11-07 numbers (1024 of 1039, 809 of 826) fail (e) on today's pins
because the eligible count moved.

Live runs, 2026-11-17, fork `1410a775e`, in the agent sandbox with
`PLAYWRIGHT_BROWSERS_PATH=<main>/.scratch/agent-reports/2026-11-03-p45-runs/pwshim`
and `--no-build` on the owner's build of that fork (logs
`.scratch/agent-reports/2026-11-17-desktop-gate-{enh,rogue}-full.log`,
gitignored):

```
(e) pass: rowCount=1022 expected=1022 eligibleCount=1037 expected_eligible=1037 cap=1090 worn_in_pool=15
desktop-gate: PASS (enh PASS).
(e) pass: rowCount=807 expected=807 eligibleCount=824 expected_eligible=824 cap=865 worn_in_pool=17
desktop-gate: PASS (rogue PASS).
```

Verified by: the two live runs above, and `pnpm desktop-gate:unit:check`. Its `FULL_CASES` hold this
ticket's numbers: enh 1022 of 1037 and rogue 807 of 824 pass (e); enh 1037
of 1037 (the old fallback), 1024 of 1037 and 1024 of 1039, and rogue 809 of
824 and 809 of 826 fail. Before the gate change enh 1022 and rogue 807
failed and enh 1037 of 1037 passed. `full_problems` also passes each spec on
its own pins and fails it one row over.
