Status: open
Type: task
Origin: .scratch/stage-gate/reforge-catchup-leftovers/brief.md
Blocks: none
Blocked by: none

# The candidate cap can silently drop a real item (exposure)

**What is NOT claimed: no ranking is known to be wrong today.** Both defaults
are safe — the tab ships `candidateCap = 0` (no cap) and the CLI sets none — so
this is an **exposure**, not a live wrong answer. What follows is what a user
who types a cap gets, and the candidate fixes.

The mechanism is already stated in **ticket 358 §2** ("The feral P1 EP-weights
scope note is false"); this ticket does not restate it and does not own the docs
fix, which is 358's.

## The exposure

A cap truncates a pool ordered by EP weights, and nothing checks that those
weights belong to the same phase as the universe being ranked. So a user who
types a candidate cap can have a genuine upgrade dropped **before it is ever
simmed**, with no warning and no row — invisible in the output rather than
ranked low.

Symbols, re-grepped 2026-09-10 (the numbers in earlier handoffs were wrong):

| Where | Symbol |
| --- | --- |
| `upgrades_tab.tsx:399` | `private candidateCap = 0;` |
| `upgrades_tab.tsx:897-899` | the picker's `getValue` / `setValue` |
| `upgrades_tab.tsx:1184` | `readCandidateCap()` body (`const parsed = this.candidateCap;`) |
| `upgrades_tab.tsx:1228` | the call site passing `candidateCap` into the engine |
| `packages/core/src/rank.ts:123` | `candidateCap?: number;` |
| `packages/core/src/rank.ts:1100` | `const cap = input.candidateCap ?? ordered.length;` |
| fork `engine/rank.ts:147`, `:660`, `:1180` | the mirror — note the cap line is `:1180` here, not core's `:1100` |
| `candidate-order.ts:54` (both copies) | `orderCandidatesByEp` |

## Candidate fixes — none chosen

1. **Warn in the tab** when a cap is set and the ordering weights' phase differs
   from the universe phase. Cheapest, and it leaves the behaviour alone.
2. **Cap-aware ordering** that refuses to truncate below the worn item's EP, so
   a capped run cannot drop something the character would actually upgrade into.
3. **Refuse a cap** unless matching-phase weights exist — strictest, and it
   turns a silent wrong answer into an explicit failure.

The choice is a design call: 1 discloses, 2 changes which candidates survive,
and 3 makes some runs impossible that work today.

## Acceptance

- [ ] One of the options above is chosen with its reason recorded.
- [ ] A capped run with mismatched-phase weights either warns, keeps the worn
      item's peers, or refuses — per the choice.
- [ ] A test covers a cap that would otherwise truncate away a real upgrade.

## Notes

Confirmed live by symbol during the reforge-catchup-leftovers investigation.
Related: 358 (owns the mechanism statement and the misleading EP-weights docs
note).
