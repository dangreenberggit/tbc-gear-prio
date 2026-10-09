Status: open
Type: task
Origin: stage-gate 565-upstream-sync-tanstack, decision-log note finding at 2026-10-09T04:41Z (`.scratch/stage-gate/565-upstream-sync-tanstack/decision-log.md`; gitignored, owner's checkout); filed at the final Gate C
Blocks: none
Blocked by: none
Related: 565

# The layout gate's digest does not cover `z-index.css` or `rows.mjs`

## What is not covered

`scripts/check_layout_gate.py` skips the measured layout run when its digest
equals `testedTabHash` in `data/wowsims-fork-layout.lock.json`. Two files that
can change what the run measures are not in that digest:

- `ui/styles/theme/z-index.css` in the fork. It arrived with the merge of
  upstream `5262ff386bd171e6349d0f9cf00f4d762a6c9951` and is imported by
  `ui/styles/theme/index.css:6`. `LAYOUT_FILES`
  (`scripts/check_layout_gate.py:187-198`) names five theme files
  (breakpoints, colors, spacing, typography, vars) and not this one. The
  import walk does not reach it either: `_resolve_module` keeps only files
  under `ui/ui-kit` (`scripts/check_layout_gate.py:280`).
- `scripts/tab-harness/rows.mjs` in the main repo, added on
  `feat/565-upstream-sync-tanstack`. `test-layout.mjs:42` and
  `test-tab-harness.mjs:22` import it, so it is part of the gate's
  assertions. `ROOT_GATE_FILES` (`scripts/check_layout_gate.py:214-218`)
  names `test-layout.mjs`, `test-tab-harness.mjs` and `test-review.mjs` only,
  and `_iter_root_gate_files` (`:224-228`) adds the `data/tab-fixtures/*.json`
  files and nothing else.

Check, re-runnable from the repo root:

```
python -c "import sys; sys.path.insert(0,'scripts'); import check_layout_gate as g; L=[g._rel(p) for p in g._iter_layout_files()]; R=[g._rel_root(p) for p in g._iter_root_gate_files()]; print(any('z-index' in x for x in L), any('rows.mjs' in x for x in R))"
```

On main `abbc17a8` with the fork at `8c6a33f43` it printed `False False`.

## Consequence

An edit to either file leaves the digest unchanged, so `pnpm layout-gate:check`
reports "nothing to re-test" and skips the measured run. A z-index change that
puts a popover or dialog under the table, or a `rows.mjs` change that alters
how rows are read, would reach `dev` without the layout gate measuring it. On
this branch the K2 executor ran `test-layout.mjs` by hand for this reason
(decision-log row K2-7a).

## Fix

Add `ui/styles/theme/z-index.css` to `LAYOUT_FILES` and
`scripts/tab-harness/rows.mjs` to `ROOT_GATE_FILES`, update the comments above
each tuple, then run the measured gate once and commit the new
`testedTabHash`.

While there, decide the same question for `ui/styles/theme/effects.css` and
`specs.css`, which `theme/index.css` also imports and the digest also omits.
Whether either affects the measured layout is untested.
