# SME rank judgment — ret P3, real ranking (slamaltman)

## Verdict

**trust-with-caveats**

This is the first review of an actual ranked result, not a candidate list. The
ordering is right, the sizes of the gains are right, and every piece the
character already wears sits at exactly zero. Fifteen of the sixteen equipped
slots read correctly.

The sixteenth slot is wrong in a way a ret would spot immediately. The
character **is wearing Libram of Avengement**, the ranking does not know it,
and as a result the ranking tells him that all four librams it does show are
losses. That is a false statement about his own gear, and it is the one finding
that stops the gate closing.

## What was reviewed

- **Character / spec:** Slamaltman, blood elf retribution paladin, Dreamscythe.
- **Phase:** 3 (Black Temple / Hyjal era), `--max-phase 3`.
- **Baseline:** 2003.51 DPS (± 118.93), gear read from a recorded log of
  Hydross the Unstable. The equipped set is the fifteen rows flagged `owned`
  in the ranking, plus the libram discussed below.
- **Files** (worktree `C:\Users\dgree\Code\lulz\tbc-gear-prio-wt-ret-p3-data`,
  branch `feat/ret-p3-data`, tip `2b3bf56`):
  - `.scratch/handoffs/wowsims-tab/ret-p3-ranking/slamaltman-p3.json` — 393
    scored rows, 44 above cutoff
  - `.scratch/handoffs/wowsims-tab/ret-p3-ranking/slamaltman-p3.html`
  - `.scratch/handoffs/wowsims-tab/ret-p3-ranking/PROVENANCE.md`
  - `test/fixtures/slamaltman.raw.json` — the recorded gear, read to check what
    the character is actually wearing
- **Prior verdict read:** `.scratch/handoffs/sme-rank-judgment-ret-p3-refresh.md`
  (trust-with-caveats, candidate universe only).

### The equipped set, for the record

Head Furious Gizmatic Goggles, neck Pendant of the Perilous, shoulder
Shoulderpads of the Stranger, back Drape of the Dark Reavers, chest
Crystalforge Breastplate, wrist Bladespire Warbands, hands Gloves of the
Searing Grip, waist Girdle of the Endless Pit, legs Shattrath Leggings, feet
Warboots of Obliteration, rings Ring of a Thousand Marks and Shapeshifter's
Signet, trinkets Dragonspine Trophy and Bloodlust Brooch, two-hander Lionheart
Executioner, **relic Libram of Avengement**.

This is a coherent, real Tier 5 era ret. One tier piece worn and the rest off-set
leather and mail is exactly what this spec looked like at that point. A baseline
near 2000 DPS is the right neighbourhood for that gear in a raid with the buffs
this preset assumes. Nothing about the starting point looks invented.

## Game problems

### 1. The worn libram is invisible, so the relic slot reports four false losses (high)

`test/fixtures/slamaltman.raw.json` records item **27484, Libram of
Avengement**, in the character's relic slot. That item does not appear anywhere
in the ranking — not as an upgrade, not as a loss, not as an owned row. The
ranking's fifteen `owned` rows cover every slot except the relic.

Because nothing is registered in that slot, the sim compares each candidate
libram against an **empty** relic slot rather than against Avengement. It
reports:

| Libram | Reported |
| --- | --- |
| Libram of Souls Redeemed | −13.81 |
| Libram of Absolute Truth | −13.81 |
| Tome of the Lightbringer | −13.81 |
| Libram of Fervor | −14.10 |

Two things are wrong here in game terms.

First, three of those four are reported at the **identical** number to two
decimal places. Three different relics with three different effects cannot
produce the same result. That is the signature of a slot where nothing is being
measured — the sim is very likely not applying these libram effects at all, and
the shared −13.81 is just the loss of the item's plain stats against whatever
the empty slot is being scored as.

Second, and worse for a reader: a ret opening this report sees his entire relic
slot painted red. Every libram offered is a downgrade. The honest reading of
that page is "I should take my libram off", which is wrong. The character's
actual relic is better than all four, and the report never says so because it
does not know he has one.

The tool's own `plausibilityWarnings` block catches the symptom and describes
it accurately:

> `dead-slot` / `ranged` / `unidentified-worn-item` — "No positive candidate in
> ranged, and no row records which item is worn, so the slot could not be
> classified at all."

The warning's suggested cause is not the one that applies. It blames an old
saved report predating per-item ownership. This report is fresh and the other
fifteen slots carry ownership fine. The worn item is present in the recorded
gear and is simply not being carried through to the ranking.

This connects to the prior verdict's finding 1 and ticket 157, and it is not the
same complaint. That finding said Avengement was missing from the candidate
pool. This one says it is missing from the character's **own equipped set**, and
that turns a gap in choices into four wrong answers on the page. I am not
re-filing; I am recording that the gap now visibly distorts a shipped ranking.

### 2. The three missing TBC trinkets do distort this ranking's trinket slot (medium)

The prior verdict flagged Darkmoon Card: Crusade, Hourglass of the Unraveller
and Abacus of Violent Odds as absent from the pool. Confirmed absent here too.
For this particular character the effect is real rather than theoretical: he
wears Dragonspine Trophy and Bloodlust Brooch, and **every one of the nineteen
other trinkets in the list is a loss**, the best of them −10.28. So the report
tells him his trinkets are finished, no further upgrade exists in this tier.

Darkmoon Card: Crusade in particular was a trinket rets genuinely swapped
Bloodlust Brooch out for at this point. Whether it would actually win here I
cannot say without a number, and I will not invent one. What I can say is that
the slot is being declared solved while a well-known contender for it was never
on the page. Already ticket 157 — noted, not re-filed.

### 3. One shoulder candidate silently vanished (low, and not this branch's doing)

Beast-tamer's Shoulders was dropped because the sim crashed on that swap — a
hunter set effect firing on a paladin equip check. The item is a mail
shoulder a ret could plausibly wear, so its absence is a real hole in the
shoulder slot, which is otherwise thin (best offer +1.80 over what he wears).
The crash is upstream's, and the provenance note is honest about it. Worth
naming only because the shoulder slot is close enough that one missing row
could change the answer.

## Rows that look fine

This is the bulk of the report, and it is good.

- **Already-worn gear behaves correctly.** All fifteen identified worn items
  sit at exactly `0.00` and are flagged `owned`. Nothing the character already
  has is presented as an upgrade, and nothing is presented as a large loss.
  This is the check the prior review could not run, and it passes cleanly.
- **The top of the list is the right list.** Belt of One-Hundred Deaths
  (+47.75) off Vashj and Torch of the Damned (+43.61) from Black Temple are
  the two pieces a T5-geared ret stepping into T6 content actually wants most.
  Cataclysm's Edge third (+26.22) is correct — a strong Archimonde two-hander,
  and correctly ranked *below* Torch. Cursed Vision of Sargeras at +19.73 is
  the well-known ret head of the tier. Band of Devastation and Unstoppable
  Aggressor's Ring in the ring slots are both real ret picks. I recognise this
  list.
- **Gain magnitudes are sane.** The best single upgrade is +2.38%. That is what
  one good item is worth to a geared character; nothing claims a double-digit
  percentage from a single swap.
- **Loss magnitudes are sane and correctly sorted.** The floor is Legacy at
  −124.48 (−6.21%), a level 60 two-hander, followed by Glaive of the Pit and
  Axe of the Gronn Lords. Big losses land on genuinely worse or wrong-stat
  items. Nothing absurd — no −50% rows, no item losing more than a whole
  weapon's worth.
- **Weapons are all two-handers** and rank in a defensible order: Torch >
  Cataclysm's Edge > the PvP greatsword > his worn Lionheart Executioner >
  everything else. No one-hander/shield confusion, and no weapon buried for
  having a thin stat line.
- **PvP gear is separated and not overvalued.** Vengeful Gladiator's Greatsword
  appears at +8.71, marked `pvp`, and is not treated as a raid BiS. Correct —
  it was a real stopgap, worth something, not worth the top slot.
- **No temporary or encounter-only loot is treated as normal gear.** No
  legendaries, nothing that exists only inside a fight.
- **Set bonuses are handled with visible honesty.** Lightbringer 4-piece is
  reported as *negative* (−9.31), which matches the game — the ret T6 four-set
  was famously not worth breaking better off-set pieces for. Gladiator's
  Vindication is marked `not-implemented-in-sim` rather than being silently
  scored as zero, and the Crystalforge rows carry a `selfConfound` note. The
  report does not pretend to know things it does not.
- **The hit cap is tracked and shown to bite.** Band of Devastation carries a
  `hitRegression` of 19 rating with the gap after the swap recorded. That is
  the right thing to surface for this spec at this gear level.
- **Cutoff behaviour is reasonable.** 54 rows score positive, 44 clear the
  cutoff. The ten it drops sit between roughly +1.8 and +3.4 DPS, which on a
  2000 DPS baseline is noise. Cutting there is the right call and the boundary
  is not hiding anything a player would want.
- **Ordering within the noise band is soft** — a cluster of rows sits inside
  each other's error bars around +13 to +15. Not worth arguing over.

## Gate

**Plan §9.6's "would a ret trust this?" — not yet, but one finding away.**

Fifteen of sixteen slots I would hand to a ret without hesitation. The upgrade
list is correct, the numbers are believable, his own gear is correctly valued
at zero, and the report is candid about what it cannot measure. This is a large
step past the previous review, which could not answer any of these questions.

What blocks it is finding 1, and it blocks it because it is not a gap — it is a
**wrong answer**. The report shows a ret four librams and marks all four as
losses, while the relic he is wearing is absent from the page entirely. A ret
who knows the game reads that slot, sees it contradict what is on his own
character, and from that point distrusts the other fifteen slots too. One
visibly false slot costs more than fifteen correct ones earn.

Before yes:

1. The worn relic must be recognised and carried into the ranking, the same way
   the other fifteen worn items are. Then the relic slot compares candidates
   against Avengement instead of against nothing, and either offers a real
   upgrade or correctly says the slot is done.
2. The three identical −13.81 values need to stop being identical. Distinct
   librams must produce distinct numbers, or the relic slot is not being
   measured at all and should be marked unmeasured rather than shown in red.
3. The pool gaps from ticket 157 should close, or the report should say which
   known items this tier excludes and why. This one I would accept as a
   documented limitation rather than a blocker.

Items 1 and 2 are the gate. Item 3 is a caveat a reader can live with if it is
stated on the page.

## Notes for engineering

- The worn libram is item `27484` in `test/fixtures/slamaltman.raw.json`. It is
  in the recorded gear and absent from both `data/universes/ret-p3.json` and
  every row of the ranking. The other fifteen worn items made it through.
- Three librams reporting the same number to the cent is the strongest single
  clue on the page. Identical outputs from different effects means the effects
  are not running.
- The `dead-slot` warning fired correctly but names the wrong cause. Its text
  blames a stale saved report; this report is fresh. Worth correcting, because
  as written it invites a reader to dismiss a live defect.
- Every trinket other than the two he wears is negative. That is a plausible
  result for this character, but it is being asserted while three known
  trinkets of the era were never candidates.
- Nothing in this ranking contradicts the earlier verdict on tags and stat
  weights. Those still look right. The problems are all about what reached the
  page and what the page knows he is wearing.
