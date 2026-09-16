# 408 — the verify gate counter miscounts, and is neither an upper nor a lower bound (adversarial A2, material)

Status: open
Type: bug
Origin: pre-merge review of feat/desktop-transport-gate, round 3 (2026-09-16)
Blocks: —
Blocked by: none

## What

Ticket 400 exists precisely to make the `pnpm verify` ran/skipped count
trustworthy. This is that counter, and it has three separate defects, all in
the new verify tooling.

**1. A step that did real work can score as a pure skip.**
`scripts/run_verify.mjs:139-156` credits a non-test step to `stepsRan` only
when `extractPythonSkips(output)` is empty (`:150-154`: if `skips.length > 0`
the skip lines are pushed and `stepsRan` is **not** incremented). But
`scripts/check_equip_eligibility.py:239-240` prints its skip line alongside
real work it already did: `"equip eligibility check: slug map total and
injective. Fork diff skipped -- vendor/tbc-new-fork is absent..."`. The slug
map check ran; only the fork diff half skipped. The step scores 0 toward
"ran" even though most of its work happened.

**2. The counter counts skip *lines*, not skipped *steps*.**
`scripts/verify_summary.mjs:76`: `const skippedCount = pythonSkips.length +
vitest.skipped`. `pythonSkips` is a flat array of matched lines, not steps.
`scripts/sync_fork_universes.py` has two skip sites (`grep -c "skipped --"
scripts/sync_fork_universes.py` returns 2), so one step emitting two skip
lines reports as two skipped gates in the summary.

**3. The extraction regex is substring-based and produces false positives.**
`scripts/verify_summary.mjs:30`: `/^.*\bskipped\s*--\s*.+$/gm`. This matches
any line containing the substring `skipped -- `, regardless of surrounding
words. A prose line such as `note: nothing was skipped -- all gates ran`
would be extracted as a skip reason and counted as a skip, even though it
says the opposite. Confirmed by running the extractor against that string.

**4. Reports success after failing to read vitest's report.**
`scripts/run_verify.mjs`: the try/catch at `:140-147` parses vitest's JSON
report and assigns `vitestSkips`; the default `vitestSkips = { ran: 0,
skipped: 0, reasons: [] }` is set once at `:108`, before any step runs. If
the JSON report is missing or unparseable, the catch block (`:143-147`)
logs to stderr and falls through — `vitestSkips` is left at that all-zero
default and execution continues. The run still exits 0 (no `process.exitCode`
is set here, unlike the real-failure path at `:132-137`) and prints a summary
(`:175-186`) whose test count is silently zero. The file's own module header
(`:1-21`, specifically `:66-71`) records that this exact failure already
happened once and "was caught only by grepping a full verify log for
\"ENOENT\", not by any exit code" — so the catch block at `:140-147`
preserves the very property the header complains about.

The same shape exists around `:159-173` for the layout preview (parses
`check_layout_gate.py --preview-skip` output, catches and logs on failure,
continues). That one is genuinely advisory — `layout` is only used to print
an extra summary line, never to gate `--full`/skip logic or set an exit
code — so it is NOT a defect. Say so explicitly, so nobody "fixes" that one
too.

This belongs in 408 rather than its own ticket because it is the same file
(`scripts/run_verify.mjs`) and the same class of problem as defects 1-3: the
verify summary reporting numbers it did not actually establish.

## Consequence

The printed `gates: N ran, M skipped` line can be wrong in both directions —
undercounting "ran" (defect 1) and overcounting "skipped" (defects 2 and 3)
— so it cannot be used as evidence about CI coverage, which was ticket 400's
whole purpose.

## Fix direction (do not choose)

- Credit a step to `stepsRan` based on whether the step's process succeeded,
  independent of whether it also emitted a skip line for part of its work.
- Count skipped *steps* (one increment per step that skipped), not skip
  *lines* emitted by that step.
- Tighten the regex to match the scripts' actual skip-line shape (a leading
  name/prefix before `skipped --`), not any line containing the substring.

## Verify

After a fix, re-run `pnpm verify` with a fork worktree present and absent and
confirm the printed `ran`/`skipped` counts match a manual read of the
per-step output, including a step (like `check_equip_eligibility.py`) that
does real work and also emits a skip line.
