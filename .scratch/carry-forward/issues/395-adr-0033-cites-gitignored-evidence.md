Status: open
Type: task
Origin: docs/reviews/feat-upstream-catchup-chunk1.md
Blocks: none
Blocked by: none

# ADR-0033's load-bearing measurement cites a file no future reader can open

`docs/adr/0033-upstream-is-master-again.md:134` sources its one-handed-weapon DPS
finding to:

```
.scratch/stage-gate/upstream-catchup-chunk1/engine-delta.md
```

That file is **untracked and unreachable from the repository**:

```
git check-ignore -v .scratch/stage-gate/upstream-catchup-chunk1/engine-delta.md
  -> .gitignore:59:.scratch/stage-gate/*
git ls-files --error-unmatch .scratch/stage-gate/upstream-catchup-chunk1/engine-delta.md
  -> error: did not match any file(s) known to git
```

So the ADR — a committed, durable document — rests a specific numeric claim
(−80.35 DPS against a 3σ band of 2.16) on evidence that exists on one disk and
will not survive a fresh clone, a new machine, or this scratch directory being
cleared.

## Why it matters here specifically

`AGENTS.md` § Durable claims requires that a causal claim in a committed artifact
"either point at a command a reader can re-run or say **hypothesis** / **untested**
in the same sentence". ADR-0033 does better than most — it states its measurement
conditions and limits — but its pointer resolves to nothing for anyone but this
machine. The claim is re-runnable in principle (the note contains every command)
and unreachable in practice.

This is the same shape as ticket 355: a committed artifact embedding something
nobody else could fetch.

## What would fix it

Any one of:

- Inline the essentials into the ADR — the two binary paths, the input
  (`data/presets/ret/p2.raid-sim-skeleton.json`, committed, fixed seed
  `443754031`, 25000 iterations), the swap item ids, and the four measured
  numbers — so the ADR is self-contained and the note is merely convenient.
- Commit the note somewhere tracked (`docs/measurements/`, say), which needs a
  decision about whether stage-gate output belongs in the tree at all.
- Add a `.gitignore` negation for notes of this kind.

The first is smallest and matches what the ADR already does elsewhere. Note the
measurement itself is sound and was independently reproduced during review — this
is about durability of the record, not correctness of the number.
