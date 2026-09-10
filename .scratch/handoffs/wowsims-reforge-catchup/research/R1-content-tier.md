# R1 — Content tier: did it move 2 → 3, and on which refs?

## 1. Which ref does `--check` actually read?

`scripts/sync_wowsims.py`'s `do_check()` (line ~556) calls `latest_tag()`
(line 266), which hits `gh api repos/{REPO}/tags --jq '.[0]...'` — the newest
**tag**, not any branch. It then fetches `TRACKED["constants_other.ts"]`
(`ui/core/constants/other.ts`) at that tag's sha (`sync_wowsims.py:569`) and
parses it with `parse_current_phase()` (`sync_wowsims.py:291-305`, matches
`CURRENT_PHASE: Phase = Phase.PhaseN`).

So the `*** CONTENT TIER CHANGED ***` drift line (`sync_wowsims.py:571-574`)
is strictly a **latest-tag-vs-pinned-tag** signal. It says nothing about
`feature/backend-reforge` on its own — that's a separate `watchedRefs` check
a few lines below (`sync_wowsims.py:585-598`) that only compares commit shas,
never re-parses `CURRENT_PHASE` for the watched ref.

## 2. Our pin

`data/wowsims.lock.json`: `tag: "v0.0.119"`, `commit: 3267f8dfa4a20746d4982c1522fdec1d4eb77f4c`,
`currentPhase: 2`, `defaultMaxPhase: 2`. `watchedRefs["feature/backend-reforge"].commit = cbf6b75a889e...`
(stale vs. the branch's live tip, per PROCESS.md's separate branch-drift axis — not this worker's job).

## 3. Literal `CURRENT_PHASE` at the three refs

Commands run (via `gh api .../contents/<path>?ref=<sha>`, base64-decoded):

```
gh api repos/wowsims/tbc-new/contents/ui/core/constants/other.ts?ref=3267f8dfa4a20746d4982c1522fdec1d4eb77f4c --jq '.content' | base64 -d
gh api repos/wowsims/tbc-new/contents/ui/core/constants/other.ts?ref=ec5c5f205e61 --jq '.content' | base64 -d
gh api repos/wowsims/tbc-new/contents/ui/core/constants/other.ts?ref=72e0c8a8feaf --jq '.content' | base64 -d
```

| Ref | Sha | `CURRENT_PHASE` literal |
| --- | --- | --- |
| our pin | `3267f8dfa4a2` | `Phase.Phase2` |
| `feature/backend-reforge` tip | `ec5c5f205e61` | `Phase.Phase3` |
| `master` tip / `v0.0.134` | `72e0c8a8feaf` | `Phase.Phase3` |

Confirmed: both non-pinned refs read `Phase3`. The tier **has** moved upstream
relative to our pin, on both refs asked about — this reproduces the prior
agent's number, now with commands attached.

## 4. Which commit(s) changed it, and are they ancestors of both branches?

`gh api "repos/wowsims/tbc-new/commits?path=ui/core/constants/other.ts&sha=<branch>&per_page=10"`
against both `master` and `feature/backend-reforge` returns the **identical**
commit list for this file, most recent first:

```
33617c607a50  2026-08-30  Default Phase 3 EP weights and phase-scaled debuffs
50559db2c2a8  2026-05-20  [UI] Move everything to phase 2 by default
...
```

`33617c607a50` is the Phase2→Phase3 bump.

Ancestry check — done by adding a temporary remote pointed at true upstream
(`https://github.com/wowsims/tbc-new.git`, name `trueupstream`) to the
gitignored fork checkout, fetching `master` and `feature/backend-reforge`,
confirming their tips (`72e0c8a8feaf...` and `ec5c5f205e61...`) match the shas
named in the task, then:

```
git -C vendor/tbc-new-fork merge-base --is-ancestor 33617c607a50 trueupstream/feature/backend-reforge
git -C vendor/tbc-new-fork merge-base --is-ancestor 33617c607a50 trueupstream/master
```

Both exit 0 — **`33617c607a50` is an ancestor of both `master` and
`feature/backend-reforge`.** The temporary `trueupstream` remote was removed
afterward (`git remote remove trueupstream`); `vendor/tbc-new-fork` now has
only `origin` (`dangreenberggit/tbc-new`), unchanged from before this task.

Note: the fork's own `origin` remotes for `master`/`feature/backend-reforge`
were stale relative to true upstream at the start of this check (a fork-lag
fact, not part of this question) — hence fetching from `wowsims/tbc-new`
directly rather than trusting `origin`'s cached refs.

## 5. What `pools, gem palette and engineVersion` names, by path

| Named in drift message | Repo path(s) |
| --- | --- |
| pools / universe | `scripts/assemble_universe.py`, `scripts/sync_fork_universes.py`, `scripts/list_phase_pool.py`, `packages/core/src/pool.ts` |
| gem palette | `packages/core/src/candidate-gems.ts`, `packages/core/src/gems.ts` (consumed by `packages/core/src/rank.ts`) |
| engineVersion | `packages/core/src/content-hash.ts:52` — `export const ENGINE_VERSION = 6;` — read into rank output at `packages/core/src/rank.ts:774` (`engineVersion: ENGINE_VERSION`). `sync_wowsims.py:493` also prints "bump engineVersion to invalidate cached rankings" as a manual runbook step, not something the script does for you. |

## 6. Is the p3 gear data already vendored, so is this a *data* or *default* move?

`TRACKED` (`sync_wowsims.py:99` on) already lists, and `data/wowsims.lock.json`
already carries checksums+bytes for, p3 gear sets across every curated spec
that has one: `ret_p3.gear.json`, `feral_p3_6p/9p.gear.json`,
`balance_p3.gear.json`, `ele_p3.gear.json`, `enh_p3.gear.json`,
`shadow_p3.gear.json`, `rogue_p3.gear.json`, plus warrior/hunter/mage/warlock
p3 variants under their tier-named or phase_3 paths — all present in the lock
file's `files` map today, at our *pinned* commit. So the p3 **data** is
already vendored; a tier bump does not require fetching new gear-set files.

`DEFAULT_MAX_PHASE` is not a second hardcoded constant anywhere in
`packages/` — `grep -rn "DEFAULT_MAX_PHASE" packages/` finds it only in a
comment at `packages/core/src/cli.ts:44` ("DEFAULT_MAX_PHASE from the wowsims
lock — never a second hardcoded tier") pointing at
`defaultMaxPhaseFromLock()` → `defaultMaxPhase(root)`, which reads
`lock["currentPhase"]`/`lock["defaultMaxPhase"]` from `data/wowsims.lock.json`
directly.

So: the **gear-set files** needed for a bump to tier 3 are already present at
the current pin (this is a *default* move, not a *data* move, for those
paths). What is **not** yet updated for tier 3 is everything the drift
message actually warns about — the candidate pool/universe (regenerated by
`assemble_universe.py`/`sync_fork_universes.py`, which consumes `db.json` and
phase config, not just gear-set files), the gem palette derivation, and
`ENGINE_VERSION` bump to invalidate cached rankings. Those are downstream
*consumers* of the lock's `currentPhase`/`db.json`, not additional vendored
files to fetch — but they do require running generators and bumping a
constant, which is real engineering work, just not a `TRACKED`-file fetch.

## VERDICT

**Tier moved.** Upstream's `CURRENT_PHASE` is `Phase3` at both
`feature/backend-reforge` tip (`ec5c5f205e61`) and `master` tip / `v0.0.134`
(`72e0c8a8feaf`), vs. our pinned `Phase2` (`3267f8dfa4a2`). The bump commit
`33617c607a50` is a common ancestor of both branches (confirmed via
`merge-base --is-ancestor` against true upstream, not the lagging fork
remote).

**Data-or-default: mostly a *default* move, not a *data* move.** The p3
curated gear-set files for every affected spec are already vendored and
pinned in `data/wowsims.lock.json` at the current commit — bumping
`currentPhase`/`defaultMaxPhase` to 3 does not require fetching new
`TRACKED` files. It does require separate, non-`TRACKED` engineering work:
regenerating the candidate pool/universe (`scripts/assemble_universe.py`,
`scripts/sync_fork_universes.py`), reviewing the gem palette
(`packages/core/src/candidate-gems.ts`, `gems.ts`), and bumping
`ENGINE_VERSION` (`packages/core/src/content-hash.ts:52`) to invalidate
cached rankings — exactly the three items `sync_wowsims.py:571-574` names.
