Status: open
Type: task
Origin: docs/reviews/chore-808-one-routing-source.md (finding R808-2, on branch `chore/808-one-routing-source`)
Blocks: none
Blocked by: commits 7e2ebae0, 683bf83b, 79160874 (on `chore/729-test-result`) reaching `dev`
Related: 808

# The plan reviewer's dry-run step points at a section entry that does not exist

## What happens today

On `chore/729-test-result`, `.claude/agents/gate-reviewer.md:72-74` says
the dry run goes to one workhorse helper:

> dry run to one workhorse helper (`docs/agents/stage-gate-project.md`
> § Worker lanes, Reviewer; its private-data exception applies, because
> the helper sees every output). The helper runs every write and

`docs/agents/stage-gate-project.md` § Worker lanes has no "Reviewer"
entry and no private-data exception (review R808-2, and
`.scratch/plans/routing-single-source/OWNER-VIEW.md` (b), row 36e: "names
two things that section does not have"). So the plan reviewer has to
guess which agent type takes the dry run.

The dry-run step came in with commits 7e2ebae0 "Add command dry run to
the plan reviewer", 683bf83b "Fix dry-run gaps in the plan reviewer" and
79160874 "Hold back tracked-file writes in the dry run". On 2026-11-06
none of them is on `dev` (`git merge-base --is-ancestor <sha> dev`
gives rc 1 for each), so the routing change on
`chore/808-one-routing-source` skipped this row.

## The approved new text

The owner approved the routing change on 2026-11-06 ("i think my answer
is yolo yes"). Row 36e of `OWNER-VIEW.md` (b) (main checkout, gitignored)
gives the new text for `:72-74`:

> (types: `~/.claude/routing.md` § Decision table; § Private data of that
> file applies, because the helper sees every output)

and after the change the lines read: "dry run to one workhorse helper
(types: `~/.claude/routing.md` § Decision table; § Private data of that
file applies, because the helper sees every output). The helper runs
every write and".

## Done when

On a branch that has the three commits and the routing change,
`.claude/agents/gate-reviewer.md` holds the row 36e text, and
`grep -n "Worker lanes, Reviewer" .claude/agents/gate-reviewer.md` finds
nothing. The text is already approved, so this is an apply step, then
the instruction review the repo's merge rules ask for.
