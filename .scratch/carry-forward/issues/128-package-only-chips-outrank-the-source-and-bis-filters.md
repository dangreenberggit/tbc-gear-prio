Status: closed
Type: bug
Origin: pre-merge review of `feat/set-bonus-value`, round 3, 2026-08-12 (adversarial axis, 3-A2)
Blocks: none
Blocked by: none

# In package mode, a package-only chip ignores the source and BiS filters

`rank-report-css.ts:222` reveals package-only chips in package mode:

```css
.chip.package-only { display: none; }              /* :221 */
body.package .chip.package-only { display: inline-flex; }   /* :222 */
```

That selector is more specific than both hiding rules it has to lose to:

- `.source-hidden { display: none; }` (`:444`)
- `body.bis-only .chip:not(.is-bis) { display: none; }` (`:452`)

So once package mode is on, a chip admitted by `:222` stays visible even when
the reader has filtered its source away or asked for BiS only.

The two conditions disagree rather than one simply winning, and the report's
JavaScript takes the other side: its `visible` test correctly excludes the chip.
The result is a chip that renders with a blanked position number, is left out of
`list-count`, and is left out of `exportChips`. The Export caption promises the
payload is the curated list "as currently filtered and sorted", which is then
false against what the reader is looking at.

Reachable in the committed artifacts: the two package-only chips (items 30989
and 30997) are both non-BiS and single-sourced, and the report ships a BiS
checkbox plus 14 source checkboxes.

Reproduce: open a report generated with `--with-set-potential`, select the
**Package** display mode, then tick "BiS only" (or untick the chip's only
source, "Hyjal Summit"). The chip stays on screen; the count and the export
disagree with it.

Likely fix is to make the reveal lose to the filters rather than beat them —
either fold the filters into the same specificity tier (a single rule that
decides chip visibility) or gate `:222` on the filters not having excluded the
chip. Worth deciding alongside whether the JavaScript `visible` test or the CSS
should be the single authority on chip visibility, since this is the second time
the two have disagreed.

## Acceptance

- [x] In package mode, a package-only chip whose source is unticked is hidden.
- [x] In package mode with "BiS only" ticked, a non-BiS package-only chip is
      hidden.
- [ ] The chips the reader sees, `list-count`, and `exportChips` agree in
      package mode under every filter combination.

## Closing note (2026-08-12)

Fixed in commit `2f29cf9` ("Fix package-only chip reveal outranking the
source/BiS filters (ticket 128)") on `feat/set-bonus-value`.

`body.package .chip.package-only` (specificity 0,3,1) is replaced by
`body.package .chip.package-only:not(.source-hidden)` (0,4,1 — the `:not()`
pseudo-class counts its argument's specificity, so the extra `.source-hidden`
class raises it by one class tier). This is now strictly higher than
`.source-hidden` alone (0,1,0), and it no longer matches a chip that is
source-hidden, so `.chip.package-only`'s base `display: none` (0,2,0) and
`.source-hidden`'s `display: none` stand uncontested for that chip. A new
rule, `body.package.bis-only .chip.package-only:not(.is-bis)` (0,5,1 —
`body`=1 type, `.package`/`.bis-only`/`.chip`/`.package-only`/`.is-bis`
(inside `:not()`)=5 classes), sits after the reveal rule in source order and
at higher specificity, so it wins the BiS case the same way. Both new
selectors were checked by hand against the existing hide rules at
`.source-hidden` (:444) and `body.bis-only .chip:not(.is-bis)` (:452) — see
the arithmetic above; not verified against a live browser cascade (no jsdom
environment in this package — see below).

Verified:
- `pnpm --filter core exec vitest run test/rank-report.test.ts` — all 134
  tests pass, including two new string-level pins on the reveal/guard
  selectors and a repinned byte-identical-document golden hash (confirmed by
  stashing/popping the CSS edit and diffing rendered output — the whole delta
  sits inside `<style>`).
- `pnpm verify` — full gate green (707 tests, all checks).

Test note: no jsdom/cascade-evaluating test harness exists in this package
(checked `packages/core` for a vitest `environment: jsdom` config and found
none), so the two new tests are string-level pins on the emitted CSS source,
matching this file's existing convention (e.g. the "hides those chips outside
package mode" test at the same describe block). They fail on a regression to
the old bare selectors but do not evaluate the cascade itself — the
specificity arithmetic above is the substitute for that.

Regenerated `.scratch/set-bonus-value/ret-catchup/artifacts/slamaltman-p3.html`
render-only from its committed `.json` sidecar (`renderRankHtml(ranking,
meta)`, no new sim run — same precedent as commit 102b425 for the same file).
Diffed before/after: the only change is the CSS block above.

Not regenerated / not checked beyond the ticket's named glob
(`.scratch/set-bonus-value/**/artifacts/*.html`): other committed HTML
artifacts elsewhere under `.scratch/` (e.g. `.scratch/rank-reports/`,
`.scratch/phase2-verify-ui/reports/`) also embed the old pre-fix CSS and were
out of scope for this pass — untested whether any of them are still load-
bearing for another workflow.

The third acceptance box (chips/list-count/exportChips agreement under every
filter combination) is left unchecked: the JS `visible` test and the new CSS
were compared by hand for the two named scenarios (source-hidden,
BiS-excluded) and match, but no automated test exercises the full combination
matrix or an actual DOM/cascade, so "every combination" is not verified by a
re-runnable command.
