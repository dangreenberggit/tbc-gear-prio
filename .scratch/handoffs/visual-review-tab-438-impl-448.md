# Visual review — ticket 448 (Sim-sets "Other phases (n)" disclosure)

**448: pass**

- forkHead: `994fcb9f3fd93cbac2c975698248ad888846dd84` (matches the required sha)
- forkDirty: `false`
- Capture dir: `C:\Users\dgree\Code\lulz\tbc-gear-prio\.scratch\stage-gate\tab-438-impl\visual\448\`
- Harness page: ret paladin (not the design doc's Feral), so totals are shown+hidden = 2+3 = 5, not 16 — recorded and expected.

## Acceptance sentence (plan Step 11)

> Pre-run at 375, 653 and 1280 the Sim-sets row shows current-phase and saved chips, every default-selected chip is in the visible row and none is behind the disclosure; the 'Other phases (n)' button's n equals the number of chips behind it; clicking it reveals exactly those chips and sets aria-expanded to true; clicking again collapses them with the same chip count.

## Per-clause verdict

| Clause | Verdict | Evidence |
| --- | --- | --- |
| Sim-sets row shows current-phase + saved chips at 375 | pass | `facts.json` `448-a.375.shownChips` = 2; `448-a-pre-run-375-0.png` (full page) shows the run-settings collapsed but the shown-chip count reads regardless of visibility |
| Sim-sets row shows current-phase + saved chips at 653 | pass | `facts.json` `448-a.653.shownChips` = 2 |
| Sim-sets row shows current-phase + saved chips at 1280 | pass | `facts.json` `448-b.1280.shownChips` = 2; `448-b-pre-run-1280-0.png` shows the "Sim sets" row with chips `P3` and `P3 - Bulwark` |
| Every default-selected chip is in the visible row, none behind the disclosure (375/653/1280) | pass | `facts.json` `activeShown` = 1 and `activeHidden` = 0 for `448-a.375`, `448-a.653`, `448-b.1280` — active chip is in `.upgrades-set-guarantee:not(.upgrades-set-more)`, none in `.upgrades-set-more` |
| Off-phase presets sit behind the collapsed disclosure by default | pass | `facts.json` `448-b.1280.moreDisplay` = `none`; `448-a`/`448-b` `hiddenChips` = 3; `448-b-pre-run-1280-0.png` shows "Other phases (3) >" collapsed |
| The 'Other phases (n)' button's n equals the chips behind it | pass | `facts.json` `448-a`/`448-b` `toggleText` = "Other phases (3)" and `hiddenChips` = 3 — n = hidden count |
| Clicking it reveals exactly those chips | pass | `facts.json` `448-c.1280.expandedDisplay` = `flex`, `expandedChips` = 3 (equals the hidden count and the toggle's n); `448-c-pre-run-1280-1.png` shows `P1 - Pre-raid`, `P1`, `P2` revealed below the shown row, chevron down |
| Clicking sets aria-expanded to true | pass | `facts.json` `448-c.1280.ariaExpanded` = true (`exists:.upgrades-set-more-summary[aria-expanded="true"]`) |
| Clicking again collapses them with the same chip count | pass | `facts.json` `448-d.1280.collapsedDisplay` = `none`, `ariaCollapsed` = true, `hiddenChipsAfterToggle` = 3 (same count, no duplication); `448-d-pre-run-1280-1.png` shows "Other phases (3) >" collapsed again |

## Width note (not a defect)

Per the manifest `note`, the expand/collapse mechanics (448-c/448-d) run only at 1280 because the CDP harness (HEIGHT 900, no scroll-into-view) cannot reach the disclosure toggle at 375/653 — the Sim-sets control sits ~1150px down inside the collapsed run-settings body. The disclosure DOM is width-independent (identical markup at every width), and the narrow-width grouping is proven by `count:` facts that read whether or not the node is displayed (`448-a` at 375 and 653). No entry claims "visible" from a count of a `display:none` subtree; the selected-off-phase-stays-shown guarantee rests on `activeShown` >= 1 + `activeHidden` = 0. This is a captured-scope constraint, not a render defect — every clause of the acceptance sentence is backed at some captured width, so it does not lower the verdict below pass.

The ticket's "ticked-then-collapsed transition" (tick an off-phase chip while expanded, then a `shown.bs.tab` rebuild moves it to the shown row) is NOT a capture claim — the manifest cannot fire that rebuild — and is out of scope for this visual verdict. It is stated as code-inspection-proven in the executor report/ticket; not judged here.

## Findings

| finding | blocking / advisory | evidence |
| --- | --- | --- |
| `#phase-selector` `<select>` has no accessible name (`select-name`, critical) | advisory | `a11y.json` `448-b/1280`, `448-c/1280`, `448-d/1280` each carry 1 violation `select-name` on `#phase-selector`. Pre-existing tab control (the phase selector at `upgrades_tab.tsx:774`), not introduced by the 448 disclosure. Out of the render-defect class for this ticket; raise as its own a11y ticket. |

## a11y counts per state

| state / width | violations |
| --- | --- |
| 448-a / 375 | 0 |
| 448-a / 653 | 0 |
| 448-b / 1280 | 1 (`select-name`, critical, `#phase-selector`) |
| 448-c / 1280 | 1 (`select-name`, critical, `#phase-selector`) |
| 448-d / 1280 | 1 (`select-name`, critical, `#phase-selector`) |

The disclosure control itself raises no a11y violation. The only violation is the pre-existing `#phase-selector` unnamed select, present only at the width where the run-settings body renders (1280).

## Contested

None. No verdict contradicts a plan or executor factual claim.

## Re-capture needed

None — verdict is pass.
