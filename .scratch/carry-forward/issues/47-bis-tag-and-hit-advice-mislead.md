Status: open
Type: bug
Origin: sme-rank-review on phase-2/trust (two characters, both do-not-trust)
Blocks: none
Blocked by: none

# The `BiS` tag and the hit banner both tell the player something false

Two separate presentation defects, filed together because both are cases of the
product **asserting** something the data does not support. Neither is a wrong
DPS number — the sim is fine — so neither is caught by any existing test.

Sources:
[`ret-slamaltman`](../../handoffs/sme-rank-judgment-ret-slamaltman.md) §2 and §5,
[`feral-nexess`](../../handoffs/sme-rank-judgment-feral-nexess.md) §5.

The worn-ring bug found in the same reviews is ticket 46; it is not repeated here.

## 1. `BiS` is applied to an item that is not BiS for that spec

Shapeshifter's Signet is tagged **`BiS` on the ret shortlist** (row #2 of
slamaltman's list). The SME finding, as a game fact:

> Shapeshifter's Signet is +25 Agility, +18 Stamina, +20 expertise. Agility is
> the giveaway — it is built for shapeshifting/agility classes. A retribution
> paladin scales off Strength. No ret BiS list for this tier carries it.

The same ring is tagged `BiS` on the feral list, **where it is correct**. So one
tag is right and one is wrong, and they come from the same source.

This matters more than a cosmetic mislabel: `BiS` is the strongest claim the
product makes about an item. A ret who knows the tier sees `BiS` on an agility
ring and concludes the tool does not know his class.

Worth checking whether the tag is derived per-spec at all, or whether curated
membership from any spec's set can stamp it. Ticket 41 records that
`wowsims_curated_item_ids()` was the mechanism that stamps `bisTags`, and that
it was recently widened to also grant pool membership — that widening is the
obvious thing to look at first, though **this is a hypothesis, not a measured
cause.**

A second, smaller case from the feral side: `BiS` on Merciless Gladiator's Maul
flattens an acquisition rule. It is Season 2 arena gear bought with arena points
under a rating requirement, tagged identically to Lady Vashj raid loot. The SME
verdict was that the **pick is correct in game** — feral cat weapons are valued
by feral AP derived from weapon DPS, so arena two-handers genuinely competed —
but that "BiS" next to a raid drop implies these are interchangeable ways to
acquire an item, which they are not.

## 2. The hit banner flags a gap the shortlist then quietly widens

slamaltman's run prints that he is **72 hit rating against a ~142 cap**, i.e.
~70 short, and calls it his main gap. Then:

- **#3 Razor-Scale Battlecloak** carries **no hit at all**.
- The cloak he is **currently wearing**, Drape of the Dark Reavers, carries
  **17 hit**.

So the #3 recommendation moves him *further* from the cap the same page just
flagged, and nothing on the row says so. Razor-Scale may still win on raw
throughput — the SME did not dispute the number — but the page tells him two
contradictory things and reconciles neither.

The product already has the machinery to fix this: `hitDriven` exists and the
prior feral review specifically **praised** it for flagging Tsunami Talisman.
That annotation is simply not reaching this case, which is the one where it
matters more.

Note ticket 33 (`caps-blind-to-talent-hit`) is related but different — that is
about the cap *value* being wrong. This is about a recommendation contradicting
the cap the product itself computed.

## 3. Smaller items from the same reviews

Recorded here so they are not lost; each is small enough not to warrant its own
file.

- **Profession-locked item shown despite the stated exclusion.** Bulwark of the
  Ancient Kings (#4, slamaltman) is Armorsmith-only. The run's own assumptions
  block states "profession-locked gems and items are excluded". One of the two
  is wrong. (Ticket 42 covers `requiredProfession` being an unresolved numeric
  id, which may be the same root.)
- **Quest/vendor provenance still blank.** Haramad's Bargain (a Netherstorm
  Consortium quest reward) and A'dal's Command (a Sha'tar exalted vendor ring,
  ~79g from Almaador) both ship as "no recorded origin". Both are *good, correct
  recommendations* — the defect is only that the player cannot tell a soloable
  quest neck from a raid drop, which is the most decision-relevant fact about
  them. This is the `{kind:"unknown"}` bucket working as designed and is
  ticket 45's territory; noted here as a second confirmation from the game side.
- **A healing idol is a candidate on a DPS rank.** Idol of the Avian Heart
  boosts a healing spell and does nothing for a cat. It is pool noise on a feral
  DPS list regardless of whether it surfaces.
- **Tie blocks presented as a strict ranking.** Both reviews raised it
  independently, and the shredzepelin review raised it before them. slamaltman's
  rows 3–13 span 0.19%–0.79% against a **±119 DPS** baseline band; nexess's rows
  3–15 are each within ~1 SE of their neighbours. Numbering them 3, 4, 5 … reads
  as an ordering the evidence cannot support. Not a wrong number — a wrong
  *claim of precision*. Worth deciding whether the shortlist should group
  statistical ties rather than enumerate them.

## Done when

- No item carries `BiS` for a spec whose curated set does not name it, and there
  is a test pinning the cross-spec case (a feral-curated ring must not ship
  tagged `BiS` on a ret rank).
- A recommendation that reduces a stat the report flags as capped-short is
  annotated as such, in the same way `hitDriven` already annotates its cases.
- The profession contradiction is resolved in one direction or the other.
