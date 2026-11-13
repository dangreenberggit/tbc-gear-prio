# Pre-merge review — `feat/instruction-pointer-check`

Reviewed range: `9a4a56e1..fe5848d3`. Base `dev` = `9a4a56e1`. The tip at
the start of the review was `d8706f29`; `1dae640f` (tests, failing) and
`fe5848d3` (fix) are this review's fixes.

Reviewer: a fresh `general-task` (Opus) that did not write the branch,
running the `pre-merge-review` skill. Read as input, not in place of this
review: the design, build and finish reports, the code review with its
re-check, and the `86e3babb` re-check
(`.scratch/agent-reports/2026-11-13-general-task-pointer-check-*.md`).
The focus asked for: what can go wrong once `pointers:check` runs in
every `pnpm verify`. Probe scripts:
`.scratch/agent-reports/2026-11-13-pointer-check/pre-merge/probe.py` (fixture
cases P1 to P8) and `listptr.py` (lists every live pointer by target).

## Result

The check is safe to put in front of every push. It ran and passed in the
three places it will run: a local checkout (`271 checked, 0 dead, 0 style`),
GitHub CI (`84 checked, 0 dead, 0 style; 35 into ~/.claude skipped (CI)`,
run 43525425570), and a checkout with no fork (this worktree). The verify
cache cannot skip it.

The review found two ways the check failed correct text. Both are fixed
test-first:

- **R1.** On CI, a correct chain such as
  `` `~/.claude/x.md` § Notes (Claude Code), § Bars `` failed, while the
  local run passed it.
- **R2.** A quote mark that closes right after a backticked path, as in
  `He said "see `docs/agents/a.md`" and then "go".`, was read as the
  ruled-out path-and-quote form. Owner quotes and quoted YAML
  descriptions have this shape.

The largest standing risk is by design (owner ruling Q3, "global sites fail
this repo's verify"). The check reads every Markdown file under
`~/.claude/skills`, third-party skills included. One `§` written there by a
skill install or update blocks every push in this repo until that file
changes (R3).

## What runs where

| Pointer                                             | Local run                                               | CI (`CI` set)        |
| --------------------------------------------------- | ------------------------------------------------------- | -------------------- |
| repo file → repo file                               | checked                                                 | checked              |
| repo file → `~/` file                               | checked                                                 | skipped, counted     |
| `~/` file → anything                                | checked                                                 | not read             |
| anything → `.scratch/`                              | skipped, counted                                        | skipped, counted     |
| `~/.claude` missing or unreadable                   | fails                                                   | not looked at        |
| chain after a skipped `~/` pointer                  | does not happen (nothing under `~/` is skipped locally) | followed (R1 fix)    |
| file names that make `word § H` the ruled-out style | repo and home file names                                | repo file names only |

After the R1 fix, CI is never stricter than the local run. Every push runs
the local check first (`.githooks/pre-push:14`), so the local run is the
strict one.

## The five questions

### False failures that block unrelated branches

- **R1 (fixed).** When CI skips a `~/` pointer, the heading's end is
  unknown. The chain guess then treated `(`, `)`, `:`, `;` or `. ` plus a
  capital inside the heading as a sentence break, and resolved the next
  `§ B` against the repo file. Probe P1 (`python probe.py`): the three
  texts below gave rc 0 locally and rc 1 on CI, with
  `AGENTS.md:1: § Bars is not a heading in this file`.
  - ``Read `~/.claude/x.md` § Notes (Claude Code), § Bars.``
  - ``Read `~/.claude/x.md` § Testing: seams and § Bars.``
  - ``Read `~/.claude/x.md` § Notes (Claude Code) and § Bars.``

  Live home headings have this shape, for example `~/.claude/model-policy.md`
  § Manager / multi-step fan-out (any harness), which
  `docs/agents/orchestration.md:41` points at. Fix: after a pointer CI
  skipped as `~/`, the chain is always followed
  (`scripts/check_instruction_pointers.py:380`). The local run still fails
  a dead same-file pointer after a sentence break; the new test asserts
  that too.

- **R2 (fixed).** The path-and-quote pattern allowed nothing between the
  path's closing backtick and the quote mark, so a closing quote was read
  as the start of a quoted heading. Probe P8: a quoted YAML description
  ending in `` `docs/agents/x.md` `` followed by `model: "opus"`, and the
  owner-quote sentence above, both gave rc 1 (`a path and a quote: write
... § model:` / `§ and then`). Fix: a comma or a space must come between
  the path and the quote (`:278`). The ruled-out forms `` `x.md`, "H" ``
  and `` `x.md` "H" `` still fail (existing `t_style_quoted_heading`).
- **R3 (wontfix, owner ruling Q3).** Home sites are
  `~/.claude/skills/**/*.md` minus `.trash`: 218 files today. Only 8 hold a
  `§` (6 in `parallel-phase`, `writing-for-agents`, `code-review`).
  Third-party folders are sites too: `react-best-practices` (75 files),
  `review` (22) and `composition-patterns` (13), none with a `§` today.
  Probe P2: a skill file saying `Status codes follow RFC 9110 § 15.5.` gives
  rc 1. The failure line names the file, so the cause is quick to find. The
  fix is outside this repo.
- **R4 (wontfix).** Non-instruction files inside a home skill folder are
  sites. Probe P4: a dangling `ref.md` symlink gives `cannot read`, rc 1.
  Probe P5: a `node_modules/pkg/README.md` with `§ 3` gives rc 1. Today
  `find ~/.claude/skills -type l` and a search for `package.json` both
  print nothing.
- **R7 (wontfix).** A pointer into `vendor/` fails in every checkout
  without the fork, and on CI (probe P3: `vendor/tbc-new-fork/AGENTS.md is
missing`). No pointer targets `vendor/` today (`listptr.py`).
- **Old branches after a global change (note).** Every checkout shares the
  one `~/.claude`. If an installed global file starts pointing at a repo
  heading that exists only on newer `dev`, older branches fail until they
  merge `dev`. Today no other branch, local or on `origin` since
  2026-11-01, touches a site file (scan of `git diff --name-only
dev...<branch>`), so the merge itself moves no other branch.

### False passes on dead pointers

Known limits, each still present (code review `CR-F4`, `CR-F5`, `CR-F6`;
`86e3babb` re-check items 3 and 4):

- `CR-F4`: a dead heading passes when a live heading is its prefix
  (`§ Commits and merges` against a heading `Commits`).
- `CR-F5`: `§ 5. Old title` passes on the number.
- `CR-F6`: after a skipped `.scratch` pointer and a code span, a dead
  same-file pointer passes.
- `RC-3`: a bare file name outside the site globs is read as a same-file
  pointer (`PLAN-REVIEW § 2`), so the real target is never checked; it
  passes when the site file happens to have a heading of that name.
- `RC-4`: the file-name set for the ruled-out style differs by machine.

None has a live instance (code review `list.py`; the check prints 0 dead on
the live files). For `CR-F4` to `CR-F6`, each fix found so far turns a
false pass into a false failure of correct text of the same shape; see the
Disposition rows.

New here: **R6.** `.scratch/` targets are skipped because the design took
them to be gitignored, but much of `.scratch` is tracked (`git ls-files
.scratch`: 802 files under `carry-forward`, 299 under `handoffs`, 251
under `stage-gate`). A dead pointer into a tracked `.scratch` file passes
(probe P6). The one live `.scratch` pointer,
`~/.claude/model-policy.md:324`, targets the ignored
`.scratch/agent-reports/`.

### CI without `~/.claude`

On CI the check reads repo files only and skips every pointer that touches
`~/`. Run 43525425570 printed
`pointers: 84 checked, 0 dead, 0 style; 35 into ~/.claude skipped (CI)`
before the rest of verify. That run, and every `dev` run since
`feat/876-verify-cache` merged, is red for a reason this branch did not
cause: `scripts/verify_fork_guard.test.mjs` "run_verify.mjs consults the
pass cache, and runs in full when it has no key" expects
`could not compute` and gets `this is CI` (runs 43525425570 on this
branch, 43494768611 on `dev`). Verify stops at that step, so
`pointers:selftest` has not yet run on CI; Python on the runner for the
self-test is unverified (local: 3.10.12). `pointers:check` itself ran on
CI with `python`.

### The verify cache

`pointers:check` sits before `run_verify.mjs` in one `&&` chain
(`package.json:14`), and all three callers run `pnpm run verify`
(`.githooks/pre-push:14`, `scripts/merge_to_dev.py:544`,
`.github/workflows/verify.yml:51`). A cache hit inside `run_verify.mjs`
cannot skip it, and a failed check stops verify before any stamp is
written. `pointers:selftest` is a cached step, but it reads only the
tracked script, which the `main-tree` key part covers. The chain is
`preflight:node`, then `pointers:check`, then `run_verify.mjs`, as the
verify log of the fixed tip shows (line 4 `pointers: ...`, line 5
`verify: cache off ...`).

### A checkout without the fork

The check reads nothing under `vendor/`: no site glob covers it and no
live pointer targets it. This worktree has no `vendor/tbc-new-fork` and the
check passes here (`271 checked, 0 dead, 0 style`). It runs before the fork
guard in `run_verify.mjs`, so it gives its result even when verify then
refuses for the missing fork. Latent: R7.

## What the branch adds that nothing asked for

Nothing outside the design and the owner's later asks. Beyond the design:
`refs` lists dead pointers into a file, `.py`/`.sh`/`.json` targets count
`#` comment lines as headings, and the script is about 1190 lines against
the design's estimate of 300 (about half is self-test).

## Checks run

- `python scripts/check_instruction_pointers.py --self-test` at `1dae640f`:
  `2 of 48 failed`, the two new tests only, rc 1. At `fe5848d3`:
  `self-test ok (48 tests)`, rc 0. Run by a fresh `discrete-task`
  (`.scratch/agent-reports/2026-11-13-discrete-task-pointer-fix-check.md`).
- `python scripts/check_instruction_pointers.py check` at `fe5848d3`:
  `pointers: 271 checked, 0 dead, 0 style; 1 into .scratch skipped`, rc 0,
  0.25 s.
- `CI=true python scripts/check_instruction_pointers.py check`:
  `pointers: 84 checked, 0 dead, 0 style; 35 into ~/.claude skipped (CI)`,
  rc 0.
- `node --version; TBC_VERIFY_WITHOUT_FORK=1 pnpm verify` at `fe5848d3`
  (same agent): `v22.23.2`, rc 0, `gates: 1469 ran, 274 skipped`. The 274
  skips are the fork gates; this worktree has no fork.
- Probes P1 to P8 before and after the fix: P1 on CI and P8 went from rc 1
  to rc 0; P8b (the ruled-out `` `x.md` "H" `` form) still fails; the rest
  are unchanged.

## Notes

- **GLM workers and `~/.claude`.** `pnpm verify` now reads files under
  `~/.claude` and `~/.claude_router/agents`. `~/.claude/routing.md`
  § Private data counts any file under `~/.claude*` as private, while
  `AGENTS.md` § Spawning lets a workhorse run `pnpm verify`. A passing run
  prints counts only; a failing run prints a home file's heading list
  (`scripts/check_instruction_pointers.py:463`). Whether that matters is
  the owner's call.
- **Two ways round the check.** `CI=1` on a local run skips every `~/`
  pointer, and also puts `run_verify.mjs` in CI mode. `pnpm run
verify:steps`, the documented plain chain, has `pointers:selftest` but
  not `pointers:check`. Neither is guarded.
- **Open tickets on changed files (merge-ready, advisory).** 408 and 795
  name `scripts/run_verify.mjs`, where this branch changes only a doc
  comment; 879 and 882 are this branch's own new tickets. None is
  addressed here.
- **Message for a home-file failure.** It says "Fix the pointer or the
  heading" without saying the file is installed from outside this repo and
  changes only with the owner's approval (`~/.claude/AGENTS.md` § Agent
  instructions). An agent blocked on an unrelated push gets no hint that
  the fix is not its own.

## Disposition

| ID     | Axis        | Disposition | Ticket / note                                                                                                                                                                                                                   |
| ------ | ----------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1     | Adversarial | fixed       | CI never fails a chain the local run passes. Test `t_ci_never_fails_a_chain_that_passes_locally`: fails at `1dae640f`, passes at `fe5848d3`.                                                                                    |
| R2     | Adversarial | fixed       | A comma or a space must separate the path and the quote. Test `t_closing_quote_after_a_path_is_not_a_quoted_heading`: fails at `1dae640f`, passes at `fe5848d3`.                                                                |
| R3     | Adversarial | wontfix     | By the owner's ruling Q3 (design report, Open decisions), global sites fail this repo's verify. The failure names the file. Recorded here so the merge ask states it.                                                           |
| R4     | Adversarial | wontfix     | No symlink and no `package.json` under `~/.claude/skills` today. Failing loudly on an unreadable site is what the code review's F1 fix chose.                                                                                   |
| R6     | Adversarial | wontfix     | No live pointer into a tracked `.scratch` file. The skip is counted on the summary line.                                                                                                                                        |
| R7     | Adversarial | wontfix     | No live pointer into `vendor/`. The failure is loud and its message offers prose as the fix.                                                                                                                                    |
| CR-F4  | Adversarial | wontfix     | Limit of the approved pointer form, which has no end marker: `§ Size bound and § Hand-backs` and `§ Commits and merges` (heading `Commits`) have the same shape. No live instance. Listed as a known limit in the build report. |
| CR-F5  | Adversarial | wontfix     | `§ 7. Then do X` (number, then a new sentence) and `§ 7. Old title` have the same shape. No live instance; every numbered pointer uses the bare number.                                                                         |
| CR-F6  | Adversarial | wontfix     | A heading with code in it (`§ Run pnpm x first, and § Then`) and a sentence with code have the same shape when the heading's end is unknown. No live instance.                                                                  |
| CR-F10 | Adversarial | wontfix     | `refs` only; not part of `pnpm verify`.                                                                                                                                                                                         |
| CR-F12 | Adversarial | wontfix     | `~/.claude_router` exists only on machines with that card; with no folder there are no router cards to check.                                                                                                                   |
| RC-3   | Adversarial | wontfix     | Passes only when the site file has a heading of the same name; otherwise it fails as a same-file pointer. No live instance.                                                                                                     |
| RC-4   | Adversarial | wontfix     | The local set is the larger one, so the local run is the stricter. The failure is loud and names the fix.                                                                                                                       |
