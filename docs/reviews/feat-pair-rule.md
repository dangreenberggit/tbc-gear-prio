# Pre-merge review — feat/pair-rule

Reviewed range: `8ebd89e6..b4392e63`

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
