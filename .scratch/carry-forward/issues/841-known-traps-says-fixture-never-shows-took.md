Status: open
Type: task
Origin: .scratch/carry-forward/issues/801-axe-and-visual-review-on-every-spec-page.md (the 11-page `pnpm tab-review` run, 2026-11-06)
Blocks: none
Blocked by: none
Related: 801, 504

# known-traps says a fixture load never shows "Took"; it shows "Took 60.0s"

## What happens today

`docs/agents/known-traps.md:271` says "A fixture load never shows
"Took": no run happened". Every made-up fixture loaded in ticket 801's
`pnpm tab-review` run shows "Your current gear: ... DPS. Took 60.0s." at
the top of the results (for example `801-shadow-post-run-1280-0.png` in
`.scratch/agent-reports/801-runs/tab-review/`, gitignored). The 60.0 s is
the made-up `durationMs: 60000` that
`packages/core/test/tab-fixtures/make-mock-fixtures.ts` writes into
every fixture's ranking.

Ticket 801 fixed the same false sentence in `data/tab-fixtures/README.md`.
It did not edit `known-traps.md`, which was outside that slice's paths.
The advice itself, "wait for result rows and no stale banner", is still
right (`data/tab-fixtures/README.md:86-89`).

## Done when

`known-traps.md` says what a fixture load shows: the "Took" time is the
fixture's made-up `durationMs`, so a script never waits for it.
