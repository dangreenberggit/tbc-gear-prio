# Decision log — reforge-catchup-leftovers

One dated line per gate: gate, outcome, reason, round count.

## Stage open

- **2026-09-10 — Stage opened.** Branch `feat/reforge-catchup-leftovers`, cut
  from `dev` @ `66ab791f3f6dbad133d264d400a0a24328e71e56`. The two untracked
  handoff files that were the owner's input were committed onto the branch
  first (`595c997`), so the stage opens against a clean tree. **Base SHA for
  the pipeline: `595c997`** — `git status --porcelain` empty at that tip.

- **2026-09-10 — Scope shape decided: stage-gate, not parallel-phase.** Jobs 2
  and 3 both land in `rank.ts` / `pool.ts` / `compose.ts` in both engine copies.
  `parallel-phase`'s own rule is that two slices editing one module is a
  sequencing problem, not a fan-out, so a fan-out was rejected at partition
  time rather than after. Job 1 touches no source and job 4 is ticket files
  only; neither justifies a second pipeline.

- **2026-09-10 — Citation trust recorded in the brief.** Three file:line
  citations from the two handoff documents were checked against the tree this
  session and all three were wrong (`rank.ts:1100`, `upgrades_tab.tsx` path,
  `candidate-order.ts:36-67`), while the underlying findings survived. The
  brief instructs every seat to locate by symbol and treat handoff line numbers
  as untrusted. This is the operational form of the owner's "grain of salt".

## Gates

| Date | Gate | Outcome | Reason | Round |
| --- | --- | --- | --- | --- |
| 2026-09-10 | Plan (spawn) | lost fan-in | `gate-planner` (fable) dispatched four `Explore` researchers and ended its turn waiting on them. Background completions notify the parent session, not a finished manager, so the reports reached the orchestrator instead. No plan returned. | 1 |
| 2026-09-10 | Plan (respawn) | plan returned | `SendMessage` is **disabled in this session**, so the skill's normal recovery — resume the cut-off seat, which retains its context — was unavailable. The four reports were captured to `research-notes.md` and the seat respawned against brief + notes so the research is not re-paid for. | 2 |
| 2026-09-10 | Gate A (mechanical) | pass, with one flag | Every template section present; Claims register has 26 rows; Paths manifest present; all three brief questions answered with candidate/win-condition/measurement. `git status --porcelain` **empty** — the read-only planner wrote nothing. Flag: the branch tip moved from `595c997` to `33babf0` during the stage, not by any seat — see below. | 2 |

## Flag — a parallel writer on this branch

`33babf0` ("Write the leftovers handoff, sourced and failure-pathed", author
`daniel`, 2026-09-10 14:42) landed on `feat/reforge-catchup-leftovers` while the
planner was running. It rewrites
`.scratch/handoffs/wowsims-reforge-catchup/HANDOFF-leftovers.md` (+125/−31) —
the document this stage's brief was built from. No seat of this pipeline wrote
it; `git status` was clean before and after, and the planner is read-only.

Per stage-gate step 2, an unexplained tree change is **reported, never
reverted**, because another agent's live work looks identical from here
(ticket 261). It is left in place. The brief and plan were sourced from the
`595c997` version of that handoff; the rewrite is reconciled against them
before the Executor is spawned rather than after.

## Notes carried forward

- **`SendMessage` is disabled here.** Stage-gate's Recovery section assumes a
  cut-off seat can be resumed. It cannot be, in this session. Any seat that
  stops early must be respawned with its context reconstructed in the prompt.
  Budget for that when spawning the Reviewer and Executor.
- **Researcher output files on disk were zero bytes.** The reports existed only
  in the task notifications, so they were transcribed into `research-notes.md`
  by hand. Do not assume the task output directory preserves a subagent report.
- **The handoff's citation confusion is now explained, not just flagged.** The
  cap line genuinely is `rank.ts:1100` — in `packages/core`. It is `:1180` in
  the fork copy. The handoff cited the core line number against the fork file.
  The finding was right; the file was wrong.
