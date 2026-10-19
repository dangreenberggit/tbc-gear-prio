# Pre-merge review — feat/wsl-linux-support

Reviewed range: `0c0c7a562dce59450954cd8e6653b3c2354ef459..1ac94a4be779b020b01b2bffd6f36a5146b4dc0c`

Dispatch (round 1): full axes, not the small-change lane.
`git diff --shortstat dev...HEAD` gave `17 files changed, 452 insertions(+),
327 deletions(-)`, and `git diff --name-only dev...HEAD` lists
`data/wowsims-fork-layout.lock.json`, so the branch is not a small change.
`codex` is not on PATH in the WSL clone (`which codex`, rc=1), so each axis
ran as a fresh `general-task` subagent on Opus (review lane). The
`code-review` axis ran as its two sub-agents, Standards and Spec, dispatched
by the agent running this review. The domain axis was skipped: the diff
changes dev servers, launch configs, browser lookup, a Node version message
and agent docs, and has no TBC, WCL or wowsims game content. Every axis was
told it writes nothing. All three reported `git status --porcelain` empty at
`1ac94a4b` in the clone, and the fork at the lock's `bc3cca6a1`.

Spec source: the owner's approved plan, as relayed in the review request:
"make the project work with WSL as its dev host. Replace the PowerShell tab
dev server with a Linux-capable one (`scripts/dev-tab.mjs`, `tab:*`
scripts), rewrite the Windows-only `.claude/launch.json` entries and add a
minimal `t3.json` for T3 Code, find Chromium through Playwright instead of
Windows-only paths (one shared helper; Playwright pinned to 1.57.0 to match
Chromium revision 1200), fix the `preflight:node` message that ran `fnm`
through sh, and update the agent-facing docs (known-traps, paired-worktrees,
upstream-catch-up, tab-harness README) for Linux." `AGENTS.md`, `CLAUDE.md`
and skills were left unchanged on purpose (a proposal awaits the owner), so
the review does not count them as missing.

## Adversarial

The layout baseline advance in ead8ea16 is justified: the worker's
`layout-gate-real.log` ends in a measured
`LAYOUT_GATE_VERDICT {"outcome":"measured","pass":true,"failed":0,"a11yFailed":0,...}`,
and `check_layout_gate.py --print-hash` at the tip gives `59a440c2...`,
equal to the lock. Signal tests with stub servers in WSL (scripts in the
review session's scratchpad, `wsl-review/adv/t.sh`, `t2.sh`, `t3.sh`)
showed SIGTERM, terminal-style SIGINT and SIGHUP to the dev-tab parent leave
no process and no port in `frontend` and `both` modes; a `go build` failure
exits 1 and stops the frontend; a held port exits 1.

- **A1. A Playwright bump skips the layout gate.** `ROOT_GATE_FILES`
  (`scripts/check_layout_gate.py:237-242`) hashes the harness files and
  fixtures only. `chromium.mjs`, the root `package.json` and
  `pnpm-lock.yaml` are not hashed, so moving `playwright` from 1.57.0 to
  1.64.1 (Chromium build 1200 to 1248) leaves the digest equal and the gate
  prints "unchanged since the last green run". `chromium.mjs:7-8` says a
  bump should rerun the gate; nothing makes it.
- **A2. Every failure of the Node lookup reads as "Chromium is not
  installed".** `_find_chromium` (`check_layout_gate.py:442-465`) maps a
  missing `playwright` package (ERR_MODULE_NOT_FOUND, stderr dropped), a
  failing or too-old `node`, and a 60 s hang all to `None`; `run()` then
  skips with rc 0 under the wrong reason (`adv/t2.sh`, with a faked tab
  change). The Windows checkout has `ms-playwright\chromium-1200` but no
  `node_modules\playwright` until `pnpm install` runs there, so a tab change
  would merge with the gate skipped and the message blaming the browser.
- **A3. dev-tab reports a failure as success.** `dev-tab.mjs:676`
  (`code ?? (signal ? 0 : 1)`) and `:777` (`code ?? 0`): vite killed by an
  outside SIGKILL gives rc 0; the backend dying by a signal in `both` mode
  gives rc 0 (`adv/t.sh` T3, T8, T12).
- **A4. A server that exits on its own leaves its children.** When the
  server exits by itself, `serve` exits without signalling the server's
  process group, so grandchildren such as vite's `tsc --noEmit --watch`
  survive (`adv/t.sh` T3, T8).
- **A5. SIGKILL of the dev-tab script leaves the tree running.** Parent
  SIGKILL (T11), and SIGKILL of a `both`-mode wrapper (T12), leave servers
  holding their ports.
- **A6. SIGTERM or SIGHUP sent only to the `pnpm tab:dev` process leaves
  everything running.** pnpm exits (rc 143 / 129) and the dev-tab parent,
  both wrappers and both servers keep their ports (`adv/t3.sh`). Whether T3
  Code stops a script this way: hypothesis, untested.
- **A7. The `wowsims-fork` launch entry runs vite directly.** SIGTERM to
  vite alone orphans `tsc --noEmit --watch` (worker report, slice 1). The
  worker's launch test stopped the whole process group
  (`launch-test.mjs`, `process.kill(-p.pid)`), so a launcher that signals
  one pid is untested.
- **A8. The Windows checkout loses its launch entries after the merge.**
  PowerShell `Get-Command` on this machine finds no `sh`, and `node` is
  v20.18.1 (`C:\Program Files\nodejs`). So `wowsims-backend` (`sh -c`)
  cannot start, and `wowsims-fork`, `wowsims-fork-prod` and
  `web-shell-prod` run Node 20 where they ran Node 22 through fnm or a
  pinned `node.exe`; `web-shell-prod` imports `node:sqlite`
  (`apps/web/server/wiring.ts`), which Node 20 lacks. That the desktop app's
  `preview_start` sees the same PATH: hypothesis, untested.

Unexamined (adversarial): dev-tab's Windows `taskkill` path and `desktop`
mode; the real Go and vite servers under these signals (stubs were used);
how T3 Code and `preview_start` stop processes; the docs' accuracy (covered
by Standards).

## Domain

Skipped: no game-domain content (see the dispatch note).

## Standards + Spec

### Standards

**No hard code violation.** The six commit subjects are 50 characters or
fewer, imperative, with no period (`awk length` over the saved
`git log -p`). Nearly every comment in `dev-tab.mjs`, `chromium.mjs` and
`check_layout_gate.py` explains why.

- **S1.** `docs/agents/known-traps.md` header (unchanged line): "Every trap
  here fired for real during the upgrades-ui-fit pass (2026-08-24)." The
  Node entry now describes WSL symptoms that did not fire on that date.
  AGENTS.md "Durable claims"; `writing-for-agents`.
- **S2.** `known-traps.md` copies one-day machine facts that one command can
  look up: "v22.23.2 had pnpm 10.6.2 on 2026-10-18", "`/usr/local/bin/node`
  (v22.23.2 on 2026-10-18)", "the index holds 289" (correct, 284 under
  `.scratch/`, undated). A plain `bash -c` gave pnpm 11.24.0, not 10.6.2.
  The `go`/`protoc` PATH block is in the owner's untracked
  `~/.profile:34-35`, and no doc says what a new host's profile needs.
- **S3.** Commit ead8ea16 says the gate "ran green on WSL" and that build
  1200 "is the one the layout gate ran on under Windows" with no command;
  `chromium.mjs:6-8` repeats the Windows claim.
- **S4.** `known-traps.md` now says its commands are for the WSL host but
  still sends readers to `AGENTS.md` § CLI environment, which describes Git
  Bash, `C:/Users` paths and fnm.
- **S5 (smell, Duplicated Code).** The backend build steps exist twice: the
  `wowsims-backend` entry's `sh -c "mkdir -p binary_dist/tbc && cp ..."` in
  `.claude/launch.json` and `backend()` in `dev-tab.mjs`. The skip sentence
  "The gate drives a headless Chromium ... blocking the merge." is copied at
  both `_find_chromium` call sites in `check_layout_gate.py`.
- **S6 (smell).** `_find_chromium` runs bare `["node", ...]` and bypasses
  the existing `_node_command` helper (`check_layout_gate.py:482`).
- **S7 (smell, Speculative Generality).** `test-tab-harness.mjs:64`
  `export { findChromium };` has no importer (grep of `scripts/`).
- **S8 (smell).** `chromium.mjs` states a rule nothing enforces ("a bump
  should rerun the gate") and copies the `1.57.0` pin.
- **S9 (comment policy).** `dev-tab.mjs` `serve`: "Runs the server in the
  foreground until it exits ... then exits with the server's code."
  restates the code.
- **S10 (hypothesis, untested).** `preview_start` may not start a login
  shell, so `node` and `go` in `launch.json` may not resolve to nvm's Node
  and the profile's Go.

### Spec

**Spec: implemented as asked.** `t3.json` is valid against
<https://t3.codes/schema/t3.json>: top-level keys are only `$schema` and
`scripts` (`"additionalProperties": false`), each script has `name` and
`command` (`"required": ["name","command"]`), `icon` is `play` (enum `play,
test, lint, configure, build, debug`), and no item has extra keys. The pin
is right: `playwright-core@1.57.0`'s `browsers.json` gives chromium
`"revision": "1200"`, `"browserVersion": "143.0.7499.4"`, and
`node scripts/tab-harness/chromium.mjs` printed
`/home/daniel/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome`.
`git grep -cIE` at the tip, outside history docs and agent files, finds no
`chrome-win64`, `ms-playwright` or `dev-tab.ps1`.

- **P1.** `check_layout_gate.py` (lines 72-74, 579) and
  `check_tab_review.py:112` still tell the reader there is "no `fnm` to
  select it"; the fallback code is harmless, but the guidance names a tool
  the WSL host does not have.
- **P2.** `scripts/verify_fork_guard.mjs:24` gives Git Bash and PowerShell
  syntax.
- **P3.** `.claude/hooks/bash-footguns.sh`, which the coupling report says
  to drop, is still there.
- **P4 (not asked for).** A one-word edit to `docs/upgrades-tab-scope.md:268`
  ("Git Bash" to "bash"), a fifth doc.
- **P5 (not asked for).** `dev-tab.mjs` keeps win32 branches (`taskkill`,
  Git `usr/bin`).
- **P6.** The Windows launch entries stop working on the Windows checkout
  after the merge: the same effect as A8, found independently.

## Code quality

| ID  | Finding                                                                                                                                          | Source |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ------ |
| Q1  | `known-traps.md` header says every trap fired on 2026-08-24; the rewritten Node entry did not                                                    | S1     |
| Q2  | `known-traps.md` copies dated machine facts (Node and pnpm versions, the CRLF count) and does not say what a new host's profile must put on PATH | S2     |
| Q3  | `chromium.mjs` header: unsourced "the build the layout gate ran on under Windows", a rule nothing enforces, and a copy of the pin                | S3, S8 |
| Q4  | The skip sentence after `CHROMIUM_MISSING` is copied at both `_find_chromium` call sites in `check_layout_gate.py`                               | S5     |
| Q5  | `_find_chromium` bypasses `_node_command`                                                                                                        | S6     |
| Q6  | `export { findChromium };` in `test-tab-harness.mjs` has no importer                                                                             | S7     |
| Q7  | The `serve` comment in `dev-tab.mjs` restates the code                                                                                           | S9     |
| Q8  | `check_layout_gate.py` and `check_tab_review.py` messages name only `fnm` as the way to get Node 22                                              | P1     |
| Q9  | Backend build steps duplicated between `.claude/launch.json` `wowsims-backend` and `dev-tab.mjs` `backend()`                                     | S5     |

## Summary

Round 1 in progress: fixes for A1-A4 and the code-quality pass are next,
then round 2.

## Disposition

| ID  | Axis        | Disposition | Ticket / note                                                                                                                                                                                                                                                |
| --- | ----------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| A5  | Adversarial | wontfix     | SIGKILL cannot be caught, so no handler in the script can stop its children; the next start then fails loudly on the held port, and `known-traps.md` "Before starting the dev servers" says how to find the holder (`ss -ltnp`, `readlink /proc/<pid>/cwd`). |
| A6  | Adversarial | defer       | `.scratch/carry-forward/issues/693-dev-tab-orphans-when-only-pnpm-is-signalled.md` — pnpm does not pass a single-pid SIGTERM on to its child; this holds for every pnpm script in the repo, not only this branch's.                                          |
| A7  | Adversarial | defer       | `.scratch/carry-forward/issues/694-agent-files-on-the-wsl-host.md` — editing `.claude/launch.json` needs the owner's approval; the Windows entry ran vite the same way.                                                                                      |
| A8  | Adversarial | wontfix     | The owner's approved plan replaces the Windows-only entries ("rewrite the Windows-only `.claude/launch.json` entries"); what breaks on the Windows checkout is listed in Summary for the owner.                                                              |
| S3  | Standards   | wontfix     | The commit message is history and is not rewritten; the same claim in `chromium.mjs` is Q3.                                                                                                                                                                  |
| S4  | Standards   | wontfix     | `AGENTS.md` § CLI environment is in the owner's pending AGENTS.md proposal (`.scratch/wsl-move/agents-md-proposal.md`, item A1, "CLI environment, first paragraph").                                                                                         |
| S10 | Standards   | defer       | `.scratch/carry-forward/issues/694-agent-files-on-the-wsl-host.md` — the old entries relied on the session's PATH the same way (fnm, `cmd`); needs a test from a Claude Code session inside WSL.                                                             |
| P2  | Spec        | wontfix     | The Git Bash form `TBC_VERIFY_WITHOUT_FORK=1 pnpm verify` is POSIX shell syntax and works in WSL bash as written.                                                                                                                                            |
| P3  | Spec        | defer       | `.scratch/carry-forward/issues/694-agent-files-on-the-wsl-host.md` — `.claude/hooks/` is an agent file; the proposal lists the hook only under "Related, outside this proposal", so no one owns it yet.                                                      |
| P4  | Spec        | wontfix     | The edit is one word and correct for the WSL host.                                                                                                                                                                                                           |
| P5  | Spec        | wontfix     | The win32 branches keep `pnpm tab:*` usable on the Windows checkout until it is frozen, and cost nothing on Linux.                                                                                                                                           |
| P6  | Spec        | wontfix     | Same effect as A8; see A8.                                                                                                                                                                                                                                   |
| Q9  | Standards   | defer       | `.scratch/carry-forward/issues/694-agent-files-on-the-wsl-host.md` — the fix edits `.claude/launch.json`, an agent file that needs the owner's approval.                                                                                                     |
