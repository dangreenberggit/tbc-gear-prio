Status: closed
Resolved: fork 4a76e06 + repo 7c10366 (core+tests) + 5bce509 (re-pin), 2026-08-29.
The flat SET_BONUS_NOISE_FLOOR_DPS = 10 is replaced by a per-spec derivation
setBonusNoiseFloorDps(cutoff) = √2 × cutoff.absDps (≈4.81 ret / ≈5.09 feral),
reusing the existing total CUTOFF_BY_SPEC so all 11 specs get a value. Both the
ranking gate (rankableSetPotential, view.ts) and the fork-tab display gate obtain
the floor from the SAME frozen per-spec Cutoff carried on the Ranking — the
display gate threads it from the done-narrowing point (renderSubTabs) as a
parameter, never a live picker lookup and never a state field the mid-run
skeleton lacks — so the 331 "layers can never disagree" invariant survives in
per-spec form (adversarial plan review caught and blocked two would-be crashes en
route: a stale-spec divergence and a skeleton null-deref, both fixed pre-code).
Ported drift cycle completed for cutoff.ts + view.ts (engine-port-drift green,
comment-only twin differences); 333's near-boundary tests updated to the per-spec
boundary (expressed as Math.SQRT2 × absDps so a derivation mutation reds a test);
ranking-identity demonstration shows 0 of 13 committed prospectiveBonusDps values
change tier; effects diff stamp-only; pnpm verify green. Stage-gate artifacts:
.scratch/stage-gate/ticket-332-per-spec-ranking-floor/.
Type: enhancement
Origin: round-6 pre-merge review (domain axis), 2026-08-29; feat/upgrades-dedup-wowsims
Blocks: none
Blocked by: none

# The set-potential ranking floor (flat 10 DPS) could zero a real 10-15 DPS bonus

Ticket 331 landed a single shared `SET_BONUS_NOISE_FLOOR_DPS = 10`
(`packages/core/src/cutoff.ts`) that gates `rankableSetPotential`
(`packages/core/src/view.ts`) so a sub-floor prospective set bonus contributes
nothing to the sort key or cutoff. The value 10 was chosen as a conservative
~4-SE display floor (round 5, ticket 315) and reused for the ranking role.

## The concern (domain axis, round 6)

The domain review re-derived the noise: a prospective bonus folds two measured
deltas, so its SE ≈ √2 × 1.678 ≈ 2.373, and a strict 2×SE bar is ≈4.75 (ret) /
5.02 (feral). So 10 is ≈4×SE — conservative. For a **display** floor a
false-negative is only invisible-vs-shown; for a **ranking** floor a
false-negative is a **genuinely missed upgrade** — a higher-stakes role for the
same number.

A real set bonus is quantized (a discrete Blizzard proc/stat effect), so a true
10-15 DPS 4pc is physically possible on a spec not yet measured. If one exists,
the flat-10 ranking floor would zero it out of the sort/cutoff.

## Why it is not a blocker (why this is a follow-up, not a fix-now)

Every committed `prospectiveBonusDps` across `.scratch/rank-reports/` and
`.scratch/set-bonus-value/` is either sub-floor noise (−4.10, −3.88, +0.31,
+0.545) or far above (17.14, 18.04, 20.29, 32.26, 43.09, 114, 119, 185). The
`(0.545, 17.14]` band is **empty in all observed data** — nothing currently
lands in 10-15. The false-negative window is unoccupied; the false-positive the
floor prevents (a −4.1 or +0.5 silently moving the sort key) is real and
observed. (Re-run: `grep -rhoE '"prospectiveBonusDps": *[-0-9.]+' .scratch/rank-reports .scratch/set-bonus-value`.)

## What a fix would do

Replace the flat 10 with a per-spec, noise-derived ranking floor — the same
shape `cutoff.ts` already carries for the single-item cutoff (ret 3.4, feral
3.6), scaled by √2 for the two-delta fold (≈4.75 ret / 5.02 feral), rather than
the round-number-high 10. `cutoff.ts:32-33` already names this as the documented
follow-up. Keep the display floor's own value (or reconcile both) as a separate
decision. Confirm against any newly-measured spec whether a real bonus now lands
in the previously-empty band before changing the value.
