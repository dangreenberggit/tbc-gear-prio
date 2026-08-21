# SME rank judgment — ticket 225 closure, second opinion (feral P3)

Second opinion on the closure of ticket 225, reviewing the first SME
handoff (`sme-rank-judgment-ticket-225-cutoff-band.md`) and the band data
it judged. Same audience and same game-only scope as the first pass.

## Verdict

**do-not-trust** — on the *closure*, not on the band enumeration itself.

The first opinion judged the band "interchangeable" and ticket 225 closed
on that. This pass finds that judgment rests on an unexamined assumption:
that the rows in the band are gear a feral druid would ever consider. Ten
of the 28 band-above rows are **healer gear**, and their scoring above a
feral's upgrade cutoff is not a tie between comparable items — it is a
question about whether those rows belong above the cutoff at all.

## Findings

1. **10 of the 28 band-above rows are healer gear.** Not a stray item —
   better than a third of the rows the "interchangeable" verdict was
   pronounced over.

2. **The list**, all in the band-above zone: 32609 Boots of the Divine
   Light, 32516 Wraps of Purification, 29984 Girdle of Zaetar, 29989
   Sunshower Light Cloak, 29308 Band of Eternity, 29307 Band of Eternity,
   29309 Band of the Eternal Restorer, 28661 Mender's Heart-Ring, 29920
   Phoenix-Ring of Rebirth, 28822 Teeth of Gruul. Each carries a healer
   stat line — intellect, healing power, spellpower, spirit, mp5 — and
   **zero** agility, strength, attack power, crit, hit, expertise or
   armour penetration.

3. **28822 Teeth of Gruul is a healer neck and it is the neck slot's
   argmax**, scoring +5.81 DPS for a feral druid. The first opinion
   treated this row as sound game content and built its "the neck is a
   tie, not a decision" reasoning on top of it.

4. **The two genuine feral necks in the slot are 30017 Telonicus's
   Pendant of Mayhem (+5.73) and 32591 Choker of Serrated Blades
   (+4.37).** Those are the rows a feral would actually weigh.

5. Also present in that slot below the healer row: 30059, 32260, 28674.

6. **The head / idol / trinket cliffs do not move the band** — those
   slots contribute no above-cutoff rows, so they do not disturb ticket
   225's arithmetic. But healer rows scoring above the cutoff **do**
   undermine the "band is ties" conclusion, because a tie presumes the
   tied items are candidates in the first place.

7. **All eleven trinkets sharing -31.33 DPS carry zero melee-relevant
   stats, and three have empty stat maps entirely.** That is consistent
   with their effects not being credited. It is a stats-plus-effects
   question and belongs with the ticket that owns the trinket cliff, not
   with the band question.

8. **"The band-above rows carry ordinary stat-driven deltas" is wrong**
   as written in ticket 225's closure. Ten of them are healer items whose
   stat lines a feral cannot use.

9. **The first opinion's P1 override rested on a recalled description of
   Teeth of Gruul, not on its stat line.** The stat line was available in
   the repo and was not consulted.

10. **P2 = 0 rests partly on healer rows.** Some slots avoid "only
    above-cutoff row" status only because a healer item is also counted
    above the cutoff there.

11. **Rows that look correct**: 32266, 32647, 30863, 29099, 29096, 30223,
    30017, 32591. These are feral-appropriate items with plausible
    deltas, and nothing about them looks wrong.

## Gate

Would I trust this output as a feral who knows the game? Not as a
statement that the band is a set of equivalent choices. The band
enumeration is sound as an enumeration; the *interpretation* that it is
all ties is not, while healer gear sits above the cutoff unexplained.

What must be true before yes: an answer to why healer items clear a
feral's upgrade cutoff at all.

## Notes for engineering

- Healer neck at the top of the neck slot; the real feral necks are two
  rows below it.
- Nine more healer pieces above the cutoff across feet, wrist, waist,
  back and finger.
- Do not read this as "the band question was wrong" — read it as "the
  band contains rows that should not be in the comparison".

## Caveat on sourcing

Game claims here are recalled TBC knowledge. The **stat lines are
measured** from this repo's own files, not recalled.
