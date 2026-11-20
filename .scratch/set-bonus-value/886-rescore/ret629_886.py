"""Ticket 886: recompute set 629's screen estimate per count from the stored
ret-p3-p2 recording, check the max equals the stored bestStats, then apply
the fix (minus the crossing value once per added piece) and the rule.

usage: python -I ret629_886.py <recording.json> <setId>
"""
import json
import math
import sys

d = json.load(open(sys.argv[1], encoding="utf-8"))
sid = int(sys.argv[2])
r = d["ranking"]
rows = {it["itemId"]: it for it in r["items"]}
single = {i: (it.get("setContext") or {}).get("singleDeltaDps", it["deltaDps"]) for i, it in rows.items()}
bsv = {(b["setId"], b["threshold"]): b.get("dps") for b in r.get("brokenSetValues", [])}
screen = next(s for s in r["setScreen"]["sets"] if s["setId"] == sid)
w, reach = screen["worn"], screen["reach"]
cross = next((c for c in r.get("crossingChecks", []) if c["setId"] == sid and c["count"] == w + 1), None)
B = cross["dps"] if cross else 0.0
sigma = r["setScreen"]["sigma"]
pair = screen["pair"]["dps"]
print(f"set {sid}: worn {w} reach {reach}; crossing {B}; pair {pair}; sigma {sigma}")

entries = {e["threshold"]: e for e in r.get("setBonuses", []) if e["setId"] == sid}
best_before = best_after = None
for t in range(max(2, w + 1), reach + 1):
    e = entries.get(t)
    if not e or len(e.get("packageItemIds", [])) != t - w:
        print(f"  t={t}: no package entry")
        continue
    pkg = e["packageItemIds"]
    est = sum(single[i] for i in pkg)
    alone = {}
    for i in pkg:
        for b in (rows[i].get("setContext") or {}).get("singleBreaks", []) or []:
            k = (b["setId"], b["threshold"])
            alone[k] = alone.get(k, 0) + 1
    together = {(b["setId"], b["threshold"]) for b in e.get("breaks", []) or []}
    for k in set(alone) | together:
        coef = alone.get(k, 0) - (1 if k in together else 0)
        if coef:
            est += coef * bsv[k]
    after = est - (t - w) * B
    print(f"  t={t}: pieces {pkg}; singles {[round(single[i], 3) for i in pkg]}; estimate {est:.4f}; fixed {after:.4f}")
    best_before = est if best_before is None else max(best_before, est)
    best_after = after if best_after is None else max(best_after, after)

print(f"bestStats stored {screen.get('bestStats')}; recomputed {best_before}")
m_after = best_after + pair
print(f"measure stored {screen.get('measure')}; fixed {m_after}")
print(f"fixed measure + 2 sigma = {m_after + 2 * sigma:.4f} ({'below-zero, dropped' if m_after + 2 * sigma < 0 else 'ranked'})")
