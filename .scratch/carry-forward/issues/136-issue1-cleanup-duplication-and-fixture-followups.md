Status: closed
Closed: 2e55dce, 2f32a2b, c196c47, cc5b4b3
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

## CLOSED (2026-08-12)

All five items done; none rejected.

- [x] **1. One socket-bonus predicate** — `2f32a2b`. Extracted as
      `socketBonusActive` in `meta.ts`, which both callers already imported and
      which needs only socket colours and gems. `socketsMatch` (meta-repair.ts)
      stays as the id-keyed wrapper — resolving an *unknown* item to
      "unconstrained" is a thing only the id lookup can express, so it is not
      dead weight. `allSocketsMatched` (candidate-gems.ts) is gone. A test pins
      the delegation across five cases rather than the duplication, so
      regrowing a private copy of the rule fails rather than drifting.
- [x] **2. `repairAndMinimize` helper** — `2f32a2b`. The ternary, including the
      `swaps.length > 0` guard that keeps `minimizeRegems` off an untouched
      layout, now lives in `meta-repair.ts` next to the two functions it
      sequences. Both `rank.ts` call sites use it.
- [x] **3. Skip-array fold** — `c196c47`. `simSkips` + `repairSkips` →
      one `candidateSkips` array with `kind: "sim" | "repair"`, folding the two
      `substitutions` map blocks into one. Both disclosure sentences are
      preserved verbatim — the distinction is load-bearing (blaming the sim for
      a gem fault misdirects an operator) and the existing tests asserting each
      sentence still pass.

      **`packageSimSkips` deliberately left out of the fold.** Its shape is
      genuinely different — set + threshold, no item id — and round-4 finding 5
      exists precisely because a `setId` once masqueraded as an `itemId` in the
      per-candidate shape. Merging them would reintroduce that. Two comments
      naming the old arrays were updated with the code.
- [x] **4. Feral five-seed script duplication** — `cc5b4b3`. 46 of 245 lines
      differed, all configuration or prose; ~200 lines of derivation were
      duplicated verbatim. Collapsed behind `--spec` with a `SPECS` table;
      `scripts/five_seed_spread_feral.py` deleted; `pnpm
      experiment:five-seed:feral` added.

      This one carried real risk, because the two scripts are the cited
      provenance for two *shipped* constants (`docs/verification-log.md`,
      `cutoff.ts`, `fan-in-brief.md`), so a silent behaviour change would
      quietly invalidate a committed cutoff. Both arms were therefore
      **re-run** against the present `vendor/wowsimcli-v0.0.101` binary and the
      committed request fixtures:

      ```
      PYTHONIOENCODING=utf-8 python scripts/five_seed_spread.py --spec ret
      PYTHONIOENCODING=utf-8 python scripts/five_seed_spread.py --spec feral
      ```

      ret → 3.4 dps / 0.15%, mean reported SE 1.678; feral → 3.6 dps / 0.15%,
      mean reported SE 1.774 — both matching the committed values. After
      prettier formatting, the only difference in either
      `docs/five-seed-spread*.json` is the new `"spec"` field; every measured
      number is byte-identical, including all five per-seed averages and SEs in
      each arm.

      `PYTHONIOENCODING` is needed because printing the U+2212 minus in
      "max−min" crashes on this Windows console's cp1252 codec. **Pre-existing**
      — reproduced on the unmodified script from HEAD — and left alone rather
      than fixed opportunistically inside a dedup commit.
- [x] **5. Fixture exercising the changed socket-bonus branches** — `2e55dce`,
      the item this ticket called most valuable. Two tests through
      `equipmentForCandidateSwap`, the same entry point `rank.ts` uses per
      candidate row: 28559 (meta-only sockets, +3 bonus) keeps its lone socket
      empty and the bonus inactive when no meta gem is available; 24545
      ([meta, yellow], +4 bonus) still takes a colour-matched yellow because
      only coloured sockets gate the bonus.

      Both are characterization tests over already-correct behaviour, so they
      pass on arrival — which makes "does this measure anything?" the real
      question. Answered by **mutation**, not assertion: reverting
      `meta-repair.ts` to upstream's unconditional meta-skip fails the first,
      and making `candidate-gems.ts` require a filled meta socket fails the
      second. The round-4 null result (finding 4-S1) is now a real measurement.

      ```
      npx vitest run packages/core/test/rank.test.ts -t "socket-bonus branches"
      ```

`pnpm verify`: exit 0 at `cc5b4b3`.
