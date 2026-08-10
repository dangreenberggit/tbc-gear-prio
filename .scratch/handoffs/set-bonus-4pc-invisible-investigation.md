# Handoff: T6 chest/shoulders never surface, even with set-bonus credit on

> **SUPERSEDED IN PART (2026-08-10).** Sims have since been run and every
> open numeric question in this document is now measured. Read
> `.scratch/handoffs/set-bonus-resolution-2026-08-10.md` and
> `.scratch/set-bonus-value/measurements-2026-08-10.md` first.
>
> In particular: the repeated caveat below that **"no sims were run in any part
> of this work"** is no longer true, and the **unresolved factor-of-4
> disagreement about `B`** is resolved. Measured figures: Thunderheart 4pc
> **73.5 +/- 6.3**, Thunderheart 2pc **30.5 +/- 5.5**, Malorne 2pc (`B`)
> **131.1 +/- 6.6**, Malorne 4pc **13.0 +/- 5.5**. The regression camp (100-133)
> was right about `B`; the SME domain camp (15-40) was wrong. All six code
> tickets landed. Do not carry this document's open questions forward without
> checking them against the resolution handoff.


## Read this first — reliability of the claims below

This investigation went through **many** rounds of correction. Multiple
claims were stated confidently in earlier passes and later retracted by a
subsequent pass. **Treat no figure in this document as settled without
re-verifying it against a committed artifact.**

Claims retracted during this work, compactly:

- (a) **"`packageDelta` 64.07 < 76.50 proves inflation"** — wrong.
  `packageDelta` bundles raw stat value together with set bonuses; it cannot
  isolate either one, so a low `packageDelta` next to a large `bonusDps` is
  not evidence of anything.
- (b) **"~4x inflated, true value 30–60 DPS"** — unsupported. Superseded by
  ticket 92's reframing: there is an unresolved disagreement, not a settled
  correction factor.
- (c) **The V0b/V0c evidence chain** — cited repeatedly as evidence of this
  confound's magnitude. Does not apply: V0b was k=1, where the confound's two
  charges cancel exactly and no inflation occurs. See ticket 93.
- (d) **Head slot cited as Malorne-toll evidence** — wrong. It is Wolfshead
  Helm, `setId: null`, an unrelated unique-effect item, not a set-break toll.
- (e) **"28 JSON artifacts" (evidence-base limits, below)** — wrong. There
  are 16 `.json` files under `.scratch/rank-reports/`, not 28. The
  substantive point (only shredzepelin carries `setContext`) is unaffected.
- (f) **`B̂ ≈ 116` relayed as a working figure** — disputed. Regression
  evidence puts B at 100–133; independent SME domain reasoning puts it at
  15–40. **Unresolved** — see ticket 92, substantially rewritten 2026-08-10.
- (g) **"corrected Thunderheart 4pc ≈ 78"** — derivation invalid. It happens
  to land inside the SME's plausible band by coincidence, but does not
  arithmetically reconcile with the SME's own B estimate (which would give
  ~125–145, not 78). Do not cite 78 as a corrected value.
- (h) **"only chest and shoulder lack positive candidates"** — wrong. Four
  slots do (chest, head, shoulder, ranged), for three different reasons. See
  ticket 94's correction.

What has **survived** every pass, and it is narrow:

1. The 4pc figure reaches no row in any display mode — the string
   `193.889` appears nowhere in `ranking.items`.
2. Upstream's own P3 BiS gear set equips all four Thunderheart pieces, while
   our engine ranks two of those same items (chest, shoulder) at roughly
   −100 DPS. See ticket 96.
3. The synergy arithmetic (`computeSynergy`) reproduces bit-exactly against
   the artifact's own stored fields, confirmed by an independent audit.
4. k=2 for both the Thunderheart and Nordrassil 4pc packages, verified three
   independent ways.

The live unresolved disagreement: regression evidence says B ≈ 116–133
(three independent estimators agree within that band); SME domain reasoning
says B ≈ 15–40. **Unresolved.** Ticket 92 specifies the deciding sim (swap
one Malorne piece for a stat-identical non-set item and measure directly).

**No sims were run in any part of this work**, at any stage, by any pass.
Every figure in this document and in tickets 90–96 is read from committed
JSON or computed arithmetically on top of it. The pipeline was understood by
reading code, not by executing it.

---

For the agent picking up set-bonus display work off `feat/set-bonus-value`.

Written 2026-08-10. Read-only investigation — no production source changed,
no sims run, no artifacts regenerated. All findings are read from committed
JSON and source, or arithmetic on top of them.

## What was asked

The user reported that T6 gloves and legs (Thunderheart Gauntlets/Leggings)
rank normally, but T6 chest and shoulders (Thunderheart Chestguard/Pauldrons)
never rank — not at `off`, `weighted`, or `full` set-bonus credit. Real-gearing
intuition says T6 chest/shoulders should be strong upgrades over the T4
(Malorne Harness) they replace.

## What was found — three defects

- **D1 (ticket 91):** `nextMeasurableThreshold` returns the nearest
  *implemented* threshold above the piece count after a single swap. With 0
  Thunderheart pieces worn, every single-swap candidate lands at
  `piecesAfterSwap=1`; since Thunderheart's 2pc is implemented, the walk
  stops at 2 and never reaches 4. The measured 4pc bonus (193.89) is
  credited to no row in any display mode. Systemic: fires for 4 of 6 known
  sets whenever the player wears fewer than 2 pieces — the feature's own
  primary use case.
- **D2 (ticket 90):** the set-break confound. A completion package that
  displaces pieces of another set the player is already wearing has that
  broken bonus's DPS charged once in `packageDelta` but k times across
  `Σ singles` (k = slots displaced), so `bonus_reported = bonus_true +
  (k-1)·B`. Both Thunderheart 4pc (193.89) and Nordrassil 4pc (185.10) have
  k=2 (both displace the worn Malorne 2pc), so both are inflated by one `B`.
  Under `full` credit this inverts the sets: Nordrassil Chestplate shows
  +74.20, above the strictly-better Thunderheart Chestguard at −68.70 — an
  inversion produced by which set is more confounded, not by DPS.
- **D3 (ticket 94, low priority):** the naive "best delta per slot ≈ 0"
  dead-zone scan over-collects three different phenomena (real set-break
  tolls, benign "pool has nothing better", and unrelated unique-effect
  items). Any future detector must join against the worn item's `setId`
  rather than reading gap magnitude alone.

## Corrections made during the investigation — stated plainly

Each of the following was relayed as fact by an earlier pass before a later
pass corrected it. Do not re-cite the earlier version.

1. **"`packageDelta` 64.07 < 76.50 (2pc's packageDelta) shows the 4pc is
   inflated"** — wrong. `packageDelta` bundles raw stat value with set
   bonuses and cannot isolate either; strong T6 stats legitimately
   compensate for a packageDelta that looks low. This comparison is not
   evidence of anything about the bonus's magnitude.
2. **"~4x inflated, true 4pc value 30–60 DPS"** — not supported. The `B`
   required to bring 193.89 down to 30–60 is 134–164, which is 7–9x the
   same set's own measured 4pc (Malorne, 18.04) — implausible as a 2pc
   value. The revised estimate at the time was ~2.5x inflation: Thunderheart
   4pc ≈ 78 (from `B̂ ≈ 116`, itself an estimate). **SUPERSEDED (2026-08-10):**
   the ≈78 figure does not survive either — its derivation subtracts a B
   that is itself disputed by a factor of ~4 (SME domain reasoning: B ≈
   15–40, not ~116), and even taking B≈116 at face value, ≈78 does not
   arithmetically reconcile with the SME's own plausible-B range (which
   would give ~125–145, not 78). Do not cite either figure. See ticket 92,
   substantially rewritten, for the current unresolved state.
3. **The V0b/V0c evidence chain (verification.md) was cited twice as
   supporting this confound and does not.** V0b's package had k=1 (only one
   Malorne slot displaced), where the confound's two charges cancel exactly
   — V0b was not inflated by this bug. V0b(+91.68) vs V0c(+20.89) compares
   two different sets' different bonuses, not the same bonus with and
   without the break. See ticket 93.
4. **Head slot was cited as Malorne-toll evidence; it is unrelated.** The
   feral head dead zone (−202 to −220 DPS gap) is Wolfshead Helm,
   `setId: null`, a unique on-shift energy effect with no set membership —
   not a set-break toll. See ticket 94.

## Settled — do not reopen

- **spec.md §2.1**: do not split a set bonus's value per piece. The
  measurement side already honours this (bonus is attached whole per
  (set, threshold)); the design review notes the irony that the later
  display weighting (`weighted`/`full` toggle) violates its spirit by
  smearing fractions onto member rows anyway.
- **spec.md §7**: multi-item bundles as ranked units are out of scope.
  Package-aware ranking (design review's R6) is explicitly deferred, not a
  candidate fix.
- **ADR-0020**: the cutoff is absolute; a filter never moves the bar. "Lower
  the cutoff so chest/shoulders surface" is foreclosed by this — and
  independently, the investigation confirmed no plausible cutoff change
  reaches these rows (they miss by ~72 DPS even at `full` credit's best
  case).
- **PLAN.md:272**: disclosure over correction for set-break negatives is
  the accepted default — negative deltas on BiS rows via a set break are
  correct and expected, keep the signed delta visible. What PLAN.md did not
  anticipate is the *slot-level* version (D3): an entire slot uniformly
  negative conveys no ranking information, which is narrower than the
  item-level case it did anticipate.

## Evidence-base limits

- Only 5 of 28 JSON artifacts under `.scratch/rank-reports/` and
  `data/universes/` carry any `setContext` at all, and all five are
  shredzepelin (feral) — four P2 (byte-identical in every field this
  investigation reads), one P3. **SUPERSEDED (2026-08-10 adversarial
  audit):** the "28" denominator does not reproduce. `.scratch/rank-reports/`
  contains 16 `.json` files (42 files total, including `.html`), not 28; 5
  of those 16 carry `setContext`, all shredzepelin. The numerator (5) and
  the substantive conclusion (only shredzepelin has been exercised) are
  unaffected — see `.scratch/set-bonus-value/audit-2026-08-10-numbers.md`
  C8.
- **There is no committed ret artifact with `setContext`.** Every claim
  about ret in the three source reports (whether D1/D2 reach ret, whether
  ret's dead zones are benign) is inference from `IMPLEMENTED_IN_SIM` and
  `verification.md` V1, not observation. Confirming costs one `pnpm rank`
  on `ret-p3` with `--with-set-potential`, not run here.
- `B̂ ≈ 116` (the Malorne 2pc's estimated DPS value, used to de-confound
  ticket 90's figures) is a regression estimate from a crude stat proxy,
  not a measurement. **SUPERSEDED (2026-08-10):** treating 116 as a working
  figure at all is now disputed — independent SME domain reasoning puts the
  same quantity at 15–40 DPS, a factor-of-4 disagreement neither side has
  measured directly. See ticket 92, substantially rewritten, and the
  disclaimer at the top of this document.
- **No sims were run in any part of this work.** Every number in the three
  source reports and in tickets 90–96 is read from committed JSON or
  computed arithmetically from it.

## Where the full reports live

- `.scratch/set-bonus-value/investigation-2026-08-10-t6-4pc-invisible.md`
  — root-cause investigation for D1/D2/D3 on shredzepelin-p3.
- `.scratch/set-bonus-value/break-confound-correctability.md` — derivation
  of whether the D2 confound is arithmetically correctable, and the `B̂`
  estimate.
- `.scratch/set-bonus-value/design-review-2026-08-10.md` — generality
  survey across the whole artifact corpus, design options for D1, and the
  smearing-honesty question behind the `weighted`/`full` toggle.

## Tickets filed

90 (bug, break confound), 91 (bug, 4pc unreachable, blocked by 90),
92 (investigation, measure Malorne 2pc — substantially rewritten 2026-08-10,
see "Read this first" above), 93 (docs, docstring fix — widened 2026-08-10),
94 (cleanup, dead-zone detector — corrected 2026-08-10), 95 (bug, worn-set
rows show undeliverable prospective bonus), 96 (bug, BiS-tagged items rank
below cutoff), 97 (investigation, independent plausibility band for the T6
4pc — a falsification test against 92's result), 98 (cleanup, plausibility
gates for set-bonus magnitude and all-negative slots), 99 (investigation,
measure set bonuses in isolation on a reference gear set — may supersede 92's
sim).

## Suggested order, and why it is not ticket order

The numbering is filing order, not work order. Do them in this sequence:

1. **90 first.** It is independent of every other ticket, small, and it is
   the only one where the report is *actively misleading* today rather than
   merely incomplete — it shows a worse item ranked above a better one. Its
   fix (keep any figure with non-empty `breaks` out of the sort key) is
   correct whichever way 92 lands, so it does not wait on a measurement.
2. **99 next, before 92's sim.** It measures a set bonus directly on a
   reference gear set (equip N tier pieces vs N matched non-set items and
   difference) instead of estimating a break toll and subtracting it. That
   removes `B`, `k`, and the regression from the chain entirely, so it does
   not inherit ticket 90's single-scalar-toll model the way 92's correction
   does. It may make 92's sim unnecessary as the primary evidence — run 99
   first and re-read 92's disposition afterward. Verdict recorded in 99: the
   engine can already do this with a standalone script (`compose` accepts any
   equipment array; `scripts/five_seed_spread.py` is the precedent), no new
   plumbing.
3. **92 after 99** — still worth running, because its `B` is what the ranking
   pipeline actually charges, whether or not that matches 99's isolated
   figure. Demoted from primary evidence to cross-check.
4. **91 only after 90 and the measurement (99, and 92 if run).** This is the load-bearing ordering
   constraint, and the reason for its `Blocked by: 90`. Ticket 91 makes the
   4pc bonus reach a row; if it lands while the figure is still confounded,
   it surfaces the *right rows* using a number that the unresolved B
   disagreement (ticket 92) puts anywhere from ~63 to ~145, against a
   reported 193.89 — the exact correction is disputed, but "confounded" is
   not. That is a worse failure than today's, because today's error is
   visible as an absent row while that one would be an authoritative-looking
   wrong number driving the sort. Right answer, wrong reason.
5. **93 and 94** are cheap, independent, and can go at any point.
6. **95** is independent and small — a two-row display bug (~18 DPS max),
   unrelated to the confound math. Can go at any point, does not block or
   get blocked by anything above.
7. **96** is the most user-facing symptom (a "BiS" badge on a below-cutoff
   row) but may **dissolve** once 90/92 land rather than need its own fix —
   check its disposition after 92's measurement lands before starting work
   on it directly.
8. **97** is most useful *after* the measurement — it is a falsification test
   against whichever corrected 4pc figure lands first (99's direct figure or
   92's corrected one), against a mechanically-derived band ~60–120 DPS,
   centre ~95. Not a competing estimate. Not urgent; not blocked, but reading
   it before a measurement exists gives a number with nothing yet to check it
   against.
9. **98** is independent and not urgent — two cheap automated gates
   (implausible-magnitude, all-negative-slot) that would have caught this
   whole episode sooner. Can go at any point; most naturally follows once
   90's suppression and 94's `setId` join exist, since the second gate
   reuses that join, but does not require them first.

Ticket 91 also carries a design decision (per-row smear vs package-as-card)
that should not be made until 92's measurement exists — the design review
argues the destination is package-as-card, which needs no per-row number at
all and would make the 91/90 dependency moot.
