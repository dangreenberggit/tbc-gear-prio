# Independent process audit — merge-ready-disposition-parser

Auditor: independent adversarial seat, 2026-09-13. Read-only: no commits, no
merges, no `git add`, no HEAD movement, no edits outside this file. All git
commands run in PowerShell from `C:\Users\dgree\Code\lulz\tbc-gear-prio`.

Scope: `dev` and `fix/merge-ready-disposition-parser` from `a2a4295` to their
current tips.

---

## Verdict

The process discipline holds. Every durable number I tested reproduces from the
repo today, both hand-resolved conflicts are correct and lost nothing, no ticket
number collides, no work is stranded, and no commit swept in unrelated content.

Two of my own initial readings looked like findings and were **not** — I record
them below as refuted, because publishing them would have repeated exactly the
failure mode this audit was asked to hunt.

The real problems are all in the same family and none is about this stage's
logic: **commit-message mechanics against the repo's own cited rules**, and
**nothing has been pushed**. `dev` is 535 commits ahead of `origin/dev`, which
was last updated three weeks ago. CI has never run on any of this work.

---

## Findings, most severe first

### 1. `dev` is 535 commits unpushed; CI has never seen this work — CONFIRMED

`AGENTS.md` § Gates names CI (`.github/workflows/verify.yml`) as "the backstop if
a local hook is skipped", and § Durable claims says: "For CI byte-compare gates,
read a real CI run — do not predict from a local story about another OS."

```
git rev-list --count origin/dev..dev      -> 535
git log -1 --format='%h %s' origin/dev    -> 57684f4 Close ticket 245
git log -1 --format='%ci' origin/dev      -> 2026-08-21 10:58:10 -0700
git log -1 --format='%ci' dev             -> 2026-09-12 20:39:03 -0700
git rev-parse --verify origin/fix/merge-ready-disposition-parser -> rc=128 (no such ref)
```

Meaning: the backstop is inert. Every `pnpm verify` in this stage is a local
Windows run. `check_skill_mirrors.py` is a byte-compare gate, and the executor's
`.agents/` mirror edit was justified *by* that gate — sound reasoning, but the
claim "gate green" rests on a local run only. This is not a defect introduced by
this stage; it is a standing exposure the stage inherits and did not flag. The
feature branch exists only on this machine: a disk loss takes all eleven commits.

Severity is high not because anything is known wrong, but because the stage's own
rulebook designates CI as the check that cannot be bypassed, and it has been
bypassed by omission for three weeks.

### 2. The 72-column body wrap rule is broken in every substantial commit — CONFIRMED

`AGENTS.md` § Commit messages quotes cbea.ms rule 6, "Wrap the body at 72". I
first measured this through `git log --format=%b` and suspected a tooling
artifact, so I re-measured against the raw object bytes:

```
foreach ($h in @("32e92e6","632cd8e","43f5e93","fc98fdc","66b6d1c")) {
  $raw = git cat-file commit $h
  $blank = [array]::IndexOf($raw, "")
  $body = $raw[($blank+1)..($raw.Count-1)]
  ...
}
```

Output:

```
32e92e6  maxbodyline=76  over72=14
632cd8e  maxbodyline=77  over72=11
43f5e93  maxbodyline=77  over72=17
fc98fdc  maxbodyline=90  over72=13
66b6d1c  maxbodyline=78  over72=20
```

Confirmed real, not an artifact. The pattern is a consistent 73–78 columns, which
is the signature of wrapping to a ~76/78 target rather than 72. It affects
orchestrator-written and subagent-written commits alike, and commits on `dev`
from earlier stages too (`66b6d1c`, 20 lines over). `fc98fdc`'s 90-column line is
a bare file path, which is the one case a reader would forgive.

Nothing lints this, which is why it survived. Low functional impact, but it is a
rule the repo cites two external sources for and then does not follow anywhere.

### 3. Ten commit subjects exceed 50 characters — CONFIRMED

Rule 2 of the seven. Measured across all 49 non-merge commits in scope:

```
git log --format="%h|%s" --no-merges a2a4295..fix/merge-ready-disposition-parser
```

On the feature branch (3 of 14):

```
5e6d267 LONG(60)  Describe the parser's real behaviour, and when a row is owed
1cbd92b LONG(56)  Print a denominator and fail on lines that did not parse
67e058a LONG(51)  Revise the plan for the owner's vocabulary decision
```

On `dev`, including all four direct commits (`fc98fdc` 53, `bb647e8` 54,
`78434e8` 55, `d5f7cf9` 53) plus `26de42e` 54, `7e1378e` 51, `c2bfa00` 51,
`9c5a019` 54, `e6f956c` 53, `6698c23` 53, `f79e46d` 53, `ea72c7d` 54, `b29faef`
54.

Compliant on every other subject rule: all imperative, all capitalised, **zero**
trailing periods, and every commit has a blank line after the subject (the
blank-line check returned empty). `e5453df` lands exactly on 50.

### 4. Rule compliance I verified and found clean — CONFIRMED

**Commit hygiene / no ride-alongs.** Despite `lint-staged --no-stash
--no-hide-partially-staged` making scoping impossible, every commit's file list
matches its subject. The four parser commits (`e5453df`, `43f5e93`, `1cbd92b`,
`a0a5231`) and the fix (`632cd8e`) each touch `scripts/check_merge_ready.py`
**alone**. `144ef58` touches `package.json` alone. `5e6d267` touches exactly the
two skill mirrors plus `known-traps.md` — all three are the documentation slice.
No stray file anywhere in the range. The executor's ledger row admitting steps
2+3 merged into one commit *because* `lint-staged` cannot scope is the honest
disclosure of this constraint, not a violation of it.

**Direct commits to `dev` are legitimate.** `.githooks/pre-commit` is explicit:

```
# main only receives merges ... direct commits go to
# feature branches / occasionally to dev for tiny workflow fixes.
...
# Direct commits on dev (tiny workflow fixes) are still allowed.
```

Only `main` commits and un-flagged `dev` *merges* are refused. All four direct
commits are ledger/doc/lockfile edits, zero source files:

```
d5f7cf9  .scratch/carry-forward/map.md              1 file,  1 insertion
78434e8  data/wowsims-fork.lock.json                1 file,  2+/2-
bb647e8  two ticket files + one review file         3 files
fc98fdc  two tickets, NEXT, a log, known-traps.md   5 files
```

`fc98fdc` at 669 insertions stretches "tiny", but it is ticket-filing content
with no code. Permitted.

**The merges lost nothing.** For all three merges I compared each parent's
`map.md` against the result with `Compare-Object`, looking for lines present on a
side and absent from the merge:

```
=== 0072f03 === parent 1: 0 missing   parent 2: 0 missing
=== 8a54484 === parent 1: 0 missing   parent 2: 0 missing
=== d13c71e === parent 1: 0 missing   parent 2: 0 missing
```

Zero lines dropped anywhere. "Kept both sides" is accurate.

**The `NEXT` resolution was correct and did prevent reissue.** Only one merge
actually diverged:

```
0072f03 base(a2a4295)=376 p1=376 p2=381 result=381
8a54484 base(0072f03)=381 p1=381 p2=381 result=381   (no conflict)
d13c71e base(8a54484)=381 p1=381 p2=381 result=381   (no conflict)
```

Taking 381 over 376 is what protected 376–380, reserved in `c2bfa00` and all five
now occupied (376, 377, 378, 379, 380 each exist as a file). Had 376 won, the next
filing would have reissued a used number. The rule in `merge-order.md` — "`NEXT` =
the larger of the two sides" — is correct and was applied correctly.

*Briefing correction:* the task described this conflict as "379 vs 381". The repo
says 376 vs 381. 379 was `feat/spec-registry`'s `NEXT` at its own tip
(`HANDOFF.md:25`), which the merge-order table folds in as `max(381+k, 379)`.
The conclusion is unaffected; the premise as stated to me was imprecise.

**No ticket number collides.** Grouping every issue filename by number across both
branches produced no duplicates:

```
dev tip:      max=381  count=355  (no DUP lines)
feature tip:  max=382  count=356  (no DUP lines)
```

`NEXT` is 382 on `dev` (max present 381) and 383 on the feature branch (max
present 382). Both internally consistent; merging raises `dev` to 383 correctly.
Tickets 371, 372, 373 are absent, as expected after the renumber to 376–380.

**Skill mirrors are byte-identical**, which is what the executor's out-of-manifest
edit was justified by:

```
$a -ceq $c  ->  True
git log a2a4295..HEAD -- '*/parallel-phase/SKILL.md'  ->  (empty)
```

`parallel-phase` untouched in both trees, exactly as scoped.

**Stage artifacts are properly tracked** despite `.scratch/stage-gate/*` being
ignored: `.gitignore` carries `!.scratch/stage-gate/merge-ready-disposition-parser/`,
and all five artifacts (brief, plan, plan-review, decision-log, execution-report)
are in the tree. Provenance is re-derivable.

**Gate evidence exists.** I re-ran the two gates rather than reading the reports:

```
python scripts/check_merge_ready.py --self-test
  -> check_merge_ready.py pure logic ok (33 checks)   rc=0

python scripts/check_merge_ready.py
  -> merge-ready: ok   rc=0
     (7 rows, S2 defer -> 382 open, plus advisory WARN on tickets 262/382)
```

33 checks matches the decision log's re-measured figure, not the plan's "exactly
30" — and the log states the cause (the A1 fix added three). Both tickets 85 and
381 read `Status: closed`. The review file exists on the branch and **not** on
`dev`, confirming nothing was merged.

### 5. Two apparent findings that I refuted against myself — CONFIRMED refuted

Recording these because the brief asked specifically for unmeasured assertions,
and these two would have been mine.

**(a) Corpus `854/867/13` appeared wrong.** My first sweep of `docs/reviews/`
returned `rows 861 cand 874 unparsed 13` — a 7-row gap. Before reporting it I
noticed 861−854 = 874−867 = 7 exactly, and tested the obvious cause:

```
ALL   rows 861 cand 874 unparsed 13
OWN   rows 7 cand 7          (fix-merge-ready-disposition-parser.md)
MINUS rows 854 cand 867
```

The banked figure predates this branch's own review file, added in `f03d2c7`.
Excluding it reproduces `854/867/13` exactly. **The claim stands; my number was
the naive one.**

**(b) The "9 no-finding rows" appeared to be 17.** My first pass used a
hand-written regex over raw file text and returned 17 matches — but it was
matching summary-count tables that are not Disposition rows at all. Re-running
through the parser's own `scan_disposition`, scoped to Disposition sections and
excluding this branch's file:

```
OOV rows: 15  files: 8
    3 '—'                                  3 'fixed (proven, round 2)'
    3 'no change needed'                   1 'fixed (follow-up)'
    2 'no finding'                         1 'minor, accepted'
    1 'n/a'                                1 'fixed, then **superseded by measurement**'

no-finding rows: 9    decorated-real rows: 6    files: 8
```

**15 rows in 8 files, 9 meaning "no findings" in four spellings, 6 decorated real
dispositions** — ticket 381's Resolution reproduces exactly, field for field. The
em-dash count of 3 disposition cells also reproduces. The decision log's account
of settling this against the orchestrator's malformed spot-check of 10 is correct.

### 6. Executor self-reported figures reproduce — CONFIRMED

```
git rev-list --count e5453df~1..f03d2c7   -> 9
git diff --stat 14af11a..f03d2c7          -> 11 files changed, 801 insertions(+), 47 deletions(-)
```

Nine commits and `11 files / 801+ / 47-` match the execution report verbatim.
Ticket 382 exists, reads `Status: open`, and is linked from the review's
Disposition row S2 — the gate resolves that link and prints `ok`.

### 7. Minor: an advisory warning the branch leaves standing — PLAUSIBLE

`merge-ready` prints `WARN: 2 open ticket(s) name a file this branch changed`
(262 and 382). Advisory only, non-blocking, and 382 is this branch's own
deliberate deferral. 262 is pre-existing. Not a process breach; noted because the
merge ask should mention it rather than let the owner meet it at merge time.

---

## What I could not determine

- **Whether CI would pass.** No push exists, so there is no run to read. Per
  § Durable claims I will not predict one. Every green in this stage is local
  Windows only.
- **Whether `pnpm verify` is green at the feature tip.** The executor states it
  ran at `144ef58`, one commit before the tip, and the tip was covered by
  `merge-to-dev --check-only`. I ran the two `check_merge_ready` gates directly
  (both rc=0) but did not run full `verify`, which mutates nothing but is long
  and would contend with the shared checkout.
- **The pre-change baseline `cur: 749`.** Unrecoverable by construction — the
  parser it measured no longer exists. The execution report says so itself. It
  rests on a probe run I cannot reproduce.
- **Whether the tree was clean between every seat handoff.** Git records commits,
  not intermediate working-tree states. I confirmed the tree is clean **now**
  (`git status --porcelain` empty) and that no seat's commits contain
  out-of-slice files, which is the strongest available proxy. The decision log's
  per-gate clean-tree claims are not independently checkable after the fact.
- **The 33 other unmerged branches** (`git branch --no-merged dev`), including
  `feat/fan-out-retro`. Out of scope for this audit; `feat/fan-out-retro` is a
  known standing item and worktree sprawl is ticket 149.

---

VERDICT: CLEAN WITH NOTES — every durable number reproduces (854/867/13, 15 rows in 8 files, 9 no-finding, 33 checks, nine commits, 11 files/801+/47-); both conflict resolutions correct and lossless (zero map.md lines dropped across all three merges; NEXT 376-vs-381 resolved to 381, which is what protected the reserved 376-380); no ticket collision; no ride-along commits; direct dev commits permitted by .githooks/pre-commit's explicit carve-out. Notes: dev is 535 commits ahead of a three-week-stale origin/dev so CI has never run on any of this and the feature branch exists only on this machine; the 72-column body-wrap rule is broken in every substantial commit by both authors (73-78 cols, confirmed against raw object bytes); ten subjects exceed 50 characters. Two apparent discrepancies I found were my own measurement errors, not defects, and are recorded as refuted.
