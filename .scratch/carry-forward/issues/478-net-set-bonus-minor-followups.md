Status: open
Type: task
Origin: docs/reviews/feat-tab-signoff-followups.md (round 6, 2026-09-22)
Blocks: none
Blocked by: none
Related: 467

# Net set-bonus minor follow-ups (bundle)

Four smaller findings from round 6, bundled because each is small on its
own.

- **A3** — the `bonusDpsNet` loop only corrects break keys present in the
  4pc package's own `breaks`; a 2pc package breaking `(Y,t)` in a slot the
  4pc package did not use leaves `+B` uncorrected. Also
  `candidateSlotIndex` keeps only the first pool slot per item, so
  ring/trinket members get counted in the wrong slot.
- **A4/D3** — the `advancesPieceCount` guard was removed, so a same-set
  piece replacing a worn same-set piece
  (`piecesAfterSwap == piecesWornBefore`) still gets full future credit,
  and `piecesNeeded` is low by one.
- **A5** — `fork-set-net.test.ts` is `describe.skipIf(!forkPresent)` and
  the fork is gitignored, so CI never runs it. Add fixtures for 476/477/A3
  and note the CI gap in docs.
- **D2** — document (ADR or the 467 ticket) that with 'full' credit, row
  values are NOT additive across a shortlist — each Thunderheart piece
  carries the whole 2pc+4pc.

## What would close this

Each item fixed or explicitly wontfixed with reason recorded in a comment
on this ticket.
