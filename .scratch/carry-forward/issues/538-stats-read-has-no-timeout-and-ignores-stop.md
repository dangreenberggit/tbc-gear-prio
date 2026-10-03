Status: open
Type: defect
Origin: pre-merge review round 11 on feat/tab-signoff-followups, finding A1, 2026-10-03
Blocks: none
Blocked by: none
Related: 535, 533

# A stats read has no timeout and Stop cannot end it

## What was found

Since ticket 535, the Upgrades tab reads the character's hit from the sim
with `computeStats` before meta repair, once for the baseline and once per
repaired set version. Line numbers below are in `vendor/tbc-new-fork` at
fork `3613d654f`; read them with
`git -C vendor/tbc-new-fork show 3613d654f:<path> | sed -n <from>,<to>p`.

- `ui/core/worker_pool.ts:114-117`: `WorkerPool.computeStats` awaits the
  worker's answer with no timeout.
- `ui/core/components/individual_sim_ui/upgrades/engine/rank.ts` about
  lines 1108-1135: the baseline read is a plain call, not raced against
  the run's abort signal.
- `rank.ts` about lines 3989-3995: the Stop guard refuses new reads after
  Stop, but does not end a read that has started.

So if a worker never answers a stats read, the run waits forever and Stop
does not end it (hypothesis, untested: no run has been seen to hang on a
read).

Ticket 535's "Wall time" paragraph records one feral "after" recording
that stalled before its first sim until the recorder's 25-minute watchdog
killed it; its cause is unknown, and the reviewer then named the missing
timeout as a hypothesis.

## What would close this

1. Try to reproduce the hang, or show from the code that a stats read
   cannot block forever. Record the command.
2. If a read can block: race each read against the run's abort signal and
   a timeout, and treat a timeout like a failed read (one console warning,
   no cached ranking, full-weight repair, as test 535-S3 does for a failed
   read). Add a test that a never-answering `computeStats` with Stop
   returns a `PartialRanking`, as tests 533-S/W do for sims.
