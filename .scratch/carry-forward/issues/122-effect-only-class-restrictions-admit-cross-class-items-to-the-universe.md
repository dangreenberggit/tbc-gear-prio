Status: open
Type: data gap (policy decision required)
Origin: ret catch-up round, 2026-08-11
(`.scratch/set-bonus-value/ret-catchup/03-verify.md` task 6;
`.scratch/set-bonus-value/ret-catchup/02-generate.md`)

# Effect-only class restrictions admit cross-class items to the universe

Hunter set item **30892 Beast-tamer's Shoulders** entered
`data/universes/ret-p3.json` as an ordinary epic mail shoulder (Hyjal /
Kaz'rogal, phase 3, quality 4) — paladins wear mail, so armor-type
eligibility passes. Ticket 25's now-enforced `classAllowlist` filter cannot
catch it because the pinned `vendor/wowsims/db.json` entry carries
`classAllowlist: null` (and no set fields); the item's hunter-only nature
exists *only* as a Go-side `itemEffects` registration
(`sim/hunter/item_sets.go:244`) whose `hunter.HunterAgent` type assertion
panics when applied to a `RetributionPaladin`.

The engine backstop worked: on the ret artifact (re-run:
`pnpm rank --offline --region US --realm dreamscythe --character slamaltman --spec ret --max-phase 3 --with-set-potential --show-below-cutoff --report`)
the swap's sim failed, the candidate was dropped from the ranking, and the
drop is disclosed in `ranking.substitutions[0]`. So this is a data-side
eligibility gap with a working drop+disclose backstop — one wasted sim and
one substitutions entry per affected item per run, no wrong numbers.

## Options (owner's call)

1. **Local effect-class denylist/map** in the assembly pipeline: record
   which effect-bearing items are class-locked in Go despite
   `classAllowlist: null`, and filter at universe build (data-pipeline-work
   rules; the map is hand-maintained against the pinned Go source).
2. **Accept drop+disclose as the durable behaviour** — document it (ticket 25
   or CONTEXT.md) so the substitution entry is not re-discovered as a bug.

Unknown either way: whether 30892 is the only such item in the pinned db
(hypothesis, untested — no sweep of Go `itemEffects` registrations against
`classAllowlist: null` entries has been run).

## Acceptance criteria

- [ ] Either 30892 (and any swept siblings) no longer enter cross-class
      universes, or the drop+disclose path is documented as accepted and
      pinned by a test.
- [ ] `pnpm verify` green.
