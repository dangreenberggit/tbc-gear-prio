# Pre-merge review — fix/fork-meta-repair-guard

Reviewed range: `f01626f1c6f46fd9c6f980fa68c817b173d97481..fe37b223f2a6382ef4bec1b81b390d75aa4a8ec4`

Dispatch: `codex` is not on `PATH`, so one fresh `general-task` subagent
on Opus at effort `high` covered all three axes for this one-file,
one-commit fix, told to write nothing.

Problem: `pnpm verify` failed on `dev` (f01626f1) wherever
`vendor/tbc-new-fork` is absent, including CI
(`gh api repos/dangreenberggit/tbc-gear-prio/actions/jobs/111362992778/logs`:
"FAIL packages/core/test/fork-meta-repair.test.ts … ENOENT …
ret-p2.ep-weights.json"). `retWeights` read a fork file at module level,
outside the file's `describe.skipIf(!forkPresent)` guards. The fix reads it
only when `forkPresent` is true.

## Adversarial

**Adversarial: clean.** Every use of `retWeights` sits inside a
`forkPresent`-guarded describe, directly or through `retInputs()`,
`runRet()` and `stepScenario()`, so the `{}` fallback cannot reach an
assertion. No other module-level fork access remains in the file. A
spot-check of the other twelve `forkPresent` test files found no fork read
at import. Observation R1: `forkPresent` checks `engine/rank.ts` and
`db.json`, not the weights file, so a partial fork without that file would
still fail the file at import — the old, loud failure.

## Domain

**Domain: clean.** No ranking, pool or weight value changes; with the fork
present the read expression is textually the one it replaced.

## Standards + Spec

**Standards: clean.** Subject 42 characters, imperative, no period; the
comment says why the read is guarded; Prettier and ESLint pass on the file.

**Spec.** "Tests unchanged with the fork" holds by inspection and by a run
(28 passed, `pnpm verify` rc=0 with the fork present). The reviewer could
not run the fork-absent path itself and listed that as should-fix (R2).
Two runs close it: the fix worker's temporary forkless worktree, set up
like CI (wowsims and atlasloot restored, no `vendor/tbc-new-fork`), gave
the CI ENOENT with the old file, then 28 skipped and `pnpm verify` rc=0
with the fixed file (checked byte-equal to `fe37b223` with `cmp`); and
`pnpm merge-to-dev --check-only` on this branch ran verify in this
worktree after its fork worktree was removed.

## Summary

The fix is correct and minimal. Fork-absent and fork-present runs both
pass verify.

## Disposition

| ID  | Axis        | Disposition | Ticket / note                                                                                                                                     |
| --- | ----------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1  | Adversarial | wontfix     | a partial fork without the weights file fails loudly at import, as before; `forkPresent` checks the two files the engine needs                    |
| R2  | Spec        | fixed       | fork-absent runs: the fix worker's forkless worktree (verify rc=0, 28 skipped) and `pnpm merge-to-dev --check-only` with no fork in this worktree |
