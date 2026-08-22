Status: closed
Type: task (domain review of an adopted upstream change)
Origin: feat/engine-pin-backend-reforge review, 2026-08-21
Blocks: none
Blocked by: none

# Upstream's new feral rotation costs ~18 DPS and nobody with feral judgment has looked

## What happened

`feature/backend-reforge` ships a rewritten feral cat rotation — 22 actions
where v0.0.101 had 12. Per the owner's rule (a changed upstream rotation is the
one we take), it was adopted in `d41c46c` and every fixture re-recorded.

Measured on the same binary (`cbf6b75`), 20k iterations, seed 42, committed
skeleton gear:

| skeleton | DPS |
| --- | --- |
| old 12-action | 740.67 |
| **new 22-action** | **722.55** |

So their rewrite looked **~18 DPS worse** on our gear. **This sentence is wrong
and is corrected below (2026-08-21) — the new rotation measures 42.91 DPS
_better_ once the rotation is isolated. It is left in place because it has been
quoted elsewhere; read the closing section before citing it.** It also moved the ranking
more than the DPS: feral's above-cutoff set went 15 → 27 rows and feral-p3's
36 → 55, meaning which items read as upgrades changed.

## Why this needs a domain eye

A rotation rewrite from the people who maintain the sim would normally be
expected to help, not cost 18 DPS. Several explanations are possible and this
ticket does not choose between them:

- Their rotation is tuned for different gear or a different phase than our
  committed skeleton, and is correct on its own terms.
- It depends on APL values or settings our skeleton does not supply, so parts of
  it never fire.
- It is genuinely a work-in-progress on an unmerged branch (PR #385 is open and
  conflicted) and not intended as final.
- Our skeleton's non-rotation settings no longer pair well with it.

**Do not assume the first one.** The whole reason this repo has a schema gate is
that a rotation can run and produce a plausible number while silently doing
something other than what it says.

## Suggested first checks

- Does the new rotation reference anything our skeleton leaves unset (consumes,
  talents, prepull)? `scripts/apl_schema.py` reports unknown *fields*, not
  unmet *preconditions*.
- Compare against the rotation shipped at `v0.0.119`, which is the version the
  live site runs — if it differs from `backend-reforge`'s, the branch's rotation
  may simply be mid-rework.
- Use the `sme-rank-review` skill on the new above-cutoff set. The ranking moved
  more than the DPS did, so the rank output is the sharper signal.

## Acceptance

- [x] A domain verdict recorded: the regression is expected, or it is a
      mismatch, with the reasoning. → **Absent and reversed on the current pin.**
- [x] If a mismatch: what specifically is unmet, and whether the skeleton or the
      rotation should change. → **Nothing is unmet; neither should change.**
- [x] The 740.67 / 722.55 pair kept or superseded with a corrected measurement.
      → **Superseded by the Arm 1 / Arm 3 pair, with literal invocations.**

## Closed 2026-08-21 — re-measured with the rotation isolated

Verdict `trust-with-caveats` from a `gate-sme` seat on the re-measurement:
`.scratch/handoffs/sme-rank-judgment-stage2-close-ticket-250.md`. Full method,
literal invocations and re-runnable checks:
`.scratch/stage-gate/stage-2-close-shortlist-box/q2-remeasure/commands.md`.
Binary digest and regen commands: `../../stage-gate/stage-2-close-shortlist-box/binary-provenance.md`.

Three arms on the pinned v0.0.119 binary, 20000 iterations, seed 42:

| arm | rotation | consumables | DPS |
| --- | --- | --- | --- |
| Arm 1 | tip (22 actions) | tip | **782.14** |
| Arm 2 | old (12 actions) | old | 740.67 |
| Arm 3 | old (12 actions) | **tip** | 739.23 |

**Rotation main effect = Arm 3 − Arm 1 = −42.91 DPS (on the unequipped
skeleton — see the scope note below)** against a
pre-registered bound of 2× combined SEM (1.38). The new rotation is *better* by
42.91 DPS; the ticket's premise is contradicted in sign. Holding the rotation at
old, consumables move −1.44 DPS — inside the bound — so the rotation explains
essentially the whole package effect.

### Scope: the arms ran an unequipped druid

Added 2026-08-21 after the pre-merge domain axis. All three arms carry 17
equipment slots with no item id:

```
python -c "import json;eq=json.load(open('.scratch/stage-gate/stage-2-close-shortlist-box/q2-remeasure/arm1-tip.request.json'))['raid']['parties'][0]['players'][0]['equipment']['items'];print(len([i for i in eq if i.get('id')]),'of',len(eq))"
```

→ `0 of 17`. This is why the arms read 740-782 DPS against real baselines of
2266.9 (shredzepelin) and 2302.5 (nexess).

**What still holds:** the comparison. Every arm is equally unequipped, the only
moved variable is the rotation, and the sign of the effect is unambiguous — the
adopted rotation is better, and the ticket's original premise is contradicted.

**What does not:** the magnitude as a statement about play. Powershift value in
TBC scales with attack power, and with the Wolfshead Helm interaction the new
APL names in its own variables — shredzepelin wears Wolfshead. A geared re-run
would give a different number. Nobody should quote −42.91 as the gain a geared
feral sees.

**Untested:** whether the sign survives on geared characters. Hypothesis — it
does, since the mechanism is a working powershift engine rather than a
gear-specific interaction — but this was not measured.

Arm 3 is a clean single-variable comparison because the rotation↔consumables
coupling is one-directional: the old rotation references none of
`selectedPotion`, `selectedConjured`, `22788`, `31677`, `22832`, and with
`rotation` and `consumables` both removed the two requests are byte-identical.

**Arm 2 reproduces this ticket's 740.67 to the cent.** So the old half of the
pair is reproducible on the current binary and **722.55 is the stale number** —
which is the failure this ticket suspected of itself.

### Why the sign flip is believed rather than assumed

Two independent lines agree with the mean, both read from the committed result
JSONs by the SME seat:

- **Cast-count shape.** Arm 1 vs Arm 3 per iteration: powershifts 39.1 → 46.8,
  Shred 47.6 → 50.8, Ferocious Bite 3.9 → 5.8, Mangle 14.5 → 17.5, with Rip flat
  at 10.3 → 10.1. More shifts feeding Shred and Bite while Rip stays a
  maintenance debuff is the correct shape; a gain driven by over-Ripping would
  have been the artifact tell.
- **Variance.** Per-iteration stdev 32.23 (tip) vs 91.86 (old rotation). The old
  list is ~3× noisier, which is what an energy-starving feral APL looks like.
  This is a separate statistic from the mean and makes −42.91 conservative.

Recalled/unverified (not load-bearing — the verdict rests on the measured counts
and spread): Furor energy-on-shift, Wolfshead, and Tiger's Fury being a TBC DPS
loss.

### The zero-cast branches are correct, not a bug

At tip, Dark Rune `22788`, Flame Cap `31677` and `22105` cast zero times despite
appearing in tip's `conjuredItems`/`potions`. This is right: those arrays are the
*available* menu and `conjuredId`/`potId` are the single *pick* (tip picks 12662
and 22832, which fire 40,000 and 38,864 times). `22788`'s branch is guarded by
`selectedConjured == 22788`; `31677` appears only inside a `not
selectedPotion(31677)` threshold guard and is not castable; `22105` has zero
rotation references. `build_feral_skeleton.py:92-97` warns about *dropping* the
arrays, which disarms the item you did pick — a different failure. Ticket 255
asks for that comment to state the distinction.

### Scope of the claim

One gear set at one phase on our pinned binary — the right question for this
repo, not a general claim about upstream's rotation. Adoption in `d41c46c` was
right on the merits, not only on the take-upstream rule.

The above-cutoff movement this ticket cites (15 → 27 at p2, 36 → 55 at p3) does
not bear on the rotation question: above-cutoff membership is measured against
the character's own baseline, and the baseline rose (2145.6 → 2266.9 / 2302.5),
so fewer marginal sidegrades clear the bar. Live at the 2026-08-21 tip the feral
p2 counts are 14 (shredzepelin) and 12 (nexess).
