Status: open
Type: bug
Origin: stage-gate upgrades-tab-closeout round 2, Gate C (SME verdict, 2026-09-24)
Blocks: none
Blocked by: none
Related: 467, 476, 477, 478

# "Set potential" ON charges a Thunderheart 2pc break that the game does not impose

With "Set potential" ON, a row's credit subtracts every worn bonus that
completing its set's TOP implemented package would break (`commitBreaks`,
fork `rank.ts` `applySetContext` via `substitutedPackageBreaks` and
`topMeasuredPackage`). At worn Thunderheart hands + legs (2pc active), a
Malorne or Nordrassil **head, shoulder or chest** piece is charged −108.6 for
breaking the Thunderheart 2pc. That break happens only on the way to the
Malorne or Nordrassil 4pc, whose net is at or below the noise floor and is not
credited. The Malorne 2pc can be completed in head, shoulder and chest while
the Thunderheart 2pc stays active, so the ON figure is wrong for those rows.
This is a correctness bug in the ON view; the OFF view is trusted.

## Evidence

- SME handoff `.scratch/handoffs/sme-rank-judgment-467-net-set-bonus.md`,
  sections "Verdict" and "Findings" (F1–F3): **do-not-trust** for ON, trust
  for OFF.
- Breastplate of Malorne: OFF +8.6; ON **−37.7** (ON rank 66) = 8.6 + 62.3
  (Malorne 2pc) − 108.6 (Thunderheart 2pc). By the game it is about **+70.9**
  (8.6 + 62.3), which would be ON rank 3.
- Nordrassil Chestplate: OFF +15.1 (rank 5), ON −93.5 (rank 207). No
  Nordrassil gain is credited; the full −108.6 is charged.
- Captures (gitignored) in `.scratch/stage-gate/upgrades-tab-closeout/round-2/`:
  `feral-worn2-tip-Malorne-{off,on}.png`, `feral-worn2-tip-Nordrassil-{off,on}.png`;
  row lists in `feral-worn2.json` and `sme-feral-worn2-{off,on}.json`. The
  same pattern shows at worn 3: `feral-worn3-tip-Malorne-on.png`
  (−15.9 + 63.5 + 69.5 − 115.3 = +1.8).
- Fork `371da7dce972ea8bf6267daadf9f20627f7e58bb` (main re-pin `7f4b98af`),
  feralcat, 3000 iterations, backend :3333, baseline 2603.6 DPS.
- **Contested wording:** the round-2 Step 5 brief described the Malorne and
  Nordrassil rows as rows "which break the worn Thunderheart 2pc". That is
  true only for their hands and legs pieces. It is false for Breastplate,
  Mantle and Stag-Helm of Malorne and for Nordrassil Chestplate, Feral-Mantle
  and Headdress.

## Design question the fix raises

Which package should a commit break assume? Today it is always the top
implemented package (the 4pc when measured). Candidates: the package of each
credited future threshold, so a row is charged only for breaks the credited
gain needs; the best-net package; or a break attached to each future line.
This needs an owner or orchestrator decision before any code. The rest of
467's design stays settled.

## What would close this

1. A decision, recorded here, on which package a commit break assumes.
2. A fixture in `packages/core/test/fork-set-net.test.ts` for this geometry
   (worn set Y at 2 in two slots; another set X whose 2pc fits in free slots
   and whose 4pc would displace Y), red today, asserting the ON credit the
   decision implies.
3. The engine change, PROVENANCE cycle, re-pin, `pnpm verify` rc=0, and a real
   layout gate run.
4. A new SME verdict on the same worn-Thunderheart-2 state that is not
   `do-not-trust` for the ON view.

## Comments

- 2026-09-24 (round 2b, Step 0): the owner has not chosen the stopping
  rule, so **best-stop** ships provisionally. Full-path is one constant
  (`RULE_490` in `packages/core/test/fork-set-net.test.ts`) and one
  function (`view.ts` `setPotentialCredit`) away.
- 2026-09-24 (round 2b, Step 1): red fixtures committed. Observed on fork
  `371da7dce`, matching the plan's "today" column: 490-A chest/head/shoulder
  full −10, split −30, futures carry no `breaks`, `packageItemIds` 640:2
  {29096, 29098} and 640:4 {29096, 29097, 29098, 29100}, runs 10 → 11 with the
  flag, B(676,2) = 50; 490-B chest full 20, split −22.5; 490-C Nordrassil
  chest/head/shoulder full −50. Command:
  `npx vitest run packages/core/test/fork-set-net.test.ts packages/core/test/wowsims-fork-parity.test.ts; echo rc=$?`
  → rc=1, 8 failed (490-A/B/C, 491-P/L, 492-F, 477-T, credit-view), parity
  green.
