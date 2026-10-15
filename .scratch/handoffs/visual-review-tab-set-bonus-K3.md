# Visual review: tab-set-bonus, unit K3 (ticket 336)

Seat: gate-visual (Opus 5.5). Date: 2026-10-15. Revision 2: re-judged
after the executor added entries `336-10-ret30990-off` and
`336-10-ret30990-on` and re-ran the whole manifest. Revision 1 judged
ticket 336 cannot-judge for want of an item 5 capture; that is now
resolved (see "Ticket 336 verdicts").

## Provenance

- `forkHead`: `f4b78f65dd7ffb9df256a9f04ccf1d889a5033c4` (`index.json`)
- `forkDirty`: `false` (`index.json`)
- `generatedAt`: `2026-10-15T19:49:06.589Z` (`index.json`; the revision 1 run was `19:43:00.124Z`, same fork HEAD)
- Captures: `C:\Users\dgree\Code\lulz\tbc-gear-prio\.scratch\stage-gate\tab-set-bonus\review\` (gitignored; 22 PNGs, `index.json` has 22 entries and no `errors` on any)
- Manifest: same folder, `manifest.json` (eleven entries, widths 1280 and 375)
- Reference: `.scratch/stage-gate/tab-set-bonus/mockup-336.html` (design A, rev 4)
- Ticket: `.scratch/carry-forward/issues/336-tab-discloses-nothing-about-a-reachable-4pc.md`, "What would close this" items 2, 4, 5

## Method

Entries 1-9: for each entry and width I read the `facts.json` keys
`setPotentialChecked`, `trigger`, `hint`, `tip`, `total`, `totalCount`,
and compared `tip` to the mock-up's lines for that row and toggle state,
joined in order, after two character normalisations: U+00A0 (the
no-break space between set name and piece count, which the brief names)
to a space, and the mock-up's U+2212 minus to ASCII `-`. All 18 captures
of the re-run match exactly. "Total equals the row figure" was checked as
`total == "Total" + trigger`. Of the re-run PNGs for entries 1-9 I
re-read three (`336-1-…-375-0.png`, `336-8-…-375-0.png`,
`336-9-…-1280-0.png`); all 18 have the same pixel sizes as the
revision 1 captures, which I read in full.

Entry 10: the PNG is the row itself (no hover). Facts `hintCount`,
`tipCount`, `buttonCount`, `rowText`, `setPotentialChecked`. I also
checked that the cut fixture's row 30990 equals the committed one:
`data/tab-fixtures/ret-p3-p2.json` row 30990 deep-equals
`review/fixtures/ret-p3-p2-only-30990.json` row 30990 (python `==`,
true); its `setContext.futureBonuses` thresholds 2-5 all have
`belowGate: true`, `singleDeltaDps` 3.857.

## Per-entry verdicts

| Entry | Mock-up / acceptance | Toggle (`setPotentialChecked`) | 1280 | 375 | Evidence |
|---|---|---|---|---|---|
| 336-1-th31042-off | row 2, off | `false` | pass | pass | `336-1-th31042-off-post-run-{1280,375}-0.png`; `facts.json` `tip` = "Total+26.3Not counted (Set potential is off)Thunderheart Harness 4pc with Thunderheart Pauldrons74.1 DPS more"; `trigger` "+26.3"; `totalCount` 1; `hint` "set detail" |
| 336-2-th31042-on | row 2, on (unchanged) | `true` | pass | pass | `336-2-…png`; `tip` = "Item stats+26.3Set potentialThunderheart Pauldrons (4pc)+74.1Total+100.4"; `trigger` "+100.4"; `totalCount` 1 |
| 336-3-p2bis29097-off | row 3, off | `false` | pass | pass | `336-3-…png`; `tip` = "Total-25.0Not counted (Set potential is off)Malorne Harness 4pc with Greaves of Malorne19.5 DPS less"; `trigger` "-25.0"; `totalCount` 1 |
| 336-4-p2bis29097-on | row 3, on (new) | `true` | pass | pass | `336-4-…png`; `tip` = "Total-25.0Not counted (no gain over the item alone)Malorne Harness 4pc with Greaves of Malorne19.5 DPS less"; `totalCount` 1 |
| 336-5-th30222-off | row 4, off | `false` | pass | pass | `336-5-…png`; `tip` = "Total+13.3Not counted (Set potential is off)Nordrassil Harness set bonuses (screened out)not measured"; `totalCount` 1 |
| 336-6-th30222-on | row 4, on (new) | `true` | pass | pass | `336-6-…png`; `tip` = "Total+13.3Not countedNordrassil Harness set bonuses (screened out)not measured"; `totalCount` 1 |
| 336-7-p2bis31034-off | row 1, off | `false` | pass | pass | `336-7-…png`; 2pc line 55.1 DPS more and 4pc line ending ", breaks Malorne Harness 2pc" 106.2 DPS more; no 3pc or 5pc line; Total +1.5; `totalCount` 1 |
| 336-8-th29097-off | row 5, off | `false` | pass | pass | `336-8-…png`; receipt -16.9 / -94.5, Total -111.4, then Malorne 2pc 90.2 and 4pc 78.6 DPS more; Thunderheart break not repeated; `totalCount` 1 |
| 336-9-ret33173-off | screened-reason paragraph (rev 4), off | `false` | pass | pass | `336-9-…png`; `tip` = "Total-30.9Not counted (Set potential is off)Burning Rage set bonuses (screened out)a loss with its pieces" (no figure); `totalCount` 1 |
| 336-10-ret30990-off | ticket item 5, no hint and no trigger, off | `false` | pass | pass | `336-10-ret30990-off-post-run-1280-0.png`: DPS cell "+3.9" plain, no dotted underline, no "set detail" line; the row's two buttons are the star and swap icons at the right. `facts.json` both widths: `hintCount` 0, `tipCount` 0, `buttonCount` 2, `rowText` "4Lightbringer BreastplateChest+3.9Black Temple" |
| 336-10-ret30990-on | ticket item 5, no hint and no trigger, on | `true` | pass | pass | `336-10-ret30990-on-post-run-1280-0.png` identical to the off capture; facts both widths: `hintCount` 0, `tipCount` 0, `buttonCount` 2, `rowText` unchanged "+3.9" (toggle on adds no credit for all-`belowGate` futures) |

Render checks on the popover PNGs (entries 1-9): the Total line has its
top rule; long labels wrap inside the label column and do not run under
the value column; values sit on one line and are fully visible; nothing
is clipped at the popover edge. The 375 popover clips are 361 px wide,
so the popover fits a 375 px viewport. "Not counted" lines print in the
normal colour, not the mock-up's muted colour; the brief states this is
the plan (SetBonusPopover.tsx unchanged), so it is not a finding.

Entry 10 at 375: the row clip is 602 px wide and paints only the rank,
name and slot cells (`336-10-ret30990-{off,on}-post-run-375-0.png`); the
DPS cell is past the 375 px viewport, so the 375 PNG cannot show it. The
375 verdict rests on the facts: `hintCount` 0, `tipCount` 0, and
`buttonCount` 2, the same count as at 1280 where the PNG shows both
buttons are the star and swap icons. See the advisory finding below.

## Ticket 336 verdicts ("What would close this")

| Item | Verdict | Evidence |
|---|---|---|
| 2. Toggle off: every row with a set bonus has the hint and a popover with one Total equal to the row figure; toggle on unchanged | pass (for the captured rows) | Entries 1, 3, 5, 7, 8, 9: `hint` "set detail", `totalCount` 1, `total` = "Total"+`trigger`. Entry 2 matches mock-up row 2 "toggle on (unchanged)". The captures sample seven rows; "every row" is a model claim that plan step 9 (g) tests, not something a capture can show. |
| 4. 1280 and 375, toggle off, 31042 on `feral-p3-th-hands-legs`: popover lists the 4pc and one Total of +26.3 | pass | `336-1-th31042-off-post-run-1280-0.png`, `-375-0.png`; `facts.json` `336-1-th31042-off.{1280,375}.total` "Total+26.3", `totalCount` 1, `setPotentialChecked` "false" |
| 5. Ret fixture whose 4pc is below the noise floor: the popover does not show it as a real figure | pass | Row 30990 Lightbringer Breastplate on `ret-p3-p2` (4pc future `belowGate: true`, row equal to the committed fixture's): `facts.json` `336-10-ret30990-off` and `-on`, both widths, `hintCount` 0, `tipCount` 0; `rowText` holds no figure other than the row's own "+3.9"; `336-10-ret30990-{off,on}-post-run-1280-0.png` show a plain "+3.9" with no trigger. Desktop and mobile both read back (the original close condition). |

**Ticket 336 overall: pass** on the Visual acceptance (items 2, 4, 5).
Items 1 (owner approval of the mock-up) and 3 (test, re-pin, verify) are
not visual and are not judged here.

## Findings

| Finding | Severity | Evidence |
|---|---|---|
| The popover dialog has no accessible name (axe `aria-dialog-name`, impact serious, warn) in every popover state, including the unchanged on-state popover of entry 2 | advisory | `a11y.json`: every entry 1-9 key has `fail` 0 and one `warn` `aria-dialog-name` (for example `336-2-th31042-on/1280`). Hypothesis, untested: it predates this unit, because entry 2's popover is the unchanged one. Needs a ticket unless one exists. |
| At 375 px the result row is wider than the viewport, so the DPS cell is not painted in a row capture; entry 10's 375 verdict rests on facts, not on the image | advisory | `336-10-ret30990-off-post-run-375-0.png` is 602 px wide and shows only rank, name, slot. Hypothesis, untested: this is the table's existing mobile layout (horizontal scroll), not a change in this unit. Not a defect in the 336 change. |
| Negative figures print ASCII `-`; the mock-up prints U+2212 `−` | advisory | `facts.json` `336-8-th29097-off.1280.tip` "Item stats-16.9" (the receipt the mock-up calls today's) and `336-3-p2bis29097-off.1280.trigger` "-25.0"; `mockup-336.html` rows 3 and 5. The build uses one character throughout and Total equals the trigger, so this is the mock-up's typography, not a mismatch. |

Revision 1's blocking finding (no capture for item 5) is closed by
entries `336-10-ret30990-off` and `336-10-ret30990-on`.

## Contested

- contested: plan.md step 12 entry (9) says the Burning Rage row prints
  `below-zero` text "66.4 DPS less", and plan.md's 336 summary says
  `below-zero` prints "N DPS less" with the screen's measure. The capture
  prints "a loss with its pieces" with no figure
  (`facts.json` `336-9-ret33173-off.*.tip`). The capture follows
  mock-up rev 4 (Gate B finding M1) and the manifest's expected text, so
  the build is right and the plan text is stale. Recorded so Gate C does
  not read the plan's string as the acceptance.

## a11y counts per state

| State | fail | warn |
|---|---|---|
| 336-1-th31042-off/1280 | 0 | 1 (aria-dialog-name) |
| 336-1-th31042-off/375 | 0 | 1 (aria-dialog-name) |
| 336-2-th31042-on/1280 | 0 | 1 (aria-dialog-name) |
| 336-2-th31042-on/375 | 0 | 1 (aria-dialog-name) |
| 336-3-p2bis29097-off/1280 | 0 | 1 (aria-dialog-name) |
| 336-3-p2bis29097-off/375 | 0 | 1 (aria-dialog-name) |
| 336-4-p2bis29097-on/1280 | 0 | 1 (aria-dialog-name) |
| 336-4-p2bis29097-on/375 | 0 | 1 (aria-dialog-name) |
| 336-5-th30222-off/1280 | 0 | 1 (aria-dialog-name) |
| 336-5-th30222-off/375 | 0 | 1 (aria-dialog-name) |
| 336-6-th30222-on/1280 | 0 | 1 (aria-dialog-name) |
| 336-6-th30222-on/375 | 0 | 1 (aria-dialog-name) |
| 336-7-p2bis31034-off/1280 | 0 | 1 (aria-dialog-name) |
| 336-7-p2bis31034-off/375 | 0 | 1 (aria-dialog-name) |
| 336-8-th29097-off/1280 | 0 | 1 (aria-dialog-name) |
| 336-8-th29097-off/375 | 0 | 1 (aria-dialog-name) |
| 336-9-ret33173-off/1280 | 0 | 1 (aria-dialog-name) |
| 336-9-ret33173-off/375 | 0 | 1 (aria-dialog-name) |
| 336-10-ret30990-off/1280 | 0 | 0 |
| 336-10-ret30990-off/375 | 0 | 0 |
| 336-10-ret30990-on/1280 | 0 | 0 |
| 336-10-ret30990-on/375 | 0 | 0 |

`index.json` `staleBaseline`: `heading-order .ui-accordion-header` (a
baseline entry not seen in these captures).
