Status: closed
Closed: 2026-09-12 — 377's correction reached `dev`; see Resolution below
Type: task
Origin: docs/reviews/fix-sim-header-null-assertion.md
Formerly: 371 on fix/sim-header-null-assertion, renumbered 2026-09-12 to clear
a collision with `feat/spec-registry`'s own 371. Commit messages on this branch
still name the old number; see
`.scratch/stage-gate/ledger-consolidation-and-merge-train/merge-order.md`
§ Ticket renumber map.
Blocks: none
Blocked by: branch `feat/spec-registry` landing on dev — met 2026-09-12

## Resolution — 2026-09-12

`feat/spec-registry` merged into `dev` at `8a54484`, carrying 377's own closure
with it. Confirmed on `dev` rather than assumed from the merge:

```
git show dev:.scratch/carry-forward/issues/377-fork-clone-head-is-behind-the-lockfile-pin.md
  Status: closed
```

The ancestry this ticket rests on was re-measured independently before the
merge train ran, in the clone:

```
git -C vendor/tbc-new-fork merge-base --is-ancestor bbad1b8a4 5e9013b78   # rc 0
```

So the chain `f90b12a7b` → `bbad1b8a4` → `5e9013b78` is linear, the clone held
the newer commit, and bumping the pin forward was right — which is what 377 had
backwards. Nothing in this ticket needed an edit; it was waiting on the
correction reaching `dev`, and it has.

# Ticket 377 (filed as 372 on `feat/spec-registry`, renumbered) is inverted

Ticket 377 says the fork pin moved ahead of the clone, and warns:
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

Ticket 377 does not exist on `dev` or on
`fix/sim-header-null-assertion`. It lives only on branch
`feat/spec-registry`, which the review that found this was instructed not
to touch. Editing another branch's file from here would either lose the
edit at merge or create a conflict nobody asked for.

**Since this was filed, that branch has closed 377 itself**, with the ancestry
above as the measurement, so the correction lands on `dev` with that merge
rather than needing a separate pass.

## What to do

After `feat/spec-registry` merges to `dev`, confirm 377 reads as closed there
and close this ticket.

The stage-gate plan and execution report that repeat the same inversion are
under `.scratch/stage-gate/spec-registry/`, which is **untracked on every
branch**, so they are out of this ticket's reach — there is no tracked file to
correct.

For why this ticket is 379 and the ticket it corrects is 377, see the
allocation table in
`.scratch/stage-gate/ledger-consolidation-and-merge-train/merge-order.md`
§ Ticket renumber map.
