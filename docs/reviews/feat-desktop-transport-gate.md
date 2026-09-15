# Pre-merge review — feat/desktop-transport-gate

Reviewed range: `654a53b648fc6866cf95d6a1003d88d4aaa55a96..44e2aac6d3e49e56ae3929f9a8fb4aca180e406a`

Three axes, each fresh-context on the review lane (Opus, effort medium). The
load-bearing new code is `scripts/check_desktop_tab.py` (the gate) and
`scripts/dev-tab.ps1`; the CDP harness `run-tab-cdp.mjs` and the `data-runner`
tab edit live in the fork repo at commit `eb040855c` (out of the core diff, so
the adversarial and spec axes were pointed at it explicitly).

## Adversarial

The gate is well-defended against the fooling paths the brief named; most are
genuinely closed (the worker-attach race is closed by `waitForDebuggerOnStart`,
`refuse_old_node` fails closed on a parse error, N1/N2 exercise real WASM and a
forced fallback and are refused for the right reasons, `dev-tab.ps1 -Desktop`
passes no `--usefs`). One material silent-failure mode survived.

**M1 (material) — the gate judged a stale readback when the harness crashed
before writing.** `check_desktop_tab.py` `run_harness` called
`subprocess.run(args, check=False)` and discarded the harness's exit code, then
checked only `out_path.is_file()`. The `--out` paths are two fixed gitignored
files (`.scratch/desktop-gate/last-run.json`, `last-run-fallback.json`) that
persist across invocations, and the harness writes `--out` only on a clean
finish. So a harness crash after one green run (Chrome launch fail, CDP timeout,
an unknown-arg throw) left the prior passing JSON on disk and the gate read _that_
and reported a false pass — the "an exit code is not evidence" trap (AGENTS.md),
inverted. Confirmed by reading lines 205–209 (no unlink, no returncode check) and
`ls .scratch/desktop-gate/` (both files present from a prior run).

**m1 (minor) — one-shot force-fallback misfire** is caught by the
`forceFallbackRemaining == 0` assertion plus the N2/twin `raidSimAsync >= 1`
predicate; residual, not a live defect.

**m2 (minor) — T2's top-8 coverage gap is disclosed, not over-claimed.** The gate
prints "rows 1..8 … covered by T3 only". Honest.

## Domain

No blocking findings. Statistics and baselines are sound and sourced, not
remembered.

- The SE/cutoff numbers check against committed sources: `docs/five-seed-spread.json`
  gives ret `meanReportedSe 1.6781`, `recommendedCutoff.absDps 3.4`
  (`max(3.0, 2×1.678)`); the gate's T4 = 3.4 is that bar verbatim, and
  K = 5 × √2 × 1.678 ≈ 12.0 uses the same paired-fold √2 factor `cutoff.ts` uses.
  The gate records the empirical max/median beside K rather than trusting the
  constant — the correct way to hold an unmeasured bound. Not numerology.
- Ret P5 baseline ~2072 WASM is independently corroborated: Chunk-1's committed
  readback recorded 2071.9 for the same WASM run; the gate's 2072.2 matches to
  0.3 DPS. 617 candidates = the committed ret-p5 universe; 601 rows / 33–36 above
  cutoff is internally consistent.

**D-M1 (material) — the 159 DPS Go-native vs WASM baseline gap.** A 7.7% baseline
difference on the loop route (no screening) between two compiles of one Go source
is large. The "cross-compilation artifact" disposition is defensible (it is not
seed choice; the desktop engine is internally reproducible at 1.8 DPS old-vs-tip;
WASM is the corroborated side), but the "two numerically distinct engines" claim
is a hypothesis, not a measured fact — the brief's DoD #4 (parity across
transports) was written expecting agreement and is not met. Settle with one
fixed-gear, fixed-seed native-vs-WASM sim. Not a blocker; the load-bearing check
was correctly re-scoped to same-transport (`baselineDpsDiff 0.0`). → ticket 398.

**D-m1 (minor) — the 2.05× desktop slowdown** is a plausible domain outcome
(the Go bulk path runs multi-stage convergence per chunk), not a red flag; the
DPS numbers are not wrong because the run was slow. Flagged for a ticket. → 397.

Out of contact with this diff: WCL-side facts (no gear-reading or spec code
changed), the feral cutoff (ret-only gate), the D7 CRLF `verify` failure
(pre-existing, ticket 211).

## Standards

**No hard violations.** Both scripts obey the repo's rules.

- Comment policy (why-not-what): the `noqa` markers, the `fnm exec` note, the
  make/POSIX-tools PATH note, the "deliberately without usefs" note, and the
  tolerance-constant rationales all record non-obvious _why_. No what-restating
  comments.
- Durable-claims: every measured constant (`EXPECTED_ELIGIBLE`, `FULL_ROWS`,
  the tolerances) names the command/date/fork sha it was measured on and says to
  re-measure on universe regen. The lock's `pushed:false` + appended `_comment`
  matches `upstream-catch-up.md` § 5/7. Regen moved only `forkCommit`.
- CLI-environment: paths resolved from `$PSScriptRoot` / `Path(__file__)`, no
  cd-then-command chains, `git -C`-style directory flags.

**Judgement calls (baseline smells), neither worth blocking:** a `(spec, phase)`
data clump across three parallel nested dicts (`EXPECTED_ELIGIBLE`/`UNIVERSE_CAP`/
`FULL_ROWS`), and the flat ~18-key `compare_readbacks` result dict (a
`CompareResult` type would document the contract). Both defensible in a
single-caller gate script.

## Spec

The load-bearing deliverable (`check_desktop_tab.py`) is faithful to the plan:
all four modes present, the fork edit is the exact two-statement-plus-comment
shape step 3 specified, the gate's (a)–(h)/N1/N2 match step 7's pass/fail pattern,
and every Paths-manifest file is present with no path outside it. Deviations
D1/D3/D4/D6 each depart from literal plan text but preserve the acceptance's
intent (verified in the Gate C dispositions). Two spec obligations remain open:

**S1 — DoD #9 / step 12 acceptance ("`pnpm verify` rc 0 on the tip") is not
met.** `fork-universes:check` is red. Pre-existing CRLF/LF drift (D7),
commit-independent, ticket 211's domain — surfaced, not hidden. Against the
literal spec it is a partial; the honest call is the owner's, not a silent pass.

**S2 — the Q2/C8 ticket the plan's own text says is owed was unfiled.** Plan
step 5 Q2(b): screening-not-a-speed-win "is a finding against parent C8, not a
shrug". Filed as part of this review. → ticket 397.

## Summary

Four axes, one material adversarial finding (M1, fixed in-branch), one material
domain finding (D-M1, ticketed), two spec obligations (S1 inherited/owner's call,
S2 ticketed), the rest minor or clean. No axis blocks the branch on its own
terms; the one genuine gate defect (M1) is fixed and the gate re-verified. The
tip's `pnpm verify` is red on the single inherited `fork-universes:check` gate
(ticket 211) — a conscious merge decision, not a defect of this branch.

## Disposition

| ID   | Axis        | Disposition | Ticket / note                                                                                                                                                                           |
| ---- | ----------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M1   | Adversarial | fixed       | `check_desktop_tab.py` `run_harness`: unlink the stale `--out` before running, and fail on a non-zero harness exit. Gate re-run green after the fix.                                    |
| m1   | Adversarial | wontfix     | Misfire already caught by `forceFallbackRemaining == 0` + N2 predicate; residual, not a live defect.                                                                                    |
| m2   | Adversarial | wontfix     | Top-8 coverage gap is disclosed in the gate's own output; honest, not over-claimed.                                                                                                     |
| D-M1 | Domain      | defer       | `.scratch/carry-forward/issues/398-go-native-vs-wasm-baseline-gap.md` — 159 DPS engine gap; disposition defensible, parity claim untested; settle with a fixed-gear native-vs-WASM sim. |
| D-m1 | Domain      | defer       | `.scratch/carry-forward/issues/397-desktop-bulk-screen-not-a-speed-win.md` — 2.05× slowdown.                                                                                            |
| STD1 | Standards   | wontfix     | `(spec, phase)` data clump; defensible in a single-caller script.                                                                                                                       |
| STD2 | Standards   | wontfix     | `compare_readbacks` result-dict data clump; defensible.                                                                                                                                 |
| S1   | Spec        | defer       | Red `pnpm verify` on `fork-universes:check` — pre-existing CRLF drift, ticket 211's domain, out of this chunk's manifest. Owner's merge call.                                           |
| S2   | Spec        | fixed       | Q2/C8 ticket owed by the plan's text — filed as `.scratch/carry-forward/issues/397-desktop-bulk-screen-not-a-speed-win.md`.                                                             |
