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

## Third review round — 111/112, the 115–123 fix round, and the ret catch-up (2026-08-12)

Diffed against: `dev...feat/set-bonus-value` (merge-base `5cd6330`, reviewed at
`3adbe4f`). Rounds 1 and 2 covered the branch through `cfc77c9`; this round's
scope is the 68 commits after it — `git diff cfc77c9...HEAD`. Four axes,
fresh-context Opus at effort medium, none with access to the implementing
session; `codex` not on `PATH` (harness sharp lane, per the skill's ceiling
rule).

Scope: the tickets 111/112 implementation (gem quality carried into the palette,
candidate auto-fill capped at rare gems), the fix round for tickets 115–123, the
ret catch-up, the review-disposition commits, the committed artifacts, the
ADR-0023/0024 amendments, and the spec amendments.

Tests were run under Node 22.16.0. `pnpm verify` exits 0; the suite is 38 files,
696 passing, 2 todo.

### Adversarial

Verdict blocking, on one finding.

**3-A1 (high, and the round's blocking finding):** a set bonus computed without
its own lower-threshold term is printed as an ordinary measurement, with a
standard error, and nothing anywhere says it is confounded. When exactly one
piece of a set is worn, `rank.ts:1067-1088` returns early for the 2-piece
threshold, and that early return happens before `rank.ts:1162` records
`twoPieceBonus`. So `set-value.ts:353` subtracts a missing term as zero.

This is live in a committed artifact, not a hypothetical. In
`.scratch/set-bonus-value/ret-catchup/artifacts/slamaltman-p3.json`, Crystalforge
Battlegear at 1 piece worn reports `bonusDps: -9.924693454980343` with
`se: 4.9633230225772005` and no `twoPieceBonus` field at all. The arithmetic
closes exactly on the file's own numbers —
`-26.77179572189698 − (−16.847102266916636) − 0` reproduces the reported figure
to the last digit, confirming the 2-piece term was never subtracted. The HTML at
`slamaltman-p3.html:645` then prints `set bonus -9.92 DPS`, four lines under
`:641`'s `can't be measured from this starting gear` for the same set's 2-piece
threshold, with the two lines adjacent and the dependency between them invisible.

The arithmetic half is already ticketed as 119 anomaly A. What is new is the
disclosure half, and it is a step backwards: before ticket 119, the 2-piece row
printed a fabricated `0.00`, which at least hinted that the two thresholds were
coupled. Ticket 119 correctly stopped printing that fake zero and, in doing so,
removed the only visible trace of the coupling. The existing machinery cannot
catch it either — `formatBreaksPrefix` and the panel qualifier key off cross-set
`breaks`, and a confound against a set's _own_ lower threshold produces no
`breaks` entry. This is the project's stated worst case: a plausible number,
wrong, with no error anywhere.

**3-A2 (medium):** `rank-report-css.ts:222`'s `body.package .chip.package-only`
is more specific than both `.source-hidden` (`:444`) and
`body.bis-only .chip:not(.is-bis)` (`:452`), so in package mode a revealed chip
ignores the source filter and the BiS filter. The report's JavaScript takes the
other side and correctly excludes the chip, so it renders with a blanked position
number and is left out of both `list-count` and `exportChips` — which makes the
Export caption's promise that the payload is the list "as currently filtered and
sorted" false against what the reader sees. Reachable in the committed
artifacts: chips 30989 and 30997 are both non-BiS and single-sourced.

**3-A3 (low):** `generate_item_gem_index.py:246` writes `null` when db.json omits
`quality`, `PALETTE` is an unchecked cast, and `gemsForQuality` compares
`quality <= maxQuality` — so `null` passes the rare cap while `undefined` would
drop. Not triggerable today (all 207 committed entries carry a number, and the
new `items-gems.test.ts` asserts it); this is exactly ticket 114, already open.

The reviewer cleared the parts it pushed hardest on, and retracted one finding of
its own after re-measuring: ticket 123's `firstLineOf` genuinely trims the
artifact's 2380-character Go panic to 239 characters; the `fillPalette`
docstring's claims about meta and rare gem availability both hold against
`palette.json`; `repairMeta` under the capped palette still keeps worn epics
(the palette is only the replacement pool); and the new artifact-backed tests
re-derive from committed measured data rather than recomputing the code's own
arithmetic. One cosmetic note: `rank-package-thresholds.test.ts`'s fixture
`bonusDps` values are invented and disagree with the artifact its docstring
cites, though `memberPackages` never reads them.

### Domain

Verdict non-blocking. **No contradictions of established facts** — every
game-mechanic assertion in the round-3 diff checked out against the pinned Go
source or the committed artifacts.

Confirmed rather than assumed: all 18 meta gems are quality 3 and every non-meta
colour exists at quality 3, so the rare cap cannot make a socket unsolvable; the
generator still drops the 7 Jewelcrafting-locked gems, so the cap does not
quietly admit profession-locked ones, and regeneration from the pinned db.json
is byte-identical to `HEAD`; the palette counts quoted in the verification doc
reproduce (201 at phase 3, 106 capped); ticket 122's Go claim is accurate at the
pin, and drop-and-disclose cannot produce a wrong number there; and Lightbringer
4pc is a sub-20%-health execute buff at the pin, so the ret artifact's roughly
−7 DPS reading is noise-scale as claimed rather than suspicious.

Three findings, all filed as **unverified assumptions rather than
contradictions**:

**3-D1 (medium):** the negative side of the plausibility band has no measured
anchor. The constant's docstring calibrates 7.5% from two _positive_ figures,
and ticket 120's closing note says the negative side was "calibrated the same
way ticket 98's positive band was" — it was not; no negative bonus has been
measured on either side of the band. The consequence is an unknown false-negative
rate in the exact direction the gate was added for. Low risk of a wrong ranking
because the gate warns rather than scores, but the docstring should say the
negative width is inherited and untested.

**3-D2 (low):** `GEM_POLICY_QUALIFIER` describes only the fill, not the repair.
Both halves are accurate for `fillEmptyCandidateGems`, but since ticket 117 both
`repairMeta` call sites also draw from `fillPalette`, and `repairMeta` overwrites
worn coloured gems to keep a meta lit. So the one sentence the report gives about
its gem model is incomplete in the exact direction open ticket 107 flags.

**3-D3 (nit):** the ret fixture's staleness is correctly labelled unverified, and
the reviewer flags it only because every ret figure this round rests on that one
snapshot — including ADR-0024's +11.31 Lightbringer 2pc, which now drives
package-mode sort order. That bonus is a mana proc, so its value is unusually
sensitive to how mana-starved the gear makes the rotation, and a newer snapshot
could move it. Worth a reference-gear caveat in the ADR, as ADR-0023 already
carries for its own figures.

No new WCL field usage appears in this diff, so nothing to check against the
brief's `permanentEnchant`, `specID`, race, or 19→17 findings.

### Standards + Spec

**Standards** verdict non-blocking, with four hard violations — all of them
comments or names that now state the opposite of what the code does, which is
the failure mode the comment policy exists to prevent.

**3-St1 (hard):** `c2d3897` flipped `package.json`'s committed bytes from LF to
CRLF, turning a two-line script addition into a 67-insertion/66-deletion
whole-file rewrite. Verified directly: the parent commit's blob has 0 CRLF, the
commit's blob has 67, `core.autocrlf` is `false`, and `.gitattributes` covers
only the two proto trees — so the CRLF is now permanent in the repository and the
next edit from a POSIX machine flips it back. AGENTS.md's loop step 2 names this
exact "any dirty file rides along" case. `generate_item_gem_index.py` in the same
range adds `newline="\n"` for precisely this reason.

**3-St2 (hard):** `gems.ts:47`'s docstring says "the auto-fill path caps rarity;
meta repair does not". Ticket 117 reversed that — both `repairMeta` call sites
(`rank.ts:467` and `:1483`) now pass `gems.fillPalette`, and the `fillPalette`
docstring in `candidate-gems.ts:40-46` documents the reversal correctly. Two
files in the same change now disagree on the one fact a reader comes to that
docstring for.

**3-St3 (hard):** `rank-report.ts:340-346` stacks two comment blocks above
`packageLineText`. The first describes `curatedPointer` twelve lines below and is
false about the line it sits on. The second says the line renders for a
"measured, positive package", but the code renders any non-empty `packages` and
ADR-0024's own amendment says negatives render too ("a package that measured
badly is a measurement, not a secret").

**3-St4 (hard):** `candidate-gems.test.ts:143` is titled "keeps the full palette
for meta repair — only the fill palette narrows", which is the behaviour ticket
117 removed. It asserts only that `ctx.palette` is unnarrowed, and no gem
selection path reads `ctx.palette` any more — its only remaining consumer is
`rank.ts:527`'s `gemPaletteIds` provenance. Worth noting while fixing: that means
the content hash keys off the uncapped palette while selection uses the capped
one, so a change confined to epic gems shifts the cache key without changing any
output.

**3-St5 (judgement):** signed-DPS formatting is open-coded eight times in
`rank-report-rules.ts`, three added this round, inconsistent between `> 0` and
`>= 0` for the same job while `fmtDelta` already exists — so zero formats as
`+0.00` in some lines and `0.00` in others. **3-St6 (judgement):**
`rank-report-rules.ts` gained 304 lines spanning package selection, panel
decomposition, curated pointers and the shared caveat text; the package-scoring
cluster reads as its own module.

Clean on standards: `check_curated_set_phase.py` re-derives rather than restates
and is wired into `pnpm verify`; ADR-0023/0024 hold the durable-claims line
throughout, with measurements citing tool version, seeds, iterations and
re-runnable scripts, and the one un-simmed inference marked untested. I spot-
checked the re-run commands rather than re-running sims: every script ADR-0023
names exists on disk, `fetch:wowsimcli` resolves, and the +11.31 Lightbringer
figure reproduces from the committed ret run log.

**Spec** verdict non-blocking. Closed as asked: 117, 118, 120, 123, 116, 115 —
with 118's code matching the ADR-0024 amendment line for line, including the
"sorts by its own `deltaDps` when every measured package is negative" rule. Two
are narrower than their ask and **each says so in its own file**: 119 shipped
only option B and correctly stays open with a written plan, and 122 accepted
drop-and-disclose while conceding the sibling-item sweep was never run. No scope
creep — everything in the code diff traces to a named ticket or one of the two
spec amendments, and the spec amendments are self-consistent.

**3-S1 (medium, the axis's substantive finding):** the two ADRs now contradict
each other and nothing reconciles them. ADR-0023's header reaffirms "Decisions 1,
3, 4 and 5 stand as written", and decision 5 reads that a row "may point at the
panel, but never restate its figure… It carries no number". ADR-0024's
2026-08-11 amendment item 5 does the opposite — the pointer "now states the set's
measured package figures itself" — and the code follows ADR-0024. The behaviour
is defensible, because the figure it restates is `packageDeltaDps` rather than
the confounded `bonusDps` decision 5 was protecting, but no document says so, and
ADR-0023 was amended this round for ticket 119 with this left standing.

**3-S2 (low):** ticket 125 is closed and its closing note claims completion, but
both acceptance boxes are unchecked and the ask is two-thirds met — `cli.ts:79`
prints `[--spec ret|feral]` without naming the default. **3-S3 (low):** tickets
111 and 112 are closed with all 14 acceptance boxes between them left unchecked,
so the files no longer record which criteria were actually verified. **3-S4
(nit):** `memberPackages` gives a row every measured threshold for its set,
including packages the row is not in — deliberate and tested, but the spec's
"Every member of one package shows the same figures" understates it, since the
figures are the set's rather than the package's.

### Summary

One blocking finding, and it is the same shape as the blocker round 2 found:
a safety improvement that removed a warning sign. Ticket 119 was right to stop
printing a fabricated `0.00` for an unmeasurable 2-piece threshold, but that fake
zero was the only visible hint that the 4-piece figure above it depended on it.
The 4-piece number now prints bare, with a standard error, in a committed
artifact a reader is meant to trust — and it is wrong by exactly the missing
2-piece term. Confirmed independently against the artifact's own numbers rather
than taken on the reviewer's word.

The rest of the round is in good shape and the domain axis is the strongest
evidence of it: four claim-groups checked line-by-line against the pinned Go
source with no contradictions, the palette regeneration byte-identical, and the
gem-cap solvability argument verified rather than assumed. The three domain
findings are all honest-uncertainty gaps — an inherited plausibility width
described as calibrated, a user-facing gem sentence that describes the fill but
not the repair, and a reminder that every ret figure rests on one unverified
snapshot.

The standards findings cluster tightly: four separate comments or test names now
assert the opposite of what ticket 117 made the code do. Individually each is
small; together they are the cost of a fix round that changed a behaviour in one
file and left its description in four others.

Two reviewers retracted or narrowed a finding after re-measuring, and the spec
axis confirmed that both narrowed tickets disclosed their own narrowing rather
than quietly closing. Filed 127 (self-set confound disclosure) and 128
(package-only chips beat the filters); 3-A3 is already open as ticket 114.

Note on the gate: `pnpm land --check-only` currently fails, correctly, on three
round-2 rows. Tickets 100, 101 and 102 were dispositioned `defer` in round 2 but
have since been fixed and closed on this branch, and the checker requires a
`defer` ticket to be open. Those three rows are corrected to `fixed` below, with
the closing commits named.

## Disposition

| ID    | Axis        | Disposition | Ticket / note                                                                                                                                                                                                                                                   |
| ----- | ----------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1    | Adversarial | fixed       | `161e4d0` — effective-value cutoff in view; 5 tests                                                                                                                                                                                                             |
| A2    | Adversarial | defer       | `.scratch/carry-forward/issues/86-pieces-after-swap-uses-owned-as-equipped-proxy.md`                                                                                                                                                                            |
| A3    | Adversarial | fixed       | `d0387e7` — threshold/"needs N" corrected                                                                                                                                                                                                                       |
| A4    | Adversarial | fixed       | `d0387e7` — failure rows name the package                                                                                                                                                                                                                       |
| A5    | Adversarial | fixed       | `d0387e7` — nonzero singles in headline fixture                                                                                                                                                                                                                 |
| A6    | Adversarial | fixed       | `d0387e7` — ascending order pinned                                                                                                                                                                                                                              |
| D1    | Domain      | fixed       | `161e4d0` — V0c Malorne probe is the gate evidence                                                                                                                                                                                                              |
| D2    | Domain      | fixed       | `f52da38` — `SetBonusValue.breaks`, rendered                                                                                                                                                                                                                    |
| D3    | Domain      | fixed       | `c945d2c` — research.md corrected in place                                                                                                                                                                                                                      |
| D4    | Domain      | defer       | `.scratch/carry-forward/issues/86-pieces-after-swap-uses-owned-as-equipped-proxy.md` (same root as A2)                                                                                                                                                          |
| S1    | Spec        | fixed       | `de70cd3` — §8.2/§8.4 evidence persisted at tip                                                                                                                                                                                                                 |
| S2    | Spec        | fixed       | `d0387e7` — se over all contributing sims                                                                                                                                                                                                                       |
| S3    | Spec        | fixed       | `d0387e7` — `piecesAfterSwap`; `thresholdBeforeSwap` split out                                                                                                                                                                                                  |
| S4    | Spec        | fixed       | `d0387e7` — slot-index order                                                                                                                                                                                                                                    |
| S5    | Spec        | wontfix     | tie-groups follow the displayed sort by design; `setLabel` param is the fix for a real defect (`a778018`)                                                                                                                                                       |
| S6    | Spec        | fixed       | `c945d2c` — comment corrected                                                                                                                                                                                                                                   |
| St1   | Standards   | fixed       | `c945d2c` — what-comments deleted, disclosure points at PLAN.md §14, dead field removed                                                                                                                                                                         |
| St2   | Standards   | defer       | `.scratch/carry-forward/issues/87-set-value-module-shape-cleanups.md` (naming, data clump, exports, digest pin)                                                                                                                                                 |
| 2-A1  | Adversarial | fixed       | `cfc77c9` — worn row from `owned`; runner-up gap over strictly worse rows                                                                                                                                                                                       |
| 2-A2  | Adversarial | fixed       | `cfc77c9` — distinct `unknown-item` cause, checked first, and it warns                                                                                                                                                                                          |
| 2-A3  | Adversarial | fixed       | `cfc77c9` — tie, missing worn row, unindexed item, both constants' boundaries                                                                                                                                                                                   |
| 2-D1  | Domain      | fixed       | `c2d3897` — `p3` added, mirror gated by `scripts/check_curated_set_phase.py` in `pnpm verify`; ticket 102 closed (was `defer` in round 2, fixed this round)                                                                                                     |
| 2-D2  | Domain      | fixed       | `cfc77c9` — Malorne 2pc SE corrected to ±6.6 in code and tickets 92/96                                                                                                                                                                                          |
| 2-St1 | Standards   | fixed       | `cfc77c9` — `formatSetPotentialLine` no longer calls suppression "correct-and-disclose"                                                                                                                                                                         |
| 2-St2 | Standards   | wontfix     | `IMPLAUSIBLE_BONUS_FRACTION`'s docstring is long, but its two calibration anchors are load-bearing and a reader changing the constant must confront them                                                                                                        |
| 2-St3 | Standards   | wontfix     | `formatSetBonusLine`'s docstring records why per-row credit was rejected; that is the pointer-to-the-finding case the comment policy allows                                                                                                                     |
| 2-S1  | Spec        | fixed       | `b51f08c` — ticket 100 closed (was `defer` in round 2, fixed this round)                                                                                                                                                                                        |
| 2-S2  | Spec        | fixed       | `610d6db` — ADR written; ticket 101 closed (was `defer` in round 2, fixed this round)                                                                                                                                                                           |
| 2-S3  | Spec        | wontfix     | flat fraction is disclosed and argued in the docstring; a per-bonus mechanics band needs a table keyed to the pinned Go source, which ticket 97 flags as unverified                                                                                             |
| 2-S4  | Spec        | wontfix     | `formatPackageContents` suppressing contents for `insufficient-pieces` is correct — that reason means the pool cannot build the package, so `packageItemIds` is empty and there is nothing to name                                                              |
| 3-A1  | Adversarial | defer       | `.scratch/carry-forward/issues/127-self-set-confound-reports-a-bare-figure-with-no-qualifier.md` — blocking finding; the arithmetic half is ticket 119 anomaly A, and the suppress-vs-qualify choice this needs is the decision 119 exists to ask the owner for |
| 3-A2  | Adversarial | defer       | `.scratch/carry-forward/issues/128-package-only-chips-outrank-the-source-and-bis-filters.md`                                                                                                                                                                    |
| 3-A3  | Adversarial | defer       | `.scratch/carry-forward/issues/114-gem-quality-null-passes-the-fill-cap-while-undefined-drops.md` — already open, filed 2026-08-11; not triggerable by the committed palette                                                                                    |
| 3-D1  | Domain      | defer       | `.scratch/carry-forward/issues/133-negative-plausibility-band-width-is-inherited-not-measured.md`                                                                                                                                                               |
| 3-D2  | Domain      | defer       | `.scratch/carry-forward/issues/107-candidate-gem-substitutions-undisclosed-in-report.md` — already open; the wording gap in `GEM_POLICY_QUALIFIER` (repair may recolour worn gems) can be closed independently of 107's data work                               |
| 3-D3  | Domain      | defer       | `.scratch/carry-forward/issues/121-no-upstream-ret-p3-curated-gear-set-to-pin.md` — already open; add the reference-gear caveat to ADR-0024 for the +11.31 mana-proc figure, as ADR-0023 carries for its own                                                    |
| 3-St1 | Standards   | defer       | `.scratch/carry-forward/issues/129-package-json-line-endings-flipped-to-crlf.md`                                                                                                                                                                                |
| 3-St2 | Standards   | defer       | `.scratch/carry-forward/issues/130-ticket-117-left-four-stale-descriptions-behind.md` — `gems.ts:47` says meta repair does not cap rarity; it does                                                                                                              |
| 3-St3 | Standards   | defer       | `.scratch/carry-forward/issues/130-ticket-117-left-four-stale-descriptions-behind.md` — `rank-report.ts:340-346`, two collided comment blocks                                                                                                                   |
| 3-St4 | Standards   | defer       | `.scratch/carry-forward/issues/130-ticket-117-left-four-stale-descriptions-behind.md` — `candidate-gems.test.ts:143` name asserts removed behaviour                                                                                                             |
| 3-St5 | Standards   | defer       | `.scratch/carry-forward/issues/87-set-value-module-shape-cleanups.md` — already open; adds the eight open-coded signed-DPS formatters and the `> 0` / `>= 0` inconsistency                                                                                      |
| 3-St6 | Standards   | defer       | `.scratch/carry-forward/issues/87-set-value-module-shape-cleanups.md` — already open; adds `rank-report-rules.ts` changing for four unrelated reasons                                                                                                           |
| 3-S1  | Spec        | defer       | `.scratch/carry-forward/issues/131-adr-0023-decision-5-contradicts-adr-0024.md`                                                                                                                                                                                 |
| 3-S2  | Spec        | defer       | `.scratch/carry-forward/issues/134-usage-string-names-spec-but-not-its-default.md`                                                                                                                                                                              |
| 3-S3  | Spec        | defer       | `.scratch/carry-forward/issues/132-tickets-111-and-112-closed-with-acceptance-boxes-unchecked.md`                                                                                                                                                               |
| 3-S4  | Spec        | wontfix     | `memberPackages` carrying every measured threshold for the set is deliberate, tested, and consistent with the owner's sort rule; the spec sentence understates it but the behaviour is the asked-for one                                                        |
