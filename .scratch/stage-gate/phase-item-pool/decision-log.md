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
- 2026-08-23 — Reviewer ran clean (no WRONG_MODEL; both trees clean after). Verdict
  `revise`: 2 blocking, 3 material, 3 minor. Review saved verbatim to
  plan-review.md (the seat's output file was empty; text taken from its final
  message).
- 2026-08-23 — **Gate B: LOOP BACK (revision round 1).** Orchestrator reconciliation:
  **F1 (blocking) upheld** — C12's baseline numbers do not reproduce (reviewer re-ran
  twice); the revision replaces numeric baselines with property-based acceptance
  (zero phase disagreements, zero unexplained raid drops) so the listing establishes
  the numbers rather than matching a wrong count. **F2 (blocking) upheld** — five
  bundled files drift, not two; Step 1/2 acceptance and PROVENANCE notes restated.
  **F3 (material) upheld** — `npm run test:locales` joins the fork check recipe and
  the plan decides the pre-existing `upgrades_tab` schema violation (extend the
  schema — it fixes a fork gate that is red today). **F4 (material) upheld, ruling**:
  zoneless items (badge/crafted/PvP/quest/rep) must NOT vanish under a raid filter —
  use the existing `ZONELESS_SOURCE_LABELS` bucket or keep them always visible; the
  planner picks and states which, and Step 8 measures the zoneless count. **F5
  (material) upheld** — C16 split into "no source in fork DB" vs "excluded by a
  local rule"; acceptance loosened to a rule. **F6–F8 (minor)** folded in. The Q1
  inversion itself SURVIVED adversarial scrutiny (the reviewer independently hunted
  wowsims-side source carriers and found none) — it still goes to the owner at
  hand-off as an explicit confirmation item.
