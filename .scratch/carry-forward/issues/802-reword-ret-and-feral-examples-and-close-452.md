Status: open
Type: task
Origin: .scratch/carry-forward/issues/452-end-ret-feralcat-tunnel-vision-support-all-dps-specs.md (slicing, 2026-11-06, slice F)
Serves: .scratch/carry-forward/issues/452-end-ret-feralcat-tunnel-vision-support-all-dps-specs.md
Blocks: none
Blocked by: 799, 800, 746, 801, 803, 804
Related: 452

# Reword docs that name ret and feral as the only examples, then close epic 452

## What to do

1. The epic's bullet 4: "Docs/skills that name 'ret and feralcat' as
   examples reworded to 'the in-scope DPS specs'." The p45 pass counted
   the hits (`docs/live-runs/2026-11-03-p45-dps-pass.md:283-299`). Re-run
   them with a wider pattern and path list:
   `grep -rliE "feralcat|retribution|ret and feral|feral and ret|ret/feral|ret\+feral" scripts docs .claude/skills .claude/agents AGENTS.md CONTEXT.md`.
   Decide for each hit whether it names ret and feral as the only
   examples, and reword those. Leave a hit that states a code fact, such
   as the ret skeleton or the feral skeleton builder. In `scripts/`,
   change only comments and docstrings. Review files, ADRs and dated
   live-run reports are records of their time: leave them unless you
   find and cite a usual practice that says otherwise.
2. A hit in agent instructions (`AGENTS.md`, `CLAUDE.md`, a skill or an
   agent definition) follows the global rule "Changing agent
   instructions": the owner approves the exact text first.
3. Check the epic's bar ("What 'done' looks like" and "What would close
   this" in 452) against `dev`, line by line. The slice A audit (452
   Notes, 2026-11-06) found that the tab no longer reads the universes or
   the sim-effects file. Reading that part of bullet 2 as "what the tab
   uses" is the agents' reading, not an owner ruling: unless the owner
   has ruled on it by then, put it to the owner as a question labelled
   Q-452-bar-universes and leave 452 open. Close 452, with a
   `Verified by:` line, only if every bar line is met and every other
   slice ticket (799, 800, 746, 801, 803, 804) is closed on `dev`.
   Otherwise add a note to 452 that names what is still open.

Run `python scripts/check_merge_ready.py --product-files`: if it prints
nothing, the branch gets `instruction-review`, otherwise
`pre-merge-review` (`docs/workflow.md` § The loop, step 4).

## Done when

The wording is changed where a hit names ret and feral as the only
examples, the branch's review exists, and 452 is either closed with a
`Verified by:` line or has a note naming what is still open.

## Comments

2026-11-06, session F. The step-1 grep printed 60 files at `a094a28b`.
None is in `.claude/agents`, `AGENTS.md` or `CONTEXT.md`. A second grep
for the bare words `ret` and `feral` over agent instructions, `docs/agents`
and the data and harness READMEs found the rest of this list.

- **Reworded (names ret as the only case, and is no longer true):**
  `data/pools/README.md:3` (the CLI's universes exist for every spec, and
  the tab reads none), `scripts/tab-harness/README.md:52` (`run-tab-cdp.mjs`
  runs any spec page with `--page`), and the `UniverseEntry` comment in
  `packages/core/src/pool.ts`.
- **Waits for the owner (agent instructions):** `sme-rank-review`
  `SKILL.md:11,28,56`, in both `.claude/skills/` and `.agents/skills/`,
  asks the reviewer to judge as a ret player. Proposed text: Q-452-sme-skill,
  in `.scratch/handoffs/2026-11-06-452-sme-skill-proposal.md` in session F's
  worktree (gitignored), and in session F's handoff. Line 69 ("e.g. ret ranged slot is a libram") is
  one example among others and stays.
- **Code facts, left:** the gear-set and preset paths in
  `scripts/sync_wowsims.py`, `scripts/check_sync_wowsims.py`,
  `scripts/check_ep_presets.py`, `scripts/build_feral_skeleton.py`,
  `scripts/tab-fixtures/record.mjs`; the page map in
  `scripts/tab-harness/page-coverage.test.mjs:12`; the default page in
  `run-tab-cdp.mjs`, `test-tab-harness.mjs` (`PAGE_PATH`) and
  `scripts/tab-harness/README.md:95`; the ret-only before-run state in
  `test-review.mjs:13` and `scripts/tab-harness/README.md:21`; the
  ret-specific rules in `scripts/assemble_universe.py`,
  `scripts/check_pool_completeness.py:26` and the feral item comments in
  `scripts/generate_sim_implemented_effects.py:120` and
  `scripts/check_sim_implemented_effects_classifier.py:176`;
  `data-pipeline-work` `SKILL.md:62` (one example diff command);
  `.agents/reviews/domain.md:35` (a fact about ret combatants).
- **Rewritten on other chain branches, left here:**
  `data/desktop-gate/README.md`, `docs/agents/upstream-catch-up.md:455`,
  `scripts/check_desktop_tab.py` (C and D) and
  `docs/fork-provenance/engine.md` (D). Editing them here would conflict.
- **Records of their time, left:** `docs/reviews/`, `docs/adr/`,
  `docs/live-runs/`, `docs/verification-log.md`, `docs/stage0-findings.md`,
  `docs/fork-provenance/data.md`, the dated plans under `docs/plans/`
  (each has a pre-implementation `Status:` line or an August date),
  `docs/pipeline-demo.html` (a demo of one ret run), and the ticket titles
  quoted in `docs/upgrades-tab-scope.md:152,164` and the owner's answer at
  `:319`. Session F did not look for a practice that says to edit
  records, so the ticket's default holds.

Step 3 (the bar check) is the 2026-11-06 slice F note on 452.
