# Visual review — tab-438-impl — ticket 447

**447: pass**

Sources filter → native "Sources…" popup (BaseModal). Every clause of the
Step-5 acceptance sentence is backed by a captured fact or PNG. The one
missing capture — the modal opened at 375/653 — is a diagnosed harness
limitation, not a render defect, and no clause of the sentence requires it
(see the harness-constraint note below).

- `forkHead`: `3f19c283c4f6c03a873a9a6375cb061063976f22` (matches the required sha)
- `forkDirty`: `false`
- Captures generated: 2026-09-19T22:19:49Z
- Capture dir: `C:\Users\dgree\Code\lulz\tbc-gear-prio\.scratch\stage-gate\tab-438-impl\visual\447\`

## Acceptance sentence, clause by clause

The sentence judged (plan Step 5):

> Pre-run at 375, 653 and 1280 the Sources block is a single button plus one
> summary line and the settings card is at least 300 px shorter than 1106.8 px
> at 1280; clicking the button shows a modal with exactly two titled sections
> ('Raids', 'Other sources') of checkboxes in a two-column grid; after one
> checkbox is unticked the summary reads '1 of M sources excluded'.

| Clause | Verdict | Evidence |
| --- | --- | --- |
| Sources block = single button + one summary line, at 375 | pass | `facts.json` `447-a.375`: `stackGone=0`, `buttonExists=true`, `summaryText="All 14 sources included"`. Card collapsed in PNG (`447-a-pre-run-375-0.png` shows "Run settings ›"), so shape proven by visibility-independent facts. |
| Sources block = single button + one summary line, at 653 | pass | `facts.json` `447-a.653`: `stackGone=0`, `buttonExists=true`, `summaryText="All 14 sources included"`. Collapsed card in `447-a-pre-run-653-0.png`; shape by facts. |
| Sources block = single button + one summary line, at 1280 | pass | `447-b-pre-run-1280-0.png` shows the "Sources…" button + "All 14 sources included" line, no stack; `facts.json` `447-b.1280`: `stackGone=0`, `buttonExists=true`, `summaryText="All 14 sources included"`. |
| Settings card ≥ 300 px shorter than 1106.8 px at 1280 | pass | `facts.json` `447-b.1280` `cardRect.height=672.71875` → 434.08 px shorter than 1106.8; exceeds the 300 px threshold. |
| Modal shows exactly two titled sections 'Raids' + 'Other sources' | pass | `facts.json` `447-c.1280`: `sections=2`, `raidsTitle="Raids"`, `otherTitle="Other sources"`; `447-c-pre-run-1280-1.png` shows both titled sections. |
| Checkboxes in a two-column grid | pass | `facts.json` `447-c.1280` `gridCols="164.875px 164.875px"` (two equal tracks), `checkboxes=14`; `447-c-pre-run-1280-1.png` shows the two-column layout. |
| After one uncheck, summary reads "1 of M sources excluded" | pass | `facts.json` `447-e.1280` `summaryAfterOne="1 of 14 sources excluded"`, `checkedCount=13`, `totalCount=14`; `447-e-pre-run-1280-0.png` shows Black Temple unticked and the summary text. |

## Findings

| Finding | blocking / advisory | Evidence |
| --- | --- | --- |
| Narrow-width (375/653) modal-open interaction not captured — harness cannot scroll the collapsed run-settings card into view (click landed at y=1156, below the 900px viewport). Modal shape proven at 1280 and by visibility-independent narrow-width facts instead. | advisory | manifest `note`; `447-a` facts (`sections=2`, `checkboxes=14`) read regardless of visibility; `447-c-pre-run-1280-1.png` |
| a11y: modal `.upgrades-sources-modal` has no accessible name (`aria-dialog-name`, serious) at 1280 in the open states. | advisory | `a11y.json` `447-c/1280` and `447-e/1280` — one `aria-dialog-name` violation each |
| a11y: pre-existing `#phase-selector` select has no accessible name (`select-name`, critical) across states. Not introduced by this ticket (present in the phase-selector `enum-picker-selector`, outside the Sources block). | advisory | `a11y.json` `447-b/1280`, `447-c/1280`, `447-e/1280` — `select-name` on `#phase-selector` |

The two a11y items are advisory here, not blocking the render-defect verdict.
`aria-dialog-name` is a real gap on the new modal — flagged for the owner /
next ticket, but it is not part of the 447 acceptance sentence and does not
change the render verdict. `select-name` is pre-existing and outside this
ticket's scope.

## a11y counts per state

| State | violations | ids |
| --- | --- | --- |
| `447-a/375` | 0 | — |
| `447-a/653` | 0 | — |
| `447-b/1280` | 1 | `select-name` (critical, `#phase-selector`) |
| `447-c/1280` | 2 | `aria-dialog-name` (serious, modal), `select-name` (critical, `#phase-selector`) |
| `447-e/1280` | 2 | `aria-dialog-name` (serious, modal), `select-name` (critical, `#phase-selector`) |

## Harness-constraint call (recorded)

The manifest `note` documents that `test-review.mjs` dispatches CDP mouse
events at viewport coordinates and does not scroll the target into view
(viewport height 900). At 375/653 the settings card sits ~1150 px down the
page and collapses by default, so a coordinate click on the collapsed summary
lands below the viewport and cannot open the run-settings body; the "Sources…"
button lives inside that collapsed body at narrow width, so the modal cannot
be opened via the harness at 375/653.

I judge this sufficient for **pass**, not `cannot-judge`, because:

- No clause of the sentence requires a narrow-width *modal-open* capture. The
  width-qualified clauses concern the pre-run block shape (proven at all three
  widths by visibility-independent facts) and the card height (pinned to 1280,
  where it is captured). The modal clauses name no width.
- The modal is a Bootstrap `position:fixed` `.modal-dialog.modal-md` built once
  and width-independent, so its open state at 1280 (`447-c`, `447-e`) governs
  all widths.

## Re-capture needs

None. Verdict is `pass` on the current captures.
