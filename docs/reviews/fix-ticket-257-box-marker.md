# Pre-merge review — `fix/ticket-257-box-marker`

Reviewed range: `5bc7fb3be96b9e368c4c80ed301a6fec456a4083..6cb875807b49775714e5c5963df6f3511160a77d`

**Self-reviewed, no fan-out.** One commit, three files, all of them tracker
documents — no production code, no data, no generated artifact. A three-axis
review would cost more than it can return on a checkbox marker and a new ticket,
and the verification is mechanical: the box either matches its own text or it does
not. Labelled here rather than left implicit, per the skill's step 2.

## What landed

**Ticket 257's third acceptance box was ticked `[x]` while its own text read "Not
done, deliberately."** A tick means the criterion was met; this one meant it was
refused. The pre-merge review of `fix/worn-item-pool-coverage` flagged exactly
this (finding Sp3's neighbour, in the ticket-257 paragraph) and it went unfixed
when that branch merged.

Now `[~]`, with the reasoning inline: the measurement shows no second contributor
to the head-slot warning — shredzepelin's baseline is socketless Wolfshead Helm,
so no meta was repaired on either side, and the head gap is ~208 DPS against a
best-in-run upgrade of 57 — so naming the empty meta socket as a cause would have
written a false explanation into the product to satisfy a checkbox.

**Ticket 262 filed**, from an owner question: whether 257 was "hanging and lost
and needing to be redone". It is not — the header, the type line and the
investigation section all record its state. But checking that surfaced a real
defect one level up: **seven open tickets are fully investigated and waiting only
on an owner decision, and the tracker shows every one as plain `open`**,
indistinguishable from unstarted work. All declare `Blocked by: none`.

## Verification

```
grep -n '^- \[' .scratch/carry-forward/issues/257-*.md          # box 3 reads [~]
grep -l "left to the owner\|owner's call\|owner ruling\|needs a ruling" \
  .scratch/carry-forward/issues/*.md | wc -l                     # 7
grep -n KNOWN_STATUSES scripts/check_merge_ready.py              # 'blocked' already supported
git log -p 5bc7fb3..HEAD -- .scratch/carry-forward/issues/NEXT   # bumped in the same commit as 262
```

`pnpm verify` exit 0. `NEXT` bumped 262→263 in the same commit as the ticket it
allocated, per `docs/agents/issue-tracker.md` — the rule ticket 252 breached.

## Limits

- **Self-reviewed**, so no independent reader checked the reasoning on 262's
  framing. The claim that seven tickets await a decision is a `grep` anyone can
  re-run; the judgement that this is worth a ticket is mine alone.
- **262 proposes nothing.** It names the problem, notes that `blocked` already
  exists in `KNOWN_STATUSES`, and marks the shape of the fix **untested** — no
  convention has been tried. It is deliberately a question, not a plan.
- The seven tickets are **not** converted here. Doing that is 262's work and needs
  the convention decided first.

## Disposition

| ID  | Axis | Disposition | Ticket / note                                                                                                                                                                      |
| --- | ---- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Z1  | Self | fixed       | Ticket 257's box 3 remarked `[~]` with the refusal reasoning stated.                                                                                                               |
| Z2  | Self | defer       | Owner-blocked tickets are indistinguishable from unstarted work in the tracker. `.scratch/carry-forward/issues/262-tickets-awaiting-an-owner-decision-look-like-unstarted-work.md` |

No finding blocks the merge.
