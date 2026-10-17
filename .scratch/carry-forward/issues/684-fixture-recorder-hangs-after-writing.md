Status: open
Type: bug
Origin: stage-gate tab-follow-ups, K3 step 10
Blocks: none
Blocked by: none
Related: 682

# The tab fixture recorder hangs for a long time after it writes the fixture

## What a person running the recorder sees

`scripts/tab-fixtures/record.mjs` logs that it wrote the fixture file, and
then the process does not exit. The command returns much later, with
rc 0, and the fixture is complete and valid.

On 2026-10-17, in the pair `tbc-wt/tab-follow-ups` on fork `3bdacb8c6`,
two recordings ran:

- `ret-p3-p2` exited normally after 214 s wall (the tab reported
  "Took 183.5s").
- `feral-p5-th4pc` wrote its file at about 391 s (the tab reported
  "Took 383.2s"), but the process exited only after 2767 s. It hung for
  about 38 minutes after its work was done.

Source: `.scratch/stage-gate/tab-follow-ups/execution-report.md` in the
main checkout, § K3, "What I did" and "Notes / concerns". The same numbers
are in ticket 682's closing note.

## Cause

Not investigated. Hypothesis, untested: the browser shutdown
(`client.close()`, `chrome.kill()`) or the keep-awake release
(`releaseKeepAwake()`, `scripts/tab-fixtures/keep-awake.mjs`) in the
`finally` block of `main()` blocks the exit. The keep-awake file's header
comment records an earlier recording that hung about 47 minutes after an
idle-timeout standby entry; whether this hang has the same cause is also
untested.

## Done when

A long recording (such as `feral-p5-th4pc`) exits within a few seconds of
logging `wrote ...`, or the recorder prints why it is still waiting and
ends that wait itself.
