# Pre-merge review — feat/worktree-pair

Reviewed range: `35aa31df85299aa9018f1272feda22024a799789..b7548e119dfff7a07e3feb14f3ed881d8c9bbe25`

Dispatch (round 1): four fresh Opus subagents (`general-task`, effort high)
in one parallel batch: adversarial, domain, and the `code-review` skill's
Standards and Spec agents. Each was told it writes nothing. `codex` is not on
`PATH`. The fixes landed after dispatch in `4ad3361c`; round 2 chains from
the recorded `<through-sha>` above.

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
