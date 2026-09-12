# Plan review round 2 — work log

Date: 2026-09-12. Reviewer: focused second-round plan reviewer (Opus).

## What I was asked

Re-review ONLY the changed parts of revision 2 of
`.scratch/stage-gate/ledger-consolidation-and-merge-train/plan.md`.

Specifically:
- Confirm I am reading revision 2, not a stale copy (a previous reviewer read stale).
- Judge whether blocking findings F1, F2, F3 are genuinely fixed.
- Run F1's check (ii) PowerShell pipeline VERBATIM against the current
  `feat/spec-registry` review file and confirm it works and would catch a stale path.
- Confirm F2's conflict-resolution rule is applied everywhere, especially A8.
- Confirm A0's stop condition compares against the corrected C1/C2 and A1 cannot
  delete a checked-out branch.
- Fold in a known finding: `scripts/merge_to_dev.py:137-141` runs `pnpm run verify`
  itself, so the plan's standalone `pnpm verify` + `merge-to-dev --check-only` is a
  double run. Verify, judge, recommend, estimate wall-clock cost.
- Hunt NEW defects in material round 1 never saw: A5a, the Ticket-number allocation
  section, the verify-failure rule, C33–C36, and A8's "commit the regenerated
  sim-implemented-effects.json as a third commit" instruction.

Do not re-litigate settled findings. Do not re-derive C6, C7, C8, C13, C14–C16,
C19–C22, C24.

## State reviewed against

Repo root: `C:\Users\dgree\Code\lulz\tbc-gear-prio`. Checkout at session start:
branch `feat/reforge-catchup-leftovers` per the harness snapshot (but see A0/F3
section below — the actual checkout matters and I re-measured it).

plan.md SHA256: `AAC3D833DCE329CAA31A6505C58883D58F35922A5F74CE5EE8BD480F9E262ED0`
plan-rev1.md.bak SHA256: `EE010CBC9A936FE18479229962BC03E6DB35BDF695375AD13DD312B6563B95B1`

## Step 1 — confirm revision 2 (not stale)

Command:

```
Get-ChildItem $d | Select Name,Length,LastWriteTime
Get-FileHash $d\plan.md, $d\plan-rev1.md.bak -Algorithm SHA256
Get-Content $d\plan.md -TotalCount 3
```

Output (trimmed):

```
plan-rev1.md.bak    45954 9/12/2026 10:12:23 AM
plan.md             66356 9/12/2026 10:18:09 AM
plan.md          AAC3D833DCE329CAA31A6505C58883D58F35922A5F74CE5EE8BD480F9E262ED0
plan-rev1.md.bak EE010CBC9A936FE18479229962BC03E6DB35BDF695375AD13DD312B6563B95B1
# Plan — ledger-consolidation-and-merge-train (revision 2)
```

Line count: `(Get-Content $p).Count` → **302**. NOTE a dead end for future readers:
`(Get-Content $p | Measure-Object -Line).Lines` returned **226**, not 302, because
`Measure-Object -Line` counts differently on the piped string objects. Use
`.Count` on the array. Do not conclude the file is the wrong revision from the 226.

Markers present: C33, C34, C35, C36 (lines 116–119); `A5a.` (line 165);
`## Review findings — disposition` (line 287). Hashes differ from rev1.

**Conclusion: this IS revision 2. Proceed.**

## Step 2 — F1 check (ii), run VERBATIM

Command (PowerShell, exactly as plan.md line 173 writes it, with the branch ref
substituted for `HEAD` because the branch is not checked out right now):

```
git -C $R show feat/spec-registry:docs/reviews/feat-spec-registry.md |
  Select-String -Pattern '\.scratch/carry-forward/issues/\d+-[\w.-]+\.md' -AllMatches |
  ForEach-Object { $_.Matches } | ForEach-Object { $_.Value } | Sort-Object -Unique |
  ForEach-Object { "$_ $(Test-Path (Join-Path 'C:\Users\dgree\Code\lulz\tbc-gear-prio' $_))" }
```

Output:

```
.scratch/carry-forward/issues/373-spec-registry-shape-review-smells.md False
```

Conclusions:

1. **The regex works.** It extracted the ticket path from all seven `defer` rows
   (D2, S1-S6 — all cite the same 373 path, so `Sort-Object -Unique` collapses
   them to one line). Confirmed by dumping the raw rows:
   `git -C $R show feat/spec-registry:docs/reviews/feat-spec-registry.md | Select-String 'issues/'`
   → 7 rows, every one `.scratch/carry-forward/issues/373-spec-registry-shape-review-smells.md`.
   The sim-header review has 2 rows (A4 → `371-ticket-372-diagnosis-is-inverted.md`,
   D1 → `373-fork-upstream-touchpoints-sim-header-entry-stale.md`).

2. **The pipeline would catch a stale path** — it printed `False`, which is the
   failure signal the plan wants.

3. **BUT: `Test-Path` measures the WORKING TREE, not `HEAD`.** The `False` above
   is a false alarm in the sense that the path DOES exist on the
   `feat/spec-registry` tree:
   `git -C $R ls-tree --name-only feat/spec-registry .scratch/carry-forward/issues/ | Select-String '37[0-9]'`
   → lists 370-, 371-, 372-, 373-. It returned False only because my checkout is
   `dev`. In the plan's own sequence A7 has just run `git checkout feat/spec-registry`,
   so the working tree IS the branch and the check is valid there.
   Recorded as a caveat, not a defect: the check is correct in situ but silently
   wrong if ever run from another branch. It also reads `HEAD:` for the text while
   testing the working tree for existence — a mismatch that is harmless only
   because the two coincide right after a commit on the checked-out branch.

4. Check (ii) is largely **redundant with check (iii)**: `check_merge_ready.py`
   resolves `defer` paths the same way — against `ROOT` on the working tree.
   Source read: `git -C $R show dev:scripts/check_merge_ready.py`, lines 170-179
   (`ticket_path_from_note` → `ROOT / p`) and 452-472 (`if not tpath.is_file():
   errors.append(f"{row['id']}: defer ticket missing: {rel}")`). So (iii) subsumes
   (ii). (ii) is cheap and gives a per-path readout, so keeping it is defensible.

## Step 3 — C33 / duplicate verify, confirmed from source

`git -C $R show dev:scripts/merge_to_dev.py` lines 105-180 read directly. Confirms
every clause of C33:

```
113: ap.add_argument("--check-only", ... help="run verify + merge-ready only; do not merge")
126:     if branch in ("dev", "main"): die(...)
132/134: dirty tree -> die unless --check-only; prints "(working tree dirty - allowed for --check-only)"
137:     if not args.no_verify:
139:         v = run(["pnpm", "run", "verify"])
141:         if v.returncode != 0: die("pnpm verify failed", v.returncode)
146:     ready = check_merge_ready.check(branch=branch, ...)
166:     layout_rc = check_layout_gate.run(...)
172:     if args.check_only: print("\ncheck-only: ok (not merging)"); return 0
```

So **C33 is accurate**, including the "runs `pnpm run verify` itself" clause and
the `check-only: ok (not merging)` string at :173. The duplication the orchestrator
flagged is real: A5, A7, A8, B2 each run standalone `pnpm verify` and then
`pnpm merge-to-dev --check-only`, which runs the identical `pnpm run verify`.

`verify` is a 28-job serial `&&` chain (read from `git show dev:package.json`),
including the four fork gates (`engine-port-drift:check`, `equip-eligibility:check`,
`fork-lint:check`, `fork-universes:check`) plus `test`, `typecheck`, `lint`,
`format:check` and ~20 data checks. The layout gate runs only inside
`merge-to-dev`, not inside `verify`.

## Step 4 — F3 (C1/C2, A0, A1) re-measured

```
git -C $R branch --show-current           -> dev
git -C $R rev-parse --short dev           -> a2a4295
git -C $R merge-base dev feat/reforge-catchup-leftovers
                                          -> 85cbe9cd59675405ead4760eba86172bd14bf533
```

Ahead/behind (`ahead` = `rev-list --count dev..<b>`, `behind` = `<b>..dev`):

```
docs/fork-upstream-touchpoints : ahead=1  behind=8
feat/spec-registry             : ahead=14 behind=8
fix/sim-header-null-assertion  : ahead=3  behind=8
docs/reconciliation-design     : ahead=0  behind=8
feat/reforge-catchup-leftovers : ahead=0  behind=23
```

`git show dev:.scratch/carry-forward/issues/NEXT` -> `376`.
`git branch --merged dev` lists both `docs/reconciliation-design` and
`feat/reforge-catchup-leftovers`.

The plan's C2 row states exactly 3/8, 14/8, 1/8, 0/8, 0/23 with merge-base
`85cbe9cd...` for reforge-catchup — **matches my measurement**. A0's stop condition
cites "the **C2 table as written in this revision** (3/8, 14/8, 1/8, 0/8, 0/23)",
i.e. the corrected values. F3 fixed.

A1 safety: it checks out `docs/fork-upstream-touchpoints` FIRST, guards with
`git branch --show-current` printing that name, and uses `-d` not `-D`. Neither
delete-target is held by another worktree
(`git -C $R worktree list --porcelain | Select-String 'reconciliation-design|reforge-catchup-leftovers'`
→ empty), so no worktree-held-branch surprise. A1 cannot delete a checked-out branch.

## Step 5 — F2 (conflict-resolution rule) application, esp. A8

A8's expected conflict set verified independently:

```
git -C $R merge-tree --write-tree --name-only dev fix/sim-header-null-assertion
-> .scratch/carry-forward/issues/NEXT
   data/sim-implemented-effects.json
   data/wowsims-fork.lock.json
   (3 CONFLICT (content) lines, one per path)
```

Exactly the three C8 names. A8 line 175 contains the explicit
`git -C R add -- .scratch/carry-forward/issues/NEXT data/sim-implemented-effects.json data/wowsims-fork.lock.json`
— all three paths — then "apply the conflict-resolution rule; commit the merge".
A2 (line 135), A7 (line 171), B1 (line 185), B2 (line 187) each also name
`git add` / "conflict-resolution rule". F2 fixed, A8 included.

## Step 6 — A8's "regenerate as a third commit" fallback

`git -C $R diff dev fix/sim-header-null-assertion -- data/sim-implemented-effects.json`
→ 1 added / 1 removed line, and the differing line is ONLY:

```
-  "forkCommit": "bbad1b8a4325d8168758a909a520cf4dced875f6",
+  "forkCommit": "5e9013b78b720b32a5cf340f5f2fbda741665be5",
```

And the fork diff between the two pins:

```
git -C $R\vendor\tbc-new-fork diff --numstat bbad1b8a4... 5e9013b78...
-> 4  3  ui/core/components/sim_header.tsx
```

A UI component only — not an effects source. So the regenerated artifact at
`5e9013b78` cannot differ from the `--ours` resolution except in `forkCommit`,
which `--ours` already sets correctly. The `git diff --exit-code` will be rc 0 and
the "third commit" branch is a dead path that will not fire. It is a safety net,
not a mask: the `--exit-code` check runs BEFORE the fallback, so a bad resolution
is detected, and the plan also requires recording the diff in `state-at-exec.txt`.
Judged acceptable.

Clone state confirmed clean at `bbad1b8a4`
(`git -C $R\vendor\tbc-new-fork rev-parse --short HEAD` → `bbad1b8a4`, empty
`status --porcelain`).

## Step 7 — A5a ordering

`docs/agents/issue-tracker.md:22-27` (read from `dev`) says allocation is: read
`.scratch/carry-forward/issues/NEXT`, use that number, write the increment back in
the same commit. A5a commits `NEXT`=381 on the touchpoints branch BEFORE A5 runs
`pre-merge-review` on that same branch. Since the review skill reads `NEXT` from
the working tree at filing time, and the working tree is the touchpoints branch with
381 committed, any ticket it files takes 381+. **Ordering is sound.**
A5's acceptance (`NEXT` is `381 + k`) is consistent with A5a's (`381`).

## Step 8 — all three conflict sets independently confirmed

```
git -C $R merge-tree --write-tree --name-only dev docs/fork-upstream-touchpoints
-> .scratch/carry-forward/issues/369-no-ledger-records-...md   (1 CONFLICT)   == C22 / A2

git -C $R merge-tree --write-tree --name-only dev feat/spec-registry
-> .scratch/carry-forward/issues/NEXT
   .scratch/carry-forward/map.md                               (2 CONFLICTs)  == C7 / A7

git -C $R merge-tree --write-tree --name-only dev fix/sim-header-null-assertion
-> NEXT, data/sim-implemented-effects.json,
   data/wowsims-fork.lock.json                                 (3 CONFLICTs)  == C8 / A8
```

All three match the plan's stated expectations exactly. (Note `merge-tree` exits
non-zero when conflicts exist — that is expected, not a command failure.)

## Step 9 — verify wall-clock cost (delegated measurement)

Sent a read-only search agent over the repo for recorded timings. Results, with
sources, so nobody re-runs this search:

- **Full `pnpm verify`: 171s cold, ~92s warm repeat.** Only recorded on the
  UNMERGED branch `perf/verify-speedup`, at
  `docs/reviews/perf-verify-speedup.md:53` (commit `d16f22a`). Read it with
  `git show d16f22a:docs/reviews/perf-verify-speedup.md` — the file does not exist
  on `dev`. Component breakdown from commit `012e873`: lint ~52s→~4s,
  format:check ~15s→~3s, typecheck already incremental. The branch itself
  qualifies these as "on this machine", and the caching speedup is local-only:
  CI (`.github/workflows/verify.yml:46`) checks out fresh with no cache restore,
  so CI still pays the cold cost.
- **Layout gate: ~2m19s (139s).** Stated at `scripts/check_layout_gate.py:10` and
  restated at `:261`, `scripts/merge_to_dev.py:98` and `:161`. All four are the
  same single number; there is no underlying measurement record. Important: the
  layout gate is NOT part of the 28-job `verify` chain — it runs only inside
  `merge_to_dev.py` (line 166). So it is paid once per `--check-only`, not twice.
- **Four fork gates: NOTHING recorded.** No wall-clock timing exists anywhere in
  the repo for `engine-port-drift:check`, `equip-eligibility:check`,
  `fork-lint:check`, `fork-universes:check`. Only pass/fail evidence, e.g.
  `.scratch/handoffs/wowsims-reforge-catchup/EXEC-status-slices-C-D-E.md:144`.
  **This is a gap I could not close without running them, which I did not do.**
  So the orchestrator's phrase "four fork gates" cannot be costed separately;
  their cost is inside the 171s/92s total.

**Cost of the duplication, derived:** the standalone `pnpm verify` costs one extra
full chain run per affected step. Warm, that is ~92s; cold, ~171s. Four steps run
it (A5, A7, A8, B2), so the duplication costs roughly **6-11 minutes across the
plan**. It does NOT double the layout gate (that lives outside verify).

## Step 10 — NEW DEFECT found: F3 disposition row carries wrong numbers

`plan.md:293` (the `## Review findings — disposition` table, F3 row) says:

> C2 re-measured (8/8/8/8, leftovers 0/23, merge-base `85cbe9c`)

`8/8/8/8` is wrong. The ahead counts are 1, 14, 3, 0 — only the *behind* count is
8 for all four. Grep of every ahead/behind mention in the plan:

```
Get-Content plan.md | Select-String '8/8/8/8|3/8|14/8|1/8|0/8|0/23'
L84:  C2 row      -> 3/8; 14/8; 1/8; 0/8; 0/23   CORRECT
L131: A0 stop     -> (3/8, 14/8, 1/8, 0/8, 0/23) CORRECT
L293: F3 dispo    -> 8/8/8/8                      WRONG
```

Confined to the disposition prose. C2 and A0 — the two places an executor actually
reads to act — are both right, so this is cosmetic. Flagged as MINOR because this
plan's whole round-1 blocking finding F3 was "wrong numbers in the claims table",
and a second wrong number in the row that certifies F3 fixed is exactly the shape
of thing that misled the previous reviewer into reading a stale copy.

## Things I did NOT verify, and why

- I did not run `pnpm verify` or `pnpm merge-to-dev --check-only` on any branch.
  Running them would change the working tree / take ~3-6 min each and the task was
  a plan review, not an execution. So C27, C28, C29 remain `hypothesis, untested`
  exactly as the plan labels them — which is the correct labelling.
- I did not measure the four fork gates individually (see Step 9) — no recorded
  number exists and measuring meant running them.
- I did not re-derive C6, C7, C8, C13, C14-C16, C19-C22, C24 as instructed
  (round 1 verified them). I did incidentally re-confirm C7, C8 and C22's conflict
  sets via `merge-tree` in Step 8 because they were cheap and A8 was in scope.

## Dead ends (do not repeat)

1. `(Get-Content plan.md | Measure-Object -Line).Lines` → 226, not 302. Misleading.
   Use `(Get-Content plan.md).Count`.
2. A Bash heredoc (`cat >> ... << 'EOF'`) to append this log failed with
   "unexpected EOF while looking for matching `'`" because the log body contains
   apostrophes and backticks. Nothing was appended (verified by re-reading the
   file). Used the Edit tool instead. The repo's own fnm/Node shell-footgun note
   already warns against heredocs in these shells.
3. `git merge-tree` exits non-zero when it finds conflicts. Do not read that exit
   code as a command failure.

## Verdict recorded

**proceed** — with one minor fix (L293's `8/8/8/8`) and a recommendation to drop
the standalone `pnpm verify` in favour of relying on `merge-to-dev --check-only`'s
internal run, OR to keep it deliberately and say why in the plan. Full reasoning
delivered to the orchestrator in the final report.
