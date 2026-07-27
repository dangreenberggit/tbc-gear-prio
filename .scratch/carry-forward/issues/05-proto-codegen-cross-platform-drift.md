Status: open
Type: task
Origin: phase-1/five-seed-spread merge (parallel-phase fan-in)
Blocks: phase-1

# buf's generated proto doc comments are not byte-stable across platforms

## Problem

`pnpm proto:generate` (buf 1.72.0) regenerated `packages/core/src/proto/`
on Windows and produced a diff against the committed output (which was
generated on the worker's Linux/WSL environment): `api_pb.ts` and
`common_pb.ts` each had blank lines inside generated doc comments flip
between `*` and `* ` (trailing space). No type or logic changed.

`.github/workflows/verify.yml` runs `pnpm run proto:generate` then
`git diff --exit-code -- packages/core/src/proto data/proto` on
`ubuntu-latest` — the exact check PLAN.md §8.1 asks for, to catch generator
drift or hand-edited generated code. If the committed output was last
regenerated on a different platform than CI, this check can fail on an
otherwise-correct PR for a reason that has nothing to do with the change
being reviewed.

## Done when

- Either: pin the doc-comment behavior (buf/protoc-gen-es flag, or a
  post-process normalization step) so generation is byte-identical across
  platforms, or
- Document that `data/proto`/`packages/core/src/proto` must only ever be
  regenerated in CI (or an equivalent container matching CI's OS) before
  committing, and add a comment to that effect near the `proto:generate`
  script and in `packages/core/src/proto/`'s directory (or a README there).
- Either way, a Windows contributor regenerating locally should get a clear
  signal not to "fix" the diff by hand-editing generated code.
