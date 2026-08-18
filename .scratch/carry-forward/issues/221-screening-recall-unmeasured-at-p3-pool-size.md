Status: open
Type: task (measurement gap; no known defect)
Origin: user question during the 2026-08-18 feral Phase 3 review — "screening
  out an item that could provide a >5 DPS increase seems flawed"
Blocks: none
Blocked by: a feral **maxPhase 3** full-sweep recording — not yet built
  (`packages/core/test/fixtures/synthetic-roster-recordings.json` holds
  maxPhase 2 rows only)

# Screening recall is measured at 246 eligible, but shipped against 398

## The concern as raised, and what the code actually does

The concern: screening out a candidate that could still be worth more than
about 5 DPS looks wrong, because arguably any positive delta should survive
screening.

**Promotion is not a DPS threshold, so "too small to keep" is not a state a
candidate can be in.** `promotionRule()`
(`packages/core/src/promotion.ts:82-147`) promotes a candidate if **any** of
four things holds:

- it is in the global top-`promoteTopK` by screening delta;
- it is in **its own slot's** top-`promoteTopJ`;
- it belongs to a set-completion package;
- it is owned or worn.

No branch compares a delta against a constant. A small positive delta is kept
whenever it ranks globally, and kept regardless of ranking when it is the best
thing in its own slot. The only way to lose a positive-delta candidate is to be
out-ranked — beaten by other candidates, both globally and inside its own slot.

**The per-slot floor exists to prevent exactly the failure the concern is
reaching for.** The doc comment on `RankInput.promoteTopJ`
(`packages/core/src/rank.ts:166-216`) records the mechanism: upgrade deltas
scale with how outdated the worn piece is, so a near-BiS slot's candidates are
all small and fall below a global cutoff **as a block**, taking with them the
precision needed to order that slot at all. M1.5 measured that clustering — on
ret all six worst-ranked rows were cloaks, on feral belts and necks. The floor
guarantees each slot is represented no matter how small its deltas are.

The shipped defaults are measured, not guessed
(`packages/core/src/promotion.ts:19-32`): `DEFAULT_SCREEN_ITERATIONS = 1000`,
`DEFAULT_PROMOTE_TOP_K = 150`, `DEFAULT_PROMOTE_TOP_J = 1`. The rank.ts table
records K=150/j=1 at **0 misses**, K=100/j=5 at 1, K=80/j=5 at 6, K=60/j=5 at
53.

**This section exists so the next reader does not re-litigate a threshold that
is not there.** The gap below is a different thing.

## The gap: the zero-miss result was measured on a smaller pool than ships

The 7.2 recall gate (`packages/core/test/racing.test.ts:171-248`) builds its
pool from `data/universes/feral-p2.json`, filtered by
`FERAL_SYNTHETIC_ROW.maxPhase`, which is **2**
(`packages/core/src/fixtures/synthetic-offline.ts:153-158`). Counts, verified
at this tip:

```
python -c "import json; print(len(json.load(open('data/universes/feral-p2.json'))['entries']))"
# -> 246
python -c "import json; print(len(json.load(open('data/universes/feral-p3.json'))['entries']))"
# -> 398
python -c "import json; r=json.load(open('packages/core/test/fixtures/synthetic-roster-recordings.json'))['rows']; print({k:(v['maxPhase'],v['poolSize'],v['aboveCutoffCount']) for k,v in r.items()})"
# -> {'ret': (2, 240, 38), 'feral': (2, 246, 42)}
```

So the fixture behind the rank.ts table is the one its own comment describes —
246 eligible, 42 above-cutoff, 14 slots — and **both** recorded roster rows are
maxPhase 2. Meanwhile the feral Phase 3 runs recorded in ticket 156 and ticket
219 screened **398 eligible** with `promoteTopK` still at its default 150
(`.scratch/carry-forward/issues/219-full-pool-acceptance-run-for-ticket-212.md`,
"398 eligible, all screened; 199 promoted to full sims").

**`promoteTopK` is a fixed absolute budget, so the fraction of the pool it
admits shrinks as the pool grows** — 150/246 ≈ 61% of candidates at the measured
size, 150/398 ≈ 38% at the shipped one. **Hypothesis, untested:** the per-slot
floor still guarantees each slot's single best candidate is represented at
j=1, so a whole slot cannot vanish; but a slot's *second*-best row, in a slot
holding several close upgrades, has a materially smaller global budget to fall
back on at 398 than it had at 246, and could drop out where it previously
survived. Nothing measured either way.

The rank.ts comment already says the number is fixture-bound — "tied to *this*
fixture's cutoff density, which is a fact about the gear pool" — so this ticket
is not contradicting it. It is noting that the pool the property was checked
on is no longer the pool the default runs against.

## What this is not

**Not ticket 18** (`.scratch/carry-forward/issues/18-universe-recall-measurement.md`,
closed 2026-07-30). Ticket 18 measured **universe membership** recall — whether
`assemble_universe.py` assembles the right item set, held out against Wowhead —
and cleared the junk filter. Its artifacts under `.scratch/heldout/` are ret
universe files (`p3-normal.json` 359 entries, `p3-heldout.json` 339,
`t21.json` 362) plus their membership reports; they carry no screening deltas
and no promotion decisions. This ticket is about the **screening/promotion**
stage that runs *after* a universe exists: given the pool, does racing promote
every above-cutoff row. Different stage, different mechanism, no overlap in
measurement.

**No known defect.** Nothing here reports a miss that was observed. The claim is
only that a property was verified at N=246 and is relied on at N=398.

## What would settle it

Extend the 7.2 recall measurement to a feral **maxPhase 3** pool at the shipped
defaults and report the miss count, using the same shape the existing gate
already uses (30 seeded noise draws, defaults omitted so the measurement is on
what a real caller gets).

The blocker is the recording, not the test. 7.2 compares racing's promotions
against a `fullPool: true` full-sweep truth replayed from
`packages/core/test/fixtures/synthetic-roster-recordings.json`, and that file
has no maxPhase 3 row. Recording one means running
`scripts/record_synthetic_fixtures.mjs` — which hardcodes `maxPhase: 2` for both
rows (lines 66 and 77) — against `data/universes/feral-p3.json`:

```
python scripts/fetch_wowsimcli.py --platform win32-x64
python scripts/sync_wowsims.py --restore
npx tsx scripts/record_synthetic_fixtures.mjs
```

Both fetches are prerequisites the script's own header documents; its vendored
binary path is win32-x64 only. **Untested:** whether the recorder needs more
than the two `maxPhase` literals changed to emit a P3 row — nobody has tried it.
Cost is the reason this is a ticket and not a fix: 398 full-iteration sims at
3,000 iterations, against ticket 219's measured feral P3 wall clock of 2,724 s
for 398 screens plus 199 full sims.

Re-run commands for the existing measurements, for comparison:

```
npx vitest run packages/core/test/racing.test.ts -t 7.2
npx tsx packages/core/test/measure-racing-ratio.ts
```

If the P3 measurement shows misses, the fix is the defaults or the rule — raise
`promoteTopK`, or raise `promoteTopJ` off 1 — never the test, per
candidate-pool.md §7. Note the rank.ts table's warning that these pull against
each other: j=5 at the shipped K *raises* the ratio 0.7146 → 0.7232, so a
larger floor is not free.

## Acceptance criteria

- [ ] A feral maxPhase 3 full-sweep truth exists and is committed, with its
      eligible count and above-cutoff count recorded (expected ~398 eligible;
      the above-cutoff count is unknown until measured).
- [ ] Recall at the **shipped** defaults (K=150, j=1, 1000 screening
      iterations, omitted rather than passed) is measured on that pool across
      30 seeded noise draws, and the miss count is reported — including zero if
      that is the answer.
- [ ] The result is written into the `RankInput.promoteTopK` /
      `promoteTopJ` doc comments in `packages/core/src/rank.ts`, so the next
      reader sees which pool sizes the defaults are verified at.
- [ ] If misses are found, either the defaults change with a re-measured
      table, or a recorded decision explains why the miss rate is acceptable.
- [ ] If the P3 pool is instead judged not worth gating on, that decision is
      recorded here with its reason, and the doc comments say the defaults are
      verified at N=246 only.
