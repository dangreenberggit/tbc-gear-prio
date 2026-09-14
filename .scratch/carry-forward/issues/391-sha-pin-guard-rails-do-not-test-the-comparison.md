Status: open
Type: defect
Origin: docs/reviews/feat-upstream-catchup-chunk1.md
Blocks: none
Blocked by: none

# Sha-pin guard rails do not test what the comparison compares against

The four checks added to `scripts/check_sync_wowsims.py` for ticket 354 pin that
the sha-pin branch *exists* and that `--unwatch-ref` deletes a key. They do not
constrain **what the pin is compared against**, which is the entire content of
the fix.

## Why the harness cannot express it

`_DoCheckHarness` (`scripts/check_sync_wowsims.py:377-382`) stubs:

```python
sync_wowsims.latest_tag = lambda: ("v9.9.9", self.UPSTREAM_SHA)
sync_wowsims.ref_sha    = lambda ref: self.UPSTREAM_SHA
sync_wowsims.fetch      = lambda sha, path: b"...Phase.Phase2;"
```

`latest_tag` and `ref_sha` return **the same sha**, so no assertion can
distinguish "compared against the watched ref" from "compared against the latest
release tag" — the latter being ticket 354 symptom (b), the defect the branch
exists to fix. `fetch` ignores its `sha` argument, so the watched-ref tip and the
release tag can never disagree on `CURRENT_PHASE`.

## Reproduction (run by the review, then re-run independently)

Replace `tip = ref_sha(ref)` with `tip = sha` in `scripts/sync_wowsims.py`'s
sha-pin branch — re-introducing ticket 354's original bug verbatim — then:

```
python scripts/check_sync_wowsims.py; echo rc=$?
```

Result: `sync_wowsims.py guard rails ok (21 checks)`, **rc 0**. The mutation
survives. Two further mutations reported by the adversarial axis also survive all
21 checks: taking the *last* watched ref instead of the first, and hardcoding the
sha-pin tier check so `*** CONTENT TIER CHANGED ***` can never fire.

Restore the file afterwards and confirm `git diff --stat -- scripts/sync_wowsims.py`
is empty.

## Consequence for ticket 354

Ticket 354 is `closed`. Its acceptance criterion — "a test covers a ref pin whose
watched branch and latest master tag disagree on `CURRENT_PHASE`" — is **unmet
and unmeetable under this harness**, because `fetch` is a sha-independent
constant. The production code appears correct; the guard is hollow, which is the
rot `check_sync_wowsims.py` was written to prevent.

## What would fix it

Give the harness distinct shas per source: `ref_sha` and `latest_tag` must return
different values, and `fetch` must vary its `CURRENT_PHASE` by sha. Then assert
that a sha pin equal to the watched-ref tip reports `in sync.` **while**
`latest_tag` names a different sha, and that the tier line reads its phase from
the ref tip rather than the tag.

Not fixed on `feat/upstream-catchup-chunk1`: the production behaviour was
verified by hand (`sync_wowsims.py --check` → rc 0 `in sync.` at the new pin), so
this is a test-coverage gap rather than a live defect, and fixing it means
reshaping a harness the branch did not otherwise touch.
