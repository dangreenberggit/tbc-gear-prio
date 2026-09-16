# 405 — Fork comments argue superseded positions at length; do a cleanup pass

Status: open
Type: task
Origin: owner observation while deciding ticket 403 (2026-09-15)
Blocks: —
Blocked by: none

## What

Doc comments in our fork's upgrades code have grown into essays that argue a
position, and when the position changes the essay is left behind arguing the
opposite of what the code now does.

The instance that surfaced it: the runner-choice comment above `simRunner()`
(`vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades_tab.tsx`,
roughly lines 1130-1168) runs about 30 lines justifying the bulk HTTP runner on
the desktop transport. Ticket 403 removes that runner from the runtime path, so
the comment will argue for a choice the code no longer makes.

The first draft of 403's plan proposed **rewriting** that comment into a new
30-line essay arguing the new position. The owner's call was the opposite: write
about four plain lines, and file this ticket for the general problem.

## Why it is worth a pass

Per `AGENTS.md` § Comment policy, comments explain **why**, never **what**, and
load-bearing only: a non-obvious constraint, an external-system quirk, why a
slower or uglier path was deliberately chosen, or a pointer to the finding or ADR
that forced the shape. A 30-line argument is none of those — the argument belongs
in the ticket or ADR, and the comment should point at it.

Nothing lints this, which is why it drifts.

## Scope

A pass over the fork's `ui/core/components/individual_sim_ui/upgrades/` and
`upgrades_tab.tsx` looking for comments that:

- argue a case at length rather than naming a constraint,
- restate what the code does,
- or describe behaviour that has since changed.

Replace each with the short form plus a ticket or ADR pointer. Do **not** delete
comments that carry a genuine non-obvious constraint — the `topResults`
double-meaning note (`adapters/bulk_request_builder.ts:66-69`) is an example of
one worth keeping and, per 403, worth extending by one line.

## Cautions

- This is fork code: single shared working tree, strictly serial fork queue.
  Confirm no other session holds it.
- Comment-only edits still move the fork HEAD, which moves `forkCommit` in
  `data/sim-implemented-effects.json` and needs the lock bump plus regen in the
  right order (see 403's plan, claim C21).
- Some of these files are ported and gated by `check_engine_port_drift.py`; a
  comment edit on one side needs the same edit on the other.

## Done when

The named comments are short and accurate, or the ticket records which were
examined and deliberately left.
