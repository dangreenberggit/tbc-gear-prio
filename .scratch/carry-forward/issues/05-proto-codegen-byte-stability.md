Status: resolved
Type: task
Origin: phase-1/five-seed-spread merge (parallel-phase fan-in)
Blocks: none
Blocked by: none

# Confirm `proto:generate` is byte-stable between Windows and CI's Linux

## Resolution (2026-07-28)

Read real CI run
[30409397254](https://github.com/dangreenberggit/tbc-gear-prio/actions/runs/30409397254)
(`1e62160` on `phase-1/five-seed-spread`):

- `pnpm run proto:generate` succeeded
- `git diff --exit-code -- packages/core/src/proto data/proto` **failed**
- Diff was only empty JSDoc lines: committed `   * ` (trailing space) vs
  Linux regenerate `   *` — 1 line in `api_pb.ts`, 6 in `common_pb.ts`

So Linux `protoc-gen-es` and Windows disagree on trailing space after `*` for
empty `//` comment lines in `data/proto`. Normalization is warranted.

**Fix:** `scripts/normalize_proto_gen.py` runs after `buf generate` (wired in
`pnpm proto:generate`). Committed generated output matches the Linux/CI bytes.
Re-run evidence: CI
[30409562894](https://github.com/dangreenberggit/tbc-gear-prio/actions/runs/30409562894)
green through `proto:generate` + `git diff --exit-code`.

## Problem (historical)

`.github/workflows/verify.yml` runs `pnpm run proto:generate` then
`git diff --exit-code -- packages/core/src/proto data/proto` on `ubuntu-latest`
(PLAN.md §8.1). Earlier write-ups about CRLF/`c0acbfc` are superseded — see
prior Notes in git history if needed.

### What was verified on Windows before CI evidence

Regenerating with buf 1.72.0 / protoc-gen-es 2.13.0 reproduced HEAD including
the 7 trailing-space empty JSDoc lines. Those were ordinary Windows generator
output, not hand edits.

## Done when

- [x] A real CI run of the byte-compare was **read** (30409397254) — red on
  trailing-space JSDoc only.
- [x] Normalization added so Windows and Linux `pnpm proto:generate` leave the
  same committed bytes.
