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

## Second data set: ret-p3 (2026-08-11, ret catch-up round) — blast radius includes T6; bypass latent on this artifact

Sources: `.scratch/set-bonus-value/ret-catchup/01-survey.md` §5 (universe/db
join) and `03-verify.md` task 5 (fill replay). Artifact re-run:
`pnpm rank --offline --region US --realm dreamscythe --character slamaltman --spec ret --max-phase 3 --with-set-potential --show-below-cutoff --report`.

- **13 meta-socket candidates in the ret-p3 universe, all head slot**,
  including **30989 Lightbringer War-Helm (T6)** — so this ticket's "no T6
  piece has a meta socket" escape does **NOT** hold on ret: the ret tier
  package itself contains a meta-socket piece, inside the LB 4pc package.
  Full 13-row table in 01-survey.md §5.
- **But on THIS artifact the bypass is latent: 0 of 13 heads show epic
  fills.** Slamaltman's worn head (32461 Furious Gizmatic Goggles) is fully
  gemmed [32409 meta, 24054]; `migrateGemsToItem` carries both gems onto
  every candidate (all 13 heads have exactly 2 sockets), so
  `fillEmptyCandidateGems` finds no empty socket and `repairMeta` no-ops
  (baseline `metaAdjusted: false`). Verified by replaying the exact swap
  path (`equipmentForCandidateSwap` + `gemsForPhase(3)`) on all 13 heads —
  per-head table in 03-verify.md task 5.
- **Any barer worn head re-exposes all 13**: the defect needs an empty
  coloured socket or an unsatisfied meta condition; a character whose worn
  head has fewer gems (or no head sockets, like feral's Wolfshead) puts
  every one of these rows, T6 included, back in the blast radius. Record
  only; the policy decision above is unchanged.
