Status: open
Type: bug (merge gate refuses every branch)
Origin: `feat/seed-overlap` pre-merge review, 2026-08-19 — hit running
  `pnpm merge-to-dev --check-only`
Blocks: none
Blocked by: none

**Blocks in practice:** any merge through `pnpm merge-to-dev`, which is
advisory-free prose rather than a `Blocks:` value because the field is
parsed.

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
      and no other blockers. **Not yet run** — deferred to this branch's final
      verification, where the tree is clean. `python scripts/check_merge_ready.py`
      exits 0 as of this commit; that is the gate `--check-only` calls, but it is
      not the box, so the box stays unchecked until the real command is observed.
- [x] Whichever fix is chosen, `docs/agents/issue-tracker.md` states the
      allowed `Status:` vocabulary, so the next prose status is a review
      finding rather than a merge-time surprise. Done: the doc now lists all
      six words and says an unreadable status is an error.
- [x] If `blocked` is added: `scripts/check_merge_ready.py` treats it as
      blocking or non-blocking **deliberately**, with the choice written down.
      Done — see Decision.

## Decision, 2026-08-20 — fix 2, and `blocked` is *not* a merge veto

Fix 2 was chosen: `blocked` joins `KNOWN_STATUSES`, and 228's line becomes a
plain `Status: blocked` with its prose moved into 228's body. Fix 1 would have
flattened a real distinction — 228 waits on the user, not on an engineer.

`blocked` is a **sub-state of open**, treated identically to `open` in every
scan. The script now has `OPEN_STATUSES = ("open", "claimed", "blocked")` and all
four filter sites use it, so a blocked ticket still appears in `pnpm issues:open`,
still gates phase merges through its `Blocks:` line, and can still be a review
`defer` target.

Why not make `blocked` mean "cannot merge": merge-veto power already lives in the
`Blocks:` field. Encoding it in the status word too would double-encode one fact
in two fields that can disagree. And why not hide `blocked` from the open list:
invisibility is this tracker's documented failure mode (85, 88/89, 147) — 228's
and 227's blockage is an owner decision inside this repo, which the owner finds
by reading the open list.

Unparseable statuses stay an error, as `1f03344` made them deliberately. Re-run:
`python -c "import sys; sys.path.insert(0,'scripts'); import check_merge_ready as m; print(m.unparseable_status_tickets())"`
→ `[]` (observed 2026-08-20). `python scripts/check_merge_ready.py --self-test`
→ `ok (19 checks)`, two of them new: `blocked` parses and scans as open, and a
bold status *value* (`Status: **blocked**`) survives the phase-gate membership
test — that site read the raw regex group without the strip `read_status`
applies, so it would have silently dropped such a ticket (plan review F9).
