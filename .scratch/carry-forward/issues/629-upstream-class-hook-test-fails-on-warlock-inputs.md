Status: open
Type: bug
Origin: stage tab-small-fixes, K4 fork test run (`.scratch/stage-gate/tab-small-fixes/execution-report.md`, main checkout, gitignored)
Blocks: none
Blocked by: none
Related: 432 (another fork check that `pnpm verify` does not run)

# An upstream fork unit test fails on upstream's warlock inputs file

`npm --prefix vendor/tbc-new-fork run test:unit` has one failure, in
`ui/no_class_hooks.test.ts`:

```
FAIL  ui/no_class_hooks.test.ts > class hooks > has no class hooks in production ui/**/*.{ts,tsx}
AssertionError: ui\specs\warlock\dps\inputs.ts:75 curses-toggle-container -- use a Tailwind utility, a ui-* class, data-testid, or a data-* state instead
```

Re-run: `npx --prefix vendor/tbc-new-fork vitest run --root vendor/tbc-new-fork ui/no_class_hooks.test.ts`
(seen at `tbc-new-fork@899d8c267`, 2026-10-15: 1 failed, 2 passed).

Both files are upstream wowsims code, not tab code:

- The test came in with upstream commit `d1fd6b584` ("[UI] Run the
  canonical-class and class-hook gates"), which is on `upstream/master`.
- `ui/specs/warlock/dps/inputs.ts:75` sets
  `iconGroupClassName: 'curses-toggle-container'`.
- `git -C vendor/tbc-new-fork diff --stat upstream/master 899d8c267 -- ui/no_class_hooks.test.ts ui/specs/warlock/dps/inputs.ts`
  prints nothing, so the fork has both files exactly as upstream has
  them. Hypothesis, untested: the test fails the same way on
  `upstream/master` itself.

Stage `tab-small-fixes` did not cause it:
`git -C vendor/tbc-new-fork diff --stat 176268e7c..899d8c267 -- ui/specs ui/no_class_hooks.test.ts`
prints nothing.

No fix here: changing either file is an edit to an existing wowsims file,
which needs the owner's OK for that exact edit. The failure does not show
in `pnpm verify`, because the fork's unit tests are not part of it:
`grep -rn "test:unit\|no_class_hooks" package.json scripts/*.mjs scripts/*.py`
prints nothing (checked 2026-10-15).

## What would close this

- Upstream fixes the test or the warlock file, and the next upstream
  catch-up (`docs/agents/upstream-catch-up.md`) brings the fix in; the
  test then passes in the fork. Or
- The owner approves an exact edit to one of the two files, and the test
  passes after it.
