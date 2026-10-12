Status: closed
Serves: .scratch/plans/upgrades-tab-finish-line.md, Stage 3T box 4 (Tab-adjacent)
Type: task
Origin: docs/reviews/docs-stage-3t-boxes.md (finding R8)
Blocks: none
Blocked by: none

# The desktop gate prints PASS when the served bundle differs from dist

`pnpm desktop-gate:check` (`scripts/check_desktop_tab.py`) first runs the
byte check (`bytes_check`, lines 520-564): it fetches every file under
`vendor/tbc-new-fork/dist/tbc` from the packaged binary on port 3333 and
compares the bytes. `bytes_check` returns 1 when any file is missing or
differs and prints the paths. The caller (lines 668-670) returns early only
when the result is 2; a result of 1 is ignored, and the verdict at line 703 is
`gate_ok and golden_rc == 0`. So a run whose served bundle differs from dist
still prints `desktop-gate: PASS.` with rc 0.

The stage-gate plan for this gate
(`.scratch/stage-gate/desktop-transport-gate/plan.md`, step 6) treated the
byte check as the one-time Q1 measurement, and said that a mismatch "is the
finding". It does not say whether a later mismatch should fail the gate.
PLAN.md § Stage 3T box 4 ("The desktop transport passes on the shipped fork
commit") reads on rc 0 alone.

No run is known to have had a mismatch: the 2026-10-11 and 2026-10-12 runs
printed `0 mismatches` (`.scratch/stage-3t/desktop-gate-176268e7c.log`,
`.scratch/stage-3t/box4-desktop-gate-176268e7c-2026-10-12.log`).

Re-run to see the code path:

    grep -n -E "brc|bytes_check|overall" scripts/check_desktop_tab.py

Done when: the gate fails (rc 1) on a byte mismatch, or the script and PLAN.md
say in one sentence why a mismatch is information only, and a test covers
whichever is chosen.

## Comments

2026-10-12 — closed. The byte check now feeds the verdict:
`gate_passed()` in `scripts/check_desktop_tab.py` requires the byte check's
rc to be 0 as well as (a)-(f) and (h), and a mismatch prints
`(bytes) FAIL: the served bundle differs from dist/tbc` before
`desktop-gate: FAIL.` (rc 1). `scripts/check_desktop_tab_verdict.py`
(`pnpm desktop-gate:unit:check`, in `pnpm verify`) covers the verdict, and
fails on the old logic for the mismatch case. A full gate run on fork
176268e7c after the change printed `140 files compared, 0 mismatches` and
`desktop-gate: PASS.` with rc 0.

Verified by: `python scripts/check_desktop_tab_verdict.py` and
`corepack pnpm desktop-gate:check; echo rc=$?` (rc 0, PASS on fork 176268e7c)
