# Pre-merge review — feat/round-11-followups

# Round 12 — tickets 540, 541, 539 and 538 (Round 11's follow-ups)

Reviewed range: `10c13a77f29f2702f97193fc4ba6a0ae867f23fb..fceb4842a5adf429279a941ac8c913c6288a93b1`

Fork `vendor/tbc-new-fork` (`feat/upgrades-tab`): `7d4d69d6a329473240085ddebaf532c7818b715b..1f102770e97cf68b12a09baf410ac931da84eba2`.

This round continues the numbering of `docs/reviews/feat-tab-signoff-followups.md`,
whose Round 11 filed tickets 538 to 541. The owner's handoff asked for Round
12 "from Round 11's recorded through-sha" (main `d9a1b25f`). Since then,
`dev` has taken other branches' merges (`git log --oneline --first-parent
d9a1b25f..10c13a77`: eight merges, among them `feat/run-progress-panel` and
`feat/fable-planner`, each with its own review file). Those are not this
branch's work, so this round reviews only this branch's own range: the
eight main commits from its branch point `10c13a77` (`git log --oneline
10c13a77..fceb4842`), and the five fork commits that the lock now pins
(`git -C vendor/tbc-new-fork log --oneline 7d4d69d6a..1f102770e`). Main
holds 14 files, +701/−65, most of it ticket text; the code is
`packages/core/src/meta.ts` and four test files. The fork holds 10 files,
+208/−92.

Round 11's own fix commits (main `77c337fd`, `43a2e8ea`, `732dba06`,
`2547c265`; fork `9b11bf214`) landed after Round 11 and reached `dev`
through the `feat/tab-signoff-followups` merge with no later round. They
were not diff-reviewed here. The spec axis instead checked that every
Round 11 row marked `fixed` holds in the code at `fceb4842` and fork
`1f102770e` (see Spec, and finding P5).

Dispatch: four fresh `general-task` agents on Opus (effort high), in one
parallel batch — adversarial and domain on the `.agents/reviews/` briefs,
and the `code-review` skill's Standards and Spec halves as two agents with
that skill's prompts and smell baseline. No `codex` binary on PATH. Every
axis was told it writes nothing; each reported the expected dirty state
(seven untracked owner handoffs and this file) and a clean fork at
`1f102770e`.

Tests run by the axes:

- `npx vitest run` on `candidate-gems`, `meta-repair`, `rank` and
  `fork-meta-repair` test files, Node 22.17.1: rc=0, 152 passed
  (adversarial).
- `go -C vendor/tbc-new-fork test -tags=with_db ./sim/ -run 'TestWeaponProc|TestItemSwapProc' -count=1 -v`:
  rc=0, 7 passed (adversarial and domain).
- `go -C vendor/tbc-new-fork test -tags=with_db ./sim/core/ -run 'TestEmptyMetaSocket|TestDisabledGem|TestSocketBonus' -count=1 -v`:
  rc=0, 4 passed (adversarial); the domain axis ran
  `TestEmptyMetaSocket|TestEmptySocketNeverEarns|TestDisabledGemKeeps`:
  rc=0, 3 passed.
- `python scripts/check_engine_port_drift.py`: rc=0 (standards).

## Adversarial

No defect in the diff. The three fixes are correct as written, and the
tests checked fail on the old behaviour: `540-red.txt` shows the five 540
Go tests failing before the fix, `538-red.txt` shows 538-H timing out at
30019 ms on the old code, and a scratch probe showed the 541 rank-test
oracle picks the matched layout by tie-break under the old rule (80 against
40+40), so the oracle does tell the two rules apart.

- **A1 (medium; already in the code before this branch).** Unbridled Wrath
  (`sim/warrior/talents_fury.go:69`) and Seal of Vengeance
  (`sim/paladin/seals.go:815`) build `NewStaticLegacyPPMManager` once, with
  no item-swap callback (`sim/core/procs.go:57-61`). The proc chance is
  weapon speed × PPM, read at build time (`procs.go:150-158`), so after a
  swap to a weapon of another speed the old chance stays; a hand with speed
  0 at build time gets no proc mask (`procs.go:134-137`), so a swap from a
  two-hander to dual wield would leave off-hand hits unable to proc. Ticket
  540 covered only the five type-keyed sites. The DPS effect is not
  measured (hypothesis, untested).
- **A2 (low, test strength).** The five 540 tests
  (`sim/item_swap_weapon_proc_test.go:180-245`) assert only a proc count
  above 0 after the swap. That proves the proc mask follows the new weapon,
  not that a PPM chance (Mace Specialization, Twin Blades) uses the new
  weapon's speed. Read from `item_swaps.go:373-377` and `:434-436`,
  `SetMH` runs before the callbacks, so the code is right today; no test
  pins it.
- **A3 (low, disclosure).** `missingMetaPreferenceNote` (core
  `packages/core/src/candidate-gems.ts:194`, fork `engine/candidate-gems.ts:263`)
  says items for a spec with no meta preference are priced "without any
  meta gem's stats or effect". After 541 those items also lose their
  socket bonus, and the note does not say so.
- **A4 (low).** Fork `rank.ts` detects Stop two ways: the hit-read catch
  tests `instanceof StopRefusedSim` (`:1143`), the version-read catch tests
  `deps.signal?.aborted` (`:1248`), and that catch's comment (`:1247`)
  still says "the guard refused the read", though the read now goes
  through `readStats`. The guarded `computeStats` in `stopGuardedDeps`
  (`:4069-4073`) has no caller left: `grep -rn computeStats` over the
  fork's `upgrades/` finds only the two `readStats(deps.sim, …)` calls,
  the existence checks and the adapter. No result changes, because a
  stopped run caches nothing (`rank.ts:2070-2088`).

Unexamined: swaps made before the pull (`swapItem` returns before `SetMH`,
`item_swaps.go:417`; hypothesis, untested, and already true of the 531
helper); `ui/core/worker_pool.ts`; the full Go suite and `pnpm verify`;
ticket and lock text; 539 (no code change).

## Domain

No contradiction in the diff.

- **541.** Fork `sim/core/database.go:633-644` pays the socket bonus only
  when every socket holds a gem whose colour intersects the socket's. An
  empty gem has colour 0, which `ColorIntersects` (`:766-790`) matches to
  nothing, so an empty meta socket and an empty coloured socket both
  withhold the bonus. A meta gem whose conditions are not met keeps its
  colour, so the bonus stays (`:534`, `:625-627`). Core `meta.ts:149-163`
  and fork `engine/meta.ts:56-70` apply exactly this rule. ADR-0025's note
  that Decision 3 followed the reforge optimizer's own predicate is right
  (`reforge_optimizer/gear.go:152-161` skips non-coloured sockets).
- **540.** Hand of Justice and the two Sword Specializations use a fixed
  chance; Twin Blades 2pc and Mace Specialization use PPM. Read from
  `item_swaps.go:406-449`, `SetMH`/`SetOH` run before each slot's
  callbacks, so a rebuilt manager reads the new weapon. The talent procs
  need a sword or mace, so following the swapped weapon is right. Fixture
  gems in 541-F meet Relentless (`proto_utils/gems.ts:180-186`).
- **D1 (informational; predates this branch).** Hand of Justice keeps
  upstream's sword-only proc mask (`sim/common/classic/items_trinkets.go:16`,
  same as `upstream/master`). That the trinket procs from any melee weapon
  in TBC is general game knowledge only; neither findings doc covers it
  (`grep -i "hand of justice"` returns nothing). Ticket 540 records it as
  upstream's (ticket 258, wontfix).
- **D2 (minor).** Ticket 540's "What was found" said the bug matters "only
  when … the swapped weapon has a different speed". For the fixed-chance
  sites the weapon type matters, not the speed.

Unexamined: the 538 stats-read race (engineering, not a game rule); the
DPS size of 540; a prismatic gem in a meta socket (sim matches it, TS does
not; predates the branch and cannot happen in game).

## Standards + Spec

**Standards.** The lock `commit` and `data/sim-implemented-effects.json`
`forkCommit` both name `1f102770e`, the fork HEAD. Each fork commit is
covered by a re-pin that also regenerated effects (`5e0c6f16a`,
`a6a0323f8` → `fd41536d`; `4aa928920`, `e413972db` → `f79d416a`;
`1f102770e` → `fceb4842`). The PROVENANCE hashes of `meta.ts` and
`rank.ts` at `1f102770e` match their rows, and the core and fork
`socketBonusActive` bodies are identical. All 13 commit subjects are 50
characters or fewer and imperative; no body line passes 72. Tests sit on
`rankUpgrades` or on pure functions. Causal claims in tickets and the ADR
give a file:line or command, or say hypothesis.

Hard, banned words (global writing rules): **ST1** "carry" in ticket 539's
close; **ST2** "carries" in ticket 541's ADR paragraph; **ST3** "surface"
in the fork `rank.ts` `readStats` comment ("its late failure must not
surface as an unhandled rejection"). Judgement: **ST4** the `readStats` doc
comment has one sentence of about 70 words ("There is no timeout: every
path …"); **ST5** two routes to one Stop guard, the set phase calling
`readStats` directly and `stopGuardedDeps` wrapping `computeStats` (same as
A4); **ST6** `const META_YELLOW = [1, 4];` in 541-F uses raw enum numbers
where `GemColor` would do; **ST7** test comments say "intersecting gem"
where `meta.ts` and the ADR say "matches".

Not checked: `pnpm verify` at the intermediate commit `9f03ed7c`.

**Spec.** The branch does what tickets 538 to 541 asked. Every evidence
claim checked matches its log or test title: 538-H, 541-F, 535-S3 and
535-V5 are test titles; `538-red.txt` / `538-green.txt` (125 passed);
the five Go tests in `540-red.txt` and 7 PASS in `540-green.txt`;
`540-sim-all.txt` fails only `TestProtoVersioning`, on proto deletions;
`541-sim-reading.txt` PASS; the blast-radius before/after files are 2661
lines each and `cmp` gives rc=0; `539-live-check.txt` matches the ticket
row by row. The fork origin is still at `7d4d69d6a` and the lock says
`pushed: false`.

- **P1 (not a defect).** Ticket 538 asked to "race each read against the
  run's abort signal and a timeout". No timeout was added; the owner chose
  option 3 ("3 sound ok", `decision-log.md:118`), and the worker silence
  check is ticket 545, whose Origin quote matches the decision log.
- **P2.** 541 says 541-F "failed before the fork edit"; no log of that red
  run was saved. `execution-report.md:266` records rc=1.
- **P3 (scope beyond the tickets, each an orchestrator or planner ruling,
  none attributed to the owner).** 540 also fixed Rogue Sword
  Specialization (`plan-review-r0.md` R2; `decision-log.md:17`) and added a
  Twin Blades `Slots` line (`decision-log.md:54`); 538 added a
  `console.debug` stats-read timing line, which ticket 545 uses; ADR-0025
  Decision 3 was marked superseded by a planner ruling
  (`decision-log.md:30`), the owner question on it withdrawn
  (`decision-log.md:93`).
- **P4.** Ticket 540 notes that 29 other sets have pieces in feet, waist,
  wrist or finger slots, so a swap of only those slots would not re-check
  their bonus, and says "It is not changed here and has no ticket."
- **P5.** Round 11's `fixed` rows all hold at `fceb4842` / fork
  `1f102770e` except ST8, which is partial: fork `engine/view.ts:322`
  still tells history ("a non-set item that breaks a worn bonus showed a
  low figure with no reason"), and the rewritten line 325 is not wrapped.

## Summary

Nothing blocks a merge on correctness, domain facts or spec. Tickets 540
and 541 are fixed and agree with the Go sim; 539 was correctly closed as
no defect; 538 does what the owner chose (Stop ends a hung stats read; no
timeout; ticket 545 for the rest). The axes' tests pass. One real
follow-up is a new ticket: two more procs (Unbridled Wrath, Seal of
Vengeance) keep a stale proc chance after a weapon swap (546). Ticket
wording (ST1, ST2, D2) is fixed in this commit, and the map gains lines
for 545 and 546. Three small code fixes remain, in the fork and in core,
which this review may not edit; they are grouped as R12-PF1 to R12-PF3 in
the `pending` rows below for the orchestrator to dispatch, as Round 11 did
with its R11-PF rows. Until each `pending` row becomes `fixed` or
`wontfix`, `pnpm merge-to-dev --check-only` refuses this file.
(Since done: all three were fixed at fork `d14f459d0` and main
`be705bdf`, and Round 13 reviewed them.)

- **R12-PF1** (fork `engine/rank.ts`, one fork commit and re-pin): "surface"
  to plain wording in the `readStats` comment (ST3); split its 70-word
  sentence (ST4); drop the unused `computeStats` wrapper in
  `stopGuardedDeps` and use one Stop test in both catches, fixing the stale
  ":1247" comment (A4, ST5).
- **R12-PF2** (fork `engine/view.ts:322-325`, same fork commit): state what
  `singleSwapBreaks` does, without the history, and wrap line 325 (P5).
- **R12-PF3** (core `packages/core/src/candidate-gems.ts:194` and fork
  `engine/candidate-gems.ts:263`, PROVENANCE cycle): the no-meta-preference
  note also says those items are priced without their socket bonus (A3).

## Disposition

| ID       | Axis                   | Disposition | Ticket / note                                                                                                                                                                                                                                   |
| -------- | ---------------------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1       | Adversarial            | fixed       | Closed in ticket 546 at fork `536645d01`: both sites build their proc manager with `NewLegacyPPMManager`, and three Go tests assert the proc rate per white hit follows the swapped-in weapon's speed.                                          |
| A2       | Adversarial            | wontfix     | The code reads the new speed (`item_swaps.go:373-377`, `:434-436`, read by two axes); a speed assertion would be hardening only, dropped under the small-findings rule. Ticket 546's closing item 1 asks its own tests to assert on the chance. |
| A3       | Adversarial            | fixed       | R12-PF3, fork `d14f459d0` and this commit: core and fork `missingMetaPreferenceNote` also say the items are priced without their socket bonus; `candidate-gems.test.ts` asserts it.                                                             |
| A4, ST5  | Adversarial, Standards | fixed       | R12-PF1, fork `d14f459d0`: `stopGuardedDeps` no longer wraps `computeStats`; both read catches test `StopRefusedSim`, and the set-version catch's comment no longer names the guard.                                                            |
| D1       | Domain                 | wontfix     | Upstream's mask; combat modelling is upstream's (ticket 258, wontfix), as ticket 540 records under "Hand of Justice mask".                                                                                                                      |
| D2       | Domain                 | fixed       | This commit: ticket 540 "What was found" says the swap matters when the weapon has a different speed (PPM procs only) or a different weapon type.                                                                                               |
| ST1, ST2 | Standards              | fixed       | This commit: ticket 539 "does carry" to "does pass on"; ticket 541 "carries" to "has".                                                                                                                                                          |
| ST3, ST4 | Standards              | fixed       | R12-PF1, fork `d14f459d0`: "surface" is now "become", and the 70-word sentence in the `readStats` comment is four sentences.                                                                                                                    |
| ST6      | Standards              | wontfix     | A two-value test constant with a comment; a `GemColor` import changes no behaviour. Dropped under the small-findings rule.                                                                                                                      |
| ST7      | Standards              | wontfix     | "Intersects" is the sim's own term (`ColorIntersects`, `database.go:766`), which the tests follow; "matches" is the TS function's (`gemColorMatchesSocket`). Both describe the same check.                                                      |
| P1       | Spec                   | wontfix     | Owner ruling Q-538-timeout: "3 sound ok" (2026-10-04), option 3 in `q-538-timeout.md`; the rest is ticket 545.                                                                                                                                  |
| P2       | Spec                   | wontfix     | `execution-report.md:266` records the red run (rc=1); the green run and the Go sim reading are logged. No code change would add evidence now.                                                                                                   |
| P3       | Spec                   | wontfix     | Each widening is recorded in the stage-gate decision log and in its ticket; listed for the owner in the report, no code change.                                                                                                                 |
| P4       | Spec                   | wontfix     | Ticket 540 recorded the decision not to ticket it; it is the same mechanism as 540 in slots that a weapon-swap set does not reach. Listed for the owner in the report.                                                                          |
| P5       | Spec                   | fixed       | R12-PF2, fork `d14f459d0`: the `singleSwapBreaks` comment says why the function exists, without the history, and every line is wrapped.                                                                                                         |

# Round 13 — Round 12's fixes and ticket 546

Reviewed range: `fceb4842a5adf429279a941ac8c913c6288a93b1..3c0dd2880e41522bea847ba14173711bd09e4716`

Fork `vendor/tbc-new-fork` (`feat/upgrades-tab`): `1f102770e97cf68b12a09baf410ac931da84eba2..536645d011160b9760f78012700a9d404d4fcafb`.

The main range has four commits (`git log --oneline fceb4842..3c0dd288`):
`5f7c57dc` is Round 12's own review text and its ticket filing; `be705bdf`
applies R12-PF3 in core and re-pins the fork to `d14f459d0`; `888c7d30` is
the layout-gate record that `merge-to-dev --check-only` wrote; `3c0dd288`
re-pins the fork to `536645d01` and closes ticket 546. The fork range has
two commits: `d14f459d0` (R12-PF1 to R12-PF3 in `engine/rank.ts`,
`view.ts`, `candidate-gems.ts` and PROVENANCE) and `536645d01` (ticket 546:
`talents_fury.go`, `seals.go`, and three tests in
`sim/item_swap_weapon_proc_test.go`). Spec sources: Round 12's rows above,
ticket 546, and `.scratch/stage-gate/round-11-followups/546-plan.md` with
its `546-*.txt` logs (gitignored).

Dispatch: four fresh `general-task` agents on Opus (effort high). The Spec
and domain axes ran first, in an earlier dispatch of this round; their
reports were reused unchanged (run log
`.scratch/agent-runs/5cef0953-10d5-4668-b1e6-2fbbf6778cb6.jsonl`, agents
`ac1ae002323fa2df7` and `a60431927e43dc35a`). The adversarial axis and the
Standards half of `code-review` ran later, in one parallel batch, with the
same briefs. No `codex` binary on PATH. Every axis was told it writes
nothing; each reported the main tree with only the seven untracked owner
handoffs and the fork clean at `536645d01`.

Tests run by the axes:

- `go -C vendor/tbc-new-fork test -tags=with_db ./sim/ -run 'TestItemSwapRate' -count=1 -v`:
  rc=0, 3 passed, rates 0.3689, 0.4737 and 0.4802 (adversarial and domain).
- `python scripts/check_engine_port_drift.py`: rc=0, "36 ported files match
  PROVENANCE.md" (standards).

## Adversarial

No blocking defect. The three 546 tests fail on the old code
(`546-red.txt`: 0.6326, 0.3206 and 0.8525 against wanted 0.375, 0.4742 and
0.5) and pass on the new. The expected value is weapon speed × PPM / 60
from constants; the measured hits only weight the off-hand blend, so the
tests are not true by construction. With item swap off,
`RegisterItemSwapCallback` registers nothing (`item_swaps.go:131-133`), so
`NewLegacyPPMManager` equals the static manager; with it on, the callbacks
run after the auto attacks are updated (`item_swaps.go:373`, `:376`), and
the end-of-iteration reset rebuilds from the original gear.

- **R13-A1 (low).** The `gems.meta-repair-set-versions` note is kept on a
  stopped run. Fork `rank.ts:1955-1967` (ticket 533) clears every
  set-phase output on Stop but not `hitCapNotes`; the note goes into
  `substitutions` (`rank.ts:2031`), then the `PartialRanking`
  (`rank.ts:2075`), and the tab shows substitutions on a stopped run
  (`upgrades_tab.tsx:2863`). Trigger: a non-Stop error in a set-phase
  `versionGears` call. A read that Stop cuts short is a `StopRefusedSim`
  (`rank.ts:4015`, `:4024`), and the catch at `rank.ts:1248` stays silent
  for it.

The two questions this round had to settle:

- **Does a stopped run drop set-phase notes (ticket 533)?** No. The abort
  block at fork `rank.ts:1955-1967` resets the set result, `steps`,
  `packageSimSkips` and each row's `setContext`; it does not touch
  `hitCapNotes`. Since `d14f459d0`, the set-version catch at `rank.ts:1248`
  skips the warning and the note only for `StopRefusedSim`, so a non-Stop
  error that happens after Stop now adds the note. Before `d14f459d0` the
  same note was already kept on a stopped run when the error came before
  Stop; the change widens that case to errors after Stop. This is R13-A1.
- **Does a rejected read cached in `versionReads` (`rank.ts:1212`)
  matter?** No. The map is created inside `rankAfterJobCreated` on every
  run (`rank.ts:1091`, `:1171`), so a later run never sees it. In the same
  run, the catch that leaves the rejected promise in the map also sets
  `versionBudgetsOff = true` (`rank.ts:1245`), and the guard at
  `rank.ts:1197` then returns the shared layout before the map lookup.
  `hitCapFailed` (`rank.ts:1246`) stops the ranking from being cached
  (`rank.ts:2086`). Whether two `versionGears` calls can be in flight on
  one key at once was traced for two call sites only (`rank.ts:3025`,
  `:3252`); the worst case would be a repeated warning and note, not a
  wrong number (hypothesis, untested).

Unexamined: core `candidate-gems.ts` and its test (covered by Spec); the
`view.ts` change (comment only); the six other `versionGears` call sites;
a weapon swap before the pull (`item_swaps.go:417` returns before the auto
attacks are updated; same as the static manager, so not a regression).

## Domain

No game-rule error. A PPM proc's chance per hit is the hitting weapon's
speed × PPM / 60; after `536645d01`, Unbridled Wrath and Seal of Vengeance
follow it after a swap, through the rebuild-in-place manager that upstream
already uses for Seal of Command (`upstream/master:sim/paladin/seals.go:915`).
Item speeds from `assets/database/db.json` (28295 = 2.6, 25952 = 1.5,
28307 = 1.5, 24550 = 3.6) give the tests' expected chances. The new note
text is true under the sim's socket-bonus rule (fork `database.go:633-644`).

- **R13-D1 (informational).** The PPM values (15 for 5/5 Unbridled Wrath,
  20 for Seal of Vengeance) are upstream's and general game knowledge;
  neither `docs/stage0-findings.md` nor `docs/verification-log.md` covers
  them (`grep -niE "unbridled|vengeance|ppm"`). Upstream still uses
  `NewStaticLegacyPPMManager` at both sites (`talents_fury.go:69`,
  `seals.go:815` on `upstream/master` `17a8fb28c`), so the fork now
  differs from upstream at two lines. PPM, proc mask and outcome are
  unchanged, so this stays inside "combat modelling is upstream's"
  (ticket 258).
- **R13-D2 (informational).** One static manager remains: Elune's Touch,
  `sim/druid/forms.go:362`. It is outside ticket 546.
- **R13-D3 (minor).** Ticket 546's off-hand table row gave the start and
  swapped-in chances from the red run's hit split (0.3246, 0.4742); the
  green run gives 0.3286 and 0.4754 (`546-green.txt:36`). The verdict does
  not change. Same finding as R13-P1.

## Standards + Spec

**Standards.** No documented standard is broken. The lock `commit`,
`data/sim-implemented-effects.json` `forkCommit` and the fork HEAD all
name `536645d01`; the PROVENANCE sha256 rows for `rank.ts`, `view.ts` and
`candidate-gems.ts` match the files at `536645d01`; all six commit subjects
follow the seven rules and have no body; no banned word in the added
lines.

- **R13-ST1 (judgement).** Fork `engine/rank.ts:1247`: "A read Stop ended
  is no failure to report (ticket 538)." The missing "that" makes it hard
  to parse; "A read that Stop ended is not a failure to report" is plainer.
- **R13-ST2 (judgement).** This file's Round 12 Summary still said three
  code fixes remain and that check-only refuses the file.
- **R13-ST3 (judgement, Duplicated Code).** In fork
  `sim/item_swap_weapon_proc_test.go`, the new `runSim` repeats the
  `core.RunRaidSim` and error block of the two older tests, which were left
  as they were, and `playerActionTargets` repeats the walk in `procCount`.
- **R13-ST4 (judgement).** The axis reported ticket 546's `procs.go`
  citations as off by one or two. Checked against `git -C
vendor/tbc-new-fork show 536645d01:sim/core/procs.go`:
  `NewLegacyPPMManager` is lines 46-54 and `NewStaticLegacyPPMManager`
  57-61 (the file did not change in this range), so only one citation,
  `:47-54` in "What would close this", was wrong.

**Spec.** Everything asked for is done. R12-PF1 to R12-PF3 hold at fork
`d14f459d0`: "surface" is "become", the 70-word sentence is four, the
`computeStats` wrapper is gone and both catches test `StopRefusedSim`
(`rank.ts:1143`, `:1248`), the `view.ts` comment is rewrapped without
history, and core and fork notes say "without their socket bonus", which
`candidate-gems.test.ts` asserts. Ticket 546's three closing items are
done at fork `536645d01` and main `3c0dd288`. `546-sim-all.txt` fails only
`TestProtoVersioning`, on proto deletions; `546-verify.txt` and
`546-check-only.txt` end rc=0. The lock says `pushed: false`, and
`ls-remote` gives `7d4d69d6a` for the fork origin.

- **R13-P1 (minor).** `546-plan.md:33` asks for "the measured rates
  before/after for each test"; the off-hand row used the red run's
  chances. Same as R13-D3.
- **R13-P2 (not scope creep).** R12-PF1 asked for one Stop test in both
  catches without naming which; `instanceof StopRefusedSim` matches the
  hit-read catch. Its side effect is R13-A1.
- **R13-P3 (informational).** `888c7d30` records a new layout-lock
  `testedTabHash`; check-only wrote it, and `decision-log.md:141` logs it.

Not checked by any axis: the claim in the lock `_comment` that the parity
test gave rc=0 at `d14f459d0` (no log saved; unverified); `pnpm verify` at
`be705bdf`.

## Summary

Nothing blocks a merge. Round 12's three fixes are in the code, ticket 546
is fixed and its tests fail red and pass green, and no game rule is wrong.
The one code-level finding, R13-A1, is a note about a real set-phase
failure that is kept on a stopped run; it changes no figure and is
disposed `wontfix` below. Ticket 546's off-hand table row and one line
citation are fixed in this commit, and the Round 12 Summary now says its
pending fixes are done. No ticket filed, no `pending` row.

## Disposition (round 13)

| ID             | Axis         | Disposition | Ticket / note                                                                                                                                                                                                                                                                                                                                                          |
| -------------- | ------------ | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R13-A1         | Adversarial  | wontfix     | The note reports a real set-phase read failure, which the user may want whether or not they pressed Stop; it was already kept on a stopped run for errors before Stop, it changes no figure, and a Stop refusal stays silent (`rank.ts:1248`). A fix would be a fork commit, re-pin and PROVENANCE cycle for a rare error path; dropped under the small-findings rule. |
| R13-D1         | Domain       | wontfix     | Informational. The PPM values are upstream's; only the rebuild after a swap changed, which is upstream's own pattern for Seal of Command, so the ticket 258 line is not crossed.                                                                                                                                                                                       |
| R13-D2         | Domain       | wontfix     | Informational and outside ticket 546; no ranked case swaps weapons on a druid that uses Elune's Touch (hypothesis, untested).                                                                                                                                                                                                                                          |
| R13-D3, R13-P1 | Domain, Spec | fixed       | This commit: ticket 546's off-hand row gives both pairs (0.3246 red, 0.3286 green; 0.4742 red, 0.4754 green), and the prose cites `546-red.txt:37` and `546-green.txt:36`.                                                                                                                                                                                             |
| R13-ST1        | Standards    | wontfix     | The comment is grammatical, and the next line's `StopRefusedSim` test makes its meaning clear; a fork commit, re-pin and PROVENANCE cycle for one word is not worth it. Dropped under the small-findings rule.                                                                                                                                                         |
| R13-ST2        | Standards    | fixed       | This commit: the Round 12 Summary says the three fixes are done, at fork `d14f459d0` and main `be705bdf`.                                                                                                                                                                                                                                                              |
| R13-ST3        | Standards    | wontfix     | Test-only repetition in a fork Go test file; routing the two older tests through `runSim` changes no behaviour and would need its own fork commit and re-pin.                                                                                                                                                                                                          |
| R13-ST4        | Standards    | fixed       | This commit: ticket 546's "What would close this" cites `procs.go:46-54`. The other citations were correct at `536645d01` (checked with `git show`).                                                                                                                                                                                                                   |
| R13-P2         | Spec         | wontfix     | Not a defect: the choice is inside R12-PF1's ask; its side effect is R13-A1.                                                                                                                                                                                                                                                                                           |
| R13-P3         | Spec         | wontfix     | Informational: `merge-to-dev --check-only` writes the layout-gate record by design.                                                                                                                                                                                                                                                                                    |
