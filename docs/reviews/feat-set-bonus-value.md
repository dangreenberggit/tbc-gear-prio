# Pre-merge review — feat/set-bonus-value

Diffed against: dev...feat/set-bonus-value (initial review at `1386eda`; fixes
verified through `de70cd3`). Four axes, fresh-context Opus at effort medium;
`codex` not on `PATH` (harness sharp lane, per the skill's ceiling rule).
Feature: set-bonus prospective value per `.scratch/set-bonus-value/spec.md` —
completion-package synergy per (set, threshold), `withSetPotential` view
toggle, unmeasured states carry reasons.

## Adversarial

Six findings, one blocking. **A1 (blocking):** under `withSetPotential`,
`applyView` copied `belowCutoffInView` verbatim from `belowCutoff`, so the
shortlist filtered out exactly the rows the toggle exists to surface —
below-cutoff-alone tier pieces with real prospective value (every Thunderheart
single in the V0 evidence is individually negative). **A2:** `piecesAfterSwap`
derives "already worn" from `item.owned`, an ownership proxy — benign today
only because all six implemented sets have one piece per canonical slot.
**A3:** "needs 0 more pieces" printable via a dead-but-live fallback.
**A4:** package-failure rows put a set id in an item-id field and blamed one
arbitrary piece. **A5 (test theatre):** the headline test's synthetic sim left
all singles at 0, so the Σ-singles subtraction — the non-trivial part of the
formula — was untested. **A6 (nit):** the 2pc→4pc carry-over silently depends
on `SET_THRESHOLDS` being ascending.

## Domain

Verdict blocking. Re-fetched both `item_sets.go` files at pin `8aa378b3`:
V1's table reproduces exactly, including both corrections to research.md
(Justicar 2pc is a bare `ExposeToAPL` no-op; Nordrassil has no `2:` key), and
the `ExposeToAPL`-doesn't-gate conclusion is sound. **D1 (blocking):** V0b's
+91.68 Thunderheart synergy was confounded — the feral baseline wears two
Malorne pieces (29096, 29100) with an active, implemented, cat-relevant 2pc,
and the probe's shoulder arm broke it; the singles sum double-charges a
breakage the package pays once, biasing the number upward. **D2:** the same
blind spot shipped in `selectPackage`, which treats a slot as free unless it
holds the _same_ setId — a package could silently break another set's bonus
and misattribute the net. **D3:** research.md's Justicar 2pc row was stale
against the branch's own V1. **D4:** same-slot contention within 8-piece sets
flagged unverified (overlaps A2).

## Standards + Spec

**Standards:** comment-policy breaches (several what-comments), a user-facing
disclosure line pointing at a `.scratch/` path, and the rank-report digest pin
made strictly more brittle. Baseline smells (judgement calls): `buildSetBonuses`
data clump (~11 params), duplicated unmeasured-row shape, ~17 new barrel
exports with no external caller, dead `PackagePiece.alreadyWorn`,
`set-value.ts` vs `set-bonus.ts` naming. Clean: `sortKeyFor` injection shape,
pure and directly-tested synergy arithmetic, correct `ENGINE_VERSION` bump.

**Spec:** **S1:** acceptance §8.2 (strip-and-compare vs dev) and §8.4 (CLI
demo) ran but were never persisted as evidence. **S2:** `se` combined only
baseline+package, contradicting §2.2's "over the sims involved" and the V0
worked example. **S3:** `nextThreshold` computed from `piecesWornBefore`
instead of `piecesAfterSwap` — a crossing row pointed at a threshold already
crossed, and "needs N more" was off by the same error. **S4:** `packageItemIds`
in deltaDps order, not canonical-slot order. **S5 (scope notes):** tie-group
ids also change under the toggle (unasked, defensible); `setLabel` gained a
parameter beyond §3's letter (justified — a set with zero worn pieces was
otherwise unnameable). **S6:** a comment claimed absent-vs-0 for the 2pc
subtraction differ when they are numerically identical.

## Summary

The mechanism survives review: the formula is sound, V1's implementation table
is independently reproducible, and the honest-uncertainty machinery
(unmeasured reasons, measured-≈0 reporting) held up on all axes. Both blockers
were real and both are fixed: the shortlist now promotes rows whose effective
value clears the _same absolute_ cutoff, and the V0 gate evidence was re-run
confound-free (Malorne 2pc→4pc on untouched slots: synergy 20.89 vs 3σ bar
18.03 — pass; the confounded V0b retained with a caveat). The production
mirror of the confound now records other-set bonuses a package breaks
(`SetBonusValue.breaks`). Fixes landed as `161e4d0`..`de70cd3`; 537 tests and
`pnpm verify` green on the tip. Known limits, disclosed in verification.md:
the ret P2 fixture shows no positive set potential (Crystalforge is mana/heal,
Justicar 4pc inert under a Seal-of-Blood APL — correct, demonstrated on the
feral side), and sets 566/583 report `not-implemented-in-sim` from a
conservative default whose Go source was not read.

## Second review round — tickets 90–99 (2026-08-10)

Diffed against: `dev...feat/set-bonus-value` (merge-base `5cd6330`, reviewed at
`f1f18aa`; fixes verified through `cfc77c9`). Four axes, fresh-context Opus at
effort medium, none with access to the implementing session; `codex` not on
`PATH` (harness sharp lane, per the skill's ceiling rule). The domain axis died
mid-stream on an API error and was re-run from scratch.

Scope: the ten tickets 90–99 filed by the set-bonus 4pc-invisible
investigation. Six were code (90, 91, 93, 94, 95, 98); three were measurements
that had never been run (92, 97, 99); 96 was expected to dissolve and did not.

### What the measurements changed

The prior round's evidence base carried a standing caveat that **no sims had
ever been run** — every figure was read from committed JSON or computed on top
of it. Sims were run this round, which settled a live factor-of-4 disagreement:

| quantity          | measured        | prior belief                  |
| ----------------- | --------------- | ----------------------------- |
| Thunderheart 4pc  | 73.5 ± 6.3 DPS  | engine reports 193.89         |
| Thunderheart 2pc  | 30.5 ± 5.5 DPS  | engine reports 31.46 — agrees |
| Malorne 2pc (`B`) | 131.1 ± 6.6 DPS | disputed: 100–133 vs 15–40    |
| Malorne 4pc       | 21.7 DPS        | engine reports 18.04 — agrees |

`B` resolves in favour of the regression camp. Two findings outrank the numbers:
ticket 99's **own specified ladder was confounded** (its singles straddle the
4pc threshold, so summing them subtracts the bonus ~4x and returns a negative
result), and Malorne's **2pc is worth ~6x its own 4pc**, falsifying the
"4-piece is the marquee bonus" prior that two plausibility arguments rested on.

### Adversarial

Seven findings, **two high-severity silent-failure modes, both fixed on the
branch**. Both survived the full 615-test suite green, which is the point.

**2-A1 (high):** `dead-slots.ts` picked the worn row as the first
`deltaDps === 0` row and then computed the runner-up gap over the remaining
rows _including any other zero_. Rows `[worn 0, clone 0, −300]` classified
`benign-nothing-better` with a gap of 0 — and because benign is not a warned
cause, **the warning silently vanished**. The same mechanism could defeat
`set-break-toll`. Two candidates measuring identically to baseline is not
exotic at 3000 iterations.

**2-A2 (high, silent-failure class):** an item missing from
`data/items/index.json` left `wornSetId` null, which skipped the set-break-toll
branch entirely and produced a confident `unique-effect` verdict — the report
asserting "nothing matches this item's effect" when the truth was "we could not
look it up". This is the project's stated worst case (PLAN.md: a plausible
answer, wrong, no error anywhere) occurring _inside the safety net this branch
added to catch exactly that_.

**2-A3 (medium):** `classifyDeadSlots` had six happy-path tests; neither bug
above was reachable by any of them.

The reviewer explicitly cleared the parts it tried hardest to break:
ticket 90's suppression "genuinely holds; not theatre" — `rankableSetPotential`
gates both the sort key and `belowCutoffUnderView` through the same predicate,
probed with a −500 prospective — and `IMPLAUSIBLE_BONUS_FRACTION` is
load-bearing, pinned between the two measurements so a wrong value fails.

### Domain

**All four claim-groups hold**, checked line-by-line against the pinned Go
source (`.scratch/wowsims-tbc-new-src` at `8aa378b367…`, matching
`data/wowsims.lock.json`).

Set mechanics transcription is accurate for Thunderheart 2pc/4pc, Malorne
2pc/4pc (including `ProcMaskMelee` = white|special and the absent ICD) and
Nordrassil's missing 2pc key. APL facts hold: Swipe is absent from
`feral_default.apl.json` entirely, Ferocious Bite is the 5-CP finisher, and
Rip+Bite+Swipe = 30.16% of damage — the recalled "~30%" that ticket 97's whole
band rested on, now measured. Both curated P3 gear files equip exactly the four
Thunderheart pieces and zero T4/T5.

On the startling 131 DPS: the reviewer accepted it as an SME and showed the
arithmetic closes — Shred is 35.3% of damage, +11.3% Shred casts against a 2226
baseline is ~88 DPS from Shred alone with the rest from combo points feeding
Rip/Bite. The earlier 15–40 estimate "was a proc-rate argument that never priced
the energy… wrong at the conversion step, not the rate step". The Strength
cross-check is independent and clean: 0.7227 DPS/Str, linear to four decimals
across +30/+150/+300.

**2-D1 (medium, latent):** `CURATED_SET_PHASE` (`rank-report-rules.ts:219`) is a
hand-copied mirror of `assemble_universe.py:354` and stops at `p2` where the
Python has `p3`. A future P4 rank falls back to a p3 label, `curatedSetPhase`
returns `null`, `bisStale` computes `false`, and the "no curated set is pinned"
warning **silently does not render** — showing a P3 list under a P4 heading. The
wrong behaviour is test-locked at `rank-report.test.ts:1363`.

**2-D2 (low):** a caught-and-fixed uncertainty mix-up — `plausibility.ts` cited
the Malorne 2pc as ±5.5 (the Thunderheart 2pc's SE) where the measurement says
±6.6.

### Standards + Spec

**Standards** found no hard violations beyond the comment policy. Durable
claims **pass** — every measured figure cites a re-runnable command, the pin,
seeds and iteration count; unread sets are labelled untested. Types-from-JSON,
seams and testing placement all pass (`rank.test.ts` drives `rankUpgrades`
through recorded adapters; the pure modules are unit-tested directly, which
AGENTS.md permits).

**2-St1 (hard):** a `computeSynergy` comment restates `?? 0` and re-argues a
point the neighbouring doc already makes. **2-St2/2-St3 (judgement):** the
`IMPLAUSIBLE_BONUS_FRACTION` and `formatSetBonusLine` docstrings re-derive whole
ticket arguments inline where a pointer to the committed ticket would do.
Baseline smells noted as judgement calls: duplicated threshold-walk shape
between `dead-slots.ts` and `set-value.ts`, a `(setId, setName, threshold)` data
clump, and `packageSimSkips` threaded as an out-param.

**Spec** confirmed 90, 93, 94, 95 and gate 2 of 98 are implemented as asked, no
material scope creep, no measured figure hardcoded as an engine constant (73.5
and 131.1 appear only in comments as calibration provenance, never in an
expression — which those tickets explicitly forbade), and **96 correctly left
alone**: no change to the cutoff, the BiS derivation, or the −100/−106 deltas,
so ADR-0020 survives.

**2-S1 (the round's most substantive finding):** ticket 91's package-as-card
panel is the _only_ surface an unreachable bonus can reach — and it is gated on
`withSetPotential`, which `spec.md:95` defines as **default off**. So the 4pc
figure that reaches no row also reaches no default reader, and ticket 90's
"still disclosed in the panel" inherits the gap. Sharpened by contrast: ticket
98's plausibility panel renders unconditionally, so a warning naming what a
package breaks can render while the package it names does not. Deferred rather
than fixed because default-off is a deliberate spec decision that also gates the
per-row column and the sort key — decoupling the disclosure panel is the likely
answer but needs a decision, not a reviewer's guess.

**2-S2:** ticket 93's own closing ask — an ADR — was not written.
**2-S3:** gate 1 ships a flat `IMPLAUSIBLE_BONUS_FRACTION` where the ticket
asked for a mechanics-derived band. Disclosed and argued in the docstring, and
the domain axis independently reached the same conclusion from the other side
(a proc bonus and a stat bonus are not comparable currencies, so one global
fraction cannot serve both). Accepted for landing, filed as a limit.

### Summary

The measurement work is the substance of this round: every disputed figure is
now measured, the deciding sims are re-runnable from committed scripts, and the
one inference that outran its evidence (`B = 193.89 − 73.54`) was caught by
adversarial review and retracted in the artifacts rather than quietly dropped.

Two high-severity silent failures were found and fixed on the branch, both in
the dead-slot classifier — the component added _this round_ to catch silent
confounds. That is the finding worth carrying: a safety net that fabricates a
verdict when its input is missing is worse than no net, because a missing
warning then reads as evidence of health. `pnpm verify` green at `cfc77c9`
(36 files, 622 tests, 2 todo).

Filed 100 (panel default-off), 101 (missing ADR), 102 (`CURATED_SET_PHASE`
drift). Ticket 96 stays open by design, with its root cause now measured rather
than suspected: the −100/−106 deltas are _correct_ (a single swap really does
forfeit the 131 DPS Malorne 2pc) and the BiS tag is _correct_ (the completed
package is genuinely best) — a package-vs-single-swap framing mismatch, not a
wrong number, and its answer depends on 100.

## Disposition

| ID    | Axis        | Disposition | Ticket / note                                                                                                                                                                                      |
| ----- | ----------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1    | Adversarial | fixed       | `161e4d0` — effective-value cutoff in view; 5 tests                                                                                                                                                |
| A2    | Adversarial | defer       | `.scratch/carry-forward/issues/86-pieces-after-swap-uses-owned-as-equipped-proxy.md`                                                                                                               |
| A3    | Adversarial | fixed       | `d0387e7` — threshold/"needs N" corrected                                                                                                                                                          |
| A4    | Adversarial | fixed       | `d0387e7` — failure rows name the package                                                                                                                                                          |
| A5    | Adversarial | fixed       | `d0387e7` — nonzero singles in headline fixture                                                                                                                                                    |
| A6    | Adversarial | fixed       | `d0387e7` — ascending order pinned                                                                                                                                                                 |
| D1    | Domain      | fixed       | `161e4d0` — V0c Malorne probe is the gate evidence                                                                                                                                                 |
| D2    | Domain      | fixed       | `f52da38` — `SetBonusValue.breaks`, rendered                                                                                                                                                       |
| D3    | Domain      | fixed       | `c945d2c` — research.md corrected in place                                                                                                                                                         |
| D4    | Domain      | defer       | `.scratch/carry-forward/issues/86-pieces-after-swap-uses-owned-as-equipped-proxy.md` (same root as A2)                                                                                             |
| S1    | Spec        | fixed       | `de70cd3` — §8.2/§8.4 evidence persisted at tip                                                                                                                                                    |
| S2    | Spec        | fixed       | `d0387e7` — se over all contributing sims                                                                                                                                                          |
| S3    | Spec        | fixed       | `d0387e7` — `piecesAfterSwap`; `thresholdBeforeSwap` split out                                                                                                                                     |
| S4    | Spec        | fixed       | `d0387e7` — slot-index order                                                                                                                                                                       |
| S5    | Spec        | wontfix     | tie-groups follow the displayed sort by design; `setLabel` param is the fix for a real defect (`a778018`)                                                                                          |
| S6    | Spec        | fixed       | `c945d2c` — comment corrected                                                                                                                                                                      |
| St1   | Standards   | fixed       | `c945d2c` — what-comments deleted, disclosure points at PLAN.md §14, dead field removed                                                                                                            |
| St2   | Standards   | defer       | `.scratch/carry-forward/issues/87-set-value-module-shape-cleanups.md` (naming, data clump, exports, digest pin)                                                                                    |
| 2-A1  | Adversarial | fixed       | `cfc77c9` — worn row from `owned`; runner-up gap over strictly worse rows                                                                                                                          |
| 2-A2  | Adversarial | fixed       | `cfc77c9` — distinct `unknown-item` cause, checked first, and it warns                                                                                                                             |
| 2-A3  | Adversarial | fixed       | `cfc77c9` — tie, missing worn row, unindexed item, both constants' boundaries                                                                                                                      |
| 2-D1  | Domain      | defer       | `.scratch/carry-forward/issues/102-curated-set-phase-mirror-drifted-from-its-python-source.md`                                                                                                     |
| 2-D2  | Domain      | fixed       | `cfc77c9` — Malorne 2pc SE corrected to ±6.6 in code and tickets 92/96                                                                                                                             |
| 2-St1 | Standards   | fixed       | `cfc77c9` — `formatSetPotentialLine` no longer calls suppression "correct-and-disclose"                                                                                                            |
| 2-St2 | Standards   | wontfix     | `IMPLAUSIBLE_BONUS_FRACTION`'s docstring is long, but its two calibration anchors are load-bearing and a reader changing the constant must confront them                                           |
| 2-St3 | Standards   | wontfix     | `formatSetBonusLine`'s docstring records why per-row credit was rejected; that is the pointer-to-the-finding case the comment policy allows                                                        |
| 2-S1  | Spec        | defer       | `.scratch/carry-forward/issues/100-set-potential-panel-is-default-off-so-unreachable-bonuses-stay-unseen.md`                                                                                       |
| 2-S2  | Spec        | defer       | `.scratch/carry-forward/issues/101-no-adr-for-set-bonus-threshold-selection.md`                                                                                                                    |
| 2-S3  | Spec        | wontfix     | flat fraction is disclosed and argued in the docstring; a per-bonus mechanics band needs a table keyed to the pinned Go source, which ticket 97 flags as unverified                                |
| 2-S4  | Spec        | wontfix     | `formatPackageContents` suppressing contents for `insufficient-pieces` is correct — that reason means the pool cannot build the package, so `packageItemIds` is empty and there is nothing to name |
