Status: resolved
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

- [x] On the ret artifact above, either a row carries the +11.31 LB 2pc
      package (option 1/3) or the Package radio does not render (option 2).
- [x] The ticket-96 pointer no longer sends a reader to a destination that
      contradicts its framing on the all-negative-packages case.
- [x] The feral artifact's package-mode behaviour (positive 4pc packages,
      ticket 112 chip contract) is unchanged, pinned by test.
- [x] `pnpm verify` green.

## The owner's decision (2026-08-11)

Both options above were rejected — neither "pick the one goal worth talking
about" nor "hide the switch". In the owner's words: this is a shopping list
with an order; we want an option for set bonus to affect that order
intelligently; we sim things and present data. Concretely:

1. Carry EVERY measured threshold's package value as data on member rows —
   2pc worth X AND 4pc worth Y, separately.
2. Display them as separate numbers, in the row detail line and in the chips'
   package marker.
3. Package mode sorts by the BEST of the measured package values for that
   row's set — plain arithmetic over simmed data, not editorial judgment.
4. Do not hide the control. Do not add advisory prose. The default
   (non-package) view is unchanged.
5. The "BiS as part of ... see Set potential" pointer must stop sending a
   reader to a destination that contradicts its framing; with per-threshold
   numbers shown, the numbers themselves are the data.

## Resolution (commit ee2a4e4 and the docs commit after it)

- `setContext.package` (single, largest threshold) became
  `setContext.packages` (every measured threshold, smallest first) —
  `memberPackages` in `packages/core/src/rank.ts`, exported and tested
  directly against both committed report artifacts.
- Row detail line now reads e.g. "this swap alone: −0.55 — 2pc package +11.31
  (2 pieces) / 4pc package −6.83 (4 pieces) — each figure is that whole
  package of Lightbringer Battlegear pieces vs current gear (…)". Chip marker
  reads "pkg 2pc +11.31 / 4pc −6.83". Negative figures render as data; only
  the sort ignores non-positive ones.
- `packageSetPotentialDps` takes the best measured figure when positive
  (Lightbringer rows now sort by +11.31), else the row's own delta (Justicar
  rows do not move — all its measured packages are negative).
- The ticket-96 pointer states the figures itself: "BiS as part of
  Crystalforge Battlegear, not as this swap alone — its measured packages:
  2pc −0.47 / 4pc −26.77 DPS vs current gear (see Set potential)". Data, no
  advice.
- Feral behaviour pinned by `packages/core/test/rank-package-artifacts.test.ts`:
  Thunderheart members still sort as one positive block (now on the 2pc's
  +74.11, the set's best measured figure; both figures show on the row),
  Malorne's single-threshold case is unchanged, Nordrassil still moves no row.
- Docs: dated amendment in ADR-0024 (2026-08-11) and in spec.md §4.1 (§2.1
  and the ADR-0020 discussion got pointer notes).
- The committed artifacts predate the shape change and still carry the old
  single-package `setContext`; the re-run command at the top of this ticket
  regenerates them. The tests replay the new attachment over the artifacts'
  `setBonuses`, which did not change.
