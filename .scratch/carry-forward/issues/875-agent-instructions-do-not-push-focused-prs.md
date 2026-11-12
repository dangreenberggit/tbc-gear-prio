Status: open
Type: task
Origin: owner, tab polish session (`fix/tab-polish`), 2026-11-12
Serves: none (agent instructions; owner 2026-11-12)
Blocks: none
Blocked by: none
Related: 866

# Agent instructions do not push work toward modular, focused PRs

## What the owner asked for

The owner wants to adjust the agent instruction files (`AGENTS.md` and the
orchestration docs) to push towards modularity and focused PRs.

The owner's words, 2026-11-12, in the tab polish session's chat, after
rejecting an upstream test edit for ticket 866 in the tab branch:

> This reminds me that I need to adjust the agent MD and orchestratiin files
> to push towards modularity and focused PRs be sure this lakced focus (maybe
> I'm wrong and perhaps it would help the upgrades tab but that's what it
> looks like to me)

## Context

The session had asked the owner to OK a 4-line change to upstream's
`ui/i18n/locale_keys.test.ts` inside the tab's polish branch
(`fix/tab-polish`). The owner answered:

> Our job isn't to fix wowsims files, so no, even if this sounds like a good
> fix it sounds to me like it wouldn't fit in an upgrades tab PR so rejected.
> You can file it as a general wowsims fix for after the tab or maybe
> separately before it

That edit is now ticket 866, a general wowsims fix outside the tab's scope.

Source for both quotes: the session chat, relayed verbatim in the merge brief
for `fix/tab-polish` (2026-11-12). Neither quote is in
`.scratch/plans/tab-polish-2026-11-12.md`.

## Done when

The owner has approved exact text for the instruction change. Changes to
`AGENTS.md`, `CLAUDE.md`, skills or agent definitions need the owner's
approval of the text in chat first (global rule "Changing agent
instructions", staged in `docs/agents/home/AGENTS.md`). No text is drafted
here.
