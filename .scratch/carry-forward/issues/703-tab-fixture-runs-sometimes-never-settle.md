Status: open
Type: bug
Origin: feat/dps-spec-coverage fixture re-recording, 2026-10-20
Serves: .scratch/plans/upgrades-tab-finish-line.md
Blocks: none
Blocked by: none
Related: 684

# A tab fixture recording sometimes never settles, and a retry of the same fixture settles in about 5 minutes

## What happens

`pnpm tab-fixtures:record` starts the run, logs `run started`, and then logs
nothing more until its 25-minute limit ends it with
`record: Error: run did not settle in 25 min`
(`scripts/tab-fixtures/record.mjs:331`). The same command, run again with
no code change, settles in the usual time. It has happened twice on
2026-10-20, each time to a feral fixture, with the backend on `:3333` and
one recorder at a time:

- `feral-p2-malorne4`, fork `c89b0b912`: the first run did not settle; the
  retry settled in 246 s. Source: `data/tab-fixtures/README.md`, the
  2026-10-20 paragraph ("cause not found").
- `feral-p3-th-hands-legs`, fork `3797dd6b4`, in the pair
  `tbc-wt/dps-spec-coverage`: 1605 s wall, exit 1, with the error above. The
  next recording of the same fixture (fork `67d2d2074`) settled in 303 s,
  and at fork `5ec8def25` in 283 s. The two recordings before it in the
  same batch (feral-p3-p2bis, feral-p3-nordrassil4) settled in 288 s and
  285 s.

The failed run's log holds only the three lines `opening …`,
`run started` and the error. The backend's log for that run was not kept
(it was overwritten when the servers were restarted), so nothing shows
whether the backend stopped answering or the page stopped asking.

A different failure in the same session, possibly related (hypothesis,
untested): `ret-p3-p2` at fork `5ec8def25` failed after 91 s with
`CDP Page.navigate got no answer in 90s` (`scripts/tab-fixtures/run-guard.mjs:17`),
right after `feral-p3-th-hands-legs` finished.

## Done means

The cause is found from logs kept for a failing run (the page's console, the
recorder's CDP trace and the backend's log), and a recording either settles
or fails with a message that names what stopped.
