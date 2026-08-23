# Brief — finish the wowsims Upgrades tab (tranche 1)

Opened 2026-08-22 by the orchestrating session. Base SHA
`10dbb3813d7cbb4be94ca1bd006b95f45a45be15` (`dev`), branch
`feat/finish-the-tab` off `dev`. This brief supersedes the owner's
`.scratch/handoffs/wowsims-tab/BRIEF-finish-the-tab.md` for the stage-gate
run; read that file too — its "Start here" list and "Where commits go" rules
stand unchanged.

## Two repos, one plan

Every step in the plan says which repo it lands in.

- **Fork clone** — `C:/Users/dgree/Code/lulz/tbc-gear-prio/vendor/tbc-new-fork`,
  its own git repo, branch `feat/upgrades-tab`, tip `f359239`, clean. Tab
  code lives at `ui/core/components/individual_sim_ui/upgrades_tab.tsx` (the
  UI, ~930 lines) and `ui/core/components/individual_sim_ui/upgrades/`
  (`engine/` 34 ported files, `adapters/`, `data/`). The clone is gitignored
  and exists **only in the main checkout** — no `.claude/worktrees/` worktree
  has it. The executor runs in the shared checkout. Verify before any fork
  step: `ls vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades`.
- **This repo** — plans, tickets, handoffs, `docs/verification-log.md`,
  `data/wowsims-fork.lock.json`. Whenever the fork moves, update the
  lockfile's `commit` in the same sitting; `pnpm engine-port-drift:check`
  (part of `pnpm verify`) reads it.
- **Never push the fork, never open a PR, never flip `"pushed": false`.**
  Owner actions only. "Upstream" is ambiguous in this project — treat any
  push to any wowsims remote as forbidden.

## Owner rulings (stand; do not re-litigate)

From `.scratch/handoffs/wowsims-tab/STATUS-2026-08-22.md`: the tab is the
primary product (ADR-0027); ticket 251 (fork base vs engine pin) is decided
at push time, not now — keep building on base `cbf6b75`; ticket 267 (live WCL
gear source) is not needed, the tab reads gear off the page.

From the owner in chat, 2026-08-22, for this run:

- Ret and feral DPS first. Every other spec comes after, as data drop-ins.
- Keep the implementation simple: clear functions that do the tab's job; do
  not reinvent what wowsims or the ported engine already provides.
- Slow and steady: one tranche at a time. Large items get a nested planner
  (a focused plan for that part) before execution — say so in the plan
  rather than planning them thin.
- The UI layout will be tweaked later; do not polish.

## What the finished tab looks like (owner's words, paraphrased)

A wowsims tab that, for every DPS spec the tab supports (ret and feral
first, every wowsims spec eventually), shows a ranked shopping list of
upgrade items with the DPS increase each provides, per-slot sub-tabs, a
filter for "is on one of wowsims' BIS/preset lists" usable both **after**
simming (display filter) and **before** simming (prune the candidate pool so
the run is faster — some specs have no list, so it must degrade honestly),
and a toggle for including set-bonus increases in the ranking.

## Tranche 1 — this plan's goal

When this plan is done, a ret or feral player on the fork's site can open the
Upgrades tab with their current gear and settings, get a ranked shopping list
and per-slot sub-tabs from a full in-browser run within the plan's time
budget, with honest progress; **plus** the set-bonus toggle and the
**post-sim** BIS-list filter are in the tab; **plus** nothing on the
"required" ticket list (156, 199) is open.

**Amended at Gate B (2026-08-22).** The **pre-sim** BIS-list prune is in
tranche 1: the owner listed it as part of the finished tab, the round-1 plan
sized it at ~20 tab lines with no engine change, and it is the only lever the
plan found that brings a run inside any reasonable time budget with shipped
data. It is a user-selectable control (off by default; hidden where the pool
has no tags), so the uncapped full sweep stays available and is still
measured.

The time budget: plan.md D7 carries **no number** (reviewer F1). The plan
**proposes** one, labelled "proposed, not D7", with its reasoning; the owner
ratifies at hand-off. The goal line "within the plan's time budget" is judged
on the run with the pre-sim prune **on**; the uncapped run's wall-clock is
recorded as a measurement, not a pass/fail.

Tranche 2 (separate stage-gate later, not this plan): additional specs, and
the **weighted** set-bonus variant (below). The plan must still answer Q7 so
tranche 2 starts from a recorded decision, and must not build tranche 1 in a
way that blocks it.

## Facts established on this tip (re-verify what the plan leans on)

- Core's set-bonus toggle exists: `ViewOptions.withSetPotential` in
  `packages/core/src/view.ts:28`, threaded through `sortKeyFor` (`view.ts:289`)
  and `belowCutoffUnderView` (`view.ts:263`); `setPotentialIsConfounded` was
  split into `packages/core/src/set-potential.ts:23` so `applyView` fits a
  browser bundle (verification-log Stage 3 entry, box 4). The web shell
  exposes it at `apps/web/src/view-options.ts:37`. A *weighted* set-bonus
  credit was tried in 2–4 variants; one 0.5x/0.25x attempt was built and
  reverted (`.scratch/handoffs/set-potential-weighted-toggle-scope-miss.md`).
  **Owner, 2026-08-22 in chat:** one of those variants made sense and is
  wanted later; it is tricky and gets its own researcher plus a focused
  (nested) planner when its turn comes — **tranche 2, not this plan**.
  Tranche 1 ships the existing binary `withSetPotential` toggle and must not
  shape the control so a weighted mode cannot be added beside it. The fork's
  `upgrades_tab.tsx` has **no** set-bonus toggle;
  `currentViewOptions()` (~line 571) hardcodes `hideOwned: false` and passes
  no `withSetPotential`.
- Core's BIS-list feature is a **pin** (`ViewOptions.pinBis`, `view.ts:14`;
  `isCuratedBis`, `rank-report-rules.ts:503`) that sorts `bisTags` rows
  first; nothing in core or the fork prunes candidates by BIS membership
  before simming (ticket 199 says the fork filters only by `phase <= maxPhase`
  plus one legendary exclusion). `bisTags` come from the universe JSON
  (`assemble_universe.py` scoping wowsims' curated set by phase), not from
  wowsims' `ui/<class>/<spec>/gear_sets/` at runtime. Every wowsims spec has
  upstream `presets.ts` + `gear_sets/`; the tab's data has universes only
  for `ret-p2..p5` and `feral-p2,p3`, EP weights only `ret-p2`, `feral-p1`
  (`upgrades/data/`).
- Spec gating in the tab is a hardcoded map `SPEC_ID_BY_PROTO_SPEC` in
  `upgrades_tab.tsx:34-37` (ret, feral); other specs render the tab and show
  `unsupported-spec`. PLAN.md §8.2 says a new spec should be a JSON drop-in.
- **Engine drift.** `pnpm engine-port-drift:check` → `33 ported files match
  PROVENANCE.md` on this tip — that proves the fork copy matches what was
  *recorded* as ported, not that it matches current core. Known divergence:
  the fork tip has `b459e30a4 Port candidate-pool M2 racing into the
  upgrades engine` and racing is **always on** in the tab
  (`racing = input.fullPool !== true`, the tab never sets `fullPool`), while
  core removed racing entirely (ADR-0026: full sweep; it failed a
  pre-registered ≥20% bar on all three fixtures). Other core changes since
  the port, per the owner's brief: `set-potential.ts` split, `candidates` on
  the `simming` progress event, `equipmentForCandidateSwap` and `gemContext`
  exported from the index, `HIT_CAP_PERCENT`.
- `feat/candidate-pool` (ticket 199, M0+M1, reviewed at
  `docs/reviews/feat-candidate-pool.md`) **is merged into `dev`**
  (`git merge-base --is-ancestor feat/candidate-pool dev` → yes, 0 ahead).
  `candidate-pool/HANDOFF-NEXT.md`'s "nothing merged to dev" is stale; its
  §4 numbers are not.
- The fork has **no JS test runner**: its checks are `npm run type-check`,
  `npm run lint`, `npm run fmt` (oxfmt), and `make test` (Go only). The
  ported engine has no automated tests in the fork; its parity with core is
  what this repo's `test/wowsims-fork-parity*` and the drift gate check.
- Progress in the tab already renders stage labels incl. `screening`, a
  Stop button, an iterations input (default 3,000 = D7), a candidate-cap
  input, an assumptions drawer. `ViewRow.bisTags` renders a `★ BiS`/`Alt`
  badge.

## Open questions — each needs a candidate, a pre-stated win condition, and a measurement

- **Q1. Sim strategy on the browser path.** Candidates: (a) keep the fork's
  M2 racing as shipped; (b) per-slot top-*j* racing (HANDOFF-NEXT §4
  recommends, j=5 → promoted ratio ≈0.354, fit on two fixtures, never run in
  a browser); (c) full sweep, matching core post-ADR-0026. Win condition per
  candidate in wall-clock terms on the production build (`npm run build` or
  the fork's equivalent — name it) for one ret and one feral run at 3,000
  iterations, **foregrounded** browser tab, against D7's time budget (state
  the budget number from plan.md). A candidate that wins on time but loses
  recall (misses an item the full sweep ranks in the shortlist) does not win.
- **Q2. Ticket 156.** What does that same foregrounded production-build
  measurement say, and does it close 156 or change D7's 3,000 default?
- **Q3. §9 item 7 scope.** More specs, IndexedDB cache, porting into the
  downloadable local sim: in or out of "finished", with a reason each. The
  owner decides; the plan proposes.
- **Q4. Engine drift.** Which core changes since the port must be re-ported
  for the tab to be correct (set-potential split is needed for the toggle;
  racing removal interacts with Q1)? Record what
  `pnpm engine-port-drift:check` says before and after, and how the
  drift gate/PROVENANCE is updated so the gate stays honest.
- **Q5. Set-bonus toggle in the tab.** Candidates: (a) port core's
  `withSetPotential` through the fork's `view.ts` and add a checkbox that
  re-runs `applyView` client-side (no re-sim); (b) something else the
  planner finds simpler. Win: toggling changes sort/cutoff membership with
  zero sim calls, and a row that is `confounded` is never credited.
- **Q6. Post-sim BIS-list filter.** Candidates: (a) a "show only BIS-list
  items" filter over `ViewRow.bisTags` in the tab; (b) reuse core's
  `pinBis` pin and call it done. The owner asked for a filter, not a pin —
  say which and why. Win: with the filter on, only `bisTags`-tagged rows
  show; where the universe has no tags the control is hidden, not inert
  (PLAN.md §4.1 rule).
- **Q7. Pre-sim BIS prune (build — amended at Gate B) and more specs
  (decide only).** Where should the BIS list come from for pruning — the
  universe's `bisTags` (phase-scoped, already bundled) or wowsims' runtime
  `gear_sets` (every spec has one)? Win for the prune: with the control on,
  only tagged candidates are simmed, the eligible count shown before the run
  matches, the cache key still distinguishes the two pools, and a (spec,
  phase) with no tags hides the control. What makes adding a spec a pure
  data drop-in (universe JSON + EP weights + one map line, or less)? Record
  the spec recommendation and what tranche 1 must not do to keep it open.

## Constraints

- `pnpm verify` green in this repo on every commit; the fork's checks
  (`type-check`, `lint`, `fmt`, Go `make test`) green on every fork commit.
- Durable-claims rule (AGENTS.md) in every committed file.
- Three seams only in core; the fork's copy follows the same shape.
- Tab code commits go to the fork clone; plan/ticket/lockfile/log commits
  go here. Say which repo in every step and in every commit.
- No push to any remote of the fork. No PR.
- Ask before `pnpm merge-to-dev` (the orchestrator asks the owner; the
  executor never merges).

## Done means

- A dated entry in `docs/verification-log.md` stating, per goal line in
  "Tranche 1", the command run and what was observed — real browser
  measurements, not Node-hosted ones, for the time budget.
- `.scratch/handoffs/wowsims-tab/STATUS-2026-08-22.md` replaced by a newer
  `STATUS-<date>.md` that records the Q1–Q7 decisions and what tranche 2 is.
- Tickets 156 and 199 closed or re-blocked with a reason; tickets 205, 206
  dispositioned (closed, or left open with a line saying why they do not
  block "finished").
- `data/wowsims-fork.lock.json` `commit` pointing at the fork tip;
  `pnpm engine-port-drift:check` ok.
- The fork tip has a working tree that is clean and builds.
