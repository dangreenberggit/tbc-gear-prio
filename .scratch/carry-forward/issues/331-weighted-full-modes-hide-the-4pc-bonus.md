Status: open
Type: bug
Origin: owner report 2026-08-28 ("the system got it wrong on the 4pc"); confirmed by investigation same day
Blocks: none
Blocked by: none

# `weighted` / `full` set-potential modes credit only the nearest threshold, hiding the 4pc

Confirmed correctness bug in **our ranking code** (`packages/core/src`, with
verbatim ported copies in the fork's `upgrades/engine/`). This does **not** touch
wowsims' sim engine — it is how we score and present upgrades from the sim's
output.

## Defect 1 (primary) — the 4pc is invisible in `weighted` and `full` modes

For a tier set whose **2pc is implemented**, a row that advances the worn count
(e.g. 0→1 piece) gets `nextThreshold = nextMeasurableThreshold(setId, 1)`, which
returns the **nearest** implemented threshold and stops
(`set-value.ts:114-123`, `for … if (t <= piecesAfterSwap) continue; if
(isBonusImplemented) return t`). So it returns **2** and never inspects 4.
`prospectiveBonusDps` is then pinned to the **2pc** increment
(`rank.ts:1847-1850`), and `weighted`/`full` read only that scalar
(`rank-report-rules.ts:697-714`).

Proven with committed numbers (`.scratch/rank-reports/slamaltman-p3.json`):
Lightbringer rows all carry `prospectiveBonusDps = +0.545` (the 2pc increment)
while the **4pc's +11.31 package sits on the same `setContext.packages` and is
ignored** by weighted/full. The `full` mode — whose UI label promises "the whole
bonus, as if the set gets completed anyway" (`rank-report.ts:641`) — moves the
row by only ±0.27 DPS (0.5 × 0.545). The 4pc is nowhere in the number the player
reads or sorts on by default.

### The cross-set inversion that makes it a clear bug

Whether `full` credits a 4pc at all depends on the **accident** of whether the
set's 2pc is implemented:
- Justicar (2pc NOT implemented) → `nextMeasurableThreshold` skips to **4** →
  `full` credits the 4pc increment (-3.876).
- Lightbringer (2pc implemented) → stops at **2** → `full` **excludes** the 4pc.

Two rows of the same real 4pc importance get opposite treatment, decided by an
implementation quirk rather than any DPS fact.

## Defect 2 (secondary) — bonus credited to non-members of the package

`prospectiveBonusDps` is credited on `advancesPieceCount && nextThreshold` alone
(`rank.ts:1846-1850`), with **no check that the row's item is one of the pieces
the threshold's package assembles**. Proof: the Lightbringer 2pc package is
`[30990, 30993]`, yet 30989 (War-Helm) and 30997 (Shoulderbraces) — not in the
2pc package — each carry `+0.545`. Equipping the helm at 0 worn reaches 1 piece
and delivers **no** 2pc bonus, but the tool credits it the 2pc value.

## Context — ticket 118 half-fixed this

The 2026-08-10 investigation
(`.scratch/set-bonus-value/investigation-2026-08-10-t6-4pc-invisible.md`)
diagnosed the mechanism; ticket 118 added `SetContext.packages[]` carrying every
measured threshold. But **only package mode reads `packages[]`**
(`rank-report-rules.ts:641-652`, correct). `weighted`, `full`, and the CLI
`applyView` path (`view.ts:333-342`) all still read the single
`prospectiveBonusDps` scalar — so the fix never reached the two modes a player
reads by default.

## What a fix must do (not yet designed)

- `weighted`/`full` must account for **all reachable thresholds** of the set a
  row is a member of (2pc *and* 4pc), not just the nearest — or at minimum
  surface the 4pc so it is not invisible. The data is already present in
  `packages[]`.
- Add the package-membership check so `prospectiveBonusDps` (or its successor) is
  credited only to rows whose item is actually in the threshold's package
  (Defect 2).
- Keep `computeSynergy`'s correct incremental arithmetic (2pc subtracted from
  4pc) — that part is right; do not double-count.
- The cutoff partition is deliberately frozen across modes (`rank-report.ts:643`);
  decide whether a 4pc-driven row should be able to cross the fold, or stay a
  muted package-only chip.

This is an engine-logic change touching `rank.ts` / `set-value.ts` /
`rank-report-rules.ts` and their ported fork copies (drift cycle). Ticket 330
(the line's wording) is downstream of whatever this decides to show.
