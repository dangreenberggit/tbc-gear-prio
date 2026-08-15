Status: open
Type: bug
Origin: .scratch/handoffs/sme-rank-judgment-ret-p3-real-ranking.md (SME review of the real ret-p3 ranking, feat/ret-p3-data @ 2b3bf56)
Blocks: none
Blocked by: none

# Worn relic invisible in ranking; libram deltas identical

The real ret-p3 ranking (`.scratch/handoffs/wowsims-tab/ret-p3-ranking/`
on `feat/ret-p3-data`) does not see the character's equipped relic.

## Symptoms (verified against the artifacts)

- `test/fixtures/slamaltman.raw.json` contains item 27484 (Libram of
  Avengement) in the relic slot; the string `27484` appears nowhere in
  `slamaltman-p3.json`. The other 15 worn items all carry `owned: true`
  at delta 0.00. Re-run:

  ```bash
  python -c "import json;print('27484' in open('test/fixtures/slamaltman.raw.json').read(), '27484' in open('.scratch/handoffs/wowsims-tab/ret-p3-ranking/slamaltman-p3.json').read())"
  ```

- With the slot registering as empty, all four candidate librams score
  negative, three at an identical -13.81 (Souls Redeemed, Absolute
  Truth, Tome of the Lightbringer; Fervor -14.10). Three different
  proc effects cannot tie to the cent — hypothesis: libram effects are
  not applied by the sim, so deltas are stat-diff only.
- The report's own `plausibilityWarnings` fires (`dead-slot`/`ranged`/
  `unidentified-worn-item`) but attributes it to a stale saved report.

## Why it matters

A ret reading the page sees their whole relic slot in red and concludes
they should unequip their libram. This is the single blocker the SME
review named for plan §9.6's "would a ret trust this?" gate — distinct
from ticket 157 (157 = missing from the candidate *pool*; this = missing
from the *equipped set*, which turns a gap in choices into wrong
answers).

## Done when

The worn relic is recognized like the other 15 worn items (owned row at
0.00 or honest baseline membership), and either libram deltas become
distinct (sim-side effects) or the relic slot is explicitly marked
unmeasured instead of rendered as losses. A diagnosis of where 27484 is
dropped and whether libram effects exist in the pinned sim is the first
step; its findings should be appended here.

## Diagnosis (2026-08-14, read-only agents; all claims file:line-verified unless marked)

**Where 27484 is dropped:** it never enters
`data/universes/ret-p3.json` — the 394-row `entries` array has no
27484. The item survives the WCL 19→17 mapping (`slots.ts:26-49`,
`WCL_ORDER[17] = "ranged"`), exists in `data/items/index.json` with
`slot: "ranged"`, and the report renderer has a `ranged` section — the
drop is that `rank.ts:722` only emits rows for pool candidates;
`owned` (`rank.ts:723`) is a decoration on an existing pool row, not an
independent path for worn-but-unpooled items. The assembler's own
`wowheadRecall.missedItems` records 27484 as a known miss (it is on the
Wowhead p3 list at `data/wowhead-lists/ret/p3.json:886`), but nothing
consumes that signal. Root cause is therefore ticket 157's pool gap;
the exact assembler rule that excludes it is **hypothesis, unread**.

**Libram sim coverage:** of the four pool librams, only Libram of
Fervor (23203) has a real effect
(`vendor/tbc-new-fork/sim/paladin/item_librams.go:58-94`). Souls
Redeemed (28592), Absolute Truth (30063), and Tome of the Lightbringer
(32368) exist only as commented-out `TODO: Manual implementation
required` stubs in `sim/common/tbc/stat_bonus_procs_auto_gen.go`
(lines 3856/4432/5291) with no `NewItemEffect` registration anywhere in
the fork's Go tree — the −13.81 tie is stat-only scoring, as suspected.

**Fix layers:**

1. **Pool backfill (root cause, = ticket 157):** teach the assembler to
   include the missed eligible librams/trinkets and regen. Data-pipeline
   work; makes the worn libram recognized *and* restores candidates.
2. **Worn-but-unpooled guard (defense in depth):** `rankUpgrades` (or
   the report layer) should surface a worn item absent from the pool as
   an explicit row/warning instead of silence. `packages/core` change;
   test at the module interface per AGENTS.md.
3. **Distinct libram deltas:** upstream sim work (implementing three
   proc effects) — out of our hands at the pin. The honest local
   alternative is a relic-slot caveat where candidate effects are
   unimplemented; note detecting "unimplemented" mechanically from this
   repo is itself nontrivial (the stubs live in fork Go source).
