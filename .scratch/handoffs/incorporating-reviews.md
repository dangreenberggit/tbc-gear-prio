# Handoff: how to receive a review and incorporate it well

For the agent who receives review findings (pre-merge review or a round
review) on this repo and applies them. Written 2026-08-12 from the
set-bonus arc, where several review rounds ran and both good and bad
handling patterns showed up. Plain English throughout — no jargon.

## The stance

A review finding is a claim, not an order. Your job is to verify it, then
decide what it deserves: a fix, a ticket, a wording correction, or a
written "accepted as-is, here's why." Every finding gets exactly one of
those, recorded where the review lives. None get silently ignored.

## The order of work

1. **Read the whole review before touching anything.** Findings interact —
   two of them may share one fix, or one may invalidate another.
2. **Verify each finding you plan to act on.** Run the reviewer's
   reproduction command if they gave one; write one if they didn't. This
   repo has had reviewers be wrong and be right in the same round: one
   review correctly caught that a docstring's justification was factually
   false (all 18 meta gems are rare quality, not epic — checked against the
   data before fixing), and a different investigation produced two
   convincing false bugs from a broken test harness that a later pass had
   to retract. Checking first is cheaper than retracting later.
3. **Blockers first, then should-fixes, then notes.** A blocker means "do
   not land until resolved" — resolve it or escalate it, never reclassify
   it yourself.
4. **Stay inside the finding.** If the honest fix needs a policy or design
   decision the owner hasn't made, write the options into a ticket and
   stop. Do not choose for them. Several of this arc's best outcomes came
   from tickets that presented a decision instead of a fix (gem rarity
   policy, package display design); the worst near-misses came from agents
   deciding things unilaterally.

## Specific traps this repo has already hit — check for each

- **"Verify is green" is not proof CI is green.** A test once depended on
  a file that existed locally but was ignored by git; verify passed on the
  developer's machine and would have failed on every fresh checkout. If a
  finding touches files under `.scratch/`, check what is actually
  committed (`git ls-tree`, `git check-ignore`) before trusting any local
  green.
- **Comments and commit messages are part of the code.** A false "why"
  comment steers future agents wrong. If a finding says a comment lies,
  fix the comment AND check whether the same false claim was copied into
  tickets, ADRs, or commit messages — correct those durably (a commit
  message can't be amended once built on; correct it in the ticket).
- **Tests can pass without proving anything.** Look for assertions that
  hold no matter what the code does (a quality-cap check that passes
  whether or not the cap ran). When you strengthen one, make it fail
  first — by mutation if the honest red case is unreachable.
- **The pre-commit hook sweeps every modified tracked file into your
  commit.** `git status` before each commit; if you see changes you did
  not make, stop and sort it out — another session may be working in the
  same tree.
- **Sims:** any figure you produce needs its re-run command written next
  to it, and arms must be built through the real engine path
  (`equipmentForCandidateSwap`), never by hand-editing one slot — the
  hand-built shortcut has produced ~35 DPS of impossible stats before.
- **Node version:** run tests under Node 22. Node 20 fails three store
  suites for reasons unrelated to anything you did.

## Recording the outcome

For each finding, append its disposition where the review file lives
(fixed → commit sha; ticketed → ticket number; accepted as-is → one line
of why). Update `pnpm issues:open`-visible tickets, run `pnpm verify`
last, and say plainly in your report which findings you did NOT act on
and why. Never land, merge, or push — the owner decides that separately,
after reading your report.
