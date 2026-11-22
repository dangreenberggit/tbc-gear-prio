Status: open
Type: bug
Origin: docs/reviews/refactor-rank-split-b.md
Blocks: none
Blocked by: none

# A store fault during the set-bonus sims is reported as "its sim failed"

Found by the Phase B review's adversarial axis (finding N2, in the review's
Notes). It is older than Phase B: the base `bbe89a565` behaves the same, and
Phase B had to leave it alone because fixing it changes behaviour.

## What the player sees

Today, nothing. The tab ranks with an in-memory store
(`model/run.ts:66`, `new MemoryStore()`) whose `get` and `put` cannot throw
(`model/engine/seams/store.ts:52-59`).

If the store's read or write does fail (a store that can fail, such as the
IndexedDB cache on the "Later" list, or a fault injected in a test), a set
bonus that was not measured gets a line in the run's notes saying it was left
out because "its sim failed.", with the store's error text. The sim did not
fail; the store did. The bonus's value is then missing from the set-bonus
figures, as for a real sim failure, and the run goes on.

The sim cache's own code says a store fault is an internal fault, not a sim
failure (`sim-calls.ts:45-47`, below). The set-bonus sims undo that.

## Evidence

Paths under `vendor/tbc-new-fork/ui/features/upgrades/`, at fork `04bf9faf8`
(branch `refactor/rank-split-b`).

- `model/engine/sim-calls.ts:20,28`: the sim cache's store read and write are
  wrapped as `RankError('internal')`. `sim-calls.ts:45-47` says why: "A store
  read or write that fails is an `internal` fault, and labeling it
  `sim-failed` sends an operator to the wrong subsystem."
- `model/engine/set-phase.ts:167-180`: `cachedSampleRun`, the set sims'
  runner, rethrows whatever `simOrFailure` throws, the internal store fault
  included.
- `model/engine/set-less-copies.ts:137-143` (`measureSameGearBonus`) and
  `:185-191` (`measureWornSetCounts`): each `catch` around `runSim` takes any
  error, store faults too, as `{ simError }` or `unmeasured: 'sim-failed'`.
- `model/engine/set-reach.ts:248-249` and `set-bonus-values.ts:318-324`,
  `:378`, `:490`: those results become `SET_BONUS_SKIP_REASONS.simFailed`,
  whose text is `'its sim failed.'` (`model/engine/run-notes.ts:87-88`).
- Adversarial review report:
  `.scratch/agent-reports/2026-11-22-general-task-rank-split-b-review-adversarial.md`
  (gitignored, main checkout), § N2. Its fault sweep (a store fault at each
  read or write 1-145) showed base and tip equal.

## What done looks like

A store fault during the set-bonus sims is handled the way it is everywhere
else in the run (the run stops with an internal error), or, if the owner
prefers the run to go on, the note names the store rather than the sim. A
test injects a store fault in a set-bonus sim and checks the outcome. Changing
this is a behaviour change, so it does not belong on a move-only branch.
