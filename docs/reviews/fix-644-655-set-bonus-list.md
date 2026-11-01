# Pre-merge review — fix/644-655-set-bonus-list

Reviewed range: `ee69ae722241d87db1b0fce74c668d38aa80f6d2..1f979d3268d49f083ef79f3667fd9e7134246f30`

Fork range, round 1: `119b9f676fd09622d1e81cea9ebcd190718ed13e..5b9182ed07f4cf296cc25d9b07c9424c9523f704`
(`vendor/tbc-new-fork`, branch `fix/644-655-set-bonus-list`; commits
3f2948ce1, fba7e1ad9, 5b9182ed0).

Dispatch note, round 1:

- Requested by the owner on 2026-11-01, replying "Sure" to
  "Q-644-655-review: start the pre-merge review?".
- The pair sits under `.scratch/wt-644-655` (the sandbox cannot write
  `/home/daniel/Code/lulz/tbc-wt/`), so `pnpm wt:*` does not know it. Both
  trees were clean at dispatch (`git status --short` empty in each).
- Tooling check: `python scripts/check_merge_ready.py --product-files`
  printed `data/sim-implemented-effects.json`, `data/wowsims-fork.lock.json`,
  `docs/fork-provenance/engine.md`, `packages/core/test/fork-set-net.test.ts`
  (rc=0), so the branch is mixed. The axes reviewed those four files and the
  fork range above. The other changed files are tickets 644, 655 and 736 and
  `.scratch/carry-forward/issues/NEXT`. They are not agent instructions, so
  `instruction-review` has nothing to read there (as in
  `docs/reviews/chore-733-gate-runs-dev-copy.md`); the Spec axis read the
  tickets as the spec.
- Not the small-change lane: `git diff --shortstat dev...HEAD` gave
  `8 files changed, 390 insertions(+), 66 deletions(-)`, and two paths start
  with `data/`.
- `codex` is not on `PATH`. Four fresh `general-task` agents on Opus (review
  lane) ran the adversarial axis, the domain axis, and the `code-review`
  skill's Standards and Spec agents. Each was told it writes nothing.
- Domain axis run: the diff decides which set-bonus piece counts a ranking
  lists (game-domain content).
- Wowsims-file check (`docs/fork-upstream-touchpoints.md` § How to reproduce
  every number here): at fork `119b9f676` and at `5b9182ed0`,
  `git -C vendor/tbc-new-fork diff --numstat --diff-filter=M cec2a7b68 <tip>`
  prints only `6 0 ui/app/SimTabsSection.tsx`, and `--name-status ... | cut -f1 | sort | uniq -c`
  prints `237 A`, `1 M`. The same at both tips.

## Adversarial

- **A1 (loud failure, introduced) —
  `vendor/tbc-new-fork/ui/features/upgrades/model/engine/rank.ts:3845`.**
  `setBonusCountsInReach` rethrows `StopRefusedSim`, and nothing above it
  (`buildSetBonuses`, awaited from `rankUpgrades` near :1560) catches it, so
  a Stop pressed while the worn-set reads run makes the whole ranking reject
  instead of returning the stopped result. Every other set-phase read
  swallows a Stop (`rank.ts:1077`, `:1177`, `:1657`). Shown by a copy of
  `fork-set-net.test.ts` that runs `STOP_SCENARIOS` with
  `reportsSetBonuses: true` at every `stopDuringCall`: scenario 511-SR at
  calls 4 and 5, and case 8 at calls 7 and 8, print
  `THREW StopRefusedSim`; every other call gives the same ranking as a Stop
  before the set phase. Probe and output (gitignored):
  `.scratch/agent-reports/2026-11-01-review-644-655-probe/probe.test.ts` and
  `out2.txt`; the reviewing session read `rank.ts:3796-3850` and `out2.txt`.
  What the tab then shows: hypothesis, untested (probably its error state).
- **A2 (missing test, introduced) — `packages/core/test/fork-set-net.test.ts`
  (the fake runner near :291, the Stop suite near :5001) and
  `worker_pool_sim_runner.test.ts`.** Only cases 644-A, 644-B and 644-C give
  the fake runner `activeSetBonuses`; the production runner always has it
  (`run.ts:65`, `:125`, per the axis). So the Stop tests and the 511 screen
  tests run only the fallback path, and `WorkerPoolSimRunner.activeSetBonuses`
  has no test. This is why A1 was not caught.
- **A3 (visibly wrong result, rare, introduced) — `rank.ts`
  `setBonusCountsInReach` (the `MetaRepairError` `continue` and the
  read-failure `console.warn`, :3829-3850).** When the largest package fails
  gem repair, or the read fails, that set falls back to trying every count,
  which brings back the 644 symptom (for example a Thunderheart entry at 5)
  with only a console warning. A smaller package that does repair would
  still give the counts up to its size. How often a meta gem fails only at
  the top count: hypothesis, untested. The Spec axis found the same (P3).
- **A4 (other: spec gap, introduced) —
  `vendor/tbc-new-fork/ui/features/upgrades/model/set_bonus_tip.ts`
  `reachableLines` (:187-209).** Steps past the stop are filtered by
  `stepEligible`, which compares against the item alone, but their printed
  figure is against the stop's gear and has no noise check. A tie under the
  strict best-stop rule prints "0.0 DPS more", and the doc comment's "a bonus
  within the noise is never shown as a figure" (:181-182) is no longer true
  for these lines.

Checked and not defects (axis's sources): the sim builds each name as
`"%s (%dpc)"` (`sim/core/item_sets.go:263`) and only at counts the set has a
bonus at, so no set-name mismatch can arise; reading the largest package
gives every count up to it; removing the marker entries keeps each row's
`setContext` (`applySetContext`, `rank.ts:3389`) and the only other reader of
`screened-out`, `screenedLine`, now reads `setScreen`; with the toggle on,
Total = `row.deltaDps` + credit is unchanged and the past-stop lines sit
after the Total; 644-C is not vacuous today (without the fake's
`activeSetBonuses` it gives counts `[3,4,5,6]`); the four 511 cases still
check the row parts. `pnpm -C <pair> exec vitest run packages/core/test/fork-set-net.test.ts`:
100 passed; the fork's 4 changed test files: 66 passed (node v22.23.2).

Unexamined: a live tab run; the PNGs. The axis also noted, unchecked, an
older gap: with the toggle off, a future whose sim failed may be named
nowhere. It predates this branch (hypothesis, untested).

## Domain

- **D1 (visibly wrong result, minor, introduced in 3f2948ce1 and 5b9182ed0)
  — `rank.ts:3806-3846`.** The new rule takes the sim's active bonus names,
  and `GetActiveSetBonusNames` (`sim/core/item_sets.go:258-266`) lists a
  bonus even when the character lacks its required profession, while the
  effect itself is skipped (`item_sets.go:210-213`). Burning Rage, Fel Skin
  and Strength of the Clefthoof need a profession
  (`sim/common/tbc/items_sets.go:116,233,247`), the tab does not model
  professions (`engine/disclosure.ts:58`), and their items carry no
  `requiredProfession` in `db.json`. If such a piece is in the pool and the
  set screen keeps the set, the popover can print "Strength of the
  Clefthoof 3pc too small to measure" for a bonus the sim never applies.
  Whether these items reach a DPS pool and survive the screen: hypothesis,
  untested. The number of sims does not change: these counts were tried
  before the branch too.
- D2 is a code-quality row (below).

Facts checked and right (axis's sources): Thunderheart Harness (set 676,
`sim/druid/item_sets.go:222-250`), Malorne Harness (640, `:77-110`),
Crystalforge Battlegear (629) and Lightbringer Battlegear (680,
`sim/paladin/item_sets.go:33-128`) have bonuses at 2 and 4 only; the eight
Thunderheart ids in `fork-set-net.test.ts:43-52` are set 676; Gauntlets 29097,
Breastplate 29096, Stag-Helm 29098, Greaves 29099 and Mantle 29100 of Malorne,
so the case 1 line "4pc with Mantle, Breastplate and Greaves of Malorne" names
the right pieces; 30990 is Lightbringer Breastplate (680); the name reaches
`PlayerStats.sets` (`character.go:483`, `proto/api.proto`) and the regex
`/ \((\d+)pc\)$/` matches it; the sim's 3-, 6- and 8-piece bonuses are read
from the sim, so a 3pc-only set gets count 3 only; the popover text in
`case1-built-1280.png` and `case2-built-on-1280.png` matches ticket 655.
`docs/stage0-findings.md` says nothing on set-bonus piece counts.

## Standards + Spec

### Standards

No hard violation. Checked and passing: each changed ported engine file's
`sha256sum` matches its `docs/fork-provenance/engine.md` row, with a ticket
644 note (the table diff is mostly column re-padding); the lock `commit` and
`sim-implemented-effects.json` `forkCommit` both name `5b9182ed0`; no
existing upstream file changed; the new method is an optional addition to the
existing `SimRunner` port; the `sim-runner.ts` comment matches
`item_sets.go:263`; "too small to measure"
(`assets/locales/en/upgrades.json:104`) reads as plain player words.

- **S1–S6:** code-quality rows (below).
- **S7 (missing test, introduced) — `packages/core/test/fork-set-net.test.ts:5802-5810`.**
  In 644-C, `for (const t of countsOf(ranking, 676)) expect([2, 4]).toContain(t)`
  and the two loops after it pass with no check at all when the lists are
  empty. The reviewing session read `:5780-5810`. It passes on the right
  grounds today (see "Checked and not defects" under Adversarial), but a change that dropped every entry would
  also pass it.

### Spec

Ticket 644's "Done when" and ticket 655's three checks are met for the tab
with its usual runner: the marker is absent at `5b9182ed0` (`grep -c` gives
0, 3 at `119b9f676`); the live recordings in `.scratch/tab-recordings-644/`
hold only 2pc and 4pc entries; both 655 verify logs print `v22.23.2` and
`rc=0`; all 6 capture manifests report `"outcome":"captured"`, `"errors":0`,
and each `facts.json` shows the Total equal to the row's figure. No scope
creep.

- **P1 (other: rests on the session's reading, introduced) —
  `set_bonus_tip.ts:187-209`, `set_bonus_labels.ts` `valueText`.** The
  owner, 2026-11-01: "The wording isn't great. It could just show that the 4
  piece is that amount (negative) but ehh okk / I do not like your wording
  it's lame". The tab shows "11.5 DPS less" (`case1-built-1280.png`). The
  choice of the toggle-off label and figure format is the session's rule in
  ticket 655, not the owner's words. With the same words, the toggle-off
  lines measure against the item alone and this line against the stop's gear
  (`:206`, `f.stepGearDps - reference`), and nothing on screen says which.
  The label also lists Breastplate of Malorne, which the 2pc stop already
  counts.
- **P2 (other: spec gap, before this branch) — `set_bonus_tip.ts:219`
  (`noiseLines`).** It returns nothing when any other bonus of the set clears
  the gate, so in a row with one bonus above the gate and one below, the one
  below is still named nowhere. The test "names no bonus within the noise when
  another bonus of the set clears the gate" (`set_bonus_tip.test.ts:247`) pins
  this. The owner's "Case 2 a sounds fine" was about rows whose only future
  bonus is below the gate. Before the branch no below-gate bonus was named in
  any row, so this gap predates it.
- **P3 (bookkeeping) — ticket 644, "A runner without `activeSetBonuses` (the
  test fakes) gets the old behaviour."** Only the counts tried fall back; the
  marker removal (`rank.ts:2165-2171`, read by the reviewing session) runs for
  every runner. The behaviour half of this finding is A3.
- **P4 (bookkeeping) — `.scratch/agent-reports/2026-11-01-verify-644.log`**
  has no `rc=` line and no node version line, while
  `2026-11-01-general-task-644-655.md:86` cites it as `rc=0`. Ticket 644 cites
  only the vitest command.
- **P5 (bookkeeping) — ticket 644, "`feral-p3-th-hands-legs` has no crossing
  gate for Thunderheart at 3".** The new recording
  (`.scratch/tab-recordings-644/feral-p3-th-hands-legs.json`) has no
  `crossingGates` key at all (read by the reviewing session), so the sentence
  is true but shows no gate of any kind.
- **B1 (bookkeeping, found by the reviewing session) —
  `.scratch/carry-forward/map.md`** had no line for ticket 736, which this
  branch filed (`grep -c '^- 736' .scratch/carry-forward/map.md` gave 0).

## Code quality

| ID  | Where                                                                               | Finding                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| --- | ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1  | `rank.ts:3800`                                                                      | Comment says "on the gear that adds that package" with no package named before it, and "so no set name is matched" does not say why that matters (writing style, unclear back-reference).                                                                                                                                                                                                                                                                                                                            |
| S2  | `set_bonus_tip.ts:178-186`                                                          | The `reachableLines` doc comment has a 40-word sentence with two nested qualifiers (writing style).                                                                                                                                                                                                                                                                                                                                                                                                                  |
| S3  | `set-value.ts:50`, `set_bonus_tip.test.ts:65`, `docs/fork-provenance/engine.md:150` | "carry" / "carries", a word the style rules list for replacement ("have" or "contain").                                                                                                                                                                                                                                                                                                                                                                                                                              |
| S4  | `rank.ts:2028` and `:3822`; `:1587` and `:1604`                                     | Possible Duplicated Code: the same reach loop (`t` from `max(2, worn+1)` while `selectFor(setId, t).ok`), and the same `setBonuses.length > 0 \|\| setBonusResult.markedSetIds.length > 0` test, each twice.                                                                                                                                                                                                                                                                                                         |
| S5  | `rank.ts:3840`, `worker_pool_sim_runner.ts:235`                                     | Possible Primitive Obsession: the engine parses piece counts out of display strings that the adapter could return as numbers; the test fake rebuilds the string only to have it parsed back.                                                                                                                                                                                                                                                                                                                         |
| S6  | `rank.ts` `setBonusCountsInReach` (7 parameters)                                    | Possible Data Clumps: `equipment`, `gems` and `composeFor` travel together here and at other build sites (`rank.ts:2060`, `:2217`).                                                                                                                                                                                                                                                                                                                                                                                  |
| D2  | `set_bonus_tip.test.ts:254,261-263`                                                 | New fixture names Lightbringer Battlegear 4pc pieces with ids 30987, 30995, 30998 as "Lightbringer Chestguard / Legplates / Shoulderplates"; in `db.json` those ids are Faceguard, Legguards and Shoulderguards of set 679 (Lightbringer Armor), and the ret pieces are 30990, 30993, 30997. Older lines have the same kind of mistake: `:44` (30987 "Lightbringer Chestguard") and `:108`, `:306` (set id 627 named "Crystalforge Battlegear"; 627 is Crystalforge Raiment, Battlegear is 629). No output is wrong. |

## Focused check (round 2)

Reviewed range: `1f979d3268d49f083ef79f3667fd9e7134246f30..df1f9838ab4953e7c22f9d702aa41b260f5c585f`

Fork range, round 2: `5b9182ed07f4cf296cc25d9b07c9424c9523f704..2ab56cc0b23ffdb103636e564e04fc74601beff0`
(21d36b7fc, 95b995ec1, f1d8b4e65, 7be7e3825, 7dba300e7, 2ab56cc0b).

Dispatch note, round 2: `codex` is not on `PATH`; one fresh `general-task`
agent on Opus (review lane) ran the four checks and was told it writes
nothing. It made its mutation runs in a copy of the pair under `$TMPDIR`
(log: `/tmp/claude-1000/r2mut/result.txt`, not kept). `git status --short`
was empty in both trees before and after. The dispatching agent re-read the
lines behind R2-1 to R2-3 and opened `.scratch/655-snapshots/case1-fixpass-1280.png`.

Conditions, tested by the dispatching agent before dispatch:

1. Holds, settled from this file, as in
   `docs/reviews/chore-729-test-result.md`. No commit message in either range
   names a finding ID or has a body (`git log --format=%B`); the Disposition
   rows name each fix commit by SHA and give its findings. 73532cca mixes the
   re-pin with the A1, A2, A3 and S7 tests in `fork-set-net.test.ts`; every
   other file it changes is under `data/` or `docs/`. c600493a is a re-pin
   plus S3 in `docs/fork-provenance/engine.md`. df1f9838 changes this file,
   tickets 644, 738 and 739, `NEXT` and `map.md` (ticket filing).
2. Holds. The changed non-test lines are `rank.ts` `:1587`, `:1604`, the
   reach loop near `:2005-2040` and `setBonusCountsInReach` (A1, A3, S1, S4);
   `set-value.ts:50` (S3); `set_bonus_tip.ts` `reachableLines` with its
   `TipEntry` flags and import (A4, P1, S2); `set_bonus_labels.ts`
   `valueText` (A4, P1).
3. Holds. At fork `2ab56cc0b`,
   `git -C vendor/tbc-new-fork diff --numstat --diff-filter=M cec2a7b68 HEAD`
   prints only `6 0 ui/app/SimTabsSection.tsx`, and `--name-status ... | cut -f1 | sort | uniq -c`
   prints `237 A`, `1 M`: the same as round 1.

The four checks (agent's results):

1. **Pass.** As above; also the lock `commit` and `forkCommit` in
   `data/sim-implemented-effects.json` both name `2ab56cc0b`, and
   `python3 -I scripts/check_engine_port_drift.py` gives rc 0, "36 ported
   files match engine.md".
2. **Pass**, with R2-2 and R2-3. A1: a refused read gives the set an empty
   count set, `buildSetBonuses` returns, and `rankUpgrades` sets `aborted`
   and replaces the set phase with `emptySetPhase()` (`rank.ts:1659-1669`).
   S4: `setBonuses` is reassigned only at `rank.ts:1667`, after both uses of
   `hasSetContext`; `packagesInReach` walks the same counts as the old loops.
   A4: `clearsSameGearGate` is `dps > max(floor, 2·se)`, and each
   `stepGearSe` already includes the baseline's error, so the code comment's
   "counts the baseline's error twice" is true. P1: only lines with
   `againstStop` (toggle on, past the stop) are signed; the label's piece
   list did not change; the capture shows "-11.5". S5 and S6: both `wontfix`
   reasons hold (the engine filters by whole names, `wornNames.has(name)`;
   `measureSetSteps` and `packageAt` predate the branch and take the same
   three values).
3. **Pass, except R2-1 and R2-4.** With each fix reverted in the copy:
   rethrowing `StopRefusedSim` fails 644-S and both 533-S/W cases; dropping
   `out.set` after a failed read fails 644-D; dropping every reachable count
   fails 644-C; the engine ignoring `activeSetBonuses` fails 511-SD, 644-S
   and 644-A to 644-D; each of the two runner mutations fails its runner
   test; removing the noise gate fails 2 tip tests; dropping `againstStop`
   fails 4 tests; adding `againstStop` to toggle-off lines fails 7 tests.
4. **Pass.** Main `vitest run packages/core/test/fork-set-net.test.ts`: 102
   passed, rc 0, node v22.23.2. Fork vitest on
   `worker_pool_sim_runner.test.ts`, `set_bonus_tip.test.ts`,
   `set_bonus_labels.test.ts`: 61 passed, rc 0. Fork `type-check`: rc 0.

Round 2 findings:

- **R2-1 (missing test) — fork `set_bonus_tip.test.ts:304`.** The test
  "compares the gap with twice the two step gears' standard errors added in
  quadrature" still passes when the gate uses only the step's own error: with
  both errors at 6, one error already hides the 10.5 gap (2 × 6 = 12). The
  dispatching agent read `:304-313`. Not on screen, not the pool, not a gate.
- **R2-2 (code quality, wrong comment) — fork `rank.ts:3818`.** The
  `setBonusCountsInReach` doc comment says "the caller drops the set phase";
  its caller is `buildSetBonuses`, which has no abort check. `rankUpgrades`
  drops it (`rank.ts:1659-1669`). Not on screen, not the pool, not a gate.
- **R2-3 (scope, undocumented) — fork `rank.ts:2490`.** The empty count set
  that A3's fix writes also makes the crossing gate skip that set
  (`bonusCounts.get(setId)?.has(worn + 1) === false`); before the fix pass a
  failed read left no map entry and the gate was measured. This fits the
  owner's "failed check → no set entry", but neither the doc comment
  (`rank.ts:3815-3820`) nor the ticket 644 note says it. Whether the tab
  shows anything different: hypothesis, untested (the gain side has no
  bonus for that set, so the row probably gets no set context at all,
  `rank.ts:3410-3411`). Rare path (failed read or failed gem repair).
- **R2-4 (missing test, already in the A3 row) — fork `rank.ts:3843-3848`.**
  Removing `out.set` after a gem-repair failure leaves 51 of 51 tests
  passing. The row's reason, "the harness cannot make repair fail", is
  hypothesis, untested. Not on screen in the test run; on the live path it
  decides whether a set whose repair fails lists counts.
- **R2-5 (code quality, unclear comment; found by the dispatching agent) —
  fork `rank.ts:3809`.** "`largestPackage` gives the pieces that fill the set
  to that most." is not plain English ("to that most"). Not on screen, not
  the pool, not a gate.
- **B2 (bookkeeping).** The fix commits name no finding IDs (condition 1
  above); the code-quality commits 7be7e3825, 7dba300e7 and 2ab56cc0b do not
  name their `## Code quality` row IDs as the skill asks. Proposed
  `wontfix`: rewording them would change every fork SHA that the lock and
  the rows name, and the rows already settle the mapping.

Outcome: the skill's "Round limit" stops the review here, because round 2
reported findings other than bookkeeping (R2-1 to R2-5). No
`## Disposition (round 2)` table is written. The owner decides what happens
next.

## Summary

Round 1 found one loud failure (A1), six other findings this branch
introduced (A2, A3, A4, D1, P1, S7), one gap from before the branch (P2,
deferred to ticket 737), seven code-quality rows, and five bookkeeping items.

**Blocking the merge** (introduced by this branch, no owner deferral; no
Disposition row yet): A1, A2, A3, A4, D1, P1, S7. Each needs a fix on this
branch or the owner's leave to defer it with a ticket. P1 needs an owner
ruling on the case 1 line's wording before it can be fixed.

**Code quality:** S1–S6 and D2 go to one fresh agent in one pass before round
2; each then gets a Disposition row.

**Bookkeeping applied in this commit:** P3 and P5 (ticket 644 text), B1 (map
lines for 736 and 737). P4 is `wontfix` (reason in its row).

Round 2 has not run: no fix commit exists yet, and this session was told to
change no code.

Tickets: filed 2 (736, 737), closed 2 (644, 655), by the two commands in the
`pre-merge-review` skill step 3 at this commit.

**Round 2** (focused check, section above): all four checks pass; every
round 1 fix does what its finding asks, and the S5 and S6 `wontfix` reasons
hold. It found two missing tests (R2-1, R2-4), two comment problems (R2-2,
R2-5) and one undocumented side effect of the A3 fix on a rare path (R2-3).
None is a silent wrong result or a loud failure. Under the skill's round
limit the review stops: the branch is not merge-ready until the owner
rules on R2-1 to R2-5 (fix, defer with a ticket, or drop).

## Disposition

| ID  | Axis        | Disposition | Ticket / note                                                                                                                                                                                                                                                 |
| --- | ----------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P2  | Spec        | defer       | `.scratch/carry-forward/issues/737-popover-names-no-below-gate-bonus-beside-one-above.md` — predates the branch; needs an owner ruling on mixed rows                                                                                                          |
| P3  | Spec        | fixed       | Ticket 644 now says only the gain side's counts fall back and the marker entry is gone for every runner                                                                                                                                                       |
| P4  | Spec        | wontfix     | The 655 verify logs (`2026-11-01-verify-655-case1.log`, `-case2.log`) print `v22.23.2` and `rc=0` at later re-pins that include fork `3f2948ce1`; ticket 644 does not cite the 644 log                                                                        |
| P5  | Spec        | fixed       | Ticket 644 now says the new recording has no `crossingGates` key at all                                                                                                                                                                                       |
| B1  | Spec        | fixed       | Map lines added for 736 and 737                                                                                                                                                                                                                               |
| A1  | Adversarial | fixed       | Fork 21d36b7fc, main 73532cca: a Stop during the active-set-bonus read gives the set no counts and the set phase is dropped; test 644-S and the 533-S/W Stop scenarios (now with `activeSetBonuses`) failed before                                            |
| A2  | Adversarial | fixed       | Main 73532cca: the fake runner has `activeSetBonuses` in the Stop suite and the 511 screen tests (511-SD reach 3 → 2, the sim lists Thunderheart at 2 and 4 only); fork 95b995ec1: two tests for `WorkerPoolSimRunner.activeSetBonuses`                       |
| A3  | Adversarial | fixed       | Fork 21d36b7fc, main 73532cca: a failed gem repair or a failed read gives the set no counts and no entry, with a console warning naming the set; test 644-D failed before (`[3,4,5,6]`). The gem-repair path has no test: the harness cannot make repair fail |
| A4  | Adversarial | fixed       | Fork f1d8b4e65: a step past the stop whose difference from the stop's gear does not clear `clearsSameGearGate` (standard errors combined) shows "too small to measure", never 0.0; doc comment rewritten                                                      |
| D1  | Domain      | defer       | `.scratch/carry-forward/issues/738-set-bonus-counts-list-profession-bonuses-the-sim-skips.md` — owner's go of 2026-11-01; a fix needs a profession setting the tab does not have                                                                              |
| P1  | Spec        | fixed       | Fork f1d8b4e65: with the toggle on, a step past the stop prints a signed figure ("-11.5" in case 1, `.scratch/655-snapshots/case1-fixpass-{1280,375}.png`); toggle-off lines unchanged. The label's piece list was not in the owner's go and is unchanged     |
| S1  | Standards   | fixed       | Fork 21d36b7fc and 7be7e3825: `setBonusCountsInReach` doc comment rewritten, no unclear back-reference                                                                                                                                                        |
| S2  | Standards   | fixed       | Fork 7dba300e7: `reachableLines` doc comment split into short sentences                                                                                                                                                                                       |
| S3  | Standards   | fixed       | Fork 7dba300e7 (`set-value.ts`), 2ab56cc0b (`set_bonus_tip.test.ts`), main c600493a (`engine.md`)                                                                                                                                                             |
| S4  | Standards   | fixed       | Fork 7be7e3825: one `packagesInReach` helper for the reach loop and one `hasSetContext` for the repeated test                                                                                                                                                 |
| S5  | Standards   | wontfix     | The engine compares whole bonus names to drop those the current gear already has, so counts alone would not do; a new return type would change the `SimRunner` port, the adapter, its test and the main fakes to replace one regex line                       |
| S6  | Standards   | wontfix     | S4 cut `setBonusCountsInReach` to 6 parameters; a type grouping `equipment`, `gems` and `composeFor` would change `measureSetSteps` and the set screen's `packageAt`, code this branch did not write                                                          |
| S7  | Standards   | fixed       | Main 73532cca: 644-C asserts the exact lists (`[4]` worn at 2, `[]` worn at 4)                                                                                                                                                                                |
| D2  | Domain      | fixed       | Fork 2ab56cc0b: `set_bonus_tip.test.ts` ids, names and set ids match `db.json`. The same mistake in the shared `ranking_fixture.ts`: `.scratch/carry-forward/issues/739-ranking-fixture-row-10-wrong-item-and-set-names.md`                                   |
