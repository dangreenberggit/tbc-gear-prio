Status: closed
Type: task
Origin: ticket 551 fix on feat/silence-followups, 2026-10-05
Blocks: none
Blocked by: the output of stage 558-upstream-react-port part P1 through its chunk K2 (the fork worktree at 42c75dc9 and the main-repo gates on the new paths, verify green)
Related: 551, 263, 559, 560

# 97 of the 98 tracked upstream paths are gone at upstream `master`

## What is wrong

`TRACKED` in `scripts/sync_wowsims.py` lists 98 upstream paths. At the
upstream `master` tip and tag `v0.0.147` (both `42c75dc9b6ef`), 97 of them
do not exist. At our pin `17a8fb28c` all 98 exist. Only
`assets/database/db.json` is at the same path in both.

Upstream restructured its UI tree on 2026-09-16: `c86fd86f5` ("[UI] Lane 3:
port ui/sim as the TBC-shaped skeleton") added `ui/sim/` and `ui/specs/`,
and `7b539641` ("Delete the pre-port UI tree") removed the old
`ui/<class>/<spec>/` and `ui/core/` trees.

Where the 97 missing paths are at the tip, matched by file path below
`ui/`:

| new location | count |
| --- | --- |
| `ui/specs/<class>/<spec>/...`, same path below the spec directory | 94 |
| `ui/core/constants/other.ts` is now `ui/sim/constants/other.ts` (ticket 551) | 1 |
| `ui/core/proto_utils/utils.ts`: the two helpers we read are in `ui/sim/proto/utils.ts` | 1 |
| no file of the same name: `ui/druid/feralcat/sim.ts` | 1 |

Re-run: fetch both trees with
`gh api "repos/wowsims/tbc-new/git/trees/<sha>?recursive=1"` for
`42c75dc9b6ef` and `17a8fb28c5ad14b649acecdaacd488594048f467` (neither
response is truncated), and test each `TRACKED` value for membership.

## Why it matters

`do_update` fetches every `TRACKED` path at the new commit and refuses to
write a lockfile when any fetch fails (`scripts/sync_wowsims.py`, the
`fetch_errors` check after the fetch loop). So `--update`, `--update --ref
master`, or any pin move to a commit at or after `7b539641` fails until
`TRACKED` is remapped (hypothesis, untested: reasoned from the code and the
tree listing; `--update` was not run because it writes `vendor/`).

`--check` is not affected: ticket 551 taught it to read the phase from
either path. `--restore` at the current pin is not affected.

## Why it is not done on the branch that found it

Remapping `TRACKED` only means something together with moving the pin:
at the current pin the new paths do not exist, so the remap and the pin
move are one change. The pin move is the owner's decision. It moves the
engine every ranking is computed with, and it needs the fork re-pin and
re-baselining that come with any engine move (`docs/agents/known-traps.md`,
"Before moving the wowsims engine pin").

Two tracked files feed `scripts/extract_sim_defaults.mjs`, which parses
`feral_sim.ts` for buff and debuff defaults and reads two helpers from
`proto_utils.ts`.

- Both helpers exist at the tip: `defaultRaidBuffMajorDamageCooldowns`
  at `42c75dc9:ui/sim/proto/utils.ts:133` and
  `defaultExposeWeaknessSettings` at `:169` (re-run: `git -C
  vendor/tbc-new-fork grep -n
  "defaultRaidBuffMajorDamageCooldowns\s*=\|defaultExposeWeaknessSettings\s*="
  42c75dc9 -- ui`). So `proto_utils.ts` needs a path change to
  `ui/sim/proto/utils.ts`. Whether the extractor's parse still matches
  the helpers' bodies there is untested.
- `feral_sim.ts` has no same-name successor. Where its defaults now live
  is unknown; `ui/specs/druid/feralcat/` at the tip has `inputs.ts`,
  `presets.ts` and `spec.ts` (hypothesis, untested: one of these holds
  the defaults).

## What would close this

The owner decides to move the engine pin past `7b539641`. Then: `TRACKED`
is remapped, including a new source for `feral_sim.ts` and the new path
for `proto_utils.ts`;
`--update --ref <chosen sha>` writes a lockfile with all tracked files;
and `corepack pnpm sim-defaults:check` passes against the new vendored
sources. Or the owner decides not to follow upstream past `7b539641`, and
this ticket closes as `wontfix` with that ruling quoted.

## Owner's decision (2026-10-06)

The owner chose to follow upstream past `7b539641`:

> 558 cli follows: follows. this can be a big plan that may take multiple sessions if the planner so decides. but this is all work that imrpoves our tab and needs to be done anyway.

(owner, 2026-10-06, session `52d5f63f`, recorded in
`.scratch/stage-gate/558-upstream-react-port/decision-log.md:34` and in
that stage's `brief.md`, "Amendment 2026-10-06"; both gitignored, in the
owner's checkout)

Other owner words this work serves:

> We should be up to date with wowsims.

> I am concerned with the fork and it's upgrade tab only.

(2026-10-05, session `ce6ca879`, `.scratch/stage-gate/555-557-silence-followups/decision-log.md:74`)

> let's relax. I want to keep up to date with normal git behavior and less pin obsessions, especially now that we're focused on the original wowsims repo and the master branch rather than a feature branch merged 2-3 weeks ago

(2026-10-06, `decision-log.md`, ruling 8; recorded by P1 as ADR-0036)

## Work: part P4 of stage 558-upstream-react-port

This ticket is the execution of part P4 of stage
`558-upstream-react-port` (the command-line ranking tool's engine move).
The stage's other deferred parts are 559 (P2, tab results-side parity)
and 560 (P3, tab settings-side parity, gates, fixture re-record and the
final re-pin). Order on `feat/upstream-react-port`, in the port worktree
`C:/Users/dgree/Code/lulz/tbc-gear-prio-wt-react-port`: P1, then this
ticket (P4), then 559, then 560, then the merge ask. This ticket and 559
may swap; 560 must come after this ticket.

### Done means

`data/wowsims.lock.json` names `42c75dc9b6ef447202588250480a7d504182409a`; every tracked file resolves; generated data, universes, pool listings and recordings are regenerated; the fork's universes are refreshed; the CLI's rankings are re-baselined with an SME verdict; ticket 558 is closed. Branch: `feat/upstream-react-port`, in the port worktree. Order: after P1's K2 (it may run before P1's React chunk while the Vercel skills are not yet installed), and **before P3** (ticket 560), because P3 re-records the fixtures and the desktop golden exactly once after the last engine-input change, and this part changes the candidate pools. P4 writes no React code. Under ruling 8 the two locks may later differ; on this branch they meet at `42c75dc9`.

### Steps, in the order `docs/agents/upstream-catch-up.md` (engine section) and `docs/agents/known-traps.md:101-131` set

1. Remap `TRACKED` in `scripts/sync_wowsims.py:102-120`: 94 paths move to `ui/specs/<class>/<spec>/...` (table above); `ui/core/constants/other.ts` → `ui/sim/constants/other.ts`; `ui/core/proto_utils/utils.ts` → `ui/sim/proto/utils.ts`; `ui/druid/feralcat/sim.ts` → `ui/specs/druid/feralcat/spec.ts` (`defaults:` block at :66-121).
2. `python scripts/fetch_wowsimcli.py --commit 42c75dc9... --tag-dir 42c75dc9...` twice; sha256 lines must match. Go 1.25.4, protoc 35.1 and protoc-gen-go 1.36.10 are installed; `buf` is not on PATH and `pnpm proto:generate` calls it (hypothesis, untested, from `Get-Command buf`): the P4 planner measures this first. `fetch_wowsimcli.py` adds and removes its own temporary fork worktree; with the port worktree registered the count is two before and after (P1's `upstream-catch-up.md` edit says so).
3. `python scripts/sync_wowsims.py --update --ref 42c75dc9...`; `--unwatch-ref`/`--watch-ref master`.
4. `python scripts/fetch_protos.py`, `pnpm proto:generate`; the api-version tests from ticket 390 apply again (`current_version_number` 14 → 15).
5. `pnpm data:items:generate`, `python scripts/list_phase_pool.py`, `pnpm sim-defaults:build` (feral defaults now parse from `spec.ts`: expected to work with path changes only, hypothesis, untested).
6. The fixed-gear, fixed-seed engine-numbers check (test-ladder G6: one sim per engine version on one fixed gear set, about 25 s; the method is in `.scratch/handoffs/upgrades-tab-finish-line-HANDOFF.md:136-141`; no committed script was found, hypothesis) to record how far the new simulator moved DPS before the 15-minute re-ranks.
7. `assemble_universe.py` per (spec, phase) with the new `vendor/wowsims/db.json` and the regenerated `sim-implemented-effects.json` and `equip-eligibility.json` P1 committed (`spec-registry.json` already maps `shadow` to `DpsPriest`); `sync_fork_universes.py --write` into the fork's `ui/features/upgrades/model/data/`, with the PROVENANCE table, a fork commit on `feat/upgrades-tab-react` and a fork re-pin (`sim-implemented-effects:generate` unchanged, `fork-universes:check`, `pnpm verify`).
8. Re-record `packages/core/test/fixtures/synthetic-roster-recordings.json` (ADR-0033 Consequence 7; the re-record script was not found at planning time: the P4 planner finds it or the part stops and reports).
9. Bump `ENGINE_VERSION` (`packages/core/src/content-hash.ts:54`, now 7) in its own commit.
10. `pnpm verify`; CLI re-baseline for feral and ret (`pnpm rank --offline --spec <s>`, about 15 minutes each, older source) with a `gate-sme` verdict; close 558 with the owner's "follows" quoted.

### Seam contract

- From P1: the fork worktree on `42c75dc9` under `C:/Users/dgree/Code/lulz/tbc-gear-prio-wt-react-port/vendor/tbc-new-fork`, with its universes under `ui/features/upgrades/model/data/` and their PROVENANCE table; the main-repo fork gates already on the new paths; the two fork-derived data files regenerated and `spec-registry.json` on `DpsPriest`; `pnpm fork:upstream-status`; ADR-0036 and the split catch-up doc. P4 changes no fork file except the universes refresh (step 7).
- Assumed: P4 touches `data/wowsims.lock.json`, `scripts/sync_wowsims.py`, `data/proto/`, `packages/core/src/proto/`, `data/items`, `data/enchants`, `data/gems/palette.json`, `data/presets/feral/buff-defaults.json`, `data/universes/`, `data/pool-listings/`, the recordings, `content-hash.ts`, `data/wowsims-fork.lock.json` (the re-pin of step 7), and `assemble_universe.py`'s slug map if it names `Priest`. None of these is in P1's manifest except the fork lock.
- To P3 (ticket 560): the refreshed fork universes, committed and re-pinned, so P3's one re-record and desktop golden see the final candidate pools.

### What the stage's planning learned

- None of the main-repo fork gates reads `data/wowsims.lock.json`; the indirect link is `data/universes` built from `vendor/wowsims/db.json` (`scripts/assemble_universe.py:29`) plus the two fork-derived files above. No script compares the two locks (plan C62).
- `db.json` changes in range are Battlemaster trinkets phase 4 → 3 and Brewfest re-issues (`558-scope.md:81`; hypothesis for completeness).
- `warn_upstream_drift.py` covers the engine lock only and is warn-only; the fork's drift is `pnpm fork:upstream-status` (P1).
- Ticket 263 (meta-preference table from wowsims) reads upstream data this move changes; it stays open and is not P4 work.

## Closed (2026-10-06)

Closed by stage `558-p4-engine-move` (part P4) on `feat/upstream-react-port`,
because the owner chose to follow upstream:

> 558 cli follows: follows. this can be a big plan that may take multiple sessions if the planner so decides. but this is all work that imrpoves our tab and needs to be done anyway.

(owner, 2026-10-06, session `52d5f63f`; quoted in "Owner's decision" above,
source `.scratch/stage-gate/558-upstream-react-port/decision-log.md:34` in
the owner's checkout)

- Lock: `data/wowsims.lock.json` `tag` and `commit` are
  `42c75dc9b6ef447202588250480a7d504182409a`. `TRACKED` is remapped to
  upstream's `ui/specs/` and `ui/sim/` layout, and
  `python scripts/sync_wowsims.py --check` prints `in sync.`.
- Commits: `8b3b72eb` (pin move, protos, item index, listings),
  `4efe18c2` (Mug id in the feral skeleton), `b0d70deb` (44 universes
  reassembled), `22ec5bc3` (fork re-pin, interim), `9ee0c247` (synthetic
  roster recordings re-recorded), `43e6323d` (`ENGINE_VERSION` 7 to 8),
  and the commit that closes this ticket. Fork commit `54a7d5263` on
  `feat/upgrades-tab-react` refreshes the bundled universes.
- Fixed-gear, fixed-seed engine check (25000 iterations, seed 443754031):
  ret 1909.30 to 1908.12 (delta -1.18, noise band 3.11); feral 787.74 to
  787.67 (delta -0.06, band 0.88). The new binary gives the same result on
  two runs.
- Mug of Direbrew: upstream replaced item 38287 with 281739 (a stronger
  phase-3 item). The feral skeleton's rotation now casts 281739, mapped from
  the owner's capture through `data/presets/feral/upstream-item-id-renames.json`;
  the capture itself is unchanged. On the new engine a rotation that names
  38287 never presses a worn 281739 Mug (808.70 against 826.65 DPS).
- SME verdict, old engine against new engine on the same code: slamaltman
  (ret p3), shredzepelin (feral p2) and nexess (feral p2) are each
  `trust with caveats`, and every caveat was there before the move. No
  top-10 rank moved. The committed `.scratch/rank-reports/stage2-close-*`
  files are the new-engine runs.
- Evidence (gitignored, owner's checkout):
  `.scratch/stage-gate/558-p4-engine-move/sme-verdict.md`,
  `engine-delta.md`, `rank-old/`, `rank-new/`, `regen-reconciliation.md`.
