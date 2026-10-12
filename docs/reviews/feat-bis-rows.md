# Pre-merge review — feat/bis-rows

Reviewed range: `367b23ef..9b059b58`

**Why the range starts at `367b23ef`.** `feat/bis-rows` stacks on
`feat/flat-cutoff` (reviewed in `docs/reviews/feat-flat-cutoff.md`), which
stacks on `feat/tab-stage-3t` (under its own review), so `dev...HEAD` holds
both of those branches' work. This branch's own commits are `bd1a4d81` and
`9b059b58`; the merge `dba08c60` brought in `7403b856..367b23ef`, the
flat-cutoff review's fixes, which that review already covered. After the
merge, `git diff 367b23ef 9b059b58` is this branch's own diff (4 files, 11
insertions, 6 deletions: a fork re-pin and ticket 622 closed), and
`git log 367b23ef..9b059b58` lists exactly `bd1a4d81`, `dba08c60` and
`9b059b58`. The code is in the fork: `vendor/tbc-new-fork`
`c4696b091..08afcdcce` (4 commits, 14 files, 253 insertions, 63 deletions),
where `c4696b091` is the fork commit `feat/flat-cutoff` pins.

**What the branch implements.**

- Ticket 614: with "BiS only" ticked, every slot tab stays; a slot with no
  BiS-list row is dimmed at (0) and its pane says "No BiS-list item for this
  slot.".
- Ticket 528, owner's ruling of 2026-10-11: the answer "A" to "Option A: put
  BiS items in the main table anyway. You see them without a click. But the
  table would no longer mean 'these beat your gear', so the slot counts and
  the ThatsMyBis export would start including items that are not upgrades."
  The session then set the details: a BiS-list row that misses the cutoff
  sits in the main table, sorted by gain, marked "(Not an upgrade)"; the slot
  counts and the ThatsMyBis export count only rows that meet the cutoff.
- Ticket 622: comments in two ported engine files, and a dead tab test
  deleted. Closed on this branch.

Tickets 614 and 528 stay open on purpose: their files are closed after
`feat/tab-stage-3t` merges, because that branch edits them.

**Dispatch.** `codex exec` is not on `PATH` (`which codex` exits 1), so the
three axes ran as fresh `general-task` subagents on Opus (review lane), in
parallel. Not the small-change lane: the fork range alone is 14 files and 316
changed lines, and the main diff touches `data/`. The domain axis ran because
the change decides which rows a player sees as upgrades; it used the
`sme-rank-review` skill's judgment on four captures from the build (ret,
phase-3 list, phase-2 preset gear). The Standards + Spec axis applied the
`code-review` skill's checks itself, with no sub-agents.

**Checks the dispatcher ran (at fork `08afcdcce`, main `9b059b58`).**

- `pnpm verify`: rc 0, "gates: 1524 ran, 0 skipped".
- No existing upstream wowsims file changed.
  `git -C vendor/tbc-new-fork diff --numstat --diff-filter=M 5262ff386bd1 08afcdcce -- . ':!ui/features/upgrades' ':!assets/locales/en/upgrades.json'`
  prints only `ui/app/SimTabsSection.tsx` 6/0 (pre-approved);
  `--diff-filter=D` prints nothing; none of the 14 paths in
  `c4696b091..08afcdcce` exists at `upstream/master` (`git cat-file -e`
  fails for each). The local `upstream/master` resolves to `5262ff386`, the
  lock's `branchedFrom`; it was not fetched for this review.
- PROVENANCE hashes match: `python scripts/check_engine_port_drift.py` prints
  "engine port drift check ok: 36 ported files match engine.md".
- The `oxfmt --check` failure on `model/engine/content-hash.ts` and
  `model/engine/cutoff.ts` predates this branch. Run on copies of both files
  with the fork's `.oxfmtrc.json`, it fails at `c4696b091` and at
  `08afcdcce`, and the formatter's rewrite changes the same number of lines
  at both commits (44 in `content-hash.ts`, 4 in `cutoff.ts`). Ticket 578
  records the formatting gap.
- Lock: `data/wowsims-fork.lock.json` `commit` equals the fork's HEAD
  `08afcdcce`; both working trees were clean before the review.

## Adversarial

The fork logic holds up. The axis traced every consumer of the new rows:

- The export still reads `view.shortlist` (`ResultsPanes.tsx:48`), and
  `slotTabs` counts only rows with `!belowCutoffInView`, so a marked row
  reaches neither.
- `paneRows` splits the not-owned rows that miss the cutoff on `onBisList`,
  so each row lands in the main table or the below-cutoff group, never both;
  owned rows that miss the cutoff land in neither, as the spec says.
- Set potential: `belowCutoffInView` and the sort key both use effective DPS
  (`view.ts`, `applyView`). A row that clears the bar only through set
  potential is an ordinary unmarked row. The test "keep the rule under BiS
  only and with Set potential" asserts this through the real `applyView`.
- `noBisListRow` is true only for a slot pane of a BiS-only view with no
  rows; a test covers the owned-only slot that keeps the no-upgrades text.
- The deleted `ResultRow` test was dead: `git grep cutoff-arm c4696b091`
  finds only the deleted test line.
- `node node_modules/vitest/vitest.mjs run ui/features/upgrades`: 54 files,
  451 tests pass. No tautology or mocked internal collaborator in the three
  changed test files.

**A1 — the live-tab harness labels marked rows as above the cutoff.**
`scripts/tab-harness/run-tab-cdp.mjs` (`readResults`) set `belowCutoff` only
for rows inside the `upgrades-below-cutoff` group, and listed every
main-table row in `aboveCutoffItems`. After fork `72de95a28` a BiS-list row
that misses the cutoff renders in the main table with
`data-not-upgrade="true"`, so the harness reports it as above the cutoff.
`scripts/check_desktop_tab.py:317` and `:378-380` read that field for the
desktop gate's golden and its `aboveCutoffSymDiff`. A silent wrong result in
a gate. Whether the current golden `data/desktop-gate/golden-ret-p4-cap40.json`
has such rows is unverified: the readback carries no BiS tags.

**A2 — a stale name in the stop-check harness.**
`scripts/tab-harness/test-stop.mjs:180-194` calls the main table
`shortlistRows`; it now also holds marked rows. `rowsKept` is a sum, so the
value is unaffected. Code quality (CQ4).

Unexamined by this axis: a live browser render; `data/sim-implemented-effects.json`.

## Domain

Verdict: trust with caveats. For ret with the phase-3 list on phase-2 preset
gear, showing below-cutoff BiS-list rows in the main table reads sensibly. In
the captures the one marked row, Cloak of Darkness at −0.2 DPS, sits last in
its table (`ret-p3-p2-bis-off.png`, `ret-p3-p2-bis-on-back.png`). Hiding worn
BiS rows is right: a worn item re-sims to about 0. Counts and export match the
ruling (18 export items against 19 rows; 7 against 8). No game-mechanic claim
in the diff contradicts `docs/stage0-findings.md` or
`docs/verification-log.md`.

**D1 — "(Not an upgrade)" can sit beside a positive figure.** The cutoff is a
noise bar of about twice the sim's standard error
(`docs/verification-log.md:323-328`), and the test at
`results_view.test.ts:74-90` marks a BiS helm at +2.91 DPS "Not an upgrade".
The axis suggests "(Below the 3 DPS cutoff)".

**D2 — under BiS only, a slot whose BiS-list item is worn says "Widen the
phase or content filter".** Ret's phase-2 preset already wears the phase-3
BiS item in neck, shoulders, hands, waist, ring 2, both trinkets and ranged;
`ret-p3-p2-bis-on-neck.png` shows the Neck pane with the no-upgrades text.

**D3 — a dimmed "Back (0)" tab lists a row, and the Rank column numbers the
marked row (rank 19).**

**D4 — an impossible test item.** `results_view.test.ts:118-121` gives
Midnight Chestguard the set context of Lightbringer Faceguard, a T6 piece. A
non-tier chest cannot count toward the Lightbringer bonus. Code quality (CQ3).

Unverified (hypothesis, untested): ret's phase-3 universe has no Alt tags, so
the captures never exercise the Alt rule. If a source filter removed a BiS
item, "No BiS-list item for this slot." would be false. Unexamined: other
specs and phases.

## Standards + Spec

**Spec: clean.** 528 and 614 are built as set. The agent decisions are
consistent with the ruling: owned rows stay hidden (the existing below-cutoff
rule); "BiS-list" includes Alt tags (the same `onBisList` test the BiS-only
toggle uses); the mark appears only in the main table (the below-cutoff group
no longer holds BiS-list rows, so this is moot); a slot can show (0) and still
list a marked row (counts include only rows that meet the cutoff). Tests cover
each case (6 in `results_view.test.ts`, 3 in `ResultsPanes.test.tsx`).

Accessibility: "(Not an upgrade)" is real text in a span inside the
item-name cell, after the badges, so a screen reader reads it. Dimmed tabs use
`opacity-60` only, but the "0" badge is visible text that says the same, and
the tabs stay focusable and selectable (intended, per the comment at
`ResultsPanes.tsx:72`). The dimmed tabs' contrast against WCAG 1.4.3 is
unmeasured.

**S1 — the tab's locale file fails its schema.**
`assets/locales/en/upgrades.json` adds `not_upgrade` and `empty_no_bis_row`
with no property in `schemas/upgrades.schema.json`
(`additionalProperties: false`), against the fork's
`.github/skills/wowsims-ui/references/conventions.md:130-131` ("a new key
needs a matching property"). An Ajv check (the command in
`docs/fork-upstream-touchpoints.md`) gives 4 errors at `08afcdcce`; the other
two, `below_cutoff_group_bar` and the required `cutoff` block, came from
`feat/flat-cutoff` (2 errors at `c4696b091`).

**S2 — header comments out of date after 614.** `model/results_view.ts:3` and
`components/ResultsPanes/ResultsPanes.tsx:22` say "one pane per slot with a
row"; `ExportPanel.tsx:14` and `model/export.ts:4` say "the Upgrades pane's
shortlist". Code quality (CQ1).

**S3 — the provenance row for `content-hash.ts` omits `ENGINE_VERSION`.** The
fork's value is 6 where core's is 9 (`packages/core/src/content-hash.ts:57`).

**S4 — data clump.** `ResultsPanes.tsx:91-94` passes `main`, `notUpgrades`,
`belowCutoff` and `noBisListRow` one by one: exactly the object `paneRows`
returns. Code quality (CQ2).

**S5 — a count in the lock comment.** The `08afcdcce` entry says "6 changed
files outside model/engine"; with the locale JSON it is 7.

Findings the dispatcher added while fixing the above:

**S6 — no gate checks the locale schema.** `pnpm verify` passed at
`08afcdcce` with S1's four errors, and at `c4696b091` with two. The fork's
`node ./test-locales.mjs` matches no file on Windows
(`docs/fork-upstream-touchpoints.md` lines 208-227).

**S7 — the `content-hash.ts` header still calls `ENGINE_VERSION` "ported
unchanged".** Line 14 says "`HashedGearItem` and `ENGINE_VERSION` are ported
unchanged", which contradicts the constant's own comment that 622 fixed. The
622 re-run grep looks for "PORTED unchanged" in capitals and misses it.

## Code quality

| ID  | From    | What                                                                                                                                       |
| --- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| CQ1 | S2      | Bring the four header comments in line with 614 and 528 (`results_view.ts:3`, `ResultsPanes.tsx:22`, `ExportPanel.tsx:14`, `export.ts:4`). |
| CQ2 | S4      | Pass `paneRows`'s result to `ResultsPane` as one value.                                                                                    |
| CQ3 | D4      | Give the Set potential test a tier item that can count toward the set.                                                                     |
| CQ4 | A2      | Rename `shortlist` in `test-stop.mjs:180-194` and the "shortlist table" error text in `test-layout.mjs:174` to "main table".               |
| CQ5 | CQ pass | Rename three `ResultsPane.test.tsx` test names that call the main table "shortlist" (raised by the code-quality pass).                     |

## Fixes (round 1)

Main repo:

- `46d382c5` — A1: `readResults` sets `belowCutoff` from the group or from
  `data-not-upgrade="true"`, and only rows that meet the cutoff go into
  `aboveCutoffItems`. S3 and S7: the `content-hash.ts` provenance row records
  `ENGINE_VERSION` 6 against core's 9, with the new sha.
- `19c2e9f1` — this file's round 1, tickets 625 and 626.
- `4a392741` — CQ4 (`shortlistRows` renamed `mainTableRows`; no checker
  reads it: `grep -rn shortlistRows` over the repo's scripts finds only
  `test-stop.mjs`).
- `72b13908` — fork re-pin to `176268e7c`, with
  `pnpm sim-implemented-effects:generate`. The new lock `_comment` entry also
  corrects the `08afcdcce` entry's file count (S5).
- `1519317d` — ticket 622's `Verified by:` records the S7 fix.

Fork `vendor/tbc-new-fork`:

- `49836e4e5` — S1: the schema lists the three new strings and drops the
  `cutoff` block. The Ajv command in `docs/fork-upstream-touchpoints.md`
  prints `upgrades valid` and `translation valid`.
- `3393bcb19` — S7: the header no longer calls `ENGINE_VERSION` ported
  unchanged. `python scripts/check_engine_port_drift.py` passes.
- `fd362cf6b` — CQ1, CQ2 (one `rows: PaneRows` prop).
- `176268e7c` — CQ3 (a made-up Lightbringer Battlegear chest, id 900001,
  absent from the fork's `assets/database/db.json`), CQ5.

Checks after the fixes: fork `vitest run ui/features/upgrades` 54 files, 451
tests pass; `oxlint --deny-warnings`, `tsc --noEmit` and `oxfmt --check` on
the changed fork files pass (the code-quality agent's runs). `pnpm verify` at
`72b13908`: rc 0, "gates: 1524 ran, 0 skipped". The wowsims-file check at
`176268e7c`: `git diff --numstat --diff-filter=M 5262ff386bd1 176268e7c`
outside the tab folder, its locale file and its schema prints only
`ui/app/SimTabsSection.tsx` 6/0; `--diff-filter=D` prints nothing; the schema
file is absent at `upstream/master`.

## Focused check (round 2)

Reviewed range: `9b059b58..1519317d`

Fork range: `08afcdcce..176268e7c`.

One fresh `general-task` agent on Opus (review lane) ran the check. Its
result for each check:

1. **Pass.** Every commit in both ranges is a fix named by finding ID
   (`46d382c5`, `49836e4e5`, `3393bcb19`), the code-quality pass with its row
   IDs (`4a392741`, `fd362cf6b`, `176268e7c`), a re-pin that changes only two
   files under `data/` (`72b13908`; `git diff --word-diff` shows
   `sim-implemented-effects.json` changes only `forkCommit`), or a commit to
   this file and tickets only (`19c2e9f1`, `1519317d`). Every changed code
   line is at a place a fixed finding cites. The wowsims-file check gives the
   same output at `176268e7c`, and all 9 paths changed in
   `08afcdcce..176268e7c` are absent at `upstream/master`.
2. **Pass.** Each diff does what its finding asks and nothing more. No script
   reads the renamed `shortlistRows` key or the old "shortlist table" text.
   S5's count of 7 is right (`git diff --name-only 72de95a28 08afcdcce` lists
   9 files, 2 under `model/engine`).
3. **Pass.** The Ajv command prints `upgrades valid` and `translation valid`;
   run against the `08afcdcce` schema it gives S1's 4 errors. Ticket 622's new
   grep prints nothing at `176268e7c` and matches line 14 at `08afcdcce`. A1
   has no automated test; the harness is a string evaluated in a live page
   over CDP, and the fix has not been run against a live page (unverified).
4. **Pass.** Fork `vitest run ui/features/upgrades`: 54 files, 451 tests;
   `check_engine_port_drift.py` ok; `node --check` on the three harness files;
   the lock is valid JSON and its `commit` equals the fork HEAD `176268e7c`.
   Both working trees clean.

No finding, bookkeeping or otherwise.

## Disposition (round 2)

| ID  | Axis         | Disposition | Ticket / note                                                                                                                                  |
| --- | ------------ | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | Adversarial  | fixed       | `46d382c5` — `readResults` reads `data-not-upgrade`; not yet run against a live page                                                           |
| A2  | Adversarial  | fixed       | `4a392741` — as CQ4                                                                                                                            |
| D1  | Domain       | wontfix     | Session decision 2026-10-11: the owner's ruled option calls these rows "items that are not upgrades", and ADR-0037's cutoff defines an upgrade |
| D2  | Domain       | defer       | `.scratch/carry-forward/issues/625-bis-only-worn-bis-slot-says-widen-filter.md` — before this branch (same text at fork `c4696b091`)           |
| D3  | Domain       | wontfix     | "(0)" and the dimming both mean "no upgrade in this slot", which is true; the listed row carries its own "(Not an upgrade)" mark               |
| D4  | Domain       | fixed       | fork `176268e7c` — as CQ3                                                                                                                      |
| S1  | Standards    | fixed       | fork `49836e4e5` — schema matches the strings; Ajv prints `upgrades valid`                                                                     |
| S2  | Standards    | fixed       | fork `fd362cf6b` — as CQ1                                                                                                                      |
| S3  | Standards    | fixed       | `46d382c5` — provenance row records `ENGINE_VERSION` 6 against core's 9                                                                        |
| S4  | Standards    | fixed       | fork `fd362cf6b` — as CQ2                                                                                                                      |
| S5  | Standards    | fixed       | `72b13908` — the new lock `_comment` entry corrects the count to 7                                                                             |
| S6  | Standards    | defer       | `.scratch/carry-forward/issues/626-verify-skips-tab-locale-schema.md` — a missing gate, before this branch                                     |
| S7  | Standards    | fixed       | fork `3393bcb19`; ticket 622 records it (`1519317d`)                                                                                           |
| CQ1 | Code quality | fixed       | fork `fd362cf6b`                                                                                                                               |
| CQ2 | Code quality | fixed       | fork `fd362cf6b` — one `rows: PaneRows` prop                                                                                                   |
| CQ3 | Code quality | fixed       | fork `176268e7c` — a made-up Lightbringer Battlegear chest, id 900001                                                                          |
| CQ4 | Code quality | fixed       | `4a392741`                                                                                                                                     |
| CQ5 | Code quality | fixed       | fork `176268e7c`                                                                                                                               |

## Summary

The branch builds the owner's ruling on 528 (option A) and ticket 614 as
set, and the fork code is correct: marked BiS-list rows reach neither the
slot counts nor the ThatsMyBis export, no row is listed twice, and Set
potential uses effective DPS for both the cutoff and the sort. No existing
upstream wowsims file changed beyond the approved `ui/app/SimTabsSection.tsx`
6/0, the PROVENANCE hashes match, and the `oxfmt` failure on the two ported
engine files predates the branch.

Round 1 found one silent wrong result, in a main-repo harness this branch did
not update (A1: marked rows reported above the cutoff to the desktop gate),
and one broken contract (S1: the locale schema). Both are fixed, with the
smaller findings and the code-quality rows. Round 2 passed with no finding.
D1 and D3 are `wontfix`; D2 and S6 predate the branch and are deferred to
tickets 625 and 626. No finding blocks the merge.

`feat/bis-rows` merges to `dev` as one branch with `feat/flat-cutoff` and
`feat/tab-stage-3t`, so the schema errors on `feat/flat-cutoff`'s own tip
never reach `dev` (session note, 2026-10-11).

Tickets: the skill's commands over `dev...HEAD` give 11 filed and 7 closed,
counting the two branches this one stacks on. This branch's own range
(`git diff --name-status 367b23ef HEAD`) filed 2 (625, 626) and closed 1
(622). Filed is higher than closed on both counts.
