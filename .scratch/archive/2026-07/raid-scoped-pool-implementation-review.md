# Review: raid-scoped pool implementation against the plan

**Date:** 2026-07-28
**Reviewer:** Independent diagnostic pass (did not write the implementation).
**Reviewed:** work on `phase-1/five-seed-spread` after commit `9f6c496`
(the plan commit), through commit `4933d35`.
**Measured against:** `.scratch/handoffs/raid-scoped-pool-plan.md` and its seven
sub-plans.
**Method:** read the committed code and data, ran the test suite, and
recomputed the pool and universe contents directly. No code was changed by this
review.

---

## Verdict

The implementation is substantially complete and is better than the plan
expected on the two hardest points. There are two defects. One of them is in
committed data.

The plan asked for seven sub-phases of planning followed by implementation. The
implementing agent went further and built the pipeline end to end: AtlasLoot is
pinned and parsed, Wowhead lists are collected, the two-hop mapping exists, the
universe assembles, and the ranking path consumes it. All 98 tests pass.

---

## What the plan asked for, and what is there

| Plan criterion | Target | Measured result | Status |
|---|---|---|---|
| S5 — universe in the hundreds, not thousands | order 10² | 224 at maxPhase 2, 347 at maxPhase 3 | Met |
| S4 — no EP top-N membership | removed | `prefilterPool` and `EP_PREFILTER_LIMIT` no longer exist in `packages/core/src` | Met |
| D2 — the same score must not gate twice | removed | `rank.ts:195` calls `filterPoolByPhase` with no second cut | Met |
| S3 — tier pieces appear via their token's zone | all available | T4 5/5 and T5 5/5 at maxPhase 2; T6 5/8 at maxPhase 3 | Met |
| S2 — leather and mail present without forcing | present | Belt of One-Hundred Deaths (30106) and Cobra-Lash Boots (30104) both in | Partly met, see defect 3 |
| Junk filter needs ranged and trinket exempt | mandatory | `assemble_universe.py:279` exempts both | Met |
| S7 — no narrowing rule ships without a measured false-negative rate | required | Junk filter is computed and reported but **not applied** | Met, by not applying it |

Reproduce the universe figures:

```bash
python -c "
import json
for ph in (2,3):
    u=json.load(open(f'data/universes/ret-p{ph}.json'))
    rows=u['entries'] if isinstance(u,dict) else u
    print(ph, len(rows))
"
```

T6 showing 0 of 8 at maxPhase 2 is correct, not a defect. Those tokens drop in
Black Temple and Sunwell, which are phase 3 and above.

### Two things done better than the plan specified

**The junk filter is measured but not applied.** The universe ships every entry;
the report records what the filter would have removed (69 caster-only rejects at
maxPhase 2, 30.8%). This is exactly what plan section 9 criterion S7 asks for —
do not ship a narrowing rule whose false-negative rate has not been measured —
and the implementation reached it without being told.

**The report files are better instrumentation than the plan asked for.**
`data/universes/ret-p{N}.report.json` records `excludedNoSource`,
`membershipByOrigin`, `exclusivePrimaryOrigin`, and per-slot counts. The plan did
not specify this. It makes the next question answerable without new tooling.

### The Wowhead lists are doing real work

At maxPhase 2, 86 list item IDs were collected and 6 items enter membership
**only** through the list. At maxPhase 3, 123 collected and 9 list-only. This is
the D4-restated role working as intended: lists add members the loot tables miss,
rather than defining the pool or acting only as tags.

---

## Defect 1: `data/pools/ret.json` contains items a paladin cannot equip

**Severity: low impact today, high risk of misleading a reader.**

The committed pool's ranged slot holds 12 bows, crossbows, and guns:

```bash
python -c "
import json
d=json.load(open('data/pools/ret.json'))
print([e['name'] for e in d['entries'] if e['slot']=='ranged'])
"
```

Returns Crossbow of Relentless Strikes, Arcanite Steam-Pistol, Thori'dal,
Steelhawk Crossbow, and eight more. Ret uses librams only. The file previously
held 8 librams.

It also contains **Netherstrand Longbow (30318)**, a Kael'thas encounter-only
legendary that `packages/core/src/kael-temp.ts:3` exists to exclude.

Cause: `scripts/generate_pool.py` no longer applies the libram filter or the
Kael exclusion. The `RANGED_LIBRAR` constant and the Kael ID set are gone from
that script, though both still exist in `kael-temp.ts` and
`scripts/assemble_universe.py`.

**Why the impact is low.** Nothing ranks from this file.
`scripts/curate_ret_pool.py:158` prints "DEPRECATED: curated ret.json is not the
rank path", `packages/core/test/pool-file.test.ts:39` describes it as "legacy —
not rank membership", and `rank.ts:196` filters Kael items at runtime regardless.
The CLI loads `data/universes/ret-p{N}.json` (`cli.ts:148`).

**Why it still matters.** A committed data file that recommends a crossbow for a
paladin will mislead the next person who opens it, and `pool-file.test.ts` passes
on it today. Deprecated in a docstring is not the same as removed.

**Recommendation:** delete `data/pools/ret.json` and `generate_pool.py` /
`curate_ret_pool.py` if the universe path has fully replaced them, or add the
libram assertion that `pool-hardening.test.ts:196` already applies to the
universe.

---

## Defect 2: the tests guard the new path only

`packages/core/test/pool-hardening.test.ts:196` asserts "ranged slot is librams
only" and passes. It tests `universeP3`. No equivalent assertion covers
`data/pools/ret.json`.

That is precisely why defect 1 shipped with a green suite. Two pipelines exist;
the tests cover one of them.

This is not an argument for testing the legacy file. It is an argument for
deleting it, so there is one pipeline and the tests cover it.

---

## Defect 3: real items are being dropped by the no-source rule

**Severity: moderate. Reported rather than silent, but under-investigated.**

`excludedNoSource` is 2,326 at maxPhase 2 — more than half the 4,212 eligible
items. The plan (section 3) argued this was acceptable on the grounds that most
of the bucket is vanilla phase-1 content a raid-scoped pool would exclude anyway.

That argument is only partly right. Measured:

```bash
python -c "
import json,sys,collections; sys.path.insert(0,'scripts')
import generate_pool as G
db=json.load(open('vendor/wowsims/db.json'))
al=json.load(open('data/atlasloot_sources.json')); alids={int(k) for k in al}
# D7 eligibility, then: no db source and not in atlasloot
"
```

Of 2,355 items with neither a `db.json` source nor an AtlasLoot entry, the phase
breakdown is 1,682 at phase 1 and **673 at phase 2 and above**. The phase-2+
remainder is not junk. It includes ordinary epics such as Band of the Eternal
Champion (29301) and the Band of Eternity family.

A concrete miss: **Shattrath Leggings (30257)** appears in all three vendored
wowsims ret gear sets and is absent from the universe. It is quality 3, has no
`sources` entry in `db.json`, is not in AtlasLoot, and is not on a collected
Wowhead list, so all three membership routes miss it.

**Recommendation:** treat the 673 phase-2+ no-source items as a named gap with an
owner, not as accepted loss. The report already counts them; what is missing is a
check of how many are genuinely relevant.

---

## Not yet done

**The recall measurement — sub-phase 4's actual purpose.** The assembled universe
has never been simulated. Every recall figure in the repository still comes from
the 191-item set, which was drawn from the old EP-based pool plus wowsims
best-in-slot sets and therefore cannot show what either source omitted.

Nothing unsafe has shipped as a result, because the junk filter is not applied.
But the measurement that would justify applying it does not exist, and the
universe is now small enough (224 and 347 items) that it is affordable. This is
the highest-value remaining task.

**One inherited claim is now testable.** Plan section 6 states the safe junk
filter removes about 12% of the eligible universe. The implementation reports
30.8% caster-only rejection at maxPhase 2. Those numbers describe different
populations — 12% was measured across all 4,212 eligible items, 30.8% across the
224-item zone-scoped universe — so they do not contradict each other. Neither has
been checked against simulated results.

---

## What this review did not check

- Whether the AtlasLoot parse is correct. Its output was treated as given.
- Whether the collected Wowhead lists match the pages. Only the counts were read.
- Whether the two-hop token mappings are correct. `tierPiecesPresent` matches
  `tierPiecesExpected` in both reports, which shows the mapping is wired up, not
  that each token is the right one.
- Any run-time or wall-clock measurement.
- Commits before `9f6c496`.

---

## Summary

| Item | State |
|---|---|
| EP removed from membership and from rank-time | Done |
| Universe built from loot tables, lists, and two-hop mappings | Done |
| Size target | Met, 224 and 347 |
| Tier pieces, leather and mail | Present |
| Junk filter exemptions | Correct |
| Junk filter applied without measurement | Correctly avoided |
| `data/pools/ret.json` contains bows and a banned legendary | Defect, low impact, should be deleted |
| Tests cover the new path only | Defect, follows from keeping two pipelines |
| 673 phase-2+ items dropped for lack of a source | Needs an owner |
| Recall measurement on the real universe | Not started, now affordable |
