# SME rank judgment — ticket 224, second opinion (feral-p3)

Second, independent SME on the revised screened-row presentation. The first
opinion is `.scratch/handoffs/sme-rank-judgment-ticket-224-screened-presentation.md`
(verdict `trust-with-caveats`). This review does not close the ticket.

## Verdict

**trust-with-caveats** on the revised presentation. I reach the same label as
the first SME, and I confirm his findings from repo data — but I part company
with him on two points, one of which is a correction to his own report.

1. He named **two** druid-illegal rows on the ranked side. There are **three**.
   He missed `Soul Cleaver` (axe). See P1 below.
2. He wants the wording changed to "not promoted past screening". I think that
   is worse for a player, and I propose different wording. See question 2.

## What was reviewed

- Character: druid, feral, `maxPhase 3` (feral-p3). Weapon and trinket slots.
- Output judged: the same rendered file the first SME judged,
  `…/scratchpad/sme-input.txt` (226 lines), produced by his throwaway
  `render-224.ts`. I did **not** re-run the renderer. The presentation
  question — does a name-ordered set read as a ranking — is answerable from
  the rendered text, and re-running with the same fixed draw 0 would produce
  the same rows.
- Item facts checked by me directly against `data/items/index.json`, with type
  codes resolved against the `WeaponType` and `HandType` enums in
  `packages/core/src/proto/common_pb.ts` (`WeaponTypeAxe = 1` … `Sword = 9`;
  `HandTypeOffHand = 3`, `TwoHand = 4`).
- Strings checked against source, not against the first SME's quotes:
  `rank-report-rules.ts:90-115` (disclosure line and listing),
  `view.ts:373-379` (`compareRuledOutRows` — slot, then name, then item id),
  `rank-report.ts:523-528` (the HTML `<details>` block).

### Carried caveat — the screening side is MODELLED

Every `screen ~Δ` figure below comes from `DerivedNoiseSimRunner` perturbing
recorded truth with seeded Gaussian noise, independent across candidates, one
fixed draw 0. No artifact of a real shipped screening ordering exists. The
promoted-row deltas are real 3,000-iteration sims. I restate this because the
conclusions in question 1 do not depend on it, and the conclusions in question
2 do — see below.

## Answers

### 1. Does trinket stop reading as a ranking, and does weapon keep its ordering?

**Trinket: yes, and for a reason stronger than alphabetisation.** The 12 rows
run Ashtongue → Memento → Moroes' → … → The Skull of Gul'dan. A feral reading
that sees no first place. The old ordering opened Spyglass, Eye of Magtheridon,
Romulo's — and to anyone who has read a BiS thread, position 1 in a list *is* a
claim. That claim is gone.

The important property is not that the order is alphabetical, it is that the
order is **invariant to the measurement**. Name order does not move when the
screening noise moves. A delta-ordered list, even under a caption saying it is
not a ranking, re-sorts every run and so encodes exactly the priority the
ticket set out to remove. Option 1-plus-2 is the right call and the tie-group
option 3 would have been worse: a tie group is still a statement about
measured distance, and on trinket the honest statement is that no distance was
measured at all.

**Weapon: yes, the promoted rows survive intact,** and the game-shape is right.
Ranks (#1 #2 #3 #4 #16 #24 #29 #34), tie groups, and the delta-ordered
below-cutoff tail are all unchanged. The top four —
Vengeful Gladiator's Staff, Staff of Natural Fury, Pillar of Ferocity,
Merciless Gladiator's Maul — are correct feral two-handers, and Pillar of
Ferocity is the Phase 3 feral staff people actually chase. The large top-end
gaps against small mid-list ones are the right shape, because cat and bear
scale off the weapon damage carried on the item, not off the stat line.

So both poles from ticket 222 land where the ticket wanted them.

### 2. Is "ruled out at screening" honest to a player?

**Partly. It is honest about the fact and dishonest about the agent.** I agree
with the first SME's diagnosis and disagree with his fix.

The problem: "ruled out" is what a *person* does to an *item*. A player reads
"ruled out at screening" as "we looked at this and it's not good enough". For
`Hammer of the Naaru` at `screen ~Δ-25.65` that is nearly true; for the eleven
shields at `~Δ-490` it is true for a reason that has nothing to do with the
item; and for anything near the bar it is a claim the measurement cannot make.

Why I would not use his "not promoted past screening": "promoted" is our
pipeline's word, not the game's. A feral does not know what promotion is, and
the phrase reads as jargon covering for something. Trading a wrong plain word
for an opaque internal one is not an improvement for the player audience.

**Wording I would use instead**, which keeps the plain register and moves the
verdict onto the measurement:

- Disclosure line: `179 candidate(s) measured roughly and not re-checked;
  --show-ruled-out to list them`
- Per-slot heading: `weapon: measured roughly, not re-checked (78)`
- A single note under the heading: `rough estimates — not comparable to the
  ranked deltas above.`

That last note is the part I would insist on more than the heading. The trinket
block is the proof: the ruled-out spread is roughly -24 to -40 while the ranked
trinkets sit between +14 and -13, so a reader who assumes one scale concludes
these trinkets are far worse than they are. The heading is a nuance; the
missing non-comparability note is an active misreading.

I agree with the first SME that **keeping the number is right**. Without a
figure the reader cannot separate a near-miss from a non-starter.

Caveat: which items sit near the bar is a **modelled** result, so "Hammer of
the Naaru is the near-miss" is not a claim I would defend. The wording argument
does not depend on it.

### 3. Hidden by default (option 1) vs shown unordered (option 2)?

**Hiding by default is right, and it is right because of what these rows are,
not because there are a lot of them.**

The rendered weapon block settles it. Of the 78 ruled-out weapons, the great
majority are not close calls in any sense a player would recognise — 11 shields,
11 held-in-off-hand items, and an off-hand fist weapon sit at `~Δ-470` to
`~Δ-513`. Those numbers do not mean "bad item". They mean the character ended
up with **no weapon damage**, because the sim swapped a two-handed feral staff
for a shield. A block of 78 rows in which half the entries are that artifact is
not a decision aid at any length. Showing it by default would teach a reader
that the tool's judgment is unreliable — the exact spillover risk the ticket
opened with, aimed at the one slot (weapon) where the ordering is genuinely
excellent.

The trinket slot argues the same way from the other direction: 12 items that
are really equivalent, where the decision turns on drop source, cooldown
alignment with Tiger's Fury and Berserk, and fight length — none of which is in
the DPS number. Showing them unordered by default would still put twelve
DPS figures in front of a decision that is not a DPS decision.

So: option 1 by default, option 2's rendering behind the flag. That is what was
built, and I would ship it.

### 4. The druid-inequippable finding — confirm or refute

**Confirmed, and understated.** I reproduced the count independently from
`data/items/index.json` rather than trusting his table. Parsing the 78
ruled-out weapon names out of the rendered output and joining them to the item
index by name (0 unmatched, 0 ambiguous):

| `weaponType` | count | druid-legal? |
|---|---|---|
| Axe (1) | 7 | **no** |
| Dagger (2) | 12 | yes |
| Fist (3) | 3 | yes |
| Mace (4) | 14 | yes |
| Off-hand (5) | 11 | **no** |
| Polearm (6) | 0 | yes |
| Shield (7) | 11 | **no** |
| Staff (8) | 9 | yes |
| Sword (9) | 11 | **no** |

**40 of 78** — his figure exactly. Confirmed.

`Cataclysm's Edge` (30902) is `weaponType 9` (sword), `handType 4` (two-hand),
and it prints at **#16 with Δ17.73 (0.91%)**, above the fold, in a tie group.
Confirmed. A druid cannot equip it.

**Where I correct him.** His P1 says "two ranked rows are swords" and lists
Cataclysm's Edge and Twinblade of the Phoenix. Typing every ranked weapon row
against the index shows **three** druid-illegal ranked rows:

- `#16 Cataclysm's Edge` — sword, two-hand. **Above the cutoff.**
- `Twinblade of the Phoenix` Δ-21.82 — sword, two-hand. Below cutoff.
- `Soul Cleaver` Δ-8.93 — **axe (`weaponType 1`), two-hand.** Below cutoff.
  He did not name this one.

`Soul Cleaver` is below the cutoff so it is less visible than Cataclysm's Edge,
but it matters for the fix: an engineer reading his P1 as "the sword case" will
write a sword filter and leave axes in. The rule is a **proficiency list**, not
a sword exception.

`Fist of Molten Fury` (32945) is `weaponType 3` / `handType 3` — a legal weapon
type on an illegal hand. Feral uses no off-hand; cat and bear occupy both hands
with the main-hand weapon. Its Δ-479.66 is a comparison against nothing.
Confirmed.

> **Correction (pre-merge review, 2026-08-18):** the repo does hold a source —
> `vendor/tbc-new-fork/ui/core/player_classes/druid.ts` lines 25-31 list Dagger,
> Fist, Mace, OffHand, Staff. So **polearm is not druid-equippable** and
> **held-in-off-hand is**, both opposite to the recalled list above. Whether a
> feral build uses an off-hand is a separate question from whether a druid can
> equip one. See ticket 228.

*Source note:* the druid proficiency list — **staff, mace, dagger, fist weapon,
polearm; not sword, not axe, not shield, not held-in-off-hand** — is **recalled
game knowledge**. The repo holds no class-proficiency table, which is itself
the finding. I am confident in it as a well-established TBC rule, and I reached
it independently before reading his, but an engineer writing the filter should
confirm it against a class reference. Everything else above — every
`weaponType`, `handType`, and the counts — is read directly from repo data.

**Does this change the verdict on 224 itself? No.** It is a candidate-pool
defect that predates the ticket and is correctly filed as 228. But note the
direction of the interaction, which the ticket's own text gets slightly wrong —
see P2.

### 5. Anything in the ticket's closing text wrong as a game-domain claim?

Two things, one of them load-bearing.

**W1 — "makes it more visible on the ranked side and less visible on the
ruled-out side" is the wrong reading of the risk.** The ticket's "Domain defect"
section says ticket 224 makes the equip bug less visible by hiding the ruled-out
block. As a game-domain matter, hiding 40 unequippable items a player would
never act on is not a loss. The 38 legal ones stay behind a flag. What actually
matters is the ranked side, where the change is **zero** — Cataclysm's Edge sat
at #16 before this ticket and sits at #16 after. Framing 224 as having reduced
visibility of 228 risks someone treating 228 as less urgent because a hidden
block got hidden. The urgency lives entirely at #16, and 224 did not touch it.

**W2 — the ticket calls the ruled-out set "un-promoted, below-cutoff rows",
and treats those as one thing.** In the game-facing sense they are two very
different populations, and the weapon block shows both: items that were
genuinely measured near the bar (`Torch of the Damned` ~Δ-21, `Hammer of the
Naaru` ~Δ-26), and items whose delta is a **slot mismatch artifact** (the
~Δ-490 shields and off-hands, which mean "no weapon equipped"). The second group
is not a measurement about item quality at all. This does not change what the
ticket built — both are correctly hidden — but any future work that tunes on
these numbers, or that describes them to a user as "how close each item came",
would be tuning on the artifact. Do not read the bottom of the ruled-out list
as information about item quality.

The rest of the closing text holds up. The trinket-equivalence reasoning (TBC
itemises trinkets as an effect, not a stat line; the Phase 3 feral trinkets
converge on a budgeted tie from static agility/AP versus proc/on-use) is
correct game domain. The neck example from 225 is correctly scoped out. The
worn-item note — that eight worn items sit at exactly 0.00 because a worn item
ranks as a swap of itself, and that a definitional zero is not a small
measurement — is a real distinction and correctly flagged.

## Rows that look fine

- All 20 trinkets, ranked and ruled out, are genuinely trinket slot and phase
  ≤ 3. No slot errors, no phase leakage.
- `Living Root of the Wildheart` on a druid is correct — it is the
  druid-restricted feral trinket and belongs here.
- `Dragonspine Trophy` #21 and `Pendant of the Violet Eye` #27 heading the
  trinket list is the expected feral shape for this tier.
- Weapon top four are all correct feral two-handers, correctly ordered.
- `Halberd of Desolation` (polearm) and `Claw of Molten Fury` (main-hand fist)
  are legal druid weapon types — correctly present even though both are far
  below the bar.
- Counts reconcile: 70 shortlist + 149 below cutoff + 179 ruled out = 398,
  matching the pool. Nothing lost in the partition.

## Gate

**Would I trust this output as a feral who knows the game?**

I trust the **presentation change**, which is what ticket 224 owns. The
ruled-out block reads as a set, promoted rows are untouched, the default hide
is correct for what those rows are, and the disclosure states the count and the
flag. On its own terms 224 is done.

I do **not** trust the **weapon slot contents**, for reasons predating this
ticket. Before yes:

1. Weapon **proficiency** is enforced as a list, not as a sword exception —
   swords, axes, shields and held-in-off-hand items stop entering a druid's
   weapon slot. `Cataclysm's Edge` at #16 is the gate item; `Soul Cleaver`
   proves the rule must cover axes too. (Ticket 228.)
2. Feral's no-off-hand rule is applied, so `Fist of Molten Fury` stops being
   compared.
3. The near-boundary ordering claim is re-checked once a **real** shipped
   screening artifact exists, since everything about which items sit near the
   bar rests on modelled, independent-noise, single-draw-0 screening.

The trinket slot I would trust today, subject to the same modelled caveat.

## Notes for engineering

- Three ranked druid-illegal weapons, not two: `Cataclysm's Edge` (#16, sword),
  `Twinblade of the Phoenix` (sword), `Soul Cleaver` (axe). Fix as a
  proficiency list.
- `Fist of Molten Fury` is an off-hand weapon; feral has no off-hand.
- The ~-490 deltas mean "no weapon equipped", not "bad item". Do not tune on
  them and do not describe them to a user as near-misses.
- Wording: "ruled out" reads as a verdict on the item. I would not use "not
  promoted past screening" either — that is our word, not the game's. Suggest
  "measured roughly, not re-checked", and add "not comparable to the ranked
  deltas above" under the heading. The non-comparability note matters more than
  the heading.
- `Bloodlust Brooch` and `Hourglass of the Unraveller` both at exactly 0.00 —
  worth confirming they were simulated rather than silently skipped.
