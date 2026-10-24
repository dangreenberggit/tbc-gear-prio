Status: open
Type: bug
Origin: feat/dps-spec-coverage fixture re-recording, 2026-10-20
Serves: .scratch/plans/upgrades-tab-finish-line.md
Blocks: none
Blocked by: none
Related: 684

# A tab run started from the page sometimes never settles; a retry settles in about 5 minutes

The recorder presses Run on the real tab the same way a player does, so the
hang may reach a player (hypothesis, untested: it has been seen only through
the recorder). Since stage `tab-checks-without-sims`, no gate and no
`pnpm verify` step records a result: the page checks render made-up fixtures.
A hang therefore costs only the person recording by hand.

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

## Notes

2026-10-24, stage `tab-checks-without-sims`: the recorder is now a by-hand
tool (`scripts/tab-fixtures/record.mjs` writes to `.scratch/tab-recordings/`
by default), and the layout gate, `pnpm tab-review` and
`pnpm tab-fixtures:smoke` read no recording. The `data/tab-fixtures/README.md`
paragraph cited above was removed in that stage; read it with
`git show 26d7dace:data/tab-fixtures/README.md`.
