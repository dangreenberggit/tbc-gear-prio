Status: closed
Type: bug
Origin: set-bonus 4pc-invisible investigation, 2026-08-10 (`.scratch/set-bonus-value/investigation-2026-08-10-t6-4pc-invisible.md`, `.scratch/set-bonus-value/design-review-2026-08-10.md`)
Blocks: none
Blocked by: 90
Closed: 2026-08-10 (commit 915e3a3) — option (d), package-as-card

# 4pc bonus unreachable when 2pc is implemented

`nextMeasurableThreshold(setId, piecesAfterSwap)` (`packages/core/src/set-value.ts:97-106`)
returns the nearest *implemented* threshold strictly above `piecesAfterSwap`.
With the player wearing 0 pieces of a set, every single-swap candidate lands
at `piecesAfterSwap === 1`. If the set's 2pc bonus is implemented, the walk
stops there and never reaches 4 — the measured 4pc bonus is credited to no
row in any display mode (`off`, `weighted`, or `full`).

Confirmed on `.scratch/rank-reports/shredzepelin-p3.json`: every Thunderheart
row (chest 31042, shoulder 31048, hands 31034, legs 31044) carries
`nextThreshold: 2, prospectiveBonusDps: 31.46` regardless of display mode,
while the artifact's own `setBonuses` block holds the measured 4pc value of
193.89 (see ticket 90 for that figure's own inflation).

```
node -e "const r=require('./.scratch/rank-reports/shredzepelin-p3.json').ranking;
const b=new Map(r.items.map(i=>[i.itemId,i]));
for(const id of [31034,31044,31048,31042]){const i=b.get(id);
console.log(id,i.name,i.deltaDps.toFixed(2),JSON.stringify(i.setContext));}"
```

## Blocking condition is the feature's primary use case

The blocking condition is exactly `piecesWornBefore === 0` AND the set's 2pc
is implemented. That is the default state for any unstarted tier set —
i.e., the state the feature exists to inform about (spec.md §1: "a tier
piece that does not cross a threshold by itself… the player cannot see that
it is a step toward a bonus"). From `IMPLEMENTED_IN_SIM`
(`set-value.ts:29-39`), 4 of 6 known sets have an implemented 2pc
(Crystalforge 629, Lightbringer 680, Malorne 640, Thunderheart 676); a
player at 0 or 1 worn pieces of any of them hits this defect. Design review
§1.2 confirms this is systemic, not a one-artifact fluke.

Spec §2.3's worked example covers the opposite case — Nordrassil's 2pc is
*unimplemented*, so the walk skips straight to 4 and reaches it from 0 worn.
That case is presented in the spec as intended behaviour. The symmetric
case (2pc implemented, walk stops there) was never written down, so this is
an unconsidered consequence rather than a decision to relitigate
(design review §4, "Already decided deliberately" table).

## Design options (from `.scratch/set-bonus-value/design-review-2026-08-10.md` §2)

- **(a) Carry all measurable thresholds per row.** Fixes this and the
  cross-set inversion (ticket 90) as a consequence. Medium cost, touches
  `set-value.ts`, `rank.ts:1128-1152`, `rank-report-rules.ts:260-300`,
  `view.ts:256-276`, and the HTML `data-*` attributes. **Blocked by ticket
  90**: shipping this over an uncorrected/unsuppressed confounded figure
  would surface a chest/shoulder row using a number that is currently ~2.5x
  too large (ticket 92).
- **(b) Carry the best (highest-value) reachable threshold.** Must be
  **rejected**: it selects *on* the confound — the more a package breaks,
  the larger its inflated bonus, the more likely it is chosen as "best". It
  also silently advertises a 4-pieces-away bonus with no signal of
  distance.
- **(c) Nearest unchanged, let display walk `ranking.setBonuses` itself.**
  Smallest engine change but pushes threshold-selection logic (a domain
  concern) into the display layer, and would need to be reimplemented for
  the HTML client's data-attribute path separately from the CLI path —
  effectively option (a) with worse layering and duplicated logic.
- **(d) Leave `setContext` alone; surface set completion as its own UI
  concept ("package-as-card").** Dissolves this defect rather than fixing
  it — if a package's value is never smeared onto member rows, there is no
  threshold-selection question to get wrong. Largely already built: the
  Set potential panel at `rank-report.ts:383-390` (`formatSetBonusLine`,
  `setPotentialDisclosureLine`) already lists every `SetBonusValue`; the
  remaining work is editorial (name the package contents via
  `packageItemIds`, show `breaks` prominently). The design review's
  recommended destination for the whole feature.

The design review names (d) as the likely destination, with (a) as a
fallback only if per-row numeric credit is kept.


---

## Disposition (2026-08-10) - FIXED via option (d), commit `915e3a3`

**Decision: option (d), package-as-card**, the design review's recommended
destination. Options (a) and (c) were not implemented and
`nextMeasurableThreshold`'s selection behaviour is unchanged.

### Why (d) rather than (a)

The measurement settled it. The engine reports the Thunderheart 4pc as **193.89**
while direct simulation puts it at **73.5 +/- 6.3 DPS** (ticket 99) - roughly
120 DPS of break-confound contamination at k=2. Option (a) would have smeared a
per-row fraction of that number onto member rows and into the sort, which is
precisely the "right rows, wrong reason" failure the source handoff warned
against: an authoritative-looking wrong number driving the ranking is worse than
today's visibly-absent row. Option (d) needs no per-row number at all, so there
is no threshold-selection question left to get wrong.

### What shipped

The Set potential panel now carries the bonuses no row can:

- Package contents are named from `packageItemIds`, so the reader sees **which
  items complete the set** - the actionable information the per-row number was
  failing to convey.
- `breaks` is surfaced prominently rather than as a trailing suffix, so a figure
  that costs another set's bonus reads as qualified.
- A threshold whose bonus reaches no row - the 4pc case at 0 pieces worn - is
  still visible in the panel. That is the user-facing fix.

Tests in `packages/core/test/rank-report.test.ts` assert the 4pc figure and its
package contents render for a 0-pieces-worn set.

The same commit corrected the stale `formatBreaksSuffix` citation (ticket 93).

### What this does not do

Per-row numeric credit for an unreached threshold is deliberately **not**
restored. Ticket 96's BiS-vs-below-cutoff contradiction is expected to be
answered by this panel rather than by a per-row mechanism - see that ticket for
the remaining confirmation step.
