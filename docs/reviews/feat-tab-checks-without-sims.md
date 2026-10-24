# Pre-merge review — feat/tab-checks-without-sims

Reviewed range: `aa3810d912dfa9739d00d14978124b4e3bbb543b..eb9547d36b317c46a54ef1d4747d85af3bd27e9f`

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
| A4  | Adversarial | defer       | `.scratch/carry-forward/issues/708-frozen-tab-recordings-are-not-checked.md` — nothing checks the moved recordings for `forkDirty`                          |
| A5  | Adversarial | wontfix     | Checked, not a defect: prettier reformat only; JSON content equal to dev in all six; both engine suites pass                                                |
| D1  | Domain      | defer       | `.scratch/carry-forward/issues/707-made-up-set-bonus-rows-are-impossible.md` — break rows from slots with no worn piece                                     |
| D2  | Domain      | defer       | `.scratch/carry-forward/issues/707-made-up-set-bonus-rows-are-impossible.md` — crossing row piece count                                                     |
| D3  | Domain      | defer       | `.scratch/carry-forward/issues/707-made-up-set-bonus-rows-are-impossible.md` — no `stepRanking` or `futureBonuses` popover in the mocks                     |
| D5  | Domain      | wontfix     | The tab renders neither the hit-cap nor the talent field; made-up values are never shown                                                                    |
| S1  | Standards   | wontfix     | Same finding as A2; disposed with A2                                                                                                                        |
| S3  | Standards   | wontfix     | The branch is unpushed, but a rebase of nine commits for a 3-character overrun costs more than it fixes                                                     |
| P1  | Spec        | defer       | `.scratch/carry-forward/issues/708-frozen-tab-recordings-are-not-checked.md` — recorder accepts `--allow-dirty` into the frozen folder                      |
| P2  | Spec        | wontfix     | Reading item names from the fork's wowsims item data follows ADR-0029; a rename fails `tab-fixtures:check` loudly, not silently                             |
| P3  | Spec        | wontfix     | Planned (plan C24); no sim runs; `packages/core/test/fixtures/tab-recordings/README.md:29` says how to update the values                                    |
| P4  | Spec        | wontfix     | Bookkeeping in a stage-gate artifact; the corrected Goal (`brief.md:30-37`) is what the plan and the diff follow                                            |
