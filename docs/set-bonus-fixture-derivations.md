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

Since ticket 502 the ON credit follows rule R1 (ADR-0034). The futures are
walked in threshold order. Each step adds its floored bonus, plus the own
stats of each path piece that no earlier step counted, minus each path
break that no earlier step charged, at its measured value with no floor. A
step can be the stop only if its floored bonus is above 0. The credit is the
largest running total at such a step, or 0. A piece's own stats are
`own(p) = single(p) + Σ B of the worn bonuses p breaks alone − B2` (the last
term only when p alone crosses the 2pc at worn 1, valued by the 4pc
`selfConfound`). The `split` view keeps `bonus ÷ threshold − floored
breaks` with no pieces, taken at R1's full stop. `full-path` counts every
step whose floored bonus is above 0, and the credit is the running total
after the last one.

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
- Since 502: each other Thunderheart piece owns `30 + 70 = 100` (its single
  plus the (640,4) it breaks alone). `P_2` is hands and head; the shoulder
  and chest rows take hands as their 2pc partner (tie on 30, lower id). Every
  row: `R_2 = 50 + 100 = 150`, `R_4 = 150 + 80 + 200 − 40 = 390`, stop 4,
  full credit 390, and `30 + 390 = 420 = pkgΔ4`. Split at the same stop is
  still 5. Four rows sum to 1560 (full) and 20 (split).

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
- Since 502: the head row's path to 2 is `P_2` (hands and head), which
  breaks (640,4); its path to 4 breaks (640,4) and (640,2). The other
  pieces own 100 each and break nothing alone. `R_2 = 50 + 100 − 70 = 80`,
  `R_4 = 80 + 80 + 200 − 40 = 320`, stop 4, full credit 320, and
  `100 + 320 = 420 = pkgΔ4`.

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
- Since 502: the legs row's path to 2 adds wrist (150, lowest id of the
  150s) and its path to 4 adds waist and feet; none breaks anything alone.
  `R_2 = 50 + 150 = 200`, `R_4 = 200 + 80 + 150 + 150 = 580`, full credit
  580, and `100 + 580 = 680`, the value of legs with wrist, waist and feet.
- Since 502, package rows: wrist and waist are in `P_2`:
  `R_2 = 50 + 150 = 200`, then `P_4` adds feet (150) and hands (100):
  `R_4 = 200 + 80 + 250 = 530`, credit 530, `150 + 530 = 680 = pkgΔ4`.
  Feet takes wrist as its 2pc
  partner, then waist and hands: credit 530. Hands takes wrist, then waist
  and feet: `R_4 = 200 + 80 + 300 = 580`, credit 580, `100 + 580 = 680`.

**A4: worn Thunderheart hands and legs (2); the pool holds the worn hands
(owned), head, shoulder and chest.** The baseline is `3000 + 50`.

- Non-owned singles go 2→3, crossing nothing: `100`. The owned hands row
  is the same gear: `deltaDps 0`.
- The 2pc needs 0 pieces and is skipped. 4pc is head and chest:
  `pkgΔ4 = 200 + 80 = 280`, `raw4 = 280 − 200 = 80`, no breaks, net4 80.
- The owned row adds no piece, so it has no futures and credit 0. Before
  the 478 guard it got 80. The head row: futures
  `[{4, piecesNeeded 2, 80}]`, credit 80.
- Since 502: the head row's path to 4 is `P_4` (head and chest), and the
  chest owns 100: credit `80 + 100 = 180`, and `100 + 180 = 280 = pkgΔ4`.
  The owned row still gets 0.

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
- Since 502: chest, head and shoulder own 100 each. Hands owns
  `−50 + 50 = 0` (its single plus the (676,2) it breaks alone). The chest
  and head rows' path to 2 is `P_2`; the shoulder row takes chest (tie on
  100, lower id). `R_2 = 40 + 100 = 140`. The 4pc floors to 0, so it is
  never a stop. Full credit 140, split `40 / 2 = 20`, and
  `100 + 140 = 240 = pkgΔ2`. The hands and legs rows take chest as their
  2pc partner, with no break (their own (676,2) is filtered): credit 140.
  Under set potential the chest, head and shoulder rows show 240, and the
  hands and legs rows 90, so the top three are unchanged.

**490-B: as 490-A with Malorne 4pc 30.** `pkgΔ4 = 320`,
`raw4 = 320 − 250 − 40 = 30`. Chest futures `[{2, 2, 40, []}, {4, 4, 30,
[(676,2) 50]}]`.

- Full-path: full `40 + 30 − 50 = 20`, split `20 + 7.5 − 50 = −22.5`.
- Best-stop (shipped): `R_2 = 40`, `R_4 = 20`, stop at 2: full 40, split 20.
- Since 502 (own stats as in 490-A): the chest row's
  `R_2 = 40 + 100 = 140` and `R_4 = 140 + 30 + 100 + 0 − 50 = 220`. Both
  rules stop at 4: full 220 and split `20 + 7.5 − 50 = −22.5`, and
  `100 + 220 = 320 = pkgΔ4`. This geometry no longer separates the rules;
  the pure test 502-B does.
- 502-A (identity): every `P_4` member shows `pkgΔ4 = 320`. The head row is
  the chest row's twin. Shoulder: `R_2 = 40 + 100` (chest),
  `R_4 = 140 + 30 + 100 + 0 − 50 = 220`, and `100 + 220 = 320`. Hands
  (`deltaDps −50`, its (676,2) is its own single break): `R_2 = 40 + 100`
  (chest), `R_4 = 140 + 30 + 200 = 370` (head and shoulder, no break left
  to charge), and `−50 + 370 = 320`.

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
- Since 502: each other piece crosses the 2pc alone, so it owns
  `150 − 50 = 100`. The head row's 4pc pieces are chest and legs, each
  `dps 100`: full credit `80 + 200 = 280`, split still 20, and
  `150 + 280 = 430 = pkgΔ4`.
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
- Since 502: each Thunderheart piece owns `150 − 50 = 100` (no piece breaks
  Malorne alone). Head, chest and legs rows: `P_4` adds two pieces, credit
  `80 + 200 − 40 = 240`, and `150 + 240 = 390 = pkgΔ4`. The shoulder row
  takes head and chest (150 each, lowest ids), which break (640,2) with it:
  credit 240.
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

## Ticket 502

These cases pin R1 (see the model section). The pure cases build a
`setContext` by hand; a future's `pieces` lists the path members other
than the row, each with its own stats as `dps`.

**502-A (identity):** see 490-B. Every `P_4` member's `deltaDps + credit`
is `pkgΔ4 = 320`.

**502-B (stop condition, pure).**

- Both bonuses below the floor (2pc 4, 4pc 3), pieces A 30, B 20, C 10:
  no step can be the stop, so the credit is 0, not 60.
- 2pc 4, 4pc 80; the 2pc path adds A (10), the 4pc path adds B (20) and
  C (−5): `R_2 = 0 + 10 = 10` is not a stop,
  `R_4 = 10 + 80 + 20 − 5 = 105`. Credit 105 at stop 4; A is counted at
  the 2pc step.
- Rule discriminator: 2pc 40 with A (100); 4pc 30 with B (0), C (0) and a
  break of 200. `R_2 = 140`, `R_4 = 140 + 30 − 200 = −30`. Best-stop: full
  140, split `40 / 2 = 20`. Full-path: full −30, split
  `20 + 7.5 − 200 = −172.5`.

**502-C (own stats, engine).**

- 492-F head row: the 4pc pieces are chest (31042) and legs (31044), each
  `150 − 50 = 100`.
- 476-A hands row: the 2pc piece is head (31039); the 4pc pieces are head,
  shoulder (31048) and chest (31042), in slot order. Each is
  `30 + 70 = 100`.

**502-D (terms, pure).** Set "Thunderheart Harness", worn 0. The 2pc (50)
adds A (100) and breaks Malorne Harness 4pc (70); the 4pc (80) adds B (20)
and C (−10) and also breaks Malorne Harness 2pc (40). `R_2 = 50 + 100 −
70 = 80`, `R_4 = 80 + 80 + 20 − 10 − 40 = 130`. The terms are bonus 2pc
+50, A +100, Breaks 4pc −70, bonus 4pc +80, B +20, C −10, Breaks 2pc −40,
summing to 130. With B at −100 instead, `R_4 = 10`, the stop is 2 and the
terms end after Breaks 4pc −70 (credit 80). The second 502-B context has no
2pc bonus term: its terms are A +10, bonus 4pc +80, B +20, C −5.

**502-E (unmeasured, pure).** A 4pc of 80 whose piece has no `dps` is
unmeasured: credit 0. A 2pc of 50 with a 20 break and no `pieces` field is
credited as before 502: `50 − 20 = 30`, and it is not unmeasured.

**502-F (OFF):** the 490-B ranking with Set potential off sorts on
`deltaDps`: chest, head, shoulder (100), neutral legs 8289 and hands 10140
(`120 − 100 − 50 = −30`), then Malorne hands and legs (−50).

**502-G (a path break below the floor):** the 490 geometry with the
Thunderheart 2pc worth 4 and Malorne 2pc 40, 4pc 30.

- Singles: chest, head, shoulder 100; Malorne hands or legs
  `100 − 100 − 4 = −4`; neutral hands or legs `120 − 100 − 4 = 16`.
- B(676,2): vacate hands and legs, `Δ = 240 − 200 − 4 = 36`, `Σs = 32`,
  coefficient −1, so `B = 4`.
- `P_2` is chest and head, net2 40. `P_4` is chest, head, shoulder and
  hands: `pkgΔ4 = 300 + 40 + 30 − 4 = 366`, `raw4 = 366 − 296 − 40 = 30`,
  inflation `(1 − 0 − 1 + 0)·4 = 0`, net4 30.
- Chest row: head owns 100, shoulder 100, hands `−4 + 4 = 0`.
  `R_2 = 40 + 100 = 140`, `R_4 = 140 + 30 + 100 + 0 − 4 = 266`. The
  break term is −4, the credit 266, and `100 + 266 = 366 = pkgΔ4`. A
  floored break would give 270 and 370.
