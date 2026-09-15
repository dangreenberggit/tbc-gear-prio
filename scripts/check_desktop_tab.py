#!/usr/bin/env python3
"""Desktop-transport gate for the upgrades tab.

Proves the tab runs on the **packaged desktop binary** over the HTTP
transport, and cannot pass on the WASM fallback. The tab's `simRunner()`
swallows any transport-probe failure and returns the WASM factory runner
(`upgrades_tab.tsx`, the brief's C1), so neither "the tab says HTTP" nor "the
run finished" is proof on its own. This gate rests on four independent signals
the CDP harness (`run-tab-cdp.mjs`) measures and this script judges:

  S1 runner class          data-runner attribute the tab writes (necessary,
                           never over-claims: fallback under-claims WasmSimRunner)
  S2 completed bulk 200s    /bulkSimAsync responses summed over every worker CDP
                           session (independent of anything the tab reports)
  S3 served worker body     sim_worker.js has zero WebAssembly refs (embedded
                           server rewrites it to net_worker.js)
  S4 fallback warnings      "[upgrades] screening fell back" console count

and, when the screen check is on, a paired screened-vs-unscreened comparison on
the **same binary and transport** (T1-T4) that isolates the screening procedure.

**Not in `pnpm verify`** (the brief's C23): this needs go, make and Chrome, and
CI has none. Run it by hand before every fork re-pin
(`docs/agents/upstream-catch-up.md` § 5).

Modes:
  (default)         build (make wowsimtbc) unless --no-build, start the packaged
                    binary on :3333, run the byte check + the harness at
                    --candidates (default 40), assert (a)-(h). --full uncaps.
  --serve-args S    extra flags for the server (e.g. "--usefs=true --wasm=true"
                    for the N1 negative). --force-fallback induces N2.
  --bytes-only      just the Q1 byte comparison of dist/tbc against the origin.
  --compare A B     just T1-T4 on two existing readback JSONs (--cross-transport
                    reports T3 without asserting it).

Exit 0 pass, 1 a failing assertion or finding, 2 could not run.
"""

from __future__ import annotations

import argparse
import json
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
HARNESS = (
    FORK_ROOT
    / "ui/core/components/individual_sim_ui/upgrades/tools/run-tab-cdp.mjs"
)
SCRATCH = ROOT / ".scratch/desktop-gate"

CHECK_NAME = "desktop-gate"
PORT = 3333
ORIGIN = f"http://localhost:{PORT}"

# Pinned eligible-candidate count, measured in step 5 of the
# desktop-transport-gate plan on both the embedded and WASM origins at fork
# 2781486d6 (ret, phase 5). A universe regen that changes the ret P5 eligible
# pool must update this. Bounded above by the committed ret-p5 universe size
# (617 entries, plan C31).
# Measured in step 5 (2026-09-14) on both the embedded (3333) and WASM origins
# at fork 2781486d6, ret phase 5: both reported eligibleCount 617, equal to the
# committed ret-p5 universe size (data/universes/ret-p5.json, plan C31). A
# universe regen that changes the ret P5 eligible pool must update this.
EXPECTED_ELIGIBLE = {"ret": {5: 617}}
UNIVERSE_CAP = {"ret": {5: 617}}

# Measured full-pool row count (plan step 5, D4): C14 was ruled FALSE -- an
# uncapped run lands 601 rows against 617 eligible candidates (16 screened-out
# candidates do not land as rows), on both the 3333 and WASM origins at fork
# 2781486d6. The --full branch of assertion (e) compares rowCount against this,
# NOT against eligibleCount. A universe regen must re-measure it.
FULL_ROWS = {"ret": {5: 601}}

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


def run_harness(out_path: Path, candidates: int, force_fallback: bool) -> dict:
    SCRATCH.mkdir(parents=True, exist_ok=True)
    args = [
        "node",
        str(HARNESS),
        "--origin",
        ORIGIN,
        "--candidates",
        str(candidates),
        "--out",
        str(out_path),
    ]
    if force_fallback:
        args.append("--force-fallback")
    subprocess.run(args, check=False)  # harness measures; we judge the JSON
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
    print(f"  T2 rows 9..N |d|<=%.1f: %s (max=%s over %d rows; d = screened - "
          "loop; rows 1..8 are re-priced identically by replicateTopItems and "
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
    """Assert (a)-(g) against a readback. Returns (all_ok, per-check dict)."""
    checks: dict = {}

    def mark(name: str, ok: bool, line: str) -> None:
        checks[name] = ok
        print(f"  ({name}) {'pass' if ok else 'FAIL'}: {line}")

    sw = rb.get("servedWorker", {})
    mark("a", sw.get("wasmRefs") == 0 and sw.get("readyFalse") == 1,
         f"served worker wasmRefs={sw.get('wasmRefs')} readyFalse="
         f"{sw.get('readyFalse')} (S3)")
    mark("b", rb.get("runner") == "BulkHttpSimRunner",
         f"runner={rb.get('runner')} (S1)")
    bulk = rb.get("requests", {}).get("bulkSimAsync", 0)
    wsa = rb.get("workerSessionsAttached", 0)
    pool = rb.get("poolSize")
    c_ok = bulk >= 1 and wsa > 0
    mark("c", c_ok,
         f"bulkSimAsync 200s={bulk} workerSessionsAttached={wsa} poolSize={pool} "
         "(S2; workerSessionsAttached==0 would be an observer-not-attached "
         "harness fault, not a pass)")
    done = rb.get("done") and not rb.get("runTimedOut")
    mark("d", bool(done),
         f"done={rb.get('done')} runTimedOut={rb.get('runTimedOut')}")

    eligible = rb.get("eligibleCount")
    expected = EXPECTED_ELIGIBLE.get(spec, {}).get(phase)
    cap = UNIVERSE_CAP.get(spec, {}).get(phase, 617)
    full_rows = FULL_ROWS.get(spec, {}).get(phase)
    requested = rb.get("candidatesRequested") or 0
    # C14 is FALSE (D4): an uncapped run lands FULL_ROWS (< eligibleCount), not
    # eligibleCount, because screened-out candidates do not all land as rows. A
    # capped run lands min(cap, eligibleCount).
    if requested > 0:
        expected_rows = min(requested, eligible) if eligible else requested
    else:
        expected_rows = full_rows if full_rows is not None else eligible
    e_ok = (rb.get("rowCount") == expected_rows
            and (expected is None or eligible == expected)
            and (eligible is None or eligible <= cap))
    mark("e", e_ok,
         f"rowCount={rb.get('rowCount')} expected={expected_rows} "
         f"eligibleCount={eligible} EXPECTED_ELIGIBLE={expected} cap={cap} "
         f"(uncapped uses FULL_ROWS={full_rows}, C14 false)")

    mark("f", not rb.get("panicHit"), f"panicHit={rb.get('panicHit')}")

    warns = rb.get("screeningFallbackWarnings", 0)
    if done:
        mark("g", warns == 0,
             f"screeningFallbackWarnings={warns} (S4; meaningful only because "
             "(d) passed)")
    else:
        checks["g"] = None
        print(f"  (g) n/a: screeningFallbackWarnings={warns} -- (d) did not "
              "pass, so on a run that did not complete this count is not "
              "evidence (G4, C30)")
    all_ok = all(v for v in checks.values() if v is not None) and checks.get("d")
    return bool(all_ok), checks


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--build", dest="build", action="store_true", default=True)
    ap.add_argument("--no-build", dest="build", action="store_false")
    ap.add_argument("--full", action="store_true", help="uncapped run")
    ap.add_argument("--candidates", type=int, default=40)
    ap.add_argument("--serve-args", default="")
    ap.add_argument("--force-fallback", action="store_true")
    ap.add_argument("--no-screen-check", dest="screen_check", action="store_false",
                    default=True)
    ap.add_argument("--bytes-only", action="store_true")
    ap.add_argument("--origin", default=ORIGIN)
    ap.add_argument("--compare", nargs=2, metavar=("A", "B"))
    ap.add_argument("--cross-transport", action="store_true")
    ap.add_argument("--spec", default="ret")
    ap.add_argument("--phase", type=int, default=5)
    args = ap.parse_args()

    # --compare: no server, no node -- just T1-T4 on two JSONs.
    if args.compare:
        a = json.loads(Path(args.compare[0]).read_text(encoding="utf-8"))
        b = json.loads(Path(args.compare[1]).read_text(encoding="utf-8"))
        res = compare_readbacks(a, b, cross_transport=args.cross_transport)
        print(f"{CHECK_NAME}: compare {Path(args.compare[0]).name} (screened) "
              f"vs {Path(args.compare[1]).name} (loop):")
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
        print(f"{CHECK_NAME}: running harness (candidates={candidates}, "
              f"force_fallback={args.force_fallback})...")
        rb = run_harness(main_json, candidates, args.force_fallback)
        print(f"{CHECK_NAME}: assertions:")
        gate_ok, checks = assert_gate(rb, candidates, args.spec, args.phase)

        screen_ok = True
        if args.screen_check and gate_ok and not args.force_fallback:
            print(f"{CHECK_NAME}: screen check (h) -- twin unscreened run...")
            twin_json = SCRATCH / "last-run-fallback.json"
            twin = run_harness(twin_json, candidates, force_fallback=True)
            partner_ok = (
                twin.get("runner") == "WasmSimRunner"
                and twin.get("forceFallbackRemaining") == 0
                and twin.get("requests", {}).get("bulkSimAsync", 0) == 0
                and twin.get("requests", {}).get("raidSimAsync", 0) >= 1
            )
            if not partner_ok:
                print(f"  (h) FAIL: partner invalid -- runner="
                      f"{twin.get('runner')} "
                      f"remaining={twin.get('forceFallbackRemaining')} "
                      f"bulk={twin.get('requests', {}).get('bulkSimAsync')} "
                      f"raid={twin.get('requests', {}).get('raidSimAsync')}")
                screen_ok = False
            else:
                res = compare_readbacks(rb, twin, cross_transport=False)
                print_compare(res, cross_transport=False)
                print(f"  (h) twin wall clock: {twin.get('wallClockS')}s")
                screen_ok = _passed(res, cross_transport=False)
                print(f"  (h) {'pass' if screen_ok else 'FAIL'}")
        elif not args.screen_check:
            print(f"{CHECK_NAME}: screen check (h) skipped (--no-screen-check).")
        elif args.force_fallback or not gate_ok:
            print(f"{CHECK_NAME}: screen check (h) skipped -- (a)-(g) did not "
                  "all pass (forced fallback or a failing assertion).")

        overall = gate_ok and screen_ok
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
