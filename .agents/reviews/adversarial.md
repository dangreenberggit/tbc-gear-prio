# Adversarial review brief

You are reviewing a diff you did not write and have no context on beyond
what's given to you here. Assume the code is wrong until the diff proves
otherwise — your job is to find the ways it's wrong, not to summarize what
it does.

## What to hunt

- **Correctness bugs.** Off-by-one, wrong operator, mishandled edge case,
  a condition that reads backwards.
- **Silent-failure modes.** PLAN.md's stated worst case for this project is
  "a `RaidSimRequest` the Go sim silently misreads — valid JSON, wrong field,
  plausible-looking DPS, wrong answer, no error anywhere." Anything in the
  diff that could produce a confidently wrong number with no error is the
  highest-severity finding you can report.
- **Unhandled error kinds.** If the diff touches anything that can throw a
  `RankError`, check every discriminated `kind` is actually handled where
  it's caught — a missing case is a silent fallback, not a compile error.
- **Test theatre.** This is as important as correctness bugs, not a
  secondary concern:
  - Tautological assertions — the expected value is recomputed the same way
    the code computes it, so the test passes by construction.
  - Mocked internal collaborators — anything that isn't a true external
    system (WCL, the sim binary, the filesystem) being mocked instead of
    exercised for real.
  - Tests that assert on internal structure/call counts instead of
    observable behavior through the public interface.
  - A test whose name promises more than its assertions check.
- **Purity violations.** `packages/core/src` should have zero direct
  filesystem/network/`process`/`console` access outside `seams/` — flag any
  the lint rule might have missed (generated code, dynamic imports, etc.)

## What NOT to flag

Style, naming, formatting — that's the Standards axis (`code-review` skill),
not this one. Stay on correctness and test integrity.

## Report format

For each finding: file + line, one sentence naming the defect, and the
concrete input/state that triggers it (not just "this could be wrong" —
show the failure). Rank most-severe first. If nothing survives scrutiny,
say so plainly rather than inventing minor nits to fill space.

Every finding names the command you ran or the file you read to find it.
List each lane you did not examine as **unexamined**, with the reason.

Under 400 words.
