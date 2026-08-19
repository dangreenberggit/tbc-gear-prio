Status: open
Type: task (test/measurement hygiene; no shipped-code impact)
Origin: pre-merge review of feat/candidate-pool round 3, 2026-08-18 —
  standards axis (Duplicated Code) and adversarial axis (F2/F4)
Blocks: none
Blocked by: none

# The four measure-*.ts scripts copy one prologue and one constant

`packages/core/test/measure-feral-p3-recall.ts`, `measure-within-slot-ordering.ts`,
`measure-racing-ratio.ts` and `measure-cutoff-band.ts` each carry a
near-verbatim ~40-line prologue: `loadJson`, the full `RosterRecordingsFile`
type literal, and the fixture load. `racing-support.ts` already exists as the
shared home for harness code (`CountingSimRunner`, `DerivedNoiseSimRunner`).
The type is the sharpest case: it describes one committed fixture file, and
four copies can drift from it independently.

`measure-cutoff-band.ts` also hard-codes `SCREEN_SE = 5.128`, a figure
`rank.ts` documents as a measured mean from ticket 222; a re-measurement updates
the prose in one file and leaves the arithmetic in the other.

## Acceptance criteria

- [ ] `RosterRecordingsFile` and `loadJson` live once (in `racing-support.ts`
      or a sibling) and the four scripts import them; each script's output is
      byte-identical before and after (`diff` two captured runs).
- [ ] The screening SE constant is either derived at run time from the fixture
      (mean per-item `stdev/sqrt(1000)`) or imported from one place, with the
      ticket 222 figure asserted against it so drift is loud.
- [ ] `pnpm verify` green.
