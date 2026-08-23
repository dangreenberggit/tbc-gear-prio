# Decision log — finish-the-tab

One dated line per gate: gate, outcome, reason, round count.

- 2026-08-22 — **Stage opened.** Base SHA `10dbb3813d7cbb4be94ca1bd006b95f45a45be15`
  (`dev`), branch `feat/finish-the-tab` off `dev`. `git status --porcelain` empty at
  open. Fork clone `vendor/tbc-new-fork` on `feat/upgrades-tab` at `f359239`, clean,
  matching `data/wowsims-fork.lock.json`. Brief written from the owner's
  `.scratch/handoffs/wowsims-tab/BRIEF-finish-the-tab.md` plus the owner's chat
  additions (set-bonus toggle, BIS-list filter pre/post sim, every spec eventually),
  split into tranche 1 (this run) and tranche 2 (decide only). Three Sonnet Explore
  scouts fed the brief. Two scout claims checked by the orchestrator: HANDOFF-NEXT's
  "nothing merged to dev" is stale (`git merge-base --is-ancestor feat/candidate-pool
  dev` → yes); the fork tip carries M2 racing (`git -C vendor/tbc-new-fork log
  --oneline --grep=racing`) while core removed it (ADR-0026) — both recorded as facts
  in the brief. Ticket 252 (Opus-seat `WRONG_MODEL` misfire) still open: pre-empt in
  the spawn prompt, correct via `SendMessage` if it fires.
- 2026-08-22 — Brief committed as `38f02cfeb36c535040f55ed9e318166e696b0f26`; Gate A's
  clean-tree comparison runs against it.
- 2026-08-22 — **Gate A: PASS**, round 1, no respawn. Seven template sections present;
  Claims register C1–C31 (C14, C30 marked hypothesis/untested); Paths manifest split by
  repo, no partition (serial executor in the shared checkout); Q1–Q7 each carry a
  candidate, a pre-stated win condition and a measurement, dropped candidate Q1(b)
  carries its reason. `git status --porcelain` → 0 lines in this repo at `38f02cf` and
  0 lines in the fork at `f359239` after the planner ran. Orchestrator note for Gate B:
  Steps 2–3 and 5–6 need a foregrounded Brave tab the owner fronts (C29); the owner is
  not watching in real time, so that dependency is raised at hand-off, not assumed.
- 2026-08-22 — Plan committed as `4d028f5`; reviewer ran clean (no `WRONG_MODEL`
  misfire; spawn prompt pre-empted ticket 252). Both trees clean after.
- 2026-08-22 — **Gate B: LOOP BACK (revision round 1).** Reviewer verdict `revise`:
  3 blocking, 8 material, 5 minor. Orchestrator reconciliation against the brief:
  **F1+F2 (blocking) upheld, and resolved by amending the brief, not just the plan** —
  `grep -n D7 PLAN.md` confirms D7 carries no time number; the brief's "state the
  number from plan.md" was unanswerable. Ruling: the plan proposes a budget labelled
  "proposed, not D7"; the pre-sim BIS prune moves from tranche 2 into tranche 1 (the
  owner listed it as part of the finished tab in chat, the plan sized it at ~20 tab
  lines with no engine change, and it is the only in-scope lever that reaches any
  budget); "within budget" is judged with the prune on, the uncapped run is recorded
  as a measurement. The owner can overturn this at hand-off.
  **F3 (blocking) upheld** — core freezes four hash fields, the fork computes three;
  the sub-brief must not import `promoteTopJ`. **F4, F5, F6, F7, F8, F9, F10, F11
  (material) upheld** as written; F8's remedy is to order the fork code steps before
  the measurement milestone, and to make that milestone an explicit stop-and-report
  because the owner is not watching in real time. **F12–F16 (minor) ride along** as
  executor advisories; F15 is folded into the Step 7 ordering fix.
  Owner note received mid-gate and folded into the brief: one weighted set-bonus
  variant is wanted later, with its own researcher and nested planner — tranche 2.
- 2026-08-22 — **Gate A (revision 1): PASS.** Planner resumed via `SendMessage` (context
  retained). Round-0 plan kept as `plan-r0.md`. Revised plan: 7 sections, C1–C38 (C14,
  C36, C38 hypothesis/untested), Q1–Q7 with three items each; pre-sim prune is Step 5;
  all fork code steps precede the Step 8 stop-and-report milestone. Both trees clean
  after the planner ran. Reviewer re-run on the changed claims only: C8 (narrowed),
  C10, C21, C30 (corrected), C32–C38 (new), and the Step 6 sub-brief.
- 2026-08-22 — Reviewer re-ran on the changed claims (resumed via `SendMessage`); both
  trees clean after. Verdict `proceed`: F1–F15 resolved, F16 accepted with reason;
  six new findings G1–G6 (two material, four minor), none blocking.
- 2026-08-22 — **Gate B (round 2): PROCEED.** No blocking finding stands. Material
  findings accepted in this log with a ruling each, handed to the executor as
  advisories rather than a second planner round (they are precision fixes, not
  approach changes):
  **G1 accepted** — the Step 6 test deletion retires ticket 217's fork-only route
  because the screening compose site is deleted; say so in the repo commit message
  and STATUS; drop the unreachable `grep -c fullPool … # 0` line from the verify
  recipe (prose mentions at 359/363/1008 stay).
  **G2 accepted** — C36's candidate count is phase-scoped: 16 (ret-p2) / 17
  (feral-p2) at `maxPhase 2`; 9 (ret-p3+) / 5 (feral-p3). Budget cell is at maxPhase
  2; record the phase-scoped figures in measurements and STATUS.
  **G3 accepted** — C38 stands on `parity.test.ts:367,499`; the fallback ordering is
  dead and the executor ignores it.
  **G4 accepted** — Step 5 acceptance is `grep -n 'pool: this.effectivePool'` → one
  hit and no direct `poolFor(` inside `run()`.
  **G5 accepted** — `effectivePool` applies the bisTags filter to the raw
  `poolFor(...)` result, before `filterPoolByPhase`; `eligibleCount` keeps its
  existing phase/Kael wrapping around the helper's output, so both sites apply the
  same tag filter on the same side of the phase filter.
  **G6 ruled (product decision, orchestrator on the owner's behalf, overturnable at
  hand-off)** — the pre-sim prune is tags-only; untagged worn gear is dropped from
  that run. Honest degradation is the assumptions-drawer line Step 5 already adds
  ("Candidate pool: BIS-list items only") plus the control's own label. Step 9's
  observation is restated as "`Simming n/N` total equals the phase-scoped tagged
  count"; if the engine still rescues a worn row, record the actual count and why.
  Minor findings ride along as advisories. Round count: 2 (one revision).
- 2026-08-22 — **Executor spawned** (Opus, shared checkout, base `b64256e`), told to stop
  at Step 8. Stopped there: repo `b64256e` → `b5fe81d` (3 commits), fork `f359239` →
  `0993f944b` (7 commits), lockfile matches, drift `ok: 32`, E-W3 green and not
  skipped, `pnpm verify` exit 0. Nothing pushed (`git -C vendor/tbc-new-fork branch -r
  --contains HEAD` → 0 rows). Report saved as `execution-report.md` part 1.
- 2026-08-22 — **Gate C, part 1 (Steps 0–8).** Ledger rows: type-check workaround
  **accepted** (gate held at 0 errors; the fork lockfile defect becomes a ticket at
  Step 10); `format` substitution **rework** — `git -C vendor/tbc-new-fork show --stat
  1095e8a1a -- …/upgrades_tab.tsx` → 1,067/1,007 lines while `diff --stat -w
  f359239..HEAD` on the same file → 216/58: the BIS-filter commit reflowed the whole
  file, contradicting "edits written in the file's existing style"; the executor must
  say what reformatted it and either split it into a formatting-only commit followed
  by the feature commit (history rewrite is fine — the fork branch is unpushed) or
  restore the original layout; build-repair, cwd-for-vite, ADR-commit lookup,
  unlisted rank.ts touchpoints, `make` absent (sim/web failure pre-existing, 0 Go
  files changed), `sim-implemented-effects.json` regen (only `forkCommit` moved) —
  all **accepted**. G2 flag **accepted**: the budget cell is maxPhase 2 where both
  measurements agree; Step 11 records both figures and which one the prune uses.
  Out-of-manifest paths: ticket 217 append (G1 ruling — accepted);
  `data/sim-implemented-effects.json` (ledger row — accepted). Orchestrator checked
  the fork diff, not only the report: 8 files, matching the manifest plus
  `content-hash.ts` comments. Executor resumed into the rework and Step 9; the owner
  reported Brave open in the foreground.
- 2026-08-22 — **Gate C, rework row closed.** Cause was the executor's own Python
  rewrite converting the CRLF-only `upgrades_tab.tsx` to LF (the other 113 tracked
  `.tsx` files are LF). History rewritten on the unpushed fork branch: `caf36cf68`
  whitespace-only, then `9f327af9a` 62/2; tree hash identical to the prior tip
  (`692dce3a…`). New fork tip `e79916172`; repo `ff23b75` re-pins the lockfile and
  files ticket 272 (fork lockfile lacks Windows binaries). **Accepted.**
- 2026-08-22 — **Step 9 stop, dispositioned.** Executor stopped (correctly) before
  any timed run: tab read `visibilityState: hidden`, and the character had 0
  equipped items. Ruling: (1) fronting — the executor selects its own tab through
  Claude in Chrome and re-reads `visibilityState`; if still `hidden`, the owner
  fronts it (asked in chat); (2) gear — the plan's "page defaults" was wrong for a
  fresh-origin localhost page; the executor loads the spec's phase-2 wowsims preset
  gear set through the page's own Gear presets UI and records the set name per
  cell, which is the same kind of setup ticket 156's runs used. Both are
  measurement setup, not product changes: `adapt`.
