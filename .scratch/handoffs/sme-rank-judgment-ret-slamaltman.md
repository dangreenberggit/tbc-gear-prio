# SME rank judgment — retribution paladin, slamaltman

## Verdict

**do-not-trust.**

Not because the list is full of nonsense — most rows are real ret paladin
items from the right tier, and the top row is correct and important. The
verdict is driven by one row that fails a check any ret would apply in the
first five seconds: **row #2 is a ring he is already wearing, offered as the
second-biggest gain on the board.** That single row is enough to make a
knowledgeable player distrust every other number on the page, because it
proves the engine is not comparing against what is actually on his character.

There is a second, independent problem: the ring in question is not a
retribution paladin item at all, which means the same row is wrong twice over.

## What was reviewed

- **Character:** slamaltman, Dreamscythe-US, retribution paladin (blood elf,
  race assumed rather than read from the log).
- **Phase:** 2 (T5 era — Serpentshrine Cavern / Tempest Keep current).
- **Baseline:** 2003.26 DPS ± 119.22, from his own logged gear on a Hydross
  the Unstable kill. 3000 iterations, seed 42.
- **Baseline gear, in short:** a genuinely strong, near-finished T5-era ret
  set. Furious Gizmatic Goggles, Lionheart Executioner (the crafted two-hander
  that is the accepted Phase 2 BiS weapon), Crystalforge Breastplate (T5),
  Girdle of the Endless Pit, Warboots of Obliteration, Bladespire Warbands,
  Dragonspine Trophy plus Bloodlust Brooch, Libram of Avengement, Drape of the
  Dark Reavers, and two rings — Ring of a Thousand Marks and
  **Shapeshifter's Signet**.
- **Results reviewed from:** the shortlist in
  `C:\Users\dgree\AppData\Local\Temp\claude\C--Users-dgree-Code-lulz-tbc-gear-prio\2dbb890c-0040-4f81-804f-44ee8e897e00\scratchpad\brief-slamaltman.md`
  (13 shown rows, pool of 235).

## Game problems

### 1. Row #2 is a ring he already has on, shown as +22.40 DPS

He is wearing **Shapeshifter's Signet** in a finger slot. The shortlist offers
Shapeshifter's Signet at #2, tagged BiS, as a **+22.40 DPS / 1.12% gain** —
the largest gain on the list after the belt.

In the game this is impossible. Equipping a ring you are already wearing
changes nothing. A gain of that size means the comparison was made against
something other than his real finger slots. It is also a *Unique* ring, so he
cannot even wear a second copy — the row is not merely wrong, it describes an
action the game will not let him take.

This is the finding that sets the verdict. Everything else on the page is
numerically plausible; this row is not, and it is near the top where it does
the most damage to trust.

### 2. Shapeshifter's Signet is not a retribution paladin ring

Independent of the already-worn problem: this ring should probably not be on a
ret list at all, and it is questionable that he is wearing it.

Shapeshifter's Signet (ilvl 100, Lower City — Exalted, from Nakodu) is
**+25 Agility, +18 Stamina, +20 expertise rating**. Agility is the giveaway.
The name is not decoration — it is built for **shapeshifting classes**, i.e.
feral druids, and agility-scaling rogue/hunter-type characters. A retribution
paladin scales off **Strength**; agility gives him only a sliver of crit and
essentially no attack power. The expertise is real value, but 25 agility on a
plate DPS is close to a dead stat.

Two things follow for engineers:

- Offering it to a ret is a class-appropriateness miss, not just a duplicate.
- The same ring appeared on the feral druid's list, where it *is* correct.
  A ring that is right for one character and wrong for another is showing up
  on both.

Note also that the **"BiS" tag on this row is wrong.** No ret paladin BiS list
for this tier carries Shapeshifter's Signet. Whatever that tag means, it is
telling the player something false here.

### 3. Pendant of the Perilous — same already-worn pattern, second character

He is wearing Pendant of the Perilous (SSC trash drop, ilvl 128). The brief
notes it also appeared on another character's list. It does not appear on
*his* shortlist, so there is no bad row to point at here — but combined with
finding 1, it suggests the engine's picture of "what this character already
owns" is not reliably feeding the comparison. Worth an engineer's attention as
a pattern, not as a standalone bug.

### 4. A'dal's Command has no recorded origin, but the item is real and fine

The row at #12 shows no source. For the record, the **game fact**:
A'dal's Command is ilvl 105, **+29 Strength, +16 Agility, +18 Stamina**, sold
by Almaador in Shattrath City for roughly 79 gold, and requires **The Sha'tar —
Exalted**. It is a reputation vendor ring, not raid loot, not PvP, not
encounter-only, and it is a perfectly sensible ret paladin ring — strength-led,
which is exactly what Shapeshifter's Signet is not.

So this is a **missing-provenance display problem, not a bad recommendation**.
The item belongs on the list. The player just cannot tell it is a rep grind
rather than a raid drop, which is the single most decision-relevant fact about
it.

### 5. The hit report and the shortlist do not tell the same story

The run says he sits at **72 hit rating against an estimated cap of 142** —
roughly 70 rating short, which is a large miss. At that distance under the cap
a meaningful share of his special attacks are missing outright, and hit is
normally the dominant thing to fix.

Now look at what he is offered. Of the thirteen rows, the ones carrying
worthwhile hit are thin on the ground. **Razor-Scale Battlecloak (#3) — the
cloak that is widely considered the best ret cloak of this tier — is
+33 Strength / +23 Agility / +22 Stamina and has no hit at all.** The cloak he
is currently wearing, Drape of the Dark Reavers, **does** carry 17 hit rating.
So the #3 recommendation would move him *further* under a cap the same report
just flagged as his biggest stat problem, and nothing on the page says so.

That is not necessarily a wrong number — Razor-Scale is a big raw stat jump and
may genuinely win on raw throughput. But a ret reading this page sees "you are
70 hit short" at the top and then a shortlist whose recommendations mostly do
not address it, with no warning that the top cloak actively costs him hit. The
prior feral review praised the product for flagging Tsunami Talisman as
hit-driven; that same courtesy is missing here, in a case where it matters
more.

Worth noting the contrast: **Bulwark of the Ancient Kings (#4)** carries
**+25 hit rating and +41 crit**, three prismatic sockets, and a use effect
granting **150 Strength for 15 seconds** — it is one of the few rows that
genuinely serves the hit problem, and its ranking below a zero-hit cloak is
the kind of thing that deserves the hit annotation.

### 6. Six cloaks and five rings out of thirteen — defensible, with one caveat

I looked at this expecting to call it wrong. It is mostly **right**.

His big slots are close to done: T5 chest, the Phase 2 BiS weapon already in
hand, strong boots, bracers, belt, head and both trinkets. When the large slots
are finished, cloaks and rings are what is left — and back and finger are the
two slots in TBC with by far the deepest pool of competing drops. A long tail
there is the expected shape, not a bug. The feral review reached the same
conclusion for the same structural reason, and it holds here too.

The caveat is the **spread**. Rows 3 through 13 span +15.82 down to +3.77 — all
under 0.8%, most under 0.5%, on a character whose own baseline has a **±119
DPS** confidence band. Those gaps are far smaller than the measurement noise.
A numbered list from 3 to 13 reads as a strict ordering that the evidence
cannot support. Not worth arguing over which of #9 and #11 is better; the
presentation implies a precision the numbers do not have.

### 7. Well-known Phase 2 ret pieces are absent — and here that is mostly correct

I checked for the usual suspects. The reason the tier and weapon slots are
empty is that **he already has the answers**:

- **Weapon** — Lionheart Executioner is the accepted Phase 2 ret BiS two-hander
  (crafted, Nether Vortex). He is wearing it. An empty weapon slot is the right
  answer, not a gap. Twinblade of the Phoenix from Tempest Keep is the usual
  named alternative and does not beat it for ret.
- **Head** — Furious Gizmatic Goggles is the engineering goggle that sits at or
  near the top of T5 ret lists. He is wearing it.
- **Tier** — he has Crystalforge Breastplate. Only one T5 piece, so I would
  have expected *some* Crystalforge shoulders/gloves/legs/helm to appear
  somewhere in the pool as candidates, particularly given the 2-piece and
  4-piece Crystalforge bonuses are part of how ret is built at this tier. Their
  total absence from the shown rows is the one genuine "expected piece missing"
  signal I have, and I am **moderately, not highly, confident** here — they may
  simply have fallen below the cutoff, and set bonuses are exactly the kind of
  thing a per-item comparison undervalues.
- **Libram** — nothing offered. He wears Libram of Avengement. The prior feral
  review already recorded that ret's ranged slot holds only two librams for
  this phase, so this is a known standing shape rather than something new.

### 8. Equip rules are holding

Nothing on this list is unequippable by a paladin. No bow, no gun, no
crossbow — the ranged slot correctly stays a libram question. No leather or
mail masquerading as an upgrade. No arena or PvP gear presented as raid loot.
No encounter-only or temporary items. Cloth cloaks (Razor-Scale, Vengeance
Wrap, Drape of the Dark Reavers) are fine — back slot has no armor class
restriction.

## Rows that look fine

- **#1 Belt of One-Hundred Deaths, +47.94 (2.39%)** — correct, and correctly
  first by a wide margin. This is the standout Phase 2 belt for physical DPS,
  it drops from Lady Vashj in SSC, and he is wearing Girdle of the Endless Pit.
  A gain of that size is entirely believable. The clear-daylight gap between
  #1 and everything else is itself a good sign.
- **#3 Razor-Scale Battlecloak** — the right cloak for the tier, correct
  source (Morogrim Tidewalker, SSC), correct BiS tag. Only concern is the hit
  loss noted above.
- **#4 Bulwark of the Ancient Kings** — real, correctly labelled crafted. Worth
  knowing it is **Armorsmith-only**, so a non-blacksmith cannot use it at all;
  the brief says profession-locked items are excluded, so its presence here is
  worth an engineer's glance.
- **#5 Thalassian Wildercloak** and **#6 Black-Iron Battlecloak** — real items,
  sources correct (Kael'thas / Doomwalker). Doomwalker is a world boss, which
  is correctly stated.
- **#7 Vengeance Wrap** — real tailored cloak, ilvl 105, crafted, correct.
  Reasonable that it ranks below the raid cloaks.
- **#8 Ancestral Ring of Conquest**, **#10 Band of the Ranger-General**,
  **#11 Mithril Band of the Unscarred** — all normal raid rings a ret would
  want, sources correct.
- **#12 A'dal's Command** — good ring for him, strength-led. Only the missing
  origin is a problem, not the recommendation.
- **#13 Ring of Reciprocity** — real, Doom Lord Kazzak, correctly marked world
  boss.
- Sources are otherwise accurate throughout, and raid / crafted / world-boss /
  reputation are kept distinct where recorded.

## Gate

**No — not in this state.**

Would a ret who knows the game trust this output? He would trust row #1
immediately and act on it. He would then hit row #2, see a ring already on his
finger being sold to him as a 22 DPS gain, and stop reading. That is the whole
gate. The rest of the list is good enough that fixing the top would change the
answer substantially.

What must be true before an unqualified yes:

1. **Gear he is already wearing must never appear as a gain.** Either it is
   excluded, or it appears at zero. A worn item at +22.40 is a correctness
   failure visible without any game knowledge at all.
2. **Shapeshifter's Signet should not reach a retribution list**, and its
   "BiS" tag on a ret page is false. Agility-and-expertise is a shapeshifter
   ring.
3. **A'dal's Command needs its origin.** "Sha'tar — Exalted vendor" is the most
   decision-relevant fact about that row and it is blank.
4. **The hit gap needs to reach the rows.** With the report saying ~70 rating
   short, an item that removes hit — as Razor-Scale does relative to his
   current cloak — should say so on the row.

Items 1 and 2 are blocking. Items 3 and 4 are quality issues that would move
this to `trust-with-caveats` on their own.

## Notes for engineering

- Shapeshifter's Signet is on his character right now and is listed as a
  +22.40 gain at #2 — worn item shown as an upgrade.
- That ring is also *Unique*, so a second copy is not equippable even in
  principle.
- Shapeshifter's Signet is +25 Agility / +18 Stamina / +20 expertise, from
  Lower City Exalted. It is a shapeshifter/agility ring, not a ret ring — ret
  scales off Strength.
- The "BiS" tag on that row is factually wrong for retribution.
- The same ring is correct on the feral list and wrong on this one; it is
  appearing on both.
- Pendant of the Perilous is also worn and also turned up on another
  character's list — same "what does he already own" smell, no bad row here yet.
- A'dal's Command is real and good for ret: +29 Str / +16 Agi / +18 Sta, bought
  from Almaador in Shattrath at Sha'tar Exalted. It just has no origin printed.
- Razor-Scale Battlecloak (#3) has zero hit; his current Drape of the Dark
  Reavers has 17 hit. Taking the #3 recommendation moves him further from a cap
  the same report flags as his main gap, with no warning.
- Bulwark of the Ancient Kings (#4) is Armorsmith-only. The run states
  profession-locked items are excluded, so it arguably should not be here.
- No Crystalforge (T5) pieces appear anywhere despite him having only one. Set
  bonuses are hard to value per-item; flagging as a moderate-confidence gap.
- Rows 3–13 span 0.19%–0.79% against a ±119 DPS baseline band. The ordering
  inside that block is below noise; presenting it as a strict 3-to-13 ranking
  overstates the evidence.
- Equip rules held: no bow/gun on a paladin, no wrong armor class, no PvP or
  encounter-only loot. Weapon and head slots are correctly empty because he
  already has the Phase 2 BiS in both.
