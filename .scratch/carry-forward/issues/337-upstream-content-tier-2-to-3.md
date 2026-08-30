Status: open
Type: task
Origin: upstream-drift:warn during `pnpm verify` on feat/wowsims-tab-tickets, 2026-08-30; confirmed live via gh
Blocks: none
Blocked by: none

# Upstream launched content tier Phase 3; the repo is pinned to Phase 2

## The signal

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

## The work upstream's own drift message names

From `sync_wowsims.py:489-493` / `:571-574`, a tier bump requires:

1. Regenerate `data/items/index.json` and `data/gems/palette.json` for the new
   tier.
2. Curate the new tier's items into `data/pools/<spec>.json` (with `source`).
   New-tier token→piece groupings differ by tier and need Wowhead verification
   before extending `data/two-hop/*-tokens.json` (see `sync_wowsims.py:78-86`).
3. Bump `ENGINE_VERSION` (`packages/core/src/content-hash.ts:52`, currently `6`)
   to invalidate cached rankings.

## Caveats before acting

- **Reachable is not usable.** Moving the pin to a branch/newer tag has its own
  costs — `fetch_wowsimcli.py` builds a `releases/download/<tag>` URL, and prior
  tier work has hit missing vendored gear files at the new ref (see ticket 244
  and the `warn_pin_behind_watched_refs` note). Measure what actually resolves at
  `v0.0.124` before committing to it.
- This is a **multi-slice data + engine migration**, not a one-commit change. It
  wants its own plan (likely the stage-gate pipeline) and probably per-spec
  slices, mirroring how P3 ret/feral data landed.
- It is genuinely **unrelated** to any tab work; filed so the heads-up survives
  as tracked work rather than living only in a merge-time warning.
