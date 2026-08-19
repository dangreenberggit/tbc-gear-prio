Status: open
Type: task (presentation; no ranking-logic defect)
Supersedes-framing: user challenge 2026-08-18 — see "The user's framing" below
Origin: `sme-rank-review` verdict during ticket 222, 2026-08-18 — verdict
  `trust-with-caveats`, handoff at
  `.scratch/handoffs/sme-rank-judgment-ticket-222-within-slot-ordering.md`
Blocks: none
Blocked by: none

# Screened rows are presented as an ordered list in slots where no order exists

## The finding

Ticket 222 measured within-slot ordering below the promotion floor and closed
its ranking question: the sort order is defensible. Among pairs whose recorded
truth separates them by more than the pairwise noise scale (√2·SE = 7.25 DPS),
the inversion rate is **0.67%** (587 of 88,046 over 30 draws), and **0.4%** in
the weapon slot — the 78-row list users actually read. Re-run with:

```
npx tsx packages/core/test/measure-within-slot-ordering.ts
```

**What ticket 222 deliberately left open is the presentation.** Two slots have
no resolvable order at all:

| slot | rows | pairs | raw inv% | truth-resolvable pairs |
| --- | --- | --- | --- | --- |
| trinket | 12 | 66 | 43.2% | **0** |
| finger | 11.7 | 63 | 45.9% | 5 of 63 |

Zero of trinket's 66 pairs are separable at screening precision. The product
nonetheless presents those 12 trinkets as an ordered list.

## Why this is a game fact, not a precision failure

From the SME handoff, and the reason more iterations cannot fix it: TBC
itemises trinkets as an **effect**, not a stat line, and the Phase 3 feral
trinkets converge on a budgeted tie from two directions — static agility/AP
versus proc/on-use. Rings below the top one or two are famously flat. The items
really are equivalent in DPS terms; there is no hidden ordering to recover.

Engineering should not chase the 43% figure as a bug.

## Why the existing structural signals are not enough

The current design distinguishes screened rows by `rank: null`, sorting them
below every full-iteration row, and giving them their own tie groups
(`rank.ts:1558-1562`, `:1576-1579`; `view.ts:328-335`, `:239-248`).

The SME's judgment is that this does not do the work: **a list in an order reads
as a ranking** to anyone who has read a BiS thread. A feral scanning 12 trinkets
numbered 1..12 chases the first one, when the honest answer is that all 12 are
the same and the decision should turn on drop source, cooldown alignment with
Tiger's Fury and Berserk, and fight length — none of which is in the DPS number.
An ordered list actively hides the real decision.

The stated risk is spillover: a user who sees an overconfident trinket list and
later learns those items were indistinguishable discounts the whole tool,
including the weapon slot where the ordering is genuinely excellent.

## The user's framing, which supersedes the SME's suggested fix

The SME proposed grouping tied rows instead of ordering them. The user, on
seeing that, made the sharper point (2026-08-18):

> if there's some option to show those at all, you're right that there's no
> point ordering them and they can just be shown in a little list. but probably
> not even then if they weren't important enough to make even the top 150+ of
> upgrade options

That reframes the ticket. These rows did not merely tie with each other — they
**failed to make the promotion budget at all**, out of a 398-candidate pool
where only 86 clear the upgrade cutoff. The question is not "how do we order
rows nobody should act on" but **"why are we showing them at all"**.

This is the cheaper fix and the more honest one: a row that is both
un-promoted and below cutoff is not decision-relevant, and an ordered list of
such rows manufactures a distinction the data cannot support.

## The proposed change

Preferred: **do not present un-promoted, below-cutoff rows as a ranked list at
all.** Options in descending order of preference —

1. Omit them from the default view entirely, behind a disclosure ("show the
   items that were ruled out") if they are wanted for debugging.
2. If shown, render them as an **unordered** set with no positions and no
   implied precedence.
3. Only if 1 and 2 are rejected: the SME's original suggestion — group ties by
   the measurement's own resolution and mark such slots as tied sets.

Any of these needs **no reordering, no extra iterations, and no re-simulation**
— the per-candidate screening SE is already known (mean 5.128 DPS at 1,000
iterations; pairwise scale √2·SE = 7.25 DPS, measured in ticket 222).

**Keep the development value.** The ordering has been useful for engineering
(it is how ticket 222 measured anything at all), so whatever the user-facing
view does, the underlying data should stay available to the measurement scripts
and to any debug view.

## Acceptance criteria

- [ ] Un-promoted, below-cutoff rows are no longer presented to the user as an
      ordered list — omitted, disclosed, or unordered per the options above.
      A decision among the three is recorded with its reason.
- [ ] The underlying ordering remains available to measurement scripts and any
      debug view, so engineering does not lose what ticket 222 relied on.
- [ ] The feral Phase 3 trinket slot (0 of 66 resolvable pairs) no longer
      reads as a ranking, and the weapon slot (2,751 resolvable pairs, 0.4%
      inversion) keeps its ordering — promoted rows are unaffected throughout.
- [ ] `sme-rank-review` judges the revised presentation, and its verdict is
      recorded here.
- [ ] `pnpm verify` green.

## Out of scope

- Changing `DEFAULT_PROMOTE_TOP_J`, `DEFAULT_PROMOTE_TOP_K`, or the promotion
  rule. Ticket 222 measured the floor as inert on this pool at K=150 and K=210
  alike, for reasons of pool shape rather than the K value; nothing here argues
  for a defaults change.
- Re-measuring the ordering. Ticket 222 did that; this ticket consumes its
  numbers.
- Changing which rows the *engine* produces. This ticket is about what the
  user-facing view presents; the rows stay in the data for measurement and
  debug use either way.

## Finding from ticket 225 (2026-08-18)

Ticket 225 asked whether the items packed inside the cutoff's screening
error bar are interchangeable or decision-relevant, and closed on the
answer **interchangeable** — which hands the band to this ticket. Nothing
below changes this ticket's design; it widens the evidence for it.

Reproduce with:

```
npx tsx packages/core/test/measure-cutoff-band.ts
```

On the committed `feral-p3` fixture, the effective cutoff boundary is
**2.9288 DPS** — the `deltaPct >= 0.15` arm of `meetsCutoff`, which binds
below the 3.6 absDps arm on this baseline — and screening SE at 1,000
iterations is **5.128 DPS** (ticket 222). A band of +/-1 SE around that
boundary holds **70 of 398 rows**: 28 above the cutoff and 42 below it.
The `sme-rank-review` verdict on that list
(`.scratch/handoffs/sme-rank-judgment-ticket-225-cutoff-band.md`) is that
all 28 band-above rows are same-slot alternates separated by less than the
pairwise noise scale of sqrt(2) x 5.128 = 7.25 DPS — this ticket's trinket
story, in more slots.

**The neck slot is a second worked example alongside trinket and finger.**
Its three above-cutoff candidates span 5.81 -> 4.37 DPS, a range of **1.44
DPS** against that 7.25 DPS noise scale, so no pair is truth-resolvable:

```
   5.81  Teeth of Gruul
   5.73  Telonicus's Pendant of Mayhem
   4.37  Choker of Serrated Blades
   0.00  Haramad's Bargain            (currently worn)
```

Unlike trinket and finger, these are full-iteration rows above the cutoff,
so they are presented as an ordered part of the shortlist rather than in
the screened partition this ticket's existing examples live in. The three
necks read as first, second and third choice; they are one choice.

**A presentation detail worth carrying into the fix.** Eight of the
character's sixteen worn items land inside that band at exactly 0.00 DPS,
because a worn item ranks as a swap of itself. Any "these rows are
indistinguishable" treatment applied by measured distance from a boundary
will sweep those worn rows in, and a worn row's 0.00 is a definitional
zero, not a measurement that happens to be small. Ticket 225's own P1
property counted them by mistake and had to be corrected to exclude them.
Whatever this ticket builds should distinguish the two cases, or it will
tell a reader that their currently-equipped gear is statistically tied with
a candidate when what it means is that the row is not a comparison at all.
