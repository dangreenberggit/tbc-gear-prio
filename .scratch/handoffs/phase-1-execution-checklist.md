# Phase 1 execution checklist

Living checklist for finishing `phase-1/five-seed-spread` against PLAN.md §14.
Update as boxes close. Not a substitute for PLAN.md — just the stop-light map
for *this* phase so sessions do not invent new forks mid-flight.

## Gate (PLAN.md §14 Phase 1)

- [x] 5-seed spread recorded; cutoff `{ absDps: 3.4, pct: 0.15 }` pinned
- [x] Slot mapping asserted in a test
- [x] No pool entry ships with `source: null` (`data/pools/ret.json` + test)
- [x] `maxPhase` changes candidate set and gem palette together (test)
- [x] Offline engine path from fixtures (rank tests + recorded adapters)
- [x] Same input + seed → same deltas (rank test)
- [ ] One real character produces a ranking you would act on tonight
      (offline slamaltman ranks; human judgment still required)
- [ ] Top items survive check vs wowsims BiS / Wowhead ret guide
- [ ] Known set-break case shows `setBonusNote`

## Tickets

- [x] 03 temporaryEnchant — disclosed as standing assumption
- [x] 04 meta activation — repair + substitution disclosure
- [ ] 05 proto byte-stability — needs a **real CI read** after push

## Engineering leftovers (not gate boxes, but load-bearing)

- [x] Ranking loop (single-item swaps + cutoff)
- [x] Standing assumptions / substitutions on `Ranking`
- [x] EP prefilter top ~80 (reference EP; player-aware clip still open)
- [ ] Player-aware EP (item stats on `data/items/index.json`)
- [ ] `setBonusNote` for broken set bonuses
- [ ] Pool generate `--diff` against curated (do not clobber)

## Do not

- Divert into `feat/fan-out-retro` / sibling worktrees mid-session
- Land without `pre-merge-review` + explicit land ask
- Invent effectId→itemId imbue mappings
