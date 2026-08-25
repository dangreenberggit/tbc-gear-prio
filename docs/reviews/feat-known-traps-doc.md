# Pre-merge review — feat/known-traps-doc

Reviewed range: `3435504..310e770`

Dispatch note: docs-only branch (two commits — `docs/agents/known-traps.md`
plus one AGENTS.md pointer line). Same-session review by the authoring
agent against the `writing-for-agents` rubric, with the owner explicitly
waving the branch through ("good enough, merge it") in lieu of fresh-context
axes. No code, no data, no fork changes.

## Summary

`docs/agents/known-traps.md` captures six traps the upgrades-ui-fit pass
actually hit, restructured trigger-led (each heading is the action that
arms the trap; symptom lines remain the after-the-fact index). AGENTS.md's
CLI-environment section gains one pointer naming the five arming actions
plus the strange-failure fallback, so agents are routed before the risky
action rather than only after a failure. Rubric points applied: one
trigger per branch, front-loaded pointer wording, symptom/cause/move
co-located, positive phrasing, no duplication of AGENTS.md's existing CLI
material.

## Disposition

| ID  | Axis      | Disposition | Ticket / note                                                    |
| --- | --------- | ----------- | ---------------------------------------------------------------- |
| W1  | Standards | fixed       | rubric pass applied in commit `310e770`; no findings outstanding |
