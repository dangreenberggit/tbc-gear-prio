"""Cases for subagent-foreground-helpers.py. Run after any edit to the hook:

    python .claude/hooks/tests/subagent-foreground-helpers.py

Each case pipes one JSON payload into the hook as Claude Code would and
checks stdout and the exit code. Exit 0 when every case passes, 1 otherwise.

A wrong rewrite is worse than a miss: the hook replaces the whole tool
input, so a dropped key silently changes the spawn. The rewrite cases
therefore compare every key, not only run_in_background.

The settings case checks that .claude/settings.json still names this hook.
If that path stops resolving, python exits 2, and a PreToolUse hook that
exits 2 blocks every Agent call.
"""

import json
import os
import subprocess
import sys

HOOK = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "subagent-foreground-helpers.py")
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(HOOK)))
SETTINGS = os.path.join(ROOT, ".claude", "settings.json")

SPAWN = {
    "description": "Research 540 proc sites",
    "prompt": "Find every proc site. Résumé — non-ASCII text survives.",
    "subagent_type": "general-task",
    "model": "opus",
    "isolation": "worktree",
}


def payload(tool_input, agent_id="a8c221a8073e1be95", tool_name="Agent"):
    data = {
        "session_id": "s1",
        "hook_event_name": "PreToolUse",
        "tool_name": tool_name,
        "tool_input": tool_input,
    }
    if agent_id is not None:
        data["agent_id"] = agent_id
        data["agent_type"] = "gate-planner"
    return json.dumps(data)


def run_hook(stdin_text):
    done = subprocess.run(
        [sys.executable, HOOK],
        input=stdin_text.encode("utf-8"),
        capture_output=True,
        timeout=10,
    )
    return done.returncode, done.stdout.decode("utf-8")


def expect_rewrite(name, tool_input):
    code, out = run_hook(payload(tool_input))
    want = dict(tool_input)
    want["run_in_background"] = False
    try:
        got = json.loads(out)
    except ValueError:
        return ["%s: stdout is not JSON: %r" % (name, out)]
    expected = {"hookSpecificOutput": {"hookEventName": "PreToolUse", "updatedInput": want}}
    if code != 0 or got != expected:
        return ["%s: exit %d, got %r, want %r" % (name, code, got, expected)]
    return []


def expect_silent(name, stdin_text):
    code, out = run_hook(stdin_text)
    if code != 0 or out != "":
        return ["%s: exit %d, stdout %r; want exit 0 and no output" % (name, code, out)]
    return []


def expect_registered(name, settings_path):
    try:
        with open(settings_path, encoding="utf-8") as f:
            settings = json.load(f)
        entries = [e for e in settings["hooks"]["PreToolUse"] if e.get("matcher") == "Agent"]
    except (OSError, ValueError, KeyError, TypeError, AttributeError) as err:
        return ["%s: cannot read the PreToolUse Agent entry in %s: %r" % (name, settings_path, err)]
    if len(entries) != 1:
        return ["%s: want one PreToolUse entry with matcher Agent, found %d" % (name, len(entries))]
    tokens = []
    for hook in entries[0].get("hooks", []):
        tokens.append(hook.get("command", ""))
        tokens.extend(hook.get("args", []))
    want = os.path.normcase(os.path.normpath(HOOK))
    named = [
        token
        for token in tokens
        if os.path.normcase(os.path.normpath(token.replace("${CLAUDE_PROJECT_DIR}", ROOT))) == want
    ]
    if not named:
        return ["%s: no command or arg names %s; saw %r" % (name, HOOK, tokens)]
    if not os.path.isfile(HOOK):
        return ["%s: %s does not exist" % (name, HOOK)]
    return []


def main():
    cases = [
        expect_rewrite("subagent, run_in_background true", dict(SPAWN, run_in_background=True)),
        expect_rewrite("subagent, run_in_background absent", dict(SPAWN)),
        expect_silent("subagent, run_in_background false", payload(dict(SPAWN, run_in_background=False))),
        expect_silent("session (no agent_id)", payload(dict(SPAWN, run_in_background=True), agent_id=None)),
        expect_silent("subagent, empty agent_id", payload(dict(SPAWN, run_in_background=True), agent_id="")),
        expect_silent("subagent, Bash tool", payload({"command": "ls", "run_in_background": True}, tool_name="Bash")),
        expect_silent("malformed stdin", "{not json"),
        expect_silent("empty stdin", ""),
        expect_silent("tool_input not an object", payload("text")),
        expect_silent("stdin is a JSON list", "[1, 2]"),
        expect_registered("settings.json names this hook", SETTINGS),
    ]
    failures = [line for case in cases for line in case]
    for line in failures:
        print("FAIL " + line)
    passed = sum(1 for case in cases if not case)
    print("%d of %d cases passed" % (passed, len(cases)))
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
