"""PreToolUse hook on Agent: a subagent's helpers run in the foreground.

A subagent that ends its turn while a helper it started with Agent runs
in the background was reported to the session as finished in the two
cases seen (ticket 712: planner ad2562f777e12efd3 on 2026-10-25,
planner a1dac72a2be5aafc8 on 2026-10-24). In the 2026-10-25 case, when
the helper ended, its report went to the session, not to the subagent,
and nothing resumed the subagent. This hook sets run_in_background to
false on every Agent call made inside a subagent, so each helper's report
comes back to the subagent as the Agent call's result. Calls from the
top-level session have no agent_id and are left alone.

The output sets updatedInput and leaves permissionDecision out: "allow"
would also skip the permission prompt for the spawn.

The hook must never stop a spawn, so any error prints nothing and exits 0,
and the call runs unchanged. Standard library only, and no child processes:
a hook process that hangs on Windows holds the spawn until the timeout in
.claude/settings.json (anthropics/claude-code#96476, #77776).
"""

import json
import sys


def rewrite(data):
    if not isinstance(data, dict) or data.get("tool_name") != "Agent" or not data.get("agent_id"):
        return None
    tool_input = data.get("tool_input")
    if not isinstance(tool_input, dict):
        return None
    # A call that omits the field also runs in the background, so only an
    # explicit False is left alone.
    if tool_input.get("run_in_background") is False:
        return None
    updated = dict(tool_input)
    updated["run_in_background"] = False
    return {"hookSpecificOutput": {"hookEventName": "PreToolUse", "updatedInput": updated}}


def main():
    try:
        out = rewrite(json.loads(sys.stdin.buffer.read().decode("utf-8")))
        if out is not None:
            # ensure_ascii (the default) keeps the output ASCII, so a prompt
            # with non-ASCII text cannot fail on a Windows console code page.
            sys.stdout.write(json.dumps(out))
    except BaseException:
        pass
    sys.exit(0)


if __name__ == "__main__":
    main()
