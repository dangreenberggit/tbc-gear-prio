# W5 — docs, tickets, handoff

Date: 2026-08-11. DOCS ONLY — no code touched, nothing committed (director
commits). Sources: 01-survey.md, 02-generate.md, 03-verify.md, 04-surfaces.md,
DIRECTOR.md, ret-catchup-plan-2026-08-11.md.

## New tickets filed (118–125, `.scratch/carry-forward/issues/`)

| # | title | severity |
|---|---|---|
| 118 | Package display mode is a no-op when every attached package is negative | medium |
| 119 | Self-set 2pc multi-charge at threshold−1 worn | medium |
| 120 | Plausibility magnitude gate exempts negative bonuses | low/medium |
| 121 | No upstream ret P3 curated gear set to pin | low |
| 122 | Effect-only class restrictions admit cross-class items to the universe | low |
| 123 | Substitutions drawer embeds the raw Go panic stack | low |
| 124 | Dead-slot classifier silently skips dual-slot buckets and unrankable worn items | low |
| 125 | `--spec` flag missing from the usage string | trivial |

Folding decisions:

- The ticket-96 pointer oddity (04-surfaces finding 3) is **folded into 118**:
  both defects need the same design decision (what row-level surfaces say when
  a set has no positive package), so one owner call covers both.
- The Go-panic stack trim (04-surfaces finding 2) is **its own ticket 123**,
  not part of 122: the trim applies to every future substitution regardless
  of cause; 122 owns why the item was in the pool.
- The two dead-slot classifier blind spots (03-verify task 3) are **filed as
  ticket 124** rather than only recorded in ticket 94's note, because the
  trinket dual-slot case is structural (any character, tied owned rows),
  not fixture luck. Ticket 94's note points at 124.
- Anomalies A and B (03-verify task 2) share **ticket 119**: B's
  zero-by-construction 2pc is the same threshold−1-worn configuration and
  feeds A's arithmetic (the subtracted `twoPieceBonus` being 0).

## Appends to existing files

- `.scratch/carry-forward/issues/94-slot-dead-zone-detector-over-collects.md` —
  verification note appended (ret benign VERIFIED via setId join; two blind
  spots recorded, pointer to ticket 124). Status stays **closed**; no
  existing text edited.
- `.scratch/carry-forward/issues/117-repairmeta-bypasses-the-rare-cap-on-coloured-sockets.md` —
  second data set appended (13 ret meta-socket heads incl. T6 30989; bypass
  latent on this artifact, 0/13 epic fills, fully-gemmed worn head masks it).
  Status stays **open**.
- `.scratch/handoffs/set-bonus-resolution-2026-08-10.md` — "## Ret catch-up
  round" section appended (figures table, verifications, tickets 118–125,
  INFO items, W2 monitoring lesson, fixture-freshness caveat).

## Not filed, and why

- **Cosmetic `crossesThreshold` pairing** (03-verify finding 9: CF rows show
  `nextThreshold: 4` with no figure; 30130 carries neither figure nor
  package) — design-consistent suppression, recorded in 03-verify.md; a
  ticket would restate a working rule.
- **Justicar-2pc-unmeasured-while-4pc-measured** and **Band of Eternity
  duplicate label** — INFO items in the handoff for the next SME pass;
  neither is an established defect.
- **Fixture staleness** — disclosed in the handoff caveat; the cheap action
  (ask the owner for a settings export) is a human step, and ticket 110's
  class already documents the pattern.
