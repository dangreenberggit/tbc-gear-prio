Status: closed
Type: bug
Origin: .scratch/agent-reports/2026-11-07-general-task-enh-39-rows.md (pair weapon-order, gitignored)
Blocks: none
Blocked by: none
Related: 821, 854

# The desktop gate's server build fails in every pair worktree

## What a developer sees

On 2026-11-07 the owner ran, outside the agent sandbox, in the pair
`/home/daniel/Code/lulz/tbc-wt/weapon-order`:

```
pnpm -C /home/daniel/Code/lulz/tbc-wt/weapon-order desktop-gate:check --spec enh --update-golden
```

It stopped at the Go server build (`make wowsimtbc`) with:

```
error obtaining VCS status: exit status 128
	Use -buildvcs=false to disable VCS stamping.
```

With `GOFLAGS=-buildvcs=false` in front, the same command built and ran.
`docs/reviews/feat-headless-run-no-orphans.md:81` calls this flag a
sandbox-only workaround. It is not: the owner's run was outside the sandbox.

## Cause

Two facts together, both checked on 2026-11-07:

1. Go finds the repository to stamp by walking up from the module root
   (the fork, which holds `go.mod`) to the first `.git` that is a
   **directory**. A `.git` file does not count:
   `$(go env GOROOT)/src/cmd/go/internal/vcs/vcs.go:253` is
   `{filename: ".git", isDir: true}` and `:936` tests
   `fi.IsDir() == root.isDir` (go1.25.4). In a pair, the fork is a git
   worktree, so its `.git` is a file (`cat <pair>/vendor/tbc-new-fork/.git`
   prints `gitdir: ...`), and so is the pair's own `.git`.
2. `/home/daniel/.git` is a directory that is not a repository: it holds only
   `commondir`, `config.worktree`, `glab-cli/`, `info/`, `modules/` and
   `worktrees/`, and `git -C /home/daniel rev-parse --git-dir` exits 128 with
   "not a git repository". These are Claude Code scrub-mode stubs: a session
   that starts in `$HOME` with `CLAUDE_CODE_SUBPROCESS_ENV_SCRUB` set creates
   them, and deleting them lasts only until the next such start (agent report
   `.scratch/agent-reports/2026-10-25-general-task-sandbox-home-stub-files.md`
   in the main checkout, gitignored).

So Go skips the fork's `.git` file, stops at `/home/daniel/.git`, and runs
`git status --porcelain` in `/home/daniel`, which exits 128. Re-run: put a
`git` wrapper that logs its arguments and working directory first on `PATH`,
then `go build -o $TMPDIR/wst ./sim/web` in the pair's fork; the log shows
one call, `cwd=/home/daniel args=status --porcelain`, `rc=128`. In the main
checkout the fork's `.git` is a directory, so Go stamps from it and the build
works.

## Fix (proposed, not made)

The gate's build does not use the VCS stamp. Make the tooling that builds the
server turn stamping off: in `scripts/check_desktop_tab.py` `build()`, pass
`make` an environment with `-buildvcs=false` added to any `GOFLAGS` already
set; and the same in `scripts/dev-tab.mjs` for its two Go builds,
`runSync("go", ["build", ...])` (backend mode, about line 120) and
`runSync("make", ["wowsimtbc"], env)` (desktop mode, about line 147). This
removes the failure whatever is
in `$HOME`, which deleting `/home/daniel/.git` does not (the stubs come back).
Also correct `docs/reviews/feat-headless-run-no-orphans.md:81`, or drop
"sandbox-only" from it.

## Done when

In a pair, `pnpm desktop-gate:check --spec enh` (no `GOFLAGS` in the shell)
gets past `make wowsimtbc` while `/home/daniel/.git` exists, and so do
`node scripts/dev-tab.mjs backend` and `node scripts/dev-tab.mjs desktop`.

## Comments

**2026-11-07, branch `fix/821-weapon-damage-order`.** Fixed in the repo's
own scripts; no fork file changed. New `scripts/go_env.py` and its JavaScript
twin `scripts/go-env.mjs` build the environment for a Go build: they read
`go env GOFLAGS` (so a `go env -w` value is kept) and add `-buildvcs=false`
unless a `-buildvcs` flag is already there. `scripts/check_desktop_tab.py`
`build()`, `scripts/dev-tab.mjs` (backend and desktop modes) and
`scripts/worktree_pair.py` `make_env()` use it. `worktree_pair.py` is in the
fix because `make dist/tbc/.dirstamp` (`wt:pair --build`) builds `lib.wasm`
with `go build`, which failed the same way in the pair.
`scripts/fetch_wowsimcli.py` is not changed: it builds in a scratch worktree
under the temp directory, not in the pair's fork.

Not run: a full `make wowsimtbc` or `pnpm desktop-gate:check`, which cannot
run in the agent sandbox (tsx in the bundle step,
`vendor/tbc-new-fork/makefile:34`, fails with `listen EPERM`).
The evidence is the same `go build` commands the makefile runs, in the pair's
fork with no `GOFLAGS` in the shell: plain `go build ./sim/web` and the
`GOOS=js` `./sim/wasm/` build fail with "error obtaining VCS status: exit
status 128"; with the environment from `go_env.go_build_env()` (Python) and
`goBuildEnv()` (JavaScript) both exit 0.

Verified by: `python scripts/check_desktop_tab_verdict.py` (GOFLAGS cases and
`build()` passing the flag to make), `python scripts/check_worktree_pair.py`
(`make_env()`), `node --version; pnpm exec vitest run scripts/go-env.test.mjs`,
and in the pair's fork with `GOFLAGS` unset:
`python3 -c "import sys,subprocess; sys.path.insert(0,'../../scripts'); import go_env; raise SystemExit(subprocess.run(['go','build','-o','/tmp/wst','./sim/web'],env=go_env.go_build_env()).returncode)"`
(rc 0; plain `go build -o /tmp/wst ./sim/web` gives rc 1), on 2026-11-07.

The "sandbox-only" line in `docs/reviews/feat-headless-run-no-orphans.md:81`
was left as history on purpose; this ticket's "What a developer sees"
corrects it.

**2026-11-08, same branch.** All three "Done when" runs are done, in the
pair `/home/daniel/Code/lulz/tbc-wt/weapon-order`. No run is left. During
the two agent runs, `GOFLAGS` was unset (`env -u GOFLAGS`) and
`/home/daniel/.git` existed.

- `pnpm desktop-gate:check --spec enh`: covered by the owner's run of
  `pnpm desktop-gate:check` in this pair, outside the sandbox, with no
  `GOFLAGS` prefix, on 2026-11-07, after the fix. The owner: "all 4 specs
  passed". With no `--spec`, the gate runs every spec in
  `GATED` (`scripts/check_desktop_tab.py`), and enh is one of the four.
- `node scripts/dev-tab.mjs backend`: run by an agent in the sandbox on
  2026-11-08, with `--backend-port 3399` so the pair's `wowsimtbc` was not
  overwritten. It built and served: `GET /tbc/` gave 200. Plain
  `go build -o $TMPDIR/wst-plain ./sim/web` in the same fork gave rc 1 with
  "error obtaining VCS status: exit status 128".
- `node scripts/dev-tab.mjs desktop`: run by an agent in the sandbox on
  2026-11-08, with `--backend-port 3398`. `make wowsimtbc` printed "Build
  Completed Successfully" and the embedded server gave 200 for `GET /tbc/`.
  The tsx bundle step and the `lib.wasm` build did not run, because the
  pair's `dist/tbc` bundle was already up to date. The `GOOS=js` build
  behind `lib.wasm` was checked on its own on 2026-11-07 (comment above).
