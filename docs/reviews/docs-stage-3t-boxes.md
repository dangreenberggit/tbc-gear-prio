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
| R8  | Adversarial | defer       | `.scratch/carry-forward/issues/627-desktop-gate-passes-with-byte-mismatches.md`                                   |
