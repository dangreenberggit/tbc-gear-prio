Status: open
Type: defect (process — a read-only seat destroyed uncommitted work)
Origin: pre-merge review of `fix/worn-item-pool-coverage`, 2026-08-22; investigated
  the same day, findings in this ticket
Blocks: none
Blocked by: none

# Read-only review axes must run no mutating git command

## What happened

Four review axes ran in parallel against one shared checkout. The orchestrator was
editing tracked files at the same time, applying findings from the two axes that
had already reported.

The **adversarial axis** saw the dirty tree, concluded a rogue subagent had written
to tracked files, and ran `git checkout --` on four of them. It saved the diffs to
the session scratchpad first — the only reason the work was recoverable.

The **domain axis** met the identical dirty tree, left it alone, and reported it.

Same situation, opposite handling. That is the tell.

## What it cost

Reapplying the reverted work **missed one hunk**. `docs/verification-log.md` kept
the wrong handoff count ("returns 14 … added two") while `PLAN.md` carried the
corrected 16/four, so the two documents that close a PLAN.md gate box contradicted
each other — in the exact sentence the standards axis had already flagged as a
durable-claims breach. Nobody noticed until a follow-up investigation diffed the
scratchpad copies against `HEAD`.

Both live defects are fixed in the same commit as this ticket. What is not fixed
is the reason it could happen.

## Why it happened, and it is not a model failure

**No brief says reviewers are read-only.** Checked:

```
grep -rn "read-only\|read only\|checkout\|mutat" .agents/reviews/ .claude/skills/pre-merge-review/SKILL.md
```

`.agents/reviews/adversarial.md` and `.agents/reviews/domain.md` contain no
read-only, mutation or `git status` language at all, and neither does the skill.
The constraint lived only in the orchestrator's ad-hoc dispatch prompt.

Worse, that prompt's wording — *"`git status --porcelain` must be empty when you
finish"* — makes the reviewer **responsible for tree state it does not own**, and
so actively invites a repair. The adversarial axis was never told to restore a
dirty tree; it improvised a destructive way to satisfy the condition it was given.

An unwritten rule got a coin-flip, and one of the two seats called it wrong.

## The fix, weighted

Two candidate rules. The **reviewer-scope** one is primary:

- A reviewer edits no file and runs **no mutating git command** — no
  `checkout --`, `reset`, `stash`, `clean`, `restore`. A dirty tree it did not
  create is **reported in the findings, never repaired**.
- Dispatch wording stops asking for an empty porcelain and says "you write
  nothing" instead.

This fails safe: a seat that only reads cannot destroy anything.

The **sequencing** rule is real but weaker — the orchestrator should not edit
tracked files while read-only axes run in the same checkout. It is advice with no
enforcement, it costs review latency, and it does nothing when a *worker* rather
than the orchestrator dirties the tree. Worth writing down next to `AGENTS.md`'s
existing shared-index line, which today covers two *writers* and not
writer-plus-readers.

## Related, not duplicate

Ticket 235 (resolved) is the closest: lint-staged's stash/restore destroying
uncommitted work. Same **outcome** — work lost in a shared checkout, recovered only
because a session happened to hold the diffs — different **mechanism** (a tool race
versus an agent's judgement call on an unwritten rule). Ticket 149 is worktree
debris, unrelated.

## Acceptance

- [x] `docs/verification-log.md`'s handoff count corrected to 16/four, matching
      `PLAN.md` and `ls .scratch/handoffs/sme-rank-judgment-*.md | wc -l` → 16.
- [x] The process note in `docs/reviews/fix-worn-item-pool-coverage.md` corrected —
      one hunk was lost, not all reapplied.
- [ ] `.agents/reviews/adversarial.md` and `.agents/reviews/domain.md` each state
      the reviewer writes nothing and runs no mutating git command, and reports a
      dirty tree rather than repairing it.
- [ ] `.claude/skills/pre-merge-review/SKILL.md` § 2 carries the same constraint,
      and no dispatch wording asks a reviewer to make `git status --porcelain`
      empty.
- [ ] `AGENTS.md`'s parallel-agents section extends the shared-index warning from
      two writers to writer-plus-readers.

**Note:** the last three edit `AGENTS.md` and skill/brief files, which `AGENTS.md`
requires be **proposed in chat and approved** before editing. This ticket is the
proposal.
