# Pre-merge review — feat/upgrades-ui-fit

Reviewed range: `f66966e..d0c662a` (repo) plus the fork clone's
`a52fdf83..466edc7cc` on `feat/upgrades-tab`. The earlier commits on this
branch (`b9e8011..f66966e`) are the already-reviewed `feat/upgrades-ui-pass`
range — see `docs/reviews/feat-upgrades-ui-pass.md`. Fix-round commits after
dispatch: repo `d0c662a..HEAD`, fork `466edc7cc..e637fa284`.

Dispatch: four fresh Opus subagents (adversarial, domain, standards, spec —
the latter two via the `code-review` skill), one parallel batch; `codex` not
on `PATH`. Each per-package fork commit in this range was also reviewed
pre-commit by an Opus reviewer with live served-page measurement; this
review is the cross-commit, fresh-context pass on top.

## Adversarial

One "blocking" finding — the ticket-279 tiebreak matches `compareRows` only
while the view sorts on raw `deltaDps`; with set-potential on, the view keys
on `deltaDps + rankableSetPotential` and stamped ranks can desync again.
This is the already-filed ticket 287 (found and filed by the WP4 ticket-279
review itself, before this review ran); the new part was that `rank.ts`'s
comment overclaimed an unconditional match — fixed. Two materials: the
applied filter still reads `raidFilterSelect.value` off the DOM (correct
only by call order — folded into ticket 286's gate rework), and the
`sortRows` null-rank comment's "unobservable today" (in fact measured by the
ticket-280 review: 175/175 below-cutoff rows null, shortlist all non-null —
uniform nullity per table). Minors: a whitespace-only-fragment edge in
`isEmptyElement` (no observed case) and the absence of a comparator
agreement test (added to ticket 287's Done-when).

## Domain

One material finding, fixed in the fix round: `heroic` sources fell through
`ZONELESS_SOURCE_LABELS`, so 10 Magisters' Terrace items in the ret-p5 pool
grouped under "Raid zones" as a raw lowercase `heroic` option. Fixed by
adding `heroic: 'Heroic dungeon'` to the engine map (fork `e637fa284`),
verified live at phase 5: the option renders "Heroic dungeon" under "Other
sources" and selecting it filters 31 rows to the one Magisters' Terrace (H)
item. The underlying two-copies-of-one-truth defect is ticket 288. All 21
tier-token zone/boss pairs, all 10 zone buckets, the phase strings, and the
quality-color source were checked and clean.

## Standards + Spec

Standards: no hard violations — commit messages meet the seven rules and
every causal claim names a re-runnable protocol. Judgment calls: two
comments in `upgrades_tab.tsx` drift toward restating their code; the
sortable/plain table heads duplicate the column list, reintroducing the
drift risk ticket 278 was filed for (ticket 289); the `wowsims-backend`
launch entry embeds an opaque five-command `cmd /c` chain.

Spec: all six work packages and all four WP4 tickets have implementations
matching their Done-when text; fixing ticket 285 in-branch was ruled the
correct reading of the loop's step 5. Three findings: a ticket-ID collision
(two open 284s — this pass filed one without checking `NEXT`; renumbered to
287, `NEXT` advanced), WP5's wontfix ruling recorded only in a commit
message (now recorded here — see Disposition W1), and the served-page
measurement evidence living only in commit prose and gitignored stage-gate
artifacts (accepted limitation — the fork has no test harness; the handoff
prescribes served-page measurement as the coverage, and each measurement
names its protocol so it can be re-run).

## Summary

Twelve findings across four axes, none blocking after the fix round. The
one pre-fix material defect (heroic filter grouping) is fixed and verified
live; the adversarial "blocker" was the already-filed ticket 287 plus a
comment overclaim, now scoped. Open deferrals: 286 (stopped-state controls,
now carrying the dual-source-of-truth note), 287 (set-potential rank
desync, now requiring an agreement test), 288 (label-map unification), 289
(shared column list). `pnpm verify` green on the tip; E-W3 re-run green
against both ported-file edits.

## Disposition

| ID  | Axis        | Disposition | Ticket / note                                                                                                                                                                                                                                                                                                                                                             |
| --- | ----------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | Adversarial | defer       | `.scratch/carry-forward/issues/287-set-potential-sort-key-desyncs-stamped-ranks.md` (pre-filed by the WP4 review); the comment overclaim is fixed in fork `e637fa284`                                                                                                                                                                                                     |
| A2  | Adversarial | defer       | folded into `.scratch/carry-forward/issues/286-stopped-runs-withhold-view-controls-and-sorting.md` (route the applied filter through `pendingRaidFilter` during the gate rework)                                                                                                                                                                                          |
| A3  | Adversarial | wontfix     | the "unobservable" claim was measured by the ticket-280 review (uniform rank nullity per sortable table); null-rank collapse to engine order is the documented intent                                                                                                                                                                                                     |
| A4  | Adversarial | wontfix     | whitespace-only-fragment edge in `isEmptyElement`; no producing case exists in `getSourceInfo` today                                                                                                                                                                                                                                                                      |
| A5  | Adversarial | defer       | `.scratch/carry-forward/issues/287-set-potential-sort-key-desyncs-stamped-ranks.md` — agreement-test requirement added to its Done-when                                                                                                                                                                                                                                   |
| D1  | Domain      | fixed       | heroic label added to `ZONELESS_SOURCE_LABELS` (fork `e637fa284`), verified live at phase 5                                                                                                                                                                                                                                                                               |
| D2  | Domain      | defer       | `.scratch/carry-forward/issues/288-source-label-truth-duplicated-across-two-maps.md`                                                                                                                                                                                                                                                                                      |
| S1  | Standards   | wontfix     | two comments drift toward what-restating; judgment-call level, the bulk of the added comments are load-bearing, and a comment-trim commit would move the pin again for no behavioural gain                                                                                                                                                                                |
| S2  | Standards   | defer       | `.scratch/carry-forward/issues/289-results-table-heads-duplicate-the-column-list.md`                                                                                                                                                                                                                                                                                      |
| S3  | Standards   | wontfix     | the `cmd /c` chain is a Windows-only dev convenience whose steps the handoff documents; failure output names the failing step in practice                                                                                                                                                                                                                                 |
| F1  | Spec        | fixed       | duplicate ticket 284 renumbered to 287; `NEXT` advanced (was stale at 279 before this pass)                                                                                                                                                                                                                                                                               |
| W1  | Spec        | fixed       | WP5 affordance ruling recorded here: **wontfix** — no placeholder/skeleton precedent on the site, an always-laid-out row would relitigate the WP2 empty-group ruling (whose `!important` exists to stop the hidden group claiming toolbar gap), and the controls appear exactly when they become meaningful; the real defect underneath (stopped-state gap) is ticket 286 |
| F3  | Spec        | wontfix     | served-page evidence lives in commit prose + gitignored stage artifacts; accepted — the fork has no harness, the handoff names measurement as the coverage, and every claim carries its re-run protocol                                                                                                                                                                   |
