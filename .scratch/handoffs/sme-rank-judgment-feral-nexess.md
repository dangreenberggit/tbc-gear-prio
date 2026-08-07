# SME rank judgment — feral cat, nexess

## Verdict

**do-not-trust.**

Not because the items are nonsense — most individual rows name real feral cat
gear, and nothing here is unequippable by a druid. The problem is that the list
fails a basic in-game sanity check in two places at once, and the slot coverage
is narrow enough that a feral reading it would conclude the tool does not know
what he is wearing. A ring he already has on is presented as a gain. Two of his
weakest-looking slots are never mentioned. That combination is disqualifying for
a product gate even though the top pick happens to be right.

## What was reviewed

- **Character:** nexess, Dreamscythe-US, feral cat druid (night elf assumed).
- **Phase:** 2, T5 era (SSC / Tempest Keep current).
- **Baseline:** 2100.02 DPS ± 82.52, from his own logged gear on a Fathom-Lord
  Karathress kill. 3000 iterations, seed 42.
- **Baseline gear, in short:** a mixed bag — four Malorne (T4) pieces
  (shoulders, chest, plus the head slot filled by Wolfshead Helm instead),
  Terestian's Stranglestaff from Karazhan, Edgewalker Longboots, Girdle of
  Treachery, Leggings of Murderous Intent, Ring of Lethality and Overseer's
  Signet, Tsunami Talisman and Bloodlust Brooch, Thalassian Wildercloak,
  Everbloom Idol.
- **Results from:** the shortlist in
  `C:\Users\dgree\AppData\Local\Temp\claude\C--Users-dgree-Code-lulz-tbc-gear-prio\2dbb890c-0040-4f81-804f-44ee8e897e00\scratchpad\brief-nexess.md`;
  item pool `data/universes/feral-p2.json` (250 rows).

## Game problems

### 1. Ring of Lethality is already on his finger and is offered as a +8.48 gain

This is the hard failure. Row 12 tells him to go get an item he is wearing in
the baseline gear table on the same page. In game, equipping a ring you already
have equipped is a no-op, so the only honest number here is zero.

Two sub-cases matter and the output does not distinguish them, which is itself
the problem:

- If the engine is comparing Ring of Lethality against his *other* ring
  (Overseer's Signet), then the row is really "a second Ring of Lethality would
  beat Overseer's Signet" — which is not a thing, since the ring is unique-
  equipped in practice for a raider with one drop, and in any case the row is
  labelled as a straight upgrade with no such qualifier.
- If the engine simply does not know he has it on, then the baseline it simmed
  is not the gear he is actually wearing, and every number on the page inherits
  that doubt.

Either way a feral looks at row 12, looks at his own character sheet, and stops
trusting the list.

### 2. Thalassian Wildercloak is worn, and the back slot never appears at all

Same family of problem, quieter. He has a cloak on, and the shortlist contains
zero back rows across fifteen entries. A cloak at T5 is one of the more
contested slots in TBC — there are several feral-relevant cloaks in this tier —
so silence in that slot is not a plausible "you are finished here" answer. It
reads as the slot not being under consideration rather than as a verdict.

Contrast with the ring case: for rings the tool is over-eager and offers him
one he owns; for cloaks it is silent. Both point at the same underlying thing
from an in-game standpoint — the comparison does not appear to be anchored to
his real equipped set.

### 3. The ranged slot is missing again, and it is the same gap as last time

He wears Everbloom Idol. No idol appears anywhere in the fifteen rows. This is
the same finding as the shredzepelin review, and I want to be clear that it has
**not** been fixed from the player's point of view even though the pool has
changed: `data/universes/feral-p2.json` now does contain Everbloom Idol
alongside Idol of the Avian Heart and Idol of the Crescent Goddess, so the item
is known — it simply never surfaces in what he is shown.

The game fact for engineers: a cat's idol is a real DPS slot, the idols
available at this tier are meaningfully different from each other, and a feral
who sees no idol row cannot tell whether the one he is wearing is right. Note
also that Idol of the Avian Heart is a **healing** idol — it boosts a healing
spell and does nothing for a cat. If it is in the pool as a candidate for a
feral DPS rank, it is noise regardless of whether it surfaces.

### 4. Half his slots are never discussed, and they are the ones a feral would ask about first

Fifteen rows cover exactly five slots: weapon, waist, wrist, neck, finger.
There is not one row for head, shoulder, chest, legs, hands, feet, back,
trinket, or ranged.

That silence would be defensible if those slots were finished. They are not:

- **Head: Wolfshead Helm.** This is a Classic-era engineered leather helm. Its
  historical value to a feral was the energy-on-shapeshift effect, which was a
  pre-TBC powershifting trick; by T5 its stat budget is far below anything in
  this tier, and a T5 feral is not normally wearing it. Whether or not one
  argues about the effect, "no head upgrade exists for a character in a Classic
  engineering helm at T5" is not a believable in-game statement. Stag-Helm of
  Malorne and Nordrassil Headdress are both in the pool.
- **Hands: Gloves of Dexterous Manipulation.** I am fairly confident this is not
  a feral cat glove — it is leather, so he can wear it, but its budget is spent
  on caster-facing stats rather than on the attack power / crit / hit a cat
  wants. A cat in these should have visible hand upgrades. Gauntlets of Malorne
  and Nordrassil Handgrips are in the pool.
- **Tier.** He is in Malorne (T4) pieces at a T5 phase, and Nordrassil (T5)
  pieces exist in the pool for shoulder, chest, hands, head and legs. An empty
  tier section was the *correct* answer for shredzepelin because he already wore
  five T5 pieces. It is the *wrong* answer here, for the opposite reason. This
  is the single clearest sign that the shortlist is not covering his actual
  weak slots.

I flag the head and hands assessments as high-confidence on direction (these are
not T5 feral-standard pieces) and lower-confidence on exact magnitude.

### 5. Merciless Gladiator's Maul at #1 is defensible in game, but "BiS" is doing unearned work

The pick itself is right and I would not argue with it. Feral cat weapon choice
in TBC is governed by **feral attack power**, which is derived from the weapon's
damage-per-second — the weapon's own swing damage is irrelevant in cat form,
because cat attacks use the form's own damage. Arena two-handers of this era
have high enough DPS that they were a genuinely recommended, widely-used feral
weapon, competitive with or better than most raid two-handers at this tier.
Merciless Gladiator's Maul is the Season 2 arena mace, contemporary with T5. So
a feral cat topping out on an arena maul is a correct in-game result, not an
artifact.

Two things about the presentation are still wrong:

- **"BiS" flattens an acquisition rule that matters.** This is an arena reward
  bought with arena points, and Season 2 arena gear carried a personal/team
  rating requirement on the weapon. It is not a drop he can be assigned in a
  raid. Ranking it #1 next to Lady Vashj loot with the same "BiS" tag, under a
  column that just says "arena (PvP)", implies these are interchangeable ways to
  get an item. In game they are not remotely the same commitment.
- **Staff versus maul is a fair comparison here, and the output should say so.**
  Terestian's Stranglestaff (Karazhan) and the maul are both two-handers, and
  for a cat both contribute only through feral AP plus stats. So the swap is
  sensible and there is no hidden weapon-speed or damage-range consideration to
  worry about — *provided the engine is valuing them by feral AP and not by
  weapon damage.* I cannot tell which it did from this output, and it is the one
  number that decides the whole #1 row. Worth an engineer confirming.

### 6. Haramad's Bargain has no recorded origin, and it is a quest reward

Row 10 shows "no recorded origin". The game fact: Haramad's Bargain is a neck
from a Consortium quest chain in Netherstorm, not a raid drop and not a vendor
purchase. That places it in the same category the earlier feral handoff already
identified as a blind spot — quest and vendor items reaching the pool without
provenance.

For a player this is a meaningful distinction, because a quest neck is
soloable-today whereas the raid necks above and below it are not. Presenting it
in an undifferentiated list with a blank source column loses that.

### 7. The magnitudes are too small for this character

This is the finding I would put second in importance after the equipped-ring
bug, and it is a judgment call rather than a hard fact, so I will show my
reasoning.

A 2.40% top gain and everything else under 1.6% is the profile of a
**well-geared** character with only marginal slots left. That profile fit
shredzepelin, who was in five T5 pieces. It does not fit nexess. He is in T4
Malorne pieces, a Classic engineering helm, and what look like caster gloves,
at a T5 phase. A feral in that state should have several upgrades worth
considerably more than 2.4% available — full tier-piece swaps, a real helm, real
gloves.

The fact that the largest gain on offer is a weapon at 2.4%, while an entire
tier of armour upgrades he plainly needs is absent from the list, is consistent
with finding 4: the slots where the big numbers live are not being shown. I do
not think the numbers on the rows that *are* shown are wrong — a 0.4% ring is
a believable ring delta. I think the list is missing its own top half.

### 8. Everything from row 3 down is a statistical tie, presented as a ranking

The brief states this outright: rows 3–15 are all within about one standard
error (~1.5 DPS) of their neighbours. That is honest and I am glad it is
recorded. In game terms the ordering inside that block is not worth arguing over
— Vambraces of Ending at #3 versus Band of the Ranger-General at #15 is not a
distinction a feral can act on or feel.

The presentation problem is unchanged from the previous review: a numbered list
reads as a strict ranking to anyone who does not read the footnote. With a
±82.52 baseline error bar and gains of 3–16 DPS, thirteen of the fifteen rows
are noise against each other.

## Rows that look fine

- **Merciless Gladiator's Maul at #1** — correct feral pick, as argued above.
  The item is fine; the tag and the sourcing are what I object to.
- **Belt of One-Hundred Deaths (#2)** — a genuine, well-known feral belt from
  Lady Vashj, and he is wearing Girdle of Treachery, so a real gain there is
  believable. Good row.
- **Vambraces of Ending (#3), Shard-bound Bracers (#7), Veteran's Leather
  Bracers (#9)** — he is in Shackles of Quagmirran, so bracer competition is
  expected. All three are real and equippable.
- **Ancestral Ring of Conquest, Shapeshifter's Signet, Band of the
  Ranger-General** — normal raid and reputation rings a cat would want. Fine.
- **Telonicus's Pendant of Mayhem, Pendant of the Perilous, Mithril Chain of
  Heroism** — real neck options. He is in Worgen Claw Necklace, so movement in
  this slot is expected. The Chess Event row is correctly labelled as such;
  worth noting only because Chess is an unusual, low-effort source compared to
  the boss drops around it.
- **Belt of Deep Shadow, Belt of Natural Power** — crafted leather, correctly
  labelled crafted.
- **Equip rules are holding throughout.** No plate, no mail, no shields, no
  bows or guns, nothing a druid cannot wear. Nothing encounter-only or
  temporary. Nothing from a future phase. That part of the output is sound and
  should not be lost in the noise of the findings above.

## Gate

**No.**

Would a feral cat trust this output as it stands? No, and the reason is small
and immediate rather than subtle: he would see Ring of Lethality on his own
character, see it listed as an +8.48 DPS upgrade, and stop reading. Nothing else
on the page recovers from that.

The slot coverage compounds it. A feral in T4 shoulders and chest, a Classic
engineering helm and caster gloves who is told his best available move is a
weapon worth 2.4% will conclude the tool is not looking at half his character.

What must be true before this is a yes:

1. **No item the character is currently wearing may appear as a gain.** If the
   engine means "a second copy would beat your other ring", it has to say that
   in those words, in that row. Silence plus a positive number is wrong.
2. **The equipped set the engine simmed must demonstrably be the set in the
   baseline table.** Finding 1 makes this doubtful, and every number depends on
   it.
3. **Slots he has obvious room in must produce rows** — head, hands, and the
   T5 tier pieces at minimum. An empty slot must mean "checked, nothing better",
   and that must be distinguishable from "not checked".
4. **The idol slot must produce a row** comparing against Everbloom Idol. The
   items are in the pool now; they are not reaching him.
5. **The #1 weapon row must be confirmed to be valued by feral attack power,
   not by weapon damage.** If that is already true, say so and this stops being
   a question.

Items 1 and 2 are blocking. Items 3–5 are what stand between
`trust-with-caveats` and `trust`.

## Notes for engineering

- Ring of Lethality is equipped in the baseline table and shown at #12 as
  +8.48 DPS. Equipped item shown as an upgrade — hard sanity failure.
- Thalassian Wildercloak is equipped and the back slot produces no rows at all.
  Over-eager in one worn slot, silent in another.
- Everbloom Idol is in `data/universes/feral-p2.json` this time, but no idol
  row reaches the shortlist. The pool fix did not change what the player sees.
- Idol of the Avian Heart is a healing idol and is not a cat DPS candidate.
- Wolfshead Helm is a Classic engineering helm; he is wearing it at T5 and no
  head row is offered. Stag-Helm of Malorne and Nordrassil Headdress are both in
  the pool.
- Gloves of Dexterous Manipulation are caster-facing leather; no hands row is
  offered. Gauntlets of Malorne and Nordrassil Handgrips are in the pool.
- He wears T4 (Malorne) at a T5 phase and no Nordrassil piece appears, though
  five are in the pool. An empty tier section was correct for shredzepelin and
  is incorrect here.
- Top gain 2.40% with everything else under 1.6% is too flat a profile for a
  character geared this far below tier. Suspect the large-gain slots are the
  ones absent, not that they do not exist.
- Merciless Gladiator's Maul is Season 2 arena, bought with arena points under a
  rating requirement. Correct pick, but "BiS" next to Vashj loot with the same
  tag equates two very different acquisition paths.
- Feral cat weapons are valued by feral attack power derived from weapon DPS;
  weapon swing damage is unused in cat form. Confirm the #1 row was computed
  that way — the whole top pick rests on it.
- Haramad's Bargain is a Netherstorm Consortium quest reward. Blank origin
  column; quest/vendor provenance still not landing.
- Rows 3–15 are one long tie block presented as a numbered ranking. Same
  presentation issue flagged in the shredzepelin review; unchanged.
