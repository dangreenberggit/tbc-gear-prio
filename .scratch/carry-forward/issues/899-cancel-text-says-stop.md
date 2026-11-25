Status: open
Type: bug (display)
Origin: the orchestrator's brief for fix/896-stage-time-left, 2026-11-24
Blocks: none
Blocked by: none
Related: 896

# After Cancel the tab talks about a Stop button that does not exist

## What happens

The run dialog's only button reads "Cancel"
(`vendor/tbc-new-fork/ui/ui-kit/ProgressTrackerDialog/ProgressTrackerDialog.tsx:53-55`,
`sidebar.results.reference.cancel`). After the player presses it, the tab's
text calls it Stop (`vendor/tbc-new-fork/assets/locales/en/upgrades.json`):

- while the sims in flight finish: "Stopping — finishing the current step." (`:56`);
- with rows: "Stopped early. Your current gear: {{dps}} DPS. The rows below finished before Stop." (`:55`);
- with none: "Stopped early. Your current gear: {{dps}} DPS. No candidate rows to show — run again for a full ranking." (`:52`).

"The rows below finished before Stop" is also false: candidates already in
flight at the press run to the end
(`ui/features/upgrades/model/engine/rank-candidates.ts:157-158`), so some rows
below finished after it. "Run again" names no button either: the tab's button
is Simulate (`upgrades.json:146`, "Click Simulate to start.").

wowsims' Bulk sim says "Bulk sim cancelled." after its Cancel
(`upstream/master` `ui/features/bulk/model/run.ts:317-321`,
`assets/locales/en/translation.json:977`).

## Done when

After Cancel, each string names the action as cancelling, as the button does,
in one plain sentence beside the "Your current gear" figure, and is true in
every state it shows in: cancelled while preparing, during the candidates,
the set bonuses, ranking and the re-sims, with rows and with none.
