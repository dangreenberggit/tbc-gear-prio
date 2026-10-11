Status: closed
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
- [x] A fresh SME read of a shortlist containing such a row does not flag it as an
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

## 2026-10-11 — closed (owner approval; fresh SME read clean)

The owner approved the close in chat on 2026-10-11, asked "may I close ticket
254?": "Ok yes I guess".

Second acceptance box: on 2026-10-11 a reviewer that was not given this ticket
read the live tab capture `.scratch/rank-reports/sme-254-tab-boundary.png`
(ret, baseline 2082.7 DPS, fork `316326a95`) and the report
`.scratch/rank-reports/sme-254-slamaltman.html`. The capture shows Midnight
Chestguard +3.3 and Softstep Boots of Tracking +3.2 marked "by % rule" above
the line and Helm of the Illidari Shatterer +2.9 first below it. The reviewer
found no inconsistency at the shortlist boundary; verdict trust-with-caveats.

Caveat: while looking up the cutoff rule, the reviewer read a code comment in
the fork's `cutoff.ts` that names ticket 254. It opened no ticket, but the read
was not fully blind to this ticket's subject.

Follow-ups: 615–618, filed in `fbb66956` from the same SME reads.

Verified by:
- `.scratch/rank-reports/sme-254-tab-boundary.png` and
  `.scratch/rank-reports/sme-254-slamaltman.html` (gitignored; the SME inputs)
- `tbc-new-fork@316326a95` (the fork commit the capture ran on)
- On the committed fixture, the two percentage-admitted rows and the first row
  below the cutoff:
  `python -c "import json;r=json.load(open('data/tab-fixtures/ret-p3-p2.json'))['ranking'];c=r['cutoff'];it=r['items'];print(c,round(r['baseline']['dps'],1));[print('pct-arm',i['rank'],i['name'],round(i['deltaDps'],2)) for i in it if not i['belowCutoff'] and i['deltaDps']<c['absDps']];b=next(i for i in it if i['belowCutoff']);print('first below',b['name'],round(b['deltaDps'],2))"`
  → `{'absDps': 3.4, 'pct': 0.15} 2082.7`, `pct-arm 17 Midnight Chestguard 3.3`,
  `pct-arm 18 Softstep Boots of Tracking 3.24`,
  `first below Helm of the Illidari Shatterer 2.91`.
