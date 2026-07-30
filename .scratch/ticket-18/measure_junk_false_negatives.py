"""Ticket 18: sim-based false-negative check for the junk filter.

Cross-references the junk filter's reject set against a completed rank report,
answering the go/no-go question: would applying the filter have dropped any
item the sim ranked above cutoff?

The reject logic is imported from assemble_universe.py rather than
reimplemented, so this measures the filter that would actually ship.

Usage:
  python .scratch/ticket-18/measure_junk_false_negatives.py \
      --universe data/universes/ret-p3.json \
      --report .scratch/rank-reports/slamaltman-p3-postfix.json \
      --db vendor/wowsims/db.json
"""

import argparse
import json
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO / "scripts"))

from assemble_universe import (  # noqa: E402
    SLOTS_WITH_EP_SIGNAL,
    build_percentiles,
    is_caster_junk,
    item_stat_map,
)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--universe", required=True)
    ap.add_argument("--report", required=True)
    ap.add_argument("--db", required=True)
    ap.add_argument("--out")
    args = ap.parse_args()

    universe = json.loads(Path(args.universe).read_text(encoding="utf-8"))
    report = json.loads(Path(args.report).read_text(encoding="utf-8"))
    db = json.loads(Path(args.db).read_text(encoding="utf-8"))

    entries = universe["entries"]
    db_by_id = {int(it["id"]): it for it in db["items"]}

    # Recompute the reject sets exactly as measure_junk_filter does.
    pct = build_percentiles(entries)
    caster_rejects: dict[int, dict] = {}
    ep_floor_rejects: dict[int, dict] = {}
    for e in entries:
        stats = item_stat_map(db_by_id[e["itemId"]])
        if is_caster_junk(e["slot"], stats):
            caster_rejects[e["itemId"]] = e
            continue
        if e["slot"] in SLOTS_WITH_EP_SIGNAL and pct.get(e["itemId"], 1.0) < 0.10:
            ep_floor_rejects[e["itemId"]] = e

    ranked = {it["itemId"]: it for it in report["ranking"]["items"]}
    cutoff = report["ranking"]["cutoff"]

    def classify(reject_ids: dict[int, dict], label: str) -> dict:
        above, below, unranked = [], [], []
        for item_id, entry in reject_ids.items():
            r = ranked.get(item_id)
            if r is None:
                unranked.append(entry)
            elif not r["belowCutoff"]:
                above.append(r)
            else:
                below.append(r)
        above.sort(key=lambda r: -r["deltaDps"])
        return {
            "label": label,
            "rejected": len(reject_ids),
            "aboveCutoff": len(above),
            "belowCutoff": len(below),
            "unranked": len(unranked),
            "falseNegatives": [
                {
                    "itemId": r["itemId"],
                    "name": r["name"],
                    "slot": r["slot"],
                    "rank": r["rank"],
                    "deltaDps": round(r["deltaDps"], 2),
                    "deltaPct": round(r["deltaPct"], 3),
                    "se": round(r["se"], 2),
                }
                for r in above
            ],
            "unrankedItems": [
                {"itemId": e["itemId"], "name": e["name"], "slot": e["slot"]}
                for e in unranked
            ],
        }

    combined = dict(caster_rejects)
    combined.update(ep_floor_rejects)

    result = {
        "universe": args.universe,
        "report": args.report,
        "maxPhase": universe["maxPhase"],
        "universeSize": len(entries),
        "rankedSize": len(ranked),
        "cutoff": cutoff,
        "baseline": report["ranking"]["baseline"],
        "aboveCutoffTotal": sum(
            1 for r in ranked.values() if not r["belowCutoff"]
        ),
        "buckets": [
            classify(caster_rejects, "casterOnly"),
            classify(ep_floor_rejects, "epFloor"),
            classify(combined, "combined"),
        ],
    }

    out = json.dumps(result, indent=2)
    if args.out:
        Path(args.out).write_text(out, encoding="utf-8")
    print(out)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
