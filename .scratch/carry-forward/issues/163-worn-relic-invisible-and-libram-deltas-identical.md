Status: resolved
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

## Comments (2026-08-14)

Two layers, arriving in this order:

**Layer 2 (worn-but-unpooled guard) was already on this branch's base**
before this worker started, landed in commit `2e6b257` ("Mark
worn-unrankable slots instead of showing false losses"), an ancestor of
`dc3fba0`. `dead-slots.ts`/`plausibility.ts` classify a worn item absent
from its slot's pool as `dead-slot`/`worn-unrankable` and the report
renders the warning (verified: `git merge-base --is-ancestor 2e6b257
HEAD` -> ancestor). No new engine work was needed for this layer;
ticket 164 (this branch, same worker) adds the report-layer fix that
makes that warning travel into its own slot section instead of staying
top-of-page only.

**Layer 1 (the pool gap itself) is ticket 157**, this branch's other
slice. With 157 landed, 27484 is a real ret-p3 pool member, so the
worn-unrankable guard now has nothing to warn about — it correctly
stays silent. Re-ran the full offline ranking after both fixes:

```
npx tsx packages/core/src/cli.ts --region US --realm dreamscythe \
  --character slamaltman --offline --max-phase 3 \
  --report .scratch/handoffs/wowsims-tab/ret-p3-ranking/slamaltman-p3.html
```

Confirmed the one-liner:

```
python -c "print('27484' in open('test/fixtures/slamaltman.raw.json').read(), '27484' in open('.scratch/handoffs/wowsims-tab/ret-p3-ranking/slamaltman-p3.json').read())"
# True True
```

27484 now appears in `ranking.items` at `slot: "ranged"`, `owned: true`,
`deltaDps: 0` — exactly like the other 15 worn items, the ticket's
literal acceptance criterion. `plausibilityWarnings` is absent from the
re-run's JSON (no dead-slot fires). Verify:

```
python -c "import json; d=json.load(open('.scratch/handoffs/wowsims-tab/ret-p3-ranking/slamaltman-p3.json')); print(d['ranking'].get('plausibilityWarnings')); print([(i['itemId'],i['name'],i['deltaDps'],i.get('owned')) for i in d['ranking']['items'] if i['slot']=='ranged'])"
```

**Layer 3 (distinct libram proc deltas) stays explicitly out of scope**,
as directed — Souls Redeemed (28592), Absolute Truth (30063) and Tome of
the Lightbringer (32368) remain `TODO: Manual implementation required`
stubs in the pinned sim fork
(`sim/common/tbc/stat_bonus_procs_auto_gen.go`, not `item_librams.go` —
that file holds the *implemented* librams, 27484/23203/31033/22401);
their three-way tie at -13.81 is untouched, upstream-only work.

Commit: (recorded in the branch's commit for this ticket, see `git log`).

## Comment (2026-08-15, ticket 171)

Layer 3 is now resolved, but not by implementing the procs — by
excluding the three stub-only items from the candidate pool entirely
(user ruling: an item whose effect is not implemented in the pinned sim
must not be simmed or shown, no "unmeasured" styling). See ticket 171 for
the design and the fixing commits. The three-way tie can no longer occur
because 28592/30063/32368 no longer reach `data/universes/ret-p3.json`
at all — verified by re-running the same command above:
`ranked.items` for `slot: "ranged"` now lists exactly four rows (27484,
31033, 22401, 23203), none of them a stub.
