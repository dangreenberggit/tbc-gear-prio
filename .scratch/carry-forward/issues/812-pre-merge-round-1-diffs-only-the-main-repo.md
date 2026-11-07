Status: open
Type: process
Origin: .scratch/round-limits-r16/r18-review/2026-11-04-review-round-limits-r18-fix.md (row U4; gitignored, main checkout)
Blocks: none
Blocked by: none

# Pre-merge review round 1 gives the reviewers only the main repo's diff

## What happens

The Upgrades tab's code lives in the fork, `vendor/tbc-new-fork`
(`AGENTS.md` § The forked tab repo). But every diff command that the
`pre-merge-review` skill gives for round 1 reads only the main repo, and
nothing in the skill or the values file tells the agent to add the
fork's diff for round 1:

- `docs/agents/home/skills/pre-merge-review/SKILL.md:55-58` (step 1, "Pin
  the diff"): `git diff <base>...HEAD` and `git log <base>..HEAD
  --oneline`; `:60` "Round 1 diffs `<base>...HEAD`".
- `:107-108` (hand-off on a wall): `git diff <from-sha>..HEAD`.
- `:131-133` (small-change lane): `git diff --shortstat <base>...HEAD`
  and `git diff --name-only <base>...HEAD`.
- The values file names the fork only under § Focused check, for round
  2 and later: `docs/agents/pre-merge-review-project.md:38-39`. Its
  `<fork-from>` is "the end of the fork range the last round recorded",
  but no step tells round 1 to record a fork range.

(Line numbers are on `dev` at `cf8e37a1`.)

An agent that follows the text literally on a branch made in a pair gives
the three axes a main-repo diff whose fork part is only the
`data/wowsims-fork.lock.json` bump. The fork code, which is the tab
itself, gets no round-1 review, and the small-change lane can count such
a branch as small. In the R18 dry run the reader added the fork range
only because round 1 of the real review record had done so (fix review,
row U4), not because the text said to.

The pending round-limits change (`.scratch/round-limits-r16/r18-page/change-main.patch`)
rewrites the values file's fork range for § Focused check
(`<fork-from>..<fork-to>` from the lock at the round's `<from-sha>` and
`<through-sha>`), but does not touch step 1 or add a fork diff for round
1. So it does not fix this.

## What would fix it

Hypothesis, untested: give the values file an "other repo" diff for
round 1 (for example the fork range between the lock's `commit` at
`<base>` and at `HEAD`), and have step 1 and the small-change lane say
"and each other repo that the values file names". A skill and values
file edit needs the owner's approval of the exact text (global rule
"Changing agent instructions").

## Done when

- Step 1 of the skill, or the values file, names the fork diff that
  round 1's axes read, and the small-change lane's measure says whether
  it counts the fork's lines.
- A dry run of round 1 on a past pair branch (for example
  `feat/tab-set-bonus`) gives the axes the fork range from the text
  alone.

## Comments

### 2026-11-06: renumbered from 796

Filed as 796 in commit `a2df89f6` on branch `chore/729-test-result`.
`dev` had given 796 to another ticket, so this one became 812 when
that branch merged into `dev`.
