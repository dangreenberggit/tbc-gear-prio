Status: closed
Type: task
Origin: code review of our fan-out vs upstream bulk_sim (2026-08-31)
Blocks: none
Blocked by: none

# PR-readiness cleanup pass across ALL our fork code

Group: `.scratch/upgrades-tab-sim-followups/README.md`

## What

Before the tab is offered upstream as a PR against wowsims' `master`
(`feature/backend-reforge` is gone: upstream merged it as PR #385), do a
cleanup pass over **all** our fork code, every file the fork added: the whole
`ui/features/upgrades/` subtree and the `ui/app/tabs/UpgradesTabBody*`
files, not just what one session touched. Remove what should not cross into
a wowsims PR and make our code a natural neighbour to theirs.

The code review verdict: our **code** fits wowsims' tree well (same primitives,
same structure, tight TypeScript). Our **comments** do not — they are 3-5x their
density and cite artifacts that do not exist in wowsims' repo.

## The themes to sweep for (fork-wide)

1. **Strip outer-repo references** — the big one. Our comments cite `ADR-00xx`,
   `PLAN.md §N`, `candidate-pool.md`, ticket numbers, `docs/...` paths. In our
   repo these are mandated (AGENTS.md durable-claims). In wowsims' repo they are
   **dangling pointers** to files that do not exist. Genericize or drop them: keep
   the load-bearing *reason* in a sentence, lose the repo-private citation
   ("derived from a five-seed spread experiment" not "PLAN.md §10 / ticket 335").
2. **Thin comments to wowsims' register** — theirs are 1-3 lines, mechanism-
   focused, present-tense (`ui/sim/wasm/bulk_sim/`). Our multi-paragraph
   why-essays read as a transplant. Keep the reason, cut the length. **Prose
   only — do not thin the code or collapse seams.**
3. **Weigh `async.queue` alignment** — wowsims already depends on the `async`
   library and uses `queue(handler, concurrency)` for bounded fan-out
   (`ui/sim/wasm/bulk_sim/batch.ts`, `runBulkSimCandidateBatchOnWorkers`).
   Our hand-rolled `promise-pool.ts` could fold onto it IF we can
   re-establish our two guarantees (result-at-index determinism,
   lowest-index-error) on top. Decide: fold (and re-point the determinism
   tests) or keep `promise-pool.ts` with a comment pointing at their
   `batch.ts` as the sibling. Ticket 342 measured both guarantees against
   their `batch.ts` — see
   `.scratch/stage-gate/342-learn-from-upstream/comparison.md` § "Concurrency
   (hand-off to 344)".
4. **Request-ID note** — the abort path keys on request ID; wowsims builds
   structurally unique ones for its bulk candidates
   (`${requestId}-${index}-${seedOffset}`, `batch.ts`
   `runSingleBulkSimCandidate`). Add structural uniqueness or note it in the
   PR.
5. **PR description content** — lead the PR with WHY we do not reuse their bulk
   sim (culling destroys the per-item delta our tab shows). This pre-empts the
   first maintainer objection. Belongs in the PR description, not a source comment.

## Do this LAST

Near PR time, after the substantive tickets settle. This is hygiene, not
logic; it touches no behaviour.

## Acceptance

- [x] No outer-repo citation (ADR/PLAN/ticket/`.md` path) remains in comments in
      code that ships in the PR.
- [x] Comment density in shipping files is in wowsims' register (spot-check
      against their bulk_sim files). Essays are gone; density is still above
      theirs. See § Comment density.
- [x] `async.queue` decision made and recorded (fold or keep-with-pointer).
- [x] Request-ID uniqueness addressed or noted.
- [x] PR description drafted with the no-reuse rationale up front. The
      draft is `/home/daniel/Code/lulz/tbc-gear-prio/.scratch/pr/upgrades-tab-pr-description.md`
      (main checkout, gitignored).

## Decisions

- **`async.queue`: keep `promise-pool.ts`.** This pass changes no
  behaviour, and a fold would have to rebuild both guarantees on `queue`
  and re-prove them. The file's header now names `batch.ts` as its sibling
  and says why it exists: results land at their task's index whatever the
  finish order, and the lowest-index error is the one reported, so the
  outcome does not depend on concurrency.
- **Request IDs: noted, not changed.** `WorkerPoolSimRunner.run` takes its
  ID from wowsims' own `generateRequestId` (`ui/sim/workers/worker_pool.ts`,
  four random 16-bit groups), the helper `Sim` uses for every raid sim
  (`ui/sim/sim.ts`). So the tab's collision risk is the site's own. A
  structural ID would change what each request carries, which this pass does
  not do. The PR description says so.
- **Test files:** citations removed from their comments, history cut
  lightly. Test names (`describe`/`it`/`test` strings) were left as they
  are; 28 still carry a ticket number or `ADR-0037`. Ticket 885 lists them.
- **String literals:** left as they are, since text is behaviour. Four in
  shipping code still cite this repo (`model/engine/se.ts` two error
  messages, `model/engine/disclosure.ts` two disclosure texts). Ticket 885.
- **Formatting:** upstream CI runs `npm run fmt` (`.github/workflows/run_tests.yml`).
  A second fork commit ran oxfmt over the 42 tab TypeScript files that
  failed it. 22 JSON data copies still fail; ticket 544.
- **Iteration caps to upstream's web limits** (finish-line plan Chunk 5
  step 4) was not done: it changes behaviour. Left to the owner; ticket 885.

## Comment density

Comment lines per code line, shipping files (tests excluded; a comment line
is a non-blank line starting with `//`, `/*` or `*`):

| Area | `1410a775e` | `5d688dd2a` | after the review fixes |
| --- | --- | --- | --- |
| `ui/features/upgrades` | 0.371 | 0.356 | 0.265 (3,146 comment lines) |
| `model/engine` | 0.360 | 0.362 | 0.274 (1,881) |
| `model` outside the engine | 0.571 | 0.506 | 0.328 (694) |
| `components` | 0.207 | 0.183 | 0.163 (249) |
| wowsims `ui/features/bulk` | | | 0.088 |
| wowsims `ui/sim/wasm/bulk_sim` | | | 0.107 |

The longest comment block went from 83 lines (`cap-profile.ts`) to 19
(`set-screen.ts`'s header); upstream's longest in `ui/features/bulk` is 14.
What is left is mostly one-line notes on fields and functions that state an
invariant or a reason. The engine's `code` count fell between the first two
columns because oxfmt's 160-column width joined lines.

## Closing note

Closed 2026-11-17 on `chore/344-pr-prep`. Fork commits `9a54b4e31` (comments)
and `5d688dd2a` (oxfmt), then the pre-merge review's fixes on 2026-11-18:
`c922f7efc` (stale comments); `9908e365b`, `654cbc1c1` and `20cfc07b5`
(comments thinned in the engine, the model, and the components and hooks);
`6b0acba94`, `ec3f885f3`, `bc266f387` and `e8de08ded` (the same areas,
reworded in plain English with coined terms replaced, after the owner's
2026-11-18 note on how comments should read).
All are on fork branch `chore/344-pr-prep`, pinned by this branch's
`data/wowsims-fork.lock.json`. None changes code: each
TypeScript file's AST equals the one at fork `1410a775e`, with comments,
quote style, trailing commas and parentheses ignored. E-W3 passed before
each round of engine hashes moved.

The finish-line plan's step 2 grep went from 26 files (18 when the plan was
written) to 3, none of them a comment:

```
grep -rln 'ADR-\|PLAN.md\|tbc-gear-prio' vendor/tbc-new-fork/ui/features/upgrades | wc -l
```

The three are the test name at `model/assumptions.test.ts:13` (`ADR-0037`)
and the string literals at `model/engine/disclosure.ts:113` and
`model/engine/se.ts:43` (`PLAN.md`). The plan's acceptance of 0 waits on
ticket 885's ruling on strings and test names.

Verified by: `docs/reviews/chore-344-pr-prep.md`
