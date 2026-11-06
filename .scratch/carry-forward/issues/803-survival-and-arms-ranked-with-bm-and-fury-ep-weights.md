Status: closed
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

## Comments

- 2026-11-06: closed on branch `feat/452-survival-arms`. The tab now picks
  the EP-weight set from the page's talents
  (`player.getTalentTreePoints()`): a hunter whose Survival tree has
  strictly the most points takes `P1_SV_EP_PRESET`, a warrior whose Arms
  tree has strictly the most points takes `P1_ARMS_EP_PRESET`, and every
  other build keeps its spec's set (`ui/features/upgrades/model/data/data.ts`,
  `epWeightsFor` and `epWeightsDisclosureFor`). An Arms - Kebab build
  (Mortal Strike with two one-handers, 33 Arms points) takes the Arms set.
  Arms bundles the P1 set only, as Fury and every other spec bundle one
  set; the assumptions line says when a run ranks a later phase. At fork
  b603564ee `P1_SV_EP_PRESET` has the same numbers as `P1_BM_EP_PRESET`,
  so the Survival change moves no weight today. New files:
  `data/presets/hunter/sv-p1.ep-weights.json`,
  `data/presets/warrior/arms-p1.ep-weights.json` and their fork copies.
- 2026-11-06: after review round 1 of `feat/452-survival-arms`, the Arms
  set is `P3_ARMS_EP_PRESET` (hit weight 1.01, stat 20 in
  `data/presets/warrior/arms-p3.ep-weights.json`), in place of
  `P1_ARMS_EP_PRESET` and `arms-p1.ep-weights.json` above (finding D1).
  The reason "as Fury and every other spec" above was false: ret bundles
  its P2 set. Upstream's own Arms builds for phases 3-5 use the P3 set,
  and the page opens at phase 3. A talents list with no points in the
  Arms or Survival tree now keeps the spec's own set (finding A1). Fork
  `3e72c5033`, main repo `b23c5bef`.

Verified by: tbc-new-fork@786a08f96, test "ranks %s with that build’s own
EP weights" in `ui/features/upgrades/model/run.test.ts`, which failed for
the Survival, Arms and Arms - Kebab builds before the change and passes
after. These passed on the branch:

```bash
pnpm fork-tests:check      # 69 test files passed at fork commit 786a08f96b74
pnpm ep-presets:check      # 22 files match the fork symbols they name
pnpm fork-universes:check  # 22 bundled copies byte-match their data/ sources
```
