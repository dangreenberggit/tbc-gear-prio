Status: open
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
- [ ] The recall gate (`racing.test.ts` 7.2 and P3-recall) still passes at zero
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
It is judged to close anyway, because P1 is a mechanical proxy for an
ordering question, and on ordering the neck slot has nothing to resolve:
its three above-cutoff rows span 1.44 DPS against a 7.25 DPS pairwise noise
scale, and P2 = 0 confirms no slot can be emptied by losing a band row.

**That statement needed re-wording after a second review, and the re-worded
version is narrower.** The neck slot's argmax — 28822 Teeth of Gruul, the
P1 row — is a **healer** item: `{int 21, healing 46, spellpower 16, spirit
19, mp5 8}` in both `data/items/index.json` and `vendor/wowsims/db.json`,
with no agility, strength, attack power, crit, hit or expertise. The two
genuine feral necks sit just below it at 5.73 (30017 Telonicus's Pendant of
Mayhem) and 4.37 (32591 Choker of Serrated Blades) — still within 7.25 DPS
of each other, so **"no resolvable order" holds**. But the earlier claim
that there was "no wrong answer a screen could give" does not: there is a
wrong answer available, and it is a healer neck ranked first. That is a
**scoring** question — does this row belong above the cutoff at all — not
an ordering one, and it is ticket 227's, not this ticket's.

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
- **Recall gate still green** — 7.2 and P3-recall untouched and passing; no rule or
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
alone, so unrelated items land on one identical delta. **Filed as ticket
226** —
`.scratch/carry-forward/issues/226-feral-p3-head-idol-and-trinket-slots-score-as-cliffs-not-comparisons.md`
— rather than handled here, because it is outside the scope this work was
authorised for and wants its own diagnosis.

One correction belongs with the hand-off, because ticket 171's mechanism
does **not** carry over as written. Annotating each row with whether its
item id appears in `data/sim-implemented-effects.json` shows all eleven
-31.33 trinkets marked implemented, not stub-only, while every helm in the
head slot is stub-only **including the worn Wolfshead Helm**. That artifact
is informational and a stat-only item needs no registration at all, so
neither label settles anything on its own — but it does rule out the
one-line reading that the candidates' effects are simply unimplemented.
Ticket 226 carries the annotated dump
(`.scratch/handoffs/ticket-226-slot-truth-dump.txt`) and phrases its
acceptance criteria as the questions that remain open.

It does not change the decision above, for the reason that the head, idol
and trinket slots contribute no above-cutoff rows at all (histogram: head 0,
ranged 0, trinket 3) and so cannot move the band arithmetic.

**One sentence in an earlier version of this section was wrong and is
withdrawn**: that "the band-above rows the verdict turns on carry ordinary
stat-driven deltas". They do not. **Ten of the 28 band-above rows are
healer-statted items** — intellect, healing power, spellpower, spirit, mp5,
with zero melee-relevant stats — scoring **+4.61 to +7.80 DPS** for a feral
druid. Verified against `data/items/index.json` and cross-checked against
`vendor/wowsims/db.json`; evidence at
`.scratch/handoffs/ticket-227-healer-stat-lines.txt`. That is **ticket
227**:
`.scratch/carry-forward/issues/227-healer-role-items-score-above-the-feral-cutoff.md`.

## Two SME seats disagreed on this closure

Recorded because the disagreement is substantive and a reader should not
have to reconstruct it.

- **First opinion** (`.scratch/handoffs/sme-rank-judgment-ticket-225-cutoff-band.md`)
  — the band is **interchangeable**. All 28 band-above rows are same-slot
  alternates inside the pairwise noise scale, so a screen that cannot order
  them is behaving correctly, and 225 reduces to ticket 224.
- **Second opinion** (`.scratch/handoffs/sme-rank-judgment-ticket-225-second-opinion.md`)
  — **do-not-trust the closure.** Ten of those 28 rows are healer gear. A
  tie presumes the tied items are candidates in the first place, and these
  are not; calling the band "ties" papers over the question of why healer
  items clear a feral's cutoff at all.

**How this was reconciled.** Exit A stands, on narrower ground than the
first opinion claimed. What the measurement establishes is that **screening
cannot order or classify this band** — the screening SE of 5.128 DPS is
wider than the effective cutoff of 2.9288 DPS, so no promotion budget can
separate these rows, and no budget redesign follows. That conclusion does
not depend on the band's rows being sensible items; it is a statement about
resolution.

What the second opinion is right about, and what this ticket therefore does
**not** claim: whether an individual band row belongs above the cutoff at
all is a **separate, open question**, now tracked as ticket 227. The two
findings are compatible — screening cannot resolve the band *and* some rows
in it may not deserve to be there — and they have different owners.

One correction to the second opinion itself: it recalled 28822 Teeth of
Gruul as a melee neck. It is not; both data sources agree it is a healer
neck, so this is not a repo item-identity defect. That correction does not
weaken its finding — a healer neck as the slot argmax is precisely its
point.

## Reopened (2026-08-19) — the questions this ticket was supposed to ask

User verdict on the 2026-08-18 closure: the ticket was about investigating
and finding a better approach; instead it confirmed the mechanism and tested
two re-parameterisations of the same approach. Reopened with the scope below.
The 2026-08-18 record above stands as evidence, not as the answer. Racing as
shipped is an extra filtering layer that is a net loss or near-loss on every
measured pool (ratios 1.06 feral P2, 0.70 feral P3, 0.97 ret P2 — commands in
the "Measured" sections); the burden is on screening to justify existing.

Questions to actually investigate (design lane, not another K sweep):

1. **Is the cutoff meaningful?** 3.6 DPS / 0.15 % is finer than the screening
   SE (5.1), finer than the 3000-iteration truth's own SE (~3.0, ticket 227),
   and finer than the pairwise resolution a player could notice. If no
   affordable sim resolves it, "above cutoff" is partly noise and every recall
   target built on it is chasing noise. What cutoff does the instrument
   support, and should the cutoff be stated in SE units?
2. **What is the output actually for?** If the user needs "the best few per
   slot" (what a player acts on) rather than "every item above a cutoff",
   screening's job changes from set-recall to per-slot top-N — a different,
   probably much cheaper problem.
3. **Can the EP pre-order do the work?** Candidates are already EP-ordered
   before any sim (candidate-order.ts). Per slot, once the EP gap to the
   incumbent exceeds what any sim could overturn, stop — no screen at all.
   Measure how many full sims that needs on the three fixtures vs today.
4. **Is a separate screening pass the wrong shape?** Alternatives: sequential /
   adaptive iterations per candidate (sim until the CI clears the decision),
   or no screening at all plus the EP stop above. Compare cost and recall.
5. **Should racing simply be removed** if none of the above beats "full sweep
   + EP stop" on these pools? State the criterion before measuring.

Acceptance: each question answered with a measurement or a reasoned "not
worth pursuing", commands recorded; a recommendation that is not "keep the
same approach with different constants".

### First concrete fact for the reopened scope (2026-08-19)

After ticket 228 shrank the feral pools, `racing.test.ts` 7.0 fails honestly:
on feral P2 (228 eligible) at `DEFAULT_PROMOTE_TOP_K = 210`, racing issues
242 full-iteration sims — more than a full sweep. Ratios:
`npx tsx packages/core/test/measure-racing-ratio.ts feral` → 1.0614;
`... feral-p3` → 0.7041; `... ret` → 0.9708. A "skip screening when
K ≥ 0.8·eligible" fix was planned and reviewed
(`.scratch/stage-gate/ticket-228-skip-screening-small-pools/`) and parked
by the user: its review found it would remove recall gating from the §7
roster fixture and disqualify any fixture under 263 eligible from gating
recall. The gate stays red until this ticket decides the rule or defaults;
the branch cannot merge before then. Question 5 above is therefore live
now, not later.
