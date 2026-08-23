# Decision log — phase-item-pool

One dated line per gate: gate, outcome, reason, round count.

- 2026-08-23 — **Stage opened.** Base SHA `8c4b1867cdcfbb3b668eff3edebcfd40c823a0f7`
  (`dev`, right after `feat/finish-the-tab` merged as `8c4b186`), branch
  `feat/phase-item-pool` off `dev`. `git status --porcelain` empty at open. Fork clone
  at `cfcdd7ea1`, clean, matching the lockfile. Brief written from the owner's chat
  rulings only — no scouts this time, at the owner's direction: the investigation is
  the planner's job inside the gate. Four open questions (pool source, phase naming/
  selection, zone filters, bundled-vs-runtime data), each with candidates, a
  pre-stated win condition and a measurement.
- 2026-08-23 — **Gate A: PASS**, round 1, no respawn. Seven template sections present;
  Claims register C1–C30 (C29, C30 hypothesis/untested); Paths manifest split by repo,
  no partition (serial executor, shared checkout); Q1–Q4 each carry candidates, a
  pre-stated win condition and a measurement, dropped candidates carry reasons — Q1
  drops the owner's stated ideal (wowsims-primary membership) on measured grounds
  (C10–C12), which Gate B flags to the owner explicitly rather than treating as
  settled. Both trees clean after the planner ran (0 lines each). Note: the planner's
  final message arrived via the task notification; its output file was empty, so the
  plan was saved from the notification text — same content, recorded here for
  provenance.
