Status: closed
Verified by: `corepack pnpm -s exec vitest run packages/core/test/rank-report.test.ts -t "hides the row's own percentage under every credited mode"` (1 passed) on tbc-gear-prio@fbb66956; fix in tbc-gear-prio@d40a560a
Type: display defect
Origin: noticed while closing 103, 2026-08-10 — the same defect `5b7ee96` fixed for `package` mode
Blocks: none
Blocked by: none

# The row's own percentage stays visible under `weighted` and `full` modes

Commit `5b7ee96` hid `.pct` under `package` mode, because the percentage is
`deltaPct` — derived from the row's own single swap — while the DPS column had
switched to the package figure. Two numbers describing different quantities,
stacked in one column.

The `weighted` and `full` modes have exactly the same shape and predate the
package mode, so they carry the same defect and nobody filed it. On the
shredzepelin P3 artifact, Thunderheart Pauldrons renders:

| mode | DPS shown | `.pct` shown | agrees? |
|---|---|---|---|
| off | −106.16 | −4.93% | yes — same quantity |
| weighted | −90.43 | −4.93% | **no** |
| full | −74.70 | −4.93% | **no** |
| package | +64.07 | (hidden, `5b7ee96`) | n/a |

Under `full` the mismatch even crosses a sign boundary on rows whose credited
figure goes positive while `deltaPct` stays negative, which is the strongest
version of the misreading: the column reads "up, and here is the down
percentage".

## Fix

The same one, for the same reason. No weighted or full percentage was measured
— `prospectiveBonusDps` is an absolute DPS figure and `SET_POTENTIAL_WEIGHTS`
scales DPS, not a ratio — so deriving one against `ranking.baseline.dps` would
invent a quantity the pipeline never computed. Hiding `.pct` in these two modes
is the honest option, and it makes all three credited modes behave alike:

```css
body.weighted .pct, body.full .pct, body.package .pct { display: none; }
```

Presentation only. No computed value, sort key, or cutoff moves.

## Closed, 2026-08-10 in "Hide the row's own percentage under weighted and full modes too"

Fixed as specified. Red first: the test asserted the widened selector and failed
against the `package`-only rule.

The golden document was repinned, and the repin was **checked rather than
assumed** — `renderRankHtml`'s output grew by exactly the 186 characters the CSS
edit adds (26065 → 26251), and `rank-report-css.ts` is the only source file in
the diff, so the whole delta is inside `<style>` and no markup moved.

## Status flipped, 2026-10-11

The fix landed in `d40a560a`, the same commit that filed this ticket, but
the `Status:` line stayed `open`. Re-checked on `fbb66956`: the rule in
"Fix" is at `packages/core/src/rank-report-css.ts:524`, and the test at
`packages/core/test/rank-report.test.ts:1815-1820` passes (command on the
`Verified by:` line). The fork tab renders no percentage and has no weighted
or full mode (`grep -rn deltaPct` over the tab's `components`, `hooks`,
`utils` and `model` outside `model/engine` finds, outside test files, only
the cutoff-rule test in `DeltaCell.tsx:29`), so there is no twin to fix.

One side effect is tracked elsewhere: the "cleared by %-arm" note sits inside
`.pct`, so this rule hides it in the three credited views (ticket 617).
