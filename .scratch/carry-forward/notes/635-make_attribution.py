"""Attribution check for ticket 635: rerun the default-APL 2pc-on sims with the
APL's only Wolfshead-dependent branch ("Wait To Mangle") flipped, to see how
much of the Wolfshead/no-Wolfshead gap comes from that rotation branch and how
much from the helm's +20 energy itself.

The 2pc-off sims need no rerun: with Mangle at 40 energy the clause
"Mangle cost <= 38" is false, so the flipped branch never fires without the 2pc.

Usage: python -I 635-make_attribution.py <make_requests out dir> <out dir>
"""

import copy
import json
import pathlib
import sys

src = pathlib.Path(sys.argv[1])
out = pathlib.Path(sys.argv[2])
out.mkdir(parents=True, exist_ok=True)

WAIT = "Wait To Mangle"
MANGLE_NEXT = {"variableRef": {"name": "Mangle Next"}}
COST_LE_38 = {"cmp": {"op": "OpLe", "lhs": {"spellCurrentCost": {"spellId": {"spellId": 33983, "rank": 3}}}, "rhs": {"const": {"val": "38"}}}}

variants = {
    # Wolfshead worn, rotation behaves as if it were not (wait for Mangle when it costs <= 38).
    "apl-wolf1-th2pc1-asNoWolf": ("apl-wolf1-th2pc1", {"or": {"vals": [MANGLE_NEXT, COST_LE_38]}}),
    # No Wolfshead, rotation behaves as if it were worn (only wait for Mangle when it is due).
    "apl-wolf0-th2pc1-asWolf": ("apl-wolf0-th2pc1", MANGLE_NEXT),
}

for name, (base, new_value) in variants.items():
    req = json.loads((src / f"{base}.req.json").read_text())
    rot = req["raid"]["parties"][0]["players"][0]["rotation"]
    hits = [v for v in rot["valueVariables"] if v["name"] == WAIT]
    assert len(hits) == 1, hits
    hits[0]["value"] = copy.deepcopy(new_value)
    (out / f"{name}.req.json").write_text(json.dumps(req))
    print(name)
