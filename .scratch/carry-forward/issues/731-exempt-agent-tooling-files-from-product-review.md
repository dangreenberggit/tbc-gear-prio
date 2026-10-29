Status: open
Type: process
Origin: docs/reviews/chore-729-test-result.md (owner request in session, 2026-10-29)
Blocks: none
Blocked by: none
Related: 729, 732, 724, 726

# Exempt agent-tooling files from this repo's product review system

Do this ticket before ticket 732. The owner said it matters more.

## The owner's words, 2026-10-29

Quoted from the prompt of the session that filed this ticket:

- "a pre merge review isnt the end of the world, as you said, it can be
  normal, and maybe we should institute such a review for these kinds of
  file changes generally. but there's no reason to adopt a review process
  meant for development of code in a project that we're not acutally even
  touching"
- "tell the (3??) reviews to wrap up. make a ticket or two and a handoff
  for not drafting but getting a global skill for this kind of review, but
  also more importantly making these files an exception to the review
  system."
- "a lot of the work done the last few days was specifically to focus on
  setting up a better global work setup, and leaving repo-specific stuff
  here. just noting that."

## The problem

A branch that changes only agent instructions (skills, agent
definitions, plan templates, `AGENTS.md`-type files) goes through the
same pre-merge review and merge gate as a branch that changes the
product. That review is built for this project's code: its domain axis
checks game facts, its adversarial axis hunts data loss and silent wrong
results in the product, and the merge gate checks the fork pin and the
Upgrades tab layout.

Branch `chore/729-test-result` shows the cost. It changes only agent
instruction files, ticket 729 and its own review file
(`git diff --name-only dev...HEAD`). Its review ran three rounds, and each
round found new holes in one new rule, the plan reviewer's dry run
(`.claude/agents/gate-reviewer.md` § What to hunt, item 7). That rule
has never run in a live stage-gate run. The owner stopped the review on
2026-10-29 (`docs/reviews/chore-729-test-result.md` § Review stopped by
the owner).

## Goal

Agent-tooling files are an exception to this repo's product review
system. Ticket 732 gets the review that replaces it for these files.

## The owner's direction: global setup versus this repo

General tooling belongs in the owner's global setup (`~/.claude/`, with
copies staged in `docs/agents/home/`; install steps in
`docs/agents/home/README.md`). Repo-specific values stay in this repo.

The stage-gate pipeline is general tooling. Its values for this repo
already live in `docs/agents/stage-gate-project.md` (split done in
ticket 724; ticket 726 moves the general core to a plugin repo). Draw
the exemption on the same line: the review of general tooling is not
this repo's job, and a repo-specific value file stays here.

## Which files count

Proposed list. Each entry is tracked in this repo
(`git ls-files <path>`). The owner confirms the list before any edit.

- `.claude/skills/**` and its mirror `.agents/skills/**`. The mirrors
  stay checked by `pnpm mirrors:check` (`scripts/check_skill_mirrors.py`,
  part of `pnpm verify`).
- `.claude/agents/*.md` (agent definitions, including the `gate-*`
  seats).
- `.agents/reviews/*.md` (the review axis prompts).
- `docs/agents/**`, including `docs/agents/home/` (the staged global
  files).
- `AGENTS.md` and `CLAUDE.md` at the repo root.

Files the new session must ask the owner about, because they are code or
mix tooling with product rules:

- `.claude/hooks/` holds Python and shell scripts with tests in
  `.claude/hooks/tests/`; `pnpm run foreground-hook:check` runs inside
  `pnpm verify`. They are code, not instructions.
- `.claude/settings.json` and `.claude/launch.json` (harness
  configuration).
- `docs/workflow.md` is agent-facing but describes this repo's code
  loop and gates.
- `scripts/check_merge_ready.py`, `scripts/merge_to_dev.py` and
  `.githooks/` are the gate's own code.
- `.scratch/carry-forward/issues/*.md`: a tooling branch usually also
  edits tickets, and the gate reads tickets (`Status:`, `Verified by:`).
- A branch that changes exempt files and product files together.

## Where the rule and the merge gate live today

- `AGENTS.md` § Commits and merges: merging into `dev` "waits for the
  user to ask **after** the review file exists and they saw its summary";
  `pnpm merge-to-dev` is the only door.
- `docs/workflow.md` § The loop, steps 4 and 5: run the
  `pre-merge-review` skill before any merge to `dev`; § Gates lists what
  is enforced.
- `.claude/skills/pre-merge-review/SKILL.md` (mirror
  `.agents/skills/pre-merge-review/SKILL.md`): step 3 § What a finding
  gets, by its effect (a finding the branch introduced blocks the merge
  until it is fixed or the owner allows a `defer`), § Agent files,
  § Round limit, and step 5.
- `scripts/merge_to_dev.py` (`pnpm merge-to-dev`): clean tree,
  `pnpm verify`, the merge-ready check, the layout gate, then
  `git merge --no-ff`.
- `scripts/check_merge_ready.py` (`pnpm merge-ready`, self-tests in
  `pnpm merge-ready:selftest`): fails when `docs/reviews/<branch>.md` is
  missing or has no parseable `## Disposition` table; each `defer` row
  must link an open ticket; a ticket the branch closes needs a
  `Verified by:` line. It reads only the Disposition rows, so it does
  not see open findings written elsewhere in the review file.

## What decides whether `chore/729-test-result` may merge

Today, three things:

1. The mechanical gate, `pnpm merge-to-dev --check-only`. The review
   file exists and has Disposition tables, so this gate does not see the
   open findings. Its result at the commit that filed this ticket is in
   the handoff
   `.scratch/handoffs/2026-10-29-agent-tooling-review-exemption.md`
   (gitignored, main checkout).
2. The `pre-merge-review` skill's step 3. The findings of
   `# Fresh review, round 1` (A7, A8, A9/S7, S6/P6/P7, A10, S8) were
   introduced by this branch and are open, so under that rule they block
   the merge. The review's § Summary (fresh round 1) says "Not ready to
   merge". The owner's stop note does not dispose of them.
3. The owner's explicit merge ask, after seeing the review summary
   (`AGENTS.md` § Commits and merges).

After this ticket, the product review no longer decides for this
branch, because every file it changes is agent tooling, ticket 729 or
its review file. The owner decides, with ticket 732's review as the
input. The new session puts the choices to the owner; for example,
merge the plan-template fix and the Gate A wording, and hold the dry-run
commits (`7e2ebae0`, `683bf83b`, `79160874`) until they pass ticket
732's review and a trial run.

## Done when

- The owner approved the exact text of every edit to `AGENTS.md`,
  `CLAUDE.md`, a skill or an agent file.
- The list of exempt paths is written in one place, and every file that
  states the review rule (`AGENTS.md` § Commits and merges,
  `docs/workflow.md` § The loop and § Gates, the `pre-merge-review`
  skill) points at that list.
- If the owner wants the merge gate to apply the exemption:
  `scripts/check_merge_ready.py` applies it to a branch whose
  `git diff --name-only dev...HEAD` lists only exempt paths, and
  `pnpm merge-ready:selftest` has a case for a tooling-only branch and a
  case for a mixed branch.
- `pnpm verify` passes, and `pnpm merge-to-dev --check-only` on
  `chore/729-test-result` gives the result the new rule says.
- The ticket records how the exemption branch itself was reviewed. It
  may change `scripts/`, which is product gate code; ask the owner which
  review applies to it before starting.

## Owner approvals, 2026-10-29

Quoted from the prompt of the agent that fixed round 1 of the review of
`chore/731-tooling-review-exemption`; that agent did not see the owner's
messages.

- The exempt-path list in proposal § 1
  (`.scratch/agent-reports/2026-10-28-general-task-731-exemption-proposal.md`,
  main checkout), with `.scratch/carry-forward/notes/` and
  `.scratch/carry-forward/plans/` added: "ok sounds good".
- The exact wording in proposal § 2: "approve".
- The review of the exemption branch: "pre merge review without the SME
  stuff is fine (this is a different subject matter!)".
- The name of ticket 732's skill, option C, `instruction-review`: "C looks
  ok".

## How the exemption branch was reviewed

`chore/731-tooling-review-exemption` got the full `pre-merge-review`
skill, because its own rule is not in force until it merges and it
changes gate code under `scripts/`. Round 1 covered
`3c008f0d..8faf766d`: the Adversarial axis and the `code-review` skill's
Standards and Spec axes, each a fresh `general-task` agent on Opus. The
Domain (SME) axis was skipped by the owner's ruling quoted above.
Findings and their outcomes: `docs/reviews/chore-731-tooling-review-exemption.md`
§ Disposition.

## The merge check on `chore/729-test-result`

§ Done when asks for `pnpm merge-to-dev --check-only` on
`chore/729-test-result`. That command was not run. It runs the gate
copy in that branch's own checkout (`scripts/merge_to_dev.py`,
`merge_named`: `script = wt / "scripts" / "merge_to_dev.py"`), and that
copy has no exemption: `git grep -c TOOLING_PATHS chore/729-test-result
-- scripts/check_merge_ready.py` finds nothing (rc=1). It would test the
old rule (ticket 733). In its place,
`python3 scripts/check_merge_ready.py --branch chore/729-test-result`
ran from the `chore/731-tooling-review-exemption` worktree. It reads the
729 branch's changed files and tickets from its tip, and the review file
from this worktree, which has no `docs/reviews/chore-729-test-result.md`.
So it answers whether the 729 branch needs a review file.

- At `abd4148f` (round 1 rule): rc=0, "review not required: every one
  of the 10 changed file(s) is agent tooling".
- At `947561e3` (round 2 rule, review finding R2-1): rc=1, "missing
  review", with "ticket open at the merge base is deleted, no longer
  open or blocks something else on this branch, so it needs the review:
  .scratch/carry-forward/issues/729-simplify-the-gate-planner-rules.md".
  The 729 branch sets ticket 729 from `open` to `closed`.
  `--product-files --branch chore/729-test-result` prints that ticket
  only.
- The `947561e3` script copied into a throwaway sparse clone of
  `chore/729-test-result` (its review file present, the copy hidden from
  git with `git update-index --assume-unchanged`) and run there with no
  arguments: rc=0, "merge-ready: ok"; the review file's 19 Disposition
  rows parse.
- After review row R2-1b (the commit that adds it: a close with a valid
  `Verified by:` line keeps the exemption): rc=0, "review not required:
  every one of the 10 changed file(s) is agent tooling", and "no ticket
  closed on this branch without Verified by: evidence".
  `--product-files --branch chore/729-test-result` prints nothing
  (rc=0). The same script in the sparse clone of the 729 tip `512b26f6`,
  run with no arguments: rc=0, "merge-ready: ok"; 19 Disposition rows
  parse.
