# Pre-merge review — feat/worktree-pair

Reviewed range: `35aa31df85299aa9018f1272feda22024a799789..b7548e119dfff7a07e3feb14f3ed881d8c9bbe25`

Dispatch (round 1): four fresh Opus subagents (`general-task`, effort high)
in one parallel batch: adversarial, domain, and the `code-review` skill's
Standards and Spec agents. Each was told it writes nothing. `codex` is not on
`PATH`. The fixes were committed after dispatch in `4ad3361c`; round 2
chains from the recorded `<through-sha>` above.

What the branch is: `pnpm wt:pair` / `pnpm wt:unpair`
(`scripts/worktree_pair.py`), which make and remove a main-repo worktree with
its own fork worktree at `vendor/tbc-new-fork`, so two sessions can work on
different fork branches at once. It also adds pure-logic checks
(`scripts/check_worktree_pair.py`, wired into `pnpm verify`) and
`docs/agents/paired-worktrees.md`. The owner chose this option ("a sounds
ok", 2026-10-10).

## Adversarial

- **A1 (major)** `remove()` deleted a folder whenever it still existed after
  `git worktree remove`, even when git had refused (a locked worktree, or files
  that appeared after the clean-tree check) and kept the registration.
- **A2 (medium)** The unsaved-work check used `git status --porcelain`, which
  hides ignored files. `.scratch/` stage records in a pair would be deleted
  without `--force`.
- **A3 (minor)** A fork folder that exists but is not a registered fork
  worktree was deleted with no work check, even without `--force`.
- **A4 (minor)** A missing `vendor/` input only printed a warning before
  "pair ready". `vendor/wowsims` is copied from the main checkout even when
  the branch's engine lock names another pin.
- **A5 (minor)** The delete decisions, `find_links` and `delete_folder` had
  no automated check.

## Domain

No TBC, WCL or game claims in the diff. The claims about the wowsimcli folder
name, fork gates exiting 2, gate path resolution, launch.json ports and
`merge_to_dev.py:182` match the repo.

- **D1 (medium)** The doc's landing steps did not say which folder each step
  runs in. Re-pinning in the pair fails, because the pair's fork is not at the
  merged commit.
- **D2 (low)** `known-traps.md` said a busy 5173 serves "this same checkout".
  With pairs it may serve another pair's fork.

## Standards + Spec

**Standards**

- **S1 (minor)** A comment used the banned word "Shape".
- **S2 (minor)** The 183-character claim and "three live runs" had no
  command or source a reader could re-run.
- **S3 (minor)** 20 lines over 100 characters, against at most 106 in
  neighbouring scripts.
- **S4 (minor)** Nothing in AGENTS.md or a skill points at the new doc.
- **S5 (nit)** A divider comment said what, not why.
- **S6 (judgement)** The inside-root test was written twice.
- **S7 (judgement)** A `"<unreadable>"` sentinel string and `dict[str, str]`
  worktree entries.
- **S8 (judgement)** The non-Windows branches have no stated need.
- **S9 (nit)** `flag` and two bare booleans in signatures.

**Spec**

- **P1 (minor)** The same gap as A2: ignored files are not checked.
- **P2 (minor)** The same gap as D1: the doc does not say where to re-pin.
- **P3 (minor)** Only `--fork-detached` was run live. The named fork branch,
  `-b` and `--new-fork-branch` were not.
- **P4 (nit)** Extras the spec did not ask for: `--base`,
  `--new-fork-branch`, the Node preflight, two extra unpair refusals.

## Summary

The tool does what the spec asked, and every gate passes in a pair made by
it. The one serious finding, A1, was a delete that overrode git's own refusal.
It is fixed: unpair now refuses a locked worktree before removing either
half, and deletes a leftover folder only once git has dropped its
registration. While fixing S2, the length budget was found to rest on a
wrong measurement. The deepest file is 196 characters below a pair's root,
not 183. The limit is now 55 characters for the root and 23 for the name. One
finding is deferred to ticket 593, because AGENTS.md and skill edits need the
owner's approval.

## Disposition

| ID  | Axis        | Disposition | Ticket / note                                                                                                                                       |
| --- | ----------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | Adversarial | fixed       | `leftover_action` refuses while git still registers the folder; unpair refuses locked worktrees up front (`is_locked`); both live-tested in probe-b |
| A2  | Adversarial | fixed       | `unexpected_ignored` over `git status --porcelain --ignored`; live refusal on `.scratch/stage-gate/probe/brief.md`                                  |
| A3  | Adversarial | fixed       | an unregistered fork or main folder is refused without `--force`                                                                                    |
| A4  | Adversarial | fixed       | warnings are repeated after "pair ready", plus a warning when the branch's engine lock tag differs from the main checkout's                         |
| A5  | Adversarial | fixed       | checks for `leftover_action` and for `find_links` on real junctions in a temp dir                                                                   |
| D1  | Domain      | fixed       | landing steps rewritten with the folder for each step                                                                                               |
| D2  | Domain      | fixed       | sentence added to `known-traps.md` "Before starting the dev servers" and to the doc's Live tab bullet                                               |
| S1  | Standards   | fixed       | comment reworded                                                                                                                                    |
| S2  | Standards   | fixed       | re-run command beside `DEEPEST_BELOW_ROOT`; measured value corrected from 183 to 196; run counts listed in the doc                                  |
| S3  | Standards   | fixed       | every line over 110 characters wrapped                                                                                                              |
| S4  | Standards   | defer       | `.scratch/carry-forward/issues/593-point-agents-at-paired-worktrees.md` — needs owner approval                                                      |
| S5  | Standards   | fixed       | divider removed                                                                                                                                     |
| S6  | Standards   | fixed       | `is_inside` used by both sites                                                                                                                      |
| S7  | Standards   | wontfix     | the entries mirror git's porcelain fields, and the sentinel never leaves `find_links`; a type would add code without catching a bug                 |
| S8  | Standards   | wontfix     | the platform suffix mirrors `cli-wiring.ts` `resolveWowsimcli`; the non-Windows delete keeps the module importable and runnable off Windows         |
| S9  | Standards   | wontfix     | names read clearly at their call sites                                                                                                              |
| P1  | Spec        | fixed       | same fix as A2                                                                                                                                      |
| P2  | Spec        | fixed       | same fix as D1                                                                                                                                      |
| P3  | Spec        | fixed       | probe-b live runs: `-b --new-fork-branch` (93 s), then existing branches (70 s); recorded in the doc                                                |
| P4  | Spec        | wontfix     | each extra serves a spec item: `--base` gives `-b` a start point, the preflight stops a half-made pair on Node 20, the refusals protect work        |

## Round 2

Reviewed range: `b7548e119dfff7a07e3feb14f3ed881d8c9bbe25..b099ad717963e07d421252399d46fadda0c465b0`

Dispatch: the same four axes, fresh Opus subagents, one parallel batch, each
told it writes nothing. No focused check: round 1 had a `major` and two
`medium` findings. Fixes were committed after dispatch in `7d95e795` and in
the commit that records this round; round 3 chains from the
`<through-sha>` above.

### Adversarial (round 2)

A1 and A3 are fixed in the code; A2 and A4 are fixed but each brought a new
problem; A5 was partly fixed.

- **A6 (medium)** Every session in a pair writes ignored files: the run-log
  hook's `.scratch/agent-runs/` and Claude Code's
  `.claude/settings.local.json`; `pnpm verify` writes `coverage/`. The new
  ignored-file check refused all of them, and its "commit or stash" advice
  cannot work for ignored files.
- **A7 (minor)** A folder named `dist`, `vendor` or `node_modules` counted as
  build output anywhere, so `.scratch/dist/` would be deleted unasked.
- **A8 (minor)** Warnings were printed only after "pair ready", so a failed
  run dropped them.
- **A9 (minor)** `delete_folder` and the `remove()` path had no check; the
  junction check ran only on Windows, and CI runs on Linux; a `mklink`
  failure crashed the script instead of failing the check.

### Domain (round 2)

D1 and D2 are fixed for sessions in a pair.

- **D3 (low)** `merge-to-dev --check-only` in the pair can rewrite
  `data/wowsims-fork-layout.lock.json` and leave it uncommitted, which makes
  the next unpair refuse.
- **D4 (low)** `known-traps.md` still told a main-folder session that a busy
  5173 serves its own checkout.
- **D5 (nit)** The landing steps said nothing about `--fork-detached` pairs.
- **D6 (nit)** The re-pin step did not mention the lock's `_comment` history.

### Standards + Spec (round 2)

**Standards**

- **S10 (minor)** Banned words: "lands" in the doc, "carries" in a check
  message.
- **S11 (minor)** A comment called partly made-up porcelain "copied".
- **S12 (minor)** Ticket 593 pointed at a chat report for its wording.
- **S13 (minor)** "four live runs" could not be traced in the doc, and a
  docstring pointed at the wrong place for the re-measure command.
- **S14 (judgement)** The 5173 rule did not say how to check who started it.
- **S15 (judgement)** `leftover_action` returns strings; the unlock hint was
  written twice.

**Spec**

- **P5 (minor)** Nothing showed the rewritten doc sections had the
  `writing-for-agents` review pass.
- **P6 (nit)** Round-2 additions beyond the spec; the junction check writes
  links in a temp dir on every `pnpm verify`.
- **P7 (note)** The same gap as S12.

## Disposition (round 2)

| ID  | Axis        | Disposition | Ticket / note                                                                                                                                                                                                |
| --- | ----------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| A6  | Adversarial | fixed       | run logs are copied to the main checkout first (`keep_run_logs`); `.scratch/agent-runs/`, `.claude/settings.local.json` and `coverage/` count as safe; message says "move them out"                          |
| A7  | Adversarial | fixed       | build-output names count only at the top level or under `apps/*`, `packages/*`; anything else under `.scratch/` is work                                                                                      |
| A8  | Adversarial | fixed       | warnings are printed in the failure path too                                                                                                                                                                 |
| A9  | Adversarial | fixed       | `check_delete_guard_on_real_links` runs `delete_folder` on an escaping tree (refuses, keeps the outside file) and a clean tree (deletes); symlinks off Windows so CI runs it; link creation inside the `try` |
| D3  | Domain      | fixed       | landing step 1 says to commit the layout lock                                                                                                                                                                |
| D4  | Domain      | fixed       | `known-traps.md` sentence now applies to every checkout                                                                                                                                                      |
| D5  | Domain      | fixed       | paragraph on `--fork-detached` pairs                                                                                                                                                                         |
| D6  | Domain      | fixed       | step 4 names the `_comment` history and a dated line                                                                                                                                                         |
| S10 | Standards   | fixed       | reworded                                                                                                                                                                                                     |
| S11 | Standards   | fixed       | comment says which values are made up                                                                                                                                                                        |
| S12 | Standards   | fixed       | ticket 593 quotes both proposed paragraphs                                                                                                                                                                   |
| S13 | Standards   | fixed       | the doc lists the four live removals and the partly made pairs; docstring points at the comment above `PATH_LIMIT`                                                                                           |
| S14 | Standards   | fixed       | the doc gives the PowerShell lookup, marked untested                                                                                                                                                         |
| S15 | Standards   | fixed       | the unlock hint is now written once; the string results stay, as in S7                                                                                                                                       |
| P5  | Spec        | fixed       | review pass done on the rewritten sections; recorded in the `7d95e795` message                                                                                                                               |
| P6  | Spec        | wontfix     | each addition fixes a review finding; the temp-dir link check is the only test of the delete guard on real links, which no pure test can show                                                                |
| P7  | Spec        | fixed       | same fix as S12                                                                                                                                                                                              |

## Round 3

Reviewed range: `b099ad717963e07d421252399d46fadda0c465b0..0f4dcd9cdec2bb7587434552616586fae7936d31`

Dispatch: the same four axes, fresh Opus subagents, one parallel batch, each
told it writes nothing. No focused check: round 2 had a `medium` finding.
Fixes were committed after dispatch in `a42228c2` and in the commit that
records this round.

### Adversarial (round 3)

A6-A9 hold.

- **A10 (minor)** `git status --ignored` folds a pair's `vendor/` into one
  line, so a second fork worktree made inside the pair was invisible to the
  work check and would be deleted by unpair without `--force`.
- **A11 (minor)** `keep_run_logs` could overwrite its own fallback name on a
  second collision.
- **A12 (nit)** `.claude/settings.local.json.bak` counted as safe; run-log
  subfolders were not copied; a broken lock file in `pair` skipped the
  warnings and the partly-made message.

### Domain (round 3)

D3-D6 hold.

- **D7 (low)** "every removal ... four live runs" left out probe-c.
- **D8 (nit)** `_comment` is one string, so "a dated `_comment` line" was
  wrong.
- **D9 (nit)** The new `known-traps.md` sentence had no verb.

### Standards + Spec (round 3)

**Standards** (S10-S12, S14, S15 hold)

- **S16 (minor)** "settings.local.json holds only permission approvals" had
  no source.
- **S17 (minor)** The `remove()` refusal blamed "the work check", which
  `--force` skips.
- **S18 (minor)** "or rerun with --force to discard it" began a new line with
  an unclear "it".
- **S19 (minor)** The same gap as A11, from the check's docstring.
- **S20 (judgement)** `REGENERABLE_*` named files that cannot be
  regenerated.
- **S21 (judgement)** `.scratch/agent-runs` was written three times.
- S13 was only partly fixed: the same gap as D7.

**Spec** (P5-P7 hold apart from P11)

- **P8 (minor)** No live run had exercised the round-3 unpair paths with a
  `pnpm verify` before them.
- **P9 (nit)** The same gap as D7.
- **P10 (low)** Unpair writes into the main checkout and deletes
  `settings.local.json`; the same claim as S16; a rerun could duplicate logs.
- **P11 (low)** Ticket 593 quotes the proposed AGENTS.md and skill wording,
  which the spec said to return in the report.
- **P12 (nit)** A doc line held only the word "and", and the review pass
  had no evidence beyond a commit message.

## Disposition (round 3)

| ID  | Axis        | Disposition | Ticket / note                                                                                                                                       |
| --- | ----------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| A10 | Adversarial | fixed       | `other_worktrees_inside` reads both repos' worktree lists; unpair refuses before removing anything                                                  |
| A11 | Adversarial | fixed       | `keep_run_logs` counts up to a free name and skips a file already copied; the check covers a second collision and a rerun                           |
| A12 | Adversarial | fixed       | `settings.local.json` matches the whole path; run-log subfolders are copied; the setup `except` also catches `ValueError` and `KeyError`            |
| D7  | Domain      | fixed       | the doc counts six live runs and says what git did in probe-c and probe-d                                                                           |
| D8  | Domain      | fixed       | "append a dated sentence to `_comment`"                                                                                                             |
| D9  | Domain      | fixed       | sentence rewritten                                                                                                                                  |
| S16 | Standards   | fixed       | comment cites code.claude.com/docs/en/worktrees and marks the other-keys case as a hypothesis                                                       |
| S17 | Standards   | fixed       | message says the script deleted nothing and to fix what git's message names                                                                         |
| S18 | Standards   | fixed       | "To remove the pair anyway and lose those files, rerun with --force."                                                                               |
| S19 | Standards   | fixed       | same fix as A11                                                                                                                                     |
| S20 | Standards   | fixed       | renamed `DISPOSABLE_*` / `is_disposable`                                                                                                            |
| S21 | Standards   | fixed       | `RUN_LOGS` constant                                                                                                                                 |
| P8  | Spec        | fixed       | probe-d: pair, `pnpm verify` (rc 0), then unpair without `--force`; the run-log copy is covered in a temp dir only, as the doc says                 |
| P9  | Spec        | fixed       | same fix as D7                                                                                                                                      |
| P10 | Spec        | wontfix     | copying the run logs keeps them, which is the hook's purpose; S16's claim is fixed; A11's fix removes the duplicates                                |
| P11 | Spec        | wontfix     | the coordinator asked for the wording as proposals and named no file; the ticket marks it "not yet approved" and AGENTS.md and skills are untouched |
| P12 | Spec        | fixed       | line rejoined; the doc had a second review pass                                                                                                     |
