# Pre-merge review — fix/desktop-gate-twin-counts

Diffed against: `9057b508...d6216247` (`dev` = `origin/dev` at the start).
One file, `scripts/check_desktop_tab.py`. No fork change and no re-pin; the
fork clone was clean at `1410a775e`, the lock's `commit`.

What the owner asked for (2026-11-17, this session): "what do i need to do
for desktop gate?", after the plan named the desktop gate as the one open
done condition (`.scratch/plans/upgrades-tab-finish-line.md` § Where we
are). The owner's first run at fork `1410a775e` failed (e) on all four
specs with the right 40 rows and 2 fewer eligible items than pinned, for
example
`(e) FAIL: rowCount=40 expected=40 eligibleCount=1012 expected_eligible=1014 cap=1175`.
Fork `690fcdeb5` (ticket 753) keeps one id of each db.json twin, which drops
28379 and 28380 from every pool cell. The branch lowers each spec's
`expected_eligible` and `pool_cap` by 2 and rewrites the derivations.

Reviewer, with no part in writing the branch: one Opus `general-task`
covering the adversarial, domain and standards + spec axes in one pass
(a one-file change of eight numbers). Report:
`.scratch/agent-reports/2026-11-17-general-task-desktop-gate-counts-review.md`
(gitignored).

## Summary

The change is right. Every new number follows from the pool fixture at the
pinned fork and the hand-rule counts already in the comments: the fixture's
exclude/include went 1118/1175 → 1116/1173 (ret), 610/640 → 608/638 (mage),
826/867 → 824/865 (rogue), 1039/1092 → 1037/1090 (enh); all 55 cells drop
exactly 2 in both pools; no fork commit after `690fcdeb5` touches the
fixture. 28377–28380 have `type: 4` (`ItemTypeBack`, `proto/common.proto:318`)
in db.json at `1410a775e`, so the off-hand and one-hander subtractions are
unchanged: 1116 − 30 − 74 = 1012, 608 − 31 − 63 = 514. `pool_cap` is only an
upper bound (`check_desktop_tab.py:779-781`, `check_desktop_tab_verdict.py:96`)
and its documented meaning is the include size (`check_desktop_tab.py:156`),
so lowering it is correct. No other file holds a current copy of the old
numbers; what remains is dated history. The branch adds nothing else.

## Gate runs

The owner's desktop gate on this branch (2026-11-17, outside the sandbox):

```
desktop-gate: 262 files compared, 0 mismatches (Q1 bundle intact; sim_worker.js rewritten to net_worker.js).
desktop-gate: PASS (ret PASS, mage PASS, rogue PASS, enh PASS).
rc=0
```

`node --version; pnpm -s desktop-gate:unit:check; echo rc=$?` → `v22.23.2`,
`check_desktop_tab_verdict.py ok (29 verdict cases, 4 gated specs)`, rc 0.

`pnpm verify` in the main checkout → rc 1 with nothing failed: 4 tests
skipped (the two CliSimRunner tests and the two 831 real-sim tests) because
the sim binary for the engine pin is absent there
(`test -e vendor/wowsimcli-24606be6…-linux-x64/wowsimcli` → absent). Not
caused by this branch; `pnpm merge-to-dev` runs verify again before the
merge.

## Findings

None.

## Disposition

| ID  | Disposition | Where |
| --- | ----------- | ----- |

## Notes

- N1. `pnpm desktop-gate:unit:check` never reads the pool fixture, so the
  next pool change drifts the same way unseen. Filed as ticket 884.
- N2. The hand-rule counts (30/74, 31/63) were not re-listed at `1410a775e`;
  that they are unchanged rests on the owner's PASS matching the derived
  numbers (hypothesis, untested), plus the dropped items being cloaks.
- N3. Ticket 854 derives enh's full-run row count from 1039; a comment there
  now says to start from 1037 (rogue 824).
- N4. PLAN.md's Stage 3T desktop-gate box now records the 2026-11-17 run.
