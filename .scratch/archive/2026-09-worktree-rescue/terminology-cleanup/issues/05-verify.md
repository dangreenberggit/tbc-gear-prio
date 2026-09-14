# 05 — Verify

Type: task
Status: open
Assignee: 1 × haiku (sweep) + human (review)
Blocked by: 04

## Machine checks

```bash
pnpm verify
```

```bash
python scripts/sync_wowsims.py --check
```

The sync check is **the real test**. It parses `CURRENT_PHASE` out of upstream
TypeScript with a regex at `scripts/sync_wowsims.py:85`. If any agent overreached
into a frozen identifier, this fails loudly. `pnpm verify` will not catch a
terminology error — it only confirms the file rename did not break the build.

## Residual sweep — haiku, report only

Run each; **report hits, fix nothing.** Fixes are a follow-up commit after human
review, so a bad judgment call in this sweep cannot compound.

```bash
git grep -n "Phase [0-9]" -- . ':!.agents' ':!.claude' ':!test/fixtures'
```

Expected: only `Phase.PhaseN` upstream quotes and `export enum Phase`.

```bash
git grep -n "\[P0\]" -- . ':!.agents' ':!.claude'
```

Expected: nothing. All should be `[S0]`.

```bash
git grep -niE "\bland(s|ed|ing)?\b" -- . ':!.agents' ':!.claude'
```

Expected: exactly three — `PLAN.md:589`, `docs/verification-log.md:46`,
`scripts/verify_fixture.py:257` (all literal, all correct), plus three in
`PLAN-REVIEW.md` if spec §6 option (a) held.

```bash
git grep -n "phase0-findings" -- . ':!.agents' ':!.claude'
```

Expected: nothing. Any hit is a dangling link.

```bash
git grep -nE "CURRENT_PHASE|currentPhase|defaultMaxPhase|maxPhase|ContentPhase|DEFAULT_MAX_PHASE"
```

Compare against `git show HEAD~5` — **this set must be unchanged**. Any
difference is a frozen-identifier violation and blocks the merge.

## Human review

- [ ] Read the full `PLAN.md` diff. It is a planning document in your voice;
      four agents just rewrote prose in it.
- [ ] `CONTEXT.md` says what you actually want to be held to.
- [ ] `PLAN.md` §14 still reads as a coherent plan, not just a renamed one.
- [ ] Spot-check that no game-sense "phase" became "Stage" — that error is
      silent, survives every grep above, and would be a real inversion.

## Done when

- [ ] Both machine checks pass
- [ ] All five greps return expected results
- [ ] Frozen identifiers verifiably unchanged vs. pre-cleanup
- [ ] Human review done
- [ ] Residual hits either fixed in a follow-up commit or recorded as accepted
