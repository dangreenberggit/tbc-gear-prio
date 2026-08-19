Status: open
Type: bug (test red on the branch tip)
Origin: executor of stage-gate tickets-226-230, 2026-08-19 — found running `pnpm verify` at base `017c0c6`
Blocks: feat/candidate-pool
Blocked by: none

# `racing.test.ts` 7.0 fails on the branch tip: 242 full-iteration sims against a 228-item pool

`pnpm verify` is **red at the branch tip** `017c0c6`, before any of the
tickets-226-230 work. One test fails; 853 pass.

```
npx vitest run packages/core/test/racing.test.ts -t 7.0
# × M2 racing — 7.0: racing does less full-iteration work
#   → expected 242 to be less than 228
```

The assertion is `racing.test.ts:205`, `expect(fullIterationRuns).toBeLessThan(eligibleCount)`
— the §7 row 7.0 property that racing issues strictly fewer full-iteration
sims than there are eligible candidates.

## Why it fails (hypothesis, partly measured)

Measured: the `feral` (P2) recording row now has `poolSize` **228**, and the
promotion budget default is `DEFAULT_PROMOTE_TOP_K = 210`
(`packages/core/src/promotion.ts:20`).

```
python -c "import json;r=json.load(open('packages/core/test/fixtures/synthetic-roster-recordings.json'))['rows']['feral'];print(r['poolSize'], len(r['recordings']))"
# 228 260
grep -n "DEFAULT_PROMOTE_TOP_K\s*=" packages/core/src/promotion.ts
# 20:export const DEFAULT_PROMOTE_TOP_K = 210;
```

**Hypothesis, untested:** 210 promoted + owned-row exemptions + paired-slot
second tries reaches 242, which exceeds the 228-item pool, so at defaults
racing no longer does less full-iteration work than `fullPool` on this
fixture. The promotion budget is an absolute constant while the pool shrank
(`5c42a37` "Exclude weapon types a druid cannot equip"), so the fraction it
admits rose past 100%. Confirming this means counting the owned and
paired-slot rows in `sim.runsByIterations` — not done here.

## Bisect

The failure **predates** the feral re-record `57ec814`; it reproduces
identically at `57ec814^`:

```
git checkout 57ec814^ && npx vitest run packages/core/test/racing.test.ts -t 7.0
# → expected 242 to be less than 228   (same numbers)
```

Not bisected further. The pool-shrinking commit `5c42a37` "Exclude weapon
types a druid cannot equip" is the suspected origin — **untested**.

## Why this ticket exists rather than a fix

Found by the tickets-226-230 executor, whose plan scopes it to the recall
gate's *name* (ticket 230) and forbids touching pool membership rules or the
promotion budget ("Out of scope"). Fixing 7.0 means either re-tuning
`DEFAULT_PROMOTE_TOP_K` against the smaller pool or changing what the gate
asserts — both are ranking-behaviour decisions, not naming.

This is closely related to **ticket 225** (promotion budget is a blunt
instrument relative to real upgrade count): 225 argues the absolute budget
scales badly with pool size, and this is that argument turning into a red
test.

## Acceptance criteria

- [ ] Confirm or refute the hypothesis by counting which runs make up the 242
      (promoted / owned-exempt / paired-slot retries) on the `feral` row.
- [ ] Bisect to the commit that first made 7.0 red.
- [ ] Decide: re-tune the promotion budget for the post-proficiency-filter
      pool sizes, or restate 7.0's property (coordinate with ticket 225).
- [ ] `npx vitest run packages/core/test/racing.test.ts` green, and
      `pnpm verify` green on the branch tip.
