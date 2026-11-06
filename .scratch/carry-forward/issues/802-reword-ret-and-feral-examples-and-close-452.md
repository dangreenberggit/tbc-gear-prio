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
   the hits (`docs/live-runs/2026-11-03-p45-dps-pass.md:283-299`):
   `grep -rliE "feralcat|retribution|/druid/feral|/paladin/retribution" scripts/`
   gave 14 files and `grep -rliE "ret and feral|feralcat" docs .claude/skills AGENTS.md`
   gave 20. Re-run both, then decide for each hit whether it names ret and
   feral as the only examples. Reword those. Leave a hit that states a
   code fact, such as the ret skeleton or the feral skeleton builder.
   Review files, ADRs and dated live-run reports are records of their
   time; find and cite the usual practice before changing one.
2. A hit in agent instructions (`AGENTS.md`, `CLAUDE.md`, a skill or an
   agent definition) follows the global rule "Changing agent
   instructions": the owner approves the exact text first.
3. Check the epic's bar ("What 'done' looks like" and "What would close
   this" in 452) against `dev`. Close 452 if every slice ticket and every
   gap ticket from the 2026-11-06 audit is closed on `dev`. Otherwise add
   a note to 452 that names what is still open.

## Done when

The wording is changed where a hit names ret and feral as the only
examples, the branch's review exists, and 452 is either closed with a
`Verified by:` line or has a note naming what is still open.
