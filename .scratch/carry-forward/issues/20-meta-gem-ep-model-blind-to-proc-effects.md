Status: closed
Type: bug
Origin: `docs/reviews/phase-1-five-seed-spread.md` Adversarial finding 1
Blocks: phase-2
Blocked by: none
Resolution: PREFERRED_META_IDS in candidate-gems.ts; activation deliberately
  not checked. 2026-07-30.

# Meta gem choice is decided by stat EP, which cannot see "+3% crit damage"

## Problem

Filling an empty meta socket on a candidate picks **Swift Skyfire Diamond
(25894)** over **Relentless Earthstorm Diamond (32409)**.

Reproduce:

```
pnpm exec tsx -e "..."   # fillEmptyCandidateGems(32461, [0,0], gemsForPhase(3), retEp,
                         #   { meta: { metaId: 32409, otherGemIds: [...] } })
=> [ 25894, 32193 ]
```

Measured against `data/presets/ret/p2.ep-weights.json`:

| Gem | fill EP | own deficit |
|---|---|---|
| 25894 Swift Skyfire Diamond | **9.84** | 0 |
| 32409 Relentless Earthstorm Diamond | 9.00 | 0 |

Relentless is the correct ret meta by universal consensus. It loses here because
its headline effect is **+3% critical damage** — multiplicative, and absent from
a purely additive stat-EP model. Swift Skyfire's flat +24 attack power is fully
represented, so it wins on the only axis the model can see.

## What this is NOT

The original review filed this as a critical wrong-meta bug on the theory that
`metaDeficit(metaCtx.metaId, ...)` scores candidate metas against the *worn*
meta's condition. That reasoning is sound as far as it goes — the same `metaId`
is used for every candidate — but it is not what causes this outcome: both gems
return `ownDeficit: 0` on the probe set, so the deficit tie-break is genuinely
neutral here and EP is the legitimate decider. Patching the deficit call to use
`e.gem.id` for meta sockets changes nothing (tried, reverted).

It is nonetheless worth fixing the deficit call on its own merits: the moment two
candidate metas have *different* activation conditions, the current code scores
both against the worn meta and the comparison is meaningless.

## Impact

Any candidate for a head slot with an empty meta socket is simmed wearing the
wrong meta. The request is valid, the sim runs, and the delta is wrong in a way
no error surfaces. The gate box "a ranking you would act on tonight" is weakened
for exactly the slot where meta choice matters.

Mitigating: the ret P3 rank report tops out with correct items, so this has not
visibly corrupted the shortlist — the affected path needs an *empty* meta socket
on a candidate, and most real candidates migrate a worn meta in.

## Done when

- The meta socket is not chosen on stat EP alone. Options: a small hard-coded
  ret meta preference (Relentless first where activatable), an EP bonus term
  approximating +3% crit damage, or sim-measuring the two metas once and
  recording the delta.
- `metaDeficit` in `bestGemForSocket` scores meta-socket candidates against
  their own condition rather than `metaCtx.metaId`.
- A test pins Relentless over Swift Skyfire for a ret set where both activate.

## Closed 2026-07-30

`PREFERRED_META_IDS = [32409]` in `candidate-gems.ts`. A meta socket returns the
preferred meta before the EP path runs; non-meta sockets are untouched.

Verified the premise before fixing. Stat EP over the P3 palette:

```
25894  EP=9.84  Swift Skyfire Diamond
32409  EP=9.00  Relentless Earthstorm Diamond
```

and **nine of eighteen metas score exactly 0.00** (Thundering, Chaotic,
Destructive, Mystical, Powerful, Tenacious, Brutal, Insightful, Eternal), so EP
cannot rank metas at all — this was never only about these two gems.

Authority for the choice is upstream, not memory: all three wowsims ret gear
presets (`ui/paladin/retribution/gear_sets/{preraid,p1,p2}.gear.json`) use
32409 and carry no other meta.

Why the ordering is safe to hard-code even though the magnitude is not: the
effect is `CritDamageMultiplier *= 1.03` (`sim/core/item_effects.go`) and
enters average damage as `crit * (critDmgMult - 1)`
(`sim/core/spell_outcome.go`). Its value therefore scales with crit — ~0.6% of
damage at 10% crit, ~2.4% at 40%, a 4x swing, so **no single DPS number for it
is portable**. But against Swift Skyfire's +24 AP it leads by ~7x at 10% crit
and ~28x at 40%, so the ordering never flips in a realistic ret range.

**Activation is deliberately not checked.** Relentless needs 2 red / 2 yellow /
2 blue elsewhere. A player who slots a meta arranges their other gems to switch
it on; gating on the colours they happen to wear today would understate a real
upgrade. This is the same presumption we make when a worn meta migrates onto a
candidate.

Scope note: this path only runs when the worn helm has **no meta gem to
migrate**. Measured on the slamaltman fixture, all 13 P3 head candidates with a
meta socket carry the worn meta over and never reach the fill. The fix matters
for the case where a player is wearing a helm without a meta and considers one
with a meta socket — rare, but exactly the case where the meta is real value we
should credit.

The second item in "Done when" — `metaDeficit` scoring meta candidates against
`metaCtx.metaId` — is resolved by construction: meta sockets now return before
that block, so it only runs for non-meta sockets, where scoring against the
worn meta's condition is correct. Verified: with `metaCtx.metaId = 25894`
supplied, an empty meta socket still fills 32409.
