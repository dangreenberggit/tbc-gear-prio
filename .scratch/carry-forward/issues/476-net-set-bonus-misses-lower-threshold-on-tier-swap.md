Status: closed
Type: bug
Origin: docs/reviews/feat-tab-signoff-followups.md (round 6, 2026-09-22)
Blocks: none
Blocked by: none
Related: 467

# Net set-bonus value misses the lower threshold on a tier-set swap

Finding A2/D1. `set-value.ts:223-236`'s `brokenSetBonuses` reports only the
highest lost threshold per set (`.reverse().find(...)`), and `rank.ts`'s
vacate math (`n = wornX === t ? 2 : wornX - t + 1`, `B = wornX === t ? delta
- sumOwn : sumOwn - delta`) assumes only the target bonus is lost.

When the player wears a set's 4pc and a candidate/package breaks its 2pc
(vacating 3-4 pieces also breaks the 4pc), the measured B comes out as
`B2 − 2·B4` at worn=4 and `B2 + B4` at worn=5, and the lost B2 is never
subtracted on a 4pc-only report. This is the full-tier-set to next-tier
swap case (T4 4pc to T5 4pc, same slots), so the row ranks too high. Since
467 this changes the sort key, not just disclosure.

## What would close this

1. Report every lost threshold per set, not only the highest.
2. Measure each B against a vacate that breaks only that threshold (or
   solve the system for both).
3. A `packages/core/test/fork-set-net.test.ts` fixture with worn=4 and a
   2pc+4pc break asserting the exact net.
4. PROVENANCE cycle on the fork engine files, re-pin, `pnpm verify`.

## Comments

2026-09-24 (round 2, closed): fixed. Fork `371da7dce972ea8bf6267daadf9f20627f7e58bb` (engine: set-value.ts,
rank.ts, view.ts, PROVENANCE rows); main red fixtures `43634fb9`, re-pin
`7f4b98af`. Checks: `npx vitest run packages/core/test/fork-set-net.test.ts
packages/core/test/wowsims-fork-parity.test.ts` rc=1 before the engine edit
(exactly 476-A, 476-B, 477-P, 477-T, A3-U, A4 red) and rc=0 after; fork
`node node_modules/typescript/bin/tsc --noEmit` rc=0, `npx oxlint ./ui` rc=0;
`pnpm verify` rc=0; layout gate `{"outcome":"measured","passed":53,"failed":0,"a11yFailed":0}`.
These suites skip in CI (fork gitignored), so the local rc above is the evidence.

`brokenSetBonuses` now reports every lost implemented threshold (via
`lostThresholds`). Targets are measured per set highest threshold first, and
`measureBrokenSetValueFor` solves
`B_t·(1 − n·[t∈L_1]) = (Σs − Δ) + n·Σ_(L_1, t'≠t) B_t' − Σ_(L_vac, t'≠t) B_t'`,
so each lost threshold gets its own B (the naive value was `B2 − 2·B4` at
worn 4 and `B2 + B4` at worn 5). A missing higher B makes the lower target
`dependent-unmeasured`. Pinned by fixtures 476-A (worn Malorne 4: B_4 70,
B_2 40, nets 50/80, each Thunderheart row full 90 / split 5, flag adds 2 sims;
red values were: no (640,2), net4 40, split 35, flag added 1 sim) and 476-B
(worn Malorne 5: B_2 40, net4 80, row full 20; red: net4 180, full 160). The
SME run at worn Thunderheart 2 does not exercise this case (467 Comments,
handoff `.scratch/handoffs/sme-rank-judgment-467-net-set-bonus.md`, F5).
