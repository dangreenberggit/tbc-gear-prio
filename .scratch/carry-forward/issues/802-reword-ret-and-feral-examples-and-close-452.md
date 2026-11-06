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
