Status: open
Type: task
Origin: owner request during the WSL move, 2026-10-19 (feat/wsl-linux-support fix pass)
Blocks: none
Blocked by: none

# Two WSL distros with the same prompt make it easy to work in the wrong one

The owner asked for this to be recorded for later, in these words: "this
ubuntu thing sounds like a trap. lets mark that as an issue for later or for
a side agent". This ticket is a record; no decision has been made.

## What is on the machine

The WSL machine survey of 2026-10-17
(`.scratch/agent-reports/2026-10-17-general-task-wsl-machine-state.md`,
gitignored) lists two distros with a `daniel` user:

- `Ubuntu-22.04`, the default distro. It holds this project, T3 Code and the
  toolchain.
- `Ubuntu` (22.04.5), stopped. Its `/home/daniel` is older (dated Nov 2025)
  and has a `dev/` folder, `.bun` and `.zshrc`; no `Code/`, no node, no
  claude, no t3.

Both show the same `daniel@danbot` prompt, as reported when the owner asked
for this ticket; the survey gives the machine's host name as `danbot`, and
the prompt in `Ubuntu` was not rechecked. A terminal or launcher that opens `Ubuntu` instead of
`Ubuntu-22.04` is easy to miss, and commands for this project (the Node
setup in `docs/agents/known-traps.md`, pnpm, git) then run in the wrong
distro.

## How to check which distro a shell is in

```sh
echo $WSL_DISTRO_NAME   # must print Ubuntu-22.04
```

## Options for later

- Check what `~/dev/` in the `Ubuntu` distro holds. Then the owner decides
  whether to remove that distro. `wsl --unregister Ubuntu` deletes it and
  everything in it permanently.
- Give each distro its own host name in its `/etc/wsl.conf`
  (`[network]` section, `hostname=`), so the prompts differ.
- Check which distro each Windows Terminal profile and Start-menu entry
  opens.
