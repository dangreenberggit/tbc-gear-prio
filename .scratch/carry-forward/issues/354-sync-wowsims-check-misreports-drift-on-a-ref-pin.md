# 354 — `sync_wowsims.py --check` misreports drift on a `--ref` pin

Status: closed

Closed 2026-09-14 by commit `50409987` on `feat/upstream-catchup-chunk1`
(ADR-0033 Decision 3). `do_check` now takes a sha-pin branch: it compares against
the first `watchedRefs` entry rather than `latest_tag()`, reads `CURRENT_PHASE`
from **that** tip, and prints the release tag only as an informational line so the
ADR-0030 tag trigger stays visible. An unresolvable first watched ref appends
drift instead of raising. `--unwatch-ref` was added in the same commit, because
`--watch-ref` was a keyed upsert and nothing could remove the branch upstream
deleted.

Verified with:

- `python scripts/check_sync_wowsims.py; echo rc=$?` → **rc 0**,
  `sync_wowsims.py guard rails ok (21 checks)` — 17 pre-existing plus the four new
  ones: `check_sha_pin_compares_against_its_watched_ref`,
  `check_sha_pin_in_sync_with_watched_ref_is_clean`,
  `check_sha_pin_survives_an_unresolvable_watched_ref`,
  `check_unwatch_ref_removes_the_key_and_refuses_an_absent_one`.
- `python scripts/sync_wowsims.py --check; echo rc=$?` → **rc 0**, printing
  `in sync.` with `latest release: v0.0.137 (17a8fb28c5ad) -- informational on a
  sha pin` and no `DRIFT:` line. Before the pin moved, the same command showed the
  new comparison naming the dead ref rather than reporting a phantom release.
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
- [x] A test covers a ref pin whose watched branch and latest master tag
      disagree on `CURRENT_PHASE`. Satisfied 2026-09-14 by
      `check_sha_pin_tier_change_is_read_from_the_watched_ref` (ticket 391) —
      when this ticket closed, the harness stubbed both sources to one sha and
      could not express the case.
