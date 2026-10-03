Status: closed
Closed: f546dc0b3
Type: bug
Origin: owner report, 2026-09-18 (viewing the running tab, post-run state)
Blocks: none
Blocked by: none
Related: 312 (the view-controls/results ordering redesign), 415 (other pre/post-run heading placement)

# "Your current gear" summary sits above the Upgrades ranking, not below it

Owner report, viewing the Upgrades tab after a run on
`http://localhost:5173/tbc/paladin/retribution/`: the baseline-gear summary
line — rendered as a `status` element reading

    Your current gear: 2231.5 DPS. Took 98s.

— appears **above** the "Upgrades" ranked table. It should sit **below** the
upgrades. The ranked list of upgrades is what the tab is for; the current-gear
baseline is reference/footnote info and should not push the results down or
sit on top of them.

## Current post-run order (top → bottom)

Filter results → Shopping List (per-slot tabs) → **"Your current gear: N DPS.
Took Ns."** → Upgrades (ranked table) → "N item(s) below the cutoff" →
ThatsMyBis export.

## Wanted order

The current-gear/baseline summary moves to **below** the Upgrades ranked table
(candidate placements: just under the ranking, or grouped with the
"N below the cutoff" footer). Owner to confirm the exact resting spot when it
lands.

## Where

`vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades_tab.tsx`
(the results/status host order) and `_upgrades_tab.scss`. The status line is
the element found at the "Your current gear" `status` role in the rendered DOM.

## What would close this

- After a run, the "Your current gear: N DPS" summary renders below the
  Upgrades ranked table, not above it. Verify by running the tab and reading
  top-to-bottom: upgrades first, baseline summary after.

## Notes

New defect found during the owner's sign-off pass after the Chunk 3
re-verification — a results-ordering issue, same tab-surface family as 312/415,
but not one of the five reviewed Chunk 3 tickets (327/310/312/328/314), so
tracked here rather than reopening those. Sensible to fix alongside 415 (both
are post/pre-run heading-and-placement cleanups on the same surface).

## Closed

Fork commit 7ad068cd2 (re-pinned at f546dc0b3, Unit A). The "Your current
gear: N DPS. Took Ns." summary moved out of the top `.upgrades-status` line
into a new `.upgrades-baseline-summary` element rendered directly under the
ranked table (before the export box). The done/stopped branches of
`statusContent()` now return the empty fragment (except the stale warning,
which stays in the top slot), and `baselineSummaryContent()` fills the footer;
`renderAnnouncement` reads the summary element for the done/stopped
announcement so AT still hears the baseline (C27). One consequence handled: the
desktop-gate harness (run-tab-cdp.mjs) read the "Took" done signal from
`.upgrades-status` only, so its `pollDone` was updated to read the baseline
summary too (fork commit fd4fc76de).

Verified-by (live, feral page post-run): `.upgrades-status` is empty; the
baseline reads "Your current gear: 2683.3 DPS. Took 56s." with
`baseline.top > resultsTable.bottom` true (summary below the table).
