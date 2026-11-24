Status: open
Type: task (tooling)
Origin: the fix/893-set-stage-progress merge, 2026-11-24 (`.scratch/agent-reports/2026-11-24-general-task-893-merge.md`)
Blocks: none
Blocked by: none

# A skill the repo does not own can fail the merge into dev

## What happens

`pnpm verify` runs the pointer check first
(`package.json` `verify`: `pnpm run pointers:check`, which is
`python scripts/check_instruction_pointers.py check`). The check reads every
Markdown file under `~/.claude/skills/` (`HOME_SITE_GLOBS` in
`scripts/check_instruction_pointers.py`, the `.claude/skills/**/*.md` entry),
and it exits 1 on a dead pointer or a style problem in any of them.

So a third-party skill the owner installs in `~/.claude/skills/` can fail
`pnpm verify`, and with it `pnpm merge-to-dev` and the push of `dev`, for
text that has nothing to do with this repo.

## When it happened

2026-11-24: `pnpm merge-to-dev` for `fix/893-set-stage-progress` stopped at
the pointer check on one line of a newly installed skill:

```
~/.claude/skills/mobile-native/SKILL.md:72: write a space after §: `§ 5`.
pointers: 272 checked, 0 dead, 1 style; 1 into .scratch skipped
FAIL: pnpm verify failed
```

Log: `.scratch/merge-893/logs/1-merge-to-dev.log` (gitignored). The line was
the skill's own cross-reference "(see §5)", not a pointer to a file agents
here read. The owner edited the skill to "§ 5" and the merge went through
(`.scratch/merge-893/logs/2-merge-to-dev.log`:
`pointers: 272 checked, 0 dead, 0 style`).

## Done when

- A skill the repo doesn't own cannot fail the merge gate.
- Dead-pointer checks on the files agents here are pointed at still run.
