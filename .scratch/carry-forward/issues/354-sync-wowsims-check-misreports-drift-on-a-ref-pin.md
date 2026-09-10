# 354 — `sync_wowsims.py --check` misreports drift on a `--ref` pin

Status: open
Opened: 2026-09-10
Blocks: none
Blocked by: none
Relates to: ADR-0030, ticket 353; branch `feat/wowsims-reforge-catchup`

## What happened

Since ADR-0030 the engine pin is a **commit sha on `feature/backend-reforge`**,
not a release tag. `do_check` was written for tag pins and compares against the
latest `master` tag unconditionally. Two distinct symptoms follow, and they need
different fixes.

## Symptom (a) — permanent "new release available", cosmetic

`do_check` calls `latest_tag()` unconditionally (`scripts/sync_wowsims.py:559`)
and compares `lock["commit"] != sha` (`:565`). A ref pin will never equal the
latest master tag, so every run prints:

```
DRIFT: new release available: ec5c5f205e61049d730e460967f8488774a7fe2a -> v0.0.134
```

Measured 2026-09-10 on the current pin. `upstream-drift:warn` is warn-only, so
this is noise rather than a failure — but a warning that always fires trains
people to ignore the one time it means something.

## Symptom (b) — the tier check reads a commit the pin will never contain

This is the real bug. Inside that same `if`, at `:566-575`, `do_check` fetches
upstream's `ui/core/constants/other.ts` **at the latest master tag** and
compares its `CURRENT_PHASE` against `lock["currentPhase"]`.

Tags are cut from `master`, and `master` is **not** an ancestor of
`feature/backend-reforge`. So the `*** CONTENT TIER CHANGED ***` line can fire
from a commit the pinned branch will never contain.

It is quiet today only by coincidence: after the tier bump both the lock and
master read `3`. The moment master moves to Phase 4, this fires against a pin
that has not moved and possibly never will.

## Suggested fix

Make both checks respect the pin's own ref:

- When `lock["tag"]` is not a `vX.Y.Z` release tag, compare against the tip of
  the ref recorded in `watchedRefs` rather than `latest_tag()`, or suppress the
  release line and report "pin is N commits behind `<watched ref>`" instead.
- Read `CURRENT_PHASE` from **the same commit the comparison is about**, never
  from an unrelated tag. A tier line sourced from a non-ancestor is worse than
  no tier line.

## Acceptance

- [ ] `--check` on a ref pin no longer prints a permanent release-drift line, or
      prints one that names the watched ref.
- [ ] The `CURRENT_PHASE` comparison reads a commit that is an ancestor of the
      pin's own ref.
- [ ] A test covers a ref pin whose watched branch and latest master tag
      disagree on `CURRENT_PHASE`.
