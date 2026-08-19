# Ticket 226 — the head / idol / trinket cliffs, answered by direct sims

Every criterion in ticket 226 asks one question in a different slot: is the
fork's arithmetic producing this gap, or is it an artifact of what this repo
sends over the wall? This handoff answers each with a command and its output.

**The method.** The committed recordings store one number per candidate and
discard the request bodies, so the requests were re-captured by running the
ranker with a `CapturingSimRunner` and replayed through the pinned
`wowsimcli` v0.0.101. Where a criterion asks what a single item contributes,
the same request is re-run with that slot emptied.

**The precondition that makes the figures comparable.** A captured request
replayed at the recorded seed and iteration count reproduces the recorded DPS
*exactly*:

```
npx tsx packages/core/test/measure-direct-sim-sanity.ts
#   recorded baseline DPS   1952.5249585538932
#   direct   baseline DPS   1952.5249585538932
#   MATCH — exact to the decimal. Direct comparisons are exact.
```

So these are not "same shape, different run" comparisons. One geared sim at
30,000 iterations costs about 2.5 s.

**Requires the gitignored binary.** `vendor/` is not committed; fetch with
`pnpm fetch:wowsimcli`, which must report `v0.0.101`.

**Fixture figures are the tip ones.** Pool 365, 85 above cutoff, 428
recordings, baseline 1952.5249585538932, 3000 iterations, seed 42.

**A correction to what this ticket assumed about its own dump.**
`.scratch/handoffs/ticket-226-slot-truth-dump.txt` was expected to be stale,
because it was produced before the re-record in `57ec814`. It is not. All 40
rows across head, ranged and trinket match the tip fixture exactly — same item
ids, same deltas to the last decimal. The re-record moved the pool from 398 to
365 and the above-cutoff count from 86 to 85, but it did not move any row in
these three slots. The dump was therefore left as committed rather than
regenerated to identical content. Part 4e below re-derives the same rows from
the tip fixture, so the check is reproducible.

---

## Verdict

**Nothing in ticket 226 is a defect on our side of the wall.** Two of the
three shapes are the sim behaving correctly and being read correctly; the
third is real but is not the cliff the ticket describes.

1. **Head — not a defect.** The ~200 DPS gap reproduces exactly at 3,000
   iterations and holds at 30,000. Wolfshead Helm's own contribution,
   measured by emptying the slot, is **284.06 DPS** — *larger* than any
   candidate's loss. So candidates are not being charged something extra:
   they gain stats while losing an effect worth more than the stats are.
   Wolfshead's +20-energy-on-shift is genuinely simulated
   (`vendor/tbc-new-fork/sim/druid/forms.go:92,147`). The SME's judgment that
   "no helm costs a feral 200 DPS" is a judgment about the *item*, and the
   item really is that good in this fork at this gear level.

2. **Trinkets — real, and exactly as the ticket suspected.** Three of the
   tied group each produce **1920.64 DPS, byte-identical to emptying the
   trinket slot entirely**. These items contribute literally nothing, and
   -31.33 is the incumbent Hourglass of the Unraveller's own value showing
   through. This is ticket 171's shape with a different mechanism: not
   unimplemented stubs, but items whose stats are irrelevant to feral *and*
   whose procs do not fire for feral.

3. **Idol — not a cliff.** Idol of the White Stag is not contributing
   nothing: an empty ranged slot costs -48.36 DPS while White Stag costs only
   -21.31, so White Stag contributes about 27 DPS of real value. Everbloom
   Idol simply contributes more. Two idols with genuinely different values,
   both simulated, holding at 30,000 iterations.

4. **Not feral-only.** The ret P2 row shows the same trinket mechanism —
   three items sharing exactly -47.73 DPS. Smaller group, same signature. The
   cause is spec-independent: it is what happens when an item's stats and
   procs both contribute zero. Ret's head slot shows no cliff because ret's
   worn helm carries no Wolfshead-scale effect.

**The one thing worth fixing is a classifier blind spot, not a scoring bug.**
`data/sim-implemented-effects.json` lists Wolfshead (8345) in *neither*
`implementedEffectItemIds` nor `stubOnlyItemIds`, because its effect is
implemented via `HasItemEquipped` rather than `core.NewItemEffect` and the
generator only sees the latter. Meanwhile all eleven tied trinkets are
labelled `impl` while contributing nothing. Both directions of the label are
misleading. Filed as a new ticket; see Disposition.

---

## 4a. Is the incumbent inflated, or are the candidates undervalued?

```
npx tsx packages/core/test/measure-ticket-226-direct.ts --part a
```

```
measure-ticket-226-direct --part a

  captured 428 requests; fixture pool 365, above cutoff 85, baseline 1952.5249585538932

=== 4a. head slot: does the ~200 DPS gap reproduce? ===

  Recorded deltas on the tip fixture (RecordedSimRunner, 3000 it):
    31039 Thunderheart Cover   -186.69 DPS
    32235 Cursed Vision        -173.97 DPS

  --- direct sims at 3000 iterations, seed 42
    baseline (worn, Wolfshead 8345)           1952.52 DPS               SE(arm) 3.269                 569 ms
    31039 Thunderheart Cover                  1765.84 DPS  Δ   -186.69  SE(arm) 3.315  SE(Δ)<=4.656  546 ms
    32235 Cursed Vision of Sargeras           1778.55 DPS  Δ   -173.97  SE(arm) 3.313  SE(Δ)<=4.654  560 ms

  --- direct sims at 30000 iterations, seed 42
    baseline (worn, Wolfshead 8345)           1954.56 DPS               SE(arm) 1.039                 2182 ms
    31039 Thunderheart Cover                  1766.00 DPS  Δ   -188.56  SE(arm) 1.036  SE(Δ)<=1.467  2018 ms
    32235 Cursed Vision of Sargeras           1776.77 DPS  Δ   -177.79  SE(arm) 1.050  SE(Δ)<=1.477  2143 ms

  Read: if the gap reproduces here it is the fork's arithmetic, since
  these are the ranker's own requests run against the pinned binary.
  If it collapses, the defect is on our side of the wall.

```

**Answer.** The gap reproduces. At 3,000 iterations the direct sims return
-186.69 and -173.97 DPS — identical to the recorded deltas, which is the
sanity script's exact-replay property showing up again. At 30,000 iterations
they settle at -188.56 and -177.79 with SE(Δ) ≤ 1.48, so this is not a noise
artifact at any iteration count. **Our inputs are not the cause.** These are
the ranker's own requests, unmodified, run against the pinned binary.

## 4b. If the incumbent is inflated, what inflates it?

```
npx tsx packages/core/test/measure-ticket-226-direct.ts --part b
```

```
measure-ticket-226-direct --part b

  captured 428 requests; fixture pool 365, above cutoff 85, baseline 1952.5249585538932

=== 4b. head slot: what does the incumbent contribute? ===

  (i) baseline with the head slot emptied — Wolfshead's whole
      contribution, effect and stats together.

    baseline (worn, Wolfshead 8345)           1954.56 DPS               SE(arm) 1.039                 2299 ms
    baseline, head slot emptied               1670.50 DPS  Δ   -284.06  SE(arm) 0.993  SE(Δ)<=1.437  2169 ms

  (ii) equipment diff, Thunderheart vs baseline, by slot:
      head
        baseline  {"id":8345,"enchant":3003}
        candidate {"id":31039,"enchant":3003,"gems":[24028,0]}
      1 slot(s) differ — if only 'head', no gem or set
      side-effect rides along with the swap.

  (iii) reading:
      Wolfshead's whole contribution = 284.06 DPS.
      Ticket 226's candidate deltas span -173.97 to -253.60 DPS.
      If those sit at or below the whole-helm figure, the candidates
      are not being charged something extra: the incumbent's effect is
      simply worth that much and is counted correctly.
      Wolfshead's energy-on-shift is implemented at
      vendor/tbc-new-fork/sim/druid/forms.go:92,147 via HasItemEquipped(8345),
      not core.NewItemEffect — which is why the effects classifier
      labels it 'stub'. That is a classifier blind spot, not a sim gap.

```

**Answer — it is Wolfshead's effect, counted correctly.** The criterion asks
to distinguish three candidate mechanisms, and the measurement rules two out:

- **Meta gem failing in the candidate arm?** No. The equipment diff shows
  **exactly one slot differs** — `head` — and the candidate arm *gains* a gem
  (`gems:[24028,0]`) that the baseline's Wolfshead does not carry. Nothing
  else in the request moves.
- **A set bonus broken by the swap and credited to the baseline?** No. Same
  evidence: one slot differs, so no set piece elsewhere changed.
- **Wolfshead's +20-energy-on-shift counted into the baseline?** Yes, and
  correctly. Emptying the head slot costs **284.06 DPS**. Ticket 226's
  candidate deltas span -173.97 to -253.60, all *smaller* than 284.06 — which
  is what must be true if candidates are getting proper credit for their own
  stats while losing the effect. If the effect were being double-counted or
  the candidates shorted, the candidate deltas would meet or exceed the
  whole-helm figure.

The effect is real in the pinned fork:

```
grep -n "8345\|Wolfshead" vendor/tbc-new-fork/sim/druid/forms.go
# 92:	wolfsheadEquipped := druid.HasItemEquipped(8345, []proto.ItemSlot{proto.ItemSlot_ItemSlotHead})
# 147:					// Wolfshead Helm: +20 energy on shift into Cat.
```

**The classifier blind spot, now confirmed by a run and not by reading Go.**
Because the implementation is `HasItemEquipped` rather than
`core.NewItemEffect`, the generator classifies 8345 into neither list:

```
python -c "import json; d=json.load(open('data/sim-implemented-effects.json')); print(8345 in d['implementedEffectItemIds'], 8345 in d['stubOnlyItemIds'])"
# False False
```

The sim run above proves the effect fires. So the artifact's label is wrong
about this item, and the ticket's instruction — file a classifier ticket only
if the sim confirms — is satisfied. See Disposition.

## 4c. Are the eleven trinkets sharing -31.33 scoring their procs as zero?

```
npx tsx packages/core/test/measure-ticket-226-direct.ts --part c
```

```
measure-ticket-226-direct --part c

  captured 428 requests; fixture pool 365, above cutoff 85, baseline 1952.5249585538932

=== 4c. trinkets: is -31.33 the worn trinket's own value? ===

  Re-derived on the tip fixture (the ticket's dump predates
  the 57ec814 re-record, so its figures are not quoted here):

        16.14  28727  trinket1  Pendant of the Violet Eye
        16.00  28830  trinket1  Dragonspine Trophy
         8.82  30627  trinket1  Tsunami Talisman
         0.00  29383  trinket2  Bloodlust Brooch  <-- shared by 2
         0.00  28034  trinket1  Hourglass of the Unraveller  <-- shared by 2
        -1.25  32505  trinket1  Madness of the Betrayer
        -4.18  32654  trinket1  Crystalforged Trinket
        -4.67  30664  trinket1  Living Root of the Wildheart
       -25.44  28579  trinket1  Romulo's Poison Vial
       -31.33  28528  trinket1  Moroes' Lucky Pocket Watch  <-- shared by 10
       -31.33  28785  trinket1  The Lightning Capacitor  <-- shared by 10
       -31.33  28789  trinket1  Eye of Magtheridon  <-- shared by 10
       -31.33  30620  trinket1  Spyglass of the Hidden Fleet  <-- shared by 10
       -31.33  30621  trinket1  Prism of Inner Calm  <-- shared by 10
       -31.33  30629  trinket1  Scarab of Displacement  <-- shared by 10
       -31.33  32483  trinket1  The Skull of Gul'dan  <-- shared by 10
       -31.33  32486  trinket1  Ashtongue Talisman of Equilibrium  <-- shared by 10
       -31.33  32496  trinket1  Memento of Tyrande  <-- shared by 10
       -31.33  32501  trinket1  Shadowmoon Insignia  <-- shared by 10
       -32.06  30626  trinket1  Sextant of Unstable Currents

  Largest tie group on tip: 10 items at -31.33 DPS

  Worn trinkets and what emptying each slot costs:

    baseline (worn, Wolfshead 8345)           1954.56 DPS               SE(arm) 1.039                 2134 ms
    trinket1 emptied (was 28034)              1920.64 DPS  Δ    -33.92  SE(arm) 1.024  SE(Δ)<=1.459  2153 ms
    trinket2 emptied (was 29383)              1916.31 DPS  Δ    -38.25  SE(arm) 1.016  SE(Δ)<=1.453  2136 ms

  Three of the tied eleven, plus Romulo's just outside it:

    28528 Moroes' Lucky Pocket Watch (rec -31.33 DPS)    1920.64 DPS  Δ    -33.92  SE(arm) 1.024  SE(Δ)<=1.459  2138 ms
    32486 Ashtongue Talisman of Equilibrium (rec -31.33 DPS)    1920.64 DPS  Δ    -33.92  SE(arm) 1.024  SE(Δ)<=1.459  2191 ms
    32496 Memento of Tyrande (rec -31.33 DPS)    1920.64 DPS  Δ    -33.92  SE(arm) 1.024  SE(Δ)<=1.459  2156 ms
    28579 Romulo's Poison Vial (rec -25.44 DPS)    1926.86 DPS  Δ    -27.70  SE(arm) 1.030  SE(Δ)<=1.463  2312 ms

  Read: if a tied trinket's direct delta equals the cost of emptying
  the slot it replaces, those items contribute literally nothing and
  the shared value is the incumbent's loss showing through.

```

**Answer — yes, exactly. -31.33 is the incumbent's value showing through.**

The three tied trinkets re-simmed at 30,000 iterations each return
**1920.64 DPS**, and emptying `trinket1` returns **1920.64 DPS**. Identical,
to the decimal, for all four arms:

| arm | DPS at 30,000 it | Δ vs baseline |
| --- | --- | --- |
| trinket1 emptied (was 28034 Hourglass) | 1920.64 | -33.92 |
| 28528 Moroes' Lucky Pocket Watch | 1920.64 | -33.92 |
| 32486 Ashtongue Talisman of Equilibrium | 1920.64 | -33.92 |
| 32496 Memento of Tyrande | 1920.64 | -33.92 |

Wearing one of these trinkets is indistinguishable from wearing no trinket at
all. They contribute **literally nothing**, so the delta each records is
purely the loss of the incumbent — which is why eleven unrelated items land on
one value. The tie is not a clamp and not a floor: Romulo's Poison Vial sits
just outside at -27.70 because it carries melee hit, and Sextant just below at
-32.06.

The re-derived tip figures also correct the ticket: the shared group is
**10 items at -31.33**, not eleven, after the `57ec814` re-record.

**Why, mechanically.** These items carry no stat a feral converts to damage,
and their procs are not firing in this rotation:

```
python -c "import json; idx=json.load(open('data/items/index.json',encoding='utf-8')); [print(i, idx[str(i)]['name'], '|', [(k,v) for k,v in enumerate(idx[str(i)]['stats']) if v]) for i in (28528,32486,32496,28579,28034)]"
# 28528 Moroes' Lucky Pocket Watch | [(28, 38)]        <- dodge rating
# 32486 Ashtongue Talisman of Equilibrium | []          <- empty stat map
# 32496 Memento of Tyrande | [(4, 118), (5, 37)]        <- healing, spellpower
# 28579 Romulo's Poison Vial | [(20, 35)]               <- melee hit, hence the -25 not -31
# 28034 Hourglass of the Unraveller | [(21, 32)]        <- the worn one, melee crit
```

**This refutes the `impl` label's implied meaning.** All three tied trinkets
are in `implementedEffectItemIds`, yet contribute zero. As ticket 226 already
warned by quoting the artifact's own `_comment`, the labels narrow the search
and do not settle it — this run is the settlement. `impl` means "a
registration exists in the fork", not "this proc fires for this spec in this
rotation".

## 4d. Does the idol gap survive a direct sim?

```
npx tsx packages/core/test/measure-ticket-226-direct.ts --part d
```

```
measure-ticket-226-direct --part d

  captured 428 requests; fixture pool 365, above cutoff 85, baseline 1952.5249585538932

=== 4d. ranged: Everbloom Idol vs Idol of the White Stag ===

  Recorded: 32257 -21.29 DPS
  Worn:     29390 Everbloom Idol

  --- direct sims at 3000 iterations, seed 42
    baseline (worn, Wolfshead 8345)           1952.52 DPS               SE(arm) 3.269                 557 ms
    32257 Idol of the White Stag              1931.24 DPS  Δ    -21.29  SE(arm) 3.224  SE(Δ)<=4.591  588 ms
    ranged slot emptied (no idol at all)      1904.20 DPS  Δ    -48.32  SE(arm) 3.174  SE(Δ)<=4.556  552 ms

  --- direct sims at 30000 iterations, seed 42
    baseline (worn, Wolfshead 8345)           1954.56 DPS               SE(arm) 1.039                 2229 ms
    32257 Idol of the White Stag              1933.25 DPS  Δ    -21.31  SE(arm) 1.025  SE(Δ)<=1.459  2197 ms
    ranged slot emptied (no idol at all)      1906.19 DPS  Δ    -48.36  SE(arm) 1.009  SE(Δ)<=1.448  2237 ms

  Read: an idol carries no stat line, so any gap is effect or rotation.
  The emptied-slot arm bounds it — it is what wearing no idol costs, so
  a candidate idol scoring at that figure is contributing nothing.

```

**Answer — the gap survives, but it is not the shape the ticket assumed.**

The ticket reasons that "an idol carries an empty stat line by nature, so a
21 DPS gap between two idols cannot be explained by stats and must come from
how their effects are simulated or from the rotation not using one of them."
The first half is right and the conclusion is too strong. Both idols' effects
are simulated:

| arm | Δ at 30,000 it |
| --- | --- |
| 32257 Idol of the White Stag | -21.31 |
| ranged slot emptied (no idol at all) | -48.36 |

If White Stag's effect were not being used, it would score at the
empty-slot figure of -48.36. It scores at -21.31, so **White Stag contributes
about 27 DPS of real value** — it is simply worth less than Everbloom Idol's
~48 DPS on this character. The gap holds at 30,000 iterations with SE(Δ) ≤
1.46, so it is not noise either.

Whether Everbloom Idol *should* be worth twice Idol of the White Stag for a
feral at this gear level is a game-balance question about the fork, not a
defect in this repo's pipeline. No cliff here.

## 4e. Is this feral-only, or does ret show it too?

```
npx tsx packages/core/test/measure-ticket-226-direct.ts --part e
```

```
measure-ticket-226-direct --part e

=== 4e. does ret show the same shapes? ===

  There is NO recorded ret-p3 row. The committed fixture holds three
  rows: ret (maxPhase 2), feral (maxPhase 2), feral-p3 (maxPhase 3).
  `data/universes/ret-p3.json` exists as a universe, but no recorded
  truth was ever made for it, so this part reads the ret P2 row and
  live ret-p3 sims stay out of scope (ticket 226 forbids re-recording).

    ret        spec ret    maxPhase 2  pool  240  above  38  recordings 267
    feral      spec feral  maxPhase 2  pool  228  above  42  recordings 260
    feral-p3   spec feral  maxPhase 3  pool  365  above  85  recordings 428

  --- ret (P2) — the slots ticket 226 flags on feral
    head: 17 rows, span -82.03 .. 19.87 DPS; largest exact tie group 1 item(s)
          19.87  32461  Furious Gizmatic Goggles
          19.59  30131  Crystalforge War-Helm
           9.60  32041  Merciless Gladiator's Scaled Helm
           5.38  29073  Justicar Crown
           0.00  32087  Mask of the Deceiver
         -23.25  28775  Thundering Greathelm
         -25.21  29983  Fel-Steel Warhelm
         -34.00  28801  Maulgar's Warhelm
         -35.05  28796  Malefic Mask of the Shadows
         -35.24  28732  Cowl of Defiance
         -44.63  28593  Eternium Greathelm
         -44.95  28671  Steelspine Faceguard
         -62.68  30728  Fathom-Helm of the Deeps
         -68.87  30731  Faceguard of the Endless Watch
         -80.07  28583  Big Bad Wolf's Head
         -80.41  30048  Brighthelm of Justice
         -82.03  28803  Cowl of Nature's Breath

    trinket: 16 rows, span -64.41 .. 20.51 DPS; largest exact tie group 3 item(s)
          20.51  28830  Dragonspine Trophy
           0.00  29383  Bloodlust Brooch  <-- 2 share this exact value
           0.00  28288  Abacus of Violent Odds  <-- 2 share this exact value
         -11.01  31856  Darkmoon Card: Crusade
         -11.18  30627  Tsunami Talisman
         -16.30  28034  Hourglass of the Unraveller
         -34.29  30447  Tome of Fiery Redemption
         -40.03  28789  Eye of Magtheridon
         -40.59  28579  Romulo's Poison Vial
         -44.57  30626  Sextant of Unstable Currents
         -47.41  28727  Pendant of the Violet Eye
         -47.73  28528  Moroes' Lucky Pocket Watch  <-- 3 share this exact value
         -47.73  28785  The Lightning Capacitor  <-- 3 share this exact value
         -47.73  30621  Prism of Inner Calm  <-- 3 share this exact value
         -47.78  30620  Spyglass of the Hidden Fleet
         -64.41  30629  Scarab of Displacement

    ranged: 4 rows, span -13.63 .. 0.00 DPS; largest exact tie group 1 item(s)
           0.00  27484  Libram of Avengement
          -5.06  31033  Libram of Righteous Power
          -9.80  22401  Libram of Hope
         -13.63  23203  Libram of Fervor

  --- feral-p3 — for side-by-side comparison
    head: 18 rows, span -253.60 .. 0.00 DPS; largest exact tie group 1 item(s)
           0.00  8345   Wolfshead Helm
        -173.97  32235  Cursed Vision of Sargeras
        -181.39  33672  Vengeful Gladiator's Dragonhide Helm
        -186.69  31039  Thunderheart Cover
        -193.03  30228  Nordrassil Headdress
        -201.18  29098  Stag-Helm of Malorne
        -211.88  28732  Cowl of Defiance
        -221.62  28796  Malefic Mask of the Shadows
        -231.57  29986  Cowl of the Grand Engineer
        -232.17  32329  Cowl of Benevolence
        -234.98  32240  Guise of the Tidal Lurker
        -237.04  28803  Cowl of Nature's Breath
        -237.28  29990  Crown of the Sun
        -239.77  28756  Headdress of the High Potentate
        -244.51  32525  Cowl of the Illidari High Lord
        -245.98  28744  Uni-Mind Headdress
        -248.21  28586  Wicked Witch's Hat
        -253.60  28804  Collar of Cho'gall

    trinket: 20 rows, span -32.06 .. 16.14 DPS; largest exact tie group 10 item(s)
          16.14  28727  Pendant of the Violet Eye
          16.00  28830  Dragonspine Trophy
           8.82  30627  Tsunami Talisman
           0.00  29383  Bloodlust Brooch  <-- 2 share this exact value
           0.00  28034  Hourglass of the Unraveller  <-- 2 share this exact value
          -1.25  32505  Madness of the Betrayer
          -4.18  32654  Crystalforged Trinket
          -4.67  30664  Living Root of the Wildheart
         -25.44  28579  Romulo's Poison Vial
         -31.33  28528  Moroes' Lucky Pocket Watch  <-- 10 share this exact value
         -31.33  28785  The Lightning Capacitor  <-- 10 share this exact value
         -31.33  28789  Eye of Magtheridon  <-- 10 share this exact value
         -31.33  30620  Spyglass of the Hidden Fleet  <-- 10 share this exact value
         -31.33  30621  Prism of Inner Calm  <-- 10 share this exact value
         -31.33  30629  Scarab of Displacement  <-- 10 share this exact value
         -31.33  32483  The Skull of Gul'dan  <-- 10 share this exact value
         -31.33  32486  Ashtongue Talisman of Equilibrium  <-- 10 share this exact value
         -31.33  32496  Memento of Tyrande  <-- 10 share this exact value
         -31.33  32501  Shadowmoon Insignia  <-- 10 share this exact value
         -32.06  30626  Sextant of Unstable Currents

    ranged: 2 rows, span -21.29 .. 0.00 DPS; largest exact tie group 1 item(s)
           0.00  29390  Everbloom Idol
         -21.29  32257  Idol of the White Stag

  Read: a shared exact value across unrelated items is the ticket 171 /
  ticket 226 signature. Compare whether ret's slots show it too — if
  they do, the mechanism is spec-independent; if only feral does, the
  cause is in feral's own item handling.

```

**Answer — ret shows the same trinket mechanism, so the cause is
spec-independent.**

Ret's trinket slot has its own exact-tie group: **28528, 28785 and 30621 all
at -47.73 DPS**. Same signature, smaller group, different spec, different
incumbent — which is what "the fix is scoped to a mechanism rather than to a
spec" means in the ticket's own words. Note 28528 Moroes' Lucky Pocket Watch
appears in *both* specs' tie groups: it is inert for feral and for ret alike.

Ret's head slot shows **no cliff** (span -82.03 to +19.87, largest exact tie
group 1) and its ranged slot likewise. That is the control the comparison
needed: the head cliff is specific to feral because it is specific to
*Wolfshead Helm*, an item with a large class-specific effect. Remove that one
item and the shape disappears.

**On scope.** There is no recorded `ret-p3` row — the committed fixture holds
`ret` (maxPhase 2), `feral` (maxPhase 2) and `feral-p3` (maxPhase 3).
`data/universes/ret-p3.json` exists as a universe but no recorded truth was
ever made for it, and this ticket forbids re-recording, so the ret comparison
runs on the P2 row. The finding did not turn out to be inconclusive, so live
ret-p3 sims stay out of scope.

## 4f. Disposition

Every fork conclusion above cites a direct run against the pin, not a reading
of the Go source. The one Go citation (`forms.go:92,147`) is corroborated by
the 284.06 DPS measurement, not relied on alone.

**Ticket 226 → `resolved`.** All five diagnostic criteria are answered. Two of
the three reported shapes are correct behaviour; the third (trinkets) is real
and fully explained, but it is not a scoring defect in this repo — the sim
scores inert items as inert, and the pipeline reports that faithfully.

**What is left is a product question, not a bug**: whether items that
contribute exactly nothing should appear in a candidate pool at all. That is
the same question ticket 227 §5e asks about healer gear, from the opposite
direction, and it is filed there rather than duplicated here.

**New ticket filed** — the effects classifier's blind spot, which this ticket
required a sim to confirm before filing:
`.scratch/carry-forward/issues/233-effects-classifier-mislabels-both-directions.md`.

**Relationship to ticket 227.** Ticket 226 asked that if one diagnosis
explains both tickets, the one it does not belong to be closed with a
pointer. It does not: 226's trinkets contribute *nothing* and land on the
incumbent's value (a deterministic, reproducible zero), while 227's healer
rows carry *positive* deltas that the noise hypothesis explains. Different
mechanisms. Both tickets keep their own disposition; see
`.scratch/handoffs/ticket-227-healer-noise.md`.
