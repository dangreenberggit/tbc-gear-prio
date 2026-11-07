Status: open
Type: task
Origin: owner, session F of the epic 452 chain, 2026-11-06
Serves: none
Blocks: none
Blocked by: none
Related: none

# The "open items carry forward" rule makes replies too long to read

## What happens today

The global rule "Open items carry forward" (`~/.claude/AGENTS.md` § Chat
responses, staged in `docs/agents/home/AGENTS.md`) makes every reply
restate every open item in full. At the end of the 452 chain, one reply
restated six merge asks, four questions and eight commands.

The owner's words, 2026-11-06, in reply to that message: "i aint reading
all that"; "open items dont need restating in full every message if there
are 50000 items youre throwing at me"; and "i wont do 27000 steps in one
message unless thats actually part of the process. but 7500900 decisions
and 5203493 commands and 1923u8493u4 things to do is just silly to waste
putting in a long response that no one will ever read and even an agent
would be confused and blow its head off".

When the session offered to draft new wording, the owner said: "you can
save that for later".

## What to do

Draft new wording for the rule: with many open items, each gets one line
with its recommendation, and the full text, shas and commands go in a
file that the reply links. A reply holds many steps only when the process
needs them all at once. This is an agent-instruction edit: it follows the
global rule "Changing agent instructions" (the owner approves the exact
text first).

## Done when

The owner has approved the new text, and it is in `~/.claude/AGENTS.md`
and in the staged copy `docs/agents/home/AGENTS.md`.
