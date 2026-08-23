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
