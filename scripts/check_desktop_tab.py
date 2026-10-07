#!/usr/bin/env python3
"""Desktop-transport gate for the upgrades tab.

Proves the tab runs on the **packaged desktop binary**, served by the embedded
Go server, and cannot pass on a page served by vite. Since ticket 403 the tab
takes the per-candidate loop on both transports, so the desktop signature is a
native-served page whose sims go out as `raidSimAsync` over HTTP — not a bulk
RPC. This gate rests on three independent signals the CDP harness
(`run-tab-cdp.mjs`) measures and this script judges:

  S1 runner class          data-runner attribute the tab writes; WorkerPoolSimRunner
                           on both transports since 403, so it is necessary and
                           never sufficient -- (a) and (c) carry the transport
  S2 native sim requests    /raidSimAsync responses summed over every worker CDP
                           session, with zero /bulkSimAsync (independent of
                           anything the tab reports)
  S3 served worker body     sim_worker.js has zero WebAssembly refs (embedded
                           server rewrites it to net_worker.js) -- this is what
                           a vite-served page cannot fake

Signal S4 and its check (g) are removed: they counted "[upgrades] screening
fell back" console lines, which nothing prints since the bulk screening pass
was deleted (ticket 567). The other letters keep their meaning.

and a comparison of the run's ranking output against a committed golden readback
(h), which is the only automatic check on DPS values, row order and the
above-cutoff set. See `data/desktop-gate/README.md`.

**Not in `pnpm verify`** (the brief's C23): this needs go, make and Chrome, and
CI has none. Run it by hand before every fork re-pin
(`docs/agents/upstream-catch-up.md` § 5).

Modes:
  (default)         build (make wowsimtbc) unless --no-build, start the packaged
                    binary on :3333, run the byte check + the harness at
                    --candidates (default 40), assert (a)-(f) and (h). --full uncaps and
                    skips (h) (no golden for an uncapped run).
  --serve-args S    extra flags for the server (e.g. "--usefs=true --wasm=true"
                    for the N1 negative).
  --update-golden   after (a)-(f) pass, rewrite the committed golden readback for
                    this spec/phase/cap. A deliberate act -- read
                    data/desktop-gate/README.md first.
  --bytes-only      just the Q1 byte comparison of dist/tbc against the origin.
  --compare A B     just T1-T4 on two existing readback JSONs (--cross-transport
                    reports T3 without asserting it).

Exit 0 pass, 1 a failing assertion or finding, 2 could not run.
"""

from __future__ import annotations

import argparse
import json
import os
import socket
import statistics
import subprocess
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FORK_ROOT = ROOT / "vendor/tbc-new-fork"
DIST = FORK_ROOT / "dist/tbc"
HARNESS = FORK_ROOT / "ui/features/upgrades/tools/run-tab-cdp.mjs"
SCRATCH = ROOT / ".scratch/desktop-gate"
GOLDEN_DIR = ROOT / "data/desktop-gate"

# The three readback fields (h) compares. A whitelist, not a blocklist: every
# other key a readback carries -- wall clock, request counts, provenance -- is
# ignored by construction. Comparing a field that varies run to run would make
# the gate flap red, which trains reflexive regeneration and destroys the
# coverage this check exists to provide.
GOLDEN_FIELDS = ("rows", "aboveCutoffItems", "baselineDps")

GOLDEN_NOTE = (
    "Golden readback for scripts/check_desktop_tab.py check (h): rows, "
    "aboveCutoffItems and baselineDps of a known-good ret phase-4 cap-40 run "
    "from the P3 gear preset on the desktop (HTTP) transport. The gate fails when a run differs from these "
    "three fields; every other field here is provenance. Regenerate ONLY when a "
    "change is meant to alter the tab's output (fork re-pin, universe regen, "
    "intended ranking change) and after the printed diff is explained: pnpm "
    "desktop-gate:check --update-golden, then commit with the reason in the "
    "body. A red gate is a finding, not a prompt to regenerate. See README.md "
    "beside this file."
)


def golden_path(spec: str, phase: int, candidates: int) -> Path:
    return GOLDEN_DIR / f"golden-{spec}-p{phase}-cap{candidates}.json"

CHECK_NAME = "desktop-gate"
PORT = 3333
ORIGIN = f"http://localhost:{PORT}"

# The phase the gate ranks, and the gear it starts from. Owner rule (ticket
# 560 brief): a live run starts from the preset of the phase BEFORE the phase
# it ranks. Retribution's gear presets are P1, P2, P3, Bulwark (phase 3) and
# Pre-raid -- there is no phase-4 preset (vendor/tbc-new-fork/ui/specs/paladin/
# retribution/presets.ts) -- so phase 5 has no previous-phase start gear and
# the gate ranks phase 4 from the P3 preset (session ruling Q-560-desktop-phase).
# The pair is (preset phase tab, preset name), as run-tab-cdp.mjs takes them.
DESKTOP_PHASE = 4
START_PRESET = {"ret": {4: ("Phase 3", "P3")}}

# Pinned eligible-candidate count and its upper bound, from the committed
# universe, before any run (ticket 560 amendment A-F31):
#   node -e "console.log(require('<fork>/ui/features/upgrades/model/data/ret-p4.universe.json').entries.length)"
# prints 523 (2026-10-07, fork feat/upgrades-tab-react). Every ret-p4 entry is
# phase <= 4 and none is a Kael temporary legendary, so neither the phase filter
# (model/engine/pool.ts filterPoolByPhase) nor the Kael exclusion removes one,
# and the tab's default settings (no source excluded, prune off) do not filter:
# the gate's eligibleCount should be 523. If a run reads another number, explain
# the filter responsible in the stage's desktop-gate.md before changing this.
# A universe regen that changes the ret-p4 pool must re-measure both.
EXPECTED_ELIGIBLE = {"ret": {4: 523}}
UNIVERSE_CAP = {"ret": {4: 523}}

# Measured full-pool row count for the --full branch of assertion (e): an
# uncapped run lands fewer rows than eligible candidates, because screened-out
# candidates do not all land as rows (C14 false). Not measured for ret phase 4:
# the gate runs capped at 40 < eligible, and a capped run never reads it, so
# the key is left out (amendment A-F31a); a --full run falls back to the
# eligible count and must measure and pin the value here first.
FULL_ROWS: dict[str, dict[int, int]] = {}

# Measured row count of a capped run, per (spec, phase, cap): the rows the
# Upgrades list pane shows. The cap sims the first N candidates in EP order
# plus every worn item (model/engine/rank.ts, "the cap keeps the first N of
# the EP order plus every owned row"), and owned rows stay out of the list
# pane (model/results_view.ts paneRows), so a capped run shows N minus the
# worn items inside the first N. ret phase 4 from the P3 preset, cap 40:
# the ranking holds 55 rows, 16 of them owned (the 16 worn items), so
# 55 = 40 + 15 owned rows outside the first 40, one worn item sits inside
# it, and the pane shows 39. Measured 2026-10-07 on the desktop binary and,
# with the same 39 rows, on the WASM dev server (window.__upgradesRanking;
# ticket 560 stage desktop-gate.md). A change to the pool, the EP order or
# the preset gear can move it; re-measure and explain before changing it.
CAPPED_ROWS = {"ret": {4: {40: 39}}}

# Tolerances (plan §Approach; out of scope to edit these in response to a
# failure -- a failure is a finding and a ticket).
K_DPS = 12.0  # T2: per-row |d_screened - d_loop| bound for rows 9..N
T3_DPS = 0.3  # T3: shared-route (top-8) agreement, server determinism
T4_MEDIAN_DPS = 3.4  # T4: |median(d_screened - d_loop)| (committed cutoff bar)

# binary_dist strip list (plan C4): these dist files are NOT served by the
# embedded binary, so the byte check skips them.
BYTES_SKIP = {
    "lib.wasm",
    "lib.wasm.gz",
    "assets/database/db.bin",
    "assets/database/leftover_db.bin",
}
BYTES_SKIP_PREFIX = ("assets/db_inputs/",)
# `.dirstamp` files are make's own directory-freshness markers (step 6, D5),
# not web assets; the embedded server 404s them by design, like the strip list.
BYTES_SKIP_SUFFIX = (".dirstamp",)


def eprint(*a: object) -> None:
    print(*a, file=sys.stderr)


def refuse_old_node() -> None:
    """The harness uses Node 22's global WebSocket/fetch (plan C24)."""
    try:
        out = subprocess.run(
            ["node", "--version"], capture_output=True, text=True, check=False
        ).stdout.strip()
    except OSError as exc:
        eprint(f"{CHECK_NAME}: node not found: {exc}")
        raise SystemExit(2)
    major = 0
    if out.startswith("v"):
        try:
            major = int(out[1:].split(".")[0])
        except ValueError:
            major = 0
    if major < 22:
        eprint(f"{CHECK_NAME}: needs Node >= 22 (found {out or 'unknown'}).")
        raise SystemExit(2)


def http_get(url: str, binary: bool = False):
    req = urllib.request.Request(url)
    with urllib.request.urlopen(req, timeout=30) as resp:  # noqa: S310
        data = resp.read()
        return (resp.status, data if binary else data.decode("utf-8", "replace"))


def port_held(port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(0.5)
        return s.connect_ex(("127.0.0.1", port)) == 0


def build() -> None:
    eprint(f"{CHECK_NAME}: building (make wowsimtbc)...")
    rc = subprocess.run(
        ["make", "-C", str(FORK_ROOT), "wowsimtbc"], check=False
    ).returncode
    if rc != 0:
        eprint(f"{CHECK_NAME}: make wowsimtbc failed (rc {rc}).")
        raise SystemExit(2)


def server_exe() -> Path:
    exe = FORK_ROOT / ("wowsimtbc.exe" if sys.platform == "win32" else "wowsimtbc")
    if not exe.is_file():
        eprint(f"{CHECK_NAME}: {exe} is absent -- build first (drop --no-build).")
        raise SystemExit(2)
    return exe


def start_server(serve_args: list[str]) -> subprocess.Popen:
    if port_held(PORT):
        eprint(
            f"{CHECK_NAME}: port {PORT} is already held. Stop the stray "
            "wowsimtbc.exe first (the embedded server must own 3333)."
        )
        raise SystemExit(2)
    exe = server_exe()
    args = [str(exe), "--launch=false", f"--host=:{PORT}", *serve_args]
    proc = subprocess.Popen(  # noqa: S603
        args,
        cwd=str(FORK_ROOT),
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    deadline = time.time() + 30
    while time.time() < deadline:
        if proc.poll() is not None:
            eprint(f"{CHECK_NAME}: server exited early (rc {proc.returncode}).")
            raise SystemExit(2)
        try:
            status, _ = http_get(f"{ORIGIN}/tbc/paladin/retribution/")
            if status == 200:
                return proc
        except (urllib.error.URLError, OSError):
            pass
        time.sleep(0.3)
    proc.kill()
    eprint(f"{CHECK_NAME}: server did not answer on {PORT} within 30s.")
    raise SystemExit(2)


def run_harness(out_path: Path, candidates: int, spec: str, phase: int) -> dict:
    SCRATCH.mkdir(parents=True, exist_ok=True)
    start = START_PRESET.get(spec, {}).get(phase)
    if start is None:
        eprint(f"{CHECK_NAME}: no start preset pinned for {spec} phase {phase} "
               "(START_PRESET) -- the gate runs only where one is.")
        raise SystemExit(2)
    preset_tab, preset = start
    args = [
        "node",
        str(HARNESS),
        "--origin",
        ORIGIN,
        "--phase",
        str(phase),
        "--preset-tab",
        preset_tab,
        "--preset",
        preset,
        "--candidates",
        str(candidates),
        "--out",
        str(out_path),
    ]
    # Delete any prior readback first: the harness writes --out only on a clean
    # finish, so a crash before that write would otherwise leave a stale passing
    # JSON on these two fixed gitignored paths and we would judge the old run.
    out_path.unlink(missing_ok=True)
    proc = subprocess.run(args, check=False)  # harness measures; we judge the JSON
    if proc.returncode != 0:
        eprint(f"{CHECK_NAME}: harness exited {proc.returncode} (no clean run to judge).")
        raise SystemExit(2)
    if not out_path.is_file():
        eprint(f"{CHECK_NAME}: harness wrote no JSON at {out_path}.")
        raise SystemExit(2)
    return json.loads(out_path.read_text(encoding="utf-8"))


# --- T1-T4 comparison -------------------------------------------------------

def _row_key(row: dict) -> tuple:
    return (row.get("item"), row.get("slot"))


def _keyed(readback: dict) -> tuple[dict, bool]:
    """Map (item, slot) -> row. Returns (map, had_duplicates); on a duplicate
    key the map keys on (item, slot, source) instead (plan step 5 T1 note)."""
    rows = readback.get("rows", [])
    seen: dict = {}
    dup = False
    for r in rows:
        k = _row_key(r)
        if k in seen:
            dup = True
            break
        seen[k] = r
    if not dup:
        return seen, False
    keyed = {}
    for r in rows:
        keyed[(r.get("item"), r.get("slot"), r.get("source"))] = r
    return keyed, True


def _top8_above_keys(readback: dict) -> set:
    """The (item, slot) of rows above the cutoff, top 8 by |dps| descending --
    the rows replicateTopItems re-prices identically in both runs (plan C29)."""
    above = [r for r in readback.get("rows", []) if not r.get("belowCutoff")]
    above.sort(key=lambda r: abs(r.get("dps") or 0.0), reverse=True)
    return {_row_key(r) for r in above[:8]}


def compare_readbacks(a: dict, b: dict, cross_transport: bool = False) -> dict:
    """T1-T4 between a screened run `a` and an unscreened/loop run `b` on the
    same binary and transport (plan §Approach). Returns a result dict with per-
    check pass/fail and the recorded extras. When cross_transport is set (the
    two runs are on different compilations, e.g. embedded vs WASM), T3 is
    reported but not asserted."""
    ka, dup_a = _keyed(a)
    kb, dup_b = _keyed(b)
    result: dict = {"dupKeys": bool(dup_a or dup_b)}

    # T1: identical key sets.
    result["T1"] = set(ka.keys()) == set(kb.keys())
    result["T1_onlyA"] = sorted(str(k) for k in (set(ka) - set(kb)))[:20]
    result["T1_onlyB"] = sorted(str(k) for k in (set(kb) - set(ka)))[:20]

    top8a = _top8_above_keys(a)
    top8b = _top8_above_keys(b)
    both_top8 = top8a & top8b
    common = set(ka) & set(kb)

    diffs = []  # all rows in both
    diffs_9n = []  # rows outside top-8 of both (rows 9..N) -- T2
    diffs_top8 = []  # rows top-8-above in both -- T3
    for k in common:
        da = ka[k].get("dps")
        db = kb[k].get("dps")
        if da is None or db is None:
            continue
        d = da - db
        diffs.append(d)
        if k in both_top8:
            diffs_top8.append(d)
        else:
            diffs_9n.append(d)

    # T2: rows 9..N within K.
    t2_max = max((abs(d) for d in diffs_9n), default=0.0)
    result["T2"] = t2_max <= K_DPS
    result["T2_max"] = round(t2_max, 4)
    result["T2_rowsCompared"] = len(diffs_9n)

    # T3: top-8-above rows within 0.3 (server determinism). Not asserted cross-
    # transport (different compilations).
    t3_max = max((abs(d) for d in diffs_top8), default=0.0)
    result["T3_max"] = round(t3_max, 4)
    result["T3_rowsCompared"] = len(diffs_top8)
    result["T3"] = (t3_max <= T3_DPS)
    result["T3_asserted"] = not cross_transport

    # T4: |median| over all rows within the cutoff bar.
    t4_median = statistics.median(diffs) if diffs else 0.0
    result["T4"] = abs(t4_median) <= T4_MEDIAN_DPS
    result["T4_median"] = round(t4_median, 4)

    # Recorded, not asserted.
    result["maxPerRowDiff"] = round(max((abs(d) for d in diffs), default=0.0), 4)
    above_a = {_row_key(r) for r in a.get("rows", []) if not r.get("belowCutoff")}
    above_b = {_row_key(r) for r in b.get("rows", []) if not r.get("belowCutoff")}
    result["aboveCutoffSymDiff"] = len(above_a ^ above_b)
    result["baselineDpsDiff"] = round(
        abs((a.get("baselineDps") or 0.0) - (b.get("baselineDps") or 0.0)), 4
    )
    return result


def _passed(res: dict, cross_transport: bool) -> bool:
    ok = res["T1"] and res["T2"] and res["T4"]
    if res["T3_asserted"] and not cross_transport:
        ok = ok and res["T3"]
    return ok


def print_compare(res: dict, cross_transport: bool) -> None:
    print(f"  T1 key sets identical: {'pass' if res['T1'] else 'FAIL'} "
          f"(limit: a top-8 membership shift leaves the key set intact, C29)")
    if not res["T1"]:
        print(f"     onlyA={res['T1_onlyA']}")
        print(f"     onlyB={res['T1_onlyB']}")
    print(f"  T2 rows 9..N |d|<=%.1f: %s (max=%s over %d rows; d = a - b; "
          "rows 1..8 are re-priced identically by replicateTopItems and "
          "are covered by T3 only)" % (K_DPS, "pass" if res["T2"] else "FAIL",
                                       res["T2_max"], res["T2_rowsCompared"]))
    t3state = "pass" if res["T3"] else "FAIL"
    if cross_transport or not res["T3_asserted"]:
        t3state = f"reported ({t3state}, not asserted cross-transport)"
    print(f"  T3 top-8 |d|<=%.1f: %s (max=%s over %d rows; server determinism, "
          "the only check on rows 1..8)" % (T3_DPS, t3state, res["T3_max"],
                                            res["T3_rowsCompared"]))
    print(f"  T4 |median|<=%.1f: %s (median=%s over all rows; the uniform-offset "
          "bug class, C33)" % (T4_MEDIAN_DPS, "pass" if res["T4"] else "FAIL",
                               res["T4_median"]))
    print(f"  recorded: maxPerRowDiff={res['maxPerRowDiff']} "
          f"aboveCutoffSymDiff={res['aboveCutoffSymDiff']} "
          f"baselineDpsDiff={res['baselineDpsDiff']}")


# --- golden readback (h) ----------------------------------------------------

def fork_head() -> str:
    """The fork clone's HEAD, or "unknown" -- provenance, never an assertion."""
    try:
        out = subprocess.run(
            ["git", "-C", str(FORK_ROOT), "rev-parse", "HEAD"],
            check=False, capture_output=True, text=True, timeout=30,
        )
        return out.stdout.strip() or "unknown"
    except (OSError, subprocess.SubprocessError):
        return "unknown"


def print_golden_diff(rb: dict, golden: dict) -> None:
    """Diagnostic for a golden mismatch. Reuses compare_readbacks (T1-T4) rather
    than writing a second comparator, then names the differing rows."""
    print_compare(compare_readbacks(rb, golden, cross_transport=False),
                  cross_transport=False)

    def key(row: dict) -> tuple:
        return (row.get("item"), row.get("slot"))

    g_by_key = {key(r): r for r in golden.get("rows", [])}
    shown = 0
    for row in rb.get("rows", []):
        g = g_by_key.get(key(row))
        if g is not None and g == row:
            continue
        if shown >= 20:
            print("     ... (further differing rows not shown)")
            break
        gd = g.get("dps") if g else "(absent from golden)"
        print(f"     rank {row.get('rank')} {row.get('item')} "
              f"[{row.get('slot')}] golden {gd} -> run {row.get('dps')} "
              f"belowCutoff={row.get('belowCutoff')}")
        shown += 1

    print(f"     golden forkCommit={golden.get('forkCommit')} "
          f"cpuCount={golden.get('cpuCount')} vs current "
          f"forkCommit={fork_head()} cpuCount={os.cpu_count()}")


def check_golden(rb: dict, spec: str, phase: int, candidates: int) -> int:
    """Check (h). Returns 0 pass, 1 mismatch, 2 no golden to compare against."""
    path = golden_path(spec, phase, candidates)
    if not path.is_file():
        rel = path.relative_to(ROOT).as_posix()
        print(f"  (h) FAIL: no golden at {rel}. Run \"pnpm desktop-gate:check "
              "--update-golden\" once, read data/desktop-gate/README.md, and "
              "commit the file.")
        return 2
    golden = json.loads(path.read_text(encoding="utf-8"))
    if all(rb.get(f) == golden.get(f) for f in GOLDEN_FIELDS):
        print(f"  (h) pass: rows, aboveCutoffItems and baselineDps match "
              f"{path.relative_to(ROOT).as_posix()}")
        return 0
    differing = [f for f in GOLDEN_FIELDS if rb.get(f) != golden.get(f)]
    print(f"  (h) FAIL: run differs from "
          f"{path.relative_to(ROOT).as_posix()} on {', '.join(differing)}.")
    print_golden_diff(rb, golden)
    return 1


def write_golden(rb: dict, spec: str, phase: int, candidates: int) -> None:
    path = golden_path(spec, phase, candidates)
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.is_file():
        existing = json.loads(path.read_text(encoding="utf-8"))
        if all(rb.get(f) == existing.get(f) for f in GOLDEN_FIELDS):
            print(f"{CHECK_NAME}: golden unchanged on the three compared "
                  "fields; rewriting provenance only.")
        else:
            print(f"{CHECK_NAME}: the golden is about to CHANGE. The diff:")
            print_golden_diff(rb, existing)
    doc = {
        "_note": GOLDEN_NOTE,
        "recordedAt": rb.get("recordedAt"),
        "forkCommit": fork_head(),
        "cpuCount": os.cpu_count(),
        "candidatesRequested": rb.get("candidatesRequested"),
        "spec": spec,
        "phase": phase,
        "elapsedS": rb.get("elapsedS"),
        "rows": rb.get("rows"),
        "aboveCutoffItems": rb.get("aboveCutoffItems"),
        "baselineDps": rb.get("baselineDps"),
        "rowCount": rb.get("rowCount"),
        "aboveCutoff": rb.get("aboveCutoff"),
    }
    path.write_text(
        json.dumps(doc, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8", newline="\n",
    )
    rel = path.relative_to(ROOT).as_posix()
    print(f"{CHECK_NAME}: golden written to {rel} — commit it with the reason "
          "the output changed in the commit body. A red gate is a finding, not "
          "a prompt to regenerate.")


# --- Q1 byte comparison -----------------------------------------------------

def bytes_check(origin: str) -> int:
    if not DIST.is_dir():
        eprint(f"{CHECK_NAME}: {DIST} absent -- build first.")
        return 2
    compared = 0
    mismatches: list[str] = []
    net_worker = DIST / "net_worker.js"
    net_worker_bytes = net_worker.read_bytes() if net_worker.is_file() else None
    for path in sorted(DIST.rglob("*")):
        if not path.is_file():
            continue
        rel = path.relative_to(DIST).as_posix()
        if (
            rel in BYTES_SKIP
            or rel.startswith(BYTES_SKIP_PREFIX)
            or rel.endswith(BYTES_SKIP_SUFFIX)
        ):
            continue
        try:
            _, served = http_get(f"{origin}/tbc/{rel}", binary=True)
        except (urllib.error.URLError, OSError) as exc:
            mismatches.append(f"{rel}: not served ({exc})")
            continue
        if rel == "sim_worker.js":
            # The embedded server rewrites sim_worker.js to net_worker.js: it
            # must DIFFER from dist and EQUAL net_worker.js (plan C2, step 6).
            if served == path.read_bytes():
                mismatches.append("sim_worker.js: served body equals dist "
                                  "(rewrite to net_worker.js did not happen)")
            elif net_worker_bytes is not None and served != net_worker_bytes:
                mismatches.append("sim_worker.js: served body != net_worker.js")
            compared += 1
            continue
        if served != path.read_bytes():
            mismatches.append(rel)
        compared += 1
    if mismatches:
        eprint(f"{CHECK_NAME}: {compared} files compared, "
               f"{len(mismatches)} mismatches:")
        for m in mismatches[:50]:
            eprint(f"  {m}")
        return 1
    print(f"{CHECK_NAME}: {compared} files compared, 0 mismatches (Q1 bundle "
          "intact; sim_worker.js rewritten to net_worker.js).")
    return 0


# --- assertions -------------------------------------------------------------

def assert_gate(rb: dict, candidates: int, spec: str, phase: int) -> tuple[bool, dict]:
    """Assert (a)-(f) against a readback. Returns (all_ok, per-check dict)."""
    checks: dict = {}

    def mark(name: str, ok: bool, line: str) -> None:
        checks[name] = ok
        print(f"  ({name}) {'pass' if ok else 'FAIL'}: {line}")

    sw = rb.get("servedWorker", {})
    mark("a", sw.get("wasmRefs") == 0 and sw.get("readyFalse") == 1,
         f"served worker wasmRefs={sw.get('wasmRefs')} readyFalse="
         f"{sw.get('readyFalse')} (S3)")
    mark("b", rb.get("runner") == "WorkerPoolSimRunner",
         f"runner={rb.get('runner')} (S1)")
    bulk = rb.get("requests", {}).get("bulkSimAsync", 0)
    raid = rb.get("requests", {}).get("raidSimAsync", 0)
    wsa = rb.get("workerSessionsAttached", 0)
    pool = rb.get("poolSize")
    c_ok = bulk == 0 and raid >= 1 and wsa > 0
    mark("c", c_ok,
         f"bulkSimAsync 200s={bulk} raidSimAsync 200s={raid} "
         f"workerSessionsAttached={wsa} poolSize={pool} "
         "(S2: the desktop binary must send no bulk request and at least one "
         "native raid sim over the worker sessions; workerSessionsAttached==0 "
         "would be an observer-not-attached harness fault, not a pass)")
    done = rb.get("done") and not rb.get("runTimedOut")
    mark("d", bool(done),
         f"done={rb.get('done')} runTimedOut={rb.get('runTimedOut')}")

    eligible = rb.get("eligibleCount")
    expected = EXPECTED_ELIGIBLE.get(spec, {}).get(phase)
    cap = UNIVERSE_CAP.get(spec, {}).get(phase)
    full_rows = FULL_ROWS.get(spec, {}).get(phase)
    requested = rb.get("candidatesRequested") or 0
    # C14 is FALSE (D4): an uncapped run lands FULL_ROWS (< eligibleCount), not
    # eligibleCount, because screened-out candidates do not all land as rows. A
    # capped run lands its pinned CAPPED_ROWS (worn items inside the cap are
    # simmed but not listed).
    if requested > 0:
        expected_rows = CAPPED_ROWS.get(spec, {}).get(phase, {}).get(requested)
    else:
        expected_rows = full_rows if full_rows is not None else eligible
    # An unpinned spec/phase fails (e): a gate that passed on numbers nobody
    # measured would hide a pool change.
    e_ok = (expected_rows is not None and rb.get("rowCount") == expected_rows
            and expected is not None and cap is not None
            and eligible == expected and eligible <= cap)
    mark("e", e_ok,
         f"rowCount={rb.get('rowCount')} expected={expected_rows or 'unpinned'} "
         f"eligibleCount={eligible} EXPECTED_ELIGIBLE={expected or 'unpinned'} "
         f"cap={cap or 'unpinned'} "
         f"(uncapped uses FULL_ROWS={full_rows}, C14 false)")

    mark("f", not rb.get("panicHit"), f"panicHit={rb.get('panicHit')}")

    return all(checks.values()), checks


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--build", dest="build", action="store_true", default=True)
    ap.add_argument("--no-build", dest="build", action="store_false")
    ap.add_argument("--full", action="store_true", help="uncapped run")
    ap.add_argument("--candidates", type=int, default=40)
    ap.add_argument("--serve-args", default="")
    ap.add_argument("--update-golden", action="store_true",
                    help="rewrite the committed golden readback (deliberate act "
                         "-- see data/desktop-gate/README.md)")
    ap.add_argument("--bytes-only", action="store_true")
    ap.add_argument("--origin", default=ORIGIN)
    ap.add_argument("--compare", nargs=2, metavar=("A", "B"))
    ap.add_argument("--cross-transport", action="store_true")
    ap.add_argument("--spec", default="ret")
    ap.add_argument("--phase", type=int, default=DESKTOP_PHASE)
    args = ap.parse_args()

    # --compare: no server, no node -- just T1-T4 on two JSONs.
    if args.compare:
        a = json.loads(Path(args.compare[0]).read_text(encoding="utf-8"))
        b = json.loads(Path(args.compare[1]).read_text(encoding="utf-8"))
        res = compare_readbacks(a, b, cross_transport=args.cross_transport)
        print(f"{CHECK_NAME}: compare {Path(args.compare[0]).name} (a) "
              f"vs {Path(args.compare[1]).name} (b):")
        print_compare(res, args.cross_transport)
        ok = _passed(res, args.cross_transport)
        return 0 if ok else 1

    refuse_old_node()

    # --bytes-only: byte check against a running origin (no build, no run).
    if args.bytes_only:
        return bytes_check(args.origin)

    serve_args = args.serve_args.split() if args.serve_args else []
    if args.build:
        build()
    server = start_server(serve_args)
    try:
        # Byte check (Q1) first -- cheap and independent.
        brc = bytes_check(ORIGIN)
        if brc == 2:
            return 2
        candidates = 0 if args.full else args.candidates
        main_json = SCRATCH / "last-run.json"
        print(f"{CHECK_NAME}: running harness (candidates={candidates})...")
        rb = run_harness(main_json, candidates, args.spec, args.phase)
        print(f"{CHECK_NAME}: assertions:")
        gate_ok, checks = assert_gate(rb, candidates, args.spec, args.phase)

        # --update-golden: (a)-(f) gate the write, which stops a *broken* run
        # (timeout, panic, wrong worker, wrong row count) from becoming a
        # golden. It does NOT stop a ranking regression -- that preserves shape
        # and passes (a)-(f). Value-level correctness rests on the developer
        # reading the diff printed above.
        if args.update_golden:
            if not gate_ok:
                print(f"{CHECK_NAME}: refusing to write a golden -- (a)-(f) did "
                      "not all pass.")
                return 1
            write_golden(rb, args.spec, args.phase, candidates)
            return 0

        if args.full:
            print("  (h) skipped: no golden for an uncapped run")
            golden_rc = 0
        elif not gate_ok:
            print("  (h) skipped -- (a)-(f) did not all pass.")
            golden_rc = 0
        else:
            golden_rc = check_golden(rb, args.spec, args.phase, candidates)

        if golden_rc == 2:
            print(f"{CHECK_NAME}: could not run (h).")
            return 2
        overall = gate_ok and golden_rc == 0
        print(f"{CHECK_NAME}: {'PASS' if overall else 'FAIL'}.")
        return 0 if overall else 1
    finally:
        server.terminate()
        try:
            server.wait(timeout=10)
        except subprocess.TimeoutExpired:
            server.kill()


if __name__ == "__main__":
    raise SystemExit(main())
