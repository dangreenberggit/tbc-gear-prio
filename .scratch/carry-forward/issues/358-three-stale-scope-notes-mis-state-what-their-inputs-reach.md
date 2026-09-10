Status: open
Type: defect
Origin: docs/reviews/feat-wowsims-reforge-catchup.md (Domain axis, D1-D3)
Blocks: none
Blocked by: none

# Three stale notes mis-state what their own inputs reach

Relates to: tickets 250, 353; ADR-0030; branch `feat/wowsims-reforge-catchup`

Three independent documentation defects, each found by the SME seat on ticket
353 and confirmed by the Domain axis at tip `9570b87`. None changes a number
today. All three share one failure shape: a note that **understates the reach of
a stale or superseded input**, which is what makes the next reader dismiss a real
exposure.

## 1. Ticket 353 §4 revives a figure that was superseded and reversed in sign

`.scratch/carry-forward/issues/353-re-baseline-committed-sim-numbers-on-engine-ec5c5f2.md:68`
says the prior pin review "recorded a **-18 DPS feral rotation regression** ...
with no domain look", and that whether the feral numbers are right "is an SME
question that nobody has answered".

Both halves are false against the repo:

- `docs/verification-log.md:1654-1669` ("Ticket 250, re-measured and closed")
  records a three-arm, 20000-iteration, seed-42 experiment on the pinned binary.
  The rotation main effect is **-42.91 DPS in favour of the new rotation** —
  opposite in sign to -18 — against a pre-registered 2x-combined-SEM bound of
  1.38.
- `.scratch/carry-forward/issues/250-feral-rotation-regression-unreviewed.md` is
  `Status: closed`, and its own line 23 already flags the -18 sentence as wrong.

This is the figure's third propagation. Left alone it becomes folklore.

The same section's "15 -> 27 above-cutoff rows" pair should be labelled what it
is: two uncontrolled measurements taken at different pins, baselines and pool
sizes — not a regression. The re-record on this branch did not reproduce it
(feral-p3 sits at 43 both before and after).

## 2. The feral P1 EP-weights scope note is false

`data/presets/feral/p1.ep-weights.json`, `notes[1]`, claims EP "only chooses
gems here" and that "a phase-1 gem preference does not rank items".

`packages/core/src/candidate-order.ts:36-67` orders the whole eligible pool by
EP, and `rank.ts:1100` caps that order. So on a **capped** run, stale P1 EP
weights decide which candidates are never simmed at all — a P3 item can be
dropped before measurement, invisibly.

Both defaults are safe (the CLI never caps; the tab defaults to no cap), so this
is a disclosure defect rather than a wrong number. But the note as written tells
a reader the input cannot reach the ranking, and it can.

## 3. `build_feral_skeleton.py` documents a rotation source it does not use

`scripts/build_feral_skeleton.py:19` documents the rotation as "merged from the
pinned vendor/wowsims/feral_default.apl.json". Line 64 reads the owner's own
export instead.

This matters more since ADR-0030: `feral_default.apl.json`'s sha **did** move in
this pin (upstream rewrote the feral APL, 104 lines). Line 19 is exactly the
sentence that would make a reader conclude that rewrite reaches this repo's
numbers. It does not.

## Suggested fix

1. Correct 353 §4 in place — strike the -18 figure, cite
   `docs/verification-log.md:1654-1669` and closed ticket 250, and relabel the
   above-cutoff pair as uncontrolled. Correcting in place matters here: the
   ticket already carries its corrections in an appended "What was done"
   section, so a reader hitting §4 first still meets the wrong number.
2. Rewrite the `p1.ep-weights.json` note to say what EP actually gates: gem
   choice, **and** candidate order, which on a capped run decides what is never
   simmed.
3. Fix `build_feral_skeleton.py:19` to name the owner's export, matching line 64.

## Acceptance

- [ ] 353 §4 no longer states the -18 figure or the "nobody has answered" claim,
      and cites the measurement that superseded them.
- [ ] The `p1.ep-weights.json` note names candidate order as well as gems.
- [ ] `build_feral_skeleton.py:19` matches line 64.
