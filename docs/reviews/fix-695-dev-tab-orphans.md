# Pre-merge review — fix/695-dev-tab-orphans

Reviewed range: `ea2254ed271ed6b824120a8df74d0269e4c32300..b6620154ec0792d21c4939b7613982f470c335a5`
Reviewed range: `b6620154ec0792d21c4939b7613982f470c335a5..fc6e2c63c6636bcb0914c2573ed01ccfc96ba6d2`

## Dispatch note

- Tooling check: `python scripts/check_merge_ready.py --product-files`
  printed the ticket
  `.scratch/carry-forward/issues/695-dev-tab-orphans-when-only-pnpm-is-signalled.md`
  (it was open at the merge base and the branch sets `wontfix`, which is not
  a verified close) and `docs/upgrades-tab-scope.md` (rc=0). The review
  read those two files. The other two changed files,
  `.scratch/carry-forward/notes/695-t3-stop-check.py` and
  `.scratch/carry-forward/notes/695-single-pid-check.sh`, are on
  `TOOLING_PATHS`; `instruction-review` ran on them (section below).
- Lane: `git diff --shortstat dev...HEAD -- <the two product files>` gave
  2 files changed, 80 insertions, 2 deletions, and neither path is under
  `data/`, `vendor/` or `packages/core/src/`. So round 1 was the
  small-change lane: one fresh reviewer with the adversarial brief and the
  `code-review` skill's Standards and Spec checks.
- Domain axis skipped: the diff is about how dev-server processes are
  stopped and states no TBC, WCL or wowsims fact.
- Reviewer: `codex` is not on `PATH` (`which codex` printed nothing), so the
  reviewer was a fresh `general-task` (Opus) subagent, the review type
  `~/.claude/routing.md` § Decision table row 1 names.
- The fork pin does not move (`git diff --quiet dev...HEAD --
data/wowsims-fork.lock.json` rc=0), so there is no fork range.
- No product code changes: the branch answers the ticket's open question
  and closes it `wontfix`.

## Adversarial

The reviewer re-ran all three `Verified by:` commands with node v22.23.2
and read T3 Code 0.1.2's bundled source. It agreed that T3 stops a script
by signalling the shell, and that the kernel's SIGHUP to pnpm's foreground
group then stops the tab servers; the no-change conclusion holds.

- **A1** (ticket, single-pid paragraph): "SIGTERM, SIGHUP and SIGINT each
  stopped vite and tsc within 4 s" failed on its re-run, which printed
  `1 tsc` still running 4 s after SIGTERM. The check could not tell a slow
  exit from an orphan, because its `pkill` killed tsc before a second look.
- **A2** (ticket, mode `t3` result): "tsc ... ended by itself" is not shown.
  tsc is in vite's process group, which the wrapper signals.
- **A3** (ticket, "Not tested"): the `KillMode=mixed` note points at the
  wrong unit. T3 starts the terminal shell under
  `systemd-run --user --scope --slice=app-t3code-agents.slice`, outside
  `t3code.service`.
- **A4** (ticket, client write): the quoted `${e.command}\r` is the chat
  code-block branch (`shellHistory === 'preserve'`). Scripts are written as
  `` ` ${e}\r` `` with a leading space.
- **A5** (ticket, § Why no change, low): the preview's `web-shell` entry
  runs `pnpm -C apps/web dev`, so "what is left is a person or a script"
  misses one launcher. It is not a tab server.

Unexamined: a real T3 app stop (the sandbox cannot drive it), a T3
restart, `preview_stop` (its code is in the Windows desktop app), and a
signal that arrives during the backend wrapper's `go build`.

## Domain

Skipped (see Dispatch note).

## Standards + Spec

- **S1**: the commit subject `Close 695: T3 and preview never signal pnpm
alone` says more than the ticket, which calls the preview's signal
  unknown, and leads with a ticket number.

**Standards, otherwise clean:** `wontfix` needs no `Verified by:` line
(`docs/agents/issue-tracker.md`), and the 695 row was removed from
`docs/upgrades-tab-scope.md`. The § Maintenance loops print 52 MISSING and
2 STALE lines, all from before this branch; none is 695.

**Spec: clean.** The ticket asked for a test "from each tool". The T3 answer
rests on T3's source plus a Python copy of its stop sequence, and the ticket
says so. The preview's stop signal stays unknown; the ticket shows that the
tab entries skip pnpm and labels the SIGKILL case a hypothesis. The fix
choice compares doing nothing, `node` without pnpm, and polling
`process.ppid`, as the owner's task asked.

## Instruction review (the two check scripts)

Full path, because both files are new.

- **Check 1, cold reader** (a fresh `general-task` Opus agent given the
  scripts' text and the job "re-check the ticket's evidence"):
  - **I1**: `pkill -f 'vite.js serve'; pkill -f 'tsc --noEmit'` and the
    process counts work machine-wide, so outside the sandbox the check
    would stop and count other sessions' servers (for example the 684
    session's).
  - **I2**: neither script says what output counts as a pass.
  - **I3**: the Python script could wait 600 + 5 + 60 s, longer than a
    600 s foreground command may run.
  - **I4**: "whose processes end with the call" names no source.
  - **I5**: the header says `tsc --watch` but the pattern is
    `tsc --noEmit`.
  - **I6**: when the port never comes up, the shell script goes on and
    prints `port=down` with no error.
  - **I7**: "stop them yourself afterwards" does not say how.
  - **I8**: the T3 description in the Python header names no source.
- **Check 2, other files:** `package.json` (`tab:dev` is
  `node scripts/dev-tab.mjs both`), `.claude/launch.json` (tab entries run
  `node scripts/dev-tab.mjs frontend|backend`), `scripts/dev-tab.mjs`
  (`serve` stops the server's group on SIGINT, SIGTERM and SIGHUP) and
  `docs/agents/known-traps.md` ("A script or batch that starts the
  servers") all agree with the scripts. I1 was also found here.
- **Check 3, trial run:** both scripts are new and change no agent's
  behaviour; their trial is running them. The fixed versions ran on
  2026-11-10 in this pair with the output their headers now state
  (recorded in the ticket's `## Answer`).

## Summary

Round 1 found no defect in the conclusion, five wrong or unsupported
sentences in the ticket (A1–A5), one commit-subject finding (S1), and eight
problems in the check scripts (I1–I8). `fc6e2c63` fixes A1–A4 and I1–I8.

## Disposition

| ID  | Axis               | Disposition | Ticket / note                                                                                                            |
| --- | ------------------ | ----------- | ------------------------------------------------------------------------------------------------------------------------ |
| A1  | Adversarial        | fixed       | `fc6e2c63`: the check waits up to 30 s per round and tracks only its own processes; the ticket gives the measured times  |
| A2  | Adversarial        | fixed       | `fc6e2c63`: the ticket gives the range over five runs and says tsc is in the group the wrapper signals                   |
| A3  | Adversarial        | fixed       | `fc6e2c63`: the ticket names the `systemd-run` scope and says the unit's KillMode does not reach it                      |
| A4  | Adversarial        | fixed       | `fc6e2c63`: the ticket quotes `projectScriptEditor-*.js`'s `` ` ${e}\r` `` and the Python check types the leading space  |
| A5  | Adversarial        | wontfix     | `web-shell` is not a tab dev server; the ticket covers only `tab:dev` (owner scope: the fork Upgrades tab)               |
| S1  | Standards + Spec   | wontfix     | Bookkeeping: rewording a reviewed commit would move the recorded range; the ticket text is the record and says "unknown" |
| I1  | Instruction review | fixed       | `fc6e2c63`: both scripts track only the pids they started and stop only their own process groups                         |
| I2  | Instruction review | fixed       | `fc6e2c63`: each header states the expected output                                                                       |
| I3  | Instruction review | fixed       | `fc6e2c63`: the port wait is 300 s, so a run stays under 600 s                                                           |
| I4  | Instruction review | fixed       | `fc6e2c63`: the sentence is gone; the scripts clean up after themselves instead                                          |
| I5  | Instruction review | fixed       | `fc6e2c63`: the header names `tsc --noEmit --watch`                                                                      |
| I6  | Instruction review | fixed       | `fc6e2c63`: both scripts exit 1 with a message when the servers never listen                                             |
| I7  | Instruction review | fixed       | `fc6e2c63`: covered by I1's fix; no manual stop is needed                                                                |
| I8  | Instruction review | fixed       | `fc6e2c63`: the header points at the ticket's `## Answer`, which names each source                                       |

## Focused check (round 2)

One fresh `general-task` (Opus) agent checked `b6620154..fc6e2c63`. No fork
range: the pin does not move.

1. **Conditions: pass, one exception.** The one commit names A1–A4 and
   I1–I8, and each script change maps to one of them, except
   `695-t3-stop-check.py:40-41` (`pump` now sleeps after the terminal hangs
   up), which no finding cites (R2-5).
2. **Only what each finding asks: pass.**
3. **Each fix does what its finding asks: pass.** The ticket's T3 quotes
   match T3 Code 0.1.2 (`projectScriptEditor-Bw2ut9Xe.js` `ge`,
   `agentScope.wrap({..., survivesRestart: true})`,
   `AGENT_SLICE = "app-t3code-agents.slice"`, `t3code.service:12`
   `KillMode=mixed`), and a cold reader of the new headers would do what
   I1–I8 asked.
4. **Scripts run as their headers say: pass.** single-pid: TERM, HUP, INT
   "all gone 2 s after; port=down", KILL "still running after 30 s: 1 node
   1 tsc; port=up". `t3`: "all gone 1 s after the stop", both ports False.
   `pnpm`: "still running after 60 s", both ports True.

Findings:

- **R2-1** (low): `695-single-pid-check.sh:19-21` records vite's group 2 s
  after the port opens; a tsc that starts later would not be tracked, and
  "all gone" would not cover it.
- **R2-2** (low, code quality): `695-t3-stop-check.py:83` calls `table()`
  twice per pid, and `:101` indexes `rows[p]`; a pid that exits between
  calls raises `KeyError`.
- **R2-3** (low): the cleanup at `695-t3-stop-check.py:112-117` sends
  SIGTERM and exits without waiting; right after a `pnpm` run, vite, tsc,
  the `dev-tab.mjs` processes and `:5192` were still there, gone about 1 s
  later. The header says the script stops the groups it started.
- **R2-4** (low, hypothesis, untested): the early exit at
  `695-t3-stop-check.py:79-80` skips the cleanup.
- **R2-5** (bookkeeping): no row records the `pump` change. Before it,
  `pump` returned at once after the shell died, so a loop that called it
  ran with no delay.
- Bookkeeping: one line in the ticket's single-pid paragraph is not
  rewrapped, and the ticket's "five runs" timing has no recorded output.

The round reported findings other than bookkeeping, so the review stopped
here (`~/.claude/AGENTS.md` § Review round limits). An assessor that neither
wrote nor reviewed the work found that every round-2 finding sits in code
the round-1 fix added, that a `wontfix` ticket needs no `Verified by:` line
(`docs/agents/issue-tracker.md`), and that another round would likely only
find more. So the round-2 findings are recorded as known limits of the
evidence scripts, and the two ticket sentences with no recorded output are
cut. The ticket's conclusion does not rest on the scripts.

## Disposition (round 2)

| ID   | Axis          | Disposition | Ticket / note                                                                                      |
| ---- | ------------- | ----------- | -------------------------------------------------------------------------------------------------- |
| R2-1 | Focused check | wontfix     | Known limit of a throwaway evidence script; in every recorded run tsc was running when tracked     |
| R2-2 | Focused check | wontfix     | Known limit of a throwaway evidence script; the race needs a pid to exit between two `ps` calls    |
| R2-3 | Focused check | wontfix     | Known limit: the servers were gone about 1 s after the script exited (round 2's re-run)            |
| R2-4 | Focused check | wontfix     | Known limit: the early exit happens only when the servers never start                              |
| R2-5 | Focused check | wontfix     | Bookkeeping: the `pump` change is described in R2-5 above; it makes the wait loops keep their pace |
| R2-6 | Focused check | fixed       | Bookkeeping: the ticket's unrecorded "five runs" timing and the earlier-run sentence are cut       |
