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

- [ ] A reader can tell from the report which cutoff arm admitted a boundary row.
- [ ] A fresh SME read of a shortlist containing such a row does not flag it as an
      inconsistency.
