#!/usr/bin/env python3
"""
capture_fixture.py -- record a character's raid night into test/fixtures/.

Produces the same shape as test/fixtures/slamaltman.raw.json (report_code,
actors, combatant_info_events, fight, buffs_table) so the offline recorded
GearSource adapters can replay it. Costs WCL points; writes one file.

Feral needs one thing ret did not: form uptime. Feral cat and feral bear share
a talent tree, so talent plurality cannot tell them apart (PLAN.md 5.4) --
the Buffs table is the only signal that can, which is why buffs_table is
captured per fight rather than once per report.

Usage:
    python scripts/capture_fixture.py --name shredzepelin \
        --server-slug dreamscythe --region US \
        --report YwahQLgv2jBrZGn6 --fight 39 \
        --out test/fixtures/shredzepelin.raw.json

Credentials come from the environment or .env, same as wcl_probe.py.
"""

import argparse
import json
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from wcl_probe import Probe, authenticate, gql, load_env  # noqa: E402

REPORT_Q = """
query($code:String!){
  reportData{ report(code:$code){
    code startTime endTime zone{id name}
    fights{ id name encounterID kill difficulty startTime endTime }
    masterData{ actors(type:"Player"){ id name subType server } }
  } }
}
"""

EVENTS_Q = """
query($code:String!,$start:Float!,$end:Float!){
  reportData{ report(code:$code){
    events(startTime:$start, endTime:$end, dataType:CombatantInfo, limit:300){
      data
    }
  } }
}
"""

TABLE_Q = """
query($code:String!,$start:Float!,$end:Float!,$sid:Int!,$dt:TableDataType!){
  reportData{ report(code:$code){
    table(startTime:$start, endTime:$end, sourceID:$sid, dataType:$dt)
  } }
}
"""


def unwrap(r):
    return (r or {}).get("data", r) or {}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--name", required=True)
    ap.add_argument("--server-slug", required=True)
    ap.add_argument("--region", default="US")
    ap.add_argument("--report", required=True)
    ap.add_argument("--fight", type=int, required=True)
    ap.add_argument("--out", required=True)
    args = ap.parse_args()

    load_env(str(ROOT / ".env"))
    cid = os.environ.get("WCL_CLIENT_ID")
    csec = os.environ.get("WCL_CLIENT_SECRET")
    if not (cid and csec):
        print("missing WCL_CLIENT_ID / WCL_CLIENT_SECRET", file=sys.stderr)
        return 2

    p = Probe()
    authenticate(p, cid, csec)

    report = (unwrap(gql(p, REPORT_Q, {"code": args.report}, quiet=True))
              .get("reportData", {}).get("report"))
    if not report:
        print(f"report {args.report} not found", file=sys.stderr)
        return 1

    actors = (report.get("masterData") or {}).get("actors") or []
    me = next((a for a in actors
               if a["name"].lower() == args.name.lower()), None)
    if not me:
        print(f"{args.name} not in report {args.report}", file=sys.stderr)
        return 1

    fight = next((f for f in (report.get("fights") or [])
                  if f["id"] == args.fight), None)
    if not fight:
        print(f"fight {args.fight} not in report", file=sys.stderr)
        return 1

    ev = (unwrap(gql(p, EVENTS_Q, {"code": args.report,
                                   "start": fight["startTime"],
                                   "end": fight["endTime"]}, quiet=True))
          .get("reportData", {}).get("report", {}).get("events") or {})
    combatant_info = ev.get("data") or []

    buffs = (unwrap(gql(p, TABLE_Q, {"code": args.report,
                                     "start": fight["startTime"],
                                     "end": fight["endTime"],
                                     "sid": me["id"], "dt": "Buffs"},
                        quiet=True))
             .get("reportData", {}).get("report", {}).get("table") or {})

    casts = (unwrap(gql(p, TABLE_Q, {"code": args.report,
                                     "start": fight["startTime"],
                                     "end": fight["endTime"],
                                     "sid": me["id"], "dt": "Casts"},
                        quiet=True))
             .get("reportData", {}).get("report", {}).get("table") or {})

    payload = {
        "report_code": report["code"],
        "actors": [{"id": a["id"], "name": a["name"],
                    "subType": a["subType"], "server": a.get("server")}
                   for a in actors],
        "combatant_info_events": combatant_info,
        "fight": fight,
        "buffs_table": buffs,
        "casts_table": casts,
    }

    out = ROOT / args.out
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(payload, indent=2), encoding="utf-8")

    mine = [e for e in combatant_info if e.get("sourceID") == me["id"]]
    print(f"  wrote {out}")
    print(f"  actor {me['name']} id={me['id']} class={me['subType']}")
    print(f"  fight {fight['id']} {fight['name']} kill={fight.get('kill')}")
    print(f"  combatantinfo events: {len(combatant_info)} "
          f"({len(mine)} for this actor)")
    if not mine:
        print("  WARNING: no CombatantInfo for this actor -- gear will be "
              "unreadable from this capture", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
