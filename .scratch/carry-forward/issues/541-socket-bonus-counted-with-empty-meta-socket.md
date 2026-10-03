Status: open
Type: defect
Origin: pre-merge review round 11 on feat/tab-signoff-followups, finding D3, 2026-10-03
Blocks: none
Blocked by: none
Related: 535

# The socket bonus counts as active when the meta socket is empty

## What was found

`socketBonusActive` in `packages/core/src/meta.ts` (lines 148-168) and its
verbatim port in the fork's
`ui/core/components/individual_sim_ui/upgrades/engine/meta.ts` (lines
53-74 at fork `3613d654f`) skip meta sockets and end with
`return sawColoured || !metaEmpty`. An item with an empty meta socket and
matching coloured sockets therefore gets its socket bonus.

The domain reviewer reports that the sim does not give it: the bonus needs
every socket to intersect (`sim/core/database.go:633-641` in the fork), an
empty gem has colour `GemColorUnknown = 0` (`proto/common.proto:405`), and
`ColorIntersects(Meta, Unknown)` is false (`database.go:766-775`).

Since ticket 535, `gearHitRating` and `layoutHitRating` (fork `caps.ts`,
`meta-repair.ts`) read this rule, so a head with an empty meta socket and a
hit socket bonus would count hit the sim does not give. The effect on any
ranking is not measured (hypothesis, untested); test 535-L0 matches the
sim's 52 gear hit on the ret-p3-p2 fixture, whose metas are filled.

## What would close this

1. Confirm the sim's rule with a Go or `computeStats` reading of one item
   with an empty meta socket and a socket bonus. Record the command.
2. If confirmed: return false when a meta socket is empty and the item has
   coloured sockets, in core and in the fork port (PROVENANCE cycle, see
   `docs/agents/known-traps.md` "Before editing a ported engine file"),
   with a test in each.
