Status: open
Type: task
Origin: .scratch/carry-forward/issues/164-relic-retraction-does-not-travel-to-slot-section.md, Comments 2026-08-14 ("trinket-slot half is not done")
Blocks: none
Blocked by: none

# No engine signal for "the guide named a candidate this slot never got to try"

Ticket 164 named the trinket slot as owed the same local-retraction
treatment the ranged slot got, once ticket 157 landed: "the page
currently declares that slot finished with no disclosure that Darkmoon
Card: Crusade, Hourglass of the Unraveller and Abacus of Violent Odds
were never candidates." 157 has landed and those three items are pool
members now (see ticket 157's Comments) — but *before* the fix, the
trinket slot section rendered no warning at all, and 164's report-layer
mechanism can't retroactively fix that: it only travels an existing
`DeadSlotWarning`, and no warning was ever computed for that case.

## Why this is a real gap, not resolved by 157

`dead-slot`/`worn-unrankable` (`plausibility.ts`) fires only when a
**worn** item is absent from its slot's own pool. It says nothing about
a slot where nothing is worn from that source but a known guide (Wowhead
list) named candidates the pool never got to measure at all — the
`wowheadRecall.missedItems` report field already carries exactly this
information per-universe, but nothing threads it through to a per-run
`PlausibilityWarning`.

Concretely: if a future universe regen or a different spec/phase drops a
zone/heroic-dungeon-sourced item the way 157's six did, that slot's
report section will again render "N candidates / M BiS candidates" with
ordinary loss styling and no disclosure that the true candidate set was
incomplete — the exact "original problem surviving at reduced strength"
164 was filed to fix, just for the pool-incompleteness case instead of
the worn-item case.

## Done when

A decision (and, if adopted, an implementation) exists for whether the
ranking pipeline should compute a slot-level "candidate pool known
incomplete" signal — likely sourced from `wowheadRecall.missedItems`
cross-referenced against the ranked slot — and pass it through
`Ranking.plausibilityWarnings` (or an equivalent field) so ticket 164's
report-layer mechanism (`deadSlotWarningsBySlot` in `rank-report.ts`) can
render it the same way it renders `dead-slot`. Engine-side work
(`rank.ts`/`plausibility.ts`), not report-layer — distinct from ticket
164, which stays report-layer-only.
