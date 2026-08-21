Status: resolved
Type: defect (latent; the gate's instructions become unfollowable)
Origin: adversarial review of ticket 213's fix, 2026-08-17
Blocks: none today — no current slice commits Go, but see the trigger note:
an untracked .go file in the clone is enough
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

## Why no current slice hits it

Ticket 212 slices 3 and 4 are TypeScript-only — verified: `git -C
vendor/tbc-new-fork diff --name-only 138fa77..5e26fa0 -- '*.go'` is empty for
the last five fork commits, and the engine port touches
`upgrades/engine/*.ts` only. The generator reads `sim/**/*.go` and
`sim/common/**/*_auto_gen.go` exclusively, so a TypeScript-only fork slice
cannot move the id sets.

Any future fork slice that touches Go — a sim fix, an upstream merge that
brings Go changes, a new item effect — reaches this state on its first
`pnpm verify`. So does a TypeScript-only slice with a stray untracked `.go`
file in the clone, per the trigger note above.

## Reproduced 2026-08-17 — observed, not derived

Reproduced in an isolated sandbox: copies of both scripts against a synthetic
fork repo in a temp directory. The shared clone at `vendor/tbc-new-fork` was
never touched, so this needs no access to it and can be re-run safely.

Method: build a synthetic fork with a `sim/` tree, take a green baseline with
HEAD equal to the pin, then commit a Go change so the clone sits one commit
ahead.

1. `pnpm sim-implemented-effects:check` → **exit 1**: "sim-implemented-effects.json
   is stale against the fork's Go tree (fields differ:
   `['implementedEffectItemIdsCount', 'implementedEffectItemIds']`). Re-run
   `python scripts/generate_sim_implemented_effects.py` ..."
2. Following that instruction → **exit 2**: "clone HEAD is `<ahead>` but
   data/wowsims-fork.lock.json pins `<base>` ... update the lockfile (or reset
   the clone to the pin), then re-run."

No legal move was found. Neither script has a bypass flag; the check's message
names only the generator and `assemble_universe.py`, which consumes the
artifact rather than producing it; and the sibling
`sim-implemented-effects-classifier:check` runs on synthetic in-line Go
strings, so it is unaffected. The two exits named under "The stuck state"
above are the only ones.

## The trigger is wider than a Go *commit*

The scan is of the **working tree**, not of git: `SIM_DIR.rglob("*.go")`. So an
uncommitted or untracked `.go` file under `sim/` moves the id sets too. A fork
slice that is TypeScript-only *in its commits* still reaches this state if a
stray Go file is left in the clone — a scratch file, a half-finished
experiment, an editor backup.

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

- [x] With the clone ahead of the pin and a Go change on disk, `pnpm verify`
      either passes for a defensible reason or fails with a remedy the
      operator can actually carry out.
- [x] The chosen option is recorded here with its reasoning.
- [x] Reproduced first — done 2026-08-17 in an isolated sandbox (synthetic
      fork repo in a temp directory; the shared clone was never touched).
      Observed output recorded above.

## Comments

### 2026-08-17 — resolved with option 1 (rebuild the id sets from the pinned commit)

**Chosen: option 1**, with option 3 as the named fallback. It was not needed.

Reasoning. Option 3 is cheaper, but it only improves the error message: `pnpm
verify` still stays red for the whole duration of any Go-touching fork slice,
which is the actual cost of this defect. Option 1 makes verify green for a
defensible reason — the committed artifact describes the pin, and the pin has
not moved — and it also kills the wider untracked-`.go` trigger recorded above,
which option 3 does not. Option 2 was rejected upstream in this ticket for
reintroducing what ticket 213 closed.

`check_sim_implemented_effects.py:build_payload()` now takes the pin and
enumerates the Go files with `git -C vendor/tbc-new-fork ls-tree -r --name-only
<pin>`, reading each through `git show <pin>:<path>`, so the id sets and the
`forkCommit` comparison describe the same commit. `main()` reads the pin before
building the payload, and a clone that does not contain the pinned commit now
exits 2 with its own message rather than a traceback. The two scanners in
`generate_sim_implemented_effects.py` were split into text-taking cores
(`active_item_ids_from_texts`, `stub_only_candidates_from_texts`) so both
callers share one implementation; the generator's own disk path and its
HEAD==pin refusal are unchanged, which is correct — it only ever runs at the
pin, where disk equals pin.

**Before committing, the payload was verified, not assumed.** A git
reconstruction at the pin reproduces the committed artifact exactly:

```
git-reconstructed implemented: 215 stub-only: 460
committed             implemented: 215 stub-only: 460
implementedEffectItemIds MATCH: True
stubOnlyItemIds MATCH: True
```

This matters because 16 files on disk — `sim/core/proto/*.pb.go`, generated
protobuf ignored by `sim/core/proto/.gitignore` — are permanently untracked and
so drop out of a git-based scan. They contribute zero item ids, which is why
the reconstruction still matches. A file-list test ("is every scanned file
tracked at the pin?") would have misfired on these 16; the payload is the thing
that matters and the payload is identical.

**Sandbox re-run** (`sandbox215.py`, synthetic fork repo in the scratchpad; the
shared clone at `vendor/tbc-new-fork` was never touched). Baseline green at
HEAD==pin, then a Go commit ahead of the pin **plus** one stray untracked `.go`
file — the exact stuck state reproduced above:

```
=== THE STUCK STATE TEST: check (fixed scripts) ===
EXIT=0
sim-implemented-effects check ok: 2 implemented, 0 stub-only, matches committed file

=== CONTROL: the same state, pre-fix scripts at base SHA 5a7312b ===
OLD CHECK EXIT=1
data\sim-implemented-effects.json is stale against the fork's Go tree (fields
differ: ['implementedEffectItemIdsCount', 'implementedEffectItemIds']). Re-run
`python scripts/generate_sim_implemented_effects.py` ...
OLD GENERATOR EXIT=2
generate_sim_implemented_effects: clone HEAD is e7f454f6... but
data/wowsims-fork.lock.json pins 65ade9a8... update the lockfile (or reset the
clone to the pin), then re-run.
```

The control reproduces the deadlock verbatim; the fixed scripts turn the same
state green. On the real repo, `pnpm sim-implemented-effects:check` exits 0
(`215 implemented, 460 stub-only, matches committed file`) and the generator
still runs at the pin.
