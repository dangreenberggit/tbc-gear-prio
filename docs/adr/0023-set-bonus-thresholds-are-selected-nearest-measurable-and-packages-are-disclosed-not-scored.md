# ADR-0023 — Set-bonus thresholds are nearest-measurable, and a package is disclosed rather than scored

**Status:** accepted
**Amended by:** ADR-0024 (2026-08-10) — decision 2 below is relaxed for the
opt-in view only, which may score a member row by the package's own
`packageDeltaDps`. Decisions 1, 3, 4 and 5 stand as written; in particular the
break-confounded `bonusDps` this ADR suppresses is still never ranked on.
**Date:** 2026-08-10
**Implements:** `.scratch/set-bonus-value/spec.md` §2.3, §4
**Tickets:** `.scratch/carry-forward/issues/90-set-break-confound-inflates-bonus-and-inverts-sets.md`,
`91-four-piece-bonus-unreachable-when-two-piece-implemented.md`,
`93-brokensetbonuses-docstring-misdiagnoses-its-worked-example.md`,
`96-bis-tagged-items-rank-below-cutoff-contradiction.md`,
`100-set-potential-panel-is-default-off-so-unreachable-bonuses-stay-unseen.md`,
`101-no-adr-for-set-bonus-threshold-selection.md`
**Origin:** `.scratch/set-bonus-value/design-review-2026-08-10.md`; pre-merge
review of `feat/set-bonus-value`

## Context

A tier set pays out at piece-count thresholds (2pc, 4pc). A ranked row is a
**single swap** — one item into one slot — so a row can advance a set's piece
count by at most one. That mismatch between how bonuses are earned (in packages)
and how the report ranks (one swap at a time) is what this ADR settles.

Three separate defects on `feat/set-bonus-value` turned out to be the same
unwritten decision, which is why it is being recorded now: the rule was decided
once in spec §2.3 and mis-remembered once in a docstring, and its most important
consequence was never written down at all.

### The threshold-selection rule

`nextMeasurableThreshold` (`packages/core/src/set-value.ts`) walks the ordered
thresholds and returns the first one that is both **strictly above**
`piecesAfterSwap` and **implemented in the pinned sim**:

```ts
for (const t of SET_THRESHOLDS) {
  if (t <= piecesAfterSwap) continue;
  if (isBonusImplemented(setId, t)) return t;
}
return null;
```

Spec §2.3 states the rule and works one case: Nordrassil, whose 2pc has no `2:`
key in the Go `Bonuses` map. Because the 2pc is unimplemented the walk skips it,
so a first Nordrassil piece correctly advertises the 4pc Shred bonus. That case
was written down and treated as intended.

### The case the spec omitted, and what it cost

The **symmetric** case was never written down: when the 2pc **is** implemented
and the player wears **0** pieces, every single swap lands at
`piecesAfterSwap === 1`, so the walk stops at 2 and returns 2. Every time. The
4pc is unreachable from any row, in any display mode.

For feral P3 this is not a corner case — it is the marquee bonus. The
Thunderheart 4pc reached no row at all, which is the user-facing complaint in
ticket 91 ("T6 chest/shoulders never surface"). It survived review because it
was an unconsidered _consequence_ of a rule, not a decision anyone had revisited.

### The break confound, and why a correction is not available

Measuring a completion package on a character who already wears another set
displaces pieces of that set. With `B` the displaced set's bonus, `T` the true
bonus, and `k` the number of package slots that displace a piece of the broken
set, the engine's `packageDelta − Σ singles` reports:

```
reported = T + (k−1)·B
```

`k=0` and `k=1` both report `T` exactly — at `k=1` the two charges cancel — and
only `k≥2` inflates. (Ticket 93: the docstring previously said "charged twice",
which mis-diagnoses its own `k=1` worked example as confounded when it is not.)

The magnitude is not academic. On the feral P3 reference character, who wears two
Malorne pieces, the engine reports **193.89 DPS** for the Thunderheart 4pc where
an isolated measurement gives **73.5 ± 6.3** — inflated ~2.6×, because the
displaced Malorne 2pc is itself worth **131.1 ± 6.6 DPS**.

These are **sim-measured**, not estimated. wowsimcli v0.0.101, seeds
`[11,22,33,44,55]`, 3000 iterations; re-runnable:

```
pnpm fetch:wowsimcli
python .scratch/set-bonus-value/measure_set_bonus.py    # Thunderheart, feral_p3_9p
python .scratch/set-bonus-value/measure_malorne.py      # Malorne 2pc (B), feral_p2_9p
```

Full tables: `.scratch/set-bonus-value/measurements-2026-08-10.md`.

No sim can separate `T` from `B` at `k≥2` after the fact — the two are summed
inside one measured delta. So a numeric correction would require knowing `B` for
_this_ character, and `B` is **not a constant**: it is an energy-throughput proc
whose value depends on how energy-starved the rotation is, which is gear- and
phase-dependent. The 131.1 figure is a reference-gear figure, and measured energy
waste already falls from 5.31% to 3.21% across the arms measured.

## Decision

**1. Threshold selection stays nearest-implemented-above.** A candidate's
`nextThreshold` / `prospectiveBonusDps` point at the smallest threshold strictly
above `piecesAfterSwap` whose bonus is implemented in the pinned sim. Thresholds
skipped as unimplemented still appear in `Ranking.setBonuses` carrying their
`unmeasured` reason, never a zero.

**2. A threshold no row can reach is disclosed as a package, not smeared across
rows.** This is design option (d), _package-as-card_. The Set potential panel
names the completing items from `packageItemIds` and states the bonus; no
fraction of it is credited to any member row.

Per-row numeric credit was **rejected** on measurement grounds. Crediting a
fraction of the 4pc to each member row would have put 193.89 — a figure inflated
~2.6× by a confound that cannot be removed — into the sort key, wearing the
authority of a simulated number. A wrong number in the ranking is worse than a
correct number in a panel.

**3. Suppress and disclose; never correct.** A `SetBonusValue` with non-empty
`breaks` is zeroed out of the sort key and the cutoff comparison while still
being rendered, with the break named as a **prefix** so the qualifier arrives
before the figure. No numeric correction is applied anywhere, because `B` is
gear-dependent and no per-character value exists.

**4. Disclosure is not gated on the ranking toggle.** `withSetPotential`
(default off, spec §4) gates the sort key and the per-row column — the things
that move a number. The Set potential panel renders whenever
`ranking.setBonuses` is non-empty. Gating it too meant the one figure that
reaches no row also reached no default reader (ticket 100).

**5. A row may point at the panel, but never restate its figure.** A
curated-BiS row below cutoff renders a text pointer to the Set potential panel
(ticket 96). It carries no number — restating any part of a break-confounded
figure on a row would reintroduce decision 3's failure by another route.

## Consequences

- The 4pc case is legible without being scored. A reader sees what the package
  is worth, which items complete it, and what completing it would break.
- A row can show a large negative delta beside a "BiS" tag and **both are
  correct**: the swap really does forfeit the worn set's bonus, and the
  completed package really is upstream's pick. This is a single-swap-vs-package
  framing mismatch, and it is resolved by disclosure, not by moving numbers.
  ADR-0020 (the cutoff is absolute) independently forecloses lowering the bar to
  surface such rows.
- Ranking remains a statement about single swaps only. Nothing in this feature
  changes what `deltaDps` means.
- **Untested:** whether the 2pc's value shrinks on later-phase gear as energy
  waste falls. The direction is implied by the measured 5.31% → 3.21% trend; the
  magnitude has not been measured.
- Reference-gear caveat: 73.5 and 131.1 are properties of the reference sets they
  were measured on, not per-character constants. They are deliberately **not**
  written into `set-value.ts` as constants.

## Alternatives considered

**Credit a fraction of the 4pc to each member row** (design option (a)).
Rejected on the measurement: the available figure is inflated ~2.6× and cannot
be de-confounded, so this would put an authoritative-looking wrong number into
the sort.

**Subtract the measured `B` from a broken figure.** Rejected because `B` is not
a constant — it is a gear-dependent energy proc, measured on one reference set.
Applying 131.1 to another character would be a fabricated correction.

**Assert `4pc > 2pc` as a plausibility gate.** Rejected because it is
empirically false here: Malorne's 2pc measures **131.1** against its own 4pc at
**21.7**, roughly 6×. An energy proc on a rotation with headroom and a flat +30
Strength stat stick are not comparable currencies, so piece count predicts
nothing. Such a gate would reject a correct measurement. Ticket 98's gates key on
measured magnitude instead.

**Make `withSetPotential` default-on** (ticket 100 option 2). Rejected as
unnecessary: the spec's default-off rationale is about leaving the ranking
untouched, and decision 4 achieves default disclosure without a spec amendment
or any change to the default ordering.
