Status: open
Type: task
Origin: .scratch/carry-forward/issues/452-end-ret-feralcat-tunnel-vision-support-all-dps-specs.md (slicing, 2026-11-06, slice B)
Serves: .scratch/carry-forward/issues/452-end-ret-feralcat-tunnel-vision-support-all-dps-specs.md
Blocks: none
Blocked by: none
Related: 452, 754, 803

# Run and judge Survival hunter and Arms warrior at phases 4 and 5

## Why

The owner ruled on 2026-11-06 that Survival hunter and Arms warrior are in
the epic's spec list (452 Notes). The p45 pass ran the other 11 specs and
left these two: "Survival and Arms runs after ticket 754 is fixed"
(`docs/live-runs/2026-11-03-p45-dps-pass.md:234-235`). Ticket 754 is
closed, so the harness can now load a gear set whose name another spec on
the same page also uses.

## What to do

Four uncapped live runs: Survival at phases 4 and 5, Arms at phases 4 and
5. Each run starts from the preset gear of the phase before the phase it
ranks (owner rule, ticket 560 brief, quoted in
`scripts/check_desktop_tab.py:101-102`). The fork's gear sets are under
`vendor/tbc-new-fork/ui/specs/hunter/dps/gear_sets/phase_*/sv/` and
`vendor/tbc-new-fork/ui/specs/warrior/dps/gear_sets/*_arms.gear.json`.

Judge each run with the `sme-rank-review` skill, as the p45 pass did, and
write a dated report under `docs/live-runs/`. File a ticket for each new
defect. Follow the p45 report's § Setup for the run commands, and ticket
754's Comments for running from the sandbox (one script that starts the
servers, runs the harness and stops the servers).

Ticket 803: these pages use the Beast Mastery and Fury EP weights for the
candidate prefilter and the gem fill. Give the SME judges that fact, so a
row that looks wrong because of it is counted against 803.

Wall time to expect: in the p45 pass, hunter runs took 1400-1552 s each
and the warrior batch of 2 runs took 1424 s (`docs/live-runs/2026-11-03-p45-dps-pass.md`
§ Wall time).

## Done when

The four runs are counted and judged, the report is committed, each new
defect has a ticket, and the branch's review file exists.
