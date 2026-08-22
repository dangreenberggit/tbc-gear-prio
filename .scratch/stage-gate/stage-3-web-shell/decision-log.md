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
