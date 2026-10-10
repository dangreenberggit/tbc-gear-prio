# Pre-merge review — feat/pair-rule

Reviewed range: `8ebd89e6f9013630fbab6d6fb7b6cccf3e97dc19..b4392e63541a6ce659477472910fee403da6801f`

Dispatch (round 1): `codex` is not on PATH (`which codex`), so every axis ran
as a fresh `general-task` subagent on Opus (review lane), in parallel: the
adversarial and domain briefs, the `code-review` skill's Standards and Spec
agents, and an independent `writing-for-agents` check of every changed
agent-facing text by an agent that did not write it. Every axis was told it
writes nothing.

## Adversarial

The guard refuses an absent fork, and the wiring test is real: with the
`forkGuard` call removed from a scratch copy of `run_verify.mjs`, the driver
exited 0 and ran the stub step.

- **A1 (medium; guard passes an incomplete fork)** `run_verify.mjs` accepted
  any folder at `vendor/tbc-new-fork`. A pair whose `npm ci` or `make proto`
  failed (`worktree_pair.py:464-477` prints `FAILED` and leaves it) has the
  folder, so the fork suites (`packages/core/test/fork-engine-harness.ts:43-47`)
  and `check_fork_lint.py:138-145` skip and verify still ends green.
- **A2 (low)** `pnpm run verify:steps` (package.json:15) runs every step with
  no guard.
- **A3 (low)** `TBC_VERIFY_WITHOUT_FORK=1` is accepted even when the branch
  changes fork-derived files such as `data/wowsims-fork.lock.json`.
- **A4 (nit)** `gate-executor.md`: "every later git … command with
  `-C <pair path>`" read literally sends fork commits to the pair's main repo.
- **A5 (note)** A local `GITHUB_ACTIONS=true` (for example from `act`) turns the
  guard off (hypothesis, untested).

Unexamined: `packages/core/src` purity and `RankError` (not touched); a real
CI run; an end-to-end `merge-to-dev`.

## Domain

**Domain: clean.** The diff makes no TBC, WCL or wowsims game-domain claim;
it changes tooling and agent docs only.

## Standards + Spec

### Standards

No hard violations. Commit messages follow the seven rules; mirrors match
(`python scripts/check_skill_mirrors.py`); no banned words in added lines.

- **S1 (low)** `claude-code.md`: the 33-branch count gives a date but no
  command a reader can re-run.
- **S2 (low, judgement)** The "plain worktree has no fork" sentence appears in
  seven files (Duplicated Code / Shotgun Surgery).
- **S3 (nit)** `forkGuard` returns `string | null`; a name like `forkRefusal`
  would say so.
- **S4 (nit)** `run_verify.mjs` repeats `_fork_gate.py`'s `is_dir()` test; its
  comment says so.
- **S5 (note)** AGENTS.md and skill edits need owner approval first; not
  visible from the diff.
- **S6 (note)** "Give the call a 600000 ms timeout" is Claude Code specific.

### Spec

Every spec item is implemented; the five skill mirrors are identical.

- **P1 (minor)** `docs/workflow.md` and the claude-code, cursor and codex
  adapters point at pairs without naming the rule "Fork and tab edits run in a
  pair".
- **P2 (note)** The AGENTS.md rule has clauses the spec summary did not list
  (reviewer lacked the approved text).
- **P3 (note)** The wiring test's "step never ran" check depends on `pnpm`
  being on PATH; the exit-code check catches a missing guard either way.

### Writing for agents (independent check)

The new rule passes the rubric, including its completion criterion (`pair
ready` with no `WARNING` line). Two older passages contradicted it.

- **W1 (medium)** AGENTS.md "The forked tab repo": "fork work happens wherever
  that clone exists" and two relative `git -C vendor/tbc-new-fork ...`
  commands send a subagent to the main checkout's clone.
- **W2 (medium)** `paired-worktrees.md` "Memory." bullet: "Open the session in
  the pair folder" contradicts the rule, which needs a new session only for
  the live tab.
- **W3 (low; rewords approved text)** The rule's "No fork here" bullet repeats
  the first paragraph's "use one only for work that never reads the fork".
- **W4 (low)** The refusal's "prefix `git push` or `pnpm merge-to-dev` the same
  way" has no PowerShell form.
- **W5 (nit)** `gate-executor.md`: the `-C <pair path>` instruction came after
  the `git log -1` it governs.
- **W6 (nit)** `paired-worktrees.md:9-10` repeats the AGENTS.md rule sentence;
  acceptable, because the verify refusal points at this guide.

## Summary

The branch does what the approved package asked. Round 1 found two medium
gaps that are now fixed: an incomplete fork passed the guard (A1), and two
older passages still sent fork work to the main clone or into a new session
(W1, W2). One finding (W3) rewords owner-approved text and waits for the
owner in ticket 594.

## Disposition

| ID  | Axis        | Disposition | Ticket / note                                                                                                                                                      |
| --- | ----------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| A1  | Adversarial | fixed       | 30751cdb: `skipGuard` fails a local run when any gate or test skipped; wiring test with a present but skipping fork, which fails with the `skipGuard` call removed |
| A2  | Adversarial | wontfix     | `verify:steps` is the documented escape hatch (`run_verify.mjs:46-47`); no hook or script calls it                                                                 |
| A3  | Adversarial | wontfix     | The opt-out is a trust-based switch by design (approved package); CI also runs without the fork                                                                    |
| A4  | Adversarial | fixed       | 30751cdb: `gate-executor.md` names `-C <pair path>/vendor/tbc-new-fork` for fork commands                                                                          |
| A5  | Adversarial | wontfix     | A tool that sets `GITHUB_ACTIONS=true` claims to be CI on purpose; the guard follows GitHub's own signal                                                           |
| S1  | Standards   | fixed       | 30751cdb: the count now names its `git for-each-ref` command                                                                                                       |
| S2  | Standards   | wontfix     | Each copy is the minimal pointer the package asked for at the place an agent reads; AGENTS.md holds the rule                                                       |
| S3  | Standards   | wontfix     | The spec names `forkGuard`; its JSDoc states the return                                                                                                            |
| S4  | Standards   | wontfix     | Deliberate; the comment names the Python twin                                                                                                                      |
| S5  | Standards   | wontfix     | The owner approved the package in the coordinating session ("soiunds fine"); W1 and W2 fixes go back to the owner in the hand-off                                  |
| S6  | Standards   | wontfix     | Owner-approved text; other harnesses ignore an inapplicable timeout                                                                                                |
| P1  | Spec        | wontfix     | Those four lines name no rule, old or new; they point at the recipe in `agnostic.md`                                                                               |
| P2  | Spec        | wontfix     | The rule is the owner-approved text, applied verbatim                                                                                                              |
| P3  | Spec        | wontfix     | The exit-code and stderr checks catch a missing guard without `pnpm`; the removal runs failed on them                                                              |
| W1  | Writing     | fixed       | 30751cdb: "fork edits happen only in a pair" and `git -C <pair>/vendor/tbc-new-fork ...`                                                                           |
| W2  | Writing     | fixed       | 30751cdb: the Memory bullet says a pair session is needed only for the live tab                                                                                    |
| W3  | Writing     | defer       | `.scratch/carry-forward/issues/594-merge-duplicate-sentence-in-pair-rule.md`                                                                                       |
| W4  | Writing     | fixed       | 30751cdb: "set it the same way before `git push` or `pnpm merge-to-dev`, which run verify"                                                                         |
| W5  | Writing     | fixed       | 30751cdb: the pair sentence opens step 1                                                                                                                           |
| W6  | Writing     | wontfix     | The guide is where the refusal sends readers; the repeat is deliberate                                                                                             |

## Round 2

Reviewed range: `b4392e63541a6ce659477472910fee403da6801f..abedfe9cff2605a910ff8c3e07e6f280e607ca7d`

Range `b4392e63..abedfe9c` (the round-1 fixes). The focused check did not
apply: round 1 fixed findings labelled `medium` (A1, W1, W2), so condition 1
fails and the three axes ran again, with the independent writing check, as
fresh `general-task` agents on Opus in parallel.

### Adversarial (round 2)

No false failures: every python `skipped --` line means a missing vendor
input, `warn_upstream_drift.py` prints `-- skipped` (not matched), and
vitest 3.2.7 maps `it.todo` to `todo`, not skipped. The `skipGuard` wiring
test fails with the call removed (scratch copy).

- **A6 (low)** The vitest half of `skipGuard` had no test: removing
  `+ vitestSkips.skipped` left all tests green. A half-built fork skips only
  in vitest (`fork-engine-harness.ts:43-46`).
- **A7 (low)** An unreadable vitest report left `skipped=0`, so a local run
  passed on no evidence (ticket 408, defect 4).
- **A8 (low)** The skip failure suggested `pnpm wt:unpair` even in the main
  checkout, where a vitest skip names only the test.
- **A9 (nit)** AGENTS.md:89 "then in the main repo bump" next to
  `git -C <pair>/vendor/...`.
- **A10 (note)** The false-failure hunt found nothing.

### Domain (round 2)

**Domain: clean.** No game-domain claim in the 11 changed files.

### Standards (round 2)

- **S7 (medium)** `.scratch/carry-forward/issues/NEXT` still read `594` after
  ticket 594 was filed (docs/agents/issue-tracker.md "Allocating `<NN>`").
- **S8 (low)** Ticket 594 was `open` with an owner wait in `Blocked by:`;
  the tracker's word is `blocked`.
- **S9 (medium)** 30751cdb edited AGENTS.md ("The forked tab repo"), the
  claude-code adapter and `gate-executor.md` before owner approval
  (AGENTS.md "Writing for agents").
- **S10 (low)** The round-2 `Reviewed range:` line was not recorded before
  dispatch.
- **S11 (low)** "16 failed … on 2026-10-10" named no command.
- **S12 (low)** The opt-out advice disagreed across three places: the guide
  required the restores, the refusal and AGENTS.md did not.
- **S13 (nit)** 30751cdb's body uses finding IDs.
- **S14 (nit)** `exempt`, `MARK`, `SKIP` are terse names.

### Spec (round 2)

The owner-approved rule text is unchanged in this range.

- **P4 (medium)** Same as S7.
- **P5 (low)** Same as S8.
- **P6 (nit)** Same as A9.
- **P7 (low; justified)** The restore sentence matches CI
  (`verify.yml:31,38`); it named no command for "16 failed".
- **P8 (note)** Same as S9.
- **P9 (note)** `skipGuard` is right only if a complete pair has zero skips;
  not run by the reviewer. The author's runs at 30751cdb gave
  `gates: 1530 ran, 0 skipped` in the pair.

### Writing for agents (round 2)

Clean: the adapter and mirror, the Memory bullet, the plain-worktree
sentence, the AGENTS.md "fork edits happen only in a pair" clause.

- **W7 (medium)** The refusal's opt-out hint left out the two restore
  commands, so an agent following it hits 16 failures.
- **W8 (low)** Same as A9.
- **W9 (low)** `gate-executor.md` step 1 did not read as a condition.
- **W10 (low)** The skip failure assumed a pair and had no done-when.
- **W11 (low)** `known-traps.md:42-45` still told agents to run the fork
  suites by hand and record the rc; verify now fails on any skip.
- **W12 (nit)** Ticket 594's proposed text drops "never reads the fork" and
  the restore steps.

## Disposition (round 2)

| ID  | Axis        | Disposition | Ticket / note                                                                                                                                         |
| --- | ----------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| A6  | Adversarial | fixed       | cdf11cef: `skipGuard` takes both counts; a unit test fails a vitest-only skip, and fails when `vitestSkips` is dropped from the sum                   |
| A7  | Adversarial | fixed       | cdf11cef: an unreadable report counts as one skip with its reason; ticket 408 stays open for its other defects and the CI side                        |
| A8  | Adversarial | fixed       | cdf11cef: W10's text; `wt:unpair` only "in a pair whose build did not finish"                                                                         |
| A9  | Adversarial | fixed       | cdf11cef: "then in the pair's main-repo worktree bump"                                                                                                |
| A10 | Adversarial | wontfix     | Not a defect: the hunt found no false failure                                                                                                         |
| S7  | Standards   | fixed       | cdf11cef: `NEXT` is 595                                                                                                                               |
| S8  | Standards   | fixed       | cdf11cef: ticket 594 is `blocked`, `Blocked by: none`                                                                                                 |
| S9  | Standards   | wontfix     | The edits stay on the unmerged branch, and the hand-off lists each one for the owner's approval; any the owner rejects is reverted before a merge ask |
| S10 | Standards   | fixed       | Round 2's `Reviewed range:` line is recorded under "Round 2"; round 3 records its own before dispatch                                                 |
| S11 | Standards   | fixed       | cdf11cef: names the run and quotes its "vitest failures (16)" line                                                                                    |
| S12 | Standards   | fixed       | cdf11cef: the refusal names both restores (W7); the AGENTS.md bullet is owner text and points at the guide; ticket 594 holds its rewording            |
| S13 | Standards   | wontfix     | The commit exists; this review file decodes the IDs                                                                                                   |
| S14 | Standards   | fixed       | cdf11cef: `isExempt`, `MARK_STEP`, `SKIPPING_STEP`                                                                                                    |
| P4  | Spec        | fixed       | As S7                                                                                                                                                 |
| P5  | Spec        | fixed       | As S8                                                                                                                                                 |
| P6  | Spec        | fixed       | As A9                                                                                                                                                 |
| P7  | Spec        | fixed       | As S11; atlasloot is kept because CI restores it too                                                                                                  |
| P8  | Spec        | wontfix     | As S9                                                                                                                                                 |
| P9  | Spec        | wontfix     | Not a defect: the pair runs reported 0 skipped                                                                                                        |
| W7  | Writing     | fixed       | cdf11cef: the hint runs both restores before the opt-out                                                                                              |
| W8  | Writing     | fixed       | As A9                                                                                                                                                 |
| W9  | Writing     | fixed       | cdf11cef: "When your prompt gives a pair path, the pair is the shared checkout"                                                                       |
| W10 | Writing     | fixed       | cdf11cef: the reviewer's text                                                                                                                         |
| W11 | Writing     | fixed       | cdf11cef: the reviewer's text                                                                                                                         |
| W12 | Writing     | defer       | `.scratch/carry-forward/issues/594-merge-duplicate-sentence-in-pair-rule.md` now lists both texts for the owner                                       |

## Round 3

Reviewed range: `abedfe9cff2605a910ff8c3e07e6f280e607ca7d..05aced4c83e70d527434cf45027c540c59d37f85`

Three axes and the writing check ran again (round 2 fixed `medium`
findings S7, W7, so the focused check did not apply), as fresh
`general-task` agents on Opus in parallel.

### Adversarial (round 3)

A7, A8, A9, S7, S8, S11, S14, W7, W9, W10 and W11 are fixed as their rows
say.

- **A11 (low)** The caller's vitest count (`run_verify.mjs:228`) had no
  test: passing `0` left all 13 tests green (scratch-copy mutation).
- **A12 (low)** An unreadable vitest report failed with the skip message,
  whose opt-out hint then let the same run pass with no test evidence.
- **A13 (low)** S12 was marked `fixed`, but the AGENTS.md "No fork here"
  bullet still gives the opt-out without the two restores.
- **A14 (nit)** Ticket 594's "Done when" still said "the text above" though
  it holds two texts.

### Domain (round 3)

**Domain: clean.**

### Standards (round 3)

- **S15 (medium)** 30751cdb..cdf11cef edited AGENTS.md:89 and
  `gate-executor.md` step 1 again before owner approval.
- **S16 (low)** cdf11cef's subject is 52 characters (limit 50).
- **S17 (low)** `agnostic.md:17` (and mirror) gave the opt-out without the
  restores; S12's note claimed the AGENTS.md bullet links the guide, which
  it does not.
- **S18 (low)** Two claims named no re-runnable command: `known-traps.md`
  "ran them all", and cdf11cef's body "failed 16 tests".
- **S19 (minor)** `pythonSkips` / `vitestSkips` named an array and an object
  at the call site and numbers in `skipGuard`.
- **S20 (nit)** An unreadable report became a made-up `skipped: 1`.
- **S21 (minor)** Round 2 had no Summary.

### Spec (round 3)

No fix missing or wrong; the owner-approved rule is unchanged.

- **P10 (nit)** Round 1's range line moved to full SHAs; no finding asked.
- **P11 (note)** Same as A11.
- **P12 (note)** The unreadable-report path had no test.

### Writing for agents (round 3)

W7-W11 fixed; no banned words.

- **W13 (low)** The refusal told every agent to make a pair; AGENTS.md:96
  tells a worker to stop and report.
- **W14 (low)** Same as A14.
- **W15 (nit)** "Without them" in `paired-worktrees.md` could mean the
  opt-out or the restores.
- **W16 (nit)** "without it" in `known-traps.md` had no clear referent.

### Summary (round 2 and round 3)

Round 2 found the guard missed vitest-only skips and unreadable reports,
that ticket 594 broke tracker rules, and that the opt-out advice left out
the restores a plain worktree needs. Round 3 found the vitest path still
untested at the call site and the unreadable-report path still passable
under the opt-out. All are fixed in cdf11cef and 81fec876, except the
AGENTS.md "No fork here" wording (ticket 594, owner's choice) and the
agent-file edits made before owner approval (S9, S15), which the hand-off
lists for the owner. `pnpm verify` in the pair: 1531 ran, 0 skipped at
cdf11cef.

## Disposition (round 3)

| ID  | Axis        | Disposition | Ticket / note                                                                                                                                                          |
| --- | ----------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A11 | Adversarial | fixed       | 81fec876: a fake vitest in the wiring tests; "exits 1 when only a vitest test skips" fails with `vitestSkipCount: 0` at the call site                                  |
| A12 | Adversarial | fixed       | 81fec876: an unreadable report fails the run everywhere, opt-out and CI included; its test fails with the `exitCode`/`return` removed. Ticket 408 notes defect 4 fixed |
| A13 | Adversarial | defer       | `.scratch/carry-forward/issues/594-merge-duplicate-sentence-in-pair-rule.md` (the AGENTS.md bullet is owner text)                                                      |
| A14 | Adversarial | fixed       | 81fec876: ticket 594's "Done when" names both texts and the current bullet                                                                                             |
| S15 | Standards   | wontfix     | As S9: the hand-off lists every agent-file edit made after the owner's approval, for the owner to accept or reject before a merge ask                                  |
| S16 | Standards   | wontfix     | The commit exists on the branch; rewriting it buys nothing                                                                                                             |
| S17 | Standards   | fixed       | 81fec876: `agnostic.md:17` points at the guide's steps; S12's note was wrong, and A13 carries the AGENTS.md half                                                       |
| S18 | Standards   | fixed       | 81fec876: `known-traps.md` names the `gates: N ran, 0 skipped` tail line; the cdf11cef body stays as written                                                           |
| S19 | Standards   | fixed       | 81fec876: `pythonSkipCount`, `vitestSkipCount`                                                                                                                         |
| S20 | Standards   | fixed       | As A12: no made-up count                                                                                                                                               |
| S21 | Standards   | fixed       | This section's Summary covers rounds 2 and 3                                                                                                                           |
| P10 | Spec        | wontfix     | Full SHAs follow the skill's "resolved shas" rule                                                                                                                      |
| P11 | Spec        | fixed       | As A11                                                                                                                                                                 |
| P12 | Spec        | fixed       | As A12                                                                                                                                                                 |
| W13 | Writing     | fixed       | 81fec876: "as a worker, stop and report this to whoever sent you; otherwise make a pair"                                                                               |
| W14 | Writing     | fixed       | As A14                                                                                                                                                                 |
| W15 | Writing     | fixed       | 81fec876: "Without the two restores"                                                                                                                                   |
| W16 | Writing     | fixed       | 81fec876: names `TBC_VERIFY_WITHOUT_FORK=1`                                                                                                                            |
