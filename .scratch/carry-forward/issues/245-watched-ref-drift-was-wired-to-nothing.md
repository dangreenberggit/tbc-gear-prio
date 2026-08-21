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

## The warning is necessary, not sufficient

Recorded 2026-08-20 after the owner asked whether the warn would catch this.
Partly. It closes the gap it was built for — the drift is now in front of a
human on every verify instead of behind a command nobody typed. But it does not
reach the failure that actually happened, and this ticket should not be closed
believing it does.

**Both instances were an agent reasoning from "we do not have this feature",**
not a human missing a notification. In the first, an optimizer was declared
absent while live on this branch. In the second, tickets 239 and 244 were both
written on the premise that `timeToNextEnergyTick` was unavailable, and 244
went further — it listed `feature/backend-reforge` as an option and called it
marginal without ever resolving what version the branch was on.

A line at the tail of a 21-step green build does not intercept that. Three
concrete ways it still fails:

1. **It warns; it does not stop.** The agent writing 239 could have read the
   drift line and continued, because the line does not contradict the specific
   claim being made.
2. **Nobody reads the tail of a passing build.** That is the standing weakness
   of every warn-only check, and it is why the visibility box above is open
   rather than assumed closed.
3. **It can rot into a reassuring lie.** If `--check`'s output format changes,
   the `"DRIFT:"` match stops matching and the warner reports "in sync"
   permanently — worse than no warner, and a third instance of the same shape.

**Follow-up option, deliberately not implemented yet.** The intervention that
would reach the real failure belongs at the point of reasoning, not the point of
build: a rule stating that *before asserting an upstream feature is absent,
resolve every ref in `watchedRefs` and say what you found* — placed where an
agent reads it while forming the claim (`AGENTS.md`, or a `_comment` on
`data/wowsims.lock.json` beside `watchedRefs` itself).

Not written yet on purpose. Per `AGENTS.md`, changes to `AGENTS.md` and skill
files are proposed in chat and wait for approval, because they steer every
future session. And the cheap mechanical fix is already in place and working —
adding a second, unproven intervention on top of an unvalidated one is how the
first tripwire ended up wired to nothing. Close the boxes above first, then
decide whether this is still needed.

## Acceptance

- [ ] All five boxes above closed, each naming the command run.
- [ ] The output-format contract between `--check` and the warner is asserted by
      a check in `pnpm verify`, so a format change fails loudly instead of
      turning the warner into a no-op.
- [ ] `pnpm verify` green.
- [ ] A decision recorded on the follow-up option above — adopted (with the
      wording proposed in chat first) or dropped, with the reason.
