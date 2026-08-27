# Decision log: upgrades-ui-quality

Stage opened 2026-08-27.

- Base SHA at stage open: `8a3589334dceda5401a4b4fa6bd954ef9ab795ea`
  (`git rev-parse HEAD`, main repo, branch `feat/upgrades-dedup-wowsims`).
- Tree clean at stage open: `git status --porcelain` empty.
- Source ticket: `.scratch/carry-forward/issues/304-upgrades-tab-ui-quality-pass.md`
  (committed as `8a35893`).
- Note: the UI under change lives in the gitignored fork `vendor/tbc-new-fork`,
  on its own branch `feat/upgrades-tab`. The main-repo SHA above does not
  capture fork state; the fork's own HEAD at stage open was `fd4d65c4a`.

| Date | Gate | Outcome | Reason | Rounds |
| --- | --- | --- | --- | --- |
| 2026-08-27 | Stage open | opened | Ticket 304 filed; brief written with three open questions (Q1 owned rows, Q2 assumptions drawer, Q3 sub-tab shape). | — |
| 2026-08-27 | Gate A (mechanical) | pass | All seven template sections present; Claims register 15 rows; Paths manifest present; Q1/Q2/Q3 each answered with candidates + pre-stated win conditions; tree clean and SHA unchanged (planner edited nothing). | 1 |
| 2026-08-27 | Gate B (judgment) | loop back | Reviewer returned `revise` with five blocking findings (F1 F2 F4 F5, plus F10 material-but-gating). Orchestrator independently confirmed F4 (`ui/core/i18n` does not exist; locales are `assets/locales/en/translation.json` behind an Ajv schema and CI `test:locales`) and F5 (`grep -c vendor package.json` = 0, so the main-repo gate cannot see any fork change). Both are executable-blocking, not stylistic. F1/F2/F8 reconciled against brief intent and upheld: the ticket itself warned about `belowCutoffCount`, and F2 shows Q2-A failing its own pre-stated win condition. One revision round, the norm. | 1 |
| 2026-08-27 | Gate B (judgment, round 2) | proceed | Reviewer returned `sound` on rev 2: every blocking finding (F1 F2 F4 F5 F10) resolved in substance, not wording, and no new defect introduced. One residual — a stale path in C13 — verified by the orchestrator (`detailed_results/_detailed_results.scss` does not exist) and fixed in plan.md. Additionally the orchestrator measured all four fork gates, retiring the plan's own "oxlint and tsc untested" caveat: type-check exit 0 clean, lint:js exit 0 with pre-existing warnings in `ui/shaman/`. Ready for the executor. | 2 |
