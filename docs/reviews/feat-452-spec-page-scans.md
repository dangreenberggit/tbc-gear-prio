# Pre-merge review — feat/452-spec-page-scans

Reviewed range: `c229d1299ce6e094021345372ab7959d618a07ca..e9f771ad052bb5786e5bfeead15733d1feb73f20`

Dispatch note: the branch is stacked on `chore/452-slice-tickets`
(`c229d129`), which has its own instruction-review, so round 1 reads only
this branch's commits (`c229d129..e9f771ad`), not `dev...HEAD`.
`python scripts/check_merge_ready.py --product-files` printed 12 product
files (rc 0); the axes read those. The other changed files (tickets 840
and 841, `NEXT`) get `instruction-review`. Full axes: the branch changes
15 files and paths under `data/`. Domain axis runs: the fixtures name
spec pages and made-up items. No `codex` on `PATH`; the axes run as
`general-task` agents on Opus.

## Adversarial

- **A1** (silent wrong result, fixed before merge). Check 23
  (`scripts/tab-harness/test-layout.mjs:648-654`) builds its list from
  every fixture in the folder, not from the fixtures that were measured.
  If a page's fixture fails to load, the run prints `UNMEASURED` and
  `PASS (23)`. The outcome is then `unmeasured`, and
  `check_layout_gate.py:776-785,977-980` reports a skip with exit 0. So
  the merge goes through with that page never scanned.
- **A2** (by design). The new `color-contrast` entry on
  `[data-testid="upgrades-item-name"].text-quality-epic`
  (`data/wowsims-fork-a11y-baseline.json:4-10`) accepts every contrast
  failure on an epic item name, at any width, on any page and on any
  background. Because it has `mayNotFire: true`, no stale warning
  appears after ticket 840 is fixed.
- **A3** (other). Check 23 compares the fixtures against the harness's
  `PAGE_PATH_BY_SPEC`, not against the fork's `SPEC_ID_BY_PROTO_SPEC`
  (`run.ts:43-55`). If the fork adds a spec with no harness entry, the
  check still passes. No committed test covers check 23; the only
  evidence is a manual run with a fake page key added.

## Domain

- **D1** (silent wrong result, fixed before merge). In
  `data/tab-fixtures/mock-enhancement.json`, rows 28776 and 25685
  (gloves) have slot `waist`, and row 29516 (a belt) has slot `hands`.
  The cause is upstream's enhancement `p1.gear.json` and
  `preraid.gear.json`, which put the belt at the hands index and the
  gloves at the waist index. `presetPairs()`
  (`make-mock-fixtures.ts:426-441`) takes each slot from its position
  in that list. As a result, the page and its capture show "Waist" next
  to a pair of gloves.
- **D2** (other, pre-existing). `make-mock-fixtures.ts:650-660` writes
  a melee hit-cap block (Precision 3/3, 15.77 rating per 1%) into every
  fixture, the caster fixtures included. Nothing renders it today:
  `hitCapBanner` has no caller.
- Checked with no finding: the routes, the spec ids, the Survival and
  Arms statements, the set rows, and the items' slots and phases on the
  other ten fixtures.

## Standards + Spec

- **S1** (bookkeeping). The new baseline entry's `reason` states why the
  violation fires only sometimes. It gives no command a reader can
  re-run and no "hypothesis" label.
- **S2, S3, S4, P3** are code-quality findings; see `## Code quality`.
- **P1** (no effect). `data/tab-fixtures/README.md:85-88` rewrites the
  "Took" sentence, which ticket 801 did not ask for. The new text is
  correct.
- **P2** (no effect). Check 23 and the fixture name on each violation
  record were not asked for. Both support 801's "Done when".
- **P4** is the same finding as A3.
- **Spec: every 801 requirement is implemented and backed by run
  evidence** (`.scratch/agent-reports/801-runs/`).

## Instruction review (tickets 840, 841, `NEXT`)

- **I1.** Ticket 840's option "a darker background behind the tab's
  rows" cannot reach 4.5:1. On pure black, epic `#a335ee` gives 4.30:1
  and rare `#0070dd` gives 4.36:1.
- **I2.** Ticket 840 says "Remove the entry when this ticket closes".
  That conflicts with its wontfix path, where the entry keeps the
  reason.
- **I3.** Ticket 840's "Done when" would pass a run where axe marked the
  names "incomplete". No fixture is known to show a rare item.
- **I4** (minor). Ticket 841 cites `fixtureSettledExpression` for "no
  stale banner", but that expression checks result rows only.
- Note: 840 does not say who picks the option.
- Check 3 (trial run) is not done. A trial of a ticket means working
  the ticket; two cold-reader dry runs were done instead.

## Code quality

| ID  | Where                                                                                                                                                                                                     | Finding                                                                                                          |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| S2  | `data/tab-fixtures/README.md:6-10,54,59`, `make-mock-fixtures.ts:4-9,18`, and the phrase "at least one for each spec page" in `check_tab_fixtures.py:6`, `test-layout.mjs:14`, `test-tab-harness.mjs:389` | Fixture counts written out in prose go stale when the next fixture is added.                                     |
| S3  | `make-mock-fixtures.ts:183-188`, `:301-362`                                                                                                                                                               | The `FixtureName` union repeats the `FIXTURES` keys, and the five new entries repeat `size: 24, belowCutoff: 4`. |
| S4  | `test-layout.mjs:119,135-137,575-578,583-588`                                                                                                                                                             | The "fixture name or nothing" value is built in three places.                                                    |
| P3  | `data/tab-fixtures/README.md:16`, `scripts/tab-harness/README.md:23`                                                                                                                                      | The docs write "653 px" where the code uses `POST_RUN_AXE_WIDTH`.                                                |
