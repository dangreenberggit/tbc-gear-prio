Status: open
Type: gate gap
Origin: standards axis, pre-merge review of `feat/sweep-ret-tickets`, 2026-08-14
(`docs/reviews/feat-sweep-ret-tickets.md`, finding S1's tail)
Blocks: none
Blocked by: none

# Nothing checks that a committed universe matches its generator

`pnpm verify` has 18 steps and **not one of them regenerates
`data/universes/**` and byte-compares it against the committed artifact**. So a
change to `scripts/assemble_universe.py` that silently alters a universe it was
not thinking about produces a green verify and a stale committed file.

This is not hypothetical. It has now happened twice in three weeks, both times
found by a human reading a diff rather than by a gate:

- Ticket 154: `02f2f85` vendored feral p3 gear sets and predicted `feral-p2.json`
  would stay byte-identical. True for the phase-scoped `bisTags`/`bisSets`,
  false for the deliberately unscoped `curatedSets`. Stale from 2026-08-10.
- This branch: `c718d38` (ticket 157) added an ungated `TICKET_157_FORCE_INCLUDE`
  and re-checked only the four ret universes, putting `feral-p2`/`feral-p3` out
  of step with the generator two commits after ticket 154 had just fixed exactly
  that. Fixed at `b2da640`.

Ticket 154 exists *because* of this class of drift. Its own fix could not
prevent the recurrence, because the missing thing is a gate, not a regen.

## Reproduce the gap

```bash
python scripts/assemble_universe.py --spec feral --max-phase 2 \
  --out data/universes/feral-p2.json --report data/universes/feral-p2.report.json
git diff --numstat -- data/universes/
```

Today that is empty. Introduce any membership- or field-affecting change to the
assembler, run `pnpm verify`, and it stays green while the diff above becomes
non-empty.

## Done when

`pnpm verify` regenerates every committed universe from committed sources and
fails on any difference — the same shape as the existing
`atlasloot:regen:check` and `codegen:json-types:check` steps, which already
enforce this contract for their own artifacts.

Two things to get right:

- **Line endings.** The assembler's output is CRLF on Windows and LF as
  committed, so a naive `cmp` reports drift on every Windows run. Compare
  parsed JSON, or normalize newlines before hashing. Ticket 167 records the
  same hazard biting the engine drift gate.
- **Runtime.** Six universes is the full set; if regenerating all six is too
  slow for every `verify`, gate one spec per run or wire it into the
  `data-pipeline-work` path only. A slow gate that runs is worth more than a
  fast one that does not exist, but a gate people skip is worth nothing.

## Related

Ticket 154 (the drift this would have caught, twice), ticket 157 (the change
that caused the second instance), ticket 167 (line-ending sensitivity in the
sibling gate).
