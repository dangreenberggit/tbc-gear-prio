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

- [x] A fixture with 1 worn piece of a set with an implemented 2pc pins the
      chosen behaviour for both the 4pc figure and the 2pc figure.
- [x] No surface prints a zero-by-construction figure with a fabricated SE.
- [x] ADR-0023 names the self-set case.
- [x] `pnpm verify` green.

## This round (2026-08-11): option B done, option A planned

**Done — anomaly B (option B).** Any completion package that needs exactly
one piece (worn count = threshold − 1, at either threshold) is now reported
as `unmeasured: "unmeasurable-at-this-worn-count"` instead of a measured
0.00 ± se, and no sim is spent on it — the "package" sim would have been the
completing piece's own single-swap sim, identical equipment, zero by
construction. The completing piece's id is retained in `packageItemIds` for a
future display; no current renderer reads it on an unmeasured entry. The report renders
the reason as "can't be measured from this starting gear — one piece short
of this threshold, so the completing piece's own swap already carries the
bonus". Changes: `UnmeasuredReason` in `packages/core/src/set-value.ts`, the
skip in `buildSetBonuses` (`packages/core/src/rank.ts`), the reason text in
`packages/core/src/rank-report-rules.ts`. Pinned by "rankUpgrades — set
bonus at one piece short of a threshold (ticket 119)" in
`packages/core/test/rank.test.ts` (Crystalforge at 1 worn piece).
ADR-0023 now names the self-set case (context section + decision 6).

**Not done — anomaly A (option A), plan below.** The 4pc figure at 1 worn is
still `4pc − 2·2pc`: every added single crosses the 2pc on its own, so
Σ singles charges the 2pc three times while the package holds it once. The
same pinning test asserts this arithmetic as the *current* behaviour, with a
comment saying it is the open half of this ticket — the pin is there so a
future fix shows up as a deliberate test change, not a silent drift.

Plan for A (needs an owner decision on suppress vs qualify):

1. In `buildSetBonuses`, when measuring threshold t with piecesWorn = w,
   count how many of the package's added singles individually cross an
   implemented lower threshold of the *same* set (for 4pc at 1 worn: each
   single reaches w+1 = 2, so all of them if the 2pc is implemented). Call
   that count k; the reported figure is off by (k−1) times the lower bonus,
   which is exactly the cross-set `(k−1)·B` shape ADR-0023 already documents.
2. Follow ticket 90's precedent (ADR-0023 decision 3): suppress and
   disclose, never correct. Concretely either reuse the `breaks` field with
   the set's own id (renderers already prefix broken figures and drop them
   from sort/cutoff) or add a sibling field for the self-set case if reusing
   `breaks` muddies its "other sets" meaning — that choice is the decision to
   put in front of the owner.
3. Test: extend the Crystalforge fixture — the 4pc at 1 worn must come out
   suppressed/qualified, and the same set at 0 worn (no single crosses the
   2pc) must stay clean.

Why it did not happen this round: it changes what a measured figure means on
a surface the owner reads (suppression removes a number the report currently
shows), which is the same class of call as ticket 90 and should not be made
by a worker mid-sweep. Cost once decided: small — the counting is a few
lines next to the existing `brokenSetBonuses` call, and the rendering path
for suppressed figures already exists.

**Update (2026-08-12):** ticket 127 closed the *disclosure* half of anomaly
A — the 4pc-at-1-worn figure now carries a `selfConfound` qualifier wherever
it renders, naming the missing 2pc term (commit `102b425`,
`feat/set-bonus-value`). The arithmetic itself is untouched: `bonusDps` is
still `4pc − 2·2pc` exactly as this ticket documents, and the suppress-vs-
qualify-vs-correct decision above remains open and unmade.
