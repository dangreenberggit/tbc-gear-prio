Status: closed
Closed: 2026-10-17, stage tab-follow-ups
Type: task
Origin: pre-merge review feat/tab-source-labels, A1
Blocks: none
Blocked by: none
Serves: .scratch/plans/upgrades-tab-finish-line.md, Tab-adjacent follow-on (gate coverage)
Related: 610, 671, 673

# No `pnpm verify` gate rebuilds the committed universes and compares them

## What an agent sees

A change to `scripts/assemble_universe.py` or to one of its inputs can leave
`data/universes/*.json` and `*.report.json` stale, and every gate still
passes. The review of feat/tab-source-labels reports that the verify run in
that stage's chunk K3 passed while the universes were stale (unverified here:
read from the review, not re-run). The tab's bundled universe copies are
checked only against `data/universes/`, so a stale universe reaches the tab
with no gate failing.

## Evidence

- `package.json` `verify:steps` has no step that runs the builder and
  compares its output with the committed universes:
  `grep -n '"verify:steps"' package.json`.
- `pool-listings:check` (`python scripts/check_pool_completeness.py --check`)
  checks which epics a list must hold; by design it restates the rules and
  imports nothing from the builder (its module docstring), so it does not
  compare builder output with the committed files.
- `fork-universes:check` (`python scripts/sync_fork_universes.py --check`)
  compares the fork's bundled copies with `data/universes/` only.
- The review's adversarial axis rebuilt all 44 universes and 44 reports with
  `assemble_universe.assemble(phase, hold_out_wowhead=False,
  apply_junk_filter=False, spec=spec)`, serialised each with
  `json.dumps(..., indent=2) + "\n"`, and found them byte-identical to the
  committed files at `tbc-gear-prio@15faafdd` (its script was a scratchpad
  file, `cmp_universes.py`, not committed). So a check is possible with the
  builder as it stands.

The gap predates feat/tab-source-labels.

## Open design question

The builder reads gitignored vendored inputs (`vendor/wowsims/db.json`,
`vendor/atlasloot/`, among others). CI therefore needs the same restores the
other data gates use before it can run such a check, or the check runs only
locally, the way the fork-gated suites do (`docs/agents/known-traps.md`,
"Fork-gated suites never run in CI").

## Done when

- A `pnpm verify` step rebuilds every committed universe and report and fails,
  naming the file, when any differs from the committed bytes.
- The step runs in CI with the restores it needs, or the ticket records why it
  is local-only and how a local verify proves it ran.
- With one committed universe edited by hand, the step fails; restored, it
  passes. Record both runs' output lines.

## Resolution (2026-10-17, stage tab-follow-ups)

`pnpm universe-rebuild:check` (`scripts/check_universe_rebuild.py`) is a
`pnpm verify` step, directly after `wowhead-parse:check`. In one process it
calls `assemble()` for every committed `data/universes/<spec>-p<n>.json`,
serialises the universe and its report as `main()` writes them, and
byte-compares both with the committed files; it then has the builder write
its weapon-type exclusions manifest to a temporary file and compares that
with `data/weapon-type-exclusions.json`. A mismatch prints
`MISMATCH data/universes/<file> -- run pnpm universe:assemble --spec <spec> --max-phase <n>`
and exits 1. It writes nothing in the tree.

CI: every gitignored file the builder reads is under `vendor/wowsims/` and
is restored by `pnpm run sync:wowsims:restore` (`.github/workflows/verify.yml:31`)
before `pnpm verify`, so the step has no CI skip. With `vendor/wowsims/db.json`
absent it prints `missing vendor/wowsims/db.json -- run pnpm sync:wowsims:restore`
and exits 2 (checked locally by moving the file away). Whether CI's Linux
Python writes the same bytes as Windows is a hypothesis, untested, until the
branch's first CI run.

Planted check (step 15 of the stage plan), `data/universes/mage-p2.json`
with one entry name changed by hand:

```
MISMATCH data/universes/mage-p2.json -- run pnpm universe:assemble --spec mage --max-phase 2
universe-rebuild: 89 files checked, 1 mismatches, 5.6 s
```

rc 1. After `git checkout -- data/universes/mage-p2.json`:

```
universe-rebuild: 89 files checked, 0 mismatches, 5.6 s
```

rc 0. In the full `pnpm verify` at `tbc-gear-prio@f4951822` the step took
4.7 s and the run ended `gates: 1542 ran, 0 skipped`.

Verified by: `pnpm universe-rebuild:check` at `tbc-gear-prio@66d6b19a`
(the step), `tbc-gear-prio@99abc083` (exit 2 before the builder import when
db.json is missing).
