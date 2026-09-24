Status: closed
Type: task
Origin: owner live look at the 483-488 polish arc, 2026-09-22
Blocks: none
Blocked by: none
Related: 483, 481, 468

# Widen the Source column cap so rows are not four lines tall

Owner ruling, 2026-09-22: "Wider source cap is fine. There's no point having
only a one or two line long item name if the source makes it four lines."

483 fixed the shared column scheme at Rank 2.5rem / Slot 5.5rem / DPS 5.5rem
/ Source 7rem (wrapping at spaces) / two 2rem action cells / Item = remainder
(fork 86981ed30, `resultsColgroup()` in `upgrades_tab.tsx`, rules in
`_upgrades_tab.scss`). At 7rem, long sources such as "Serpentshrine Cavern
(N) Fathom-Lord Karathress" wrap to four lines and the row grows to ~119 px
while the Item column sits at ~306 px with room to spare.

## What would close this

- Source cap raised (try 10-11rem) and Item's share reduced accordingly, so
  the longest Source in the feralcat phase-3 pool takes at most two lines at
  1280 while item names still fit on one or two lines.
- Measured with `pnpm tab-review` `rect:` facts on the Source cell and the
  row (row height should drop from ~119 px toward the 73-84 px of untagged
  rows) — 481's Comments hold the earlier measurements and method.
- Both settled tables and the provisional table still share the one colgroup
  and still fit their scroll hosts at 1280 (no horizontal scrollbar).
- `python scripts/check_layout_gate.py` failed:0 a11yFailed:0; re-pin;
  `pnpm verify` rc=0.

## Comments

**2026-09-24 — closed (stage-gate upgrades-tab-closeout round 1).**
Source is now 11rem (`.upgrades-col-source` in `_upgrades_tab.scss`);
no other width moved. Fork `49a1208fc6f7b8421bd80b17291037fbe1960c0b`,
main re-pin `998214aca9bd73aaa217642a2051cdee9beb493a`.
`pnpm verify` rc=0. Layout gate: real run, `passed:53 failed:0
a11yFailed:0` (a11yWarned 28), baseline advanced to `3a2f188ed755…`.

How it was measured: a settled, uncapped feralcat phase-3 run on
:5173 with :3333 up (browser pane, 1280×1400, 401 candidates, "Took
215s"), fork `5d84ffff9` unedited. A JS probe injected
`.upgrades-results-table .upgrades-col-source{width:Xrem !important}`,
opened the below-cutoff `<details>`, and read all 338 rows. Line count
is the number of distinct text-line tops in a cell. Source always
renders the zone and the boss as two blocks, so 2 lines is its floor.

| Width | Source col px | Item col px | Tallest row | Its Source lines | Rows with Source > 2 lines | Max item-name lines | Median row |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 7rem (before) | 98 | 299 | 119px (Pendant of Titans, "Black Temple (N) / Reliquary of the Lost") | 6 | 253 | 1 | 84px |
| 10rem | 140 | 257 | 101.5px (Vambraces of Ending, "Tempest Keep (N) / High Astromancer Solarian") | 5 | 134 | 1 | 56px |
| 11rem (chosen) | 154 | 243 | 84px (Razor-Scale Battlecloak, "Serpentshrine Cavern (N) / Morogrim Tidewalker") | 4 | 95 | 1 | 56px |

For context only: 12rem and 13rem still leave 4-line sources (84px);
14rem is the first width with a 3-line maximum (67px). The plan's rule
was "the smallest of 10/11rem where the tallest Source is ≤ 2 lines,
else 11rem with the shortfall recorded". No width up to 14rem gets
every Source to two lines, so 11rem was taken by the fallback. The
tallest row now matches the ~84px untagged band this ticket asked for,
and no item name wraps at any tested width (the tallest Item cell is 2
lines only where a tag line sits under a one-line name).

Scroll hosts: once settled there are two tables and two
`.upgrades-table-scroll` hosts (the provisional table exists only
mid-run). Each has clientWidth 642 (> 0) and scrollWidth 646, at every
width including the unedited 7rem. So the 4px overflow is older than
this change and does not come from Source. It comes from the last
action cell's compare button (`.selector-modal-list-item-compare`),
which ends at x=969.7 against the host's right edge at 966.2. Not fixed
here: action widths are outside this ticket.

After the edit, the live page (Vite HMR, same settled run) read
`col.upgrades-col-source` = 154px and the tallest row = 84px with no
injected style.

`pnpm tab-review` (mid-run ret capture at 1280, manifest
`489-manifest.json` in the round folder): `sourceWidth` = 154px; first
row 56px tall; Source cell 154 × 56; table width 649.3 = host width
649.3, so the mid-run table fits its host.

**2026-09-24 — correction, same round: item names are cut, not
wrapped.** The capture for the owner sitting showed names with an
ellipsis. `.upgrades-item-name` computes to `white-space: nowrap;
text-overflow: ellipsis`, so the "1 line" item-name count above is
true only because long names are cut short; it does not show that
they fit. Measured on a second settled feralcat phase-3 run (headless
Chrome on :5173, 1280×1400, "Took 159s"), counting names whose
`scrollWidth > clientWidth`:

| Source width | Item names cut short (of 338) | Examples |
| --- | --- | --- |
| 7rem (before) | 20 | Telonicus's Pendant of Mayhem, Ashtongue Talisman of Equilibrium |
| 10rem | 98 | Ancestral Ring of Conquest, Hourglass of the Unraveller |
| 11rem (shipped) | 144 | Razor-Scale Battlecloak, Madness of the Betrayer |

So the 11rem cap trades 124 more truncated item names for rows no
taller than 84px. This ticket's first close condition ("item names
still fit on one or two lines") holds only if a truncated one-line name
counts as fitting. The width is unchanged; the owner decides at the
sitting whether the trade stands, and this ticket reopens if not.
The fork comment that said "every item name still fits on one line"
was corrected in a comment-only fork commit
`c84f7ffab29fb7e2ab214a6bae60a62621fb1043`, re-pinned in main
`0fbbd2aefce5cbcba36518748bdd3b32fed6551e`; `pnpm verify` rc=0; layout
gate real run on that source `passed:53 failed:0 a11yFailed:0`.
- 2026-09-24 (round 2b, 493 Step 3): the DPS sub-line overprint is not
  caused by this width. The sub-line text is 127.1px at Source 7, 10 and
  11rem alike and overflows the fixed 77px DPS cell at 768 and 1280 in all
  three. Round 2b's fix (shorter strings, gate assertion 11) holds at 10rem
  and at 11rem. At 1280 on today's feralcat pool, 166 of 338 item names are
  cut short at 11rem. Table:
  `.scratch/stage-gate/upgrades-tab-closeout/round-2b/493-measurements.md`.
- 2026-09-24 (round 2b, owner request): Source width table at 1280px,
  feralcat phase 3, all 338 rows of the settled run (shortlist and
  below-cutoff opened), Source width forced by an injected rule. Fork
  `5e0093175` on :5173, default phase-3 gear (worn Thunderheart 4), run
  "Took 180s"; row heights measured with "Set potential" OFF. Source lines =
  distinct line tops of the Source cell's text.

  | Source | Names cut short (of 338) | Tallest row | Median row | Tallest Source (lines) |
  | --- | --- | --- | --- | --- |
  | 7rem (98px) | 20 | 119px (Pendant of Titans) | 84px | 6 ("Black Temple (N) / Reliquary of the Lost") |
  | 8rem (112px) | 34 | 101.5px | 66.5px | 5 |
  | 9rem (126px) | 67 | 101.5px | 66.5px | 5 |
  | 10rem (140px) | 98 | 101.5px | 56px | 5 |
  | 11rem (154px, today) | 144 | 84px (Razor-Scale Battlecloak) | 56px | 4 |

  A second run on the phase-2 "BiS 6%" preset gave the same row heights
  and 20 / 36 / 68 / 99 / 147 names cut short. The width is unchanged this
  round (owner: about 8rem only if it helps row height, 10rem only if the
  cost is small). At 8rem the tallest row falls from 119px to 101.5px and
  the median from 84px to 66.5px, for 14 more names cut short than at 7rem.
