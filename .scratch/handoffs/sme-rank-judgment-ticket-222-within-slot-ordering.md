# SME rank judgment — ticket 222, within-slot ordering below the argmax

## Verdict

**trust-with-caveats.**

The ordering itself is defensible as game output. In every slot where the game
can actually tell two items apart, the shipped order gets it right: 0.67% of
truth-resolvable pairs invert, and in the weapon slot — 78 rows, the biggest
list a reader will ever see — it is 0.4%. That is better than a feral player's
own gear intuition, and far better than the sorted-by-item-level or
sorted-by-agility ordering a player would fall back on.

The caveats are not about the sort. They are about two slots where the list
claims a distinction the game does not have, and about one word on the page.

## What was reviewed

- **Character:** feral cat druid, Phase 3 (SSC / Tempest Keep cleared, Hyjal /
  Black Temple current).
- **Baseline:** the character's own worn gear. Head is the relevant detail — the
  worn helm beats all 13 screened head candidates by 174 to 264 DPS.
- **Results from:**
  `.scratch/stage-gate/ticket-222-within-slot-ordering/sme-input.md` — the head
  slot shown row by row for one draw, plus per-slot inversion statistics over 30
  draws.
- **Scope note:** the screening side of this measurement is modelled, not a
  replay of a shipped run. I judged the ordering behaviour it describes, since
  the input states the model is a conservative upper bound on real disorder.

## Game problems

### 1. Trinket and finger are presented as ranked lists of things that are not rankable

This is the finding that matters. All 12 trinkets in that slot are inside 7.25
DPS of each other. Zero of the 66 pairs are separable. Finger is the same shape:
5 of 63 pairs.

That is not a measurement failure — it is a true fact about TBC feral trinkets
and rings at this tier, and it is worth engineering knowing it as a game fact
rather than a noise artifact. Feral cat trinkets in Phase 3 split into two
families that happen to land in the same DPS neighbourhood by different routes:
static agility/AP trinkets (Bloodlust Brooch, Hourglass of the Unraveller,
Dragonspine Trophy) and on-use or proc trinkets whose value depends entirely on
fight length and cooldown alignment. Their sim deltas converge on a patch-work
tie because the designers budgeted them to. Rings are worse — TBC ring itemisation
below the top one or two is famously flat, a few agility and a bit of crit apart.

So a 12-row ordered list of trinkets is telling a feral something the game does
not support. The 43% raw inversion rate is the honest signal here: the order is
close to arbitrary. Crucially, no engineering fix makes it non-arbitrary — more
iterations would just resolve a difference too small to matter. The problem is
the presentation implying a difference exists at all.

**What a feral would actually do** with a genuine 12-way trinket tie is choose
on grounds the sim never modelled: which one drops from a boss the guild is
already killing, which one has a cooldown that lines up with Tiger's Fury and
the Berserk window, whether the fight has a burn phase. A list that orders them
1 through 12 by DPS hides the fact that those non-DPS considerations are the
whole decision.

### 2. The word "screened" does not carry the meaning it needs to carry

The sub-question asks whether `rank: null`, sorting below simmed rows, and
separate tie groups do enough to stop a reader treating the positions as a
ranking.

As a game-domain reader: no, not on their own. A list in an order is a ranking.
That is what a list in an order means to anyone who has read a BiS thread. The
structural signals are real, but they say "these are less certain" — they do not
say "positions 2 through 12 here are indistinguishable." A feral scanning the
trinket block sees a first, a second, a third, and will chase the first.

This is a labelling problem, not a sorting problem. The fix a game-literate
reader would accept is small: mark the pairs that are inside the measurement's
own resolution as tied, and say so on the block. The data to do that already
exists — the screening SE is known per candidate.

### 3. The head slot's tail is caster gear, and the ordering question is moot there

Reading the 13 head rows as a druid: the top three (Cursed Vision of Sargeras,
Cowl of Defiance, Malefic Mask of the Shadows) are real leather melee helms and
sit in a sensible order. Cursed Vision first is correct and unsurprising — it is
the standard feral cat helm of that tier.

Below that the list is mostly caster and healer gear. Crown of the Sun,
Headdress of the High Potentate, Cowl of the Grand Engineer, Cowl of
Benevolence, Cowl of Nature's Breath, Uni-Mind Headdress, Wicked Witch's Hat,
Collar of Cho'gall — a feral cat would not consider any of these. They are
intellect and spell power pieces. The sim agrees, correctly: every one is a 230
to 264 DPS loss.

So the four-position displacement of Crown of the Sun does not matter in the
game. Both its shipped position and its true position are deep inside a block of
items nobody would equip. Inversions among rows the character will never wear
are not a product problem. This is worth engineering knowing because head's
12.1% raw inversion rate looks alarming in the table and is almost entirely
harmless in practice.

## Rows that look fine

- **Weapon.** 78 rows, 0.4% inversion among resolvable pairs, max displacement
  12 out of 78. Feral weapons are dominated by weapon damage and feral attack
  power, which vary widely across the pool, so genuine gaps exist between most
  pairs and screening finds them. This is the slot where a long ordered list is
  most useful and it is the slot the ordering handles best.
- **Head top three.** Correct items in a correct order.
- **Legs, waist, chest, neck, back, shoulder.** Resolvable-pair inversion rates
  of 1.1% to 5.7% on short lists with small displacements. Nothing here would
  make a feral doubt the tool.

## Gate

Would I trust this output as a feral who knows the game? **Yes for the ordering,
with one change required before yes overall.**

What must be true:

1. **Trinket and finger must not present as ordered lists** when nothing in the
   slot is separable. Show them as a tied set. A feral who sees 12 trinkets
   ranked 1-12 and then reads elsewhere that they are all within a point of each
   other concludes the tool overstated its own confidence, and that doubt
   spreads to the slots where the ordering is genuinely good.
2. **The tie grouping should use the measurement's own resolution**, not exact
   equality. Two items 0.4 DPS apart are the same item as far as the game is
   concerned.

Not required: reordering anything, running more iterations, or removing screened
rows. The order is fine. The claim attached to it is too strong in two slots.

## Answer to the third sub-question

The input asks whether there is a game-domain reason to think within-slot
screening order is approximately right despite the noise.

**Yes, and it is a real effect, but it does not apply evenly.** Within a slot,
feral cat item value is strongly driven by a small number of stats — agility,
attack power, crit, and on weapons the weapon damage and feral AP — and these
scale together with item level inside a tier. So true deltas within a slot tend
to spread out rather than cluster, which is why 85% of all pairs are resolvable
at all. That is the reason weapon and the armour slots behave well.

The exception is exactly the slots where itemisation deliberately breaks that
monotonicity: trinkets, whose value is an effect rather than a stat line, and
rings, which TBC itemises flat. Those are the two slots the measurement flags,
and the game explains why. The inversion counts are less alarming than they read
for eleven slots and exactly as alarming as they read for two.

## Notes for engineering

- Trinkets and rings are flat by design in TBC — the tie is a game fact, not a
  precision failure. More iterations will not help.
- A trinket tie is decided in game by drop source, cooldown alignment, and fight
  length. None of that is in the DPS number, so an ordered trinket list hides the
  actual decision.
- Head rows 4 through 13 are caster gear. Displacement among items a feral will
  never equip is not a product problem.
- Weapon is the long list users will actually read, and it is the one the
  ordering handles best.
- "Accept and document" is defensible for the sort order. It is not sufficient
  for the trinket and finger presentation.
