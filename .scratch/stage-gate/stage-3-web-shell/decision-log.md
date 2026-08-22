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
