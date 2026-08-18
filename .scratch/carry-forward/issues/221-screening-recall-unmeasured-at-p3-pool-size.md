Status: resolved
Type: task (measurement gap; defect found and fixed - see Resolution)
Origin: user question during the 2026-08-18 feral Phase 3 review — "screening
  out an item that could provide a >5 DPS increase seems flawed"
Blocks: none
Blocked by: nothing — the feral **maxPhase 3** full-sweep recording now
  exists in `packages/core/test/fixtures/synthetic-roster-recordings.json`
  as the `feral-p3` row

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
`DEFAULT_PROMOTE_TOP_K = 150` (**now 210** — see "Resolution"),
`DEFAULT_PROMOTE_TOP_J = 1`. The rank.ts table
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
survived. Nothing measured either way. **Since measured and confirmed — see
"Resolution".**

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

**No known defect** — *as originally filed*. That is no longer true: the
measurement below found 7 missed above-cutoff rows at the shipped defaults on
the P3 pool. See "Resolution" at the bottom. The paragraphs above are kept as
written so the reasoning that motivated the measurement stays legible.

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

- [x] A feral maxPhase 3 full-sweep truth exists and is committed, with its
      eligible count and above-cutoff count recorded. **398 eligible, 86 above
      cutoff**, 461 recorded observations, all at 3000 iterations.
- [x] Recall at the **shipped** defaults (K=150, j=1, 1000 screening
      iterations, omitted rather than passed) is measured on that pool across
      30 seeded noise draws, and the miss count is reported. **7 misses across
      6 distinct items; 0 top-5 misses.**
- [x] The result is written into the `RankInput.promoteTopK` doc comment in
      `packages/core/src/rank.ts`. **Deviation:** the `promoteTopJ` comment is
      deliberately not touched — see "Recorded deviations" below.
- [x] If misses are found, either the defaults change with a re-measured
      table, or a recorded decision explains why the miss rate is acceptable.
      **`DEFAULT_PROMOTE_TOP_K` raised 150 -> 210** with the re-measured sweep
      recorded in the rank.ts comment and reproducible from a committed script.
- [x] If the P3 pool is instead judged not worth gating on, that decision is
      recorded here with its reason. **Not taken** — the P3 pool is gated on,
      by the new 7.3 recall gate.

## Resolution (2026-08-18)

The hypothesis in "The gap" above was correct. Screening recall does degrade
at the shipped pool size, and the mechanism is the one predicted: a slot's
second-best row losing its global budget.

### Measured

| | feral P2 | feral P3 |
| --- | --- | --- |
| eligible | 246 | 398 |
| above cutoff | 42 | 86 |
| misses at K=150, 30 draws | 0 | **7** (6 distinct items) |
| top-5 misses at K=150 | 0 | 0 |
| misses at K=210, 30 draws | 0 | 0 |
| full sims / eligible at K=210 | 0.9837 | 0.6457 |

Missed items at K=150 on P3: 29966 and 29995 (draw 5), 32591 (draws 6 and
29), 33893 (draw 10), 28765 (draw 11), 32647 (draw 15).

K sweep on the P3 pool, 30 draws each — P2 is at zero misses for every row:

```
  K    misses  distinct
  150       7         6
  175       3         3
  190       1         1
  195       0         0   <- measured floor
  200       0         0
  210       0         0   <- shipped
```

`DEFAULT_PROMOTE_TOP_K` is now **210**: the 195 floor plus the same +10-ish
margin the previous default used, rounded up for legibility.

### The cost, stated plainly

Raising K buys recall with full-iteration sims. On the P3 pool that ships,
the ratio is 0.6457. On the P2 fixture it is 0.9837 — K=210 admits nearly all
246 candidates, so racing barely beats a full sweep there. The default is set
by the pool the tool actually runs against, which makes the P2 fixture the
pool where racing now looks worst rather than the pool the number is tuned to.
That trade is recorded in the `promoteTopK` doc comment, not just here.

### Recording cost

103 s wall, not the 20-35 min estimated. The recorder now seeds from the
committed `feral` P2 row: 278 of 461 requests were served from cache and only
183 reached the binary. Feral's P2 pool is a strict subset of its P3 pool and
`simCacheKey` does not hash the pool, so the shared candidates' keys are
identical across the two rows.

**That identity was nearly wrong, and the near-miss is worth keeping.**
`maxPhase` does not only pick the pool — it independently drives gem
selection (`rank.ts` builds `gemContext(gemsForPhase(input.maxPhase), ...)`),
and gems are written into the equipment array that gets hashed. Raising the
phase grows the palette from 162 entries to 201. Seeding is valid only
because all 39 additions are quality 4 while every gem-writing path draws
from `fillPalette`, capped at `FILL_MAX_QUALITY = 3`. That is a fact about
today's `data/gems/palette.json`, not a structural guarantee: one quality-3
phase-3 gem added upstream would silently invalidate every seeded recording
while the fixture still replayed green. `assertSeedablePalette` in the
recorder now checks this at record time and refuses to seed rather than emit
a wrong fixture. Verified by injecting such a gem and confirming the recorder
refuses.

### Recorded deviations

1. **`promoteTopJ` doc comment not written.** The AC above names both the
   `promoteTopK` and `promoteTopJ` comments. Only `promoteTopK` was written.
   Ticket 222 owns the `promoteTopJ` comment and runs next; two tickets
   editing one comment block in sequence would conflict for no benefit. The
   measurement this ticket produced is about K, not j — j stayed at 1
   throughout and no j value was swept. Settled with the orchestrator as a
   reasoned deviation, not a half-satisfied AC.

2. **`measure-racing-ratio.ts` is broken, and was already broken.** It throws
   `RankError: every screening sim failed: 240 of 240 candidates ... no
   recording for sim key ...:1000` because it replays the ret row through a
   plain `RecordedSimRunner`, which holds full-iteration (3000) observations
   only and has nothing at the 1000-iteration screening depth. Confirmed
   present at the base SHA c6387fb by stashing this branch's changes and
   re-running, so it is not a consequence of this work. The ratios in the
   table above were measured directly through the same `CountingSimRunner`
   the 7.0 gate uses. Filed separately rather than fixed here.

3. **Both recall gates now yield to the event loop once per draw.** Adding
   the 7.3 gate pushed `racing.test.ts` to ~66 s in one worker, and every
   await inside a draw resolves from an in-memory map — so 30 draws ran as
   one unbroken microtask chain that starved vitest's reporter RPC until it
   failed the run with `Timeout calling "onTaskUpdate"`. Every assertion
   passed and `pnpm verify` still exited 1. The fix is one `setImmediate`
   await per draw in 7.2 and 7.3. No assertion changed.

### Re-run commands

```
npx tsx scripts/record_synthetic_fixtures.mjs --dry-run feral-p3   # cost, no spend
npx tsx scripts/record_synthetic_fixtures.mjs feral-p3             # re-record
npx vitest run packages/core/test/racing.test.ts -t 7.2            # P2 recall gate
npx vitest run packages/core/test/racing.test.ts -t 7.3            # P3 recall gate
npx tsx packages/core/test/measure-feral-p3-recall.ts              # the K sweep
```

The two `-t` selectors are disjoint: vitest's `-t` is an unanchored regex, so
the new gate is named `7.3` rather than `7.2-P3` to keep every committed
`-t 7.2` site selecting only the P2 gate. Confirmed by observed counts —
`-t 7.2` selects 1 test and skips 3, the same 1 test it selected before 7.3
existed.
