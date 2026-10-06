Status: open
Type: bug (hypothesis, untested)
Origin: `.scratch/stage-gate/558-p4-engine-move/sme-verdict.md` (gate-sme verdict on stage 558-p4-engine-move, 2026-10-06, section 3 "Findings for engineering", first row; gitignored, owner's checkout)
Blocks: none
Blocked by: none
Related: 558, 560, 366

# A character wearing an item id that upstream removed may get no command-line ranking

## What the sources say

**Hypothesis, untested.** On the engine pinned at `42c75dc9`
(`data/wowsims.lock.json`), a character who wears an item id that upstream
removed may get no command-line ranking at all, where the old engine
(`17a8fb28`) ranked them. The removed ids named by the SME are 37597,
38287-38290, 37127, 37128 and 35326.

The chain the SME gives, link by link:

1. Wearing an item id the engine does not know gives an error inside the
   sim result. Measured for one id only: on the new engine, a feral
   skeleton copy with trinket slot 12 set to 38287 gave
   `error: No item with id: 38287` (`error.type ErrorOutcomeError`), and
   `wowsimcli` still exited 0. Source:
   `.scratch/stage-gate/558-p4-engine-move/engine-delta.md`, section "C27"
   (gitignored, owner's checkout). The other ids in the list were not
   measured.
2. `CliSimRunner` throws on any result whose `error.type` is not
   `ErrorOutcomeNone`: `packages/core/src/seams/cli-sim-runner.ts:58-67`.
   Re-run: `sed -n 58,67p packages/core/src/seams/cli-sim-runner.ts`. The
   K3 execution report says every production path uses this runner
   (`cli.ts:309`, `apps/web/server/wiring.ts:84`,
   `record_synthetic_fixtures.mjs:207`) and that no unit test covers that
   branch (`.scratch/stage-gate/558-p4-engine-move/execution-report.md`,
   K3, "F3 answer").
3. Whether that throw ends the whole ranking run is the untested part.

The stage's three rank runs cannot show it: none of the six
`test/fixtures/*.raw.json` files wears any of these ids (the SME's
`grep -oE` over the fixtures returned nothing; `sme-verdict.md` section 2).

This is separate from the rotation half of the same id change. A rotation
that casts 38287 silently never presses a worn 281739 Mug; that is carried
in ticket 560 ("Tab fixtures name the old Mug id") and recorded in ticket
558.

## The measurement that settles it

Run an offline `pnpm rank` on a scratch copy of a fixture that wears 38287
(for example a copy of a `test/fixtures/*.raw.json` with one trinket set to
38287), against the `42c75dc9` binary, and record whether the run produces
a ranking, skips the item, or stops with the `No item with id` error. Not
run. How to point `pnpm rank --offline` at a scratch fixture is not worked
out here; the CLI loads its recordings through `offlineGearRecordings`
(`packages/core/src/cli-wiring.ts:198`).

## What would close this

The measurement above, recorded here with its command and output. If the
run stops, the ticket then records what happens instead; that choice is
not made here.
