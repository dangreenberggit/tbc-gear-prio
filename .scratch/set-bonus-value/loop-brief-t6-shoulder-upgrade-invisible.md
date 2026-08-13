# Loop brief: why don't T6 shoulders surface as an upgrade?

Written 2026-08-10. Executor: a diagnostic loop agent on `feat/set-bonus-value`.
User-supplied ground truth (2026-08-10, wowsims web UI, current shredzepelin
gear): substituting T6 shoulders/chest/hands/legs for the worn pieces yields
**+97 DPS**. Upstream's P3 BiS list carries all four T6 pieces. So the
package is a real, sizable upgrade — T4 2pc is instantly worth replacing with
T6 4pc — yet our report shows T6 shoulders at **−74 DPS** under full
set-bonus weighting and never as an upgrade in any view.

## The question, precisely

Not "is the −74 arithmetically explainable" (it is: −106.16 single-swap delta
+ 31.46 2pc-only prospective credit; the single swap forfeits the
sim-measured 131 DPS Malorne 2pc, and post-ticket-90 the confounded 4pc
figure is suppressed from ranking). The question is: **what honest change
makes the report communicate the +97 package truth to a reader looking at
the shoulder row?** Today the truthful parts sum to a display that a real
player (and upstream's BiS list) contradicts.

## Loop shape — hypothesis → experiment → measure → revise, until settled

Each iteration: pick the smallest experiment that can falsify the current
hypothesis, run it (sims with the pinned wowsimcli v0.0.101, seeds
[11,22,33,44,55], 3000 iters; or artifact arithmetic; or a prototype render),
write the result to the loop log, revise. Keep a running log at
`.scratch/set-bonus-value/loop-log-t6-shoulders.md` — every entry: hypothesis,
command, result, verdict.

### Phase 1 — reproduce the user's number on our pipeline

1. Sim shredzepelin baseline vs baseline+all-four-T6 with our pinned binary
   (pattern: `.scratch/set-bonus-value/measure_set_bonus.py`, but on the
   character's actual gear from the rank artifact, not the reference set).
   Expect ≈ +97; record the actual figure and the gap to the user's. If it
   is far off (>±20), STOP and investigate the discrepancy first — buffs,
   consumables, fight settings, gems/enchants on substituted pieces.
2. Decompose: package delta, the four single-swap deltas, implied 4pc+2pc
   net, Malorne-break toll. Reconcile against the artifact's stored figures
   and the measured constants (T6 4pc 73.5, T6 2pc 30.5, Malorne 2pc 131.1).
   Every reconciliation line must close to within stated SE or be flagged.

### Phase 2 — locate exactly where the display loses the truth

3. Trace the shoulder row through the current code (post tickets 90/91/95/
   100): what credit is it eligible for in each view mode and why? Confirm
   the −74 derivation against the regenerated artifact, not the old one.
4. Enumerate the candidate honest fixes, at minimum:
   a. Full-credit view uses the **package** figure (packageDelta or measured
      net) on member rows when the package as a whole is positive — with the
      break already netted in (packageDelta includes it), avoiding the
      ticket-90 confound entirely (packageDelta is not the confounded
      quantity; only the derived bonus split is).
   b. Panel/row phrasing: keep per-row deltas but state "as part of the
      4-piece package: +X DPS net" on each member row, X from packageDelta.
   c. A dedicated "packages" section ranking whole packages against the
      cutoff (spec §7 deferred multi-item bundles — check whether the
      minimal disclosure version violates it or only full package-ranking
      does).
   Evaluate each against: spec.md constraints (§2.1 no per-piece split,
   §4 default-off credit, §7 bundles out of scope), ADR-0020 (cutoff is
   absolute), ADR-0023, PLAN.md:272 (disclosure over correction), and the
   ticket-90 rule (no confounded figure in a sort key).
5. Prototype the leading option (throwaway render off the regenerated
   artifact is fine) and check: does the shoulder row now tell the truth a
   wowsims user would recognize? Does any number in a sort key inherit the
   confound? Does the default view stay honest?

### Phase 3 — decide and deliver

6. Write up: the reproduced +97 (or the discrepancy), the reconciliation
   table, the chosen display design with spec/ADR compliance argued line by
   line, and either (a) an implementation on the branch (TDD, commit per
   slice, pnpm verify) if the fix stays within already-decided design space
   (disclosure-only changes qualify), or (b) a ticket + spec-amendment
   proposal if it requires relitigating a settled decision (per-row credit
   from packageDelta in the *sort key* likely does — spec §4 and ADR-0020
   territory; do not implement that without flagging).

## Ground rules

- AGENTS.md binds: TDD, durable-claims (every figure → re-runnable command),
  comment policy, no landing/merging/pushing. Commit only green slices.
- Sanity anchors: upstream BiS equips all four T6 pieces; the user's +97 is
  ground truth to reproduce, not to explain away. If our sim disagrees with
  the user's wowsims run, finding out why IS the work, not a reason to stop.
- Budget: sims are cheap here (a handful per iteration); prefer measuring
  over arguing. But do not fidget aimlessly — every run must be tied to a
  hypothesis in the log.
- Do not undo tickets 90/95/100/96's fixes; the goal is additive honesty.
