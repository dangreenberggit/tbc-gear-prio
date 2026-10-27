Status: open
Type: grilling
Origin: pre-merge review feat/usage-limit-fixes, spec axis P2, 2026-10-26
Blocks: none
Blocked by: none

# Open owner question Q-haiku: should cheap read-only jobs run on Haiku?

## What happens today

The owner said on 2026-10-26: "maybe bash calls should be done by haiku or
something even" (`.scratch/agent-reports/2026-10-26-session-usage-limit-investigation.md`,
gitignored, main checkout only). The proposal's Q-haiku
(`.scratch/plans/usage-limit-fixes/PROPOSAL.md` § Q-haiku) recommended
keeping Sonnet for now and deciding after the `discrete-task` trial
numbers. The owner did not answer it. AGENTS.md § Spawning still says
"Nothing runs on Haiku", the rule from `dev`, so it reads as settled.

## Done when

The owner answers Q-haiku. If the answer is Haiku, a read-only agent
type on Haiku is added and AGENTS.md § Spawning and model-policy change
to match (agent-file edits need the owner's approval). The trial review
on 2026-10-31 (model-policy § Trial types, "Stopping and review") gives
the reject rate the proposal wanted for this decision.
