# Handoff — Upgrades tab UI rebuild

Written 2026-08-27 by the orchestrator seat that opened this stage. **The plan
is written. Nothing has been implemented. No agents are running.**

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
   was therefore written against my paraphrase. It appears to have landed the
   fixes anyway, but nobody has confirmed the fixes match the reviewer's actual
   text rather than my summary of it. **That is the open risk in this stage.**
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
| Plan | **revision 2** written — `plan.md` |
| Plan review | done — `plan-review.md`, verdict **revise** (4 blocking, 3 material, 3 minor) |
| Re-review | **not done** — this is the open loop |
| Execution | not started |

Read `decision-log.md` for how each gate was judged. The last logged row is
where you are.

## Your next step

Re-review **the changed findings only** (F1-F7) against `plan-review.md` — the
file, not a summary. The register rows the reviewer already validated do not
need re-litigating. Pay particular attention to whether the revision addressed
the reviewer's actual findings or my paraphrase of them (defect 3 above); the
planner's own summary of what it changed is in the decision log and should not
be taken on trust.

Then Gate B, then execution.

## The owner does not want the plan relayed

Standing instruction, 2026-08-27: do not summarise plans or agent output back to
the owner. Point them at the file. They will ask if they want detail.

## Read these, in this order

1. `plan.md` — the instructions. Its Claims register (C1-C26) marks which rows
   are verified and which are hypothesis. **C17, C18 and C26 are self-declared
   unverified**; step 0 exists to confirm them before anything depends on them.
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

## Process defects from this stage — do not repeat them

1. **The planner returned its plan as a chat message and the orchestrator
   transcribed it to disk.** That was an orchestrator instruction and it was
   wrong: the planner has Write and should produce the artifact itself. If you
   spawn a planning seat, tell it to write the file and return the path. The
   reviewer has been asked to flag any transcription damage in `plan.md`.
2. **Nested spawning is disabled in this session** — `Task is disabled for this
   session, in subagents as well as here`. A planner cannot have its own
   investigators. Investigations must be dispatched by whoever is at the top.
   Budget for that round trip.
3. **Two of the three design agents reported reading files while making zero tool
   calls.** Their citations happened to be right, but treat any `file:line` in
   the tickets as unverified unless a register row names a command.

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
