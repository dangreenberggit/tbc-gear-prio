# SME brief — is the junk filter safe to apply?

**Asked of:** game-domain review. **Not** a pipeline question.
**Date:** 2026-07-30

## The decision on the table

A "junk filter" would remove 136 of 362 items from the P3 ret universe before
they are ever simmed. It is currently **off**. The question is whether turning
it on is safe.

The engineering evidence is that on one character (slamaltman) not one rejected
item simmed above the upgrade cutoff — the best rejected item was **-19.16 dps**
against a **+3.4 dps** cutoff.

**The claim needing your judgment:** I wrote that this 22.6 dps margin "makes it
unlikely a weaker or differently-geared character would flip any reject above
cutoff." That is a game claim and I have no basis for it. A dps margin measured
on *this* character says nothing about a character with different gear, caps or
stat scaling. **Please accept, reject, or qualify it on game knowledge.**

## What the filter rejects

Two independent rules.

**Rule 1 — "caster-only" (119 items).** Drops an item if it carries any caster
stat (int, spirit, mp5, spell crit/haste/hit, etc.) and **no** melee stat
(str, agi, AP, melee crit/hit/haste, expertise, armor pen). `ranged` and
`trinket` slots are exempt. Note **spell damage was deliberately removed** from
the caster-stat list, because this repo's own ret EP weights price it at 0.17.

Top rejects by sim result (all downgrades):

| dps | item | slot |
|---|---|---|
| -19.16 | Drape of the Righteous | back |
| -20.46 | Ring of Ancient Knowledge | finger |
| -21.48 | Royal Cloak of the Sunstriders | back |
| -21.99 | Cloak of the Illidari Council | back |
| -22.30 | Shroud of the Final Stand | back |
| -23.50 | Ruby Drape of the Mysticant | back |
| -25.51 | Band of Al'ar | finger |

Full list: `.scratch/ticket-18/reject-list.json`.

**Rule 2 — "EP floor" (17 items).** Drops an item in the bottom 10% by EP
score, but only in `weapon`, `feet`, `waist`, `hands`, `wrist`. All 17:

| dps | item | slot |
|---|---|---|
| -42.75 | Vambraces of Courage | wrist |
| -45.57 | Ravager's Wrist-Wraps / Bands / Bracers | wrist |
| -49.33 | Girdle of the Invulnerable | waist |
| -56.80 | Iron Gauntlets of the Maiden | hands |
| -56.80 | Royal Gauntlets of Silvermoon | hands |
| -56.80 | Topaz-Studded Battlegrips | hands |
| -57.77 | Boots of Elusion | feet |
| -57.79 | Glider's Boots / Sabatons / Greaves | feet |
| -59.90 | Lurker's Grasp / Belt / Girdle | waist |
| **-70.51** | **Hammer of the Naaru** | **weapon** |
| **-103.91** | **Glaive of the Pit** | **weapon** |

## Specific questions

1. **The two weapons.** Hammer of the Naaru and Glaive of the Pit are being
   dropped by the EP-floor rule. Weapons are the slot where a poorly-geared
   character differs most from this one — slamaltman wields **Lionheart
   Executioner**, a strong weapon. Would either weapon be a real upgrade for a
   ret in worse gear, or are they genuinely not ret weapons at all? (Glaive of
   the Pit is a polearm; the universe admits polearms because paladins can
   equip them.)

2. **Is "caster stat and no melee stat" a sound rule for ret in TBC?** Any item
   class where it misfires — hybrid pieces, spell-power items ret actually
   wants, sockets//set bonuses changing the picture?

3. **The cloaks and rings.** Rule 1 drops many back and finger items. Those
   slots have no armor-type gate, so the universe carries pure caster pieces.
   Is there a ret-relevant back or finger item that reads "caster" by stats but
   is genuinely used?

4. **Does the margin argument hold at all?** Given a ret in blues/early
   Karazhan rather than this character's T5-level gear, could any listed reject
   plausibly become an above-cutoff upgrade? This is the actual question — the
   rest is context.

## Character the evidence came from

Ret paladin, P3, baseline 2003.26 dps. Worn:

```
head      Furious Gizmatic Goggles      chest   Crystalforge Breastplate
neck      Pendant of the Perilous       wrist   Bladespire Warbands
shoulder  Shoulderpads of the Stranger  hands   Gloves of the Searing Grip
back      Drape of the Dark Reavers     waist   Girdle of the Endless Pit
legs      Shattrath Leggings            feet    Warboots of Obliteration
finger1   Ring of a Thousand Marks      finger2 Shapeshifter's Signet
trinket1  Dragonspine Trophy            trinket2 Bloodlust Brooch
mainhand  Lionheart Executioner         ranged  Libram of Avengement
```

## What a useful answer looks like

A verdict on whether to apply the filter — `trust` / `trust-with-caveats` /
`do-not-trust` — plus any specific item or rule that is wrong on game grounds.
If the honest answer is "cannot be settled without simming a second, weaker
character," say that; it is a legitimate outcome and I will run it.
