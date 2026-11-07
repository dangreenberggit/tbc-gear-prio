"""Cases for flash-over-sonnet.py. Run after any edit to the hook or to
§ Sonnet reasons or § Refusal of the routing file:

    python3 docs/agents/home/hooks/tests/flash-over-sonnet.py
    python3 docs/agents/home/hooks/tests/flash-over-sonnet.py --hook H --routing R

By default the cases run the staged hook against the staged routing file
(docs/agents/home/routing.md); --hook and --routing point them at another
copy, such as the installed one. Exit 0 when every case passes, 1 otherwise.

A wrong refusal costs one wasted spawn; a wrong pass costs a Sonnet run. The
hook holds no reason list and no refusal text, so the cases also check that
the hook's own source names none of them: a copy there could drift from the
routing file.
"""

import json
import os
import subprocess
import sys
import tempfile

HOME_STAGED = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
STAGED_HOOK = os.path.join(HOME_STAGED, "hooks", "flash-over-sonnet.py")
STAGED_ROUTING = os.path.join(HOME_STAGED, "routing.md")
REASONS = ["private:", "web", "cold read", "test", "glm wall retry", "caller order:"]
PLACEHOLDERS = ["path or what", "", "", "", "", "the quoted ban"]
PRIVATE_EMPTY = "`private:` needs `<path or what>` filled in, not left blank or as a placeholder."
CALLER_EMPTY = "`caller order:` needs `<the quoted ban>` filled in, not left blank or as a placeholder."


def arg(name, default):
    if name in sys.argv:
        return os.path.abspath(sys.argv[sys.argv.index(name) + 1])
    return default


HOOK = arg("--hook", STAGED_HOOK)
ROUTING = arg("--routing", STAGED_ROUTING)


def payload(subagent_type="discrete-task", prompt="Run `ls`.", model="sonnet", tool_name="Agent", agent_id="a1"):
    tool_input = {"description": "x", "prompt": prompt, "subagent_type": subagent_type}
    if model is not None:
        tool_input["model"] = model
    data = {"session_id": "s1", "hook_event_name": "PreToolUse", "tool_name": tool_name, "tool_input": tool_input}
    if agent_id:
        data["agent_id"] = agent_id
    return json.dumps(data)


def run(stdin_text, routing, home):
    env = dict(os.environ, FLASH_OVER_SONNET_ROUTING=routing, HOME=home)
    done = subprocess.run([sys.executable, HOOK], input=stdin_text.encode("utf-8"),
                          capture_output=True, timeout=10, env=env)
    return done.returncode, done.stdout.decode("utf-8")


def refusal_from(path):
    """The § Refusal paragraph after "The hook prints ...", joined to one line."""
    with open(path, encoding="utf-8") as f:
        text = f.read()
    body = text.split("\n## Refusal\n", 1)[1].split("\n## ", 1)[0]
    paragraphs = [p for p in body.strip().split("\n\n") if p.strip()]
    return " ".join(paragraphs[1].split())


class Cases:
    def __init__(self, home):
        self.home = home
        self.results = []

    def deny(self, name, stdin_text, first="", routing=None):
        rc, out = run(stdin_text, routing or ROUTING, self.home)
        try:
            h = json.loads(out)["hookSpecificOutput"]
        except (ValueError, KeyError, TypeError):
            return self.results.append("%s: want a deny, got rc=%d stdout=%r" % (name, rc, out[:200]))
        want = (first + " " + REFUSAL) if first else REFUSAL
        if rc != 0 or h.get("hookEventName") != "PreToolUse" or h.get("permissionDecision") != "deny":
            return self.results.append("%s: bad deny output rc=%d %r" % (name, rc, h))
        if h.get("permissionDecisionReason") != want:
            return self.results.append("%s: reason %r, want %r" % (name, h.get("permissionDecisionReason"), want))
        self.results.append(None)

    def silent(self, name, stdin_text, routing=None):
        rc, out = run(stdin_text, routing or ROUTING, self.home)
        if rc != 0 or out != "":
            return self.results.append("%s: want silence and rc 0, got rc=%d stdout=%r" % (name, rc, out[:200]))
        self.results.append(None)

    def check(self, name, ok, detail=""):
        self.results.append(None if ok else "%s %s" % (name, detail))


def sonnet(prompt, subagent_type="discrete-task"):
    return payload(subagent_type, prompt=prompt + "\nRun ls.")


def main():
    global REFUSAL
    REFUSAL = refusal_from(ROUTING)
    with tempfile.TemporaryDirectory() as home:
        c = Cases(home)
        log = os.path.join(home, ".local", "state", "agent-guard", "flash-over-sonnet.jsonl")

        # The routing file and the parser
        sys.path.insert(0, os.path.dirname(HOOK))
        import importlib.util
        spec = importlib.util.spec_from_file_location("hook", HOOK)
        hook = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(hook)
        with open(ROUTING, encoding="utf-8") as f:
            tokens, refusal = hook.parse_routing(f.read())
        c.check("parser reads the reasons of the routing file", list(tokens or []) == REASONS, "got %r" % tokens)
        c.check("parser reads each reason's placeholder from its bullet",
                tokens == dict(zip(REASONS, PLACEHOLDERS)), "got %r" % tokens)
        c.check("parser reads the Refusal paragraph", refusal == REFUSAL, "got %r" % refusal)
        c.check("refusal names the missing line and the routing file",
                "`Sonnet because: <reason>`" in REFUSAL and "~/.claude/routing.md" in REFUSAL)
        with open(HOOK, encoding="utf-8") as f:
            source = f.read()
        copied = [r for r in ["cold read", "glm wall retry", "caller order", "Re-send it with the line"] if r in source]
        c.check("hook source holds no reason or refusal text", not copied, "found %r" % copied)

        # Refused: who is a Sonnet spawn, and lines with no listed reason
        c.deny("discrete-task, no reason", payload())
        c.deny("simple-task, no reason", payload("simple-task"))
        c.deny("discrete-task, no model argument", payload(model=None))
        c.deny("top-level session spawn (no agent_id)", payload(agent_id=None))
        c.deny("general-task on model sonnet", payload("general-task", model="sonnet"))
        c.deny("general-task on a full Sonnet model id", payload("general-task", model="claude-sonnet-5-5"))
        c.deny("reason line not first", payload(prompt="Run ls.\nSonnet because: private: x"))
        c.deny("empty prompt", payload(prompt=""))
        c.deny("prompt not a string", payload(prompt=None))
        c.deny("unknown reason", sonnet("Sonnet because: habit"), "The reason `habit` is not on the list.")
        c.deny("reason word inside a longer word", sonnet("Sonnet because: webby"), "The reason `webby` is not on the list.")
        c.deny("website", sonnet("Sonnet because: website"), "The reason `website` is not on the list.")
        c.deny("testing", sonnet("Sonnet because: testing"), "The reason `testing` is not on the list.")
        c.deny("private with no colon", sonnet("Sonnet because: private"), "The reason `private` is not on the list.")
        c.deny("private with an empty path", sonnet("Sonnet because: private:   "), PRIVATE_EMPTY)
        c.deny("private with the placeholder", sonnet("Sonnet because: private: <path>"), PRIVATE_EMPTY)
        c.deny("caller order with no ban quoted", sonnet("Sonnet because: caller order:  "), CALLER_EMPTY)
        c.deny("caller order with the placeholder", sonnet("Sonnet because: caller order: <the quoted ban>"),
               CALLER_EMPTY)
        no_placeholder = os.path.join(home, "no-placeholder.md")
        with open(ROUTING, encoding="utf-8") as f:
            text = f.read()
        with open(no_placeholder, "w", encoding="utf-8") as f:
            f.write(text.replace("`caller order: <the quoted ban>`", "`caller order:`"))
        c.deny("colon reason whose bullet shows no placeholder", sonnet("Sonnet because: caller order:"),
               "`caller order:` needs its value filled in, not left blank or as a placeholder.",
               routing=no_placeholder)

        # Let through
        c.silent("private with path", sonnet("Sonnet because: private: ~/.t3/caches"))
        c.silent("private with no blank before the path", sonnet("Sonnet because: private:~/x"))
        c.silent("private with a blank before the path", sonnet("Sonnet because: private: ~/x"))
        c.silent("caller order with the ban", sonnet("Sonnet because: caller order: do not use GLM"))
        c.silent("cold read", sonnet("Sonnet because: cold read"))
        c.silent("glm wall retry", sonnet("Sonnet because: glm wall retry"))
        c.silent("web", sonnet("Sonnet because: web"))
        c.silent("web.", sonnet("Sonnet because: web."))
        c.silent("web, see below", sonnet("Sonnet because: web, see below"))
        c.silent("web; then more", sonnet("Sonnet because: web; then more"))
        c.silent("test", sonnet("Sonnet because: test", "simple-task"))
        c.silent("no blank after the colon", sonnet("Sonnet because:web"))
        c.silent("blank lines before the reason", payload(prompt="\n  \nSonnet because: private: ~/.claude/x\nRun ls."))
        c.silent("lower case", sonnet("sonnet because: Private: x"))
        c.silent("upper case", sonnet("SONNET BECAUSE: WEB"))
        c.silent("glm-flash-task", payload("glm-flash-task", model=None))
        c.silent("general-task on opus", payload("general-task", model="opus"))
        c.silent("modest-task on opus", payload("modest-task", model="opus"))
        c.silent("Bash tool", payload(tool_name="Bash"))
        c.silent("malformed stdin", "{not json")
        c.silent("empty stdin", "")
        c.silent("stdin is a JSON list", "[1, 2]")
        c.silent("tool_input not an object", json.dumps({"tool_name": "Agent", "tool_input": "text"}))

        # Fail open, with one log line, when the routing file is missing or lacks a section
        with open(ROUTING, encoding="utf-8") as f:
            text = f.read()
        no_reasons = os.path.join(home, "no-reasons.md")
        with open(no_reasons, "w", encoding="utf-8") as f:
            f.write(text.replace("\n## Sonnet reasons\n", "\n## Sonnet reason list\n"))
        no_refusal = os.path.join(home, "no-refusal.md")
        with open(no_refusal, "w", encoding="utf-8") as f:
            f.write(text.replace("\n## Refusal\n", "\n## Refused\n"))
        missing = os.path.join(home, "missing.md")
        not_utf8 = os.path.join(home, "not-utf8.md")
        with open(not_utf8, "wb") as f:
            f.write(b"\xff\xfe")
        for name, path in (("§ Sonnet reasons missing", no_reasons), ("§ Refusal missing", no_refusal),
                           ("routing file missing", missing), ("routing file not UTF-8", not_utf8)):
            before = sum(1 for _ in open(log)) if os.path.exists(log) else 0
            c.silent(name + ": spawn goes ahead", payload(), routing=path)
            after = sum(1 for _ in open(log)) if os.path.exists(log) else 0
            c.check(name + ": one log line", after == before + 1, "log lines %d -> %d" % (before, after))
        before = sum(1 for _ in open(log))
        c.silent("not a Sonnet spawn: routing file not read", payload("general-task", model="opus"), routing=missing)
        c.check("not a Sonnet spawn: no log line", sum(1 for _ in open(log)) == before)

    failures = [r for r in c.results if r]
    for line in failures:
        print("FAIL " + line)
    print("%d of %d cases passed (hook %s, routing %s)" % (len(c.results) - len(failures), len(c.results), HOOK, ROUTING))
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
