# ADR-0030 — Build from `feature/backend-reforge` on both pins

**Status:** accepted; Decision 1 Superseded by [ADR-0033](0033-upstream-is-master-again.md) on 2026-09-14, Decision 2 kept
**Date:** 2026-09-10
**Related:** [`ADR-0025`](0025-upstream-has-a-gem-optimizer-we-stay-pinned-and-borrow-only-its-rules.md) (Decision 1 superseded here), [`ADR-0027`](0027-the-wowsims-upgrades-tab-is-the-primary-product.md), `PLAN.md` §8, §9; tickets `.scratch/carry-forward/issues/251-fork-base-no-longer-matches-the-engine-pin.md` (closed here), `263-derive-meta-preferences-once-upstream-is-one-repo-one-branch.md` (unblocked here), `337-upstream-content-tier-moved-2-to-3.md` (closed here)

## Context

This repo pinned upstream `wowsims/tbc-new` twice, at two different points:

- The **engine pin**, `data/wowsims.lock.json` → `vendor/wowsims/`, a flat file
  snapshot (`db.json`, gear presets, protos) that this repo's TypeScript ranking
  engine reads. It sat on release tag `v0.0.119` and only _watched_
  `feature/backend-reforge`.
- The **fork pin**, `data/wowsims-fork.lock.json` → `vendor/tbc-new-fork/`, a
  full engine+UI checkout on branch `feat/upgrades-tab`, which the Upgrades tab
  builds from. Its history descended from `feature/backend-reforge` and not from
  the engine pin.

So the tab and `pnpm rank` ran different engines. Measured 2026-09-09: the
engine pin was 153 commits behind the branch tip `ec5c5f2`, a clean ancestor;
the fork was 126 ahead and 121 behind it, merge-base `cbf6b75a889e`.

Upstream's active development for this content lives on that branch, not on the
tags cut from `master`. Tags therefore do not carry the work this project needs,
and the two pins had no single commit they agreed on.

The owner's decision at Gate 1 was that the engine is the same on both sides, in
practice `feature/backend-reforge` — not a tagged release, and not the
repo-in-general. That decision falsifies ADR-0025's Decision 1, which is why
this record exists.

## Decision

### 1. Both pins name the same commit on `feature/backend-reforge`

`data/wowsims.lock.json` and `data/wowsims-fork.lock.json` both name
`ec5c5f205e61049d730e460967f8488774a7fe2a`. The fork reaches it by a merge
commit (`git merge --no-ff` of the sha into `feat/upgrades-tab`), so
`branchedFrom` is its merge-base with upstream.

The engine pin is a **commit sha, not a branch name**, written with
`python scripts/sync_wowsims.py --update --ref <sha>`. A branch name contains a
`/`, and `cli-wiring.ts:81` and `fetch_wowsimcli.py` build
`vendor/wowsimcli-<tag>-<platform>` from the raw `tag` field, so a slash nests
the vendor directory. That bit a previous pin move for real
(`docs/reviews/feat-engine-pin-backend-reforge.md` § finding 2). The branch name
lives in `watchedRefs` instead, refreshed with `--watch-ref --ref <branch>` —
a separate, load-bearing command, because `--update` carries the previous
`watchedRefs` forward unchanged (`sync_wowsims.py:466-471`).

Merging the sha rather than the branch name means the fork and the engine pin
land on the identical commit even if the branch moves mid-execution.

### 2. The `wowsimcli` binary is built from source

GitHub release assets exist for tags only, so a sha pin has no downloadable
binary. `scripts/fetch_wowsimcli.py` keeps the release-download path for a
`vX.Y.Z` tag, refuses a tag containing `/` with a message naming the fix, and
otherwise builds from source at `lock["commit"]`.

The recipe, recorded here because reproduction breaks if any one part is
omitted:

- Commit: `ec5c5f205e61049d730e460967f8488774a7fe2a`
- protoc step:
  `protoc -I=./proto --go_opt=Mgoogle/protobuf/descriptor.proto=google.golang.org/protobuf/types/descriptorpb --go_out=./sim/core ./proto/*.proto`
- Build, in `cmd/wowsimcli`:
  `go build -trimpath -o <binary> --tags=with_db -ldflags="-X 'main.Version=<commit>' -s -w"`,
  with `GOOS`/`GOARCH` from the `--platform` table and `GOAMD64=v2`
- `main.Version` = the full commit sha, so `CliSimRunner.version()` matches
  `lock.commit`
- sha256 (windows/amd64):
  `fb4b9769e397dd1892464060078d165c221415406ad3e89ce70f73d2da3f8a24`,
  22,340,608 bytes

`-trimpath` is what makes the build byte-reproducible: without it the binary
embeds absolute paths and two clones at different path depths differ. Two builds
at this commit produced the identical sha256 above.

### 3. Re-pin procedure

1. Ensure `fetch_wowsimcli.py` can produce the binary for the target ref, and
   prove it before the pin moves (`--commit <sha> --tag-dir <sha>`, twice,
   comparing sha256).
2. `sync_wowsims.py --update --ref <sha>`, then
   `--watch-ref --ref feature/backend-reforge`. Predict the artifact list before
   regenerating; every unpredicted path is a finding. Then `fetch_protos.py`,
   `pnpm proto:generate`, the db-derived artifacts, and the universes.
3. Merge the same sha into the fork's `feat/upgrades-tab`, re-pin
   `data/wowsims-fork.lock.json` to the merge commit, and re-derive every
   fork-derived artifact (`sim-implemented-effects`, `equip-eligibility`,
   `ep-presets`, `meta-conditions`, `fork-universes`).
4. If `CURRENT_PHASE` moved, bump `ENGINE_VERSION` in
   `packages/core/src/content-hash.ts` and update `PLAN.md`'s content-tier row.

### 4. What this supersedes in ADR-0025

ADR-0025 Decision 1 ("stay pinned to a release tag") is superseded: the pin is a
commit on a development branch. The "watched, not built from" half of its
Decision 5 is superseded too — this repo now builds from the watched branch.

**Decisions 2–4 of ADR-0025 stand.** They are findings about upstream's gem
optimizer and its socket-bonus rules, and nothing here falsifies them. Its
"as of v0.0.101" stamps also stand: they date the findings and are true as
history.

## Consequences

1. **`sync_wowsims.py --check` reports "new release available" permanently.**
   `do_check` compares the pin against the latest `master` tag unconditionally,
   so a ref pin always looks behind. Warn-only and cosmetic. Ticket 354 covers
   this and its second-order effect: the same branch re-reads `CURRENT_PHASE`
   from the latest **master tag**, which is not an ancestor of
   `feature/backend-reforge`, so a future master tier bump would fire a
   `*** CONTENT TIER CHANGED ***` line sourced from a commit this pin will never
   contain.

2. **The fork tab's content tier follows the branch, not this repo's default.**
   The tab reads upstream's `CURRENT_PHASE` live (`docs/fork-phase-seams.md` §1),
   so it moves the moment the fork merge lands, whereas `pnpm rank`'s default
   comes from `lock["defaultMaxPhase"]`. The two can disagree between commits.

3. **`pnpm fetch:wowsimcli` now hard-fails without go + protoc + protoc-gen-go**,
   where it previously downloaded a zip. This is a real loss of fresh-clone
   ergonomics for any future contributor or any worktree on another machine, and
   it is invisible to CI **precisely because** CI never runs `fetch:wowsimcli`
   (`.github/workflows/verify.yml` has no such step, and the only
   binary-dependent test skips when the binary is absent). It needs no solving
   while the owner is the only user, but nothing was gained for free here.

4. **A fresh machine cannot rebuild the fork, and this decision widens what
   depends on that.** `data/wowsims-fork.lock.json` carries `"pushed": false`:
   `feat/upgrades-tab` exists on exactly one machine. This decision puts a merge
   commit on it, and what is now downstream of that unpushed commit is concrete:
   the `sim_header.tsx` conflict resolution exists nowhere else, and this repo's
   committed `data/sim-implemented-effects.json` — and any future
   `equip-eligibility.json` movement — are **derived from it**. If that disk
   dies, those committed artifacts become unre-derivable and their gates exit 2
   forever with no path back. The _class_ of this limitation predates this
   decision; this specific escalation does not, which is why it is recorded here
   rather than only in a scratch plan. Ticket 355 tracks pushing or archiving the
   branch.
