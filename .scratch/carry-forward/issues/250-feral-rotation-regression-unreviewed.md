Status: open
Type: task (domain review of an adopted upstream change)
Origin: feat/engine-pin-backend-reforge review, 2026-08-21
Blocks: none
Blocked by: none

# Upstream's new feral rotation costs ~18 DPS and nobody with feral judgment has looked

## What happened

`feature/backend-reforge` ships a rewritten feral cat rotation — 22 actions
where v0.0.101 had 12. Per the owner's rule (a changed upstream rotation is the
one we take), it was adopted in `d41c46c` and every fixture re-recorded.

Measured on the same binary (`cbf6b75`), 20k iterations, seed 42, committed
skeleton gear:

| skeleton | DPS |
| --- | --- |
| old 12-action | 740.67 |
| **new 22-action** | **722.55** |

So their rewrite is **~18 DPS worse** on our gear. It also moved the ranking
more than the DPS: feral's above-cutoff set went 15 → 27 rows and feral-p3's
36 → 55, meaning which items read as upgrades changed.

## Why this needs a domain eye

A rotation rewrite from the people who maintain the sim would normally be
expected to help, not cost 18 DPS. Several explanations are possible and this
ticket does not choose between them:

- Their rotation is tuned for different gear or a different phase than our
  committed skeleton, and is correct on its own terms.
- It depends on APL values or settings our skeleton does not supply, so parts of
  it never fire.
- It is genuinely a work-in-progress on an unmerged branch (PR #385 is open and
  conflicted) and not intended as final.
- Our skeleton's non-rotation settings no longer pair well with it.

**Do not assume the first one.** The whole reason this repo has a schema gate is
that a rotation can run and produce a plausible number while silently doing
something other than what it says.

## Suggested first checks

- Does the new rotation reference anything our skeleton leaves unset (consumes,
  talents, prepull)? `scripts/apl_schema.py` reports unknown *fields*, not
  unmet *preconditions*.
- Compare against the rotation shipped at `v0.0.119`, which is the version the
  live site runs — if it differs from `backend-reforge`'s, the branch's rotation
  may simply be mid-rework.
- Use the `sme-rank-review` skill on the new above-cutoff set. The ranking moved
  more than the DPS did, so the rank output is the sharper signal.

## Acceptance

- [ ] A domain verdict recorded: the regression is expected, or it is a
      mismatch, with the reasoning.
- [ ] If a mismatch: what specifically is unmet, and whether the skeleton or the
      rotation should change.
- [ ] The 740.67 / 722.55 pair kept or superseded with a corrected measurement.
