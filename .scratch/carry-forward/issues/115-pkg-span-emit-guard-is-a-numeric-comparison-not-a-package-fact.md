Status: resolved
Type: bug
Origin: fresh-context review of tickets 111/112, 2026-08-11 (axis 1 finding A4, against commit 03cd0d1)
Blocks: none
Blocked by: none

# The chip's `.pkg` span emit guard infers "has a package" from a numeric comparison

`chipHtml` (`packages/core/src/rank-report.ts:132-133`) emits the package-mode
`.pkg` span when

    packageSetPotentialDps(i) !== i.deltaDps

That is a proxy, not the fact it stands for ("this row carries a positive
`setContext.package`"). Two edges:

- **Coincidental equality**: a package figure that lands exactly on the row's
  own delta hides the span, so under package mode the chip shows one number
  with no marker — the precise confusion ticket 112 fixed, on a measure-zero
  but real input.
- **NaN**: `NaN !== x` is always `true`, so a NaN package figure emits a
  `pkg NaN` span instead of failing loudly or omitting it.

The right fix is a semantic flag — derive "is a package member" from
`setContext.package` (the same fact `formatPackageMembershipLine` in
`rank-report-rules.ts` keys on) and pass it to `chipHtml`, keeping the numeric
comparison out of the emit decision. Display only; the sort key
(`data-package`) and ticket 112's four-state table are unaffected.

## Note, 2026-08-11 (ticket 118 work)

Ticket 118's data-shape change replaced the numeric guard: `chipHtml` now
emits the `.pkg` span from `i.setContext?.packages` — the membership fact —
so the coincidental-equality and NaN edges above no longer exist. One
deliberate difference from this ticket's ask: per the owner's ticket-118
decision the span emits for ANY measured package, including all-negative
ones (the figures are data; only the sort ignores non-positive packages), not
only for a positive one. If that difference is acceptable, this ticket can be
closed on a re-check of the acceptance criteria against `chipHtml`.

## Acceptance criteria

- [x] The span emits from the membership fact (`setContext.packages`), asserted
      in `packages/core/test/rank-report.test.ts` including the
      package-equals-delta edge. (Amended from "iff positive": see resolution.)
- [x] No-package chips remain byte-identical (ticket 112's guard test stays
      green).
- [x] `pnpm verify` green.

## Comments

Resolved 2026-08-11, mostly by ticket 118's work (commit `ee2a4e4`), verified
and pinned here.

**What resolved it.** `chipHtml` (`packages/core/src/rank-report.ts`) no
longer decides whether to show the package marker by comparing two numbers.
It now checks the fact the comparison stood in for: does this row belong to a
measured package (`i.setContext?.packages` non-empty)?

**The two edge cases this ticket named, re-checked against current code:**

- **Package figure equal to the row's own delta**: the marker now shows. New
  pin: "keeps the package marker when the package figure equals the row's own
  delta" in `packages/core/test/rank-report.test.ts` — a member row at
  +64.07 with a 4pc package also at +64.07 renders both the marker and its
  own delta. Under the old comparison this exact fixture would have hidden
  the marker (64.07 equals 64.07), so the test fails on the old code.
- **NaN**: the old bug was that `NaN !== x` is always true, so a broken
  figure switched the marker ON for rows with no package at all. Emission no
  longer reads any number, so no numeric value — NaN included — can switch
  it. The existing "emits no .pkg span on a chip that is in no measured
  package" test pins the off side.

**One difference from this ticket's original ask, on purpose**: the ticket
asked for "emits iff the row has a positive package". The owner's ticket-118
decision is that the marker shows every measured figure, negative ones
included — the numbers are data; only the sort ignores non-positive
packages. So the guard is membership, not positivity. Recorded in
`docs/adr/0024` (2026-08-11 amendment).
