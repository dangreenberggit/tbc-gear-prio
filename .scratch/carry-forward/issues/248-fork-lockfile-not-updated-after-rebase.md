Status: closed
Type: defect (committed artifact contradicts a durable claim)
Origin: review of feat/engine-pin-backend-reforge, 2026-08-21
Blocks: none
Blocked by: none

# `data/wowsims-fork.lock.json` still records the pre-rebase fork state

## The finding

Ticket 244's prose states "the fork was rebased" as settled fact. The rebase did
happen — `feat/upgrades-tab` moved from `7de45ea` onto `cbf6b75`, 25 non-merge
commits replayed with zero conflicts, and an independent audit confirmed every
changed line survives byte-for-byte.

But `data/wowsims-fork.lock.json` was never updated. It still records:

```
"commit": "7de45ea080d294d04399878b3b3f0a4cbd0039b5",
"branchedFrom": "8aa378b3671a0923fd11fb34b4b3753e53f20c9b"
```

Both are the pre-rebase values. `branchedFrom` is the old v0.0.101 pin, which
this repo no longer builds from.

## Why it matters

The lockfile exists to record which fork commit pairs with this repo's state
(plan decision D1). It currently pairs the new engine pin with the old fork tip,
so the one file whose job is answering "which fork commit goes with this?" gives
the wrong answer.

This is also the exact shape `AGENTS.md`'s durable-claims rule exists to
prevent: a causal claim in committed prose that the committed artifacts do not
support. The narrative overclaimed relative to the lockfile, and the author did
not catch it — a reviewer did.

## What to do

Update `data/wowsims-fork.lock.json`:

- `commit` → the post-rebase tip (`f359239572c38af9acb24c1ee178088bfe44692c` as
  of 2026-08-21 — re-read it rather than trusting this value, the branch may
  have moved).
- `branchedFrom` → `cbf6b75a889e52c4106351976db66efd914ea349`.

Leave `pushed: false` alone. Nothing has left the machine, and flipping that
flag is a deliberate act per plan section 1.

## Resolution, 2026-08-21

Fixed rather than carried. `data/wowsims-fork.lock.json` now records the
post-rebase state, both values re-read from the clone rather than copied out of
this ticket:

- `commit` -> `f359239572c38af9acb24c1ee178088bfe44692c`
- `branchedFrom` -> `cbf6b75a889e52c4106351976db66efd914ea349`

Confirmed the tip really sits on the new base:

```
git -C vendor/tbc-new-fork merge-base --is-ancestor cbf6b75a889e52c4106351976db66efd914ea349 feat/upgrades-tab
```

`pushed: false` left alone — nothing has left the machine.

Also fixed something this ticket missed: the file's own `_comment` asserted
"branchedFrom is the v0.0.101 pin from wowsims.lock.json", which the pin move
had already made false. Reworded to state the rule (branchedFrom is whatever
`wowsims.lock.json` currently pins) rather than naming a version that goes stale
on every move.

## Why this should not have been a ticket

Filing it was the wrong call and is worth recording as the useful part.

`AGENTS.md:128` says *deferred* findings become tickets. It says what to do with
a finding already decided to be deferred; it does not say to defer. The defer
decision never actually got made here — the finding arrived from a reviewer at
merge time, it did not block the merge, and it went into the write-it-down pile
without anyone asking whether filing cost more than fixing. It did: two fields
against a whole ticket file.

The test applied was "does this block the merge". The right test is "is writing
the ticket more work than the fix". A `fixed` disposition already existed and
was used for four other findings on that branch; nothing in the vocabulary was
missing.

## Acceptance

- [x] `data/wowsims-fork.lock.json` records the post-rebase tip and the new
      `branchedFrom`, both re-read from the clone rather than copied from here.
- [x] The `_comment` still describes what the file means accurately.
- [x] `pnpm verify` green.
