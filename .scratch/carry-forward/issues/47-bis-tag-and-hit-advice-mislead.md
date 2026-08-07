Status: closed
Type: bug
Origin: sme-rank-review on phase-2/trust (two characters, both do-not-trust)
Blocks: none
Blocked by: none
Resolution: §1 fixed by scoping `BiS` to the current stage (the union of
  preraid/p1/p2 was the defect) and naming that stage on the row; §2 fixed by
  adding `hitRegression`, the mirror of `hitDriven`. §3 items 1, 3 and 4 remain
  open under their own tickets. 2026-08-06.

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

## Closed 2026-08-06

### §1 — the hypothesis in this ticket was wrong, and the real cause is bigger

This ticket guessed the tag came from `wowsims_curated_item_ids()`'s pool-member
widening letting "curated membership from any spec's set" stamp `bisTags`. That
is **not** what happened. Measured:

```
python -c "import json;print([e for e in json.load(open('data/universes/ret-p2.json'))['entries'] if e['itemId']==30834])"
```

`gear_sets` is per-spec on `SpecProfile`, and the vendored ret files are
byte-identical to upstream `ui/paladin/retribution/gear_sets/`. Upstream really
does equip Shapeshifter's Signet in **all three** ret sets — it was never a
cross-spec leak. The ret P2 set is full of agility/leather (Cobra-Lash Boots,
Gloves of the Searing Grip, Belt of One-Hundred Deaths), so the SME's "no ret
BiS list carries it" is true of community lists, not of upstream's sim preset.

The actual defect, raised by the user mid-fix: **`BiS` is a claim about a
phase, exactly as wowsims scopes it, and this repo flattened three stage sets
(`preraid` ∪ `p1` ∪ `p2`) into one absolute verdict.** The signet was the
symptom; the disease was that at `ret-p5` **14 items** wore a `BiS` badge on
the strength of pre-raid or T4 sets alone — Justicar Crown/Breastplate,
Ironstriders of Urgency, Mask of the Deceiver and nine more.

Fix: `bis_set_labels_for_max_phase()` narrows the claim to the newest curated
stage at or below `max_phase`; `curatedSets` keeps the full unscoped provenance
so a dropped item is still visibly curated. **Membership is deliberately
unchanged** — ticket 12's widening is about what gets ranked, not what gets
badged — and the regenerated universes prove it: entry counts identical
(ret-p3 359 → 359), BiS claims 29 → 15.

Rendered as `p2 BiS` rather than a bare `BiS`, so the badge names the stage it
is BiS for.

### §2 — `isHitDriven` structurally could not see this case

`isHitDriven` sums only **positive** stat deltas, so an item carrying no hit
over a worn item carrying 17 scores zero hit gain and goes unflagged. The
annotation the SME praised was also **never rendered in the HTML report at
all** — only in the CLI — so the page banner and the shortlist could contradict
each other with nothing on the row. Added `hitRegression()` as its mirror, wired
through `rankUpgrades` and rendered in both surfaces.

### Not addressed here

§3's profession contradiction (ticket 42), blank quest/vendor provenance
(ticket 45), the healing idol on a feral DPS pool, and tie-block presentation
are untouched — each is its own ticket or its own decision, and none is a
presentation-assertion bug of the kind this ticket is about.

Verified: `pnpm verify` green (371 passed, 2 todo). The three new universe
assertions and the `rankUpgrades` hit-regression test were each confirmed red
against the pre-fix tree by stashing the fix and re-running.
