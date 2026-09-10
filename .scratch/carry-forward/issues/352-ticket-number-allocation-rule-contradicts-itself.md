Status: open
Type: task
Origin: docs/reviews/feat-342-learn-from-upstream.md (Standards axis)
Blocks: none
Blocked by: none

# Two docs give opposite rules for allocating a ticket number

Group: `.scratch/upgrades-tab-sim-followups/README.md`

## What

`docs/agents/issue-tracker.md` and `docs/agents/known-traps.md` tell an agent to
do opposite things, each with a real incident behind it.

`docs/agents/issue-tracker.md`, under "Allocating `<NN>`":

> read `.scratch/carry-forward/issues/NEXT`, use that number, and write the
> incremented value back to `NEXT` in the same commit as the new ticket. **Never
> allocate by listing the directory** — two branches doing that pick the same
> number and merge cleanly under different filenames (it happened: two 232s and
> two 233s on 2026-08-19). Editing `NEXT` forces the collision into a git
> conflict instead.

`docs/agents/known-traps.md`, under "Before filing a ticket":

> `.scratch/carry-forward/issues/NEXT` has been stale before, so **the directory
> listing is the authority**: list the directory for the number you are about to
> use, then file, then write the next free number back to `NEXT`.

Both failure modes are real: `NEXT` going stale, and two branches colliding on a
directory-derived number. But an agent reading one document gets a rule the
other forbids, and "did the agent follow the rule?" has no answer.

## Why it matters

Neither document is wrong about its own incident, so this cannot be fixed by
deleting one. The rules protect against different things:

- `NEXT` as authority makes a collision surface as a **git conflict** on a
  one-line file, which is the point.
- The directory listing catches a `NEXT` that is already **behind** the files on
  disk, which a stale or hand-edited `NEXT` causes.

The safe procedure is the conjunction, and neither document states it: read
`NEXT`, then confirm no file already uses that number, then file and bump. If the
directory shows `NEXT` is behind, that is a defect to fix and mention, not a
number to silently skip past.

## What to do

1. Write one procedure in `docs/agents/issue-tracker.md` (the tracker's home
   document) that keeps both protections: `NEXT` allocates, the directory listing
   verifies, a disagreement between them is reported rather than absorbed.
2. Replace `known-traps.md`'s "Before filing a ticket" body with a pointer to
   that procedure, keeping its "Symptom when armed" line. Known-traps is a
   symptom index; the procedure belongs in one place.
3. State what to do when they disagree, since that is the case both documents
   were written for and neither covers.

Both files steer every future session, so per `AGENTS.md` propose the wording in
chat and get approval before editing.

## Acceptance

- [ ] One allocation procedure, stated once, that preserves both the
      git-conflict property and the stale-`NEXT` check.
- [ ] `known-traps.md` points at it rather than restating a conflicting rule.
- [ ] The disagreement case is covered explicitly.
- [ ] Wording approved in chat before the edit, per `AGENTS.md`.

## Notes

Surfaced by the Standards axis of the `feat/342-learn-from-upstream` review. That
branch filed 350 and 351 using `NEXT` as the allocator and the directory as a
cross-check — the conjunction above — so no collision occurred, but only because
the executor happened to do both. Pre-existing; not caused by that branch.
