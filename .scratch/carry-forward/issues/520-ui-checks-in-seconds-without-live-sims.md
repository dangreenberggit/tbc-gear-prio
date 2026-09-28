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

## Resolution (2026-09-28)

Open until the owner rules on the proposed process text below. Stage-gate
run `ui-storybook-lite`; the owner chose option A (fixture links and a smoke
command) over Storybook itself.

**Fork commits** (`vendor/tbc-new-fork`, `feat/upgrades-tab`, from bd6e76799):
c2bd011b adds a dev-server-only fixture index and `?upgrades-fixture=<name>`
auto-load (`tools/vite/tab_fixtures.mts`); d7cef6a5 and 5f3080db label the
export textarea (`aria-label`, set through `attributes`); 26d02891 drops the
layout gate's live ret run.

**Links.** `http://localhost:5173/tbc/tab-fixtures/` lists the 5 fixtures.
In the Browser pane a warm link settled in 4.8 s (feral-p3-p2bis, 683 rows)
and 3.4 s (ret-p3-p2, 909 rows); the first load after a server start took
7.9 s. Q-render criterion: a warm link settles in under 10 s and starts no
sim run. Met, so the in-app auto-load was built, not a standalone page.

**Smoke.** `pnpm tab-fixtures:smoke`: 5 ok each run. Cold, with the server
started and the Vite dependency cache rebuilt: 78.4 s wall (server up 26.1 s,
first fixture 30.6 s). Own server, warm cache: 21.0 s and 21.2 s. Reused
server: 17.3 s and 14.3 s, 1.4–5.6 s per fixture.

**Gate.** `time corepack pnpm layout-gate:check`, forced by a blank
`testedTabHash` before and by the moved digest after:

- Before (fork bd6e76799): 88.7 s wall, 129 passed. One bundle build, 4
  pre-run probes, one live ret run (`run produced 6 rows in 26.3s`), post-run
  axe at 4 widths (1.6 s in all), one fixture load (2.0 s).
- After (fork 5f3080db): 57.1 s wall, 76 passed. One bundle build, 4 pre-run
  probes, one fixture load (2.2 s), post-run axe once at 653 px (4.9 s),
  legibility and DPS checks at 4 widths.

The pass count falls because the live pass's legibility and DPS checks
repeated the fixture pass's at the same widths. On the 683-row fixture page
axe took 3.8–4.4 s per width (15,982 ms for 4 widths, `node f10-axe.mjs`, a
scratch script), so the owner ruled one width.

**Q-livesim.** The legibility and DPS-cell checks were already made by the
fixture pass. Post-run axe moved to the fixture page. Lost from the merge
gate: `[run] >= 5 rows within 120 s` and the check that the Run button
appears (`startRunExpression`); a merge to `dev` no longer proves a real run
lands rows in headless Chromium. The run path is still exercised by the
fixture recorder (`grep -n "upgrades-run-button"
scripts/tab-fixtures/record.mjs`) and by `pnpm tab-review` `post-run`
entries that name no fixture. The old post-run axe ran as soon as 5 rows
landed (the row poll breaks at `MIN_ROWS`, `git -C vendor/tbc-new-fork show
bd6e76799:test-layout.mjs | sed -n 955,990p`), mid-run, so it never scanned
the finished table. The new scan found a critical `label` violation on
`.upgrades-export-area`, now fixed.

**Fixture staleness accepted.** The label fix edits `upgrades_tab.tsx`, a
staleness input, so `pnpm tab-fixtures:check` now lists it for all 5
fixtures. That is a warning, not a failure. The owner accepted it with no
re-record: the edit changes rendering only, not what a run computes.

**Code lines** (`git -C vendor/tbc-new-fork diff --numstat bd6e76799 HEAD`;
`git diff --numstat e7a5fb4c HEAD -- scripts package.json`): fork +132 / −100
(plugin +78, `vite.config.mts` +2, `test-layout.mjs` +44 / −91, harness
comments +7 / −8, `upgrades_tab.tsx` +1 / −1); main +78 / −6 (smoke +69,
`package.json` +1, `check_layout_gate.py` +8 / −6). Net about +104, mostly
the smoke the owner asked for. The a11y baseline lost its stale
`.btn-outline-danger` entry, which never fired in the new gate run.

**Left out on purpose:**

- Bundle caching, dropping the repeated `tsc` in `build()`, and changing the
  gate digest: a separate speed-up, not needed to drop the live sim.
- The "check for nonsensical testing" guard: not asked for in this round.
- Parallel recording, new fixtures, re-recording: no fixture needed one.
- A standalone page or Storybook: the owner chose option A.
- Removing the **Load fixture** input or run helpers: still used by
  `?upgrades-dev` and `pnpm tab-review`.
- A replacement run smoke test for the dropped `[run]` check.
- Smoke extras (arguments, widths, axe, adding it to `pnpm verify` or CI).

## Proposed process text (owner approval pending; not applied)

**Draft 1:** `.claude/skills/stage-gate/plan-template.md`, replacing the
paragraph at lines 32–36:

> A step that changes what the Upgrades tab renders says how it is looked at. The default is a `Visual check:` line: the fixture names to look at and the one sentence to judge against. The executor looks by running `pnpm tab-fixtures:smoke` and reading those fixtures' PNGs, or by opening their links from `http://localhost:5173/tbc/tab-fixtures/` in the Browser pane (for hover, or a width other than 1280). Use a `Visual acceptance:` block instead only when the ticket must close on recorded evidence: captures at fixed widths, axe results, measured facts, a pre-run state, or an independent `gate-visual` verdict. The block names the state (`pre-run` / `post-run`), widths, selectors to capture, interactions, facts to record, and the sentence; the manifest schema is in the header of `vendor/tbc-new-fork/test-review.mjs` (`sed -n 13,17p vendor/tbc-new-fork/test-review.mjs`).

**Draft 2:** `.claude/skills/stage-gate/SKILL.md` and its byte-identical copy
`.agents/skills/stage-gate/SKILL.md`, step 5, before "When a plan step
carries a `Visual acceptance:` block":

> When a plan step carries a `Visual check:` line, the executor looks at each named fixture before that unit's re-pin — `pnpm tab-fixtures:smoke` and its PNGs, or the fixture's link in the Browser pane — judges it against the sentence, and records the smoke line and what it saw in its ledger. No `tab-review` run and no `gate-visual` seat.

**Draft 3:** `.claude/agents/gate-executor.md`, next to lines 99–106:

> `Visual check:` → run `pnpm tab-fixtures:smoke` (it starts `:5173` if the port is free) and Read the named fixtures' PNGs in `.scratch/tab-fixtures-smoke/`, or open their links from `http://localhost:5173/tbc/tab-fixtures/` in the Browser pane; judge against the sentence; record the smoke line and what you saw in the ledger; then re-pin.
