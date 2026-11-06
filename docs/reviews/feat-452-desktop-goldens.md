# Pre-merge review — feat/452-desktop-goldens

Reviewed range: `c229d1299ce6e094021345372ab7959d618a07ca..560acb56da538fda27722e8437d7640fd4c47a52`
Reviewed range: `560acb56da538fda27722e8437d7640fd4c47a52..31e90cad794648549d3db5956e8201c8177ebb5c`

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

## Summary

Round 2 is the last round (`~/.claude/AGENTS.md` § Review round limits)
and it reported findings that are not bookkeeping (R1, a missing test;
J4 and J6, ticket scope), so the review stops here for the owner's
choice. No Disposition table yet; step 4 (merge check) not run. A3 (the
untracked dotfiles) is not a defect: they are the sandbox's `/dev/null`
masks (character devices). Ticket 821 filed by this review; 820 filed by
the branch.
