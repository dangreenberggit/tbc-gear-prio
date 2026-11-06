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
current pin). Survival hunter and Arms warrior are not among them, so a
Survival page uses the hunter weights and an Arms page the warrior
weights. Those files hold only the default variant:

- `data/presets/hunter/fallback.ep-weights.json:7`: "the SV variant is not
  transcribed (single-axis schema)".
- `data/presets/warrior/fallback.ep-weights.json:7`: "Fury is the default
  variant; the Arms pair is not transcribed (single-axis schema)".

The fork has the weights: `P1_SV_EP_PRESET`
(`ui/specs/hunter/dps/presets.ts:174`) and `P1_ARMS_EP_PRESET`,
`P3_ARMS_EP_PRESET` (`ui/specs/warrior/dps/presets.ts:170`, `:190`).

EP drives the candidate prefilter and the gem fill; every ranking number
comes from the sim (`data.ts:31-37`). So a Survival or Arms run may leave
out candidates and gem the rest for the wrong spec, and the tab shows no
note saying so. How much this moves a ranking: hypothesis, untested. The
notes above were written before the owner put Survival and Arms in scope
(452 Notes, 2026-11-06).

## Done when

A Survival run and an Arms run use their own spec's EP weights, and
`pnpm ep-presets:check` verifies those weights against the fork symbols.
