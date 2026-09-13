# Handoff — merge-ready disposition parser

Written 2026-09-13. **The branch is complete, reviewed and green. Nothing is
merged and nothing is pushed. The next actions are all the owner's.**

Read this, then `decision-log.md` if you need the reasoning behind any gate.
Everything else is detail.

## Re-verify before you act

State measured 2026-09-13. Confirm before trusting any of it. **Use PowerShell
for git** — the Bash tool emits an fnm stderr line that corrupts output and
breaks `&&` chains; a bash heredoc also silently wrote nothing mid-session.
For `pnpm`/`node`, prepend the Node 22 path first (the tool shell defaults to
Node 20, and `pnpm` needs >= 22.13):

```powershell
$env:PATH = "C:\Users\dgree\AppData\Roaming\fnm\node-versions\v22.16.0\installation;" + $env:PATH
cd C:\Users\dgree\Code\lulz\tbc-gear-prio
git rev-parse --abbrev-ref HEAD              # fix/merge-ready-disposition-parser
git rev-parse --short HEAD                   # 07efe1e or later
git rev-parse --short dev                    # fc98fdc
git status --porcelain                       # clean (logs/ may be untracked)
git rev-list --left-right --count origin/dev...dev   # 0  535
python scripts\check_merge_ready.py --self-test      # 33 checks, rc 0
```

## What this branch did

Two independent defects in `scripts/check_merge_ready.py`, the gate that decides
whether a branch may merge to `dev`. Both let review rows through unread.

- **Ticket 85** — the section anchor used `re.search`, so only the first
  `## Disposition` section was parsed, and a heading with trailing text
  (`## Disposition (round 3)`) matched nothing. Worst real case: **9 rows read
  of 61**, on a branch already merged to `dev`.
- **Ticket 381** — the row pattern matched the disposition cell against
  `fixed|defer|wontfix`, so any other word failed the whole row and vanished.
  The `unknown disposition` error branch was unreachable from a table.

Both closed. The gate now prints `N parsed of M row-shaped lines in S
section(s)` and fails loudly — a row it cannot read by line number, a bad word
by row id.

**A third defect nobody had filed** surfaced during the work: three rows were
being dropped because their notes contain an escaped pipe (`\|`), one of them a
`defer` whose ticket path sat after the escape. Fixed in the same pass.

## The owner's vocabulary decision

Recorded because it is the one thing here that was not a measurement.

**The vocabulary stays at exactly three words.** An axis with no findings
contributes **zero rows** and says so in that axis's prose. The reasoning: a
Disposition row *disposes of a finding* — fixed it, ticketed it, waived it.
"This axis found nothing" disposes of nothing, because there was no finding. It
is the absence of an input, not a fourth outcome.

Both seats had proposed a fourth word and both were overruled. The planner then
stress-tested the decision rather than implementing it, and **found a real hole
it opened**: `check()` treated zero parsed rows as "no table", so a review whose
every axis came up clean would have failed the gate. Now a header row with no
body rows passes and prints `(no findings)`; a heading with no table still
fails.

The accepted consequence: nothing distinguishes "axis ran clean" from "axis
never ran". No vocabulary could have — the gate reads a word in a cell.

## The open items, in the order I would take them

### 1. Push (highest risk, owner undecided)

**`dev` is 535 commits ahead of `origin/dev`, which last moved 2026-08-21. The
feature branch has never been pushed at all.** So **CI has never run on any of
this work**, and `AGENTS.md` § Gates designates CI as the backstop for exactly
this case. Every "green" in this stage is one local Windows run.

That matters specifically for `check_skill_mirrors.py`: the executor edited the
`.agents/` mirror of a skill file because that gate byte-compares the two trees.
Sound reasoning, unverified anywhere but this disk.

The owner has hesitated twice, deliberately. **Do not push without an explicit
ask.** `git push` is also blocked for the agent by the permission classifier, so
it is the owner's command or a permission rule either way. The two halves are
separable and the owner should not have to decide them together:

```bash
git push -u origin fix/merge-ready-disposition-parser   # small, isolated, gets CI
git push origin dev                                     # 535 commits, three weeks
```

### 2. Merge ask for this branch

Re-run `pnpm merge-to-dev --check-only` before trusting it. Round 3 found it
failing from `dd03c8e` onward: closing ticket 382 left this branch's own
`defer` row pointing at a closed ticket. Fixed by moving row S2 to `fixed`.
**Do not merge without a separate
explicit ask** — a combined "review and merge" does not count (`AGENTS.md` § The
loop, step 6). `pnpm merge-to-dev` is the only supported door.

### 3. Ticket 383

Open: the six-line commit body maximum added by `07efe1e` has no exemption for
record-keeping commits. Ticket 382 is closed, fixed by `dd03c8e` on this
branch.

## Carried forward — not defects in this work

- **Commit bodies in this repo are long. A rule now exists.** Re-measured
  2026-09-13: 1466 non-merge commits, median body 12 non-blank lines, 279 at
  21+, longest 152. The repo is 49 days old with one author, so every commit is
  agent-written and the pattern is present in the first week. `07efe1e` adds a
  commit-message section to `docs/agents/home/AGENTS.md` that defaults to
  subject-only with a six-line soft maximum. An earlier draft of that rule was
  rejected by a `writing-for-agents` review for citing five wrong numbers and
  for setting a write-time threshold; the accepted version states a trigger
  rather than a count. The rule takes effect only after the owner copies the
  staged file to `~/.claude/AGENTS.md`, which was done this session.
- **Do not rewrite the long messages.** `docs/reviews/feat-upgrades-tab-batch-sim.md:208`
  already dispositioned this **wontfix**: ledgers and tickets cite those SHAs,
  and rebasing to reword breaks the evidence chain.
- **Eight historical review files now print `unknown disposition` failures** when
  the gate is run against them. This is expected and permanent — every one is on
  a merged branch that will not be gated again, and relabelling a no-finding row
  `wontfix` would record a finding that never existed. `plan.md` §
  Expected failures lists them by name.

## Mistakes made in this session — check these if you inherit the work

Recorded so an inheritor does not repeat them or trust a bad number.

- **A published count was wrong and a seat refuted it.** The orchestrator's
  em-dash spot-check returned 10; the correct figure is **3** (disposition
  cells) or 16 (em-dashes anywhere). Its `Group-Object` split on the wrong
  delimiter. The figure that landed in ticket 381 is 3, which is right.
- **The `AGENTS.md` draft cited five wrong numbers**, all in the direction that
  made the problem look worse: "800 commits" was a `--max-count=800` window
  reported as full history without stating the scope; "~30 days" was 49; "median
  13" was 12; "175 at 21+" was 269; "this session hit 40 lines" was **33**. The
  proposed threshold (30+) was calibrated just under a session maximum that did
  not exist. Rejected on that basis, correctly.
- **Two `Edit` calls failed** because the orchestrator guessed a file's line
  wrapping instead of reading it first — prettier reformats on commit, so
  remembered wrapping is unreliable. Read the tail before anchoring an edit.
- **A bash heredoc silently wrote nothing** (embedded backticks broke parsing).
  Use the Write tool for multi-line content, then `Add-Content` or `git commit -F`.

## Where everything lives

All under `.scratch/stage-gate/merge-ready-disposition-parser/`:

| File | What it is |
| --- | --- |
| `HANDOFF.md` | this file |
| `brief.md` | the stage's goal, constraints, and the three open questions |
| `plan.md` | revision 2 — the executed plan, with the Expected-failures table |
| `plan-review.md` | both adversarial review rounds (round 1 REVISE, round 2 PROCEED) |
| `decision-log.md` | every gate outcome and disposition, dated — the entry point |
| `execution-report.md` | what the executor did, with its nine-row deviation ledger |
| `logs/independent-process-audit.md` | independent audit of the git/dev process |

The branch review is at `docs/reviews/fix-merge-ready-disposition-parser.md`.

## One thing worth reading even if you skip the rest

The pre-merge review **caught a blocking defect in the executor's own fix**, and
it was this branch's own defect class in a narrower shape: `ROW_SHAPED_RE`
allowed leading whitespace while `DISPOSITION_RE` demanded `^\|`, so an indented
table row — legal Markdown — was counted as a candidate, reached neither the
parsed list nor the unparsed list, and passed as `merge-ready: ok`. A `defer`
with no ticket could have gone straight through the gate being fixed.

Fixed in `632cd8e` by a shared classifier plus a conservation check: the gate now
fails whenever `candidates - parsed - unparsed > 0`, which closes the class
rather than the instance. Two axes found it independently.

That is the argument for running the review even when the executor reports green.
