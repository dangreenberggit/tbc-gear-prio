# SME rank judgment — ticket 225 cutoff band (feral P3)

## Verdict

**do-not-trust** — for the head slot, the ranged slot, and the trinket slot.

**Judgment on the ticket's question: mixed, and the mix is not the one the
ticket expected.**

- The **band-above rows are interchangeable.** All 28 of them are same-slot
  alternates separated by less than the pairwise noise scale, exactly like
  ticket 222's trinkets. Nothing there is a decision a player would make by
  more than noise.
- **P1 = 3 is not evidence of decision-relevance.** All three P1 slots resolve
  to an item the character is **already wearing**, sitting at 0.00 DPS by
  definition. Those slots are not "undecidable at screening precision" — they
  are slots where the pool offers no upgrade at all, and the argmax is the
  incumbent.
- But reading the band surfaced a **separate and larger game problem** that has
  nothing to do with screening budgets: the head slot, the ranged (idol) slot,
  and most of the trinket slot are scored in a way that is impossible in game.
  That is what makes this handoff do-not-trust.

So on the narrow question ticket 225 asked — *is the band a set of ties or a
set of decisions?* — the answer is **ties**, and ticket 225 does reduce to the
presentation problem (ticket 224). But the answer arrives with a caveat that
matters more than the answer: **P1 = 3 is a false signal produced by broken
slots, not by close calls.** Do not close 225 on the strength of P1 without
also opening the head/idol/trinket problem below.

## What was reviewed

- Character: feral druid, Tauren, wearing the wowsims **feral pre-raid preset**
  (`C:\Users\dgree\Code\lulz\tbc-gear-prio\vendor\wowsims\feral_preraid.gear.json`).
- Phase: candidate pool
  `C:\Users\dgree\Code\lulz\tbc-gear-prio\data\universes\feral-p3.json`,
  398 eligible items.
- Results: full output at
  `C:\Users\dgree\Code\lulz\tbc-gear-prio\.scratch\handoffs\measure-cutoff-band-output.txt`,
  reproduced with `npx tsx packages/core/test/measure-cutoff-band.ts`.
- Cross-checked against per-slot truth deltas for `head`, `ranged`, `neck`,
  `finger` and `trinket`, obtained by running that same script with a per-slot
  dump appended (temporary file, run and deleted, not committed).
- Ticket:
  `C:\Users\dgree\Code\lulz\tbc-gear-prio\.scratch\carry-forward\issues\225-promotion-budget-is-a-blunt-instrument-relative-to-real-upgrade-count.md`.

Figures cited below all come from that script output: effective boundary
**2.9288 DPS** (the 0.15% pct arm binds, not the 3.6 absDps arm), screening SE
**5.128 DPS**, band span **-2.199 .. 8.057 DPS**, **28 band-above / 42
band-below / 70 total**, **P1 = 3**, **P2 = 0**.

### Confidence and sourcing

Everything numeric here is measured — read from the script output above, or
from the fixture, universe and preset-gear files named above.

The **game claims are recalled TBC knowledge and were not checked against any
source of truth in this repo**: what Wolfshead Helm's effect does and why
ferals keep it, what the two idols boost, what Ashtongue Talisman of
Equilibrium procs, which trinkets are caster versus melee, and the Scale of the
Sands per-role ring naming. I am confident in each of them, but they are
unverified against an item database here. Where a finding rests on such a
claim, it is the *shape of the numbers* that carries the finding — a constant
~200 DPS gap across eighteen helms, or eleven trinkets on one identical value —
and that shape holds regardless of the specific item lore.

## Game problems

### 1. The head slot is broken. Every helm in the game is a ~200 DPS loss.

Per-slot truth for `head`, all 18 candidates:

```
   0.00  Wolfshead Helm                        (currently worn)
-173.97  Cursed Vision of Sargeras
-181.39  Vengeful Gladiator's Dragonhide Helm
-186.69  Thunderheart Cover
-193.03  Nordrassil Headdress
-201.18  Stag-Helm of Malorne
-211.88  Cowl of Defiance
   ...
-253.60  Collar of Cho'gall
```

This is not a game fact. Wolfshead Helm is a level-42 crafted leather helm. Its
whole value to a feral druid is the +20 energy it grants on shifting into cat
form, which is why it stays equipped well past its item level. Keeping it
pre-raid is a real and well-known choice. It is **not** worth 174 DPS more than
Cursed Vision of Sargeras, and it is certainly not worth 187 DPS more than
Thunderheart Cover, the tier 6 feral helm. In game these are straightforward
upgrades over Wolfshead once the character has other energy sources, and the
community argument about when to drop Wolfshead is measured in single-digit
DPS — the same range as the rest of this band — and it points the other way by
tier 5.

Two innocent explanations are ruled out:

- **Not armor type.** Every helm listed is leather (`armorType: 2`), the same
  as Wolfshead. A druid can wear all of them. No equip rule is being violated
  in either direction.
- **Not itemisation.** A roughly constant ~200 DPS gap shared by eighteen
  unrelated helms across three tiers is a cliff, not a stat comparison. Real
  helm-to-helm differences at this gear level are single-digit to low
  double-digit DPS.

The shape — a large near-constant loss applied to every non-incumbent item in
the slot — is what it looks like when the incumbent's special effect is
credited to the baseline and not removed when the helm is swapped out, or when
the slot loses something on any swap. Which of those it is, is engineering's
call. The game fact is only this: **no helm in TBC costs a feral druid 200 DPS
relative to Wolfshead Helm.**

**Effect on ticket 225.** `head` appears in P1 as "Wolfshead Helm, 0.00 DPS,
band-below" only because 0.00 falls inside the ±1 SE band around 2.9288. The
slot's argmax is the worn item because every alternative scores -174 or worse.
That P1 row carries no information about screening resolution. It is a symptom
of this problem.

### 2. The ranged (idol) slot has the same shape.

```
   0.00  Everbloom Idol            (currently worn)
 -21.29  Idol of the White Stag
```

Two candidates only, and the Phase 3 raid idol loses to the badge idol by 21
DPS. Both are legal feral idols — a druid's ranged slot is an idol, and both of
these are druid idols — so no equip rule is being broken.

Everbloom Idol boosts Mangle. Idol of the White Stag boosts Mangle on a
different term. These two sit close together in game and the ordering between
them is a genuine, argued-about question. A **21 DPS** gap in favour of the
badge idol on a Phase 3 character is not a defensible answer in either
direction. It is far outside the range where these two are known to sit
relative to each other, and it repeats the "everything that is not the
incumbent loses badly" shape from the head slot.

Note also that an idol carries an empty stat line by nature — its value is its
effect. An idol must be judged by what it does, and a large negative delta
against another idol is not something the stat line could ever explain.

**Effect on ticket 225.** `ranged` appears in P1 for the same reason as `head`:
the worn item at 0.00 is the slot argmax and 0.00 lands inside the band. Again
not a screening-resolution fact.

### 3. Teeth of Gruul is the one real P1 row — and it is a tie, not a decision.

```
   5.81  ABOVE  Teeth of Gruul
   5.73  ABOVE  Telonicus's Pendant of Mayhem
   4.37  ABOVE  Choker of Serrated Blades
   0.00  below  Haramad's Bargain          (currently worn)
  -0.64  below  Mithril Chain of Heroism
```

This one is sound game content. Teeth of Gruul is a Gruul's Lair neck with a
plain agility/attack-power line, and it being a modest upgrade over Haramad's
Bargain for a pre-raid feral is correct. Having three necks clustered just
above the line is also correct.

But it does **not** make the neck slot decision-relevant. The top three necks
span **5.81 → 4.37 DPS**, a range of **1.44 DPS**. Ticket 222's pairwise noise
scale is **√2 × 5.128 = 7.25 DPS**. Not one of those three pairs is
truth-resolvable. There is no ordering here to recover, and no wrong answer a
screen could give, because all three are the same neck as far as the
measurement — or the player — can tell. The fourth row is the incumbent at
0.00 and is not competitive with any of them.

This is ticket 222's trinket story repeated exactly: **a real cluster of
genuinely equivalent alternatives, presented as an ordered list it has no right
to be.** That is ticket 224's problem, not ticket 225's.

### 4. The trinket slot has a shared -31.33 DPS cliff across eleven unrelated trinkets.

```
  16.14  ABOVE  Pendant of the Violet Eye
  16.00  ABOVE  Dragonspine Trophy
   8.82  ABOVE  Tsunami Talisman
   0.00  below  Bloodlust Brooch                   (worn)
   0.00  below  Hourglass of the Unraveller        (worn)
  -1.25  below  Madness of the Betrayer
  -4.18  below  Crystalforged Trinket
  -4.67  below  Living Root of the Wildheart
 -25.44  below  Romulo's Poison Vial
 -31.33  below  Moroes' Lucky Pocket Watch
 -31.33  below  The Lightning Capacitor
 -31.33  below  Eye of Magtheridon
 -31.33  below  Spyglass of the Hidden Fleet
 -31.33  below  Prism of Inner Calm
 -31.33  below  Scarab of Displacement
 -31.33  below  The Skull of Gul'dan
 -31.33  below  Ashtongue Talisman of Equilibrium
 -31.33  below  Memento of Tyrande
 -31.33  below  Shadowmoon Insignia
 -32.06  below  Sextant of Unstable Currents
```

The top of this list is credible: Dragonspine Trophy and Pendant of the Violet
Eye are the well-known strong feral trinkets of this era, and their being the
top two is right. The bottom is not. **Eleven trinkets sharing an identical
-31.33** is not eleven trinkets that happen to be equal. Several of them are
caster trinkets a feral gains nothing at all from; several are melee trinkets a
feral gains something real from. Specifically:

- **Ashtongue Talisman of Equilibrium** is the feral tier-6 reputation trinket.
  Its effect is a Mangle-triggered strength proc. A feral would never see it
  tied with **Memento of Tyrande**, a caster trinket, at the same number.
- **The Skull of Gul'dan** and **Eye of Magtheridon** are caster trinkets and
  belong far down the list — but they should be roughly *inert*, near 0, not at
  -31.

An identical value shared across items with unrelated effects is the signature
of a group all scoring nothing, with -31.33 being whatever the character loses
by giving up the incumbent trinket. That is an item-effect modelling gap, not a
ranking outcome. The rule that an empty stat line never means a weak item
applies here in reverse: eleven trinkets landing on one number is what it looks
like when their effects are not counted at all.

The trinket slot is not a P1 or P2 row, so it does not change ticket 225's
arithmetic. Recorded because it is the same failure as problems 1 and 2 and was
visible in this data.

### 5. The `finger` histogram is a real TBC flatness result, and it holds up.

`finger` is the biggest band contributor: **9 band-above, 13 band-below**, 22
of the 70 band rows, from **49 candidates of which 16 are above cutoff**. The
ticket's framing — that rings below the top one or two are famously flat in
TBC — is **correct here**, with one qualification.

```
  19.25  ABOVE  Band of the Eternal Champion    <- clearly separated
  11.47  ABOVE  Band of Eternity
  10.52  ABOVE  Band of Devastation
  10.09  ABOVE  Ancestral Ring of Conquest
   9.49  ABOVE  Unstoppable Aggressor's Ring
   9.46  ABOVE  Stormrage Signet Ring
   8.15  ABOVE  Band of Eternity
   7.88  ABOVE  Band of Eternity                <- band begins
   7.80  ABOVE  Band of Eternity
   7.80  ABOVE  Band of the Eternal Restorer
   6.37  ABOVE  Phoenix-Ring of Rebirth
   5.58  ABOVE  Band of Eternity
   5.57  ABOVE  Ring of Deceitful Intent
   5.16  ABOVE  Band of Eternity
   4.63  ABOVE  Ring of Lethality
   4.61  ABOVE  Mender's Heart-Ring
```

**Band of the Eternal Champion at 19.25 sits well clear of the band** and the
screen decides it correctly. That is also the right game answer — it is the
feral Scale of the Sands revered ring and the standard pick for this character.
Everything from rank 2 down is within roughly one noise width of its
neighbours, which matches the game: the TBC ring slot is a long tail of
near-identical agility / attack-power lines from different factions and bosses,
and players choose by whichever reputation they already have. **This is
interchangeability, correctly detected.** No engineering action is needed on
the finger ordering.

One qualification, a data-quality note rather than a ranking one: **"Band of
Eternity" appears nine separate times** in this slot at nine different values
(11.47, 8.15, 7.88, 7.80, 5.58, 5.16, -1.83, -3.24, -5.11, and more at -25.38).
In game the Scale of the Sands ring is one item with per-role variants that
have distinct names — Band of the Eternal Champion, Band of the Eternal
Restorer, Band of the Eternal Sage, Band of the Eternal Defender. Nine rows
sharing the plain name "Band of Eternity" across a 37 DPS spread means the name
does not distinguish items a player sees as different. Someone reading this
output cannot tell which "Band of Eternity" is which. That lands in the same
place as ticket 224.

## Rows that look fine

- **All 28 band-above rows are legal feral gear.** Leather or non-armor slots,
  sourced from raid, badge, reputation and tier tokens. No plate, no mail, no
  caster weapons, no PvP-only or encounter-only items presented as normal loot.
  Nothing in the band is an item a feral cannot use or would never be offered.
- **The clear-above top of each slot is credible.** Band of the Eternal
  Champion (finger), Dragonspine Trophy and Pendant of the Violet Eye
  (trinket), Teeth of Gruul (neck) are the pieces a feral of this tier would
  expect at the top of their slots.
- **P2 = 0 is a genuinely reassuring result.** No band-above row is the only
  above-cutoff item of its slot, so losing any single band row to the screen
  cannot empty a slot. Every slot with band-above rows also carries clear-above
  rows: `finger` has 16 above cutoff against 9 band-above, `wrist` 10 against
  4, `feet` 14 against 3, `waist` 9 against 2, `legs` 7 against 2, `back` 6
  against 3. This part of the measurement does what it claims.
- **The band-below rows are correctly below the boundary.** Nothing down there
  is a piece a feral would be upset to lose to the screen.

## Gate

**Would I trust this output as a feral druid who knows the game? No — not for
head, ranged, or trinket.**

What must be true before yes:

1. **The head slot must stop showing every helm in the game as a ~200 DPS
   loss.** Until Cursed Vision of Sargeras and Thunderheart Cover sit within
   single-digit to low double-digit DPS of Wolfshead Helm, the head row of any
   report is unusable, and a player will discard the whole report on sight of
   it.
2. **The ranged slot must stop showing Idol of the White Stag at -21 DPS.**
   Whatever the correct ordering between the two idols turns out to be, that
   gap is not it.
3. **The trinket slot's shared -31.33 must resolve.** Eleven trinkets on one
   number means their effects are not being counted. Feral-relevant trinkets —
   Ashtongue Talisman of Equilibrium above all — must separate from caster
   ones.
4. **P1 must be recomputed after 1 and 2.** As measured, P1 = 3 counts three
   worn items sitting at 0.00 DPS, not three close calls. Once head and ranged
   score sanely, those two slots will be decided by real alternatives rather
   than by the incumbent, and P1 will mean something.

Conditional on those four: the **finger**, **neck**, **wrist**, **waist**,
**feet**, **back**, **legs**, **chest** and **hands** rows in this band are
fine to trust as ties, and I would sign off on treating that whole band as
interchangeable.

## Notes for engineering

- Every band item scoring exactly **0.00 DPS** is an item the character is
  already wearing: Wolfshead Helm (head), Everbloom Idol (ranged), Haramad's
  Bargain (neck), Blood Knight War Cloak (back), Bloodlust Brooch and Hourglass
  of the Unraveller (trinket), Overseer's Signet and Shapeshifter's Signet
  (finger). Eight of the 42 band-below rows are the character's own gear.
  Whether already-worn items belong in a candidate pool at all is worth a
  decision on its own; as things stand they inflate the band and they drive P1.
- **P1 = 3 does not survive contact with the underlying rows.** All three P1
  slots resolve to a worn item at 0.00. Read P1 = 3 not as "three slots whose
  best upgrade is undecidable" but as "three slots with no upgrade in the
  pool", two of which have no upgrade because of a scoring problem.
- Head: eighteen helms, all leather, all legal for a druid, all between -174
  and -254 DPS against a level-42 crafted incumbent. That is a cliff, not a
  stat comparison.
- Ranged: only two idols in the pool, and the Phase 3 raid idol loses to the
  badge idol by 21 DPS.
- Trinket: eleven trinkets share the value -31.33 exactly, tying caster
  trinkets with melee ones. That cannot be right for either group.
- "Band of Eternity" is nine distinct rows under one name spanning 37 DPS. The
  in-game item has per-role variant names; whatever produces the name is
  collapsing them.
- On ticket 225's actual question: the band **is** ticket 222's trinket story
  again. Same-slot alternates inside the pairwise noise scale, no
  truth-resolvable pairs among the top of any affected slot, and no slot
  emptied by losing a band row (P2 = 0). The screen is not hiding a decision.
  It is presenting a tie as an order — ticket 224.
