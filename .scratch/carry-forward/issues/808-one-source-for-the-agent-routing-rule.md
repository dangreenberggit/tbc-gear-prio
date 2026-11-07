Status: open
Type: task
Origin: owner ruling 2026-11-02 (routing root-cause report, `.scratch/agent-reports/2026-11-02-general-task-routing-rules-root-cause.md`)
Blocks: none
Blocked by: none
Related: 719, 714, 803

# Put the agent routing rule in one file and point every other copy at it

## What happens today

The rule for which agent type takes which job, and when Sonnet may be
used, is written out in full in 37 places in 15 tracked files. Source:
`.scratch/agent-reports/2026-11-02-general-task-routing-rules-root-cause.md`
(the 37 places are listed there; line 16 gives the count). Recount on
2026-11-05, with all 37 places unchanged:
`.scratch/agent-reports/2026-11-05-general-task-routing-loose-thread-check.md`
("Copy count", line 124). Both files are gitignored and exist in the
main checkout only.

In four reviews, 29 of 48 real findings were a copy that was missed or a
list that had drifted (root-cause report, "Totals, all four reviews":
"a + b = 29 of 48 (60 %)"). Each new fix to the rule has to be made in
every copy, and a missed copy is the next finding.

## Owner rulings, word for word

- 2026-11-02: "one source first that's correct, and then we can handle
  the copies and properly route them or whatever"
- 2026-11-02: "Checked copies is neither routing nor one sources of
  truth so it sounds like a very impressive attempt to come up with one
  of the worst options possible"
- 2026-11-02, on ticket 719, option B: "B sounds fine"
- 2026-11-02: "i want flash used instead of sonnet basically whenever
  possible" (the draft in `.scratch/plans/flash-over-sonnet/PROPOSAL.md:8`
  quotes it with "btw" at the end)

## Draft and evidence

All gitignored, main checkout only.

- `.scratch/plans/routing-single-source/OWNER-VIEW.md`: the exact text
  and the pointer map.
- `.scratch/plans/routing-single-source/PROPOSAL.md`, `review-1.md` to
  `review-5.md`, and `trial-2026-11-03.md`, `trial-2026-11-03-rerun.md`,
  `trial-2026-11-03-rerun2.md` in the same folder.
- The Flash-over-Sonnet guard draft (hook script, wiring script and
  tests) in `.scratch/plans/flash-over-sonnet/`.

## State

Not approved by the owner yet. Review 5
(`.scratch/plans/routing-single-source/review-5.md`) left these open:

- A Flash worker asked to report a test result hands back a failure
  instead (finding 2).
- The source points at a "§ Cards" heading in the repo's
  `docs/agents/model-policy.md` that does not exist (finding 3).
- There is no trial run on the old text to compare against (finding 1).
- Seven wording points.

Agent-file, skill and `AGENTS.md` edits need the owner's approval of the
exact text first (`~/.claude/AGENTS.md` § Changing agent instructions).

## Related

Ticket 719 (who takes a job GLM Flash hands back). The owner's "B sounds
fine" answers it, and the new routing file holds that answer. 719 closes
with this ticket. Ticket 714 (simple-task slice contradiction) and 803
(stage-gate values file copies the slice-model rule) are two more copies
of the same rule.

## Done when

- `~/.claude/routing.md` exists, staged as `docs/agents/home/routing.md`
  on `dev`.
- Every place in the root-cause report is a one-line pointer to it, or
  is deleted.
- The Flash-over-Sonnet guard is wired in `~/.claude_router/settings.json`.
- Ticket 719 is closed.

When the ticket closes, its closing note needs a `Verified by:` line
(`docs/agents/issue-tracker.md` § Closing a ticket), for example a `grep`
that finds the routing rule's full text in `routing.md` only.

## Comments

### 2026-11-06: the change is on branch `chore/808-one-routing-source`

The owner approved the routing change on 2026-11-06 ("i think my answer
is yolo yes"). It is applied on branch `chore/808-one-routing-source`
(worktree `/home/daniel/Code/lulz/tbc-wt/808-routing-source`), in these
commits on top of `dev` 51184ca9:

- 287beedc Stage routing.md as the one routing source
- d3fbb0f4 Point repo agent docs at routing.md
- 249ee3c3 Add flash-over-sonnet hook that reads routing.md
- 37e507d1 Add install-routing.sh for the owner
- 06d4781c Name each reason's placeholder in the hook refusal
- 584367cd Keep the router settings link when wiring the hook
- 8ef43bec Name the routing install scripts in the README
- 89315aef Record the 808 review and its dispositions

Its review is `docs/reviews/chore-808-one-routing-source.md` on that
branch. One approved row is not applied: row 36e, for
`.claude/agents/gate-reviewer.md`, waits on commits that are only on
`chore/729-test-result`; ticket 809 holds it. Nothing is installed in
the real home yet: the owner runs
`bash /home/daniel/Code/lulz/tbc-wt/808-routing-source/docs/agents/home/install-routing.sh`.
