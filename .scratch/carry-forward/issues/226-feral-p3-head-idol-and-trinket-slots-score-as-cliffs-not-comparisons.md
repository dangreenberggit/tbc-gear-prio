Status: open
Type: bug (suspected scoring / unimplemented-effect gap on the feral-p3 fixture)
Origin: `sme-rank-review` verdict during ticket 225, 2026-08-18 — verdict
  `do-not-trust` for the head, ranged and trinket slots; handoff at
  `.scratch/handoffs/sme-rank-judgment-ticket-225-cutoff-band.md`
Blocks: none
Blocked by: none

# Three feral-p3 slots score as cliffs, not comparisons

Ticket 225 enumerated the items inside the `feral-p3` cutoff's screening
error bar and closed on the answer "ties". Reading that band surfaced a
separate problem the ticket did not ask about and deliberately did not
investigate: in three slots, every candidate that is not the worn item
loses by a margin no game fact supports, and in one of them eleven
unrelated items share a single delta to the last decimal.

This is a defect in the numbers, not in the promotion budget. It does not
change ticket 225's decision — the band-above rows that verdict turns on
carry ordinary stat-driven deltas, and these three slots contribute
almost no above-cutoff rows (head 0, ranged 0, trinket 3).

## Reproduce

The band enumeration and its per-slot histogram:

```
npx tsx packages/core/test/measure-cutoff-band.ts
```

The per-slot truth deltas below were dumped by a temporary script that
reuses that same loading path — `rankUpgrades` with `RecordedSimRunner`
and `fullPool: true` over the committed `feral-p3` recordings — and
annotates each row with whether the item id appears in
`data/sim-implemented-effects.json` and whether the character wears it.
Output committed at `.scratch/handoffs/ticket-226-slot-truth-dump.txt`;
the script itself was not committed. `impl` / `stub` below are that
annotation.

## The three shapes

### 1. head — eighteen helms at -173.97 to -253.60 DPS

```
     0.00  8345    WORN,stub  Wolfshead Helm
  -173.97  32235   stub       Cursed Vision of Sargeras
  -181.39  33672   stub       Vengeful Gladiator's Dragonhide Helm
  -186.69  31039   stub       Thunderheart Cover
  -193.03  30228   stub       Nordrassil Headdress
  -201.18  29098   stub       Stag-Helm of Malorne
     ...
  -253.60  28804   stub       Collar of Cho'gall
```

Wolfshead Helm is a level-42 crafted leather helm. Thunderheart Cover is
the tier 6 feral helm. Every candidate in the slot is leather, so no
equip rule is involved, and the SME's judgment is that no helm in TBC
costs a feral druid 200 DPS relative to Wolfshead Helm. A near-constant
~200 DPS gap shared by eighteen unrelated helms across three tiers is a
cliff, not a stat comparison.

### 2. ranged — the Phase 3 idol loses 21 DPS to the worn badge idol

```
     0.00  29390   WORN,impl  Everbloom Idol
   -21.29  32257   impl       Idol of the White Stag
```

Both are legal feral idols and both are marked implemented. The SME's
judgment is that these two sit close together in game and that a 21 DPS
gap is not defensible in either direction.

### 3. trinket — eleven unrelated trinkets share exactly -31.33 DPS

```
    16.14  28727   impl       Pendant of the Violet Eye
    16.00  28830   impl       Dragonspine Trophy
     8.82  30627   impl       Tsunami Talisman
     0.00  29383   WORN,impl  Bloodlust Brooch
     0.00  28034   WORN,impl  Hourglass of the Unraveller
    -1.25  32505   impl       Madness of the Betrayer
    -4.18  32654   impl       Crystalforged Trinket
    -4.67  30664   impl       Living Root of the Wildheart
   -25.44  28579   impl       Romulo's Poison Vial
   -31.33  28528   impl       Moroes' Lucky Pocket Watch
   -31.33  28785   impl       The Lightning Capacitor
   -31.33  28789   impl       Eye of Magtheridon
   -31.33  30620   impl       Spyglass of the Hidden Fleet
   -31.33  30621   impl       Prism of Inner Calm
   -31.33  30629   impl       Scarab of Displacement
   -31.33  32483   impl       The Skull of Gul'dan
   -31.33  32486   impl       Ashtongue Talisman of Equilibrium
   -31.33  32496   impl       Memento of Tyrande
   -31.33  32501   impl       Shadowmoon Insignia
   -32.06  30626   impl       Sextant of Unstable Currents
```

Eleven items on one identical value, tying Ashtongue Talisman of
Equilibrium (the feral tier 6 rep trinket) with Memento of Tyrande (a
caster trinket). The top of the list is credible — Dragonspine Trophy
and Pendant of the Violet Eye are the well-known strong feral trinkets of
this era. The bottom is not.

## Same signature as ticket 171 — but the obvious mechanism is refuted here

Ticket 171
(`.scratch/carry-forward/issues/171-unimplemented-candidate-effects-render-as-measured-losses.md`,
`Status: resolved`) diagnosed exactly this shape on the ret librams:
three relics scoring an identical delta to 16 significant figures because
their procs exist only as commented `TODO: Manual implementation
required` stubs in the pinned fork's Go tree, so they scored on stats
alone.

**That explanation does not carry over unmodified, and the annotation is
why.** All eleven trinkets sharing -31.33 are marked `impl`, not
stub-only. In the head slot the opposite holds: every helm is `stub`,
including the worn Wolfshead Helm whose energy proc is the entire reason
a feral keeps it.

Read the artifact's own caveat before concluding anything from those
labels (`data/sim-implemented-effects.json`, `_comment`):

> implementedEffectItemIds is informational -- assemble_universe.py does
> not consult it, because a stat-only item needs no registration at all.

So `stub` on a plain stat helm means nothing is wrong with that helm, and
`impl` on a trinket does not prove its proc actually fires in this
fixture's rotation. The labels narrow the search; they do not settle it.
Regenerate with `python scripts/generate_sim_implemented_effects.py`
after re-pinning `vendor/tbc-new-fork`; `pnpm verify` gates the committed
file (215 implemented, 460 stub-only at fork commit
`7de45ea080d294d04399878b3b3f0a4cbd0039b5`).

Related and worth reading first: ticket 106
(`106-loop-why-s3-pvp-helm-sims-equal-to-cursed-vision.md`, `Status:
closed`) is an owner report about two of these exact helms comparing
wrongly, and carries a diagnostic loop method.

## Acceptance criteria

Each is a question this ticket must answer with a re-runnable command,
not a narrative.

- [ ] **Is the incumbent's value inflated, or are the candidates'
      undervalued?** For the head slot: sim Wolfshead Helm and
      Thunderheart Cover directly on this character with the pinned
      `wowsimcli`, holding gems and enchants equal across both arms, and
      report both absolute DPS figures. If the ~200 DPS gap reproduces in
      a direct sim, our inputs are not the cause and the fork's helm
      handling is. If it does not reproduce, the defect is on our side
      of the wall — in what we feed the sim or how we read it back.
- [ ] **If the incumbent is inflated, what inflates it?** Name which of
      these it is and show the measurement: the meta gem failing to
      activate in the candidate arm but not the worn arm; a set bonus
      broken by the swap and credited to the baseline; or Wolfshead's
      +20-energy-on-shift effect being counted into the baseline and not
      removed when the helm is swapped out. A near-constant loss applied
      to every non-incumbent item in a slot is the shape all three
      produce, so the answer must distinguish them, not assert one.
- [ ] **Are the eleven trinkets sharing -31.33 because their procs score
      as zero?** They are all marked `impl`, so ticket 171's mechanism
      is not the answer as written. Establish whether -31.33 is exactly
      the value of losing the worn trinket's contribution — i.e. whether
      these eleven contribute literally nothing and the delta is the
      incumbent's loss showing through. Romulo's Poison Vial (-25.44)
      and Sextant of Unstable Currents (-32.06) sit just outside the
      shared value, so it is not a hard floor being clamped to.
- [ ] **Does the idol gap survive a direct sim?** Same treatment as the
      helms for Everbloom Idol against Idol of the White Stag. An idol
      carries an empty stat line by nature, so a 21 DPS gap between two
      idols cannot be explained by stats and must come from how their
      effects are simulated or from the rotation not using one of them.
- [ ] **Is this feral-only, or does ret show it too?** Ticket 171 found
      the ret librams; this ticket found feral head, idol and trinket.
      Check whether the ret-p3 fixture's head and trinket slots show the
      same shapes, so the fix is scoped to a mechanism rather than to a
      spec.
- [ ] Whatever is found is recorded with the commands that show it, and
      any conclusion about the pinned fork's behaviour cites a run
      against the pin rather than a reading of the Go source alone.

## Sibling: ticket 227

A second `sme-rank-review` opinion on ticket 225's closure found the
**opposite sign** of this defect on the same fixture: ten healer-statted
items — no agility, strength, attack power, crit, hit or expertise —
scoring **+4.61 to +7.80 DPS** for a feral and clearing the cutoff.
Filed separately as
`.scratch/carry-forward/issues/227-healer-role-items-score-above-the-feral-cutoff.md`,
because this ticket's signature is a *cliff* concentrated in three slots
(value withheld from candidates or credited to the incumbent), while
227's is *positive* deltas spread across six slots on items whose stat
lines alone should score near zero.

They may share a root cause. **If one diagnosis explains both, close
whichever ticket it does not belong to with a pointer** rather than
carrying two.

One finding from 227 bears directly on this ticket's trinket criterion:
all eleven trinkets sharing -31.33 DPS carry **zero melee-relevant
stats, and three have empty stat maps entirely**. That is consistent
with their effects not being credited — a stats-plus-effects question,
and the reason this ticket asks whether -31.33 is exactly the value of
losing the worn trinket's contribution.

## Out of scope

- Ticket 225's promotion budget and the recall target. That ticket is
  closed on its own evidence and this finding does not reopen it.
- Ticket 227's healer-item scoring — the sibling above.
- Ticket 224's presentation of tied rows.
- Re-recording the `feral-p3` fixture. Establish the cause against the
  committed recordings and the pinned binary first; a re-record is a
  consequence of a diagnosis, not a substitute for one.
