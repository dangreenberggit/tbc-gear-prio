# Set-bonus fixture derivations

This file holds the hand derivations behind the literals in
`packages/core/test/fork-set-net.test.ts`, for the fixtures of tickets
476–478, 490–492, 502, 511 and 512 and the targeted engine review of
2026-09-25. The fixture
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
  `70`. A 2pc and 4pc of the same set stack. Since ticket 512 a case can
  also give a set a 3pc, 6pc or 8pc bonus; every bonus at or below the worn
  count stacks.
- Set-less copies (ticket 511): an id from `1,000,000` up to `2,000,000` is
  the set-less copy of the item `id − 1,000,000`. It has that item's own
  value and belongs to no set.
- Set-kept copies (ticket 512): an id at or above `2,000,000` is the
  set-kept copy of the item `id − 2,000,000`. It has that item's own value
  and counts toward that item's set.
- Id effects (ticket 512): a case can give an item id a DPS the model adds
  only when that real id is worn, never for a copy. It stands in for an
  effect Go keys by item id, such as the PvP glove mods.
- Interaction terms (ticket 511): a case can add `{ids, dps}` terms. A term
  adds its `dps` when every listed id is worn, and a copy counts as its
  original. No case before 511 uses one.
- Package selection (`selectPackage`): per slot the best single, then the
  top `threshold − worn` slots. A tie goes to the lowest item id. The pieces
  come back in slot order.
- `raw2 = pkgΔ2 − Σsingles` and `raw4 = pkgΔ4 − Σsingles − raw2`.
- The corrected net is `bonusDps − Σ (membersPkg − members2pc − pkgEnd +
twoPcEnd)·B` over every lost worn threshold (`netInflation`).
- `FLOOR = 5`. A credit component at or below it counts as 0.
- Break values (ticket 512, flag on). For each set worn at 2 or more
  pieces, at slots s_1 < … < s_w, the ladder sims rung R(c) for c = 1 … w:
  s_1 real, s_2 … s_c set-kept copies, s_(c+1) … s_w set-less copies. The
  value at count c is `R(c) − R(c − 1)`, which in the model is the bonus at
  exactly c pieces (0 where the set has none). A count is a break when its
  value is above the engine gate `max(√2 · 3.6, 2 · se) = 5.09` (feral
  cutoff 3.6; se `√2 · 30/√5000 = 0.6`), or when a rung's sim failed.
  `brokenSetValues` holds one entry per such count. The ladder costs one
  sim per worn piece of each set worn at 2 or more. Before 512 the break
  value came from a vacate sim per broken bonus, solved against
  replacement singles; the derivations below give the ladder instead.

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
- Ladder (since 512), slots head, shoulder, chest, hands: R(1) to R(4) are
  `3000`, `3040`, `3040`, `3110`, so B(640,2) = 40, (640,3) = 0 (not
  counted) and B(640,4) = 70. Before 512 the vacate solved the same 70 and
  40 from replacement singles (the naive `Σs − Δ` for the 2pc gave −100).
- net2 `= 120 − (2 − 0 − 1 + 0)·70 = 50`; net4
  `= 180 − [(4 − 2 − 1 + 1)·70 + (0 − 0 − 1 + 0)·40] = 80`.
- Every Thunderheart row: `deltaDps 30`, `singleBreaks [(640,4) 70]`,
  futures `[2: 50, 4: 80]`, `commitBreaks [(640,2) 40]`. The path to the 4pc
  breaks (640,2): full credit `50 + 80 − 40 = 90`, split
  `25 + 20 − 40 = 5`. Four rows sum to 360 (full) and 20 (split) against a
  package net of 90 (ADR-0034). The flag adds 4 ladder rungs, and since
  511 the Thunderheart 2pc and 4pc gate sims, two each since 512: 8 in all.
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
- Ladder (since 512), slots head, shoulder, chest, hands, legs: R(1) to
  R(5) are `3000`, `3040`, `3040`, `3110`, `3110`, so B(640,2) = 40,
  B(640,4) = 70, and (640,3) and (640,5) read 0 and are not counted. The
  vacate's naive value for the 2pc was 110.
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
  so `commitBreaks [(640,2)]`. Ladder (since 512), slots chest, hands,
  legs: `3000`, `3040`, `3040`, so B(640,2) = 40 and (640,3) = 0 (not
  counted). The flag adds 3 ladder rungs, and since 511 the Thunderheart 2pc
  and 4pc gate sims, two each since 512: 7 in all.
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
`120 − 100 − 50 = −30`. Ladder (since 512), slots hands and legs:
R(1) `3000 + 200 = 3200`, R(2) `3250`, so B(676,2) = 50. The flag adds 2
ladder rungs. Since 511 it also adds the gate sims of each measured
package, two per package since 512; in 490-A that is the Malorne 2pc and
4pc, 6 sims in all.

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
- Ladder (since 512), Malorne head, shoulder and chest: R(1) to R(3) are
  `3100`, `3140`, `3140`, so B(640,2) = 40 and (640,3) = 0 (not counted).
  Thunderheart, worn 1, has no ladder. The flag adds 3 ladder rungs, and
  since 511 the 4pc gate sims, two since 512: 5 in all. The 2pc is one
  piece at worn 1, so it is not measured and has no gate.
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
- Ladder (since 512), Malorne head and chest: R(1) `3100`, R(2) `3140`,
  so B(640,2) = 40.
- The confounded net would be `20 − (2 − 0 − 1 + 0)·40 = −20`; the true
  4pc is 80. After the fix `bonusDpsNet` is unset, every row's future has
  no `dps`, the credit is 0 and the sub-line is `not_counted`.

**476-D: a failed ladder sim (rewritten for ticket 512).** Until 512 this
case pinned finding A4: 476-A without the neutral head and shoulder, where
the (640,4) vacate found no replacement (`no-neutral-candidates`) and
(640,2) was `dependent-unmeasured`. The ladder needs no replacement and has
no dependency between counts, so that branch is gone. The case now keeps
476-A's worn Malorne 4 and that pool, and makes the model sim fail on any
request with the Malorne hands as a set-kept copy (id `2,029,097`). Only
R(4) sends it (hands is the last slot), so (640,4) is `sim-failed`,
counted and without `dps`; R(1) to R(3) give B(640,2) = 40 and (640,3) = 0
(not counted). The flag adds 4 ladder rungs (one fails) and the
Thunderheart 2pc and 4pc gate sims, two each: 8 in all. Both packages
break (640,4), whose B is missing, so neither 676 net is set. Every
Thunderheart row keeps `deltaDps 30` and `singleBreaks [(640,4)]` without
`dps`, has futures `[2, 4]` without `dps`, credit 0, and sub-line
`not_counted`.

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

**502-G (a worn bonus below the gate; rewritten for ticket 512):** the
490 geometry with the Thunderheart 2pc worth 4 and Malorne 2pc 40, 4pc 30.

- Singles: chest, head, shoulder 100; Malorne hands or legs
  `100 − 100 − 4 = −4`; neutral hands or legs `120 − 100 − 4 = 16`.
- Ladder: R(1) `3200`, R(2) `3204`, so (676,2) reads 4. That is below the
  gate of 5.09, so it is not counted: no `brokenSetValues` entry, no
  package or row break, and no add-back in any piece's own stats.
- `P_2` is chest and head, net2 40. `P_4` is chest, head, shoulder and
  hands: `pkgΔ4 = 300 + 40 + 30 − 4 = 366` (the sim still loses the 4),
  `raw4 = 366 − 296 − 40 = 30`, no counted breaks, net4 30.
- Chest row: head owns 100, shoulder 100, hands `−4` (its single, with
  nothing added back). `R_2 = 40 + 100 = 140`,
  `R_4 = 140 + 30 + 100 − 4 = 266`, no break term, credit 266, and
  `100 + 266 = 366 = pkgΔ4`.
- Before 512 the case was "a path break below the floor is charged at its
  measured value": the break term was −4 and hands owned `−4 + 4 = 0`, which
  gives the same 266. The Gate B ruling for plan revision 7 (R1) expected
  270 and 370, from dropping the −4 charge while keeping the add-back; the
  ladder drops both, because the same predicate decides the charge and the
  add-back, so the figure stays 266 and 366.

## Ticket 511: set-less copies and the same-gear gate

Under the flag, each measured package also gets `sameGearDps`: the same
gear simmed twice with the first set pieces, in slot order, sent as copies
until `threshold − 1` of the set remain without them. The copies are
set-kept in the "on" sim and set-less in the "off" sim (ticket 512), so a
piece with an id effect lacks it in both. Neither request is the package
request, so both sims are new. Every flag-on case above therefore adds two
sims per measured package, as its own section says.

**511-C (the copy transform).** A request with Thunderheart hands and
neutral legs 8289 and no database, both made set-less: the ids become
`1,031,034` and `1,008,289`, the input request is unchanged, there is still
no database, and the cache key differs. Neutral legs alone sim at
`3000 + 120 = 3120`, and so does their copy. With a database holding the
hands' row, the copy adds one row: the same fields with `id 1,031,034`,
`setName ""` and `setId 0`, `scalingOptions` kept. A set-kept copy of the
hands adds the real row with only `id` changed, to `2,031,034`. With no
database, set-kept hands and set-less neutral legs swap ids only and sim at
`3000 + 100 + 120 = 3220` (one Thunderheart piece, no bonus).

**511-I (the interaction hook, pure).** Thunderheart hands and legs with a
term `{[hands, legs], 9}`: both worn `3000 + 200 + 50 + 9 = 3259`; hands
alone `3100`; the hands' copy with the legs `3000 + 200 + 9 = 3209` (the
term stays, the 2pc goes).

**511-G (the gate, two new sims).** Worn nothing; the pool holds only
Thunderheart hands and legs. Singles `+100` each. The 2pc package is both
pieces, `3000 + 200 + 50 = 3250`; the 4pc is `insufficient-pieces`. The
gate copies the hands (the first in slot order) in both sims: set-kept,
`3000 + 200 + 50 = 3250`, and set-less, `3000 + 200`, so
`sameGearDps = 50`, and `sameGearSe = √(2 · (30/√5000)²) = 0.6`. Nothing
worn is broken, so the flag adds exactly these two sims. The package
request is simmed once. The hands row's 2pc future carries 50 and 0.6; its
4pc future carries neither.

**511-G2 (the gate leaves out interactions).** 511-G with the term
`{[hands, legs], 9}`. The package sims at `3259`, so today's
`bonusDps = 259 − 200 = 59`. Both copies keep the term:
`sameGearDps = 3259 − 3209 = 50`, the bonus alone.

**511-H (an id effect among the pieces the gate changes).** Scenario kind:
a set package in which a piece with a Go effect keyed by its item id is
among the pieces the gate copies, as the hunter and warrior PvP gloves
are (`RegisterPvPGloveMod`). Until ticket 511's gain side leaves the
six-set table, only a table set has a package to gate, so the example is
Thunderheart Gauntlets 31034 with a model id effect of 15, and the
Thunderheart 2pc of 50. Worn nothing.

- Run (i): the pool holds the chest and the gauntlets. The package is both,
  and the gate copies the chest (first in slot order). On:
  `3000 + 200 + 15 + 50 = 3265`; off: `3000 + 200 + 15 = 3215`;
  `sameGearDps = 50`.
- Run (ii): the pool holds the gauntlets and the legs. The gate copies the
  gauntlets. On: `3000 + 200 + 50 = 3250`; off: `3000 + 200 = 3200`;
  `sameGearDps = 50`. With the gauntlets copied on the "off" side only
  (K3's gate), on is the package `3265` and the value is 65.

## Ticket 512: set breaks with no list

Under the flag the break side reads no table: every count of every worn set
comes from the ladder (see the model section), and a count is charged only
when it clears the gate. Each case below states the kind of situation it
stands for, then its example set, then the literals. The cases test the
controlled model, not a sim. A neutral (non-set) candidate's row has no
`setContext`, so a row's own break is read on a set-piece candidate in the
same slot.

Item ids: Wastewalker Armor (659) shoulder 27797, chest 28264, hands 27531,
legs 27837. Primal Intent (619) chest 29525, wrist 29527, waist 29526.
Gladiator's Pursuit (586) chest 28334, gloves 28335. Cryptstalker Armor
(530) head 22438, shoulder 22439, chest 22436, wrist 22443, hands 22441,
waist 22442, legs 22437, feet 22440. Their own values are 0.

**Cases 7 and 8, rewritten.** Case 7 (worn Malorne hands and legs, a
Thunderheart-only pool) pinned "no neutral replacement, so B is
unmeasured". The ladder needs no replacement: R(1) `3000`, R(2) `3040`,
B(640,2) = 40, nets 50 and 80 as in case 4. The Thunderheart hands row:
`deltaDps 100 − 40 = 60`, `singleBreaks [(640,2) 40]`; its path to 2 adds
head (100), its path to 4 adds chest and shoulder (100 each), and its own
(640,2) is filtered from both, so `R_2 = 50 + 100 = 150`,
`R_4 = 150 + 80 + 200 = 430`, and `60 + 430 = 490 = pkgΔ4`
(`400 + 50 + 80 − 40`). Case 8 (the same worn gear with neutrals): the flag
adds the 2 ladder rungs and 2 gate sims for each of the Thunderheart 2pc
and 4pc, 6 in all.

**512-W — a worn bonus from a set that no hand-kept table lists.** Kind: a
non-tier set with bonuses at 2 and 4 (dungeon, crafted, other classes'
sets) that an upgrade package takes pieces from. Example: Wastewalker 659
worn 4/4, model 2pc 30 and 4pc 20; the pool holds Malorne shoulder, chest,
hands and legs at own value 100. The baseline is `3000 + 30 + 20 = 3050`.

- Ladder, slots shoulder, chest, hands, legs: R(1) to R(4) are `3000`,
  `3030`, `3030`, `3050`: (659,2) 30 counted, (659,3) 0 not counted,
  (659,4) 20 counted.
- Singles take Wastewalker 4→3 and lose the 4pc: `100 − 20 = 80`.
- `P_2` is chest and hands (lowest ids): Wastewalker 4→2, breaks (659,4)
  only. `pkgΔ2 = 200 + 40 − 20 = 220`, `raw2 = 60`, inflation
  `(2 − 0 − 1 + 0)·20 = 20`, net2 40.
- `P_4` is all four: Wastewalker 4→0, breaks (659,4) and (659,2).
  `pkgΔ4 = 400 + 40 + 70 − 20 − 30 = 460`, `raw4 = 460 − 320 − 60 = 80`,
  inflation `(4 − 2 − 1 + 1)·20 + (0 − 0 − 1 + 0)·30 = 10`, net4 70.
- Mantle row: `deltaDps 80`, `singleBreaks [(659,4) 20]`. Its path to 2 is
  mantle and chest (lowest id among the tied 80s): its only break is its
  own (659,4), filtered. Its path to 4 is all four and breaks (659,2) 30.
  Each other piece owns `80 + 20 = 100`. `R_2 = 40 + 100 = 140`,
  `R_4 = 140 + 70 + 200 − 30 = 380`, and `80 + 380 = 460 = pkgΔ4`: the
  4pc is charged once (inside the row's delta) and the 2pc once (on the
  path).

**512-P — a set whose only bonus needs 3 pieces.** Kind: the three-piece
crafted sets in cloth, leather and mail, which a `2 | 4` count type could
not hold. Example: Primal Intent 619 worn 3/3, model 3pc 25; the pool holds
a Thunderheart chest and the neutral chest 8283. The baseline is `3025`.

- Ladder, slots chest, wrist, waist: `3000`, `3000`, `3025`: (619,2) 0 not
  counted, (619,3) 25 counted.
- Thunderheart chest: `100 − 25 = 75`, `singleBreaks [(619,3) 25]`. The
  neutral chest: `120 − 25 = 95`, inside its own sim.

**512-N — a swap that removes a piece but no bonus.** Kind: a worn count
past the highest bonus, a count between two bonuses, or a set with no bonus
at all. Three runs.

- (a) Past the highest bonus, w = 5 → 4: 476-B's worn Malorne 5 and pool.
  Ladder (476-B): (640,2) 40, (640,3) 0, (640,4) 70, (640,5) 0; counts 3
  and 5 are not counted and have no `brokenSetValues` entry. The
  Thunderheart head row takes Malorne 5→4: no single break, and every break
  it lists is at 2 or 4.
- (b) Between bonuses, w = 3 → 2: Wastewalker worn 3 of 4 (shoulder,
  chest, hands), model 2pc 30 and 4pc 20; the pool holds the Malorne chest
  (own value 100) and the neutral chest. Ladder: `3000`, `3030`, `3030`:
  (659,2) 30 counted, (659,3) 0 not counted. The Malorne chest takes the
  set 3→2 and keeps its 2pc: `deltaDps 100`, and the row lists no
  Wastewalker break.
- (c) No bonus at all: Primal Intent worn 3/3 with no model bonus; the pool
  holds a Thunderheart chest. Ladder `3000`, `3000`, `3000`: (619,2) and
  (619,3) read 0 and are not counted, `brokenSetValues` is empty, and the
  chest row lists no Primal Intent break.

**512-H — a worn set piece with its own id-keyed effect.** Kind: a set
piece that the sim also gives an effect by its item id, such as the hunter
and warrior PvP gloves (`RegisterPvPGloveMod`). Example: Gladiator's
Pursuit 586 worn as chest 28334 and gloves 28335, model 2pc 40 and a model
id effect of 15 on the gloves; the pool holds a Thunderheart chest and the
neutral chest. The baseline is `3000 + 40 + 15 = 3055`.

- Ladder, slots chest, hands: R(1) sends the gloves set-less, `3000`; R(2)
  sends them set-kept, `3040`. Both rungs lack the 15, so (586,2) = 40. A
  rung with the real gloves would read `3055 − 3000 = 55`.
- Thunderheart chest: takes the set 2→1 with the real gloves still on:
  `100 − 40 = 60`, `singleBreaks [(586,2) 40]`.

**512-C — a set with bonuses above 4 pieces.** Kind: a set with bonuses at
6 or 8 pieces, which a count type or ladder that stops at 4 would drop.
Example: Cryptstalker 530 worn 8/8, model 2pc 10, 4pc 20, 6pc 30, 8pc 40;
the pool holds Thunderheart shoulder, chest, hands and legs. (The
Thunderheart head is left out: the engine drops it because its meta socket
cannot be activated over this gemless gear.) The baseline is
`3000 + 100 = 3100`.

- Ladder, eight slots: R(1) to R(8) are `3000`, `3010`, `3010`, `3030`,
  `3030`, `3060`, `3060`, `3100`, so counts 2 to 8 read 10, 0, 20, 0, 30,
  0, 40; the non-zero counts are counted.
- Each single takes the set 8→7 and is charged the 8pc only:
  `100 − 40 = 60`, `singleBreaks [(530,8) 40]`.
- `P_2` is hands and chest (lowest ids), 8→6: breaks (530,8).
  `pkgΔ2 = 200 + 50 − 40 = 210`, `raw2 = 90`, inflation
  `(2 − 0 − 1 + 0)·40 = 40`, net2 50.
- `P_4` is all four, 8→4: counts 8, 7, 6 and 5 are lost; breaks (530,8)
  and (530,6), nothing for 7 and 5. `pkgΔ4 = 400 + 130 − 70 = 460`,
  `raw4 = 460 − 240 − 90 = 130`, inflation
  `(4 − 2 − 1 + 1)·40 + (0 − 0 − 1 + 0)·30 = 50`, net4 80.

## Ticket 511: set rows valued by simmed gear

These are the K5 cases of plan `511-512-set-credit` (stage folder
`.scratch/stage-gate/511-512-set-credit/`, gitignored). Under the flag a
ranking is a step ranking: every set row carries `setContext.stepRanking`.

K5S later made "close-calls" the default partner rule. The sim counts, rule
names and the one failure scenario that change moved are restated in "The
close-calls partner rule" at the end of this file; the text below is K5's.

- **Counts.** The gain side tries every count from `max(2, w + 1)` up to
  the count `selectPackage` can fill, with no list. At `w + 1` the entry is
  `unmeasurable-at-this-worn-count` as before.
- **Gate first.** Each count's same-gear gate runs before its package sim.
  A count whose gate does not clear `max(5.09, 2 · 0.6)` is `belowGate`:
  `packageDeltaDps 0`, no `bonusDps`, and no package, pair or step sim. In
  the model a count with no bonus reads exactly 0. A gate costs 2 sims.
- **Futures.** Every entry above the row's count after the swap is a
  future. A below-gate future is never a stop and never zeroes the row.
- **Crossing.** For each set worn at `w ≥ 1` with a candidate in a slot it
  does not fill, one gate (2 sims) on that set's best such candidate's own
  swap measures the bonus at `w + 1`. A row crosses only when it cleared.
- **Partner choice.** For each eligible future, rule Z picks the partner
  pieces: the set of `t − (w + 1)` pool pieces with the highest
  `d_r + Σ d_p + Σ_b v_b · (m_b − L_b)`, ties to the lowest sorted ids.
  The pool is the set's simmed candidates outside the row's slot and the
  set's worn slots, best per slot.
- **Step gear.** The current gear plus the row plus the partners, folded
  in slot order. `stepGearDps` is its sim minus the baseline. A step gear
  identical to a request already simmed (a package, another row's step
  gear) comes from the store, so `setStepSims` counts it as `fromStore`.
- **Credit.** `c = stepGearDps − d_r` per eligible future; the stop is a
  future whose `c` beats the best so far (which starts at 0); the credit is
  that `c`. So `deltaDps + credit` is the stop gear's sim.
- **Breaks and pieces.** An eligible future's `pieces` are its partners in
  slot order, with no own-stat figure. Its `breaks` are every counted worn
  bonus its step gear loses against the current gear, the row's own break
  included.

In several gears below the engine drops the Thunderheart Cover, as in
512-C, because its meta socket cannot be activated over the gemless gear;
the sim counts below assume the rows the ranking actually has.

### Existing cases under the step rule

The flag-on literals that K5 moves, with the arithmetic that moves them.

- **Cases 2/3 (worn 1).** The pool reaches 5, so the futures are 3, 4 and 5;
  3 and 5 have no model bonus and are below the gate. The 4pc future still
  needs 3.
- **Case 8.** Thunderheart shoulder and chest `+100`, hands and legs
  `100 − 40 = 60`; the pool reaches 4, so counts 2, 3 and 4: 6 gate sims.
  Step gears: the chest and shoulder rows' 2pc gear is the 2pc package
  (chest + shoulder); the hands row's 2pc ests tie at 160 (shoulder 160,
  chest 160, legs `60 + 60 + 40` back for the shared Malorne loss), so it
  takes the chest, a new gear; the legs row likewise takes the hands, a new
  gear; every 4pc gear is the 4-piece package. So `2 + 6 + 2 = 10`.
- **476-A.** Counts 2, 3 and 4: 6 gate sims; 3 is below the gate. Each row's
  2pc ests tie (`30 + 30 + 70`), so each takes the lowest id: hands + head
  is the 2pc package; chest + hands and shoulder + hands are new. The 4pc
  gear is the package. So `4 + 6 + 2 = 12`. The 2pc total is `3290 − 3110 =
180` and the 4pc's `420`, so the credit stays `420 − 30 = 390`.
- **477-T.** Counts 2 to 5: 8 gate sims. The 2pc package is wrist + waist,
  the 4pc package wrist, waist, feet and hands. New step gears: feet +
  wrist, hands + wrist, legs + wrist, and legs + wrist + waist + feet (the
  legs row's 4pc keeps both other Malorne pieces). So `3 + 8 + 4 = 15`. The
  credits are unchanged: the wrist row's stop gear is the 4-piece package
  (`680 − 150 = 530`); the legs row's is legs, wrist, waist and feet with
  two Malorne pieces kept, `3000 + 550 + 130 + 40 = 3720`, over 3040: 680,
  less its 100 (580).
- **A4.** The head row's futures are 4 (needs 2) and 5 (needs 3, below the
  gate). Its 4pc partner is the chest (ests tie, lower id): `280 − 100 =
180`, unchanged.
- **490-A.** The Malorne 4pc is 0, so counts 3, 4 and 5 are below the gate
  and the top measured package is the 2pc (head + chest), which breaks
  nothing: `commitBreaks` is empty. Gates for 2 to 5: 8 sims; the 4pc
  package sim no longer runs (−1). Step gears: chest and head rows take
  each other (the 2pc package); the shoulder, hands and legs rows take the
  chest, three new gears. So `2 + 8 + 3 − 1 = 12`. Credits stay 140: the
  chest row's stop is the 2pc package `240 − 100`; the hands row's gear
  hands + chest is `3340 − 3250 = 90`, less `−50`.
- **490-A, the hands and legs rows.** Their 2pc step gear loses the
  Thunderheart 2pc (the row's own break), so that future names it.
- **490-B.** Counts 3 and 5 are below the gate; the chest row's 4pc gear
  (chest, head, shoulder, hands) loses the Thunderheart 2pc: `3570 − 3250 =
320`, `c = 220`, as before.
- **490-C.** The model gives Nordrassil no bonus: counts 2 to 5 are all
  below the gate, there is no measured package, so
  `commitPackageDeltaDps` is absent; the credit stays 0.
- **492-J.** Thunderheart worn 1 reaches 5: count 2 is one piece, counts
  3, 4 and 5 are gated (6 sims), and the crossing gate at 2 is 2 sims. Every
  4pc partner set of the head, chest and legs rows ties at 410 and the
  lowest ids give the 4-piece package (head, chest, legs); the shoulder
  row's lowest-id set is head + chest, one new gear. So
  `3 + 2 + 6 + 1 = 12`. The stop gear is `3530 − 3140 = 390`, less 150:
  240, unchanged.
- **492-N.** A step ranking reads no `bonusDpsNet`. The 4pc gate cleared,
  and every row's only partner set is the other two pieces, the 4-piece
  package: `3530 − 3140 = 390`. The head and chest rows break the Malorne
  2pc alone: `100 + 50 − 40 = 110`, credit 280; the legs row `150`, credit 240. The sub-line is the hover hint, not "not counted".
- **476-D.** Counts 2, 3 and 4 are gated (6 sims). Every partner set of
  every Thunderheart row needs the unmeasured (640, 4): a row and one
  partner lose it twice alone and once together (`m = 2`, `L = 1`). So each
  eligible future is `partnerUnmeasured`, no step gear is simmed, and the
  credit pins stay. `4 + 6 = 10`.
- **502-C (worn break half).** The hands row's 2pc partner is the head, its
  4pc partners head, shoulder and chest in slot order, with no own-stat
  figure; count 3 is below the gate.
- **502-G.** The chest row's 4pc partners are head, shoulder and hands; the
  stop gear is `400 + 70 + 100 = 3570`, over `3204`: 366, so the credit is
  still 266.
- **512-W.** The Mantle row's 2pc partner is the chest (ests tie at 180),
  whose gear takes Wastewalker 4→2: `3270 − 3050 = 220`, naming (659,4).
  The 4pc gear takes it to 0: `460`, naming (659,4) and (659,2). The stop is
  the 4pc: `80 + 380 = 460`, the model's four Malorne pieces
  `400 + 40 + 70` over 3050.

### New cases

**511-M — a bonus that measures 0 on identical gear although its pieces
combine.** Kind: a set whose bonuses do nothing for this spec's rotation (a
ret set's Judgement and healing bonuses), while its pieces' stats are worth
more together. Example: Justicar 626 Breastplate 29071, Shoulderplates
29075, Gauntlets 29072 and Greaves 29074 (the Breastplate replaces the
plan's Crown 29073, whose meta socket the engine cannot fill), own value
−30 each, model bonuses 0, `+17` when all four are worn.

- Without the flag the table measures the 4pc package: `−120 + 17 = −103`
  against singles `−120`: `bonusDps 17`.
- With it, counts 2, 3 and 4 each read exactly 0 (the term is in both sims
  of the 4pc gate, and in neither at 2 or 3): all below the gate. Runs:
  base, four singles, three gates, `1 + 4 + 6 = 11`. No request wears two
  real Justicar pieces without a copy, no step gear, credit 0 on every row.

**511-R — a row inside the 4-piece group, with an interaction.** Kind: a
tier set whose pieces' stats interact, with a count that has no bonus
between two that do. Example: Thunderheart shoulder, chest, hands and legs,
model 2pc 50 and 4pc 80, `−40` when all four are worn.

- Gates: 2pc package hands + chest, `3250 − 3200 = 50`; 4pc package all
  four, on `400 + 130 − 40 = 3490`, off (shoulder set-less) `400 + 50 − 40 =
3410`: 80; count 3 reads 0, below the gate.
- Hands row (`d 100`): 2pc partner the chest (ests tie, lowest id): the 2pc
  package, 250, `c 150`; 4pc partners shoulder, chest and legs: 490,
  `c 390`. Credit 390; ON `490 = pkgΔ4`, the stop gear's sim (W-S1). The
  below-gate count 3 does not zero it (G10-4).
- Step gears: hands + chest (the 2pc package), shoulder + hands, legs +
  hands, and all four (the 4pc package): `gears 4, simmed 2, fromStore 2`.
  Every row stops at 490.

**511-S2 — a row that stops at the 2pc.** Kind: a 4pc worth less than what
its extra pieces cost. Example: 511-R with model 4pc 10 and own value −40
for the shoulder and legs. The 4pc gate reads `3140 − 3130 = 10`, above the
gate. Hands row: 2pc partner the chest, `250`, `c 150`; 4pc gear
`120 + 60 − 40 = 140`, `c 40`. The stop is the 2pc and ON is
`model(G + hands + chest) − model(G) = 250`.

**511-P4 — a row in the 4-piece group only.** Kind: a set piece outside
the best 2-piece package whose own swap breaks a worn bonus. Example: worn
Malorne hands and legs (2pc 40); Thunderheart shoulder, chest, hands and
legs. The 2pc package is chest + shoulder. Hands row: `100 − 40 = 60`,
`singleBreaks [(640,2) 40]`; 2pc partner the chest (ests tie at 160), gear
`3250 − 3040 = 210`, `c 150`; 4pc gear four Thunderheart and no Malorne,
`3530 − 3040 = 490`, `c 430`. ON 490.

**511-O — a row outside the groups.** Kind: a set piece weaker than every
package piece. Example: 511-R plus the Thunderheart Wristguards at own
value v. Wrist row: 2pc partner the hands (lowest id), `c 150`; 4pc
partners hands, chest and legs (the lowest ids of four tied sets), gear
`v + 300 + 50 + 80` (the interaction needs the shoulder), `c 430`. ON
`v + 430`: 440 at `v = 10` and 465 at `v = 35`, a difference of 25 (W-S4).

**511-U — a failed sim.** Kind: a sim that fails mid-run. Example: 511-R's
pool, no interaction.

- The (676, 4) gate's "off" sim is the only request with a set-less
  Pauldrons (the 2pc and 3pc packages copy the chest). It fails, so (676, 4)
  is `sim-failed` with no `sameGearDps`, and every row's 4pc future makes
  it unmeasured: credit 0, "not counted".
- The Pauldrons row's 2pc step gear, shoulder + hands, is the only request
  with exactly those two Thunderheart pieces. It fails: that row is
  unmeasured, and the others stop at `530 − 100 = 430` (W-S7).

**511-K — a count with no bonus.** Kind: a count between two bonuses (every
tier set at 3). Example: worn Malorne hands and legs; Thunderheart shoulder,
chest, hands, legs and wrist, model b2 and b4 only. Singles: shoulder,
chest and wrist 100, hands and legs 60. Packages: 2 chest + shoulder; 3
plus the wrist; 4 plus the hands; 5 all.

- (676, 3) reads exactly 0 and is below the gate. Its gate copies the
  shoulder, so two requests wear the 3-piece gear with a shoulder copy
  (set-kept and set-less), and none with the real shoulder (W-G1).
- The top measured package is the 4pc, `400 + 130` with one Malorne left,
  `3530 − 3040 = 490`; every row's `commitPackageDeltaDps` is 490 and its
  `packages` are 2 and 4. Neither below-gate entry (3, 5) is used (W-K1).

**511-T — a 3-piece bonus becomes a step.** Kind: the three-piece crafted
sets. Example: Primal Intent 619 chest, wrist and waist, own value 100, model
3pc 25 only. Count 2 is below the gate; count 3 reads 25 and is eligible.
Chest row: partners wrist and waist, the 3-piece package, `300 + 25 = 325`,
credit 225, stop at 3.

**511-X — one added piece reaches a bonus.** Kind: a set worn one short of
a bonus with a candidate in a free slot.

- Crystalforge 629 worn at 1 (chest), pool hands and legs, own value 100,
  model 2pc 30: the crossing gate at 2 on the hands (tied, lower id) reads
  `30` and clears; the hands row crosses, and its label count is 2.
- The same with model 2pc 0: the gate reads 0, the row does not cross, no
  label.
- Primal Intent worn at 2 (chest, wrist), pool waist, model 3pc 25: the
  gate at 3 reads 25; the waist row crosses, label count 3 (W-X1).

**511-E — bonuses above 4 pieces.** Kind: a set with bonuses at 6 or 8.
Example: Cryptstalker 530, all eight pieces, own value 100, model 2pc 10,
4pc 20, 6pc 30, 8pc 40, nothing worn. Entries 2 to 8: 3, 5 and 7 read 0 and
are below the gate; 2, 4, 6, 8 read 10, 20, 30, 40. Hands row: `c_t =
(t − 1) · 100 + Σ bonuses to t`: 110, 330, 560, 800. The stop is 8, credit
800 (W-E1).

**511-PS — two partners that share a worn-bonus loss pair best with each
other.** Kind: two set pieces that each break the same worn bonus alone.
Example: worn Malorne shoulder and chest, model 2pc 90; Thunderheart
Pauldrons own 8, Chestguard 12, Gauntlets 6, Leggings −12, so the singles
are `8 − 90 = −82`, `12 − 90 = −78`, `+6` and `−12` (feral P2 BiS).

- Pauldrons row, 2pc: Z's estimates are chest `−82 − 78 + 90 = −70`, hands
  `−82 + 6 = −76`, legs `−94`: the chest. Gear `8 + 12 + 50 = 3070` over
  3090: `stepGearDps −20`.
- Under "single-swap" the 2pc package is hands + legs (the two best
  singles), and the Pauldrons row adds the better, the hands: gear
  `8 + 6 + 50` with the Malorne chest kept, `3064 − 3090 = −26`.

**511-PB — a partner set that loses a worn bonus no single swap loses.**
Kind: a worn set one piece above its bonus; any one swap keeps the bonus,
two lose it. Example: Wastewalker worn shoulder, chest and hands, model 2pc
30 (`G = 3030`); Thunderheart Leggings row (100); 4pc partners from the
Pauldrons and Chestguard (110, each replaces Wastewalker) and the
Wristguards and Waistguard (100).

- Z: two replacers together lose the 2pc (`m 0`, `L 1`): `320 − 30 = 290`
  against `310` with one; ties go to chest, wrist, waist. Gear
  `100 + 310 + 130` with Wastewalker at 2, `3570 − 3030 = 540`, no break.
- Z0 drops that term: 320 wins, shoulder, chest and wrist. Gear
  `100 + 320 + 130`, Wastewalker at 1, `3550 − 3030 = 520`, naming
  (659,2) 30.

**511-PR — the rule is swapped in one place, with a cache key per rule.**
On PS_SCENARIO with one shared store:

- Unset: `setStepSims.partnerRule` is "sum-of-singles" and the hashed
  object has no `partnerRule` key. A second unset run is served from the
  cache: 0 sims, the same hash.
- "single-swap": the hash holds `"partnerRule":"single-swap"`, the ranking
  is a new one, and the Pauldrons row's 2pc pieces are pathToThreshold's,
  the hands.
- "every-combination": 8 audit entries (four rows, counts 2 and 4), each
  with every partner set (3 for the 2pc, 1 for the 4pc) and a total. The
  Pauldrons row's 2pc totals are chest −20, hands −26 and legs
  `8 − 12 + 50 = 3046 − 3090 = −44`; Z's estimates −70, −76, −94; the choice
  is the chest. Each of the three gears is simmed exactly once.

**511-PN — partner sets that do not nest.** Kind: the best 2pc partner is
not in the best 4pc partner set. Example: worn Primal Intent 3/3, model
2pc 50 and 3pc 30 (`G = 3080`); Thunderheart Leggings row (100); Gauntlets
110 (replace nothing); Chestguard, Wristguards, Waistguard 120 (each replaces
a Primal Intent piece, losing the 3pc alone: single 90).

- 2pc: the hands (est 210) beat a replacer (190). Gear `100 + 110 + 50`
  with Primal Intent kept: `3340 − 3080 = 260`.
- 4pc: chest, wrist, waist: `100 + 270 + 2 · 30 − 50 = 380` against
  `100 + 290 + 30 − 50 = 370` for any set with the hands. Gear
  `100 + 360 + 130`, Primal Intent at 0: `3590 − 3080 = 510`.
- Credit `510 − 100 = 410`, stop 4; each stop term names its own set.

**511-CB — the top package breaks a worn bonus the stop gear keeps.** A
step context with `singleDeltaDps 30`, one eligible 2pc future at
`stepGearDps 170`, and a `commitBreaks` entry with no value: credit
`170 − 30 = 140` with or without it; not unmeasured; the hover hint; a step
context with only that commit break shows no sub-line; the only term is the
stop, naming no break (W-CB1).

**511-A3R — two set rings key to one slot (known limit d).** Zanzil's
Concentration 462 rings 19893 and 19905, own value 100, model 2pc 40.
`selectPackage` keys both to finger1, so the set reaches 1 piece: one
`insufficient-pieces` entry at 2, no step gear.

## The set screen in record mode

These are the K5R cases of the same plan. With the flag and
`Deps.setScreen` "record", the engine runs the screen after the worn-set
ladder and before the package loop, records `Ranking.setScreen`, and
filters nothing.

- **Per set.** For each gain-side set S worn at `w` whose reach `R` (the
  highest count `selectPackage` can fill) has `R − w ≥ 2`: on the gear of
  S's package at `R`, rung `k` (`k = 0 … R − w`) sends the first `k` added
  pieces, in slot order, as set-kept copies and the rest as set-less
  copies, so Go counts `w + k`. The pair is rungs 0 and `R − w`.
- **Sims.** The pair at N = 10, 100, 300 and 1000; every rung at N = 100,
  300 and 1000; seed `seeds[0]`; every screen sim asks for per-iteration
  values. The ladder's rungs 0 and `R − w` at its three N come from the
  store, so a set costs `8 + 3 · (R − w − 1)` sims, with 6 from the store.
- **Readings.** A pair's `dps` is rung `R − w` minus rung 0. A rung's `dps`
  is its own reading, with `se = stdev/√N`. `pairedSe` and
  `pairedSeToPrev` are `sd(a_i − b_i)/√N` over the per-iteration values.
  The model returns N copies of its DPS, so every paired error is 0.
- **Store keys.** A sim that asks for per-iteration values has its own key,
  the old key plus `:all`; every other key is unchanged.

**511-SR — record mode filters nothing.** Worn Thunderheart Gauntlets
(Thunderheart at 1) and Malorne shoulder and chest (Malorne 2pc, so the
worn-set ladder runs); pool Thunderheart Pauldrons, Chestguard and
Leggings (the Leggings give Thunderheart a crossing gate). Thunderheart
reaches 4: `w = 1`, `R = 4`, added pieces Pauldrons, Chestguard and
Leggings in slot order. Every rung wears four Thunderheart stat sets and
no Malorne piece: `3000 + 400`, plus 50 from count 2 and 80 more from
count 4.

- Rungs at counts 1, 2, 3, 4: 3400, 3450, 3450, 3530 at each of N = 100,
  300 and 1000; `se = 30/√N`; `pairedSeToPrev` 0 above count 1.
- The pair: `3530 − 3400 = 130` at each N, `pairedSe` 0.
- Sims: `8 + 3 · (4 − 1 − 1) = 14` simmed, 6 from the store; exactly the
  14 screen sims ask for per-iteration values, all at seed 11.
- With the screen's sims taken out, the run's requests and options are the
  run without the screen, in order. `setBonuses`, `brokenSetValues`,
  `wornSetLadder`, `crossingGates`, `setStepSims`, every row's `deltaDps`
  and `setContext`, and every ON figure are equal. The content hash gains
  `"setScreen":"record"` (W-H1).

**511-SZ — no bonus in reach.** 511-M's Justicar 626 (own value −30 each,
model bonuses 0, +17 when all four are worn), nothing worn: `w = 0`,
`R = 4`. Every rung wears the four stat sets (copies count as their
originals in the interaction): `3000 − 120 + 17 = 2897`. Every pair reads
exactly 0 at every N (W-SR2). Sims `8 + 3 · 3 = 17`.

**511-SF — a failed screen sim.** 511-SR's gear; the fake sim fails the
rung at count 2 (Pauldrons set-kept, Chestguard and Leggings set-less) at
N = 300. That rung has no `dps` or `se`; its `pairedSeToPrev` and the
count-3 rung's at N = 300 are absent, since each needs its values. Every
other rung and every pair keep their readings (W-SR3). The failed sim was
sent, so `simmed` is still 14. The rest of the ranking equals the run
without the screen.

## The close-calls partner rule

These are the K5S cases of the same plan. The default partner rule is now
"close-calls": compute Z's estimate for every partner set; when two or more
sets are within `M′ = 31.866872635956497` of the best estimate, sim each
of them (through the step-gear sim, so the store answers a gear already
simmed) and take the highest total, ties to Z's order (higher estimate,
then lowest sorted ids). A single set within the margin is taken without a
sim. A set whose sim fails is skipped; when every one fails, Z's choice
stands. An undefined estimate gives Z's `break-unmeasured`.

So a chosen gear's own step sim is always a store hit when its choice
simmed, and `setStepSims` counts every choice sim. The model is exact, so a
choice moves only where an interaction term makes Z's estimate wrong.

**511-PC — close calls are simmed, and the better sim wins.** Nothing worn
(`G = 3000`); Thunderheart Chestguard 110, Gauntlets 100, Leggings 100;
`+20` when the Gauntlets and Leggings are worn together. The pool reaches
3; count 3 has no model bonus and is below the gate, so each row's only
eligible future is the 2pc. The 2pc package is chest + hands (the best
single, then the hands, which win their tie with the legs as in 511-R).

- Gauntlets row (`d 100`): estimates chest `210`, legs `200`, 10 apart:
  both are simmed. Chest gear `100 + 110 + 50 = 3260`, legs gear
  `100 + 100 + 50 + 20 = 3270`: the legs, `stepGearDps 270`, credit
  `270 − 100 = 170`. The Leggings row mirrors it (hands, 270).
- Chestguard row: estimates hands and legs tie at 210, and both sims read
  260: Z's order, the hands (31034 < 31044).
- `setStepSims`: the six choice calls touch chest + hands (the package,
  from the store), chest + legs and hands + legs (new): 2 simmed, 4 from
  the store; the two chosen gears (chest + hands, hands + legs) come from
  the store: `gears 2, simmed 2, fromStore 6`.
- With `partnerRule "sum-of-singles"` the Gauntlets row takes the chest,
  `260`; chosen gears chest + hands (store) and chest + legs (new):
  `gears 2, simmed 1, fromStore 1`.
- The margin's edge: the Leggings at 79 with `+40` (estimate `179`, 31
  below `210`) are simmed, `100 + 79 + 50 + 40 = 269 > 260`: the legs. At
  78 (32 below) they are not: the chest, 260.
- Failures: when only the hands + legs gear fails, the Gauntlets row takes
  the chest, 260. When chest + hands fails as well (the package sim too),
  every candidate failed: the row keeps Z's choice, the chest, whose step
  sim fails again, so it has no `stepGearDps` and is unmeasured.

### Existing cases under close-calls

Cases that pass `partnerRule` explicitly do not move. These default-rule
literals do; every choice below is unchanged, because each tie on estimate
is also a tie on sim, and Z's order breaks it the same way.

- **Case 8.** The hands row's three 2pc sets tie at 160 and the legs row's
  likewise, all within the margin; each sim reads `3250 − 3040 = 210`. New
  gears: hands + shoulder, hands + chest, hands + legs, legs + shoulder,
  legs + chest (legs + hands is hands + legs). The shoulder and chest rows
  have one set within 31.87 (chest or shoulder at 200 against 160). So
  `2 + 6 + 5 = 13`.
- **476-A.** Every row's three 2pc sets tie at 130 and sim `3290 − 3110 =
180`, so all six pairs of the four pieces are simmed; one is the 2pc
  package (head + hands). So `4 + 6 + 5 = 15`.
- **477-T.** 2pc: the wrist, waist and feet rows each have two sets at 300
  within the margin (the two other 150 pieces; hands and legs at 250 are
  out); the hands and legs rows each have wrist, waist and feet at 250
  (legs or hands at 160 is out). Every sim ties. New 2pc gears: wrist +
  feet, waist + feet, and hands or legs with each of wrist, waist and feet:
  8, against K5's 3 (feet + wrist, hands + wrist, legs + wrist). 4pc: the
  wrist, waist and feet rows have two sets at 550 within the margin, the
  4-piece package and legs + wrist + waist + feet, both simmed already.
  So `3 + 8 + 9 = 20`.
- **490-A.** The chest, head and shoulder rows each have two sets at 200
  within the margin (the two other head/shoulder/chest pieces; hands and
  legs at 50 are out); the hands and legs rows have head, shoulder and chest
  at 50 (legs or hands at −50 is out). Every sim ties (240 and 90). New
  gears: chest + shoulder, head + shoulder, and hands or legs with each of
  chest, head and shoulder: 8. So `2 + 8 + 8 − 1 = 17`.
- **492-J.** Every 4pc set of every row ties at 410 and sims 390, so all
  four 3-piece subsets of head, shoulder, chest and legs are simmed; one
  is the 4-piece package. So `3 + 2 + 6 + 3 = 14`.
- **511-M.** No step gear: only the rule name moves, "close-calls".
- **511-R.** Every row's three 2pc sets tie at 200 and sim 250: 12 choice
  calls over the six pairs, one of them the 2pc package: 5 simmed, 7 from
  the store. The four distinct chosen gears then come from the store:
  `gears 4, simmed 5, fromStore 11`.
- **511-U (W-S7).** The Pauldrons row's three 2pc sets are close calls, so
  failing only Pauldrons + Gauntlets would just skip that set. The fake sim
  now fails every request that wears the real Pauldrons and exactly one
  other real Thunderheart piece. Every candidate fails, the row keeps Z's
  choice (the hands), whose step sim fails again: unmeasured, credit 0.
  The other rows' failed candidates are skipped, and they stop at the 4pc,
  `530 − 100 = 430`, as before.
- **511-PR.** Unset, `setStepSims.partnerRule` is "close-calls"; the hashed
  object still has no `partnerRule` key.

## The set screen's on mode

These are the K5ON cases of the same plan. With the flag and
`Deps.setScreen` "on" (the tab's default), the engine screens each
gain-side set with `R − w ≥ 2`, after the worn-set ladder and before the
package loop, and keeps the gain side only for the sets the rule keeps.

- **Sims.** Rungs 0 and `R − w` (the record mode's pair) at N = 300 only,
  seed `seeds[0]`, with per-iteration values: 2 sims per screened set, no
  ladder rung, no other N.
- **Measure (M2).** `max` over `t = max(2, w + 1) … R` of the package
  estimate at `t`, plus the pair. The estimate is rule Z's
  (`sumOfSinglesEstimate`): the sum of the package pieces' single-swap
  figures, plus `v_b · (m_b − L_b)` for each counted worn bonus `b`, with
  the package's first added piece as the row.
- **σ** = `√2 · stdev / √300` with the baseline's stdev. The model's stdev
  is 30, so σ = 2.449490, the band `√2 · σ` = 3.464102 and `2σ` =
  4.898979.
- **Rule** (`applyScreenRule`, a port of `apply_rule` in
  `.scratch/stage-gate/511-512-set-credit/k5e/score_screen.py`), in set id
  order: a pair of exactly 0 is dropped ("exact-zero"), before the
  absence check; an absent measure or σ keeps the set outside the ranking
  ("readings-absent"); `measure + 2σ < 0` is dropped ("below-zero"); the
  rest are ranked by (−measure, set id), the first two kept ("top-k"),
  others kept when `measure ≥ measure_2 − √2 · σ` ("band"), else dropped
  ("outside-band").
- **A dropped set** gets one entry, `threshold max(2, w + 1)`,
  `packageItemIds []`, `packageDeltaDps 0`, `unmeasured "screened-out"`,
  and no gate, package or step sim. Its rows keep `setContext`
  (`singleBreaks`, `crossesThreshold`, `piecesAfterSwap`) and get no
  future, so `rankableSetPotential` is 0 and `setCreditUnmeasured` false.

**511-SU — the rule alone.** σ = 2, so the band is `2√2` and rule 2's
margin is 4. Each map is what `apply_rule` gives for the same readings:
`python .scratch/stage-gate/511-512-set-credit/k5on/rule_cases.py`
(σ = 2.0 exactly in bound mode with n = 2 and stdev 2; the no-σ case uses
`apply_rule`'s own-error mode with no paired error).

- Ties: 101 at 40, 102 and 103 at 25. Ranked 101, 102 (lower id), 103:
  top-k, top-k, and 103 is tied with the second, so band.
- Edge: 201 at 20, 202 at 10, 203 at `10 − 2√2`, 204 at `10 − 2√2 − 1e-9`:
  top-k, top-k, band (inclusive), outside-band.
- Rules: 301 pair 0 and no measure, exact-zero; 302 pair 5 and no measure,
  readings-absent; 303 at −5, `−5 + 4 < 0`, below-zero; 304 at −3.5,
  `−3.5 + 4 ≥ 0` and the only ranked set, top-k; 305 pair 0 at 50,
  exact-zero (rule 1 first).
- No σ (undefined, or NaN): 401 pair 0, exact-zero; 402 and 403 (even at
  −50), readings-absent.
- One ranked set (501 at 1), fewer than K: top-k.

**511-SN — a set with no bonus in reach.** 511-SR's gear and pool
(Thunderheart Gauntlets worn, Malorne shoulder and chest worn; pool
Thunderheart Pauldrons, Chestguard, Leggings) plus Justicar 626's
Breastplate, Shoulderplates, Gauntlets and Greaves at own value −30 each,
model bonuses 0.

- Justicar (`w 0`, `R 4`). Singles: chest and shoulder `−30 − 40 = −70`
  (each breaks the worn Malorne 2pc, counted at 40), hands
  `−30 − 100 = −130` (replaces the Thunderheart Gauntlets; Thunderheart
  at 1 has no bonus), legs −30. Packages by best single, lowest id on a
  tie: 2 = chest + legs, 3 adds the shoulder, 4 adds the hands. Estimates:
  `−100` (the chest alone and the pair together each lose Malorne 2pc:
  `m − L = 0`), `−170 + 40 = −130` (two pieces lose it alone, `m − L = 1`),
  `−130 − 130 = −260`. Best −100. Every rung wears the same four stat sets
  and bonuses of 0, so the pair is exactly 0, `pairedSe` 0: measure −100,
  exact-zero.
- Thunderheart (`w 1`, `R 4`). Singles: Pauldrons and Chestguard
  `100 + 50 − 40 = 110`, Leggings `100 + 50 = 150`. Estimates: 150; 260
  (Chestguard, the lower id, `m − L = 0`); `110 + 110 + 150 + 40 = 410`.
  Pair 130 (511-SR). Measure 540, top-k (the only ranked set).
- Sims: 4 screen sims, all simmed. After the singles, only those two
  Justicar sims wear a Justicar copy; the off run also sends Justicar's
  gate sims.
- Justicar's marker: threshold `max(2, 0 + 1) = 2`. Its rows' `deltaDps`,
  `singleBreaks` (Malorne 2pc on the chest and shoulder rows),
  `crossesThreshold` and `piecesAfterSwap` equal the off run's; no future,
  `nextThreshold` null.
- Thunderheart's entries, rows and ON figures equal the off run's.

**511-SB — a close third set in the band.** Nothing worn; two pool
pieces per set, so `R = 2` and the pair is the 2pc; M2 = `d_a + d_b + b2`.
Thunderheart Pauldrons and Chestguard 50 each, 2pc 50: 150. Malorne
Mantle and Greaves 40 each, 2pc 20: 100. Justicar Shoulderplates 40 and
Gauntlets 37, 2pc 20: 97. Crystalforge Breastplate 40 and Gauntlets 36,
2pc 20: 96. The second measure is 100; the band's edge is
`100 − 3.464102 = 96.535898`, so Justicar (97) is band and Crystalforge
(96) outside-band. Justicar's 2pc gate runs: `sameGearDps` 20.
Crystalforge has only its marker at 2. 8 screen sims.

**511-SD — a best case below current gear.** Worn Gauntlets of Malorne
(Malorne at 1).

- Malorne (`w 1`, `R 4`): Mantle, Breastplate and Greaves at −155 each;
  each single adds the second piece, `−155 + 40 = −115`. Estimates −115,
  −230, −345 (no worn bonus is lost). Pair: count 4 against 1, `40 + 70 =
110`. Measure −5; `−5 + 4.898979 = −0.101 < 0`: below-zero.
- Thunderheart (`w 0`, `R 3`): wrist −15, waist −15, feet −100. Estimates
  −30 and −130. Pair: count 3 against 0, the 2pc 50. Measure 20.
- Gladiator's Pursuit 586 (`w 0`, `R 2`): chest and hands −12.375 each,
  2pc 20 (the hands replace the Malorne Gauntlets; Malorne at 1 has no
  bonus). Measure `−24.75 + 20 = −4.75`; `−4.75 + 4.898979 ≥ 0`, so it is
  ranked. Two ranked sets, K = 2: both top-k.
- GON-2: Malorne's crossing gate (the Breastplate, lowest id among equal
  singles, count 2 against 1) reads 40 and clears, so its rows keep
  `crossesThreshold` true and `piecesAfterSwap` 2, as in the off run. Its
  marker is at `max(2, 1 + 1) = 2`. 6 screen sims.

**511-SA — failed readings are kept.** 511-SR's gear; the fake sim fails
the screen's high rung (Pauldrons, Chestguard and Leggings set-kept, N =
300). The pair has no `dps` and no `pairedSe`, so there is no measure:
readings-absent, kept. `setBonuses`, `brokenSetValues`, `wornSetLadder`,
`crossingGates`, `setStepSims`, every row and every ON figure equal the
off run's.

**511-SL — only the gain-side set list changes.** (a) 511-SN's gear: the
ladder, `brokenSetValues` and crossing gates equal the off run's. With the
on run's screen sims (per-iteration values) and the off run's Justicar
sims (each wears a Justicar copy: its gate sims, all below the gate, so no
package or step sim) taken out, the requests and options are equal, in
order. 4 screen sims. (b) 511-SR's gear: Thunderheart is kept (top-k), and
everything 511-SA compares is equal. 2 screen sims.

**511-SH — the hash.** Unset, the hashed object has no `setScreen` key, as
before K5R. "on" adds `"setScreen":"on"`; on the store of an unset run it
is not served the cached ranking, and it sends exactly its 2 screen sims
(new `:all` keys at N = 300); every other sim comes from the store.
Unset, "off", "record" and "on" give four different hashes.

## The popover's steps (K6)

The owner chose "steps that add up" for the set popover (2026-10-01).
`setPotentialSteps` turns a step ranking row's `"stop"` totals, up to the
stop, into steps. Step k adds the partner pieces that step k − 1 did not
have, names the worn bonuses its gear loses that step k − 1 (or, for the
first step, the row's own swap) did not, and is worth its total minus the
total before it. The first step's "total before" is the row's single
swap. So the steps add up to the stop's total minus the single swap,
which is the credit (C86). When a step's partner pieces do not include the
previous step's, the sets do not nest and the function returns null; the
tab then shows the totals as separate outcomes.

**511-R.** The Gauntlets row's single swap is 100. Its 2pc partner is the
Chestguard (the three pairs tie; the engine keeps the Chestguard, the
piece of the 2pc package hands + chest): 100 + 100 + 50 = 250. Its 4pc partners are the Pauldrons, Chestguard and Leggings:
490 (511-R above). Steps: the Chestguard, 250 − 100 = 150; then the
Pauldrons and Leggings, the pieces the 4pc adds, 490 − 250 = 240. 150 +
240 = 390, the credit. Nothing is worn, so nothing breaks.

**511-S2.** As 511-R with the 4pc at 10, so the stop is the 2pc. One
step: the Chestguard, 250 − 100 = 150 = the credit. The 4pc total is not
a step, because it comes after the stop.

**511-PS.** The Gauntlets row (own value 6, replaces nothing). 2pc with
the Leggings: 6 − 12 + 50 = 44, against −26 with the Pauldrons and −22 with the Chestguard (each
breaks Malorne), so the first step is 44 − 6 = 38. 4pc with
the Pauldrons, Chestguard and Leggings: 6 + 8 + 12 − 12 + 50 + 80 − 90 =
54, so the second step is 54 − 44 = 10, adds the Pauldrons and
Chestguard, and breaks Malorne 2pc (both Malorne pieces are replaced).
Credit 48 > 38, so the stop is the 4pc. This is the owner's demo row
(Leggings, then Pauldrons and Chestguard breaking Malorne Harness 2pc).

**511-PN.** The Leggings row's 2pc partner is the Gauntlets; its 4pc
partners are the Chestguard, Wristguards and Waistguard, which do not
include the Gauntlets. `setPotentialSteps` returns null.

## The popover's split break lines (K6B)

The owner chose to show a broken set's loss on its own line (2026-10-02).
A shown step that newly loses a worn bonus gets one more sim: the gear
just before the step, with the lost set's pieces in the step's new
pieces' slots sent as set-less copies (the bonus-off gear). Its value is
`bonusOffDps`, that sim minus the current gear's. The Breaks line is
`bonusOffDps` − the previous total (−Y), and the pieces line is the step's
total − `bonusOffDps` (X). X − Y is the step's total minus the previous
total, which is the step (C249), so the lines add up. The fake sim counts
a set-less copy toward no set (C252). Every value below is relative to the
scenario's baseline.

**511-LS.** `PS_SCENARIO`, baseline 3090 (Malorne shoulder and chest, own
value 0, 2pc 90). The Gauntlets row's steps are 511-PS's: the Leggings,
44 − 6 = 38; then the Pauldrons and Chestguard, 54 − 44 = 10, breaking
Malorne 2pc. The gear before the 4pc step is Gauntlets + Leggings: 6 − 12

- 50 = +44. Its bonus-off gear sends the Malorne shoulder and chest as
  set-less copies: 6 − 12 + 50 − 90 = −46. Breaks line −46 − 44 = −90;
  pieces line 54 − (−46) = 100; −90 + 100 = 10. The Leggings row (single
  −12): its 2pc step with the Gauntlets is 44 − (−12) = 56 with no line
  values; its 4pc step has the same gear before (Gauntlets + Leggings,
  folded in slot order) and the same replaced pieces, so it shares the one
  sim and reads −90 and 100. `bonusOffSe` combines one sim of stdev 30 with
  the baseline's se, as `stepGearSe` does, so the two are equal. The
  Pauldrons and Chestguard rows' own swaps already break Malorne 2pc
  (`singleBreaks`), so no step newly loses it and nothing is split.
  `setBonusOffSims`: one distinct request, simmed once; its plain gear
  before (Gauntlets + Leggings) is the 2pc step gear, already in the store.
  Exactly one call wears 1,029,100, 1,029,096, 31034 and 31044.

**511-LN.** 511-R's scenario wears nothing, so no step loses a worn
bonus: no line values, no `bonusOffDps`, and `setBonusOffSims` all zeros.
The Gauntlets row's steps (150, 240) and `setStepSims` (gears 4, simmed
5, from the store 11) are 511-R's.

**511-LR.** Worn Malorne shoulder and chest (own value 0, 2pc 90); pool
Chestguard (12) and Gauntlets (6); Thunderheart 2pc 150. Baseline 3090.
The Gauntlets row: single +6, breaks nothing. Its only reachable future
is the 2pc, with the Chestguard: 6 + 12 + 150 − 90 = +78, a step of 72
that newly breaks Malorne 2pc. The gear before is the row's single swap;
the bonus-off gear sends the Malorne chest as a set-less copy: 6 − 90 =
−84. Breaks −84 − 6 = −90; pieces 78 − (−84) = 162; −90 + 162 = 72. The
Chestguard row: single 12 − 90 = −78 with its own break; its step with
the Gauntlets is 78 − (−78) = 156, not split. `setBonusOffSims`: one
request, simmed once, and its plain request (the Gauntlets single swap)
is in the store. Request identity (C244): the bonus-off request with the
copy id 1,029,096 set back to 29096 and its copy row dropped equals the
request whose sim gave the Gauntlets single swap.

**511-L2.** Worn Malorne head, shoulder, chest and hands (own value 0,
2pc 40, 4pc 70); pool Thunderheart Cover, Pauldrons and Chestguard (20
each) and Leggings (10); Thunderheart 2pc 0 and 4pc 80, so the 2pc and
3pc read 0 and are below the gate. Baseline 3000 + 40 + 70 = 3110. The
Leggings row: single +10, no own break. Its 4pc step with the Cover,
Pauldrons and Chestguard: 10 + 60 + 80 − 110 = +40, a step of 30, newly
losing Malorne 4pc and 2pc (Malorne 4 → 1; `brokenSetBonuses` sorts by
set, then count from high to low). The bonus-off gear is the Leggings
single swap with the Malorne head, shoulder and chest as set-less copies,
the hands real: 10 − 110 = −100. Breaks −100 − 10 = −110 (40 + 70
together); pieces 40 − (−100) = 140; −110 + 140 = 30. The Cover,
Pauldrons and Chestguard rows: single 20 − 70 = −50 (Malorne 4 → 3, own
break 4pc). Each 4pc step is 40 − (−50) = 90 and newly loses the 2pc
(Malorne 3 → 1). Each bonus-off gear copies the two Malorne pieces its
step replaces: 20 − 110 = −90. Breaks −90 − (−50) = −40; pieces 40 −
(−90) = 130; −40 + 130 = 90. Four distinct requests (the Leggings row and
the three others each have their own gear before), four sims, and each
plain gear before is a single swap in the store.

**511-LF.** `PS_SCENARIO` with the fake sim failing every call that wears
1,029,100 with 31034 and 31044, which only the bonus-off request does.
The Gauntlets and Leggings rows keep 511-PS's steps (38, 10; 56, 10)
with no line values, and their 4pc futures get none of the three fields.
`setBonusOffSims`: one request, 0 simmed, 1 failed; its plain gear before
is in the store. The credits stay 511-PS's: Gauntlets 54 − 6 = 48,
Leggings 54 + 12 = 66.

**511-LV.** A hand-built row: single 6; the 2pc future totals 44 with the
Leggings; the 4pc future totals 54 with the Pauldrons, Chestguard and
Leggings and breaks Malorne 2pc (90). (a) `bonusOffDps` −46 naming
Malorne 2pc: Breaks −46 − 44 = −90, pieces 54 − (−46) = 100. (b) The same
value naming Malorne 4pc does not match the step's lost bonus: no line
values, the step stays 10. (c) Neither field: K6's output, steps 38 and 10. (d) A `bonusOffDps` on the 2pc future, which loses nothing: no line
values, the step stays 38.

**Moved sim counts.** Each scenario with a shown breaking step sends one
more sim per distinct bonus-off request; no other literal moves.

- **Case 8** (worn Malorne hands and legs, 2pc 40): +1. The Pauldrons and
  Chestguard rows' 4pc steps add the Gauntlets and Leggings, which replace
  both Malorne pieces. Both rows' gear before is Pauldrons + Chestguard and
  the replaced slots are the same, so one request: 250 before, 210 with
  the Malorne pieces set-less, Y = 40, X = 490 − 210 = 280, step 240.
- **476-A** (worn Malorne 4): +3. Each row's 4pc step newly loses Malorne
  2pc (its own swap already lost the 4pc). The gears before are Gauntlets
  - Cover (the Gauntlets and Cover rows), Gauntlets + Chestguard and
    Gauntlets + Pauldrons: three requests. Each reads Y = 40, X = 280, step
  240.
- **492-J** (worn Thunderheart hands, Malorne head, shoulder, chest): +4.
  Each of the Cover, Chestguard, Leggings and Pauldrons rows has one step,
  the 4pc, which newly loses Malorne 2pc; its gear before is the row's own
  single swap, so the four requests differ. Each reads Y = 40, X = 280,
  step 240.
