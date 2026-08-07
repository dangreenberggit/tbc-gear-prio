# SME judgment — ticket 44 source-ordering plan

## Verdict

`trust-with-caveats` — the plan's central conclusion is correct in game terms,
but two of its proposed steps are unsafe as written, and one bug it files as
cosmetic is a real wrong-fact-about-the-game bug.

## What was reviewed

`.scratch/carry-forward/ticket-44-plan.md`, against the source rows in
`data/universes/ret-p2..p5.json` and `feral-p2..p3.json`. Paladin (ret) and
druid (feral), phases 2–5. This is a review of source/provenance claims — where
an item comes from — not of DPS ordering.

## Game problems

**1. "Token before raid" is the right call, and for a game reason the plan does
not state.**

For a tier piece the raid row is not merely less informative, it is misleading.
You do not kill Kael'thas and receive Crystalforge Breastplate. You receive
`Chestguard of the Vanquished Champion` and then hand it to a vendor. A row that
says "Tempest Keep · Kael'thas Sunstrider" describes a drop that does not
happen. The token row names the thing that actually drops and the vendor step is
implied by its existence. Keep token first. Consider whether the bare `raid` row
on a tier piece should exist at all.

**2. 30990 Lightbringer Breastplate names the wrong token — this is not
cosmetic.**

The plan lists the spliced `boss` fields as a formatting defect. One of them is
worse. 30990 is a paladin chest, so it is a **Conqueror** piece, and its token
row correctly says `Chestguard of the Forgotten Conqueror`. Its raid row embeds
`Chestguard of the Vanquished Champion` — the *wrong token class group*
(Vanquished is the rogue/druid/shaman group in T4/T5 naming; a paladin cannot
use it). A player following that string brings the wrong token to the vendor.

Reproduce: the check in the review transcript compares the embedded name to the
token row's `token` for every tier row; 30990 is the only disagreement, and it
appears in ret-p3, p4 and p5. The other nine spliced rows embed the correct
token name and are indeed only ugly.

Treat 30990 as a correctness bug, not a display bug, when the upstream ticket is
filed.

**3. The Black Temple + Hyjal Summit items are genuinely both-true. The plan is
right to refuse to pick one.**

32591 Choker of Serrated Blades, 32589 Hellfire-Encased Pendant, 32590
Nethervoid Cloak, 32592 Chestguard of Relentless Storms and 34009 Hammer of
Judgement are all Tier-6-era **trash drops**, and that whole set of items drops
from trash in both Black Temple and Hyjal Summit. Neither zone is more true
than the other. Naming only one is a factual loss, and picking by pipeline order
or alphabetically is equally arbitrary. Displaying both is the only honest
option. This confirms the plan's framing: it is a display tie, not a precedence
problem.

**4. 30129 Crystalforge Breastplate — the two zones are NOT both-true in the
same sense, and the plan should not treat them alike.**

30129 is a tier chest. The `Chestguard of the Vanquished Champion` token drops
from Kael'thas in Tempest Keep. The third row claims Serpentshrine Cavern ·
Morogrim Tidewalker. Morogrim does not drop that token — the T5 chest token
comes from Kael'thas. This row looks like a bad join, not a second legitimate
source. Do not fold it in as an equal alternative zone the way the trash items
above should be folded in. It should be investigated and most likely dropped.

This matters for the plan's step 2: if dedup only collapses rows that *agree*,
30129's bogus SSC row survives and will show up in a Serpentshrine zone filter
as a tier chest that cannot be obtained there.

**5. Collapsing boss-less rows into boss-bearing rows of the same zone is safe
here, with one caveat.**

For 32591 and friends, `{raid, Hyjal Summit}` with no boss and
`{raid, Hyjal Summit, boss: Trash}` are the same claim at different precision,
so collapsing to the more precise one loses nothing. `Trash` and `Trash Mobs`
are the same thing spelled two ways and should normalise together.

The caveat: "Trash" is a legitimate, meaningful boss value in TBC and must not
be normalised away to nothing. For these five items trash is the *only* way to
get them, so a row that says only "Hyjal Summit" is strictly worse than one that
says "Hyjal Summit · Trash" — a player reading the former will look at a boss
loot table and never find it. Prefer the boss-bearing row; do not prefer the
bare one.

## Rows that look fine

The 61 `raid`+`token` rows already lead with the token row, which is the
correct-facing choice. `crafted` duplicate rows (76) carry no zone and no
conflicting claim. The `pvp` duplicates (4, e.g. Merciless Gladiator's
Greatsword) are season-vendor items with no zone and are harmless. The absence
of any `rep`+`badge` or `quest`+`crafted` pairing matches the game: those are
genuinely different acquisition paths and an item does not normally sit on both.

## Gate

Would a ret who knows the game trust the source lines this plan produces?
**Yes for the ordering change, no until 30990 and 30129 are dealt with.** The
ordering rule is sound and the refusal to build a precedence ladder is correct.
But the plan currently ships two rows that state false things about the game —
a paladin chest pointing at a token paladins cannot use, and a tier chest
claiming a boss that does not drop it. Those are exactly the kind of thing that
destroys trust in the tool, and neither is fixed by sorting.

## Notes for engineering

- Tier pieces: the token is what drops; the boss row on a tier piece describes
  an event that does not occur.
- 30990 names a token from the wrong class group — wrong-item bug, not a string
  bug.
- 30129's Serpentshrine row is very likely a bad join; do not preserve it as a
  legitimate alternate zone.
- "Trash" is real loot information. Keep it; do not collapse it to an empty
  boss.
