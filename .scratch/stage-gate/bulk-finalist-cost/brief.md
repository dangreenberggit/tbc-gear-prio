# Brief — ticket 403: stop paying for finalist refinement we discard

Opened 2026-09-15. Core `feat/desktop-transport-gate` @ `58d06b4bab1de45eca4bbe0fdcd4f691a2cfb342`.
Fork `vendor/tbc-new-fork` @ `e94d927af0ff7c31f071c961d1d7789980c8b8c9`. Both trees clean.

**Planning stage only this pass.** Produce `plan.md`. Do not implement.

## Goal

The desktop bulk-screening path spends 72.9% of its wall clock in the Go
engine's finalist refinement stage, producing statistics the client throws away.
Stop paying that cost without changing the ranking the tab produces.

Ticket: `.scratch/carry-forward/issues/403-bulk-screen-finalist-stage-burns-73pct-on-discarded-work.md`
Investigation it came from: `.scratch/carry-forward/issues/397-desktop-bulk-screen-not-a-speed-win.md`
(section "Investigation, 2026-09-15"), handoff at
`.scratch/handoffs/397-finalist-stage-cost-HANDOFF.md`.

Read all three before planning. Every number in them is cited by file and field;
re-open the artifact before relying on any of it.

## The mechanism, in one paragraph

Our fork's `bulk_request_builder.ts:115` sets `topResults: req.candidates.length`
— the full 25-candidate chunk. That value does two unrelated jobs in the Go
engine: it truncates the response (leave it at the default 5 and 20 of 25
candidates silently vanish from the results — the documented reason we override
it), and it sizes the finalist refinement stage, which then tries to separate
every adjacent pair of 25 near-tied gear sets at 95% confidence. It cannot, so it
exhausts its 3x extra-iteration budget every time: all 29 chunks exited at exactly
4.000x entry iterations with `Survivors: 25` of `Input: 25`. The client reads one
scalar per candidate (`rank.ts:1071`, `candObs.dps - candBaselineDps`) and
discards the rest.

## Constraints that bound the solution space

1. **The Go code is upstream's and byte-identical to `upstream/master`.** The
   finalist stage (`sim/core/bulk/stage.go`), the ungated call
   (`bulk_sim.go:186`) and the pairwise test (`statistics.go:130-142`) arrived in
   one upstream commit `b7bf678cd` (2026-09-01). `git diff upstream/master HEAD`
   is empty for all three. A Go change here creates divergence we carry across
   every future sync. Weigh that cost explicitly; do not treat Go and TS edits as
   equivalent.
2. **The file to change is in the fork, not this repo.** `bulk_request_builder.ts`
   lives in `vendor/tbc-new-fork`; `git ls-files | grep -c bulk_request_builder`
   in the core repo returns 0. Any fix is a **fork** change and goes through the
   fork queue: single shared working tree, strictly serial, never two agents at
   once. Confirm no other session holds it before planning fork edits.
3. **Owner's judgment, already given — treat as settled.** 25 candidates is out
   of the running. The stage might eventually be worth something at top-2 or
   similar if we ever want it, but for our use it is expensive and close to
   pointless, and it does not work correctly at our size class anyway. **"Make it
   converge at 25" is a non-goal.** Do not plan toward tuning the budget,
   loosening the confidence threshold, or otherwise making 25-way separation
   affordable.
4. **Reachable only via the HTTP/desktop transport.** `sim/wasm/main.go` imports
   `sim/core/bulk` but calls only `BulkCombinationCount`/`BulkCandidates`; the
   execution entry points are called only from `sim/web/bulk.go`. The WASM tab
   never pays this cost. A fix must not regress the WASM path, which is the
   default one users hit.
5. **Do not re-run the 3419 s full pool.** A capped run is the validation budget.

## Open questions — each needs three things

Per the stage-gate rule for decision-shaped work, every question below needs: a
candidate approach that is not the same approach with different constants; the
result that would make that candidate win, **written down before measuring**; and
a measurement, or the reason the committed fixtures cannot measure it. A
candidate the plan drops carries a stated reason.

**Q1. How do we separate the two meanings of `topResults`?** It must stay large
enough that the response returns all 25 rows, while the finalist stage stops
receiving 25. Name at least two genuinely different mechanisms — not two
different numbers. Candidates worth considering, not an exhaustive list: a
client-side change that avoids the coupling; a request field that controls the
two independently; declining to invoke the stage at all. For each: does it touch
Go (constraint 1) or only our TS, and what does it cost at the next upstream sync?

**Q2. What is the right finalist size for us, if any?** The owner's read is that
it is close to pointless for our use, possibly worth something at top-2. Decide
whether we want it at all, and say what the answer buys. If the recommendation is
"none", say what we lose — the stage's stated purpose is stopping near-tied
*displayed* results from reordering between seeds, which is a real requirement
the tab may or may not depend on. Establish whether the tab depends on it before
recommending its removal.

**Q3. How do we prove the fix changed no ranking?** The natural check is the
cap-20 pair: screening on vs off already produces byte-identical rows
(`smoke-3333-cap20.json` vs `smoke-3333-cap20-fallback.json`, 20 rows exactly
equal, same 8 above-cutoff items in order). Say precisely what to run, what to
compare, and what result would mean the fix is wrong. Respect constraint 5.

**Q4. Is an upstream report warranted, and what would it say?** Two upstream
defects surfaced alongside: the stage logs `Target error: 0.00%` from an unset
config field it never consults while its real stopping test is never logged
(`stage.go:24`, `stage.go:196`); and there is no test coverage of the finalist
stage at any size (no `_test.go` in `sim/core/bulk/` mentions it). Recommend
whether to file upstream, and draft what it would say. **Filing is the owner's
call — recommend, do not file.**

## Done when

`plan.md` exists, follows `.claude/skills/stage-gate/plan-template.md`, and:

- Q1–Q4 each carry a candidate, a pre-registered winning result, and a
  measurement or a stated reason the fixtures cannot measure it.
- The recommended change is named down to file and line, with the Go-vs-TS
  boundary and upstream-divergence cost stated for each option considered.
- A validation procedure exists that fits the capped budget of constraint 5.
- The Claims register marks which claims are measured and which are inferred.
  Claims inherited from 397 are **not** measured by this plan; cite them by
  file and field and mark them inherited.

## Research expectations

Do not take this brief's own summary on trust — it is a summary of a summary.
Send subagents to confirm code locations and to answer bounded questions whose
detail you will not reuse. In particular, confirm independently: that
`bulk_request_builder.ts:115` is still the only place we set `topResults` for the
upgrades path; what else reads the field; and whether the tab depends on stable
ordering of near-tied results (Q2). Cite file and line for anything load-bearing.
