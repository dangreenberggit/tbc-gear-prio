Status: open
Type: task
Origin: owner, 2026-09-27, answering the reliability-batch questions (`.scratch/stage-gate/reliability-batch/owner-words.md`, gitignored)
Blocks: none
Blocked by: none
Related: 504 (recorded tab fixtures), 502 (needed two fixture re-recordings)

# UI checks should take seconds: layout check without live sims

## What the owner said

Verbatim, from `.scratch/stage-gate/reliability-batch/owner-words.md`
(gitignored), the first two paragraphs of the owner's answer:

> My impression of the live run situation is that it's running when it shouldn't, especially with that mention of checking accessibility. The main testing I wanted set up was a light form of storybook and checking the UI should take seconds, not entire sims and whatnot (putting aside the parallel work issue, which if the sims are necessary maybe that's an option)
>
> The recordings seem potentially related

Later the same day, verbatim from the same file:

> We'll have to note here for after this batch to resolve this simming and UI testing issue because it seems (if I understand) to have gone so wrong. And maybe even have a check for nonsencisl testing

The owner wants this resolved right after the reliability batch: it is next
in line.

## Goal

The owner's: UI checks take seconds, and live sims run only where they are
truly needed.

## What is known today

Measured during the 2026-09-27 investigation unless marked otherwise.

- One layout-gate run (`pnpm layout-gate:check`) takes about 74 s. A run on
  2026-09-27 at fork `bd6e76799` took 80 s wall time (20:29:21 to 20:30:41).
- About 25–35 s of that is one live ret sim, measured in five runs. The
  80 s run above logged `run produced 6 rows in 26.3s`.
- About 40 s is an uncached bundle rebuild, including a `tsc --noEmit` over
  the whole fork. That figure is an **estimate by subtraction**, not a
  measurement. `pnpm verify` already runs the same fork `tsc --noEmit`
  through `pnpm fork-lint:check` (`scripts/check_fork_lint.py`, the `TSC`
  call), and `build()` in `vendor/tbc-new-fork/test-tab-harness.mjs` runs
  it again on every gate run.
- The live run exists to land result rows for the post-run asserts and the
  post-run axe checks. The fixture pass already runs the same asserts on
  recorded rows: 683 rows in 1.8–2.5 s (`fixture feral-p3-p2bis: 683 rows
  settled in 2.0s` in the 80 s run). The fixture pass runs **no** axe.
- The gate's digest (`scripts/check_layout_gate.py`, `ENGINE_DIR` and
  `_iter_root_gate_files`) covers every `upgrades/engine/**/*.ts` file and
  every `data/tab-fixtures/*.json`. So any engine edit or fixture
  re-recording forces a full gate run, live sim included.
- Re-recording a fixture is a live sim of about 3 min each
  (`scripts/tab-fixtures/record.mjs`). It is needed when engine output
  changes. Recording several fixtures in parallel is **untested**.

Re-measure the gate with `time corepack pnpm layout-gate:check` after a
change that moves the digest (an unchanged digest skips the run, and a skip
is not a measurement).

## Options

None is chosen. These are options, not a design.

- Drop the live ret sim from the layout gate, and run the post-run asserts
  and axe on fixture-loaded pages instead.
- Stop `build()` repeating the fork `tsc --noEmit` that `pnpm verify`
  already runs, and cache the bundle by a hash of its sources.
- Narrow the gate digest once no live run depends on the engine: engine
  output then reaches the page only through fixtures, whose own staleness
  `pnpm tab-fixtures:check` reports.
- A "light storybook" in the owner's words: a static page that renders the
  tab from a fixture without booting the sim app.
- Keep live sims for the checks that truly need them, run on purpose (for
  example a fixture-freshness check), not on every UI check.
- Record fixtures in parallel, if live recording stays necessary (untested).
- The owner's "check for nonsencisl testing" (quoted above): a guard that flags a test or
  check doing work it should not need, for example a UI check that starts a
  live sim (a WASM fetch, a sim worker, or a Run click during a UI-only
  pass), or a time budget a UI check fails when it exceeds.
