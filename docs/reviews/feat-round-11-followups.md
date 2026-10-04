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
| A1       | Adversarial            | defer       | `.scratch/carry-forward/issues/546-static-ppm-procs-keep-old-chance-after-weapon-swap.md` — a Go test per site, a fix, and a fork re-pin.                                                                                                       |
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
