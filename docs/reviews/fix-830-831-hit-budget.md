# Pre-merge review — fix/830-831-hit-budget

Reviewed range: `fab063a5db43793fb7966154a18893ddaa841c79..7a8e88c597a891b6a4010b42b0744b9aa81f4667`

Reviewed range: `7a8e88c597a891b6a4010b42b0744b9aa81f4667..00e34b701ce49bb98e6908f1708038bf8d76bfe8`

Reviewed range: `00e34b701ce49bb98e6908f1708038bf8d76bfe8..68518d8df4b8192376c0bf7a8b90ebeabdc78e43`

Fork range reviewed with it: `tbc-new-fork` `60a4735ea1112760fb1d9a175d8e79373647b1a0..52bb752ce4cb5b5ff5e906457891f746b73305d2`
(ed3255a80 "Require the stats read on every sim runner", 52bb752ce "Note
when a talent caps some spells before 16%"). The lock moves from the
first to the second (`data/wowsims-fork.lock.json`).

**Dispatch note.** Round 1, full axes. Not a small change: 11 files,
293 insertions and 73 deletions (`git diff --shortstat dev...HEAD`), and
`data/` paths changed. `python scripts/check_merge_ready.py
--product-files` (rc 0) printed the nine product files: everything in
the diff except the two ticket files
`.scratch/carry-forward/issues/830-*.md` and `831-*.md`. Those two are
tickets (in `TOOLING_PATHS`), not agent instructions, so
`instruction-review` was not run on them; the spec axis read them as the
spec. Four fresh `general-task` agents on Opus ran in parallel:
adversarial, domain, and the `code-review` skill's Standards and Spec
sub-axes, each over both the main-repo diff and the fork diff. Domain
was not skipped: the diff is about spell hit caps and talents. Each axis
was told it writes nothing and was given the caller's no-new-tickets
rule. Both trees were clean at dispatch (`git status --short` in the
pair and its fork).

**No new tickets.** The owner, 2026-11-09: "tickets: (746, 830, 831,
852). are these still open, if so i want them cleared and without
generating more tickets". So this review files no ticket and writes no
`defer` row. A finding that needs a code change has the disposition
`fixed` with the note "pending author fix": it is still open, and the
branch's author fixes it on this branch and then edits the row.

## Adversarial

**830 holds.** No path is left where a hit-budget spec repairs at full
weight without a note. `stopGuardedDeps` now passes the stats read
through; every `readStats` call uses the outer `deps.sim` (fork
`rank.ts:841`, `1189`, `1259`). The only `SimRunner` implementations
are `WorkerPoolSimRunner` (has the read, `worker_pool_sim_runner.ts:221`)
and `RecordedSimRunner`, which throws on a read and is used only by
tests. A failed read becomes `RankError("sim-failed", errorText(err))`
(`rank.ts:3902-3913`), which shows the sim's own message, as ticket
852's ruling asks.

**A1. The 831 note is false for the page's default shadow priest, and
the budget it describes overvalues hit.** Fork `cap-profile.ts:595-610`,
`rank.ts:4478-4487`. The default shadow priest is a Troll
(`ui/specs/priest/dps/presets.ts:134`) with 5/5 Shadow Focus (talent
string at `presets.ts:80`, third segment `503250510…`, index 4 = `5`).
Starshards, the only non-Shadow spell in the default rotation, is
registered only for Night Elves (`sim/priest/priest.go:58-62`, checked
by the caller). Every other damaging spell has a class mask, so it gets
the Shadow school bonus (`sim/core/spell_result.go:244-246`) and reaches
the hit cap at 6% shared hit. The budget still counts hit from 6% to
16% at full value, and the note tells the player "your talents give some
of your spells extra hit", which reads as "the other spells still gain".
Neither is true in this state. Ticket 831 rejected the Shadow slot
because "the shadow APL casts Starshards"; that holds only for Night
Elves. Upstream prices shadow hit on the Shadow slot at 16
(`ui/specs/priest/dps/spec.ts:73`). Under the owner's ruling that a fix
must use the direct signal, the race the request carries plus slot 11
is that signal. Item procs with no class mask may still gain from shared
hit (hypothesis, untested). A fire-only or frost-only mage would hit the
same problem (hypothesis, untested; the fork ships only Arcane mage
APLs). Same finding as D1.

**A2. Test 492-J now runs 25.9 s against a 30 s timeout.**
`packages/core/test/fork-set-net.test.ts:1633`. The axis ran
`node --version; pnpm -C <pair> exec vitest run
packages/core/test/fork-set-net.test.ts --reporter=verbose`: v22.23.2,
rc 0, 103 passed in 176 s. 492-J took 25.9 s; 476-A, 476-B and 512-N
about 15.6 s each; 502-C 14.1 s. Only 497-A (56 s) got a longer timeout
(`180_000` at line 5695). `testTimeout` is `30_000`
(`vitest.config.ts:45`, checked by the caller). The comment at
`vitest.config.ts:36-50` and ticket 858 record that parallel load in
`pnpm verify` stretches test times, so 492-J is likely to time out
intermittently under `pnpm verify` while the code is correct
(hypothesis, untested: no failing run was seen). This also checks the
author's timing claim: the file went from 24 s to 176-184 s.

**A3. No test pins the 831 note's absence for a caster against a target
that is not level 73.** `packages/core/test/fork-meta-repair.test.ts`,
831-N1 to N4. The code is right today: the note is pushed only inside
`if (budget)` (fork `rank.ts:1100-1121`). Nothing stops a change that
moves it out.

**A4. One assertion in the fork's `rank_cap.test.ts:64-69` is true by
construction.** `expect(noStatsReader.computeStats).toBeUndefined()`
checks an object the test built without the method. The real check is
the `@ts-expect-error`, and the fork's type-check covers test files
(`tsconfig.json:28`; `scripts/check_fork_lint.py:191`). Not a defect.

Checked and not defects: the school-slot signal (each school slot is
slot 13 plus `SchoolBonusHitChance`, `character_sheet.go:111-116`;
talents are applied at `character.go:300`, before `FillPlayerStats`);
the Suppression read (segment 0, index 0 matches `character.go:744-765`
and `warlock.proto:10`); the note opens with "If gems were swapped", so
it stays true in a run with no swap; the slowdown comes from tests now
running the repair path the tab already runs, and the `setImmediate`
yield is test harness only.

## Domain

The domain claims in tickets 830 and 831 match the Go source. The spell
hit cap is 16% against a level-73 target (base miss 0.17,
`sim/core/target.go:393`; 1% floor, `spell_result.go:262`). Slot 13
holds only shared hit; slots 6-11 add each school's talent bonus
(`character_sheet.go:110-116`). Arcane Focus (`mage/talents.go:113`),
Elemental Precision (`:536-537`) and Shadow Focus
(`priest/talents.go:338`) each raise a school slot. Suppression is
per-spell on `WarlockAfflictionSpells` (`warlock/talents.go:75-84`), and
its talent-string position is right. The note is pushed only when
`hitCapBudgetFrom` returns a budget, which needs every target at level
73, so "16%" is right wherever the note shows. Hit past 16% is worth
nothing on the default targets, which have no resistance
(`spell_resistances.go:68-104`), so keeping a budget rather than full
weight is right there. Totem of Wrath, the Draenei aura, Misery and
Improved Faerie Fire make no false window. For 830: the tab's runner has
`computeStats` and its errors carry the sim's own `errorResult`
(`worker_pool_sim_runner.ts:221-239`); `run.ts:66` builds only
`WorkerPoolSimRunner`; `pnpm rank` runs `packages/core/src/cli.ts`, and
no CLI imports the fork engine.

**D1. The note is wrong for every non-Night-Elf shadow priest.** Same
finding as A1, reached separately. The domain axis lists the default
rotation's spells (Shadow Word: Pain, Vampiric Touch, Mind Blast, Mind
Flay, Shadow Word: Death, and Devouring Plague for Undead), all Shadow
school, and the APL casts Starshards only when it is known
(`ui/specs/priest/dps/apls/default.apl.json:12,23`).

**D2. Focused Power is a per-spell hit bonus the detection does not
read.** Fork `cap-profile.ts`, `talentCapsSomeSpellsSooner`. Focused
Power adds hit to Smite and Mind Blast only
(`sim/priest/talents.go:64-73`, `ClassMask: PriestSpellSmite |
PriestSpellMindBlast` read by the caller; Discipline tree index 15). No
pseudo-stat slot holds it. A shadow priest with Focused Power and no
Shadow Focus has Mind Blast reaching the cap sooner and gets no note.
The build needs about 25 Discipline points, so it is rare (hypothesis,
untested on how rare). The doc comment also presents Suppression as the
only such per-spell bonus. Same finding as P1.

**D3. A school-hit bonus stat makes the note blame talents.** A school
hit value entered in the page's bonus stats sets `SchoolBonusHitChance`
(`sim/core/character.go:150-160`), so a school slot rises above 13 with
no talent, and the note says "your talents". Same finding as P2.

**D4. With a custom rotation that casts no affected spell, the note
still shows.** For example Arcane Focus with a fire-only rotation. Every
default APL casts an affected spell (the Arcane mage APL casts
Frostbolt 27072 and Fire Blast 27079; both warlock APLs cast curses that
Suppression covers). Detecting it needs per-spell school and mask data
the tab does not hold (831 closing note). Not fixed here.

## Standards + Spec

### Standards

Documented standards pass. The three changed engine files (`rank.ts`,
`cap-profile.ts`, `seams/sim-runner.ts`) each match their sha256 row in
`docs/fork-provenance/engine.md`; the other 35 rows changed only in
padding. `python scripts/check_sim_implemented_effects.py` printed
"check ok: 226 implemented, 450 stub-only, matches committed file".
`data/wowsims-fork.lock.json` names the fork tip, and its `pushed: false`
is right: `git ls-remote origin` shows `feat/upgrades-tab-react` still at
`60a4735ea` and no 830 branch. The new comments explain why, as the
comment policy asks.

**S1. Two doc comments in fork `rank.ts:833-838` now say less than the
code does.** The `hitCapNotes` doc says "Why repair could not use the
hit cap…", but line 1117 also pushes `hitCapTalentNote`, where repair
did use the cap. The `readHitCap` doc lists "a hit percent and the
repair budget" but it now also returns `observed`.

**S2. `hitCapReadable` names something that is now always true.** Fork
`rank.ts:832`: `const hitCapReadable = budgetSlot !== undefined;`. After
830 every runner reads stats, so the value only means "this spec's
repair has a hit budget". A name such as `hasHitBudget` says that.

**S3. `talentPoints` (fork `cap-profile.ts:570-580`) repeats the
talent-string decode in `caps.ts:181-185`.** The doc comment and the
PROVENANCE row give the reason: `caps.ts` stays as ported. It is
exported but used only in its own file.

**S4. The zero stats read fake appears four times across two repos**
(main `fork-engine-harness.ts:164-171`, `wowsims-fork-parity.test.ts:905-911`;
fork `rank_cap.test.ts:61`, `rank_placeholders.test.ts:79-81`).

**S5. The new player note is one sentence of 39 words.**
`docs/ui-tooltip-table-conventions.md:226-227` says to split sentences
over 25 words. The sibling notes use the same "If gems were swapped to
turn your meta gem on, …" opening at a similar length
(`SubstitutionsList.test.tsx:105-107`).

### Spec

**830 meets "Done when".** 535-S7 checks that ret, feral, mage, shadow
and warlock on a runner without `computeStats` each fail after exactly
one sim. The axis ran `node --version; pnpm -C <main> exec vitest run
packages/core/test/fork-meta-repair.test.ts -t "535-S7|831-N"`: v22.23.2,
5 passed. The fork's `rank_cap.test.ts` pins the required method with
`@ts-expect-error`. "No CLI runs the fork engine" is true
(`scripts/ew5_rank.mjs` and `record_synthetic_fixtures.mjs` import
`packages/core/src/rank.js`).

**831 uses the one-note option**, which "Done when" allows, and reads
signals the sim uses. It falls short where A1/D1, P1 and P2 say. "N1-N3
failed before the fork change" is checkable by reading only: the old
`rank.ts` has no "reach the hit cap sooner" text, and every `runSpec`
option the tests use already existed. The closing note names no run for
it. "Only one hit-cap note can show" is true: the three
`hitCapNotes.push` calls (fork `rank.ts:1117`, `1120`, `1126`) are in
branches that exclude each other. No scope creep: the `setImmediate`
yield, the 180 s timeout, the parity test's empty enchant stats and
`zeroHitStats` all follow from making `computeStats` required.

**P1. A shadow priest with Focused Power and no Shadow Focus gets no
note.** Spec: "the ranking says in one note that hit up to 16% was
valued at full weight", and the closing note says the note "shows only
when the window exists, read from what the sim uses". Same finding as
D2.

**P2. The note can blame talents the player does not have.** Owner
ruling: the text must be true in every state. Shadow's `displayStats`
lists `PseudoStatSchoolHitPercentShadow` (`ui/specs/priest/dps/spec.ts:62`),
and `BonusStatsPicker` edits it as a pseudo-stat
(`ui/sim/proto/stats.ts:344-345`), which reaches `SchoolBonusHitChance`
(`sim/core/character.go:149-160`). Not driven on the page (hypothesis,
untested). Same finding as D3.

## Code quality

| ID  | Where                                                    | What                                                                                            |
| --- | -------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| S1  | fork `ui/features/upgrades/model/engine/rank.ts:833-838` | Rewrite the `hitCapNotes` and `readHitCap` doc comments to cover the talent note and `observed` |
| S2  | fork `ui/features/upgrades/model/engine/rank.ts:832`     | Rename `hitCapReadable` (for example `hasHitBudget`) or inline `budgetSlot !== undefined`       |

## Summary

The 830 fix is sound: every sim runner must now read stats, so a
hit-budget spec either repairs on its budget or its run fails with the
sim's own error. The 831 note is the wrong answer for the page's default
shadow priest. That priest is a Troll, cannot cast Starshards, and every
spell it casts gets Shadow Focus's hit, so the budget overvalues hit
from 6% to 16% and the note's "some of your spells" is false (A1/D1).
The ticket's reason for not using the Shadow hit slot holds only for
Night Elves. Two smaller gaps in the 831 note: Focused Power is not
detected (D2/P1), and a typed school-hit bonus is blamed on talents
(D3/P2); a rewording that does not name talents fixes D3/P2. Test 492-J
now runs 25.9 s against a 30 s timeout (A2), and no test pins the note's
absence against a non-73 target (A3). Two code-quality rows (S1, S2).

Open, pending author fix on this branch, all blocking the merge by the
skill's rules: A1/D1 and D2/P1 (wrong result with no true warning), D3/P2
(visibly wrong text in a reachable state), A2 (likely intermittent
`pnpm verify` failure the branch introduced), A3 (missing test), S1 and
S2 (code-quality pass before round 2). Tickets 830 and 831 are closed on
the branch; 831's closing note needs updating once A1/D1 and D2/P1 are
fixed.

Tickets this branch filed: 0. Closed: 2 (830, 831), counted with
`git diff --name-status dev...HEAD -- '.scratch/carry-forward/issues/*.md'`
(two `M` rows, no `A`) and the skill's `Status:` grep (2).

Not run: the merge check (`pnpm merge-to-dev --check-only`); the caller
asked to stop once this file is committed. The fork tip is not pushed
(`pushed: false` in the lock), which the merge check would need.

## Disposition

| ID  | Axis        | Disposition | Ticket / note                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| --- | ----------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | Adversarial | wontfix     | Not fixed on the branch. Since fork ae2c8afc1 the note shows for the default Troll shadow priest and is true; its pricing of hit from 6% to 16% stays. A slot chosen by race would encode a guess about the APL (a custom rotation can cast Smite, Holy Fire or a wand); the direct signal is each cast spell's school and damage in the run's action metrics (`ActionMetrics.spell_school`, `proto/api.proto:142-157`), which `SimObservation` does not keep. Reported to the owner; no ticket, per the owner's no-new-tickets rule of 2026-11-09 |
| A2  | Adversarial | fixed       | `fork-set-net.test.ts` sets a 120 s test timeout for the whole file (`vi.setConfig`)                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| A3  | Adversarial | fixed       | Test 831-N6: a mage with Arcane school hit against a level-72 target gets only the level-73 note                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| A4  | Adversarial | wontfix     | The `@ts-expect-error` is the real check and the fork type-check covers test files; the runtime line costs nothing                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| D1  | Domain      | wontfix     | Same as A1                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| D2  | Domain      | fixed       | Focused Power is in the shadow budget's `perSpellHitTalents` (fork ae2c8afc1); test 831-N5, red before that commit                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| D3  | Domain      | fixed       | The note names no source: "although some of your spells get extra hit and reach the hit cap sooner" (fork ae2c8afc1)                                                                                                                                                                                                                                                                                                                                                                                                                               |
| D4  | Domain      | wontfix     | Needs per-spell school and mask data the tab does not hold; every default APL casts an affected spell, so only a custom rotation reaches it                                                                                                                                                                                                                                                                                                                                                                                                        |
| S1  | Standards   | fixed       | Comments rewritten (fork ae2c8afc1)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| S2  | Standards   | fixed       | `hitCapReadable` removed; its uses read `budgetSlot !== undefined` (fork ae2c8afc1)                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| S3  | Standards   | wontfix     | The copy keeps the ported `caps.ts` unchanged, as the doc comment and PROVENANCE row say; dropping the `export` is optional                                                                                                                                                                                                                                                                                                                                                                                                                        |
| S4  | Standards   | wontfix     | Small test fakes split across two repos; the parity test imports nothing from the harness today                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| S5  | Standards   | wontfix     | Matches its sibling notes and the one-sentence rule; if the D3 rewording yields a shorter sentence that still states the cost, use it                                                                                                                                                                                                                                                                                                                                                                                                              |
| P1  | Spec        | fixed       | Same fix as D2                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| P2  | Spec        | fixed       | Same fix as D3                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |

## Focused check (round 2)

Main range: `7a8e88c5..00e34b70` (the second `Reviewed range:` line).
df41e9e7 only added this review file; the commit under check is
00e34b70 "Fix review round 1 of the 830 and 831 branch". Fork range
reviewed with it: `tbc-new-fork`
`52bb752ce4cb5b5ff5e906457891f746b73305d2..ae2c8afc148d6331660557716d4085c14c4e8d1c`
(one commit, ae2c8afc1 "Fix the 831 note's wording and per-spell
talents"). The lock moves from the first to the second
(`git show 7a8e88c5:data/wowsims-fork.lock.json` and the same at
00e34b70, `commit` field).

**Dispatch note.** `codex` is not on `PATH` (`command -v codex`, rc 1),
so one fresh `general-task` agent on Opus ran the four checks below and
judged the `wontfix` rows A1 and D1. It was told it writes nothing and
was given the caller's no-new-tickets rule. Before dispatch the
reviewing agent tested the skill's three conditions and judged that they
hold in substance; check 1 records where the literal text is not met.

**Side effect of this round.** The agent's first fork test command,
`pnpm -C <pair>/vendor/tbc-new-fork exec vitest run …`, made pnpm
install into the fork, which is an npm repo. It left an untracked
`vendor/tbc-new-fork/pnpm-lock.yaml` and rebuilt the fork's
`node_modules` in pnpm layout (vitest 4.1.12, where `package-lock.json`
pins 4.1.11). No tracked file changed: `git -C <pair>/vendor/tbc-new-fork
status --short` prints only `?? pnpm-lock.yaml`. Restore command:
`rm <pair>/vendor/tbc-new-fork/pnpm-lock.yaml && npm --prefix <pair>/vendor/tbc-new-fork ci`.

**Check 1, the three conditions: hold in substance; the literal text of
condition 1 is not met (bookkeeping, R2-3).** Neither fix commit message
names a finding ID or the ticket by path, and 00e34b70 mixes test
fixes, the fork re-pin (`data/wowsims-fork.lock.json`,
`data/sim-implemented-effects.json`, `docs/fork-provenance/engine.md`),
edits to tickets 795, 830 and 831, and this review file. The fork commit
also holds the code-quality pass (S1, S2) without the row IDs. The
`## Disposition` rows the author edited in 00e34b70 name each fix and
the commit it is in, so every change traces to a finding. Condition 2
holds: the only product-code changes are fork `cap-profile.ts` and
`rank.ts`, at the places D2, S1, S2 and D3 cite. The re-pin data checks
out: `sha256sum` of `rank.ts` and `cap-profile.ts` matches their
PROVENANCE rows, the lock `_comment` only gains one sentence, and the
other provenance rows changed only in padding. Condition 3 holds:
`git -C <fork> diff --name-status 24606be6b ae2c8afc1 --` the three
changed fork files gives `A` for all three (fork-only files, checked by
the reviewing agent with `git cat-file -e 24606be6b:<path>`), and
`git -C <fork> log --merges 52bb752ce..ae2c8afc1` lists no merge.

**Check 2, each fix changes only what its finding asks: pass.** Changes
no finding asked for: the rename `talentCapsSomeSpellsSooner` to
`someSpellsCapSooner`, the new `TalentPosition` type, the switch from
`profile.talentHit` to `repair.perSpellHitTalents`, and a `CapProfile`
doc paragraph that names the Troll overpricing (fork
`cap-profile.ts:129-136`). The switch changes behaviour only for D2's
case. Mage's Arcane Focus and shadow's Shadow Focus already show in a
school slot (`sim/mage/talents.go:113`, `sim/priest/talents.go:338`);
warlock keeps Suppression at segment 0, index 0; elemental and the melee
specs return false before the talent read, as before.
`grep -rn SpellMod_BonusHit_Percent sim/mage sim/priest sim/warlock`
finds only `priest/talents.go:70` and `warlock/talents.go:81`, so the
list is complete. Focused Power's position (Discipline, index 15) matches
`ui/sim/talents/trees/priest.json`.

**Check 3, each new test asserts its finding: pass.** 831-N5 would fail
at fork 52bb752ce, read from that commit's code: the old line is
`return schoolAbove || talentPoints(talentsString, profile.talentHit) > 0;`,
shadow's `talentHit` is segment 2, index 4, N5's string
`"0000000000000002--"` has an empty segment 2, and `casterRead(5)` puts
no school slot above slot 13, so no note shows. 831-N6 asserts exactly
one note matching `/level 73/` (`fork-meta-repair.test.ts:1545-1561`), so
a talent note pushed outside `if (budget)` makes it fail; it passes at
both commits, which is what A3 asked (a pin, not a red-first test). The
D3/P2 strings are exact matches in `TALENT_CAP_DETAIL` and
`SubstitutionsList.test.tsx`. A2's `vi.setConfig({ testTimeout: 120_000 })`
(`fork-set-net.test.ts:38-40`) is the fix itself; 492-J took 25.4 s in
this run.

**Check 4, the tests the fixes touch pass: pass.**

| Command                                                                                                                                                                 | Node     | rc  | Result                                                               |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | --- | -------------------------------------------------------------------- |
| `node --version; pnpm -C <pair> exec vitest run packages/core/test/fork-meta-repair.test.ts packages/core/test/fork-set-net.test.ts`                                    | v22.23.2 | 0   | 154 passed (meta-repair 51, set-net 103, 172.7 s); 831-N1 to N6 ran  |
| `node --version` and, in the fork, `node node_modules/vitest/vitest.mjs run` on `SubstitutionsList.test.tsx`, `engine/cap-profile.test.ts` and `model/rank_cap.test.ts` | v22.23.2 | 0   | 3 files, 11 passed, on the vitest 4.1.12 the stray pnpm install left |

The agent's first fork run, through pnpm, passed 9 tests in 2 files with
a wrong `rank_cap` path; the row above is its second run.

### Findings

**R2-1. The default shadow priest's hit from 6% to 16% is still priced
at full value, though no damage spell its rotation casts gains from it.**
This is A1/D1, which the author marked `wontfix`. The page's default
shadow priest is a Troll (fork `ui/specs/priest/dps/presets.ts:134`),
Starshards is registered only for Night Elves (`sim/priest/priest.go:58-62`,
read by the reviewing agent), and Shadowfiend takes only attack power
from the priest (`sim/priest/shadowfiend_pet.go:71-77`, relayed). The 831 closing
note says "the pricing stays", and fork `cap-profile.ts:129-136` says
"none of those spells gains from it". So the branch keeps a known wrong
price in the page's default state, which in practice closes 831 as an
accepted estimate for that state; the caller's brief says that option is
not available for 831. The `wontfix` reason rests on "`SimObservation`
does not keep" the spell schools. That is a fact about the code under
review, not a limit: `WorkerPoolSimRunner.run` receives the whole
`RaidSimResult` and returns only `dps`, `stdev`, `iterationsDone` and
`allValues` (fork `ui/features/upgrades/model/adapters/worker_pool_sim_runner.ts:196-210`,
read by the reviewing agent), and every run fills each unit's action
metrics with `spell_school` (`proto/api.proto:146-153`, read by the
reviewing agent; `sim/core/metrics_aggregator.go:147,366,613-616`,
relayed). The baseline sim runs just before the hit read in the same
function (fork `rank.ts:1082-1100`, relayed). The author is right that a
slot chosen by race would be a guess, which the owner's ruling rules
out. Limit of the direct signal: action metrics carry the school but not
the class mask that decides which spells get the school bonus
(`sim/core/spell_result.go:244-246`), so an item proc with no mask stays
unknown (hypothesis, untested on whether it matters). The same kept data
would also reach D4's custom-rotation case.

**R2-2. In the Troll state the note tells the player something that is
not what happened.** The note reads "If gems were swapped to turn your
meta gem on, hit rating was counted at full value up to 16% spell hit,
although some of your spells get extra hit and reach the hit cap
sooner." (fork `rank.ts:4486-4493`, read by the reviewing agent). For
the default Troll priest every damaging spell gets that hit, so "some"
tells the player the other spells still gain, and nothing says that hit
past 6% bought nothing. The same holds for D4's custom rotation that
casts no affected spell. In the other states it shows in (Arcane Focus
mage, Suppression warlock, Focused Power priest, school hit in the bonus
stats) the sentence is true. Owner ruling: player-facing text must be
true in every state it can show in. A1 already raised "some" (round 1,
A1); the D3 rewording removed "talents" and kept "some".

**R2-3 (bookkeeping).** The fix commit messages name no finding IDs, and
00e34b70 bundles test fixes, a re-pin, ticket edits and this review file
(check 1).

**R2-4 (bookkeeping).** Ticket 830's "Verified by" line still names
`tbc-new-fork@ed3255a8036f63e75e25f732b5c3147a40a908f9`
(`830-*.md:81`), while the numbers after it (52 passed; `gates: 1612
ran`) now come from runs at ae2c8afc1 (`git show 00e34b70 -- .scratch/carry-forward/issues/830-*.md`).

**R2-5 (code quality).** Two names the fixes left behind. `TalentPosition`
(fork `cap-profile.ts:175-179`) repeats three fields of
`TalentHitDescriptor` (`cap-profile.ts:40-46`). `someSpellsCapSooner`
was renamed because the note no longer names talents, but
`hitCapTalentNote` (fork `rank.ts`) and the main-repo test constant
`TALENT_CAP_DETAIL` (`fork-meta-repair.test.ts`) still say "Talent".

### Round 2 verdict on A1 and D1

The `wontfix` does not hold. Its two claims are that the note is now true
in the Troll state and that the direct fix needs data the tab does not
keep. R2-2 shows the first is not met under the owner's "true in every
state" ruling, and R2-1 shows the data reaches the tab's runner on every
sim and is dropped there. With no new tickets allowed, a `wontfix` here
leaves a known wrong price in the page's default shadow priest with no
ticket. So R2-1 and R2-2 take `fixed — pending author fix`.

## Code quality (round 2)

| ID   | Where                                                                                                                                                    | What                                                                                                                             |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| R2-5 | fork `ui/features/upgrades/model/engine/cap-profile.ts:40-46,175-179`; `rank.ts` `hitCapTalentNote`; main `fork-meta-repair.test.ts` `TALENT_CAP_DETAIL` | Build `TalentHitDescriptor` from `TalentPosition`; rename `hitCapTalentNote` and `TALENT_CAP_DETAIL` so they do not say "Talent" |

## Summary (round 2)

The round-1 fixes do what their findings asked, and every test they
touch passes: 154 main-repo tests and 11 fork tests (check 4). One
round-1 finding is still open: A1/D1, kept as `wontfix` by the author.
The page's default shadow priest is a Troll, so every damage spell its
rotation casts reaches the hit cap at 6% shared hit, yet the meta-gem
repair still prices hit from 6% to 16% at full value (R2-1), and the
note's "some of your spells" tells the player the other spells still
gain (R2-2). The sim already returns each spell's school on every run;
the tab's runner drops it. Round 2 also found two bookkeeping items
(R2-3, R2-4) and one code-quality row (R2-5).

Round 2 is the last round (`pre-merge-review` skill, "Round limit"), and
it reports findings other than bookkeeping, so the review ends here:
the merge check (step 4) was not run, and the owner chooses the next
step. R2-1, R2-2 and R2-5 are open, pending an author fix on this
branch, and block the merge.

Tickets this branch filed: 0. Closed: 2 (830, 831), counted with
`git diff --name-status dev...HEAD -- '.scratch/carry-forward/issues/*.md'`
(three `M` rows: 795, 830, 831; no `A`) and the skill's `Status:` grep
(2). Ticket 831's closing note will need editing once R2-1 is fixed.

## Disposition (round 2)

| ID   | Axis          | Disposition | Ticket / note                                                                                                                                                                                          |
| ---- | ------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| R2-1 | Focused check | fixed       | Fork 4903b8cee: the spell-hit budget splits hit by the baseline sim's spell damage by school, each school capped at its own hit; tests 831-P1 and 831-W1. Owner chose this, 2026-11-09: "a sounds ok." |
| R2-2 | Focused check | fixed       | Fork 4903b8cee removes that note; the only note left names a per-spell hit talent (Suppression, Focused Power) the price leaves out; tests 831-N1, N3, N5                                              |
| R2-3 | Focused check | wontfix     | Bookkeeping: the `## Disposition` rows map each finding ID to its change and commit                                                                                                                    |
| R2-4 | Focused check | fixed       | Ticket 830's `Verified by:` now names fork 4903b8cee, where its runs were made, and says it holds ed3255a80                                                                                            |
| R2-5 | Code quality  | fixed       | Fork 4903b8cee: `TalentHitDescriptor` extends `TalentPosition`; the note is `hitCapPerSpellTalentNote` and the test's `perSpellTalentDetail`, both about a talent                                      |

## Round 3 (full axes over the 831 rework)

Main range: `00e34b70..68518d8d` (the third `Reviewed range:` line).
9fd2230b only adds this review file; the commit under review is 68518d8d
"Re-pin the fork for the 831 spell pricing". Fork range reviewed with it:
`tbc-new-fork`
`ae2c8afc148d6331660557716d4085c14c4e8d1c..4903b8cee8a2df6011a8e457168048406096e127`
(one commit, 4903b8cee "Price caster hit by the spells the sim cast").
The lock moves from the first to the second (`commit` in
`data/wowsims-fork.lock.json` at 68518d8d). `git -C <fork> log --merges
ae2c8afc1..4903b8cee` lists no merge, and none of the 11 changed fork
files exists at upstream 24606be6b (`git cat-file -e`), so no upstream
wowsims file changed.

**Dispatch note.** Round 2 was the last round; the owner chose a
further round after choosing option (a) for ticket 831 ("a sounds
ok."). This round is a full review in round 1's form, not a focused
check: condition 2 of "Focused check (round 2)" fails, because fork
`meta-repair.ts`, `candidate-gems.ts` and `seams/sim-runner.ts` changed
at places no fixed finding cites, and the rework is a new design. `codex`
is not on `PATH` (`command -v codex`, rc 1), so four fresh `general-task`
agents on Opus ran in parallel: adversarial, domain, and the
`code-review` skill's Standards and Spec sub-axes, each over both
ranges. Each was told it writes nothing, that it must not run `pnpm` in
the fork, and was given the caller's no-new-tickets rule. Both trees
were clean at dispatch except this file's `Reviewed range:` line.

Tests run by the adversarial axis: fork, `node --version; node
<fork>/node_modules/vitest/vitest.mjs run` on the 5 touched test files
(v22.23.2, rc 0, 19 passed); main, `node --version; pnpm -C <pair> exec
vitest run packages/core/test/fork-meta-repair.test.ts` (v22.23.2, rc 0,
56 passed). The fork tree was clean after both runs.

### Round 3: adversarial

The new budget prices the default Troll shadow priest's hit only up to
its Shadow cap: with all damage in Shadow, the one group has offset 126
rating and share 1. School bits match `sim/core/flags.go:226-232`; slot
6-11 values are shared hit plus the school bonus
(`sim/core/character_sheet.go:111-116`), so the offset is the bonus; a
two-school spell gets offset 0 (`flags.go:288-308`); physical damage is
skipped; swaps and set versions keep `groups`. The tab's results cache is
an in-memory `MemoryStore` per page session, so no result from before
this change reaches the budget.

**R3-A1 (test gap, medium).** No test checks that a group with an
offset still has value below its own cap. 831-P1 uses a budget of 30
rating, 96 past the Shadow cap; 831-W1 uses 7% plus 10%, past the 16%
cap; both assert no Great Dawnstone. 831-G1 checks the budget's
`groups`, not their price. In `valueModel` (fork `meta-repair.ts`), a
change that gives 0 to every group with an offset above 0 passes P1 and
W1, and would price a Troll priest at 2% hit as needing no hit. Read
from the tests at `fork-meta-repair.test.ts:1523-1645` and `valueModel`;
the mutation was not run. The owner asked that the Troll value hit "only
up to" the cap; the tests pin only the "not past" half.

**R3-A2 (silent wrong price, low).** Explosives always hit
(`BonusHitPercent: 100`, `sim/core/consumes.go:625-626`), but their Fire
damage takes a share at offset 0 (fork `cap-profile.ts` `spellHitGroups`),
so a shadow priest with Engineering and an explosive values hit past the
Shadow cap by that share, with no note. The `CapProfile` comment ("Two
estimates remain", fork `cap-profile.ts:127-131`) leaves this case out.
The default state is not affected: explosives need Engineering
(`consumes.go:558`) and the default professions are Enchanting and
Tailoring (fork `ui/specs/priest/dps/presets.ts:136-137`), though the
default consumables name explosive 30217 (`presets.ts:96`).

**R3-A3 (estimate with no note, low).** Two cases make hit look less
useful than it is. An item proc with no class mask in a talented school
gets only shared hit (`spell_result.go:241-249`) but is priced at its
school's slot. The Water Elemental copies the mage's `SpellHitRating`
(`sim/mage/water_elemental.go:53`), but pet damage is left out
(`worker_pool_sim_runner.ts:210`), so a Frost mage that summons it values
hit past the Frost cap at 0 for the pet's share. No shipped mage APL
summons it (`ui/specs/mage/dps/apls/`: arcane, arcaneBraid, blank,
test). The comment and ticket 831's closing note record the item-proc
case.

**R3-A4 (wasted sim, low).** The worn-gear sim for a spell budget (fork
`rank.ts`, the `if (pricesHitBySpells(capProfile))` block before
`readHitCap`) runs before `hitCapBudgetFrom` checks the target level
(`cap-profile.ts:603-606`). Against a target that is not level 73 its
result is thrown away, it runs at full iterations, and if it fails the
whole run fails with `sim-failed`. Read by the reviewing agent at fork
`rank.ts:901-913`.

Not examined: whether the 831 tests fail on the old code (no finding
rests on it; the author's stash run is recorded in the caller's brief),
Stop during the new worn-gear sim (it uses the same `deps.sim.run` as the
baseline sim), and live sims of real rotations.

### Round 3: domain

No game fact in the diff is wrong. Checked against the sim code: the cap
is 16% (17% base miss at level 73, `sim/core/target.go:393`; 1% floor,
`spell_result.go:261`); 12.615385 rating per 1%
(`base_stats_auto_gen.go:18`); spell hit is `SpellHitPercent` plus the
spell's `BonusHitPercent` plus the school bonus, and the school bonus
needs a class mask (`spell_result.go:241-249`); Arcane Focus
(`sim/mage/talents.go:113`), Elemental Precision Frost 2x and Fire 1x
(`:536-537`) and Shadow Focus (`sim/priest/talents.go:338`) are school
bonuses, and the warlock has none; the only per-spell hit talents in
these classes are Focused Power on Smite and Mind Blast
(`sim/priest/talents.go:64-74`) and Suppression on the Affliction mask
(`sim/warlock/talents.go:74-84`); talent positions match
`ui/sim/talents/trees/`; Starshards is Night Elf only
(`sim/priest/priest.go:58-62`) and Arcane with a class mask, priced at
offset 0; the default shadow priest is a Troll (`presets.ts:134`); Totem
of Wrath and the Draenei aura add flat `SpellHitPercent`
(`sim/core/buffs.go:1068-1078,1307-1311`); `ActionMetrics.spell_school`
is the sim's school bitmask (`proto/api.proto:153`,
`metrics_aggregator.go:147,366`) and pets are a separate list, so
`players[0].actions` holds none. Relayed, not checked: the comment at
`cap-profile.ts:119` that the default target has no resistances.

**R3-D1 (low).** Water Elemental, the same as R3-A3's pet case.

**R3-D2 (low).** The note keys on talent points, not on cast spells: a
Destruction warlock with points in Suppression, which covers only
`WarlockAfflictionSpells` (`sim/warlock/warlock.go:273-275`), sees the
note although its price is exact. The note says hit "may be valued too
high", so it stays true.

### Round 3: Standards + Spec

#### Standards

Documented standards pass. `python scripts/check_engine_port_drift.py`
printed "engine port drift check ok: 36 ported files match engine.md"
(rc 0), and each of the five changed engine files has a "Ticket 831"
sentence in its row. The lock names 4903b8cee and its `_comment` gains
the entry `paired-worktrees.md` § Re-pin after a fork change asks for.
`python scripts/check_sim_implemented_effects.py` printed "matches
committed file" (rc 0). R2-5 is fixed: `TalentHitDescriptor =
TalentPosition & {...}`, and a grep for
`someSpellsCapSooner|hitCapTalentNote` in fork `ui/` and main `packages/`
finds nothing.

**R3-S1 (code quality).** The comment `// Each group's hit is worth its
share until its own cap (ticket 831).` in fork `meta-repair.ts`
`valueModel` restates the `hitTerm` reduce below it and the `HitCapBudget`
doc comment; the comment policy says to delete such a comment.

**R3-S2 (code quality).** `Readonly<Record<number, number>>` stands for
"spell damage by school bit" at about seven places (fork
`seams/sim-runner.ts:47`, `cap-profile.ts:594,656`, `rank.ts:848`, three
in the main test). In the main test, `schoolBonus` (keyed by stat slots
6-11) and `castDamage` (keyed by school bits) have the same type, so the
two kinds of key are easy to mix up. A named type would say what the
keys are.

**R3-S3.** In the main test, `SpecRun.castDamage` is the runner's
`spellDamageBySchool` under another name.

**R3-S4.** Fork `worker_pool_sim_runner.ts` exports `spellDamageBySchool()`,
which only its own file uses.

**R3-S5.** Fork `rank.ts` repeats `...(x.groups ? { groups: x.groups } :
{})` twice.

#### Spec

The change prices caster hit by school from the tab's own sim result,
with no race rule (`git diff ae2c8afc1..4903b8cee | grep -ci race`
gives 0). The old note is gone. The one note left, fork `rank.ts:4509-4515` (`hitCapPerSpellTalentNote`),
reads "If gems were swapped to turn your meta gem on, hit rating was
valued as if your Suppression talent added no hit, so it may be valued
too high." It is one sentence, names only a talent the player picked,
says nothing about spells being cast, and shows only when a budget
exists (every target level 73). Ticket 831's closing note matches the
code. No scope creep.

**R3-P1 (missing test, medium).** The owner asked that the default Troll
shadow priest value hit only up to where its cast spells reach the cap,
"and a test must pin that". 831-P1 feeds a stub sim
`castDamage: { [SCHOOL.shadow]: 1 }` with warlock weights and no race,
and the fork runner test feeds made-up action metrics. No test shows
that the page's real default shadow priest preset gives Shadow-only
spell damage, the step that P1's oracle comment takes from a source
reading. Other tests already run the real sim (`fork-set-net.test.ts`,
492-J).

**R3-P2 (low).** The item-proc estimate shows no note: the same case as
R3-A3.

**R3-P3 (low).** The Suppression and Focused Power note keys on talent
points: the same case as R3-D2.

### Round 3: earlier findings marked fixed in this window

R2-1 and R2-2 are fixed (adversarial check 4 and the spec axis, above).
R2-4 is fixed: ticket 830's `Verified by:` line names
`tbc-new-fork@4903b8cee8a2df6011a8e457168048406096e127`
(`830-*.md:81`, read by the reviewing agent). R2-5 is fixed (standards,
above).

## Code quality (round 3)

| ID    | Where                                                                                  | What                                                                |
| ----- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| R3-S1 | fork `ui/features/upgrades/model/engine/meta-repair.ts` `valueModel`                   | Delete the comment that restates `hitTerm`                          |
| R3-S2 | fork `seams/sim-runner.ts:47`, `cap-profile.ts:594,656`, `rank.ts:848`; main 831 tests | Name the "spell damage by school bit" type and use it at every site |

## Summary (round 3)

The 831 rework does what the owner chose: caster hit is priced by the
school damage of the tab's own sim result, the default Troll shadow
priest values no hit past its Shadow cap, and the old note is gone. The
domain axis found no wrong game fact. R2-1, R2-2, R2-4 and R2-5 are
fixed. Open, pending an author fix on this branch: two test gaps, one on
each half of the owner's "only up to the cap" (R3-A1: no test that hit
below an offset group's cap still counts; R3-P1: no test on the real
default Troll preset); a small overvalue for a shadow priest with
Engineering, whose explosives always hit (R3-A2, not the default state);
a worn-gear sim wasted against a target that is not level 73 (R3-A4);
and two code-quality rows (R3-S1, R3-S2). The other rows are `wontfix`.

This is the last round (the caller's brief), and it reports findings
other than bookkeeping, so the review ends here (`pre-merge-review`
skill, "Round limit"): the owner chooses the next step. By the skill's
rules R3-A2 is fixed before merge (a silent wrong result), and R3-A1,
R3-P1, R3-A4, R3-S1 and R3-S2 block the merge until fixed.

Tickets this branch filed: 0. Closed: 2 (830, 831), counted with
`git diff --name-status dev...HEAD -- '.scratch/carry-forward/issues/*.md'`
(three `M` rows: 795, 830, 831; no `A`) and the skill's `Status:` grep
(2).

## Disposition (round 3)

| ID    | Axis        | Disposition | Ticket / note                                                                                                                                                                                                |
| ----- | ----------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| R3-A1 | Adversarial | fixed       | 831-P1 now also checks that a Shadow group below its own cap (1% school bonus, 17.4 rating left) still places a Great Dawnstone                                                                              |
| R3-A2 | Adversarial | fixed       | Wording, as the assessor advised: the `CapProfile.repair` comment (fork 3803a1398) and ticket 831's closing note name explosives as an estimate the sim result does not mark; no item-id list                |
| R3-A3 | Adversarial | wontfix     | The sim result holds no class mask and no pet-hit signal; both cases make hit look less useful, never more; no shipped mage APL summons the Water Elemental; the item-proc case is in the comment and ticket |
| R3-A4 | Adversarial | fixed       | Fork 3803a1398: the worn caster sim runs only when `targetsAtCapLevel`; test 831-W2                                                                                                                          |
| R3-D1 | Domain      | wontfix     | Same as R3-A3                                                                                                                                                                                                |
| R3-D2 | Domain      | wontfix     | The note says hit "may be valued too high", so it is true for a talented player who casts none of the covered spells; telling them apart needs a hand-kept spell list per talent, which is another rule      |
| R3-S1 | Standards   | fixed       | Fork 3803a1398 deletes the comment                                                                                                                                                                           |
| R3-S2 | Standards   | fixed       | Fork 3803a1398: `SpellDamageBySchool` in `engine/seams/sim-runner.ts`, used at every site                                                                                                                    |
| R3-S3 | Standards   | wontfix     | Test-only field; its doc comment links the two names                                                                                                                                                         |
| R3-S4 | Standards   | wontfix     | Harmless; keeps the helper open to a direct unit test                                                                                                                                                        |
| R3-S5 | Standards   | wontfix     | The file uses this pattern for optional fields elsewhere (`saveAllValues`); a helper for two sites is not clearer                                                                                            |
| R3-P1 | Spec        | fixed       | `packages/core/test/fork-caster-hit-sim.test.ts` 831-T1 sims the page's default Troll shadow priest with the pinned wowsimcli: only Shadow damage, one group at the Shadow cap; 831-T2 the Night Elf case    |
| R3-P2 | Spec        | wontfix     | Same as R3-A3                                                                                                                                                                                                |
| R3-P3 | Spec        | wontfix     | Same as R3-D2                                                                                                                                                                                                |
