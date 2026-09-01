Status: open
Type: task
Origin: code review of our fan-out vs upstream bulk_sim (2026-08-31)
Blocks: none
Blocked by: none

# PR-readiness cleanup pass across ALL our fork code

Group: `.scratch/upgrades-tab-sim-followups/README.md`

## What

Before the tab is PR'd into wowsims' `feature/backend-reforge`, do a cleanup pass
over **all** our fork code (the whole `upgrades/` subtree + `upgrades_tab.tsx`,
not just what this session touched) to remove things that should not cross into a
wowsims PR and to make our code a natural neighbor to theirs. This applies the
code review's themes fork-wide.

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
   focused, present-tense. Our multi-paragraph why-essays read as a transplant.
   Keep the reason, cut the length. **Prose only — do not thin the code or
   collapse seams.**
3. **Weigh `async.queue` alignment** — wowsims already depends on the `async`
   library and uses `queue(handler, concurrency)` for bounded fan-out
   (`vendor/tbc-new-fork/ui/core/wasm/bulk_sim/batch.ts:101-136`). Our hand-rolled
   `promise-pool.ts` could fold onto it, deleting ~70 lines a maintainer must
   review — IF we can re-establish our two guarantees (result-at-index
   determinism, lowest-index-error) on top. Decide: fold (and re-point the
   determinism tests) or keep `promise-pool.ts` with a comment pointing at their
   `batch.ts` as the sibling. Coordinate with ticket 342 (overlaps).
4. **Request-ID note** — we generate request IDs with randomness where wowsims
   builds structurally-unique ones (`requestId-index-seed`, `batch.ts:67`). Tiny
   collision risk today, but the abort path keys on request ID. Add structural
   uniqueness or note it in the PR.
5. **PR description content** — lead the PR with WHY we do not reuse their bulk
   sim (culling destroys the per-item delta our tab shows). This pre-empts the
   first maintainer objection. Belongs in the PR description, not a source comment.

## Do this LAST

Near PR time, after the substantive tickets (339-343) settle — no point cleaning
comments on code that is about to change. This is hygiene, not logic; it touches
no behavior.

## Acceptance

- [ ] No outer-repo citation (ADR/PLAN/ticket/`.md` path) remains in comments in
      code that ships in the PR.
- [ ] Comment density in shipping files is in wowsims' register (spot-check
      against their bulk_sim files).
- [ ] `async.queue` decision made and recorded (fold or keep-with-pointer).
- [ ] Request-ID uniqueness addressed or noted.
- [ ] PR description drafted with the no-reuse rationale up front.
