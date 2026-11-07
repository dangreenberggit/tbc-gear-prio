# Pre-merge review — feat/452-reword-and-close

Reviewed range: `a094a28b5301debb9560e4f8b67e070010b77af6..a29ea0cacee6ef72f3cacab1f4a30c245024c6f7`

Dispatch note: the branch is stacked on `feat/452-spec-page-scans`
(`a094a28b`), which has its own review
(`docs/reviews/feat-452-spec-page-scans.md`), so round 1 reads only this
branch's commit (`a094a28b..a29ea0ca`, one commit), not `dev...HEAD`.
`python scripts/check_merge_ready.py --product-files` (rc 0) prints E's
stack plus three files from this range: `data/pools/README.md`,
`scripts/tab-harness/README.md`, `packages/core/src/pool.ts`. The axes
read those three. The other two changed files (tickets 452 and 802) are
in `TOOLING_PATHS` and get `instruction-review`. Full axes, not the
small-change lane: `git diff --shortstat a094a28b..HEAD` gives
`5 files changed, 86 insertions(+), 4 deletions(-)`, within the size
limit, but `packages/core/src/pool.ts` starts with `packages/core/src/`.
Domain axis skipped: the diff states repo facts (which files exist,
which flag a script takes, what an ADR says), and no TBC, WCL or wowsims
game fact. No `codex` on `PATH`; the adversarial axis, the two
`code-review` axes (Standards, Spec) and the instruction review ran as
four parallel `general-task` agents on Opus. The working tree has
untracked home-stub files (`.bashrc`, `.bash_profile`, `.gitconfig`,
`.idea`, `.claude/commands` and others) that are not this branch's work.

## Adversarial

No defect in the three reworded sentences. Each was checked against the
source at `a29ea0ca`: `data/universes/` holds 11 specs × p2–p5
(`ls data/universes`); `scripts/assemble_universe.py:2892-2895` takes
`--spec` for every `SPEC_PROFILES` entry; `loadUniversePool` reads
`data/universes/${spec}-p${maxPhase}.json` as `UniverseEntry[]` for any
spec (`packages/core/src/cli-wiring.ts:98-112`); `run-tab-cdp.mjs`
parses `--page` (`:107`) with default `/tbc/paladin/retribution/`
(`:89`); ADR-0038 § Decision says the tab builds its pool at run time
and bundles no universe file.

- **A1** (low). `data/pools/README.md:4` says "one file per spec and
  phase", but there is no p1 file: `ls data/universes | grep -c p1`
  prints 0, and the assembler accepts phases 2–5 only
  (`scripts/assemble_universe.py:2890`, `choices=[2, 3, 4, 5]`).

Unexamined: the fork's `pool_source.ts` (no `vendor/tbc-new-fork` in this
checkout), so "builds its pool at run time" is checked against ADR-0038
only. Test integrity and `RankError` lanes: the diff changes no code or
test.

## Domain

Skipped (see the dispatch note).

## Standards + Spec

### Standards

- **S1** (documented rule). The commit subject "Reword ret-only docs and
  note the 452 bar" uses a ticket number and a coined term as its
  description (`~/.claude/AGENTS.md` § Plain English: "A ticket number,
  an internal label or a term you coined is not a description";
  `git log -1 --format=%B a29ea0ca`). The seven commit rules pass.
- **S2** (judgement call). `packages/core/src/pool.ts:155` is 82
  characters; `.prettierrc` sets `printWidth: 80`, and Prettier does not
  wrap comments.
- **S3** (judgement call). `scripts/tab-harness/README.md:53`
  "(`--page`, default the ret page)" has no verb; plainer: "(`--page`;
  the default is the ret page)".
- **S4** (judgement call, outside the diff). The header comment at
  `scripts/tab-harness/run-tab-cdp.mjs:2` still says "It drives a full
  or capped ret run"; the README sentence it mirrors was reworded and
  this one was not.

### Spec

Spec: ticket 802 "What to do" and "Done when". The step-1 grep at HEAD
prints 60 files, as the Comments say. None of chains A–E is on `dev`
(`git merge-base --is-ancestor <branch> dev` false for all five). Every
claim the slice F note makes about the other branches was checked:
799 and 803 closed on `feat/452-survival-arms`; 746 and 804 closed on
`feat/452-meta-repair-hit-cap`; 801 closed on `feat/452-spec-page-scans`;
800 open on `feat/452-desktop-goldens`, whose `GATED` has ret, mage,
rogue and enh at phase 4; `ep-presets:check` is in `verify:steps`
(`package.json:15`). No scope creep.

- **P1** (minor). 802's Comments leave out one grep hit,
  `scripts/tab-harness/page-coverage.test.mjs:12`
  (`const PAGES = { ret: ..., mage: ... }`). It is a code fact and needs
  no change; only the list is incomplete.
- **P2** (minor). `452:171-172` "E's merge waits on owner question
  Q-452e-r1": the label is in no tracked file on any of the five chain
  branches (`git grep Q-452e <branch>`); E's review calls the item "R1"
  (`docs/reviews/feat-452-spec-page-scans.md:130` on that branch).
- **P3** (minor). `452:170` "Survival and Arms have no page of their
  own (owner, 2026-11-06)" states as fact what the owner hedged: the
  owner's words, quoted in 452 itself at lines 128-131, are "dont see to
  be different website routes", "as far as the owner could see".
- **P4** (minor, outside the diff). The step-1 grep pattern does not
  match bare "ret", so two script docstrings that now say something
  false were not reviewed: `scripts/assemble_universe.py:3` "build
  phase-scoped ret candidate universes" (the script takes `--spec` for
  every spec) and the `run-tab-cdp.mjs:2` comment in S4.

## Instruction review (tickets 452 and 802)

Full path: the 452 note adds a rule for when the epic closes. Two cold
readers (one per ticket) both kept 452 and 802 open today, as intended.

- **I1** (should fix). `452:188-189` "452 closes when 799, 800, 746,
  801, 803 and 804 are closed on `dev`, 802 is closed, and
  Q-452-bar-universes is answered." This drops "the coverage bar is
  met" (452:66-67) and 802 step 3's "only if every bar line is met". If
  the owner answers Q-452-bar-universes with "check them per spec", the
  sentence lets a later session close 452 with that work not done.
  Rewording it to point back at the bar restores the old rule.
- **I2** (should fix). `802:62-63` "Proposed text: Q-452-sme-skill in
  session F's handoff." gives no path. The file is
  `.scratch/handoffs/2026-11-06-452-sme-skill-proposal.md` in this
  worktree, and it is ignored by git
  (`git check-ignore -v` → `.git/info/exclude:18:.scratch/handoffs/*`),
  so another worktree cannot read it, and it is lost when this worktree
  is pruned.
- **I3** (minor). Same as P2: Q-452e-r1 is defined nowhere, and the
  note does not name E's branch.
- **I4** (blocks until I1 is fixed). Check 3: no trial run. Today's
  state cannot tell the old text from the new (both keep 452 open). If
  I1's fix points the sentence back at the existing bar, the rule is
  unchanged and no trial is needed.
- Notes: the "Pool and meta-gem repair" line (`452:179`) cites no bar
  bullet; `802:80` "(C and D)" and `802:71` `test-review.mjs:13` give no
  branch or directory.

## Code quality

| ID  | Where                                                                          | Finding                                                                                    |
| --- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| A1  | `data/pools/README.md:4`                                                       | "one file per spec and phase" is untrue for phase 1; say phases 2 to 5.                    |
| S2  | `packages/core/src/pool.ts:155`                                                | Doc comment is 82 columns; wrap it to two lines.                                           |
| S3  | `scripts/tab-harness/README.md:53`                                             | "(`--page`, default the ret page)" has no verb.                                            |
| S4  | `scripts/tab-harness/run-tab-cdp.mjs:2`, `scripts/assemble_universe.py:3` (P4) | Header comments still say the script handles ret only; both take any spec.                 |
| S1  | commit `a29ea0ca` subject                                                      | Uses "the 452 bar" as its description. Fixing it rewrites the sha this review range names. |

The pass touches `scripts/`, where this repo's workhorse types return
`NEEDS_JUDGMENT` (`AGENTS.md` § Spawning), so it goes to `general-task`.

## Summary

Round 1: the three reworded docs are accurate except A1, and the 452 and
802 ticket notes are accurate about every other chain branch. Open
before round 2:

- **Fix before merge:** I1 (the 452 closing sentence can let the epic
  close with a bar line unmet; it also keeps I4, the missing trial, open).
- **Code-quality pass:** A1, S2, S3, S4 (with P4). S1 needs the
  handler's call: reword `a29ea0ca`'s subject (and re-pin this file's
  range), or `wontfix` with that reason.
- **Bookkeeping (ticket wording):** I2 (name the handoff path, or copy
  the proposed text into 802 so it is tracked), P1, P2/I3, P3.

No finding asks for an edit to an agent file.

Round 2 (focused check over `a29ea0ca..d81284b1`) passed all four checks
with no finding, so the review ends with round 1's Disposition table and
an empty round 2 table.

Tickets in this branch's range (`a094a28b..HEAD`, the skill's two
commands with that range in place of `dev...HEAD`): **0 filed** (no `A`
row from `git diff --name-status a094a28b..HEAD --
'.scratch/carry-forward/issues/*.md'`), **0 closed** (the `Status:` grep
counts 0). Tickets 452 and 802 stay open by design: 452 waits on the
slice branches reaching `dev`, and 802 on the owner's approval of the
`sme-rank-review` text (Q-452-sme-skill).

After round 2, session F filed one ticket in its own commit: 850 (four
unclear rules in the `sme-rank-review` skill, U2-U5 of the review of the
Q-452-sme-skill text). That commit adds only the ticket, `NEXT` (851) and
this paragraph.

The merge check (step 4) was not run as part of this review: it needs
`vendor/tbc-new-fork`, which this worktree lacks, and it is the owner's
step at merge time. An earlier run here, at the caller's request, exited
1 with `pnpm verify` refusing because the fork is absent.

## Disposition

| ID    | Axis        | Disposition | Ticket / note                                                                                   |
| ----- | ----------- | ----------- | ----------------------------------------------------------------------------------------------- |
| I1    | Instruction | fixed       | 452's closing sentence now says it closes only when every bar line is met on `dev` (802 step 3) |
| I4    | Instruction | fixed       | the I1 fix points back at the existing bar, so no new rule needs a trial run                    |
| I2    | Instruction | fixed       | 802 names `.scratch/handoffs/2026-11-06-452-sme-skill-proposal.md` in session F's worktree      |
| P2/I3 | Spec        | fixed       | 452 names E's branch and says what Q-452e-r1 and Q-452d-review ask                              |
| P3    | Spec        | fixed       | 452 says the owner "could see no separate site route" and points at the quote                   |
| P1    | Spec        | fixed       | 802 lists `page-coverage.test.mjs:12` among the code facts                                      |
| A1    | Adversarial | fixed       | `data/pools/README.md` says "for each of phases 2 to 5"                                         |
| S2    | Standards   | fixed       | `pool.ts` comment wrapped to 80 columns                                                         |
| S3    | Standards   | fixed       | harness README: "on the spec page that `--page` names (by default the ret page)"                |
| S4/P4 | Standards   | fixed       | headers of `run-tab-cdp.mjs` and `assemble_universe.py` reworded; 452's wording line lists them |
| S1    | Standards   | wontfix     | rewording `a29ea0ca`'s subject would rewrite the sha this review's range names                  |

## Focused check (round 2)

Reviewed range: `a29ea0cacee6ef72f3cacab1f4a30c245024c6f7..d81284b1506cfc61c4c8730916c59ac2123c1c3b`

Main range: `git log -p a29ea0ca..d81284b1` (`e92548ee` adds this file;
`d81284b1` fixes round 1, message "Fixes I1, I4, I2, P2/I3, P3, P1, A1,
S2, S3 and S4/P4; S1 is wontfix"). Other repo: none; the fork pin does
not move (`git diff --quiet dev...HEAD -- data/wowsims-fork.lock.json`
exits 0), so the fork log is skipped and the fork condition holds.
`d81284b1` has the same tree as an earlier fix commit, `6863f71a`, which
was redone only to put the IDs in its message.

One fresh `general-task` agent on Opus ran the four checks.

1. Conditions 1 to 3 hold: **PASS**. `e92548ee` edits only this file;
   `d81284b1` names every ID; the only changed lines outside docs and
   tickets are comments at `pool.ts:155` (S2), `assemble_universe.py:3`
   (P4) and `run-tab-cdp.mjs:2` (S4), each cited by its finding.
2. The fixes change only what each finding asks for: **PASS**. The new
   Q-452e-r1 text matches `page-coverage.mjs:10` on
   `feat/452-spec-page-scans`; the Q-452d-review text matches
   `docs/reviews/feat-452-meta-repair-hit-cap.md:343` on D's branch;
   `--spec` defaults to `ret` (`assemble_universe.py:2893-2897`); the
   handoff path in 802 exists and is gitignored (`git check-ignore -v`).
3. Each new test asserts its finding: **PASS** (the fixes add no test).
4. The tests the fixes touch pass: **PASS** (the fixes touch no test).
   Checked instead with node v22.23.2: `npx prettier --check` on the
   changed product files and this file, `node --check run-tab-cdp.mjs`
   and a Python `ast` parse of `assemble_universe.py`, all rc 0.

Disposition rows: each of round 1's 11 rows says what `d81284b1` did.

Findings: none. Notes, not findings: `run-tab-cdp.mjs:2` is 89 columns
and `802:63` is 100, but both files already had lines over 80 before
the fixes (84 and 3 at `a29ea0ca`, `awk 'length>80'`) and Prettier
passes; 452 sources Q-452e-r1 to session E's handoff only, and could
also cite R1 in E's tracked review.

## Disposition (round 2)

| ID  | Axis | Disposition | Ticket / note |
| --- | ---- | ----------- | ------------- |
