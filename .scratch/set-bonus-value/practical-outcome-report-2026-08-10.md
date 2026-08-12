# What the set-bonus round changed for you

Written 2026-08-10 on `feat/set-bonus-value`. **Nothing landed, merged, or pushed.**
Audience: you, wearing two hats — the dev who owns the tool, and the feral druid
who reads its output before raid.

Sources: `.scratch/handoffs/set-bonus-resolution-2026-08-10.md` (primary),
`docs/reviews/feat-set-bonus-value.md`, tickets 90–102 under
`.scratch/carry-forward/issues/`, and `git log dev..HEAD`.

---

## 1. The short version

Before this round, the tool's set-bonus numbers had never been checked against a
simulation — every figure came from committed JSON or arithmetic on top of it.
Four measurement campaigns have now been run. One headline number the engine was
reporting (Thunderheart 4pc = **193.89 DPS**) turned out to be inflated about
2.6x, and the reason it was inflated is now understood, disclosed in the report,
and kept out of the ranking sort.

The bigger surprise is not the correction. It is that the **Malorne (T4) 2pc is
worth ~131 DPS** — roughly six times its own 4pc, and comfortably the largest
single set effect measured. That reframes what the T6 chest/shoulder decision
actually costs you.

---

## 2. What the report looks like different now

Five behaviour changes, each tied to a commit on this branch.

**Confounded figures no longer steer the ranking (`283dd0b`, ticket 90).**
When a completion package would break another set's bonus, the resulting figure
is inflated. Those figures are now **zeroed out of the sort key and the cutoff
comparison** while still being printed. This is deliberately *suppression, not
correction* — the tool does not subtract an estimate and hand you a "fixed"
number, because a bonus measured on reference gear is not a bonus on your
character (see §5).

**Set completion is shown as a package card, not smeared across rows
(`915e3a3`, ticket 91).** A 4pc bonus at zero pieces worn belongs to no single
item, so crediting a quarter of it to each piece would have put an
authoritative-looking wrong number into the sort. Instead the Set potential
panel names the package's contents and leads with what completing it *breaks*.
The measurement is what settled this: the smearing option would have been
distributing the inflated 193.89.

**Plausibility warnings (`ccf38be` + `5932162`, ticket 98).** Two warning-only
gates now fire when a set bonus looks implausibly large relative to the rest of
the numbers, or when a gear slot is dead for a reason worth naming. Warnings
only — they never change a rank.

**Dead slots get a cause, not a count (`426a82e`, ticket 94).** "3 dead slots"
became four classified causes (thin pool, unique effect, set-break toll,
benign). And after review, a fifth: `unknown-item`, for when the item cannot be
looked up at all.

**Worn pieces stop advertising a bonus their swap cannot deliver (`d1c2c87`,
ticket 95).** Previously a set piece you already wear could show a prospective
threshold bonus that swapping it could not actually advance. Fixed.

One caveat on all of the above, and it is a real one: the **Set potential panel
is default-off** (ticket 100, open). Unless you pass `--with-set-potential`, the
panel that carries the package explanation does not render — while the
plausibility warnings *do* render unconditionally. So today a warning saying
"check what this package breaks" can appear without the card explaining it.

---

## 3. The measured numbers

All figures: wowsimcli **v0.0.101**, seeds `[11,22,33,44,55]`, **3000
iterations**, re-runnable from committed scripts under
`.scratch/set-bonus-value/`. Full per-seed tables in
`.scratch/set-bonus-value/measurements-2026-08-10.md`.

| bonus | measured | what the engine reported | verdict |
|---|---|---|---|
| Thunderheart (T6) 4pc | **73.5 ± 6.3 DPS** | 193.89 | engine inflated ~2.6x |
| Thunderheart (T6) 2pc | **30.5 ± 5.5 DPS** | 31.46 | engine was right |
| Malorne (T4) 2pc | **131.1 ± 6.6 DPS** | disputed 100–133 vs 15–40 | measured; regression camp was right |
| Malorne (T4) 4pc | **21.7 DPS** (Strength pricing) | 18.04 | engine was fine |

### Why 193.89 was wrong, in plain terms

Your reference feral wears **two Malorne pieces** (shoulder and chest) with a
live, cat-relevant 2pc energy proc. The Thunderheart completion package wants
those exact same two slots. So when the engine measured "what does completing
Thunderheart 4pc get me", the answer it computed silently included **losing the
Malorne 2pc** — and because of how the arithmetic summed the individual pieces,
that loss got charged more than once.

The corrected statement of the confound (ticket 93, `2e0b499`) is:

```
reported = T + (k-1)*B
```

where `T` is the true bonus, `B` is the broken bonus (Malorne 2pc = 131.1), and
`k` is how many package pieces land on slots the broken set was holding. At
k = 2, that is one extra `B` of inflation — about 120 DPS, which is very close
to the gap between 193.89 and the measured 73.5. At k = 0 or k = 1 the inflation
is exactly zero, which is why the Thunderheart **2pc** figure was fine all along.

### Why the Malorne 2pc is worth 131 DPS

This is the finding worth remembering. It is **not** a proc-rate story — the
measured proc rate is only **3.66/min**, close to the low-end estimate that lost
this argument. It is an **energy-starvation** story:

- The 0-piece rotation wastes **5.31%** of its energy income to the energy cap.
- The 2pc's extra energy is **98.8% absorbed** — almost none of it is wasted.
- That converts into **+11.3% Shred casts** (18,472 more Shreds over the run).
- Shred is 35.3% of your damage, so +11.3% Shred alone is ~88 DPS against a
  2226 baseline; the rest comes from the extra combo points feeding Rip and
  Ferocious Bite.

The practical lesson: **an energy proc and a stat stick are not the same
currency.** A flat +30 Strength is worth what Strength is worth (0.7227 DPS per
point, measured, linear across +30/+150/+300). An energy proc is worth whatever
your rotation's unused headroom is worth — which can be enormous. This is why
Malorne's 2pc beats its own 4pc six to one, and why "the 4-piece is the marquee
bonus" is simply false for this set as the sim implements it. Two plausibility
arguments in the original tickets rested on that intuition; both were wrong.

---

## 4. What this means for your gear

**The single T6 chest or shoulder swap really is a downgrade, and the report is
not lying to you.** Ticket 96's contradiction — items tagged BiS while ranking
at −100.16 and −106.16 DPS — is now explained rather than dismissed. Both
numbers are correct:

- Swapping *one* piece in costs you the whole **131 DPS Malorne 2pc** and
  gains you only that one piece's stats. Net: about −100. That is real.
- The BiS tag is also right, because the **completed four-piece Thunderheart
  package** genuinely is the better end state.

So it is a package-vs-single-swap framing problem, not a wrong number. In
practice: **do not take T6 chest or shoulders one at a time and expect a gain.**
The gain arrives when the package completes. If you are going to break Malorne,
break it with a plan to finish.

**Is Thunderheart 4pc actually better than Nordrassil 4pc?** Yes, but only by
**8.79 DPS** — and that specific figure is unusually trustworthy. It is a
difference of two packages that break the *same* Malorne 2pc in the *same* two
slots, so the confound cancels identically and the residual is exact
(`.scratch/set-bonus-value/break-confound-correctability.md`,
`audit-2026-08-10-numbers.md` §C5). What that subtraction does **not** prove is
either bonus's absolute value — it is scale-free. Treat **8.79 as exact and the
absolute 73.5 as a measurement with a ±6.3 error bar.**

Put together: the 4pc tier bonus itself is a modest ~73 DPS. The thing you are
paying for it with — 131 DPS of Malorne 2pc — is larger. The package still wins
because you also collect four pieces' worth of item stats on the way, but the
margin is narrower than a 193.89 headline suggested.

---

## 5. What you should *not* read into these numbers

**These are reference-gear figures, not your character's figures.** Every number
above was measured on a fixed reference set (`feral_p3_9p` for Thunderheart,
`feral_p2_9p` for Malorne). An energy-throughput bonus scales with how
energy-starved your rotation is, so 131.1 is *that gear's* value for the Malorne
2pc, not yours. This is exactly why ticket 90's fix suppresses rather than
corrects, and why 73.5 and 131.1 appear in the codebase **only in comments as
calibration provenance, never in an expression** — confirmed by the spec review
axis.

**These numbers will shrink as you gear up. (Untested.)** Energy waste fell from
5.31% to 3.21% across the arms measured, so the Malorne 2pc's value plausibly
drops on later-phase gear — more attack power means each Shred is worth more but
the extra energy has less idle headroom to fill. This direction is a
**hypothesis from the measured waste trend, not a measured result.**

**The Thunderheart run is not phase-matched.** It uses the p2 skeleton for P3
gear, matching production (`cli.ts:282`). That is constant across arms so it
cancels in the differences, but it sets the level at which the bonus was
measured. The Malorne runs *are* phase-matched.

---

## 6. What is still open

| ticket | status | what it means for you |
|---|---|---|
| **96** | **open by design** | The BiS-vs-negative-delta contradiction is explained but not yet *reachable* in the report. Remaining task: confirm a reader on a BiS-tagged negative row can actually get to the package explanation, and add a pointer if not. |
| **100** | **open, do this first** | The Set potential panel is default-off, so the explanation ticket 96 depends on does not render by default. 96's answer depends on this one. |
| **101** | open | No ADR records the set-bonus threshold-selection rule, which has now been decided once and mis-remembered once. |
| **102** | open, latent | `CURATED_SET_PHASE` stops at `p2` where its Python source has `p3`. Harmless until P4 is pinned, then a staleness warning silently stops rendering. |

**Ret is unexercised.** There is no committed ret artifact with `setContext`, so
the dead-slot classifier's "benign" verdict for ret is **inference, not
observation**. Cost to settle: one `pnpm rank` on `ret-p3` with
`--with-set-potential`. **Not run.**

Two constants — `THIN_POOL_CANDIDATES = 4` and `UNIQUE_EFFECT_GAP_DPS = -50` —
are calibrated on a single artifact, **not measured**.

---

## 7. Two things worth trusting more, and one worth trusting less

**Trust more:** the numbers. Every disputed figure is now measured with a
re-runnable command, a pinned toolchain, stated seeds and iteration count. The
one inference that outran its evidence (`B = 193.89 − 73.54 = 120.35`, which
differenced two measurements taken on *different characters*) was caught by
adversarial review and **retracted in the artifacts** rather than quietly
dropped. It landed near the right answer by luck.

**Trust more:** the method. The measurement procedure originally specified in
ticket 99 was itself confounded — it priced replacement pieces by removing one
tier piece from a full 4-set, which drops 4→3 and destroys the 4pc, so summing
four of them subtracted the bonus roughly four times and returned a *negative*
4pc. The rule that came out of it: **never price a stat swap across a
configuration where the number of active set bonuses changes.** Threshold state
is now verified empirically (by reading the player's `resources` array length —
18 streams without the Malorne energy proc, 19 with) rather than assumed.

**Trust less:** green tests as evidence of safety. Pre-merge review found two
high-severity silent failures **inside the dead-slot classifier — the component
added this round specifically to catch silent confounds**. Both survived the
full 615-test suite green. One made a warning vanish entirely on a delta tie;
the other produced a confident "nothing matches this item's effect" verdict when
the truth was "we could not look this item up". Both fixed in `cfc77c9`. The
carry-forward lesson: a safety net that fabricates a verdict when its input is
missing is worse than no net, because a missing warning then reads as evidence
of health.

---

## 8. State of the branch

`pnpm verify` green at `cfc77c9` — 36 test files, 622 tests, 2 todo.
`pnpm land --check-only` green: merge-ready ok, all 30 disposition rows
validated. Review at `docs/reviews/feat-set-bonus-value.md`.

**Not landed. Not merged. Not pushed.**
