# Pre-merge review — feat/tab-scope-refresh

Reviewed range: `c4b81946e916bc4c23b7b4f5f315e8a9a032d377..d9222628988bf664583f5b267038e99c435df3d5`

Reviewed range: `d9222628988bf664583f5b267038e99c435df3d5..5320a823a78a682f7795d5338d20f2c88497ceb3`

Dispatch (round 1): `codex` is not on `PATH` (`which codex` → rc 1). Four
fresh `general-task` agents on Opus (adversarial, domain, standards, spec),
one parallel batch, each told it writes nothing. The branch is not a small
change: `git diff --shortstat dev...HEAD` → 33 files, 769 insertions, 178
deletions. The domain axis ran because the diff re-buckets tickets by their
game effect (set bonuses, DPS specs, item pools). The batch ran twice: the
first was dispatched in the background and the dispatching agent handed
back before it reported, so the coordinator had each axis re-dispatched in
the foreground. Both batches finished; their findings are merged below,
and where two reports of one axis found the same defect it has one ID.
`git diff --quiet dev...HEAD -- data/wowsims-fork.lock.json` → 0, so the
branch never moves the fork pin.

What the branch is: Chunk 3b ("scope-doc refresh") of
`.scratch/plans/upgrades-tab-finish-line.md` (gitignored; main checkout).
It closes tickets the owner signed off or that the React tab made moot,
re-buckets every open ticket in `docs/upgrades-tab-scope.md` under the
owner's DPS-only scope, files tickets 603–607 from a capture of the React
tab, and fixes one line in `docs/agents/upstream-catch-up.md`. No code and
no fork file changes.

## Adversarial

Every sampled closing command reproduces (386, 389, 409, 284, 435, 436,
509, 510; also 425 and 438). Both Maintenance loops print nothing and are
not vacuous: 155 open tickets and 155 rows at `d9222628`.

- **A1 (silent wrong result in the tracker).** Ticket 336's new comment,
  its scope-doc row and judgment call 3 said "Set potential" is on by
  default after a run (`model/results_view.ts:93`). Line 93 is
  `offeredToggles`, which only decides that the toggle is shown. The store
  starts from `NO_VIEW_TOGGLES` (`model/upgrades_store.ts:120`,
  `withSetPotential: false` at `results_view.ts:80`), and the popover adds
  set-potential lines only when the toggle is on (`set_bonus_tip.ts:187`,
  `:197`). The capture showed "+74.1" because its manifest clicks the
  unticked box first. 336 stayed open, so nothing closed on it. **Fixed**
  `f9011f63`; the default view is now named as unchecked.
- **A2 (bookkeeping).** Commit `c5741e2c`'s subject says "no regression",
  but 605 (popover side, ticket-495 ruling) and 604 item 2 ("Other sets",
  ticket-438 pick) are React-port changes to owner rulings. The body limits
  the claim to the eight signed-off tickets 310–330, which is what plan
  step 7 judges. Read the subject as "no regression of the eight
  sign-offs".
- **A3 (missing gate coverage, from before this branch).** The React layout
  gate (`scripts/tab-harness/test-layout.mjs`) has no popover-placement
  assertion (`grep -n -i 'placement\|popover'` → nothing), where the
  pre-React gate's assertion (15) checked it. No ticket asked to restore
  it, so 605's regression could recur unseen. Added to 605's close
  conditions in `f9011f63`.
- **A4 (bookkeeping).** Tickets 604–607 and their `map.md` lines cited
  "findings F1–F6", which no file defines. **Fixed** `f9011f63` (labels
  removed).
- **A5 (bookkeeping).** Committed notes that point at the gitignored plan
  file went from 6 files to 26.
- **A6 (bookkeeping).** Ticket 389 ticked two acceptance boxes ("strings
  agree", "owner has seen the string") that the close made moot, not met.
  **Fixed** `f9011f63`: unticked and marked moot with the reason.
- **A7 (bookkeeping).** Closing 510 left a known capture defect (later
  captures in a hovered `pane: false` entry clip the nav bar,
  `docs/agents/known-traps.md` "Before writing a `pnpm tab-review`
  manifest") with no open ticket. Filed as 608. While filing it: the trap
  entry blames `captureClip` and `window.scrollY`, and neither exists in
  `scripts/tab-harness/test-review.mjs` today (`grep -n
'captureClip\|scrollY'` → nothing), so whether the defect still happens
  is untested; 608 says so.
- **A8 (bookkeeping, already on `dev`).** Row 270 named
  `apps/web/ViewControls.tsx`; the file is
  `apps/web/src/components/ViewControls.tsx` (`git ls-files`). **Fixed**
  `f9011f63`.
- **A9 (bookkeeping).** Seven commits (28178878, eff569d8, 5542a246,
  25ef685a, a0d44a4b, 0803230d, 09a2acdb) flip a `Status:` without editing
  the scope doc in the same commit, against the doc's own Maintenance
  rule. The final state is consistent.

## Domain

No game-mechanic claim in the diff contradicts `docs/stage0-findings.md`,
`docs/verification-log.md` or the fork's sim code. The 376 move holds: the
fork maps all 11 DPS specs (`model/run.ts:43-55`) and the tab's only
`fetch` is `utils/fixture.ts:112`. The findings are row reasons that
understated a ticket's effect or argued from the old ret/feral scope. All
fixed in `f9011f63`; no bucket moved into or out of Tab-blocking.

- **D1.** Row 298 said "tier grouping … Narrow". Its tokens map to
  34444/34556/34573, the same three Thunderheart pieces 500 reports
  missing from feral-p5 (`298-*.md:7`, `500-*.md:15-17`); 500 records both
  as superseded by 505. Judgment call 8 contrasted the two as different
  gaps. Both now say it is the token side of 500's gap; whether 298 moves
  with 500 is put to the owner in Q-blocking-list.
- **D2.** Rows 291 and 297 argued "ret/feral". Nine of the 11 DPS specs use
  ret's untested cutoff (fork `model/engine/cutoff.ts:90-94`). Reasons
  restated for all DPS specs; 291's placement is put to Q-blocking-list.
- **D3.** Row 292 said "never a ranking number". The tab gems candidates
  with `epWeightsFor(specId)` (fork `model/run.ts:114`), one weight set per
  spec, so an off-default variant's candidates get the default variant's
  gems. Restated; whether the gems reach the sim request is marked
  hypothesis, untested.
- **D4.** Row 364 said "Fork engine bug", transport `web`. Ticket 364
  § "provenance: upstream (measured)" says the code is upstream's; row 548
  tags the same file `both`. Row and judgment call 7 now give upstream
  provenance as the reason.
- **D5.** Row 548 stated the size of its effect as fact; the ticket marks
  it hypothesis, untested. Restated.
- **D6.** Row 547 said the tab "never ranks through" item swap. The tab
  merges the player's item-swap set into every sim request (fork
  `model/adapters/sim_database.ts:92`). First clause dropped; the second
  (no spec's `itemSwapSlots` offers these slots) keeps the bucket.
- **D7.** Row 573 sat in Out-of-scope ("unrelated to the tab") while 548,
  the same item-swap proc class, sat in Tab-adjacent, and ticket 573 lists
  what the tab loses without its fixes. Moved to Tab-adjacent next to 548.

## Standards + Spec

### Standards

Line endings, table column counts (every row 4 columns), ticket numbering,
`NEXT` and the `map.md` lines are clean.

- **C1 (bookkeeping).** Subject `0803230d` is 52 characters (limit 50).
- **C2 (bookkeeping).** `c5741e2c`'s body has four lines over 72 columns
  that could wrap.
- **C3 (bookkeeping, durable claims).** Tickets 336 and 604–607 said
  "rebuild with `pnpm tab-review` and that folder's `manifest.json`"; that
  manifest is gitignored (`.gitignore:43`) and exists only in the main
  checkout. 603 gave no rebuild route. **Fixed** `f9011f63`: each now says
  the manifest is gitignored and a re-check needs a new manifest.
- **C7 (bookkeeping).** 572's verify block uses `<main>`/`<fork>`
  placeholders. The plan's step 2b gives those commands in that form.
- C4, C5, C6 are code-quality rows Q1–Q3 below.

### Spec

Against Chunk 3b, steps 1, 2, 2b, 4, 5, 8, 9 and 10 pass their acceptance
commands; step 7 passes with A2's reading. The MISSING set on `dev` is 61
tickets, not the plan's 54, because tickets 595–602 were filed after the
plan; all 61 are bucketed in `949c902c`'s body or closed on the branch
(`comm` of the two lists → no gap).

- **S1 (bookkeeping).** Step 3 asks for "(ticket, bucket, one-line reason)
  in the commit body"; `949c902c` lists ticket and bucket and says
  "reasons in each row". The reasons are in the scope-doc rows, which is
  where Chunk 4 reads them.
- **S2 (bookkeeping).** `d9222628` has no body. Besides filing 603–607 and
  re-checking 336 and 376, it unblocks 418 (`Blocked by:` 417 → none),
  adds a comment to 543, moves 376 to Out-of-scope and rewrites 343 lines
  of the scope doc.
- **S3 (scope creep, accepted).** 284 (it had a row on `dev`), 389 and 409
  were closed beyond step 3's pre-React rule; 418 and 543 got comments.
  Each has a closing note or comment with its check.
- **S4 (bookkeeping).** Judgment call 1 still named closed ticket 268.
  **Fixed** `f9011f63`.
- **S5 (bookkeeping).** Step 7 records 313, 315 and 330 as "pass in
  substance": their 2026-09-18 acceptance sentences quote text the React
  tab no longer renders, replaced through tickets 431, 493, 494 and a
  2026-10-01 ruling. A judgment call for the owner to see.
- **S6 (blocks the merge; no Disposition row).** Step 6 has no owner
  answers: `git log --format=%b feat/tab-scope-refresh ^dev | grep -c
'^Owner:'` → 0 (needs ≥ 4). The Tab-blocking list, the move of 376 out
  of it (step 3 says "336 and 376 stay"), and the placements of 291, 292
  and 298 wait on Q-blocking-list. The plan's first commit (the handoff
  banner on `.scratch/handoffs/upgrades-tab-finish-line-HANDOFF.md`) is
  not on the branch; that file is dirty in the main checkout and waits on
  the owner.
- **S7 (bookkeeping).** Step 7 says each new ticket is "linked from the
  closed ticket's note"; 425 and 438 still said "not checked" about what
  603 and 604 now track. **Fixed** `f9011f63`.

## Code quality

| ID  | Row                                                                                                                                    | Fix                                                                |
| --- | -------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Q1  | Words on the owner's avoid list in text this branch added: "lands" (543, 605), "landed" (judgment call 2, row 503), "carry" (row 418). | `c11dca91`                                                         |
| Q2  | One closing sentence pasted into 425, 435, 436 (variants in 389, 509, 510) as a single unwrapped line of 200+ characters.              | `c11dca91`, wrapped                                                |
| Q3  | The 336 and 376 re-checks were written in three places each (ticket comment, row, judgment call).                                      | `c11dca91`: judgment calls 3 and 7 now point at the ticket comment |

`5320a823` rewraps two judgment-call items; `git diff --word-diff=porcelain
c11dca91 5320a823` shows no changed word.

## Summary

Round 1 found one wrong claim in a committed artifact (A1: "Set potential"
is not on by default), seven row reasons that understated a ticket's effect
or argued from the old ret/feral scope (D1–D7), and bookkeeping. No ticket
was closed on evidence that does not hold. Fixes are in `f9011f63`, the
code-quality pass in `c11dca91`, a rewrap in `5320a823`.

Blocking the merge (S6, no Disposition row until the owner answers): the
step-6 owner questions (Q-blocking-list, Q-push, Q-later-items,
Q-react-review), which include the 376 move and the 291/292/298
placements, and the handoff-banner commit the plan puts first.

Round 2 (focused check) passed all four checks and found three
bookkeeping items, R2-1 to R2-3, fixed with the reviewer's suggested text.
R2-1 corrects A1's fix: the toggle starts unticked only when the page has
no saved choice, because the page saves the view toggles.

Tickets: this branch filed 6 (603–608) and closed 19
(`git diff --name-status dev...HEAD -- '.scratch/carry-forward/issues/*.md'
| grep -c '^A'` → 6; the `Status:` count in the skill's step 3 → 19).

## Disposition

| ID  | Axis         | Disposition | Ticket / note                                                                                                                                                                      |
| --- | ------------ | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | Adversarial  | fixed       | `f9011f63`: 336 comment, row and judgment call 3 now say the toggle starts off (`upgrades_store.ts:120`)                                                                           |
| A2  | Adversarial  | wontfix     | commit message on a reviewed range; the body limits "no regression" to the eight sign-offs, as plan step 7 judges; recorded here                                                   |
| A3  | Adversarial  | defer       | `.scratch/carry-forward/issues/605-set-bonus-popover-opens-left-and-has-no-name.md` — placement assertion added to its close conditions (`f9011f63`); the gap predates this branch |
| A4  | Adversarial  | fixed       | `f9011f63`: F1–F6 labels removed from 604–607 and `map.md`                                                                                                                         |
| A5  | Adversarial  | wontfix     | the plan's rule 1 requires the `Serves:` pointer; the plan lives in the main checkout's `.scratch/plans/` by design                                                                |
| A6  | Adversarial  | fixed       | `f9011f63`: 389's boxes unticked and marked moot                                                                                                                                   |
| A7  | Adversarial  | defer       | `.scratch/carry-forward/issues/608-tab-review-later-captures-clip-the-nav-bar.md` — filed `f9011f63`, row in Tab-adjacent                                                          |
| A8  | Adversarial  | fixed       | `f9011f63`: row 270 path                                                                                                                                                           |
| A9  | Adversarial  | wontfix     | intermediate commits only; the final state passes both loops; history not rewritten                                                                                                |
| D1  | Domain       | fixed       | `f9011f63`: row 298 and judgment call 8; placement put to Q-blocking-list                                                                                                          |
| D2  | Domain       | fixed       | `f9011f63`: rows 291 and 297                                                                                                                                                       |
| D3  | Domain       | fixed       | `f9011f63`: row 292                                                                                                                                                                |
| D4  | Domain       | fixed       | `f9011f63`: row 364 and judgment call 7                                                                                                                                            |
| D5  | Domain       | fixed       | `f9011f63`: row 548                                                                                                                                                                |
| D6  | Domain       | fixed       | `f9011f63`: row 547                                                                                                                                                                |
| D7  | Domain       | fixed       | `f9011f63`: 573 moved to Tab-adjacent                                                                                                                                              |
| C1  | Standards    | wontfix     | commit message on a reviewed range; history not rewritten                                                                                                                          |
| C2  | Standards    | wontfix     | commit message on a reviewed range; history not rewritten                                                                                                                          |
| C3  | Standards    | fixed       | `f9011f63`: 336, 603–607 say the manifest is gitignored                                                                                                                            |
| C7  | Standards    | wontfix     | the plan's step 2b gives these commands with the placeholders                                                                                                                      |
| S1  | Spec         | wontfix     | reasons are in each scope-doc row; coverage of all 61 MISSING tickets checked                                                                                                      |
| S2  | Spec         | wontfix     | commit message on a reviewed range; its contents are listed under S2 above                                                                                                         |
| S3  | Spec         | wontfix     | each extra close or comment has its check in the ticket                                                                                                                            |
| S4  | Spec         | fixed       | `f9011f63`: judgment call 1                                                                                                                                                        |
| S5  | Spec         | wontfix     | a disclosed judgment for the owner; repeated in the merge ask                                                                                                                      |
| S7  | Spec         | fixed       | `f9011f63`: 425 links 603, 438 links 604                                                                                                                                           |
| Q1  | Code quality | fixed       | `c11dca91`                                                                                                                                                                         |
| Q2  | Code quality | fixed       | `c11dca91`                                                                                                                                                                         |
| Q3  | Code quality | fixed       | `c11dca91`                                                                                                                                                                         |

## Focused check (round 2)

Fork range: none (`git diff --quiet dev...HEAD --
data/wowsims-fork.lock.json` → 0). One fresh `general-task` agent on Opus,
told it writes nothing, checked `d9222628..5320a823` plus `5fcea898`
(review file only).

1. **Conditions: pass.** `f9011f63` names its finding IDs in its body,
   `c11dca91` is the Q1–Q3 pass, `5320a823` changes no word (`git diff
--word-diff=porcelain c11dca91 5320a823 | grep -E '^[-+][^-+]'` → nothing),
   `5fcea898` changes only this file. No path outside `.scratch/` and
   `docs/` changed. The fork pin did not move.
2. **Only what the findings ask: pass.** Every hunk maps to a finding; the
   rest of the table diff is Prettier re-padding.
3. **Each fix does what its finding asks: pass**, apart from R2-1 and R2-2.
   The cited fork lines for A1, A3, A7, D1, D3, D4, D5 and D6 were re-read
   at fork `316326a95` and match.
4. **Touched checks pass.** Both Maintenance loops print nothing (156 open
   tickets, 156 rows); `NEXT` is 609; one `608-*` file; `map.md` has its
   line. `python scripts/check_merge_ready.py --review
docs/reviews/feat-tab-scope-refresh.md --branch feat/tab-scope-refresh`
   → "merge-ready: ok" (rc 0).

Findings:

- **R2-1 (bookkeeping).** A1's fix said the toggle starts unticked. The
  store is `{ ...NO_VIEW_TOGGLES, ...restored.view }`
  (`model/upgrades_store.ts:120`) and the page saves the toggles with its
  settings (`:51-54`), so it starts unticked only with no saved choice.
- **R2-2 (bookkeeping).** Ticket 608's title and first paragraph stated
  the defect as true today, while its body says that is untested.
- **R2-3 (bookkeeping).** Rows 291, 292, 298 and judgment call 8 cite
  "Q-blocking-list", which only the gitignored plan defines, without
  saying so.

## Disposition (round 2)

| ID   | Axis          | Disposition | Ticket / note                                                                                |
| ---- | ------------- | ----------- | -------------------------------------------------------------------------------------------- |
| R2-1 | Focused check | fixed       | 336 comment, row 336 and judgment call 3: "unticked unless the page restores a saved choice" |
| R2-2 | Focused check | fixed       | 608 title says "may show"; first paragraph in the past tense, citing 536's clips             |
| R2-3 | Focused check | fixed       | each citation now names step 6 of the gitignored plan                                        |
