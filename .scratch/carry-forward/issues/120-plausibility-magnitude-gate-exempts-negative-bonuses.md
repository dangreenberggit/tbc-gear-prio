Status: open
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

- [ ] A synthetic bonus at −262 on a ~2000 baseline fires a warning; the ret
      artifact's −9.9 (noise-scale) does not.
- [ ] Warning wording does not misdescribe negative as "too large".
- [ ] `pnpm verify` green.
