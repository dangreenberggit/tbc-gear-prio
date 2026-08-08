Status: open
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
