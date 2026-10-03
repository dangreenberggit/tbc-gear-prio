# Split planning: parts and merging

Read this when your agent file sends you here. All files below are in
the stage folder `.scratch/stage-gate/<slug>/`, which git ignores
(`git check-ignore -v .scratch/stage-gate/<slug>/plan.md`), so writing
there leaves `git status --porcelain` empty.

Part ids are `P1`, `P2`, ... in planning order. A part keeps its id when
it is deferred; a deferred chunk takes the next free id. Steps in
`plan.md` with no part id belong to `P1`.

## Split

Decide one of:

- **one-plan** — the tickets share most of their paths, or a step of one
  ticket needs a result that another ticket produces part-way through
  its own steps.
- **parts** — the tickets touch mostly separate paths, and each needs
  from the others only their finished output. Producers come first. Two
  tickets that edit the same function or the same section of a file go
  in one part.
- **partial** — defer a part that depends on a result nobody has yet (a
  measurement, a gate's exit, a user ruling), that waits on a question
  only the user can answer, or that would make more than 3 planned
  parts or push the plan past the stage budget.

With one ticket in scope, a part is a group of its steps that shares few
paths with the rest and needs from them only their finished output.
When one-plan and parts both fit, choose one-plan. On one-plan, plan as
your agent file says; this document assigns you no files.

Otherwise plan `P1` by § Part mode, then, as your last action, write
`decomposition.md`; one `parts/<id>/brief.md` per planned part (goal,
constraints, done-means, and the user's words it serves, copied from the
brief with their source); and P1's plan. When `P1` is the only planned
part, its plan goes to `plan.md`, with the ticket drafts of the deferred
parts; otherwise it goes to `parts/P1/plan.md`.

## Re-split

Your prompt says `re-split` with a reason: over the stage budget, a
Gate A violation, a review (`plan-review.md`) with findings marked
`Where: decomposition`, or the user's ruling on a deferral. Start from
`plan.md`. Keep it, defer chunks, or bring a deferred part back, only as
far as the reason requires; on a review, also address its other
findings as in a revision round. Rewrite `plan.md` unless you keep it
as it is. When you defer or bring back a chunk or part, also write
`decomposition.md` (with `DECISION: partial` when none exists) and the
ticket drafts. A part you bring back moves from the Deferred table to
the Parts table, and its `ticket.md` is deleted.

## decomposition.md

    # Decomposition — <slug>
    DECISION: parts | partial
    Why: <two to four sentences>

    ## Parts (planning and execution order)
    | Part | Scope (tickets, goal) | Depends on | Plan |

    ## Deferred
    | Part | Scope or chunk id | Brief open questions it holds | Ticket draft |

## Ticket drafts

`parts/<id>/ticket.md` starts with the five header lines of
`docs/agents/issue-tracker.md`: `Status: open`, `Type: task`, `Origin:`
the stage slug and branch, `Blocks:` the phase the brief names or
`none`, and `Blocked by:` what must exist first — ticket files, the
output of this stage's planned parts (named by stage slug), another
deferred part by its part id (the filing agent replaces it with the
ticket number), or `none`. The body stands on its own: the user's words
it serves (verbatim, with source), goal, done-means, the seam contract
(what the planned parts give it and assume about it), and what this
stage learned that its planner needs.

## When you write files here

This section applies whenever this document has you write files; on
one-plan it does not apply. Write only the files this document assigns
you, each once per spawn or per message you answer, as your last
action. List under "Open questions" only what the user must answer;
decide every other conflict yourself. When you receive the user's
answers, decide every question still open yourself, rewrite your files
whole, and return a new digest with no Open questions. Your final
message is a digest of at most 40 lines. As the first planner of a
split, its first line is the `DECISION:` line; in every other case it
starts with the plan file's line count and its number of execution
chunks.

## Part mode

When your prompt names a part id, read `decomposition.md`, your part's
brief, and the plans of the earlier parts. The plan itself, also for
`P1` at the split: plan only your part, against the plan template; each
step names your part id. Treat the earlier parts' steps, claims and
Paths manifests as fixed input; your file holds only your part. End it
with `## Seam requests` (what your part needs from earlier parts) and,
when parts are deferred, `## For deferred parts` (what your part gives
each and assumes about it). Write it to `parts/<id>/plan.md` (at the
split, § Split says where). Digest: the counts, the output path, your
Seam requests.

## Reconcile mode

Your prompt names the stage folder and says `reconcile`. Read
`decomposition.md` and every planned part's plan. Write one plan to
`plan.md`, against the plan template, with a `## Seams` section after
the Paths manifest:

- Steps renumbered in part order; each keeps its part id.
- One Claims register. Renumber claims in part order and update every
  step's C-id references; a claim two parts share appears once.
- The Paths manifest is the union of the part manifests. A path that
  steps of two parts touch is a Seams row: what is shared, the part that
  owns it, and how you settled it.
- Every Seam request is a Seams row, settled by a step.
- Each Execution chunk holds steps of one part; a seam that forces two
  parts into one chunk is named on the chunk line.
- When a part plan lacks a template section, write that section
  yourself and record it in your Decisions section.

Then write the ticket draft of each deferred part, taking its seam
contract from the parts' `## For deferred parts` sections. Digest: the
counts and the Seams table.
