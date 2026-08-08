Status: closed
Type: bug
Origin: `docs/reviews/phase-2-disclosure-and-caps.md` Domain finding D2
Blocks: none
Blocked by: none

# The hit-cap banner is blind to Precision, and understates the shortfall ~2.5×

`capStateFrom` (`packages/core/src/caps.ts`) sums hit rating from **gear only**.
For the pinned ret P2 preset that is not a small omission.

## Measurement

The preset's talent string takes 3/3 **Precision**:

```bash
python -c "import json,sys; d=json.load(open('data/presets/ret/p2.raid-sim-skeleton.json')); \
print([t for t in __import__('re').findall(r'\"talentsString\":\s*\"([^\"]+)\"', json.dumps(d))])"
# -> 5-053201-0523005120033125331051
```

Protection block is `053201`. Precision is `proto/paladin.proto:33`
(`int32 precision = 23`); the Protection block starts at 21, so Precision is
local index 2 → **3 points → 3% hit → ~47 rating**.

The same string appears in `test/fixtures/slamaltman.raid-sim-request.json`, so
the sim applies it. Measured effect on the fixture character:

| Source | Rating |
|---|---|
| Gear (what the banner counts) | 72 |
| Precision 3/3 | ~47 |
| **Effective** | **~119 of ~142** |

The banner says "~70 under"; the real shortfall is closer to ~23.

## Why this is not just a wording problem

Precision is a **Protection** talent, not a Retribution one — the Retribution
tree (paladin.proto 43-64) has no hit talent. So this cannot be fixed by
special-casing "ret has talent hit"; it depends on the actual talent string,
which varies per preset and will vary again for feral (ticket 05).

## The fix is cheap, which is why this is filed rather than deferred quietly

`talentsString` is **already in the composed `RaidSimRequest`** the engine
holds. No new seam and no `ComputeStats` RPC is needed for the talent half —
only a mapping from talent index to stat contribution for the specs in play.
That mapping is per-class and hand-maintained, which is the real cost.

Note what stays unreachable either way: raid buffs and consumes. No TBC raid
buff grants melee hit, so for hit specifically Precision is the whole gap;
Heroic Presence stays as the declared one-sided uncertainty band.

## Done when

- The cap figure includes talent-granted hit for the pinned preset.
- The banner's "talents not counted" caveat is removed or narrowed to what is
  genuinely still uncounted.
- A test pins the fixture character near 119 rather than 72.

## Closed 2026-08-06

The stated cause survived reproduction unchanged. Reran the ticket's own
measurement against the live tree before touching anything:

```
cd packages/core && npx tsx -e '
  import { slamaltmanOfflineRecordings, SLAMALTMAN_REF } from "./src/fixtures/slamaltman-offline.ts";
  import { characterFightKey, fightGearKey } from "./src/seams/gear-source.ts";
  import { capStateFrom, HIT_CAP_RATING } from "./src/caps.ts";
  import { socketedItemsFromLoggedGear, equipmentFromLoggedGear } from "./src/logged-gear.ts";
  ...
'
```

reproduced gear-only `hit.rating = 72`, `gap ≈ 69.92` against `HIT_CAP_RATING
≈ 141.92`, matching the ticket exactly. `data/proto/paladin.proto`
(`precision = 23`) and the pinned `ui/core/talents/trees/paladin.json`
(Protection-tree talent order: improvedDevotionAura, redoubt, **precision**)
confirm local index 2 of the Protection segment (`053201`) is Precision;
`sim/paladin/talents.go`'s `applyPrecision` confirms it grants flat
`PhysicalHitPercent`, not rating, so 3/3 converts through
`PHYSICAL_HIT_RATING_PER_HIT_PERCENT` to ~47.3 rating — effective total
~119.3 of ~142, gap ~22.6. No part of the original hypothesis needed revising.

**Fix**: `packages/core/src/caps.ts` gained `talentHitRatingFromString
(talentsString, spec)`, a hand-maintained per-spec table (only `ret` →
Protection-tree index 2 populated; `feral` maps to `undefined` and returns 0,
since druid.proto has no hit talent — carry-forward 05 is feral's own gap, not
this one). `capStateFrom` takes optional `talentsString`/`spec` and folds the
result into `hit.rating`/`hit.gap` when both are supplied.
`packages/core/src/rank.ts` wires this: a new `talentsStringFromRequest`
reads `raid.parties[0].players[0].talentsString` off the composed request
(mirroring the existing `raceFromSkeleton` helper) and passes it alongside
`input.spec` into the `capStateFrom` call. `packages/core/src/disclosure.ts`'s
`hitCapBanner` dropped the "talents and raid buffs are not counted" clause
and the "counting gear alone" framing — talent hit is now counted whenever
`capStateFrom` was given a recognised talentsString/spec, and no TBC raid buff
grants melee hit, so Heroic Presence is the only remaining one-sided unknown
and keeps its own line unchanged.

**Verified**:
- `packages/core/test/caps.test.ts` — new `talentHitRatingFromString`
  describe block (3 tests: decodes the pinned ret P2 string to ~47 rating,
  returns 0 for feral, returns 0 when the mapped slot has no points) plus a
  `capStateFrom` test asserting the talent term is additive
  (`23 + 3×PHYSICAL_HIT_RATING_PER_HIT_PERCENT`). All 4 were RED against the
  pre-fix tree (`talentHitRatingFromString is not a function` / wrong total)
  before the fix, GREEN after.
- `packages/core/test/disclosure.test.ts` — replaced the stale "says gear
  alone" assertion with one confirming the banner no longer claims talents go
  uncounted.
- `pnpm verify` (codegen check, typecheck, lint, format, full test suite,
  skeleton:check, mirrors:check) — green, run from repo root after the fix.
- No `data/universes/**` or other committed generated artifact needed
  regeneration; nothing under `data/` was touched.

## Correction 2026-08-07 (pre-merge review of `fix/carry-forward-backlog`, spec S1)

The third criterion — *"A test pins the fixture character near 119 rather than
72"* — is **not met**, though the ticket was closed as if it were. The ~119
figure above was reproduced by a one-off `npx tsx` run, not pinned by a test.
The test that did land (`packages/core/test/caps.test.ts:178`) uses a synthetic
single-item set and asserts the talent term is *additive*, saying so in its own
comment; it never touches the slamaltman fixture:

```bash
grep -n "119\|talentsString\|capState" packages/core/test/rank.test.ts   # no hits
```

Consequence: a regression in `talentsStringFromRequest` (`rank.ts:877`, an
untested accessor reading `parties[0].players[0]` through a structural cast)
would not be caught. The first two criteria are genuinely met, so this stays
closed rather than reopening — but the end-to-end pin is real outstanding work
and is folded into ticket 60, which has to touch this code path anyway.

Not in scope, not touched: feral's own talent-hit gap (carry-forward 05,
still open — druid has no hit talent so this ticket's fix is a no-op for it,
correctly); raid buffs and Heroic Presence (no TBC raid buff grants melee
hit, and Heroic Presence remains unreadable from WCL — both were already
correctly described as out of reach and stay that way).
