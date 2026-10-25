# Pre-merge review — feat/tab-checks-without-sims

Reviewed range: `aa3810d912dfa9739d00d14978124b4e3bbb543b..eb9547d36b317c46a54ef1d4747d85af3bd27e9f`

Reviewed range: `eb9547d36b317c46a54ef1d4747d85af3bd27e9f..de5cef6ff3c4b8ea70ab46698ddfdac4631768f2`

Dispatch: full axes (31 files, 6584 insertions and 44821 deletions; paths under
`data/`). `codex` is not on `PATH`, so each axis ran as a fresh `general-task`
agent on Opus (review lane), all four in one parallel batch. The domain axis
ran because the diff edits set-bonus fixture data and the tests that read it.
Every axis was told it writes nothing and not to run the layout harness, the
layout gate or `pnpm verify`.

Known before the review, not counted as code findings: `pnpm verify` and
`pnpm merge-to-dev --check-only` stop at `format:check` in the agent sandbox
with EACCES on untracked dotfile mounts; the other verify steps passed one at a
time (1518 tests, 735 fork tests), per the orchestrator.

## Adversarial

- **A1 (fix before merge, gate correctness).** One fixture that fails to load
  throws away every failure already measured, and the merge is not blocked.
  `scripts/tab-harness/test-layout.mjs:357` (`loadFixture`) and `:381`
  (`judgePostRun` on `m.error`) throw `Unmeasured`; the top-level catch at
  `:576` prints `verdict("unmeasured")`; `scripts/check_layout_gate.py:771-780`
  maps that to `GATE_UNMEASURED`, and `run()` returns 0 at `:973-975`. With six
  fixtures rendered in turn, a FAIL on `mock-dropped-list` is discarded when a
  later fixture times out. On dev the same path existed with one fixture; six
  fixtures make it new in kind (failures from earlier fixtures are dropped).
  Found by reading the code; the harness was not run.
- **A2 (fix before merge, gate correctness; Standards S1 is the same
  finding).** A green `--fixture X` run advances the baseline for all six
  fixtures. `check_layout_gate.py:952` renders `[fixture]` only, and `:978`
  calls `write_baseline(digest)` over a digest that covers every
  `data/tab-fixtures/*.json`. The reviewer proved it with `run_gate` stubbed
  and the lock pointed at a temp copy: "PASSED. Advanced the baseline". The
  next merge then skips the five fixtures that were never rendered. The new
  comment at `:727-729` and the A1 comment at `:947-951` both say this must not
  happen. Dev had the same `--fixture` path, but dev's default rendered one
  fixture of several anyway.
- **A3 (minor).** Without a fork (CI), `tab-fixtures:check` runs only the
  schema check: `make-mock-fixtures.ts:852-855` skips the byte compare. The
  docstring says so.
- **A4 (minor).** Nothing checks the moved recordings in
  `packages/core/test/fixtures/tab-recordings/` for `forkDirty` or `forkSha`.
- **A5 (checked, not a defect).** Each moved recording shows about 600 changed
  lines because prettier reformatted it (`.prettierignore`'s `test/fixtures/`
  matches only at the root). A JSON compare against dev found the content equal
  in all six; `fork-set-fixtures.test.ts` and `fork-meta-repair.test.ts` pass
  (37 tests).

Checked and sound: `--check` catches a missing, differing or extra mock file
(`make-mock-fixtures.ts:880-890`); the Python check rejects a file without
`madeUp`; the lock value equals the live digest (`d09838b7…`); check 17 fails
with no set-bonus figure and check 15 with no rows. Unexamined: whether all six
fixtures pass in the harness (not run); the fork's replay flag naming
`ret-p3-p2`; the axe scan running on one fixture only.

## Domain

- **D1 (minor, see Summary for why not fix before merge).** The generator
  gives a "breaks" row to a candidate whatever its slot, and takes the
  threshold from `worn.count >= 4 ? 4 : 2`
  (`packages/core/test/tab-fixtures/make-mock-fixtures.ts:588-607`, read).
  The reviewer counted 6 of 8 break rows across the mocks breaking a set from a
  slot that holds no piece of it, or breaking a bonus that is not active (for
  example Wastewalker Gloves breaking Malorne 2pc worn on shoulder and chest),
  against 0 of 292 in the real recordings.
- **D2 (minor).** The `mock-set-bonus` crossing row hard-codes
  `piecesWornBefore: 1` (`make-mock-fixtures.ts:609-620`) with no Wastewalker
  piece worn; the popover shows it as "have".
- **D3 (minor).** No mock set row has `stepRanking: true` or `futureBonuses`,
  though every set row in the real recordings has the first and 8 to 13 rows
  per file the second. Check 17 (`test-layout.mjs:270`) on dev hovered a
  popover from a real recording; now it never opens that variant.
- **D4 (minor).** `data/tab-fixtures/README.md:20` and the generator's
  `covers` text (`make-mock-fixtures.ts:206`) say the ranged fixture has bows,
  guns and crossbows; all four ranged rows are bows.
- **D5 (checked, not shown).** The generator sets Precision 3/3 and a 141.92
  melee hit cap for mage, hunter and feral; the tab renders neither field
  outside `engine/` and `testing/`.

Clean: the recordings' game data did not change in the move; the weapon-slot
rows in the mocks are valid; the changed docs make no wrong domain claim.

## Standards + Spec

### Standards

- **S1** = A2 (see Adversarial).
- **S2 (hard, minor).** AGENTS.md § Durable claims: comments at
  `make-mock-fixtures.ts:17` and `test-layout.mjs:51-53`, `:308-310` state
  sandbox causes ("the `tsx` CLI cannot open its IPC pipe", "the sandbox lets
  the harness run only as a bare command") with no command and no
  "hypothesis" or "untested".
- **S3 (hard, minor).** Commit `26d7dace` subject is 53 characters (limit 50).
- **S4 (judgement, minor).** Repeated Switches and Primitive Obsession: about
  11 branches on literal fixture names in `make-mock-fixtures.ts` (444, 496,
  522-533, 595, 609, 633, 752, 759-824); `Spec.name` is a plain `string`.
- **S5 (judgement, minor).** Duplicated Code: `PoolSlot`
  (`make-mock-fixtures.ts:45-59`) copies `ItemSlot`
  (`packages/core/src/items.ts:15-29`).
- **S6 (judgement, minor).** Duplicated Code: `NOT_MADE_UP` in
  `scripts/check_tab_fixtures.py` and `MOCK_DIR_REFUSAL` in
  `scripts/tab-fixtures/record.mjs:35-36` are the same text.
- **S7 (minor).** The `check_tab_fixtures.py` docstring and
  `data/tab-fixtures/README.md` § The generator do not say the byte compare
  skips without a fork (same gap as A3).
- **S8 (minor).** Unwrapped lines at `check_layout_gate.py:242` (120 chars),
  `record.mjs:59` (207 chars) and one `known-traps.md` line; style-guide words
  "carries" (`test-layout.mjs:51`) and "shape" (`make-mock-fixtures.ts:565`,
  `:736`); a hard-coded "(89 rows)" in the README.

### Spec

Spec sources: `.scratch/stage-gate/tab-checks-without-sims/` brief, plan,
plan-review, execution report and decision log, and the owner's words of
2026-10-24. The six fixtures meet the plan's per-fixture rules (unique row
keys, 3 off-hand rows, 4 ranged rows, 3 set-break rows and 1 crossing row, 89
rows with 69 above the cutoff, long names of 61-67 characters, 12 left-out
lines).

- **P1 (minor, not asked for).** `record.mjs` now accepts `--allow-dirty --out
packages/core/test/fixtures/tab-recordings`; plan step 5 asked only to
  refuse `--out` inside `data/tab-fixtures`. Same risk as A4.
- **P2 (minor).** The generator reads item names from the fork's
  `assets/database/db.json` (`make-mock-fixtures.ts:36`; executor ledger row
  K1-2); the plan named only preset files. A wowsims rename would force a regen
  and a full gate run (hypothesis, untested).
- **P3 (minor).** Test 536-X still checks two fork display rules
  (`singleSwapBreaks`, `setBonusNote`) against saved sim output. Planned (C24);
  no sim runs; `tab-recordings/README.md:29` explains how to update it.
- **P4 (minor, bookkeeping).** `brief.md:75` still says "The page checks run
  on every DPS spec page", against the corrected Goal at `brief.md:30-37`. The
  diff follows the corrected Goal.
- **P5 (minor).** `scripts/tab-harness/test-review.mjs:14` still says "a
  recorded fixture".

**Time-budget acceptance (52.6 s before, 110.9 s after, limit before + 30 s):
sound against "I want to test code that is changed I don't want to run long
slow code to test code that isn't changed".** The harness is not a
`pnpm verify` step (`package.json:14`; `run_verify.mjs:193-199` calls only
`check_layout_gate.py --preview-skip`), not in the git hooks
(`.githooks/pre-push:3` runs verify), and runs only by hand
(`package.json:72`) or from `pnpm merge-to-dev` (`merge_to_dev.py:479-499`).
It skips when the digest equals the baseline (`check_layout_gate.py:909-913`
at HEAD, read). So a change that does not touch the tab or what draws it costs
nothing; the extra ~58 s is paid once per merge that does. Two caveats from
before this branch: the digest covers the fork's whole `package.json` and
`package-lock.json`, so a fork dependency bump pays the full run, and a run
renders all six fixtures whatever input changed.

### Known before the review

- **K1 (fix inline).** Stale "recorded" comments outside the plan's manifest:
  `scripts/tab-fixtures/smoke.mjs:1`, `scripts/tab-harness/tab_fixtures.mjs:11`
  (and `test-review.mjs:14`, P5).
- Not looked at by eye: the "Items left out and other notes" list on
  `mock-dropped-list` (below the smoke screenshot fold); layout checks 1 and 7
  passed on it.
- Smoke screenshots show "Failed to fetch" toasts; hypothesis, untested: no
  backend under the smoke script's vite.

## Code quality

Rows for the one-pass quality fix (step 3) before round 2. They change no
behaviour. Edits to harness files and `data/tab-fixtures/` change the layout
gate's digest, so the gate re-runs after them.

| ID  | Where                                                                                                                            | Fix                                                                                                                                    |
| --- | -------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Q1  | `scripts/tab-fixtures/smoke.mjs:1`, `scripts/tab-harness/tab_fixtures.mjs:11`, `scripts/tab-harness/test-review.mjs:14` (K1, P5) | Replace "recorded" with "made-up"                                                                                                      |
| Q2  | `make-mock-fixtures.ts:17`, `test-layout.mjs:51-53`, `:308-310` (S2)                                                             | Mark the sandbox causes "hypothesis, untested" or name a command                                                                       |
| Q3  | `make-mock-fixtures.ts` fixture-name branches (S4)                                                                               | Put per-fixture behaviour on the `Spec` entries, or type `name` as a union                                                             |
| Q4  | `make-mock-fixtures.ts:45-59` (S5)                                                                                               | Import `ItemSlot` from `packages/core/src` in place of `PoolSlot`                                                                      |
| Q5  | `check_tab_fixtures.py` `NOT_MADE_UP`, `record.mjs:35-36` (S6)                                                                   | Keep one wording and point the other at it, or cut one to a short message                                                              |
| Q6  | `check_tab_fixtures.py` docstring, `data/tab-fixtures/README.md` (S7, A3, D4, S8)                                                | Say the byte compare skips without a fork; say the ranged rows are bows (or add a gun and a crossbow); drop the hard-coded "(89 rows)" |
| Q7  | `check_layout_gate.py:242`, `record.mjs:59`, `known-traps.md`, `test-layout.mjs:51`, `make-mock-fixtures.ts:565`, `:736` (S8)    | Wrap the long lines; replace "carries" and "shape" with plain words                                                                    |

## Summary

Round 1 found two fix-before-merge findings, both in the layout gate:

- **A1:** one fixture that fails to load makes the whole run "unmeasured",
  throws away failures already measured on earlier fixtures, and does not block
  the merge.
- **A2:** a green `--fixture` run marks all six fixtures as tested.

Neither has a fix commit yet, so neither has a Disposition row. The seven Code
quality rows (Q1-Q7) also wait for the quality pass. Round 2 (the focused
check) runs after the fixes for A1, A2 and Q1-Q7.

Why D1-D3 are minor, not fix before merge (owner scope ruling: fix before
merge only what touches what the tab shows, the gate's correctness, or whether
the checks test what they claim): the branch does not change the fork, so the
tab a player sees is unchanged; the layout checks measure positions and sizes,
which do not depend on whether a made-up set break is possible in the game;
and check 17 still measures what it says, popover placement. D3 is the
closest call: a `futureBonuses` popover that is wider than the variant the
mocks show would now go unmeasured (hypothesis, untested). Ticket 707 holds
D1-D3.

The time-budget acceptance is sound: the harness never runs in `pnpm verify`
or the hooks, and skips when nothing it measures has changed.

## Disposition

A1 and A2 (fix before merge) and the findings folded into Q1-Q7 (S2, S4-S8,
D4, P5, K1) get their rows after their fixes, in round 2.

| ID  | Axis        | Disposition | Ticket / note                                                                                                                                               |
| --- | ----------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A3  | Adversarial | wontfix     | `pnpm verify` refuses a checkout with no fork, so the byte compare runs before every push; CI checks the schema only by design. The missing doc line is Q6. |
| A4  | Adversarial | fixed       | Superseded in round 2: `scripts/check_tab_fixtures.py:111` checks every recording (no `madeUp`, `forkDirty: false`); ticket 708 closed                      |
| A5  | Adversarial | wontfix     | Checked, not a defect: prettier reformat only; JSON content equal to dev in all six; both engine suites pass                                                |
| D1  | Domain      | fixed       | Superseded in round 2: breaks come from the copied gear (`make-mock-fixtures.ts:645`, `:687`); ticket 707 closed                                            |
| D2  | Domain      | fixed       | Superseded in round 2: `piecesWornBefore` is the gear's count (checked at `make-mock-fixtures.ts:902`); ticket 707 closed                                   |
| D3  | Domain      | fixed       | Superseded in round 2: every set row has `stepRanking: true`, 8 of 9 have `futureBonuses`; ticket 707 closed                                                |
| D5  | Domain      | wontfix     | The tab renders neither the hit-cap nor the talent field; made-up values are never shown                                                                    |
| S1  | Standards   | wontfix     | Same finding as A2; disposed with A2                                                                                                                        |
| S3  | Standards   | wontfix     | The branch is unpushed, but a rebase of nine commits for a 3-character overrun costs more than it fixes                                                     |
| P1  | Spec        | fixed       | Superseded in round 2: `scripts/tab-fixtures/record.mjs:138` refuses `--allow-dirty` into the recordings folder; ticket 708 closed                          |
| P2  | Spec        | wontfix     | Reading item names from the fork's wowsims item data follows ADR-0029; a rename fails `tab-fixtures:check` loudly, not silently                             |
| P3  | Spec        | wontfix     | Planned (plan C24); no sim runs; `packages/core/test/fixtures/tab-recordings/README.md:29` says how to update the values                                    |
| P4  | Spec        | wontfix     | Bookkeeping in a stage-gate artifact; the corrected Goal (`brief.md:30-37`) is what the plan and the diff follow                                            |

## Focused check (round 2)

Main range: `eb9547d3..de5cef6f`. Commit `8d7d977d` only records round 1
(this file and tickets 707 and 708); the fixes are `8d7d977d..de5cef6f`, six
commits. Fork range: none. `git diff --quiet dev...HEAD --
data/wowsims-fork.lock.json` exits 0, the fork is at the lock's commit
`7024ba6d`, and `git -C vendor/tbc-new-fork status --porcelain` prints
nothing. Dispatch: the orchestrator ran this check as one fresh `general-task`
agent on Opus (review lane), which also wrote this section. It did not run the
layout harness or the gate.

Which finding each commit fixes. The commit messages name no finding ID, so
this table is the record (from the fixer's report, checked against each diff):

| Commit     | Fixes                                                     |
| ---------- | --------------------------------------------------------- |
| `7572a254` | 707 (D1, D2, D3), Q3, Q4, part of Q2, Q6 and Q7           |
| `cf09ed47` | A1, A2 (= S1), part of Q2 and Q7                          |
| `d263e557` | 708 (A4, P1), Q5, part of Q6 and Q7                       |
| `2ebced26` | Q1 (K1, P5), part of Q6 (D4, S7) and Q7                   |
| `9c097c85` | the layout lock, advanced by the gate run after the fixes |
| `de5cef6f` | closes tickets 707 and 708; two `map.md` lines            |

### Check 1: the three conditions

- **Condition 1 holds in substance, not in letter.** Every commit's diff is a
  fix for a round-1 finding, the lock advance those fixes force, or ticket
  bookkeeping. But no commit message names a finding ID or a ticket, and the
  skill asks for one of those. Tickets 707 and 708 name `7572a254` and
  `d263e557`; nothing durable named `cf09ed47` or `2ebced26` until the table
  above. Finding N3.
- **Condition 2 holds, with one judged exception.** The changed code is at the
  places the findings cite. The exception: `mock-set-bonus` moved from feral
  to warrior (`p1_arms`) and `mock-many-rows` from warrior to feral
  (`p2_6p`). D2's fix needs a crossing row, and a crossing row needs a set worn
  one piece short of a bonus. Ticket 707's closing note says no feral preset
  has that. This review did not re-check that claim (hypothesis, untested).
  The swap keeps the plan's intent, "one per UI difference ... each loaded on
  one spec page that has that difference" (`plan.md:5`). Warrior has set rows.
  Feral still gives 76 rows, 20 below the cutoff, against the plan's "≥ 60" and
  "≥ 15" (`plan.md:79`). The post-run axe scan follows `mock-set-bonus` to the
  warrior page; it scanned one page before and still scans one.
- **Condition 3 holds:** the branch does not move the fork pin.

### Check 2: each fix changes only what its finding asks for

- **A1: fixed.** `scripts/tab-harness/test-layout.mjs:508-523` catches an
  `Unmeasured` per fixture, names the fixture and goes on. `:556` reports
  "unmeasured" only when no layout check and no a11y check failed. Otherwise
  the verdict is "measured", `pass: false`, and the exit is 1 (`:566-592`).
  The crash handler at `:602-610` reports "measured" when a layout check had
  failed. `scripts/check_layout_gate.py:776` reads an "unmeasured" verdict
  with a nonzero `failed` as FAIL. In the case the review asked about, a
  fixture fails to load after a check on an earlier fixture failed: the catch
  at `:519` keeps the loop going, `failed` counts the earlier failure, and
  `:592` gives exit 1, so the gate returns 1. Reading the code is enough for
  this case. The path is about 15 lines in one function, and an end-to-end
  test would need a browser and a broken fixture page. The gate's Python side
  is different (N4).
- **A2: fixed.** `check_layout_gate.py:981-990` returns 0 without
  `write_baseline` when `fixture` is set. A full run (`fixture is None`)
  still reaches `write_baseline(digest)` at `:991-992`. `merge_to_dev.py:494`
  calls `run()` with no fixture, and `run_gate` drops an inherited
  `TBC_TAB_FIXTURE` when no fixture is given, so the merge path always
  renders all six fixtures and can still advance the baseline.
- **707 (D1-D3): fixed.** A check script written for this review
  (`$TMPDIR/r2/chk.py`, not committed) reads the fork's `db.json` and the Go
  `NewItemSet` blocks itself. It checks all 9 set rows in the six files:
  - each row's set matches its item;
  - its slot holds no piece of its own set;
  - `piecesWornBefore` and `piecesAfterSwap` equal the copied gear's count and
    that count plus one;
  - `crossesThreshold` is true only at a count where the set has a bonus;
  - a break exists only when the slot holds a piece of the broken set and the
    worn count equals the broken threshold;
  - every future bonus's pieces belong to the set and its piece counts add up.

  Result: 0 bad rows. All 9 rows have `stepRanking: true`; 8 have
  `futureBonuses`. The first set row of `mock-set-bonus` (Onslaught
  Battle-Helm) has two future bonuses. The generator reads the fork
  (`ui/specs`, `assets/database/db.json`, `sim/**/*.go`) and writes only
  `data/tab-fixtures/` (`make-mock-fixtures.ts:1085-1095`). The fork's
  `git status --porcelain` is empty.

- **708 (A4, P1): fixed.** `pnpm tab-fixtures:check` exits 0 in 0.9 s wall
  time, including the generator's `--check`. It prints `recording <name>: ok`
  for all six recordings. It is in `pnpm verify` (`package.json:15`
  `verify:steps` → `tab-fixtures:check`, `:76`) and runs no sim and no browser.
  `node scripts/tab-fixtures/record.mjs ... --allow-dirty --out
packages/core/test/fixtures/tab-recordings` exits 2 with the refusal. A
  subfolder gives the same result. The refusal is in `validate()`
  (`record.mjs:138`), before any git call or page load. The refusal is
  correct: a clean fork can still record into that folder, and a dirty fork
  can still record anywhere else.
- **Q1-Q7: done, Q3 by the alternative that the row offers.**
  - Q1: no "recorded" left in `smoke.mjs`, `tab_fixtures.mjs` or
    `test-review.mjs`.
  - Q2: the generator names a command (`make-mock-fixtures.ts:19-20`), and
    `test-layout.mjs:54-57` and `:312-315` say "hypothesis, untested".
  - Q3: `name` is now the `FixtureName` union (`make-mock-fixtures.ts:174`),
    and per-fixture flags on `Spec` replace six name branches. The row
    offered "or type `name` as a union". Two exhaustive `switch`es remain.
  - Q4: `ItemSlot` is imported (`:29`).
  - Q5: the two messages now differ in their words.
  - Q6: the README says "(bows)" and that the compare skips without a fork,
    and "(89 rows)" is gone.
  - Q7: no "carries" or "shape" left in the two files. `check_layout_gate.py`
    lines 242-244 are wrapped.

### Check 3: new tests

No test was added. None of the findings asked for one. The fixer checked A1
and A2 with an uncommitted probe that stubbed `run_gate`. For 707 it changed
the generator and saw `--check` fail, then undid the change (fixer's report;
not re-run here). The generator's own `checkSetRows` (`:890`) is a check that
runs in `pnpm verify` (N2).

### Check 4: tests that the fixes touch

`pnpm tab-fixtures:check` rc 0. `pnpm exec vitest run
packages/core/test/fork-set-fixtures.test.ts
packages/core/test/fork-meta-repair.test.ts` gives 37 passed. `pnpm typecheck`
rc 0. `python scripts/check_layout_gate.py --preview-skip` prints "unchanged
since the last green run (digest a2caeb33c72f...)", so the lock matches the
tree at `de5cef6f`. The gate run that advanced it is the fixer's (not re-run
here).

### New findings

- **N1 (minor; a gap the branch did not add; needs a ticket).** An a11y failure
  is still lost when the run crashes afterwards. The crash handler counts only
  layout checks: `test-layout.mjs:602` reads the module-level `results`, and
  the a11y `violations` live inside `main()`. Two paths reach it:
  - a pre-run `Unmeasured` (the tab does not open at a later width,
    `test-layout.mjs:497-500`) after a pre-run axe failure at an earlier
    width;
  - any error that is not `Unmeasured` during the fixture pass, for example a
    CDP timeout or a page eval that throws (`test-tab-harness.mjs:310`,
    `:350`).

  In both cases the verdict is "unmeasured" with no `failed` count, and the
  gate prints SKIPPED and lets the merge through. Dev behaved the same way, so
  the fix did not add this. But the new comment at `:600-601`, "Checks that
  already failed are a measured failure", covers only layout checks. Found by
  reading the code; not run.

- **N2 (minor).** `checkSetRows` (`make-mock-fixtures.ts:890-922`) does not
  reject a set row whose slot already holds a piece of its own set. For such
  a row, `piecesAfterSwap === before + 1` would be wrong in the game but pass
  the check. It also does not check `futureBonuses`. The generator never
  writes such a row today (`:687`), and the check script above found none.
  Only a later generator edit could add one.
- **N3 (bookkeeping).** The fix commits name no finding IDs (Check 1). The
  table above records the map.
- **N4 (minor; needs a ticket).** Nothing tests `check_layout_gate.py`'s
  verdict handling or its baseline write. No test file covers the script
  (`git ls-files` shows none). The A1 rule at `:776` and the A2 rule at
  `:981` could be undone with no failing check. The fixer's probe shows that
  a stub harness that prints a verdict line is enough to test both.

## Summary (round 2)

Round 2 was the focused check. A1 and A2 are fixed: a run in which a layout
check failed now ends as FAIL even when a later fixture fails to load, and a
`--fixture` run no longer advances the baseline. Tickets 707 and 708 are
fixed and closed with `Verified by:` lines. Q1-Q7 are done.

The check found no fix that is wrong. It found three minor gaps: N1 (an a11y
failure followed by a crash still reads as a skip; dev did the same), N2 (the
set-row check misses one impossible case) and N4 (no test covers the gate
script). All three were fixed after the check, in `1d2262d9` (N1), `c2e9e13b`
(N2) and `0900056b` (N4); their rows are in the Disposition table below.
Commit messages without finding IDs (N3) are bookkeeping, recorded above.

Tickets: this branch filed 2 (707, 708) and closed 2
(`git diff --name-status dev...HEAD -- '.scratch/carry-forward/issues/*.md'`;
the `Status: closed` grep from the skill).

## Disposition (round 2)

| ID  | Axis        | Disposition | Ticket / note                                                                                                                                                                                                     |
| --- | ----------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | Adversarial | fixed       | `cf09ed47`: per-fixture catch (`test-layout.mjs:508-523`); "unmeasured" only with no failure (`:556`); crash handler keeps layout failures (`:602-610`); gate reads failures as FAIL (`check_layout_gate.py:776`) |
| A2  | Adversarial | fixed       | `cf09ed47`: a green `--fixture` run returns 0 without writing the baseline (`check_layout_gate.py:981-990`); a full run still advances it                                                                         |
| Q1  | Standards   | fixed       | `2ebced26`: "recorded" replaced in `smoke.mjs`, `tab_fixtures.mjs`, `test-review.mjs` (also K1, P5)                                                                                                               |
| Q2  | Standards   | fixed       | `7572a254`, `cf09ed47`: the generator names a command; `test-layout.mjs:54-57`, `:312-315` say "hypothesis, untested" (S2)                                                                                        |
| Q3  | Standards   | fixed       | `7572a254`: `FixtureName` union and per-fixture flags on `Spec`; two exhaustive switches remain, as the row allowed (S4)                                                                                          |
| Q4  | Standards   | fixed       | `7572a254`: `PoolSlot` removed, `ItemSlot` imported (S5)                                                                                                                                                          |
| Q5  | Standards   | fixed       | `d263e557`: the Python message is a different, short sentence (S6)                                                                                                                                                |
| Q6  | Standards   | fixed       | `7572a254`, `d263e557`, `2ebced26`: the docstring and README say the compare skips without a fork, the ranged rows are bows, and "(89 rows)" is gone (S7, A3 doc line, D4)                                        |
| Q7  | Standards   | fixed       | `cf09ed47`, `d263e557`, `2ebced26`: long lines wrapped; "carries" and "shape" replaced (S8)                                                                                                                       |
| S2  | Standards   | fixed       | See Q2                                                                                                                                                                                                            |
| S4  | Standards   | fixed       | See Q3                                                                                                                                                                                                            |
| S5  | Standards   | fixed       | See Q4                                                                                                                                                                                                            |
| S6  | Standards   | fixed       | See Q5                                                                                                                                                                                                            |
| S7  | Standards   | fixed       | See Q6                                                                                                                                                                                                            |
| S8  | Standards   | fixed       | See Q7                                                                                                                                                                                                            |
| D4  | Domain      | fixed       | See Q6                                                                                                                                                                                                            |
| P5  | Spec        | fixed       | See Q1                                                                                                                                                                                                            |
| K1  | Spec        | fixed       | See Q1                                                                                                                                                                                                            |
| N3  | Focused     | wontfix     | Bookkeeping: rewording six unpushed commits costs a rebase; the commit-to-finding table in "Focused check (round 2)" records the map                                                                              |
| N1  | Focused     | fixed       | `1d2262d9`: a11y violations are module-level (`test-layout.mjs:94`); the crash handler reports "measured" when a layout check or an a11y audit already failed (`:602-616`); lock advanced in `f77e1bae`           |
| N2  | Focused     | fixed       | `c2e9e13b`: `checkSetRows` rejects a row whose slot holds a piece of its own set (`make-mock-fixtures.ts:903-907`) and checks each future bonus and its breaks (`:930-955`); no fixture changed                   |
| N4  | Focused     | fixed       | `0900056b`: `scripts/check_layout_gate_verdict.py` runs `run()` against a stub harness (A1 and A2 cases); in `verify:steps` as `layout-gate:unit:check`                                                           |
