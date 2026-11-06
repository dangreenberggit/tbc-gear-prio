Status: open
Type: bug
Origin: .scratch/carry-forward/issues/452-end-ret-feralcat-tunnel-vision-support-all-dps-specs.md (slice A audit of the per-spec checks, 2026-11-06)
Serves: .scratch/carry-forward/issues/452-end-ret-feralcat-tunnel-vision-support-all-dps-specs.md
Blocks: none
Blocked by: none
Related: 452, 799

# Survival and Arms pages gem candidates with Beast Mastery and Fury EP weights

## What is wrong

The tab keys its bundled EP weights by 11 spec ids
(`ui/features/upgrades/model/data/data.ts:39-51` at fork `b603564ee`, the
pin on 2026-11-06). Survival hunter and Arms warrior are not among them,
so a Survival build on the hunter page uses the hunter weights and an Arms
build on the warrior page the warrior weights. Those files hold only the
default variant:

- `data/presets/hunter/fallback.ep-weights.json:7`: "the SV variant is not
  transcribed (single-axis schema)".
- `data/presets/warrior/fallback.ep-weights.json:7`: "Fury is the default
  variant; the Arms pair is not transcribed (single-axis schema)".

Those notes were written before the owner put Survival and Arms in scope
(452 Notes, 2026-11-06).

The fork has the weights: `P1_SV_EP_PRESET`
(`ui/specs/hunter/dps/presets.ts:174`) and `P1_ARMS_EP_PRESET`,
`P3_ARMS_EP_PRESET` (`ui/specs/warrior/dps/presets.ts:170`, `:190`).
`presets.ts` is an upstream wowsims file: read it, do not edit it without
the owner's OK of that exact edit.

EP drives the candidate prefilter and the gem fill; every ranking number
comes from the sim (`data.ts:31-37`). So a Survival or Arms run may leave
out candidates and gem the rest for the wrong spec, and the tab shows no
note saying so. How much this moves a ranking: hypothesis, untested.

## How

Survival and Arms are not separate pages, so the tab must tell them from
Beast Mastery and Fury from the page's state. Find the direct signal the
page already holds (for example its talents) before you design anything;
do not guess from gear. The tab bundles one weight set per spec, and
`EP_WEIGHTS_PHASE_BY_SPEC` (`data.ts:65-77`) records only the phase that
set was written for, for the disclosure. Arms has two sets (P1 and P3);
choose which to bundle, or whether to bundle both by phase, and say why.

The weights live in two places: `data/presets/<spec>/*.ep-weights.json` in
this repo, which `pnpm ep-presets:check` verifies against the fork
symbols, and the fork's bundled copies, which `pnpm fork-universes:check`
keeps equal to them (`scripts/sync_fork_universes.py`,
`docs/fork-provenance/data.md`). The fork change needs a pair and the
two-step re-pin (`docs/agents/paired-worktrees.md` § Re-pin after a fork
change). This ticket is worked in slice B (ticket 799), before its runs.

## Done when

A Survival run and an Arms run use their own spec's EP weights, shown by a
fork test. `pnpm ep-presets:check` and `pnpm fork-universes:check` cover
the new weight files and pass, and the re-pin is on the branch.
