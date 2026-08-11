Status: open
Type: bug (owner decision required)
Origin: ret catch-up round, 2026-08-11
(`.scratch/set-bonus-value/ret-catchup/03-verify.md` task 2, anomalies A and B)

# Self-set 2pc multi-charge at threshold−1 worn

First exercised by the ret artifact (re-run:
`pnpm rank --offline --region US --realm dreamscythe --character slamaltman --spec ret --max-phase 3 --with-set-potential --show-below-cutoff --report`);
feral only ever wore 0 or 2 pieces of a set, never threshold−1, so neither
ADR-0023's confound analysis nor any prior artifact covers this case.

## Anomaly A — bonus(4) = 4pcB − 2·2pcB when 1 piece is worn

With 1 Crystalforge piece worn (30129 Breastplate), *every* CF single
individually crosses the 2pc threshold (worn chest + candidate = 2), so each
of the 3 singles in the `Σ singles` term of `bonusDps = packageDelta −
Σ singles − twoPieceBonus` (set-value.ts:337-350) already contains the 2pc
bonus, while the package contains it once and the subtracted `twoPieceBonus`
is 0 (see Anomaly B). Net: **reported bonus(4) = 4pcB − 2·2pcB +
interactions** — the same `(k−1)·B` arithmetic ADR-0023 documents for
*cross-set* breaks, happening *inside the completing set*, with no `breaks`
entry and no suppression, because `brokenSetBonuses` (set-value.ts:266-271)
only looks at other sets.

Magnitude: immaterial here (CF 2pc is a mana/heal effect, ≈0 DPS — the
artifact's CF 4pc bonus −9.92 is consistent with a true ≈0 either way), but a
set with a strong 2pc at exactly 1 worn piece would be badly wrong — on the
measured feral numbers, Malorne-at-1-worn would subtract ~2×131 ≈ **262 DPS**
from its 4pc figure. Hypothesis, untested: no character with 1 worn piece of
a strong-2pc set has been run; the −262 figure is arithmetic from ticket 92's
measured B, not a sim of this configuration.

## Anomaly B — the 2pc "0.00 DPS" is zero by construction, printed as measured

At 1 worn, the 2pc completion package is one added piece, so the package sim
*is* the single-swap sim — identical equipment, `bonusDps` exactly 0 by
identity, and the reported se 3.80 counts three sims where only two distinct
ones exist. The console and panel print "Crystalforge Battlegear 2pc
(1 worn) — 0.00 DPS" as if measured. The 2pc's real value is unmeasurable by
this method at threshold−1 worn (it is confounded into the completing
single's own delta), and a reader — or the next calibration exercise — can
mistake "0.00" for "this bonus is worth nothing".

## Options (owner's call)

- **A:** extend the confound detection to the completing set itself — count
  how many singles cross the set's own lower threshold and either correct,
  suppress (ticket 90's precedent: suppress, disclose, never correct), or
  qualify the 4pc figure when worn count = threshold−1.
- **B:** report the 2pc at threshold−1 worn as
  unmeasurable-at-this-worn-count (like `not-implemented-in-sim`'s unmeasured
  rendering) instead of 0.00 ± se. This is separable from A and cheaper.
- Document the case in ADR-0023 either way; its confound analysis currently
  states cross-set breaks only.

## Acceptance criteria

- [ ] A fixture with 1 worn piece of a set with an implemented 2pc pins the
      chosen behaviour for both the 4pc figure and the 2pc figure.
- [ ] No surface prints a zero-by-construction figure with a fabricated SE.
- [ ] ADR-0023 names the self-set case.
- [ ] `pnpm verify` green.
