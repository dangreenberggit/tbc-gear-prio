Status: blocked
Serves: .scratch/plans/upgrades-tab-finish-line.md, Chunk 4 (Tab-adjacent; owner ruling Q-cutoff-bar)
Type: task
Origin: SME reads of ticket 254 output (live tab capture .scratch/rank-reports/sme-254-tab-boundary.png on fork 316326a95; report .scratch/rank-reports/sme-254-slamaltman.html from .scratch/rank-reports/stage2-close-slamaltman.json), triaged 2026-10-11
Blocks: none
Blocked by: owner ruling Q-cutoff-bar (which bar decides a row's place)
Related: 225 (closed; measured this on feral without a ruling), 254

# The 3.4 DPS cutoff never applies to ret below about 2267 DPS

## What the reader sees

Every output names the cutoff as "3.4 DPS / 0.15%":

- HTML report lede: `packages/core/src/rank-report.ts:996`
  ("Cutoff ${absDps} DPS / ${pct}%").
- CLI header: `packages/core/src/cli.ts:313` (`cutoff=3.4 DPS / 0.15%`).
- Tab tooltip on a "by % rule" row: fork 316326a95
  `assets/locales/en/upgrades.json:96`.

But for a ret player below about 2267 DPS, the 3.4 bar decides nothing. In
the committed tab fixture `data/tab-fixtures/ret-p3-p2.json` (baseline
2082.71 DPS, the same baseline as the live capture), 0.15% is 3.12 DPS, so
Midnight Chestguard (+3.30) and Softstep Boots of Tracking (+3.24) sit above
the cutoff while a stated 3.4 bar would put them below it. The tab marks both
"by % rule" (capture `.scratch/rank-reports/sme-254-tab-boundary.png`). On the
report's run (baseline 1999.85 DPS) the effective bar is 3.00 DPS.

## Cause

`meetsCutoff` is `deltaDps >= cutoff.absDps || deltaPct >= cutoff.pct`
(`packages/core/src/cutoff.ts:95-100`; its port in fork 316326a95
`ui/features/upgrades/model/engine/cutoff.ts:132-137`). With an OR, the lower
of the two bars decides. 0.15% of the baseline is below 3.4 whenever the
baseline is below 3.4 / 0.0015 = 2266.7 DPS (ret). For feral, `absDps` is 3.6
(`packages/core/src/spec-registry.ts:117`), so the crossover is 2400 DPS.

The two bars have different origins:

- 3.4 is `max(3.0, 2 × mean reported SE 1.678)` (`docs/verification-log.md:323-329`;
  `docs/five-seed-spread.json:43`).
- 0.15% is "unchanged from the plan's dual threshold"
  (`docs/verification-log.md:328`). The same entry notes that at slamaltman's
  ~2042 DPS baseline, 0.15% is ~3.06 DPS (`:331-332`), so the derivation saw
  the percentage bar sitting below 3.4 and did not rule on it.

ADR-0021 states what the cutoff is for: whether a delta is "distinguishable
from zero at the precision the tool ran the pool at"
(`docs/adr/0021-a-mixed-semethod-tie-is-judged-on-the-coarser-se.md:114-115`).
A percentage bar below the 2 × SE figure admits rows that this purpose would
not.

Ticket 225 measured the same effect on feral (pct arm binding at 2.93 DPS on
a 1952.5 DPS baseline, `225-*.md:225-233`) and closed without a ruling.
Ticket 254 marks the rows the percentage rule admits; it does not change
which rows are admitted.

## Needed from the owner (Q-cutoff-bar)

Which bar decides: the absolute bar (2 × SE), the percentage bar, the higher
of the two, or the OR as it is now with the outputs stating it.

## Acceptance

- [ ] The owner's ruling is recorded in this ticket, with the date and the
      owner's words.
- [ ] Then either `meetsCutoff` (core and fork twin) implements the ruling,
      or every output (report lede, CLI header, tab tooltip) states the bar
      it actually applied, in DPS, for the run's baseline.
