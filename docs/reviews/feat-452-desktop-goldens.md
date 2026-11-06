# Pre-merge review — feat/452-desktop-goldens

Reviewed range: `c229d1299ce6e094021345372ab7959d618a07ca..560acb56da538fda27722e8437d7640fd4c47a52`
Reviewed range: `560acb56da538fda27722e8437d7640fd4c47a52..31e90cad794648549d3db5956e8201c8177ebb5c`
Reviewed range: `31e90cad794648549d3db5956e8201c8177ebb5c..36e7e96c499961c9a26af98067200db6cdc8fbe2`
Reviewed range: `36e7e96c499961c9a26af98067200db6cdc8fbe2..96d40d2c025bb4c8e3917f95ae188056181c02d7`

Dispatch note (round 1): the branch stacks on `chore/452-slice-tickets`
(head `c229d129`, reviewed there by `instruction-review`), so round 1
diffs from `c229d129`, not from the `dev` merge base. `python
scripts/check_merge_ready.py --product-files` printed `PLAN.md`,
`data/desktop-gate/README.md`, the three new
`data/desktop-gate/golden-{enh,mage,rogue}-p4-cap40.json`,
`scripts/check_desktop_tab.py` and `scripts/check_desktop_tab_verdict.py`
(rc 0); the three axes read those files. The other changed files
(`docs/agents/upstream-catch-up.md`, tickets 800 and 820, `NEXT`) go to
`instruction-review`. Not a small change: the diff touches `data/`
(`git diff --shortstat`: 11 files, 1421 insertions, 101 deletions).
`codex` is not on PATH; the axes run as fresh `general-task` agents on
Opus. The domain axis runs: the diff picks specs, a "hybrid" definition
and per-spec pool counts.

## Adversarial

No silent pass found: with no `--spec`, a failed, skipped or golden-less
spec fails the command (`overall_rc`, `table_problems`); the mage 516
(610 - 31 - 63) and the fixture sizes recount correctly.

- **A1** `PLAN.md:921`: the ticked "web run completes on the DPS-spec
  fixtures" box now names mage, rogue and enh; only a ret WASM readback
  exists (`docs/verification-log.md:2626-2638`). A claim of a run that
  did not happen.
- **A2** `scripts/check_desktop_tab.py:371-376`, `:747`: a harness crash
  on one spec raises `SystemExit(2)` out of the per-spec loop; later
  specs are never checked and print no verdict. Loud failure.
- **A3** untracked dotfiles in the worktree root (`.bashrc`, `.gitconfig`,
  `.mcp.json`, `.claude/commands`, ...).

## Domain

The goldens match the game data and fork code: rebuilding the candidate
order from `dbPoolFor` and `epWeightsFor` predicts each golden's rows and
the capped counts 38, 33, 40 exactly; start presets equal the p45 table
(`docs/live-runs/2026-11-03-p45-dps-pass.md:89,97,101`); the spec choice
and hybrid definition hold.

- **D1** ticket 820 names the smaller cause. Pricing two-handers against
  both worn hands still leaves 39 weapons in the first 40; the main cause
  is that `epScore` (`stats.ts:29-42`) ignores weapon damage. Closing 820
  on its first option leaves the defect.
- **D2** `data/desktop-gate/README.md:34` cites
  `data/presets/enh/p3.ep-weights.json`; the tab reads
  `enh-fallback.ep-weights.json` (fork `model/data/data.ts:18,48`).
- **D3** `scripts/check_desktop_tab.py:208` "17 worn": the enh preset wears
  32262 twice, so 16 distinct worn ids, which is what the cap counts.

## Standards + Spec

`code-review` skill, two Opus subagents; `check_desktop_tab_verdict.py`
rc 0.

- **S1 = P5** same as A2; also the `check_spec` docstring promises a
  return of 2 the function never gives for this case.
- **S2 = P4** `scripts/check_desktop_tab_verdict.py:114,116`:
  `harness_problems()` raises `KeyError` for a spec with no `SPEC_PAGE`
  before `table_problems()`'s message prints. Loud failure.
- **S3 = P1** `data/desktop-gate/golden-ret-p4-cap40.json:2` `_note` gives
  `--update-golden` with no `--spec`, which now rewrites all four goldens.
- **S4 = P3** same as A1.
- **P2** the enh golden `_note` calls the run "known-good" while ticket
  820 says the capped enh ranking is wrong (40 main-hand losses).
- **S5** README repeats the script's pinned numbers with no check tying
  them. Code quality.
- **S6** five per-spec dicts with the same keys (`check_desktop_tab.py:118-212`).
  Code quality.
- **S7** `('PASS','FAIL','COULD NOT RUN')[r]` written twice
  (`:845,:847`). Code quality.
- **S8** `check_spec`'s `full` parameter repeats `candidates == 0`
  (`:743`). Code quality.
- **S9** no unit case reaches `check_spec`'s new branches (refusal,
  `--full` skip, (a)-(f) fail, golden 2); no seam for `run_harness`.
  Missing test.
- **S10** README:86-88 "most of them two-handers" is unsourced; the script
  comment says the worn items were not listed. Code quality.

## Instruction review (agent tooling)

Full path, on `docs/agents/upstream-catch-up.md`, tickets 800 and 820,
`NEXT`. Three cold readers.

- **I0 (blocking)** no trial run of the new § 5 text.
- **I1** § 5 says "enhancement"; the id is `enh` (`--spec enhancement`
  exits 2). The spec list repeats the README.
- **I2** § 5 does not say to re-run the whole command after a golden is
  regenerated and paste that run's lines.
- **I3** § 5 "changes" where the README says "meant to change".
- **I4** 820 names only the fork `candidate-order.ts`; its twin is
  `packages/core/src/candidate-order.ts` (ported file steps,
  `docs/agents/known-traps.md:107-131`).
- **I5** 820 does not say to re-measure `CAPPED_ROWS["enh"]` before the
  golden rewrite (the write refuses while (e) fails).
- **I6** 820 files the weapon-DPS defect only conditionally; `epScore`
  never sees weapon DPS for any melee spec, so it needs its own ticket now.
- **I7-I9** 820 wording: "a capped run ... is" has no predicate; "no armour
  is priced" (worn items are simmed, only the list omits them); the
  re-run command needs `pnpm desktop-gate:check --spec enh`, not
  `--no-build` in a fresh pair.
- **I10** 800 (and README:87-89) say enh checks dual-wield weapon swaps;
  all 40 enh rows are main hand; rogue's golden has the off-hand rows.
- **I11** 800:139 "derived before any run": the 2026-11-03 table already
  published 516, 826, 1039; say both.
- **I12** 800:107 balance "the same hold-out": balance holds out 104 (841
  vs 737), not mage's 94.
- **I13** 800:143-144 names no path for the `PLAYWRIGHT_BROWSERS_PATH`
  shim.
- **I14** 800:60 points at README:67-79, which moved (also ticket 746:53).
- **I15** § 5's "paste into the commit body or the stage's
  `desktop-gate.md`": four specs' lines are about 28; say what to paste
  when there is no stage.

## Code quality

| ID  | Row                                  | Fix                                                                                                    |
| --- | ------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| S5  | README copies the script's numbers   | `497397b1`: the README points to `GATED`                                                               |
| S6  | five per-spec dicts                  | `497397b1`: one `GatedRun` record per spec in `GATED`; `31e90cad` renames the stale (e) labels         |
| S7  | verdict words written twice          | `497397b1`: `VERDICT_WORDS`                                                                            |
| S8  | `full` repeats `candidates == 0`     | `497397b1`: parameter removed                                                                          |
| S10 | "most of them two-handers" unsourced | `497397b1`: the claim is gone from the README; the script comment counts 33 of 40 (db.json `handType`) |

## Fix commits (round 1 → round 2)

`594375fa` (A2/S1/P5, S2/P4, S9, S3/P1/P2, D3), `eb09c16d` (A1/S4/P3,
D2, I10, I1-I3, I15, I13, P2), `63b25c4b` (D1, I4-I9, I6 → ticket 821,
I10-I14), `497397b1` (code-quality pass, I10 script comment), `7a204875`
(ticket 800 wording only), `31e90cad` (A2: an unparseable readback gives
that spec "could not run"; S6: (e) labels). The fix agents ran
`check_desktop_tab_verdict.py` (17 cases, rc 0) and the whole gate
(`PASS (ret, mage, rogue, enh)`, rc 0, logs
`.scratch/agent-reports/800-runs/check-all-3-review-fixes.log` and
`.scratch/agent-reports/2026-11-06-800-code-quality-gate.log`, gitignored).
`31e90cad` came after the last gate run; `check_desktop_tab_verdict.py`
passed on it (rc 0).

## Focused check (round 2)

No other repo: the branch does not move the fork pin
(`git diff --quiet c229d129...HEAD -- data/wowsims-fork.lock.json`, rc 0).
One fresh `general-task` agent on Opus.

1. Conditions hold: **pass** (every commit names its finding IDs, is the
   code-quality pass, or edits tickets only; every changed code line is at
   a cited place).
2. Fixes change only what each finding asks: **pass**, with R2. The
   `GATED` refactor keeps every spec's page, preset, counts and row pin;
   its one behaviour change is the stated one (`--candidates 0` without
   `--full` skips (h)). The goldens' `rows`, `aboveCutoffItems` and
   `baselineDps` are byte-identical to `560acb56` (`jq` sha1, all four).
3. New tests assert their findings: **pass with a gap** (R1). Five
   reverts in a copy each made the verdict script fail; three reverts in
   `run_harness` did not.
4. Touched tests pass: **pass** (`check_desktop_tab_verdict.py`: 17 cases,
   rc 0). The desktop gate was not re-run on `31e90cad`; both gate logs
   (all four specs PASS, rc 0) predate it.

Findings:

- **R1** `scripts/check_desktop_tab.py:392-408`: the `run_harness` half of
  A2 (each failure raised as `HarnessFailed`, including the JSON parse
  catch from `31e90cad`) has no test; reverting any of three raises to
  `SystemExit(2)` leaves the verdict script green. Missing test.
- **R2** `PLAN.md:921` points at a capped-row column of the README table
  that the S5 fix removed; the value 40 is still inline. Wrong pointer.

## Instruction review (round 2, fix path)

All of I1-I15 fixed. **I0 partly:** a paper trial ran (two fresh Opus
readers, old § 5 at `c229d129` against new § 5 at `31e90cad`, scenario: a
re-pin meant to move only enh). Only the new-text reader regenerated just
the enh golden with `--spec enh --update-golden`, re-ran the whole
command and recorded that green run's lines: **pass**. No live trial ran.

New findings:

- **J1** (minor) `upstream-catch-up.md:445-446` "a red gate blocks the
  re-pin" reads against the README's permission to regenerate.
- **J2** (should fix) README:133-138: the regenerate steps commit the
  golden before the green re-run whose lines that commit should hold.
- **J3** (should fix) README § Regenerating a golden does not say what to
  do when an intended change moves a spec's pinned counts ((e) fails, the
  write refuses); tickets 820 and 821 each carry their own copy.
- **J4** (should fix) ticket 820:57-59 limits the fix to dual-wield specs;
  `clearOffHandForTwoHander` (fork `rank.ts:4154-4185`) clears the off
  hand for every spec.
- **J5** (minor) 820:67-72 names only the enh golden; rogue's can move too.
- **J6** (should fix) ticket 821:51-54 does not say what the core twin
  gets; `data/items/index.json` has no weapon damage.
- **J7** (minor) 820:23-24 "builds the pair first": `build()` only runs
  `make wowsimtbc`.
- **J8** (minor) 820 and 821 Done-when: update README § Known defects.
- **J9** (minor) ticket 800:137,151 name the old table names; its
  Done-when and status line disagree on whether the README states numbers.

## Round 3 (owner-chosen further round, 2026-11-06)

The owner chose a fix round after round 2 ("Then launch a session to focus on them and fix them"). Session D oversaw it from its own worktree, because the sandbox cannot write to C's: fix commits `6512a6fe` (R1), `5e24572d` (R2, J2, J3) and `36e7e96c` (J1, J3-J9) sit on `a87d82cf` on `feat/452-meta-repair-hit-cap`. Round 3 is a last round (`~/.claude/AGENTS.md` § Review round limits).

## Focused check (round 3)

Range `a87d82cf8cad80fb0a3910e807ca62fa29640b12..36e7e96c499961c9a26af98067200db6cdc8fbe2`
(`6512a6fe` R1, `5e24572d` R2 J2 J3, `36e7e96c` J1 J3-J9), read in session
D's worktree. No other repo: the range does not move the fork pin
(`git diff --quiet a87d82cf..36e7e96c -- data/wowsims-fork.lock.json`, rc 0).
One fresh `general-task` agent on Opus, scoped to the product files
`scripts/check_desktop_tab_verdict.py`, `PLAN.md` and
`data/desktop-gate/README.md`; a separate agent reads
`docs/agents/upstream-catch-up.md` and the tickets (all of `36e7e96c`).

1. Conditions hold and each finding is fixed: **pass**. `6512a6fe`
   touches only the verdict script (a test), `5e24572d` only `PLAN.md`
   and the README (docs); each commit names its finding IDs
   (`git show --stat`). R1: `run_harness_problems()` runs the real
   `run_harness` with a stub `subprocess` over five cases (unknown spec,
   harness rc 3, rc 0 with no JSON and a stale file, rc 0 with JSON that
   does not parse, rc 0 with valid JSON). R2: `PLAN.md:921` now points at
   `capped_rows[40]` of `GATED[("ret", 4)]` in `scripts/check_desktop_tab.py`,
   which is `{40: 40}` (`check_desktop_tab.py:197`). J2: README steps now
   re-run the whole command (step 2) before the commit that records that
   run's lines (step 3). J3 (README half): step 1 says what to do when (e)
   refuses the write on a count the change is meant to move.
2. Fixes change only what each finding asks: **pass**. The test adds only
   `run_harness_problems()`, its two imports and its count in `main()`.
   The PLAN change is the one pointer; the value 40 is kept. The README
   change is the step reorder (J2) and the new paragraph plus "the `GATED`
   change if step 1 needed one" in step 3 (J3). The README's facts match
   the code: (e)'s line prints `rowCount` (`check_desktop_tab.py:767`), and
   the comment above `GATED` says how `expected_eligible` and `pool_cap`
   are derived (`check_desktop_tab.py:145-164`).
3. The new test asserts its finding: **pass**. In a copy under `$TMPDIR`
   (`git archive 36e7e96c` of the two scripts and `data/desktop-gate`),
   each of the four `raise HarnessFailed(` in `run_harness`
   (`check_desktop_tab.py:392, 401, 404, 408`), changed one at a time to
   `raise SystemExit(2)`, made the verdict script exit 1 with one FAIL
   line, on that raise's own case. Removing the `unlink`
   (`check_desktop_tab.py:398`) made the stale-file case fail (it returned
   the stale `{'rowCount': 1}`), rc 1. Unchanged copy: rc 0. This matches
   the run recorded in `6512a6fe`'s message.
4. Touched tests pass: **pass**. `python3 scripts/check_desktop_tab_verdict.py; echo rc=$?`
   on `36e7e96c` → `check_desktop_tab_verdict.py ok (22 verdict cases, 4
gated specs)`, rc 0 (17 cases before plus 5). Python 3.10.12. The
   desktop gate was not run (session D runs it next).

Findings: none in the product files.

Bookkeeping note (no finding): round 2's through-sha is `31e90cad`. The one
commit between it and this range's start, `a87d82cf`, adds only
`docs/reviews/feat-452-desktop-goldens.md` (`git diff --stat
31e90cad..a87d82cf`). So the `Reviewed range:` line for this round can read
`31e90cad794648549d3db5956e8201c8177ebb5c..36e7e96c499961c9a26af98067200db6cdc8fbe2`,
which keeps the chain unbroken.

## Instruction review (round 3, fix path)

Scope: fix commit `36e7e96c` (range `5e24572d..36e7e96c`) to
`docs/agents/upstream-catch-up.md` and tickets 800, 820 and 821 under
`.scratch/carry-forward/issues/`. Checked against
`data/desktop-gate/README.md` as of `5e24572d` and against the code each
changed sentence cites. J2 and the README half of J3 are product files and
were reviewed separately.

**All of J1 and J3-J9 are fixed.** Each fix changes only what its finding
asked. Two cold readers (Opus, fresh context) read the changed text: one as
the catch-up agent with `enh` and `rogue` red after a re-pin meant to move
only enh, and one as the planner of tickets 820 and 821. Both did what the
fixes intend.

- **J1 fixed.** `upstream-catch-up.md:450-453`. The cold reader held the
  re-pin, regenerated only enh's golden through README § Regenerating a
  golden, treated rogue as a defect, re-ran the whole gate and committed
  the green run's lines. The new text agrees with README:91-92 ("A red gate
  is a finding, not a prompt to regenerate") and README:129-131
  (regenerating is legitimate only when a change is meant to move that
  spec).
- **J3 (ticket half) fixed.** Tickets 820:72-75 and 821:64-67 no longer copy
  the moved-count rule. They point at README § Regenerating a golden, whose
  step 1 covers a refused write (README:136-143 at `5e24572d`). The planner
  reader followed that step for a refused write.
- **J4 fixed.** 820:61-64 now says "for any spec whose worn off hand is
  filled". 820:50-53 cites `clearOffHandForTwoHander` at
  `model/engine/rank.ts:4154-4183`. Checked at fork `b603564ee`: the
  function starts at 4154 and ends at 4183. It tests only the slot index,
  the hand type and whether the off hand is filled, and has no spec
  parameter. `simSlotsForPoolSlot` (`pool.ts:300-327`) gives a two-hander
  `["mainhand"]` for every spec.
- **J5 fixed.** 820:72-74 now says to re-record every gated golden that
  moves, with rogue named.
- **J6 fixed.** 821:56-62. The fact checks out:
  `python3 -I -c "import json; d=json.load(open('data/items/index.json')); print(sorted(set().union(*(i.keys() for i in d.values()))))"`
  prints 15 keys for 8249 items, with no weapon-damage key.
  `docs/fork-provenance/engine.md` has the provenance table and already
  holds "adapted" rows (for example `cap-profile.ts` "fork-only"), so option
  (b) follows existing practice.
- **J7 fixed, but the new clause is wrong** (see K1). The first half is
  right: `build()` (`scripts/check_desktop_tab.py:304-311`) runs only
  `make -C vendor/tbc-new-fork wowsimtbc`.
- **J8 fixed.** 820:74-75 and 821:66-67 add "update or remove the `enh`
  entry" in README § Known defects of a golden. That section exists at
  README:109-118 and holds an `enh` entry.
- **J9 fixed.** 800:137 and 800:151 use the `GATED` field names, which match
  `GatedRun` (`check_desktop_tab.py:120-132`). The status at 800:167-169 says
  how it meets the Done-when sentence at 800:93. That Done-when sentence is
  unchanged.

New findings:

- **K1** (minor) `820:23-25` "which rebuilds the desktop binary (`make
wowsimtbc`) first; the pair's `dist/` must already be built". The second
  half is false. In the fork's `makefile` at `b603564ee`, `wowsimtbc:
binary_dist devserver` (:139) and `binary_dist: $(OUT_DIR)/.dirstamp`
  (:124) make `make wowsimtbc` build `dist/tbc` itself, including the
  bundle (`npx vite build`, :24-36) and `lib.wasm.gz` (:97). How it goes
  wrong: an agent that re-runs the enh case first runs a separate `dist/`
  build that is not needed. Cost: a few minutes of duplicate build, and a
  false fact in a ticket. Fix: delete the build clause and end the sentence
  at "re-run it with `pnpm desktop-gate:check --spec enh`." The build is the
  gate's own business.
- **K2** (minor) `821:57-58` "the union of its items' keys, read with python
  on 2026-11-06". This names no command a reader can re-run
  (`~/.claude/AGENTS.md` § Sources on important claims). The planner reader
  flagged it. Fix: replace the parenthetical with the one-line command given
  under J6 above.
- **K3** (minor) `800:168-169` "the README states none, so none can differ".
  README:57-74 states ret's earlier pin values (917, 1178, 1121, 39), which
  are labelled as history. How it goes wrong: a reader who checks the claim
  finds numbers in the README and has to work out that they are history.
  Cost: low. Fix: "the README states none of the current counts".

K1-K3 are wording only (they change no step, rule or code), so under § Review round limits they were fixed in the same commit (`96d40d2c`) and get one further check; the cold readers' notes stay in the gitignored report `.scratch/agent-reports/2026-11-06-general-task-452c-round3-instruction.md` in D's worktree.

## Further check of `96d40d2c` (K1-K3 wording)

One further check of `96d40d2c`, allowed by § Review round limits for
wording-only findings, found three wording findings. All three are fixed in
the commit that adds this section (subject `Close the 800 review: N1-N3 and
Disposition`). No further review round runs.

- **N1** (should fix) `821:57-60`: the inline python command wrapped inside
  the string after `import`, so pasting the raw text failed with a
  SyntaxError. Fixed: the command is on one line in its own fenced code
  block; the claim (8249 items, 15 keys on 2026-11-06, none of them weapon
  damage) is kept.
- **N2** (minor) the old `## Summary` said round 2 ends the review. Fixed:
  the Summary below is rewritten.
- **N3** (minor) the K1-K3 paragraph above said "fixed in the next commit".
  Fixed: "fixed in the same commit (`96d40d2c`)".

## Summary

The review ends here. Round 2 stopped at the round limit; the owner chose
round 3 as a further last round. Round 3 closed R1, R2 and J1-J9. Its
wording findings K1-K3 were fixed in `96d40d2c`, and the one further check
of that commit found N1-N3, fixed in the commit that adds the Disposition
table below. No review round runs after that check.

Not run on the fix commits:

- The desktop gate (`pnpm desktop-gate:check`). Its last run (all four specs
  PASS, rc 0) predates `31e90cad` and every later commit. Session D runs it
  next, as K1 step 1 of its stage
  (`.scratch/stage-gate/452d-meta-repair-hit-cap/plan.md`).
- The merge check (`pnpm merge-to-dev --check-only`) and the whole
  `pnpm verify`. Neither can run in this sandbox; they are owner steps.

A3 (the untracked dotfiles) is not a defect: they are the sandbox's
`/dev/null` masks (character devices). Ticket 821 was filed by this review;
820 was filed by the branch.

## Disposition (round 3)

| ID  | Axis               | Disposition | Ticket / note                                                                                                                                                                             |
| --- | ------------------ | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | Adversarial        | fixed       | `eb09c16d`: the `PLAN.md` box claims the ret WASM run only                                                                                                                                |
| A2  | Adversarial        | fixed       | `594375fa`: a harness failure gives that spec "could not run" and the loop goes on; `31e90cad`: the same for an unparseable readback; `6512a6fe` tests `run_harness` (R1)                 |
| A3  | Adversarial        | wontfix     | not a defect: the untracked dotfiles are the sandbox's `/dev/null` masks (character devices, `stat -c %F`); none is committed                                                             |
| D1  | Domain             | defer       | `.scratch/carry-forward/issues/821-ep-order-ignores-weapon-damage.md` — `63b25c4b` rewrote ticket 820 to name the main cause and filed 821 for it                                         |
| D2  | Domain             | fixed       | `eb09c16d`: the README cites the enh weights the tab reads                                                                                                                                |
| D3  | Domain             | fixed       | `594375fa`: the script says enh wears 16 distinct ids                                                                                                                                     |
| S1  | Standards          | fixed       | same fix as A2 (`594375fa`, `31e90cad`)                                                                                                                                                   |
| S2  | Standards          | fixed       | `594375fa`: `harness_problems` skips a spec with no `SPEC_PAGE`                                                                                                                           |
| S3  | Standards          | fixed       | `594375fa`: the golden `_note` names `--spec`                                                                                                                                             |
| S4  | Standards          | fixed       | same fix as A1 (`eb09c16d`)                                                                                                                                                               |
| S5  | Standards          | fixed       | `497397b1`: the README points to `GATED`                                                                                                                                                  |
| S6  | Standards          | fixed       | `497397b1`: one `GatedRun` record per spec in `GATED`; `31e90cad` renames the stale (e) labels                                                                                            |
| S7  | Standards          | fixed       | `497397b1`: `VERDICT_WORDS`                                                                                                                                                               |
| S8  | Standards          | fixed       | `497397b1`: the `full` parameter removed                                                                                                                                                  |
| S9  | Standards          | fixed       | `594375fa`: `check_spec` takes a stand-in harness; verdict cases cover its branches                                                                                                       |
| S10 | Standards          | fixed       | `497397b1`: the claim is gone from the README; the script comment counts 33 of 40                                                                                                         |
| P1  | Spec               | fixed       | same fix as S3 (`594375fa`)                                                                                                                                                               |
| P2  | Spec               | fixed       | `594375fa`: no "known-good" in the golden notes; `eb09c16d`: none in the README, and enh's defect is listed there                                                                         |
| P3  | Spec               | fixed       | same fix as A1 (`eb09c16d`)                                                                                                                                                               |
| P4  | Spec               | fixed       | same fix as S2 (`594375fa`)                                                                                                                                                               |
| P5  | Spec               | fixed       | same fix as A2 (`594375fa`, `31e90cad`)                                                                                                                                                   |
| I0  | Instruction        | wontfix     | a paper trial ran in round 2 (two fresh Opus readers, pass) and round 3's cold reader re-ran the catch-up case; a live trial needs a re-pin that moves a golden, and this branch has none |
| I1  | Instruction        | fixed       | `eb09c16d`: `upstream-catch-up.md` points at the README, which holds the steps                                                                                                            |
| I2  | Instruction        | fixed       | `eb09c16d` (same change as I1)                                                                                                                                                            |
| I3  | Instruction        | fixed       | `eb09c16d` (same change as I1)                                                                                                                                                            |
| I4  | Instruction        | fixed       | `63b25c4b`: ticket 820 names the ported-file twin                                                                                                                                         |
| I5  | Instruction        | fixed       | `63b25c4b`: ticket 820 says to re-measure `CAPPED_ROWS["enh"]`                                                                                                                            |
| I6  | Instruction        | defer       | `.scratch/carry-forward/issues/821-ep-order-ignores-weapon-damage.md` — filed in `63b25c4b`                                                                                               |
| I7  | Instruction        | fixed       | `63b25c4b`: ticket 820 wording                                                                                                                                                            |
| I8  | Instruction        | fixed       | `63b25c4b`: ticket 820 wording                                                                                                                                                            |
| I9  | Instruction        | fixed       | `63b25c4b`: ticket 820 wording                                                                                                                                                            |
| I10 | Instruction        | fixed       | `eb09c16d` (README), `63b25c4b` (ticket 800), `497397b1` (script comment): enh holds main-hand rows only                                                                                  |
| I11 | Instruction        | fixed       | `63b25c4b`: ticket 800 wording                                                                                                                                                            |
| I12 | Instruction        | fixed       | `63b25c4b`: ticket 800 wording                                                                                                                                                            |
| I13 | Instruction        | fixed       | `eb09c16d`, `63b25c4b`: the sandbox browser path                                                                                                                                          |
| I14 | Instruction        | fixed       | `63b25c4b`: ticket 800 and ticket 746 pointers                                                                                                                                            |
| I15 | Instruction        | fixed       | `eb09c16d` (same change as I1)                                                                                                                                                            |
| R1  | Focused (round 2)  | fixed       | `6512a6fe`: `run_harness_problems()` covers each raise in `run_harness`                                                                                                                   |
| R2  | Focused (round 2)  | fixed       | `5e24572d`: `PLAN.md:921` points at `GATED[("ret", 4)]`                                                                                                                                   |
| J1  | Instruction (r2)   | fixed       | `36e7e96c`: `upstream-catch-up.md` agrees with the README                                                                                                                                 |
| J2  | Instruction (r2)   | fixed       | `5e24572d`: the README re-runs the whole command before the commit                                                                                                                        |
| J3  | Instruction (r2)   | fixed       | `5e24572d` (README step 1), `36e7e96c` (tickets 820 and 821 point at it)                                                                                                                  |
| J4  | Instruction (r2)   | fixed       | `36e7e96c`: ticket 820 covers every spec whose off hand is filled                                                                                                                         |
| J5  | Instruction (r2)   | fixed       | `36e7e96c`: ticket 820 re-records every golden that moves                                                                                                                                 |
| J6  | Instruction (r2)   | fixed       | `36e7e96c`: ticket 821 says what the core twins get                                                                                                                                       |
| J7  | Instruction (r2)   | fixed       | `36e7e96c`; its wrong added clause was K1, fixed in `96d40d2c`                                                                                                                            |
| J8  | Instruction (r2)   | fixed       | `36e7e96c`: tickets 820 and 821 update README § Known defects                                                                                                                             |
| J9  | Instruction (r2)   | fixed       | `36e7e96c`: ticket 800 uses the `GATED` field names                                                                                                                                       |
| K1  | Instruction (r3)   | fixed       | `96d40d2c`: the build clause is gone from ticket 820                                                                                                                                      |
| K2  | Instruction (r3)   | fixed       | `96d40d2c`: ticket 821 gives the command                                                                                                                                                  |
| K3  | Instruction (r3)   | fixed       | `96d40d2c`: ticket 800 says "none of the current counts"                                                                                                                                  |
| N1  | Further check (r3) | fixed       | the commit that adds this table: the command is on one line in its own code block                                                                                                         |
| N2  | Further check (r3) | fixed       | the commit that adds this table: the Summary is rewritten                                                                                                                                 |
| N3  | Further check (r3) | fixed       | the commit that adds this table: "fixed in the same commit"                                                                                                                               |
