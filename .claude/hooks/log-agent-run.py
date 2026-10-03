"""Run-log hook: append one JSON line per subagent report to the run log.

Hook mode (no arguments). Registered twice in .claude/settings.json, both async:
- PostToolUse on SubagentHandback: the delivered report is tool_input.message.
- SubagentStop: last_assistant_message, for subagents that return plain text.
  For a subagent that used SubagentHandback, this is only its closing text.
Each line also carries the agent's context-window load and a list-price cost
estimate, read from its transcript.

The run log is .scratch/agent-runs/<session_id>.jsonl in the checkout where
the session started. The Decisions section and the context numbers are copied
because Claude Code deletes transcripts after cleanupPeriodDays (default 30).

Hook mode must never affect a run, so it swallows every error and exits 0.

Report mode: python .claude/hooks/log-agent-run.py report [--since YYYY-MM-DD]
prints context load and estimated cost per agent type and model.

Standard library only.
"""

import collections
import datetime
import glob
import json
import os
import re
import statistics
import sys
import time

DECISIONS_START = re.compile(r"(?m)^##[ \t]+Decisions[ \t]*$")
NEXT_HEADING = re.compile(r"(?m)^#{1,6}[ \t]")
MAX_DECISIONS_CHARS = 4000
FALLBACK_TAIL_CHARS = 1500
MAX_TRANSCRIPT_BYTES = 64 * 1024 * 1024
MAX_SCAN_SECONDS = 20

# USD per million tokens: input, 5m cache write, 1h cache write, cache read, output.
# Source: https://platform.claude.com/docs/en/about-claude/pricing (2026-10-01).
# Standard speed, global inference, no batch discount.
PRICES = {
    "claude-fable-5-1": (10.0, 12.5, 20.0, 0.25, 50.0),
    "claude-fable-5": (10.0, 12.5, 20.0, 1.0, 50.0),
    "claude-opus-5-5": (4.0, 5.0, 8.0, 0.20, 20.0),
    "claude-opus-5": (5.0, 6.25, 10.0, 0.50, 25.0),
    "claude-opus-4-8": (5.0, 6.25, 10.0, 0.50, 25.0),
    "claude-sonnet-5-5": (2.0, 2.5, 4.0, 0.20, 10.0),
    "claude-sonnet-5": (2.0, 2.5, 4.0, 0.20, 10.0),
    "claude-haiku-4-5": (1.0, 1.25, 2.0, 0.10, 5.0),
}
# Sources (2026-10-01): models/overview (current models) and pricing, which
# says Claude 4.6 and later models include the full 1M token context window.
CONTEXT_WINDOWS = {
    "claude-fable-5-1": 1_000_000,
    "claude-fable-5": 1_000_000,
    "claude-opus-5-5": 1_000_000,
    "claude-opus-5": 1_000_000,
    "claude-opus-4-8": 1_000_000,
    "claude-sonnet-5-5": 1_000_000,
    "claude-sonnet-5": 1_000_000,
    "claude-haiku-4-5": 200_000,
}


def base_model(model):
    return re.sub(r"-\d{8}$", "", str(model or ""))


def decisions_text(message):
    starts = list(DECISIONS_START.finditer(message))
    if not starts:
        return message[-FALLBACK_TAIL_CHARS:], False
    start = starts[-1]
    end = NEXT_HEADING.search(message, start.end())
    text = message[start.start() : end.start() if end else len(message)].rstrip()
    if len(text) > MAX_DECISIONS_CHARS:
        text = text[:MAX_DECISIONS_CHARS] + " [cut]"
    return text, True


def agent_transcript_path(data, agent_id):
    given = str(data.get("agent_transcript_path") or "")
    if given:
        return given
    # PostToolUse input has no agent_transcript_path. Build it from the layout
    # seen on disk (not documented): <dir>/<session id>.jsonl for the session,
    # <dir>/<session id>/subagents/agent-<agent id>.jsonl for its subagents.
    transcript = str(data.get("transcript_path") or "")
    if not transcript.endswith(".jsonl"):
        return ""
    folder, name = os.path.split(transcript)
    if os.path.basename(folder) == "subagents":
        return os.path.join(folder, "agent-" + agent_id + ".jsonl")
    return os.path.join(folder, name[: -len(".jsonl")], "subagents", "agent-" + agent_id + ".jsonl")


def read_meta(transcript):
    # Not documented: agent-<id>.meta.json sits beside each subagent
    # transcript, with parentAgentId, spawnDepth and description.
    if not transcript.endswith(".jsonl"):
        return {}
    try:
        with open(transcript[: -len(".jsonl")] + ".meta.json", encoding="utf-8") as f:
            meta = json.load(f)
        return meta if isinstance(meta, dict) else {}
    except Exception:
        return {}


def read_calls(transcript):
    """One entry per model call, in order: (model, usage fields).

    The transcript writes one assistant record per content block, all with the
    same message id. Their input and cache fields are equal and output_tokens
    grows, so each field keeps its largest value per message id.
    """
    calls = {}
    truncated = False
    started = time.monotonic()
    read = 0
    with open(transcript, "rb") as f:
        for raw in f:
            read += len(raw)
            if read > MAX_TRANSCRIPT_BYTES or time.monotonic() - started > MAX_SCAN_SECONDS:
                truncated = True
                break
            if b'"usage"' not in raw or b'"assistant"' not in raw:
                continue
            try:
                record = json.loads(raw)
            except Exception:
                continue
            if not isinstance(record, dict):
                continue
            message = record.get("message")
            if record.get("type") != "assistant" or not isinstance(message, dict):
                continue
            usage = message.get("usage")
            # "<synthetic>" records are Claude Code's own zero-usage notices
            # (session limit, API error), not model calls.
            if not isinstance(usage, dict) or message.get("model") == "<synthetic>":
                continue
            key = message.get("id") or ("line", read)
            split = usage.get("cache_creation") if isinstance(usage.get("cache_creation"), dict) else {}
            fields = {
                "input": usage.get("input_tokens") or 0,
                "cache_read": usage.get("cache_read_input_tokens") or 0,
                "cache_write": usage.get("cache_creation_input_tokens") or 0,
                "write_1h": split.get("ephemeral_1h_input_tokens") or 0,
                "output": usage.get("output_tokens") or 0,
                "fast": 1 if usage.get("speed") == "fast" else 0,
            }
            if key in calls:
                old = calls[key][1]
                calls[key] = (calls[key][0], {k: max(old[k], fields[k]) for k in fields})
            else:
                calls[key] = (base_model(message.get("model")), fields)
    return list(calls.values()), truncated


def call_cost(model, u):
    price = PRICES.get(model)
    if price is None:
        return None
    p_in, p_w5, p_w1, p_read, p_out = price
    write_1h = min(u["write_1h"], u["cache_write"])
    write_5m = u["cache_write"] - write_1h
    return (u["input"] * p_in + write_5m * p_w5 + write_1h * p_w1 + u["cache_read"] * p_read + u["output"] * p_out) / 1e6


def pct(tokens, window):
    return round(100.0 * tokens / window, 1) if window else None


def context_stats(transcript):
    """Context-window load and a list-price cost estimate for one agent."""
    if not transcript or not os.path.isfile(transcript):
        return {"context_status": "no transcript"}
    calls, truncated = read_calls(transcript)
    if not calls:
        return {"context_status": "no calls"}
    model = collections.Counter(m for m, _ in calls).most_common(1)[0][0]
    window = CONTEXT_WINDOWS.get(model)
    sizes = [u["input"] + u["cache_read"] + u["cache_write"] for _, u in calls]
    costs = [call_cost(m, u) for m, u in calls]
    return {
        "context_status": "truncated" if truncated else "ok",
        "model": model,
        "calls": len(calls),
        "context_window_tokens": window,
        "peak_context_window_tokens": max(sizes),
        "peak_context_window_pct": pct(max(sizes), window),
        "final_context_window_tokens": sizes[-1],
        "final_context_window_pct": pct(sizes[-1], window),
        "output_tokens": sum(u["output"] for _, u in calls),
        "est_cost_usd": round(sum(c for c in costs if c is not None), 4),
        "unpriced_calls": sum(1 for c in costs if c is None),
        "fast_calls": sum(u["fast"] for _, u in calls),
    }


def log_root(data):
    root = os.environ.get("CLAUDE_PROJECT_DIR") or data.get("cwd") or os.getcwd()
    root = os.path.normpath(root)
    marker = os.sep + os.path.join(".claude", "worktrees") + os.sep
    cut = root.find(marker)
    return root[:cut] if cut >= 0 else root


def hook():
    data = json.loads(sys.stdin.buffer.read().decode("utf-8", errors="replace"))
    if not isinstance(data, dict):
        return
    agent_id = str(data.get("agent_id") or "")
    agent_type = str(data.get("agent_type") or "")
    # An empty agent_type is one of Claude Code's own internal agents.
    if not agent_id or not agent_type:
        return
    if data.get("hook_event_name") == "PostToolUse":
        if data.get("tool_name") != "SubagentHandback":
            return
        tool_input = data.get("tool_input")
        message = str(tool_input.get("message") or "") if isinstance(tool_input, dict) else ""
        event = "handback"
    else:
        message = str(data.get("last_assistant_message") or "")
        event = "stop"
    transcript = agent_transcript_path(data, agent_id)
    meta = read_meta(transcript)
    session = re.sub(r"[^A-Za-z0-9_-]", "_", str(data.get("session_id") or "")) or "unknown"
    decisions, has_heading = decisions_text(message)
    record = {
        "time": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%MZ"),
        "event": event,
        "session_id": session,
        "agent_id": agent_id,
        "agent_type": agent_type,
        "parent_agent_id": meta.get("parentAgentId"),
        "spawn_depth": meta.get("spawnDepth"),
        "description": meta.get("description"),
        "agent_transcript_path": transcript,
        "has_decisions_heading": has_heading,
        "decisions": decisions,
    }
    try:
        record.update(context_stats(transcript))
    except Exception as error:
        record["context_status"] = "error: " + type(error).__name__
    folder = os.path.join(log_root(data), ".scratch", "agent-runs")
    os.makedirs(folder, exist_ok=True)
    line = json.dumps(record, ensure_ascii=True) + "\n"
    with open(os.path.join(folder, session + ".jsonl"), "a", encoding="utf-8") as f:
        f.write(line)


def report(args):
    since = ""
    if args:
        if len(args) != 2 or args[0] != "--since" or not re.fullmatch(r"\d{4}-\d{2}-\d{2}", args[1]):
            print("usage: python .claude/hooks/log-agent-run.py report [--since YYYY-MM-DD]  (UTC date)")
            sys.exit(2)
        since = args[1]
    folder = os.path.join(log_root({}), ".scratch", "agent-runs")
    best = {}
    without = set()
    for path in glob.glob(os.path.join(folder, "*.jsonl")):
        with open(path, encoding="utf-8") as f:
            for line in f:
                try:
                    r = json.loads(line)
                except Exception:
                    continue
                if not isinstance(r, dict) or str(r.get("time", "")) < since:
                    continue
                key = (r.get("session_id"), r.get("agent_id"))
                if not r.get("calls"):
                    without.add(key)
                    continue
                # The line with the most calls saw the most complete transcript;
                # on a tie, the later line.
                if key not in best or r["calls"] >= best[key]["calls"]:
                    best[key] = r
    without -= set(best)
    groups = {}
    for r in best.values():
        groups.setdefault((r.get("agent_type"), r.get("model")), []).append(r)
    rows = []
    for (agent_type, model), runs in groups.items():
        peaks = [r["peak_context_window_tokens"] for r in runs]
        pcts = [r["peak_context_window_pct"] for r in runs if r.get("peak_context_window_pct") is not None]
        rows.append((
            sum(r.get("est_cost_usd") or 0 for r in runs), agent_type, model, len(runs),
            statistics.median(peaks), statistics.median(pcts) if pcts else None, max(peaks), max(pcts) if pcts else None,
            sum(r.get("unpriced_calls") or 0 for r in runs),
        ))
    rows.sort(key=lambda row: row[0], reverse=True)
    print("agent_type           model              runs  median_peak (%win)   max_peak (%win)       est_cost_usd  unpriced_calls")
    for cost, agent_type, model, n, med, med_pct, top, top_pct, unpriced in rows:
        med_s = "%d (%s)" % (med, "%.1f%%" % med_pct if med_pct is not None else "n/a")
        top_s = "%d (%s)" % (top, "%.1f%%" % top_pct if top_pct is not None else "n/a")
        print("%-20s %-18s %4d  %-20s %-20s %13.2f  %d" % (agent_type, model, n, med_s, top_s, cost, unpriced))
    print("%d agents from %s; %d more without context numbers (see context_status)." % (len(best), folder, len(without)))
    print("List-price estimate at standard speed; not a bill.")


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "report":
        report(sys.argv[2:])
        sys.exit(0)
    try:
        hook()
    except BaseException:
        pass
    sys.exit(0)
