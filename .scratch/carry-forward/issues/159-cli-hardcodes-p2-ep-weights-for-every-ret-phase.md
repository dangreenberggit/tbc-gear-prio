Status: resolved (packages/core/src/ep-weights.ts resolves by maxPhase from
data/presets/ep-weights-by-phase.json, the same file
scripts/assemble_universe.py now reads -- see commit that closes this ticket.
The CLI still reads only `.weights`, never `.pseudoWeights`; that is left as
recorded, not silently changed)
Type: bug
Origin: docs/reviews/feat-ret-p3-data.md (reviewer's own check, orchestrator lane)
Blocks: none
Blocked by: none

# `cli.ts` hardcodes p2 EP weights for every ret phase

`packages/core/src/cli.ts:284-288` selects the EP-weights file by **spec only**,
ignoring `args.maxPhase`:

```ts
const epWeights = loadJson<{ weights: Record<string, number> }>(
  args.spec === "feral"
    ? "data/presets/feral/p1.ep-weights.json"
    : "data/presets/ret/p2.ep-weights.json"
).weights;
```

`feat/ret-p3-data` taught the **Python** assembler to resolve weights per
phase (`scripts/assemble_universe.py:354` `ep_weights_path_for`), but the
TypeScript ranking path was not touched by that branch — `git show
5be6a81:packages/core/src/cli.ts` is byte-identical here, and the branch
changed no file under `packages/core/src` at all.

So the same fact — "which EP weights apply at phase N for ret" — now has two
sources that disagree: the assembler scores `ret-p3/p4/p5.json` with p3
weights while a `--max-phase 3` CLI rank prefilters and gem-fills with p2's.

Pre-existing, but this branch is what makes the two disagree, and
`docs/plans/wowsims-tab/plan.md:316-320` names EP as gating "the prefilter and
gem fill", calling p3 rankings on p2 weights "usable but degraded".

Note the CLI also reads only `.weights` and never `pseudoWeights`, so the
main-hand-DPS term (5.43 at p3, 5.34 at p2) reaches the assembler's
`curationHint` but not the CLI path. Confirm whether that is intended before
changing it — `grep -rn "pseudo" packages/core/src` finds only generated
proto code.

## Done when

The CLI resolves ret EP weights by `maxPhase` using the same rule as
`ep_weights_path_for` (one shared source of the mapping, not a second
hand-copied table — see ticket 102 for the failure mode of hand-copying a
Python map into TypeScript), or a recorded decision says the CLI
deliberately stays on p2 weights and why.
