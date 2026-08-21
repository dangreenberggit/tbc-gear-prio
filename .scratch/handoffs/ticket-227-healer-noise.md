# Ticket 227 — healer items above the feral cutoff, measured

Ticket 227 reports ten healer-statted items scoring +4.61 to +7.80 DPS for a
feral druid and clearing the cutoff, and offers a hypothesis it explicitly
marks untested: that these are **noise-positives**, because the fixture's SE
at 3,000 iterations is about the same size as the cutoff.

**The hypothesis is refuted, and the real mechanism is identified.** The rows
are not noise. They survive 10x the iterations and reproduce across five
independent seeds. Healer stats *are* reaching the DPS calculation, by a route
neither the ticket nor the SME considered: **this feral is mana-starved on
this fixture, so intellect and mp5 buy real DPS.**

**Requires the gitignored binary.** `vendor/` is not committed; fetch with
`pnpm fetch:wowsimcli`, which must report `v0.0.101`. Every arm below is the
ranker's own captured request replayed through the pin, and
`measure-direct-sim-sanity.ts` establishes that such a replay reproduces the
recorded DPS exactly.

```
npx tsx packages/core/test/measure-ticket-227-direct.ts
```

---

## Verdict

1. **Not noise.** At 30,000 iterations, **9 of the 10 still clear the
   cutoff**. The two largest rows *grew* (+7.80 -> +8.17). Only Mender's
   Heart-Ring collapsed below the line (+4.61 -> +1.60). The noise hypothesis
   predicts collapse across the board; that did not happen.

2. **Reproducible across seeds.** Five independent seeds at 3,000 iterations
   give 29308 a delta of 6.61-7.17 (mean 6.82, **sd 0.212**). A noise
   artifact does not have a standard deviation of 0.2 DPS across independent
   random streams.

3. **The mechanism is mana, and it was measured, not guessed.** Isolating each
   stat of Band of Eternity (29308) through `bonusStats`, leaving gear
   untouched:

   | added stat | delta DPS at 30,000 it |
   | --- | --- |
   | intellect 25 | **+29.92** |
   | mp5 10 | **+13.17** |
   | healing power 64 | 0.0000 |
   | spellpower 22 | 0.0000 |
   | stamina 28 | 0.0000 |
   | all five together | +44.82 |

   Healing power and spellpower contribute **exactly nothing**, as the SME
   expected. Intellect and mp5 do not.

4. **It is a hard mana constraint, not a linear stat conversion.** Both stats
   saturate at the same ceiling, which is the signature of running out of
   mana rather than of a stat weight:

   | added stat | delta DPS |
   | --- | --- |
   | int +25 | +29.92 |
   | int +250 | +156.52 |
   | int +2500 | +157.13 |
   | mp5 +10 | +13.17 |
   | mp5 +100 | +130.57 |
   | mp5 +1000 | +156.76 |

   Both converge on about +157 DPS. Past that point the feral is no longer
   mana-limited and further mana is worthless.

5. **Why this character is mana-starved.** The skeleton
   (`data/presets/feral/p2.raid-sim-skeleton.json`) runs a **180-second**
   encounter with raid buffs that include Arcane Brilliance and Divine Spirit
   but **no Blessing of Wisdom and no Innervate**. Over three minutes of
   shifting and ability use that is a genuinely mana-constrained
   configuration. The sim is right; the fixture's raid setup is what makes
   mana scarce.

   **Correction (ticket 241, 2026-08-20):** this paragraph originally also
   denied the presence of a mana spring totem. That was false. The
   skeleton does carry `manaSpringTotem` and `judgementOfWisdom` --
   `grep -n "manaSpringTotem\|judgementOfWisdom"
   data/presets/feral/p2.raid-sim-skeleton.json` returns lines 1134 and 1196.
   The character is mana-starved *despite* both. The Blessing of Wisdom and
   Innervate halves of the claim stand: grep finds neither.

**So: the ten rows are correctly simulated, and they are also misleading as
loot advice.** They are real DPS gains for *this* character in *this* raid
configuration, and a player with a Blessing of Wisdom in the raid would see
them collapse toward zero. That makes this a product question, which is
exactly what 5e is — and the answer now matters more than the ticket assumed,
because "it is just noise, ignore it" is no longer available.

**Reproducing the stat isolation.** The probe adds a flat stat bundle through
the player's `bonusStats` and leaves gear untouched, so nothing but the named
stat moves. It was run from a throwaway script against
`packages/core/test/direct-sim-support.ts`; the reusable pieces
(`captureFeralP3`, `simDirect`) are committed, and the bundle is six lines:
set `raid.parties[0].players[0].bonusStats.stats[i] = v` on a
`structuredClone` of `cap.baselineReq`, then `simDirect(clone, {iterations:
30000, seed: 42})`.

**A worked cross-check of the swap being measured.** The 29308 arm changes
exactly one slot, `finger1`, replacing the worn 30365 Overseer's Signet
(str 25, agi 15, melee hit 10). Emptying that slot entirely costs -38.93 DPS
at 30,000 iterations, so the worn ring is contributing real value and the
healer ring still beats it by +8.17. The healer stat line is not winning
because the incumbent is worthless.

---

## The ticket's table, re-derived on the tip fixture

Ticket 227's own figures — 86 above cutoff, pool 398, SE 2.9605 — are from the
fixture **before** the re-record in `57ec814`. All ten still clear the cutoff
on tip; the pool is 365 and the above-cutoff count is 85.

```
=== The ticket's table, re-derived on the tip fixture ===

  Ticket 227's own figures (86 above cutoff, pool 398, SE 2.9605) come
  from the fixture as it stood BEFORE the re-record in `57ec814`. The
  numbers below replace them; the ticket's are not quoted as current.

  pool 365   above cutoff 85   recordings 428   iterations 3000   seed 42
  baseline 1952.5249585538932
  mean stdev 163.2429   SE@3000 = 2.9804 DPS
  cutoff: absDps arm 3.60 DPS, pct arm 2.9288 DPS (0.15% of baseline) -> effective 2.9288 DPS
  SE is LARGER than the effective cutoff (2.9804 vs 2.9288) — the ticket's central point.

  id      slot     delta    ownSE   sigma  clears  name / stat line
  29308   finger     7.80   2.808   2.62  yes     Band of Eternity
                                        sta 28, int 25, healing 64, spellpower 22, mp5 10
  29309   finger     7.80   2.808   2.62  yes     Band of the Eternal Restorer
                                        sta 28, int 25, healing 64, spellpower 22, mp5 10
  32609   feet       7.62   2.976   2.56  yes     Boots of the Divine Light
                                        sta 47, int 24, healing 73, spellpower 25, spirit 24, stat31 162
  32516   wrist      7.53   2.785   2.53  yes     Wraps of Purification
                                        sta 24, int 25, healing 53, spellpower 18, stat31 94, mp5 7
  29920   finger     6.37   2.827   2.14  yes     Phoenix-Ring of Rebirth
                                        int 24, healing 55, spellpower 19, mp5 10
  29984   waist      6.10   2.842   2.05  yes     Girdle of Zaetar
                                        sta 22, int 23, healing 73, spellpower 25, spirit 24, stat31 227
  29989   back       5.95   2.812   2.00  yes     Sunshower Light Cloak
                                        sta 18, int 24, healing 77, spellpower 26, spirit 20, stat31 116
  28822   neck       5.81   2.806   1.95  yes     Teeth of Gruul
                                        int 21, healing 46, spellpower 16, spirit 19, mp5 8
  29307   finger     5.16   2.751   1.73  yes     Band of Eternity
                                        sta 24, int 22, healing 55, spellpower 19, mp5 8
  28661   finger     4.61   2.737   1.55  yes     Mender's Heart-Ring
                                        sta 18, int 21, healing 44, spellpower 15, spirit 19

  10 of the ten still clear the cutoff on tip.
```


## 5a. Do the healer rows survive more iterations?

```
=== 5a. do the healer rows survive 30,000 iterations? ===

  baseline @30000, seed 42: 1954.5592 DPS (SE 1.0389)

  id      recorded@3000   direct@30000     ownSE   SE(Δ)<=  clears  name
  29308       7.80          8.17       0.876   1.359   yes    Band of Eternity
  29309       7.80          8.17       0.876   1.359   yes    Band of the Eternal Restorer
  32609       7.62          9.31       0.904   1.377   yes    Boots of the Divine Light
  32516       7.53          5.01       0.880   1.361   yes    Wraps of Purification
  29920       6.37          6.80       0.883   1.363   yes    Phoenix-Ring of Rebirth
  29984       6.10          5.02       0.891   1.368   yes    Girdle of Zaetar
  29989       5.95          4.33       0.884   1.364   yes    Sunshower Light Cloak
  28822       5.81          3.95       0.882   1.363   yes    Teeth of Gruul
  29307       5.16          4.93       0.876   1.359   yes    Band of Eternity
  28661       4.61          1.60       0.891   1.368   NO     Mender's Heart-Ring

  6 of 10 moved toward zero at 10x the
  iterations. The hypothesis predicts they collapse below the cutoff;
  holding at +5..+8 DPS would refute it and mean healing stats are
  genuinely reaching the DPS calculation.

  --- empirical SE of the delta, seeds 11/22/33/44/55 @3000

  Same-seed arms share the random stream, so their difference is
  correlated and its spread across seeds is the honest error bar —
  smaller than combining two independent per-arm SEs would suggest.

    29308  deltas 6.61, 6.72, 6.78, 7.17, 6.80
           mean 6.82  sd 0.212  SE(mean of 5) 0.095
    28822  deltas 4.72, 4.84, 5.58, 5.77, 5.63
           mean 5.31  sd 0.489  SE(mean of 5) 0.219
```

**Answer — no collapse. The hypothesis is refuted.**

Nine of the ten still clear the cutoff at ten times the iterations, and the
two largest rows grew rather than shrank. The one genuine casualty is 28661
Mender's Heart-Ring, which had the smallest delta and the least intellect of
the ten; it falls from +4.61 to +1.60 and drops below the line. That single
collapse is what the hypothesis predicted for all ten.

The seed sweep is the stronger evidence, because it varies the random stream
rather than merely lengthening it. Across seeds 11/22/33/44/55 the delta for
29308 is 6.61, 6.72, 6.78, 7.17, 6.80 — **sd 0.212 DPS**. Noise does not
reproduce to a fifth of a DPS across five independent streams.


## 5b. Is any healer stat reaching the DPS calculation?

```
=== 5b. do healer stats carry EP weight for feral? ===

  data/presets/feral/p1.ep-weights.json keys:

      0  str          0.78
      1  agi          1.16
     17  AP           0.35
     19  ?            0.35
     20  melee-hit    1.02
     21  melee-crit   0.77
     22  ?            0.41
     23  ?            0.16
     24  ?            1.02
     41  ?            3.13

  Healer stat indices (int 3, healing 4, spellpower 5, spirit 16,
  mp5 35) present in the weights: NONE.

  What EP does and does not do. `orderCandidatesByEp` (rank.ts) uses
  these weights to ORDER the pool, which decides what gets simmed
  first and, under racing, what gets promoted. The delta itself comes
  from the sim, not from EP. So a non-zero weight would explain pool
  membership and ordering; it could not by itself produce a positive
  DPS delta. With no healer stat weighted at all, EP is not even the
  membership explanation here — pool membership comes from the
  universe and the phase filter.
```

**Answer — not through EP, and EP was never the candidate.** No healer stat
index carries a feral EP weight, so EP explains neither the delta (which comes
from the sim) nor pool membership (which comes from the universe and the phase
filter). EP only orders the pool.

**But healer stats do reach the DPS calculation — through mana.** The
isolation probe in the Verdict above is the answer to this criterion: adding
intellect alone is worth +29.92 DPS and mp5 alone +13.17, while healing power,
spellpower and stamina are worth exactly 0.0000. The route is not a stat
weight; it is that the character runs out of mana and these stats buy casts.


## 5c. Per-item variance, not the pool mean

```
=== 5c. per-item variance, not the pool mean ===

  The sigma column above uses one fixture-wide mean stdev. Each row's
  own recorded `stdev` and `iterationsDone` are what its own sigma
  should rest on. They are joined back through the captured request's
  `simCacheKey` — the same identity the recorder wrote them under, so
  this is that row's variance and not a lookup by name.

  id      delta   ownStdev  iters   ownSE   d/ownSE  (d-cut)/ownSE  name
  29308     7.80    154.91   3000   2.828     2.76           1.72   Band of Eternity
  29309     7.80    154.91   3000   2.828     2.76           1.72   Band of the Eternal Restorer
  32609     7.62    163.00   3000   2.976     2.56           1.58   Boots of the Divine Light
  32516     7.53    152.53   3000   2.785     2.70           1.65   Wraps of Purification
  29920     6.37    155.59   3000   2.841     2.24           1.21   Phoenix-Ring of Rebirth
  29984     6.10    155.68   3000   2.842     2.15           1.12   Girdle of Zaetar
  29989     5.95    154.02   3000   2.812     2.12           1.07   Sunshower Light Cloak
  28822     5.81    153.67   3000   2.806     2.07           1.03   Teeth of Gruul
  29307     5.16    154.06   3000   2.813     1.83           0.79   Band of Eternity
  28661     4.61    149.93   3000   2.737     1.68           0.61   Mender's Heart-Ring

  Pool-wide mean SE for comparison: 2.9804 DPS. A row whose own
  SE is close to that is fairly described by the pooled sigma; one that
  is not needs its own. The last column is the one that matters for
  "is this row really above the line": distance past the cutoff
  measured in that row's own error bars.
```

**Answer.** Each row's own SE is close to the pool-wide mean of 2.9804 DPS
(the spread is 2.737 to 2.976), so the ticket's use of a pooled sigma did not
distort its picture — the per-item figures tell the same story. The last
column is the honest one: distance past the cutoff in that row's own error
bars, which ranges from 0.61 to 1.72. On the 3,000-iteration fixture alone,
every one of these rows is inside 2 sigma of the boundary, which is why the
noise hypothesis looked so plausible before it was tested at 30,000.


## 5d. How many non-healer rows are also boundary cases?

```
=== 5d. how much of the above-cutoff set is boundary noise? ===

  rows clearing the cutoff:            85
  of those, delta - cutoff < 1x ownSE: 16
  of those, delta - cutoff < 2x ownSE: 34
  effective cutoff 2.9288 DPS

  Consequences, stated as consequences and not acted on here:

  - `synthetic-fixtures.test.ts` asserts an aboveCutoffCount on this
    fixture. If a large share of that count sits within its own error
    bar of the boundary, the assertion is pinning a number that a
    re-record at a different seed would move — it is a change detector,
    not a correctness gate. Changing it is out of scope here.
  - Ticket 225 closed on the band-above rows. Those rows carry ordinary
    stat-driven deltas, so this does not reopen it, but the count it
    reasoned over has the same error bar.
```

**Answer — 34 of the 85 above-cutoff rows sit within 2x their own SE of the
boundary, and 16 within 1x.** Stated as consequences, not acted on here:

- `synthetic-fixtures.test.ts` asserts an `aboveCutoffCount` on this fixture.
  With 40% of that count inside two of its own error bars of the line, the
  assertion is pinning a number a re-record at a different seed would move. It
  is a change detector, not a correctness gate. Changing it is out of scope
  for this ticket — the plan's Out of scope names it explicitly.
- Ticket 225 closed on the band-above rows, which carry ordinary stat-driven
  deltas. This does not reopen it, but the count it reasoned over carries the
  same error bar.

Note this is a *smaller* worry than 5a's finding first suggested. The rows
near the boundary are not thereby noise — the healer rows were near the
boundary and turned out to be real. What 5d establishes is that the count is
imprecise, not that the rows are wrong.


## 5e. Should role-inappropriate items be pooled at all?

**This is a product question and is not answered here.** The executor cannot
rule on it. It is recorded with options, precedent and a recommendation so the
owner can. Ticket 227's checkbox stays open, and the ticket stays `open` with
this as its one remaining criterion.

**The measurement changes the question.** The script's own printed
recommendation was written before the mana mechanism was found and is
superseded by what follows.

- **Option 1 — exclude, as ticket 171 did.** Precedent: ticket 171's
  resolution (2026-08-15) excludes stub-only items from the pool. The
  precedent does not transfer cleanly. Ticket 171 excluded items the sim
  *could not score* because their effects were unimplemented stubs. These
  healer items are scored correctly and really do produce DPS for this
  character. Excluding them would be suppressing a true measurement because we
  dislike the answer.
- **Option 2 — keep and caveat.** Keep them in the pool and make the report
  say why a healer ring is showing as an upgrade: the character is
  mana-limited in this raid configuration, and the gain is mana, not healing.
- **Option 3 — keep as-is.** Only defensible if the reader is assumed to know
  that a +5 DPS row on a healer ring means something other than what it looks
  like. They will not.

**Recommendation: option 2, and treat the underlying condition as the real
finding.** These rows are a true signal about the *fixture's raid setup*, not
about healer gear. A feral in a raid with Blessing of Wisdom would not see
them. Two things follow, both for the owner to rule on:

1. Whether the report should caveat mana-driven upgrades.
2. Whether `data/presets/feral/p2.raid-sim-skeleton.json` should carry a
   *further* mana-restoring buff, since a 180-second fight with no Blessing
   of Wisdom and no Innervate is arguably not the configuration this
   tool should be advising against. (Corrected per ticket 241: this line
   originally denied the presence of a mana spring totem. The skeleton does
   carry `manaSpringTotem`, line 1134, and `judgementOfWisdom`, line 1196.) **That is the higher-leverage question**,
   because it would move every mana-sensitive row at once rather than
   annotating them.

## 5f. Does one diagnosis explain both tickets?

**No — they are genuinely different mechanisms, so both tickets keep their own
disposition.**

Ticket 226's trinkets contribute *exactly nothing*: three of them return
1920.64 DPS, byte-identical to emptying the slot, so their shared delta is the
incumbent's value showing through. That is deterministic and reproducible, and
has nothing to do with error bars.

Ticket 227's healer rows contribute *something real* — mana — and were
suspected of being noise. Opposite sign, opposite mechanism, and the two
findings do not reduce to each other. Neither ticket is closed with a pointer
to the other; see `.scratch/handoffs/ticket-226-direct-sims.md`.

The one thing they share is a consequence rather than a cause: in both cases
the `impl` / `stub` labels in `data/sim-implemented-effects.json` were
misleading, which is filed separately as ticket 237.
