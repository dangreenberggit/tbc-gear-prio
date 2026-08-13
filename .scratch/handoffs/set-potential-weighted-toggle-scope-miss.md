# Set-potential weighted toggle — scope miss

**Date:** 2026-08-10
**What was asked:** a UI toggle to weight prospective set-bonus DPS (0.5x at
2pc, 0.25x at 4pc) into the ranking, so the toggle affects what's displayed.

## What actually got built

A CLI flag, `--with-set-potential-weighted`, mirroring the existing
`--with-set-potential` flag end to end:

- `view.ts`: `ViewOptions.withSetPotentialWeighted`, a `SetPotentialMode`
  threaded through `sortKeyFor` and `belowCutoffUnderView` (the actual
  comparator and cutoff/shortlist-membership decision for the whole ranking).
- `rank-report-rules.ts`: `formatWeightedSetPotentialLine`.
- `rank-report.ts` / `cli.ts`: wiring so the flag reaches both the console
  printer and the static HTML report generator.
- ~300 lines of new tests mirroring the density of the existing
  `withSetPotential` test block in `view.test.ts`.

This is real, tested, and `pnpm verify` passes. It is not what was asked for.

## Where this went wrong

1. **No toggle exists anywhere.** The HTML report (`rank-report.ts`) emits
   static HTML with zero `<script>`, zero client-side interactivity. "Toggle"
   was implemented as a CLI flag you pass before generating the file — seeing
   a different view means re-running `pnpm rank` from a shell, not clicking
   anything in a browser. That's not a UI at all.
2. **Went deeper into ranking logic than a display feature needed.** The
   instruction "this will also affect the ranks" was read as license to edit
   the actual sort comparator (`sortKeyFor`) and the actual shortlist/cutoff
   decision (`belowCutoffUnderView`) — the same functions that decide the
   *default* ranking's behavior — rather than asking first whether "affects
   the ranks" meant *reorder what's displayed* (safe to do at render time,
   given both the plain and weighted numbers) versus *change actual cutoff
   membership* (which is what got built, and carries real risk to shared
   logic every other view mode also depends on).
3. **Didn't surface the tradeoff before choosing.** Both readings of "affects
   the ranks" were plausible from the request alone. The deeper one should
   have been a clarifying question, not a default.

## What the correct shape looks like (not yet built)

A static HTML report that:

- Computes and embeds **both** the plain `deltaDps` order and the weighted
  order (or embeds enough raw data — `deltaDps`, `prospectiveBonusDps`,
  `nextThreshold` — as inline JSON) at generation time, server-side, as today.
- Ships a small inline `<script>` that toggles between the two entirely in
  the browser: re-sorting/re-hiding rows already present in the DOM, no
  process re-invocation. A page refresh to reset state is fine; a shell
  re-run to see the other view is not.
- Leaves `view.ts`'s comparator/cutoff functions as a **library** the report
  generator calls twice at build time (once per mode) rather than a runtime
  switch a browser click reaches into.

That keeps the core-ranking-logic risk exactly where it was (none — `view.ts`
still isn't touched at request time, only at report-generation time) while
actually answering "UI toggle."

## Disposition

Reverted. Not landed. See the branch this file ships on for whether the
revert is a separate commit or these files never made it past the working
tree.
