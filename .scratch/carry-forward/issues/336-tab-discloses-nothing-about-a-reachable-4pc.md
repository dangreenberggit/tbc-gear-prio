Status: open
Type: bug
Origin: SME verdict 2026-08-29 (stage-gate wowsims-tab-tickets, Execution B/D;
  handoff .scratch/handoffs/sme-rank-judgment-330-4pc-set-bonus-display.md)
Blocks: none
Blocked by: none
Related: 91 (built the report-path disclosure this ticket ports), 330 (wording
  of the single-threshold line — separate axis), 331 (re-filed core report bug)

# The tab discloses nothing about a reachable 4pc

The row's set-bonus number is CORRECT and stays unchanged: single-nearest-
threshold credit is deliberate (ticket 91 rejected smearing per-row 4pc credit;
the noise floor suppresses sub-noise). Do not credit the 4pc onto the row or
touch the sort — that is the rejected, game-wrong path.

The defect is disclosure. The tab never mentions a reachable 4pc even when the
data is already on the row. Committed evidence (not ret-specific): a Thunderheart
member row (e.g. Thunderheart Leggings) at 0->1 piece shows only its 2pc line
while setContext.packages[] carries a +64.09 DPS 4pc that never reaches the
screen. Whether a large 4pc surfaces today is an accident of whether the set's
2pc is implemented, not a DPS fact (same mechanism ticket 331 documents for the
report path).

Evidence fixture: .scratch/set-bonus-value/*/artifacts/shredzepelin-p3.json
(verified path; the +64.09 4pc package deltaDps is read here). The SME handoff
cites a second valid copy at .scratch/rank-reports/shredzepelin-p3.json — same
data, different scratch location; use either.

Ticket 91 built a package-as-card disclosure for exactly this on the
report/core path; it was never ported into the tab (verify: grep the tab for
any packages[]-driven rendering).

## What would close this

- A tab disclosure (card or secondary line) naming the reachable 4pc, its DPS
  figure, and the pieces that assemble it, fed from the packages[] data the
  rows already carry — presentation only; row numbers and ordering unchanged.
- Consistent with the noise floor and the crosses/confounded distinctions
  (tickets 313/315/90); a sub-noise 4pc is not shown as a real figure.
- Verified by DOM readback on a fixture where the 4pc is large (Thunderheart
  +64) and one where it is sub-noise (ret), desktop and mobile.
