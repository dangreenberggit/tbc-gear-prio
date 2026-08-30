Status: open
Type: presentation (cutoff rule is an OR and reads as an inconsistency)
Origin: `gate-sme` seat 1, 2026-08-21; handoff at
  `.scratch/handoffs/sme-rank-judgment-stage2-close-shortlists.md`
Blocks: none
Blocked by: none

# Rows below the absolute cutoff appear above it via the percentage arm

The cutoff is a pair — `{absDps: 3.4, pct: 0.15}` for slamaltman — and a row clears
it by satisfying **either** arm. Two rows in the 2026-08-21 slamaltman regeneration
sit above the cutoff with a `deltaDps` below the absolute threshold, because they
clear the percentage arm:

| row | deltaDps | deltaPct | se |
| --- | --- | --- | --- |
| #43 Ring of Deceitful Intent | 3.28 | 0.164 | 2.17 |
| #44 Lightbringer Breastplate | 3.25 | 0.162 | 2.17 |

Reproduce:

```
python -c "import json;r=json.load(open('.scratch/rank-reports/stage2-close-slamaltman.json'))['ranking'];c=r['cutoff'];print(c);[print(i['rank'],i['name'],i['deltaDps'],i['deltaPct']) for i in r['items'] if not i.get('belowCutoff') and i['deltaDps']<c['absDps']]"
```

The SME seat read this as an internal inconsistency in the artifact. It is not — the
OR is deliberate — but the report gives the reader no way to see which arm admitted a
row, so the seat's reading is the natural one and will recur. Scope is presentation:
show which arm a boundary row cleared, or state the rule next to the table.

Related but separate: both rows carry `se` ~2.17 against a 3.4 cutoff, so their
membership is inside the measurement error either way (ticket 236 territory).

## Acceptance

- [x] A reader can tell from the report which cutoff arm admitted a boundary row.
- [ ] A fresh SME read of a shortlist containing such a row does not flag it as an
      inconsistency.

## 2026-08-29 — resolved (report + tab annotation; owner/SME sign-off pending)

Added the pure helper `cutoffAdmittingArm(deltaDps, deltaPct, cutoff)` to
`packages/core/src/cutoff.ts` (unit-tested directly in
`packages/core/test/cutoff.test.ts`) and its verbatim engine twin
`vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades/engine/cutoff.ts`
(full port-drift cycle: parity test green, PROVENANCE re-hashed, fork commit
`b0aedfa02`, `data/wowsims-fork.lock.json` re-pinned, `sim-implemented-effects`
regenerated).

The helper names which arm of the OR cutoff admitted a row. The report
(`rank-report.ts`) and the tab (`upgrades_tab.tsx`, new `upgrades_tab.cutoff.*`
locale keys) now show a `cleared by %-arm` marker on exactly the above-cutoff
rows the percentage arm alone admitted, with the OR rule in the tooltip.

Verified against the committed fixture `.scratch/rank-reports/stage2-close-slamaltman.json`:
the two boundary rows the ticket names — #43 Ring of Deceitful Intent
(dps 3.28 < 3.4, pct 0.164 >= 0.15) and #44 Lightbringer Breastplate
(dps 3.25, pct 0.162) — both carry the marker and a `data-cutoff-arm="pct"`
attribute; the report has exactly 2 markers and zero false positives on
abs-cleared rows.

First acceptance box (a reader can tell which arm) is met by command. The
second box is a fresh-SME judgment and stays for owner/SME sign-off. The tab
marker's visual polish (placement, styling) is deferred to the styling wave per
the stage-gate F7 disposition; its content (which arm) is the correctness fix
landed here.
