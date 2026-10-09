Status: closed
Type: task
Origin: docs/reviews/feat-565-upstream-sync-tanstack.md
Blocks: none
Blocked by: none
Related: 580, 565

# The layout gate's digest misses the fork's package pins and `theme/index.css`

## What is not covered

`scripts/check_layout_gate.py` skips the measured layout run when its digest
equals `testedTabHash` in `data/wowsims-fork-layout.lock.json`. After ticket
580 (main `6f9b2bf8`), two kinds of input that change what the run measures
are still outside the digest:

- **The fork's `package.json` and `package-lock.json`.** Since fork
  `8c6a33f43` the results rows render through `@tanstack/react-virtual`
  (fork `package.json:31`, 3.14.10) and sort through `@tanstack/react-table`
  (`:30`, 9.2.4). An upstream sync that only bumps one of these versions
  changes which rows are in the DOM and how they are measured, and leaves
  the digest equal, so `merge-to-dev` skips the measured run. The comment
  above `LAYOUT_FILES` already says Tailwind's utilities are not covered for
  the same reason ("NOT covered: Tailwind's own utilities, which the fork's
  package-lock pins").
- **`ui/styles/theme/index.css`.** `LAYOUT_FILES` names the eight theme
  files that `index.css` imports today, and the comment says "every theme
  file the tab loads is" in the digest. `index.css` itself, which holds the
  `@import` list, is not hashed. A new `@import` added there by upstream
  does not move the digest, and neither does the new file it imports.

Found by: `git -C vendor/tbc-new-fork ls-tree --name-only eb0010112 ui/styles/theme/`
(10 files) against `LAYOUT_FILES` (`scripts/check_layout_gate.py:195-209`, 8
theme files); `grep -n tanstack vendor/tbc-new-fork/package.json`.

## Done when

- The digest covers `ui/styles/theme/index.css`, and either the fork's
  `package-lock.json` entries for `@tanstack/react-table` and
  `@tanstack/react-virtual` (and Tailwind, if cheap) or the whole
  `package-lock.json`, with the trade-off written in the comment above
  `LAYOUT_FILES`.
- `testedTabHash` moves only through a green measured run, never
  `--update-baseline`.

## Closing note (2026-10-09, stage 565-upstream-sync-tanstack, chunk RW2)

`LAYOUT_FILES` in `scripts/check_layout_gate.py` now names the fork's
`package.json`, `package-lock.json` and `ui/styles/theme/index.css`. The whole
package files are hashed, not only the TanStack and Tailwind entries: any
dependency bump then costs one measured run, the safe direction, and no parser
of the lock file's format is needed. The comment above `LAYOUT_FILES` says so,
and the "NOT covered: Tailwind" line is gone. The lock `_comment` that
`write_baseline` writes lists the fork package files, all nine theme files and
`rows.mjs` (review finding S4).

`pnpm layout-gate:check` ran measured: pass, 0 failed, 0 axe failures, 36
PASS lines, A1 rows 338 / measuredRows 330 (as at RW1), at fork `28ea7a36a`;
`testedTabHash` moved `39cec6a5...` -> `c0578b4a...`, written by the gate
(no `--update-baseline`). Log:
`.scratch/stage-gate/565-upstream-sync-tanstack/parts/P2/rw2-layout-gate.log`
(gitignored).
