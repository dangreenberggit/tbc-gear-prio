# Pre-merge review — fix/860-layout-gate-tsx-pipe

Reviewed range: `ba3e295e1ddbf9f67a98aa7495813c51d0f18345..0a8a3cf7273249203bf6b4a47e0c837207a2b3c1`

The branch never moves the fork pin
(`git diff dev...HEAD -- data/wowsims-fork.lock.json` is empty); the fork
stays at `68b2afacf`.

**Dispatch.** `python scripts/check_merge_ready.py --product-files` (rc 0)
printed the product files `data/wowsims-fork-layout.lock.json` and
`scripts/tab-harness/test-tab-harness.mjs`; the axes reviewed those. The
other changed files are tickets 860 and 861 under
`.scratch/carry-forward/issues/`, which the axes read as the spec and which
got `instruction-review` (section below).

Not the small-change lane: `git diff --shortstat dev...HEAD` gave
`4 files changed, 91 insertions(+), 4 deletions(-)`, within the size limit,
but `git diff --name-only dev...HEAD` lists `data/wowsims-fork-layout.lock.json`,
and a path under `data/` is never a small change.

`codex` is not on `PATH`. Each axis ran as a fresh `general-task` subagent on
Opus (the review lane), with the adversarial brief, the `code-review` skill's
Standards and Spec briefs, and an instruction to write nothing.

**Domain axis skipped:** the diff changes a build command and a lock digest;
it has no TBC, WCL or wowsims game-domain content.

## Adversarial

No confirmed defect.

- **A1 (plausible, medium), `data/wowsims-fork-layout.lock.json:2`.** The
  green run that wrote `testedTabHash` `5267aca2...` launched Playwright's
  headless-shell build through a `PLAYWRIGHT_BROWSERS_PATH` shim, not the
  gate's own `chromium-1200` build. The digest hashes the browsers.json entry,
  not the binary, so `python scripts/check_layout_gate.py --print-hash`
  prints `5267aca2...` with and without the shim (re-run for this review).
  The shim's `chromium-1200/chrome-linux64/chrome` is a symlink to
  `chromium_headless_shell-1200/chrome-headless-shell-linux64/chrome-headless-shell`
  (`ls -la` on the shim path). If the headless shell lays the tab out
  differently from full Chromium (both are 143.0.7499.4, both get
  `--hide-scrollbars`, `test-tab-harness.mjs:212-216`), the lock certifies a
  source that the full build would fail, and every later merge of the same
  source skips the gate with no error. Untested either way; ticket 861 says
  so. The weakness (hash names the entry, not the binary) is older than this
  branch; this branch is the first lock advance in this review's sight that
  rests on it.
- **A2 (no defect), `scripts/tab-harness/test-tab-harness.mjs:106-113`.**
  `node --import tsx` loads the same tsx 4.23.1 as `npx tsx`: the fork has no
  tsx of its own, `import.meta.resolve("tsx")` from the fork resolves to the
  main repo's `tsx@4.23.1/dist/loader.mjs`, and `npx --no -- tsx --version`
  prints `tsx v4.23.1` then fails with `listen EPERM`. A missing tsx still
  makes `run()` reject. The comment's claim is true: the fork's `makefile:34`
  runs `npx tsx vite.build-workers.mts` (`git grep tsx 68b2afacf -- makefile`).
- **Provenance confirmed.** `--print-hash` at HEAD equals the committed lock.
  `2026-11-08-860-gate-headless-shell.log` line 543 is
  `LAYOUT_GATE_VERDICT {"outcome":"measured","pass":true,...,"failed":0,"a11yFailed":0,...}`
  and line 545 is `layout gate: PASSED. Advanced the baseline to 5267aca21022...`,
  which only the green path prints; `--update-baseline` prints "baseline set
  to". (Log directory: `/home/daniel/Code/lulz/tbc-gear-prio/.scratch/agent-reports/`.)
- **A3 (no defect).** The axis found `2026-11-08-860-verify.log` cut off after
  45 lines with no result. That `pnpm verify` run was still going; the log now
  ends with `gates: 1606 ran, 0 skipped` and
  `layout: skipped -- tab layout source unchanged since the last green run (digest 5267aca21022...)`.

**Unexamined:** whether the `--import tsx` workers bundle is byte-identical to
the tsx CLI's (building writes the fork's `dist/`); a full-Chromium gate run
(cannot start in the sandbox, ticket 861).

## Domain

Skipped; see the dispatch note.

## Standards + Spec

### Standards

- **S1 (hard), commit `7ac5100d`.** The subject "Build the harness workers
  bundle without the tsx CLI" is 52 characters; `~/.claude/AGENTS.md`
  § Commit messages, rule 2, limits it to 50
  (`git log --format=%s ba3e295e..0a8a3cf7 | awk '{print length($0)": "$0}'`).
- **S2 (minor), commit `7ac5100d` body.** "The tsx CLI listens on an IPC pipe
  that the Claude Code sandbox refuses (listen EPERM)" states a cause with no
  command or ticket; `~/.claude/AGENTS.md` § Durable claims asks for one.
  Ticket 860 holds the error and the reproducing command.
- **S3 (judgement), `scripts/tab-harness/test-tab-harness.mjs:65-67`.** The
  header comment still says the build runs "the same steps as the makefile's
  bundle target (`npx tsx vite.build-workers.mts`, `npx vite build`)"; the
  workers step now runs `node --import tsx`. The comment at line 106 explains
  the difference, so a reader is not misled for long.
- Checked and clean: the lock change is one line written by the gate (no line
  ending flip); the new comment at lines 106-108 cites ticket 860 and gives a
  reason; no baseline code smell in the 7-line hunk.

### Spec

Spec: ticket 860 § Done when. Every clause is met, one partly.

- **P1 (partial), `data/wowsims-fork-layout.lock.json:2`.** "The layout gate
  gives a green verdict on dev's tab source": the green verdict came from the
  headless-shell build, so the lock records a pass for a browsers.json entry
  whose binary was not launched. Same finding as A1.
- Met: the verdict covers fork `68b2afacf`, which is dev's pin
  (`git show dev:data/wowsims-fork.lock.json`), and dev has not moved past the
  merge base `ba3e295e`.
- Met: "the layout lock on dev records that digest". `merge_to_dev.py:578-585`
  calls the layout gate, which skips when the live digest equals the lock, so
  the merge carries `5267aca2...` onto dev unchanged.
- Met: "the gate's workers build no longer needs the tsx IPC pipe".
  `2026-11-08-860-gate-normal-chromium.log` line 18 prints `bundle built.`
  inside the sandbox without the shim; line 19 is the Chromium failure that
  ticket 861 tracks.
- **P2 (bookkeeping), ticket 860 closing note.** It said the out-of-sandbox
  command "measures whatever the lock says". `test-layout.mjs` measures the
  tab source on disk and writes no lock (`grep -n "lock\|testedTabHash"
scripts/tab-harness/test-layout.mjs` finds neither).
- Scope creep: none.

## Instruction review (tickets 860 and 861)

Full path. Check 1: one cold reader per ticket (`general-task`, Opus), each
given only its ticket: for 861, the agent assigned to work it; for 860, the
agent asked to confirm it done before merge.

| ID  | Check | File:line                       | Quoted text                                                                                                                                         | What an agent does wrong; cost                                                                                                                                                            | Severity   | Evidence                                                                                                                                                      |
| --- | ----- | ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| IR1 | 1     | 861 § Done when (old 41-49)     | "have `chromium.mjs` return..."; "the digest would need to hash..."; "the docs that tell agents to run `pnpm merge-to-dev`"; "a `measured` verdict" | The worker could not tell where `chromium.mjs` lives (a fork edit needs a re-pin), which digest, which docs, or whether a measured fail counts; wasted search or a wrong-place edit       | should fix | 861 cold reader: "the ticket gives no path, so I cannot tell if the file is under `scripts/` or in the fork"; "does `measured` count if the geometry differs" |
| IR2 | 1     | 861:29-30, 860:48-50            | "in the main checkout"                                                                                                                              | A worker in a pair reads the wrong `.scratch/` and finds no log                                                                                                                           | minor      | 861 cold reader: "probably `/home/daniel/Code/lulz/tbc-gear-prio`, but the ticket does not say so"                                                            |
| IR3 | 1     | 860:62-63 (old)                 | "because it hashes the browsers.json entry, not the binary"                                                                                         | The checker treats an unsourced claim as unchecked and cannot confirm it                                                                                                                  | minor      | 860 cold reader: "The note gives no source for this"                                                                                                          |
| IR4 | 1     | 860 § Done when                 | "the layout lock on dev records that digest"                                                                                                        | The checker says the ticket cannot be done before merge                                                                                                                                   | minor      | 860 cold reader: "can only be true after the merge. The ticket was closed before that"                                                                        |
| IR5 | 2     | 861:6, 861:32, 860:62           | "Tickets 754 and 800"                                                                                                                               | Two files are numbered 800 (`800-desktop-gate-goldens-for-more-specs.md`, closed; `800-tooling-review-file-fails-merge-ready-without-disposition.md`, open); a reader opens the wrong one | minor      | `ls .scratch/carry-forward/issues/800-*`; only the desktop-gate one mentions the shim (`grep -l "pwshim\|PLAYWRIGHT_BROWSERS_PATH\|headless"`)                |
| IR6 | 2     | `.scratch/carry-forward/map.md` | (no line for 860 or 861)                                                                                                                            | `pnpm issues:open` readers and the chronological log miss both tickets                                                                                                                    | minor      | `grep -n "^- 86[01]" .scratch/carry-forward/map.md` found nothing                                                                                             |

**Notes.** The 860 cold reader also found "or this ticket names the command an
owner runs outside the sandbox to measure it" unclear ("it" = the build or the
tab). That sentence is from dev, not this branch; the first clause of the
"either ... or" is met, so it does not matter for closing 860.

**Check 2 file table.**

| File                                                            | Result                                                                                     |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `scripts/check_layout_gate.py`                                  | agrees (`--print-hash`, the PASSED line)                                                   |
| `scripts/tab-harness/test-tab-harness.mjs`                      | agrees (`launchChrome()` uses `stdio: "ignore"`; line 106-113 runs `node --import tsx`)    |
| `scripts/tab-harness/test-layout.mjs`                           | P2 (writes no lock)                                                                        |
| `scripts/tab-harness/chromium.mjs`                              | exists; IR1 (path not given)                                                               |
| `data/wowsims-fork-layout.lock.json`                            | agrees (`5267aca2...`)                                                                     |
| the four `2026-11-08-860-*.log` files                           | agree (`socket() failed` at chromium-abort line 3; `bundle built.` at gate-normal line 18) |
| tickets 401 (open), 754 (closed), 800                           | IR5                                                                                        |
| `AGENTS.md` § Commits and merges, `docs/workflow.md` § The loop | exist; now named in 861 (IR1)                                                              |

**Check 3 (trial run): not run.** A ticket is a one-off work order, not a
standing rule; this review's reading is that the trial rule does not apply.
The cold reads are the only test of how an agent acts on these tickets.

**Rubric pass.** No further findings beyond IR1-IR4.

## Code quality

| ID  | Where                                            | What                                                     |
| --- | ------------------------------------------------ | -------------------------------------------------------- |
| S1  | commit `7ac5100d` subject                        | 52 characters; limit 50                                  |
| S2  | commit `7ac5100d` body                           | cause stated with no source; add "(ticket 860)"          |
| S3  | `scripts/tab-harness/test-tab-harness.mjs:65-67` | header comment still names `npx tsx` as the workers step |

S3 is in a file that the layout lock hashes: fixing it changes the digest and
needs a new green gate run and lock advance. S1 and S2 need a reword of
`7ac5100d`, which rewrites the branch's later shas but leaves the tree (and the
digest) unchanged.

## Summary

Round 1, three axes (domain skipped) plus `instruction-review` of the two
tickets. No confirmed code defect. The workers-build change does what ticket
860 asks, and the committed lock matches the source at HEAD and came from a
real green run.

**Blocks the merge until settled — A1 / P1.** The only green run used the
headless-shell browser, not the gate's own Chromium; whether the two lay out
the tab the same is untested, and a difference would be a silent wrong result
(a lock that certifies a layout the full build fails). It is settled by either
a green gate run on the full Chromium outside the sandbox (which the S3 fix
needs anyway, since S3 changes the digest), or the owner's ruling that a
headless-shell green is enough, quoted with the date in a `defer` row linked
to ticket 861.

**Open, for the agent handling findings:** code-quality rows S1, S2, S3
(the code-quality pass, then round 2).

**Fixed in `789aa911`:** P2, IR1, IR2, IR3, IR5, IR6 (ticket wording and the
ticket map).

Tickets: filed and closed counts to be written when the last Disposition table
is written.

## Disposition

| ID  | Axis               | Disposition | Ticket / note                                                                                                                                                           |
| --- | ------------------ | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A2  | Adversarial        | wontfix     | Not a defect: `node --import tsx` resolves the same tsx 4.23.1 the CLI used, and a missing tsx still fails `run()`                                                      |
| A3  | Adversarial        | wontfix     | Not a defect: the verify log was read mid-run; it now ends with `gates: 1606 ran, 0 skipped`                                                                            |
| P2  | Spec               | fixed       | `789aa911`: 860's closing note says the command measures the tab source on disk and writes no lock                                                                      |
| IR1 | Instruction review | fixed       | `789aa911`: 861 names `scripts/tab-harness/chromium.mjs`, the `testedTabHash` digest, the two docs, and that a measured fail counts                                     |
| IR2 | Instruction review | fixed       | `789aa911`: both tickets give the logs' absolute paths                                                                                                                  |
| IR3 | Instruction review | fixed       | `789aa911`: 860 cites `python scripts/check_layout_gate.py --print-hash`, same digest with and without the shim                                                         |
| IR4 | Instruction review | wontfix     | Not a defect: a ticket closes on its branch so the close merges with the fix, and `merge_to_dev.py:578-585` carries the lock onto dev unchanged when the digest matches |
| IR5 | Instruction review | fixed       | `789aa911`: both tickets name `800-desktop-gate-goldens-for-more-specs.md`                                                                                              |
| IR6 | Instruction review | fixed       | `789aa911`: map lines for 860 (closed) and 861 (open)                                                                                                                   |
