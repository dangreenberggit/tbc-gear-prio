# Pre-merge review — feat/wowsims-catchup-2026-11-09

Reviewed range: `5fa40c5761d38ebf4d1fe10e520e6f79acff33fe..a7c422c1718339c69baf4837b2939e39638a26e1`

Reviewed range: `a7c422c1718339c69baf4837b2939e39638a26e1..05c8be4992598a7db2509d51b58d6aa62d382cd7`

Reviewed range: `05c8be4992598a7db2509d51b58d6aa62d382cd7..c56cee771c3a92d40c903fb7e50522bec7dd8d65`

Fork range (round 1): `3055fa71a..60a4735ea` in `vendor/tbc-new-fork`
(`60a4735ea` merges upstream `24606be6b`, tag v0.0.155).

Owner's ask, 2026-11-09: "move both wowsims pins to v0.0.155". Owner rule:
no change to an existing upstream wowsims file beyond what the merge brings
in, without the owner's approval of that exact edit.

Dispatch (round 1): full axes, because the branch is not a small change
(`git diff --shortstat dev...HEAD`: 52 files changed, 172 insertions, 134
deletions; 49 paths start with `data/`). The tooling check
(`python scripts/check_merge_ready.py --product-files`, rc 0) printed 50
product files: every changed file except the two under
`.scratch/carry-forward/issues/`, which are tickets. `codex` is not on
`PATH` (`which codex` prints nothing), so each axis ran as a fresh
`general-task` subagent on Opus: adversarial, domain, and the `code-review`
skill's Standards and Spec sub-agents, all four in one parallel batch. The
domain axis ran because the fork merge changes the Arcane mage rotation and
the drums pickers, and the branch re-records a mage golden. Each axis was
told it writes nothing. The axes were given the executing agent's report
(`.scratch/agent-reports/2026-11-09-general-task-wowsims-catchup-v0.0.155.md`
in the main checkout) as claims to test.

The dispatching agent checked two points itself before dispatch:
`git -C vendor/tbc-new-fork diff --numstat --diff-filter=M 24606be6b HEAD`
prints only `6 0 ui/app/SimTabsSection.tsx`, and the patch of
`3055fa71a..60a4735ea` equals the patch of `cec2a7b68..24606be6b` (compared
with `index` lines removed). So the merge commit holds no hand edits, and
the fork changes no upstream file beyond what it changed before.

## Adversarial

No correctness defect and no test theatre.

- Fork merge: the adversarial and spec axes each repeated the patch
  comparison above and got the same result. The merge's parents are
  `3055fa71a` and `24606be6b`.
- Locks: `data/wowsims-fork.lock.json` has `commit` `60a4735ea…`,
  `branchedFrom` `24606be6b…` (= upstream `master` = `refs/tags/v0.0.155`,
  `ls-remote`), `pushed` false (`origin` has no catch-up branch), and
  `branch` still `feat/upgrades-tab-react`, the branch that gets the fork
  commit at landing (`docs/agents/upstream-catch-up.md` §7).
- Generated files match their generators at the tip, each rc 0:
  `sync:wowsims:check`, `sim-implemented-effects:check` (226/450),
  `equip-eligibility:check`, `pool-listings:check` (44 lists, 0 drifted),
  `fork-universes:check`. Each of the 44 pool listings changes only line 9.
  `git grep cec2a7b687` at the tip finds no file that still names the old
  engine commit outside history text.
- Mage golden (`3b44d2b7`): check (h) compares `rows`, `aboveCutoffItems`
  and `baselineDps` for exact equality (`scripts/check_desktop_tab.py:604`,
  `GOLDEN_FIELDS` at line 83). So the author's isolation run, in which only
  `ui/specs/mage/dps/apls/arcane.apl.json` put back to its old text made the
  old golden match, is strong evidence that upstream's Arcane change
  explains the whole move. The axis did not repeat that run (it needs a
  working-tree change and a bundle rebuild).
- `docs/fork-upstream-touchpoints.md`: its § How to reproduce commands give
  merge-base `24606be6b`, 265 commits, 8 merges, 1 modified upstream file at
  6/0, 248 added files, 242 of them under `ui/features/upgrades`. All match
  the doc.
- Ticket 866: `npx vitest run ui/i18n/locale_keys.test.ts` in the fork fails
  on exactly the two keys the ticket names. The test comes from upstream
  commit `17d64b721`, an ancestor of `cec2a7b68`, and the fork does not
  change it; the merge changes none of the files involved, so `3055fa71a`
  fails the same way.
- The author did not run the full Go suite. The axis ran
  `GOFLAGS=-buildvcs=false go test --tags=with_db ./sim/...` at `60a4735ea`:
  rc 0, 25 packages ok.

- **A1.** `data/desktop-gate/README.md:75-79` still says "The mage, rogue
  and enhancement goldens are first recordings: the commit that adds them
  names what each covers." After `3b44d2b7` the mage golden is a
  re-recording, and only that commit explains the new values. It changes no
  gate result. Same finding as P1; recorded as CQ1.

Unexamined: `pnpm verify`, the layout gate and the desktop gate were not
re-run (heavy, and the desktop gate rebuilds the fork's `dist/`); their
results are the author's report only. The author's report gives one golden
row swap as places 13↔14; the axis reads 11↔12 in the golden. That is a
counting difference in the report, not in the branch.

## Domain

No contradiction of `docs/stage0-findings.md` or
`docs/verification-log.md`.

- Drums: upstream removed the `CURRENT_PHASE >= Phase4` check that had
  limited the consumables picker to Lesser drums at phase 3; the picker now
  lists all six (`git diff cec2a7b68 24606be6b --
ui/features/settings/model/consumables.ts`). The proto enum values did not
  change (`proto/common.proto:433-441`), and the presets still set
  `Drums.LesserDrumsOfBattle` (for example `ui/specs/mage/dps/presets.ts:186`),
  so default and saved settings keep their meaning. The fork's own changes
  do not mention drums, so the tab does not read either picker itself. In
  the sim, Greater and Lesser drums give the same stats
  (`sim/core/buffs.go:1336-1350`); Greater has a 0 s cast as a consumable,
  Lesser 1 s (`sim/core/consumes.go:673`).
- Mage golden: the gate's mage default is the Simple rotation, which copies
  `arcane.apl.json` (`ui/specs/mage/dps/spec.ts:113,157`), so the APL change
  reaches the gate. Baseline DPS 2794 → 2794.5; the two above-cutoff items
  are unchanged; most rows move by 1.2 DPS or less; the largest move is
  Vengeful Gladiator's Battle Staff at −5.7 DPS. Upstream's own
  `TestArcane.results` moves −0.83% to +0.34% (median +0.06%) across 185
  rows; the golden's changes are within that size.
- `currentPhase`: `CURRENT_PHASE = Phase.Phase3` at `24606be6b`
  (`ui/sim/constants/other.ts`), and the lock still says 3. None of
  upstream's four changed files is among the engine lock's 114 tracked
  paths, so no hash moved.

- **D1** (unverified, not a contradiction). Whether Greater Drums
  (185848/185850/185852) exist in game at TBC phase 3. Only wowsims' allow
  list (`tools/database/overrides.go:323-326`) speaks to it.

Unverified: the cause of the staff's −5.7 DPS move; that the old golden
(which names fork `b71e2508`) matched before the change. Unexamined: WCL
lanes (the diff changes no WCL code).

## Standards + Spec

### Standards

No hard violation. The lock edits follow `docs/agents/upstream-catch-up.md`
§5 and §7 step 2; generated files change only their commit fields
(`git diff --word-diff`); the golden commit body has the reason and the
five recorded lines that `data/desktop-gate/README.md` § Regenerating a
golden asks for; ticket 866 has the five header lines
(`docs/agents/issue-tracker.md` § Carry-forward tickets), and `NEXT` goes
866 → 867 in the same commit (dev's `NEXT` is 866). Subjects are ≤ 50
characters and imperative. No code smell (the diff moves pins and
regenerates files).

- **S1.** `3b44d2b7` body, "the old APL matched": a causal claim with no
  command to re-run and no "hypothesis" label (`~/.claude/AGENTS.md`
  § Durable claims), and it does not say what the old APL matched.
- **S2.** `3b44d2b7` body: the pasted (h) lines are 98–99 characters, past
  commit rule 6 (wrap at 72). The README asks for these lines as printed;
  the axis judged it acceptable.
- **S3.** Ticket 866, "i18next picks the plural form from `count`, so the
  player sees the right text": a causal claim with nothing behind it.

### Spec

Both locks name tag v0.0.155 (`24606be6bae2…`, `ls-remote upstream`); the
fork merge brings exactly upstream's four files; every pin and data check
re-run passes (`sync:wowsims:check`, `equip-eligibility:check`,
`sim-implemented-effects:check`, `pool-listings:check`,
`fork-universes:check`, `meta-conditions:check`, `ep-presets:check`, all rc
0 on node v22.23.2); the touchpoints ledger matches a re-measurement. No
scope creep: ticket 866 records a defect the work found, as the global
"Findings and fixes" rule requires.

- **P1.** Same as A1: `data/desktop-gate/README.md:75-79` calls the mage
  golden a first recording. Recorded as CQ1.

Could not check: the layout gate and desktop gate runs, the §1 two-run
build proof and the APL isolation run (author's report only). The §2
prediction and the §6 tag-trigger result exist only in the gitignored
author's report; the procedure names no committed place for them.

### Found by the dispatching agent

- **B1.** Ticket 866 was filed without its one-line entry in
  `.scratch/carry-forward/map.md`. (Tickets 863 and 864, from `dev`, also
  have none; that is not this branch's.)

## Code quality

| ID  | Where                               | Row                                                                                                                                                                                                                                   |
| --- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CQ1 | `data/desktop-gate/README.md:75-79` | A1 / P1: the sentence calls the mage golden a first recording whose adding commit names what it covers. Say that the mage golden was re-recorded for upstream's Arcane APL change in v0.0.155 and that commit `3b44d2b7` explains it. |

The code-quality pass was made by the agent that wrote this review, not by
a fresh agent, because the coordinator that sent it allowed it to edit
`data/desktop-gate/README.md` for CQ1 only: commit `05c8be49`. Then
`node --version; pnpm verify` printed v22.23.2, `gates: 1608 ran, 0
skipped`, rc 0.

## Focused check (round 2)

Main range `a7c422c1..05c8be49`: `b88d03cd` (round 1's review file, ticket
866 wording for S3, the map line for B1) and `05c8be49` (the code-quality
pass, CQ1). Fork range: empty; the fork lock's `commit` is `60a4735ea…` at
both ends (`git show <c>:data/wowsims-fork.lock.json`). One fresh
`general-task` agent on Opus ran the check.

1. **Conditions 1 to 3: hold.** `b88d03cd` edits only the review file and
   ticket files; `05c8be49` names CQ1 and changes only a doc; the fork range
   is empty.
2. **Fixes change only what each finding asks: yes,** but the CQ1 text is
   wrong (F1).
3. **New tests: none,** which is right for doc and ticket fixes.
4. **Tests the fixes touch: pass.** No check reads the README's text
   (`scripts/check_desktop_tab.py` names it only in message strings and
   reads the golden JSON); `npx prettier --check data/desktop-gate/README.md`
   rc 0.

- **F1.** The new README text said "The rogue and enhancement goldens are
  first recordings". Commit `05cddea6` ("Re-record desktop goldens for
  weapon-damage order", 2026-11-07, on `dev` before this branch) re-recorded
  the enh, rogue and mage goldens (`git show --stat 05cddea6`; the README's
  own line 117 says enh was "re-recorded by the owner on 2026-11-07"). The
  sentence round 1 flagged was already wrong for all three before this
  branch; round 1 saw only the mage part. Checked by the dispatching agent:
  `git log -- data/desktop-gate/golden-<spec>-p4-cap40.json` shows
  `05cddea6` on all four goldens.
- **F2.** The new text stated as fact that upstream's Arcane rotation change
  caused the mage move; the only evidence is the author's isolation run,
  which no reviewer repeated.

Both findings ask only for a wording change in a README that changes no
step, rule or line of code, so under `~/.claude/AGENTS.md` § Review round
limits the review went on without asking: commit `c56cee77` replaces the
sentence with the reviewer's suggested text ("the latest commit that
changes each one (`git log -1 -- data/desktop-gate/golden-<spec>-p4-cap40.json`)
says why its values moved"), and round 3 is the one further round, after
which the review stops whatever it finds.

## Focused check (round 3)

Main range `05c8be49..c56cee77`: one commit, `c56cee77`, which names F1 and
F2 and changes only `data/desktop-gate/README.md`. Fork range: empty (fork
lock `commit` `60a4735ea…` at both ends). One fresh `general-task` agent on
Opus ran the check.

1. **Conditions 1 to 3: hold.**
2. **The fix changes only what F1 and F2 ask: yes.** "First recordings" and
   the stated Arcane cause are gone; the phase-4 sentence before them is
   unchanged.
3. **New tests: none,** which is right for a doc change.
4. **Tests the fix touches: pass.** No check reads the README text
   (`git grep README c56cee77 -- scripts` finds only comments and printed
   messages); `node --version; npx prettier --check
data/desktop-gate/README.md` printed v22.23.2 and rc 0.

The new sentence is true for each golden (`git log -1 c56cee77 --
data/desktop-gate/golden-<spec>-p4-cap40.json`): enh and rogue end at
`05cddea6`, whose message says why their rows moved (weapon damage in the
order; worn items take no cap place) and whose diff leaves their
`baselineDps` unchanged; mage ends at `3b44d2b7`, whose message gives
upstream's Arcane APL change as the reason. No finding.

## Summary

Round 1 found no correctness defect, no test theatre, no domain
contradiction and no gap against the owner's ask. The fork merge holds
exactly upstream's `cec2a7b68..24606be6b` patch and no other change to an
upstream file. Every regenerated file matches its generator, the full Go
suite passes at `60a4735ea` (adversarial axis), and the mage golden's move
is consistent with upstream's Arcane APL change (adversarial and domain
axes).

Round 1's one open finding, CQ1 (a stale README sentence, also A1 and P1),
was fixed in `05c8be49`. Round 2 found the new sentence false (F1, F2: the
rogue and enhancement goldens were re-recorded on 2026-11-07 in
`05cddea6`, on `dev` before this branch). Both were wording-only, so
`c56cee77` applied the round 2 reviewer's text and round 3, the one further
round, passed all four checks with no finding. No finding is open, and none
blocks the merge.

Not counted against the branch: the layout gate and desktop gate were not
re-run by any axis; their PASS results come from the executing agent's
report (the layout run used the headless-shell shim, ticket 861).

Tickets filed: 1 (866). Tickets closed: 0. One ticket was filed and none
closed: 866 records an upstream test's false positive whose fix needs the
owner's approval of an edit to that upstream file.

## Disposition

| ID  | Axis        | Disposition | Ticket / note                                                                                                                   |
| --- | ----------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------- |
| S1  | Standards   | wontfix     | only a history rewrite fixes `3b44d2b7`'s body; the evidence is in this file (Adversarial, mage golden) and the author's report |
| S2  | Standards   | wontfix     | `data/desktop-gate/README.md` § Recording a run asks for the lines as printed                                                   |
| S3  | Standards   | fixed       | ticket 866 now says "should see the right text (untested: no render of the group title was checked)"                            |
| D1  | Domain      | wontfix     | the tab takes item facts from wowsims (ADR-0029, ADR-0038); presets and saved settings keep their drums                         |
| B1  | Bookkeeping | fixed       | 866's line added to `.scratch/carry-forward/map.md`                                                                             |

## Disposition (round 3)

| ID  | Axis          | Disposition | Ticket / note                                                                              |
| --- | ------------- | ----------- | ------------------------------------------------------------------------------------------ |
| CQ1 | Code quality  | fixed       | `05c8be49`, then `c56cee77` (F1, F2); passed round 3                                       |
| A1  | Adversarial   | fixed       | same as CQ1                                                                                |
| P1  | Spec          | fixed       | same as CQ1                                                                                |
| F1  | Focused check | fixed       | `c56cee77`: the README points at each golden's latest commit; true for all three (round 3) |
| F2  | Focused check | fixed       | `c56cee77` removes the unrepeated causal claim                                             |
