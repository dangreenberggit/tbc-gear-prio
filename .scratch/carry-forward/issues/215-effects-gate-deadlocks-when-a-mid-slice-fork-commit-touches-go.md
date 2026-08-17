Status: open
Type: defect (latent; the gate's instructions become unfollowable)
Origin: adversarial review of ticket 213's fix, 2026-08-17
Blocks: none today — dormant while fork slices stay TypeScript-only
Blocked by: none

# The effects gate deadlocks if a mid-slice fork commit touches `sim/**/*.go`

Ticket 213 made `check_sim_implemented_effects.py` compare `forkCommit`
against the lockfile pin instead of the clone's live HEAD, and made
`generate_sim_implemented_effects.py` refuse to run (exit 2) when HEAD differs
from the pin. Both changes are right on their own. Together they leave one
state with no legal move.

The check's two halves read **different commits**:

- the id sets are rebuilt from the Go tree **on disk**, i.e. the clone at its
  current HEAD (`build_payload()`, `check_sim_implemented_effects.py:82`);
- `forkCommit` is compared against **the pin**
  (`check_sim_implemented_effects.py:89-96`).

Clone-ahead-of-pin is the expected mid-slice state (§9.1a — the lockfile is
the orchestrator's file and fork workers cannot bump it). So during any fork
slice the check is judging disk-derived data against a pinned label.

## The stuck state

If a fork commit lands mid-slice that touches any `sim/**/*.go` file:

1. `pnpm sim-implemented-effects:check` rebuilds the id sets from the ahead
   tree, finds them different from the committed artifact, and reports
   `stale`, instructing the reader to re-run
   `generate_sim_implemented_effects.py`.
2. That generator now exits 2 with "clone HEAD is X but
   data/wowsims-fork.lock.json pins Y ... update the lockfile (or reset the
   clone to the pin), then re-run."

The gate's own instructions cannot be followed. `pnpm verify` is red, and the
only exits are to bump the pin early (which §9.1a assigns to the end of the
slice, after the fork work merges) or to reset the clone (throwing away
in-progress fork work).

## Why it is dormant, not fixed

Ticket 212 slices 3 and 4 are TypeScript-only — verified: `git -C
vendor/tbc-new-fork diff --name-only 138fa77..5e26fa0 -- '*.go'` is empty for
the last five fork commits, and the engine port touches
`upgrades/engine/*.ts` only. The generator reads `sim/**/*.go` and
`sim/common/**/*_auto_gen.go` exclusively, so a TypeScript-only fork slice
cannot move the id sets.

Untested hypothesis: any future fork slice that touches Go — a sim fix, an
upstream merge that brings Go changes, a new item effect — reaches this state
on its first `pnpm verify`.

## Reproduce

Not reproduced. Constructing it means committing a Go change into the shared
fork clone, which was out of scope for the review that found it. The
mechanism is read off the two scripts, cited above. Treat the failure mode as
**derived, not observed**.

## Options (not decided)

1. **Rebuild the id sets from the pinned commit rather than the working
   tree** — e.g. `git -C vendor/tbc-new-fork show <pin>:sim/...` — so both
   halves of the check describe the same commit. Most correct; needs the
   scanner to read from git rather than the filesystem.
2. **Let the generator run when only the id sets moved**, stamping the pin and
   warning, so the operator can follow the check's advice. Reintroduces the
   risk ticket 213 closed (a `forkCommit` naming a commit the payload does not
   describe), so probably wrong.
3. **Detect the state and say so.** Keep both behaviours, but when the id sets
   differ *and* HEAD is ahead of the pin, print the actual remedy: finish the
   fork slice, bump the pin, then regenerate. Cheapest, and turns a dead end
   into instructions.

## Acceptance criteria

- [ ] With the clone ahead of the pin and a Go change on disk, `pnpm verify`
      either passes for a defensible reason or fails with a remedy the
      operator can actually carry out.
- [ ] The chosen option is recorded here with its reasoning.
- [ ] Reproduced first: construct the state deliberately (a throwaway Go file
      in the clone plus an empty probe commit), record the observed output,
      then fix. Restore the clone afterwards — it is shared.
