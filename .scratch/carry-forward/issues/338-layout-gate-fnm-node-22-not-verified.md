Status: open
Type: chore
Origin: pre-merge review of feat/layout-gate-merge-to-dev, Standards axis S1, 2026-08-31
Blocks: none
Blocked by: none

# The layout gate trusts `fnm exec --using=22` without verifying it yields Node 22

`scripts/check_layout_gate.py:189` (`_layout_command()`): when the ambient node is
older than 22, the gate runs the fork's `test:layout` via `fnm exec --using=22 …`
without checking that fnm actually has a v22 installed and resolves to it. If fnm has
no v22, fnm errors, and that nonzero exit surfaces through `run()` as
`die("layout gate failed — Upgrades tab layout is broken")` — a **prerequisite gap
misreported as a layout break**, the exact run/skip/fail confusion the script
otherwise guards against carefully.

Low likelihood on the main checkout (v22.17.1 is installed and pinned in
`.node-version`), so this is a hardening chore, not a live bug. Fix: probe that the
resolved node under `fnm exec --using=22` is actually >=22 before running the gate;
if not, treat it as an absent prerequisite and **skip cleanly** (exit 0 with a reason)
rather than blocking the merge with a false "layout is broken" message.

Re-runnable check for whoever picks this up: on a machine with no fnm v22 installed,
run `pnpm layout-gate:check` against a tab-changed branch and observe whether it
reports a prereq skip or a spurious layout failure.
