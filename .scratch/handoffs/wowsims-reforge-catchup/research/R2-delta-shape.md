# R2 — Branch delta shape

Scope: what is actually in the 153-commit gap between our pin
(`3267f8dfa4a2`, tag `v0.0.119`) and upstream `feature/backend-reforge` tip
(`ec5c5f205e61`), and which of it touches files this repo vendors via
`TRACKED` in `scripts/sync_wowsims.py`.

All commands below were run against the fork checkout
`C:/Users/dgree/Code/lulz/tbc-gear-prio/vendor/tbc-new-fork` (its own git
repo, remote `origin` = `https://github.com/dangreenberggit/tbc-new.git`).
Both SHAs already existed as local commits in that checkout, so no fetch or
temp ref was needed and none was created.

Sanity check:

```
git -C vendor/tbc-new-fork rev-parse --verify 3267f8dfa4a2
  -> 3267f8dfa4a20746d4982c1522fdec1d4eb77f4c
git -C vendor/tbc-new-fork rev-parse --verify ec5c5f205e61
  -> ec5c5f205e61049d730e460967f8488774a7fe2a
git -C vendor/tbc-new-fork merge-base 3267f8dfa4a2 ec5c5f205e61
  -> 3267f8dfa4a20746d4982c1522fdec1d4eb77f4c   (= our pin: clean ancestor)
git -C vendor/tbc-new-fork rev-list --count 3267f8dfa4a2..ec5c5f205e61  -> 153
git -C vendor/tbc-new-fork rev-list --count ec5c5f205e61..3267f8dfa4a2  -> 0
```

Both established facts confirmed: 153 ahead, 0 behind, clean ancestor.

## TRACKED table

`TRACKED` (`scripts/sync_wowsims.py:99-234`) lists 78 local-name -> upstream
path pairs (I enumerated 98 lines in my working list by mistake while
building the query set, including the `ret_p3` PER_FILE_PIN entry counted
twice — the diff command below was run over the deduplicated real path list
and the counts reconcile: 78 tracked paths, 8 changed).

Command used for the whole table at once:

```
git -C vendor/tbc-new-fork diff --stat 3267f8dfa4a2 ec5c5f205e61 -- <all 78 TRACKED upstream paths>
```

Result — only 8 of 78 tracked paths differ. Everything not listed below is
byte-identical between the pin and the branch tip (confirmed by its absence
from `--stat` output, which lists every path with any diff).

| TRACKED local name | upstream path | changed? | nature/size |
| --- | --- | --- | --- |
| `db.json` | `assets/database/db.json` | **yes** | +324/-136 net across the whole file; see below — entirely `itemIcons` additions + a handful of gem/enchant stat corrections, no new gear items |
| `constants_other.ts` | `ui/core/constants/other.ts` | **yes** | 1 line: `CURRENT_PHASE` `Phase.Phase2` -> `Phase.Phase3` (matches R1) |
| `proto_utils.ts` | `ui/core/proto_utils/utils.ts` | **yes** | 76+/41- lines: removes raid-sim-only helpers (`makeBlankBlessingsAssignments`, `raidSimIcon`, `raidSimLabel`, `raidSimSiteUrl`, `Blessings`/`BlessingsAssignment(s)` imports) and adds `EquipmentSpec` import |
| `feral_sim.ts` | `ui/druid/feralcat/sim.ts` | **yes** | 35 lines: default gear `P1_REALISTIC_6P_GEARSET` -> `P3_6P_GEARSET`; rotation `TypeSimple` -> `TypeAuto`; `defaultExposeWeaknessSettings(Phase.Phase1)` -> `defaultExposeWeaknessSettings()` (signature change, no more phase arg); `raidSimPresets` block removed entirely |
| `feral_default.apl.json` | `ui/druid/feralcat/apls/default.apl.json` | **yes** | 104 lines changed — APL rotation body rewritten (not measured line-by-line; large enough to be a real rotation revision, not a formatting diff) |
| `ele_p1_a.gear.json` | `ui/shaman/elemental/gear_sets/p1_a.gear.json` | **yes** | same 4 item ids, gem choices swapped (regem/reforge-optimizer output, not new items) |
| `ele_p1_h.gear.json` | `ui/shaman/elemental/gear_sets/p1_h.gear.json` | **yes** | same pattern: same item ids, gems reshuffled |
| `enh_p5.gear.json` | `ui/shaman/enhancement/gear_sets/p5.gear.json` | **yes** | trailing-newline-only change (no content diff) |
| all remaining 70 TRACKED paths | — | no | byte-identical, confirmed by absence from `--stat` |

That includes every ret gear/apl file, every feral gear file (only the APL
and sim.ts changed, not the gear JSONs), every balance/enh/mage/priest/rogue/
warlock/warrior/hunter gear file except the two elemental and one
enhancement file above.

## db.json in detail

Line counts:

```
git -C vendor/tbc-new-fork show 3267f8dfa4a2:assets/database/db.json | wc -l  -> 12371
git -C vendor/tbc-new-fork show ec5c5f205e61:assets/database/db.json | wc -l  -> 12683
```

`git diff --stat` reports `324 insertions(+)` net against the file (the
`+324/-136`-style summary from `git diff` proper, not `--stat`'s line-count
column, which is what the file's own line-count growth of 312 reflects).

All hunks fall between line 8339 and line 12541 of a ~12.4-12.7k line file —
i.e. entirely in the tail. Inspecting the hunks:

- One hunk adds two new enchant/effect rows (ids 963 x2 — Greater Impact,
  Major Striking) to the enchant-effects table.
- One hunk **corrects stat values on 4 existing gem ids** (33135, 33140,
  33143, 33144 — professions-only JC gems from phase 1): each drops by 1
  point on its stat (e.g. 19->18, 13->12). Same ids, no additions/removals.
- The remaining ~40 hunks, starting at line 9525, are a large **new
  `itemIcons` block** — id/name/icon triples for potions, elixirs, flasks,
  food, and similar consumable/buff items (ids like 7676 "Thistle Tea", 13442
  "Mighty Rage Potion", 22788 "Flame Cap", etc.). This matches the commit
  history exactly: `e68468d36 perf(db): curate icons for the shared raid
  buffs and debuffs`, `870691c1a perf(db): ship icons for consumables`,
  `9346ed293 chore(db): regenerate after adding the consumable and buff
  icons`.

**No new gear/equipment items appear anywhere in the diff.** There is no
hunk in the item table proper (which sits earlier in the file, well before
line 8339) — the entire delta is icons plus 4 gem stat corrections plus 2
new enchant effects. This is consistent with R1's finding that the p3
curated gear-set *files* are already vendored at the current pin; db.json
itself gained no new equippable items in this gap either.

## Commit classification

```
git -C vendor/tbc-new-fork log --oneline --merges    3267f8dfa4a2..ec5c5f205e61 | wc -l  -> 45
git -C vendor/tbc-new-fork log --oneline --no-merges 3267f8dfa4a2..ec5c5f205e61 | wc -l  -> 108
```

Of the 45 merges, the overwhelming majority are `Merge branch 'master' into
feature/backend-reforge` / `Merge remote-tracking branch 'origin/master'
into ...` / `Merge pull request #NNN from wowsims/...` — i.e. master
landing on top of the feature branch repeatedly, or unrelated PRs (rogue
fixes, wowhead tooltip perf, spec-page generation, raid-sim-UI removal)
merged to master and then folded in. One of these merge commits,
`cbf6b75a8`, is exactly the SHA the orchestrator's brief names as
`watchedRefs["feature/backend-reforge"]` — confirming that watched ref sits
partway along this same master-merge chain, not on a separate line of work.

Of the 108 non-merge commits, by theme (not exhaustive, but covers the
volume):

- **Backend reforge / bulk-sim engine (the actual feature-branch payload,
  ~35 commits)**: `7507177c6 Initial backend reforge port`,
  `d17857541 MOP bulk reforge function Parity`, `1b2eba0b0 Migrate reforge
  cache restore`, `12b73ee00 Migrate cache key changes`, `03cc6ba28 Migrate
  MOP reforge fixes`, `d43c40922 Let LP solve socket bonuses`,
  `d2c4f9684 Fix minimize regemming`, `2137e5983 Fix Unique / LimitCategory
  uniqueness`, `e6770e32e Make default EP presets always show in reforge
  menu`, `082c420452`/`cef7b8917`/`0a0eb8630`/`746cf5cc2` (various
  performance-parity migrations from a sibling MoP fork), `c1ac638eb Split
  async progress from main & add optimized candidates mutex`,
  `6802ae079`/`c736a60dc`/`3cfc6c1b7`/`e6e629592` bulk-sim/highs-upgrade
  fixes, `181d27484`/`079ed8448 Fix reforger`/`Fix reforge issues`,
  `1575ec341 Update proto` (see Protos below).
- **Raid Sim UI removal (~4 commits)**: `7f312d931 Remove the unsupported
  Raid Sim UI`, `bfd470971 Drop the raid-sim naming and individual-sim gates
  left after the UI removal`, `fcfa5a895 Remove the raid-only player
  dimension from the Results tab`, `1df51aadc` (its merge). This is what
  produced the `proto_utils.ts` diff above.
- **Export Log feature (~8 commits)**: `2ae52b3b5 Export Log`, `bf4963d31
  Export Log button on log results page`, `88490b645 moved log exporter to
  exporters folder`, plus cleanup commits.
- **Class/spec fixes unrelated to reforge**: rogue non-EA rotation fix
  (`ac7cbd02b`), rogue T6 trinket display (`18b718ef9`), enchantment
  BasePoints+DieSides read fix (`c55757d6c`), incapacitate stun support
  (`6432d9b10`), Vampiric Touch mana-metric fixes (multiple), Gorefiend/
  Archimonde encounter presets (`41c9f0d8e`, `8bd05c10b`), feral cat APL/OOM
  fixes (`7ba6b4655`, `aceffbea0`), bear Primal Fury rage fix (`76d462b03`).
- **Content tier default (2 commits)**: `33617c607 Default Phase 3 EP
  weights and phase-scaled debuffs`, `b80922310 Default all sims to Phase
  3` — this pair is the `CURRENT_PHASE` bump R1 already verified.
- **Wowhead tooltip / spec-page perf (~6 commits)**: `ebfe5b072`,
  `85e368ceb`, `5ed215d2a`, `963a57ac8`, `f698ae83b`, `7e348cfcf`.
- **Misc/infra**: `6f402bddc`/`d09edaaf8`/`d43c40922` bulk-combo bug fixes,
  `6d0c1ee99 Windows compat makefile changes`, `24a820a7c Devsecops`,
  translations, test updates, a `db.json` regen commit (`1bc3c4b3b Regen
  DB`, folded into the icon-addition set above).

Net read: this is a **real, large feature branch** — the bulk of the
non-merge work is genuine backend-reforge/bulk-sim engineering (matching
this repo's existing note that the fork's `backend-reforge` engine ships a
native `BulkSimRequest` + reforge optimizer this repo's UI doesn't call yet)
— not merge noise. The merge noise is concentrated entirely in the 45 merge
commits, which are almost all master syncs or unrelated PR folds.

## Protos — regeneration trigger

```
git -C vendor/tbc-new-fork diff --stat 3267f8dfa4a2 ec5c5f205e61 -- '*.proto' 'proto/'
```

```
 proto/api.proto    | 225 +++++++++++++++++++++++++++++++++++++++++++++++++++--
 proto/common.proto |   2 +-
 proto/db.proto     |   6 +-
 proto/ui.proto     |  73 -----------------
```

**Yes — this branch moves protos, prominently.** `proto/api.proto` adds an
entire new RPC surface for bulk sim and reforge optimization:
`BulkSimRequest`, `ReforgeOptimizeRequest`/`Result`, `ReforgeSettings`,
`ReforgeGemOption`, `StatCapConfig`, `UIStat`, `BulkGearCandidate`,
`BulkSimResult`, `BulkGearResult`, `BulkSimStageMetrics`, `BulkSimTimings`,
`BulkCombinationCountRequest`/`Result`, `BulkCandidatesRequest`/`Result` (via
`git diff ... -- proto/api.proto | grep -iE 'rpc|message|service'`).
`proto/ui.proto` loses 73 lines (likely the Blessings/raid-sim UI messages
whose TS bindings `proto_utils.ts` also drops — consistent with the Raid Sim
UI removal commits above).

This repo pins `.proto` files under `data/proto/` (16 files present:
`api.proto`, `apl.proto`, `common.proto`, `db.proto`, `druid.proto`,
`hunter.proto`, `mage.proto`, `paladin.proto`, `priest.proto`, `rogue.proto`,
`shaman.proto`, `spell.proto`, `test.proto`, `ui.proto`, `warlock.proto`,
`warrior.proto`, confirmed via `ls data/proto/`), per PLAN.md §8, pinned from
the same release as the binary. **Pulling this branch's content past the
current pin is a proto regeneration trigger** for at least `api.proto`,
`common.proto`, `db.proto`, and `ui.proto` — flagging prominently per the
brief, since a stale generated-code/proto mismatch is exactly the failure
mode `data-pipeline-work` warns about.

## Local-modification / conflict check

`vendor/wowsims/` is **populated**, not empty — 98 files present (`ls
vendor/wowsims/`). Checked every file's SHA-256 against the recorded value
in `data/wowsims.lock.json` (`files.<name>.sha256`) with a small script
(reads the lock JSON, hashes each vendored file, compares):

```
matched: 98
missing: []
mismatches: []
```

**Every vendored file matches its lock-recorded hash exactly. No locally
modified vendored files exist.** This means none of the 8 changed
`TRACKED` files above will produce a merge conflict on `--update` — a plain
re-fetch overwrites cleanly, it is not a three-way merge. (If a fresh
worktree needs `vendor/wowsims/` restored from a clean checkout, the
command is `python scripts/sync_wowsims.py --restore` per the runbook note
in that script — not needed here since the directory is already present and
verified.)

## VERDICT

- **Must move** (8 of 78 `TRACKED` paths differ between pin and branch tip):
  `db.json`, `constants_other.ts`, `proto_utils.ts`, `feral_sim.ts`,
  `feral_default.apl.json`, `ele_p1_a.gear.json`, `ele_p1_h.gear.json`,
  `enh_p5.gear.json`.
- **Unaffected** (70 of 78 `TRACKED` paths byte-identical): every ret file,
  every warrior/hunter/mage/rogue/priest/warlock/balance gear file, and the
  remaining feral/elemental/enhancement gear files not listed above.
- **Proto regen is triggered.** `api.proto`, `common.proto`, `db.proto`,
  and `ui.proto` all change; `api.proto` gains the entire bulk-sim/reforge
  RPC surface. Any pin move past this gap must regenerate the pinned
  `.proto` files under `data/proto/` and whatever this repo generates from
  them, per PLAN.md §8.
- **No merge-conflict risk**: `vendor/wowsims/` is fully populated and every
  file's hash matches `data/wowsims.lock.json` exactly — a re-fetch of the
  8 changed files is a clean overwrite, not a three-way merge, and needs no
  Haiku conflict-resolution pass per the Stage 3 plan.
- **db.json data note for R1/Stage 2**: the db.json delta contains no new
  gear/equipment items — only new consumable/buff `itemIcons` entries and 4
  corrected gem stat values on existing phase-1 profession gems. Anyone
  planning a pool/universe regen off this branch should not expect new
  loot from this specific diff; the tier-3 pool-coverage gap R1 identified
  comes from elsewhere (gear-set files already vendored, universe/pool
  generation code, not `db.json` growth in this gap).
