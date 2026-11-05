Status: open
Type: bug
Origin: docs/reviews/chore-pnpm-12.16.1.md (finding A2)
Blocks: none
Blocked by: none

# `engine-strict=true` in `.npmrc` does nothing, so `pnpm install` never checks the Node floor

`.npmrc` holds `engine-strict=true`, and `package.json` declares
`engines.node` `>=22.5.0` (commit 733d4a4e). Neither pnpm 11.24.0 nor pnpm
12.16.1 reads that setting from `.npmrc`: `pnpm config get engine-strict`
prints `undefined` in the repo under both.

Re-run (2026-11-01, in `$TMPDIR`): a project with `engines.node` `>=99`
and `packageManager` `pnpm@12.16.1`:

- with `.npmrc` `engine-strict=true`: `pnpm install` rc=0;
- with `pnpm-workspace.yaml` `engineStrict: true`: rc=1,
  "Unsupported engine ... wanted: {"node":">=99"}".

The same `.npmrc` project with `pnpm@11.24.0` also gave rc=0, so this
predates the pnpm 12 bump.

What still catches a wrong Node: `pnpm verify` starts with
`pnpm run preflight:node`. A plain `pnpm install` on an old Node does not
stop.

Likely fix (hypothesis, untested in this repo): move the setting to
`pnpm-workspace.yaml` as `engineStrict: true` and drop it from `.npmrc`,
then check that `pnpm install --frozen-lockfile` and `pnpm verify` still
pass and that `scripts/check_worktree_pair.py` line 161's docstring
("`pnpm install` refuses below 22.5 (engine-strict)") becomes true.
