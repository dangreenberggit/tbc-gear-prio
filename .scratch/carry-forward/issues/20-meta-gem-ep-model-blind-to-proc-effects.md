Status: open
Type: bug
Origin: `docs/reviews/phase-1-five-seed-spread.md` Adversarial finding 1
Blocks: phase-2
Blocked by: none

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
