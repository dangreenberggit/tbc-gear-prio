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
- 2026-08-22 — **Step 9 blocked on the Brave window.** Executor selected and clicked
  its tab (`hasFocus` → true), opened a fresh tab, and armed a `visibilitychange`
  watcher for 10 min (20:59–21:09): `visibilityState` stayed `hidden` throughout, so
  the Brave window holding the Claude-in-Chrome tab group is minimised or fully
  occluded, not merely un-selected. Setup otherwise staged: server on 8123 serving
  the post-rework `full` build (chunk verified from the live origin), presets
  identified (ret "P2"; feral "BiS 9%"). Waiting on the owner; executor retains
  context for `SendMessage` resume.
- 2026-08-23 — Tab reads `visible`; the pre-sim prune measured live on the ret page
  (Candidates placeholder 240 → 16 → 240 as the control toggles; 16 = ret-p2 tagged
  count). Step 9 stopped again: the archived builds carry **no gear presets** (preset
  containers empty, `grep -rl makePresetGear` across the bundle → none, no failed
  fetch). Ruling: **rework** — a measurement-surface precondition, not a product
  change. The executor establishes how the fork's own build produces presets (the
  dist ticket 156 measured against had them), fixes the build *procedure* for both
  archives, and runs Step 9. Any fork source change needed to get presets into the
  bundle is a flag to the orchestrator, not an adapt.
- 2026-08-23 — Executor retracted its "presets absent from the bundle" finding (minified
  symbol names defeated the grep; item-id probe finds the gear sets in both archives;
  no rebuild done, `racing/` untouched). Remaining blocker: the preset picker widget
  constructs but populates zero chips, observed on two surfaces, both while the window
  had gone `hidden` again — throttling not separated from a page defect. Ruling:
  **adapt, no fork change** — load gear through the page's share-link hash, encoded by
  this repo's core (`encodeShareLink` in `packages/core/src/share-link.ts`): ret from
  `test/fixtures/slamaltman.raid-sim-request.json` via `toIndividualSimSettings`;
  feral from `data/presets/feral/owner-p2.settings-export.json` (already
  `IndividualSimSettings` protojson, 17 equipped items). The loaded settings are
  recorded per cell and supersede the plan's "page defaults + preset" wording. The
  empty picker becomes a ticket (`Blocks: none`) at Step 10 with the reproduction,
  and the executor re-checks it once with the window visible so the ticket says which
  of the two causes it is. Owner asked in chat to front the window again.
- 2026-08-23 — Share-link gear load works up to storage (ret: 16 real item ids in
  `__tbc_new_retribution_paladin__currentSettings__`, persists across reload) but the
  page applies nothing: 0 equipped icons, all stats 0, preset picker empty — with the
  window visible and focused. Throttling ruled out. Inputs deviated and recorded: ret
  fixture is at repo-root `test/fixtures/`; feral export carries a post-pin APL field
  (`timeToNextEnergyTick`), `player.rotation` stripped before encoding. Executor
  stopped (no fork source change allowed). Orchestrator: before ticketing this as a
  fork defect, a read-only diagnosis (Opus) tests the hypothesis that the archive
  builds skipped the makefile's `gen_db -gen=go-to-ts` / generated-input steps and
  serve an item database the UI cannot apply — ticket 156 measured a geared character
  on a `make`-built dist on 2026-08-18, so gear application worked on this fork then.
- 2026-08-23 — **Diagnosis (Opus, read-only): stale `lib.wasm`, not a fork defect.**
  `individual_sim_ui.tsx:333-359` runs `loadSettings()` and the topbar/preset
  population inside `sim.waitForInit().then(...)`; `sim.ts:186-226` awaits
  `workerPool.isWasm()` → `SimWorker.onReady` with no timeout; `ready` fires only from
  the Go program's `wasmready()`. The served `lib.wasm` is the 2026-08-14 binary (md5
  `4811d1a5…`), while the executor regenerated the protos and rebuilt `sim_worker.js`
  with Go 1.25.4's `wasm_exec.js` on 08-22, so instantiation fails silently (the
  `instantiateStreaming` call has no `.catch`). Losers: skipped `gen_db` (ticket 156
  used the same two-command shortcut and was geared the day the wasm was built);
  db.json (8,257 items, the 16 ids present with paladin allowlist); branch commits
  (touch nothing on the settings path); apiVersion (catches would have warned);
  `/version` warning (cosmetic). Plan claim **C22 refuted in effect**: Go sources did
  not change, but the glue did. Ruling: **adapt** — executor confirms with the
  `Worker[0] Ready` log / unhandled-rejection check, rebuilds the wasm by the
  makefile's own command (`GOOS=js GOARCH=wasm go build -o ./dist/tbc/lib.wasm
  ./sim/wasm/`), places the same fresh wasm in BOTH archives (Go sources are identical
  across all fork commits on the branch), re-verifies settings apply, then runs Step 9.
- 2026-08-23 — Wasm rebuilt (`393bee73…`, 21.5 MB, go1.25.4), placed in both archives;
  `Worker[0] Ready` logs, share-link gear applies (Strength 878, AP 3801), presets
  render (7 sections / 18 chips), warm-up ran (`Simming 30/58`). Empty-picker ticket
  **not filed** — not a defect. C22 refuted in effect; corrected build recipe in
  measurements.md. Warm-up rate 7.8 s/sim visible (ticket 156: 3.8 s) — open
  discrepancy, recorded. Hidden-window throttling confirmed severe. Ruling: run cell 1
  (prune on, ret then feral — the goal-line cells, minutes each) now; the four long
  cells (prune off, racing; ~38 min each by the measured rate) are put to the owner,
  since they cost ~2.5 h of fronted-window time and decide only Q1, which ADR-0026
  already settled on three fixtures in core.
- 2026-08-23 — **Cell 1 measured: goal line MET.** Ret prune-on 307 s, feral prune-on
  61 s, against the proposed 600 s, fronted Brave, 0% hidden. `Simming n/N` ret = 53
  (16 tagged + owned rows + paired-slot retries — same composition as ticket 156);
  placeholder counts 16/17 match C17. Every result row ★ BiS. Gear via share links
  (ret `slamaltman` fixture, baseline 1775.0 DPS; feral `owner-p2` export, rotation
  stripped, baseline 842.3 DPS).
- 2026-08-23 — **Gate C, Step 4 defect → rework.** Clicking `.upgrades-bis-only-toggle`
  on a completed ranking rebuilds the tab to its idle shell (reproduced twice, once by
  a real click). Hypothesis (untested): `renderSubTabs()` tears down panes before
  `currentView()`, which throws when state is not `done`. Ruling: fix in the fork
  (same Step 4 code), fork checks green, rebuild the `full` JS bundle (wasm unchanged),
  repo commit re-pinning the lockfile and regenerating the effects file, then cells
  2–3 as approved — with the BIS filter and set-bonus toggle observations taken on the
  cell-2 ret (prune-off) run, which is the first run where either control has
  anything to show. Set-bonus toggle correctly hidden on prune-on runs (no rankable
  set potential in a BIS-only pool) — that polarity is recorded.
- 2026-08-23 — **Cells 1–2 measured; Gate C part 2.** Prune-on: ret 307 s, feral 61 s
  (goal line MET on both). Prune-off: ret 1017 s (earlier run 866 s; 17% spread,
  recorded not averaged), feral 395 s. Controls verified on the completed cell-2 ret
  ranking: prune 240→16/17 and ★ BiS-only rows; post-sim filter 480→32→480, 17 slot
  tabs, zero sims; set-bonus toggle visible only where rankable set potential exists
  (both polarities observed), 12 positions change with zero sims — Q5 and Q6 win
  conditions met. BIS-filter defect fixed in two fork commits (`118f708d8` genuine
  fault; `8bb02b028` the actual cause, `parentElement.remove()` deleting the shared
  container) — **accepted**, diff read by the orchestrator (36/10, one file).
  **Rework**: `data/wowsims-fork.lock.json` points at `118f708d8`, not the tip
  `8bb02b028` — re-pin in the Step 10/11 sitting.
  **Q1 ruled**: cell 3 (racing archive) unmeasured — the 08-22 `racing` build does not
  apply share-link gear, cause undiagnosed; by the pre-stated rule candidate (c) full
  sweep wins by default, and ADR-0026's core measurements are the justification. No
  further window time spent on a throwaway archive: the unmeasured cell becomes a
  ticket (`Blocks: none`) carrying the archive path, the recipe, and the symptom, so
  it can be run later if anyone wants the browser number. The 7.8 vs 3.8 s/sim rate
  discrepancy is recorded in ticket 156's closing comment as an observation, not a
  blocker. Proceed to Steps 10–11.
- 2026-08-23 — **Gate C: CLOSED.** Steps 10–11 landed (`0b4741c` re-pin to tip,
  `8d5eeae` tickets, `6136d67` log + STATUS-2026-08-23 + measurements + nested plan).
  Orchestrator cross-check: `git diff --stat b64256e..HEAD` → 19 files = manifest +
  accepted out-of-manifest (ticket 217 append, tickets 272/273 + `NEXT`,
  `sim-implemented-effects.json`); fork `diff --stat f359239..8bb02b028` → the
  manifest's 8 files; both trees clean; lockfile = fork tip; `pushed: false`;
  `branch -r --contains HEAD` → 0; 156/199/205/206 off `pnpm issues:open`; one
  STATUS file; verification-log entry at line 2065. Every ledger row dispositioned
  (all `accepted`; the two reworks closed; the cell-3 `stop` ruled into ticket 273).
  Open for the owner at hand-off: ratify the proposed 600 s budget; overturnable
  rulings (pre-sim prune in tranche 1; prune is tags-only). Next: `pre-merge-review`,
  then ask before `pnpm merge-to-dev`.
