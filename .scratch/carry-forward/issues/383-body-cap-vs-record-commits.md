Status: closed
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

- [x] A decision is recorded in `docs/agents/home/AGENTS.md` or here.
- [x] If the rule changes, `~/.claude/AGENTS.md` is re-copied from the staged
      file and the two are byte-identical.

## Resolution — 2026-09-13, fix/merge-ready-disposition-parser

None of the three options was taken. The owner chose a fourth: a body past six
lines goes to an independent subagent, which decides whether the length is
necessary. No class is exempt, so a record commit is reviewed like any other,
and the reviewer can approve length when it is warranted.

Two constraints the owner set on how that review is asked for. The prompt must
not tell the reviewer the length is justified or ask it to confirm, because a
review that cannot say no is not a review. And the reviewer judges every line,
not only the lines past the sixth, because the first six are not privileged.

The rule text is in `docs/agents/home/AGENTS.md` under `## Commit messages`.
Verify it is live with
`git diff --no-index docs/agents/home/AGENTS.md ~/.claude/AGENTS.md`, which
exits 0 when the staged copy and the live file match.

Nothing enforces this. `core.hooksPath` is `.githooks`, which holds only
`pre-commit` and `pre-push`; there is no `commit-msg` hook, and nothing in
`scripts/merge_to_dev.py` reads a commit message.

A hook was considered and dropped. Measured 2026-09-13 at `e35ce1b` with
`git log -100 --format=%H` and a per-commit scan of `%b` for lines over 72
characters: 62 of the last 100 commits have at least one such line, so a
body-wrap rule would reject most of them. `git log -200 --merges --format=%s`
gives a longest merge subject of 83 characters, so a subject-length rule would
reject generated merge subjects and fail `pnpm merge-to-dev` mid-merge. Both
figures are from this branch; an earlier draft of this Resolution credited them
to the round-3 review, which does not contain them.

The rule holds the way the rest of the steering file holds, by being read.
Whether it changes what agents write is untested.
