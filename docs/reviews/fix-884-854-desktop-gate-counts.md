# Pre-merge review — fix/884-854-desktop-gate-counts

Diffed against: `a254fbf2...2d13bd93..6701643a` (`dev` = `origin/dev` at the
start). The review's fixes are `3dd50851` and the commit holding this file.
Only `scripts/check_desktop_tab.py`, `scripts/check_desktop_tab_verdict.py`
and tickets 884 and 854. No fork change and no re-pin; the fork clone was
clean at `1410a775e`, the lock's `commit`.

What the owner asked for (2026-11-17, this session): "yes then do 884 and 854
rq plz". Ticket 884 came from `docs/reviews/fix-desktop-gate-twin-counts.md`
(the gate's pinned pool counts went stale unseen); 854 is the uncapped run's
row-count check that always failed.

Builder: one Opus `general-task`. Report:
`.scratch/agent-reports/2026-11-17-general-task-884-854.md` (gitignored).
Reviewer, with no part in writing the branch: one Opus `general-task`
covering the adversarial, domain and standards + spec axes in one pass.
Report: `.scratch/agent-reports/2026-11-17-general-task-884-854-review.md`
(gitignored).

## Summary

884: `check_desktop_tab_verdict.py` `pool_count_problems` now runs in
`pnpm verify` and requires each `GATED` entry's `pool_cap` to equal its
fixture cell's include size and `expected_eligible` to equal the exclude size
less the new `hand_rule_off_hand_only` and `hand_rule_one_handers` fields.
With no fork clone it prints a `skipped --` line as the other fork checks
(`_fork_gate.py`) do; at a commit other than the lock's it fails through
`require_pinned_fork`. The reviewer moved one pin at a time (rogue `pool_cap`
865 → 866, enh one-handers 0 → 1, mage off-hand 31 → 30, rogue
`expected_eligible` 824 → 823) and each run failed rc 1, naming the number.

854: an uncapped run's (e) expects `expected_eligible - worn_in_pool` rows,
with `worn_in_pool` pinned per spec (ret 15, mage 16, rogue 17, enh 15);
`full_rows` is gone. The reviewer re-derived all four from the wowsims gear
files with its own probe, a different source from the builder's, and got the
same values. Capped runs are unchanged (39 and 41 rows fail at cap 40, 40
passes, an unpinned cap fails). Nothing was added that the tickets did not ask
for.

## Gate runs

`node --version; TBC_VERIFY_FRESH=1 pnpm verify` (reviewer, before the fixes):
`v22.23.2`, `gates: 1742 ran, 0 skipped`, rc 0.

After the fixes, `pnpm -s desktop-gate:unit:check` →
`check_desktop_tab_verdict.py ok (37 verdict cases, 4 gated specs)`, rc 0.

Live uncapped runs at fork `1410a775e`, in the sandbox with the
`PLAYWRIGHT_BROWSERS_PATH` shim and `--no-build` on the owner's build of that
fork (logs `.scratch/agent-reports/2026-11-17-desktop-gate-{enh,rogue}-full.log`,
gitignored), (a)–(f) all pass:

```
(e) pass: rowCount=1022 expected=1022 eligibleCount=1037 expected_eligible=1037 cap=1090 worn_in_pool=15
desktop-gate: PASS (enh PASS).
(e) pass: rowCount=807 expected=807 eligibleCount=824 expected_eligible=824 cap=865 worn_in_pool=17
desktop-gate: PASS (rogue PASS).
```

## Findings

**S1 (medium, spec): 854 was closed before its done condition ran.** Its done
condition is a live `--full` pass on enh and rogue; the closing note said the
runs "were not run", and stated 1022 of 1037 and 807 of 824 as if seen. Fixed
in `3dd50851` (ticket set to `blocked`, the numbers worded as expected), then
closed in the commit holding this file with the two live runs above.

**M1 (low, adversarial): a fixture with no cell for a gated spec crashed the
check.** `fixture_problems` ran its one-off self-test with `cells[name]` even
when `pool_count_problems` had already reported the cell missing, so it raised
`KeyError 'ret-p4'` instead of printing the problem (still a non-zero exit).
Fixed in `3dd50851`: the post-read logic is the pure `cells_problems`, which
skips the self-test when a problem is already found. New case
`missing_cell_problems` failed first
(`cells_problems({}) raised KeyError('ret-p4'), want a 'no cell ret-p4' problem`,
rc 1) and passes after.

## Disposition

| ID  | Axis        | Disposition | Ticket / note                                                  |
| --- | ----------- | ----------- | -------------------------------------------------------------- |
| S1  | Spec        | fixed       | `3dd50851`; ticket 854 closed with the live runs in `ad65b808` |
| M1  | Adversarial | fixed       | `3dd50851`; case `missing_cell_problems`                       |

## Notes

- `worn_in_pool` is not re-checked by `pnpm verify`; a start-preset change
  leaves it stale until a `--full` run, and the probes that measure it are
  gitignored.
- In CI the whole `desktop-gate:unit:check` step reports a fork skip line
  although its other cases still run.
- The per-spec comments in `GATED` repeat the arithmetic the fields now hold.
- The reviewer edited `scripts/check_desktop_tab.py` to prove the check
  fails and restored it with `git checkout --`, against
  `.agents/reviews/adversarial.md`'s read-only rule; the brief asked for it.
