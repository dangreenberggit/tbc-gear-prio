Status: open
Type: bug (policy decision required)
Origin: convergence check, 2026-08-11
(`.scratch/set-bonus-value/loop-103-106/convergence-check-2026-08-11.md`)
Blocks: none
Blocked by: none

# repairMeta bypasses the rare cap on coloured sockets

Ticket 111 capped `fillEmptyCandidateGems` at rare quality, and deliberately
left `repairMeta` on the full palette so meta gems stay solvable (111's
instruction 3 — metas must never become unfillable). The convergence check
measured a hole in that split: `repairMeta` does not confine itself to the
meta socket. To satisfy the meta's colour condition it re-gems COLOURED
sockets too, choosing from the uncapped list.

Measured, not inferred (`.scratch/set-bonus-value/loop-103-106/probe_helm_fill_0811.ts`):
on both helms (Cursed Vision 32235, Vengeful 33672) the fill correctly
returns `[32409, 24028]` — cap honoured — and `repairMeta` then overwrites
the coloured socket with **32220 Glinting Pyrestone, quality 4 (epic),
phase 3**.

Consequence: ticket 111's acceptance criterion passed on the T6 package only
because no T6 piece has a meta socket (the ticket says so itself). On every
candidate WITH a meta socket, the rare cap is silently void. Distinct from
tickets 114/115/116.

## Possibly related, hypothesis/untested

The helm A/B moved +8.61 → +7.90 (vs owner web +10.69, z 2.44) after the
cap landed. The epic sits in both arms so it should largely cancel; what
changed is WHICH epic (32194 red +10agi → 32220 orange +5/+5), which is not
gem-neutral. A capped-repair arm has not been simmed — do that before
attributing the regression to this defect.

## The policy decision (owner's call, do not implement without it)

1. **Cap the coloured sockets repairMeta touches** at the same rare limit,
   leaving only the meta socket itself on the full palette. Consistent with
   the two-step model; metas stay solvable; colour-condition satisfaction
   may occasionally need more re-gemming from the smaller list (verify it
   still always solves).
2. **Accept epics whenever a meta is involved** — document the exception in
   `GEM_POLICY_QUALIFIER`'s model text instead of changing code.

Option 1 matches the owner's stated principle (user must know which gems
are used, consistently; auto-fill assumes rare availability). Whichever way
it goes, add a test that pins repairMeta's coloured-socket choices to the
chosen policy, and re-run the helm A/B to re-measure against the owner's
+10.69.
