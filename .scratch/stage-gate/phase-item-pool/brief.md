# Brief — phase-aware candidate pool for the Upgrades tab

Opened 2026-08-23 by the orchestrating session. Base SHA
`8c4b1867cdcfbb3b668eff3edebcfd40c823a0f7` (`dev`, just after the
`feat/finish-the-tab` merge), branch `feat/phase-item-pool` off `dev`.

Read first: `.scratch/handoffs/wowsims-tab/STATUS-2026-08-23.md` (where the tab
stands, the owner's rulings, tranche 2), then
`.scratch/stage-gate/finish-the-tab/{brief,plan,decision-log}.md` for how the
previous stage worked and its two-repo rules, which all stand here:

- Tab code → the fork clone `vendor/tbc-new-fork`, branch `feat/upgrades-tab`,
  tip `cfcdd7ea1`, main checkout only (gitignored; no worktree has it).
- Plans, tickets, data, lockfile, logs → this repo. Update
  `data/wowsims-fork.lock.json` whenever the fork moves.
- Never push the fork, never open a PR, never flip `"pushed": false`.
- Fork builds: the corrected recipe in
  `.scratch/stage-gate/finish-the-tab/measurements.md` (protoc + wasm +
  workers + vite, cwd the fork; `lib.wasm` must match the glue it is built
  with — plan claim C22 of the last stage was refuted for exactly that).
- `pnpm verify` green on every repo commit; fork checks green on every fork
  commit; durable-claims rule in every committed file.

## Owner's words (2026-08-23, in chat)

> "bis list checkbox 'this phase' is poor phrasing especially if the incoming
> phase is phase 3 and what people would use this for."

> "there also needs to be a look at: what items are even included? on the
> program we already have outside of the upgrades tab, we've had work at
> looking at settings certain phases and what zones/content/items that
> includes."

> "have investigator subagents look to see how we accomplish this in the
> tbc-gear-prio project locally, and see if we can hook up a similar thing on
> the website (using the available code/sources on wowsims ideally, and only
> using tbc-gear-prio locally-made item sets as a backup)."

> "this should be fairly straightforward work but will probably need to be
> done slowly and carefully because it's the sort of thing where making a
> mistake from lack of understanding or missing an important source for
> something will probably be one of the major risks leading to a failed or
> bad result."

Also ruled: presume **phase 3** is the phase players will use this for; a
phase selector on the tab is wanted eventually ("we will also need
phase-based filters"), and the BiS checkbox appears only when a BiS list
exists for the phase in question (already built: `upgrades_tab.tsx:363`).

## Goal

When this is done, the Upgrades tab's candidate pool for a given phase is
**explainable and correct**: a reader can say, for ret and feral at phase 3,
which zones / content / item sources the pool draws from, where that list
comes from (wowsims' own data first, this repo's assembled universes as the
backup), what is deliberately excluded, and can re-run a command that shows
the count and the membership. The tab says which phase it is pooling for in
plain words (no "this phase"), and the BiS checkbox label names the phase
("Phase 3 BiS list" or equivalent). Nothing about ranking math changes.

## What this stage must establish before it builds anything

The planner investigates; the brief deliberately does not pre-answer these.
Every answer must cite the file and command it came from — the risk here is
a missing source, so an unsourced claim is a finding.

- **Local first.** How does this repo decide what is in a phase's pool today?
  Start from `packages/core/src/index.ts:70-75` (`filterPoolByPhase`,
  `filterPoolByZone`, `zonesInPool`), `applyView`'s raid/boss options, the
  universes in `data/universes/{ret,feral}-p*.json` and their `.report.json`
  siblings, `scripts/assemble_universe.py` (its sources: vendored AtlasLoot,
  wowhead, wowsims presets; its phase and zone scoping), `data/wowsims.lock.json`
  (`currentPhase: 2`, `defaultMaxPhase: 2`), PLAN.md's phase/zone sections,
  the ADRs, and the open tickets that record known gaps in pool coverage
  (at least 253, 259, 173, 58, 17, 56 — `pnpm issues:open`). Produce the
  list of every source the local pool draws on and every known exclusion.
- **wowsims side.** What does the fork carry that could drive the same thing
  on the site: the item database's per-item fields (`phase`, sources — drop
  zone/boss, vendor, crafted, PvP, quest — faction, class allowlist), how the
  stock Gear tab's filters already slice by phase / source / raid, the
  `gear_sets` presets per phase, `CURRENT_PHASE`, and any content-tier tables
  in `sim/` or `ui/core`. Say what wowsims can answer by itself, where it is
  thinner than the local universes, and where the two disagree on a concrete
  item (pick items and check both).
- **The join.** What does "use wowsims ideally, local sets as backup" look
  like as data flow in the tab: does the tab bundle the local universe
  (today) and annotate it from wowsims' DB, or build the pool from wowsims'
  DB and fall back to the universe where wowsims lacks a field? Which of the
  two is the *primary* for membership and which for metadata, and why.

## Open questions — each needs a candidate, a pre-stated win condition, and a measurement

- **Q1. Pool source on the site.** Candidates: (a) wowsims item DB is primary
  for membership (phase + source fields), local universe supplies `bisTags`/
  EP/zone metadata where wowsims lacks it; (b) local universe stays primary
  (as today), wowsims DB is used only to cross-check and to explain sources;
  (c) a hybrid with an explicit precedence rule per field. Win: for ret-p3
  and feral-p3, the chosen pool's membership is listed with its source per
  item, every difference from the other candidate is explained by a cited
  rule, and no item a player could obtain in phase 3 raids is missing
  without a recorded reason. Measurement: a script or test that prints the
  two memberships and their symmetric difference, committed where the
  verify recipe can run it.
- **Q2. Phase naming and selection on the tab.** Candidates: (a) label from
  the page's phase setting (`sim.getPhase()`), rendered as "Phase N"; (b) a
  phase selector on the tab itself that overrides the page setting. Win:
  the BiS checkbox and the assumptions drawer name the phase explicitly; the
  owner's "this phase" complaint is gone; the page's own phase setting and
  the tab never disagree silently. Measurement: the rendered strings on a
  served page at phase 2 and phase 3.
- **Q3. Zone / content filters on the tab.** Candidates: (a) port core's
  `applyView` raid/boss view options to the tab as post-sim filters;
  (b) pre-sim pruning by zone like the BiS prune; (c) defer to a later
  stage with a recorded reason. Win: a player can narrow the shopping list
  to content they will actually run, without re-simming, and the zone
  vocabulary matches wowsims' own naming. Measurement: the rendered list on
  a completed run under each filter.
- **Q4. Which data is bundled vs looked up at runtime**, and what keeps the
  bundled copy honest (a regen command plus a gate, as `pnpm verify` does for
  the universes here). Win: a one-command refresh and a check that fails when
  the bundled copy drifts from its source.

## Constraints

- Slow and careful: the plan names every source it relies on, and the
  reviewer is asked to hunt for the source it missed. Where the plan cannot
  settle a membership question from data, it says so and asks the owner.
- Simple code: reuse the fork's own item DB and filters and this repo's
  existing `filterPoolByPhase` / `filterPoolByZone` / `applyView` shapes
  rather than inventing a third model.
- Large parts get a `nested-plan` marker and a sub-brief, as before.
- Executor runs in the shared main checkout (fork clone lives only there).
- Out of scope: ranking math, set-bonus variants, new specs, pushing.

## Done means

- A committed, re-runnable listing of the phase-3 pool for ret and feral
  with per-item source and the chosen precedence rule, plus its gate.
- The tab names the phase in its labels and drawer; Q2's choice built.
- Q3 built or deferred with a reason the owner accepted.
- A dated `docs/verification-log.md` entry per goal line; STATUS replaced by a
  newer one; lockfile at the fork tip; tickets this stage settles closed.
