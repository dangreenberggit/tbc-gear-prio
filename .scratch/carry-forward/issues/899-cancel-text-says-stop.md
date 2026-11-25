Status: closed
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

## Close note (2026-11-24)

The strings after Cancel (`vendor/tbc-new-fork/assets/locales/en/upgrades.json`
at `tbc-new-fork@24e9ca02e`):

- while the sims in flight finish, in the dialog and the status line:
  "Cancelling after the current step finishes.";
- with rows: "Cancelled: the rows below come from the sims that finished.
  Your current gear: {{dps}} DPS.";
- with none: "Cancelled before any row finished. Your current gear:
  {{dps}} DPS."

Live feral desktop runs at `tbc-new-fork@cb4bbfc94`, cancelled while
preparing (0.14 s in), during the candidates (2.48 s in, 9 rows), during
the set bonuses (20.02 s in) and during the re-sims (24.27 s in), each read
the string above for its case, and the button read "Cancel" throughout
(`.scratch/agent-reports/2026-11-24-time-left-per-stage/cancel-preparing`, `cancel-candidates`, `cancel-setbonus`,
`cancel-resims`, `run/tail.jsonl` and `run/result.json` in the main
checkout). Since then only `run_progress.ts` and `run.test.ts` changed
(`git diff --stat cb4bbfc94 24e9ca02e` in the fork), and a stopped run
shows no time left (`RunProgressTracker.view`).

Not hit live: a Cancel during "Ranking results…". No 500 ms sample in either
final run shows that label, so the step is too short to land a press in.
The strings do not depend on the stage: the status line picks them by the
run's status and whether rows show
(`ui/features/upgrades/components/StatusLine/StatusLine.tsx:18-42`), and the
dialog by `stopping` (`RunProgressDialog.tsx:46`), so a Cancel there gives
the same strings as one in the set bonuses or the re-sims.

Verified by: the four cancel runs above; the fork tests "says a cancelled
run with no finished row has none, in the word the Cancel button uses
(ticket 899)" and "says the run is cancelling while the step in flight
finishes (ticket 899)" (`StatusLine.test.tsx`), "says only that it is
cancelling after Cancel" (`RunProgressDialog.test.tsx`) and "shows rows as
they land, and keeps them when Cancel ends the run"
(`UpgradesTabBody.test.tsx`); `tbc-new-fork@24e9ca02e`.
