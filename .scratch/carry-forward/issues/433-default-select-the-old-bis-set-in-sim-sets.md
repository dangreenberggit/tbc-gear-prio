Status: closed
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

## Closed

Closed 2026-09-18 by fork commit `587dcfae6` "Default the Sim sets to the
universe BiS set" (`vendor/tbc-new-fork` `feat/upgrades-tab`), re-pinned into
this repo by "Re-pin fork after the Sim-sets default".

**The rule implemented** (`upgrades_tab.tsx` `defaultGuaranteedSetKeys` +
scope-guarded default in `refreshSetChips`): for the current spec/phase,
pre-select each `presets.gear` entry whose `phase === bisTagPhaseFor(specId,
maxPhase).tagsFromPhase` AND whose every in-pool item id is `bisTags`-tagged
("BiS"), with at least one item in the pool. Both conditions are load-bearing:
the id test alone over-selects the next phase's BiS pair; the phase test alone
admits same-phase non-BiS presets (feral "Alt", ret "Bulwark"). A
`specId:maxPhase` scope guard re-applies the default only when spec or phase
changes, so a user untick survives the gear-change refreshes that also reach
`refreshSetChips`, while a phase/spec change re-resolves.

**Feral P5 decision (C37):** the default follows the *universe* tag, which
degrades to P3 (the pipeline vendors no p4/p5 curated feral set), NOT the fork's
own P5 "BiS" preset (phase 5 != tag phase 3, and 8 of its in-pool items are
untagged). This matches what the old yellow "BiS" badge marked, which also
degraded to P3. The P5 "BiS" chip stays hand-tickable. Routed to owner sign-off.

**Live observables verified** (vite HMR, this executor):
- feral P3 first open: active chips exactly ["P3 - BiS 6%","P3 - BiS 9%"].
- feral phase->2: ["P2 - BiS 6%","P2 - BiS 9%"]; phase->5: the P3 pair, P5 "BiS"
  inactive.
- ret P3/P5: ["P3"] only, "P3 - Bulwark" inactive; ret P2: ["P2"].
- Untick "BiS 9%" then trigger a same-scope refresh -> stays unticked.
- A phase change re-resolves to the new phase's default.

**Desktop gate:** re-run at 587dcfae6 (ret P5, all sources, cap 40) passed
(a)-(h). ret "P3" is already 16/16 in the pool, so the default union is a no-op:
(e) eligibleCount=617=EXPECTED_ELIGIBLE and (h) rows/aboveCutoffItems/baselineDps
all match `golden-ret-p5-cap40.json` -- the C38 no-move case, NO --update-golden.
Layout gate 45/45, locale gate exit 0, `pnpm verify` rc=0.
