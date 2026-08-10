"""Verify ticket 57's suppression removed nothing load-bearing.

For every source row that disappeared from a committed universe file, assert:
  1. it was an `origin: "wowhead"` row, and
  2. it carried a locus, and
  3. the item still has a row from another origin naming the same zone/dungeon.

Any removal failing (3) is a real loss of coverage rather than a redundancy.
Run from the repo root with the pre-change files snapshotted alongside.

    python .scratch/carry-forward/notes/57-removal-check.py <before-dir>
"""
import json, os, sys, glob, collections

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
BEFORE = sys.argv[1] if len(sys.argv) > 1 else None
if not BEFORE:
    sys.exit("usage: 57-removal-check.py <dir-with-before-<name>.json>")


def load(p):
    return json.load(open(p, encoding="utf-8-sig"))


def sources_by_item(doc):
    entries = doc.get("entries")
    if not entries:
        raise SystemExit(
            "universe file has no `entries` -- shape changed, this check is blind"
        )
    out = {}
    for it in entries:
        out[int(it["itemId"])] = it.get("sources") or []
    return out


def locus(s):
    """The place a source names, if any -- zone, or the heroic `dungeon` key."""
    if s.get("kind") == "heroic":
        return s.get("dungeon")
    return s.get("zone")


bad = []
removed_total = 0
checked_files = 0

for after_path in sorted(glob.glob(os.path.join(ROOT, "data/universes/*.json"))):
    name = os.path.basename(after_path)
    if name.endswith(".report.json"):
        continue
    before_path = os.path.join(BEFORE, f"before-{name}")
    if not os.path.isfile(before_path):
        print(f"  (no baseline for {name}, skipped)")
        continue
    checked_files += 1
    before = sources_by_item(load(before_path))
    after = sources_by_item(load(after_path))

    for iid, before_rows in before.items():
        after_rows = after.get(iid, [])
        after_keys = {json.dumps(s, sort_keys=True) for s in after_rows}
        for s in before_rows:
            if json.dumps(s, sort_keys=True) in after_keys:
                continue
            removed_total += 1
            where = locus(s)
            sibling = any(
                r.get("origin") != "wowhead" and locus(r) == where
                for r in after_rows
            )
            if s.get("origin") != "wowhead" or not where or not sibling:
                bad.append((name, iid, s, after_rows))

print(f"universe files compared: {checked_files}")
print(f"source rows removed:     {removed_total}")
print(f"removals without a same-zone non-wowhead sibling: {len(bad)}")
for name, iid, s, after_rows in bad:
    print(f"  !! {name} {iid} removed={s}")
    for r in after_rows:
        print(f"       surviving: {r}")

sys.exit(1 if bad else 0)
