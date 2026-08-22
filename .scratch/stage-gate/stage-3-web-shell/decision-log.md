# Decision log — stage-3-web-shell

One dated line per gate: gate, outcome, reason, round count.

- 2026-08-22 — **Stage opened.** Base SHA `8a1c01af1f6c4dca6dd905cf3c46ff4d228d2d61`,
  branch `phase-3/web-shell` off `dev` (same commit). `git status --porcelain`
  empty at open. Brief written with four open questions (live vs offline-first,
  stack, export/import codec, persistence), each with candidates, pre-stated win
  conditions and a measurement. Two Sonnet scouts fed the brief; one scout's claim
  that character fixtures are uncommitted was refuted (`git ls-files test/fixtures`)
  and the brief carries the corrected location. Ticket 252 (seat `WRONG_MODEL`
  guard misfires on "Opus 5") is still open: expect the misfire on Opus seats and
  correct in place via `SendMessage`, not by editing seat files.
- 2026-08-22 — Brief committed as `d52af0bffcff6ea52acad4695db29d83e716ba8c` (the stage
  directory needed its own `.gitignore` negation line, like the earlier stages).
  Gate A's clean-tree comparison runs against this SHA.
- 2026-08-22 — **Gate A: PASS**, round 1, no respawn. All seven template sections
  present; Claims register 28 rows (C1–C28, four marked hypothesis/untested);
  Paths manifest with a four-slice Partition (S1 core → S2 server ∥ S3 UI → S4
  docs); Q1–Q4 each answered with a distinct candidate, a pre-stated win condition
  and a measurement, dropped candidates carry reasons. `git status --porcelain`
  empty (0 lines) at `c256b34` after the planner ran. Planner chose offline-first
  (Q1-A) on a hard fact — no `.env` in this worktree (C1) — which leaves gate box 1
  ("type a character") open by design; the orchestrator will raise that with the
  owner at hand-off. Note: the planner's four research subagents notified this
  session instead of the planner; their results were forwarded via SendMessage.
- 2026-08-22 — **Reviewer seat ran clean** (no `WRONG_MODEL` misfire this time; the
  spawn prompt pre-empted ticket 252's guard). `git status --porcelain` empty after.
- 2026-08-22 — **Gate B: LOOP BACK (revision round 1).** Reviewer verdict `revise`:
  2 blocking, 8 material, 2 minor. Orchestrator reconciliation against the brief:
  **F1 (blocking) upheld** — `sed -n 13p packages/core/src/items.ts` imports
  `data/items/index.json` (6,825,902 bytes) at runtime and `view.ts` reaches it via
  `rank-report-rules.ts`; gate box 4 depends on `applyView` in the browser.
  **F2 (blocking) upheld** — `grep -c '"BiS"' data/universes/{feral-p2,ret-p2,ret-p3}.json`
  → 17 / 16 / 16, so no committed `maxPhase` yields `pinBisAvailable === false`.
  **F3 (material) upheld** — `ls -la` on the main checkout's `.env` → 110 bytes; the
  brief's Q1 rule was "if no credential, A wins by default", so the planner must now
  perform the sizing measurement the brief asked for and decide Q1 on it.
  **F10 (material) reconciled, not a defect** — `c256b34` is the SHA the orchestrator
  handed the planner as base (brief commit); the plan must name it as such.
  **F12 (minor) accepted** — Git Bash is a supported shell here (AGENTS.md CLI
  environment), so `&&` and `/tmp` work; the recipe should use the scratchpad path
  and state whether `jq` is present. F4–F9, F11 go to the planner for revision.
  Revision via `SendMessage` to the same planner seat (retains its research context).
- 2026-08-22 — **Gate A (revision 1): PASS.** Planner revised via `SendMessage` (same
  seat). Round-0 plan kept as `plan-r0.md`; `plan.md` is revision 1. All sections
  present; register now C1–C35 (C1, C3, C6, C7, C16, C18, C21, C22, C26 rewritten,
  C29–C35 new); F1 resolved by moving `setPotentialIsConfounded` out of
  `rank-report-rules.ts`; F2 resolved by a no-BiS test pool through `Deps.pool`;
  Q1 re-decided on sizing (12 steps, about 8 files for the live adapter, against 17
  steps, about 45 files for the rest). Tree clean. Reviewer re-run on changed claims only.
- 2026-08-22 — **Gate B (round 2): PROCEED.** Reviewer verdict `proceed` on revision 1:
  0 blocking, 0 material, 2 minor (G1 argument order in `loadUniversePool`; G2 render
  skeletons on the first poll where `candidates` is defined). All of F1–F12 addressed
  or reconciled; register rows in scope all stand, C31 untestable until step 2b by
  design. G1 and G2 ride to the executor as advisories. `git status --porcelain`
  empty after the reviewer ran. Revision rounds used: 1 of the norm of 1.
