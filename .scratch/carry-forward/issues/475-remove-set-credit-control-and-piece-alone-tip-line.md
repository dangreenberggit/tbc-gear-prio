Status: closed
Type: task
Origin: owner walkthrough of the 472 render, 2026-09-22
Blocks: none
Blocked by: none
Related: 472, 467, 471

# Remove the Set credit control and the "This piece alone" tooltip line

Owner ruling 2026-09-22: the Set potential toggle disabling itself is
CORRECT behaviour on that run (only one set piece was an upgrade on its
own; every other piece is worse individually, so no rankable set potential).

What must go: the "Set credit" label and its Full set / Split share toggles
(`SetCreditControl`, `upgrades_tab.tsx:639, 1157, 2042, 2076-2077`; i18n keys
`upgrades_tab.view.set_credit*` `translation.json:890-894`).

The credit mode still feeds ranking (`this.setCreditControl.credit` at
:2620, 2635, 3039, 3053): the worker must pin one default credit mode
(record which and why in the ticket comment) and keep the ranking math
unchanged otherwise (no engine edits).

Also drop the set-bonus tooltip's first line "This piece alone: {{dps}}"
(`tip_item_alone`, `translation.json:913`, built at `upgrades_tab.tsx:3271`)
because it repeats the DPS column. Remove the now-dead i18n keys
(`tip_mode_full`/`tip_mode_split` :911-912 if unused).

## What would close this

Control gone from the View options row, tooltip starts at the set-context
line, i18n keys cleaned, layout gate + verify green, re-pin.

## Comments

2026-09-22: closed. Fork 2db3e0e3: SetCreditControl and its SCSS removed; credit mode pinned to module constant `SET_CREDIT = 'full'` (the control's own default and its forced value when disabled; 467 gate-visual OFF state read Full set); `tip_item_alone` line dropped so the tooltip starts at the set-context line; eight dead i18n keys removed from translation.json and translation.schema.json. Main re-pin ccdaa4f5; `pnpm verify` rc=0; layout gate `passed:53 failed:0 a11yFailed:0`. Live tooltip text confirmed in the arc's final :5173 run (see 472 comments).
