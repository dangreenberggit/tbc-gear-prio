Status: open
Type: feature
Origin: owner request in chat, 2026-10-02 ("we should have this", with a screenshot of the Bulk tab's progress dialog); no review round
Blocks: none
Blocked by: none
Related: 281

# A running Upgrades tab shows no elapsed time and no time remaining

## What the owner asked for

A screenshot of the Bulk tab's "Bulk Sim" progress dialog mid-run, with the
words "we should have this". That dialog shows, top to bottom:

- the current phase by name ("Running finalist tie-breaker rounds") and its
  step count (3/6), with a bar;
- "Elapsed Time: 7m 15s", ticking;
- iterations complete out of the total (57020 / 150000);
- an estimate of time remaining ("2m 10s remaining");
- a Cancel button.

## What the Upgrades tab shows today

Line numbers are from fork commit `cdb423505` on `feat/upgrades-tab`.

- While running: one status line, "Simming 243/277… (240 rows landed)", and a
  bar that is determinate only during the `simming` stage
  (`upgrades_tab.tsx:2130-2143`, ticket 281).
- No elapsed time until the run is done; then "Took Ns" under the table
  (`upgrades_tab.tsx:2629-2631`). A stopped run shows none (ticket 460).
- No time-remaining estimate at any point.
- Stop already exists, so Cancel is covered.

So the gap is the two time figures. Phase naming is partly there: the
`simming` count already includes the paired-replication re-sims of the top
rows (`rank.ts:1556-1561`, `rank.ts:1944-1951`), but the label does not say
when the run has moved from candidates to those re-sims.

## What the data supports

The `simming` total is fixed before the first candidate sim and already
counts the replication sims (`rank.ts:1556-1561`), so `done/total` is a
stable ratio for the whole sim phase. A remaining-time estimate of
`elapsed × (total − done) / done` needs nothing from the engine. Whether it
is accurate is **untested**: candidate sims and replication sims may not cost
the same, and the stages before `simming` (resolving, building the pool) are
not in the ratio at all.

The Bulk dialog's timer is a 100 ms `setInterval` started on `show()`
(`progress_tracker_modal.tsx:122-126`) and formats under a minute as `7.3s`,
otherwise `7m 15s` (`progress_tracker_modal.tsx:178-190`). Reusing that
format keeps the site's one idiom, as ticket 281 did for the bar.

## Done when

- A running tab shows elapsed time that ticks from the moment Run is pressed.
- During `simming`, it shows an estimate of time remaining, hidden until
  enough sims have finished for the estimate not to swing wildly (pick the
  threshold from a measured run, not a guess).
- The status line says when the run is re-simming the top rows rather than
  simming candidates, if that can be told apart without an engine change;
  otherwise record why not.
- The ticking figure does not flood assistive tech: the live region keeps
  announcing state changes only (ticket 446's progressbar naming stays).
- Checked live on :5173 on one full feral run: the remaining-time estimate
  shown at 50% done is within a stated error of the actual remaining time,
  and the error is written in the close note.

## Comments

**2026-10-02, owner:** "this is a popover with better stlying etc than what
we have. use our orchestration system." So the request is the whole dialog
presentation — a popover holding phase, bar, elapsed, remaining and cancel,
styled like the Bulk dialog — not only the two time figures added to the
existing status line. Scope widened accordingly; run through `stage-gate`
under `.scratch/stage-gate/run-progress-popover/`.

**2026-10-03, renumbered:** first filed as 537 on a side branch (`ad2802bb`);
that number was taken on `feat/tab-signoff-followups` by
`537-gear-change-mid-run-not-marked-stale.md`, so this ticket moved to 542
when the work was re-branched off `dev` as `feat/run-progress-panel`. Stage
artifacts keep the folder name `run-progress-popover` and may say 537.

**2026-10-03, owner:** "If a popover makes less sense (it's likely not
popping over anything with no results yet) you can have a similarly inspired
component that fits the area we have to work with (probably more a thing for
desktop)". So the target is a Bulk-dialog-inspired progress component that
fits the tab's own area, designed for desktop first; it need not float or
block.
