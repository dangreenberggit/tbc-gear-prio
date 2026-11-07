Status: open
Type: process
Origin: `.scratch/agent-reports/2026-11-06-general-task-routing-apply.md` § Gates (main checkout, gitignored), on branch `chore/808-one-routing-source`
Blocks: none
Blocked by: the owner's approval of the exact `known-traps.md` text
Related: 802, 808

# pnpm 12 takes its store lock in /run/user/1000, which the agent sandbox mounts read-only

## What an agent sees

In a sandboxed Bash call, `pnpm install` and `pnpm verify` fail with
`ERR_PNPM_STORE_DIR_OPEN_OPERATION_LOCK`. They pass when
`XDG_RUNTIME_DIR` points at a writable folder, for example:

```
XDG_RUNTIME_DIR=$TMPDIR/run TBC_VERIFY_WITHOUT_FORK=1 pnpm -C <worktree> verify
```

## Why

- Reported by the agent that applied the routing change (report § Gates,
  lines 192-197): pnpm 12 puts its store lock in
  `/run/user/1000/pnpm-store-operation-locks-1000`, which the sandbox
  mounts read-only. That agent found the path with
  `strace -e trace=mkdir`; the strace output is its observation and was
  not re-run. Every try before it set `XDG_RUNTIME_DIR` failed with the
  lock error, and `pnpm install --frozen-lockfile` passed with it set.
- Checked on 2026-11-06 in a sandboxed call: `pnpm --version` prints
  12.16.1, and `touch /run/user/1000/x` fails with "Read-only file
  system".
- Re-run on 2026-11-06: `pnpm -C /home/daniel/Code/lulz/tbc-wt/808-routing-source verify`
  with `XDG_RUNTIME_DIR=$TMPDIR/run` and `TBC_VERIFY_WITHOUT_FORK=1` set,
  at 8ef43bec: rc 0. The run without `XDG_RUNTIME_DIR` was not repeated.
- `docs/agents/known-traps.md` § Before running node / pnpm / test
  commands does not name it: `grep -n -i -E 'XDG_RUNTIME|/run/user'
  docs/agents/known-traps.md` finds nothing on `chore/729-test-result`.

Ticket 802 reports the same error and guesses that the cause is the
store folder `~/.local/share/pnpm/store` (marked there as a hypothesis,
untested). This ticket gives the lock path an agent traced. The two can
close together if the `known-traps.md` entry also answers 802.

## Done when

`docs/agents/known-traps.md` § Before running node / pnpm / test
commands says that in the sandbox a `pnpm` command needs
`XDG_RUNTIME_DIR` set to a writable folder, and why. That file is a doc
agents are pointed at, so the exact text needs the owner's approval
first (`~/.claude/AGENTS.md` § Changing agent instructions).
