# Pre-merge review — feat/headless-run-no-orphans

Reviewed range: `8810147226da8355e77dcf48813d5735bdaa6ec9..39b0c3fe154e399af619fe4c290b81176741bd9f`

Dispatch note (round 1): small-change lane. `git diff --shortstat dev...HEAD`
gave ` 5 files changed, 93 insertions(+), 44 deletions(-)`; `git diff
--name-only dev...HEAD` gave `docs/agents/known-traps.md`,
`scripts/dev-tab.mjs`, `scripts/process-group.mjs`,
`scripts/tab-fixtures/smoke.mjs`, `scripts/tab-harness/vite.config.mjs` (no
`data/`, `vendor/`, `packages/core/src/` or `.generated.` path). `codex` is not
on `PATH`, so one fresh `general-task` agent on Opus (review lane) took the
adversarial brief and the `code-review` Standards and Spec checks. Domain axis
skipped: the diff is process management and docs, with no game-domain content.

The reviewer was told it writes nothing and must not start servers; it ran
`node -e` and `python3 -c` probes and loaded the harness config with vite's
`loadConfigFromFile`. Working tree at dispatch: only this review file
untracked.

## Adversarial

- **A1 (medium).** `killTree` returned early once the server had exited
  (`scripts/process-group.mjs:14` at 39b0c3fe), so a server that crashed left
  its children (for example `tsc --watch`) running. Reviewer's probe: a
  detached `bash -c 'sleep 300 & exit 0'`, then `killTree(leader, GROUPS)`
  after the leader exited; `sleep 300` survived. `dev-tab.mjs` worked around
  it with its own `killGroup` on exit; `smoke.mjs` did not.
- **A2 (medium).** `killTree`'s default `group = false` was the unsafe call,
  and the new known-traps paragraph said "stop it with `killTree`" without
  the second argument: `killTree(child)` signalled only the leader, the
  original leak.
- **A3 (low).** `smoke.mjs` now starts vite in its own process group, so a
  signal sent to smoke's whole group (`kill -- -PGID`) no longer reaches vite
  directly; if smoke is SIGKILLed, vite survives.
- **A4 (low).** Nothing guarded the plugin filter in
  `scripts/tab-harness/vite.config.mjs`: if upstream renamed or wrapped the
  checker, the filter would match nothing and the watchers would come back
  with no error. Reviewer confirmed the filter matches today: 14 plugins
  without the checker by default, 15 with it under `TBC_TAB_TYPE_CHECKER=1`.

Checked and fine (reviewer): `exit` handlers run after an uncaught exception
or rejected top-level await; a detached vite cannot keep `smoke.mjs` alive
because it always calls `process.exit`; Windows behaviour unchanged
(`taskkill /T`); only `dev-tab.mjs` and `smoke.mjs` call the moved helpers.

## Domain

Skipped: no game-domain content (dispatch note above).

## Standards + Spec

- **S1.** A cause stated as fact: the harness config comment said the
  watchers piled up "until the machine stalled" and known-traps said the
  batch "slowed the whole machine"; the incident report marks the stall's
  cause as a hypothesis (possibly a WSL VM pause). AGENTS.md § Durable
  claims.
- **S2 (code quality).** The name `GROUPS` did not say what the boolean
  means; suggested `USE_PROCESS_GROUPS`.
- **S3.** known-traps said `detached: true`; the code uses
  `detached: GROUPS`, false on Windows.
- **P1.** Chrome is covered only for `smoke.mjs`. `run-tab-cdp.mjs` (the
  incident's driver, also run by the desktop gate) stops Chrome only in
  `finally`, and the `test-tab-harness.mjs` users rely on `exit` handlers
  without turning signals into exits, so a SIGTERM may leave Chrome
  (hypothesis, untested). Not introduced by this branch.
- **P2.** `wowsimtbc` is covered only through `dev-tab.mjs backend`.
  `check_desktop_tab.py` stops it in `finally`, which Python skips on
  SIGTERM (checked: `python3 -c` with a `try/finally` around a self-SIGTERM
  exits 143 and never prints). Not introduced by this branch.
- **P3 (low).** `dev-tab.mjs frontend` forced `TBC_TAB_TYPE_CHECKER=1`,
  overriding the caller, so a batch that follows the known-traps advice
  still starts a watcher it does not need.

Met (reviewer): interactive `pnpm tab:dev` keeps the checker, and a headless
run with the harness config starts no `tsc`.

## Smoke fixtures (open point from the implementer)

The implementer's "no result after 150s" on every fixture came from the
pair's fork having no `dist/tbc`, not from this branch. Building it in the
sandbox needed two workarounds, both sandbox-only: `GOFLAGS=-buildvcs=false`
(Go's VCS stamp fails on the sandbox's stub `/home/daniel/.git`), and the
makefile's `npx tsx vite.build-workers.mts` step run as
`node --import <pair>/node_modules/tsx/dist/loader.mjs vite.build-workers.mts`
(the tsx CLI's IPC pipe gets `listen EPERM`). Then, in one Bash call,
`timeout 1200 node scripts/tab-fixtures/smoke.mjs` followed by
`ps -eo pid,ppid,pgid,etime,args | grep -E 'tsc|vite|wowsimtbc|chrome'`:
6 of 6 fixtures `ok` in 30.5 s, `smoke rc=0`, and the `ps` listing empty.
The same run after the fixes below: 6 of 6 `ok` in 30.6 s, `ps` empty.
No dev-code comparison was needed.

## Fixes (commit 7331b9ab)

- A1, A2: `killTree(child, group = USE_PROCESS_GROUPS)` signals the group
  even after the server exited, and falls back to a plain kill when the child
  leads no group (`killGroup` now returns whether a group existed). Probe:
  a detached leader that exits leaving `sleep 301` -> `killTree` stops it; a
  non-detached `sleep 302` -> `killTree` stops it.
- A4: the harness config throws a named error when the checker is to be
  dropped and no plugin named `vite-plugin-checker` exists. Probe with a copy
  whose `CHECKER` was `bogus-checker`: the error is thrown. Real config: 14
  plugins (checker absent) by default, 15 (present) with
  `TBC_TAB_TYPE_CHECKER=1`.
- S1: both texts now say only what was seen (one watcher per run).
- S2: `GROUPS` renamed `USE_PROCESS_GROUPS` (done in the fix commit, not by a
  separate code-quality agent: a one-word rename across three files).
- S3: known-traps names `detached: USE_PROCESS_GROUPS` and `killTree(child)`.
- P3: `dev-tab.mjs frontend` sets `TBC_TAB_TYPE_CHECKER` to `1` only when the
  caller has not set it; known-traps says a batch can set it to `0`.

## Code quality

| ID  | Row                                   |
| --- | ------------------------------------- |
| S2  | `GROUPS` renamed `USE_PROCESS_GROUPS` |
