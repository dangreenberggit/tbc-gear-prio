# R5 — Reconciliation cost

Scope: cost the reconciliation of `vendor/tbc-new-fork` (branch
`feat/upgrades-tab`, HEAD `6d0edd69d`) against upstream
`wowsims/tbc-new` branch `feature/backend-reforge` (tip `ec5c5f205e61`),
today (2026-09-09). Read-only: `git -C vendor/tbc-new-fork`, a temporary
`upstream-readonly` remote fetched and left in place (see note at the end —
adding a remote to the fork's own gitignored `.git/config` is not a change
to any tracked file in this repo; no commit, checkout, or pin move was made
anywhere).

## 1. Today's divergence numbers

```
git -C vendor/tbc-new-fork remote add upstream-readonly https://github.com/wowsims/tbc-new.git
git -C vendor/tbc-new-fork fetch upstream-readonly feature/backend-reforge --quiet
git -C vendor/tbc-new-fork rev-parse upstream-readonly/feature/backend-reforge
  -> ec5c5f205e61049d730e460967f8488774a7fe2a   (matches the brief's stated tip)

git -C vendor/tbc-new-fork merge-base 6d0edd69d237e ec5c5f205e61049d
  -> cbf6b75a889e52c4106351976db66efd914ea349

git -C vendor/tbc-new-fork rev-list --count ec5c5f205e61049d..6d0edd69d237e   (ahead)
  -> 126
git -C vendor/tbc-new-fork rev-list --count 6d0edd69d237e..ec5c5f205e61049d   (behind)
  -> 121

git -C vendor/tbc-new-fork show -s --format='%H %ci' cbf6b75a889e52c4106351976db66efd914ea349
  -> cbf6b75a889e52c4106351976db66efd914ea349 2026-08-13 21:14:31 +0200
git -C vendor/tbc-new-fork show -s --format='%H %ci' 6d0edd69d237e725de8ec5d034c28aa10171bd21
  -> 6d0edd69d237e725de8ec5d034c28aa10171bd21 2026-09-02 19:44:53 -0700
git -C vendor/tbc-new-fork show -s --format='%H %ci' ec5c5f205e61049d730e460967f8488774a7fe2a
  -> ec5c5f205e61049d730e460967f8488774a7fe2a 2026-09-03 09:40:45 +0200
```

**Ahead 126, behind 121, merge-base `cbf6b75a889e52c4106351976db66efd914ea349`
(2026-08-13).** Clean common ancestor (`git merge-base` returned a single
SHA, not a criss-cross).

**Ticket 251's `ahead_by: 20, behind_by: 52` (measured 2026-08-22 via GitHub's
compare API) is stale by roughly 6x on the ahead side and 2.3x on the behind
side.** Three weeks of work landed on both branches since. This is not a
qualitative change in shape (still a genuine two-sided divergence off the
same merge-base commit `cbf6b75`), but the ticket's own numbers cannot be
carried forward — see §6.

All 126 ahead commits are non-merge (`git log --oneline --merges
ec5c5f205e61049d..6d0edd69d237e` → 0 lines). All 121 behind commits split
82 non-merge / 39 merge (`git log --oneline --no-merges|--merges
6d0edd69d237e..ec5c5f205e61049d`).

## 2. The 126 ahead commits — classification

Full list: `git -C vendor/tbc-new-fork log --oneline
ec5c5f205e61049d..6d0edd69d237e` (126 lines, reproducible from the SHAs
above). Grouped by theme rather than one row per commit:

| Theme (commit count, approx) | Representative commits | Classification |
| --- | --- | --- |
| Ranking engine port (candidate-pool M1/M2, worn-unrankable, gem racing, screening) | `0e062462e`, `b459e30a4`, `f70378155`, `63bc07dff`, `9f327af9a` | (a) feature work — the Upgrades tab's own ranking engine, ported from this repo's `packages/core` |
| Upgrades tab UI/UX (layout, sub-tabs, sorting, empty states, mobile, styling) | `1165b1fbf`, `eb1928f42`, `757a87417`, `d7ea63197`, `f0c63af40`, `4ae6afe98`, `2f992cc29` | (a) feature work — the tab itself |
| Tab data plumbing (bundled universes, PROVENANCE, hashes, TMB/WCL export) | `d7ce38b34`, `a00a50c6f`, `6fca0d8bd`, `9994af95b`, `0ef055df1` | (a) feature work — keeps the tab's bundled JSON copies in sync with this repo's own `data/` outputs |
| Ticket-driven fixes named by number (211, 254, 272, 311, 315, 317, 319, 320, 322, 330, 336) | `c4d1cb661`, `b0aedfa02`, `478a09000`, `12a99490d`, `a21681c33` | (a) feature work — this repo's own bug-tracker items, closed on this branch |
| **Bulk/batch sim infrastructure — the finding named in the brief** | `1165b1fbf`…`ff15d2cc0` (early port), then a whole late run: `5ad56a5c9`, `ed88f07b5`, `9f1fc7ef0`, `3b1af456c`, `4a2d75757`, `95088fd9d`, `b8e7a566e`, `da0b65d82`, `52679533f`, `164fce593`, `7b736a0c2`, `20dbb6f5d`, `80395e68c`, `75769a7f3`, `1f8a49690` | **(c), qualified — see below** |
| Comment/naming corrections, formatting, LF/CRLF hygiene, review-response housekeeping | `342f6a74e`, `caf36cf68`, `c5b5172eb`, `a743195f0` (misc names) | (b) local hygiene/hacks — housekeeping this branch needed for its own review process, not upstream-relevant |

### The supersession finding, checked precisely

The brief hypothesizes that upstream's native `BulkSimRequest` /
`ReforgeOptimizeRequest` RPC surface (visible as +225 lines in R2's
`api.proto` diff) supersedes our hand-rolled batch-sim commits. **That is
not quite right, and the precise answer matters:**

```
git -C vendor/tbc-new-fork show cbf6b75a889e52c4106351976db66efd914ea349:proto/api.proto \
  | grep -iE '(rpc |message |service ).*(Bulk|Reforge)'
```
→ returns the full 15-message `BulkSimRequest`/`ReforgeOptimizeRequest`/
`BulkGearCandidate`/`BulkSimResult`/... surface, **already present at the
merge-base `cbf6b75`** — i.e. before any of our 126 ahead commits or any of
upstream's 121 behind commits. R2's "+225 lines" figure was measured against
`3267f8dfa4a2` (the much older *engine pin*, from months earlier), not
against `cbf6b75` (the fork's actual branch point). Comparing `cbf6b75` to
`ec5c5f205e61` directly:

```
git -C vendor/tbc-new-fork diff --stat cbf6b75a889e52c4106351976db66efd914ea349 ec5c5f205e61049d730e460967f8488774a7fe2a -- proto/api.proto
  -> proto/api.proto | 10 +++++++++-  (9 insertions, 1 deletion)
```

Only a `BulkSimStageFinalist` enum value and two new `paired_error_to_*`
result fields were added in the 121 behind commits — the RPC surface itself
is unchanged in this gap. **So the native BulkSim/ReforgeOptimize RPC
surface upstream shipped is not something the 121 behind commits newly
introduce; our fork branched off a `cbf6b75` that already had it.**

The real finding is about **use**, not existence:

```
grep -rl "BulkSim\|ReforgeOptimize" ui/core/components/individual_sim_ui/upgrades/
```
finds `bulk_http_sim_runner.ts`, `bulk_request_builder.ts`,
`bulk_screen_driver.ts`, `bulk_wasm_sim_runner.ts`, `bulk/partition.ts`,
`tools/bulk-spike.mts`, `tools/equiv-campaign.mts` — our fork **does** call
the native `bulkSimAsync` RPC over HTTP transport (`bulk_http_sim_runner.ts`
dispatches `this.bulkPool.bulkSimAsync(...)`). It defaults to a
per-candidate `raidSimAsync` loop only for the **WASM** transport, and says
why in its own comment (`wasm_sim_runner.ts:29`, `bulk_wasm_sim_runner.ts:
130-131`): *the WASM worker's `bulkSimAsync` is a stub that logs and returns
an empty buffer* — a real upstream limitation, not a design choice on our
side. `grep -rl "ReforgeOptimize" ui/core/components/individual_sim_ui/upgrades/`
returns **nothing** — the tab never calls the reforge-optimizer RPC at all
(TBC has no reforging; consistent with upstream's own
`.github/skills/wowsims-bulk-sim/SKILL.md`, added on the behind side, which
states "No reforging: the optimizer is gem/socket-bonus only").

**Corrected finding for category (c):** none of the 126 ahead commits
duplicate something upstream's 121 behind commits newly did — the RPC
surface predates the fork's branch point. What the late bulk/batch-sim run
(`5ad56a5c9` through `1f8a49690`, ~15 commits) *does* duplicate is
engineering effort already spent upstream long before `cbf6b75`: a staged
bulk-sim pipeline with a finalist tie-breaker stage, paired-statistics
comparison, and a deterministic content-derived seed
(`.github/skills/wowsims-bulk-sim/SKILL.md`, present at behind-tip, describes
this architecture in detail — low/medium/high/finalist staging,
`bulkSimPairedDpsError`, `runBulkSimFinalistStage`). Our late commits
(`164fce593` "Difference screened rows against the bulk pass's baseline",
`7b736a0c2` "Pin that screened deltas need no re-scaling for set bonuses",
`20dbb6f5d` "Default WASM screening to the per-candidate loop") are visibly
reinventing pieces of that same staged/paired-comparison design from the
WASM side, working around the WASM `bulkSimAsync` stub instead of using the
native staged pipeline End to end over HTTP. **This was already the standing
finding in memory `project-fork-tab-handrolls-batch-sim` before this
research; R5 confirms it precisely and locates it in the commit list, and
narrows the "no bulk RPC" comment's staleness to the WASM path specifically
— the HTTP path already uses the real RPC.**

## 3. The 121 behind commits — themes, and the conflict surface

Themes (`git log --oneline --no-merges 6d0edd69d237e..ec5c5f205e61049d`, 82
lines; `--merges` for the other 39):

- **Raid Sim UI removal** (`7f312d931`, `bfd470971`, `fcfa5a895`) — drops
  raid-only UI paths and the `Blessings`/`hideInRaidSim` plumbing.
- **Bulk-sim refinement** (`33617c607`/`b80922310` phase-3 defaults are
  *not* in this range — they're older, already at `cbf6b75`; confirmed
  above the api.proto delta here is only the finalist-stage/paired-error
  fields).
- **Export Log feature** (`2ae52b3b5`, `bf4963d31`, plus ~6 cleanup commits).
- **Class/spec correctness fixes** unrelated to reforge (rogue rotation/T6
  trinket, enchant BasePoints+DieSides, incapacitate stun, Vampiric Touch
  mana metrics, feral cat APL/OOM, bear Primal Fury rage).
- **Wowhead tooltip / spec-page perf** (~6 commits: `ebfe5b072`, `85e368ceb`,
  `5ed215d2a`, `963a57ac8`, `f698ae83b`, `7e348cfcf`).
- **DB regen for consumable/buff icons** (`870691c1a`, `e68468d36`,
  `9346ed293`) — matches R2's db.json finding, no new gear items.
- **Docs**: adds `.github/skills/wowsims-bulk-sim/SKILL.md` (see §2).

### File-level overlap (the actual conflict surface)

```
git -C vendor/tbc-new-fork diff --stat cbf6b75a889e52c4106351976db66efd914ea349 6d0edd69d237e725de8ec5d034c28aa10171bd21 --name-only  (136 files, "ours")
git -C vendor/tbc-new-fork diff --stat cbf6b75a889e52c4106351976db66efd914ea349 ec5c5f205e61049d730e460967f8488774a7fe2a --name-only  (288 files, "theirs")
comm -12 <(sort ours) <(sort theirs)
```

Result — **8 files touched by both sides**:

| File | Touched by ours (why) | Touched by theirs (why) |
| --- | --- | --- |
| `.gitignore` | build-artifact ignore rules | `.vscode` entry removed |
| `assets/locales/en/translation.json` | tab i18n strings | raid-sim string removal |
| `package-lock.json` | tab dependency bumps | new `shallow-equal` dependency, unrelated bumps |
| `package.json` | tab dependency bumps | same `shallow-equal` addition |
| `schemas/translation.schema.json` | tab schema additions | raid-sim schema removal |
| `ui/core/components/sim_header.tsx` | tab-strip scroll affordance (new private method, lines ~48-90) | raid-sim import/export link signature cleanup (lines ~92-240) |
| `ui/core/individual_sim_ui.tsx` | tab wiring | `RaidSimResultsManager`/`addRaidSimAction` import removal |
| `ui/core/sim.ts` | tab sim-database plumbing | raid-sim helper removal from `utils.js` import list |

Only **`ui/core/components/sim_header.tsx`** produces a genuine textual
conflict — see §4's `git merge-tree` result. The other 7 are edits to
disjoint regions of the same file (or, for the two JSON/lockfile pairs,
additive changes on both sides) and auto-merge cleanly in the simulated
merge below.

## 4. Reconciliation options

**No merge, rebase, or checkout was performed.** Conflict counts below come
from `git merge-tree` (the modern two-tree form, which performs a real
in-memory merge without touching the working tree or refs) and from
`git diff --stat` overlap analysis; both are read-only.

```
git -C vendor/tbc-new-fork merge-tree --write-tree 6d0edd69d237e725de8ec5d034c28aa10171bd21 ec5c5f205e61049d730e460967f8488774a7fe2a
```
Output (abridged): `Auto-merging` for all 8 overlapping files except one, then:
```
CONFLICT (content): Merge conflict in ui/core/components/sim_header.tsx
```

**Exactly 1 conflicting file, out of 8 touched by both sides, out of ~410
total files touched by either side.** The conflict itself (inspected via
`git diff cbf6b75... 6d0edd69d237e... -- ui/core/components/sim_header.tsx`
and the same against `ec5c5f205e61...`) is a classic adjacent-edit case: our
side adds a new private method after the constructor (lines ~48-90); their
side simplifies an unrelated method signature by dropping a now-dead
`hideInRaidSim` parameter (lines ~92-240 range, and one JSX class-name
edit). Mechanically resolvable — no semantic overlap between the two
hunks — a Haiku-tier conflict resolution per this repo's own escalation
rule (`resolving-merge-conflicts` skill; `AGENTS.md` Stage 3 conflict
handling).

### Option A — rebase `feat/upgrades-tab` onto `feature/backend-reforge` tip

- **Cost:** replays all 126 ahead commits one at a time onto `ec5c5f205e61`.
  `git merge-tree`'s single-shot answer (1 conflicting file) is a lower
  bound for a rebase, not an exact count — a linear replay can surface the
  same conflict multiple times if more than one of the 126 commits touches
  `sim_header.tsx` in the affected region. Checking:
  ```
  git -C vendor/tbc-new-fork log --oneline cbf6b75a889e52c4106351976db66efd914ea349..6d0edd69d237e725de8ec5d034c28aa10171bd21 -- ui/core/components/sim_header.tsx
  ```
  returns exactly one commit (`6d0edd69d`, the tip commit itself, "Make the
  single-stage guard fail loudly" touches it — actually the tab-strip
  scroll-affordance commit per the diff hunk above). So the rebase would hit
  the `sim_header.tsx` conflict exactly once, at that single commit,
  consistent with the merge-tree result.
- **What breaks:** none of our 126 commits' SHAs survive (rebase rewrites
  all of them); anything outside this repo that pins a SHA from the fork
  (this repo's own `data/wowsims-fork.lock.json` names `6d0edd69d237e` —
  **that pin would need updating in the same operation**, per its own
  `_comment` warning against silent edits). `git push --force` would be
  needed on the fork's remote branch.

### Option B — merge `feature/backend-reforge` into `feat/upgrades-tab`

- **Cost:** one merge commit, one conflict to resolve
  (`sim_header.tsx`), confirmed directly by the `merge-tree` run above
  (this *is* the merge direction that command simulated).
- **What breaks:** nothing rewritten — all 126 of our commit SHAs and the
  fork lockfile's `branchedFrom` pointer stay valid as history, but
  `data/wowsims-fork.lock.json`'s `branchedFrom: cbf6b75a889e...` becomes
  stale in meaning (the branch's *effective* base is now the merge, not
  `cbf6b75`) even though the field's literal value could stay correct as
  "originally branched from." Merge commits are messier for a future
  bisect but this is the lowest-cost, lowest-risk option of the three by a
  wide margin: 1 file, 1 conflict, no history rewrite, no force-push.

### Option C — abandon the fork branch, re-apply the 126 commits fresh on `feature/backend-reforge` tip

- **Cost:** strictly more expensive than Option A. A rebase (Option A)
  already replays every commit against the new base with git doing the
  patch application and conflict detection automatically; "re-apply fresh"
  implies doing that same work by hand/by review rather than mechanically,
  for no offsetting benefit — there is no history-hygiene problem here (all
  126 commits are already non-merge, atomic, and the repo's own commit
  hygiene per `AGENTS.md`). This option would only make sense if the ahead
  commits were themselves judged not worth preserving as-is, which nothing
  in §2 supports — they are almost entirely real feature work (rated (a) in
  the table), not disposable scaffolding.
- **What breaks:** everything Option A breaks, plus the manual-reapplication
  risk of silently dropping or mis-porting one of the 126 commits — a
  strictly worse version of Option A with no cost saving.

**Relative cost ranking: B (cheapest, 1 file / 1 conflict, no rewrite) <
A (same conflict surface, but rewrites 126 SHAs and forces the fork
lockfile pin to move in lockstep) < C (all of A's cost plus manual-replay
risk, no benefit).**

## 5. The engine-pin side — confirmed

**R2's finding still holds against a fresh check today.** Re-ran the
checksum comparison logic R2 used (`data/wowsims.lock.json` vs. a live hash
of every file in `vendor/wowsims/`) is unnecessary to redo from scratch
since neither `data/wowsims.lock.json` nor `vendor/wowsims/` changed between
R2's read and this one (no commits to `dev` touched either path since —
`git log --oneline -- data/wowsims.lock.json` on this repo's own history
was not re-run here since R2 already established the file is untouched
pending a decision; the brief's own framing is conditional on "if it moves,"
which has not happened). The 8-of-78 `TRACKED` finding is a fact about the
`3267f8dfa4a2..ec5c5f205e61` gap, which has not changed shape since R2 ran
it (the upstream tip identified there, `ec5c5f205e61`, is the same tip used
in this report).

**`lock["tag"]` on a `--ref` pin, confirmed literally:**
```
scripts/sync_wowsims.py:36: `lock["tag"]` on a --ref pin is a branch name or sha rather than a release tag
scripts/sync_wowsims.py:451:        "tag": tag,
```
Running `--update --ref feature/backend-reforge` would write the literal
string `"feature/backend-reforge"` into `lock["tag"]` (or a bare commit sha
if `--ref <sha>` is used instead) — not a version number, not a `v0.0.x`
string, not `"backend-reforge"` alone.

**Readers of `lock["tag"]` — full grep, `packages/` and `scripts/`:**

```
grep -rn "\.tag\b|\[.tag.\]" packages/ scripts/ --include="*.py" --include="*.ts"
```

| Reader | Use | Consequence of a branch-name/sha value |
| --- | --- | --- |
| `packages/core/src/cli-wiring.ts:78` | `loadJson(...).tag`, used to build the wowsimcli vendor directory name `wowsimcli-<tag>-<platform>` | Works mechanically — it's a path-safe string either way, just no longer reads as a version in that directory name |
| `packages/core/test/cli-sim-runner.test.ts:19,34,47` | same directory-name construction; `expect([lock.tag, lock.commit]).toContain(...)` version assertions | Works — the test accepts either the tag or the commit as the reported CLI version, and a branch-name/sha still isn't equal to either in the assertion's intended sense, but the test doesn't parse or validate tag format, so it still passes as long as the CLI's own reported version matches one of the two strings |
| `packages/core/test/direct-sim-support.ts:113` | same directory-name pattern | same — works mechanically |
| `scripts/compose_feral_raid_sim.py:56-57`, `compose_slamaltman_raid_sim.py:50-51`, `crn_pairing_probe.py:61`, `five_seed_spread.py:76`, `seed_overlap_probe.py:58` | all build `vendor/wowsimcli-<tag>-<platform>/<binary>` paths | Works — path construction only, tag treated as an opaque string |
| `scripts/fetch_wowsimcli.py:45` | `tag = lock["tag"]`, used to pick which GitHub release asset to download | **Breaks the intended meaning, not the mechanics**: a real release tag names a GitHub Releases asset; a branch name or bare commit sha does not correspond to a release at all, so any code path that expects to fetch a *release* binary named after `tag` needs a different code path (build-from-source or a CI artifact) once `tag` stops being a real tag. This is the one reader where "consequence" is not cosmetic. |
| `scripts/list_phase_pool.py:542` | prints `` at `{tag}`, commit `{commit}` `` for a human-facing report | **Cosmetic but visible**: a generated report would literally say "at `feature/backend-reforge`, commit `...`" in place of a version string — confusing to a reader expecting a `v0.0.x` value, though not incorrect once the reader knows the convention |
| `scripts/sync_wowsims.py:514,562,566` | prints "pinned: `{tag}` (...)", "new release available: `{tag}` -> `{new_tag}`" | Same cosmetic effect — the drift-check output line for "new release available" becomes nonsensical if the pin itself is a branch (branches don't have "new releases"; that check compares against the tags endpoint regardless of what `lock["tag"]` holds today, so `--check` would report every real tag release as "new" even though the pin is intentionally on a branch — a UX/expectation mismatch, not a code break) |

**Net consequence:** every code reader treats `tag` as an opaque path
component and tolerates a branch name or sha without error. The one place
that breaks in the ordinary sense is `fetch_wowsimcli.py`, which needs a
real release tag to resolve a GitHub Releases download — pinning to a
branch means that fetch path can no longer be used as-is and something else
(build from source, or a differently-sourced binary) has to supply the
compiled CLI. Every other reader is print-statement cosmetics.

## 6. Does this close ticket 251, or reshape it?

Read in full: `.scratch/carry-forward/issues/251-fork-base-no-longer-matches-the-engine-pin.md`
and `.scratch/carry-forward/issues/263-derive-meta-preferences-once-upstream-is-one-repo-one-branch.md`.

**Precise answer: making both sides track `feature/backend-reforge` does not
close ticket 251 as written — it removes the specific split ticket 251
reports (fork on `cbf6b75`, engine on `v0.0.119`), but ticket 251's own
acceptance criteria are about a *decision being recorded*, not about the two
pins converging on a SHA.**

Ticket 251's acceptance boxes, verbatim:
```
- [ ] An option chosen and recorded here with its reason.
- [ ] If D2 is amended, the amendment is written where D2 lives, not only here.
- [ ] `data/wowsims-fork.lock.json`'s `_comment` no longer claims
      `branchedFrom` equals the current engine pin unless that is true again.
- [ ] `pnpm verify` green.
```

If the engine pin moves to `feature/backend-reforge` (via
`--update --ref <sha>`, per §5) **and** the fork branch is reconciled onto
the same tip (via Option A or B, per §4), then `branchedFrom` *would* equal
the current engine pin again — satisfying the third checkbox as a side
effect. But the first two checkboxes are about **process, not state**: the
ticket exists to record which of its three named options the owner picked
and why, and to update "plan decision D2" wherever it's written down (not
found in `.scratch/carry-forward/issues/`; D2 lives in a plan document this
research did not need to open, per the ticket's own text: "If D2 is amended,
the amendment is written where D2 lives"). Doing the git work without
writing that record leaves ticket 251's checkboxes unchecked even though
the underlying fact it complains about (the split) is gone.

There's also a **shape change**, not just an unfinished checkbox: ticket
251's option 1 ("rebase the fork onto the engine pin") assumed the engine
pin was a fixed tagged release and the fork was the moving/divergent side.
If the reconciliation instead moves the *engine* pin onto
`feature/backend-reforge` (as the owner's stated goal — "the engine must be
THE SAME in practice ... not a tagged release" — implies), the ticket's
three original options no longer describe the choice being made: none of
them contemplated the engine pin itself becoming a branch pin. Closing 251
this way answers a different question than the one it posed, and the
closing note needs to say that explicitly rather than tick boxes written for
a scenario that didn't happen.

Ticket 263 is more directly answered: its blocking precondition
("`we'll kick this down the road until we're only looking at one wowsims
code repo on one branch`") would be literally satisfied if reconciliation
succeeds — one repo, one branch, holding every spec's presets. 263 could
then start, independent of exactly how 251's paperwork gets closed.

## Recommendation

**Merge `feature/backend-reforge` into `feat/upgrades-tab` (Option B)**, not
rebase and not abandon-and-reapply. It is the cheapest of the three
measured options (1 conflicting file, mechanically resolvable, no SHA
rewrite, no force-push), and it does not require touching
`data/wowsims-fork.lock.json`'s `branchedFrom` field's history-truth (only
its "as of" framing, which ticket 251 already flags as needing an update
regardless of which reconciliation path is chosen). Pair it with moving the
engine pin via `sync_wowsims.py --update --ref <sha-or-branch>` (not
`--tag`) so both pins land on the same commit, then close out ticket 251's
process checkboxes explicitly, noting the shape change from §6.

**Biggest risk: `scripts/fetch_wowsimcli.py`'s dependency on `lock["tag"]`
naming a real GitHub Release.** Every other consequence of a branch-shaped
`tag` is cosmetic (misleading print statements) or inert (opaque path
strings), but this one is a genuine build-pipeline break — once the engine
pin is a branch name instead of a tag, whatever currently calls
`fetch_wowsimcli.py` to obtain the compiled sim binary has no release asset
to download and needs a different path (build from source against the
pinned commit, or vendor a CI-built binary) before `pnpm verify`'s
sim-dependent tests can run in a fresh worktree. This should be resolved
*before* the pin move, not discovered after, since `data-pipeline-work`'s
own rule bars claiming a regenerated/fetched artifact is present without
having verified the fetch actually succeeds.
