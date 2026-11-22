Status: open
Type: bug
Origin: docs/reviews/refactor-rank-split-b.md
Blocks: none
Blocked by: none

# A failed ranking-cache read throws a plain Error, not an internal RankError

Found by the Phase B review's adversarial axis (finding N2, in the review's
Notes). It is older than Phase B: base `rank.ts:319` at `bbe89a565` does the
same. Phase B had to leave it alone because fixing it changes behaviour.

## What the player sees

Today, nothing. The tab's store is in memory (`model/run.ts:66`) and its `get`
cannot throw (`model/engine/seams/store.ts:52-55`).

If the store's read of a saved ranking does fail, the run stops with the
status line "Ranking failed." and a toast with the store's own error text.
That is the same as what an internal `RankError` would show today:
`describeRunError` treats every error except `not-implemented` alike
(`utils/format.ts:167-170`), and `run_session.ts:104-108` toasts the error's
message. So the difference is in the error, not on screen yet: it carries no
`kind`, so anything that later sorts failures by `RankError.kind` (as
`run_session.ts:107` does for `not-implemented`) would not see it as an
internal fault.

## Evidence

Paths under `vendor/tbc-new-fork/ui/features/upgrades/`, at fork `04bf9faf8`
(branch `refactor/rank-split-b`).

- `model/engine/rank.ts:160`: `await deps.store.get<Ranking>(rankingCacheKey(contentHash))`,
  called bare. The review cites `rank.ts:162` at the tip; the line is 160 at
  `04bf9faf8`.
- `model/engine/sim-calls.ts:20,28,220-226`: the sim cache's store calls go
  through `asInternal`, which turns a store fault into `RankError('internal')`.
  The ranking-cache read does not.
- The same function's other store calls are also bare: `rank.ts:184-185`,
  `:191`, `:399`, `:407-408` (job create and update, the ranking write).
  Whether they should change too is part of this ticket (hypothesis, untested:
  the review named only the read).
- Adversarial review report:
  `.scratch/agent-reports/2026-11-22-general-task-rank-split-b-review-adversarial.md`
  (gitignored, main checkout), § N2.

## What done looks like

A store fault in `rankUpgrades`' own store calls reaches the caller as
`RankError('internal')`, like the sim cache's, with a test that injects the
fault and checks `kind`.
