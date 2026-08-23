# Pre-merge review — feat/finish-the-tab

Reviewed range: `10dbb3813d7cbb4be94ca1bd006b95f45a45be15..07dd1e15788c5c1c589b1370232e8e0643c3547a`

Dispatch, 2026-08-23: adversarial, domain, standards, spec — four fresh Opus
subagents (review lane), one parallel batch; `codex` not on `PATH`. Each axis
was told it writes nothing and runs no tree-changing git command.

The change spans two repositories. This repo's range above carries the
stage-gate artifacts, tickets, verification log, lockfile re-pins and one
parity-test deletion. The tab code lives in the gitignored fork clone
`vendor/tbc-new-fork` (branch `feat/upgrades-tab`), range
`f359239..8bb02b028` at dispatch, reviewed with `git -C vendor/tbc-new-fork
diff -w` because one commit is a CRLF→LF normalisation. Fixes from this round
landed after dispatch in `e41ef1c..94b7381` here and `a142bed2e..cfcdd7ea1` in
the fork; `data/wowsims-fork.lock.json` points at `cfcdd7ea1`.

## Adversarial

No correctness bug survived. Cleared under scrutiny, each with the line read:
the ranking cache key hashes `candidates: ordered`, so a pruned pool and a full
pool cannot collide (`rank.ts:510`); the frozen literals are exactly
`fullPool: true, screenIterations: null, promoteTopK: null` and `promoteTopJ`
is absent; `eligibleCount` and `run()` both call `effectivePool` before
`filterPoolByPhase` — same filter, same side; racing removal leaves no reader
of `screened`/`promoted`/`screenIterations`/`fullPool` outside the frozen
literals and comments; `belowCutoffCount = rows.length - shortlist.length` is
correct because the cutoff verdict is per row; slot panes render from
`unfilteredView()`, so the filter empties panes rather than deleting them; the
teardown guard `pane?.parentElement === this.tabContentElem` is right; listeners
bind once in the constructor; `hasRankableSetPotential` is semantically
identical to `view.ts`'s `rankableSetPotential` + `setPotentialIsConfounded`;
the deleted parity case covered only the fork's screening compose site, which
is itself deleted (`pnpm test packages/core/test/wowsims-fork-parity.test.ts`
→ 1 passed, 1 skipped).

- **A1 (medium as filed, withdrawn — see Disposition).** `effectivePool`
  filters the pool upstream of the engine's owned-row rescue, so a worn item
  with no BiS tag has no row in a pruned ranking; the drawer line named the
  pool but not that.
- **A2 (low, docs).** `engine/PROVENANCE.md`'s non-ancestor claim
  (`git merge-base --is-ancestor 28b00f9 … # exit 1`) is measured against one
  ref. Re-runnable, so disclosure rather than fabrication.

Unexamined: `upgrades_tab.tsx` table renderers beyond the control/render/
teardown paths; `translation.json`, `engine_provenance.ts`, lockfile and
`sim-implemented-effects.json` re-pins; runtime behaviour in a browser;
`measurements.md` numbers were grepped for unsourced causal claims, not
re-derived.

## Domain

- **D1 (minor).** "on a BIS list" overstates `bisTags`: `assemble_universe.py:1815`
  only ever writes `["BiS"]`, phase-scoped to `maxPhase`; no `Alt`/`Realistic`
  value exists in any universe. Membership is never overstated; breadth is.
- **D2.** Same observation as A1, from the game side: the pruned drawer string
  named the pool, not the consequence. STATUS Q7 had stated the consequence
  in the reviewers' framing.
- **D3 (clean).** Set-bonus toggle is a faithful port: `setPotentialIsConfounded`
  and `rankableSetPotential` are identical in body to core's
  `packages/core/src/set-potential.ts` and `view.ts:268-293`; ticket 90's
  confound guard intact; the label matches what is credited.
- **D4 (clean).** Frozen cache-key payload is byte-identical to what the fork
  wrote at `f359239` for `fullPool: true` (`rank.ts:612-614` there →
  `true / null / null`); `promoteTopJ` never appeared in the fork's payload
  (`git log -S"promoteTopJ"` hits only the removal commit).
- **D5.** The ret baseline 1775.0 DPS (`slamaltman` fixture via share link,
  3,000 iterations) is 13% below the 2042.85 DPS this repo recorded for the
  same fixture at the same iteration count (`docs/stage0-findings.md` §11,
  verification-log line ~219), and neither the log entry nor `measurements.md`
  mentioned the earlier figure. Candidate causes: `toIndividualSimSettings`
  carrying a different encounter/buff set than the raid-sim request; the page
  persisting 16 item ids where the entry said 17.
- **D6.** The feral cell ran the fork's default feral APL because the owner's
  rotation was stripped (`timeToNextEnergyTick` unknown to the pinned proto,
  17 APL instances); every feral figure (61 s, 395 s, "no rankable set
  potential") inherits that, and the entry said only "the page supplies its
  own rotation".
- **D7 (clean).** No contradiction of `docs/stage0-findings.md` elsewhere;
  no new WCL field usage; phase still comes from upstream `CURRENT_PHASE` via
  `getPhase()`; "every spec/phase carries BIS tags" is true of shipped data
  (16/16/16/16 ret-p2..p5, 17/17 feral-p2/p3).

Unverified, recorded honestly in the entry: the 7.8 s/sim vs ticket 156's
3.8 s/sim, and the 17% ret prune-off spread (866 s / 1017 s).

## Standards + Spec

### Standards

- **S1 (hard).** Tickets 272 and 273 carried commentary on the `Type:` line
  (`docs/agents/issue-tracker.md:29-44`: commentary goes in the body). The
  same pattern exists on 156, 199, 200, 205, 206, 217 from earlier branches.
- **S2 (hard).** Ticket 156's `Blocked by:` was a four-line narrative, not a
  dependency list (`issue-tracker.md:55-64`).
- **S3 (hard, systemic).** Commit bodies wrapped at 73–76 columns: 25
  over-length lines in this repo's range, 47 in the fork's (rule 6 of the
  seven; measured with `git log --format='%h%n%b' … | awk 'length($0)>72'`).
  Subjects all ≤54 chars, imperative, capitalised, no period.
- **S4 (judgement — Data Clump / Duplicated Code).** `upgrades_tab.tsx` gained
  three toggle+label field pairs, three refs, and two `refresh*Visibility`
  methods that differ only in their predicate; `(bisTags?.length ?? 0) > 0`
  appears in four places.
- **S5 (judgement, flagged not wrong).** `unfilteredView()` casts state to
  the `done` variant; the commit message argues the trade deliberately.
- Durable claims: clean across the log entry, STATUS, 272, 273 and the stage
  artifacts — every causal claim carries a command or a hedge; the C22
  refutation names the premise it accepts and the inference it rejects.
  Comment policy clean (all _why_). Both trees clean.

### Spec

Verdict: **satisfied.** Every "Done means" bullet of both briefs checks out:
dated verification-log entry per goal line, single `STATUS-2026-08-23.md`,
156/199 closed, 205/206 closed as moot, 201 annotated, lockfile at the fork
tip, fork tree clean and builds. No scope creep: out-of-manifest paths are
all pre-dispositioned in the decision log; no weighted set-bonus variant, new
spec, or spec registry; the Step 3 shape rule for a future three-state control
is honoured. Hide rules correct (`setPruneAvailable` forces the box off while
hidden and decides on the unpruned pool); cache-key literals right;
parity-test commit ordering right (`eaaae45` → fork → `a381482`).

- **P1 (partial, ticketed).** Q1's candidate (a) was never measured — the
  racing archive would not apply share-link gear; Q1 fell to full sweep by
  the pre-stated rule. Ticket 273.
- **P2 (protocol deviation, disclosed).** Ret prune-off ran twice with a 17%
  spread against Step 9's "<10% → add a run and average" rule; recorded, not
  averaged.
- **P3.** Same as A1/D2.
- **P4 (observation).** Step 4 shipped broken and was caught by the browser
  observation, not by the static acceptance grep — Steps 1–5's commit-time
  acceptance was static by design.

## Summary

Twenty findings across four axes; **no blockers** and no correctness bug in
the new code. The one finding three axes converged on — "the prune drops
worn gear" — was mis-framed and is withdrawn: the baseline is always the
worn gear read from the page and every delta is relative to it; the prune
only removes the greyed "already have it" row for a worn item that is not on
the BiS list, which is what "BiS-list items only" means. The owner caught
this; the fixes scrub the framing from the drawer string, a code comment,
and STATUS rather than adding a warning. The findings that mattered are
documentary: the ret baseline is 13% below the figure this repo already
holds for the same fixture and the entry now says so (ticket 274); the feral
cell ran a substituted rotation and the entry now says so plainly. Ticket
headers fixed; two tickets filed; this round's six commits wrap at 72.

`pnpm merge-to-dev --check-only` result is recorded in the map line.

## Disposition

| ID  | Axis        | Disposition | Ticket / note                                                                                                                                                                                                                                                                                                                                        |
| --- | ----------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | Adversarial | wontfix     | Withdrawn: mis-framed. Baseline is the worn gear (`readGear`), deltas are relative to it; the prune only omits the greyed worn row for an untagged item. Drawer string set to the plain fact `BiS-list items for this phase` (fork `cfcdd7ea1`); the alarming wording that briefly landed in `a142bed2e` and the `effectivePool` comment is removed. |
| A2  | Adversarial | wontfix     | The claim names the only ref in question and its command is re-runnable; one-sided because there is one side.                                                                                                                                                                                                                                        |
| D1  | Domain      | fixed       | Control label now `Sim only BiS-list items (this phase)` (fork `a142bed2e`).                                                                                                                                                                                                                                                                         |
| D2  | Domain      | wontfix     | Same as A1; STATUS Q7 reworded in `94b7381`.                                                                                                                                                                                                                                                                                                         |
| D3  | Domain      | —           | Clean.                                                                                                                                                                                                                                                                                                                                               |
| D4  | Domain      | —           | Clean.                                                                                                                                                                                                                                                                                                                                               |
| D5  | Domain      | fixed       | Log entry and STATUS state the ret baseline is unreconciled (1775.0 vs 2042.85 DPS), name both candidate causes and point at ticket 274 (`bf7c977`, `94b7381`). Investigation deferred: `.scratch/carry-forward/issues/274-ret-share-link-baseline-below-recorded-fixture.md`.                                                                       |
| D6  | Domain      | fixed       | Entry and STATUS state plainly that every feral figure inherits the fork's default APL (`bf7c977`, `94b7381`).                                                                                                                                                                                                                                       |
| D7  | Domain      | —           | Clean.                                                                                                                                                                                                                                                                                                                                               |
| S1  | Standards   | fixed       | 272/273 `Type:` lines are bare words (`773b4a5`). Earlier tickets with the same pattern are outside this branch's range; not touched.                                                                                                                                                                                                                |
| S2  | Standards   | fixed       | 156 `Blocked by: none`, narrative in the body (`773b4a5`).                                                                                                                                                                                                                                                                                           |
| S3  | Standards   | wontfix     | History on both branches is not rewritten for wrapping; this round's six commits wrap at 72 (0 over-length lines).                                                                                                                                                                                                                                   |
| S4  | Standards   | defer       | `.scratch/carry-forward/issues/275-upgrades-tab-toggle-controls-repeat-one-shape.md` — tranche-2 UI pass.                                                                                                                                                                                                                                            |
| S5  | Standards   | wontfix     | Deliberate trade, argued in the commit message; the cast is guarded by every caller.                                                                                                                                                                                                                                                                 |
| P1  | Spec        | defer       | `.scratch/carry-forward/issues/273-racing-cell-unmeasured-q1-decided-by-rule.md` (filed during execution).                                                                                                                                                                                                                                           |
| P2  | Spec        | wontfix     | Disclosed in the entry as recorded-not-averaged; the goal line is judged on the prune-on cells, which did not need the rule.                                                                                                                                                                                                                         |
| P3  | Spec        | wontfix     | Same as A1.                                                                                                                                                                                                                                                                                                                                          |
| P4  | Spec        | wontfix     | Observation about the plan's acceptance design; the browser observation step caught it and the fix is in.                                                                                                                                                                                                                                            |
