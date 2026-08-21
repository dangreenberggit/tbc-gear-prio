Status: open
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

## Acceptance

- [ ] `data/wowsims-fork.lock.json` records the post-rebase tip and the new
      `branchedFrom`, both re-read from the clone rather than copied from here.
- [ ] The `_comment` still describes what the file means accurately.
- [ ] `pnpm verify` green.
