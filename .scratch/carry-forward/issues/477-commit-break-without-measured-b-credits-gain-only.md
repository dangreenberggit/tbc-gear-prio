Status: closed
Type: bug
Origin: docs/reviews/feat-tab-signoff-followups.md (round 6, 2026-09-22)
Blocks: none
Blocked by: none
Related: 467

# A commit-time break with no measured B credits the gain and drops the loss

Finding A1. In `rank.ts`'s `applySetContext` `commitBreaks` block and
`view.ts`'s `rankableSetPotential`, a `commitBreaks` entry with no `dps` is
skipped (`if (brk.dps !== undefined)`), while the fallback only checks
`futureBonuses` — so the row keeps the gain and loses nothing.

Trigger: worn set X = 3; the top package overwrites one X slot (3→2, no
break); the row's item goes into a different X slot; the substituted set
overwrites 2 X slots (3→1) and breaks (X,2), which no package and no
single ever measured, so B is missing.

## What would close this

1. When any `commitBreaks` entry lacks `dps`, fall back to disclosure-only
   for the row (same treatment as a missing `futureBonuses` dps), or
   measure the missing B.
2. A test fixture reproducing the trigger.
3. PROVENANCE cycle on the fork engine files, re-pin.

## Comments

2026-09-24 (round 2, closed): fixed. Fork `371da7dce972ea8bf6267daadf9f20627f7e58bb` (engine: set-value.ts,
rank.ts, view.ts, PROVENANCE rows); main red fixtures `43634fb9`, re-pin
`7f4b98af`. Checks: `npx vitest run packages/core/test/fork-set-net.test.ts
packages/core/test/wowsims-fork-parity.test.ts` rc=1 before the engine edit
(exactly 476-A, 476-B, 477-P, 477-T, A3-U, A4 red) and rc=0 after; fork
`node node_modules/typescript/bin/tsc --noEmit` rc=0, `npx oxlint ./ui` rc=0;
`pnpm verify` rc=0; layout gate `{"outcome":"measured","passed":53,"failed":0,"a11yFailed":0}`.
These suites skip in CI (fork gitignored), so the local rc above is the evidence.

Q2 outcome: branch (b) shipped, with (a) as the invariant. (a):
`rankableSetPotential` returns 0 when any `commitBreaks` entry lacks `dps`
(fixture 477-P: 0 in both views; red: 80). (b): `substitutedPackageBreaks`
is shared by `applySetContext` and B target discovery, so every commit break a
row shows is a measurement target, deduplicated by `setId:threshold`.
Fixture 477-T (worn Malorne chest/hands/legs, Thunderheart wrist/waist/feet at
150): the legs row's (640,2) is measured at 40, its full credit is 90, the
flag adds exactly 1 sim (= measured entries), and the package members keep
130. Red values: the entry had no `dps`, credit 130, the flag added 0 sims,
`brokenSetValues` was empty. Measured live price (N2): at worn Thunderheart 2
the only possible key is 676:2, so one extra sim (467 Comments). Display gap
not fixed here: the tab's `not_counted` line (`upgrades_tab.tsx`
`creditUnmeasured`) checks futures only, so a row zeroed by an unmeasured
commit break says "hover for set detail". Under (b) that needs a B that could
not be measured (no neutral candidate, sim failure, dependent-unmeasured).
`upgrades_tab.tsx` was outside this round's manifest; flagged for Gate C.
