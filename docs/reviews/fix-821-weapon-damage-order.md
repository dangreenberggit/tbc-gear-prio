# Pre-merge review — fix/821-weapon-damage-order

Reviewed range: `e905cb5f3b6fc1dea6fc359f13f49f3af22dfe12..05ede6f87783805916d71f495a569f5752ffb63b`

Reviewed range: `05ede6f87783805916d71f495a569f5752ffb63b..fb88eb3d942e4e0819404d142e755f9dd54fa6f7`

Fork range reviewed as part of the branch: `vendor/tbc-new-fork`
`c9bb0acd367bd0712148c56b8d683ad6649895c0..b71e2508672defaa5296035a89dc07b5e6153247`
(the `commit` values in `data/wowsims-fork.lock.json` at the merge base and
at the tip). All 10 changed fork files are under `ui/features/upgrades/` and
none exists in upstream base `cec2a7b68` (`git cat-file -e` on each), so no
upstream wowsims file changed.

**Dispatch.** `python scripts/check_merge_ready.py --product-files` printed
the product files `data/desktop-gate/README.md`,
`data/desktop-gate/golden-{enh,mage,ret,rogue}-p4-cap40.json`,
`data/sim-implemented-effects.json`, `data/wowsims-fork.lock.json`,
`docs/fork-provenance/engine.md`, `docs/upgrades-tab-scope.md` and
`scripts/check_desktop_tab.py`; the axes reviewed those plus the fork diff.
The other changed files are tickets under `.scratch/carry-forward/issues/`
(363, 820, 821, 854-857, `NEXT`). The axes read them as the spec;
`instruction-review` was not run on them, because they are tickets, not agent
instructions (same practice as `docs/reviews/fix-644-655-set-bonus-list.md`
and earlier reviews). Not the small-change lane: `git diff --shortstat
dev...HEAD` gives 18 files, 764 insertions, 320 deletions, and the branch
changes `data/` paths. `codex` is not on `PATH`, so the three axes ran as
fresh `general-task` subagents on Opus, in parallel; Standards + Spec ran the
`code-review` skill, which ran its own two reviewers. The domain axis ran: the
diff prices weapon damage and two-handers, which is game-domain content. Every
axis was told it writes nothing. The desktop gate (`desktop-gate:check`)
cannot run in this sandbox (fork tsx build fails with `listen EPERM`); the
goldens in `05cddea6` are from the owner's runs outside it.

## Adversarial

No wrong number reaches the player. Two test gaps.

- **A1 (medium): the fix can be removed with every test green.**
  `Deps.itemEp` is optional (fork `ui/features/upgrades/model/engine/rank.ts:210`).
  When it is absent, `rank.ts:974-976` falls back to
  `epScore(getItem(itemId)?.stats ...)`, the stats-only order that gives
  weapon damage no credit: the bug this branch fixes. The reviewer deleted the
  `itemEp: itemEpFor(...)` line at fork `ui/features/upgrades/model/run.ts:117`
  in a scratch copy and ran `vitest run ui/features/upgrades`: 71 files, 799
  tests, all pass, the same as unchanged code. Only the manual desktop gate
  would notice. Direct fix: make `itemEp` required in `Deps` and delete the
  fallback, so the type checker refuses a run without it; or add a test that
  the tab's real deps carry `itemEp`.
- **A2 (reviewer: low): a test passes when the code it names is broken.**
  "scores a candidate in the slot it would take, so off-hand weapon damage is
  priced at the off-hand value" (fork
  `ui/features/upgrades/model/engine/candidate-order.test.ts:41-55`) still
  passes when `bestEpDelta` (`candidate-order.ts:52`) scores every slot at the
  main-hand value; the reviewer tried two such mutations and all 8 tests
  passed. Checked by reading: with main-hand-only scoring, Ripper scores
  90 - 100 = -10 and Cataclysm 0 - 100 - 40 = -140, so the asserted order
  `[RIPPER, CATACLYSM]` holds either way. The test needs inputs whose order
  flips when the off-hand value is not used.

Checked and clean (reviewer's runs): the other new tests fail when their
code is removed (two-hander charge, old cap filter, `calcStats()` with no
slot); `SIM_ORDER` index equals wowsims `ItemSlot` (MainHand 14, OffHand 15,
Ranged 16, `common.ts:2002-2010`); all 1422 weapons in `db.json` have
`scalingOptions["0"]`, so weapon DPS cannot be NaN; the two-hander charge is
right for an empty off hand, a shield or held item, and a worn two-hander;
the cap keeps exactly the first N unworn items plus every worn item;
`check_desktop_tab.py` still demands an exact row count;
`engine-port-drift:check` and `desktop-gate:unit:check` pass; the ret golden's
rows are byte-identical. Both working trees were clean.

## Domain

The change agrees with `docs/verification-log.md` and with the wowsims source.

- **D1 (low, ticket wording): a dual-wield spec's two-handers still score as
  upgrades.** The off-hand weight (enh 3.59) prices one more point of off-hand
  DPS, not the loss of dual wield, so a straight-line EP score cannot see that
  loss. Enhancement wearing two Syphon of the Nathrezim: Torch of the Damned
  +34.3 EP in the order, -551.3 DPS in the sim; Vengeful Gladiator's
  Bonegrinder +57.4 EP, -574.4 DPS (reviewer's script `$TMPDIR/s/ep.py` over
  `db.json`, `enh-fallback.ep-weights.json` and the new golden). Rows 34-37 of
  `data/desktop-gate/golden-enh-p4-cap40.json` are two-handers (handType 4 in
  `db.json`, checked by the review's dispatcher) losing 546-574 DPS. Ticket
  363's 2026-11-07 comment named only procs, on-use effects and weapon speed.
  A filter that drops two-handers for dual-wield specs would be a narrow patch
  on a guess; the reviewer advises a ticket note only.

Checked and correct: `getWeaponStatsBySlot` (fork
`ui/sim/proto/equipped_item.ts:15-28`) adds weapon DPS as the main-hand,
off-hand or ranged pseudo-stat; weapon weights per spec (enh MH 8.19 / OH
3.59, rogue 9.34 / 3.4, ret MH 5.34, mage none, which fits a sim that never
melees or wands); the two-hander charge acts only on `HandTypeTwoHand` in the
main hand, as `clearOffHandForTwoHander` (`rank.ts:4249-4274`) does in the
sim; the golden changes make game sense (rogue drops weapons worse than the
worn Warglaives; mage gains two items because worn items leave the cap's
count; ret unchanged). Not checked: the authors' "4 of 14 real upgrades in
the first 40" count, which needs the tab's full pool.

## Standards + Spec

**Standards:**

- **S1 (low):** commit `aa81feae`'s subject is 53 characters; the limit is 50
  (`~/.claude/AGENTS.md` § Commit messages, rule 2).
- **S2 (low):** two body lines of commit `05cddea6` are 73 and 78 characters;
  the limit is 72 (rule 6).
- **S3 (code quality):** fork `run.ts:116-117` calls `epWeightsFor(weightsSet)`
  twice, and passes weights and pseudo-weights separately although
  `EpWeightsFile` in `data.ts` holds them together; `itemEpFor` could take the
  set.
- **S4 (code quality):** in `candidate-order.ts` `bestEpDelta`, the guard
  `SIM_ORDER.indexOf(slotName) < 0` runs and then `wornEp(slotName)` runs
  `SIM_ORDER.indexOf` again.

Clean: the two re-pin commits change the lock, `data/sim-implemented-effects.json`
and `docs/fork-provenance/engine.md` together after their fork commits;
`engine.md` hashes match (`check_engine_port_drift.py`: 36 files match); the
fork's new tests pass (8/8) and `oxlint --max-warnings 0` is clean on the 10
files; no upstream wowsims file changed; the four goldens have 40 rows and
`forkCommit` `b71e2508…`, matching `capped_rows={40: 40}`.

**Spec:**

- **P1 (code quality, comment):** `scripts/check_desktop_tab.py:763-764`
  still says worn items are "inside the cap". Since fork `b71e25086` a worn
  item takes no cap place. Behaviour is unaffected.

Otherwise clean: ticket 821's ask (weapon damage at the weights'
`pseudoWeights`) and 820's ask (a two-hander against the worn main hand and
off hand) are met; the worn-items cap change is outside 820/821 but stated in
the brief and matches `docs/plans/wowsims-tab/candidate-pool.md:358,590`;
the on-screen text at fork `assumptions.ts:41` ("top N simmed in full, plus
anything you already own") now matches the code.

**Not a finding:** `data/wowsims-fork.lock.json` says `"pushed": false`, and
`git branch -r --contains b71e25086` in the fork prints nothing. The fork
branch must reach the main folder's fork before the merge
(`docs/agents/paired-worktrees.md` § Land it on dev, step 2).

## Code quality

| ID  | Where                                                                     | What                                                            |
| --- | ------------------------------------------------------------------------- | --------------------------------------------------------------- |
| S3  | fork `ui/features/upgrades/model/run.ts:116-117`                          | weights looked up twice; `itemEpFor` could take the weights set |
| S4  | fork `ui/features/upgrades/model/engine/candidate-order.ts` `bestEpDelta` | `SIM_ORDER.indexOf` computed twice per slot                     |
| P1  | `scripts/check_desktop_tab.py:763-764`                                    | stale comment: worn items no longer sit "inside the cap"        |

## Summary

Round 1 found no wrong result on screen today, but the fix is not yet
protected by its tests. Open, by effect (scope filter: all touch the order
the tab sims, so all are fix-worthy):

- **A2 — fixed before merge.** A test that passes when the per-slot scoring
  it names is broken.
- **A1 — blocks the merge** (a missing test this branch introduced) unless the
  owner allows a deferral. Removing the one wiring line brings the original
  bug back with every test green.
- **S3, S4, P1 — code-quality pass** before round 2, by one fresh agent. The
  edits are under `vendor/tbc-new-fork` and `scripts/`, where a workhorse type
  stops (`AGENTS.md` § Spawning), so it is a `general-task`.

Settled in this round: D1 (sentence added to ticket 363), S1 and S2
(`wontfix`, see Disposition). After the fixes, round 2 is the focused check
from `05ede6f87783805916d71f495a569f5752ffb63b`.

Tickets so far: filed 4 (854, 855, 856, 857), closed 2 (820, 821), by the
skill's two `git diff dev...HEAD -- '.scratch/carry-forward/issues/*.md'`
counts. Filed is higher than closed, because the branch's runs found four
new problems outside its scope.

## Disposition

| ID  | Axis        | Disposition | Ticket / note                                                                                                                                                                                                                                                                                                                                                                  |
| --- | ----------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| D1  | Domain      | fixed       | Sentence with the Torch of the Damned example and golden rows 34-37 added to `.scratch/carry-forward/issues/363-the-candidate-cap-can-silently-drop-a-real-item.md` § Comments                                                                                                                                                                                                 |
| S1  | Standards   | wontfix     | Commit-subject length; fixing it means rewriting the branch's history around a fork re-pin, and the message is still clear                                                                                                                                                                                                                                                     |
| S2  | Standards   | wontfix     | Commit-body line length; same reason as S1                                                                                                                                                                                                                                                                                                                                     |
| A1  | Adversarial | fixed       | Fork `e7dfd728d` makes `Deps.itemEp` required and deletes the stats-only fallback in `rank.ts`; re-pin `240562a3` gives the E-W3 harness and the fork-engine suites in `packages/core/test` a stats-only `itemEp` at their call sites. Deleting the `itemEp` line in fork `run.ts` now fails the fork's `tsc --noEmit` (TS2741), which `fork-lint:check` runs in `pnpm verify` |
| A2  | Adversarial | fixed       | Fork `8e6107af7` (re-pin `5fbc8f53`): new data in which Ripper wins in the off hand (+30) and Talon of Azshara in the main hand (+10). Both main-hand-only mutations of `bestEpDelta` fail the new test and pass the old one                                                                                                                                                   |
| S3  | Standards   | fixed       | Fork `3e7ea5cd5` (re-pin `5fbc8f53`): `itemEpFor` takes the set's weights and pseudo-weights as one object (`epWeightsFileFor` in `data.ts`), and `run.ts` looks the set up once                                                                                                                                                                                               |
| S4  | Standards   | fixed       | Fork `68b2afacf` (re-pin `5fbc8f53`): `bestEpDelta` looks up each slot's index once                                                                                                                                                                                                                                                                                            |
| P1  | Spec        | fixed       | `6ba10691` rewrites the comment: a capped run lists the cap itself, because worn items take no cap place                                                                                                                                                                                                                                                                       |

## Focused check (round 2)

Main range `05ede6f8..fb88eb3d` (round 2's `Reviewed range:` line). Fork range
`vendor/tbc-new-fork` `b71e2508672defaa5296035a89dc07b5e6153247..68b2afacf5716572e800cfbc4efc4496549fbee9`,
the lock's `commit` at `05ede6f8` and at `fb88eb3d`.

**Dispatch.** The session that handles this review's findings sent the
focused check to one fresh `general-task` subagent on Opus, which did not
write or review the branch's code. It ran the checks itself and edited no
code; every mutation below was reverted, and both working trees were clean
after it (`git status --porcelain` empty in the pair and in its fork).

**Conditions.**

1. Every commit is of a listed kind. Fork `e7dfd728d`, `8e6107af7`,
   `3e7ea5cd5` and `68b2afacf` name A1, A2, S3 and S4 in their message
   bodies. Main `240562a3` names A1. `5fbc8f53` is a fork re-pin (lock,
   `data/sim-implemented-effects.json`, `docs/fork-provenance/engine.md`).
   `f795824c` and `fb88eb3d` edit only this file and ticket 363. One
   commit does not meet the literal rule: `6ba10691` ("Fix the desktop
   gate's comment on worn items") names no finding ID. This review file's
   round 1 Disposition row P1 names it as P1's fix, and it changes only
   a comment, so the condition was taken as settled from this file; see
   R2-B1.
2. Every changed line outside tests, comments, docs and re-pin data is
   at a place a fixed finding cites: fork `rank.ts` `Deps.itemEp` and the
   deleted fallback (A1), fork `run.ts` weights lookup and `itemEp` line
   (A1, S3), `data.ts` `EpWeightsFile` and `item_ep.ts` `itemEpFor` (S3),
   `candidate-order.ts` `bestEpDelta` and the `OFFHAND_INDEX` constant it
   uses (S4). The lock and `sim-implemented-effects.json` lines in
   `240562a3` are the re-pin that carries A1's fork commit.
3. No fork commit in the range edits an upstream wowsims file: each of
   the 8 changed fork files is absent from upstream base `cec2a7b68`
   (`git cat-file -e`), and `git rev-list --merges --count
b71e25086..68b2afacf` is 0.

**Check 1 (conditions hold):** pass, with R2-B1.

**Check 2 (each fix changes only what its finding asks):** pass.

- A1: `Deps.itemEp` is required and the stats-only fallback and its
  `epScore` import are gone (fork `rank.ts:210`, `:975`). Every caller of
  the fork's `rankUpgrades` passes one: fork `run.ts`, `rank_cap.test.ts`,
  `rank_placeholders.test.ts`, and in this repo `fork-set-net`,
  `fork-sim-database`, `fork-run-progress`, `fork-meta-repair`,
  `feral-rank-fixture.ts` and `wowsims-fork-parity` (fork `git grep
"rankUpgrades("`; `git grep "engine/rank.ts"` here).
- S3: `itemEpFor` takes the `EpWeightsFile`; `run.ts` looks the set up
  once. Same behaviour for a set with no `pseudoWeights` (mage):
  `Stats.fromMap` skips an absent pseudo map (fork
  `ui/sim/proto/stats.ts:622-638`), as the deleted
  `epPseudoWeightsFor`'s `?? {}` did.
- S4: one `SIM_ORDER.indexOf` per slot; same results (the 3 order tests
  pass).
- P1: the comment at `scripts/check_desktop_tab.py:763-764` now says worn
  items take no cap place.

**Check 3 (each new test asserts its finding):** pass.

- A1, repeated round 1's mutation: deleted `itemEp: itemEpFor(weights),`
  from fork `run.ts` and ran `GOFLAGS=-buildvcs=false pnpm verify`: rc=1.
  `fork-lint:check` failed 2 of 2 checks, `run.ts(110,3): error TS2741:
Property 'itemEp' is missing ... but required in type 'Deps'`, and
  oxlint (the `itemEpFor` import left unused). Reverted.
- A2, two main-hand-only mutations of `bestEpDelta`, run with `npx
vitest run ui/features/upgrades/model/engine/candidate-order.test.ts`
  in the fork. M1 (candidate and worn item both scored in the main hand)
  and M2 (every slot priced at the main-hand value) each fail the new
  test: `expected [ 30082, 28524 ] to deeply equal [ 28524, 30082 ]`. M2
  against round 1's test file (`git show b71e25086:...`) passes 3 of 3,
  so the new data is what catches it. Talon of Azshara 30082 is a
  one-hander (`handType` 2, `HandTypeOneHand` in fork
  `proto/common.proto:352-358`; `assets/database/db.json`).

**Check 4 (tests the fixes touch pass):** pass.
`GOFLAGS=-buildvcs=false pnpm verify` at `fb88eb3d` with fork `68b2afacf`:
rc=0, `gates: 1596 ran, 0 skipped`. It runs the fork's tests and `tsc`
(`fork-tests:check`, `fork-lint:check`) and the five fork suites here. The
desktop gate (`desktop-gate:check`) cannot run in this sandbox (tsx `listen
EPERM`); the fix commits change no output the tab shows by reading, not by
a run.

**The stats-only `itemEp` in this repo's fork suites.** No test here
claims to check the tab's real candidate order while using
`statsOnlyItemEp`. What each suite says about the tab is about something
else: `fork-run-progress` about the tab's default seeds, `fork-set-net`
644-C about the set screen setting, `fork-meta-repair` 535-O1 about the
swap path. `fork-set-net`, `fork-sim-database` and `fork-meta-repair` run
with `candidateCap: 100` over hand-listed pools, so the order picks
nothing out. The one capped run (`fork-run-progress`, 4 of 12) holds only
armour, which has no weapon damage for the two scores to price
differently, and asserts progress events. `wowsims-fork-parity` (E-W3)
says in its comment that it uses stats times weights so both engines rank
the same candidates. `statsOnlyItemEp` does find the items: a probe in
`fork-run-progress` and `fork-sim-database` gave every pool item
`found=true` and a non-zero score except the two neutral items (10140,
8289), whose stats the feral weights do not price (probe reverted). The
tab's real order is covered by the fork's `candidate-order.test.ts`,
`item_ep.test.ts` and the manual desktop gate.

**Noted, not a finding.** The type check proves `run.ts` passes an
`itemEp`, not that it passes `itemEpFor`. Swapping in another scorer would
pass every automated gate; only the desktop gate would see it. Round 1's
A1 offered the required field as its direct fix, and that is what landed.

**Result:** all four checks pass. The only finding is R2-B1, bookkeeping.
No fix added a wrong result, a loud failure or a code-quality problem.

## Summary (round 2)

Round 2 passed. A1, A2, S3, S4 and P1 are fixed: removing the tab's
`itemEp` wiring now fails `pnpm verify`, and the per-slot order test fails
on main-hand-only scoring. No finding is open. Tickets: filed 4 (854, 855,
856, 857), closed 2 (820, 821), by the same two `git diff dev...HEAD --
'.scratch/carry-forward/issues/*.md'` counts as round 1; round 2 filed none.
Filed is higher than closed, because the branch's runs found four new
problems outside its scope.

## Disposition (round 2)

| ID    | Axis          | Disposition | Ticket / note                                                                                                                                                                                       |
| ----- | ------------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R2-B1 | Focused check | wontfix     | Commit `6ba10691` names no finding ID; round 1's Disposition row P1 names it as P1's fix, it changes only a comment, and naming the ID would mean rewriting the branch's history (as for S1 and S2) |
