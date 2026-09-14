Status: open
Type: defect
Origin: docs/reviews/feat-upstream-catchup-chunk1.md
Blocks: none
Blocked by: none

# The sha-pin comparison silently picks whichever watched ref is first

`scripts/sync_wowsims.py:591` resolves the ref to compare a sha pin against with:

```python
ref = next(iter(lock.get("watchedRefs") or {}), None)
```

With exactly one watched ref — `master`, today's state — this is correct. With
two, the pin is compared against whichever key happens to sit first in the
lockfile's JSON insertion order, with no error and no line in the output saying a
choice was made.

`--watch-ref` adds refs freely and this repo has historically watched more than
one (`feature/backend-reforge` alongside others). A pin correctly in sync with
`master` while `master` sits second in the dict would report
`pin is behind <other-ref>` indefinitely.

## Evidence

Mutating `next(iter(...))` to take the **last** watched ref instead of the first
leaves all 21 checks in `scripts/check_sync_wowsims.py` green — nothing pins the
ordering. See [[391-sha-pin-guard-rails-do-not-test-the-comparison]] for the
harness limitation that allows this.

The drift line does name the ref it compared against, so a careful reader can
recover what happened; the failure is silent selection, not silent output.

## Note on the prose

Both the function's docstring and `docs/adr/0033-upstream-is-master-again.md` §3
describe this as "the first entry in `watchedRefs`" as though that were a
definition. It is an accident of dict ordering, not a specified rule.

## What would fix it

Either make the choice explicit (a `primaryRef` key in the lockfile, or a
`--compare-ref` flag), or compare against **every** watched ref and report drift
per ref. If the single-ref assumption is meant to hold, assert it: error when
`len(watchedRefs) > 1` rather than picking one arbitrarily.
