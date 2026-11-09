# Pre-merge review — fix/830-831-hit-budget

Reviewed range: `fab063a5db43793fb7966154a18893ddaa841c79..7a8e88c597a891b6a4010b42b0744b9aa81f4667`

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

| ID  | Axis        | Disposition | Ticket / note                                                                                                                                                                             |
| --- | ----------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | Adversarial | fixed       | fixed — pending author fix. Price shadow on slot 11 when the request's race cannot cast Starshards (direct signal), or otherwise make the budget and note true for that state. Same as D1 |
| A2  | Adversarial | fixed       | fixed — pending author fix. Give 492-J and the other cases over 14 s explicit timeouts, as 497-A has                                                                                      |
| A3  | Adversarial | fixed       | fixed — pending author fix. Add a test: caster with a school bonus against a non-73 target gets no talent note                                                                            |
| A4  | Adversarial | wontfix     | The `@ts-expect-error` is the real check and the fork type-check covers test files; the runtime line costs nothing                                                                        |
| D1  | Domain      | fixed       | fixed — pending author fix. Same fix as A1                                                                                                                                                |
| D2  | Domain      | fixed       | fixed — pending author fix. Read Focused Power from the talent string, as Suppression is, and add a test. Same as P1                                                                      |
| D3  | Domain      | fixed       | fixed — pending author fix. Reword the note so it does not name talents as the cause. Same as P2                                                                                          |
| D4  | Domain      | wontfix     | Needs per-spell school and mask data the tab does not hold; every default APL casts an affected spell, so only a custom rotation reaches it                                               |
| S1  | Standards   | fixed       | fixed — pending author fix (code-quality pass)                                                                                                                                            |
| S2  | Standards   | fixed       | fixed — pending author fix (code-quality pass)                                                                                                                                            |
| S3  | Standards   | wontfix     | The copy keeps the ported `caps.ts` unchanged, as the doc comment and PROVENANCE row say; dropping the `export` is optional                                                               |
| S4  | Standards   | wontfix     | Small test fakes split across two repos; the parity test imports nothing from the harness today                                                                                           |
| S5  | Standards   | wontfix     | Matches its sibling notes and the one-sentence rule; if the D3 rewording yields a shorter sentence that still states the cost, use it                                                     |
| P1  | Spec        | fixed       | fixed — pending author fix. Same fix as D2                                                                                                                                                |
| P2  | Spec        | fixed       | fixed — pending author fix. Same fix as D3                                                                                                                                                |
