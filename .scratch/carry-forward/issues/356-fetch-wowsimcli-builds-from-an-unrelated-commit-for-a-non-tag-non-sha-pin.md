Status: open
Type: defect
Origin: docs/reviews/feat-wowsims-reforge-catchup.md (Adversarial axis, A2)
Blocks: none
Blocked by: none

# `fetch_wowsimcli.py` builds from an unrelated commit when the pin is neither a release tag nor a sha

Relates to: ADR-0030 Decision 2; tickets 244, 354; branch `feat/wowsims-reforge-catchup`

## What

`scripts/fetch_wowsimcli.py:219-237` dispatches on the lock's `tag` field with
two guards and no third:

- `RELEASE_TAG_RE` (`^v\d+\.\d+\.\d+$`, line 50) takes the release-download path.
- `"/" in tag` returns 2, because a slash nests the vendor directory.
- **Everything else falls through to `commit = lock["commit"]` and builds.**

So a `tag` of `master`, `v0.0.119-rc1`, `latest`, or any hand-edited value
matches neither guard. The build proceeds, writing to
`vendor/wowsimcli-<tag>-<platform>` — which is exactly the directory every
consumer resolves from `lock.tag` (`cli-wiring.ts:81`,
`scripts/record_synthetic_fixtures.mjs:85`, and nine other sites found by
`grep -rn "wowsimcli-"`).

The binary is therefore **found and used**, but it was built from
`lock["commit"]`, which need not correspond to whatever `tag` names.

## Why it matters

This is the project's stated worst case in a new door: a plausible-looking
binary produces plausible-looking DPS with no error anywhere. `main.Version` is
stamped from `lock["commit"]`, so even `CliSimRunner.version()` agrees with the
lock — the mismatch is between the lock's two fields, and nothing compares them.

`sync_wowsims.py --update --ref <sha>` writes `tag` and `commit` to the same
value, so the supported path cannot produce this state. The exposure is a hand
edit or a future writer of the lock, both of which `known-traps.md` says are
invisible to every gate.

## Suggested fix

Make the dispatch total. Require the tag to be either `RELEASE_TAG_RE` or a
40-hex sha, and reject anything else with a message naming the two legal forms —
the same shape as the existing slash guard, which already proves the pattern
works.

Optionally also assert `tag == commit` on the build path when `--commit` was not
passed, since ADR-0030 Decision 1 is that a sha pin writes both fields
identically.

## Acceptance

- [ ] A `tag` that is neither `vX.Y.Z` nor a 40-hex sha exits non-zero with a
      message naming both legal forms, instead of building.
- [ ] A test covers the rejection, alongside the existing slash case.
