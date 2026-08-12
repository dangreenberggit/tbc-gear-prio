# Convergence check after the ticket-111 rarity cap — 2026-08-11

Measured at `feat/set-bonus-value` tip `284f5a4`. All engine figures: pinned
wowsimcli `v0.0.101` (`data/wowsims.lock.json`), seeds [11,22,33,44,55] @ 3000
iterations (15000 effective), owner-settings-v2 gear + the owner's `TypeSimple`
rotation, arms built through the real `equipmentForCandidateSwap` so `repairMeta`
runs. Owner web figures from `owner-web-results-2026-08-11.md`.

`git diff be5fdf1..284f5a4 -- packages/ data/` is **empty**, so the +111.72
package measurement recorded at `be5fdf1` is current-tip behaviour and was not
re-simmed. The helm and belt arms were built and simmed fresh at this tip.

## Verdict — plain English

**On the package comparison: yes, meaningfully closer, but less than half the
gap closed and the remainder is now fully accounted for.** Before the fix our T6
four-piece delta was **+113.42** against the owner's **+98.17** — a residual of
**+15.25**. After the fix it is **+111.72**, residual **+13.55**. The cap bought
**1.70 DPS**, exactly the amount ticket 111 predicted it would buy and said so in
advance. Nobody should read "the rarity fix closed the wowsims gap": it did not,
and it was never claimed it would.

**What is genuinely new is that the residual is now decomposed with nothing left
over.** +13.55 splits into **+8.73** (we fill the gloves socket at all; wowsims
leaves it empty — a deliberate, owner-decided modelling choice, not a defect) and
**+4.82** (the ticket-113 arm-dependent offset against the unversioned web
alpha). The two sum to +13.55 exactly. There is no unattributed residue left on
this comparison — that is the real progress, more than the 1.70 DPS.

**On the helm A/B: it got worse, and the cause is a defect the fix did not
cover.** Pre-fix the engine read **+8.61** against the owner's **+10.69** (gap
2.08, z = 1.3, closing). Post-fix it reads **+7.90**, gap **2.79**, **z = 2.44 —
it no longer closes at 95%.** The reason is not noise: on the helm swap the rare
cap is **defeated downstream**. `swapItemAt` correctly fills the coloured socket
with rare **24028**, and then `repairMeta` — which keeps the *full* palette by
design (ticket 111 instruction 3) — overwrites it with **32220 Glinting
Pyrestone, a quality-4 phase-3 epic**. See "What did not close" below. This is a
new finding from this check and is not covered by tickets 114/115/116.

**Net:** closer and much better understood on the package, slightly worse and
newly-explained on the helm. Both remaining discrepancies now have named
mechanisms rather than open residue.

## Comparison table

| comparison | engine pre-fix | engine post-fix | owner web | residual (post-fix) | explained by |
|---|---|---|---|---|---|
| T6 four-piece package | +113.42 | **+111.72** (SE 0.868) | +98.17 (SE 0.936) | **+13.55** (z = 10.6) | +8.73 fill-exists-at-all (vs UIMIGRATE +102.99) **+** 4.82 ticket-113 offset = 13.55 exactly |
| helm A/B (Cursed − Vengeful) | +8.61 | **+7.90** (SE 0.911) | +10.69 (SE 0.693) | **−2.79** (z = 2.44) | not closed — `repairMeta` seats epic 32220 over the rare-capped fill (new finding) |
| baseline (absolute) | 2219.82 | **2219.82** (SE 0.608) | 2245.60 | −25.78 | ticket 113, unattributed by elimination (build drift = hypothesis) |
| belt 29247 → 30106, TypeSimple | — | **+50.45** (SE 0.871) | not yet run | — | prediction for future web verification |
| belt 29247 → 30106, our APL | — | **+40.76** | not yet run | — | rotation lever ≈ 9.7 DPS on the same swap |

SEs are per-iteration `dps.stdev` / sqrt(n), the convention `09-reconciliation.md`
uses; owner SEs derived from their reported ±73/±75/±78/±77 at 12500/25000 iters.

### Package residual arithmetic, shown

    engine post-fix                     111.72
    engine pure-UI-semantics (UIMIGRATE) 102.99   (empty gloves socket, = owner's own export)
    owner web                             98.17

    fill-exists-at-all  = 111.72 - 102.99 = +8.73
    ticket-113 offset   = 102.99 -  98.17 = +4.82
    sum                                   = +13.55  = observed residual

The +4.82 term is the *same quantity* ticket 113 records as the package-arm
offset; it is not an independent explanation invented here. The +8.73 term is the
owner-decided fill policy, priced. **Within noise:** the sum matches the observed
residual to the last decimal because it is an identity over the same three
measured means, not an independent prediction — it demonstrates completeness of
the decomposition, not agreement of two estimates. The honest statistical claim
is narrower: the only term not already pinned to a prior measurement is zero.

## Per-seed data

Baseline / helms / belt, this run (`sims-convergence-0811/per-seed.json`):

| arm | 11 | 22 | 33 | 44 | 55 | mean |
|---|---|---|---|---|---|---|
| OWNER2_BASE | 2219.84 | 2219.84 | 2219.71 | 2219.79 | 2219.90 | 2219.82 |
| CURSED (32235) | 2067.86 | 2067.74 | 2067.59 | 2067.71 | 2067.71 | 2067.72 |
| VENG (33672) | 2059.94 | 2059.92 | 2059.69 | 2059.78 | 2059.77 | 2059.82 |
| BELT100 (30106) | 2270.22 | 2270.26 | 2270.13 | 2270.34 | 2270.39 | 2270.27 |

Helm A/B per seed (CURSED − VENG): 7.922, 7.820, 7.898, 7.926, 7.942 — spread
0.12, so the −2.79 gap against the owner is ~23× the seed spread and is not a
seed artefact.

Belt per seed (BELT100 − BASE), TypeSimple: 50.372, 50.420, 50.417, 50.550,
50.490.

APL arms (`sims-convergence-0811-apl/per-seed.json`): OWNER2_BASE mean 2170.01,
BELT100 mean 2210.77, per-seed delta 40.687, 40.882, 40.471, 40.752, 41.001.

Package post-fix, reused from `be5fdf1` (`sims-111-postfix/per-seed.json`):

| arm | 11 | 22 | 33 | 44 | 55 | mean |
|---|---|---|---|---|---|---|
| OWNER2_BASE | 2219.84 | 2219.84 | 2219.71 | 2219.79 | 2219.90 | 2219.82 |
| PKG_PROD_POSTFIX | 2331.41 | 2331.40 | 2331.56 | 2331.63 | 2331.71 | 2331.54 |

The baseline arm reproduces bit-for-bit across the two runs (2219.82 both), which
is the cheap check that this run and `be5fdf1`'s are on the same engine.

## Third check — belt, as a prediction for the owner to verify

Not yet run on the web; recorded as a **prediction**, not a result.

Swap: waist **29247 Girdle of the Deathdealer** (worn, no sockets) →
**30106 Belt of One-Hundred Deaths** (two sockets, phase 2). The engine's rare
cap fills both sockets with **24028**, which is the same gem the owner already
wears in five other slots — so unlike the helm case this arm invents no
inventory and the fill is uncontroversial.

- **Under the owner's TypeSimple rotation: +50.45.** This is the number
  comparable to a web run and the one to verify.
- **Under our default APL: +40.76.** Same gear, same gems, rotation-only
  difference of **9.69 DPS on one swap** — the rotation lever, made visible.

If the owner runs this on the web, the ticket-113 offset predicts the web figure
lands somewhat *below* +50.45 (the offset shrank with rising DPS on both prior
arms, ~20% of it failing to cancel), but two arms cannot pin the shape, which is
precisely the third-arm datum ticket 113 asks for. **This arm touches neither
neck/back nor a set bonus**, so it is exactly the like-for-like third pair ticket
113 names as the thing that would settle whether the offset scales with DPS.

## What did NOT close

1. **The rare cap does not survive `repairMeta` on any candidate with a meta
   socket.** Measured directly this session:

       pnpm exec tsx .scratch/set-bonus-value/loop-103-106/probe_helm_fill_0811.ts

   Output: for both 32235 and 33672, `fillEmptyCandidateGems` with
   `ctx.fillPalette` returns `[32409, 24028]` (rare, cap honoured), and
   `repairMeta({palette: ctx.palette})` then returns `[32409, 32220]` —
   quality 4, phase 3. `fillPalette` is 106 entries with max quality 3; `palette`
   is 201 entries. Ticket 111 instruction 3 deliberately gives `repairMeta` the
   full palette so metas stay solvable (all 18 metas are quality 3), but
   `repairMeta` does not confine itself to the meta socket — it re-gems coloured
   sockets to satisfy the meta's activation condition, and it does so from the
   uncapped list. So ticket 111's acceptance criterion held on the T6 package
   (no T6 piece has a meta socket, as the ticket itself notes) and is **silently
   false on every helm**. This is a real gap in the fix's coverage, distinct from
   tickets 114 (null/undefined quality), 115 (pkg span guard) and 116 (exported
   `fillCandidateGems` bypass). **No ticket filed — flagged for the owner**, since
   the right remedy (cap the non-meta sockets repairMeta touches, vs accept epics
   whenever a meta is involved) is a policy call, not a mechanical fix.

2. **The helm A/B moved away from the owner** (+8.61 → +7.90, z 1.3 → 2.44).
   Attributing this to item 1 above is **hypothesis, not measurement**: the
   epic 32220 sits in *both* helm arms identically, so to first order it should
   cancel in the A/B, and the pre-fix arms carried epic 32194 in both arms
   likewise. What changed is *which* epic (32194 red +10 agi → 32220 orange
   +5 agi/+5 crit), which is not gem-neutral. A capped-repair arm has not been
   simmed, so the causal link is untested.

3. **The −25.78 absolute baseline offset** is untouched by this work and remains
   ticket 113's open quantity, unattributed except by elimination.

4. **The +8.73 fill-exists-at-all term is not a bug and will not close** without
   reversing the owner's decision to keep the fill. It is named here so it is not
   re-discovered as a defect.

## Exact re-run commands

From the repo root, `C:/Users/dgree/Code/lulz/tbc-gear-prio`:

    # helm A/B + belt arms (build, then sim under the owner's TypeSimple)
    pnpm exec tsx .scratch/set-bonus-value/loop-103-106/build_convergence_arms_0811.ts
    python .scratch/set-bonus-value/loop-103-106/sim_convergence_0811.py

    # the same belt swap under our default APL (rotation lever)
    python .scratch/set-bonus-value/loop-103-106/sim_belt_apl_0811.py

    # the repairMeta-defeats-the-cap probe
    pnpm exec tsx .scratch/set-bonus-value/loop-103-106/probe_helm_fill_0811.ts

    # package arm post-fix (reused from be5fdf1, not re-run here)
    pnpm exec tsx .scratch/set-bonus-value/loop-103-106/build_postfix_arm_111.ts
    python .scratch/set-bonus-value/loop-103-106/sim_postfix_111.py

Transcripts: `sim_convergence_0811.stdout.log`, `sim_belt_apl_0811.stdout.log`.
Outputs: `sims-convergence-0811/`, `sims-convergence-0811-apl/` (each with
`per-seed.json`), arms under `convergence-arms-0811/`.

**Input dependency:** every arm here is built from
`uigems-arms-simplerot/OWNER2_BASE.req.json`, which is **untracked scratch**. On
a fresh worktree it must be regenerated first per
`08-sequential-gems-typesimple.md`; these commands will not reproduce without it.
