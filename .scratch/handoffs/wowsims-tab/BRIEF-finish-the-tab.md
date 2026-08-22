# Brief — finish the wowsims Upgrades tab

For a planner. Written 2026-08-22 by the session that closed Stage 3 of the
standalone shell; it has read every tab document but has not opened the fork's
code. Flesh this out into a plan before building. Use the `stage-gate` skill
(brief → plan → adversarial plan review → execute) — a wrong plan here costs a
rebase of a 25-commit fork branch.

## Start here

1. `STATUS-2026-08-22.md` (this directory) — where we are and the owner's
   rulings. Do not re-litigate the rulings.
2. `docs/plans/wowsims-tab/plan.md` — the architecture, decisions D1–D7 (§1),
   the slice list (§9), and §9 item 7 "later work".
3. `candidate-pool/HANDOFF-NEXT.md` — the newest handoff; §4 has the open
   racing decision and the ticket list.
4. `docs/adr/0027-the-wowsims-upgrades-tab-is-the-primary-product.md`.
5. The fork itself: `C:/Users/dgree/Code/lulz/tbc-gear-prio/vendor/tbc-new-fork`,
   branch `feat/upgrades-tab`. Read `upgrades/` before planning anything; the
   handoffs describe it second-hand.

## Where commits go

- Tab code → the fork clone (its own git repo). Work from the **main
  checkout**, not a `.claude/worktrees/` worktree — the clone is gitignored
  and only exists there. Verify: `ls vendor/tbc-new-fork/upgrades`.
- Plans, tickets, handoffs, `data/wowsims-fork.lock.json` → this repo, on a
  `feat/<slug>` branch off `dev`. Update the lockfile's fork commit whenever
  the fork moves.
- Never push the fork. Never open a PR. Both are owner actions.

## Goal

The tab is **finished** when a ret or feral player on the fork's site can
open the Upgrades tab with their current gear and settings, get a ranked
shopping list and per-slot sub-tabs from a full in-browser run within the
plan's time budget, with honest progress, and nothing on the "required"
ticket list is open. Everything in §9 item 7 that is about shipping to
upstream (reconciliation, PR checklist, rebase onto `master`) is **not** part
of finishing — the owner decides that after.

## Open questions for the plan

Each needs a candidate, the result that would make it win (written before
measuring), and the measurement.

- **Q1. Racing.** Ship M2 racing on the browser path (~15% saving per
  `HANDOFF-NEXT.md` §4), do per-slot top-*j* first (~65%, its recommendation),
  or ship full sweep only (ADR-0026 says the engine full-sweeps; check what
  that means for the fork's copy). Measured by wall-clock on the production
  build for one ret and one feral run at D7's 3,000-iteration default.
- **Q2. Ticket 156.** What does a foregrounded, production-build browser
  measurement say, and does it close the ticket or change D7's default?
- **Q3. Which of §9 item 7's items are in "finished"?** More specs (only if
  it is a JSON drop-in — PLAN.md §8.2), IndexedDB cache, porting into the
  downloadable local sim. Propose in/out with a reason each; the owner
  decides.
- **Q4. Engine drift.** The fork's engine is a copy (D3). Since it was
  ported, this repo changed core: `set-potential.ts` split (needed for
  browser bundles), racing removal (ADR-0026), `candidates` on the `simming`
  progress event, `equipmentForCandidateSwap` and `gemContext` exported from
  the index, `HIT_CAP_PERCENT`. Which of these must be re-ported for the tab
  to be correct, and what does `pnpm engine-port-drift:check` say today?

## Constraints

- Owner rulings in `STATUS-2026-08-22.md` stand.
- `pnpm verify` green in this repo; the fork's own checks green in the fork.
- Durable-claims rule (AGENTS.md): every causal claim in a committed file
  has a re-runnable command or says hypothesis / untested.
- Three seams only in core; the fork's copy follows the same shape.
- Ask before `pnpm merge-to-dev`.

## Done means

A dated entry in `docs/verification-log.md` that states, per goal line above,
the command run and what was observed; `STATUS-*.md` in this directory
replaced by a newer one; tickets 156 and 199 closed or re-blocked with a
reason; `data/wowsims-fork.lock.json` pointing at the fork tip.
