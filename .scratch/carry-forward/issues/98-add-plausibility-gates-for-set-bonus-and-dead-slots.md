Status: closed
Type: cleanup
Origin: SME rank review, 2026-08-10 (`.scratch/set-bonus-value/sme-review-2026-08-10.md`, "Gate")
Blocks: none
Blocked by: none

# add plausibility gates for set bonus and dead slots

This bug (tickets 90/91/92/94/95/96 combined) took a multi-agent
investigation to find. Two cheap automated checks would have surfaced it
immediately, and would catch the next one. `sme-review-2026-08-10.md`'s
"Gate" section specifies both; this ticket records them for implementation.

## 1. Implausible-magnitude gate

A `SetBonusValue` whose `bonusDps` exceeds some fraction of baseline DPS is
almost certainly confounded rather than real, per the SME's own framing
(source, "Gate" item 3): "Any 2pc or 4pc measuring above ~5% of baseline
should be treated as a suspected confound and held back." The band must be
set from the bonus's own mechanics, not a flat constant — the source gives
the reason: "a +15% modifier on a ~30% damage share caps near 4.5%, whereas
a pure stat bonus caps far lower."

Live cases from the reviewed artifact (`.scratch/rank-reports/shredzepelin-p3.json`),
both of which trip the gate:

- Thunderheart (T6) 4pc: 193.89 DPS against a 2152.10 DPS baseline
  (`ranking.baseline`) — **~9.0%** of total damage from one set bonus.
- Malorne (T4) 2pc: regression-estimated ~116 DPS (disputed — see ticket
  92; the SME's own domain estimate is 15–40) — **~5.4%** of baseline.

Figures that pass, for contrast: Thunderheart 2pc at 31.46 (~1.5%) and
Malorne 4pc at 18.04 (~0.8%).

**The gate is a warning, not a hard failure.** An unusually strong bonus is
possible; the gate should flag "check this," not refuse to emit the figure.
This matters because a hard block would need to be right every time a
legitimately large bonus exists, and nothing in this investigation
establishes that threshold precisely enough to gate that strictly — see
ticket 97 for why even the "corrected" figures used to calibrate this
threshold are not yet independently verified.

## 2. All-negative-slot gate

A slot where every candidate is negative means either a genuine
special-effect/set-membership item is being charged against every rival, or
a measurement fault. Either way it deserves a warning on the report rather
than silence (source, "Gate" item 4).

Live case: chest (n=20), shoulder (n=18), and head (n=18) all return zero
positive candidates across 56 total rows in the reviewed artifact.

**Important qualifier, from ticket 94:** a naive version of this check
over-collects. A fourth slot (ranged) is also all-negative in the same
artifact, for an unrelated reason — the pool holds only 4 idols, and the
worn item happens to already be the best of them (`94-slot-dead-zone-detector-over-collects.md`,
"Correction... four dead slots, not two"). That is pool thinness, not a
toll or a special effect. So this gate must distinguish "worn item carries
a special effect or set membership" from "pool is thin," per ticket 94's
own recommendation to join against the worn item's `setId`
(`data/items/index.json`) rather than reading gap magnitude alone — or it
will cry wolf on every thin-pool slot in the game (idols, relics, ranged
weapons generally).

## Not this ticket: `breaks`-non-empty suppression

The SME review's third suggestion (source, "Gate" item 1: "No 4-piece DPS
figure is published when `breaks` is non-empty") is **already ticket 90's
recommendation** ("Keep any figure with a non-empty `breaks` out of the sort
key"). Do not implement it twice — this ticket covers only the two gates
above (magnitude, all-negative-slot). Cross-reference ticket 90 for that
piece rather than duplicating it here.

## Suggested order

Independent of everything else in this investigation; can be picked up any
time. Most valuable once ticket 90's suppression and ticket 94's `setId`
join exist, since the all-negative-slot gate reuses the same join, but does
not strictly require them to land first.


---

## Disposition (2026-08-10) - IMPLEMENTED, commit `ccf38be`

Both gates ship as **warnings, never hard failures**, as specified.

**Gate 1 - implausible magnitude.** Calibrated from measured figures rather than
a flat guessed constant. The measured ladder:

| bonus | measured | % of its reference baseline |
|---|---|---|
| Thunderheart 2pc | 30.5 +/- 5.5 | ~1.4% |
| Thunderheart 4pc | 73.5 +/- 6.3 | ~3.4% |
| Malorne 4pc (measured 21.7 via Strength pricing; engine 18.04) | ~18-22 | ~0.8-1.0% |
| **Malorne 2pc (measured)** | **131.1 +/- 6.6** | **~5.9%** |
| Thunderheart 4pc **as the engine reports it** | 193.89 | **~9.0%** |

The SME's original "above ~5% of baseline is suspect" rule of thumb would have
**false-positived on the genuine, directly-measured Malorne 2pc at 5.9%**. The
threshold is therefore set above that and below the confounded 9.0%, with the
reason recorded in a load-bearing comment citing the measured Malorne figure.

**Gate 2 - all-negative slot.** Reuses ticket 94's `dead-slots.ts` classifier so
`thin-pool` and `benign-nothing-better` do not raise the same warning as
`set-break-toll` and `unique-effect`. Without that join the gate would cry wolf
on every thin pool (idols, relics, ranged weapons).

`breaks`-non-empty suppression was **not** implemented here - it is ticket 90 and
landed separately in `283dd0b`, as this ticket instructed.


### Calibration note added after the Malorne 4pc measurement

The Malorne 4pc was subsequently measured at **21.7 DPS** (via direct Strength
pricing at 0.7227 DPS/Str, a tighter method than the ladder), close to the
engine's 18.04 (ticket 92). That confirms the **2pc is worth roughly 6x its own
set's 4pc** in this sim.

This matters for this gate: any threshold reasoning of the form "a 2pc should be
smaller than its 4pc" or "the 4-piece is the marquee bonus" is **empirically
false here** and would reject a correct measurement. The gate keys on magnitude
relative to baseline only, calibrated from the measured ladder above - not on
tier-design intuition, which this investigation falsified twice (once on the
SME's 15-40 estimate for the Malorne 2pc, once on the 2pc-vs-4pc ordering).

**Better future shape, not implemented here:** bands should key on the bonus's
**mechanism** - a proc/resource bonus on a resource-limited rotation can
legitimately dwarf a flat-stat bonus, because they are not comparable currencies
(the measured case: 98.8% of the 2pc's energy is absorbed rather than wasted).
Recorded as a direction, **untested**.
