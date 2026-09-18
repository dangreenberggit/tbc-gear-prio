#!/usr/bin/env python3
"""Run one desktop upgrades-tab arm for ticket 411.

Starts the packaged wowsimtbc.exe on :3333 with stderr redirected to an evidence
log, waits for the ret page to answer 200, runs run-tab-cdp.mjs with the arm's
flags, terminates the server, and prints the readback fields that matter.

The caller owns the arm identity (P, S1..S3, B1..B3, L1..L3) and the flags.
stdlib only. Windows-native paths (C:/...), Node 22 harness.

Usage:
  python run_411_arms.py --arm P1 [--bulk-http] [--iterations N] [--candidates 40]
"""

import argparse
import json
import os
import socket
import subprocess
import sys
import time
import urllib.request

FORK = r"C:/Users/dgree/Code/lulz/tbc-gear-prio/vendor/tbc-new-fork"
BIN = FORK + "/wowsimtbc.exe"
HARNESS = FORK + "/ui/core/components/individual_sim_ui/upgrades/tools/run-tab-cdp.mjs"
STAGE = r"C:/Users/dgree/Code/lulz/tbc-gear-prio/.scratch/stage-gate/411-desktop-bulk-wallclock"
EVID = STAGE + "/evidence"
PORT = 3333
ORIGIN = "http://localhost:%d" % PORT
READY_PATH = "/tbc/paladin/retribution/"


def port_held():
    s = socket.socket()
    s.settimeout(1)
    rc = s.connect_ex(("127.0.0.1", PORT))
    s.close()
    return rc == 0


def wait_ready(deadline):
    while time.time() < deadline:
        try:
            with urllib.request.urlopen(ORIGIN + READY_PATH, timeout=2) as r:
                if r.status == 200:
                    return True
        except Exception:
            pass
        time.sleep(0.5)
    return False


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--arm", required=True)
    ap.add_argument("--bulk-http", action="store_true")
    ap.add_argument("--iterations", type=int, default=0)
    ap.add_argument("--candidates", type=int, default=40)
    ap.add_argument("--timeout-ms", type=int, default=2700000)
    args = ap.parse_args()

    if port_held():
        print("REFUSE: port %d already held" % PORT, file=sys.stderr)
        sys.exit(2)

    out_json = EVID + "/%s.json" % args.arm
    err_log = EVID + "/server-%s.log.err" % args.arm

    print("[%s] cpu_count=%d starting server" % (args.arm, os.cpu_count()))
    errf = open(err_log, "wb")
    server = subprocess.Popen(
        [BIN, "--launch=false", "--host=:%d" % PORT],
        cwd=FORK,
        stdout=subprocess.DEVNULL,
        stderr=errf,
    )
    try:
        if not wait_ready(time.time() + 60):
            print("FAIL: server did not answer 200 within 60s", file=sys.stderr)
            sys.exit(3)

        cmd = ["node", HARNESS, "--origin", ORIGIN, "--candidates", str(args.candidates),
               "--timeout-ms", str(args.timeout_ms), "--out", out_json]
        if args.bulk_http:
            cmd.append("--bulk-http")
        if args.iterations > 0:
            cmd += ["--iterations", str(args.iterations)]
        print("[%s] running harness: %s" % (args.arm, " ".join(cmd)))
        rc = subprocess.call(cmd)
        print("[%s] harness rc=%d" % (args.arm, rc))
    finally:
        server.terminate()
        try:
            server.wait(timeout=15)
        except subprocess.TimeoutExpired:
            server.kill()
        errf.close()

    with open(out_json) as f:
        rb = json.load(f)
    fields = {
        "runner": rb.get("runner"),
        "bulkSimAsync": rb.get("requests", {}).get("bulkSimAsync"),
        "raidSimAsync": rb.get("requests", {}).get("raidSimAsync"),
        "rowCount": rb.get("rowCount"),
        "elapsedS": rb.get("elapsedS"),
        "firstRowS": rb.get("firstRowS"),
        "clickToDoneS": rb.get("clickToDoneS"),
        "done": rb.get("done"),
        "panicHit": rb.get("panicHit"),
        "screeningFallbackWarnings": rb.get("screeningFallbackWarnings"),
        "iterationsRequested": rb.get("iterationsRequested"),
        "bulkHttpRequested": rb.get("bulkHttpRequested"),
    }
    print("[%s] readback: %s" % (args.arm, json.dumps(fields)))


if __name__ == "__main__":
    main()
