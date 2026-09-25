# Set-bonus fixture derivations

This file holds the hand derivations behind the literals in
`packages/core/test/fork-set-net.test.ts`, for the fixtures of tickets
476–478, 490–492 and the targeted engine review of 2026-09-25. The fixture
sim is an exact model, so each expected value comes from the arithmetic
below. None is recomputed the way the engine computes it.

The 476–478 and 490–492 sections were first written in the gitignored
stage-gate plans `round-2/plan.md` and `round-2b/plan.md` (under
`.scratch/stage-gate/upgrades-tab-closeout/`). They are copied here so that
a fresh clone can check them.

The suite is fork-gated and CI skips it (`docs/agents/known-traps.md`). To
run it locally with the fork clone present:

```sh
npx vitest run packages/core/test/fork-set-net.test.ts packages/core/test/wowsims-fork-parity.test.ts; echo rc=$?
```

## The controlled model

The fixture sim returns
`DPS = 3000 + Σ own value of each equipped item + active set bonuses`.

- Own values: Thunderheart (676) pieces `V_TH = 100`, neutral non-set
  pieces `V_NEUTRAL = 120`, and worn Malorne (640) pieces 0 unless a
  scenario overrides them.
- Set bonuses: Thunderheart 2pc `50` and 4pc `80`; Malorne 2pc `40` and 4pc
  `70`. A 2pc and 4pc of the same set stack.
- Package selection (`selectPackage`): per slot the best single, then the
  top `threshold − worn` slots. A tie goes to the lowest item id. The pieces
  come back in slot order.
- `raw2 = pkgΔ2 − Σsingles` and `raw4 = pkgΔ4 − Σsingles − raw2`.
- The corrected net is `bonusDps − Σ (membersPkg − members2pc − pkgEnd +
twoPcEnd)·B` over every lost worn threshold (`netInflation`).
- `FLOOR = 5`. A credit component at or below it counts as 0.

Item ids used below: Thunderheart head 31039, shoulder 31048, chest 31042,
hands 31034, legs 31044, wrist 34444, waist 34556, feet 34573. Malorne head
29098, shoulder 29100, chest 29096, hands 29097, legs 29099. Nordrassil
(641) chest 30222, hands 30223, head 30228, legs 30229, shoulder 30230.
Neutrals head 10150, shoulder 10153, chest 8283, hands 10140, legs 8289.

## Tickets 476–478

**476-A: worn Malorne head, shoulder, chest and hands (4).** The pool holds
Thunderheart and neutral pieces in those four slots. The baseline is
`3000 + 40 + 70`.

- A Thunderheart single takes Malorne from 4 to 3 and loses the 4pc:
  `100 − 70 = 30`. A neutral single: `120 − 70 = 50`.
- The 2pc package is hands and head (lowest ids). Malorne goes 4→2 and loses
  only the 4pc: `pkgΔ2 = 200 + 50 − 70 = 180`, `raw2 = 180 − 60 = 120`.
- The 4pc package is all four. Malorne goes 4→0 and loses both:
  `pkgΔ4 = 400 + 50 + 80 − 70 − 40 = 420`, `raw4 = 420 − 120 − 120 = 180`.
- B(640,4): worn equals t, so `n = 2`. The vacate replaces head and
  shoulder with neutrals: `Δ = 240 − 70 = 170`, `Σs = 100`, coefficient −1,
  so `B_4 = 70`.
- B(640,2): `n = 3`, vacating head, shoulder and chest:
  `Δ = 360 − 70 − 40 = 250`, `Σs = 150`, `L_1 = {4}`, `L_vac = {2, 4}`,
  coefficient 1: `B_2 = (150 − 250) + 3·70 − 70 = 40`. The naive `Σs − Δ`
  gives −100.
- net2 `= 120 − (2 − 0 − 1 + 0)·70 = 50`; net4
  `= 180 − [(4 − 2 − 1 + 1)·70 + (0 − 0 − 1 + 0)·40] = 80`.
- Every Thunderheart row: `deltaDps 30`, `singleBreaks [(640,4) 70]`,
  futures `[2: 50, 4: 80]`, `commitBreaks [(640,2) 40]`. The path to the 4pc
  breaks (640,2): full credit `50 + 80 − 40 = 90`, split
  `25 + 20 − 40 = 5`. Four rows sum to 360 (full) and 20 (split) against a
  package net of 90 (ADR-0034). The flag adds 2 sims.

**476-B: worn Malorne 5 (476-A plus legs).** The baseline is `3000 + 110`.
Singles take Malorne 5→4 and lose nothing: Thunderheart `100`, neutral
`120`.

- 2pc (hands and head): 5→3 loses the 4pc: `pkgΔ2 = 250 − 70 = 180`,
  `raw2 = 180 − 200 = −20`.
- 4pc: 5→1 loses both: `pkgΔ4 = 400 + 130 − 110 = 420`,
  `raw4 = 420 − 400 + 20 = 40`.
- B(640,4) `= 70` (`n = 2`, `L_1 = ∅`, `Δ = 170`, `Σs = 240`). B(640,2):
  `n = 4`, `Δ = 480 − 110 = 370`, `Σs = 480`, `L_vac = {2, 4}`:
  `B_2 = (480 − 370) − 70 = 40`. The naive value is 110.
- net2 `= −20 − (0 − 0 − 1 + 0)·70 = 50`; net4
  `= 40 − [(0 − 0 − 1 + 1)·70 + (0 − 0 − 1 + 0)·40] = 80`. The pre-476
  correction gave 180; every threshold with the old sign gives 220.
- Head row: `deltaDps 100`, no single break, `commitBreaks
[(640,4) 70, (640,2) 40]`. Best-stop: `R_2 = 50 − 70 = −20`,
  `R_4 = −20 + 80 − 40 = 20`, so full credit 20.

**477-T: worn Malorne chest, hands and legs (3, 2pc active).** The pool
holds Thunderheart wrist, waist and feet at own value 150, Thunderheart
hands and legs at 100, and neutral chest and hands. The baseline is
`3000 + 40`.

- Singles: wrist, waist, feet `150`; hands and legs take Malorne 3→2 with
  no loss: `100`.
- 2pc is wrist and waist: no Malorne slot, `raw2 = 350 − 300 = 50`, net2 50.
- 4pc is wrist, waist, feet and hands (hands wins on id): Malorne 3→2, no
  loss. `pkgΔ4 = 550 + 130 = 680`, `raw4 = 680 − 550 − 50 = 80`, net4 80.
- Legs row: `deltaDps 100`, no single break, futures `[2: 50, 4: 80]`. The
  top package with legs substituted overwrites Malorne hands and legs, 3→1,
  so `commitBreaks [(640,2)]`. B(640,2): `n = 2`, vacate chest and hands:
  `Δ = 240 − 40 = 200`, `Σs = 240`, `L_1 = ∅`, so `B_2 = 40`. One extra sim.
- Since 490 the credit charges only the row's own path. Legs plus wrist
  (to 2) and legs plus wrist, waist and feet (to 4) keep Malorne at 2, so
  nothing is charged: full credit `50 + 80 = 130`. From 477 until 490 it
  was 90. The four package rows also get 130.

**A4: worn Thunderheart hands and legs (2); the pool holds the worn hands
(owned), head, shoulder and chest.** The baseline is `3000 + 50`.

- Non-owned singles go 2→3, crossing nothing: `100`. The owned hands row
  is the same gear: `deltaDps 0`.
- The 2pc needs 0 pieces and is skipped. 4pc is head and chest:
  `pkgΔ4 = 200 + 80 = 280`, `raw4 = 280 − 200 = 80`, no breaks, net4 80.
- The owned row adds no piece, so it has no futures and credit 0. Before
  the 478 guard it got 80. The head row: futures
  `[{4, piecesNeeded 2, 80}]`, credit 80.

## Tickets 490–492

In 490-A, 490-B and 490-C every Malorne and Nordrassil id is also given own
value 100, the way 477-T extends the values. Worn Thunderheart pieces
therefore own 100 each. The path to threshold t for candidate c is `P_t`
if c is in `P_t`, else c plus the best `t − worn − 1` pieces of `P_t`
outside c's slot.

**The 490 geometry (490-A, B, C): worn Thunderheart hands and legs (676 at
2).** The baseline is `3000 + 200 + 50 = 3250`. Singles: head, shoulder or
chest `+100`; hands or legs replaces a 100-value piece and loses the
Thunderheart 2pc: `100 − 100 − 50 = −50`; neutral hands or legs
`120 − 100 − 50 = −30`. B(676,2): `n = 2`, vacate hands and legs:
`Δ = 240 − 200 − 50 = −10`, `Σs = −60`, coefficient −1, so `B = 50`. The
flag adds exactly 1 sim.

**490-A: Malorne with bonuses 2pc 40, 4pc 0.** Sorted singles: chest,
head, shoulder (100), then hands, legs (−50).

- `P_2` is chest and head: `pkgΔ2 = 240`, `raw2 = 40`, net2 40, no breaks.
- `P_4` is chest, head, shoulder and hands:
  `pkgΔ4 = 300 + 0 + 40 + 0 − 50 = 290`, `Σsingles = 250`,
  `raw4 = 290 − 250 − 40 = 0`, breaks (676,2), inflation
  `(1 − 0 − 1 + 0)·50 = 0`, net4 0.
- Chest, head and shoulder rows: futures `[{2, 2, 40, []}, {4, 4, 0,
[(676,2) 50]}]`. Best-stop: `R_2 = 40`, `R_4 = −10`, stop at 2: full 40,
  split 20. Before 490 the full credit was −10.
- Hands and legs rows: `deltaDps −50`, single break (676,2), which is
  filtered out of every path. Credit 40.
- Top three under set potential: {29096, 29098, 29100}.

**490-B: as 490-A with Malorne 4pc 30.** `pkgΔ4 = 320`,
`raw4 = 320 − 250 − 40 = 30`. Chest futures `[{2, 2, 40, []}, {4, 4, 30,
[(676,2) 50]}]`.

- Full-path: full `40 + 30 − 50 = 20`, split `20 + 7.5 − 50 = −22.5`.
- Best-stop (shipped): `R_2 = 40`, `R_4 = 20`, stop at 2: full 40, split 20.

**490-C: Nordrassil, whose 2pc is not implemented.** `P_4` is chest, head,
shoulder and hands: `pkgΔ4 = 300 + 0 + 0 − 50 = 250`, `Σsingles 250`,
`raw4 = 0`, net4 0. Chest, head and shoulder rows: futures
`[{4, 4, 0, [(676,2) 50]}]`, `commitPackageDeltaDps 250`, credit 0 under
either rule. Before 490 it was −50.

**492-F: worn Thunderheart hands (1); pool Thunderheart head, shoulder,
chest and legs.** The baseline is `3100`. Each single crosses the 2pc:
`100 + 50 = 150`. The 2pc package needs 1 piece:
`unmeasurable-at-this-worn-count`. `P_4` is head, chest and legs:
`pkgΔ4 = 300 + 50 + 80 = 430`, `Σsingles 450`, `raw4 = −20`.

- The pair is head and chest: `pkgΔpair = 200 + 50 = 250`,
  `Σsingles(pair) = 300`, `B2 = 50`, `bonusDps4 = −20 + 2·50 = 80`, net 80.
- Head row: futures `[{4, 3, 80}]`, full 80, split 20.
- Run count: `1 + 4 + 1 = 6` before 492 (baseline, four singles, the 4pc
  package), plus 1 for the pair sim.

**491-P and 491-L (pure).** `setCreditUnmeasured` is true for a future
with value 80 and an unmeasured commit break, false once that break has
`dps 40`, true for an unmeasured break on a future, and false with no
futures. `setBonusSubLine` gives `not_counted` for the first case with ON,
`hover_hint` with OFF, `null` for an empty context and `hover_hint` for a
row that only crosses a threshold.

## Engine review of 2026-09-25

**492-J (finding A1): worn Thunderheart hands plus Malorne head, shoulder
and chest (Malorne 3); pool Thunderheart head, shoulder, chest and legs,
and neutral head, shoulder and chest.** The baseline is
`3000 + 100 + 40 = 3140`.

- Thunderheart singles: head, shoulder or chest take Malorne 3→2 and keep
  its 2pc; legs fills an empty slot. Each is `100 + 50 = 150`.
- `P_4` is head, chest and legs (150 each, lowest ids). Malorne goes 3→1
  and loses its 2pc, so the package sims at `3000 + 400 + 50 + 80 = 3530`
  and `pkgΔ4 = 390`. `Σsingles = 450`, so `raw4 = −60`. Breaks: (640,2).
- Pairs of break-free pieces in slot order: head + chest takes Malorne
  3→1 together, so it is rejected. Head + legs keeps Malorne at 2:
  `DPS = 3000 + 300 + 50 + 40 = 3390`, pair delta 250,
  `B2 = 300 − 250 = 50`. `bonusDps4 = −60 + 2·50 = 40`.
- B(640,2): `n = 3 − 2 + 1 = 2`, vacate head and shoulder to neutrals:
  `DPS = 3000 + 100 + 240 = 3340`, `Δ = 200`, `Σs = 240`, `L_1 = ∅`,
  coefficient 1, so `B = 40`. The flag adds 1 sim.
- net4 `= 40 − (0 − 0 − 1 + 0)·40 = 80`, the model's true 4pc.
- Every Thunderheart row: `deltaDps 150`, futures
  `[{4, 3, 80, [(640,2) 40]}]` (each row's path takes Malorne to 1 or 0),
  full credit `80 − 40 = 40`.
- Before the fix the pair was head + chest: pair delta 210, `B2 = 90`,
  `bonusDps4 = 120`, net4 160, row credit 120.

**492-N (finding A2): worn Thunderheart hands plus Malorne head and chest
(Malorne 2); pool Thunderheart head, chest and legs, and neutral head and
chest.** The baseline is `3140`.

- Singles: Thunderheart head and chest each break the Malorne 2pc:
  `100 + 50 − 40 = 110`. Legs: `150`.
- `P_4` is head, chest and legs: Malorne 2→0, `pkgΔ4 = 390`,
  `Σsingles = 370`, `raw4 = 20`. Breaks: (640,2).
- Only legs is break-free, so no pair sim runs and `selfConfound` has no
  `dps`.
- B(640,2): worn equals t, `n = 2`, vacate head and chest:
  `Δ = 3340 − 3140 = 200`, `Σs = 160`, coefficient −1, so `B = 40`.
- The confounded net would be `20 − (2 − 0 − 1 + 0)·40 = −20`; the true
  4pc is 80. After the fix `bonusDpsNet` is unset, every row's future has
  no `dps`, the credit is 0 and the sub-line is `not_counted`.

**476-D (finding A4): 476-A without the neutral head and shoulder.** The
(640,4) vacate needs head and shoulder replacements. Head can only take
Thunderheart head (0→1 crosses nothing). Shoulder can only take
Thunderheart shoulder, which would take Thunderheart 1→2 and cross its
2pc, so it is refused: (640,4) is `no-neutral-candidates`. (640,2) needs
B_4 and is `dependent-unmeasured`. Both are found before any sim, so the
flag adds 0 sims. Neither 676 net is set. Every Thunderheart row keeps
`deltaDps 30` and `singleBreaks [(640,4)]` without `dps`, has futures
`[2, 4]` without `dps`, credit 0, and sub-line `not_counted`.
