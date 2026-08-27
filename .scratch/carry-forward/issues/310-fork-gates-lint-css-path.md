# 310 — fork-gates.md `lint:css` row does not name the real scss path

Status: open
Blocks: —
Source: Gate C disposition of the tickets 306/308 execution deviation ledger.

## What

`.scratch/stage-gate/upgrades-ui-quality/fork-gates.md:31` documents the
`lint:css` gate as:

    | `lint:css` | `node ./node_modules/stylelint/bin/stylelint.mjs "<path>"` | **exit 0** on `_upgrades_tab.scss` |

The row never spells out where `_upgrades_tab.scss` is, and the surrounding
prose points at `ui/core/components/individual_sim_ui/`. Verified during
Gate C:

    $ ls vendor/tbc-new-fork/ui/scss/core/components/individual_sim_ui/_upgrades_tab.scss
    vendor/tbc-new-fork/ui/scss/core/components/individual_sim_ui/_upgrades_tab.scss
    $ ls vendor/tbc-new-fork/ui/core/components/individual_sim_ui/_upgrades_tab.scss
    ls: cannot access ...: No such file or directory

The scss tree is `ui/scss/core/...`, not `ui/core/...`.

## Why it matters

Low severity — the row carries a `<path>` placeholder rather than a literal
wrong path, so nobody copy-pastes a broken command. But the next reader
resolving that placeholder from the neighbouring rows lands in the wrong
directory and gets a file-not-found they have to debug.

## Fix

Replace `"<path>"` with the literal
`ui/scss/core/components/individual_sim_ui/_upgrades_tab.scss` and re-run the
gate to confirm exit 0.

## Provenance

Flagged by the ticket 306/308 executor, which correctly declined to edit a row
outside both tickets' scope. Re-verified independently at Gate C by the two
`ls` commands above.
