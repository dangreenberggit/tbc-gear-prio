# Pre-merge review — feat/tab-stage-3t

Reviewed range: `64443dc44f89b8b917ae64ba6714e7108cdc44ec..1c003bdf7fdb56ce6f56fff18410926f6c9d78f4`

Reviewed range: `1c003bdf7fdb56ce6f56fff18410926f6c9d78f4..80a2a8a4b0bc94ead24a00b40187a6be81846b46`

Dispatch (round 1): `codex` is not on `PATH` (`command -v codex` → rc 1).
Three fresh `general-task` agents on Opus (adversarial, domain, and
Standards + Spec through the `code-review` skill, which ran its own two
Opus sub-agents), one parallel batch, each told it writes nothing. The
branch is not a small change: `git diff --shortstat dev...HEAD` → 32 files,
1419 insertions, 372 deletions (before `1c003bdf`). The domain axis ran
because the branch's tickets and PLAN.md boxes state game facts (cutoff
figures, item sources, set pieces and class eligibility).
`git diff --quiet dev...HEAD -- data/wowsims-fork.lock.json` → 0, so the
branch never moves the fork pin. An API rate limit stopped the
Standards + Spec agent after it had delivered its report; no axis was
re-run.

Before dispatch, `1c003bdf` fixed one gap the coordinator named:
`docs/agents/known-traps.md` § "Before moving the wowsims engine pin" used
`<repo>` without defining it, and its `python scripts/sync_wowsims.py` and
`git diff` commands named no folder. The section now defines `<repo>` and
every command names it, as `docs/agents/upstream-catch-up.md` §2 does.
The three axes reviewed that commit.

What the branch is: Chunk 4 of `.scratch/plans/upgrades-tab-finish-line.md`
(gitignored; main checkout): the PLAN.md §14 Stage 3T box set, the
workflow.md and verification-log updates, the ticket-closing
`Verified by:` rule and its check in `scripts/check_merge_ready.py`, owner
rulings recorded in tickets (254 and 311 closed, 305 wontfix, 528 ruled A,
270 moved out of scope, 563 left open), tickets 614–621 filed, 104 and 359
closed, the pair-aware rewrite of `docs/agents/upstream-catch-up.md`,
script hint fixes, and two AGENTS.md edits.

AGENTS.md changed in exactly two places: `git log --format='%h %s'
dev..1c003bdf -- AGENTS.md` lists `dadf56ce` and `0d54d5a6`, each changes
only AGENTS.md (`git show --stat`), and `git diff dev...1c003bdf --
AGENTS.md` has two hunks, one per commit (the "Before catching up to
upstream" paragraph, and loop step 7's "a phase or Stage 3T"). The owner
approved both in chat on 2026-10-11 ("approved"), as the coordinator
reports.

## Adversarial

The new check fails when it should for committed, uncommitted and untracked
closes (the reviewer built a scratch repo to show it). Every closed
ticket's closing text matches the repo: the 104 test command passes, the
254 data command reproduces its quote, and the 311 fork claims hold.

- **A1 (silent wrong result).** `VERIFIED_BY_RE` (`scripts/check_merge_ready.py:111`)
  ended in `\s*[^\s#*]`, and `\s*` crosses newlines, so an empty
  `Verified by:` passed whenever the next line held text, such as the
  ticket's own `Type:` line. Tickets 104 and 359 put the label exactly
  there. **Fixed** `fa0900ff`: the label's value is read from its own line,
  or from the next non-blank line when that is not a heading or a ticket
  header line.
- **A2.** Placeholder values (`TODO`, `none`, `n/a`) passed. **Fixed**
  `fa0900ff`.
- **A3.** `tickets_closed_without_verification` always read the working
  tree, so `--branch X` run from a checkout of another branch judged the
  wrong tickets. No caller passes `--branch` today. **Fixed** `fa0900ff`:
  for a branch that is not checked out, it reads that branch's tip.
- **A4 (ticket text).** 359's evidence said its grep "prints line 85"; at
  the tip it prints 85, 89 and 91. 104 said `grep deltaPct` "finds only"
  `DeltaCell.tsx:29`; it also finds test files. **Fixed** `3b18b3a2`.
- **A5 (missing test).** The git side of the check had no test. **Fixed**
  `fa0900ff`: `check_closing_rule_reads_git` builds a throwaway repo and
  checks committed, uncommitted (CRLF) and untracked closes, a subfolder
  ticket, and the `--branch` path from another checkout.

## Domain

No game or wowsims fact in the branch is wrong in a way that would change
a ranking. The reviewer re-ran the cited figures against fork `316326a95`'s
`db.json`, the tab fixtures and `stage2-close-slamaltman.json`.

- **D1.** The branch disagreed with itself on the cutoff ruling: ticket 615
  and the scope doc say 615 waits on owner ruling Q-cutoff-bar, while
  PLAN.md's Stage 3T note said "no ruling is left to ask here". The ruling
  exists only on `feat/flat-cutoff` (ADR-0037). **Fixed** `3b18b3a2`: the
  PLAN.md note names 615 as blocked here and says `feat/flat-cutoff`
  records the ruling and closes it. The scope-doc rows for 528, 615, 617
  and 618 need reconciling by hand when the two branches meet.
- **D2.** 621 said `canEquipItem` refuses an item "only through" its class
  list; it also refuses by armor and weapon type
  (`ui/sim/proto/items.ts:44-80`). The class lists in 621 stay right.
  **Fixed** `3b18b3a2`.
- **D3.** 619 named only "Vengeful" as a PvP prefix with no season;
  "Merciless" rows (2 in `ret-p3-p2.json`) and plain "Gladiator's" rows
  (feral fixtures) also get none. Spot-checked with `grep` on the
  fixtures. **Fixed** `3b18b3a2`.
- **D4.** 619 wants the tab to print `via` ("arena" or "honor"), which is
  parsed from Wowhead prose (`scripts/assemble_universe.py:2072`) and
  disagrees within one family: 33910 has `arena`, its siblings 33879,
  33880, 33881 and 33893 have `honor` (checked in the fixtures). **Fixed**
  `3b18b3a2`: the ticket says to check `via` before printing it.
- **D5.** 620's ring ids are not in standing order (29307 Friendly, 29306
  Honored). **Fixed** `3b18b3a2`: the ticket says to order by
  `source.standing`.

## Standards + Spec

**Standards.** Commit subjects and bodies follow the seven rules, `NEXT`
and ticket numbers agree, every ticket closed in the range has a
`Verified by:` line, and both AGENTS.md edits read plainly.

- **S1** is A1 seen from the doc: `docs/agents/issue-tracker.md` said the
  script "enforces" that the line names evidence. **Fixed** `fa0900ff`
  (with A1): the doc now says what the script checks, and that the
  reviewer judges whether the value is evidence.
- **S2.** Two hints still named no folder: `worktree_pair.py`'s
  "already exists … run: pnpm wt:unpair" and `sync_wowsims.py`'s
  content-tier follow-up list. **Fixed** `bdb77463`.
- **S3, S4** (code quality): see `## Code quality`.
- **S5.** `known-traps.md` § "Before filing a ticket" falls back to listing
  the directory, which `issue-tracker.md` forbids. Open ticket 352 tracks
  this disagreement.
- **S6.** Commit `7b4d24d4`'s body states a cause ("its Bash cwd resets
  between calls, so cwd-relative commands … wrote the main checkout") with
  no command and no "hypothesis".
- **S7.** Ticket 359 was closed with both acceptance boxes unticked, and new
  ticket text used "lands" and "carries". **Fixed** `3b18b3a2` (359's
  boxes, 619, 621) and `5dbdab4a` (528). The scope doc's new 619 row still
  says "carries".

**Spec** (Chunk 4, plan lines 366–442): the six-box set, workflow.md, the
verification log and both AGENTS.md edits are delivered; the owner
rulings are recorded with the caveat in P2.

- **P1.** The plan asked for two recorded `merge-ready` runs, one failing
  on a ticket closed without the line and one passing after adding it;
  neither was recorded. **Fixed**: the runs are under `## Closing-rule
runs (P1)` below.
- **P2.** Ticket 311 was closed on an owner instruction ("dont just tell me
  to close a ticket. thats idiotic. either do it or provide me with a real
  decision"), while PLAN.md's box 6 said each closed ticket "quotes the
  owner's ruling". **Fixed** `3b18b3a2`: the box now says "ruling or
  instruction"; 311's own note already said "instruction". The reviewer
  also noted that 621 was placed Out-of-scope by the agent, on the owner's
  general 2026-10-08 remark that engine fixes "should be filed away
  separately", not on a ruling about 621.
- **P3** is S1.
- **P4.** The plan file's "Where we are" block and chunk-status row still
  say steps 5–6 await the owner, and its done-condition says 14
  Tab-blocking rows where the branch has 16.
- **P5.** The catch-up guide rewrite, the known-traps edits and the four
  script-hint changes are outside Chunk 4's path list, and the plan's
  "Unlisted work" section does not record them.

## Code quality

| ID  | Where                             | Finding                                                                  | Outcome                                                  |
| --- | --------------------------------- | ------------------------------------------------------------------------ | -------------------------------------------------------- |
| S3  | `scripts/sync_wowsims.py:712`     | `here()` does not say it returns the working folder with forward slashes | renamed `cwd_posix()` in `73d5a8e7`                      |
| S4  | `scripts/worktree_pair.py` `pair` | `pnpm -C "<folder>"` built by hand eight times                           | helper `pnpm_in()` in `73d5a8e7`; printed text unchanged |

One fresh `general-task` agent on Opus made both in one pass;
`corepack pnpm verify` → rc 0 afterwards (its log: 1534 gates ran,
0 skipped).

## Closing-rule runs (P1)

Run on 2026-10-11 at `5dbdab4a` with this review file in place, Node
v22.17.1, against an untracked throwaway ticket
`.scratch/carry-forward/issues/9999-closing-rule-probe.md` (deleted after
the second run). Command both times:
`corepack pnpm -s merge-ready --review docs/reviews/feat-tab-stage-3t.md`.

1. The probe reads `Status: closed` with no `Verified by:` line → rc 1:

   ```
   FAIL: .scratch/carry-forward/issues/9999-closing-rule-probe.md: Status flipped to closed/resolved with no `Verified by:` line after it (docs/agents/issue-tracker.md)
   tickets closed on this branch with no Verified by: line:
     - .scratch/carry-forward/issues/9999-closing-rule-probe.md
   ```

2. The probe gains
   ``Verified by: `python scripts/check_merge_ready.py --self-test` (rc 0)``
   under its Status line → rc 0:

   ```
   no ticket closed on this branch without a Verified by: line
   merge-ready: ok
   ```

## Focused check (round 2)

Range `1c003bdf..80a2a8a4`; no fork range (`git diff --quiet dev...HEAD --
data/wowsims-fork.lock.json` → 0). One fresh `general-task` agent on Opus,
told it writes nothing.

1. **Conditions hold — pass.** Every commit names the round-1 findings it
   fixes (`fa0900ff` A1 A2 A3 A5 S1 P3, `bdb77463` S2, `3b18b3a2` A4
   D1–D5 P2 S7, `73d5a8e7` S3 S4, `5dbdab4a` S7) or changes only this
   file (`80a2a8a4`); every changed code line is at a cited place; the fork
   pin does not move.
2. **Each diff changes only what its finding asks — pass.**
3. **Each new test asserts its finding — pass.** The agent ran the new
   edge cases against `1c003bdf`'s `closed_without_verification`: the A1
   and A2 cases fail there and pass now. It ran
   `check_closing_rule_reads_git` with the old git function swapped in: the
   old one missed the CRLF ticket (A1) and returned `[]` for `--branch`
   from another checkout (A3).
4. **The touched tests pass — pass.** `python
scripts/check_merge_ready.py --self-test` → 36 checks ok; no closed
   ticket on `dev` (18) or on this branch (25) with a label after its
   Status line is flagged by the new rule.

Findings in the lines the fixes wrote:

- **R1 (silent wrong result; A1 fixed in part).** `TICKET_HEADER_RE` is a
  fixed key list. An empty `Verified by:` directly above `Severity:`,
  `Branch:`, `Progress:` or `Note:` (keys this repo's tickets use) still
  passes. Confirmed: `closed_without_verification('Status: open\n',
'Status: closed\nVerified by:\nSeverity: major\n')` → `False`.
- **R2 (silent wrong result; A2 fixed in part).** An empty fenced code
  block, `---` or `(none)` still counts as a value. Confirmed for the empty
  block and `---` (→ `False`).
- **R3 (loud).** A genuine next-line value starting with `#` (`#409's
command …`) or a listed key (`Resolution: …`) is rejected.
- **R4 (bookkeeping).** Ticket 359's `Verified by:` paired `7430c9e5` with
  line 85; at that commit the line is 87. Applied: the line now gives 87
  at `7430c9e5` and 85, 89 and 91 at this branch's tip.
- **R5 (not a defect).** The tree held this file's uncommitted round-2
  `Reviewed range:` line, written before dispatch as the skill says.

R1 and R2 are findings other than bookkeeping, so the review stops here
("Round limit"): no `## Disposition (round 2)` table, and step 4
(`pnpm merge-to-dev --check-only`) was not run.

## Summary

**The review stopped at round 2, and the merge is blocked.** Round 2's
four checks passed, but it found that the A1 and A2 fixes are incomplete:
the `Verified by:` check still passes an empty label above some header
keys (R1) and an empty code block or a lone dash (R2). Both are a check
that passes when it should fail, so under "Round limit" in the
`pre-merge-review` skill they block the merge and there is no third
round. They have no Disposition row: the owner has not allowed a
deferral. R1–R3 are recorded in open ticket
`.scratch/carry-forward/issues/624-verified-by-check-still-passes-some-empty-values.md`;
the owner decides how they are fixed (for example a dedicated pass by a
different writer). R4 (bookkeeping) was applied.

Round 1's other findings are fixed on this branch, apart from S5
(deferred to open ticket 352), S6 (a made commit) and P4–P5 (the
gitignored plan file, reported to the coordinator).

Ticket counts, from the commands in the skill's step 3: filed 9 (614–621
and 624), closed 5 (104, 254, 311 and 359 closed; 305 wontfix). The branch
filed more tickets than it closed.

## Disposition

| ID  | Axis        | Disposition | Ticket / note                                                                                                                                                                 |
| --- | ----------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | Adversarial | fixed       | `fa0900ff`, in part: round 2's R1 found keys it misses (ticket 624)                                                                                                           |
| A2  | Adversarial | fixed       | `fa0900ff`, in part: round 2's R2 (ticket 624)                                                                                                                                |
| A3  | Adversarial | fixed       | `fa0900ff`: `--branch X` from another checkout reads X's tip                                                                                                                  |
| A4  | Adversarial | fixed       | `3b18b3a2`: 359 and 104 evidence text corrected                                                                                                                               |
| A5  | Adversarial | fixed       | `fa0900ff`: `check_closing_rule_reads_git` self-test on a throwaway repo                                                                                                      |
| D1  | Domain      | fixed       | `3b18b3a2`: PLAN.md names 615 as blocked here; scope-doc rows to reconcile when `feat/flat-cutoff` meets this branch                                                          |
| D2  | Domain      | fixed       | `3b18b3a2`: 621 names armor and weapon type                                                                                                                                   |
| D3  | Domain      | fixed       | `3b18b3a2`: 619 names Merciless and plain Gladiator's rows                                                                                                                    |
| D4  | Domain      | fixed       | `3b18b3a2`: 619 says to check `via` before printing it                                                                                                                        |
| D5  | Domain      | fixed       | `3b18b3a2`: 620 says to order steps by standing                                                                                                                               |
| S1  | Standards   | fixed       | `fa0900ff` with A1; issue-tracker.md says what the script checks                                                                                                              |
| S2  | Standards   | fixed       | `bdb77463`                                                                                                                                                                    |
| S3  | Standards   | fixed       | `73d5a8e7` (code-quality pass)                                                                                                                                                |
| S4  | Standards   | fixed       | `73d5a8e7` (code-quality pass)                                                                                                                                                |
| S5  | Standards   | defer       | `.scratch/carry-forward/issues/352-ticket-number-allocation-rule-contradicts-itself.md` — open ticket 352 already tracks the two docs' disagreement                           |
| S6  | Standards   | wontfix     | the commit is made and `feat/flat-cutoff` branched from this branch, so rewriting it would break that branch; the rule applies to later bodies                                |
| S7  | Standards   | fixed       | `3b18b3a2` and `5dbdab4a`; the scope doc's 619 row keeps "carries" because `feat/flat-cutoff` edits the neighbouring rows and a merge conflict there costs more than the word |
| P1  | Spec        | fixed       | runs recorded under `## Closing-rule runs (P1)`                                                                                                                               |
| P2  | Spec        | fixed       | `3b18b3a2`: box 6 says "ruling or instruction"; 621's placement is reported to the coordinator for the owner                                                                  |
| P3  | Spec        | fixed       | same defect as S1, `fa0900ff`                                                                                                                                                 |
| P4  | Spec        | wontfix     | the plan file is gitignored and owned by the coordinating session; reported to it to update                                                                                   |
| P5  | Spec        | wontfix     | same file as P4; reported to the coordinator to list under "Unlisted work"                                                                                                    |
