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

Round 2 (see `## Focused check (round 2)`): A1, S2 and S3 are fixed with no
new defect. The 4a change (`format:check` over tracked files) is correct but
cannot pass round 2: it fixes no finding named in this file (condition 1),
and it adds a performance cost that this branch introduced and that a
cheaper form avoids (**R2-P1**, below). Under "Round limit" the review stops
here.

R2-P1 is fixed in `3eef8341`: `scripts/format_check_tracked.mjs` passes
prettier the 36 tracked top-level entries in place of every tracked file.
Measured in the main checkout with the sandbox mounts in place: the
`--log-level debug` file list is the same 492 files as `3229d5ab`'s script
(`diff`: no output); a mis-formatted tracked file gives rc 1, a clean tree
rc 0 with no EACCES; two warm runs take 2.09 s and 2.09 s against 6.19 s and
6.34 s for `3229d5ab`'s script and 2.01 s and 2.06 s for
`prettier --cache --check .`; `pnpm verify` rc 0, `gates: 1561 ran, 0
skipped`. Nothing open in this file blocks the merge. Because the owner ruled
out a third round, the owner decides whether this fix gets its own review.
Tickets filed by this branch: 0; closed: 0.

## Disposition

| ID  | Axis      | Disposition | Ticket / note                                                             |
| --- | --------- | ----------- | ------------------------------------------------------------------------- |
| S1  | Standards | fixed       | Reason recorded in this file's Standards + Spec section, with its source. |

## Focused check (round 2)

Reviewed range: `858ea1464aacdae280133b11ce8546712a17f668..3229d5ab60d34ee1a46ec15ee0799023cc09bb98`

Fork range: none. `git diff --quiet dev...HEAD -- data/wowsims-fork.lock.json`
exits 0, so the branch never moves the fork pin; condition 3 holds.

Dispatch note: one fresh `general-task` agent on Opus (review lane) ran the
check itself; `codex` is not on `PATH` (round 1 dispatch note). It wrote only
this file.

Commits in range: `f0f2a42f` (this file only), `96d2f250` (A1), `64c2fad9`
(S2), `57315d69` (S3), `3229d5ab` (4a).

### Conditions

1. **Fails for `3229d5ab`.** A1, S2 and S3 name their round-1 finding. `4a`
   is a plan item (`.scratch/agent-reports/2026-10-25-stub-plan-independent-check.md:105`),
   not a finding in this file; the session added it after round 1 reproduced
   prettier EACCES on untracked sandbox mounts in the main checkout.
2. Holds for A1, S2, S3: every changed line is at
   `scripts/set_hooks_path.mjs:1-30` or `scripts/worktree_pair.py:551-563`,
   which A1, S2 and S3 cite. `3229d5ab` changes `package.json:18` and adds
   `scripts/format_check_tracked.mjs`, which no finding cites.
3. Holds (no fork pin move).

### The four checks, for A1, S2, S3

1. Conditions: see above.
2. Each diff changes only what its finding asks for.
   - A1 (`scripts/set_hooks_path.mjs:14-29`): re-run
     `cd "$TMPDIR" && PATH=/nonexistent "$(command -v node)" <repo>/scripts/set_hooks_path.mjs; echo rc=$?`
     now prints `set_hooks_path: could not run git: spawnSync git ENOENT`,
     rc 1. The comment at :14-17 matches the code. When `current.error` is
     set, the write is still tried before the message; it cannot start
     either, so the result is the same (checked, not a defect).
   - S2 (`scripts/worktree_pair.py:562`): the fork `-b` call has no
     `--no-track`; its start point `pin` (:537) is a SHA from the lock.
   - S3 (`scripts/set_hooks_path.mjs:2-8`, `scripts/worktree_pair.py:551-557`):
     both comments name the case (a sandboxed session started in the main
     checkout), the error text, and the date. The worktree_pair comment also
     says why the fork call needs no flag.
3. No new tests; none are asked for (round 1: a test that `--no-track` is
   in the argv would test internal structure).
4. `python scripts/check_worktree_pair.py`: 27 checks, rc 0. `pnpm verify`
   on `3229d5ab`: rc 0, `gates: 1561 ran, 0 skipped`, 142 s wall.

### 4a (`3229d5ab`), checked although condition 1 fails

Correct for what it does. Evidence (temp repos under `$TMPDIR`, running the
repo's script with the temp repo as the working directory):

- Exit codes: an unformatted tracked `.ts` gives rc 1 and prettier's
  `[warn]` line; formatted gives rc 0; not a git repo gives rc 1 and
  `format_check_tracked: git ls-files failed: fatal: not a git repository`;
  `PATH=/nonexistent` gives rc 1 and `spawnSync git ENOENT`. A prettier
  error (rc 2) wins over rc 1 through `Math.max` (:65, read, not run).
- A tracked file deleted in the working tree is skipped (rc 0). An
  unreadable untracked `.zshrc` (mode 000) is not touched.
- Same files as the old command for tracked files: `prettier --check
--log-level debug`, listing each `resolve config from` path, gives 504
  files for `prettier --check .` and 492 for the explicit tracked list. The
  12 extra are all untracked: the 11 sandbox mounts plus
  `.devflow/log/hooks.jsonl`. No tracked file is in one list only. The repo
  has no tracked symlinks or submodules (`git ls-files -s` mode
  120000/160000: none), so the `isFile()` filter drops nothing tracked.
- `.prettierignore` and `.gitignore` still apply: prettier 3.9.6 applies its
  default ignore paths to explicit file paths (the 492 excludes `data/`,
  `.scratch/`, `.claude/`).
- Cache: `--cache` with the default location, as before.
- Windows batching: 30,000 characters of paths per run, plus the node and
  prettier paths and flags, stays under the 32,767-character limit; the
  paths are counted in UTF-16 units, as Windows counts them. Not run on
  Windows — hypothesis, untested. Linux: tracked paths total 232,920 bytes,
  well under `ARG_MAX`.
- The trade-off is stated at `scripts/format_check_tracked.mjs:6-7`:
  untracked files are not checked by `verify`; `.lintstagedrc`
  (`"*": "prettier --ignore-unknown --write"`) formats every staged file at
  commit, and CI's clean clone has no untracked files, so no unformatted
  file reaches a commit through this gap.

**R2-P1 (performance, introduced by this branch; blocks the merge unless
the owner allows a `defer`).** The explicit list of 3,836 paths makes the
check about 3.5 times slower for the same files. Warm cache, main checkout,
two runs each: `node scripts/format_check_tracked.mjs` 6.72 s and 6.65 s;
`prettier --cache --check .` 1.92 s and 1.83 s (it fails rc 2 on the mounts
but checks every other file). That is +4.8 s on a 142 s `pnpm verify`, about
3%. The owner's words, "I don't want to run long slow code to test code that
isn't changed" (`.scratch/stage-gate/tab-checks-without-sims/brief.md:7`),
were about live sims, but this cost is the same kind: extra time spent
re-checking unchanged files, and a cheaper form removes it.

Cheaper form, measured: pass prettier the top-level entries that git tracks
(`git ls-files | cut -d/ -f1 | sort -u`, 36 entries) in place of every file.
Two runs: 1.90 s and 1.85 s, rc 0, in the main checkout with the mounts in
place. Its debug file list is the same 492 files as the explicit list
(`diff` of the two lists: no output). It copies no `.prettierignore` rule,
needs no Windows batching (36 arguments), and still checks untracked files
inside tracked folders, as the old command did. The only loss against the
old command is untracked entries at the repo root, which is where the
mounts are. Risk: a future unreadable mount inside a tracked, not-ignored
folder would fail again; today the only nested mounts are under `.claude/`,
which `.prettierignore` covers (measured: rc 0). Suggested change: in
`scripts/format_check_tracked.mjs`, reduce `files` to the unique first path
component of each tracked path, keep the existence filter on that entry
(`lstatSync` file or directory), and drop the batching block (:37-50).

## Disposition (round 2)

| ID    | Axis        | Disposition | Ticket / note                                                                                                                                                                                         |
| ----- | ----------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1    | Adversarial | fixed       | `96d2f250`: `scripts/set_hooks_path.mjs:24-28` prints `could not run git: <error>` to stderr and exits 1; re-run with `PATH=/nonexistent` shows the message.                                          |
| S2    | Standards   | fixed       | `64c2fad9`: fork-side `--no-track` dropped (`scripts/worktree_pair.py:562`); `57315d69` comment says why the fork call needs no flag.                                                                 |
| S3    | Standards   | fixed       | `57315d69`: both comments name the re-runnable case and error text (`scripts/set_hooks_path.mjs:2-8`, `scripts/worktree_pair.py:551-557`).                                                            |
| 4a    | Session     | fixed       | `3229d5ab`: prettier EACCES on untracked sandbox mounts (reproduced in round 1) fixed by `scripts/format_check_tracked.mjs`; correct for tracked files. Its cost is R2-P1 above.                      |
| R2-P1 | Performance | fixed       | `3eef8341`: `scripts/format_check_tracked.mjs` passes the 36 tracked top-level entries; same 492 files as `3229d5ab` (`diff` of the `--log-level debug` lists: none), warm run 2.09 s against 6.19 s. |
