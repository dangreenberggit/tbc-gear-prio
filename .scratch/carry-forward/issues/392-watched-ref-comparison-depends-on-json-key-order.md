Status: closed
Type: defect
Origin: docs/reviews/feat-upstream-catchup-chunk1.md
Blocks: none
Blocked by: none

# The sha-pin comparison silently picks whichever watched ref is first

Closed 2026-09-14 by commit `f633b9b7` on `feat/upstream-catchup-chunk1`. The
ticket's last option was taken — the single-ref assumption is asserted rather
than worked around — and it is enforced at both ends. `do_watch_ref` refuses a
second, differing ref, printing the existing ref and the `--unwatch-ref` that
frees the slot (the replacement pair `docs/agents/upstream-catch-up.md` §2
already prescribes); re-watching the ref already watched still succeeds, since
that is how its recorded tip moves. `do_check`'s sha-pin branch appends drift
naming every watched ref when there is more than one, so a hand-edited lock
reports that the comparison cannot be resolved instead of picking by JSON order.

Past those two guards the name is **unpacked, not indexed** (`(ref,) =
watched_names`). This came out of the mutation testing below: with only the
`len > 1` guard in place, `[0]` → `[-1]` still survived, because the guard makes
the index unreachable with two refs and the two forms are identical with one. No
test could see the difference, so the selection was removed rather than tested.

`primaryRef` and compare-against-every-ref were both rejected. The first invents
a naming mechanism for a multi-ref workflow nobody has and creates a new
inconsistent state (named ref disagreeing with the watched set); the second
would make a pin correctly following `master` report permanent drift against a
branch merely being observed, since a watched ref is explicitly not a build pin.

Verified with `python -B scripts/check_sync_wowsims.py; echo rc=$?` → **rc 0**,
`sync_wowsims.py guard rails ok (25 checks)`, up from 22. Three checks added:
`check_sha_pin_refuses_to_guess_between_two_watched_refs` (nonzero exit, both
ref names in the output), `check_watch_ref_refuses_a_second_differing_ref`
(exit 2, lock untouched — the refusal precedes `ref_sha`, so a refused call
never reaches the network or the file), and
`check_watch_ref_still_refreshes_the_same_ref`.

The mutation this ticket was filed for is dead. Deleting the `len > 1` guard so
the branch again selects a ref by key order — ticket 392's defect verbatim —
gives rc 1 with one FAIL line, and the captured output shows the failure it
describes: `DRIFT: pin is behind other/ref` with nothing saying a choice was
made. `git diff --stat -- scripts/sync_wowsims.py` shows only the intended
change after the revert. `pnpm verify` → rc 0.

## Note on the prose

Both the function's docstring and `docs/adr/0033-upstream-is-master-again.md` §3
described this as "the first entry in `watchedRefs`" as though that were a
definition. It was an accident of dict ordering, not a specified rule. Both now
say the **sole** watched ref, and ADR-0033 §3 records that the invariant is
enforced rather than assumed.

## Original report

`scripts/sync_wowsims.py:591` resolved the ref to compare a sha pin against
with:

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

### Evidence

Mutating `next(iter(...))` to take the **last** watched ref instead of the first
leaves all 21 checks in `scripts/check_sync_wowsims.py` green — nothing pins the
ordering. See [[391-sha-pin-guard-rails-do-not-test-the-comparison]] for the
harness limitation that allows this.

The drift line does name the ref it compared against, so a careful reader can
recover what happened; the failure is silent selection, not silent output.
