Status: open
Type: process
Origin: docs/reviews/chore-729-test-result.md (owner request in session, 2026-10-29)
Blocks: none
Blocked by: none
Related: 729, 731, 724, 726

# Get a global skill for reviewing agent-instruction changes

Do ticket 731 first; the owner said it matters more. This ticket does
not wait on 731 to start.

## The owner's words, 2026-10-29

Quoted from the prompt of the session that filed this ticket:

- "a pre merge review isnt the end of the world, as you said, it can be
  normal, and maybe we should institute such a review for these kinds of
  file changes generally. but there's no reason to adopt a review process
  meant for development of code in a project that we're not acutally even
  touching"
- "make a ticket or two and a handoff for not drafting but getting a
  global skill for this kind of review"

No draft of the skill exists yet. The session that filed this ticket
wrote none, by the owner's instruction.

## The problem

This repo's `pre-merge-review` skill reviews product code. Changes to
agent instructions fail in other ways, and that review does not look for
them. The skill this ticket gets reviews changes to agent instructions
(skills, agent definitions, plan templates, `AGENTS.md`-type files) for
these three failures:

1. **A sentence an agent reads as an order that was not meant.**
   Example: the brief line "`K2` and `K3` are later chunks." in
   `.scratch/stage-gate/729-planner-test/brief.md` (line 27) led the
   planner to give steps to `K1` only and leave `K2` and `K3` without
   steps (ticket 729 § Test result, 2026-10-28).
2. **A contradiction with another instruction file.** Example: the
   reviewer's dry run (`.claude/agents/gate-reviewer.md` § What to hunt,
   item 7) asks a workhorse helper to decide whether a command "may
   write" a tracked file. The worker types refuse that kind of choice:
   `.claude/agents/discrete-task.md` and the global
   `~/.claude_router/agents/glm-flash-task.md` return `NEEDS_JUDGMENT` on
   "a choice the prompt did not make" (review findings S6, P7 in
   `docs/reviews/chore-729-test-result.md`).
3. **A behaviour-changing rule counted as done before one trial run.**
   Example: one trial run found that the plan template did not follow
   the owner's Option B. The template fix (`eded62c3`) then passed a
   second trial run (ticket 729 § Second run, 2026-10-29). The dry-run
   rule never ran in a live stage-gate run and failed three paper
   reviews.

The skill is lighter for small changes, for example one reviewer
instead of several, or a single read for a one-line wording edit.

## Where it lives

Globally: `~/.claude/skills/` or the owner's global setup, with a staged
copy in `docs/agents/home/` if the owner wants one (install steps:
`docs/agents/home/README.md`). Not in this repo's `.claude/skills/`.
General tooling belongs in the global setup; repo-specific values stay
here (owner, 2026-10-29: "a lot of the work done the last few days was
specifically to focus on setting up a better global work setup, and
leaving repo-specific stuff here").

"Getting" a skill may mean finding an existing one or writing a new one.
The new session checks for existing skills first and brings the options
to the owner.

## Where the dry-run rule stands

The dry run (`.claude/agents/gate-reviewer.md` § What to hunt, item 7)
was added on branch `chore/729-test-result` by `7e2ebae0` and changed by
`683bf83b` and `79160874`. It is not merged. Its open findings are A7,
A8, A9/S7, S6/P6/P7, A10 and S8 in
`docs/reviews/chore-729-test-result.md` § Fresh review, round 1. The
owner stopped the product review there (same file, § Review stopped by
the owner).

Build and try the dry run with the kind of review this ticket gets, and
with a trial run, not with more product-review rounds. Before any more
fixes to item 7, the owner asked for research and a plain answer; the
handoff
`.scratch/handoffs/2026-10-29-agent-tooling-review-exemption.md`
(gitignored, main checkout) gives that step.

## Done when

- The owner approved which skill to use, and the exact text of any new
  or changed skill file.
- The skill is installed globally (`ls ~/.claude/skills/<name>/SKILL.md`
  prints the path) and does not exist under this repo's
  `.claude/skills/` or `.agents/skills/`.
- The skill checks the three failures above and has a lighter path for
  small changes.
- The skill has been tried once on a real agent-instruction change, and
  this ticket records that run and its result.
- Ticket 731's exemption names this skill as the review for
  agent-tooling files, or the owner chose something else and this
  ticket says what.
