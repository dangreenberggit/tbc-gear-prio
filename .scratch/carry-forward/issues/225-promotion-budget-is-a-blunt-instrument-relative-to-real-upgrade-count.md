Status: closed
Type: task (design question raised by measurement; no known defect)
Origin: user challenge during the 2026-08-18 review of ticket 221 — "am I
  supposed to believe that 150 items provided a DPS increase... but that
  modest upgrades didn't make the list until it was expanded to 210? this is
  suspect. it should be suspect."
Blocks: none
Blocked by: none

# The screening ranking is unreliable exactly where `promoteTopK` cuts it

## The challenge, and why it is well aimed

Ticket 221 raised `DEFAULT_PROMOTE_TOP_K` from 150 to 210 because seven
above-cutoff rows were being screened out of the 398-candidate feral P3 pool.
That is a real measured miss and the fix is sound as far as it goes. The
challenge is aimed one level up: **the budget is a blunt instrument and its
size is now hard to justify from first principles.**

Numbers, all from the committed `feral-p3` fixture:

```
python -c "import json; r=json.load(open('packages/core/test/fixtures/synthetic-roster-recordings.json'))['rows']['feral-p3']; print(r['poolSize'], r['aboveCutoffCount'])"
# 398 86
```

- Eligible candidates: **398**
- Actually above cutoff (>= 3.6 DPS or >= 0.15%, `cutoff.ts:27` `CUTOFF_FERAL`): **86** = 21.6% of the pool
- Careful sims performed at K=210: **210** = 52.8% of the pool

So the tool full-sims **more than half the pool to find the fifth of it that
matters**. `promoteTopK` is not a count of upgrades and was never meant to be —
it is a budget for "how many of the screening ranking's top rows do we re-check
properly". But the gap between 210 and 86 is the measure of how imprecise the
screening ranking is, and it has grown.

## The cost, measured

From ticket 221's execution report, full sims / eligible at K=210:

| fixture | ratio |
| --- | --- |
| feral P2 (246 eligible) | **0.9837** |
| feral P3 (398 eligible) | 0.6457 |

On the P2 pool, racing now performs **98% of the work a full sweep would**.
The screening shortcut has very nearly stopped being a shortcut there. §6.4's
stated target was <= 0.4.

## What the fixture shows

The user pressed the point that matters: if we re-check 150 candidates and a
genuine upgrade **still** misses the list, the ranking that produced those 150
is the problem, not its length. The fixture says exactly that.

Density around the cutoff, computed from the committed `feral-p3` recordings
(461 rows, 3,000-iteration truth):

```
rank  86:  1958.33 DPS   77 items within +/-1 screening SE
rank 150:  1950.44 DPS   86 items within +/-1 screening SE
rank 195:  1945.24 DPS   77 items within +/-1 screening SE
rank 210:  1943.18 DPS   75 items within +/-1 screening SE

gap rank 86 -> rank 150:  7.89 DPS = 1.54 x SE
gap rank 86 -> rank 210: 15.15 DPS = 2.95 x SE
```

Screening SE is **5.128 DPS** at 1,000 iterations (ticket 222, verified against
the fork source). Consecutive items near the cutoff differ by roughly **0.1
DPS**. So at any rank in this region, **~80 items are statistically tied**, and
the entire span from the last real upgrade (86) to the shipped budget (210) is
**under three noise-widths**.

Raising K from 150 to 210 did not make the ranking more accurate; it widened
the net over a region the measurement cannot order. The fix works empirically —
zero misses over 30 draws — but the sweep cannot say whether 210 has margin or
is one unlucky draw from failing.

**What is NOT established here:** whether any of this matters to output quality.
If the items packed near the cutoff are genuinely interchangeable — as ticket
222 found the trinkets to be — then a screen that cannot order them is behaving
correctly, and the only real defect is presenting them as if it had. Nobody has
looked at what those items actually are. That check is cheap and should come
before any redesign.

## The cutoff is smaller than the noise that decides it

```
feral cutoff (cutoff.ts:27 CUTOFF_FERAL.absDps):  3.6 DPS
screening SE at 1,000 iterations:                 5.128 DPS
```

The threshold for "is this an upgrade at all" is **smaller than the error bar of
the measurement used to screen against it**. Splitting the 86 above-cutoff rows
by that error bar:

```
clearly above cutoff (delta > cut + 1 SE):   45
within +/-1 SE of the cutoff (undecidable):  77
```

So "86 upgrades" is **~45 solid upgrades plus 77 rows inside one error bar of
the line**. Screening cannot classify that band at any budget, because the
question is finer than the instrument. Whether the band deserves classifying is
the open question above. Every figure in the two blocks above is reproduced by:

```
node .scratch/carry-forward/probes/225-cutoff-density.mjs
```

which reads only the committed fixture
(`packages/core/test/fixtures/synthetic-roster-recordings.json`).

## The question this ticket exists to answer

**Nobody has ever stated what recall this system is buying, or at what
confidence.** `promoteTopK` was set by sweeping until the observed miss count
hit zero on 30 draws. That is a stopping rule, not a specification. It cannot
tell you whether 210 is generous or barely adequate, and it cannot survive a
change to the pool without another sweep.

The concrete question: **what fraction of genuinely above-cutoff items must
survive screening, with what probability, and what is the cheapest rule that
achieves it?** Until that target exists, every K is equally arbitrary.

## A caution: "use a noise band instead" is not automatically an improvement

The obvious alternative is to promote by measured noise rather than by rank
position. Tested against this fixture, it lands in the same place:

```
node .scratch/carry-forward/probes/225-cutoff-density.mjs   # density
```

promote if (delta >= cutoff + k*SE) or (|delta - cutoff| < k*SE):

```
  k=1  ->  122 of 398 promoted (30.7%)
  k=2  ->  166 of 398 (41.7%)
  k=3  ->  211 of 398 (53.0%)     <- K=210 promotes 210 (52.8%)
```

At k=3 the band rule is **the same rule with different notation**. Its value is
not that it promotes fewer items by magic; it is that `k` has a meaning
("how many error-widths of protection") where `210` has none, so the number
becomes arguable from a stated recall target instead of a sweep. Whether it is
also *cheaper* depends entirely on what k the target justifies — and k=1 at 122
items would be a genuine saving if 1 SE of protection is enough.

**Do not adopt the band rule on the grounds that it is more principled while
setting k by sweeping until misses hit zero.** That reproduces the original
problem with extra steps.

## Directions worth testing (none chosen; that is the ticket's job)

1. **State the recall target first**, then derive the rule. Without this, the
   rest is guessing.
2. **Two-stage screening.** Re-screen only the undecidable band at higher
   iterations, rather than promoting all of it to full sims. This is the one
   direction that attacks the root cause — the cutoff (3.6 DPS) being finer
   than the screening SE (5.128 DPS) — instead of budgeting around it. More
   iterations on 77 items is much cheaper than full sims on 124 extra ones.
3. **Skip screening entirely on small pools.** The P2 ratio of 0.9837 says
   racing is already close to pointless there; a pool-size threshold may beat
   any budget rule.
4. **Accept that items inside the cutoff's error bar are unclassifiable** and
   handle them as a declared band in the output rather than pretending the
   screen decided them. Relates to ticket 224.

## Acceptance criteria

- [x] **First, the cheap check:** look at what the 77 items inside the cutoff's
      error bar actually are. If they are interchangeable in the way ticket
      222's trinkets were, this ticket may reduce to a presentation problem
      (ticket 224) and no budget redesign is warranted. Do this before anything
      below — it is one query against the fixture plus a look at the item list,
      and it decides whether the rest of this ticket is worth doing.
- [ ] **A stated recall target**: what fraction of above-cutoff items must
      survive screening, at what probability. This is the criterion everything
      else depends on, and it does not currently exist anywhere in the repo.
- [ ] The chosen rule's promoted-set size is a *consequence* of that target,
      derivable without sweeping. If a sweep is still used to set the final
      constant, say so plainly rather than presenting the result as principled.
- [ ] The band-rule equivalence above is addressed head on: any proposal must
      say why it is not K=210 in different notation (`k=3` promotes 211).
- [ ] The recall gate (`racing.test.ts` 7.2 and 7.3) still passes at zero
      misses on both fixtures. **Never weaken the gate to make a cheaper rule
      look good** (candidate-pool.md §7).
- [ ] The full-sims/eligible ratio is reported for both fixtures under whatever
      rule is chosen, and the P2 ratio of 0.9837 is explicitly addressed —
      either improved or accepted with its reason.
- [x] Reproduce both probes and confirm their numbers still hold on whatever
      fixture is current:
      `node .scratch/carry-forward/probes/225-cutoff-density.mjs` and
      `node .scratch/carry-forward/probes/225-band-rule-comparison.mjs`.

## Out of scope

- Reverting ticket 221's K=210. The misses it fixed were real; this ticket asks
  for a better rule, not a return to a worse one.
- The presentation of screened rows — that is ticket 224.

## Cheap check (2026-08-18)

The check this ticket asked for first has been done. **The band is ties.**
Ticket 225 reduces to the presentation problem (ticket 224) and no budget
redesign is warranted on the band's evidence.

### What was measured

```
npx tsx packages/core/test/measure-cutoff-band.ts
```

The script rebuilds the recorded `feral-p3` full-sweep truth exactly as
`racing.test.ts` `fullSweepTruthP3()` does — `rankUpgrades` with
`RecordedSimRunner` and `fullPool: true` — and asserts on the way through
that no row carries `screened` and that the sweep has 398 rows and 86
above-cutoff rows. Deterministic; two consecutive runs produce identical
text. Full output committed at
`.scratch/handoffs/measure-cutoff-band-output.txt`.

**The band is centred on 2.9288 DPS, not 3.6.** `meetsCutoff` fires on
`deltaDps >= 3.6 || deltaPct >= 0.15` and `deltaPct` is a percentage, so on
this fixture's baseline of 1952.5249585538932 DPS the pct arm binds at
`0.15 * 1952.5249... / 100` = 2.9288 DPS. That arm, not the 3.6 absDps arm,
is what decides `belowCutoff` for every row on this fixture.

```
  eligible rows            398
  above cutoff             86
  effective boundary       2.9288 DPS   (the binding pct arm)
  screening SE @1000 it    5.128 DPS    (ticket 222)
  band span                -2.199 .. 8.057 DPS

    clear-above            58
    band-above             28
    band-below             42
    clear-below            270
    band total             70
```

Per-slot histogram:

```
  slot            band-above  band-below  slot rows  slot above-cut
  back                     3           4         31               6
  chest                    1           1         20               4
  feet                     3           5         31              14
  finger                   9          13         49              16
  hands                    1           1         20               3
  head                     0           1         18               0
  legs                     2           1         20               7
  neck                     3           3         25               3
  ranged                   0           1          2               0
  trinket                  0           3         20               3
  waist                    2           5         27               9
  wrist                    4           4         26              10
```

**P1 = 1**, **P2 = 0**.

- **P1** — slots whose best _candidate_ by truth lies inside the band: one,
  `neck` (Teeth of Gruul, 5.81 DPS, band-above).
- **P2** — band-above rows that are their slot's only above-cutoff row:
  zero. No band row can empty a slot if the screen loses it.

### A correction to P1, and why it matters

P1 first counted 3 — `head`, `neck`, `ranged`. Two of those were an
artifact. A worn item ranks as a swap of itself and scores exactly 0.00 DPS
by construction; that is not a measurement, but 0.00 falls inside a band
spanning -2.199 DPS, so **eight of this fixture's sixteen worn items land in
the band**, and in `head` and `ranged` the worn item is the slot's argmax.
Both slots have **zero above-cutoff candidates** (histogram above). P1 was
written to detect "the screen may lose this slot's best upgrade"; counting
those slots reported that for slots with no upgrade to lose. P1 now counts
candidates only, and the excluded slots print separately with their
above-cutoff counts so the exclusion is auditable:

```
Worn rows inside the band (0.00 DPS by construction, not measurements): 8
P1 — slots whose best candidate by truth is inside the band: 1
  neck               5.81 DPS  band-above  Teeth of Gruul
  excluded — slots whose argmax is the worn item (no upgrade to lose): 2
  head               0.00 DPS  Wolfshead Helm      slot above-cutoff rows: 0
  ranged             0.00 DPS  Everbloom Idol      slot above-cutoff rows: 0
```

### Drift against this ticket's own numbers

Both probes still reproduce every figure this ticket quotes, unchanged:

```
node .scratch/carry-forward/probes/225-cutoff-density.mjs
#   rank 86/150/195/210 -> 77 / 86 / 77 / 75 within +/-1 SE
#   inferred baseline ~ 1954.7
#   clearly above cutoff 45; within +/-1 SE of the cutoff 77

node .scratch/carry-forward/probes/225-band-rule-comparison.mjs
#   k=1 -> 122 of 398 (30.7%); k=2 -> 166 (41.7%); k=3 -> 211 (53.0%)
#   K=210 promotes 210 (52.8%)
```

The script's counts differ from the probes' — 70 band rows and 58
clear-above against the probes' 77 and 45 — and the difference is entirely
framing, not drift in the fixture. Two reasons, both named in the script's
header, which prints the probes' framing alongside its own so the gap stays
visible:

1. **The arm swap.** The probes band around absDps 3.6; the script bands
   around the pct arm at 2.9288, which is what actually decides
   `belowCutoff`. This dominates.
2. **The inferred baseline.** The probes infer the baseline as
   `dps[85] - 3.6` = ~1954.7 rather than reading the fixture's recorded
   1952.5249585538932.

Recomputed the probes' way against the recorded baseline, the script prints
65 within +/-1 SE of 3.6 and 55 clearly above 3.6 + SE — so the residual gap
to 77/45 is the inferred baseline.

### SME verdict

Full handoff: `.scratch/handoffs/sme-rank-judgment-ticket-225-cutoff-band.md`
(`sme-rank-review`, audience engineering).

Verdict `do-not-trust`, for the head, ranged and trinket slots — but on
**this ticket's question** the judgment is that the band is **ties**:

> The **band-above rows are interchangeable.** All 28 of them are same-slot
> alternates separated by less than the pairwise noise scale, exactly like
> ticket 222's trinkets. Nothing there is a decision a player would make by
> more than noise.

On the one P1 row:

> The top three necks span **5.81 -> 4.37 DPS**, a range of **1.44 DPS**.
> Ticket 222's pairwise noise scale is **sqrt(2) x 5.128 = 7.25 DPS**. Not
> one of those three pairs is truth-resolvable. There is no ordering here to
> recover, and no wrong answer a screen could give [...] This is ticket 222's
> trinket story repeated exactly: **a real cluster of genuinely equivalent
> alternatives, presented as an ordered list it has no right to be.** That is
> ticket 224's problem, not ticket 225's.

## Decision: reduces to ticket 224; no budget change

The band is a set of ties, not a set of decisions. A screen that cannot
order it is behaving correctly; the defect is presenting it as ordered,
which is ticket 224's subject. No recall target is derived here and no
promotion rule or default changes.

**On the one non-zero property.** The gate this ticket's plan set was
"interchangeable and P1 = 0 and P2 = 0". P1 = 1, so the gate does not close
on its literal reading, and that is recorded here rather than rounded away.
It is judged to close anyway, because P1 is a mechanical proxy for a
judgment and the judgment went the other way on the same row: P1 exists to
find a slot whose best upgrade the screen could lose, and the neck cluster
offers no wrong answer to give — 1.44 DPS of spread against a 7.25 DPS
pairwise noise scale, with P2 = 0 confirming the slot cannot be emptied.
A reader who disagrees with that reading has every number above to
re-decide it on.

### Remaining criteria

- **A stated recall target** — N/A. The target was to be derived only if the
  band proved decision-relevant; it did not, so nothing here justifies one,
  and inventing a target with no decision riding on it would be the
  arbitrariness this ticket objected to, one level up.
- **Promoted-set size as a consequence of the target** — N/A, no target
  derived and no rule changed. K=210 stands as ticket 221 set it: a sweep,
  and this ticket does not claim otherwise.
- **Band-rule equivalence addressed** — addressed and not adopted. At k=3 the
  noise-band rule promotes 211 against K=210's 210 (probe output above); it
  is K=210 in different notation, and no measurement here justifies picking
  a smaller k.
- **Recall gate still green** — 7.2 and 7.3 untouched and passing; no rule or
  default was changed, so the gate had nothing to survive.
- **Ratios reported, 0.9837 addressed** — `ret` **0.9708** (240 eligible,
  233 full sims) from `npx tsx packages/core/test/measure-racing-ratio.ts`;
  `feral-p3` **0.6457** and `feral` (P2) **0.9837** as ticket 221 measured
  them. The `feral` 0.9837 is **accepted, not improved**: it is a 246-item
  pool with 42 above-cutoff rows spread over 14 slots, so the per-slot floor
  and a K sized for recall together reach nearly every candidate. Nothing in
  this ticket's finding argues for a cheaper rule there, and this check
  found no rule that would be cheaper at equal recall.

## Flagged, not handled here

Reading the band surfaced a scoring problem this ticket did not ask about
and did not investigate. Three shapes, all from the SME handoff:

- **head** — all 18 helms score -173.97 to -253.60 DPS against a level-42
  crafted incumbent (Wolfshead Helm), including Thunderheart Cover, the
  tier 6 feral helm, at -186.69. Every helm is leather, so no equip rule is
  involved. A near-constant ~200 DPS gap across eighteen helms of three
  tiers is a cliff, not a stat comparison.
- **ranged** — Idol of the White Stag at -21.29 against the worn Everbloom
  Idol. Both legal feral idols; that gap is indefensible in either
  direction.
- **trinket** — eleven unrelated trinkets share exactly -31.33 DPS, tying
  Ashtongue Talisman of Equilibrium (the feral tier 6 rep trinket) with
  Memento of Tyrande (caster).

That last shape is the signature ticket 171 diagnosed on the ret librams:
an item whose effect the pinned fork does not implement scores on stats
alone, so unrelated items land on one identical delta. Ticket 171 is marked
resolved and was scoped to ret's ranged slot; this is the same mechanism
recurring on feral head/idol/trinket and needs its own ticket. **Not filed
by this ticket** — it is outside the scope this work was authorised for, and
it wants its own diagnosis rather than a paragraph here.

It does not change the decision above. The band-above rows the verdict
turns on carry ordinary stat-driven deltas; the broken slots sit at 0.00 or
far below the cutoff and contribute no above-cutoff rows.
