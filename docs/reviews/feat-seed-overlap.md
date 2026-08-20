# Pre-merge review — feat/seed-overlap

Reviewed range: `3d64d1f877b5603957321eaec3ae4aa4a0461918..1c114722853812d83e582a518d4efd489422e9a5`

**Scope note.** This branch was cut from an old `main`, and `main..dev` is 653
commits: `git cherry dev HEAD` lists ~165 commits absent from `dev`, essentially
the whole candidate-pool epic, ending with this ticket's four. A `dev...HEAD`
diff would therefore have sent reviewers ~36,000 lines of other sessions' work
that this session neither wrote nor can speak for. The review was scoped to the
four commits of ticket 232 (`3d64d1f..HEAD`, 16 files, +436/−48). **The
candidate-pool commits between `dev` and `3d64d1f` are not gated by this file**
— `docs/reviews/feat-candidate-pool.md` covers part of that range; whether the
remainder is reviewed is a separate question and a blocker for any merge of this
branch into `dev`.

**Dispatch.** `codex` was not on `PATH`, so all four axes ran as fresh subagents
on the review lane (Opus), each with the diff and its own brief and no access to
the authoring session. Adversarial and Domain used `.agents/reviews/*.md`;
Standards and Spec came from the `code-review` skill. `node_modules` and
`vendor/` were absent at dispatch, so every reviewer worked by reading and said
so; findings needing execution are marked below.

---

## Adversarial

Three defects, two of them mine to fix and one latent.

**A1 — default seeds frozen against `DEFAULT_ITERATIONS`.** Raised
independently by Spec (S3) and the more serious of the two. See S3.

**A2 — `BASELINE_BY_SEED` was not re-spaced.** `rank.test.ts` kept
`{11,22,33,44,55}` as its baseline map while `SEEDS` moved to
`[11,3011,6011,9011,12011]`, so four of five lookups fell through `?? 2000` and
the per-seed baseline wobble the fixture exists to create was gone — baseline
flat at 2000 except for seed 11. Two tests degraded: "does not spend replication
on below-cutoff rows" and the ticket-39 crossing test. The reviewer noted this is
exactly the failure the fixture's own comment warns about, since a pairing bug
hides behind a seed-independent baseline. The preceding commit's claim that only
seed _values_ changed was true of `NECK_GAIN_BY_SEED` (deltas 40/44/26/50/20,
mean 36, SE 5.6214 — verified unchanged) and **wrong** about this map.

**A3 — `wowsims-fork-parity.test.ts` passed `SEEDS = [11, 22]`** at 3,000
iterations, which the new guard rejects with `RankError("internal")`. The suite
is `skipIf`-gated on a `vendor/tbc-new-fork` checkout that is absent here, so it
stayed green locally while being broken for anyone with the fork present. Fixed
by reading; **this checkout cannot run that suite**, so the fix is unverified by
execution.

**A4 — spacing predicate otherwise sound.** `gap >= iterations` is the correct
boundary (a run from `S` consumes `S..S+N-1`, so `S+N` is the first clean seed);
sorting handles unsorted input; duplicates are caught by the earlier pass.
`iterations <= 0` makes every gap pass, but no caller supplies it.

Not test theatre: the new `se.test.ts` cases assert at the public boundary and
use literal expectations rather than recomputing `base + k*iterations`.

## Domain

**Every upstream citation verified accurate** against the main-repo checkout of
`vendor/tbc-new-fork`: `sim.go:248-251` is `reseedRands` doing
`rseed := sim.Options.RandomSeed + i`; `sim.go:347-348` is the per-iteration call
site; `sim_concurrent.go:39-40` is the corroboration, offsetting each split by
exactly the iteration count. The mechanism and its consequence hold.

**The "what survives" claim in the verification-log correction is correct.** The
reported-SE column is `stdev/√n` computed by the sim from its own within-run
iteration variance, per run; it never touched the across-seed spread. The 1.678
figure and `max(3.0, 2 × 1.678) → 3.4` are untouched by the overlap. The
bit-identical shared arm is likewise unaffected — total overlap is what that arm
was testing. The retraction is correctly scoped to the 0.099 spread alone.

**The ADR-0021 flag characterises that ADR's reasoning correctly.** Its decision
(`max` across methods) is argued from which scale each row was measured on, not
from any ratio; the ~139× appears only as descriptive framing. Widening the
paired SE toward independent shrinks the gap but cannot invert it, so `max`
still selects the independent side. Flagging rather than re-deriving is the
honest call, since the numbers came from a gitignored `.scratch/` run.

**D1 — stale claim left behind (fixed).** `PLAN.md:717` still read "observed
max−min of five independent-seed means is only **0.099 DPS**" — the exact
sentence the verification log now retracts, in the section both ADR-0020 and
ADR-0021 cite as the cutoff's provenance. A reader of PLAN.md alone still got
the refuted conclusion. Now annotated with a pointer to the correction.

No contradiction of any brief fact (slot mapping, `permanentEnchant`, meta gems,
race, spec plurality, `currentPhase`) — this diff touches none of them.

## Standards + Spec

### Standards

**T1 — `replicateSeeds` missing from the package barrel (fixed).**
`index.ts` exported `assertUsableSeeds` but not `replicateSeeds`, so an external
caller met the tightened guard with no exported way to construct seeds that pass
it — the error names the rule while the helper implementing it stayed
package-private.

**T2 — durable-claims: vendor prerequisites unstated (fixed).** `AGENTS.md`
requires that a committed artifact never assert a gitignored input is present
for a fresh worktree without giving the regen command. The handoff and the
source docblocks cited `sim/core/sim.go:248-251` bare — unresolvable from the
repo root — and cited the probe without saying `vendor/` must be fetched first.
Now full paths plus `pnpm fetch:wowsimcli` / `pnpm sync:wowsims:restore`.

**T3 — judgement calls, not taken.** `DEFAULT_SEED_BASE` / `DEFAULT_SEED_COUNT`
flagged as Speculative Generality (single-use constants filling two arguments of
the call below them); kept, because they name the two quantities the docblock
explains and `DEFAULT_SEED_BASE` is also the single-seed fallback. The optional
`iterations` parameter was judged a necessary seam rather than speculative — a
caller without an iteration count cannot evaluate the rule, so `undefined` is a
real domain state. The reviewer fairly noted the commit's "callers that cannot
know it" describes a constituency the codebase does not yet contain.

**T4 — three of four commit subjects exceed 50 characters** (57/55/52). Noted;
all other cbea.ms rules hold.

### Spec

**S1 — acceptance box 2 was ticked on a substituted arm (fixed).** The box asked
for `sampleSd/SE` near 1.0 at the shipped iteration count. `DEFAULT_SEEDS` ships
**five** seeds, whose 1× arms measured 0.520/0.520/0.708/0.623 — not near 1.0.
The 0.895 quoted came from a 20-seed arm that is not the shipped configuration.
The reviewer's point stands: the author's own text concedes the estimator cannot
resolve this at n=5, which makes the box **unsatisfiable as written**, not
satisfied. Demoted to `[~]` and restated.

**S2 — acceptance box 3 was reworded to fit weaker evidence (fixed).** The
original step 3 said "Re-derive the paired-replicate SE evidence"; only the
verification-log _narrative_ was corrected, and ADR-0021's table was annotated as
"understated by an unknown factor" rather than recomputed. Demoted to `[~]` with
the gap named and carried on ticket 233.

**S3 — `DEFAULT_SEEDS` frozen at module load (fixed; the one blocking defect).**
`rankUpgrades` resolves `iterations` from the input but the defaults were built
against `DEFAULT_ITERATIONS`, so `iterations: 5000` with default seeds produced
seeds 3,000 apart — under-spaced — and **threw `RankError("internal")` on a
previously-working call**. This re-created the very drift the ticket names.
Seeds now derive from the resolved iteration count, with a regression test that
fails against the frozen version with the predicted error and passes against the
fix. This also bit ticket 233 directly, whose mechanism runs 1,000-iteration
increments.

**S4 — stale reference missed in the renumbering (fixed).**
`.scratch/handoffs/ticket-227-healer-noise.md:375` still said "ticket 233",
meaning the effects-classifier ticket, now 237.

**Scope creep:** none material. The renumbering was forced by the collision, and
closing ticket 236 is justified by cited evidence rather than assertion.

## Summary

Adversarial 3 defects (2 fixed, 1 fixed-but-unrunnable-here); Domain 1 stale
claim, all citations verified; Standards 2 fixed + 2 notes; Spec 4 findings, all
fixed. Worst per axis: Adversarial A2 (a fixture map left half-migrated, quietly
weakening two tests); Domain D1 (retracted conclusion still live in PLAN.md);
Standards T1 (guard shipped without its helper); Spec S3 (the seed fix
re-created the drift it set out to remove, and turned a valid call into an
error).

The common thread is worth recording: **this change's own failure mode was
partial migration** — seeds moved in one place and not the paired map, the guard
tightened without its helper exported, the defaults derived at the wrong moment.
Four axes with no memory of writing the code caught all of it; the authoring
session had run `pnpm verify` green over three of the four.

`pnpm verify` green at 834 tests after the fixes.

**`pnpm merge-to-dev --check-only` is NOT green**, for a reason outside this
branch: ticket 228 carries a prose `Status:` line that
`scripts/check_merge_ready.py` cannot parse, so the gate refuses every branch,
not just this one. Filed as
[`238`](../../.scratch/carry-forward/issues/238-ticket-228-status-blocks-the-merge-gate.md).
The gate did find this review file and did run `pnpm verify` green before
failing on 228.

## Disposition

| ID    | Axis               | Disposition | Ticket / note                                                                                                  |
| ----- | ------------------ | ----------- | -------------------------------------------------------------------------------------------------------------- |
| A1/S3 | Adversarial + Spec | fixed       | Defaults derive from resolved `iterations`; regression test proven red against the bug                         |
| A2    | Adversarial        | fixed       | `BASELINE_BY_SEED` re-spaced to match `SEEDS`                                                                  |
| A3    | Adversarial        | fixed       | Parity-test seeds spaced by `ITERATIONS`; **unverified by execution** — needs a `vendor/tbc-new-fork` checkout |
| A4    | Adversarial        | wontfix     | `iterations <= 0` disables spacing; no caller supplies it                                                      |
| D1    | Domain             | fixed       | `PLAN.md:717` points at the verification-log correction                                                        |
| T1    | Standards          | fixed       | `replicateSeeds` exported from `index.ts`                                                                      |
| T2    | Standards          | fixed       | Full vendor paths + sync commands on all durable claims                                                        |
| T3    | Standards          | wontfix     | Constants keep their names; optional `iterations` is a deliberate seam                                         |
| T4    | Standards          | wontfix     | Three commit subjects over 50 chars; not worth a rewrite of landed history                                     |
| S1    | Spec               | fixed       | Box demoted to `[~]`: unmeasurable at the shipped n=5, shown at n=20                                           |
| S2    | Spec               | defer       | Paired SE not re-derived; carried on `.scratch/carry-forward/issues/233-adaptive-ci-screening-design.md`       |
| S4    | Spec               | fixed       | `ticket-227-healer-noise.md` renumber reference corrected                                                      |
