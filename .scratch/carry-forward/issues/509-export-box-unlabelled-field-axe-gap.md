Status: closed
Type: bug
Origin: .scratch/handoffs/visual-review-round-2c.md, finding A4
Blocks: none
Blocked by: none
Related: 314, 328, 422, 442

# Export box has an unlabelled field; the gate's axe run misses it

## Evidence

`.scratch/handoffs/visual-review-round-2c.md`, finding A4 (gate-visual, round
2c, read-only review of `.scratch/stage-gate/upgrades-tab-closeout/round-2c/`):

> axe reports two violation rules in every state: `color-contrast` (serious,
> 9 nodes, the epic-colour item names such as "Vengeful Gladiator's Staff")
> and `label` (critical, 1 node, `.upgrades-export-area`). The executor's
> "0 a11y failures" is the layout gate's figure. I did not check whether the
> gate's ratchet baseline already lists these two, so this is not marked
> contested.

`a11y.json` (referenced by the finding) reports the `label` violation
(critical, 1 node) in all five states captured that round: `499-489/1280`,
`499-489/768`, `499-489/375`, `495/1280`, `495/768`. All five are on the
`feral-p3-p2bis` fixture (recorded, not a live sim) at fork HEAD
`7ed8c99410ac836443c2e07ede9790f5439467d5`.

`data/wowsims-fork-a11y-baseline.json` has no entry for
`.upgrades-export-area` or for the `label` rule — this is not an accepted,
ratcheted violation.

The export box's markup has not changed since at least round 2b (no
round-2b or round-2c ticket touches `.upgrades-export-area`'s field), so
this is an existing defect, not a regression introduced in round 2c.

## Why the gate did not catch it

Two independent reasons, both in `.scratch/handoffs/visual-review-round-2c.md`:

1. The layout gate's live run (`pnpm layout-gate:check` against a running
   sim) measures the page after only 5-6 rows have landed, before the
   export box in its finished state is necessarily present/populated the
   way the fixture renders it.
2. The layout gate does not run axe against the fixture page. axe only ran
   in round 2c's `pnpm tab-review` pass (a separate script from the layout
   gate), which is not part of `pnpm verify` or the layout gate's own
   checks.

## What would close this

1. The field inside `.upgrades-export-area` has an accessible name (a
   `<label>`, `aria-label`, or `aria-labelledby`), so axe's `label` rule no
   longer fires on it.
2. The layout gate (or an equivalent gate wired into `pnpm verify`) runs
   axe against a finished (fixture) page state, not only a live run
   truncated at 5-6 rows, so this class of defect fails the gate instead of
   only showing up in an ad hoc `pnpm tab-review` pass.
3. Confirm with a real `pnpm tab-review` (or equivalent axe) run against the
   `feral-p3-p2bis` (or `ret-p3-p2`) fixture showing zero `label` violations
   under `.upgrades-export-area`, and record the command and its exit code.

## 2026-10-11 — closed: the field has an accessible name

Closed by Chunk 3b step 3 of `.scratch/plans/upgrades-tab-finish-line.md`, checked at fork `316326a95` (= the fork lock) on 2026-10-11 by reading code; no gate or capture was run for this close.

1. `ui/features/upgrades/components/ExportPanel/ExportPanel.tsx:47` renders
   `<TextArea readOnly ... aria-label={i18n.t('upgrades_tab.export.title', ...)}>`;
   `TextArea` passes its props to the `<textarea>`
   (`ui/ui-kit/FormControl/TextArea.tsx:8`).
2. The React layout gate runs axe once on the recorded fixture at 653 px
   (`scripts/tab-harness/test-layout.mjs`, header and the `POST_RUN_AXE_WIDTH`
   audit), and `data/wowsims-fork-a11y-baseline.json` excuses no `label` rule
   (`grep -c '"label"'` → 0).

Not run: an axe confirmation run on the export field.
