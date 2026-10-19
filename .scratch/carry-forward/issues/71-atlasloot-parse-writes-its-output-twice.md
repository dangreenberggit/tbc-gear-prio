Status: wontfix
Type: chore
Origin: pre-merge review of feat/phase-3-vendor-and-craft-coverage
  (standards axis finding 1)
Blocks: none
Blocked by: none
Relates to: 65, 69

# `parse_atlasloot.py` writes its output twice and prints a stale count

`scripts/parse_atlasloot.py` writes `args.out` at :519, then writes the
same path again at :545 after the faction merge. The first file is
superseded ~25 lines later and never survives. Between the two writes it
prints `wrote {len(sources)} item keys`, a **pre-merge** count that
disagrees with the bytes finally on disk.

Harmless today: `check_atlasloot_regen.py` compares the final bytes, so
the gate is unaffected, and the parse is deterministic (verified by
running it twice into scratch dirs and `cmp`-ing — outputs identical).
This is readability, not correctness.

Why it is worth fixing anyway: a reader auditing the data pipeline sees
two writes to one path and a printed count that does not match the file,
which is exactly the kind of ambiguity that makes a regeneration claim
hard to trust. Ticket 68's rubric treats "regenerating a committed
generated file is a claim" as a first-class concern.

## Done when

- One write to `args.out`, after the faction merge.
- The printed count reflects what was actually written.
- `pnpm verify` still green (`atlasloot:regen:check` in particular).

## Comments

### 2026-10-19 — wontfix (ticket housekeeping)

Per the owner's 2026-10-16 scope ruling: there is no standalone web app or Stage 4 deploy, and the work is the fork's Upgrades tab only (`PLAN.md:934`; `.scratch/plans/upgrades-tab-finish-line.md:53-56`), and since ADR-0038 (`docs/adr/0038-fork-pool-comes-from-wowsims-at-run-time.md`) the tab builds its pool from wowsims' item database at run time and reads no universe file. A readability chore in `scripts/parse_atlasloot.py`; the ticket's own check shows the final file and its gate are unaffected.
