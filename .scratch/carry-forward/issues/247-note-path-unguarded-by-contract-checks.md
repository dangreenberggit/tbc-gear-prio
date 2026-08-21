Status: open
Type: defect (test coverage gap in a guard added specifically to close one)
Origin: pre-merge review of `feat/drift-warner-proven`, 2026-08-21 — spec axis,
  finding P3
Blocks: none
Blocked by: none

# The containment NOTE is the one warner path the contract checks do not guard

## The finding

`_run_warner()` in `scripts/check_sync_wowsims.py` stubs the NOTE out:

```python
# The containment NOTE shells out to `gh`; it is not part of this contract.
warn_upstream_drift.warn_pin_behind_watched_refs = lambda: None
```

That was a deliberate call — `warn_pin_behind_watched_refs()` runs
`gh api repos/<repo>/compare/...`, and the seven contract checks are offline by
design. But it leaves an awkward gap, because the NOTE is not a decoration.

Ticket 245 closed its visibility box on the argument that what the warning
needed was better *content*, not more volume — and the content it pointed at is
the NOTE:

> the pin is an ANCESTOR of watched ref X, features on that branch are
> reachable by fast-forward, do not call them absent

So the line carrying the box's justification is the single line no check
protects. If `warn_pin_behind_watched_refs()` silently stops printing — a
changed `gh` output shape, a renamed lockfile key, an `except` swallowing more
than intended — every check still passes and the warning quietly loses the part
that tells a reader what to conclude.

Note the function is written to fail silent on purpose (`continue` on a nonzero
`gh` exit, bare `except` around the parse, "prints nothing it cannot
establish"). That is right for a warner and wrong for an untested one: silent
degradation plus no coverage is how a tripwire ends up wired to nothing, which
is the whole subject of ticket 245.

## What to do

Guard it the way `_DoCheckHarness` guards `do_check()` — run the real function
with only its network boundary stubbed. `warn_pin_behind_watched_refs()` shells
out through `subprocess.run`, so a check can monkeypatch that with a canned
`gh api compare` payload and assert on stdout. Worth covering:

- pin is an ancestor (`behind_by: 0`, `ahead_by > 0`) → the ANCESTOR note and
  the "reachable is not the same as usable" caveat both print
- `status: diverged` → the DIVERGED note prints instead
- pin equals the watched ref (`ahead 0, behind 0`) → prints nothing, which is
  correct but currently unasserted, so nobody would notice it becoming the
  behaviour in *every* case
- `gh` fails or returns junk → prints nothing and does not raise

Add them alongside the existing contract checks so they run in `pnpm verify`.

## Acceptance

- [ ] The four cases above asserted against the real
      `warn_pin_behind_watched_refs()`, with only `subprocess.run` stubbed.
- [ ] Each new check proven to fail against a mutation of the code it guards —
      naming the mutation, as `docs/reviews/feat-drift-warner-proven.md` does.
- [ ] `pnpm verify` green.
