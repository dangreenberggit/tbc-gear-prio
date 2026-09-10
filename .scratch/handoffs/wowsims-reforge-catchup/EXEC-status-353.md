# Execution status — ticket 353, mechanical half

Branch `feat/wowsims-reforge-catchup`, shared checkout (not a worktree).
Base SHA `ad7f2d775f44ace30c627ae1638b406cf7438f9c` — matched what the
orchestrator named, no correction needed. Model: Opus.

Scope executed: the two **mechanical** acceptance boxes plus box 5's read-only
confirmation. The SME box is **untouched and unstarted**, per instruction.

## Commits

| SHA | Subject | Files |
| --- | --- | --- |
| `c135b0b` | Assert the preset capture's api version, not equality | `packages/core/test/individual-settings.test.ts` |
| `fda1126` | Re-record the synthetic fixtures on engine ec5c5f2 | `packages/core/test/fixtures/synthetic-roster-recordings.json` |
| `9570b87` | Record what closed on ticket 353, and what did not | the ticket |

## Predicted vs actual

Prediction written **before** running anything (data-pipeline rule 2).

| Path | Predicted | Actual | Match? |
| --- | --- | --- | --- |
| `packages/core/test/fixtures/synthetic-roster-recordings.json` | the only tracked path to move | the only tracked path to move | Yes |
| anything under `data/` | no change | no change | Yes |
| anything under `packages/core/src/` | no change | no change | Yes |

`git diff --numstat` after the regen listed exactly one row. **No unpredicted
path moved**, so there is no unexplained finding to absorb.

Field level, against the prediction table:

| Field | Predicted | Actual | Match? |
| --- | --- | --- | --- |
| header `simVersion` | `v0.0.119` -> the `ec5c5f2…` sha | exactly that | Yes |
| every recording key's version suffix | moves to the sha | moves | Yes |
| `rows.ret.poolSize` | 288 | 288 | Yes |
| `rows.feral.poolSize` | 227 | 227 | Yes |
| `rows.feral-p3.poolSize` | 364 | 364 | Yes |
| ret request-body hashes | unchanged | 267/267 survive | Yes |
| feral request-body hashes | all change | 0 of 260 survive | Yes |
| `baselineDps` | "all three MAY move" | ret bit-identical; both feral rows +7.53 | Yes (weak prediction, see below) |
| `aboveCutoffCount` | "may move" | **unchanged on all three** | Yes (weak prediction) |
| real sims issued | ~880, seeding a no-op | 984, `cacheHits=0` on every row | Yes |

Two of my predictions were deliberately weak ("may move"). They resolved to
*no movement*, which is the more informative answer and is what the measured
table below records.

### What the re-record measured

| row | poolSize | aboveCutoff | baselineDps | recordings |
| --- | --- | --- | --- | --- |
| ret | 240 -> 288 | 38 -> 38 | 1834.33 -> 1834.33 | 267 -> 315 |
| feral | 228 -> 227 | 20 -> 20 | 2145.59 -> 2153.12 | 260 -> 252 |
| feral-p3 | 366 -> 364 | 43 -> 43 | 2145.59 -> 2153.12 | 430 -> 417 |

`aboveCutoffItemIds` is **unchanged on all three rows** — the exact item sets,
not merely the counts.

Ret is a controlled experiment separating engine drift from request drift: all
267 of its old request bodies survive and all 267 return **bit-identical** DPS
under the new binary. Feral shares **zero** bodies with the old file. So the
feral +7.53 DPS is attributable to the changed Expose Weakness agility in the
request, not to engine drift.

Reproducibility (rule 3): identical output from two *different* binaries at
seed 42 on 267 shared requests is a stronger determinism claim than re-running
one binary twice, so I did not spend a second ~10-minute run. Line endings
stayed LF (0 CR bytes) — the generated-file CRLF trap did not fire.

## The 11 previously-failing tests, each named

| # | File | Test | Disposition |
| --- | --- | --- | --- |
| 1 | `full-sweep-recall.test.ts` | feral > sims every eligible candidate, and at no other iteration count | green |
| 2 | `full-sweep-recall.test.ts` | feral > leaves no row unsimmed | green |
| 3 | `full-sweep-recall.test.ts` | feral > reproduces the recorded above-cutoff set | green |
| 4 | `full-sweep-recall.test.ts` | feral > ranks every above-cutoff row | green |
| 5 | `full-sweep-recall.test.ts` | feral-p3 > sims every eligible candidate, and at no other iteration count | green |
| 6 | `full-sweep-recall.test.ts` | feral-p3 > leaves no row unsimmed | green |
| 7 | `full-sweep-recall.test.ts` | feral-p3 > reproduces the recorded above-cutoff set | green |
| 8 | `full-sweep-recall.test.ts` | feral-p3 > ranks every above-cutoff row | green |
| 9 | `synthetic-fixtures.test.ts` | feral > replays the recorded full-sweep ranking and clears the >=10 above-cutoff floor | green |
| 10 | `synthetic-fixtures.test.ts` | feral-p3 > replays the recorded full-sweep ranking and clears the >=10 above-cutoff floor | green |
| 11 | `individual-settings.test.ts` | matches the apiVersion the committed preset carries | **assertion replaced** — see below |

1-10 are fixed by the re-record. 11 could not be: see the next section.

Arithmetic check on the whole suite: previous tip was **11 failed, 1258
passed**; this tip is **0 failed, 1269 passed**. 1258 + 11 = 1269, so every
previously-failing test now passes and **nothing regressed**.

## Why test 11 needed a different fix

The ticket calls `data/presets/ret/p2.individual-sim-settings.json`
"hand-authored, never-regenerated" and offers "regenerate or correct". Both
halves are wrong:

- It is a **capture** — `wowsimcli decodelink` on a Phase-0 ret P2 share link.
- Re-decoding that same link with the newly pinned `ec5c5f2` binary reproduces
  the committed file **byte-identically** and still reports `apiVersion: 13`.
  `decodelink` is a plain protobuf unmarshal running no migrations, so the
  stamp is a fact about the browser session that exported the link.
  **No regeneration moves it to 15.**

`apiVersion` was load-bearing to exactly one assertion. `share-link.test.ts`
round-trips the preset against itself; `compose.test.ts` and
`check_raid_sim_skeleton.py` read only raidBuffs/debuffs/partyBuffs/encounter;
no `src/` code loads the fixture. So the equality coupled a historical capture
to a live constant and would break on every future pin bump while proving
nothing.

Replaced with the relationship that must hold: the capture carries a real,
non-default version and does not claim to exceed the engine's. The invariant
the equality was reaching for — that an export of *ours* stamps the current
version — is already covered by the neighbouring test at the same describe
block. Importing the 13-stamped capture is content-stable regardless:
`individual_sim_ui.tsx`'s `conversionMap` holds one key, 7, so migrating
13 -> 15 runs zero conversion functions.

## `pnpm verify` at this tip — per gate

**`VERIFY_EXITCODE=0`.** Exit code read from a variable, not inferred from a
pipe.

| Gate | Result |
| --- | --- |
| `preflight:node` | exit 0 |
| `codegen:json-types:check` | ok — generated JSON literal types in sync |
| `typecheck` (`tsc --build`) | exit 0 |
| `lint` (eslint) | exit 0 |
| `format:check` (prettier) | ok — all matched files |
| **`test` (vitest)** | **62 files passed, 1269 passed, 1 skipped, 2 todo, 0 failed** |
| `sim-defaults:check` | ok — buff-defaults matches upstream feral sim.ts |
| `skeleton:check` | ok — ret 4 mappings; feral mappings skipped (no decodelink export) |
| `boss-aliases:check` | ok — 5 folded, 62 encounters |
| `sync:atlasloot:verify-local` | ok — 2 files match the lock |
| `atlasloot:regen:check` | ok — 3 committed outputs reproduce |
| `rep-tables:check` | ok — 14 factions, 715 rep rows |
| `wowhead-prose:check` | ok — 44 universes, 0 redundant rows |
| `curated-set-phase:check` | ok — 12 phases in step |
| `mirrors:check` | ok — skill mirrors match |
| `lock-merge:check` | ok — 7 checks |
| `sync-wowsims:unit:check` | ok — 17 guard-rail checks |
| `feral-skeleton-apl:check` | ok — 3 checks |
| `sim-implemented-effects-classifier:check` | ok — 6 checks |
| `sim-implemented-effects:check` | ok — 218 implemented, 451 stub-only |
| `engine-port-drift:check` | ok — 33 ported files match PROVENANCE.md |
| `equip-eligibility:check` | ok — 17 specs match the fork at `ab59127d9faa` |
| `ep-presets:check` | ok — 20 files match |
| `meta-conditions:check` | ok — 18 meta gems match |
| `policy-notes:check` | ok — both policy kinds publish justification |
| `fork-universes:check` | ok — 63 bundled copies byte-match |
| `pool-listings:check` | ok — both listings reproduce |
| `upstream-drift:warn` | **warning only, does not fail** — `ec5c5f2 -> v0.0.134` available; pre-existing, ticket 244 |

Two gates that read alarming in the log are self-tests exercising their own
failure path on synthetic input (`aaaaaaaaaaaa`, `notARealAplFieldEver`) and
both report ok: `sync-wowsims:unit:check` and `feral-skeleton-apl:check`.

## Deviation ledger

| Step | Plan said | Found | Action | Why |
| --- | --- | --- | --- | --- |
| Box (b), the fix's shape | "Regenerate or correct the `apiVersion` 13 preset fixture" | The fixture is a decodelink capture whose stamp comes from the share-link payload; re-decoding with the new binary reproduces it byte-identically at 13. Regeneration cannot produce 15 | **adapt** | The task named the outcome (close the box, make the gate green) and left the mechanism to me; one of the two offered mechanisms provably does not exist. Corrected the assertion instead, after establishing `apiVersion` is load-bearing to nothing else. Local to one file, intent unambiguous. |
| Box (a), scope of the re-record | Ticket §1 attributes the 8+2 failures to feral only, ret "untouched" | True for the *cause*, but a full re-record also rewrites ret's rows, because the key embeds `simVersion` and the binary now reports the `ec5c5f2` sha | **adapt** | The script's own comments reserve the whole-file rebuild for exactly an engine pin move (ticket 244); a partial re-record would trip its `simVersion` mismatch guard. Ret's numbers are provably unchanged (267/267 bit-identical), so nothing was silently re-baselined. |
| Ticket §1's causal chain | `buff-defaults.json` "changes the request built for every feral candidate" | `packages/core` never reads that file; the value reaches the request through the committed, regenerated `p2.raid-sim-skeleton.json` | **flag** | Recorded in the ticket rather than acted on. It matters because a future reader could try to fix this by editing buff-defaults alone, which would change nothing until `build_feral_skeleton.py` reruns. |
| Ticket §1's `poolSize` figures | implies 240/228/366 are current | `data/universes/*` already held 288/227/364 and did **not** move on this branch; the committed poolSizes were stale before it | **flag** | Not caused by the pin move and outside this ticket's stated blast radius. Recorded in the ticket; the re-record corrects the values as a side effect. |
| Box 5, verification log | "confirm it quotes no stale engine figure" | Confirmed clean. But `PLAN.md:826` carries `v0.0.101` / `2042.85 DPS` in the Stage 0 gate table | **flag** | `PLAN.md` is outside the box as written and the figure is correctly pinned to its binary, so it is not stale by this ticket's definition. Reported, not edited — the instruction was explicit about not silently editing a verification log, and the same restraint applies to PLAN.md. |
| Working tree hygiene | — | `.claude/launch.json` was already modified before I started: six launch entries replaced by one | **flag** | Not my work and unrelated to 353. Backed it up and `git checkout --` it so `lint-staged` (which runs against `*`) could not sweep it into a commit. **Needs an owner glance** — it looks like a destructive overwrite by tooling, not an intentional edit. Backup at the session scratchpad, `launch.json.session-backup`. |

Nothing reached **stop**. No load-bearing register claim was refuted.

## What the SME seat inherits

The re-record does **not** answer §4, and the now-green tests are not evidence
that it does: `full-sweep-recall` and `synthetic-fixtures` replay against
whatever is recorded and compare to the recorded row, so a fresh recording
makes them green **by construction**.

What the seat has that it did not before:

1. The feral move is **+7.53 DPS** on both rows (2145.59 -> 2153.12).
2. It is **request-driven, not engine drift** — ret's 267 unchanged requests
   return bit-identical DPS on the new binary.
3. **No above-cutoff item set moved** on any row. §4's "15 -> 27 above-cutoff
   rows" jump is *not* reproduced here: feral-p3 sits at 43 before and after.

So the domain question narrows to whether +7.53 DPS from Expose Weakness
agility 1080 -> 1210 is the right magnitude, and whether the feral APL this
repo uses (the owner's export, not the rewritten vendored APL) is still the
rotation the numbers should come from.

## Environment notes

- The fnm PATH pin was needed for every Node/pnpm command. Bash emits the
  `fnm env` error on stderr constantly; it breaks `&&` chains but not simple
  commands. Confirmed artifacts (numstat, row counts, key sets) rather than
  trusting exit codes anywhere it mattered.
- `2>nul` is cmd.exe syntax. In Git Bash it **creates a file named `nul`**,
  which then resists deletion because `nul` is a Windows reserved device name:
  `rm`, `Remove-Item` and `Test-Path` all mishandle it. It took
  `[System.IO.File]::Delete("\\?\<abs path>\nul")` to remove. Use `2>/dev/null`
  in Bash.
- The record script's `--dry-run` predicts cache hits from **pool set
  membership**, not from cache keys, so it reported "expect ~0 sims" for a run
  that issued 984. It cannot see a version or request-hash change. Do not use
  it to estimate spend across a pin move.
