Status: open
Type: task
Origin: draft-review agent finding, checked against the stage-gate skill on dev 7f223cd5, 2026-11-05
Blocks: none
Blocked by: none

# After a between-chunk Gate C sends a row to `rework`, the stage-gate skill gives no way to start the next chunk

## What an orchestrator following the skill does

Line numbers are from `docs/agents/home/skills/stage-gate/SKILL.md` on
dev `7f223cd5`.

1. Chunk K1 returns with a `flag` row in its ledger, or a `Status` other
   than `success`. Lines 444-447 send it to Gate C "before the next chunk
   starts, and the next chunk starts when step 6 has `accepted` every row
   and status that this Gate C covers."
2. Gate C (lines 470-476) gives the row one of three dispositions:
   `accepted`, `rework` or `escalate`. The orchestrator picks `rework`,
   logs `row <id> | rework` in `decision-log.md` (format at line 159),
   and respawns a `gate-executor` for K1 (lines 472-475).
3. The rework executor returns. Lines 484-486 repeat the condition: "Step
   5 goes on to the next chunk only when all of them are `accepted`." The
   row's only disposition is `rework`.

No line in the skill says what happens to that row next: nothing tells
the orchestrator to run Gate C again on the rework's result, or to log a
new `accepted` line for the same row id. Line 448 says a chunk whose
handoff is `success` with no `flag` or `stop` row goes on "with no Gate
C", so a clean rework return does not send the old row back through Gate
C either. Read as written, the condition at lines 446-447 and 485-486 is
never met, and chunk K2 never starts. An orchestrator either stops, or
makes up its own step (for example, appends an `accepted` line), which
the skill does not describe and a later investigator cannot check against
it.

The same gap applies to `escalate` (line 476): after the user answers,
no line turns the row into `accepted`. This is from reading the same
lines, untested in a real run.

The final Gate C is not affected: its Done-when (line 490) asks only that
every row is "dispositioned", and `rework` is a disposition.

## Done when

- Lines 444-488 of the skill (or their replacement) say, for a row that a
  between-chunk Gate C dispositions `rework` or `escalate`, which step
  gives it its next disposition and when the next chunk starts, so a
  reader can follow a rework from the `rework` line in `decision-log.md`
  to the start of the next chunk without making up a step.
- The edit follows the global rule "Changing agent instructions": the
  owner approved its exact text, and `instruction-review` ran on it.
