# ADR-0036 — The fork follows upstream `master` by merge

**Status:** accepted
**Date:** 2026-10-06
**Related:** [`ADR-0030`](0030-build-from-feature-backend-reforge-on-both-pins.md) and [`ADR-0033`](0033-upstream-is-master-again.md) (the "one commit named by both pins" clause of their Decision 1 is superseded here for the fork); [`docs/agents/upstream-catch-up.md`](../agents/upstream-catch-up.md) ("Routine fork update"); ticket `.scratch/carry-forward/issues/558-tracked-upstream-paths-gone-at-master-tip.md`; stage-gate `558-upstream-react-port`

## Context

This repo pins upstream `wowsims/tbc-new` twice: the engine lock
(`data/wowsims.lock.json` → `vendor/wowsims/`) and the fork lock
(`data/wowsims-fork.lock.json` → `vendor/tbc-new-fork/`). ADR-0030 Decision 1,
kept by ADR-0033 Decision 1, requires both locks to name one upstream commit,
engine first and fork second. No script enforces that rule. It lives in those
two ADRs and in the combined procedure of `docs/agents/upstream-catch-up.md`
(`grep -l 'wowsims.lock.json' scripts/*.py scripts/*.mjs | xargs grep -l
'wowsims-fork.lock.json'` prints only `scripts/list_phase_pool.py`, which stamps
the engine pin and deliberately not the fork pin).

Because one catch-up had to move both pins, every catch-up was the full
two-version procedure: build `wowsimcli` twice, sync the engine data, rebuild
the universes, merge the fork, regenerate, run the desktop gate, and push. So
catch-ups happened only when a feature needed one. The fork lock's
`branchedFrom` moved on 2026-08-14, 08-21, 09-10 and 09-14, catching up 154,
121 and 82 upstream commits (`git log -p -- data/wowsims-fork.lock.json | grep
branchedFrom`). After 09-14 it did not move while upstream added 277 commits,
including the week upstream rewrote its UI in React and deleted `ui/core`.

A dry-run merge of upstream `master` (`42c75dc9`) into the old fork branch
`feat/upgrades-tab` (`cb561067`) gave 145 conflicts: 132 file-location, 8
modify/delete and 5 content (`git -C vendor/tbc-new-fork merge-tree
--write-tree --name-only cb561067 42c75dc9 | grep -c '^CONFLICT'`). 140 of
them came from our files living inside the deleted `ui/core`. Ticket 558 moves
the tab to a new fork branch, `feat/upgrades-tab-react`, cut from `42c75dc9`,
with the tab in its own folder `ui/features/upgrades/`. At the fork pin
`43e3963d` that branch modifies 19 upstream files, against 34 on the old branch
(`git -C vendor/tbc-new-fork diff --name-only --diff-filter=M 42c75dc9 43e3963d | wc -l`
gives 19; the same command over `17a8fb28 cb561067` gives 34). The other
measurements are in the gitignored stage folder
`.scratch/stage-gate/558-upstream-react-port/` (`local-setup.md` § 3).

The owner's ruling, verbatim from that stage's `decision-log.md`
(2026-10-06T01:26Z, question Q-558-pin-coupling):

> let's relax. I want to keep up to date with normal git behavior and less pin
> obsessions, especially now that we're focused on the original wowsims repo
> and the master branch rather than a feature branch merged 2-3 weeks ago

## Decision

### 1. The fork branch follows upstream `master` by ordinary merges

The fork branch takes upstream changes with `git merge upstream/master`, as
often as `pnpm fork:upstream-status` shows the merge has content conflicts
only. The fork lock's `commit` is the fork tip, and its `branchedFrom` is the
last upstream commit merged. The procedure is "Routine fork update (fork only)"
in `docs/agents/upstream-catch-up.md`.

A location or modify/delete conflict in the status output means upstream moved
something the fork builds on. Treat it as a planning event, not a routine
merge.

### 2. The engine lock moves on its own schedule

The engine lock moves by the full procedure in `upstream-catch-up.md`
("Moving the engine version (both pins)"), when the command-line tool needs a
newer engine. The two locks may name different upstream commits between engine
moves.

## Consequences

1. What stays true for every fork re-pin: a ported engine file still goes
   through the PROVENANCE cycle in `docs/agents/known-traps.md`;
   `_fork_gate.py` still refuses a fork lock that does not name the clone's
   HEAD; and the desktop gate (`pnpm desktop-gate:check`) still runs by hand
   before a re-pin that `dev` will receive.
2. What a fork-only update must re-check: `pnpm sim-implemented-effects:generate`,
   `pnpm equip-eligibility:check` and `pnpm fork-universes:check`. The fork's
   bundled universes stay derived from the engine lock's data
   (`scripts/sync_fork_universes.py` copies `data/universes/`, which
   `scripts/assemble_universe.py` builds from `vendor/wowsims/db.json`), so a
   fork-only update does not refresh them.
3. Between engine moves, inputs read from the fork and inputs read from the
   engine lock can describe different upstream commits. One case was measured
   on 2026-10-05: with the fork lock on `42c75dc9` and the engine lock on
   `17a8fb28`, `data/equip-eligibility.json` (from the fork) no longer lists
   seven Brewfest items under their old ids, because upstream renumbered them,
   while `vendor/wowsims/db.json` still has the old ids. `pnpm
pool-listings:check` then fails until the listings are regenerated or the
   engine lock moves.
4. For ticket 558 itself nothing changes in the end state: its part P4 moves
   the engine lock to `42c75dc9` before the branch merges to `dev`, so both
   locks meet there. This ADR governs later updates.
