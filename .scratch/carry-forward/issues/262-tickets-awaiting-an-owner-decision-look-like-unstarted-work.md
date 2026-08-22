Status: open
Type: defect (tracker — a queue with no label)
Origin: owner question during the 2026-08-22 merge, "does ticket 257 know there's
  no bug found or were we about to just leave that hanging"
Blocks: none
Blocked by: none

# Tickets waiting on an owner decision are indistinguishable from unstarted work

## The finding

Seven open tickets are fully investigated, have a recommendation, and are waiting
on nothing but a decision from the owner. `pnpm issues:open` shows every one of
them as plain `open`, identical to a ticket nobody has looked at:

```
grep -l "left to the owner\|owner's call\|owner ruling\|needs a ruling" .scratch/carry-forward/issues/*.md | wc -l
```

→ 7: **117, 118, 119, 122, 222, 227, 257**.

All of them say `Blocked by: none`, which is false in the sense that matters —
each is blocked, on a person.

## Why this is worth fixing rather than shrugging at

The work is not lost: 257 in particular records its investigation, its
measurements and its recommendation in the file, so a fresh session picking it up
would not redo the analysis. That was the owner's specific worry and it does not
hold.

What is real is subtler. **A decision queue with no label is a queue nobody
empties.** The only reason 257 surfaced today is that it was mentioned in chat
twice; ticket 227's ruling has been outstanding since 2026-08-20, and 117/118/119
longer than that. An agent picking up "the next open ticket" cannot tell which of
these it is allowed to act on and which are waiting for a human, so it either
stalls on all of them or acts on one it should not have.

It also distorts the count. `pnpm issues:open` is the number a reader treats as
"work remaining"; seven of those entries are not work, they are questions.

## The vocabulary already exists

`scripts/check_merge_ready.py:62` —
`KNOWN_STATUSES = ("open", "claimed", "blocked", "closed", "resolved", "wontfix")`.
`blocked` is supported and unused for this case, and `Blocked by:` is a parsed
field. Nothing needs building; the convention needs deciding and writing down.

## Not established

- Whether `Status: blocked` + `Blocked by: owner decision` is the right shape, or
  whether a distinct status reads better in the listing. **Untested** — no one has
  tried either.
- Whether `check_merge_ready.py` should separate the two in its output, or whether
  a convention in `docs/agents/issue-tracker.md` is enough. The script already
  groups by status, so it may be free.
- Whether any of the seven should simply be decided and closed instead, which
  would shrink the problem before solving it.

## Acceptance

- [ ] A convention is chosen and written into `docs/agents/issue-tracker.md` for a
      ticket that is investigated and waiting on a human.
- [ ] The seven existing tickets are converted to it, or explicitly ruled to stay
      as they are.
- [ ] `pnpm issues:open` distinguishes them from unstarted work — by status,
      grouping, or a column — so the count means what a reader assumes.
