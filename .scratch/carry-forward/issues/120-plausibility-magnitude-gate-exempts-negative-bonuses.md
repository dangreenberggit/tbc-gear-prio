Status: resolved
Type: gap
Origin: ret catch-up round, 2026-08-11
(`.scratch/set-bonus-value/ret-catchup/03-verify.md` task 4)

# Plausibility magnitude gate exempts negative bonuses

The set-bonus magnitude gate (plausibility.ts:108-139, ticket 98) fires only
on `bonusDps > 0` exceeding 7.5% of baseline: `if (b.bonusDps === undefined
|| b.bonusDps <= 0) continue;`. The exemption was deliberate — the comment
concedes "a strongly negative bonus is suspect too… reporting it as 'too
large' would misdescribe it" — but it was theoretical when written.

It is now a live gap: ticket 119's mechanisms (self-set 2pc multi-charge at
threshold−1 worn, zero-by-construction 2pc) produce specifically **negative**
distortions, and the ret artifact's −9.92 CF 4pc at ~2σ negative (re-run:
`pnpm rank --offline --region US --realm dreamscythe --character slamaltman --spec ret --max-phase 3 --with-set-potential --show-below-cutoff --report`;
SE arithmetic in 03-verify.md task 2) passed silently. A Malorne-strength
2pc at 1 worn would put ~−262 on the 4pc figure and no gate would notice.

Small, bounded fix: add a negative-side band (warned in its own words — "this
bonus is implausibly negative; suspect a confound", not "too large"),
calibrated the same way ticket 98's positive band was. Depends on how 119
lands: if 119 suppresses/qualifies the confounded figure, the gate is the
backstop, not the fix.

## Acceptance criteria

- [x] A synthetic bonus at −262 on a ~2000 baseline fires a warning; the ret
      artifact's −9.9 (noise-scale) does not.
- [x] Warning wording does not misdescribe negative as "too large".
- [x] `pnpm verify` green.

## Comments

Resolved 2026-08-11. `setBonusMagnitudeWarnings`
(`packages/core/src/plausibility.ts`) now checks both directions against the
same 7.5%-of-baseline band: a bonus is flagged when its distance from zero,
as a share of baseline, is outside the band. The negative side gets its own
wording ("This bonus is implausibly negative; suspect a measurement
problem…"), never the positive side's "not a bonus this large". Pinned in
`packages/core/test/plausibility.test.ts`: −262 on a 2000 baseline fires,
−9.92 (the ret artifact's noise-sized figure) does not, and a boundary test
shows the band is the same width on both sides. Verify green (38 files,
688 tests).
