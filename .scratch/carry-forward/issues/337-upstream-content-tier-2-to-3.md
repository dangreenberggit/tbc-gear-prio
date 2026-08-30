Status: blocked (owner decision 2026-08-30: stay Phase 2 until reforge reaches Phase 3)
Type: task
Origin: upstream-drift:warn during `pnpm verify` on feat/wowsims-tab-tickets, 2026-08-30; confirmed live via gh
Blocks: none
Blocked by: `feature/backend-reforge` reaching Phase 3 (see Decision); relates 251, 263

# Content tier Phase 3 exists upstream; we stay Phase 2 until our PR target does

## Decision (owner, 2026-08-30)

**Keep the tab on Phase 2. Do not pull Phase-3 content into the upgrades-tab PR.**
The PR targets `feature/backend-reforge`, which is **still Phase 2** at its tip
(`CURRENT_PHASE = Phase.Phase2`, `ui/core/constants/other.ts:13`, read live
2026-08-30). Phase 3 lives on `master`, and reforge is 20 commits behind master
(diverged, 61 ahead / 20 behind) — it has not absorbed Phase 3 yet.

So a Phase-2 tab is **correct** for this PR, not a compromise. Pulling Phase-3
content in would mean shipping master's versions of the ~60 db/engine files
reforge has independently rewritten and not yet reconciled with master — which
breaks when the PR merges into reforge. That reconciliation (merging master into
reforge, resolving the generated `db.json`/`.bin` + `sim/core` collision) is
**upstream's to do on the reforge branch**, via PR #385 (`backend-reforge` →
`master`) or a keep-up-to-date merge — not gear-prio's, and not this PR's.

**The trigger:** when `feature/backend-reforge` itself flips to Phase 3, that is
gear-prio's cue to re-pin and do the migration below. This is the same
"one wowsims repo, one branch" state tickets 251 and 263 are parked on.

## The signal (what surfaced this)

`pnpm verify`'s last step (`upstream-drift:warn` → `scripts/warn_upstream_drift.py`
→ `sync_wowsims.py --check`) reported a content-tier change. It is warning-only
and does **not** fail the build (`warn_upstream_drift.py` always exits 0), so it
did not block the wowsims-tab-tickets merge — but it is a real, sizable heads-up.

## What is measured (live, 2026-08-30)

Confirmed against upstream `wowsims/tbc-new` via `gh`, not recalled:

- Repo pin: `data/wowsims.lock.json` `tag: v0.0.119` (`3267f8dfa4a2`),
  `currentPhase: 2`.
- Upstream latest tag: **`v0.0.124`** (`7963eeac179e`) — 5 releases ahead.
- `ui/core/constants/other.ts:13` `CURRENT_PHASE`:
  - at our pin `3267f8df`: `Phase.Phase2`
  - at upstream `7963eeac`: **`Phase.Phase3`**
    (`gh api repos/wowsims/tbc-new/contents/ui/core/constants/other.ts?ref=<sha>`
    → base64-decode → grep `CURRENT_PHASE`).

So the tier change is real, not a parse artifact. `CURRENT_PHASE` is the single
source of `DEFAULT_MAX_PHASE` (PLAN.md §1.1) and drives every ranking's candidate
pool and gem palette.

## The migration work — when the trigger fires (reforge reaches Phase 3)

**Start from the seam map:** [`docs/fork-phase-seams.md`](../../../docs/fork-phase-seams.md)
inventories every joint in our fork code where phase is read, clamped, or shipped
as data — the checklist for upgrading the fork/tab. It was measured 2026-08-30 and
confirms our fork forces nothing Phase-3-specific today (all p3+ data is bundled
but gated behind `<= maxPhase`, which follows upstream's `CURRENT_PHASE`).

From `sync_wowsims.py:489-493` / `:571-574`, a tier bump requires:

1. Regenerate `data/items/index.json` and `data/gems/palette.json` for the new
   tier.
2. Curate the new tier's items into `data/pools/<spec>.json` (with `source`).
   New-tier token→piece groupings differ by tier and need Wowhead verification
   before extending `data/two-hop/*-tokens.json` (see `sync_wowsims.py:78-86`).
3. Bump `ENGINE_VERSION` (`packages/core/src/content-hash.ts:52`, currently `6`)
   to invalidate cached rankings.

This is a **multi-slice data + engine migration**, not a one-commit change — it
wants its own plan (likely the stage-gate pipeline) and probably per-spec slices,
mirroring how P3 ret/feral data landed. Do not start it before the trigger.

## Caveat when the time comes

**Reachable is not usable.** Re-pinning onto whatever ref carries Phase 3 has its
own costs — `fetch_wowsimcli.py` builds a `releases/download/<tag>` URL, and prior
tier work has hit missing vendored gear files at a new ref (see ticket 244 and the
`warn_pin_behind_watched_refs` note). Measure what actually resolves at the target
ref before committing to it.
