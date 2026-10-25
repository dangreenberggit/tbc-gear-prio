# Pre-merge review — feat/sandbox-safe-pair-and-rank

Reviewed range: `dba9b59d0cec27c04a0df0377cce282b043be82b..858ea1464aacdae280133b11ce8546712a17f668`

Dispatch note: small-change lane, round 1. `git diff --shortstat dev...HEAD`
gave `3 files changed, 31 insertions(+), 4 deletions(-)`; `git diff
--name-only dev...HEAD` gave `package.json`, `scripts/set_hooks_path.mjs`,
`scripts/worktree_pair.py` (none under `data/`, `vendor/`,
`packages/core/src/`, none `.generated.`). `codex` is not on `PATH`, so one
fresh `general-task` subagent on Opus (review lane) applied the adversarial
brief and the `code-review` skill's Standards and Spec checks itself. Domain
axis skipped: the diff has no game-domain content (git config, a worktree
command line and a script launcher).

Spec: the owner's "Repo yes" for repo changes that let repo commands work
inside the agent sandbox. Intent and evidence:
`.scratch/agent-reports/2026-10-25-environment-stub-files-plan.md`,
`2026-10-25-sandbox-settings-fixes.md`,
`2026-10-25-stub-plan-independent-check.md`. Out of scope: layout harness
Chromium, sandbox settings, web app scripts.

## Adversarial

**A1. `scripts/set_hooks_path.mjs:20-22` — git missing gives exit 1 and no
message.** When `git` cannot be started (not on `PATH`; on Windows, possibly
a `.cmd` shim that `spawnSync` without a shell does not find — hypothesis,
untested), `spawnSync` sets `write.error` and `write.status` is `null`, so the
script exits 1 and prints nothing. The comment at :14-15 says the write
"reports" the "git missing" case; it does not. The old `prepare` ran through
pnpm's shell and printed `git: not found` (rc 127). Re-run:
`cd "$TMPDIR" && PATH=/nonexistent "$(command -v node)" <repo>/scripts/set_hooks_path.mjs; echo rc=$?`
gives `rc=1` and no output (reproduced by the dispatching agent). Effect: a
loud failure (non-zero exit) that this branch made worse by dropping the
reason. Fix: print `write.error.message` (and `current.error` if set) to
stderr before exiting, and make the comment match.

Checked and not defects (reviewer's temp repos under `$TMPDIR`,
`GIT_CONFIG_NOSYSTEM=1`; git 2.34.1):

- `prepare`, old vs new: fresh clone (unset) → both set `.githooks`, rc 0;
  value already right → new script does not write (inode and mtime
  unchanged), old always wrote; wrong value → both rewrite; not a git repo →
  both rc 128 with the same `fatal` message; read-only config with the right
  value → new rc 0, old rc 255; read-only config with a wrong value → both
  rc 255. CI uses a fresh clone (no CI run read — hypothesis, untested).
  Windows: Git for Windows installs `git.exe`, found by `spawnSync`; the only
  difference is A1.
- `--no-track`: only a remote-tracking start point (`origin/dev`) writes
  `branch.<name>.remote/merge` without it; local branch and SHA start points
  write nothing either way (also with `branch.autoSetupMerge=always` for the
  SHA case). The lost upstream would be `origin/dev`, which with the default
  `push.default=simple` makes a plain `git push` refuse and `git pull` merge
  `dev`. Nothing in the repo relies on it: `docs/agents/paired-worktrees.md`
  never mentions push, upstream or `--base`, and `scripts/merge_to_dev.py:405`
  pushes with an explicit `git push origin dev`. Push itself was not run (the
  sandbox blocked it).
- `rank` via `node --import tsx`: same exit codes and argv;
  `packages/core/src/cli.ts:517-518` compares `process.argv[1]` with
  `import.meta.url` and still matches (no args → usage, rc 2). `tab-fixtures:check`
  (`package.json:77`) already uses this form.
- Owner rule "no narrow heuristic patches": not broken. The `prepare` script
  reads the current value (the direct signal); `--no-track` removes the
  write that caused the failure.
- `python scripts/check_worktree_pair.py`: 27 checks, rc 0. It tests helpers,
  not `pair()`'s command lines; a test asserting `--no-track` is in the list
  would test internal structure, so none is asked for.

## Domain

Skipped (see dispatch note).

## Standards + Spec

**S1. Commit `5fbf5f29` (`package.json:22`) — no record of why `rank` uses
`node --import tsx`.** `package.json` takes no comments and the commit has no
body. The reason: the `tsx` command-line wrapper opens an IPC pipe that the
sandbox's seccomp filter blocks (`listen EPERM ... tsx-1000/3.pipe`), and the
`--import` loader does not
(`.scratch/agent-reports/2026-10-25-sandbox-settings-fixes.md:23,58`).
Bookkeeping; recorded here so a later `git log -S 'node --import tsx'` reader
can find it.

**S2. `scripts/worktree_pair.py:551-553,562` — the comment covers both
`worktree add` calls, but `--no-track` only has an effect on the main-repo
call.** The fork call's start point is always `pin`, a SHA from the lock
(:537), and a SHA never sets up tracking. Code quality (see below).

**S3. `scripts/set_hooks_path.mjs:2-6`, `scripts/worktree_pair.py:551-553` —
the comments state the sandbox cause with no case a reader can re-run**
(AGENTS.md § Durable claims). Code quality (see below).

**Spec: clean.** The plan's repo changes 4b (`--no-track`) and 4c (`node
--import tsx`) are done; 4d was dropped and 4a made low priority by
`2026-10-25-stub-plan-independent-check.md:105-108`. The `prepare` change is
not in the plan's list but fixes the failure that was seen (`pnpm install`
running `prepare` in a worktree), which is inside "repo changes that let repo
commands work in the sandbox".

Worker claims: the three-case `set_hooks_path.mjs` proof was reproduced, plus
three more cases (not a repo, read-only config with the right value, git
missing). `wt:pair` reaching `pair ready in 53s` and `pnpm verify` rc 0 with
1561 gates were not re-run — hypothesis, untested. The `pair ready` run used a
SHA base, so it exercised the `prepare` change, not `--no-track`.

## Code quality

| ID  | Row                                                                                                                                                                                                                                                      |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S2  | `scripts/worktree_pair.py:551-553,562`: drop the fork-side `--no-track`, or say in the comment that it applies to the main-repo call and the fork flag only keeps the two calls alike.                                                                   |
| S3  | `scripts/set_hooks_path.mjs:2-6`, `scripts/worktree_pair.py:551-553`: name the case where the read-only `.git/config` was seen (for example "running `pnpm wt:pair` from a sandboxed session started in the main checkout"), or mark the cause untested. |

## Summary

Round 1 found no data loss and no silent wrong result. Open, and blocking the
merge until fixed on this branch:

- **A1** (fix before merge, loud failure this branch made worse): one-line
  stderr message in `scripts/set_hooks_path.mjs` plus a matching comment.
- **S2, S3** (code quality): one code-quality pass on the rows above.

S1 is bookkeeping and is recorded above. After the A1 fix and the
code-quality pass land, round 2 (focused check) runs; it cannot be skipped,
because both are code changes. Tickets filed by this branch: 0; closed: 0.

## Disposition

| ID  | Axis      | Disposition | Ticket / note                                                             |
| --- | --------- | ----------- | ------------------------------------------------------------------------- |
| S1  | Standards | fixed       | Reason recorded in this file's Standards + Spec section, with its source. |
