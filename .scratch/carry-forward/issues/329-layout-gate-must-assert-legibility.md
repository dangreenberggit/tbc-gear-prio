Status: open
Type: bug
Origin: owner report, 2026-08-28; supersedes the framing of ticket 322
Blocks: none
Blocked by: none

# The layout gate must assert cell legibility, not just structure

Ticket 322's gate (`test-layout.mjs`) was reported as "proven to bite," yet it
passed a results table with text going vertical, text clipped, and huge row gaps
below 768px (ticket 327). The gate tested the wrong things: viewport overflow,
control-group order, sticky, and the F11 `grid-column` span — all **structural**
facts. None of them sees a cell whose text has wrapped to one character per line,
a cell whose text is clipped, or rows spaced far apart. The owner's phrase: an
automated viewing review was supposed to catch exactly this.

## What the gate must add

Assertions that a human reading the table would care about, at widths **below
768** (375 / 653 / 767) as well as desktop:

- **No vertical / per-character text in results cells.** A cell whose rendered
  text height implies it wrapped to ~1 character per line (e.g. `scrollHeight`
  many times the line-height for a short string, or a cell width near `1ch`) is
  a failure. Slot labels and DPS figures must render on one line.
- **No clipped text.** A cell whose `scrollWidth > clientWidth` (or
  `scrollHeight > clientHeight`) with `overflow` hiding it — text the reader
  cannot see — is a failure.
- **Sane row spacing.** Row/grid `row-gap` (or row height) within a reasonable
  bound — no huge vertical gaps between rows.

These are DOM-geometry assertions like the existing five, measurable with
`getBoundingClientRect` / `getComputedStyle`, so they fit the gate's existing
raw-CDP mechanism.

## Also (from ticket 325/326, folded in for context)

The gate still isn't wired into any automated run (ticket 325), and assertion #5
has a width-parity escape hatch (ticket 326). This ticket is specifically about
the gate testing legibility; those two remain their own items.

## Where

`vendor/tbc-new-fork/test-layout.mjs`. The environment CAN drive the required
narrow widths (the browser pane's `resize_window` works this session), so these
assertions are runnable here.
