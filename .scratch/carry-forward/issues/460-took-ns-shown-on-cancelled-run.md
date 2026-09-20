Status: open
Type: bug
Origin: owner viewing session, 2026-09-20
Blocks: none
Blocked by: none
Related: 416 (baseline/elapsed line moved), status.stopped / status.elapsed

# "Took N s" next to the "stopped early" message looks wacky on a cancelled run

Owner report, 2026-09-20. When a run is cancelled, the "Took N s" elapsed line
shows next to the "Stopped early…" message, and the combination reads wrong /
looks wacky.

## What would close this

- On a cancelled/stopped run, don't show the "Took N s" elapsed line beside the
  stopped message (or fold the timing into the stopped message if it's wanted at
  all). The stopped state should read cleanly.
- Strings: `upgrades_tab.status.elapsed` ("Took {{seconds}}s.") and
  `upgrades_tab.status.stopped`. Check where both are appended on the stop path.
- Verify live: start a run, cancel it, confirm the status area reads sensibly.
