Status: open
Type: bug
Tab-scope: out-of-scope — core report path only (re-filed 2026-08-29, see below)
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

## Reframed 2026-08-28 — the original framing was wrong; do NOT execute the parked plan

**Read `.scratch/set-bonus-value/README-set-bonus-truth.md` first.** A stage-gate
plan was written and reviewed for this ticket
(`.scratch/stage-gate/upgrades-4pc-visibility/plan.md`) that would "surface the
4pc by summing per-threshold increments." Investigation showed that plan **solves
the wrong problem** and it is superseded, not executed:

- `bonusDps` **already excludes swap cost** (`computeSynergy` subtracts each
  piece's single-swap delta). It is the isolated marginal bonus effect.
- A negative 4pc `bonusDps` (Lightbringer ≈ −9.3) is **sim noise around a true
  zero**, not a real loss — settled in `.scratch/set-bonus-value/verification.md`.
  A set bonus is ≥0 by nature. Summing/showing that negative was making the
  problem worse, not fixing it.
- For ret specifically, no tier set bonus clears the noise, so correctly nothing
  should show.

**Owner's corrected design (2026-08-28):** the row's **main/ranked number is the
net effect**; the **set bonus is a secondary annotation shown only above the
noise floor** (a real, ≥0 bonus). Below noise → shown nowhere.

**The actual open question (UNRESOLVED — needs settling before any code):** with
set-potential ON, the ranked number is `deltaDps + rankableSetPotential(item)`
(`view.ts:317-341`), and `rankableSetPotential` returns the **ungated**
`prospectiveBonusDps` — so a below-noise bonus silently moves the sort key and
cutoff even though the displayed line (ticket 315's `SET_BONUS_MIN_DISPLAY_DPS`
floor) correctly hides it. **Whether that is a bug or intended is unresolved:**
ADR-0024 says the opt-in view MAY score a member by the package it completes, but
predates the 315 noise floor. Reconciling the owner's "net effect ranks, bonus is
gated extra" intent with ADR-0024 is the next step — it may amend ADR-0024 or
confirm current behavior. **Do not gate `rankableSetPotential` on the noise floor
without settling ADR-0024 first.**

No execution taken 2026-08-28 — owner directed stop-and-consolidate. The
stage-gate is parked at Gate B with the plan superseded (see its decision-log).

## 2026-08-29 — the `view.ts` ranking gate landed (open question settled)

The set-potential ranking gate landed on `feat/upgrades-dedup-wowsims`
(stage-gate plan `.scratch/stage-gate/upgrades-331-noise-rank/plan.md`):
`rankableSetPotential` (`packages/core/src/view.ts`, and its ported fork twin)
now returns `0` unless the unconfounded `prospectiveBonusDps` is strictly greater
than the shared `SET_BONUS_NOISE_FLOOR_DPS = 10` (`packages/core/src/cutoff.ts`),
which the fork tab's display gate also imports — so display and ranking read one
floor and can never disagree. A sub-noise (including negative) figure now moves
neither the toggle's sort key nor the cutoff verdict.

**ADR-0024 confirmed un-amended.** `rankableSetPotential` feeds
`setContext.prospectiveBonusDps`, which `rank.ts:1850` assigns from
`matching.bonusDps` — the per-threshold **increment** currency. ADR-0024's
decisions 2/5 and amendment-3 govern the `packageDeltaDps` currency in **package
mode** only, a different currency in a different mode, so gating the toggle path
amends nothing ADR-0024 decided; the ADR itself is untouched.

**Still open (why this ticket stays open):** the weighted/full report-mode path
(`rank-report-rules.ts:697-714`, `weightedSetPotentialDps`) sorts by `deltaDps +
prospectiveBonusDps * factor` with **no** noise floor — a second, still-unfixed
instance of the same defect, in the core report rather than the fork tab, and the
`* factor` discount (0.5/0.25) can pull an above-floor value below the floor, so
the empty (3.4, 10] gap in the committed fixtures does not fully protect it.
This awaits this ticket's weighted/full redesign; it was out of scope for the
`rankableSetPotential`-shaped fix above.

## 2026-08-29 — re-filed as out-of-scope for the tab (not tab-blocking)

The residual weighted/full defect is real but lives **only in the core report /
CLI path** (`packages/core/src/rank-report-rules.ts`, `rank-report.ts`). It has
**no path into the wowsims Upgrades tab**, so it does not block a finished tab.
This ticket stays `Status: open` as a core bug for a later run; it is moved out of
Tab-blocking in `docs/upgrades-tab-scope.md` with the same evidence.

Evidence (re-run 2026-08-29; commands are Git-Bash `grep -rn` / `ls` from repo
root). The decisive pair is the first two — they are sufficient on their own:

- `grep -rn "weightedSetPotentialDps" packages/core/src vendor/tbc-new-fork/ui`
  → defined at `rank-report-rules.ts:697`, called only from `rank-report.ts`
  (lines 32, 116, 117, 491, 492, 630); **zero occurrences under
  `vendor/tbc-new-fork/ui/`**. The function the defect lives in is never invoked
  by the tab.
- `ls vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades/engine/`
  → the ported engine twin dir contains **no `rank-report.ts` / `rank-report-rules.ts`**.
  The report layer that carries weighted/full is not ported into the fork at all.
- `grep -rn "SET_POTENTIAL_WEIGHTS\|'weighted'\|'full'" vendor/tbc-new-fork/ui`
  → the only hit is a **comment** in `upgrades_tab.tsx:2011` referencing the
  report-path discount; the fork tab implements no `weighted`/`full`
  set-potential mode. (Loose grep — its evidentiary weight is subordinate to the
  two commands above.)

The tab's only set-potential surface is `rankableSetPotential`
(`packages/core/src/view.ts` and its ported twin
`.../upgrades/engine/view.ts`), which is already noise-gated identically in both
copies on `setBonusNoiseFloorDps` (verified: `grep -n "setBonusNoiseFloorDps"
packages/core/src/view.ts vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades/engine/view.ts`).
The weighted/full path (`weightedSetPotentialDps`) applies no floor, but the tab
does not read it. So no tab surface can show the wrong weighted/full number.
