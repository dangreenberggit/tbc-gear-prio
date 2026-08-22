# Decision log — worn-item-pool-coverage

- 2026-08-21 — **Stage opened.** Base `011159de72e15fc6269d08c0b5df147e294e8123`,
  branch `fix/worn-item-pool-coverage`. Brief written with three open questions.

- 2026-08-21 — **Gate A: PASS**, round 1. All seven sections, 16 claims, Q1/Q2/Q3
  each with candidate + pre-stated win condition + measurement, tree clean.

  **The planner refuted the brief's central mechanism, and it was right.** The
  brief (written by this orchestrator) said the engine "scores that slot against
  an empty slot, so every candidate in it shows an inflated gain". False.
  Verified independently before accepting:

  - `rank.ts:652` composes the baseline from `equipmentFromLoggedGear(logged)` —
    the character's full worn gear, no pool filtering.
  - Shipped deltas: neck tops at **+12.9**, back at **+7.8**. Against a genuinely
    empty neck a phase-2 epic would price at +80–150.

  **The real defect is the warning text**, which says "every row shown for neck
  was scored against an empty slot … Do not read any of them as an upgrade or a
  loss". That is a false retraction of a correct ranking, and it is what the SME
  read before returning `do-not-trust`. So the rankings were never wrong; the
  disclosure lied about them.

  **This is the orchestrator's third error of the same shape this session** —
  confirming a premise (three slots flagged `worn-unrankable`) and never checking
  the inference (that the scoring was therefore broken). Recorded in memory as
  `feedback-verify-inference-not-just-premise`.

  Ticket 253 corrected in place with both commands; the earlier heroic/Ahune
  analysis stands as far as pool *membership* goes, only the empty-slot
  consequence is retracted.

  **Fix direction kept.** The planner's Candidate A (rank-time force-include)
  still earns its place: it deletes the false warning *and* supplies the missing
  anchor rows, and Candidate B degenerates to "reword the message" while leaving
  the slot unanchored and ticket 173's next silent drop silent.

- 2026-08-21 — **Gate B: STOP AND REPLAN — the plan is superseded, not revised.**
  Reviewer verdict `revise`: 3 blocking, 4 material, 4 minor. Orchestrator
  re-verified each blocker rather than accepting it.

  **F1 (blocking) — the anchor row is invisible.** An anchor is `deltaDps ≈ 0` by
  construction; `meetsCutoff` (`cutoff.ts:53-56`) is
  `deltaDps >= absDps || deltaPct >= pct`, so it fails, gets `belowCutoff: true`,
  and `partitionShortlist` drops it. Measured across all three shipped reports:

  | report | owned rows | above cutoff | with rank |
  | --- | --- | --- | --- |
  | slamaltman | 16 | 0 | 0 |
  | shredzepelin | 13 | 0 | 0 |
  | nexess | 15 | 0 | 0 |

  **0 of 44.** The plan's central deliverable would never reach the SME who reads
  the shortlist.

  **F2 (blocking) — the classifier join already works.** `classifyDeadSlots`
  handles worn-unrankable first and unconditionally (`dead-slots.ts:230-253`),
  emitting a complete `DeadSlot` with `wornItemId`/`wornItemName`/`slot`/`poolSize`.
  Worse, adding an anchor makes the slot fall through to the *normal* path and be
  labelled `thin-pool` or `unique-effect` — asserting a pool-based cause for a
  slot whose pool never contained the item.

  **F3 (blocking) — ticket 173 asks for the opposite.** It is a `Type: detection
  gap`, and its own text warns that growing a force-include list "grows the manual
  list without adding detection, which is the exact failure mode this ticket is
  about." A synthesized rank-time `PoolEntry` is force-inclusion.

  **C16 refuted, and the plan's instruction would have shipped a bug.** The cap
  already exempts equipped items unconditionally (`rank.ts:1022-1025`,
  `i < cap || equippedIds.has(e.itemId)`), so the stated constraint was
  unnecessary. The real constraint runs the other way: `contentHash` is computed
  at `rank.ts:723`, *before* the cap at `:1022`. Step 3's "inject after any
  candidate cap" would have placed injection after the hash, so cached rankings
  would collide across the change.

  **Root cause, and it is the orchestrator's.** The plan was authored to fix a
  scoring bug. The diagnosis was corrected to a prose bug at Gate A. The fix was
  kept without re-testing its justification — and all three grounds for rejecting
  the cheaper option fail against the code. Keeping a fix whose rationale has been
  withdrawn is the same error shape as the other three this session.

  **Decision: adopt the reviewer's one-file alternative.** Rewrite the
  `worn-unrankable` message in `plausibility.ts:196-203` to say what is true — the
  rows *were* scored against the worn item, which simply has no row of its own
  because it is not in the pool. No `contentHash` change, no `ENGINE_VERSION`
  bump, no union arm, no codegen, no widening of the Python-side
  `ITEM_SOURCE_KINDS` contract (F6), and the three committed shortlists become
  correct by **re-rendering rather than re-simming**.

  Not looping back to the planner: the remaining work is one function and its
  tests, and a fresh plan round would cost more than the change.

  F4/F5/F6/F7 are moot under the one-file fix (no new source kind, no re-sim).
  F8 checked and dismissed — no file under `docs/reviews/` cites these shortlists.
  F9 (stale base SHA in the plan header) and F10 (C15 citation off by ~100 lines)
  noted, no action. **F11 is live and matters**: the 256/257 worker is concurrently
  editing ticket 257, so commits here must not sweep it in.

- 2026-08-21 — **Paused at the owner's request, end of session.** Tip `3d09b34`,
  tree clean, nothing merged. A `gate-sme` seat was mid-run on the corrected
  reports; its handoff target is
  `.scratch/handoffs/sme-rank-judgment-stage2-recheck.md`. Resume instructions,
  including what to do if that file never appeared, are in `RESUME.md` beside
  this log. Nothing else is in flight.
