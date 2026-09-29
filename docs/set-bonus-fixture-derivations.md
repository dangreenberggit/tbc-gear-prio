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
