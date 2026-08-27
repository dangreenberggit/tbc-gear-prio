# Brief: close tickets 306 and 308

Two tickets the owner asked to knock out together. **They are very different
jobs** and the plan should treat them as two independent tracks, not one
workstream — they share no files and only one of them carries real risk.

Read both tickets in full first:

- `.scratch/carry-forward/issues/306-oxfmt-red-at-baseline.md`
- `.scratch/carry-forward/issues/308-duplicate-non-unique-item-unrankable.md`

## Measurements already taken

These were run before this brief was written. **Do not re-derive them; verify
and build on them.** Each names a command a reader can re-run.

### 306 — the redness is inherited from upstream, not ours

The framing in ticket 306 ("the installed oxfmt disagrees with the tree's
committed formatting") is right, but it is missing the fact that decides the
approach:

| Measurement | Result |
| --- | --- |
| `node ./node_modules/oxfmt/dist/cli.js --check ./ui` at our tip | **194 files** fail |
| Same command against a pristine worktree of upstream base `cbf6b75a889e` | **157 files** fail |
| Our own `upgrades_tab.tsx` alone | fails |
| Formatting *only* `upgrades_tab.tsx` | **53 lines** changed (21 insertions, 32 deletions) |
| `tsc --noEmit` after that formatting | **exit 0** — the change is safe |

So 157 of the 194 are upstream's own files, failing on a commit we never
touched. `.oxfmtrc.json` is upstream's file too (added in their commit
`7e8fcb3d2`, "Modernize FE toolchain"), and `oxfmt` is pinned `^0.62.0` with
0.62.0 installed — so this is **not** version drift on our side.

The diff on our file is purely mechanical: `arrowParens: "avoid"` stripping
parentheses from single-argument arrow functions, plus a couple of line-length
rewraps. Nothing semantic.

(The formatting was applied to measure it, then reverted. The tree is clean.)

### 308 — the guard exists in TWO copies, and the file is gated

`rank.ts:680-681` in the fork:

```ts
const wornAt = equipment.findIndex((spec) => spec.id === entry.itemId);
if (wornAt >= 0 && wornAt !== slotIndex) continue;
```

The identical guard is at `packages/core/src/rank.ts:941-942` in the main repo.
These are **two copies of a ported engine file**, and there is a parity test
plus a provenance gate between them.

## Constraints

1. **308 touches a ported engine file, which arms a specific trap.** Read
   `docs/agents/known-traps.md` §"Before editing a ported engine file" and put
   its five-step cycle into the plan explicitly, in order:
   1. `npx vitest run packages/core/test/wowsims-fork-parity.test.ts` green
      *before* any hash moves
   2. update the file's row in the fork's `upgrades/engine/PROVENANCE.md` with
      the new sha256 (**Edit tool, not sed**)
   3. fork commit
   4. re-pin `data/wowsims-fork.lock.json` to the new fork tip and run
      `pnpm sim-implemented-effects:generate`
   5. `pnpm verify`

   A plan for 308 that does not carry these steps will fail the gate.

2. **Decide whether both copies change, or only one.** If the fix lands in the
   fork's `rank.ts` but not `packages/core/src/rank.ts`, the CLI and the tab
   disagree about what is rankable. State the decision and its consequence for
   the parity test.

3. **308 is coupled to work just shipped.** Ticket 304 drops `owned` rows from
   the below-cutoff group, and that is only safe *because* an owned item is
   currently re-simmed into its own slot and scores ~0. If a second copy becomes
   a rankable candidate, an owned row can carry a real positive delta and the UI
   would hide a genuine upgrade. The plan must revisit
   `rowsTable`'s `belowCutoffInView && !r.owned` filter in the same change. This
   is written in 308's acceptance; do not drop it.

4. **Do not reformat 157 upstream files.** Whatever 306's answer is, a
   194-file reformat is not it — it would bury our work and fight upstream on
   every future sync.

5. Fork gate commands are in `.scratch/stage-gate/upgrades-ui-quality/fork-gates.md`.
   The `node_modules/.bin/` shims fail with an fnm error; invoke through `node`
   against real entry points.

6. Testing follows the `tdd` skill. Note the repo's rule that the primary test
   is at the module interface (`rankUpgrades`) through recorded adapters, and
   that asserting on stage internals is banned.

## Open questions

Each needs a candidate that is not the same approach with different constants,
the result that would make it win stated *before* measuring, and a measurement
or the reason the fixtures cannot measure it. A dropped candidate carries a
stated reason.

### Q1 — What is 306's answer, given that the redness is upstream's?

Ticket 306 offers three options (reformat the tree; pin/configure oxfmt; drop
`fmt` from the gate set). The measurements above change their weights, so
re-evaluate rather than picking from the list as written.

Candidates must include at least: **scope the gate to the files we own** (our
own files stay formatted, upstream's 157 are not our fight) versus **drop `fmt`
from the gate set and document why**. State for each what a future formatting
regression in our own code would look like, and whether it would be caught.

Note there is no "fix the config" candidate available unless you can show the
config is wrong — it is upstream's, and upstream's own tree fails it, which is
evidence the tree is unformatted rather than the config being misconfigured. If
you think otherwise, measure it.

### Q2 — Is second-copy placement in scope for this tool at all?

308's own acceptance opens with this, and it is a real question, not a
formality: "decide whether second-copy placement is in scope — it may be
deliberately out of scope, which is a fine answer to record."

Candidates must include at least: **implement it** (teach the ranker item
uniqueness so a second copy of a non-unique item becomes a candidate for the
other slot of its pair) versus **record it as deliberately out of scope** with
the reasoning written into the engine at the guard, so the next reader does not
re-derive the question.

The win condition must be stated in terms of what a player can learn that they
cannot today, weighed against the cost in constraint 1 and 2 (a ported-file
change across two copies, plus revisiting the owned-row filter).

Note `usedUnique` at `rank.ts:1615` tracks uniqueness for **gems only**, never
items — so an implement candidate must say where item uniqueness comes from,
and whether the item DB actually carries it. **Verify that before planning on
it**; if the data is not there, that is decision-relevant and may itself settle
Q2.

## What done means

`plan.md` exists and:

- Treats 306 and 308 as two independent tracks, sequenced or parallel with a
  stated reason. They share no files.
- Answers Q1 and Q2 with candidates, pre-stated win conditions, and
  measurements (or the stated reason the fixtures cannot measure them).
- Carries the ported-file five-step cycle explicitly for 308, if 308's answer
  involves changing the engine.
- Says what happens to `packages/core/src/rank.ts` versus the fork's copy.
- Says what happens to the `owned`-row filter in `rowsTable`.
- Carries a Claims register and a Paths manifest per the plan template.
- Names, for anything it defers, a stated reason rather than silence.

The plan is this stage's deliverable. No code is written until it clears review.
