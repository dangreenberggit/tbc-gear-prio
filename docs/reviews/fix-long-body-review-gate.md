# Pre-merge review — fix/long-body-review-gate

Reviewed range: `dev..e35ce1b`, the commit the axis read. The findings below
were fixed in `f677589`, which also carries this file.

One axis: standards and spec, fresh context, Opus at effort medium. The
adversarial and domain axes were not run and write no Disposition rows. The
branch is three prose files with no executable code, no game content, and no
attack surface to probe. Round 2 and round 3 of the
`fix/merge-ready-disposition-parser` review recorded a skipped domain axis in
prose the same way.

The branch closes ticket 383. A commit body over six lines had no decision
procedure: a record commit either broke the maximum or dropped the
measurements it existed to carry. The rule now sends any body past six lines to
an independent subagent that decides whether the length is necessary, with no
class exempt.

## Standards + Spec

**One major finding, and it was a durable-claims violation on the branch whose
subject is enforcing durable claims.** The ticket Resolution credited the
round-3 review with a hook-feasibility measurement that review does not
contain, and two of its three figures did not reproduce. The axis grepped
`docs/reviews/fix-merge-ready-disposition-parser.md` for `commit-msg`, `hook`,
`100 commits` and `merge subject` and found no matches. The figures came from a
feasibility probe run earlier in the same session, which the Resolution never
named.

Re-measured on this branch at `e35ce1b`, and both replacements are now in the
Resolution:

- Body wrap: `git log -100 --format=%H` with a per-commit scan of `%b` for
  lines over 72 characters gives **62 of 100**, not the 66 claimed.
- Merge subject: `git log -200 --merges --format=%s` gives a longest subject of
  **83 characters**. The Resolution had claimed one at exactly 72.

The axis reported no merge subject reaching 72 and a longest of 58. That is
also wrong, measured over a narrower window. The original conclusion survives
both corrections: a subject-length hook would reject generated merge subjects
and fail `pnpm merge-to-dev` mid-merge.

**One minor finding.** The rule said an independent subagent decides, with no
instruction for the case where none can be reached. The axis confirmed subagent
nesting works in this harness, so this is not a blocker, but the sentence read
as unconditional and the honest reading was that the commit cannot be made. A
fallback clause now says to cut the body to six lines instead.

**The irony check came back clean.** This was the highest-value axis given what
the branch does. No banned vocabulary in the rule text, the Resolution, the
`map.md` line, or `e35ce1b`'s own commit message. That message is 3 body lines,
inside the maximum it adds, so it does not trip its own rule, and its lines
measure 72, 67 and 63 characters.

**Enforcement claim verified.** `core.hooksPath` is `.githooks`, holding only
`pre-commit` and `pre-push`. `.githooks/commit-msg` does not exist, `.git/hooks`
holds only samples and is not the active path, and `scripts/merge_to_dev.py`
gates verify, merge-ready and the layout check without reading a commit
message. Nothing anywhere inspects a commit message.

**Scope is exactly three files**, 31 insertions and 4 deletions, matching the
three stated purposes. Ticket 383 follows the closed-ticket conventions, with
both acceptance boxes genuinely earned: the axis ran
`git diff --no-index docs/agents/home/AGENTS.md ~/.claude/AGENTS.md` and it
exits 0, so the staged copy and the live global file match.

One note the axis raised and this review accepts without action. The `map.md`
closure is a second line, leaving the original open-state line above it reading
"Undecided which rule yields". Line 184 sets precedent for a separate closure
line, so both forms exist in that file.

## Disposition

| ID  | Axis      | Disposition | Ticket / note                                                                                                                                                                                                                                  |
| --- | --------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1  | Standards | fixed       | The ticket Resolution credited the round-3 review with a hook measurement it does not contain, and two of three figures did not reproduce. Both re-measured on this branch (62 of 100; longest merge subject 83) and the attribution corrected |
| S2  | Standards | fixed       | The rule gave no instruction when no reviewer can be reached, so it read as forbidding the commit. A fallback clause now says to cut the body to six lines                                                                                     |

## Summary

The rule text is sound and better defended against gaming than most: the prompt
constraints close the leading-question loophole, and the author gets no veto
over the verdict. The one finding worth acting on was the Resolution's sourcing,
now fixed by measuring both figures on this branch and naming where they came
from. The correction also caught an error in the axis's own counter-measurement,
which had used a narrower window.
