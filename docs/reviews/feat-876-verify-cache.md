# Pre-merge review — feat/876-verify-cache

Diffed against: `0e54ad58...3d2f6e04` (origin/dev at the start; 6 files,
+1280 −6). The review's fix is `40165b8b` (`scripts/verify_cache.mjs`,
`scripts/verify_cache.test.mjs`). No fork change; the pair's fork stays
detached at `1410a775e`.

What the owner asked for (2026-11-12, ticket 876), after hearing that the full
suite ran 8-10 times per branch: "that sounds like potentially too many
repetitive tests am i crazy", then "yeah there at least should be some kind of
caching or pre-passing of tests that have already passed with all the same
info". Asked "Build the verify cache now, on its own branch?", the owner said
"yes".

Reviewers, each with no part in writing the branch:

- Adversarial, standards and spec: one Opus `general-task` (the agent that ran
  this skill). Four read-only GLM helpers listed what the verify steps read:
  git calls, paths the key leaves out, the clock, the network, Python packages
  and programs, and the fork side. I checked each claim I use below against
  the file it names.
- Domain: not run. The diff has no game, WCL or wowsims content.
- Fix check (step 3): one fresh `glm-flash-task`. Its logs are under
  `.scratch/agent-reports/2026-11-12-pmr876-*` in the pair (gitignored).

## Summary

The cache works, and its design is sound, with one real false pass. The key
skipped every ignored file under `.claude/` and every `__pycache__` folder,
but `mirrors:check` compares every file under `.claude/skills` and
`.agents/skills`, ignored ones included. With a stray `.pyc` in a skills
folder, `mirrors:check` failed and `pnpm verify` printed `verify: cached` and
exited 0 (A1, shown live below). Two smaller faults: a stamp that could not be
written crashed a green run (A2), and the miss line's "since the last pass
here" could name changes that a later pass already covered (A3). All three are
fixed test-first in `40165b8b`. Hashing `.env` stays (A4): vitest reads that
file on every run, and no byte of it leaves the process. Nothing in the 1280
lines can be deleted without losing a guard.

## Verify

At the branch tip before the review, `node --version; TBC_VERIFY_FRESH=1 pnpm -C /home/daniel/Code/lulz/tbc-wt/t876 verify; echo "rc=$?"`
(log `.scratch/agent-reports/2026-11-12-pmr876-verify-1.log` in the pair):

```
v22.23.2
verify: cache not read -- TBC_VERIFY_FRESH is set; running in full.
gates: 1735 ran, 0 skipped
verify: pass stamp written to /home/daniel/.cache/tbc-gear-prio/verify-pass/fb7787610c4e19d2319054d66a939f5b792acdb16b0075f7f0fda19330fa667f.json
rc=0
```

At `40165b8b`, the same command with `TBC_VERIFY_FRESH=1`, run by the step-3
agent (log `.scratch/agent-reports/2026-11-12-pmr876-verify-2.log`):

```
v22.23.2
verify: cache not read -- TBC_VERIFY_FRESH is set; running in full.
gates: 1741 ran, 0 skipped
verify: pass stamp written to /home/daniel/.cache/tbc-gear-prio/verify-pass/f7ccdf27dbf112a21b12f8a34171852b5a6cbf8fceee022d92ed0470ac86e69b.json
rc=0
```

1741 is 1735 plus the review's six new tests.

## Fix check (step 3)

The step-3 agent copied the new `scripts/verify_cache.test.mjs` next to the
module as it was before the fix (`git show 3d2f6e04:scripts/verify_cache.mjs`)
and ran it, then did the same with the fixed module:

| Test                                                                   | Before (`3d2f6e04`) | After (`40165b8b`) |
| ---------------------------------------------------------------------- | ------------------- | ------------------ |
| moves with 'a \_\_pycache\_\_ file in .agents/skills/'                 | fail                | pass               |
| moves with 'a \_\_pycache\_\_ file in .claude/skills/'                 | fail                | pass               |
| moves with 'an ignored editor file in .claude/skills/'                 | fail                | pass               |
| compares with the last stamp, and says so, when a later pass left none | fail                | pass               |
| keeps a green run green when the stamp cannot be written               | fail                | pass               |
| never prints or stores the bytes of .env or a keyed variable's value   | pass                | pass               |
| whole file                                                             | 5 failed, 70 passed | 75 passed          |

The last row is a guard for question 2, not a fix, so it passes both times.

## What the gates read, against the key (question 1)

Each input the builder left out, checked against what the verify steps read:

| Left out                                         | What reads it under verify                                                                                                                                                                                                                                                              | Verdict                  |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| Ignored files under `.claude/`                   | `mirrors:check` reads every file under `.claude/skills` (`scripts/check_skill_mirrors.py:20`). Nothing else: eslint ignores `.claude/**`, vitest excludes `.claude/worktrees`, and no script or test reads the rest                                                                     | false pass, A1           |
| `__pycache__/`                                   | `mirrors:check` reads it under both skills folders (`check_skill_mirrors.py:20-21`; `.gitignore:3` ignores `__pycache__/` there too). Elsewhere only Python, which checks each `.pyc` against its source                                                                                | false pass in skills, A1 |
| `*.tsbuildinfo`                                  | `tsc --build`. Its diagnostics follow the sources, which are keyed                                                                                                                                                                                                                      | sound                    |
| Ignored files under `.scratch/`                  | none: every `.scratch` hit in the verify scripts and tests is a temp fixture or a path used only outside verify; vitest and eslint exclude the folder                                                                                                                                   | sound                    |
| `PATH`, `GIT_EXEC_PATH`                          | the programs verify runs are python, node, pnpm and git (versions keyed), the fork's oxlint, tsc and vitest from its `node_modules` (keyed by `.package-lock.json`), `sh` for the hook test (`check_gate_git_env.py:106`), and `gh` only in `upstream-drift:warn`, which always exits 0 | sound                    |
| `npm_*`, `PNPM_*`, `INIT_CWD`                    | pnpm reads `npm_config_*` as settings for each `pnpm run <step>`. `node-options` reaches `NODE_OPTIONS` in run_verify's own environment, which is keyed; other settings such as `script-shell` are not                                                                                  | Note N1                  |
| Other `GIT_*`                                    | the local ones turn the cache off (`cachePolicy`); `GIT_CONFIG*` reaches the key through `git config --list`                                                                                                                                                                            | sound                    |
| Values of the sandbox's git proxy and credential | no verify git call fetches. Outside temp repos the gates run only `git ls-files -z` here (`format_check_tracked.mjs:16`) and `rev-parse HEAD`, `ls-tree` and `show` at the pin in the fork (`check_sim_implemented_effects.py:79-90`)                                                   | sound                    |
| Installed files under `node_modules/`            | every node step. Equal install records give equal files from pnpm's content-addressed store, except after a hand edit inside `node_modules` (hypothesis, untested; the builder's stated limit)                                                                                          | Note N2                  |
| The fork's `dist/`, `binary_dist/`, `wowsim*`    | none: no verify script or fork test file names them (`rg "dist/\|binary_dist\|wowsimtbc\|wowsimcli\|\.wasm"` over the fork test set; the `vite.config.mts` hits are dev-server code)                                                                                                    | sound                    |
| The clock                                        | no verdict depends on it. `sync_wowsims.py:748` writes today's date into a temp lockfile that no check compares; `check_desktop_tab.py` is not a verify step                                                                                                                            | sound                    |
| The network                                      | only `upstream-drift:warn`, which exits 0 on every path (`warn_upstream_drift.py:13-47`)                                                                                                                                                                                                | sound                    |
| Python packages                                  | none: every import in the 54 Python files verify runs is the standard library or a sibling script (an AST scan)                                                                                                                                                                         | sound                    |

**One checkout's stamp in another.** The key has no checkout path, so a stamp
from the main checkout satisfies a pair with the same inputs, and the hit line
names where it passed. That is sound because no verify step reads the
checkout's path, its own refs, or files outside the checkout and the fork
other than git's config (keyed). A search of the test files for checkout path
literals found only package names. The fork's git objects are read only at
the pin, and every green run has fork HEAD equal to the pin
(`_fork_gate.py:103-106` fails `fork-tests:check` otherwise), with fork HEAD
keyed.

**Two runs at once.** A stamp is written to a temp file and renamed, so a
reader never sees half a stamp. Sandboxed commands start in a fresh PID
namespace (`node -e 'console.log(process.pid)'` printed 3, then 10), so two
same-key runs can share the temp name `.<key>.<pid>.tmp`, and one rename then
throws. Before A2 that throw, like any write error, crashed a green run.

**A killed or skipped run.** None can write a stamp. A step killed by a signal
counts as exit 1 (`run_verify.mjs:115`, `code ?? 1`). A stamp needs exit 0 and
0 skips (`verify_cache.mjs`, after `runFull`). CI and the fork opt-out turn
the cache off. A kill during the write leaves only a `.tmp` file, which no
reader opens.

### A1, shown live

At `3d2f6e04`, with a stamp for the tree present and a stray file
`.agents/skills/data-pipeline-work/__pycache__/probe.cpython-312.pyc` (ignored,
so `git status` stayed empty):

```
$ pnpm run mirrors:check
only in .agents/skills:
  data-pipeline-work/__pycache__/probe.cpython-312.pyc
mirrors rc=1
$ pnpm verify
verify: cached -- these inputs passed in full at 2026-11-12T23:55:54.992Z in /home/daniel/Code/lulz/tbc-wt/t876 (1735 ran, 0 skipped). TBC_VERIFY_FRESH=1 runs it again.
verify rc=0
```

At `40165b8b`, the same file (log
`.scratch/agent-reports/2026-11-12-pmr876-live-pyc.log`):

```
verify: no cached pass for these inputs (changed since the last pass stamped here: main-tree, main-ignored); running in full.
only in .agents/skills:
  data-pipeline-work/__pycache__/probe.cpython-312.pyc
rc=1
```

The fix keys every file under `.claude/skills/` and `.agents/skills/`,
ignored files and caches included (`MIRRORED_DIRS` in `verify_cache.mjs`), and
corrects the header comment that said no verify step reads `.claude/`.

## Secrets (question 2)

**A verify step reads `.env`.** Vitest builds its config through Vite, whose
`loadEnv` reads `.env`, `.env.local`, `.env.test` and `.env.test.local`
(`vite/dist/node/chunks/config.js:9402`, vite 7.3.6). Vitest then copies the
`VITE_`-prefixed values into `process.env` for the tests
(`vitest/dist/chunks/cli-api.DVe0nWUx.js:10159`, vitest 3.2.7). No code here
reads a `VITE_` value today (`rg "import\.meta\.env|process\.env\.VITE"` over
`packages/` and `apps/`: none), so leaving `.env` out would open a small gap
rather than a live one. It would still be a gap.

**Hashing it fits the rule's purpose.** The rule tells agents to leave
secrets unread, so no secret reaches a model's context. The key's code reads
the bytes inside the verify process, as vitest already does, and keeps only a
sha256. That digest is folded with every other ignored file's digest into the
`main-ignored` part. No agent sees the bytes. The new test puts a marker in
`.env` and in `DATABASE_URL` and runs a miss, a hit, a changed `.env` and a
forced run: the marker is in no log line and in no stamp file. An error from
hashing a file prints its path, never its bytes; the only messages that can
quote file text are JSON parse errors for `node_modules/.modules.yaml` and
`data/wowsims.lock.json`, which hold no secrets. The pair
has no `.env` (`test -f`); I opened no `.env` file, and the helpers were told
not to.

## The status lines (question 3)

| State                           | Line                                                                                                                                | Verdict            |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ------------------ |
| hit                             | `verify: cached -- these inputs passed in full at <UTC> in <folder> (<N> ran, 0 skipped). TBC_VERIFY_FRESH=1 runs it again.`        | true, plain        |
| miss, no stamp from this folder | `verify: no cached pass for these inputs; running in full.`                                                                         | true               |
| miss, with one                  | `... (changed since the last pass here: <parts>) ...`                                                                               | false at times, A3 |
| stamp unreadable                | `verify: the stamp <path> could not be read; running in full.`                                                                      | true               |
| key part not computable         | `verify: cache off -- could not compute the inputs key (<error>); running in full.`                                                 | true               |
| stamp cannot be written         | before A2: a stack trace and exit 1 after a green run; now `verify: no pass stamp -- it could not be written (<error>).` and exit 0 | fixed, A2          |

The hit line is true because a stamp's key is the inputs after its run, and
only the typecheck step's own `dist/` output may move during a run; every
later step read that output.

A3: the list compares with the newest stamp written from this folder. A green
run that wrote none (an input moved while it ran), or a hit on another
folder's stamp, is also a pass here, so the list could name a part that has
not changed since the last pass. The line now says "since the last pass
stamped here", which is what it compares with.

## Size and simplicity (question 4)

About half the diff is tests. I looked for code that can go without losing a
guard and found none:

- The `go version` probe and the `GO`/`CGO_` variables: no verify step runs
  go (only `go_env.py`, stubbed in every verify path). Removing them would let
  the cache work where go is missing, but here they cost nothing, and a
  future go step would need them.
- The "changed since" diagnostic (about 30 lines): not a guard, but it is the
  only way to see why a run missed.
- The `lockTag` filter on `vendor/wowsimcli-*`: without it every old
  wowsimcli build is hashed on every run.
- The "run reported skips" branch: unreachable today, because skips fail a
  run unless CI or the opt-out is set, and both turn the cache off. It is four
  lines that keep that true if the skip rule changes.

## Spec

Ticket 876's done-when list is met. `verify_cache.test.mjs` moves the key with
each input and writes no stamp after skips, the opt-out, CI or an edit during
the run. The builder's pair runs showed a cached repeat and full runs after a
tracked edit, a fork edit and a changed `NODE_OPTIONS`. My forced run wrote
stamp `fb778761…`, the same key as the builder's run L1, and the next plain
run hit it. The Gates table names the cache and `TBC_VERIFY_FRESH=1`. No hook
or merge-script change. Added beyond the ticket: the "changed since" line, and
turning the cache off when git's local variables are set or `CI` has any
value. Each is small and its reason is in the code.

## Standards

Comments say why. The tests drive the module's interface (`computeKeyParts`,
`keyOf`, `verifyWithCache`) against real temp git repos. Only the tool-version
probe and the 5-minute suite are stand-ins, and those are the right seams. No
test is tautological: each compares a key or a run before and after one change.
`run_verify.mjs` keeps its printed output and only returns its counts.

## Disposition

| ID  | Axis        | Disposition | Ticket / note                                                                                                                                              |
| --- | ----------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | Adversarial | fixed       | ignored files and caches in `.claude/skills` and `.agents/skills` are keyed (`40165b8b`); three "moves with" tests fail before, pass after; live run above |
| A2  | Adversarial | fixed       | a stamp write error prints "no pass stamp" and keeps the exit code (`40165b8b`); test "keeps a green run green when the stamp cannot be written"           |
| A3  | Adversarial | fixed       | miss line says "since the last pass stamped here" (`40165b8b`); test "compares with the last stamp, and says so, when a later pass left none"              |
| A4  | Adversarial | wontfix     | `.env` stays in the key: vitest reads it every run, the key keeps only a digest, and the guard test shows no byte reaches a log or a stamp                 |

## Notes

- **N1.** pnpm settings given as `npm_config_*` variables, other than
  `node-options`, are not keyed. A setting such as `script-shell` could change
  how a step runs (hypothesis, untested; none is set here).
- **N2.** The key reads install records, not installed files. A hand edit
  inside `node_modules` is not seen. The eslint and prettier caches under
  `node_modules/.cache` are not keyed either; they predate this branch, and for
  equal inputs they give the same verdict.
- **N3.** An edit made and undone while one run is going is not seen by the
  before/after comparison (the builder's stated limit).
- **N4.** A symlink is keyed by where it points, not by what it points at.
  None exist in either repo's files, `vendor/` or the fork today (`find -type l`
  outside `node_modules`).
- **N5.** The A1 fix relies on git listing an ignored folder's subfolders
  (`git ls-files --others --ignored --directory` printed `.claude/` and each
  folder below it in a probe). If a git version listed only `.claude/`, the
  skills folders would be skipped again. The three A1 tests use the machine's
  git, so they would fail.
- **N6.** Stamps are never pruned, and each miss parses every stamp to find
  this folder's newest (about 1.5 KB per green run).
- **N7.** Ticket 876 is still open. Its done-when list is met; its last line,
  dropping hand runs that a hook or merge-to-dev repeats, has no other ticket.
