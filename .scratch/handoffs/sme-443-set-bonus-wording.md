# SME wording verdict — 443 set-bonus sub-line (Step 6)

The `gate-sme` seat (model opus) judged the Q3 candidate strings for domain
honesty and against the measured width data. Full reasoning:
`.scratch/handoffs/sme-rank-judgment-443-set-bonus-subline.md`. This file is
the plan's Step 6 record: the chosen string per mode, the width numbers, and
the no-horizontal-scroll posture.

Overall verdict: `trust-with-caveats`. All chosen strings are domain-honest (a
2pc/4pc figure is the sim's measured delta, not a promise); the only caveats are
about width, resolved below.

## Width measurement (real, viewport-independent)

Rendered pixel width of each candidate in the actual set-bonus font
(`12.25px SimDefaultFont`), threshold=4, dps=193.0, measured on the live
:3333 Feral page via `canvas.measureText`. DPS cells are `white-space: nowrap`,
so a wider string widens the DPS column; the layout gate (`test-layout.mjs`,
375/653/768/1280) is the authoritative no-clip / no-horizontal-scroll guard.

| Mode | Candidate | px | vs baseline |
| --- | --- | --- | --- |
| A baseline (current `available`) | "4pc bonus possible" | 113.9 | — |
| A (i) CHOSEN | "hover for 4pc bonus" | 115.4 | +1.5 (≈ equal) |
| A (ii) | "4pc bonus — hover for detail" | 163.5 | +49.6 |
| A (iii) | "4pc bonus (details on hover)" | 162.3 | +48.4 |
| C baseline (current `total`) | "with 4pc bonus" | 88.2 | — |
| B (i) | "+193.0 from 4pc" | 94.6 | −19.3 vs A baseline |
| B (ii) CHOSEN | "4pc: +193.0 DPS" | 95.0 | −18.9 vs A baseline |
| B (iii) | "4pc bonus +193.0" | 103.1 | −10.8 vs A baseline |
| C (only candidate) CHOSEN | "with 4pc bonus (+193.0)" | 136.7 | +48.5 |

Every chosen string sits at or below the current hover baseline (A, B) or is the
sole candidate (C). None grows the column beyond what the plan's Step 5 width
rule allows; the 375 no-horizontal-scroll / assertion-7 check is enforced by the
layout gate at Step 8.

## Chosen strings (landed in translation.json)

- Mode A — hover-cue (toggle OFF), replaces `set_bonus.available` in the off
  branch: `set_bonus.hover_cue` = **"hover for {{threshold}}pc bonus"** (Q3 (i)).
  Names the affordance and threshold; narrowest Mode A option (~= baseline).
- Mode B — inline (toggle ON): `set_bonus.inline` =
  **"{{threshold}}pc: +{{dps}} DPS"** (Q3 (ii), NOT the plan's predicted (i)).
  The SME chose (ii) over (i): the colon + explicit "DPS" unit make it
  unmistakable the figure is a measured DPS delta, not a percent, defusing the
  pc/percent misread; width (95.0px) is within 0.4px of the narrowest.
- Mode C — inline when Set-potential is also on (`set_bonus.total` case):
  `set_bonus.total_inline` = **"with {{threshold}}pc bonus (+{{dps}})"** (the only
  candidate). Domain-honest; flagged as the feature's widest string (136.7px) —
  the one to watch in the layout-gate run.

## Live-verification note

On the default Feral P3 run every set-bonus row is the "confounded" variety,
which returns a different early string not affected by this toggle. So the
available→hover_cue / inline switch could not be demonstrated switching live in
this session; the verdict is on candidate text + honesty + the width data, and
the layout gate enforces the width budget offline.
