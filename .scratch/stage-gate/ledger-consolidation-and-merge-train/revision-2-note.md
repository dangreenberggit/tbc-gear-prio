# Revision 2 — orchestrator note

The planner's revision-2 output is the authoritative plan. It is reproduced in
`plan.md` by the planner seat itself rather than re-typed by the orchestrator:
the document runs to roughly 20KB of exact commands, SHAs and acceptance
strings, and a transcription slip in any one of them becomes a silent execution
defect.

`plan-rev1.md.bak` holds revision 1 for comparison.

## What changed in revision 2, in brief

Three blocking findings fixed:

- **F1** — `scripts/check_merge_ready.py` resolves each `defer` row's ticket by
  the literal path string in the note (`:170-179`, `:462-463`). Renumbering
  therefore orphans seven rows in `docs/reviews/feat-spec-registry.md` and two in
  `docs/reviews/fix-sim-header-null-assertion.md`. A7 and A8 each gained a
  three-part post-renumber check: a `git grep` for stale `/371-`/`/372-`/`/373-`
  paths, a `Test-Path` sweep over every ticket path in the review file, and a
  `python scripts/check_merge_ready.py` run.
- **F2** — every conflict resolution now carries `git add`, under a single
  "Conflict-resolution rule" asserting `git diff --name-only --diff-filter=U` is
  empty before each merge commit. `--theirs` was already the correct side.
- **F3** — C1 corrected (the checkout is `dev`), C2 re-measured
  (`feat/reforge-catchup-leftovers` is 0 ahead / 23 behind, merge-base
  `85cbe9cd`). A0 now compares against the corrected table, so it no longer
  halts on the plan's own bad data; A1 asserts the current branch is neither
  deletion target before `git branch -d`.

Material and minor: C23 corrected (the `iterations` token survives inside the
anchor slug at `docs/fork-phase-seams.md:51`); a ticket-number allocation
section with disjoint ranges, a new step A5a raising `NEXT` to 381 on the
first-merging branch, and a deterministic "larger value wins" rule for `NEXT`
conflicts; a verify-failure rule; and an explicit decision that commit-body
ticket numbers are knowingly left stale, with a decoder ring in
`merge-order.md`.

## One round-1 finding refuted

Round 1's **F11** claimed `pnpm merge-to-dev --check-only` prints a string that
does not exist and that no `--check-only` flag exists, having read only
`scripts/check_merge_ready.py`. The flag is defined in `scripts/merge_to_dev.py`:

```
Select-String -Path scripts\merge_to_dev.py -Pattern "check-only|check_only"
# scripts\merge_to_dev.py:7:    pnpm merge-to-dev --check-only          # verify + merge-ready, no merge
# scripts\merge_to_dev.py:114:        "--check-only",
# scripts\merge_to_dev.py:132:    if dirty.stdout.strip() and not args.check_only:
```

Confirmed by the orchestrator 2026-09-12. The reviewer reached a false negative
by measuring one file and generalising to the repo — the same single-source
error that produced four wrong answers about ticket 372 and that this stage
exists to clean up. Recorded because it is evidence the failure mode recurs in
the seat whose job is to catch it.
