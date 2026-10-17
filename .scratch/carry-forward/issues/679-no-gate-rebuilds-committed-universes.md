Status: open
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
