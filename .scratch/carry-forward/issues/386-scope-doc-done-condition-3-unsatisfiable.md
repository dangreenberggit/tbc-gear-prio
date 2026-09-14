Status: open
Origin: pre-merge review of `feat/tab-scope-truth` (domain axis, finding 1)
Blocks: none

# Scope doc's done-condition 3 is unsatisfiable as written

`docs/upgrades-tab-scope.md` Definition of done, condition 3, requires both pins
to "name a `master` sha at or after the commit that merged
`feature/backend-reforge`, and `sync_wowsims.py --check` exits 0."

Both halves fail today, for different reasons.

**The pin half.** The pins name `ec5c5f205e61049d730e460967f8488774a7fe2a`, a
commit on the branch, not on `master`:

```
git -C vendor/tbc-new-fork describe --contains ec5c5f205e61049d730e460967f8488774a7fe2a
# fatal: cannot describe
git -C vendor/tbc-new-fork log --merges --ancestry-path ec5c5f205e61049d730e460967f8488774a7fe2a..upstream/master
# the master-side merge is 3163bcfaf791ed9818463e07fa6ba438c0099d6e, 80 commits later
```

The pins are reachable from `master` but are not "a `master` sha at or after"
that merge, so satisfying the condition literally means moving both pins.

**The check half.** ADR-0030 Consequence 1 records that
`sync_wowsims.py --check` reports "new release available" permanently on a ref
pin, warn-only and cosmetic, and points at ticket 354 for the fix:

```
python scripts/sync_wowsims.py --check; echo rc=$?
# rc=1, DRIFT: new release available: ... -> v0.0.136
```

Ticket 354 is itself filed Out-of-scope in this same doc.

## Why it matters

An engineer reading the definition of done either chases a pin move ADR-0030
deliberately decided against, or treats the tab as unfinishable until an
out-of-scope ticket lands.

## The fix is Chunk 1's, not a rewrite here

Chunk 1 of `.scratch/plans/upgrades-tab-finish-line.md` moves both pins onto a
post-merge `master` sha and fixes 354 so `--check` exits 0 on a sha pin. Condition
3 then becomes satisfiable exactly as written. Reword or close this ticket when
Chunk 1 lands; do not rewrite the condition to match today's state, because the
condition describes the intended end state correctly.

## Acceptance

- [ ] After Chunk 1: `python scripts/sync_wowsims.py --check; echo rc=$?` → rc=0
- [ ] Both locks name a sha for which
      `git -C vendor/tbc-new-fork merge-base --is-ancestor 3163bcf <sha>` → rc=0
- [ ] Condition 3 left unchanged, or reworded with the reason recorded here
