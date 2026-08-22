Status: wontfix
Type: investigation (an unexplained number in an otherwise coherent cast table)
Origin: pre-merge domain axis on feat/stage-2-close-shortlist-box, 2026-08-21
Blocks: none
Blocked by: none

# A 20% swing in powershifts moves white-melee casts by 0.0016%

## Shelved 2026-08-21 — owner decision: upstream, not ours

The owner's rule was to shelve this unless it is a bug in **our** code rather
than wowsims. Measured, not assumed:

```
grep -rli 'powershift' packages/core/src/            # 0 files
grep -rlin 'swingtimer|autoattack|white.melee' packages/core/src/   # only proto/apl_pb.ts (generated)
grep -rli 'powershift' vendor/tbc-new-fork/sim/      # sim/druid/feralcat/rotation.go
```

Powershift and swing-timer behaviour live entirely in the upstream sim. This
repo composes `RaidSimRequest`s and reads `RaidSimResult`s; it models no combat.
Whatever explains the flat white-melee count, we cannot cause it and cannot fix
it here.

**Kept open as a note rather than deleted**, because it is still the one number
in that cast table with no feral explanation, and it would matter if the arms
are ever re-run with real gear (ticket 250's scope note) or if a future upstream
bump changes powershift handling. If it ever needs answering, it is an upstream
question for wowsims, not a work item here.

## The finding

In the ticket-250 three-arm measurement, white-melee casts are effectively
identical across arms while powershifts differ substantially:

| arm | powershifts / iter | white melee casts |
| --- | --- | --- |
| Arm 1 (tip rotation) | 46.83 | 3,916,861 |
| Arm 3 (old rotation) | 39.12 | 3,916,799 |

That is a ~20% difference in shift count producing a 0.0016% difference in white
attacks.

In TBC, shifting out of cat form and back should cost swing time — the swing
timer resets on form change. A rotation that shifts 7.7 more times per iteration
would be expected to lose white attacks for it.

## Why this is worth a ticket rather than a shrug

Every other number in that cast table has a coherent feral explanation, and the
branch presented the table as fully explained on that basis. This is the one
value that does not fit, and nothing in the branch noticed it. An unexplained
number inside an otherwise-verified table is the shape of a finding that turns
out to matter later.

It does **not** invalidate the ticket-250 conclusion: the rotation contrast and
its sign hold regardless, and both arms are affected equally if this is a
modelling choice.

## Candidate explanations, none tested

- The sim models the powershift as instant and off the swing timer — a real
  upstream modelling choice, and worth knowing about if so, since it would make
  every powershift-heavy rotation look better in this engine than in the game.
- White melee is being counted per-swing-opportunity rather than per-landed
  swing, so shift downtime does not subtract.
- Both arms are so far from the swing-timer bound (unequipped druid, see ticket
  250's scope note) that the effect is masked. **This one is cheap to test** —
  re-run the arms with real gear.

All three are **hypotheses, untested**.

## Acceptance

- [ ] Determine which explanation holds, by reading the vendored powershift
      implementation or by a targeted sim.
- [ ] If it is an upstream modelling choice, record it where the feral skeleton
      work will see it — it changes how much to trust powershift-heavy APLs.
