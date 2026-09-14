Status: open
Type: chore
Origin: docs/reviews/feat-upstream-catchup-chunk1.md
Blocks: none
Blocked by: none

# Half-finished regression artifacts left in the stage directory

Plan step 10 of `upstream-catchup-chunk1` was withdrawn mid-execution after the
full-tab ranking regression was judged badly designed (ranking is an unstable
derived observable; the noise-band apparatus existed only to manage instability a
better observable avoids). The work had already started, and its partial output
remains:

```
.scratch/stage-gate/upstream-catchup-chunk1/baseline-1.json   (one of five)
.scratch/stage-gate/upstream-catchup-chunk1/ret-p5-run.mjs
.scratch/stage-gate/upstream-catchup-chunk1/compare.mjs
```

No `post-*.json`, no `regression.md` — those were never produced.

## Why it is harmless today, and why it is still worth a ticket

Nothing committed references any of them:

```
git grep -l 'regression\.md\|baseline-1\.json\|ret-p5-run' <HEAD> -- docs/ data/ scripts/ .scratch/carry-forward/
  -> (no output)
```

`docs/adr/0033-upstream-is-master-again.md` and ticket 390 both cite
`engine-delta.md` instead, correctly. The whole directory is gitignored
(`.gitignore:59`), so none of it entered the diff.

The hazard is interpretive, not mechanical: a later session opening this stage
directory finds a `baseline-1.json` labelled as run 1 of 5 and a comparison
script, with nothing on hand saying the approach was abandoned rather than
interrupted. `baseline-1.json` in particular holds a genuine 32-minute measurement
(601 rows, 36 above cutoff, `panicHit: false`) that is easy to mistake for live
input to a comparison that will never be run.

Note `ret-p5-run.mjs` is worth **keeping**, not deleting: it is a working CDP
driver for a full tab run, and Chunk 2 owns the durable harness it prefigures.

## What would fix it

A `README.md` in the stage directory, or a header comment in each file, recording
that step 10 was withdrawn, why, and that `engine-delta.md` is the replacement.
Deleting `baseline-1.json` is the alternative, but the measurement is real and
cost 32 minutes — annotating beats discarding.
