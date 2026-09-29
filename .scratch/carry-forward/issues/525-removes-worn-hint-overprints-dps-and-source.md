Status: open
Type: bug
Origin: owner, 2026-09-29, screenshot of the Upgrades (New) tab during an enhancement shaman run (see "What was seen")
Blocks: none
Blocked by: none
Related: 350, 493, 506, 278, 463, 483

# "removes worn …" hint runs into the DPS figure and the Source column

A two-handed main-hand row shows the note "removes worn <off-hand> (offhand)"
in its DPS cell. The note starts right after the figure, with no space and
no line break, and runs past the 5rem DPS column over the Source text. The
owner saw it on the mid-run table. The settled table has the same rows,
folded away under the closed "below the cutoff" group, and their cells
overflow in the same way (measured, see "Cause").

## What was seen

**Owner, 2026-09-29.** Screenshot:
`C:\Users\dgree\AppData\Local\Temp\claude\C--Users-dgree-Code-lulz-tbc-gear-prio\758249e9-a2ed-4de3-a2fa-81be3bda431b\images\1.png`.
This is a temp path and may be deleted; it is not copied into the repo
because this tracker keeps no attachments. It shows one row, ranking still
running:

- Slot cell "Main Hand", then "-849.4removes worn Syphon of th…" as one run
  of text, cut off where the row's favourite and batch buttons start.
- Grey text "Hyjal" and "Archimonde" under the hint, partly covered by it.
  These are most likely the row's Source cell (Hyjal Summit, Archimonde),
  because Source is the column right of DPS (`resultRow`, see below). The
  screenshot shows too little of the row to be sure (hypothesis).
- An item tooltip ("Equip: Restores 23 mana per 5 sec. Sell Price: 18g 60s
  39c") open above the row. That is the item link's normal hover tooltip,
  not part of this bug.

The owner says it seems to happen only while the ranking runs, and that
the settled table renders cleanly.

**Earlier test agent, same day, 1600x1000, mid-run** (its own report, not
checked here): "−467.3removes worn Rod of the…", and the table needed a
horizontal scrollbar. It also saw the settled table render cleanly.

## Expected and actual

- Expected: the DPS figure reads on its own, the note sits on its own line
  under it (as the "set detail" and %-arm notes do), and no text crosses
  into the Slot or Source columns.
- Actual: figure and note are one line of text that is about 390 px wide
  in an 80 px cell.

## Cause (from the code, with one measurement)

Line numbers are in `vendor/tbc-new-fork` at fork commit
`02d0ea2ad1dae34087a6d69d316f9c3879bd8247`, the `commit` in
`data/wowsims-fork.lock.json` on 2026-09-29. Read them with
`git -C vendor/tbc-new-fork show 02d0ea2a:<path> | sed -n <from>,<to>p`.

- The note is a bare `<small className="upgrades-removed-items">`
  (`ui/core/components/individual_sim_ui/upgrades_tab.tsx:3225-3240`,
  string `upgrades_tab.results.removes_worn` in
  `assets/locales/en/translation.json:952`). It is added to the DPS cell
  right after the figure (`upgrades_tab.tsx:3076` and `3089-3094`).
- No stylesheet rule names `upgrades-removed-items`:
  `git -C vendor/tbc-new-fork grep -n removed-items 02d0ea2a -- ui` prints
  only the `.tsx` line. So the `<small>` stays inline. The two other notes
  in the same cell, `.upgrades-set-bonus` and `.upgrades-cutoff-arm`, get
  `display: block` from
  `ui/scss/core/components/individual_sim_ui/_upgrades_tab.scss:429-438`.
- At `md` and wider the DPS cell is `white-space: nowrap`
  (`_upgrades_tab.scss:1137-1140`) in a fixed 5rem column
  (`_upgrades_tab.scss:1210-1214` and `1242-1244`). Nothing wraps or clips
  the note, so it overflows into Source and widens the table's scroll
  host (`.upgrades-table-scroll`, `_upgrades_tab.scss:855-857`), which
  would explain the test agent's scrollbar (hypothesis).
- Only a two-handed main-hand candidate that forces off the worn off-hand
  gets `removedItems` (`ui/core/components/individual_sim_ui/upgrades/engine/rank.ts:1333`,
  ticket 350). So only dual-wield specs show the note.

**Why it looks mid-run only.** Both tables draw rows with the same
`resultRow` (`upgrades_tab.tsx:3049-3137`).

- Mid-run, `resultsContent` shows `landedRowsTable`
  (`upgrades_tab.tsx:2692-2698`). That table lists every simmed row sorted
  by delta, with no cutoff fold (`upgrades_tab.tsx:2790-2821`). A reader
  who scrolls to the bottom sees the negative two-hander rows.
- Settled, `rowsTable` puts rows below the cutoff inside a closed
  `<details>` group (`upgrades_tab.tsx:2864` and `2988-3019`). The
  two-hander rows land there, so they are hidden until the reader opens
  the group.

Measured on 2026-09-29 on the dev server
(`http://localhost:5173/tbc/shaman/enhancement/`, a settled enhancement
ranking already in the Browser pane, "Your current gear: 2244.0 DPS"),
with `document.querySelectorAll('.upgrades-removed-items')` in the page
console:

- 94 note elements: 47 in the shopping-list pane and 47 in the Main Hand
  pane. All 94 sit inside a closed below-cutoff `<details>`.
- All 94 rows have a negative delta. The highest is -464.1.
- Their DPS cells are 80 px wide (`clientWidth`) with a `scrollWidth` of
  390 to 399 px. A sample cell's text is "-464.1removes worn Rod of the Sun
  King (offhand)".

So the settled table is not clean. It hides the broken rows. Opening
"below the cutoff" should show the same overlap. That is inferred from the
measurement above; no render with the group open was captured (untested).

**Why no gate caught it.** The layout gate's sub-line check (assertion
11) measures only `upgrades-set-bonus` and `upgrades-cutoff-arm`
(`vendor/tbc-new-fork/test-layout.mjs:315`). The five recorded fixtures in
`data/tab-fixtures/` are feral and ret, whose two-handers leave no
off-hand, and none has a `removedItems` row:
`grep -l removedItems data/tab-fixtures/*.json` prints nothing.

Ticket 493 was the same kind of bug for the "set detail" note, and ticket
506 for the %-arm note.

## Options

Every option is a fork commit plus a re-pin in this repo; follow AGENTS.md,
"The forked tab repo".

**A. Owner's suggestion: hide negative-delta rows while the run is going.**
Recorded as an option, not decided. The owner's reasoning: those rows are
the "removes worn X" downgrades, and hiding them until the run settles
avoids the crowded cells and the flicker of rows that move as others land.

- The change would be a filter in `landedRowsTable`
  (`upgrades_tab.tsx:2791`). That table is display only. The settled table
  comes from the finished ranking through `rowsTable`, so hiding rows
  mid-run does not change the settled result or its order.
- Mid-run the owner would no longer see any downgrade: not the two-hander
  rows, and not other negative rows, such as a set piece whose swap breaks
  a worn bonus. A slot whose rows are all negative would show nothing
  until the run ends.
- The status line says "{label} ({count} rows landed)", and `count` is
  `this.landedRows.length` (`upgrades_tab.tsx:1999-2002`,
  `translation.json:883`). It counts every landed row. With A, that count
  would be larger than the rows on screen unless the text changes, for
  example to name how many rows are hidden.
- The Rank column mid-run is a position among the shown rows
  (`upgrades_tab.tsx:2817`), so it stays 1..N of what is visible.
- A does not fix the layout. The same cells overflow in the settled table
  once "below the cutoff" is opened (see "Cause"). A two-hander row with a
  positive delta would also still overflow mid-run; whether one occurs in
  practice is not checked (hypothesis). On the measured page all 94 note
  rows were negative, so there A would hide every note mid-run; that is
  one page, not a rule.

**B. Layout fix for the note.** Give `.upgrades-removed-items` its own line,
as `.upgrades-set-bonus` and `.upgrades-cutoff-arm` have, and stop it
leaving the cell. The note is about 310 px wider than the 5rem cell, so a
block line alone still overflows while the cell is `nowrap`. Ways to fit
it (each untested):

- let the note wrap inside the DPS cell (the row gets taller);
- cut it to one line with an ellipsis and keep the full text in a `title`;
- move the note to the Item cell, under the name next to the tags, where
  the column is wider.

B fixes both tables. Also add `upgrades-removed-items` to the layout
gate's sub-line list (`test-layout.mjs:315`) so the gate checks it.

**C. Both.** B for the layout, and A if the owner still wants downgrades
hidden while the run is going.

## What would close this

1. An owner choice among A, B and C, recorded here.
2. The fork change, the re-pin and `pnpm verify` with rc=0.
3. For B or C: a real layout gate run with `upgrades-removed-items` in its
   sub-line list, checking at least one such note. The gate needs a
   dual-wield fixture for that. Whether `pnpm tab-fixtures:record` accepts
   `--spec enhancement` is not checked (untested).
4. Visual acceptance, judged by `gate-visual`:

   > On an enhancement ranking with two-hander rows, after the "below the
   > cutoff" group is opened, at 1280 and 768 px every "removes worn …"
   > note is on a separate line from the DPS figure, and no note text draws
   > over the Slot text, the Source text or the row buttons.

   The capture script supports only `pre-run` and `post-run` states
   (`vendor/tbc-new-fork/test-review.mjs`, header comment, manifest
   schema). So the post-run capture needs a `click` on the below-cutoff
   `summary` and a dual-wield fixture. The mid-run table cannot be captured
   by `pnpm tab-review` today. If A is chosen, its check ("while the run is
   going, no row with a negative DPS figure is on screen, and the status
   line's count agrees with what it says about hidden rows") is a `Visual
   check:` by hand in the Browser pane during a live run, or needs a
   mid-run state added to the capture script.

## Out of scope

- The missing source and zone VIEW filters on the mid-run table. A
  separate ticket exists or will be filed for that; this ticket does not
  track it.
- Row order moving while rows land (the "flicker"), except as far as
  option A hides negative rows.
- The item tooltip in the owner's screenshot.
- The mobile layout below `md`, where the table is `table-layout: auto`
  (`_upgrades_tab.scss:993-994`) and the DPS column can grow. Not checked
  for this note.
