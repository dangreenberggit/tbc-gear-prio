# Execution report — ledger-consolidation-and-merge-train

## Phase A — complete

Executed 2026-09-12 by the Executor seat against base `a2a4295` (`dev`), shared
checkout, one writer. Steps A0 through A9 all ran. **No merge to dev was run.**

Phase B did not run: every step in it begins "after the owner merges …", and no
owner merge happened during this stage.

### Branch tips

| Branch | Tip | `NEXT` | `check_merge_ready.py` | `--check-only` |
| --- | --- | --- | --- | --- |
| `docs/fork-upstream-touchpoints` | `09891d3bf924e8e150a801f9face08aac0f5cc9e` | 381 | `merge-ready: ok` | rc 0, `check-only: ok (not merging)` |
| `feat/spec-registry` | `ce746050eb41aed75a86a7c16bc41b9b77c8002b` | 379 | `merge-ready: ok` | rc 0, `check-only: ok (not merging)` |
| `fix/sim-header-null-assertion` | `f90fe88e2cb8e346de5d80043c54427fab74158f` | 381 | `merge-ready: ok` | rc 0, `check-only: ok (not merging)` |

`dev` is unmoved at `a2a42954311e08b252070cad4a667d3da9c15355`.

Each `--check-only` runs `pnpm run verify` internally (`merge_to_dev.py:137-141`)
and each one's `=== verify ===` stage passed, so verify is green on all three
tips. No standalone `pnpm verify` was run — it would have been a duplicate.

`fix/sim-header-null-assertion` was proven with the clone at `5e9013b78`, the
commit its lockfile pins. The other two were proven with the clone at
`bbad1b8a4`.

### Fork clone

`vendor/tbc-new-fork` is at **`bbad1b8a4`**, detached, clean — the same state
Phase A found it in, and the `commit` that `dev`'s lockfile pins. It was moved
forward to `5e9013b78` for A8's verification and moved back afterwards.

Confirmed after the move back:

- `python scripts/check_equip_eligibility.py` on `docs/fork-upstream-touchpoints`
  → rc 0, "17 specs match the fork at bbad1b8a4325".
- The same script on `fix/sim-header-null-assertion` → rc 2, which is **correct
  and expected**: that branch pins `5e9013b78` and the clone is at `bbad1b8a4`.
  Whoever merges that branch moves the clone forward immediately after.

### Reconciliation (A3)

**Reconciled.** Full command output in `reconciliation.txt`. The `M`-row command
gives 13 at `bbad1b8a4` and at `5e9013b78`; the pathspec command gives 15 at
`f90b12a7b` and 14 at both later pins. Both set comparisons returned no output:
the 13 equals the 15 minus `{test-layout.mjs, ui/core/sim.ts}` path for path,
and the 14 equals the 13 plus `test-layout.mjs`. This was verified as a **set**
comparison, not as two counts that happen to agree.

Session B's "undercounted by two" claim is recorded as wrong in the surviving
document, with the reason: it compared a pathspec count (which includes one
added file and one since-reverted file) against a count of modified upstream
files. Two review axes independently re-derived this and both confirmed it.

### Ticket map

| Branch | Old → new |
| --- | --- |
| `feat/spec-registry` | 371 → **376**, 372 → **377** (closed), 373 → **378** |
| `fix/sim-header-null-assertion` | 371 → **379**, 373 → **380** |
| `docs/fork-upstream-touchpoints` | none filed; `NEXT` = 381 (k = 0) |

k = 0: the consolidation branch's pre-merge review deferred nothing, so it filed
no ticket and `NEXT` stayed at 381.

Ticket 377 is closed as an inverted diagnosis. Ancestry
(`merge-base --is-ancestor f90b12a7b bbad1b8a4`, then `bbad1b8a4 5e9013b78`,
both rc 0) shows the clone was **ahead** of the pin, not behind it, so its
"reset the clone to the pin" instruction would have moved a gitignored checkout
backwards and destroyed committed fork work while `pnpm verify` stayed green.

### Review

`docs/reviews/docs-fork-upstream-touchpoints.md`, four axes on the review lane,
15 disposition rows: 10 fixed, 3 wontfix, 0 defer. `codex` is not on `PATH`, so
no axis ran cross-vendor. Five numbers that did not reproduce were corrected in
`7e1378e`; four of the five were inherited by the fold rather than introduced by
it.

## For the owner

1. **Merge order and the clone.** Merge in the order
   `docs/fork-upstream-touchpoints` → `feat/spec-registry` →
   `fix/sim-header-null-assertion`, using `pnpm merge-to-dev` on each. Order is
   free with respect to the fork pin — `feat/spec-registry` does not modify the
   lockfile at all — so the order is for ticket dependencies, not pin safety.
   **Immediately after the third merge**, run
   `git -C vendor/tbc-new-fork checkout feat/upgrades-tab` to move the clone to
   `5e9013b78`. Until that runs, `dev` is red on four fork gates. Full detail,
   including the `NEXT`-conflict rule ("the larger value wins"), is in
   `merge-order.md`.

2. **Until `docs/fork-upstream-touchpoints` is merged, `dev`'s `NEXT` is 376 and
   any ticket filed from `dev` collides with the reservation — file nothing from
   `dev` in that window, or merge the touchpoints branch first.**

3. **Commit bodies keep the old ticket numbers by design.** They name 371, 372
   and 373 on both sibling branches. Editing them means rebasing ranges that
   `docs/reviews/feat-spec-registry.md` and
   `docs/reviews/fix-sim-header-null-assertion.md` already reviewed, which would
   invalidate both review files. The decoder ring is `merge-order.md`
   § Ticket renumber map, plus a `Formerly:` line in each renumbered ticket.

4. **After the last merge**, push `5e9013b78` to the fork remote and flip
   `pushed` to `true` in `data/wowsims-fork.lock.json`. Owner action, ticket 355
   precedent, out of this stage's scope.

## Deviations

Four, all recorded in `state-at-exec.txt` with their measurements:

1. **C26 refuted.** `dev`'s `map.md` line 181 ends "NOT merged." about
   `feat/reforge-catchup-leftovers`, but `0d339c2` is an ancestor of `dev`
   (rc 0, 0 ahead). Flagged, not acted on — the file is on `dev`, which this
   seat cannot write to, and it is outside the Paths manifest.
2. **A4's mention-count acceptance.** The plan expected exactly 3 mentions of
   `fork-upstream-divergence`; the delivered document has 5 in live surfaces,
   because A4's own step body mandates two of them. **Zero markdown links** to
   the deleted file remain, which is the substantive requirement.
3. **A partial commit was made and reset.** `git add -A` with the deleted path
   named explicitly aborted the whole add, so the first fold commit captured only
   the deletion. Reset with `--soft` and recommitted correctly as `9c5a019`.
   Detail and the lesson are in `state-at-exec.txt` under A4.
4. **Review-driven edits beyond the plan's A4 item list.** Ten review findings
   were fixed in `7e1378e`, including five numeric corrections the plan did not
   anticipate. Within A5's remit (it requires running the review), but the plan
   did not predict edits to the folded content.
