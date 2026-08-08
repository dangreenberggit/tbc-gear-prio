# SME rank judgment — feral cat, shredzepelin

## Verdict

**trust-with-caveats.**

The list is recognisably a feral cat list. Nothing in it is unequippable by a
druid, nothing is a PvP or encounter-only item masquerading as normal loot, and
the deltas are the right size for the gear he is wearing. Two findings below are
real game problems, and one of them would mislead a player. Neither is large
enough to call the whole output untrustworthy.

## What was reviewed

- **Character:** shredzepelin, Dreamscythe-US, feral cat druid.
- **Phase:** 2. Baseline 1917.50 DPS from his own logged gear on a
  Morogrim Tidewalker kill.
- **Baseline gear, in short:** T5 Nordrassil Harness in five slots (shoulders,
  chest, legs, hands, and the kilt), Terestian's Stranglestaff, Wolfshead Helm,
  two arena pieces (Veteran's belt/boots/bracers), Hourglass of the Unraveller
  and Bloodlust Brooch as trinkets, Everbloom Idol in the ranged slot.
- **Results from:** the shortlist printed above; item pool
  `data/universes/feral-p2.json` (225 rows).

## Game problems

### 1. The ranged slot is nearly empty, and the idols that matter are missing

Only two idols are offered for the whole phase: Idol of the Avian Heart
(Moroes, Karazhan) and Idol of the Crescent Goddess (Hydross, SSC).

Idols that a cat would actually consider at this tier are missing.

> **Correction, 2026-08-06.** This section originally named **Idol of Feral
> Shadows** as "the idol that matters most" and blamed five-man scoping. Both
> were wrong — see
> [`feral-wowhead-lists-and-nonraid-sources.md`](feral-wowhead-lists-and-nonraid-sources.md)
> §1 and §4. Feral Shadows is not the best cat idol here, another druid idol is
> a quest reward, and the real cause is that feral has no Wowhead list, so
> badge, quest and vendor items never reach its pool at all. The **observation**
> below stands; the diagnosis did not.

Worse for the player: **the idol he is actually wearing, Everbloom Idol, is not
in the pool at all.** The engine cannot tell him whether either offered idol is
better or worse than what he has on. Of the two that are offered, Avian Heart
boosts healing spells and is not a cat DPS idol at all.

Net effect: the ranged slot is not usable advice for a feral cat right now.

**This is not a feral-only problem.** Ret's pool offers exactly two librams for
the same phase (Libram of Souls Redeemed, Libram of Absolute Truth). So the thin
ranged slot is a standing property of how the pool is built, and feral has
merely made it easy to see. Engineers should not treat it as something the new
spec introduced.

### 2. Cloaks and rings crowd out everything else

> **Correction, 2026-08-08.** The "mostly correct rather than a bug" verdict
> below is **wrong**, and the reason is that this review did not know which
> fight it was reading. The Morogrim capture is a fight where shredzepelin was
> **backup tank** — he stayed in cat form throughout (99.1%, so form uptime
> classifies it as a confident cat parse) but wore tank gear for a tanking job
> that never came up. Icebound Cloak and Violet Signet are not "weak spots" in
> a DPS set; they are **tank pieces** — zero agility, zero attack power, both
> carrying defense rating. They dominate the shortlist because they are being
> ranked against a cat baseline they were never part of.
>
> The 1917.50 DPS baseline is therefore a backup-tank baseline, and every delta
> measured against it is inflated. The observation (backs and fingers crowd the
> list) stands; the diagnosis did not. See
> [`.scratch/phase-2/issues/06-shredzepelin-gear-incorrect.md`](../phase-2/issues/06-shredzepelin-gear-incorrect.md)
> — the engine now discloses the source fight on every run and flags a
> confident DPS parse with no Blessing of Salvation.

Thirteen of the top fifteen rows are backs and fingers. Looking at his gear,
that is mostly **correct rather than a bug**: he is in five pieces of T5 and a
good staff, so his big slots are genuinely close to finished, while his cloak
(Icebound Cloak) and rings (Violet Signet, Shapeshifter's Signet) are the weak
spots. Rings and cloaks are also the slots with the most competing drops in TBC,
so a long tail there is expected.

The part worth an engineer's eye is that all of #2–#13 are marked tied. Gains of
1.5–2.2% on a feral are small and close together, so the exact order inside that
block should not be argued over. That is honest, but a player reading a numbered
list will treat #3 as beating #13 when the evidence does not support it.

### 3. Small note: no tier pieces are offered, and that is correct here

He already wears five T5 Harness pieces, and the tier available at this phase is
T4/T5. So an empty tier section is the right answer, not a gap. Worth stating
because "no tier in the list" usually is a red flag.

## Rows that look fine

- Belt of One-Hundred Deaths at #10 — a real feral belt, and he is wearing an
  arena belt, so a gain there is believable.
- Ring of Lethality, Band of the Ranger-General, Garona's Signet Ring — all
  normal raid rings a cat would want.
- Tsunami Talisman flagged as hit-driven while he is under the hit cap. Correct
  and useful: that item stops being an upgrade once he is capped.
- Edgewalker Longboots — a genuine feral boot.
- No plate, no mail, no caster tier, no bows or guns. Equip rules are holding.

## Gate

**Not yet, for the ranged slot. Yes for everything else.**

Would a feral cat trust this output? For cloaks, rings, belt, boots and trinkets
— yes. For the idol slot — no, and they would notice immediately, because the
idol they are wearing is absent and one of the two on offer is a healing idol.

What must be true before an unqualified yes:

1. The idol the character is wearing must be in the comparison, so the engine
   can say better or worse.
2. Idol of Feral Shadows should be reachable, which means the pool has to admit
   five-man loot for this slot.

## Notes for engineering

- Everbloom Idol is worn but never compared — the player cannot see if the
  offered idols beat it. It is a Badge of Justice vendor item, and feral has no
  Wowhead list, so badge items never reach its pool.
- Ret's ranged slot has the same two-item shape, so this is a standing pool
  property rather than a feral regression.
- Idol of Feral Shadows drops in The Arcatraz (a five-man), so a raid-only pool
  will never show the best cat idol for this tier.
- Idol of the Avian Heart is a healing idol; offering it to a cat is noise.
- Two candidates for a whole equipment slot is worth a low-count alarm somewhere.
- The long tie block at the top is honest but reads as a strict ranking; the
  presentation, not the numbers, is what would mislead.
