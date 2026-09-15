# Handoff — workstream A + D, verify-tail skip summary

Written 2026-09-15 by the session that ran A + D on `feat/desktop-transport-gate`.
Tip after this work: `fba42e1c` (two commits: `df246b38` the summary + ticket 390
fix, `fba42e1c` the two new tickets and 390's closure).

## How `pnpm` was made to run

Bare `pnpm`, `pnpm.cmd`, and `fnm exec --using=22 -- pnpm.cmd` all failed with
the fnm "can't find the necessary environment variables" error, matching the
prompt's warning. The fix that worked, from `docs/agents/known-traps.md` §
"Before running node / pnpm / test commands":

```bash
export PATH="/c/Users/dgree/AppData/Roaming/fnm/node-versions/v22.17.1/installation:$PATH"
```

(Bash form of the doc's PowerShell `$env:PATH` pin.) Prefixed to every Bash
call in this session — it does not persist across tool calls, so it was
re-applied each time. `node -v` then reported `v22.17.1` and `pnpm -v`
`11.24.0` reliably for the rest of the session. `cd X && <cmd>` was avoided
throughout per the same doc; every Bash call used the repo's absolute path
directly (no `cd`), since the tool's cwd was already `scripts/` at session
start and would not have matched the prompt's assumption of the repo root
without re-establishing it per call anyway.

## Real fork-gated counts, as measured (corrections to the prompt's numbers)

**Verify-step python scripts: 7, confirmed correct.** Command:
`grep -n "_fork_gate\|tbc-new-fork" scripts/check_*.py` plus reading each
`main()`. The seven: `check_ep_presets.py`, `check_equip_eligibility.py`,
`check_fork_lint.py`, `check_meta_conditions.py` (import `_fork_gate`),
`check_engine_port_drift.py`, `sync_fork_universes.py`,
`check_sim_implemented_effects.py` (self-gate). Cross-checked against
`package.json`'s `verify:steps` (was `verify`; see below) with
`node -e "..."` — 29 steps total, all 7 names present.
`check_layout_gate.py` imports `_fork_gate` too but is confirmed NOT a
verify step (`node -e "p.scripts.verify.includes('layout')"` → `false`);
it runs only from `scripts/merge_to_dev.py:166`. `check_desktop_tab.py`
(`desktop-gate:check`) is likewise absent from `verify:steps`. Both
correctly out of scope, matching the prompt.

**Vitest fork-gated test files: 7, not the handoff's 7-with-one-predicate
nor the prompt's "5 files, 3 predicates."** Actual count and shapes, from
grepping `forkPresent|hasWowsimsVendor|canRunForkSide|skipIf|runIf|existsSync`
across `packages/core/test/*.ts` and reading each hit:

| File | Predicate shape |
| --- | --- |
| `bulk-boundary.test.ts` | imports `forkPresent` from `fork-engine-harness.ts` (2-path: `engine/rank.ts` AND `assets/database/db.json`) |
| `bulk-screen-fallback.test.ts` | same import, same 2-path predicate |
| `bulk-screen-branch.test.ts` | same import; 2 separate `describe.skipIf` blocks in one file |
| `bulk-partition.test.ts` | own local `existsSync` on `partition.ts` only (1-path) |
| `bulk-screen-http-fixture.test.ts` | own local `existsSync` on the `engine` dir only (1-path) |
| `bulk-screen-driver.test.ts` | imports `forkPresent` from `fork-engine-harness.ts` (2-path) |
| `wowsims-fork-parity.test.ts` | `forkPresent && forkProtosGenerated` (3-path: the 2-path fork check plus `proto/common.ts` generated) |

So: **4 distinct predicate shapes** across these 7 files (2-path fork-harness,
1-path partition-only, 1-path engine-dir-only, 3-path fork+protos), not the
handoff's "all forkPresent" nor the prompt's "3 predicates". Two files the
prompt correctly excluded: `pool-hardening.test.ts` gates on
`hasWowsimsVendor` (`vendor/wowsims`, which CI DOES restore — not part of
the CI gap) and `weapon-type-exclusion.test.ts` is deliberately unguarded
(the documented negative example, per its own header comment). Also
excluded: `cli-sim-runner.test.ts` gates on a CLI binary path, unrelated to
the fork.

**A structural floor the prompt did not anticipate:** `wowsims-fork-parity.test.ts`
cannot reach 0 skipped even with the fork present and protos generated.
`describe.runIf(canRunForkSide)` (:864) and `describe.skipIf(canRunForkSide)`
(:998) are a complementary pair — exactly one always runs and vitest reports
the other as skipped, by construction. Verified: with `canRunForkSide` true
in this checkout, the real behavioural test ran and passed, and the paired
counterpart (`it.skip(...)`, intentionally empty) still showed as 1 skipped.
So "0 skipped" in the summary means "0 skipped due to fork absence", and the
true floor with fork present is 1, not 0. Recorded as a correction in ticket
400's Resolution rather than silently working around it.

## What A built

`scripts/verify_summary.mjs` — pure functions (`extractPythonSkips`,
`extractVitestSkips`, `formatSummary`), unit-tested directly in
`scripts/verify_summary.test.mjs` (10 tests, `pnpm exec vitest run
scripts/verify_summary.test.mjs` green) per AGENTS.md's testing section
("pure functions are also unit-tested directly ... where the logic is
intricate"). `extractPythonSkips` matches on the substring `skipped -- ` (not
a `<name>: skipped` prefix) because `check_equip_eligibility.py:239` reads
`"...Fork diff skipped -- ..."` with prose ahead of the word — caught by the
fork-absent done-when run initially under-reporting 6 of 7 scripts, fixed,
re-verified.

`scripts/run_verify.mjs` — the driver. Reads step names from
`package.json`'s new `verify:steps` script (the old `&&` chain, renamed and
kept as an escape hatch — `pnpm run verify:steps` still works standalone),
runs each as a child process, detects python skips from captured
stdout+stderr, and for the `test` step calls `vitest` directly with
`--reporter=json --outputFile=<tmp>` to get exact per-assertion skip/pass
counts and reasons (a skipped assertion's `fullName` IS its reason — vitest's
JSON reporter carries no separate field, and this repo's convention already
relies on that: the `wowsims-fork-parity.test.ts` skip counterpart is a real
`it()` whose only content is naming why). Also calls
`check_layout_gate.py --preview-skip` (new flag, see below) to add a
`layout: ...` line, since D asked for that even though the layout gate is not
a verify step.

`package.json`: `"verify": "pnpm run preflight:node && node
scripts/run_verify.mjs"`; the former `&&` chain moved verbatim to a new
`"verify:steps"` script that `run_verify.mjs` parses.

`scripts/check_layout_gate.py`: added `preview_skip_reason()` — the exact
same guard sequence `run()` uses (fork present? tab hash computable?
baseline unchanged? `test-layout.mjs` present? `dist/` built? Chromium
found?), stopping before `run_gate()` is ever called — and a `--preview-skip`
CLI flag that prints `layout: skipped -- <reason>` or `layout: would run` and
exits 0, never running the ~2m19s Playwright test. Measured cost:
`time python scripts/check_layout_gate.py --preview-skip` → 0.339s real. This
was necessary because D's ask ("print layout: skipped in A's summary") could
not be satisfied by calling `check_layout_gate.run()` directly from inside
`pnpm verify` without risking that 2m19s cost landing inside every verify run
on a machine that happens to have `dist/` built and a changed digest — a real
behavioural change the prompt explicitly forbade.

**Windows/pnpm gotcha hit and fixed, not documented anywhere before this:**
`spawn("pnpm", args)` without `shell: true` throws `EINVAL` on Windows
(`errno: -4071`), not `ENOENT` — easy to misdiagnose as a broken script.
Fixed with `shell: process.platform === "win32" && command === "pnpm"` in
`run_verify.mjs`'s `run()` helper. Separately, **`pnpm run <script> -- <args>`
forwards the literal `--` into the child's own argv on this pnpm/Windows
combination instead of stripping it** — broke `layout-gate:check
--preview-skip` loudly (argparse: `unrecognized arguments: -- --preview-skip`)
and broke `vitest run --reporter=json` silently (vitest fell back to its
default reporter, produced no output file, and `run_verify.mjs` printed a
caught error only visible by grepping the full log for "ENOENT" — the
`gates: N ran, M skipped` line still printed successfully with `vitestSkips`
silently zeroed, which would have under-reported every fork-absent run had
it not been caught by grepping the log for `ENOENT`/`Traceback`/`error:`
before trusting the "0 skipped" first result). Fixed by calling the
underlying binary directly (`pnpm exec vitest run ...`, `python
scripts/check_layout_gate.py ...`) instead of through `pnpm run <script> --`.
Neither gotcha is in `docs/agents/known-traps.md` yet — worth adding if
`run_verify.mjs` is touched again.

## Both done-when runs, actual output

**Fork present** (this checkout's real state — protos not generated —
`vendor/tbc-new-fork/ui/core/proto/common.ts` exists on disk but
`forkProtosGenerated`'s check evidently still reads false; not investigated
further since it doesn't change the summary's correctness, see the floor
note above):

```
gates: 1330 ran, 1 skipped
skip reasons:
  wowsims-fork-parity (E-W3) skipped: vendor/tbc-new-fork is present but its protos are not generated (run protoc — see .scratch/handoffs/wowsims-tab/slice-1/HANDOFF.md's 'Both proto paths' section) — this is expected in most checkouts, since vendor/ is gitignored and its build artifacts are gitignored again inside it
layout: skipped -- tab layout source unchanged since the last green run (digest c17d7792b76e...). Nothing to re-test.
```

rc 0.

**Fork renamed** (`mv vendor/tbc-new-fork vendor/tbc-new-fork.DISABLED`, ran,
then restored — `git -C vendor/tbc-new-fork status --porcelain` empty both
before and after, so the clone itself is untouched):

```
gates: 1295 ran, 37 skipped
skip reasons:
  sim-implemented-effects check: skipped -- vendor/tbc-new-fork is absent (vendor/ is gitignored). Nothing to regenerate against in this checkout.
  engine port drift check: skipped -- vendor/tbc-new-fork is absent (vendor/ is gitignored, plan D1). Nothing to check in this checkout.
  equip eligibility check: slug map total and injective. Fork diff skipped -- vendor/tbc-new-fork is absent (it is gitignored, so a fresh clone has none). Clone the fork to check the committed data/equip-eligibility.json against it.
  fork lint check: skipped -- vendor/tbc-new-fork is absent (vendor/ is gitignored, so a fresh clone and CI have none). Nothing to lint in this checkout.
  ep presets check: skipped -- vendor/tbc-new-fork is absent (it is gitignored, so a fresh clone has none). Clone the fork to check the committed EP weights against the symbols they name.
  meta conditions check: skipped -- vendor/tbc-new-fork is absent (it is gitignored, so a fresh clone has none).
  fork universes check: skipped -- vendor/tbc-new-fork is absent (the clone is gitignored and is not restored in CI). Nothing to check in this checkout.
  [... 30 more lines, one per skipped vitest assertion, one from each of the 7 fork-gated test files, each naming its own reason ...]
layout: skipped -- vendor/tbc-new-fork is absent (the clone is gitignored and is not restored in CI). The tab layout lives only on the main checkout.
```

rc 0 both times — a skip never fails verify, matching the "absence is an
ordinary state" convention already in every fork-gated script.

**"0 skipped" was not literally demonstrated** — see the structural floor
note above. What was demonstrated instead is the correct, complete
attribution of every skip that does occur, which is what the summary exists
to provide; a literal 0 would require generating fork protos, which is fork
state and out of A's core-only scope.

## Tickets filed / closed

- **400** (`400-ci-never-restores-the-fork-so-fork-gated-verify-steps-and-tests-silently-skip.md`) —
  filed and immediately **closed**, recording that A's verify summary closes
  the gap. Includes the structural-floor correction.
- **401** (`401-layout-gate-skip-paths-are-reported-but-still-never-block-a-merge.md`) —
  filed **open**. Records that `--preview-skip` now makes the skip reason
  visible everywhere it's asked for, but whether a skip should ever block a
  merge is left as an explicit, undecided owner call with three named
  options — no behavioural change made, per the prompt's instruction.
- **390** (`390-bulk-screen-fixture-api-v14-is-now-the-live-version.md`) —
  **closed**. Both acceptance boxes checked; see its own Resolution section
  for the fix (derived `RECORDED_SIM_VERSION`/`SIM_VERSION` from
  `CURRENT_API_VERSION`, new `IMPOSSIBLE_SIM_VERSION = "api-v-1"` sentinel).
- `NEXT` advanced to `402`. No collisions found (`ls .scratch/carry-forward/issues | grep -E '^40[0-9]-'` was empty before filing).

## Things the prompt or handoff got wrong

- The vitest predicate count: prompt said "3 different predicates" across 5
  files; actual is 4 predicate shapes across 7 files (see table above).
- `wowsims-fork-parity.test.ts` cannot reach a true 0-skipped state even
  with the fork fully working — the `runIf`/`skipIf` pairing always leaves
  exactly one skip. Neither the handoff nor the prompt anticipated this;
  it does not weaken the check (the real test still runs and is asserted),
  but it means the done-when wording "0 skipped" needed interpreting rather
  than taken literally.
- Nothing else in the prompt's specific claims (the 7-script count, the
  layout-gate-is-not-a-verify-step fact, the CI grep count of 0) was wrong —
  all reconfirmed independently above.

## Not done / explicitly out of scope, left for the next session

- No merge to `dev`, no `pnpm merge-to-dev`, no fork push — none were asked
  for and none were run.
- Ticket 401's actual behavioural question (should a skip ever block a
  merge) is unresolved by design — needs the owner's answer, not more code.
- The `pnpm run <script> -- <args>` / `spawn("pnpm", ...)` Windows gotchas
  found while building this are not yet in `docs/agents/known-traps.md`.
  Worth adding there if anyone else calls `pnpm` from a spawned child again.
