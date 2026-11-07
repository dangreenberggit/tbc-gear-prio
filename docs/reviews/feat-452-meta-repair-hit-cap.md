# Pre-merge review — feat/452-meta-repair-hit-cap

Reviewed range: `128a80689b20ce595883533e7d9b74373db08654..7cbcbd83d068ff5860382d61b805b12c2402b26f`
Reviewed range: `7cbcbd83d068ff5860382d61b805b12c2402b26f..eaef9cbe8985e6a86797f52a20c3f0512e5bf113`
Reviewed range: `eaef9cbe8985e6a86797f52a20c3f0512e5bf113..cf683e59920cc644d41e25a8a0fb6c924d638548`

Dispatch note (round 1): the branch stacks on `feat/452-desktop-goldens`
(slice C), whose review in `docs/reviews/feat-452-desktop-goldens.md`
covers every commit through `128a8068` (C's head `a87d82cf` plus the
fix commits for C's round-2 findings, made in this worktree). So round 1
diffs from `128a8068`, not from the `dev` merge base. `python
scripts/check_merge_ready.py --product-files` (rc 0) lists, inside this
range, `data/sim-implemented-effects.json`, `data/wowsims-fork.lock.json`,
`docs/fork-provenance/engine.md` and
`packages/core/test/fork-meta-repair.test.ts`; the three axes read those
files and the fork range `b603564ee..24f6575ca` (fork commits `b8f9f7f45`
ticket 746, `24f6575ca` ticket 804). The two ticket files (746, 804) go to
`instruction-review`. Not a small change: the range touches `data/`.
`codex` is not on PATH; the axes run as fresh `general-task` agents on
Opus. The domain axis runs: the diff picks hit caps per spec.

## Adversarial

I found one Medium silent-wrong-number path and three Low issues. Fork tests pass (133/133: `vitest run` on `cap-profile.test.ts`, `pool_source.test.ts` and `SubstitutionsList.test.tsx`, node v22). I re-ran the 804 pool measurement myself and it matches the fixture.

**A1 — Medium — fork `ui/features/upgrades/model/engine/rank.ts:4049-4054` with the new caster budgets in `cap-profile.ts`.** A single candidate swap that breaks a set with a spell-hit bonus makes repair undercount hit for that candidate, with no error and no note.

- **Why:** each candidate's budget is `baselineRemaining − (gear hit change)`. The baseline sim read includes set-bonus hit, but the gear hit change does not count it. The candidate's request uses real items (`composeFor(swapped)`, `rank.ts:1354-1373`), so the sim does lose the bonus.
- **Trigger:** the warlock pre-raid preset wears Mana-Etched Crown 28193 (head, meta socket) and Gloves 27465. Their 2-piece bonus is +35 spell hit rating (`sim/common/tbc/items_sets.go:83-88`). Any head candidate breaks the set, and if the meta needs repair, the budget is 35 rating (about 2.8%) too small.
- **Why it matters:** this breaks the plan's own rule that a budget must never undervalue hit the sim still rewards. Before this branch, warlocks got full weight, so this undervaluing is new for casters. The same limit is recorded for melee sets only, in the closed ticket 535 § Limits. It is not in the cap-profile comment and nothing on the tab mentions it.
- **Size:** the DPS effect is unmeasured (hypothesis, untested).

**A2 — Low, test theatre.** No `rankUpgrades` test runs a caster with a stats read.

- Every test that supplies `computeStats` in `packages/core/test/fork-meta-repair.test.ts` ranks ret (`runRet` defaults to `"ret"`).
- The caster coverage is unit tests of `hitCapBudgetFrom` only (`cap-profile.test.ts`, 535-B6). The rank.ts plumbing that reads slot 13 and charges spell hit rating (the reads at `rank.ts:1106` and `1189`) has no test.
- The mage golden did not move (`execution-report.md:226`), so no live run priced a caster hit gem either.
- Ticket 746 "Done when" asks for a test per spec family.

**A3 — Low, the cap-profile.ts comment states a false source fact.** It says "no talent of these four classes adds `SpellHitPercent` while stats are measured". Two shaman effects do:

- Nature's Guidance (`sim/shaman/talent_restoration.go:17-30`).
- Totem Of Wrath (Self), a buffs-phase aura (`talents_elemental.go:256-277`).

Both also apply in combat, so the budget is still right. Separately, "the warlock is exact" holds only for the default Destruction rotation: Affliction spells reach the cap 10% earlier with Suppression.

**A4 — Low, silent fallback.** A budget spec on a runner without `computeStats` repairs at full weight and shows no note.

- The full-weight note is only in the `else if fullWeight` branch (`rank.ts:1103-1128`), and test 535-S7 pins this silence.
- This now covers six specs, but the tab's runner always has `computeStats` (`worker_pool_sim_runner.ts:221`), so only the CLI and tests reach it.

**Checked, no finding:**

- **Proto slots:** 12 and 13 match `ui/generated/proto/common.ts:1672,1676`, and `StatSpellHitRating` is 12.
- **Caster EP weights:** the mage, shadow, ele and warlock files all have a weight at key "12".
- **Hit stats:** melee and spell hit rating are separate stats in the sim (`sim/core/unit.go:693-694`).
- **Faerie Fire:** the Improved Faerie Fire term applies to melee-hit specs only.
- **Cache:** `MemoryStore` (`run.ts:66`) means an old cached ranking without the note cannot persist past a reload.
- **804 pool numbers:**
  - I re-ran a copy of `measure_pool_rule.py` in `$TMPDIR`; it gave 55 cells with 0 differences from the fixture.
  - I checked the new totals 41,318 / 43,758 / 1,182 by hand.

**Tree:** clean apart from the review file. The dotfiles that `git status` lists inside my sandbox are `/dev/null` device mounts (`crw-rw-rw- nobody`), not real files.

**Unexamined:**

- Main-repo vitest: no `node_modules` here, so I relied on `step14-vitest.txt` (38/38).
- The desktop gate: not re-run.
- The off-hand claims in plan C5.
- The fork lock says `"pushed": false`, and `24f6575ca` is on no remote branch. That is a pre-merge state; I did not judge it.

## Domain

The per-spec choices hold for every spec on its page defaults, and the full-weight note is true wherever it shows. One exception: elemental's budget can undervalue hit in a non-default setup, and the new doc comment says something about it that is false.

**D1 — Medium.** `vendor/tbc-new-fork/ui/features/upgrades/model/engine/cap-profile.ts:120` and the elemental entry at `:396`.

- **What the comment says:** "no talent of these four classes adds `SpellHitPercent` while stats are measured."
- **Why that is false:** Totem of Wrath (Self) is an aura that turns on during the stats read and adds +3 `SpellHitPercent` (`sim/shaman/talents_elemental.go:262-271`). `FillPlayerStats` turns on every such aura before it reads the stats (`sim/core/character.go:475`). The default elemental talents include Totem of Wrath: I decoded `55003105100213351051` against `ui/sim/talents/trees/shaman.json`, and position 19 is 1.
- **When the sim actually gives the +3:** only while the totem is down. Casting a Fire Elemental cancels it (`sim/shaman/fire_totems.go:175-177`) for 120 s (`fire_elemental_totem.go:15`). The default APL re-drops Totem of Wrath only while the Fire Elemental is inactive.
- **What goes wrong:**
  - The default APL has its `Use Fire Elemental` setting at false (`default.apl.json:126`), so the totem is up all fight and the budget is right.
  - With that setting on, spells need 3% more hit for 120 s than the budget allows for.
  - With an APL that never drops the totem, they need 3% more hit for the whole fight.
  - In both cases the repair treats hit between 13% and 16% as over the cap, although the sim still rewards it.
- **What I checked for the other three caster classes:** I searched for `SpellHitPercent` writers under `sim/`. Mage, priest and warlock have none. Nature's Guidance (`sim/shaman/talent_restoration.go:18-29`) is permanent, so it is harmless.

**D2 — Info.** `cap-profile.ts:112`.

- **What the comment says:** spell miss has "no target-side term".
- **Why that is not exactly true:** for spells flagged binary, target resistance multiplies the base hit chance (`sim/core/spell_result.go:252-261`, `spell_resistances.go:61-105`). Frostbolt is binary (`sim/mage/frostbolt.go:37`). The file's own `SPELL_HIT_CAP_PERCENT` comment already admits this exception.
- **Effect on rankings:** none on defaults. `grep Resistance sim/encounters sim/core/target.go` finds no target with resistances.

**Checked and true** (sim source at fork `24f6575ca`):

- **Melee cap 9%:** `target.go:393-401`, `spell_result.go:179-187`. The 19% dual-wield miss is added only when the off hand has a swing speed (`spell_outcome.go:559-566`, `attack.go:437`).
- **Improved Faerie Fire:** it gives 3% hit and only to physical attacks (`debuffs.go:43-44,360-369`).
- **Spell cap 16%:** base miss 17% with a 1% floor (`spell_result.go:241-262`).
- **Pseudo-stat slots:** slots 12 and 13 hold plain physical hit and plain spell hit (`character_sheet.go:109-110`).
- **Balance of Power:** it adds +4 hit only while stats are measured (`sim/druid/talents.go:139-149`).
- **Ret's spells:** Judgement of Command rolls on spell hit (`sim/paladin/seals.go:249`). Melee hit rating feeds only physical hit (`sim/core/unit.go:694-695`), so it does not undervalue ret.
- **The note sentence:** it is pushed only for full-weight specs (`rank.ts:1126-1127`). It is true for rogue, enhancement, warrior (Arms and Fury), hunter and Balance.

**Domain docs:** the diff touches no WCL field, race, spec-classification or slot-mapping logic, and it contradicts nothing in `docs/stage0-findings.md` or `docs/verification-log.md`.

**Unexamined:**

- The ticket 804 pool totals (`pool_source.test.ts`): these are measured snapshots, and I did not re-measure them.
- The per-school APL spell-id claims for mage and shadow: slot 13 is the lowest slot, so the choice is safe whether or not they are exact.
- I did not open the hunter preset lines.

**Working tree:** the main repo has untracked dotfiles at its root (`.bashrc`, `.profile`, `.mcp.json` and others). These are hypothesis, untested: probably the empty files the subprocess environment scrub creates. I left them as found.

No report file: the whole report is above.

## Standards + Spec

Both tickets are implemented, and the fork re-pin matches fork commit `24f6575ca`. Nothing blocks the merge. There is one should-fix: the provenance-hash update was committed separately from the re-pin, and the repo's rule says they go in the same commit. Everything else is a nit.

I ran the `code-review` skill with two `general-task` sub-agents on Opus, one for Standards and one for Spec. Nothing was written in either repo, so the whole report is in this message. Where a claim says "checked", I re-ran the check myself after the sub-agents finished.

### Standards

**What passed** (from the sub-agent, not re-checked by me):

- `data/wowsims-fork.lock.json` `commit` and `data/sim-implemented-effects.json` `forkCommit` both equal `24f6575ca`.
- The sha256 of `cap-profile.ts` and `rank.ts` at `24f6575ca` equals the rows in `docs/fork-provenance/engine.md`.
- The tests are placed as `docs/workflow.md` § Testing: seams asks.

**S1 — should-fix, breaks a documented rule.** The provenance-hash change is in its own commit, `7cbcbd83`, after the re-pin `00269b01`.

- Rule: `docs/agents/known-traps.md` § Before editing a ported engine file, step 3: "The record change is committed in this repo with the re-pin." Checked by reading the file.
- `git show --stat 00269b01` lists no `docs/fork-provenance/engine.md`. Checked.
- So `00269b01` on its own would most likely fail `pnpm verify` with "engine.md is stale" (`scripts/check_engine_port_drift.py:253`). Unverified: the sub-agent inferred this from the script and did not run it.
- Fix: squash `7cbcbd83` into `00269b01`. The sub-agent reports the branch has no upstream (`git branch -vv`), so the squash is cheap. I did not re-check that.

**S2 — nit, breaks a documented rule.** Three body lines in fork commit `b8f9f7f45` are 73, 73 and 77 characters long. The global commit rule 6 says to wrap the body at 72. Checked with `git -C vendor/tbc-new-fork log -1 --format=%B b8f9f7f45 | awk 'length>72'`.

**S3 — nit, breaks a documented rule.** The subject of `7cbcbd83`, "Update engine provenance hashes for 746", uses a ticket number in place of a description. The global writing rule says "A ticket number ... is not a description." The squash in S1 removes this subject.

**S4 — nit, comment policy.** The file header at `packages/core/test/fork-meta-repair.test.ts:6-8` still says "On ret and feral ... hit counts only up to the character's remaining hit cap". After ticket 746, mage, shadow, elemental and warlock also get a hit budget, so the header is now wrong. Checked by reading lines 1-12.

**S5 — nit, judgement call (possible Mysterious Name).** In `packages/core/test/fork-meta-repair.test.ts`, the helper `runRet` (line 1129) and its type `RetRun` (line 1110) now also run rogue: `runRet({ pool: S_POOL, spec: "rogue" })` at line 1407. Checked.

**S6 — nit, judgement call (possible Duplicated Code).** Two pairs of tests check the same thing in both repos (from the sub-agent; I did not re-check):

- Main-repo test 535-B4 and the fork test "gives a full-weight spec no budget" in `cap-profile.test.ts`.
- Main-repo test 535-B6 and the fork test "charges a caster's hit against 16% ... no Faerie Fire term".

**S7 — nit, judgement call (possible Repeated Switches).** From the sub-agent; I did not re-check:

- In `cap-profile.ts`, `hitCapBudgetFrom` decides the Faerie Fire term from `profile.hitStat === Stat.StatMeleeHitRating`, while `RepairPolicy` separately names the pseudo-stat slot.
- `rank.ts` tests `repair.kind` in three places.

### Spec

Every "Done when" item of tickets 746 and 804 is met. The sub-agent found no missing work and no work that was not asked for. Its evidence, which I did not re-run:

- **Hit policy for every spec.** All 11 specs have a required `repair` field:
  - ret and feral: a budget on pseudo-stat 12;
  - mage, shadow, elemental and warlock: a budget on pseudo-stat 13;
  - rogue, enhancement, warrior, hunter and balance: the one-sentence note.

  This matches `plan.md`. `tsc --noEmit` passes, and `grep repairCap` finds nothing left.

- **Hit caps.** The spell cap of 16 and the physical cap of 9 match `sim/core/target.go:393-401` and `spell_result.go:262`.
- **Phase-1 cells.** All 55 fixture cells equal the output of `measure_pool_rule.py`, and the new totals add up.
- **Tests.** The three touched fork test files pass (133 tests, node v22.23.2, rc=0).

**P1 — nit.** The `_comment` at `ui/features/upgrades/model/pool_source.cells.fixture.json:2` (fork) contradicts itself. It still opens with "it lived in the outer repo's gitignored stage folder, and no checkout holds it". The text added for ticket 804 says the script was "found in the outer repo's stage folder ... and copied into the 452d stage folder". Ticket 804 asks that "the `_comment` says how". Checked by reading the line at `24f6575ca`.

**P2 — nit.** `ui/features/upgrades/model/engine/cap-profile.ts:125` (fork) says "The warlock is exact: Suppression is a per-spell mod, not in the read."

- Checked: the comment text.
- Unverified (the sub-agent's reading of `sim/warlock/talents.go:75-84` and `spec.ts:71`): this holds for the default Destruction talents. With Affliction talents, Suppression lowers the cap for Affliction spells. Hit between that lower cap and 16 is then priced at full weight. The comment already accepts the same error for the other casters but does not list the warlock case.

**Not checked by either sub-agent** (both unverified):

- The main-repo `fork-meta-repair.test.ts` run (38 passed). Only the executor's `step14-vitest.txt` shows it; running it needed a `node_modules` link that this read-only review could not create.
- The desktop gate after the re-pin. Only the executor's `desktop-gate-after.txt:109` shows it.
- Whether the parity test (known-traps step 1) ran before the hashes moved.

**Totals:** Standards has 7 findings; the worst is S1. Spec has 2 findings; the worst is P1. Both P findings are nits.

## Instruction review (tickets)

**Conclusion.** Both closes are supported by what the branch did, and both pass the repo's `Verified by:` gate. Ticket 804 meets every part of its "Done when". Ticket 746 meets the wording of its "Done when" with one gap the close does not state: its own comment counts the branch's `pre-merge-review` file as part of done, and that file does not exist yet. One further point needs action before merge. The 746 close admits that the caster budget still prices some hit above the real cap at full value, with no note to the player, and no ticket records that. The other findings are wording and evidence fixes. No finding blocks.

**Path.** Light path. These are closing comments that change no rule. I ran check 1 with one cold reader. On top of that I did the support checks you asked for: the fork commits, the execution report, and `docs/agents/issue-tracker.md`. No trial run applies, because the edit changes no agent behaviour.

### What I checked and the source for each

- **Branch commits.** `git log 128a8068..7cbcbd83` lists two commits: `00269b01` "Re-pin fork for the hit policy and phase-1 cells" and `7cbcbd83` "Update engine provenance hashes for 746".
- **Lock file.** It pins `24f6575ca21e…`, which comes after `b8f9f7f45`, and it has `"pushed": false` (`git diff 128a8068..7cbcbd83 -- data/wowsims-fork.lock.json`). So 804's "the re-pin is on the branch" is met.
- **Fork commit `b8f9f7f45`.**
  - It changes `cap-profile.ts`, `rank.ts`, a new `cap-profile.test.ts` and `SubstitutionsList.test.tsx`.
  - `rank.ts` pushes `hitCapFullWeightNote()` on every run where the spec's repair kind is `fullWeight`. The sentence starts with "If gems were swapped…", so it is true whether or not a swap happened.
  - `cap-profile.test.ts` has a melee test (slot 12) and a caster test (slot 13). No spec has a ranged budget, because the hunter takes the note. So the "test per spec family" condition is met for the specs that got a budget.
  - Source: `git -C vendor/tbc-new-fork show b8f9f7f45`.
- **Fork commit `24f6575ca`.** The fixture now holds 55 cells, the test expects 55, and the fixture `_comment` gained a dated paragraph that gives the method and the 11 triples (`git -C vendor/tbc-new-fork show 24f6575ca`).
- **Executor runs.** These match the numbers in the closing notes (execution-report.md):
  - desktop gate PASS on ret, mage, rogue and enh after the re-pin (`:252`); these are all four goldens in `data/desktop-gate/`
  - 38/38 tests in `fork-meta-repair.test.ts` (`:250`)
  - 124/124 tests in `pool_source.test.ts` (`:152`)
  - `fork-tests:check` 799/799 (`:247`)
- **Repo gate.** `check_merge_ready.closed_without_verification(old, new)` returns `False` for both tickets. I ran it with the old text taken from `128a8068`. So both `Verified by:` lines pass the gate.

### Findings

| ID  | Check                     | file:line                        | Text                                                                                                                                                | What goes wrong, how, and the cost                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Severity   | Evidence                                                                                                                                                                                                                                                                                                                                            |
| --- | ------------------------- | -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I1  | Done when / support       | `746-…md:53-54`, `:56`           | Earlier comment: "The branch's `pre-merge-review` file is part of done." The close does not mention it.                                             | The ticket is closed while one of its own done conditions is unmet, and the close does not state that gap. A reader takes the close as complete. If the review finds a defect in the 746 code, the ticket already reads closed.                                                                                                                                                                                                                                                                                                                                                        | should fix | execution-report.md:263 and :290 (the executor flagged this and closed anyway, following the plan); the review file is still untracked (`?? docs/reviews/feat-452-meta-repair-hit-cap.md` in git status). Cold reader action 7.                                                                                                                     |
| I2  | support / defect handling | `746-…md:67-73`                  | "It does price at full weight the hit between a school-talented spell's cap and 16: mage Arcane spells 6-16, … ele's Nature and Fire spells 10-16." | This is the ticket's own symptom (hit past the cap valued at full weight, with no note) on a narrower band of hit. Mage, shadow and elemental get no note, and no ticket records the gap. For elemental the band covers every class spell. The doc comment says that, for elemental, only item procs with no class mask still gain from that hit (`cap-profile.ts` at `b8f9f7f45`, lines 121-125). The global rule says a real defect that the work found and did not fix ends as an open ticket. The plan puts it out of scope and records it only in a code comment (`plan.md:140`). | should fix | close text; `git -C vendor/tbc-new-fork show b8f9f7f45:ui/features/upgrades/model/engine/cap-profile.ts \| sed -n 108,127p`; cold reader action 8 and its "Where Done when and the close disagree" point 3. Whether it is a real defect, or an acceptable estimate for mage and shadow, is a domain judgment for the pre-merge review or the owner. |
| I3  | evidence                  | `746-…md:59-60`, `804-…md:49-50` | "main-repo commit \"Re-pin the fork for the hit policy and phase-1 cells\""                                                                         | The real subject is "Re-pin fork for the hit policy and phase-1 cells", because the executor shortened it to fit 50 characters (execution-report.md:282). A reader who searches with `git log --grep` for the quoted subject finds nothing.                                                                                                                                                                                                                                                                                                                                            | minor      | `git log --format=%s 00269b01 -1`; cold reader action 1                                                                                                                                                                                                                                                                                             |
| I4  | durable claims            | `804-…md:51-53`                  | "The fork's history has no line saying phase 1 was left out on purpose"                                                                             | This claims something is absent but names no command. The command exists in plan.md:43 (C11): `git -C F show f3bb99a11 \| grep -in "phase 1\|phase-1"` plus the `git log` over the two files. Without it, a reviewer cannot re-check the ticket's own stop condition.                                                                                                                                                                                                                                                                                                                  | minor      | plan.md:43; cold reader "leave out" item 3                                                                                                                                                                                                                                                                                                          |
| I5  | evidence                  | `746-…md:84-86`                  | "The note specs show one sentence in \"Items left out and other notes\""                                                                            | Nobody saw the sentence on screen: the fixture screenshot ends above that list (execution-report.md:55, flag F1). Only the `SubstitutionsList` render test and main-repo case S6 cover it. The close states it as an observed fact. Naming the tests would make the claim match its evidence.                                                                                                                                                                                                                                                                                          | minor      | execution-report.md:55, :70, :107                                                                                                                                                                                                                                                                                                                   |
| I6  | evidence                  | `746-…md:91`                     | `` `node_modules/.bin/vitest run --configLoader runner packages/core/test/fork-meta-repair.test.ts` ``                                              | This worktree has no root `node_modules` (`ls` → "No such file or directory"). The executor linked one in and then removed it (execution-report.md:40, :277). `--configLoader runner` is a workaround for this sandbox. Re-run here as written, the command fails before any test runs. It needs a note on where it runs, or `pnpm install` first.                                                                                                                                                                                                                                     | minor      | `ls <repo>/node_modules`                                                                                                                                                                                                                                                                                                                            |
| I7  | durable claims            | `804-…md:55-59`                  | "found in the main checkout at `/home/daniel/Code/lulz/…/poolrule/`"                                                                                | The close marks only the copy as gitignored. The original is gitignored in the main checkout too (`git -C /home/daniel/Code/lulz/tbc-gear-prio check-ignore -q …measure_pool_rule.py` → rc=0). A reader may think a fresh clone can re-run the measurement. Not committing the script is in line with the ticket's "How" and with plan.md:142, so this is wording only.                                                                                                                                                                                                                | minor      | check-ignore rc=0                                                                                                                                                                                                                                                                                                                                   |

### Notes (sentences that are unclear, though the cold reader still acted correctly)

- `804-…md:61-66`: in "Edits to the copy: …; and ticket 686's BiS rule", the cold reader asked whether the rule was added or kept. Per execution-report.md:133, the preset-name filter was removed. Suggested rewrite: "and ticket 686's BiS rule applied (the preset-name filter removed)".
- `804-…md:63`: "(449 today)" does not explain why the count fell from 450. `sim-implemented-effects:check` prints "450 stub-only" (execution-report.md:246). That is a different count, which makes the difference easy to misread.
- `746-…md:61`: "a required `repair` policy". The "Done when" asks for a `repairCap`. Saying that `repairCap` was replaced by `repair` would remove a mismatch the cold reader reported.
- `746-…md:87-88`: "passed on ret, mage, rogue and enh". Adding "(all four goldens)" stops a reader from asking for more gate runs (cold reader action 6).
- `746-…md:65-73`: the caps 9 and 16 carry no source in the close. The "Done when" marked them "hypothesis, untested by the filer". The sources are in the `cap-profile.ts` doc comment at `b8f9f7f45` (`target.go:385-405`, `spell_result.go:241-262`), and the close could point there.
- Outside the ticket diff, for the pre-merge review: the fork fixture `_comment` still says "no checkout holds it" and then, in the 2026-11-06 paragraph, says the script was "found in the outer repo's stage folder". Also, the fork commits are not pushed (`"pushed": false`), so the `tbc-new-fork@<sha>` evidence resolves only in this clone for now.

### Cold reader's answer (as returned, condensed)

- **Actions it would take:** search for the re-pin commit by title, and noted that the exact quoted title misses; check that the lock pins `24f6575ca`; run the three `Verified by:` commands; read the 746 tests for each spec family; check the 9% and 16% caps in `target.go`; run the desktop gate on every golden; confirm the review file is committed; file a ticket for the talented-caster gap; re-run `measure_pool_rule.py`.
- **Actions it would leave out:** regenerating goldens; checking the old line numbers; searching the fork history again ("the close gives no search command, though").
- **Where "Done when" and the close disagree:** `repairCap` against `repair`; the per-family tests are not listed; the caster window repeats the ticket's symptom; the review file is not mentioned; 804's script edits against "measured independently".
- **Two-way readings:** whether the family-test condition applies to the note option; whether the note shows always or only after a swap; added or kept for the 686 rule; why 449; whether the method survives once the gitignored copy is gone.

### Check 2 file table (files read)

| File                                                           | Result                                                                                                         |
| -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `docs/agents/issue-tracker.md:10,39-90`                        | agrees: a `## Comments` heading, `Status: closed`, and a `Verified by:` line with `<repo>@<sha>` plus commands |
| `scripts/check_merge_ready.py` (`closed_without_verification`) | agrees: `False` for both tickets                                                                               |
| `execution-report.md` K1-K3                                    | agrees with the numbers in the close; sources for I1, I3, I5, I6                                               |
| fork `b8f9f7f45`, `24f6575ca`                                  | agree; source for I2                                                                                           |
| `data/wowsims-fork.lock.json` diff                             | agrees (re-pin is on the branch)                                                                               |
| `plan.md:21,27,43,140,142`                                     | the out-of-scope line is the source for I2; C11 is the source for I4                                           |

**Trial status:** none needed. The light path has no check 3, and these comments change no agent behaviour.

**Report file:** none. The whole report is in this message.

## Code quality

| ID      | Where                                                   | Row                                                                                                              |
| ------- | ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Q1 (S4) | `packages/core/test/fork-meta-repair.test.ts:6-8`       | file header still says only ret and feral get a hit budget                                                       |
| Q2 (S5) | `packages/core/test/fork-meta-repair.test.ts:1110,1129` | `RetRun` / `runRet` now also run rogue; the name no longer says what it runs                                     |
| Q3 (S6) | 535-B4/B6 and fork `cap-profile.test.ts`                | the same budget rule is asserted in both repos                                                                   |
| Q4 (S7) | fork `cap-profile.ts` `hitCapBudgetFrom`, `rank.ts`     | the Faerie Fire term keys on `hitStat` while the slot is on `RepairPolicy`; `repair.kind` tested in three places |

## Round 1 fixes

Fork `6bab26253` (A1: each candidate whose swap turns the meta off gets its own stats read; D1: elemental moves to full weight; A3, D2, P2 comments), fork `8b16e4bc5` (P1), main `eaef9cbe` (re-pin with the engine.md rows, S1; tests for A1 and A2; Q1, Q2; tickets 830 for A4 and 831 for I2; I1, I3-I7). Q3 and Q4 not changed (reasons in `.scratch/agent-reports/2026-11-06-general-task-452d-review-fixes.md`, gitignored, this worktree). Desktop gate after the fix re-pin: PASS on ret, mage, rogue and enh, no golden regenerated.

## Focused check (round 2)

**Conclusion:** All four checks pass. The A1 fix is correct, and its test fails when the fix is turned off. I re-ran that myself. Two Low findings remain, both in the error path that A1 added. Under the skill's "Round limit" section, the review stops at round 2 and the user decides.

**Ranges**

- Main repo: `7cbcbd83d068ff5860382d61b805b12c2402b26f..eaef9cbe8985e6a86797f52a20c3f0512e5bf113`. `e2c964d2` adds only the review file. `eaef9cbe` is the fix re-pin.
- Fork (`vendor/tbc-new-fork`): `24f6575ca21e75bcf0df78e3e2ad593671a22a20..8b16e4bc541208397cdeb6cfcf4e56814242ecf1`, which holds `6bab26253` and `8b16e4bc5`. The lock `commit` at the two ends is `24f6575c…` and `8b16e4bc…` (`git show <sha>:data/wowsims-fork.lock.json`).

**Check 1: the three conditions — pass.**

- **Condition 1 (each commit is an allowed kind):**
  - `e2c964d2` only edits the review file.
  - `eaef9cbe` names its findings by ID in its message (A1, A2, Q1, Q2, S1, A4, I1-I7).
  - `6bab26253` names A1, D1, A3, D2 and P2. `8b16e4bc5` names P1.
  - The fork range has no merge commits (`git log --merges` prints 0).
- **Condition 2 (changed code sits where a fixed finding points):** the code lines outside tests, comments and docs are:
  - the `candidateRepairGems` closure and its call site in `rank.ts`. This is the candidate-loop budget that A1 cites.
  - the ele `repair: FULL_WEIGHT` line (D1 cites `cap-profile.ts:396`).
  - the fixture `_comment` (P1).
  - the lock and `forkCommit` lines (the re-pin kind).
  - `engine.md` changes only two hashes and one note. `git diff --word-diff` shows the other 36 lines are table re-padding.
- **Condition 3 (no upstream wowsims file edited):** all four changed fork files are under `ui/features/upgrades/`. None exists at `branchedFrom` `cec2a7b6` (`git cat-file -e` prints "no" for each, and `ls-tree` of that folder lists 0 files).

**Check 2: each fix changes only what its finding asks — pass.**

- **The A1 formula is right.** `rank.ts:1226-1281` uses `missed = simHit(cand) − baselineSimHit − (gearHit(pre.swapped) − baselineGearHit)`. This is the same formula and the same tolerance that `versionGears` uses (`rank.ts:1189-1194`).
  - The read and the gear hit both use the same pre-repair gear (`candidateSwapPreRepair`), so gem, item and enchant hit cancel out.
  - The read runs only when the swap turns the meta off. `repairHitCap` has no effect anywhere else: its only reader is `rank.ts:4108`, and `repairAndMinimize` returns early when the meta is active (`meta-repair.ts:290-297`).
- **The failure path works as described.** On a failed read, `hitCapReadFailed` warns, sets `hitCapFailed` so the ranking is not cached (`rank.ts:847-855`, `:1884`), and adds the "could not be read" note once. That candidate and every later one get full-weight gems.
- **A Stop during the read ends cleanly.** Stop rethrows `StopRefusedSim`, `runCandidate` returns, and `aborted` is re-read after the pool, so the run is partial and not cached (`rank.ts:1606`, `:1867-1879`).
- **Exceptions behave as before.** `composeFor` throws outside the `try`, as the later `composeFor(swapped)` already did.
- **The seven changed older tests still test what they tested.**
  - `baselineReadOnce` rejected any second read (test file `:1246-1260`), so it had to go. Its replacement, `gearHitReads`, gives a zero "missed" value with no set bonus.
  - 535-S5 still passes with `baselineReadOnce`, which shows no candidate reads happen when there is no budget.
  - 705-W1 now checks that read 2 is the baseline request.
  - 538-H still shows that the second run is not served from the cache.
  - 535-V4 now counts only package reads (`versionReads === 1`). This is the same claim as the old `statsRequests` length of 2.
  - 535-V7 changes only wording.
- **The other fixes are confirmed:**
  - Ele moved to full weight (D1).
  - The comment fixes are in place (A3, D2, P2). The default warlock talents `-20500301332101-…` put no point in Affliction, so they take no Suppression (`presets.ts:101`).
  - `engine.md` hashes equal the sha256 of `rank.ts` and `cap-profile.ts` at `8b16e4bc5`.
  - `forkCommit` equals the lock commit.
  - No commit body has a line over 72 characters.

**Check 3: each new test asserts its finding — pass.** In a copy of both repos under `$TMPDIR` (since deleted), I added `return gems;` at the top of `candidateRepairGems`.

- Both `746-A1` tests then failed and the other 39 tests passed, 746-A2 among them (`$TMPDIR/mut1.txt`). This matches the fixer's record.
- I did not re-run the fixer's slot-12 mutation for 746-A2 (unverified by me). By reading the test, slot 12 would fail the read, fall back to full weight, and put Great Dawnstone in the `localBudget: -10` run, which would fail that test.

**Check 4: the touched tests pass — pass.**

- Fork suite: `node --version` printed v22.23.2. `vitest run --root <fork> ui/features/upgrades` gave 67 files and 781/781 tests, rc 0 (`$TMPDIR/fork-vitest.txt`).
- Main-repo `fork-meta-repair.test.ts`: 41/41 in the `$TMPDIR` copy, with `node_modules` linked inside the copy only (`$TMPDIR/main-vitest.txt`). The fixer's own run, `fixround/check-vitest-fork-meta-repair.txt`, also shows 41/41.

**Findings**

- **R1 — Low — no test covers the new failure path.** Location: fork `ui/features/upgrades/model/engine/rank.ts:1272-1280`, plus the Stop return at `:1410-1417`.
  - I replaced the whole `catch` body (set the flag, add the note, use full weight) with `return gems;`. All 41 tests in `fork-meta-repair.test.ts` still passed (`$TMPDIR/mut2.txt`).
  - `grep` finds no test that mentions "candidate hit not read". The Stop return during a candidate read is also untested.
  - Every other read failure has its own test: worn (705-W4), baseline (535-S3/S4) and version (535-V4).
- **R2 — Low — after a mid-run read failure, the ranking mixes two hit rules and one note is not true for every row.** Location: `rank.ts:1251` and `:1273-1279`.
  - Candidates read before the failure keep a capped budget. Candidates after it get full weight.
  - The note then says hit rating "was treated as always useful, because your hit rating could not be read" (`hitRatingUnreadNote`, `rank.ts:4392-4399`). That is false for the rows repaired before the failure.
  - With `concurrency > 1`, which rows get full weight depends on which reads finish first. This breaks `runCandidate`'s promise that output is the same at any concurrency, but only on this failure path, and that ranking is not cached.
  - The closest existing path, `versionGears`, keeps the run's budget on a failed read and gives a note that is true (`rank.ts:1213-1222`, `setBonusHitUnreadNote`).
  - Suggested fix (hypothesis, untested): on a failed candidate read, return `gems` (the run's budget, as the code did before A1) with a note in the same style as the set-bonus note.
  - The worn-read failure path from ticket 705 already leaves the same false sentence when the baseline read succeeds, so this pattern existed before this branch.

**Working tree — not a finding.**

- The fork tree is clean.
- In the main repo, the only change is the review file's second `Reviewed range:` line, which is step 1's write.
- The untracked dotfiles that `git status` lists are sandbox `/dev/null` bind mounts (`crw-rw-rw- nobody`, and they appear in `/proc/self/mountinfo`), as round 1 also found.

No report file: the prompt forbids writes in either repo, so the whole report is above.

## Focused check (round 3)

**Conclusion:** All four checks pass. The fix for R1 and R2 does what the owner asked: a failed candidate hit read is now that item's failed sim, and the full-weight fallback is gone. Both new tests fail when their fix is removed. I re-ran both mutations myself. Two Low findings remain. R3-1: the new `catch` turns every error in `candidateRepairGems` into a "sim failed" row, code errors included, not only a failed read. R3-2: one comment still says that any failed stats read keeps the ranking out of the cache. This is the last round, so the review stops here and the owner decides.

Round 3 ran because the owner chose a further round after round 2 hit the round limit. It is the last round.

**Ranges**

- Main repo: `eaef9cbe8985e6a86797f52a20c3f0512e5bf113..cf683e59920cc644d41e25a8a0fb6c924d638548`.
  - `497e5b7f` adds only round 2 to this review file.
  - `2b3f5627`, and the merge `bd6057f2` that brings it in, change only ticket 800 and slice C's review file `docs/reviews/feat-452-desktop-goldens.md` (2 `Reviewed range:` lines).
  - `db6ed1bc` is the re-pin. It also adds test 746-R1.
  - `cf683e59` adds test 746-R1b and a note in ticket 746.
- Fork (`vendor/tbc-new-fork`): `8b16e4bc541208397cdeb6cfcf4e56814242ecf1..707e67f077542c28d98171db2a27fb77b73476ae`. This range has one commit, `707e67f07`, and it changes only `ui/features/upgrades/model/engine/rank.ts` (28 lines added, 34 deleted). The lock's `commit` value is `8b16e4bc…` at `eaef9cbe` and `707e67f0…` at `db6ed1bc` (`git show <sha>:data/wowsims-fork.lock.json`).

**Check 1: the three conditions — pass, with two notes.**

- **Condition 1 (each commit is an allowed kind):**
  - `707e67f07` names R1 and R2 in its message. `db6ed1bc` names fork `707e67f07`, R1 and R2.
  - The fork range has no merge commits (`git log --merges` prints 0).
  - Note 1: `2b3f5627`/`bd6057f2` edit another branch's review file. The condition's list names only "this review file", but these lines only record slice C's review rounds. I count them as record-only.
  - Note 2: `cf683e59`'s message ("Test a Stop during a candidate hit read") names no finding ID. It changes only a test and ticket 746. The ticket's new note names R1, R2 and case 746-R1b. The test covers the Stop return that round 2's R1 called untested.
- **Condition 2 (changed code sits where a fixed finding points):** the only code change outside tests and docs is in `rank.ts`. It changes `candidateRepairGems` (R2 cites `:1251`, `:1273-1279`) and the read `catch` in `runCandidate` (R1 cites `:1410-1417`). The other changed files are:
  - the lock and `forkCommit` lines.
  - `engine.md`. Its only change is the `rank.ts` hash, `e9536f51…` → `f3df180f…`, plus one provenance note; the other lines are table re-padding (`git diff --word-diff=porcelain`). `f3df180f…` is the sha256 of `rank.ts` at `707e67f0`.
- **Condition 3 (no upstream wowsims file edited):** `rank.ts` does not exist at `branchedFrom` `cec2a7b6` (`git cat-file -e` fails), so it is a fork-only file.

**Check 2: the fix changes only what its findings ask — pass, except R3-1.**

- **What the fixer claimed, confirmed in `git -C vendor/tbc-new-fork diff 8b16e4bc..707e67f0`:**
  - `candidateReadsOff`, the full-weight copy (`fullWeight`) and the `hitCapReadFailed` call for candidate reads are gone.
  - On an error, `runCandidate` pushes a `{kind: "sim"}` candidate skip and goes on to the item's next slot (`rank.ts:1400-1411`). The failed-sim path for the candidate's own sim does the same (`:1436-1446`).
  - A Stop during the read still returns on `StopRefusedSim` (`:1402`).
  - `candidateSkipSubstitution` gives the row "This item was not ranked in this slot, because its sim failed." plus the error text (`:4322-4331`).
- **R2 is gone.** A failed read changes only its own candidate, so no candidate is moved to full weight. No note that is false for some rows is added. The result no longer depends on which reads finish first, because `candidateSkips` is sorted by item id (`:1641`). Test 746-R1 checks that Heartshatter (32365) still repairs to two Inscribed on the budget while 30907's read fails.
- **Caching, as the caller asked.** A ranking that holds a failed-read row is now cached. That is what a failed candidate sim already does: the only cache gates are `aborted` and `hitCapFailed` (`rank.ts:1861`, `:1878`), and the failed-sim path sets neither. The store is one `MemoryStore` per mounted tab (`model/run.ts:60-66`). So pressing Run again with the same settings shows the same failed row and does not retry, until the tab remounts or a setting changes. This applies equally to both kinds of failed row, and it follows the owner's ruling that a failed read is the item's failed sim. It is not a defect of this fix. Caching rankings that hold failed-sim rows existed before this branch. If that should change, it is one ticket covering both paths. A `grep` of `.scratch/carry-forward/issues/` for failure and cache wording found no such ticket (unverified absence).
- **R3-1 (below):** the `catch` covers more than the read.

**Check 3: each new test asserts its finding — pass.** All runs were in a copy of both repos under `$TMPDIR` (since deleted). `node --version` printed v22.23.2 in each run.

- `rank.ts` from `8b16e4bc` (before the fix): 746-R1 fails and 42 tests pass, 746-R1b among them.
- `rank.ts` at `707e67f0` with the line `if (err instanceof StopRefusedSim) return;` removed from the read `catch`: 746-R1b fails and 42 tests pass.
- These match the fixer's claims and its logs in `.scratch/stage-gate/452d-meta-repair-hit-cap/r1r2/` (`746-R1b-mutated.log`, `vitest-reverted.txt`).

**Check 4: the touched tests pass — pass.**

- Main-repo `packages/core/test/fork-meta-repair.test.ts`: 43/43, rc 0.
- Fork suite `vitest run ui/features/upgrades`: 67 files and 781/781 tests, rc 0.
- The desktop gate the fixer ran ends `desktop-gate: PASS (ret PASS, mage PASS, rogue PASS, enh PASS)`, `gate rc=0` (`.scratch/stage-gate/452d-meta-repair-hit-cap/desktop-gate-after-r1r2.txt`). It built go module `…-707e67f07754`, so it ran on the fixed fork. I did not re-run it. Its first lines show a failed `pnpm` install (read-only store lock); the gate went on and passed.

**Findings**

- **R3-1 — Low — the new `catch` turns any error before or after the read into "its sim failed", code errors included.** Location: fork `rank.ts:1398-1411` (the call site) and `:1237-1268` (`candidateRepairGems`).
  - In round 2's code, `runCandidate` rethrew every error from `candidateRepairGems` except `StopRefusedSim`. The new `catch` turns all of them into a failed-sim row. Besides the read, that function calls `candidateSwapPreRepair`, `inactiveMeta`, `composeFor` and `gearHitRating`. For budget specs, when the swap turns the meta off, an exception in any of them is now shown as "This item was not ranked in this slot, because its sim failed." with the error text, and the run completes.
  - The two other `catch` blocks in `runCandidate` are narrow. The sim `catch` wraps only `deps.sim.run` (`:1436`), and `composeFor(swapped)` sits outside it (`:1433`). The repair `catch` rethrows anything that is not a `MetaRepairError` (`:1423`).
  - Mutation: I added `if (itemId === 30907) throw new TypeError("code bug");` after `candidateSwapPreRepair` and ran a probe in which no read fails.
    - With `707e67f0`: the run completed, ranked only 32365, and gave 30907 the row "…because its sim failed.\nitem 30907, slot chest: code bug".
    - With `8b16e4bc`: the run failed with `TypeError: code bug`.
  - Effect: only a code bug reaches this path. The error text shows in the row, so the result is not silent, but the row names the wrong cause, and one bug becomes one row per affected item in place of one loud failure. The fix comment and commit message describe only a failed read, so this is more than R1 and R2 asked for.
  - Suggested fix (hypothesis, untested): catch only the read's own error. For example, `candidateRepairGems` could rethrow a failed `readStats`/`hitPercentOf` as a dedicated error class, and `runCandidate` would turn only that class into the `kind: "sim"` skip and rethrow everything else, as the repair `catch` does.
- **R3-2 — Low — one comment still says that any failed stats read keeps the ranking out of the cache.** Location: fork `rank.ts:825`, `/** A stats read failed, so this run's ranking is not cached (ticket 535). */` on `hitCapFailed`.
  - Since `707e67f0`, a failed candidate read does not set `hitCapFailed`, and its ranking is cached (Check 2). Only the worn, baseline and set-version reads set the flag (`:850`, `:1213`).
  - Suggested text: "A worn, baseline or set-version stats read failed, so this run's ranking is not cached (ticket 535)."

**Working tree — not a finding.** The fork tree is clean (`git status --short` prints 0 lines). In the main repo, this round wrote only the third `Reviewed range:` line and this section.

## Summary

Round 2 is the last round (`~/.claude/AGENTS.md` § Review round limits). Its four checks passed, but it reported two findings in the failure path that A1's fix added: R1 (no test covers a failed candidate read) and R2 (after a mid-run read failure, earlier rows keep the hit cap, later rows get full weight, and the "hit rating could not be read" note is false for the earlier rows). So the review stops here for the owner's choice (Q-452d-review). No Disposition table yet; step 4 (merge check) not run.

The round-1 fixer listed three changes outside the findings, not made: the set phase's first-step check could pair with the candidate's own request (it loses information, gives no wrong number); ticket 535's closed "Limits" section still lists the single-swap set limit as current; the test file header line "Each case names its ticket 535 test id" is stale.
