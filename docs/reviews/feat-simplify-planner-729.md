# Pre-merge review — feat/simplify-planner-729

Reviewed range: `7a72da6b78029771184744d72f3d0410892ac6d3..f72c015bff2ca2eb9a5495d529844ed8bffe9be4`

Dispatch: one round, as the owner asked (2026-10-28). `codex` is not on
`PATH`, so each axis ran as a fresh `general-task` agent on Opus. The
branch is too large for the small-change lane (`git diff --shortstat
dev...HEAD`: 14 files changed, 470 insertions, 694 deletions), so
Adversarial, Standards and Spec ran as separate agents in one parallel
batch. The domain axis was skipped: the diff changes only agent
instructions and tickets, and has no game-domain content.

Owner rulings for this review (2026-10-28, in chat): report only real
breaks, meaning something that stops the session, planner, reviewer or
executor from doing its job. Do not propose added rules, edge cases or
polish. A small, clear wording fix may be applied in this branch. File no
new tickets. The known finding that SKILL.md step 2 and step 7 still have a
judgment agent file tickets without asking the owner was not reported
again.

## Adversarial

Clean checks:

- `diff -r .claude/skills/stage-gate .agents/skills/stage-gate` printed
  nothing.
- `git grep` at HEAD for `parts.md`, Backburner, `next:`, re-split, part
  mode, the removed template sections and the removed SKILL.md step names
  finds no live reference outside `docs/reviews/` and tickets.
- `.claude/hooks/log-agent-run.py:33` reads only `^## Decisions`, which the
  planner still writes. No hook or script reads the plan-template
  headings.
- The new `mv` of `plan.md` in SKILL.md step 5 is on the session's
  allowed list in `docs/agents/orchestration.md` § The session delegates.

**A1 (real break, conditional; open).** `.claude/skills/stage-gate/SKILL.md:458-462`
(and the `.agents/` copy), step 6 `rework`. When a later chunk gets a new
plan, step 5 (`SKILL.md:404-412`) renames the old `plan.md` to
`plan-<id>.md`, and the new `plan.md` holds only the later chunks. If the
final Gate C then rules `rework` on an earlier chunk, for example an
`advisory` row or an out-of-manifest path, step 6 respawns a
`gate-executor` "for the affected chunk with a fresh base SHA and the
ledger row". Step 5's executor recipe passes `plan.md`, and
`.claude/agents/gate-executor.md:40` says "Implement only your chunk's
steps", so that executor finds no steps for its chunk. This branch
introduced it: on `dev`, a `next:` planner run added to the same plan,
which was never renamed (`git show dev:.claude/skills/stage-gate/SKILL.md`,
lines 443-447). Smallest fix, in both copies: replace

> `rework` (respawn a `gate-executor` for the affected chunk with a fresh
> base SHA and the ledger row;

with

> `rework` (respawn a `gate-executor` for the affected chunk with a fresh
> base SHA, the ledger row, and the plan that gives that chunk steps
> (`plan.md` or a `plan-<id>.md` that step 5 renamed);

**A2.** `SKILL.md:158`, the `spawn` log line, ended in
`<mode or chunk id>`. The planner no longer has modes. Fixed in both
copies to `<chunk id, or none>`. No hook or script parses this field
(`git grep -n "subagent_tokens\|mode or chunk" -- .claude/hooks scripts
docs/agents .claude/agents` printed nothing).

**A3.** `SKILL.md:406`, "rename `plan.md` to `plan-<id of its first
chunk>.md`": "its" could mean `plan.md` or the next chunk. Both readings
give a unique file name, and step 6 reads every renamed plan, so nothing
breaks.

Unexamined: `gate-sme.md` and `gate-visual.md` in full (searched for the
removed terms only); `docs/agents/model-policy.md`.

## Domain

Skipped: no game-domain content (see the dispatch note).

## Standards + Spec

### Standards

**Standards: clean** of real breaks. The two skill copies match; no live
reference names a removed file, section or mode; every section the
changed files point to exists; the foreground-helpers hook
(`.claude/hooks/subagent-foreground-helpers.py`) still covers
`gate-planner`, so dropping that paragraph from the planner breaks
nothing; Gate A and `plan-template.md` § Execution chunks agree.

**S1.** `plan-template.md:47`: Gate A accepts an open question "named on
the line of the later chunk that will answer it", and the template's
one-line form has no field for it. The template does not forbid writing
the question on that line, so the planner can still pass Gate A.

**S2.** `docs/agents/stage-gate-project.md:188`, § History, read
"**gate-planner, foreground helpers:** ticket 712", naming a rule that
`gate-planner.md` no longer holds. Fixed to name the hook.

### Spec

**Spec: clean** of real breaks. `gate-planner.md` is the draft § 2 file
with the Option B text; SKILL.md Gate A (lines 260-268) and
`plan-template.md:46-49` use the Option B wording; every row of the draft
§ 3 table was applied to SKILL.md, `gate-reviewer.md`, `orchestration.md`
and `stage-gate-project.md`.

**P1.** The same ambiguity as A3 at `SKILL.md:406`.

**P2.** `.claude/agents/gate-reviewer.md:25` and `:142` are unwrapped
lines of about 100 characters.

## Summary

One round. One real break is open and blocks the merge until the owner
rules: **A1**, a final-Gate-C `rework` of a chunk whose plan step 5
renamed gives the new executor a `plan.md` without that chunk's steps.
It has no Disposition row yet. Two small wording fixes were applied (A2,
S2). The other findings are `wontfix` under the owner's ruling against
polish.

Tickets on this branch: filed 1 (730, from the ticket-only commits),
closed 2 (727 and 730). No ticket was filed by this review.

## Disposition

| ID  | Axis        | Disposition | Ticket / note                                                                                                                 |
| --- | ----------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------- |
| A2  | Adversarial | fixed       | SKILL.md:158 `<mode or chunk id>` changed to `<chunk id, or none>` in both copies                                             |
| A3  | Adversarial | wontfix     | both readings of "its first chunk" give unique names and step 6 reads every renamed plan; polish under the owner's ruling     |
| S1  | Standards   | wontfix     | the template does not forbid naming the open question on the one-line chunk, so Gate A can pass; a new field is an added rule |
| S2  | Standards   | fixed       | stage-gate-project.md:188 history line now names the foreground-helpers hook                                                  |
| P1  | Spec        | wontfix     | same as A3                                                                                                                    |
| P2  | Spec        | wontfix     | line wrapping only; Prettier ignores `.claude/`                                                                               |
