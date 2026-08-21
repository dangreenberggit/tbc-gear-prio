#!/usr/bin/env python3
"""Fail if data/sim-implemented-effects.json is stale against the fork's Go tree.

Same regen-and-diff idiom as generate_json_literal_types.py --check: rebuild
the payload in memory with generate_sim_implemented_effects.py's own
functions and compare it to the committed file, byte for byte, rather than
writing to disk and running `git diff`.

Both halves of the comparison describe the pin in data/wowsims-fork.lock.json,
never the clone's checked-out HEAD: forkCommit is compared against the pin, and
the id sets are rebuilt from the fork tree **at that same pin** via git rather
than from the working tree. Clone-ahead-of-pin is the expected mid-slice state
(docs/plans/wowsims-tab/candidate-pool.md section 9.1a). Reading the id sets
from disk while labelling them with the pin gave the gate a state with no legal
move: the check called the artifact stale and demanded a regeneration that the
generator refused to perform while HEAD differed from the pin. Tickets 213, 215.

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
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from generate_sim_implemented_effects import (  # noqa: E402
    FORK_ROOT,
    SIM_DIR,
    active_item_ids_from_texts,
    lockfile_pin,
    stub_only_candidates_from_texts,
)

ROOT = Path(__file__).resolve().parent.parent
OUT_PATH = ROOT / "data/sim-implemented-effects.json"

# Same shape as generate_sim_implemented_effects.AUTO_GEN_GLOB, as a path
# prefix + suffix test, because git ls-tree yields strings, not Paths.
AUTO_GEN_DIR = "sim/common/"
AUTO_GEN_SUFFIX = "_auto_gen.go"


def git_out(*args: str) -> str:
    return subprocess.run(
        ["git", "-C", str(FORK_ROOT), *args],
        capture_output=True,
        text=True,
        check=True,
    ).stdout


def build_payload(pin: str) -> dict:
    """Rebuild the id sets from the fork tree **at the pin**, not from disk.

    Reading from git rather than the working tree is what keeps this check's
    two halves describing the same commit: forkCommit is compared against the
    pin below, so the id sets must come from the pin too. Scanning disk instead
    deadlocked the gate whenever the clone sat ahead of the pin -- the expected
    mid-slice state -- because the check demanded a regeneration the generator
    then refused to perform at a HEAD that differs from the pin. Ticket 215.

    A side effect worth naming: sim/core/proto/*.pb.go is generated protobuf,
    untracked by design, so it drops out of the scan. Those files contribute no
    item ids, and a reconstruction at the pin reproduces the committed artifact
    exactly (216 implemented, 460 stub-only).
    """
    names = git_out("ls-tree", "-r", "--name-only", pin).splitlines()
    go_names = [n for n in names if n.startswith("sim/") and n.endswith(".go")]
    auto_gen_names = [
        n
        for n in names
        if n.startswith(AUTO_GEN_DIR) and n.endswith(AUTO_GEN_SUFFIX)
    ]
    implemented = active_item_ids_from_texts(
        git_out("show", f"{pin}:{n}") for n in sorted(go_names)
    )
    stub_candidates = stub_only_candidates_from_texts(
        git_out("show", f"{pin}:{n}") for n in sorted(auto_gen_names)
    )
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

    pin = lockfile_pin()
    if pin is None:
        print(
            "sim-implemented-effects check: could not read the pin from "
            "data/wowsims-fork.lock.json.",
            file=sys.stderr,
        )
        return 2

    committed = json.loads(OUT_PATH.read_text(encoding="utf-8"))
    try:
        fresh = build_payload(pin)
    except (OSError, subprocess.CalledProcessError):
        print(
            f"sim-implemented-effects check: could not read the fork tree at "
            f"{pin} from {FORK_ROOT}. The clone may not contain the pinned "
            "commit -- fetch it, or repair data/wowsims-fork.lock.json.",
            file=sys.stderr,
        )
        return 2

    diffs: list[str] = []
    for key in ("implementedEffectItemIdsCount", "implementedEffectItemIds", "stubOnlyItemIds"):
        if committed.get(key) != fresh[key]:
            diffs.append(key)

    if committed.get("forkCommit") != pin:
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
