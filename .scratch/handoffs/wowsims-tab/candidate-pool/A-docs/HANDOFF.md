## Status
success

## Branch
slice-a-m0-docs

## Base
- spawned at `9ae92a324be891367398c8657b78b506903928ad` · expected `9ae92a324be891367398c8657b78b506903928ad` · corrected: yes

Note on the correction: this worktree's checked-out branch
(`worktree-agent-a94a2744cf655f16f`) was at a different commit
(`55b5a51db1516d349a209ea2831bb5b1f8a28265`) that does not contain
`docs/plans/wowsims-tab/` at all. The named base SHA existed in the repo's
object store (already fetched), so per the handoff-template rule I ran
`git checkout -b slice-a-m0-docs 9ae92a324be891367398c8657b78b506903928ad`
and worked from there. `plan.md`, the ticket, and the ADR read as described
in the prompt once on the correct base.

## What I did
- `docs/plans/wowsims-tab/plan.md`: replaced every "prefilter" claim with
  what the engine does (F1: `filterPoolByPhase` + Kael temp-legendary
  exclusion only, no EP selection — `packages/core/src/rank.ts:576-582`).
  Fixed 6 sites:
  - §2.5 EP weights bullet (was: "feed the prefilter and gem fill only")
  - §5 step 2 (was: "player-aware EP prefilter")
  - §5 budget note (was: "~80 candidates after the prefilter" — replaced
    with F2's real per-phase eligible counts: p1 155, p2 246, p3 390,
    p4 437, p5 518, and a pointer to `candidate-pool.md` §1.1's cost model)
  - §7 ret-p3 EP weights note (was: "EP gates the prefilter and gem fill")
  - §10 Risks table, "Browser run too slow" row (was: "prefilter and
    iteration control are the knobs")
  - §12 "Role is prefilter and gem fill only" bullet, and its follow-on
    sentence about what the assumptions drawer names
  - All edits point to `candidate-pool.md` (§4/§1.1) rather than restating
    its content, per the durable-claims and single-source-of-truth rules.
- `.scratch/carry-forward/issues/162-upgrades-tab-ignores-user-set-ep-weights.md`:
  appended a dated "2026-08-15 — correction" comment at the end (did not
  rewrite the resolved historical record) noting that the opening
  paragraph's "prefilters" / "candidate *selection*" language is wrong,
  with the same `rank.ts:576-582` citation and a pointer to
  `candidate-pool.md` §4.
- `docs/adr/0018-no-rank-time-ep-prefilter-so-no-fullpool-flag.md`: added a
  **See also** line in the header pointing to `candidate-pool.md`. Did
  **not** add "Superseded-in-part" — per the prompt, that's contingent on
  M2 shipping, which is undecided.
- Reviewed the diff against the `writing-for-agents` skill before
  committing: corrections are terse, cite `file:line`, point to
  `candidate-pool.md` instead of duplicating its cost-model content, no
  new sprawl.

## Paths touched
- `docs/plans/wowsims-tab/plan.md`
- `.scratch/carry-forward/issues/162-upgrades-tab-ignores-user-set-ep-weights.md`
- `docs/adr/0018-no-rank-time-ep-prefilter-so-no-fullpool-flag.md`

## Verification
- `grep -n "prefilter" docs/plans/wowsims-tab/plan.md` → 6 lines remain, all
  of them either say the prefilter does not exist or point to
  `candidate-pool.md`:
  ```
  165:  prefilter, so sims produce every displayed number; see §5, §12 and
  246:   and the Kael temp-legendary exclusion — **no EP prefilter; every eligible
  259:eligible candidate — there is no prefilter to shrink that set (see above).
  459:  here). EP gates gem fill (there is no prefilter — see §5, §12), so p3
  565:| Browser run too slow at default settings | ... there is no EP prefilter (§5, §12) ...
  604:  prefilter (§2.5, §5): `filterPoolByPhase(...).filter(e =>
  ```
  Matches the acceptance criterion.
- `git status` before each commit → clean of files outside the three I own.
- `pnpm verify` → **could not run past the first step.** `tsc --build`
  failed with `'tsc' is not recognized` and pnpm reported
  `Local package.json exists, but node_modules missing` — `node_modules`
  is absent in this worktree. This is a worktree/environment setup gap,
  not caused by my doc-only edits, and out of my slice's scope
  (`pathsForbidden` excludes `package.json`/install tooling). I did not
  attempt to install or otherwise fix it.
- Commit went through the repo's pre-commit hook (lint-staged/prettier)
  cleanly on the three touched files.

## Notes / concerns
- **`pnpm verify` did not run** because `node_modules` is missing in this
  worktree. If the delegator needs a green `pnpm verify` recorded for this
  slice specifically, someone with permission to install dependencies (or
  a worktree that already has them) needs to re-run it — my slice's scope
  did not include touching the install state.
- I made one interpretive call inside task 2's scope: line ~604 originally
  read "**Role is prefilter and gem fill only**" as a bullet heading. I
  rewrote it to "**Role is gem fill only, and never candidate selection**"
  rather than just deleting "prefilter and", since the surrounding
  sentence ("sims produce every displayed number, so wrong weights
  degrade candidate *selection*") also used "selection" in a way that
  read as EP gating selection — which is false. I tightened that sentence
  too, in the same edit, to say EP degrades gem choice (and, post-M1,
  ordering) but never selection.

## Suggested follow-ups
- None beyond the `pnpm verify` / `node_modules` gap noted above, which is
  infrastructure, not a documentation follow-up.
