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

- **Gate B round 3 — LOOP BACK** (2026-09-15). Round-2 review written to
  `plan-review-2.md`. Two blocking findings, both independently re-verified by
  the orchestrator before acceptance:

  - **G1 — deleting gate check (h) removes ALL automatic ranking coverage.**
    Confirmed by reading `scripts/check_desktop_tab.py:405-457`: assertions
    (a)-(g) inspect only counts, flags and strings — `wasmRefs`, `runner`,
    request counts, `done`, `rowCount`, `panicHit`, fallback warnings. **Not one
    of them looks at a DPS value, a row order, or the above-cutoff set.** Every
    content comparison (T1-T4) lives in `compare_readbacks`, reached only from
    (h) at `:533` or from `--compare` at `:484`, and `--compare` is a hand-run
    two-file diff the gate never invokes. The plan's claim that Step C3 "takes
    over the invariant" is false — C3 is a one-time executor action, not a
    standing check. Deleting (h) demotes `desktop-gate:check` to a shape check.
  - **G2 — the cap-150 measurement has no artifact.** Orchestrator walked every
    JSON under `.scratch/**`: **no file has `rowCount` 134 or 150.** The
    measuring agent ran it, reported 37 s / 201 raidSimAsync, and the readback
    was never written to `<out>`. That 134-row point is the entire lever for the
    fitted slope, and therefore for the headline 130-160 s. This is the
    "an exit code is not evidence work happened" failure in AGENTS.md
    § Durable claims, and the orchestrator relayed the number to the owner as
    measured before checking for the artifact. Recorded so the mistake is not
    repeated.

  Materials: M1 (three citations point past the end of `decision-log.md`, which
  is **99 lines** — verified), M2 (wrong line number for `data-runner`, and
  `BulkHttpSimRunner` must STAY while only `WorkerPool` becomes unused),
  M3 (the 130-160 band is narrower than the only variance figure in evidence
  supports; and `readback-wasm-tip.json` is an unmentioned 601-row loop run at
  1668 s that must be cited and explained as non-transferring).
  Minors: m1 (six vitest files would keep passing while testing unreachable
  code), m2 (contradictory Paths-manifest rows for the dropped Track A).

  **What the review could NOT break, after trying:** byte-equality (criterion 2)
  is sound — the force-fallback one-shot arms after page load, so the factory
  pool builds normally and the probe's throwaway `WorkerPool(1)` touches no
  shared state; Track C's path is genuinely identical. C37's arithmetic is exact
  and is corroborated by an independent request-count fit. Step C6 ordering
  (my round-1 F6) is resolved.

  **G1 is an owner decision, not a planning fix** — see the note below.

- **Owner decision on G1, 2026-09-15: golden readback (option 1).** Keep
  automatic ranking coverage by committing a known-good cap-40 readback and
  having the gate compare every run against it.

  The comparison that decided it, from `gate-tip.log`: a cap-40 loop run is
  **17 s** (`elapsedS`), **21.7 s** including startup ("(h) twin wall clock").
  Option 2 (invert (h), compare desktop-loop against WASM) pays that ~20 s on
  **every gate run**; the golden file pays it **only when output legitimately
  changes**. So option 1 is strictly cheaper than option 2 *and* catches more,
  because it does not have to tolerate the cross-engine disagreement (398's
  159 DPS baseline gap) that a cross-transport comparison must allow for.
  Option 3 (demote to a shape check) was declined — it catches nothing.

  **Owner-directed rider:** the golden file needs a plain note saying what it is
  and that regenerating it is a deliberate act, not a formality. Without that,
  the first person to hit a red gate regenerates reflexively and the coverage
  disappears silently.

- **G2 disposition: re-measure and commit the artifact.** The cap-150 number is
  withdrawn until a readback JSON exists in `<out>` and is cited by path.

- **Gate A (rev 3) — PASS** (2026-09-15). Revision 3 written; round 2 preserved
  as `plan-round2.md`. All seven template sections present; claims C38-C46 added
  (nine new, all orchestrator- or planner-verified); zero stale citations
  remaining (the `decision-log.md:275`/`:279` and "line (1234)" references are
  gone); Step S3 added. Core and fork trees clean, fork at `e94d927af`.

  **Orchestrator error corrected this round:** `plan-review-2.md` was never
  written to disk — the round-2 reviewer's report went into this log instead of
  its artifact, contrary to the stage-gate skill ("Write its final message to
  `plan-review.md`"). The planner noticed and worked from the prompt plus this
  log, so revision 3 is sound, but the artifact was missing. Now written, with a
  provenance note saying it landed late and why. Recorded rather than quietly
  backfilled.

  Both blocking findings resolved: **G1** by the owner's golden-readback design,
  specified down to the three compared fields (`rows`, `aboveCutoffItems`,
  `baselineDps`) and the ~25 ignored ones — the crux, because comparing a
  varying field would make the gate flap and train reflexive regeneration,
  destroying the coverage the owner asked for. **G2** by Step S3, which re-runs
  cap 150 **twice**: it supplies the missing artifact and independently measures
  the loop determinism that licenses C4's exact-equality check. If those two runs
  disagree, S3 stops and the golden design returns to the owner.

  Materials M1 (citations), M2 (line 1239 not 1234; only `WorkerPool` is removed,
  `BulkHttpSimRunner` stays) and M3 (band widened to 80-195 s; `readback-wasm-tip`
  cited as non-transferring) all fixed. Minors m1 (six green-but-dead vitest
  files, now named in the C5 ticket) and m2 (stale manifest rows) fixed.

  **Not proceeding to Step 5.** Execution has never been authorised; the owner
  asked for planning. Sending rev 3 for a round-3 review first.

- **Gate B round 3 — PASS. Plan approved** (2026-09-15). `plan-review-3.md`
  written to disk this time (last round's artifact gap not repeated). Verdict
  `approve`: no blocking, no material, three minor — all folded into the plan
  immediately rather than carried to the executor:
  - **n1**: the 0.1 DPS granularity comes from the **tab's renderer**
    (`upgrades_tab.tsx:250`, `:1404`), not the harness, which does no rounding.
    Orchestrator-verified. The portability conclusion was right, the stated
    mechanism was wrong; corrected in place and C41 now cites the renderer.
  - **n2**: six readback keys were in neither list. Not a flap (the comparison is
    a whitelist in code, so unlisted fields are ignored by construction), but the
    prose claimed to be exhaustive. All 30 non-compared keys now listed, with the
    whitelist-in-code point made explicit.
  - **n3**: ticket 400 is already `Status: closed` — orchestrator-verified — so
    C5(4) no longer tells the executor to treat it as open scope.
  Added **C47**: the gate has exactly one entry point (`package.json:70`), is not
  in `verify:steps`, and CI never clones the fork — so an exact-equality golden
  can only go red on a developer's machine with the diagnostic in front of them.
  That bounds the cross-machine portability risk the exactness raises.
  Also added, at the reviewer's suggestion and for honesty rather than safety: a
  plain statement that `--update-golden`'s (a)-(g) precondition stops only a
  *broken run* from becoming a golden, and that value-level correctness rests
  entirely on the developer reading the printed diff.

  **Pipeline status: plan approved, execution NOT started and NOT authorised.**
  The owner asked for planning; Step 5 needs a separate ask. The review's closing
  paragraph states the exact scope an executor would be authorised to do, for the
  owner to sanity-check before any execution ask.
