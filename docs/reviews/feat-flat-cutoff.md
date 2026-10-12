# Pre-merge review — feat/flat-cutoff

Reviewed range: `fe4d1696..7403b856`

**Why the range starts at `fe4d1696`.** The branch was cut from `fe4d1696`,
a commit on `feat/tab-stage-3t` that is not on `dev`
(`git merge-base --is-ancestor fe4d1696 dev` exits 1; the `dev` merge base is
`64443dc4`). `dev...HEAD` would therefore include `feat/tab-stage-3t`'s own
work, which is not this branch's. This review covers only this branch's
commits: main repo `fe4d1696..7403b856` (7 commits, 40 files) and fork
`vendor/tbc-new-fork` `316326a95..c4696b091` (2 commits, 16 files).

**What the branch implements.** The owner's ruling of 2026-10-11: "Just do 3
DPS then fuck it" and "It was more about simming noise anyway probably, the
methods of getting rid of it were arbitrary". One flat 3.0 DPS cutoff for
every spec in `packages/core` and in the fork's tab; the 0.15% arm and feral's
3.6 bar removed. Records: ADR-0037; ticket 615 closed, 617 and 618 cut down,
506 closed, 291 wontfix.

**Dispatch.** `codex exec` is not on `PATH` (`which codex` exits 1), so the
axes ran as three fresh `general-task` subagents on Opus (review lane), in
parallel. Not the small-change lane: 40 files, and paths under `data/` and
`packages/core/src/`. The domain axis ran because the diff states sim-noise
and set-bonus facts. The Standards + Spec axis loaded the `code-review` skill,
whose two sub-agents had not returned when that axis had to hand back; its
findings come from its own direct checks, each with a source, and it lists the
lanes it did not examine.

**Checks the dispatcher ran.**

- `pnpm verify` at `7403b856`: rc 0, "gates: 1525 ran, 0 skipped".
- No existing upstream wowsims file changed in the fork range. Each of the 16
  files `git -C vendor/tbc-new-fork diff --name-only 316326a95 c4696b091`
  lists is absent at `upstream/master` and at the upstream base `5262ff38`
  (`git cat-file -e`). `git -C vendor/tbc-new-fork diff --numstat
--diff-filter=M 5262ff38 c4696b091` still prints only
  `ui/app/SimTabsSection.tsx` 6/0, and `--name-status` counts 259 A, 1 M, as
  `docs/fork-upstream-touchpoints.md` records. The local `upstream/master` ref
  resolves to `5262ff38`; it was not fetched for this review.

## Adversarial

No correctness bug in the product code. The axis replayed the synthetic
roster observations with its own script: the pre-0037 OR rule reproduces the
`fe4d1696` above-cutoff sets for all three rows, and `deltaDps >= 3`
reproduces the new sets. The rows nearest the bar are ret 29997 at +2.891 DPS
and feral 30674 at +3.162, so any bar outside (2.891, 3.162] fails the test.
All five tab fixtures satisfy `belowCutoff == !(deltaDps >= 3)` on every row.

The generator checks that write nothing tracked all passed:
`check_sim_implemented_effects.py`, `check_tab_fixtures.py` (5 fixtures
recorded at `c4696b091`), `check_layout_gate.py --print-hash` (equals the
lock's `testedTabHash`), `check_engine_port_drift.py`, `check_fork_lint.py`.
Not run: `desktop-gate:check` (needs a live sim); the golden's diff changes
only provenance fields.

**Fork `ENGINE_VERSION` left at 6: correct.** The fork's ranking cache is a
`MemoryStore` made once per mounted tab (`run.ts:66`, kept by
`run_session.ts:87`). The tab's only `localStorage` writes are
`saved_settings.ts:111` and `saved_entry.ts:38`, which hold settings, sort,
view and export flavour, never a ranking. IndexedDB appears only in upstream's
`reforge_cache.ts`, which the tab does not import. So no ranking judged under
the old bar can reach a page running the new code. A dev-server hot reload
keeping an old in-memory store is a hypothesis, untested (A8).

**`setBonusNoiseFloorDps` at √2 × 3.** The arithmetic is right: 4.243, down
from 4.808 (ret) and 5.091 (feral). It assumes the four sims of a 2pc
prospective bonus have independent errors of equal SE, which `combineSe`
(`set-value.ts:307`) also assumes. Every caller reads the ranking's frozen
cutoff (core `view.ts:316,378`; fork `view.ts:240`, `rank.ts:1591,1934,1971`).
No hard-coded 4.81 or 5.09 is left in code. The ticket 335 band scan has not
been re-run at 4.24; ADR-0037 says so.

Findings:

- **A1** `packages/core/test/full-sweep-recall.test.ts:19-23`: the header said
  `aboveCutoffItemIds` "came from the real binary, not a replay", but
  `b12d8ff3` re-judged those sets from the recorded observations.
- **A2** `packages/core/test/cutoff.test.ts:16-21`: the test "no longer admits
  a row by its percentage of baseline" cannot fail, because `meetsCutoff`
  takes no percentage; it repeats the 2.99 case.
- **A3** Stale old-bar text in core test comments: `cutoff.test.ts:26-28`
  ("combined 2×SE bar"), `rank.test.ts:2301` ("cutoff (3.4 DPS)"),
  `view.test.ts:635` ("both arms … 3.4 … 0.15%"). No assertion is wrong.
- **A4** Fork `content-hash.ts:49-53` says `ENGINE_VERSION` is "PORTED
  unchanged" from core; fork is 6, core 9. Before this branch.
- **A5** `scripts/m1_5_recall.mjs:130` called core
  `meetsCutoff(deltaDps, deltaPct, cutoff)` after this branch made it
  `meetsCutoff(deltaDps, cutoff)`. The script is untyped `.mjs`, so nothing
  caught it: `deltaPct` was read as the cutoff, `deltaDps >= undefined` is
  always false, and every row would be reported below the cutoff with no
  error. The axis listed the script as "prints misleading text"; the
  dispatcher read line 130 and found the silent wrong result. Introduced by
  this branch.
- **A6** Fork `ResultRow.test.tsx:127` checks that no `upgrades-cutoff-arm`
  test id renders; no code renders it any more, so the test cannot fail.
  Added by this branch.
- **A7** `scripts/ew5_rank.mjs:48-53` comment points at `cutoffForSpec()` and
  `packages/core/src/cutoff.ts:27`, which no longer exist. The script keeps
  its own rule, so its results are not affected.
- **A8** Dev-server hot reload could keep an old in-memory store
  (hypothesis, untested).

## Domain

No domain fact stated in the diff is contradicted by the repo's
measurements. The diff touches no WCL, slot-mapping, enchant, gem, race,
spec-detection or phase code. The re-judged rows move in the direction each
spec's old bar allows: for ret (baseline 1833.97, old bar min(3.4, 2.75) =
2.75) rows could only leave, and 29997 Band of the Ranger-General left; for
feral (baseline 2150.41, old bar 3.23) rows could only enter, and 30674
Zierhut's Lost Treads entered. The tab's group text (`below_cutoff_group_bar`
and its fallback, `assets/locales/en/upgrades.json:127-128`) is accurate for
the flat bar.

- **D1** Docs still stating the old bar with no pointer to ADR-0037:
  `docs/adr/0020-…:34,85-86` (`CUTOFF = { absDps: 3.4, pct: 0.15 }`, the
  2×SE derivation), `docs/adr/0035-…:91` (floor 5.09 feral, 4.81 others),
  `docs/set-bonus-fixture-derivations.md:58-59,391,596` (gate 5.09).
- **D2** The √2 floor's doc comment justifies it by a four-sim 2pc bonus,
  but the fork also applies it to worn-set ladder rungs and same-gear gates,
  which the axis reads as single two-sim differences, held about 1.4 times
  stricter than that reasoning gives. Before this branch.
- **D3** `docs/pipeline-demo.html:761-762` shows "3.4 DPS / 0.15%".

## Standards + Spec

**Spec:** the code matches the ruling in both core and the fork. `Cutoff` is
`{ readonly absDps: number }`, `CUTOFF = { absDps: 3 }`, `meetsCutoff` takes
two arguments; `CUTOFF_BY_SPEC`, `cutoffForSpec`, `cutoffAdmittingArm`,
`CUTOFF_FERAL` and the "by % rule" note are gone (grep over
`packages/core/src`, the fork's `ui/features/upgrades` and its locale file).
Ticket statuses are as intended: 615 closed with `Verified by:`, 506 closed,
291 wontfix, 617 and 618 open and cut down to one rounding case each. No scope
creep.

- **S1** Tickets 617:21 and 618:24 claimed a range scan with no command to
  re-run it (AGENTS.md § Durable claims).
- **S2** Commit `9739b0d1` subject is 51 characters (limit 50).
- **S3** Ticket 506:57 uses the word "carries".
- **S4** Fork `cutoff.ts:1-4` says "PORTED verbatim" from core, but one doc
  sentence differs (`futureBonuses` vs `prospectiveBonusDps`);
  `docs/fork-provenance/engine.md` correctly says "adapted — comment-only".
  Before this branch.
- **P1** Nothing durable recorded why the fork's `ENGINE_VERSION` stayed 6.
- **P2** ADR-0020 not marked as amended by ADR-0037 (same as D1).
- **P3** `packages/core/test/store-contract.test.ts:106,109` and
  `store.test.ts:36` still use `{ absDps: 3.4, pct: 0.15 }` as opaque payloads.

## Code quality

| ID  | Row                                                   |
| --- | ----------------------------------------------------- |
| A1  | Test header misstates where expected values came from |
| A2  | Core percentage test that cannot fail                 |
| A3  | Stale old-bar comments in core tests                  |
| A4  | Fork `content-hash.ts` port comment wrong             |
| A6  | Fork absence test that cannot fail                    |
| A7  | `ew5_rank.mjs` comment names removed code             |
| P3  | Old-rule opaque payloads in store tests               |
| S4  | Fork `cutoff.ts` port header wrong                    |

One fresh `general-task` (Opus) worker fixed every main-repo row in one pass
(`6b4b0be4`, `eaa1b7cb`). While fixing A3 it found four more old-bar comments
of the same kind and fixed them too: `rank.test.ts:2529`, `:2578-2579` and
`view.test.ts:101`. They are part of A3 here. The fork rows (A4, A6, S4) need a
fork commit and re-pin, so they go to ticket 622.

## Fixes (round 1)

| Commit     | Findings                                                    |
| ---------- | ----------------------------------------------------------- |
| `eaa1b7cb` | A5 (the script keeps its own copy of the pre-0037 rule), A7 |
| `6b4b0be4` | A1, A2, A3, P3                                              |
| `74c3200b` | P1 (ADR-0037 records why the fork stays at 6), D1, P2       |
| `d72e52df` | S1 (re-runnable scans; both claims held), S3                |

`pnpm verify` after the fixes, at `d72e52df`: rc 0, "gates: 1524 ran, 0
skipped" (one fewer test: A2's deletion).

A5's fix was checked by reading: the local rule is the same test as
`fe4d1696`'s `meetsCutoff`. Running the script did not settle it. Its output
differs from the committed `experiments/m1-5-ep-recall.json` for reasons
unrelated to the cutoff (ret `poolSize` 246 committed, 294 now), so the
run cannot confirm or refute the fix; the output was restored with
`git checkout -- experiments`.
