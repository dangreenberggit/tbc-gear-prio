Status: open
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
