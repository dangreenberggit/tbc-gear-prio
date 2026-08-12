Status: open
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

- [ ] In package mode, a package-only chip whose source is unticked is hidden.
- [ ] In package mode with "BiS only" ticked, a non-BiS package-only chip is
      hidden.
- [ ] The chips the reader sees, `list-count`, and `exportChips` agree in
      package mode under every filter combination.
