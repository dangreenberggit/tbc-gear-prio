"""Parse per-stage bulk-sim timings out of a wowsimtbc server stderr log.

Ticket 397. The Go bulk path logs every stage start/finish with a timestamp,
candidate count, iteration count and duration; that is the only per-stage cost
attribution available, because the tab readbacks capture no StageMetrics or
Timings fields at all.

Usage:
    python parse_bulk_stage_timings.py <server log> --start HH:MM:SS --end HH:MM:SS

Bound the window by clock time, not line number. A single log holds several runs
back to back, and line-number bounds silently merge two of them -- the tell is a
stage-wall total larger than the run's own elapsed time, which is how the first
pass of this analysis caught its own error.

Emits the per-chunk table committed as finalist-stage-per-chunk.csv.
"""

import argparse
import csv
import datetime
import re
import sys
from collections import defaultdict

TS = re.compile(r"^(\d{4}/\d{2}/\d{2} \d{2}:\d{2}:\d{2}) (.*)$")
STAGE = re.compile(r"\[Bulk Sim\] - Stage: (\w+) - (Starting|Started|Finished)")
ITERS = re.compile(r"Running (\d+) iterations on (\d+) concurrent sims")
FINALIST_START = re.compile(
    r"Stage: finalist - Started\n  Finalists: (\d+)\n  Iterations so far: (\d+)"
)
FINALIST_END = re.compile(
    r"Stage: finalist - Finished\nSims:\n"
    r"  Input gear sets: (\d+)\n  Completed candidates: (\d+)\n  Survivors: (\d+)\n"
    r"Results:\n  Iterations: (\d+)\n  Target error: ([\d.]+)%\n  Observed error: ([\d.]+)%"
    r".*?\n  Duration: ([\d.]+)s",
    re.S,
)


def parse_events(path):
    raw = open(path, encoding="utf-8", errors="replace").read().split("\n")
    events = []
    for line in raw:
        m = TS.match(line)
        if m:
            ts = datetime.datetime.strptime(m.group(1), "%Y/%m/%d %H:%M:%S")
            events.append((ts, m.group(2)))
    return raw, events


def in_window(ts, start, end):
    return (start is None or ts.time() >= start) and (end is None or ts.time() <= end)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("log")
    ap.add_argument("--start", help="window start HH:MM:SS (local, as logged)")
    ap.add_argument("--end", help="window end HH:MM:SS")
    ap.add_argument("--csv", help="write the per-chunk table here")
    args = ap.parse_args()

    def clock(v):
        return datetime.datetime.strptime(v, "%H:%M:%S").time() if v else None

    start, end = clock(args.start), clock(args.end)
    raw, events = parse_events(args.log)
    window = [(ts, msg) for ts, msg in events if in_window(ts, start, end)]
    if not window:
        sys.exit("no events in window")

    span = (window[-1][0] - window[0][0]).total_seconds()

    # Pair stage Started/Finished markers. Concurrency is asserted, not assumed:
    # if stages ever overlap the wall sums below stop being meaningful.
    stages, open_stages, depth, max_depth = [], defaultdict(list), 0, 0
    for ts, msg in window:
        m = STAGE.search(msg)
        if not m:
            continue
        name, action = m.group(1), m.group(2)
        if action != "Finished":
            open_stages[name].append(ts)
            depth += 1
            max_depth = max(max_depth, depth)
        elif open_stages[name]:
            stages.append((name, open_stages[name].pop(0), ts))
            depth -= 1

    walls, counts, iters = defaultdict(float), defaultdict(int), defaultdict(int)
    for name, a, b in stages:
        walls[name] += (b - a).total_seconds()
        counts[name] += 1

    total_iters = 0
    for ts, msg in window:
        m = ITERS.match(msg)
        if not m:
            continue
        n = int(m.group(1))
        total_iters += n
        hit = next((s for s, a, b in stages if a <= ts <= b), "outside")
        iters[hit] += n

    print(f"window span {span:.0f}s   max concurrent stages {max_depth}")
    for name in sorted(walls):
        pct = 100 * walls[name] / span if span else 0
        print(
            f"  {name:9s} n={counts[name]:3d} wall={walls[name]:7.0f}s "
            f"{pct:5.1f}%  iters={iters[name]:>12,}"
        )
    print(f"  {'outside':9s} {'':7s} iters={iters['outside']:>12,}")
    print(f"  total iterations {total_iters:,}")

    # Re-slice the raw text to the same window. Scanning the whole file here
    # would silently count every run in the log, not the one just measured.
    first, last = None, None
    for idx, line in enumerate(raw):
        m = TS.match(line)
        if not m:
            continue
        ts = datetime.datetime.strptime(m.group(1), "%Y/%m/%d %H:%M:%S")
        if in_window(ts, start, end):
            first = idx if first is None else first
            last = idx
    text = "\n".join(raw[first : last + 1]) if first is not None else ""
    starts = FINALIST_START.findall(text)
    ends = FINALIST_END.findall(text)
    rows = []
    for i, ((n_fin, entry), end_row) in enumerate(zip(starts, ends), 1):
        gear, done, surv, exit_it, target, observed, dur = end_row
        rows.append(
            {
                "chunk": i,
                "finalists": int(n_fin),
                "entry_iterations": int(entry),
                "exit_iterations": int(exit_it),
                "ratio": round(int(exit_it) / int(entry), 3),
                "input_gear_sets": int(gear),
                "survivors": int(surv),
                "target_error_pct": float(target),
                "observed_error_pct": float(observed),
                "duration_s": float(dur),
            }
        )
    if rows:
        ratios = [r["ratio"] for r in rows]
        capped = sum(1 for r in ratios if r >= 3.99)
        print(
            f"\nfinalist chunks {len(rows)}: ratio min {min(ratios)} max {max(ratios)}; "
            f"{capped}/{len(rows)} at the 4x budget ceiling"
        )
    if args.csv and rows:
        with open(args.csv, "w", newline="", encoding="utf-8") as fh:
            w = csv.DictWriter(fh, fieldnames=list(rows[0]))
            w.writeheader()
            w.writerows(rows)
        print(f"wrote {args.csv}")


if __name__ == "__main__":
    main()
