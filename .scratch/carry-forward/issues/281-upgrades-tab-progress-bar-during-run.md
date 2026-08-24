Status: closed (2026-08-24, fork commit da04366f5 on feat/upgrades-tab —
Bulk-tab progress idiom reused inside the single status line; determinate
only for the simming stage's real ratio, indeterminate striped otherwise;
26/26 live samples matched the counter text.)
Type: deferred feature
Origin: stage-gate `upgrades-ui-pass`, deferral decision, 2026-08-23
Blocks: none
Blocked by: none

# The Upgrades tab shows run progress as text, not a progress bar

Deferred deliberately from the `upgrades-ui-pass` work.

A run in progress reports itself in one line of text: "Simming 243/277… (240
rows landed)". The numbers are all there, and the mid-run table now fills in
sorted order underneath it, so nothing is hidden — but a run takes minutes at
default iterations, and a text counter is a poor read of "how much longer".

The data a bar needs already exists and is already on screen: the stage label,
the simmed count, and the total. This is presentation only.

## Why it was deferred

Scope. The `upgrades-ui-pass` plan took the ordering defect, the toggle fold
and a chosen subset of presentation cleanups; a progress bar is additive
rather than a fix to something wrong, so it lost to the items that were.

## Done when

- The running state shows a bar driven by the same simmed/total figures the
  status line uses, with the text kept alongside rather than replaced.
- The bar handles the stages before row-landing starts (resolving, baseline),
  where no ratio exists yet, without showing a misleading zero.
