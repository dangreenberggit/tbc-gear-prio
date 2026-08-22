# Q2 re-measure — three arms, rotation isolated

Ticket 250's pair (old 740.67 / new 722.55) recorded no literal invocation (C5).
This file is the invocation record its acceptance box asks for. Binary, digest and
regen commands: `../binary-provenance.md`. Every number below was produced by the
commands in this file and is re-runnable.

## Design

All three arms: pinned v0.0.119 binary, `simOptions.iterations = 20000`,
`randomSeed = "42"` (explicit overrides — tip ships 25000 / "443754031", C4).

| arm | rotation | consumables | what it prices |
| --- | --- | --- | --- |
| Arm 1 | tip (22 actions) | tip | current tip |
| Arm 2 | old (12 actions) | old | the whole `d41c46c^` package — what adoption actually did |
| Arm 3 | old (12 actions) | **tip** | **rotation main effect vs Arm 1 — single variable** |

Arm 3 is coherent because the rotation↔consumables coupling is one-directional
(C16), re-verified here rather than taken from the plan:

```
python -c "import json;t=json.load(open('data/presets/feral/p2.raid-sim-skeleton.json'));o=json.load(open('.scratch/stage-gate/stage-2-close-shortlist-box/q2-remeasure/old-skeleton.json'));import json as j;[print(n,{k:j.dumps(p['raid']['parties'][0]['players'][0]['rotation']).count(k) for k in ('selectedPotion','selectedConjured','22788','31677','22832')}) for n,p in (('TIP',t),('OLD',o))]"
# TIP {'selectedPotion': 2, 'selectedConjured': 2, '22788': 2, '31677': 1, '22832': 1}
# OLD {'selectedPotion': 0, 'selectedConjured': 0, '22788': 0, '31677': 0, '22832': 0}
```

The old rotation references none of the coupled ids, so it cannot be disarmed by
consumables it never mentions. With `rotation` and `consumables` both removed the
two whole requests are byte-identical (`whole-request identical without those two: True`),
so nothing else moves between the arms.

Splice proof — Arm 3 is Arm 1 with only the rotation subtree replaced:

```
python -c "import json,copy;a=json.load(open('.scratch/stage-gate/stage-2-close-shortlist-box/q2-remeasure/arm1-tip.request.json'));b=json.load(open('.scratch/stage-gate/stage-2-close-shortlist-box/q2-remeasure/arm3-oldrot-tipcons.request.json'));[x['raid']['parties'][0]['players'][0].pop('rotation') for x in (a,b)];print(json.dumps(a,sort_keys=True)==json.dumps(b,sort_keys=True))"
# True
```

Per C18, `pnpm verify` / `feral-skeleton-apl:check` is **not** cited as splice-consistency
evidence — it validates APL field names against the pinned proto, not rotation↔consumables
preconditions. The token check above is the evidence.

## Invocations

```
cd C:/Users/dgree/Code/lulz/tbc-gear-prio
B=vendor/wowsimcli-v0.0.119-win32-x64/wowsimcli-windows.exe
D=.scratch/stage-gate/stage-2-close-shortlist-box/q2-remeasure
./$B sim --infile $D/arm1-tip.request.json               --outfile $D/arm1-tip.result.json
./$B sim --infile $D/arm2-old-package.request.json       --outfile $D/arm2-old-package.result.json
./$B sim --infile $D/arm3-oldrot-tipcons.request.json    --outfile $D/arm3-oldrot-tipcons.result.json
```

Wall time 1–3 s per arm (20 concurrent sims, 20000 iterations).

## Results

| arm | DPS avg | per-iteration stdev | SEM (stdev/√20000) |
| --- | --- | --- | --- |
| Arm 1 — tip | **782.14** | 32.229 | 0.2279 |
| Arm 2 — old package | **740.67** | 70.295 | 0.4971 |
| Arm 3 — old rotation + tip consumables | **739.23** | 91.860 | 0.6495 |

### Noise bound

Pre-registered as 2× the combined standard error of the two compared arms (Step 2d).
The result JSON reports a per-iteration `stdev`, not an SE, so SEM is derived as
`stdev/√iterations` — recorded here as the plan's Step 2d requires the basis to be stated.

| contrast | Δ DPS | combined SEM | bound (2×) | material? |
| --- | --- | --- | --- | --- |
| **Arm 3 − Arm 1 (rotation main effect)** | **−42.91** | 0.688 | 1.377 | **yes — 62.3 σ** |
| Arm 2 − Arm 1 (whole package) | −41.47 | 0.547 | 1.094 | yes |
| Arm 3 − Arm 2 (consumables, rotation held at old) | −1.44 | 0.818 | 1.636 | **no** |

### Which decision branch fired

Step 2e's second branch — "Arm 3 materially above Arm 1" — **did not** fire, and
neither did the first. The measured effect is material but **negative**: the old
rotation is 42.91 DPS *worse* than tip's, not better. Ticket 250's premise (a
regression introduced by the new rotation) is **contradicted in sign** on the
current pin. The plan pre-registered no branch for this outcome; see the ledger.

Attribution is clean and does not need the hypothesised split:
- Rotation explains −42.91 of the −41.47 package effect.
- Consumables contribute −1.44, inside the noise bound.

Arm 2 reproduces ticket 250's old figure to the cent: **740.67**, the exact number
in the ticket. That the old package re-measures identically on the v0.0.119 binary
means the old half of the pair is reproducible and the pair's *new* half (722.55)
is the stale number — tip now measures 782.14.

### Fourth arm — skipped

Step 2e permits a fourth arm (tip rotation + old consumables) only if the rotation
effect is material *and* seat 2 needs the disarming mechanism priced. It is skipped:
the Arm 3 − Arm 2 contrast already prices consumables at −1.44 DPS with the rotation
held constant, which answers the same question without the reverse splice the plan
warns silently disarms branches (C16, Out of scope).

## Cast counts (supporting evidence only — R3)

Arm 3 is **not** starved: it consumes tip's arrays — id `22832` fires 37,527 casts,
`12662` fires 35,583. So the 42.91 DPS gap is the rotation's own doing, measured with
consumables available to it. This is what makes the attribution safe; per R3 the cast
counts are corroboration, and Arm 3 vs Arm 1 remains the instrument.

Separate observation, about tip's skeleton rather than about ticket 250: at Arm 1
(tip) the two branches `scripts/build_feral_skeleton.py:92-97` names — Dark Rune
`22788` and Flame Cap `31677` — cast **zero** times despite both being present in
tip's `conjuredItems` / `potions`. `22105` is also zero. Selected pot `22832` (38,864)
and conjured `12662` (40,000) fire normally, so the arrays are wired up; these three
specific branches never win their priority slot. Not load-bearing for Q2 — it would,
if anything, mean tip's 782.14 understates tip — but it is unexplained and goes to
seat 2 and to a carry-forward ticket.
