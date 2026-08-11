Status: open
Type: design (owner decision required)
Origin: ret catch-up round, 2026-08-11
(`.scratch/set-bonus-value/ret-catchup/04-surfaces.md` check 2, finding 1)

# Package display mode is a no-op when every attached package is negative

On the first ret setContext artifact (re-run:
`pnpm rank --offline --region US --realm dreamscythe --character slamaltman --spec ret --max-phase 3 --with-set-potential --show-below-cutoff --report`),
Package mode changes nothing: `data-package === data-delta` on all 393 rows
and 44 chips, zero `.pkg` spans, zero package-only chips, zero `package-line`
row annotations. The radio still renders, and its long note still sells the
mode ("whether starting the set is worth it") — the control advertises an
answer the report cannot give.

Root cause (04-surfaces.md check 2, verified live in the browser plus a
static sort simulation): `rank.ts:1227` attaches each member row's package as
the **largest measured threshold's** ("Largest threshold first"), and every
ret 4pc package is negative (Lightbringer −6.83, Crystalforge −26.77,
Justicar −80.56). `packageSetPotentialDps` credits only positive packages, so
no row carries one. Meanwhile the one positive package on the whole report —
Lightbringer **2pc** at **+11.31** (add Breastplate + Greaves) — attaches to
no row, because its two members are claimed by the negative 4pc package
first. It is visible only in the Set potential panel.

This is ticket 91's intent inverted. 91's largest-threshold-wins rule made
the 4pc reachable when the 2pc was implemented; here it makes a positive 2pc
package unreachable by every row-level surface whenever the 4pc measures
negative. Feral never hit this (its 4pc packages were positive).

## Related surface symptom, same "all packages negative" case

The sole ticket-96 curated-package pointer on this report sits on worn
Crystalforge Breastplate (30129, 0.00 self-swap, below cutoff because the
swap is a no-op) and reads "BiS as part of Crystalforge Battlegear, not as
this swap alone — see Set potential" — but the panel entries it points at are
**negative** (−0.47 / −26.77). Internally consistent (p2-degraded BiS tag,
p3 pool), rhetorically backwards: the pointer implies the package redeems the
row and the destination contradicts it. Folded here rather than filed
separately because both defects need the same design decision — what row-level
surfaces should say when a set has no positive package.

## Design options (owner's call, do not implement without it)

1. **Attach the best positive reachable package** instead of
   largest-threshold-first: a row carrying LB pieces would get the 2pc's
   +11.31, and Package mode would re-sort. Keeps 91's disclosure of the 4pc
   in the panel. Needs a rule for rows that are members of both.
2. **Hide the package-mode control when no row would move** (all attached
   packages non-positive), so the reader is not offered a dead toggle. Panel
   stays; nothing else changes.
3. Both: 1 for attachment, plus a softened/suppressed ticket-96 pointer when
   every package for that set is negative.

## Acceptance criteria

- [ ] On the ret artifact above, either a row carries the +11.31 LB 2pc
      package (option 1/3) or the Package radio does not render (option 2).
- [ ] The ticket-96 pointer no longer sends a reader to a destination that
      contradicts its framing on the all-negative-packages case.
- [ ] The feral artifact's package-mode behaviour (positive 4pc packages,
      ticket 112 chip contract) is unchanged, pinned by test.
- [ ] `pnpm verify` green.
