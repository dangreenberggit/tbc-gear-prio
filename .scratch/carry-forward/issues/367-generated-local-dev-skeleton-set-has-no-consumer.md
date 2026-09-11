Status: open
Type: task
Origin: .scratch/stage-gate/skeleton-scope-and-local-dev-fixture/brief.md
Blocks: none
Blocked by: none

# A generated local-dev raid-sim skeleton set has no consumer (CLI-only, not a tab concern)

The owner's direction was to close the two-of-eleven skeleton gap "with a
stub/default for local development, generated from wowsims' own data: their
default settings plus a gear set at current phase − 1."

Investigated 2026-09-10. **No such generator is being built, because nothing
would read its output.** This ticket records that finding, the inventory that
makes the build more expensive than it sounds, and the condition that would make
it worth starting.

## The finding — generated skeletons would have zero readers

The full reasoning is `ADR-0031`. Measured from Bash at base `43052fb`; probe
output is under
`.scratch/stage-gate/skeleton-scope-and-local-dev-fixture/probe/`.

**Three gates sit between a committed skeleton and a CLI ranking, and a skeleton
clears none of them.**

1. **The `pnpm rank` front door rejects the spec** before loading any file.
   `parseArgs` in `packages/core/src/cli.ts` carries a hardcoded literal; grep
   for `known: ret, feral`. Measured — see `probe/rank-enh-noskeleton.txt`:

   ```
   $ pnpm rank --region US --realm Testrealm --character Nobody \
       --offline --spec enh --max-phase 2
   unknown spec: enh (known: ret, feral)
   rc=2
   ```

   This gates that one entry point, not the ranker. `rankUpgrades` is called
   directly by `packages/core/test/archetype-specs.test.ts` with shadow, rogue,
   warrior and hunter — those callers supply their own in-line request and read
   no preset file.

2. **There is no live gear path**, so every run is offline. Grep for
   `live WCL path is not wired yet` in `packages/core/src/cli.ts`.

3. **Offline runs need a recorded character, which a skeleton does not supply.**
   `offlineGearRecordings` in `packages/core/src/cli-wiring.ts` returns
   `undefined` outside `RECORDED_CHARACTERS` (one ret, two feral). Measured on
   **ret**, which already has a skeleton — see `probe/rank-ret-unrecorded.txt`:

   ```
   $ pnpm rank --region US --realm Testrealm --character Nobody \
       --offline --spec ret --max-phase 2
   no-qualifying-fight: no qualifying fights for Nobody
   rc=1
   ```

   That conclusion rests on the code read of the `RECORDED_CHARACTERS` →
   `findFights` → `resolveFight` chain; the single run is consistent with it but
   does not by itself isolate the cause.

**The caller census.** The only reader of a committed skeleton is
`loadOfflineInputs` in `packages/core/src/cli-wiring.ts`, and it builds the path
by template (`data/presets/${spec}/p2.raid-sim-skeleton.json`). A grep for
literal per-spec paths returns zero whether or not a reader exists, so it
**cannot show absence** and was not used. The census of call sites can, and it
returns exactly three — `packages/core/src/cli.ts`, `apps/web/server/wiring.ts`,
`apps/web/test/recordings.ts` — each independently gated to ret/feral. Command,
full output and the per-caller gate greps are in
`probe/loadOfflineInputs-callers.txt`.

The tests that do exercise all eleven specs read no file: `archetype-specs.test.ts`
builds a tab-shaped skeleton in-line as an object literal.

## The inventory — why the build is also harder than it sounds

Per-spec preset data in the fork, measured 2026-09-10. `CURRENT_PHASE` is
Phase3, so phase − 1 is p2.

| Spec | fork dir | `p2*` gear files | APL files |
| --- | --- | --- | --- |
| `balance` | `ui/druid/balance/` | `p2_a.gear.json` | `default.apl.json` |
| `feral` | `ui/druid/feralcat/` | `p2_6p`, `p2_9p`, `p2_alt_6p`, `p2_alt_9p` | `default.apl.json` |
| `hunter` | `ui/hunter/dps/` | **none** — nested `gear_sets/phase_2/{bm,sv}/*` (6 files) | `default.apl.json` |
| `mage` | `ui/mage/dps/` | `p2Arcane.gear.json` | **4 files, no `default`** |
| `ret` | `ui/paladin/retribution/` | `p2.gear.json` | (skeleton already exists) |
| `shadow` | `ui/priest/dps/` | `p2.gear.json` | `default.apl.json`, `test.apl.json` |
| `rogue` | `ui/rogue/dps/` | `p2.gear.json` | **`swords.apl.json` only, no `default`** |
| `ele` | `ui/shaman/elemental/` | `p2.gear.json` | `default.apl.json` |
| `enh` | `ui/shaman/enhancement/` | `p2.gear.json` | `default.apl.json` |
| `warlock` | `ui/warlock/dps/` | **none** — tier-named (`t4`/`t5`/`t6`/`za`/`swp`) | **5 files, no `default`** |
| `warrior` | `ui/warrior/dps/` | `p2_arms`, `p2_fury` | `arms.apl.json`, `fury.apl.json` |

Three specs have no unambiguous default APL (mage, rogue, warlock), warlock's
gear is tier-named rather than phase-numbered, and hunter's p2 gear is nested
and doubly split.

**Per-spec buff extraction is single-spec today.** `scripts/extract_sim_defaults.mjs`
has one `SPECS` entry and `vendor/wowsims/` vendors exactly one `*_sim.ts`
(`ls vendor/wowsims/*_sim.ts` → `feral_sim.ts`). `ADR-0022` forbids reusing
another spec's buff blocks, so each spec needs its own extraction — new `TRACKED`
entries plus extractor plumbing.

`scripts/build_feral_skeleton.py`, the only skeleton generator that exists, does
not generalize: it is hardcoded for feral and reads the owner's personal
settings export, which has no counterpart for any other spec.

## Which source a generated skeleton may read from

Settled, and not to be re-litigated (`ADR-0031`, Q3):

- **Committed output** may read only the pinned mirror `vendor/wowsims/`, via a
  hand edit to `TRACKED` in `scripts/sync_wowsims.py` then
  `--update --tag <the tag already in data/wowsims.lock.json>`.
- **The fork checkout is not a legitimate source for a committed artifact.** Its
  pin `0b50f402` is on no remote (measured 2026-09-10: the remote branch tip is
  `d49096e9`, 211 commits behind the pin), so a generator reading it makes its
  output unreproducible and the byte-compare gate unrunnable.
- **A gitignored local-dev stub** may read either tree; nothing gates it.

## Candidates, and why each lost or was deferred

Each with the result that would have made it win, stated before measuring.

1. **Build the full nine-spec generator.** Would have won if every spec's inputs
   were unambiguous. They are not — see the inventory. Lost.
2. **Build the subset with unambiguous inputs** (balance, shadow, ele, enh).
   Would have won if the structure generalizing were the binding constraint. It
   is not: the output still has no reader, and ADR-0022 forces per-spec buff
   extraction that does not exist yet. Lost.
3. **Build none.** Wins on the census: nine generated files nobody opens.
   **Chosen.**
4. **Extend `parseArgs` past ret/feral and route a preset gear set through
   `syntheticOfflineRecordings` as a synthetic character.** This is the one
   candidate that would give a skeleton a real consumer — the skeleton would be
   its input. **Deferred, not rejected:** no consumer has asked for CLI ranking
   of non-recorded specs, and `ADR-0027` makes the tab the primary product.

## Why `open` and not `wontfix`

The work is **deferred pending a consumer**, not refused. Candidate 4 above is a
route this repo could legitimately want, and a skeleton set is exactly what it
would consume. `wontfix` is the one status that tells future agents never to
look again — and this ticket exists partly because a stale framing in ticket 365
sent three sessions down a nine-step build. Recording "no consumer today" is
honest; recording "never" would not be.

## Reopen (start work) when

A named consumer exists. Either of these is enough:

- a decision to extend `parseArgs` past ret/feral with a synthetic-character
  route through `syntheticOfflineRecordings`; or
- a test that needs a spec-specific committed `RaidSimRequest` (ticket 365's
  CLI-side reproducibility gap is the nearest live example).

## Until then

No action. Do not re-price the generator — the inventory and the census above
are the pricing, and they were measured at base `43052fb`.

## What is NOT claimed

- **Nothing here says what the engine does with a 2H + off-hand set.** That is
  ticket 350's territory, and the owner declined that measurement.
- **Nothing here changes the tab.** The Upgrades tab never reads a committed
  skeleton; it builds one from the user's live page state. "2 of 11 skeletons"
  has never been a tab limitation.
- **Nothing here claims the nine specs are unrankable in principle** — only that
  no path in today's CLI reaches a ranking for them, with or without a skeleton.
