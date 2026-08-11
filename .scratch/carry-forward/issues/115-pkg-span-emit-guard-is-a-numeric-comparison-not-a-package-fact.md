Status: open
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

## Acceptance criteria

- [ ] The span emits iff the row has a positive `setContext.package`, asserted
      in `packages/core/test/rank-report.test.ts` including the
      package-equals-delta edge.
- [ ] No-package chips remain byte-identical (ticket 112's guard test stays
      green).
- [ ] `pnpm verify` green.
