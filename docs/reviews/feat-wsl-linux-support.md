# Pre-merge review — feat/wsl-linux-support

Reviewed range: `0c0c7a562dce59450954cd8e6653b3c2354ef459..1ac94a4be779b020b01b2bffd6f36a5146b4dc0c`

Reviewed range: `1ac94a4be779b020b01b2bffd6f36a5146b4dc0c..4d36a3ca9e96e2c2017a44dcc162bdbd95438ea3`

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
| Q10 | `scripts/tab-harness/README.md` does not say that the Chromium build is part of the layout digest (raised by the A1 fixer after round 1)         | A1     |

## Focused check (round 2)

Main range `1ac94a4b..4d36a3ca` (second `Reviewed range:` line). Fork range:
none. The branch never moves the fork pin
(`git diff --quiet dev...HEAD -- data/wowsims-fork.lock.json` exits 0), and
the fork is at the lock's `bc3cca6a1` with an empty `status --porcelain`.
One fresh `general-task` agent on Opus ran the check and wrote nothing. Its
scripts and logs are in the review session's scratchpad, `wsl-review/r2/`.

Commits checked:

- `2f5664c1` Record round 1 of the WSL branch review (review file, tickets
  693 and 694, `NEXT`, `map.md`).
- `5a8af638` Hash the harness Chromium build in the layout gate (A1).
- `3c008551` Name the real cause when the Chromium lookup fails (A2, Q5).
- `362682b2` Exit nonzero and reap the group when a server dies (A3, A4).
- `8ea2fe7a` Apply review code-quality rows Q1-Q4, Q6-Q8, Q10.
- `4d36a3ca` Advance the layout baseline after A1 and Q6. It followed a
  measured green run: `LAYOUT_GATE_VERDICT {"outcome":"measured","pass":true,"failed":0,"a11yFailed":0,...}`
  (`wsl-review/cq/layout-gate.log`).

1. **Conditions 1 to 3: pass.** Each commit names its finding IDs or is
   bookkeeping. `2f5664c1` also touches `NEXT` and `map.md`, which filing a
   ticket requires (`docs/agents/issue-tracker.md`, "Allocating `<NN>`"; this
   skill's step 3). Every changed code line is at a place that A1, A2, A3/A4
   or a Q row cites. The fork did not move, so the touchpoint commands in
   `docs/fork-upstream-touchpoints.md` give the same output (1 modified
   file, `ui/app/SimTabsSection.tsx`, and 232 added).
2. **The diff changes only what each finding asks for: fail** (finding R2-1
   below).
3. **The evidence shows each fix working: pass.** No automated test was
   added; the repo has no unit tests for `check_layout_gate.py` or
   `dev-tab.mjs`. A1: `wsl-review/fix1/a1.log` shows a playwright-core copy
   with build 1248 moving the digest, and `PLAYWRIGHT_BROWSERS_PATH` not
   moving it. A2: `fix1/a2.log` shows exit 2 and the old message for a
   missing browser, and exit 1 with the `ERR_MODULE_NOT_FOUND` text and
   "run `pnpm install`" for a missing package. A3/A4: stub re-runs on ports
   5398/5399 (`r2/t-new.log`) give T3 rc 137, T3b rc 143 and T8 rc 137,
   with no process left. Two race cases also leave nothing. The same cases
   on the `1ac94a4b` code give rc 0 and leave orphans (`r2/t-old.log`).
   T12 still leaves the backend running, which is A5 (wontfix).
4. **The touched tests pass: pass.** `pnpm verify` at `4dba6951`: rc=0,
   `gates: 1545 ran, 0 skipped`, `layout: skipped -- ... unchanged ...
(digest e58106611753...)`. `node scripts/tab-harness/chromium.mjs`
   prints the `chromium-1200` path, and `--build` prints revision 1200,
   browserVersion 143.0.7499.4, both rc 0. `--print-hash` equals the
   lock's `e5810661...`.

Findings:

- **R2-1 (A1 fix; a silent wrong result in a rare case).**
  `scripts/check_layout_gate.py` `_chromium_build` hashes the fixed marker
  `<lookup failed>` when `chromium.mjs --build` fails. Its docstring says
  "the Chromium check that follows skips the gate". That check does not
  skip when only `--build` fails while the executable lookup still works,
  for example on a timeout under load, or with a playwright-core that
  `chromiumBuild()` cannot read. The gate then runs, and a green run
  records the digest that holds the marker. On later runs, while `--build`
  keeps failing, the digest stays equal to that baseline, so the gate skips
  as "unchanged" even after a Playwright bump. Shown with patched functions
  and no file writes (`r2/a1demo.py`): the baseline was written, and the
  next run printed "SKIPPED -- ... unchanged". Likely cause (hypothesis,
  untested): the fixer added the marker so that the digest stays
  computable on a checkout with no Node or no `playwright`, and assumed the
  executable lookup fails in every case where the build lookup fails.
  Suggested fix: treat a failed `--build` as a Chromium problem, so that
  the gate skips, or never advance the baseline over the marker.
- **R2-2 (Q2 fix; a wrong command in an agent doc).**
  `docs/agents/known-traps.md:31-32` says "A plain `bash -c` skips the
  profile, so it gets the system `node` (`bash -c 'command -v node; node
--version'` shows which)". Typed in a login shell, that command inherits
  the caller's PATH and printed nvm's `v22.17.1`. Only
  `wsl.exe -d Ubuntu-22.04 -- bash -c '...'` showed `/usr/local/bin/node`
  v22.23.2. The other Q2 commands are correct as written. Likely cause
  (hypothesis, untested): the code-quality agent tested the non-login case
  through `wsl.exe -- bash` and wrote it as plain `bash -c`.
- **R2-3 (A2 fix; hypothesis, untested).** Under the `fnm exec` fallback, a
  usage error that makes fnm itself exit 2 would read as "Chromium is not
  installed". Node errors exit 1 (`fix1/a2.log`). The WSL host has no fnm.

## Summary

**Stopped at the round limit.** Round 2 reported findings other than
bookkeeping (R2-1, R2-2, R2-3), so this review stops here with no round 3,
as the skill's "Round limit" says. `pnpm merge-to-dev --check-only` was not
run. The owner decides what happens next, for example a small fix pass for
R2-1 and R2-2 followed by a fresh review of that fix.

State of the round 1 findings:

- Fixed by commits, checked in round 2 and found working: A1, A2 (with Q5),
  A3 and A4.
- Code-quality pass `8ea2fe7a`: Q1-Q4, Q6-Q8 and Q10.
- Disposed in round 1's table: A5, A8, S3, S4, P2, P4, P5 and P6 are
  wontfix. A6, A7, S10, P3 and Q9 are deferred to tickets 693 and 694.
- R2-1 is in the A1 fix. It is a silent wrong result, so under step 3 it
  must be fixed before the merge. R2-2 and R2-3 are in the fixes for Q2 and
  A2.

What breaks on the Windows checkout after a merge (A8, P6, not asked to be
fixed): the `wowsims-backend` launch entry needs `sh`, which PowerShell does
not find on this machine. `wowsims-fork`, `wowsims-fork-prod` and
`web-shell-prod` run the PATH `node`, which is v20.18.1 there. On Node 20,
`web-shell-prod` cannot import `node:sqlite`. `pnpm tab:dev` runs vite on
pnpm's Node and no longer forces Node 22 through fnm. The layout gate skips
with "run `pnpm install`" until the Windows checkout installs the
`playwright` package.

Tickets: this branch filed 2 (693, 694) and closed 0, so it filed more than
it closed. `.scratch/carry-forward/issues/NEXT` read 686 while tickets up to
692 existed; it now reads 695.

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
