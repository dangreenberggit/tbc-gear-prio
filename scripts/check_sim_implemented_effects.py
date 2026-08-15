#!/usr/bin/env python3
"""Fail if data/sim-implemented-effects.json is stale against the fork's Go tree.

Same regen-and-diff idiom as generate_json_literal_types.py --check: rebuild
the payload in memory with generate_sim_implemented_effects.py's own
functions and compare it to the committed file, byte for byte, rather than
writing to disk and running `git diff`.

Skips cleanly (exit 0, explaining why) when vendor/tbc-new-fork is absent --
same "absence is ordinary, not a failure" contract check_engine_port_drift.py
uses, since vendor/ is gitignored and most checkouts (including CI, unless a
job explicitly clones the fork) will not have it. A missing fork means this
check cannot regenerate the comparison, not that the committed file is wrong.

Run via `pnpm verify` (`pnpm sim-implemented-effects:check`).

Exit 0 ok (including "nothing to check"), 1 stale, 2 could not parse.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from generate_sim_implemented_effects import (  # noqa: E402
    FORK_ROOT,
    SIM_DIR,
    active_item_ids,
    fork_commit,
    stub_only_candidates,
)
from generate_sim_implemented_effects import AUTO_GEN_GLOB  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
OUT_PATH = ROOT / "data/sim-implemented-effects.json"


def build_payload() -> dict:
    go_files = sorted(SIM_DIR.rglob("*.go"))
    auto_gen_files = sorted(FORK_ROOT.glob(AUTO_GEN_GLOB))
    implemented = active_item_ids(go_files)
    stub_candidates = stub_only_candidates(auto_gen_files)
    stub_only = {
        iid: name for iid, name in stub_candidates.items() if iid not in implemented
    }
    return {
        "implementedEffectItemIdsCount": len(implemented),
        "implementedEffectItemIds": sorted(implemented),
        "stubOnlyItemIds": [
            {"itemId": iid, "name": stub_only[iid]} for iid in sorted(stub_only)
        ],
    }


def main() -> int:
    if not SIM_DIR.is_dir():
        print(
            "sim-implemented-effects check: skipped -- vendor/tbc-new-fork is "
            "absent (vendor/ is gitignored). Nothing to regenerate against in "
            "this checkout."
        )
        return 0
    if not OUT_PATH.is_file():
        print(
            f"sim-implemented-effects check: skipped -- {OUT_PATH.relative_to(ROOT)} "
            "does not exist yet. Run "
            "`python scripts/generate_sim_implemented_effects.py` once the fork "
            "is available."
        )
        return 0

    committed = json.loads(OUT_PATH.read_text(encoding="utf-8"))
    fresh = build_payload()

    diffs: list[str] = []
    for key in ("implementedEffectItemIdsCount", "implementedEffectItemIds", "stubOnlyItemIds"):
        if committed.get(key) != fresh[key]:
            diffs.append(key)

    commit = fork_commit(FORK_ROOT)
    if committed.get("forkCommit") != commit:
        diffs.append("forkCommit")

    if not diffs:
        print(
            "sim-implemented-effects check ok: "
            f"{fresh['implementedEffectItemIdsCount']} implemented, "
            f"{len(fresh['stubOnlyItemIds'])} stub-only, matches committed file"
        )
        return 0

    print(
        f"{OUT_PATH.relative_to(ROOT)} is stale against the fork's Go tree "
        f"(fields differ: {diffs}). Re-run "
        "`python scripts/generate_sim_implemented_effects.py`, then "
        "`python scripts/assemble_universe.py` for every committed universe, "
        "and commit the result.",
        file=sys.stderr,
    )
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
