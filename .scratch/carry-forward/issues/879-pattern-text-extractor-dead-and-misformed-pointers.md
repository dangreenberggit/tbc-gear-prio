Status: closed
Type: task
Origin: .scratch/agent-reports/2026-11-13-general-task-pointer-check-build.md
Blocks: none
Blocked by: none

# pattern-text-extractor has 15 dead and 5 wrongly written pointers

**Problem.** An agent in pattern-text-extractor that follows a `§`
pointer in its instruction files lands on a heading that does not exist
in 15 places, and 5 more are not in the checked form. The pointer check
built on `feat/instruction-pointer-check` runs only on this repo, so
nothing catches these. Command, from a tbc-gear-prio checkout with the
check (pattern-text-extractor `main` at `fd90eea`):

```
python scripts/check_instruction_pointers.py check --repo /home/daniel/Code/Snug/pattern-text-extractor
```

printed `pointers: 205 checked, 15 dead, 5 style; 1 into .scratch skipped`,
rc 1, on 2026-11-13. Repo-side lines:

- `AGENTS.md:116`, `:119`: `~/.claude/AGENTS.md` § Commits and merges
  (gone from the global file; it has § Git).
- `docs/agents/stage-gate-project.md:12, 25, 35, 43, 60, 61, 68, 125, 130`:
  § Claude Code "of the same file", bare `AGENTS.md` § Testing / § The
  loop / § Pattern text / § The session delegates, § Orchestrator conduct,
  `~/.claude/AGENTS.md` § Chat responses and § Commits and merges,
  `docs/agents/issue-tracker.md` § Carry-forward tickets (the heading has
  "(deferred from a review)").
- `docs/agents/model-policy.md:48`: bare `AGENTS.md` § The session delegates.
- `.claude/agents/gate-executor.md:126`, `gate-reviewer.md:90`,
  `gate-planner.md:20, 78, 82, 83`: same-file § Folders / § Planner that
  mean `docs/agents/stage-gate-project.md`.

Two global pointers are dead only when read in this repo, because they
name a repo-relative file:

- `~/.claude/routing.md:166`: `AGENTS.md` § Spawning.
- `~/.claude/skills/parallel-phase/adapters/claude-code.md:18`:
  `docs/agents/parallel-phase-project.md` § History.

**Also found by the 2026-11-13 trial** (stage-gate of ticket 06 in two
throwaway clones): `docs/agents/stage-gate-project.md` § Planner still
names a `gate-planner` seat and the section list still has § Executor,
while the live skill (`~/.claude/skills/stage-gate/SKILL.md`) plans with
`design-task` and builds with `general-task`. `docs/agents/model-policy.md`
§ Stage-gate seats says the planner runs at effort low; the session in
one run used low, in the other the `design-task` default (high).

**Fix.** Rewrite each pointer in the checked form (`writing-for-agents`
§ Context pointers), update the stage-gate role names as tbc-gear-prio's
`c25b13fc` did, and decide how the two global pointers name a file that
differs per repo (say it in words, or give each repo the heading).
Changes to pattern-text-extractor's `AGENTS.md` and agent files need the
owner's OK of the text. Optional: run the check in that repo's own
verify, which needs the script copied or shared.

## Comments

2026-11-13: closed here and moved to the two repos it concerns, so
whoever works there sees it. The owner said "Ok" to this proposal: "the
pattern-text-extractor part becomes a ticket in that repo's tracker; the
global-pointer part becomes a note in `/home/daniel/setup`; 879 here
gets closed, with a pointer to both."

- pattern-text-extractor's own 18 lines and the stage-gate role names:
  that repo's
  `.scratch/carry-forward/issues/76-dead-and-misformed-section-pointers.md`.
- The two global pointers (`routing.md:166`,
  `skills/parallel-phase/adapters/claude-code.md:18`): an item in
  `/home/daniel/setup/TODO.md`.

Agents cannot write to either repo, so both arrive as patches for the
owner to apply with `git am`:
`/home/daniel/Code/lulz/tbc-gear-prio/.scratch/agent-reports/2026-11-13-move-879/pattern-text-extractor-ticket-76.patch`
and `/home/daniel/Code/lulz/tbc-gear-prio/.scratch/agent-reports/2026-11-13-move-879/setup-todo-global-pointers.patch`
(gitignored). The findings still stand. This repo changes only if the
setup item settles on teaching the pointer check here to skip them.

Verified by:
`git -C /home/daniel/Code/Snug/pattern-text-extractor apply --check /home/daniel/Code/lulz/tbc-gear-prio/.scratch/agent-reports/2026-11-13-move-879/pattern-text-extractor-ticket-76.patch; git -C /home/daniel/setup apply --check /home/daniel/Code/lulz/tbc-gear-prio/.scratch/agent-reports/2026-11-13-move-879/setup-todo-global-pointers.patch`
both rc 0 on 2026-11-13, against pattern-text-extractor `fd90eea` and
setup `774ff88`. After the owner applies them,
`ls /home/daniel/Code/Snug/pattern-text-extractor/.scratch/carry-forward/issues/76-*`
and `grep -n 'pattern-text-extractor' /home/daniel/setup/TODO.md`
show both homes.
