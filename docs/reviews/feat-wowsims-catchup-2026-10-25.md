# Pre-merge review — feat/wowsims-catchup-2026-10-25

Reviewed range: `187a01675eac809a12782084079407803d6aa9b7..e7e355ae9097f974c7ebaa8a4cb54f3130e46bc7`

Fork range (round 1): `7024ba6d2..119b9f676` in `vendor/tbc-new-fork`
(`8ccce9d7f` merges upstream `master` `cec2a7b68`; `119b9f676` re-pins the
tab's pool sizes).

Dispatch (round 1): full axes, because the branch is not a small change
(`git diff --shortstat dev...HEAD`: 141 files changed, 3490 insertions,
6248 deletions; most paths start with `data/`). `codex` is not on `PATH`
(`which codex` exits 1), so each axis ran as a fresh `general-task` subagent
on Opus (effort high): adversarial, domain, and the `code-review` skill's
Standards and Spec sub-agents, all four in one parallel batch. The domain axis
ran because the diff changes item membership of the pools. Each axis was told
it writes nothing.

The dispatching agent checked two points itself before dispatch:
`git -C vendor/tbc-new-fork diff --numstat --diff-filter=M cec2a7b68 HEAD`
prints only `6 0 ui/app/SimTabsSection.tsx`, and the patch of
`7024ba6d2..8ccce9d7f` equals the patch of `e804c29e8..cec2a7b68` (compared
with `index` lines removed), so the merge commit holds no hand edits.

## Adversarial

No correctness defect and no test theatre. The axis diffed `db.json` between
`e804c29e8` and `cec2a7b68` by script: 8 ids removed (33808, 33957-33959,
34073-34075, 38175), 5 added (281907, 281911, 281915, 281919, 281923), and
`handType` changed on 21 weapons; `missing_effects_auto_gen.ts` drops 33507
and swaps 38175 for 281923. From that it re-derived all 44 cells of the fork's
`pool_source.cells.fixture.json`, the totals (36,782 / 38,734 / 860), ret-p3
1044, ret-p4 1175/1118, ret-p5 1441, and the core universe counts (ret-p2
541 → 535: the six old rings out; ret-p3 794 → 791: six out, three re-issued
rings in). Every number matches. Generated files at the tip match their
generators (`universe-rebuild:check`, `equip-eligibility:check`,
`pool-listings:check`, `sim-implemented-effects:check`, `fork-universes:check`,
`engine-port-drift:check`, `sync:wowsims:check` all exit 0;
`data/items/index.json` regenerated to a temp file is byte-identical). Both
core test files pass (271 tests); `fork-tests:check` passes (735 tests). The
remote `feat/upgrades-tab-react` is at `7024ba6d2`, so `pushed: false` is
right.

- **A1.** Commit `d0cdbc3b` (and `1a368e3e` before it) is red:
  `check_universe_rebuild.py` on a `git archive d0cdbc3b` copy reports "89
  files checked, 77 mismatches", rc 1. Only the tip is consistent. With
  `merge-to-dev`'s `--no-ff`, the red commits stay in `dev` history and
  mislead a bisect.
- **A2.** `docs/fork-upstream-touchpoints.md:34-52` still names base
  `e804c29e8` and fork `160ae36c2`. Its audit command
  `git diff --name-only --diff-filter=M e804c29e8 119b9f676 | wc -l` now
  prints 23, not 1, because the base moved. The doc was already behind
  `7024ba6d2` before this branch.

Unexamined: the live tab's counts (desktop and layout gates, owner-run); the
upstream sim changes (Ferocious Bite, shaman totems). The frozen recordings in
`packages/core/test/fixtures/tab-recordings/` still name the old ids; the axis
judged them historical captures, not a finding.

## Domain

No contradiction of `docs/stage0-findings.md` or `docs/verification-log.md`;
no new WCL field use. `tools/database/overrides.go` sets the five new ids to
phase 3 and denies the eight old ones, and the universes hold the three rings
at p3-p5 only. Stonebreaker's Totem (33507) is phase 4 in db.json, is in
upstream's enhancement `p4.gear.json` and `p5.gear.json`, and enters ele/enh at
p4-p5, where Skycall Totem 33506 already sits. 281919 and 281923 are commented
stubs (`stat_bonus_cds_auto_gen.go:77-78`), so they are on `stubOnlyItemIds`,
the same treatment the old 33808 and 38175 had.

- **D1 (unverified).** Upstream's commit `975ba5870` ("Regenerate from
  2.5.6.70006: P4 Main Hand weapons -> One-Hand") changes 21 weapons from main
  hand to one hand. db.json has no per-phase hand type, so at every phase,
  including the current phase 3, `itemFitsSimSlot` now offers Fool's Bane
  (28657) and Mallet of the Tides (30058) in the off hand to enhancement and
  rogue, and those two plus Dragonmaw (28438) and Dragonstrike (28439) to
  warrior. That is right only if the 2.5.6.70006 client is live at phase 3.
- **D2.** `scripts/check_desktop_tab.py:122` says the catch-up "took 7
  Hallow's End items out of db.json and put 4 re-issued ones in". db.json lost
  8 and gained 5; 7 and 4 are the counts for ret's pool only. The blade
  (38175, re-issued as 281923) is in no pool, because upstream lists its
  effect as missing (the fork fixture's `_comment`). The pinned numbers 1118
  and 1175 are right.

Unexamined: `data/items/index.json` line by line (checked by id counts only);
upstream's Go changes; the `Test*.results` goldens.

## Standards + Spec

### Standards

Generated files are clean (five checks rc 0, LF endings, no stale copy of the
old counts left in `packages/core`, `scripts`, the fork's
`ui/features/upgrades` or the README). The fork fixture's `_comment` rule was
followed: it lists every id gained or lost with the reason. The lock
`_comment` sentence gives re-runnable commands. The merge message and the
`119b9f676` subject need no body.

- **S1 (hard).** `packages/core/test/pool.test.ts:421` and
  `packages/core/test/pool-hardening.test.ts:400` say "the commit that
  moves the number says which route changed". `74a712a8` moves 541 → 535 and
  794 → 791 with a subject only, and the subject ("Rebuild universes for
  re-issued Hallow's End") misattributes the ret-p2 drop: entry counts by
  `git show <rev>:data/universes/ret-p2.json` are 541 at `1a368e3e~`, 535 at
  `1a368e3e`, 535 at `74a712a8`, so the −6 came with the engine pin move, from
  the old ids leaving db.json.
- **S2.** `1a368e3e` and `d0cdbc3b` leave the core tests failing
  (`pool.test.ts` expects 541 while the committed universe holds 535), against
  AGENTS.md § The loop, step 2 ("a commit per green slice"). Same commits as
  A1.
- **S3 (judgement).** `scripts/check_desktop_tab.py:120-123` adds a dated
  change-history account to a code comment; the repo has removed such history
  from comments before (`7e3a489f`, "Drop change history from test
  comments").

Shotgun Surgery (the ret-p4 sizes pinned by hand in the fixture,
`settings_pool.test.ts`, `check_desktop_tab.py` and the README): the axis
found it already true on `dev`, so it is no finding against this branch.

### Spec

Spec: `docs/agents/upstream-catch-up.md` § "Moving the engine version (both
pins)" and the task statement. Every requirement whose result is visible in
the repos is met: engine lock `tag`, `commit`, `watchedRefs.master` and
`proto.commit` at `cec2a7b68`, only the `db.json` hash moved, `currentPhase`
still 3 so no `ENGINE_VERSION` bump; fork lock `commit` `119b9f676`,
`branchedFrom` `cec2a7b68` (= `8ccce9d7f^2` = `merge-base HEAD cec2a7b68`),
`pushed` false, dated `_comment`; nothing under
`ui/features/upgrades/model/engine/` changed, so no PROVENANCE cycle. The axis
rebuilt all 44 universes in a temp copy and got identical bytes. No scope
creep.

- **P1.** §1's `git merge-tree --write-tree` exits 129 on this machine's git
  2.34.1 (re-run by the dispatching agent: rc 129). git gained that mode in
  2.38.0 (git's `Documentation/RelNotes/2.38.0.adoc`, "git merge-tree learned
  a new mode where it takes two commits"). The executor used
  `GIT_INDEX_FILE=<tmp> git read-tree -m <OLD_PIN> HEAD <TARGET_SHA>` plus
  `git ls-files -u`. That replacement is safe: it touches neither the working
  tree nor the real index, and it marks every path both sides changed as
  unmerged, a superset of what a content merge would leave in conflict (it
  does not detect renames). The doc should say so.
- **P2.** `scripts/fork_upstream_status.py` (`pnpm fork:upstream-status`,
  the routine section's step 1) calls the same `merge-tree --write-tree` and
  fails loudly on git 2.34.1 (rc 129 is not in its `ok_codes`).
- **P3.** §2 assembles universes before §5 regenerates
  `data/equip-eligibility.json` and `data/sim-implemented-effects.json`, but
  `scripts/assemble_universe.py` reads both (lines 30 and 40) and
  `eligible_d7` admits only ids in the eligibility file, so a §2 pass cannot
  add items that the merged fork newly makes equippable. The universe sweep
  and `check_pool_completeness.py` belong in §5, after those two files are
  regenerated. §5 also names no command that writes
  `data/equip-eligibility.json`; the exporter's command is in
  `<fork>/ui/features/upgrades/tools/README.md`. This order is the cause of
  A1 and S2.
- **P4.** Same as A2 (`docs/fork-upstream-touchpoints.md` stale).

The desktop gate and the layout gate could not run in the agent sandbox and
are not findings. The spec requires, before `dev` receives the re-pin, that
`pnpm desktop-gate:check` is hand-run and its assertion lines (a)-(f) and (h)
are pasted into a commit body or a `desktop-gate.md`, and that a red gate
blocks the re-pin; check (h) may need `--update-golden` with the diff
explained, since the ret-p4 pool shrank by 3.

## Code quality

| ID  | Where                                  | Row                                                                                                                                                                                                                                                                                                                                               |
| --- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CQ1 | `scripts/check_desktop_tab.py:119-123` | The new sentence gives the database's change as "7 Hallow's End items out of db.json and 4 re-issued ones in" (D2: those are ret's pool counts, db.json lost 8 and gained 5) and adds dated change history to a code comment (S3). Rewrite it to say only why the recorded desktop reading (1121) differs from the constant, with correct counts. |
