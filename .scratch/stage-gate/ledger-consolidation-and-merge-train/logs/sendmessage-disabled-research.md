# Why `SendMessage` is unavailable — researched 2026-09-12

## Answer

**The installed Claude Code is below the version floor for cross-session
messaging.** It is not a desktop-app design limitation and not a policy block.

```
claude --version
# 2.0.47 (Claude Code)
```

Documented floor: **v2.1.234 on native Windows** (v2.1.224 macOS/Linux) —
<https://code.claude.com/docs/en/cross-session-messaging> § Availability.

So the environment is roughly 190 patch versions below the release that ships
the tool. The fix is an update; nothing in this repo or its settings can enable
it.

## What was ruled out, with the commands

**No deny rule anywhere.** The documented way to remove the tool is
`permissions.deny: ["SendMessage", "ListAgents"]` in user, project, or managed
settings.

```
# grep of all three settings files for SendMessage|ListAgents|deny
C:\Users\dgree\.claude\settings.json                      -> no SendMessage reference, no deny block
C:\Users\dgree\Code\lulz\tbc-gear-prio\.claude\settings.json        -> NOT FOUND (file does not exist)
C:\Users\dgree\Code\lulz\tbc-gear-prio\.claude\settings.local.json  -> no SendMessage reference
```

**No managed (administrator) settings.**

```
C:\ProgramData\ClaudeCode\managed-settings.json           -> absent
%APPDATA%\ClaudeCode\managed-settings.json                -> absent
```

**Not the agent-teams flag.** `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` gates
teams, not this: "`SendMessage` doesn't require agent teams to be enabled; only
structured team-protocol messages such as `shutdown_request` and
`plan_approval_response` do"
(<https://code.claude.com/docs/en/sub-agents> § Resume subagents). Community
issues claiming otherwise describe older versions.

**Not nesting or background-task lifecycle.** No documented connection. The
desktop app does refuse cross-session sends from a session nobody is watching
(scheduled-task runs), but that is not this symptom and would not remove the
tool from subagents too.

## The diagnostic that pointed the right way

`ListAgents` is available while `SendMessage` is not. A deny rule removes
**both** — the docs say denying `SendMessage` "also removes messaging to
subagents and agent-team teammates, since the same tool serves both". A version
floor can ship them separately. That asymmetry is what distinguished
"below the floor" from "blocked by policy", and it was visible before either
settings check ran.

## Consequence while unfixed — this is the part that matters

**There is no supported way to resume a spawned subagent's context.**
`SendMessage` is the only documented mechanism
(<https://code.claude.com/docs/en/sub-agents> § Resume subagents). `TaskOutput`
does not substitute: it "retrieves output from a background task. Deprecated in
favor of `Read` on the task's output file path"
(<https://code.claude.com/docs/en/tools-reference>) — it returns what a task
already produced, it does not restore context or allow a follow-up question.

So an agent's in-context work is **unreachable the moment it stops**. This
already cost this stage real work twice:

1. A Planner seat produced a ~20KB plan revision as its final message without
   persisting it. A fresh spawn of the same seat correctly refused to
   "reproduce it verbatim" — it had never seen the text, and inventing the SHAs
   would have been worse than refusing. The original seat could not be resumed.
2. When a sim-header overseer appeared stalled, its state had to be
   reconstructed from the filesystem instead of asked for.

**Mitigation, now a stage rule:** every seat and subagent writes a durable log
to `logs/` as it goes (see `logs/README.md`), and any long deliverable is
written to disk by the agent that produced it rather than returned only in a
final message. The filesystem is the only reliable carrier between agents here.
This is also what `AGENTS.md` § Models and walls already requires — "Managers
must not background workers and end the turn without a disk handoff for fan-in".

## If the update happens

Re-check with `/status` (the `Peer address` row shows whether messaging
infrastructure is up) and confirm `claude --version` ≥ 2.1.234. The logging
convention should stay regardless — it is good practice independent of whether
resumption works.

## Sources

- <https://code.claude.com/docs/en/cross-session-messaging>
- <https://code.claude.com/docs/en/sub-agents>
- <https://code.claude.com/docs/en/desktop>
- <https://code.claude.com/docs/en/tools-reference>
- <https://code.claude.com/docs/en/settings-reference>

Community issue titles suggesting a regression rather than a floor
(<https://github.com/anthropics/claude-code/issues/90481> and others) are
**unverified community reports**, and are superseded here by the measured
version number.
