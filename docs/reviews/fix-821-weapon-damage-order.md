# Pre-merge review — fix/821-weapon-damage-order

Reviewed range: `e905cb5f3b6fc1dea6fc359f13f49f3af22dfe12..05ede6f87783805916d71f495a569f5752ffb63b`

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

| ID  | Axis      | Disposition | Ticket / note                                                                                                                                                                  |
| --- | --------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| D1  | Domain    | fixed       | Sentence with the Torch of the Damned example and golden rows 34-37 added to `.scratch/carry-forward/issues/363-the-candidate-cap-can-silently-drop-a-real-item.md` § Comments |
| S1  | Standards | wontfix     | Commit-subject length; fixing it means rewriting the branch's history around a fork re-pin, and the message is still clear                                                     |
| S2  | Standards | wontfix     | Commit-body line length; same reason as S1                                                                                                                                     |
