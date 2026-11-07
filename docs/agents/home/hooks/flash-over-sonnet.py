"""PreToolUse hook on Agent, wired only on the T3 Code card "Claude + GLM
workers" (~/.claude_router/settings.json): a Sonnet spawn states its reason.

On that card the owner wants GLM Flash for every workhorse job z-ai may see
(2026-10-26: "Sonnet generally should not be used but flash should be used
for workhorse tasks"; 2026-11-02: "i want flash used instead of sonnet
basically whenever possible btw"). So this hook refuses a discrete-task or
simple-task spawn, or any spawn with a Sonnet model, unless the prompt's first
non-blank line is "Sonnet because: <reason>" with a reason from the routing
file.

The reasons and the refusal text live only in ~/.claude/routing.md
(§ Sonnet reasons, § Refusal), so a routing change is one edit there; this
file reads them on every Sonnet spawn. FLASH_OVER_SONNET_ROUTING names another
copy, for the tests.

The hook must never stop a spawn because of its own fault, so any error
prints nothing, exits 0, and the spawn goes ahead. A routing file that is
missing, not UTF-8, or lacks a section also lets the spawn through, and leaves one line in
~/.local/state/agent-guard/flash-over-sonnet.jsonl so the gap is seen.
Standard library only and no child processes, as in
subagent-foreground-helpers.py.
"""

import json
import os
import sys
import time

SONNET_TYPES = {"discrete-task", "simple-task"}
LEAD = "sonnet because:"
SEPARATORS = " \t.,;"


def routing_path():
    return os.environ.get("FLASH_OVER_SONNET_ROUTING") or os.path.expanduser("~/.claude/routing.md")


def log_gap(path, what):
    try:
        folder = os.path.expanduser("~/.local/state/agent-guard")
        os.makedirs(folder, exist_ok=True)
        line = {"ts": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()), "routing": path, "gap": what}
        with open(os.path.join(folder, "flash-over-sonnet.jsonl"), "a", encoding="utf-8") as f:
            f.write(json.dumps(line) + "\n")
    except BaseException:
        pass


def section(text, heading):
    lines = text.splitlines()
    try:
        start = lines.index("## " + heading) + 1
    except ValueError:
        return None
    body = []
    for line in lines[start:]:
        if line.startswith("## "):
            break
        body.append(line)
    return body


def parse_routing(text):
    """Return (tokens, refusal) from the routing file's text; None for a part not found.

    tokens maps each reason to the placeholder its bullet shows after it
    ("" when the bullet has none), so a refusal can name what is missing."""
    tokens = None
    reasons = section(text, "Sonnet reasons")
    if reasons is not None:
        tokens = {}
        for line in reasons:
            if not line.startswith("- `"):
                continue
            token, _, placeholder = line[3:].split("`", 1)[0].partition("<")
            token = token.strip()
            if token:
                tokens[token] = placeholder.rstrip(">").strip()
        tokens = tokens or None
    refusal = None
    body = section(text, "Refusal")
    if body is not None:
        paragraphs, current = [], []
        for line in body + [""]:
            if line.strip():
                current.append(line.strip())
            elif current:
                paragraphs.append(" ".join(current))
                current = []
        if len(paragraphs) >= 2 and paragraphs[0].startswith("The hook prints"):
            refusal = " ".join(paragraphs[1].split())
    return tokens, refusal


def first_line(text):
    for line in text.splitlines():
        if line.strip():
            return line
    return ""


def judge(line, tokens):
    """Return None when the line gives a listed reason, else the sentence to put before the refusal."""
    stripped = line.strip()
    if not stripped.lower().startswith(LEAD):
        return ""
    rest = stripped[len(LEAD):].lstrip()
    low = rest.lower()
    placeholder = None
    for token in tokens:
        t = token.lower()
        if not low.startswith(t):
            continue
        after = rest[len(t):]
        if t.endswith(":"):
            tail = after.lstrip()
            if tail and not tail.startswith("<"):
                return None
            placeholder = token
        elif after == "" or after[0] in SEPARATORS:
            return None
    if placeholder is not None:
        what = "`<%s>`" % tokens[placeholder] if tokens[placeholder] else "its value"
        return "`%s` needs %s filled in, not left blank or as a placeholder." % (placeholder, what)
    return "The reason `%s` is not on the list." % rest


def decide(data):
    if not isinstance(data, dict) or data.get("tool_name") != "Agent":
        return None
    tool_input = data.get("tool_input")
    if not isinstance(tool_input, dict):
        return None
    agent_type = tool_input.get("subagent_type")
    model = tool_input.get("model")
    is_sonnet = agent_type in SONNET_TYPES or (isinstance(model, str) and "sonnet" in model.lower())
    if not is_sonnet:
        return None
    path = routing_path()
    try:
        with open(path, encoding="utf-8") as f:
            tokens, refusal = parse_routing(f.read())
    except (OSError, UnicodeDecodeError) as e:
        log_gap(path, "routing file not readable: " + type(e).__name__)
        return None
    if tokens is None or refusal is None:
        log_gap(path, "section not found: " + ", ".join(
            name for name, part in (("Sonnet reasons", tokens), ("Refusal", refusal)) if part is None))
        return None
    prompt = tool_input.get("prompt")
    first = ""
    if isinstance(prompt, str):
        first = judge(first_line(prompt), tokens)
        if first is None:
            return None
    reason = (first + " " + refusal) if first else refusal
    return {"hookSpecificOutput": {
        "hookEventName": "PreToolUse",
        "permissionDecision": "deny",
        "permissionDecisionReason": reason}}


def main():
    try:
        out = decide(json.loads(sys.stdin.buffer.read().decode("utf-8")))
        if out is not None:
            sys.stdout.write(json.dumps(out))
    except BaseException:
        pass
    sys.exit(0)


if __name__ == "__main__":
    main()
