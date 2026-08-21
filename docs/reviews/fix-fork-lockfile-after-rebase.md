# Review — `fix/fork-lockfile-after-rebase`

Reviewed 2026-08-21. Two-field correction to `data/wowsims-fork.lock.json`,
plus closing the ticket that should never have been filed for it.

Self-reviewed. The change is small enough that a fan-out would cost more than
it returns, and the verification is mechanical: the values either match the
clone or they do not.

## Verdict

**Merge.**

## What landed

`data/wowsims-fork.lock.json` recorded the fork's pre-rebase state while
`feat/engine-pin-backend-reforge` moved the engine pin and rebased the fork onto
the new base. The one file whose job is answering "which fork commit pairs with
this repo state" gave the old answer.

Both values re-read from the clone rather than copied out of the ticket:

- `commit` `7de45ea…` → `f359239572c38af9acb24c1ee178088bfe44692c`
- `branchedFrom` `8aa378b…` → `cbf6b75a889e52c4106351976db66efd914ea349`

Verified the tip actually sits on the new base:

```
git -C vendor/tbc-new-fork merge-base --is-ancestor cbf6b75a889e52c4106351976db66efd914ea349 feat/upgrades-tab
```

`pushed: false` untouched — nothing has left the machine, and flipping that flag
is a deliberate act per plan section 1.

## Finding beyond the ticket

The `_comment` asserted _"branchedFrom is the v0.0.101 pin from
wowsims.lock.json"_. The pin move had already made that false, and ticket 248
did not notice. Updating only the two numeric fields would have left a committed
file explaining itself with a stale premise — the same defect one layer down.

Reworded to state the rule rather than name a version: _"branchedFrom is
whatever wowsims.lock.json currently pins (feature/backend-reforge as of
2026-08-21)"_. That form survives the next pin move.

## Process note, which is the durable part

Filing ticket 248 was the wrong call, and the reasoning is worth keeping.

`AGENTS.md:128` says _deferred_ findings become tickets. It governs what to do
with a finding already decided to be deferred; it does not say to defer. That
decision was never made here. The finding arrived from a reviewer at merge time,
it did not block the merge, and it went into the write-it-down pile without
anyone asking whether filing cost more than fixing. It did — two fields against
a whole ticket file.

The test applied was _"does this block the merge"_. The right test is _"is
writing the ticket more work than the fix"_. A `fixed` disposition already
existed and was used for four other findings on the same review; the vocabulary
was not missing anything.

Not proposing an `AGENTS.md` change off one instance. Recorded here so the next
review has the counter-example rather than only the rule.

## Limits

- Self-reviewed, no independent reviewer.
- The fork itself is unchanged by this branch — it only records where the fork
  already is. The fork still has never been compiled on its new base (154
  upstream commits); keep `backup/pre-reforge-rebase` until it has.

## Disposition

| ID  | Axis      | Disposition | Note                                                                                                            |
| --- | --------- | ----------- | --------------------------------------------------------------------------------------------------------------- |
| 1   | standards | fixed       | Fork lockfile records the post-rebase `commit` and `branchedFrom`, both re-read from the clone                  |
| 2   | standards | fixed       | `_comment` no longer names v0.0.101 as the base; states the rule so it survives the next pin move               |
| 3   | process   | fixed       | Ticket 248 closed as fixed rather than left open, with why filing it was wrong recorded in the ticket and above |
