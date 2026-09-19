Status: open
Type: bug
Origin: owner review of the built tab-ui-refinements batch, 2026-09-18
Blocks: none
Blocked by: none
Related: 424 (added the Sim-sets control), 430 (unified tag = set membership), the old universe "BiS" tag

# "Sim sets" starts empty; the old "BiS" set must be selected by default

Owner report on the built batch. The new "Sim sets" control (`guaranteedSetKeys`
initialised to an empty `Set`, `upgrades_tab.tsx:470`) starts with NOTHING
selected. Before this work the tab effectively had the universe "BiS" set active
by default (that is what the yellow "BiS" tag marked). The owner wants that
restored: **on load, the set(s) the old "BiS" tag corresponds to for the current
phase are pre-selected in the Sim-sets control** — the default is not empty.

Owner's framing (verbatim intent): the old "BiS" tag already told you which set
this is; an agent looking at the code should identify it rather than ask. The
planner owns that investigation.

## What the planner must resolve from the code (do not ask the owner)

Identify exactly which `guaranteedSetsAvailable()` entries the old universe "BiS"
tag maps to, per phase, and pre-select them. Investigate and confirm against
source; the following is prior-investigation CONTEXT to verify, not gospel:

- `bisTags` is the literal string "BiS" (`assemble_universe.py` ~2743), not a
  preset name; the contributing labels live in `bisSets` as phase tokens
  (`p3_6p`/`p3_9p`), and the phase scoping is `bis_set_labels_for_max_phase`
  (~1398-1436): the highest vendored phase <= max_phase.
- For feral, "BiS" is an AGGREGATE of two presets per phase — the 6pc and 9pc
  BiS gear files (`feral_p3_6p.gear.json` + `feral_p3_9p.gear.json`), which are
  the `presets.ts` entries named "BiS 6%" and "BiS 9%" (`ui/druid/feralcat/presets.ts:61-62`).
  So feral P3 default = BOTH "BiS 6%" and "BiS 9%".
- For unsplit specs (e.g. ret) it is a single BiS preset per phase.
- Per-phase: yes — re-resolve when the phase selector changes (mirror
  `refreshSetChips`, already called per phase).
- Edge case to flag/handle: feral P5 has a fork preset ("BiS", `presets.ts:69`)
  but the Python pipeline's `gear_sets` list may stop at p3, so the universe BiS
  tag degrades to p3 there (`bisTagProvenance.tagsFromPhase` "degraded"). The
  planner decides whether the default follows the fork preset or the degraded
  universe tag, and states which.

The planner must re-read these and state the final rule ("for phase N, pre-select
the presets.gear entries where ...") with file:line, resolved for at least feral
(split) and one unsplit spec.

## What would close this

- On tab load (and on phase change), the Sim-sets control has the current-phase
  BiS set(s) pre-selected, matching what the old "BiS" tag covered — verified
  live: feral P3 shows "BiS 6%" and "BiS 9%" active by default; a run's rows in
  those sets carry their tags without the user ticking anything.
- The user can still deselect them (it is a default, not a lock).
- Because this changes the DEFAULT candidate pool (items auto-guaranteed in),
  the desktop gate must be re-checked; if golden (h) legitimately moves because
  the default pool changed, that is an expected `--update-golden` with the diff
  explained — NOT the UI-only no-move of 427-431. The planner states the
  expectation and the executor confirms.

## Where

`vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades_tab.tsx`
(`guaranteedSetKeys` init at 470, `guaranteedSetsAvailable()` ~1780,
`refreshSetChips` ~1852, and the phase-change path), and the `presets.ts` /
`assemble_universe.py` mapping the planner resolves.

## Notes

New requirement from the owner's review of the tab-ui-refinements batch; folded
INTO that batch per the owner (a new planner/executor step before its
pre-merge-review), because it belongs with 424/430 and the tab should reach dev
complete in one merge. This is the one item in the batch that can legitimately
move the desktop golden (it changes default pool composition), unlike the
pure-presentation 427-431.
