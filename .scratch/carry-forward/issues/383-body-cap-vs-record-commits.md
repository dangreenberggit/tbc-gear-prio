Status: open
Type: chore
Origin: Standards axis of the `fix/merge-ready-disposition-parser` pre-merge review, round 3 (S7)
Blocks: none
Blocked by: none
Relates to: 382 (the same branch's comment-policy cleanup)

# The six-line commit body maximum has no exemption for record-keeping commits

`07efe1e` added a commit-message section to `docs/agents/home/AGENTS.md`, the
staged copy of the user's global `~/.claude/AGENTS.md`. It says bodies default
to subject-only, six lines is a soft maximum, and past six the commit should be
split.

That works for ordinary code commits. It does not describe what this repo's
stage-gate pipeline produces. `32e92e6` on this branch is the case: a 30-line
body recording one gate outcome, with five separate measured claims (self-test
count, two denominators, ticket absence, the NEXT value). Splitting it is not
available, because it is one logical act. The rule's own remedy does not apply
to a commit whose content cannot be divided.

The repo's `AGENTS.md` section on durable claims pushes the other way for these
same commits: a causal claim must point at a re-runnable command or be marked
hypothesis. That obligation is per-sentence, so it lengthens sentences instead
of adding lines, and a body with one claim still fits. A body with five does
not.

Nobody has decided which rule yields. The new text does not name the class, so
the next stage-gate record commit either breaks the maximum or drops
measurements it is meant to record.

## Options

1. Name the exemption in the rule: a record commit may list its measurements
   past six lines.
2. Keep the maximum strict and move gate records out of commit messages. They
   already exist as files under `.scratch/stage-gate/`.
3. Leave it and let the maximum be broken, which the round-3 review warns is
   worse than having no number.

## Acceptance

- [ ] A decision is recorded in `docs/agents/home/AGENTS.md` or here.
- [ ] If the rule changes, `~/.claude/AGENTS.md` is re-copied from the staged
      file and the two are byte-identical.
