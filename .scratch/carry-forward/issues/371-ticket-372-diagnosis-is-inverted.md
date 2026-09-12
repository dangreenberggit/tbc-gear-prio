Status: open
Type: task
Origin: docs/reviews/fix-sim-header-null-assertion.md
Blocks: none
Blocked by: branch `feat/spec-registry` landing on dev

# Ticket 372's diagnosis is inverted

Ticket 372 says the fork pin moved ahead of the clone, and warns:
"Do not bump the pin to `bbad1b8` — that is backwards."

That has the direction backwards. The ancestry is linear:

    f90b12a7b -> bbad1b8a4 -> 5e9013b78

Both checks return 0 in `vendor/tbc-new-fork`:

    git merge-base --is-ancestor f90b12a7b bbad1b8a4
    git merge-base --is-ancestor bbad1b8a4 5e9013b78

So the clone was **ahead** of the pin, and bumping the pin forward was the
correct move — which is what `fix/sim-header-null-assertion` did, after
which `equip-eligibility:check` passes at `5e9013b78b72`.

The spec-registry stage-gate propagated the same inversion through its
plan and its execution report, so those need the same correction.

## Why this is deferred rather than fixed

Ticket 372 does not exist on `dev` or on
`fix/sim-header-null-assertion`. It lives only on branch
`feat/spec-registry`, which the review that found this was instructed not
to touch. Editing another branch's file from here would either lose the
edit at merge or create a conflict nobody asked for.

## What to do

After `feat/spec-registry` merges to `dev`, correct 372's diagnosis on
`dev` (and the stage-gate plan and execution report that repeat it), then
close this ticket.

Note this ticket is numbered 371, not 372 — 372 is the number of the
ticket being corrected and is already allocated on `feat/spec-registry`.
