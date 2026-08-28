# Handoff — Upgrades tab UI rebuild

Opened 2026-08-27 by the orchestrator seat that started this stage; updated the
same day by the seat that finished it. **The plan is written, reviewed and
executed. No agents are running.** The process defects below are kept because
they are worth not repeating, not because they are still live.

## How the previous orchestrator wasted the owner's time — read this first

Five mistakes, all mine, listed so you do not repeat them. The owner ended the
session out of patience, not because the work was finished.

1. **I told the planner not to write its own file.** I said "return the plan as
   your final message and I will handle placement." Wrong: a planning seat has
   Write and must produce its own artifact. This made me a transcription layer
   for a 30KB document and — worse — left both plan gates judged against
   something no independent seat could re-read.
2. **I dispatched a reviewer at a file that did not exist.** Consequence of (1).
   The reviewer correctly refused to review from the decision log's summary and
   burned a full round doing so. Check your inputs exist before spawning.
3. **I sent the planner a summary of the review instead of the review file** —
   I wrote `plan-review.md` to disk *after* dispatching the revision. Revision 2
   was therefore written against my paraphrase. **This risk is now closed**: a
   fresh reviewer seat, pointed at `plan-review.md` itself, found revision 2
   carries details present only in the reviewer's own text, so the fixes
   answered the review rather than my summary of it.
4. **I did investigation work that belonged to subagents** — three toolbar
   designs, the ticket writing, long grep sessions. The owner had to correct me
   twice: "you're not the planner or executor, you orchestrate them."
5. **I kept spawning agents after being told to stop.** The owner said the
   handoff was the deliverable; I launched another reviewer anyway, and it had
   to be killed.

There is also a real technical caution here, not a process one: **two agents in
this stage reported reading files while making zero tool calls.** Their
citations happened to be correct, but treat any `file:line` as unverified
unless a claims-register row names a command you can re-run.

## Where this is

| Stage | State |
| --- | --- |
| Brief | written — `brief.md` |
| Plan | **revision 3** — `plan.md` |
| Plan review | done — `plan-review.md` (revise), `plan-review-2.md` (**approve**, no conditions) |
| Re-review | done — the paraphrase risk below is **closed** |
| Execution | **done** — 6 slices + re-pin, all gates green |
| Pre-merge review | **not started — this is the open loop** |

**Stage status 2026-08-27: the plan gate and execution are both closed.** The
re-review confirmed revision 2 answered the reviewer's real text, not the
orchestrator's paraphrase — that risk is resolved, not outstanding. Revision 3
then fixed one new blocking finding (F11, the `auto-fit` grid) and Gate B passed
with no standing conditions.

Execution landed six fork commits (`b2dc451c1`..`97a326e49`) plus the main-repo
re-pin (`ae1cb0f`). All five fork gates exit 0, re-run by hand rather than taken
on the executor's word; `pnpm verify` exits 0 **under the project's Node 22**
(system Node 20 fails 14 files on `node:sqlite` — environmental, not a defect).
F11 containment, the C23 rule survival and the F1 pane-independence were each
measured live in the running sim and hold.

**One thing did not meet acceptance and was not papered over:** slice 4's
set-bonus share shipped without ever being observed — no row carried a
`setContext` across five sweeps. Filed as ticket **315**; the code is not known
to be wrong, it is known to be unverified.

## Your next step

Run `pre-merge-review` on `feat/upgrades-dedup-wowsims` → `docs/reviews/`.
**Do not merge and do not raise merging** — the owner asks for that separately,
after they have seen the review.

## The owner does not want the plan relayed

Standing instruction, 2026-08-27: do not summarise plans or agent output back to
the owner. Point them at the file. They will ask if they want detail.

## Read these, in this order

1. `plan.md` — revision 3, now **executed**. Its Claims register runs C1-C28.
2. `.scratch/carry-forward/notes/upgrades-ui-original-asks.md` — **the acceptance
   rubric.** The owner's eleven original UI complaints, verbatim. The finished
   work is judged against this, not against the plan.
3. The tickets: `.scratch/carry-forward/issues/312`, `313`, `314`, `311`.
4. `docs/agents/known-traps.md` before touching the dev servers or any fork file.
5. `.scratch/stage-gate/upgrades-ui-quality/fork-gates.md` — the only gates that
   see this code.

## Base state

- Main repo `C:\Users\dgree\Code\lulz\tbc-gear-prio`, branch
  `feat/upgrades-dedup-wowsims`, base SHA `b8c0d8e`. Clean at handoff.
- Fork `vendor/tbc-new-fork` (gitignored, present on this machine), branch
  `feat/upgrades-tab`, HEAD `342f6a74`, matching the pin in
  `data/wowsims-fork.lock.json`. Clean at handoff.
- Dev servers are **running**: Go backend on 3333, vite on 5173. Do not restart
  them; reuse them.

## The one thing most likely to bite you

**`pnpm verify` does not cover the fork at all.** Its five own gates plus visual
checks are the entire signal. And the SCSS has a silent failure mode (C23): rules
nested under `.upgrades-toolbar` stop applying the moment a row is re-parented,
with no error at any gate. Slices 2 and 3 both re-parent a row. The plan makes
re-homing those rules part of each slice with a screenshot check — do not skip
that check because the gates are green. **Green gates will not catch it.**

## What was decided and is not open

- **Direction**: copy the Bulk tab's settings card. The owner chose it from three
  designs. Do not redesign.
- **No progress modal.** The inline status line stays.
- **Post-run view controls move next to the results.** This is the structural fix
  for the owner failing to find the BiS-only toggle — it is not a styling
  preference.
- **Out of scope**: ticket 311's Go panic, ticket 310 (its bug is currently
  unreproducible — the viewport tooling is inert), 305, 126.

## Environment constraint

**Nested spawning is disabled in this session** — `Task is disabled for this
session, in subagents as well as here`. A planner cannot have its own
investigators; whoever is at the top dispatches them and feeds the answers back.
Budget for that round trip. This is an environment constraint, not a mistake.

The orchestration failures and the unverified-`file:line` caution are at the top
of this document; they are not repeated here.

## When the review lands

Judge each finding against the brief's intent, not just against the plan — a
finding can be right about the plan and wrong about the goal. Then: blocking
findings loop back to the planner; material findings get fixed or accepted in
`decision-log.md` with a reason; minor ones ride along to the executor.

Only then spawn the executor with a fresh base SHA resolved by command, the
branch name, and its checkout mode.

## Do not

- Merge to `dev`, run `pnpm merge-to-dev`, or set `TBC_ALLOW_DEV_MERGE=1`.
- Push. The fork has never been pushed (`pushed: false`); flipping that needs the
  owner's say-so.
- Touch `_upgrades_tab.scss:333-424` (ticket 310 owns it) or anything under
  `upgrades/engine/**` or `upgrades/data/**`.
- Report a slice done on green gates alone. Every slice has a visual acceptance
  check for a reason.
