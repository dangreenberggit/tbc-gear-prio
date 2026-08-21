Status: open
Type: defect (process gap; a tripwire nothing ran)
Origin: ticket 244 investigation, 2026-08-20 — found while establishing why the
  `timeToNextEnergyTick` gap went unnoticed for weeks
Blocks: none
Blocked by: none

# The watched-ref drift tripwire was wired to nothing, for the second time

## The finding

`scripts/sync_wowsims.py --check` detects upstream drift, including watched refs
moving. It reports, right now:

```
python scripts/sync_wowsims.py --check
```

```
DRIFT: new release available: v0.0.101 -> v0.0.119
DRIFT: watched ref feature/backend-reforge moved: 33970a8f3c65 -> cbf6b75a889e
  (informational -- not a build pin; re-review before treating its features as still absent)
```

**Nothing ran it.** `sync:wowsims:check` existed in `package.json` but was not
in `pnpm verify`'s 20-check chain, so it fired only if a human typed it. It also
exits 0 in the informational case, so even a manual run does not announce
itself.

## Why it matters — this is the second instance, not the first

The consequence: tickets 239 and 244 were both written on the premise that
`timeToNextEnergyTick` was simply unavailable to us. It has been present on
`feature/backend-reforge` — the branch this repo already chose to watch — for
weeks. That branch is at **v0.0.115 + 54 commits**, 14 tags ahead of our pin.

`do_check`'s own comment records the first instance verbatim
(`scripts/sync_wowsims.py:443`):

> Watched refs: branches under active upstream development that we don't build
> from but want to know when they move (issue #1 -- the optimizer that "didn't
> exist" was live on feature/backend-reforge the whole time).

Same branch. Same failure mode. The watch was added *because* of the first
occurrence, and then never wired to a gate, so it could not prevent the second.

The drift message even says "re-review before treating its features as still
absent" — the exact review that did not happen.

## What was done already (2026-08-20)

Owner chose **warn without failing**. Implemented:

- `scripts/warn_upstream_drift.py` — runs `--check`, prints any `DRIFT:` lines,
  and **always exits 0**.
- `pnpm upstream-drift:warn` added to the end of `pnpm verify`.

It is a wrapper rather than a direct `--check` call because `--check` would turn
a green build red for reasons unrelated to the commit under test: it exits 2
when `vendor/` is absent (fresh clone, CI before `sync:wowsims:restore`), exits
1 whenever upstream tags a release, and needs network plus `gh` auth. The
wrapper swallows all three.

Verified 2026-08-20 — `python scripts/warn_upstream_drift.py` prints both drift
lines and exits 0.

## What is left — the reason this ticket is open

The warner is unproven in the conditions it exists to survive. Each of these is
a way it could silently become useless:

- [ ] **No network / no `gh` auth** — confirm it prints a skip line and exits 0
      rather than hanging or failing. The 60s timeout is untested.
- [ ] **Empty `vendor/`** — confirm the returncode-2 path prints the skip line.
      Untested; `vendor/` was populated on the authoring machine.
- [ ] **CI** — confirm the warning is actually *visible* in a real CI run's
      output, not buried or stripped. A warning nobody reads is the same defect
      this ticket is about. Read a real run; do not predict from local output.
- [ ] **It stays visible.** A warn-only line at the end of a 21-step verify is
      easy to scroll past. Consider whether it needs to be louder — e.g.
      repeated at the end of the run, or a separate `pnpm drift` a human is
      told to run at phase boundaries.
- [ ] **The wrapper cannot rot silently.** If `sync_wowsims.py --check` changes
      its output format, the `"DRIFT:" in ln` match breaks and the warner
      reports "in sync" forever — a third instance of this same failure. Add a
      unit check pinning the contract, alongside the existing
      `scripts/check_sync_wowsims.py` checks.

## Acceptance

- [ ] All five boxes above closed, each naming the command run.
- [ ] The output-format contract between `--check` and the warner is asserted by
      a check in `pnpm verify`, so a format change fails loudly instead of
      turning the warner into a no-op.
- [ ] `pnpm verify` green.
