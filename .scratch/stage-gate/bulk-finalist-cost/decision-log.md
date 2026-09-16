# Decision log — bulk-finalist-cost (ticket 403)

Stage opened 2026-09-15 by the orchestrating session.

- **Step 1 — stage opened.** Core `feat/desktop-transport-gate` @
  `58d06b4bab1de45eca4bbe0fdcd4f691a2cfb342`, `git status --porcelain` empty.
  Fork `vendor/tbc-new-fork` @ `e94d927af0ff7c31f071c961d1d7789980c8b8c9`, also
  clean. `brief.md` written with four open questions (Q1 decoupling `topResults`,
  Q2 the right finalist size, Q3 proving the ranking is unchanged, Q4 an upstream
  report). Owner's judgment recorded as settled in constraint 3: "make it
  converge at 25" is a non-goal. Scope this pass is **planning only** — the user
  asked for a Fable planner to figure out how to solve this; execution is a
  separate ask.
- **Gate A — PASS** (2026-09-15). All seven template sections present; Claims
  register 23 rows; Paths manifest present; Q1-Q4 each carry candidate +
  pre-registered winning result + measurement or stated reason. Core tree clean
  at `58d06b4bab1de45eca4bbe0fdcd4f691a2cfb342`, fork clean at `e94d927af`,
  both unchanged from step 1 — the planner wrote nothing. No respawn needed.
  Plan recommends option A (new `skip_finalist_stage` proto field honoured in
  both engines) and marks option C (drop the bulk RPC on HTTP entirely) as the
  owner's call. Escalated to the owner; reviewer spawned in parallel.
- **Gate B — LOOP BACK, round 1** (2026-09-15). Three blocking findings stand
  (F1 vacuous acceptance criterion, F2 the discarded-output premise is false,
  F3 both supports for "remove entirely" refuted). Orchestrator independently
  re-verified the two decisive ones before accepting: `stage.go:329-352` does
  merge extra iterations into the returned results via
  `carried: bulkSimCarryOverFromResults(...)`, and `smoke-3333-cap20.json` has
  8 populated rows of 20 (12 are `dps: None`). Reviewer's reconciling note
  accepted: option A survives, but the fix must be restated as an accepted
  precision reduction on screening values for rows 9+, not as removing
  discarded work. Materials F4-F6 to be fixed or accepted with reason in the
  revision; F7-F8 ride along as advisories. Owner authorised the planner to run
  measurements via agents during the revision. Constraint 5 still binds: no
  full-pool re-run.
- **Gate B round 2 — PASS to the owner** (2026-09-15). Revision 1 written to
  `plan.md`; round-1 preserved as `plan-round1.md`. Both trees clean at the
  recorded SHAs; the planner wrote nothing.

  All three blocking findings addressed:
  - **F2** accepted in full. The plan now states the fix honestly as an accepted
    precision reduction, with a derived bound (C25: 6.0 DPS per row 9..N, from
    398's measured per-iteration stdev 128).
  - **F1** fixed by moving the measurement to **cap 40**, where rows 9..N are
    populated and ~14 are above cutoff. Orchestrator verified `gate-tip.log`:
    cap-40 screened 257 s / loop twin 17 s, T2 max 8.1 over **32 populated
    rows**, `aboveCutoffSymDiff` 1. Also verified `smoke-release-cap20.json` has
    20/20 populated rows with top-8 byte-equal to the 3333 pair — so the fixture
    question was answerable from disk, no new run needed.
  - **F3** accepted; the Q2 "none" recommendation is rebuilt on a different
    argument (the web tab already ships 3,000-iteration values at a 3.3 DPS SE
    bound, so neither track is worse than the default path).

  Materials: F4 fixed (C24 added — no request field can reach an early return
  without truncating), F5 **partially disputed with evidence the orchestrator
  accepts** (the reviewer's `Finalists: 13 / 36.11s` is the full-pool run's last
  chunk at 18:22:05, not a cap-20 chunk; cap-20's real share is 60-63%), but the
  finding's conclusion is adopted anyway — timing is reported, not asserted.
  F6 fixed (fork commit -> lock bump -> regen -> verify ordering, C21).
  F7 fixed (C33 names the scope-determining command). F8 fixed (C14 reworded).

  **Recommendation changed: Track C, not A.** With F2 established, A is a trade
  rather than free, and C14 says the `high` stage still delivers 16,599-19,686
  iterations against 3,000 requested — so A would leave cap-40 desktop at ~100 s
  (hypothesis) against C's measured 17 s. Plan carries both tracks fully
  specified; S0 stops unless the orchestrator has recorded the owner's choice.

  **Gate B outcome: no blocking finding stands.** Not proceeding to Step 5 —
  the track choice is the owner's and execution was never authorised this pass.
- **Owner decision, 2026-09-15: take the speed — Track C.** Recorded from the
  owner directly, after an independent Fable advisor (no stake in the plan)
  found that bulk screening is a *culling* tool whose culling we skip, and that
  its precision is already beaten ~30x by the existing `replicateTopItems`.
  Orchestrator verified the decisive contrast in a committed report
  (`.scratch/rank-reports/shredzepelin-p3.json`, field `ranking.items[].se`):
  replicated rows **0.018-0.088 DPS** SE, unreplicated **1.76-2.31**.

  **The owner's framing, which the advisor did not fully address and which
  should steer any future precision work:** recommendations are *mostly per
  slot*, so the decision that matters is the top-1 within a slot, and a close
  call there could be handled by a **conditional** check rather than blanket
  precision. Note `PAIRED_REPLICATE_TOP_N` (`se.ts:6`) is a **global** top-8,
  not per-slot — so a slot whose contenders all rank below 8 gets no replication
  at all. That, not the rows-9+ SE debate the plan spent two rounds on, is where
  a precision gap actually lives. Worth its own ticket if precision is revisited.

  Owner also notes there are existing measurements about time-vs-accuracy already
  in the repo (e.g. `docs/five-seed-spread.json`); any future precision decision
  should be coherent with those rather than re-derived.

  **Also owner-directed:** the 30-line comment at the runner choice that argues
  the opposite case is a symptom, not a one-off — file a ticket for a comment
  cleanup pass over the fork rather than growing it here. The plan's C1 should
  write ~4 plain lines, not a rewritten essay.

  **Open before execution:** a subagent is measuring the predicted full-pool
  native-loop run time (the prior "~130 s" was an untested extrapolation). The
  owner asked specifically whether a smaller run can be scaled up; the agent is
  fitting `fixed + per_candidate * N` rather than a flat rate, because the top-8
  replication and baseline sims are fixed cost.
