# 406 — Bulk screening code is dead at runtime on both transports

Status: closed
Type: task
Origin: ticket 403's fix (Track C, 2026-09-16) — deliberately deferred there
Blocks: —
Blocked by: none

## What

Since 403 the upgrades tab takes the per-candidate loop on both transports, so
nothing at runtime constructs `BulkHttpSimRunner` or reaches the bulk screening
machinery. The code stays in the tree and still compiles, lints and passes its
tests. It is dead, not broken.

Dead at runtime, in the fork
(`vendor/tbc-new-fork/ui/core/components/individual_sim_ui/`):

- `upgrades/adapters/bulk_http_sim_runner.ts` — the runner itself. The class name
  is still *referenced* in `upgrades_tab.tsx` (the `data-runner` attribute's
  `instanceof` test at `:1208`, and two type positions), so it cannot simply be
  deleted without touching that file.
- `upgrades/adapters/bulk_request_builder.ts` — builds the `BulkSimRequest`.
- `upgrades/engine/bulk/partition.ts` — cuts candidates into 25-set chunks.
- the rest of `upgrades/engine/bulk/`.

**Six vitest files keep passing while testing code nothing reaches**, in
`vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades/engine/bulk/`:
`bulk-boundary`, `bulk-partition`, `bulk-screen-branch`, `bulk-screen-driver`,
`bulk-screen-fallback`, `bulk-screen-http-fixture` (all `*.test.ts`). Green and
dead is the worst combination to leave undocumented — it reads as coverage.

## Why it stays for now

Deleting it is a much larger fork diff than 403's two-file change, and it forecloses
a re-enable the owner may want if the underlying engine cost is ever fixed. 403
removed the runtime path deliberately and left the code, so this is a decision to
revisit, not an oversight to correct.

## What re-enabling would require

The blocker is **not** the RPC. It is that our builder must set `topResults` to
the candidate count or most rows silently vanish
(`wasm/bulk_sim/statistics.ts:104-111`), and on the Go server that same field
sizes the finalist stage — so the stage refines *every* candidate. Measured cost
at cap 40: 263 s screened against 19 s loop, with 174.5 s of the 263 s inside the
finalist stage. See 403.

A second cost sits behind it and is **untested**: the `high` stage is asked for
3,000 iterations and appears to deliver 16,599-19,686 per sim (from the per-sim
`Running N iterations` lines in the packaged server's stderr). If that adaptive
inflation is real, removing the finalist stage alone would still leave desktop
screening several times slower per candidate than the loop. Settle it by
capturing the packaged server's stderr during a screened run and reading those
lines — the previous capture was a one-time artifact and is not re-derivable.

**Adaptive-pass question, one line:** whether the `high` stage's iteration
inflation is a deliberate convergence target or an unintended floor is unanswered,
and upstream logs `Target error: 0.00%` from an unset field while its real
stopping test is never logged (`sim/core/bulk/stage.go:24`,
`statistics.go:130-142`).

## Done when

The owner has decided delete-or-keep. If delete: the six test files go with the
code, and `upgrades_tab.tsx`'s `data-runner` attribute needs a different way to
report the runner. If keep: the six tests get a comment saying what they cover is
unreachable, so the next reader is not misled by green.

## Resolution

**Keep — recommended by an agent, not ruled on by the owner.** 2026-09-16.
Nothing was deleted and nothing was re-enabled; the bulk path stays switched off
at `makeSimRunner(bulk = false)` and the code stays in both trees.

**This recommendation is rebuttable, and three things weaken it.**

1. The first pass at this ticket was told to plan the keep branch only. It never
   weighed deletion, so its plan is evidence about *how* to keep, not about
   whether to.
2. The session argued for a while that the code lost on merit, citing 263 s
   against 19 s. That figure is ticket 403's finalist-stage defect — the Go
   engine refining every candidate because our builder sets `topResults` to the
   chunk size — not a measurement of the batching route. At matched accuracy
   ticket 346 measured the route cheaper (`grep -n 'R_wall_s' .scratch/carry-forward/issues/346-*.md`).
   The merit argument on both sides of this ticket has been shaky.
3. A second pass, briefed with deletion as the live option, still recommended
   keep — mainly on the cost of deleting, because `screenCandidates` and
   `composeForBulk` sit in `engine/rank.ts` and `runBulkScreen` in
   `engine/seams/sim-runner.ts`, both PROVENANCE-tracked
   (`grep -n 'screenCandidates' vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades/engine/rank.ts`).
   But PROVENANCE describes the bulk parts as "fork-only, no core ancestor," and
   **nobody established whether removing a fork-only addition from a ported file
   is actually risky or merely tedious.** Untested. That question decides how
   much the cost argument is worth.

The case for deleting, stated fairly: this code has produced ten tickets in two
weeks, ticket 375 is still open, and git keeps every line if it is ever wanted
back.

**What would settle it:** whether the owner intends to build ticket 346's
streaming precondition. If yes, this is parked work. If no, it is dead weight and
deleting is the honest answer.

What landed:

- The six test files each gained a "Dead code cover" paragraph in their header
  comment, same wording in all six so one grep finds them all —
  tbc-gear-prio commit `68362b01f71b6922002868d6f6f10bd95238c1bb`.
- `partition.ts`'s comment above `MAX_CANDIDATES_PER_BULK_REQUEST` gained the
  same caveat as its leading paragraph — fork commit
  `633169c7f4e835540f3041b7e4bb407218bffc5b` on `feat/upgrades-tab`, not pushed.

**Correction to the What section above.** It says the six test files live in the
fork's `upgrades/engine/bulk/`. They do not. They are tracked files in
tbc-gear-prio at `packages/core/test/bulk-*.test.ts`; the fork's `engine/bulk/`
holds only `partition.ts`. Measured with `git ls-files packages/core/test` and
`find vendor/tbc-new-fork -name 'bulk-*.test.ts' -not -path '*/node_modules/*'`,
which returns nothing. The original text is left as written.

Trimming the `partition.ts` comment is ticket 410's job, not this one's. The
caveat paragraph added here is the part any trim must keep.

**Who wrote what.** The owner asked only that the keep call be recorded as an
agent's recommendation rather than their decision. The three weakening points
above — the steered first pass, the shaky merit argument, the untested risk
question — were chosen and written by the orchestrating session, not by the
owner. The section below is the second planner's own assessment, pasted
unedited.

## Planner comment

Written 2026-09-17 by the second planner seat (Fable). This is a planning
agent's assessment, not an owner ruling. The owner has not decided delete-or-keep.

I recommended keep. The one reason I still stand behind: tickets 346 and 403
both record a path back to this code, and deleting reverses those two decisions
with no new evidence (`grep -n 'Precondition for revisiting\|remains constructible' .scratch/carry-forward/issues/346-*.md`; `grep -n 'stay in the tree' .scratch/carry-forward/issues/403-*.md`).

Two of my reasons are weaker than I wrote them, and the reviewer's findings on
both are fair. First, I called 263 s vs 19 s "a defect, not the route." That
rests on 403's diagnosis, and 403 is `Status: open` (`sed -n 3p .scratch/carry-forward/issues/403-*.md`): the fix is described, not built or measured. Until it
is, "the route is fine" is a hypothesis. Second, my headline reason was that
deleting is engine surgery with live-path regression risk. I asserted that from
the PROVENANCE rows; I never measured it. Untested. It may be tedious rather
than risky, and if so my cost argument mostly falls away.

The measurement that settles the cost question: do the delete on a throwaway
fork branch, then run `pnpm verify; echo "rc=$?"` and the desktop gate
(`python scripts/check_desktop_tab.py`, compared against
`data/desktop-gate/golden-ret-p5-cap40.json`). Report `git -C vendor/tbc-new-fork diff --stat`
and whether both gates stay green. Green with no golden diff means the cost is
a diff size, not a risk, and delete should be re-weighed on that basis.
