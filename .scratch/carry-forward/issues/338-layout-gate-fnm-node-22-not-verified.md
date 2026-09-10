Status: open
Type: chore
Origin: pre-merge review of feat/layout-gate-merge-to-dev, Standards axis S1, 2026-08-31
Blocks: none
Blocked by: none

# The layout gate trusts `fnm exec --using=22` without verifying it yields Node 22

`scripts/check_layout_gate.py`, function `_layout_command()` (cite it by name —
the line numbers moved when `ddce4ac` and `4dcafcd` rewrote much of this file):
when the ambient node is
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

## Still open after the reforge catch-up (2026-09-10)

`ddce4ac` and `4dcafcd` rewrote much of this file — a `LAYOUT_GATE_VERDICT`
line contract with `test-layout.mjs`, a `GATE_UNMEASURED` sentinel, and a
rewritten `run_gate()` — and `4dcafcd` ran the gate end to end green (37
assertions at widths 375/653/768/1280). But that run took the **ambient
Node 22** path, not the fnm fallback, so this bug is untouched rather than
disproven. No guard was added between "fnm is on PATH" and "the node fnm
selects is actually >= 22".

There are now **two** places a fix could sit, because the rewrite gave the
same misreport a second route. If `fnm exec --using=22` fails for want of a
v22, the subprocess errors before `test-layout.mjs` runs, so no
`LAYOUT_GATE_VERDICT` line is emitted; `_parse_verdict` returns `None`, and
the "older fork clone" fallback branch returns 1 — reported as a layout
failure through `die("layout gate failed …")`. Same false accusation, new
path. Fix either the dispatch in `_layout_command()` or the `None`-verdict
fallback in `run_gate()`; the second is the wider net.
