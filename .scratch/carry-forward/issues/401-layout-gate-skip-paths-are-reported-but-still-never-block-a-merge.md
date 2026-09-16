Status: open
Type: gap
Origin: post-chunk2-five-workstreams handoff, workstream D
Blocks: none
Blocked by: none

# A skipped layout gate and a green layout gate look identical to `pnpm merge-to-dev`

## What

`scripts/check_layout_gate.py` has four documented skip paths (fork clone
absent, `test-layout.mjs` absent from an old fork clone, no built `dist/`,
no Playwright Chromium found), each calling `_skip()` (:446), which prints
`"layout gate: SKIPPED -- <reason>"` and returns 0. `merge_to_dev.py:169`
blocks the merge only on `layout_rc != 0`. So a merge proceeds identically
whether the layout was proven correct at four widths or never examined at
all -- the two states are indistinguishable from the merge's exit code.

This is partly deliberate: CI has no fork, so the gate's most common state
everywhere except the main checkout is "skip". The open question is whether
a skip should ever be allowed to gate the same way an unmeasured run does,
or whether skip-vs-ran needs to stay visible without becoming a merge veto.

## What is already done (not in scope to redo here)

The reporting half. `check_layout_gate.py` now exposes
`preview_skip_reason()` (a cheap, side-effect-free re-run of the same guard
sequence `run()` uses, stopping before `run_gate()` -- never the ~2m19s
Playwright test) and a `--preview-skip` CLI flag, wired into `pnpm verify`'s
tail summary (ticket 400) as a `layout: skipped -- <reason>` /
`layout: would run` line. `merge_to_dev.py`'s own invocation of
`check_layout_gate.run()` already printed the same reason via `_skip()`
before this ticket existed; nothing changed there. Committed on
`feat/desktop-transport-gate` (`df246b38`), verified 2026-09-15:
`python scripts/check_layout_gate.py --preview-skip` runs in ~0.3s and
prints the correct skip reason without invoking the gate.

## What is NOT done, and is an owner call

Whether a skip should ever block. Options, undecided:

1. **Leave it as report-only** (today's behaviour plus the new reporting).
   A skip is visible in both `pnpm verify` and `pnpm merge-to-dev` output,
   but never blocks. Simplest; matches "absence of a prereq is not a merge
   veto" as currently documented in `check_layout_gate.py`'s own docstring.
2. **Block a merge on the main checkout specifically** when the layout gate
   skips for a reason that SHOULD be satisfiable there (missing `dist/`,
   e.g. "run `make host` first") but allow it elsewhere. Needs a way to
   distinguish "this machine could have run it" from "this machine
   structurally cannot" (CI, a non-main checkout).
3. **Require an explicit acknowledgement flag** (mirroring
   `--ack-open-blockers`) to merge past a skip, so silence is never the
   default path.

This ticket exists to record the question and the `--preview-skip` tool that
now answers "would this skip, and why" cheaply -- not to pick an option.

## Note, 2026-09-16 (ticket 403, Track C)

**Unaffected — re-scoping this ticket was based on a wrong premise.** The 403
plan grouped 397, 400 and 401 as "tickets concerning the screening path" and
asked for a re-scoping note on each. That is accurate for 397 and 400 but not for
this one: 401 is about `scripts/check_layout_gate.py`'s four skip paths being
invisible to `pnpm merge-to-dev`, which has nothing to do with bulk screening or
the upgrades tab's transport. 403 changes neither the layout gate nor
`merge_to_dev.py`.

Recorded here only so the next reader does not go looking for a connection that
does not exist. Scope unchanged, status unchanged.
