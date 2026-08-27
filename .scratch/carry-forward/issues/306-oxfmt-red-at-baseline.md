Status: open
Type: task
Origin: ticket 304 execution, gate flagged rather than papered over, 2026-08-27
Blocks: none
Blocked by: none

# `oxfmt --check` is red at baseline in the fork (194 files)

Found while running the fork's own gates for ticket 304. Filed rather than
silently worked around, because it makes one of the four fork gates unusable as
a pass/fail signal.

## What is wrong

In the fork checkout `vendor/tbc-new-fork` (branch `feat/upgrades-tab`), the
`fmt` gate fails:

```
[gate oxfmt] exit=1  Format issues found in above 194 files
```

The installed `oxfmt` disagrees with the tree's committed formatting — reported
causes include arrow-parens and line width. This is **pre-existing and
tree-wide**, not caused by any recent work: the same 194 files fail at the
stage-open commit `fd4d65c4a` and at the current tip, identically.

## Why it was not fixed in ticket 304

Making the gate green means running `oxfmt` without `--check`, which reformats
**194 files**, nearly all unrelated to the UI work. That would bury a focused UI
change under a tree-wide reformat and make the diff unreviewable. The executor
correctly refused, and ticket 304 explicitly does **not** claim `fmt` green.

## Why it matters

The fork's four gates are what actually cover UI code — `pnpm verify` in the
main repo does not lint, typecheck or test the fork at all (`grep -c vendor
package.json` → 0). Three of the four are usable signals:

```
[gate locales]   exit=0
[gate tsc]       exit=0
[gate stylelint] exit=0
[gate oxlint]    exit=0   (pre-existing warnings only)
[gate oxfmt]     exit=1   <- this ticket
```

A gate that is always red teaches everyone to ignore it, and a real formatting
regression would hide in the noise.

## Options

- **Reformat the tree once**, in a commit that does nothing else, and keep the
  gate green from then on. Large diff, but it is mechanical and one-time.
- **Pin or configure `oxfmt`** to match the committed style, if the disagreement
  is a version or config drift rather than a genuine style change. Investigate
  before assuming: check whether the fork's `oxfmt` version is pinned and what
  config it reads.
- **Drop `fmt` from the fork gate set** and say so explicitly, so nobody treats
  its redness as meaningful.

Prefer the second if the cause turns out to be drift — that fixes it without a
194-file diff. Measure first.

## Note on invocation

The `node_modules/.bin/` shims fail in this environment with an fnm error.
Invoke through `node` against real entry points; the working commands for all
four gates are recorded in
`.scratch/stage-gate/upgrades-ui-quality/fork-gates.md`.

## Acceptance

- [ ] Cause identified: config/version drift versus a real style change.
- [ ] One of the three options taken, and the choice recorded.
- [ ] Either `oxfmt --check` exits 0 in the fork, or the gate set is documented
      as three gates with the reason `fmt` is excluded.

## Comments
