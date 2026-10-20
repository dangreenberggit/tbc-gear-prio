# Pre-merge review — chore/ticket-housekeeping

Reviewed range: `a6f46967dc0fc74d4b5d105f19e45e85f8f1c494..3a80ffa041b8d102274c4cc135930e79487f0975`

Dispatch (round 1): full axes, not the small-change lane.
`git diff --shortstat dev...HEAD` gave `52 files changed, 361 insertions(+),
39 deletions(-)`, which is over the lane's 6-file limit. Every path is a
ticket file under `.scratch/carry-forward/issues/`, with no code. `codex` is
not on PATH (`which codex`, rc=1), so each axis ran as a fresh `general-task`
subagent on Opus (review lane), all three in one parallel batch. The domain
axis ran because the new comments on 43, 88, 89, 119, 259, 276 and 365 make
item and set-bonus claims that decide whether a ticket closes. Each axis was
told it writes nothing. The review was sized to the change: (1) does each
close have a valid `Verified by:`, (2) was any wontfix wrongly closed under
the orchestrator's exception rule (a ticket stays open if its file also
describes what the tab shows, the tab's pool, the fork's copy of the engine,
or whether a gate catches what it claims), (3) does any edit lose a finding.
The fork was read at `vendor/tbc-new-fork` in the main checkout,
`bc3cca6a1`, read-only.

## Adversarial

The pool reasoning for 89, 259 and 276 holds: `selectPool`
(`ui/features/upgrades/model/pool_source.ts`) never asks for a source, and
the Sources filter keeps sourceless items (`settings_pool.ts:53-65,189-193`).
Spot checks 169, 616, 617 (tab version is open ticket 618), 62, 697, 88, 17,
41, 331, 113 (decision), 64, 40, 58, 241, 109, 72, 73, 267, 273, 105, 133,
263, 86, 124 and 365 found the decision correct.

- **A1 — 149 wrongly closed.** The close checked only the WSL clone. The
  frozen Windows clone still registers the three worktrees the ticket says
  carry uncommitted `AGENTS.md` and skill edits, including
  `.scratch/wt-fan-out-retro`
  (`git -C /mnt/c/Users/dgree/Code/lulz/tbc-gear-prio worktree list | grep -iE 'fan-out-retro|wowhead-collection|salvage-docs'`
  lists all three). The axis disclosed one `git status --porcelain` run in
  the salvage-docs worktree, which may have refreshed its index (hypothesis,
  untested).
- **A2 — 262 closed with box 2 unmet.** Of the seven owner-waiting tickets,
  119 (`Type: bug (owner decision required)`) stayed `open`, not `blocked`.
  The comment also gave ticket 270 as an example of a `blocked` ticket,
  though the same commit marks 270 wontfix.
- **A3 — 153's tab half pointed at a gitignored file.** For specs whose
  presets stop at phase 3, the tab tags BiS from phase-3 sets at phases 4–5,
  and the only notice is a `console.info` line (`model/assumptions.ts:36-37`,
  `model/run_session.ts:59`). The comment sent this to
  `.scratch/handoffs/2026-10-19-next-session-handoff.md`, which is not
  tracked, and no open ticket covered it.
- **A4 — 80 comment false.** It said the fork has "the same four unused
  kinds"; `not-implemented` is thrown at `model/run.ts:75` and handled at
  `utils/format.ts:157`, so three are unused.
- **A5 — 89 comment false** (same finding as D1).
- **A6 — bookkeeping.** (a) 35, 63, 87 and 269 stay open only for fork engine
  code that no tab path calls today (no tab code passes `groupBy` or
  `hideOwned`). (b) The wontfix comments cite the untracked
  `.scratch/plans/upgrades-tab-finish-line.md`.

## Domain

- **D1 — 89: the tab admits two of the four weapons per spec, not all four.**
  In `vendor/wowsims/db.json`, 33662 is an off-hand mace (`handType` 3) and
  33762 a sword (`weaponType` 9). Druids and paladins cannot dual-wield
  (`specs/druid.ts:61`, `specs/paladin.ts:104`); druids cannot use swords and
  paladins cannot use staves (`capabilities_auto_gen.ts:24,31`). Feral gets
  33716 and 32014; ret gets 33762 and 32014. The wontfix stands, because the
  missing items are correct game behaviour.
- **D2 — 119 kept open on a false reason.** The fork does not compute
  `bonusDps` the same way as `packages/core`: ticket 492 adds `(n−1)·B2`,
  measured by a pair sim, back into the 4pc at one worn piece, and leaves
  `bonusDpsNet` unset with a disclosure when no pair exists
  (`engine/rank.ts:2371-2411`). That is the "correct" option of 119's open
  owner decision, and no file records the owner choosing it.
- **D3 — 113 treats two builds as one.** The ticket's "web build" is the
  owner's upstream alpha site; the tab runs in the fork's own build. Whether
  the tab matches the alpha is untested. The wontfix stands on the CLI-only
  reason.
- **D4 — 89 and 276: a broken sentence** whose short version of the pool rule
  left out the phase limit and the missing-effects exclusion.

Checked and correct: 276 (five items epic, ilvl 141/146, phase 3, none in
`MISSING_ITEM_EFFECTS`), 43 (epic, ilvl 115, phase 1; `SimItemSpec` has no
suffix field, so armor-only ranking is a fair hypothesis), 259 (idol is rare,
admitted through feralcat presets), 88 (preset names say "BiS 6%"/"BiS 9%"),
86 (`engine/rank.ts:3371` matches; keeping it open is right), 365.

## Standards + Spec

Run through the `code-review` skill unchanged.

**Standards.** 172's close is proven (`pnpm universe-rebuild:check`:
`89 files checked, 0 mismatches`, rc 0). Every wontfix and kept-open ticket
states its reason in a dated comment; every status is an allowed word.

- **S1 — 149's `Verified by:` does not prove the close** (same as A1). Its
  proof is an `ls` that fails, on paths in the WSL clone only.
- **S2 — 262's note gives a false example** (same as A2); its `grep` path
  also works only from the repo root.
- **S3 — 352 closed with two acceptance boxes unchecked**: the procedure lives
  in `known-traps.md`, not `issue-tracker.md`, and the owner's approval of the
  wording is not recorded. The close note says both.
- **S4 — the wontfix notes cite a gitignored plan file** (same as A6b).

**Spec.** All 52 edited files are tickets the brief names; nothing named is
missing; nothing extra was edited. The four closes and 273 match the handoff
(lines 137-144). All nine scope-ruling tickets were read and judged.

- **P1 — 80 kept open but can never move.** Its `Blocked by:` named the
  Warcraft Logs source, which will not be built, and its "What to do" said to
  wait for it.

## Summary

Round 1 found one wrongly closed ticket (149), one close with an unmet box
(262, fixed by setting 119 to `blocked`), one finding moved to an untracked
file (153's tab half, now ticket 699), and false claims in the comments on
80, 89, 113 and 119. No wontfix was found to hide a defect in what the tab
shows, its pool, the fork engine or a gate. All fixes are ticket-text edits in
`64023c2a`.

Round 2 skipped: the only commit after round 1 changes only tickets that this
file's Disposition rows link, plus `NEXT` and `map.md` for filing 699, and
applies bookkeeping fixes. `git log --oneline 3a80ffa0..HEAD` before this
review file was committed:

```
64023c2a Fix ticket edits flagged by the housekeeping review
```

Tickets: filed 1 (699), closed 38 (3 closed, 35 wontfix; 149 reopened).

For the orchestrator: A6a is a judgement call under its own exception rule.
35, 63, 87 and 269 match its words ("the fork's copy of the engine") but no
tab code reaches them today; the owner's scope filter (memory
`feedback-review-findings-scope-filter.md`) would mark them wontfix.

## Disposition

| ID  | Axis        | Disposition | Ticket / note                                                                                                                                                                                    |
| --- | ----------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| A1  | Adversarial | fixed       | `.scratch/carry-forward/issues/149-six-worktrees-still-registered-after-fan-out.md` reopened with a re-runnable command for the Windows-clone worktrees (also S1)                                |
| A2  | Adversarial | fixed       | 119 set to `Status: blocked`; `.scratch/carry-forward/issues/262-tickets-awaiting-an-owner-decision-look-like-unstarted-work.md` example corrected to 119 (also S2)                              |
| A3  | Adversarial | defer       | `.scratch/carry-forward/issues/699-tab-bis-tags-from-an-older-phase-noted-only-in-console.md`; 153's comment now names it                                                                        |
| A4  | Adversarial | fixed       | `.scratch/carry-forward/issues/80-unused-rank-error-kinds-and-bare-error-escape.md`: three of four kinds unused, with fork lines                                                                 |
| A5  | Adversarial | fixed       | same finding as D1                                                                                                                                                                               |
| A6  | Adversarial | wontfix     | (a) the orchestrator's exception rule keeps fork-engine copies open; raised to it in Summary. (b) every scope-ruling wontfix also cites the tracked `PLAN.md:934`; 273 rests on ADR-0026 instead |
| D1  | Domain      | fixed       | `.scratch/carry-forward/issues/89-season-3-pvp-weapons-missing-from-p3-pools.md`: per-spec weapons and why the rest are absent                                                                   |
| D2  | Domain      | fixed       | `.scratch/carry-forward/issues/119-self-set-2pc-multi-charge-at-threshold-minus-1-worn.md`: reason corrected to the 492 correction and the unrecorded owner choice; status `blocked`             |
| D3  | Domain      | fixed       | `.scratch/carry-forward/issues/113-arm-dependent-offset-against-the-wowsims-web-alpha.md`: fork build and alpha site named separately                                                            |
| D4  | Domain      | fixed       | 89 and `.scratch/carry-forward/issues/276-two-membership-questions-the-pool-listing-surfaced.md` sentences rewritten                                                                             |
| S1  | Standards   | fixed       | same finding as A1                                                                                                                                                                               |
| S2  | Standards   | fixed       | same finding as A2; the repo-root `grep` path is the convention for `Verified by:` commands, so left as is                                                                                       |
| S3  | Standards   | wontfix     | 352's close note already says both gaps; the rule it asked for exists and `NEXT` is in use                                                                                                       |
| S4  | Standards   | wontfix     | same as A6b                                                                                                                                                                                      |
| P1  | Spec        | fixed       | 80's `Blocked by:` set to `none`, with a fork-side next step                                                                                                                                     |
