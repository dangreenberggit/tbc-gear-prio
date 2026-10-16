# Pre-merge review — docs/stage-3t-boxes

Reviewed range: `34fe4ac64a996518fe37da0b9234d905208c2416..8eca0f244af42e42e44a7081b1d13f29b894ca5f`

Dispatch: small-change lane, one fresh `general-task` reviewer on Opus
(effort `high`, review lane); `codex` is not on `PATH`.
`git diff --shortstat dev...HEAD` → `2 files changed, 67 insertions(+), 15 deletions(-)`;
`git diff --name-only dev...HEAD` → `PLAN.md`, `docs/verification-log.md`.
Domain brief not given: the diff records gate checks (commands, exit codes,
row counts, pins) and states no TBC, WCL or wowsims game fact.

## Adversarial

Every time, sha, count and exit code in the new entries matches its log
under `.scratch/stage-3t/` (main checkout, files dated 2026-10-12). The
reviewer re-ran, read-only: the box 1 loops (both printed nothing; 161 open
ids), the box 2 count (14), and the box 5 ancestry checks (rc 0 each). No
claim is false in a way that changes a box's result. Findings:

- **R1** (`docs/verification-log.md` 2599-2602, PLAN.md box 1). The re-run
  note named only boxes 3 and 4. Box 1 checks the tickets as they stood at
  `34fe4ac6`, and box 2's work closes tickets; box 5 goes stale if a pin
  moves. Left as is, all six boxes could read ☑ on old evidence when `dev`
  may merge to `main` (PLAN.md § Stage 3T: "When every box is ☑").
- **R2** (box 3, "which the box 4 run had just rebuilt from that commit").
  Measured mtimes on the pair's `vendor/tbc-new-fork/dist/tbc` (UTC):
  `lib.wasm.gz` and 79 files at 17:58, before box 1 started (18:00:25Z); the
  42 `bundle/` files and 66 files in all at 18:01, during box 4. Box 4's make
  output has no WASM compile. So the WASM engine box 3 served came from the
  pair's `--build`. That `--build` ran at `176268e7c` is a hypothesis,
  untested: no log records it; `worktree_pair.py` creates the fork branch at
  the lock's commit.
- **R3** (boxes 1 and 4). The entries name `corepack pnpm -s issues:open` and
  `corepack pnpm desktop-gate:check`; the logs show
  `python scripts/check_merge_ready.py --list-only` and
  `python scripts/check_desktop_tab.py`, the scripts those names run
  (`package.json`). Results stand.
- **R4** (box 3 `--out`). The run wrote
  `readback-wasm-ret-p4-cap40-2026-10-12.json`; PLAN's path
  `readback-wasm-ret-p4-cap40.json` holds an earlier run (`recordedAt`
  2026-10-12T03:16:42.548Z). Both have `runner` WorkerPoolSimRunner and
  `rowCount` 39. The readback's flag fields match PLAN's command.
- **R5** ("Node 22.17.1"). No log records the Node version; the desktop gate
  refuses Node older than 22 (`scripts/check_desktop_tab.py`, `refuse_old_node`).
- **R6** ("(a) to (f) and (h)"). No reason given for the missing (g);
  `scripts/check_desktop_tab.py:21-23` says it was deleted with ticket 567.
- **R7** ("main commit `34fe4ac6`") can be read as the `main` branch.
- **R8** (`scripts/check_desktop_tab.py` 668-670 and 703; not in the reviewed
  diff). `bytes_check` returning 1 (mismatches) does not fail the gate: only
  2 returns early, and the verdict is `gate_ok and golden_rc == 0`. A run
  with byte mismatches lists them and still prints `desktop-gate: PASS.` with
  rc 0. Predates this branch.

### The 140 against 2309 files compared

The committed text does not mention the count, and box 4's wording does not
ask for one, so its silence is accurate.

What "files compared" means (`scripts/check_desktop_tab.py:520-564`): every
file under `vendor/tbc-new-fork/dist/tbc`, minus `lib.wasm`, `lib.wasm.gz`,
the two `db.bin` files, `assets/db_inputs/` and `.dirstamp`, is fetched from
the packaged binary on port 3333 and compared by bytes. The binary embeds
`binary_dist`, made by `cp -r dist/tbc binary_dist/` (box 4 log). So the
check tests the embed-and-serve step, not whether dist matches the commit.

Measured by the reviewer with read-only `find`: the main checkout's
`dist/tbc` has 2314 files (2211 under `bundle/`), the pair's 145 (42 under
`bundle/`); each has 5 skipped files, giving 2309 and 140. All 2169 extra
files are under `bundle/`, with mtimes from 2026-09-10 to 2026-10-09; the 42
newest main-checkout bundle files (2026-10-11 20:08) have the same hashed
names as the pair's 42, the non-bundle file sets are identical, and the main
checkout's `paladin/retribution/index.html` references only the fresh names.
Both logs carry vite's warning that the outDir "will not be emptied". That
the old bundles piled up because vite never empties that outDir is inferred
from the warning and the dates (hypothesis, untested).

A fresh dist does not weaken the gate: the 140 live files are inside the
2309, so the live bundle gets the same check in both runs, and the other
2169 comparisons were of files nothing loads. Stale files cannot change the
byte result (they are copied into `binary_dist` and served unchanged), and
the byte result does not enter the verdict (R8). They could affect checks
(a)-(h) only if the page requested a stale chunk; index.html references only
fresh names (hypothesis, untested: the run's request list was not read).

## Standards + Spec

**Spec:** each ticked box's PLAN.md wording is met by its log: box 1 loops
print nothing; box 3 serves the fork's dist with `http-server` and gets
`rowCount` 39 = the README's expected count, with the `--out` deviation R4;
box 4 shows fork HEAD = lock `commit` (log line 1, `data/wowsims-fork.lock.json`)
and rc 0; box 5 runs both ancestry commands for each lock field and
`sync_wowsims.py --check` rc 0. Box 2 stays ☐ with the count 14, re-run by
the reviewer.

**Standards:** the AGENTS.md "Durable claims" rule is broken by R2, R3 and
R5 (claims beyond their logs); R6 and R7 are plain-English wording.

## Summary

All eight findings come from one reviewer in the small-change lane. R1-R7
are wording in the gate record — a process note — so they were handled as
bookkeeping: the reviewer's suggested text was applied in `eee1133d`, and
two lines it left over 80 columns were rewrapped (whitespace only) in
`372c7495`. R8 predates the branch and is deferred to ticket 627, which
also gets a Tab-adjacent row in `docs/upgrades-tab-scope.md`; the box 1
loops, re-run at `eee1133d` with `python scripts/check_merge_ready.py
--list-only`, printed nothing (162 open tickets).

Round 2 skipped: every commit since `8eca0f24` applies a bookkeeping fix,
files the R8 ticket, or only rewraps lines.
`git log --oneline 8eca0f244af42e42e44a7081b1d13f29b894ca5f..HEAD` before
this file's commit:

```
372c7495 Rewrap two Stage 3T log lines
eee1133d Fix Stage 3T record wording; file ticket 627
```

Tickets: 1 filed (627), 0 closed. This branch files more tickets than it
closes: it records gate evidence and closes no work.

No finding blocks the merge.

## Disposition

| ID  | Axis        | Disposition | Ticket / note                                                                                                     |
| --- | ----------- | ----------- | ----------------------------------------------------------------------------------------------------------------- |
| R1  | Adversarial | fixed       | `eee1133d`: boxes 1, 3 and 4 re-run before the `main` merge, box 5 if a pin moves; PLAN.md box 1 tick says so too |
| R2  | Adversarial | fixed       | `eee1133d`: `lib.wasm.gz` from the pair's `--build`, JS bundles from the box 4 run                                |
| R3  | Adversarial | fixed       | `eee1133d`: names the Python scripts the logs show                                                                |
| R4  | Adversarial | fixed       | `eee1133d`: notes PLAN's `--out` path holds an earlier run                                                        |
| R5  | Adversarial | fixed       | `eee1133d`: "Node 22 ... exact version was not logged"                                                            |
| R6  | Adversarial | fixed       | `eee1133d`: "check (g) was removed with ticket 567"                                                               |
| R7  | Adversarial | fixed       | `eee1133d`: "main-repo commit"                                                                                    |
| R8  | Adversarial | fixed       | `dd331b83`, `d21aed6d`: ticket 627 closed on this branch; see the addendum                                        |

## Addendum: 956363e5..d21aed6d

Two commits came after this review: `dd331b83` makes a byte mismatch fail
the desktop gate and closes ticket 627 (R8), and `d21aed6d` makes
`--update-golden` refuse to write on a byte mismatch. One reviewer read
`git diff 956363e5..d21aed6d` against the four questions the session asked.

**Verdict logic, by byte-check rc.** `bytes_check` returns only 0, 1 or 2
(`scripts/check_desktop_tab.py`, `def bytes_check`). rc 2 returns 2 before
the harness runs, as before. rc 1 runs the harness, then `gate_passed`
gives FAIL (rc 1) and `golden_refusal` refuses the write. rc 0 gives the
old verdict, `gate_ok and golden_rc == 0`. Any other value fails both,
because both test `!= 0`. The rest of the normal path (harness, (a)-(f),
(h)) is unchanged. `python scripts/check_desktop_tab_verdict.py` passes (7
cases). With the old verdict or the old golden rule patched in, it fails
on `(1, True, 0)` and `(1, True)`.

**Pattern.** `check_desktop_tab_verdict.py` copies `check_merge_to_dev.py`:
a standalone script, `sys.path` insert, exit 0 or 1, wired as
`desktop-gate:unit:check` at the end of `verify:steps`. Importing
`check_desktop_tab` runs only constant assignments, so the check needs no
fork, build or Chrome.

**Ticket 627 and the scope doc.** The close has `Verified by:` with two
commands in backticks (`docs/agents/issue-tracker.md` § Closing a ticket),
and the Tab-adjacent row for 627 is gone from `docs/upgrades-tab-scope.md`
in the same commit (§ Maintenance). The "PASS on fork 176268e7c" run is not
on disk as a log; `.scratch/desktop-gate/last-run.json` (11:33, between the
review and `dd331b83`) shows a finished 40-candidate run with 39 rows and
no panic, which agrees with it.

**Comments** explain why, apart from A3.

Ticket 407 (`--full --update-golden` writes a golden nothing reads) stays
open. Its second fix option, a refusal, would now go in `golden_refusal`;
the ticket leaves the choice of fix open, so this addendum does not make it.

## Disposition (addendum)

| ID  | Axis        | Disposition | Ticket / note                                                                                                     |
| --- | ----------- | ----------- | ----------------------------------------------------------------------------------------------------------------- |
| A1  | Standards   | fixed       | R8 was `defer` to 627, now closed, so `merge-ready` failed on R8 (a defer ticket must be open). R8 is now `fixed` |
| A2  | Adversarial | fixed       | The `(bytes) FAIL` line tested `brc == 1` while the verdict tests `!= 0`; it now tests `!= 0`                     |
| A3  | Standards   | fixed       | `gate_passed` comment said "the committed dist"; `dist/tbc` is a build output, not committed. Reworded            |
| A4  | Adversarial | fixed       | A mismatch plus "could not run (h)" returned 2 without the `(bytes) FAIL` line; the line now prints before that   |

## New work: 14068730..8207dc06 (merge of `dev`, the bullet, both pins, the re-run)

Reviewed range: `1406873094f159cd53dbb15f55db6465f0eb2aef..8207dc06774692870b0e52917d6877cf0a2fc041`

This range is new work, not fixes for the findings above, so the focused
check's condition 1 cannot hold. It is reviewed as a fresh round 1 for new
work ("Round limit": "a fresh round 1 for new work"). Commits: `6e0d86ef`
(merge of `dev` `3e9423bf`; only its conflict resolutions were reviewed, with
`git show --remerge-diff 6e0d86ef`), `7503048f` (the paired-worktrees bullet,
owner-approved: "sure"), `962087b8`, `883b3dd0`, `a8027231` (both pins to
upstream `master` `e804c29e8`, v0.0.150), `66b36da3` (ticket 674 closed),
`8207dc06` (Stage 3T boxes 1-5 recorded). The pins moved rather than box 5
being reworded, under ADR-0036's owner quote "keep up to date with normal git
behavior and less pin obsessions" (as relayed by the session).

Dispatch: full axes, because the range changes paths under `data/` (both
locks, `data/sim-implemented-effects.json`, 44 `data/pool-listings/*`).
`git diff --shortstat 6e0d86ef..8207dc06` → `53 files changed, 274
insertions(+), 145 deletions(-)`. Adversarial and Standards + Spec (the
`code-review` skill, which spawned one Standards and one Spec agent) each ran
on a fresh `general-task` agent on Opus (effort `high`, review lane); `codex`
is not on `PATH`. Domain axis skipped: the range states no TBC, WCL or
wowsims game fact of its own. Upstream's eight commits change the arcane mage
rotation, a UI helper and seed-0 handling; whether they reach ret or feral
requests is an engineering question, and the adversarial axis answered it
(B6).

### Wowsims-file audit (owner rule: only the 6 approved lines of `ui/app/SimTabsSection.tsx`)

Run by the dispatching agent from the pair:

```
git -C vendor/tbc-new-fork merge-base e804c29e8 bc96d0a03          # -> e804c29e8d61...
git -C vendor/tbc-new-fork diff --numstat --diff-filter=M e804c29e8 bc96d0a03
# -> 6  0  ui/app/SimTabsSection.tsx
git -C vendor/tbc-new-fork diff --name-status e804c29e8 bc96d0a03 | cut -f1 | sort | uniq -c
# -> 268 A, 1 M (the same counts as 5262ff38..8cd8d1c80)
git -C vendor/tbc-new-fork diff 8cd8d1c80 bc96d0a03 -- ui/app/SimTabsSection.tsx | wc -l   # -> 0
```

`git diff 8cd8d1c80 bc96d0a03` is byte-identical to `git diff 5262ff38
e804c29e8` (compared with `diff`, rc 0): the fork merge added upstream's 8
files and nothing else. The rule holds at `bc96d0a03`.
`docs/fork-upstream-touchpoints.md` still names the old pins (B2).

### Adversarial

No new commit can make the tab or the CLI show a wrong figure. Checked
clean, with the reviewer's commands: the merge resolutions keep
`desktop-gate:unit:check` in `verify:steps` and take dev's
`pool-listings:check`; `map.md` is dev's file plus the 627 line; ticket
numbers do not collide (`NEXT` 675, highest file 674). `git ls-remote --tags
upstream` gives `e804c29e8 refs/tags/v0.0.150`, the same sha as
`refs/heads/master`. All 114 pinned paths in `data/wowsims.lock.json` are
outside upstream's 8 changed files and their sha256 values match the blobs at
`e804c29e8`. `sync_wowsims.py --check`, `check_pool_completeness.py --check`,
`sync_fork_universes.py --check`, sim-implemented-effects, equip-eligibility,
ep-presets, meta-conditions and the other pin-derived checks exit 0. The fork
lock's `_comment` gained an entry and lost nothing. Box figures re-run match.
Findings:

- **B1** (`docs/agents/paired-worktrees.md:76`, `7503048f`). `go build -o
wowsimtbc.exe ./sim/web` fails in a fresh pair: `sim/web/main.go:22`
  imports `github.com/wowsims/tbc/binary_dist`, which the fork's
  `.gitignore:13` ignores. `.claude/launch.json:42` writes the stub first. It
  worked in this pair only because the desktop gate had made `binary_dist/`.
  Loud failure, introduced by this branch.
- **B2** (`docs/fork-upstream-touchpoints.md:33-51`). The doc names fork
  `316326a95` on base `5262ff38`. With the old base and the new tip,
  `git diff --name-only --diff-filter=M 5262ff38 bc96d0a03 | wc -l` prints 9:
  upstream's 8 files read as fork edits. The fork sha was already stale on
  `dev` (last refresh `243329e7`).
- **B3** (ticket 674:42-44). Closed while its Done means said "On `dev`" and
  required the `dev` -> `main` / `tab-1` question to be asked.
- **B4** (`962087b8`, `883b3dd0`). No tracked record of the catch-up
  procedure's build and gate checks (§1 `fetch:wowsimcli` twice, §2 re-run,
  §4 `go build` / `go vet`, `fork-lint:check`, layout gate, §5 `pnpm
verify`).
- **B5** (`docs/verification-log.md`, boxes 1, 3, 4, 5). The 2026-10-12
  sections had no pointer to the 2026-10-16 re-run; box 3 still read "39
  expected" while the README now says 40.
- **B6** (`docs/verification-log.md`, "The engine move did not change the
  ret or feral figures"). Wider than its evidence (one ret config, one feral
  fixture). The conclusion holds for a reason the entry did not give: the tab
  and the CLI start seeds at 11 (`DEFAULT_SEED_BASE`, fork
  `ui/features/upgrades/model/engine/rank.ts:725`,
  `packages/core/src/rank.ts:557`), and only `ui/specs/mage/dps/spec.ts:181`
  calls `hideScheduledCooldownCasts`.

### Standards + Spec

**Standards.** Commit messages meet the seven rules; no banned words in the
added text; the engine lock diff changes only `tag`, `commit`,
`watchedRefs.master` and `proto.commit`.

- **S1** = B1, against AGENTS.md "Durable claims" and
  `docs/agents/upstream-catch-up.md:312-313` ("`sim/web/main.go` imports
  `binary_dist`, which is gitignored").
- **S2** (`66b36da3`). Ticket 674's `Verified by:` command printed 1 at the
  closing commit and 0 only at `8207dc06`, where box 2 was ticked.

**Spec** (ticket 674, PLAN.md § Stage 3T, `upstream-catch-up.md`, ADR-0036):
boxes 1-5 meet their PLAN.md wording.

- **S3** = B3.
- **S4** = B4, measured by searching the commit bodies and the
  verification-log diff; the pair's only verify log
  (`.scratch/stage-3t/verify-2026-10-16.log`, 20:11Z) predates `962087b8`.
- **S5** = B1, against ticket 674:43.
- **S6** (scope). Ticket 674 did not ask for a pin move; the pins moved
  because box 5 failed (`.scratch/stage-3t/box5-pins-on-master-2026-10-16.log`:
  "DRIFT: pin is behind master", rc 1). ADR-0036 Decision 2 allows an engine
  move "by the full procedure". Not a defect.

**Known items.** K1 = B2: no doc or procedure says to refresh
`docs/fork-upstream-touchpoints.md` on a pin move (`git grep -n
fork-upstream-touchpoints -- docs/agents .claude/skills` names only this
skill). K2: `packages/core/test/fixtures/synthetic-roster-recordings.json`
stamps `simVersion 5262ff386...`; ADR-0033 Consequence 7
(`docs/adr/0033-upstream-is-master-again.md:204-207`) leaves re-recording
open, and open ticket 360 covers the missing check; no gate compares the
stamp with the lock.

### Fixes

`ab0d3471` fixes B1, B3, B4, B5 and B6 and files ticket 675 for B2:

- B1: the bullet now writes the stub with `make -C
<pair>/vendor/tbc-new-fork binary_dist/dist.go` (`make -n -B` prints
  `mkdir -p binary_dist/tbc`, `touch binary_dist/tbc/embedded`, `cp
sim/web/dist.go.tmpl binary_dist/dist.go`), then `go build`, then starts
  with the flags from `.claude/launch.json`. This changes owner-approved text;
  the session relayed the owner's standing answer for factual fixes ("If it's
  a certain factual fix then of course"), which this review did not see. A
  fresh pair was not built to test it (untested).
- B3: ticket 674's Done means names this branch, and the `main` question
  stays with the session and PLAN.md § Stage 3T.
- B4: the 2026-10-16 entry records what the executor reported to the session
  (relayed, not logged) and what this review re-ran: `sha256sum` of
  `vendor/wowsimcli-e804c29e8...-win32-x64/wowsimcli-windows.exe` prints
  `6efbc4670ab0...`, the relayed hash; the pin-derived checks above; and
  `merge-to-dev --check-only`. The layout gate has no record; upstream's 8
  files contain no stylesheet and no tab file.
- B5: one-line pointers under boxes 1, 3, 4 and 5.
- B6: the sentence names what was compared and gives the reason.

## Disposition (new work)

| ID  | Axis        | Disposition | Ticket / note                                                                                                                                |
| --- | ----------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| B1  | Adversarial | fixed       | `ab0d3471`: stub step and start flags added to the bullet                                                                                    |
| B2  | Adversarial | defer       | `.scratch/carry-forward/issues/675-fork-upstream-touchpoints-names-old-pins.md` — doc names old pins; predates this branch for the fork sha  |
| B3  | Adversarial | fixed       | `ab0d3471`: ticket 674 Done means narrowed to this branch                                                                                    |
| B4  | Adversarial | fixed       | `ab0d3471`: relayed outputs and the review's re-runs recorded in the 2026-10-16 entry                                                        |
| B5  | Adversarial | fixed       | `ab0d3471`: pointers under boxes 1, 3, 4 and 5                                                                                               |
| B6  | Adversarial | fixed       | `ab0d3471`: sentence narrowed, reason cited                                                                                                  |
| S1  | Standards   | fixed       | Same defect as B1; `ab0d3471`                                                                                                                |
| S2  | Standards   | wontfix     | Close and `Verified by:` both hold at the tip, and the branch merges whole                                                                   |
| S3  | Spec        | fixed       | Same as B3; `ab0d3471`                                                                                                                       |
| S4  | Spec        | fixed       | Same as B4; `ab0d3471`                                                                                                                       |
| S5  | Spec        | fixed       | Same defect as B1; `ab0d3471`                                                                                                                |
| S6  | Spec        | wontfix     | Pin move was needed for box 5 and ADR-0036 Decision 2 allows it                                                                              |
| K2  | Standards   | defer       | `.scratch/carry-forward/issues/360-nothing-binds-a-recorded-fixture-to-the-engine-pin.md` — stale `simVersion` stamp, ADR-0033 Consequence 7 |

## Focused check (round 2)

Reviewed range: `8207dc06774692870b0e52917d6877cf0a2fc041..ab0d3471df13d44e07f3f96a4b293a897775a987`

Fork range: `bc96d0a03..bc96d0a03` (the fork lock did not change). One fresh
`general-task` agent on Opus (effort `high`) ran the four checks.

1. **Conditions: hold.** `ab0d3471` names the findings it fixes; it changes
   only docs, tickets and the scope doc
   (`git diff --name-only 8207dc06..ab0d3471 -- data vendor` is empty); fork
   HEAD equals the lock's `commit`.
2. **Each fix is the asked change: yes, with F1-F3 below.** The make target,
   start flags, sha256, seed base, the one `hideScheduledCooldownCasts`
   caller, the B5 pointers and every ticket 675 claim re-ran as written. The
   scope-doc re-pad changed no cell text (whitespace-collapsed difflib
   compare: only the added 675 row), and both § Maintenance loops print
   nothing (160 open ids).
3. **New tests:** none in this range.
4. **Tests touched:** none.

Findings:

- **F1** (`docs/agents/paired-worktrees.md:79`). The start command is a
  bare `wowsimtbc.exe ...`; neither Git Bash nor PowerShell runs a bare name
  from the current folder (`command -v wowsimtbc.exe` rc 1 in the fork;
  `Get-Command` finds nothing). `.claude/launch.json` uses `.\wowsimtbc.exe`.
  Loud failure, written by the B1 fix.
- **F2** (`docs/verification-log.md`, the B6 sentence and the B4 paragraph;
  ticket 674's narrowing note). The B6 sentence lists three upstream changes
  and then says "Neither change", covering two (the arcane APL change is
  mage-only by its paths, but the text does not say so). "the same
  `sha256=6efbc467...` both times" repeats itself. The ticket note says the
  review narrowed Done means and "this review did not see the owner's
  words", which leaves unclear who "this review" is. Code quality (writing).
- **F3** (`docs/verification-log.md`, B4 paragraph). It says the
  `merge-to-dev --check-only` commit and result are in this file; at
  `ab0d3471` they were not. Bookkeeping: the "Check-only" section below
  records them.

**Round limit: stopped.** Round 2 reported a loud failure (F1) and a
code-quality finding (F2) in the lines the fixes wrote, so the review stops
here and does not fix and review again. Likely cause: the B1 fix copied the
start flags from `.claude/launch.json` but dropped its `.\` prefix, and the
B6 and B4 edits were written without a second read (hypothesis, untested).
The owner decides the next step. The fix F1 asks for is two characters:
`./wowsimtbc.exe` (Git Bash) or `.\wowsimtbc.exe` (PowerShell) at
`docs/agents/paired-worktrees.md:79`.

## Summary (new work)

The new work (merge of `dev`, the live-tab bullet, both pins on upstream
v0.0.150, the Stage 3T re-run) cannot change a figure the tab or the CLI
shows, and the fork still changes only the 6 approved lines of
`ui/app/SimTabsSection.tsx`. Round 1 found one loud failure (B1: the
bullet's `go build` fails in a fresh pair) and bookkeeping gaps in the
record; `ab0d3471` fixed them and filed ticket 675 for the stale touchpoints
doc. Round 2 found that the B1 fix's start command fails as written (F1),
plus wording (F2) and a bookkeeping gap (F3, closed below).

**Blocking the merge:** F1, a loud failure written on this branch, until it
is fixed or the owner allows a deferral. F2 is open with it.

Tickets: 2 filed (627, 675), 2 closed (627, 674).
Open tickets this review links: 675 (B2), 360 (K2).
