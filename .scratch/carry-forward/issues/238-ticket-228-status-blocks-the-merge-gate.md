Status: open
Type: bug (merge gate refuses every branch)
Origin: `feat/seed-overlap` pre-merge review, 2026-08-19 — hit running
  `pnpm merge-to-dev --check-only`
Blocks: any merge to `dev`
Blocked by: none

# Ticket 228's prose `Status:` line makes `merge-to-dev` fail for every branch

`pnpm merge-to-dev --check-only` exits 1 on any branch, including ones with
nothing to do with ticket 228:

```
pnpm merge-to-dev --check-only
# FAIL: .scratch/carry-forward/issues/228-pool-admits-weapons-the-class-cannot-equip.md:
#   unknown status 'blocked' (a ticket the gate cannot read cannot block a merge)
```

`scripts/check_merge_ready.py:57` accepts exactly five statuses:

```python
KNOWN_STATUSES = ("open", "claimed", "closed", "resolved", "wontfix")
```

Ticket 228's first line is prose rather than one of them:

```
Status: **blocked on a user decision** — the assembler fix and the
  universe regeneration are done (`5c42a37`); two tests now read a stale
  recorded fixture and re-recording needs the sim binary. See Progress.
```

The gate's refusal is the right call — "a ticket the gate cannot read cannot
block a merge" is its own message, and silently ignoring an unparseable status
would be worse. The defect is that the vocabulary has no way to say what 228
means.

## Why this is filed rather than fixed

Changing 228's status is a judgment about **228's** work, not about the branch
that tripped over it. Two defensible fixes, and they are not equivalent:

1. **Rewrite 228's line to `Status: open`** and move the prose into the body.
   Cheapest, loses nothing the body cannot hold, but flattens a real
   distinction: 228 is not waiting on an engineer, it is waiting on the user.
2. **Add `blocked` to `KNOWN_STATUSES`** and give 228 `Status: blocked` with the
   prose in the body. Keeps the distinction, and gives later tickets somewhere
   to put it — but it is a vocabulary change to the tracker, which
   `docs/agents/issue-tracker.md` describes, so the doc moves with it.

Ticket 228 is itself blocked on a user decision (re-recording a fixture needs
the sim binary), so whoever answers that decision is the right person to pick.

## Bisect

Introduced before `3d64d1f`. `git log --oneline -2 --` on the ticket gives
`57350d9` and `6772904`; the prose status predates both this branch and the
work that hit it.

## Acceptance criteria

- [ ] `pnpm merge-to-dev --check-only` exits 0 on a branch with a review file
      and no other blockers.
- [ ] Whichever fix is chosen, `docs/agents/issue-tracker.md` states the
      allowed `Status:` vocabulary, so the next prose status is a review
      finding rather than a merge-time surprise.
- [ ] If `blocked` is added: `scripts/check_merge_ready.py` treats it as
      blocking or non-blocking **deliberately**, with the choice written down.
