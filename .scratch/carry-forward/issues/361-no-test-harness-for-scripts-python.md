Status: open
Type: chore
Origin: ticket 356's second acceptance box, closed unmet
Blocks: none
Blocked by: none

# No test harness exists for the Python under `scripts/`

Relates to: tickets 356, 338; ADR-0030 Decision 2

## What happened

Ticket 356 fixed a real dispatch defect in `scripts/fetch_wowsimcli.py`
(`06a5ef7`): a lock `tag` that is neither `vX.Y.Z` nor a 40-hex sha equal to
`lock["commit"]` now exits 2 instead of building a binary from an unrelated
commit and stamping it with a version it does not have.

Its second acceptance box — "a test covers the rejection, alongside the
existing slash case" — was **closed unmet**. The rejection was verified by
hand, by swapping four crafted lockfiles in and reading the exit codes, then
restoring the real one from `HEAD`. That evidence is in 356's closing note and
in `06a5ef7`'s commit body. It is a measurement, not a regression test: nothing
re-runs it.

The reason it went unmet is that there is nowhere to put it. `scripts/` has no
Python test harness — no `scripts/test_*.py`, no pytest config, and nothing
under `packages/core/test/` referencing these scripts. Every gate in
`pnpm verify` that exercises this code does so by running the real script
against real data and checking its output, which catches drift in the
artifacts but not the branch logic inside the script.

## Why it matters

`scripts/` holds the pin-moving and regen machinery — `sync_wowsims.py`,
`fetch_wowsimcli.py`, `check_layout_gate.py`, `assemble_universe.py` and the
rest. Their failure mode is the one `docs/agents/known-traps.md` keeps
recording: a path that looks like it ran and did nothing, or that ran against
the wrong input. Those are exactly the branches a unit test pins down cheaply
and a data-driven gate does not reach.

Two live examples with no test between them: 356's four refusal cases above,
and ticket 338's `_layout_command()` fnm dispatch, whose fnm-fallback branch
has still never been exercised.

## Acceptance

- [ ] A Python test harness exists and runs inside `pnpm verify` (pytest, or
      whatever fits the existing toolchain — decide and record why).
- [ ] `fetch_wowsimcli.py`'s dispatch is covered: release tag, sha matching the
      lock, sha disagreeing with the lock, a tag with a slash, and a tag of
      neither shape. No network, no build — assert the dispatch decision, not
      the binary.
- [ ] Closing note says which of 356's hand-measured cases are now automated.

## Not in scope

Backfilling tests across all of `scripts/`. Stand the harness up and cover the
one script that has a known, hand-verified defect; the rest follows when
someone touches them.
