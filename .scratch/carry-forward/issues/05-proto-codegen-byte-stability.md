Status: open
Type: task
Origin: phase-1/five-seed-spread merge (parallel-phase fan-in)
Blocks: phase-1
Blocked by: none — Done-when is to read a real CI run of the proto byte-compare

# Confirm `proto:generate` is byte-stable between Windows and CI's Linux

## Problem

`.github/workflows/verify.yml` runs `pnpm run proto:generate` then
`git diff --exit-code -- packages/core/src/proto data/proto` on `ubuntu-latest`
(PLAN.md §8.1). Nobody has read a real CI run of that step, so we do not know
whether it passes. This ticket exists to close that gap, and to record what two
earlier attempts to explain it got wrong.

### What is verified (Windows, buf 1.72.0, protoc-gen-es 2.13.0)

Regenerating from the committed sources reproduces `HEAD` **exactly** —
`git status` is clean afterwards. So the committed output is what this
generator produces from this input; there is nothing hand-edited to undo.

`common_pb.ts` contains 6 lines and `api_pb.ts` 1 line of the form `   * `
(trailing space). These are **ordinary generator output**, not corruption.
`protoc-gen-es` renders a doc comment line as `   * ` + the source comment
text, and the source has empty `//` lines — e.g. `data/proto/api.proto:109`
is a bare `\t//` inside the `num_active_parties` comment, LF, no trailing
whitespace of its own. Empty text after a `   * ` prefix is a trailing space.
Clean LF sources still produce all 7.

### What the previous two write-ups got wrong

Both are superseded. Recorded so the wrong causes are not re-derived.

- **The original version of this ticket** framed it as buf being unstable
  *across platforms*, with the committed output coming from "the worker's
  Linux/WSL run". There was no Linux/WSL run, and no cross-platform variance
  has ever been demonstrated in either direction.

- **`04-rsn.md`** framed it as CRLF contamination: no `.gitattributes` +
  `core.autocrlf=true` → CRLF `.proto` checkout → `\r` carried into JSDoc →
  autocrlf strips it on commit → orphan trailing space, and concluded that
  `c0acbfc` introduced the defect it claimed to fix. That report presents this
  as established by controlled experiment rather than inferred. **It does not
  reproduce.** Its stated result — "generate from LF sources → byte-identical
  to `c0acbfc^`" — is false: `c0acbfc^` has 0 trailing spaces and LF generation
  produces 6 and 1. The mechanism also does not work as described, because the
  `\r` sits *after* the space (`   * \r`); stripping it leaves the space either
  way, so CRLF and LF sources commit the same bytes here.

`c0acbfc^` is the state that disagrees with the generator, not `c0acbfc`. Where
its trailing-whitespace-free bytes came from is still unexplained: the `.proto`
sources are unchanged since, `@bufbuild/*` versions are unchanged, and
`packages/core/src/proto/` was already in `.prettierignore` at that commit. A
trim-on-save editor pass is the obvious remaining candidate, but that is a
guess and is labelled as one.

## Done when

- A real CI run of the `proto:generate` + `git diff --exit-code` step has been
  **read**, not predicted. If it is green, close this ticket — the byte-compare
  does what §8.1 wanted and the trailing spaces are a non-issue.
- If it is red, the diff identifies whether Linux's `protoc-gen-es` renders
  empty comment lines differently. Only then is a normalization step warranted;
  do not add one pre-emptively to chase a failure nobody has seen.

## Notes

- `.gitattributes` (added alongside this rewrite) pins `data/proto/**` and
  `packages/core/src/proto/**` to `eol=lf`. That was worth doing on its own
  merits — CRLF checkouts left all 14 generated files permanently "modified"
  in `git status`, so `lint-staged` stashed and restored on every commit — but
  it does **not** change the committed bytes and is not a fix for the trailing
  spaces.
- Do not use `-text` (commits CRLFs into blobs) or `-diff` (changes diff
  display only; `git diff --exit-code` still compares real content, which is
  the thing the CI gate depends on).
