Status: open
Type: cleanup
Origin: round-4 pre-merge review of `feat/set-bonus-value` (standards + domain axes)
Blocks: none
Blocked by: none

# Issue-1 cleanup follow-ups: duplication and a missing fixture

Deferred judgement-call findings from the round-4 review, batched:

1. **One socket-bonus predicate.** `socketsMatch` (`meta-repair.ts`) and
   `allSocketsMatched` (`candidate-gems.ts`) implement the same rule
   (including the meta-only exception from finding D1) in two places, kept in
   lockstep by comment. Extract one shared definition.
2. **`repairAndMinimize` helper.** The repair-then-minimize ternary is
   duplicated verbatim at both `rank.ts` call sites.
3. **Skip-array clump.** `simSkips` / `repairSkips` / `packageSimSkips` in
   `rank.ts` are three parallel arrays with near-identical shape differing
   only in the disclosure sentence; one array with a `kind` field would fold
   the three `substitutions` map blocks into one.
4. **Feral five-seed script duplication.** `scripts/five_seed_spread_feral.py`
   is a 245-line near-copy of `scripts/five_seed_spread.py`; a spec parameter
   would collapse them. Worth doing before a third spec arrives.
5. **Fixture exercising the changed socket-bonus branches.** The round-4
   blast-radius check was a null result: no committed fixture wears an
   inactive meta or a meta-only-socket item (e.g. 28559), so neither changed
   branch of the predicates is covered end-to-end. Add such a fixture (or a
   rank-level test) so the next predicate change measures something.

## Done when

Each item is either done or explicitly rejected in this file; item 5 is the
only one that adds coverage rather than removing duplication, and is the most
valuable.
