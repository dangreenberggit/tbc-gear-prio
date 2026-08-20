#!/usr/bin/env python3
"""Scan the fork's Go tree for item effect registration and emit a data file.

Ticket 171 (user ruling, 2026-08-15, exclusion by design): an item whose proc
or on-use effect is registered only as a `TODO: Manual implementation
required` stub in the pinned fork's Go source must not appear in any
candidate pool at all -- not simmed, not shown, no "unmeasured" styling. The
fork's own source already encodes implemented-vs-not, so this script reads
that fact mechanically instead of hand-curating a list that goes stale
silently (the first option ticket 171 weighed and rejected).

Two id sets, by construction rather than symmetry:

  - `implementedEffectItemIds`: every item id passed to an *active* (not
    commented out) `core.NewItemEffect(<id>, ...)` or
    `shared.NewSimpleStatActive(<id>)` call anywhere under sim/**/*.go. This
    is informational only -- assemble_universe.py does not need it, because
    an item with NO effect at all (a plain stat stick) also needs no
    registration and must stay in the pool. Only `stubOnlyItemIds` drives
    exclusion.
  - `stubOnlyItemIds`: item ids that appear *exclusively* inside a commented
    `// TODO: Manual implementation required` block in
    sim/common/tbc/stat_bonus_procs_auto_gen.go (or a sibling auto-gen file
    with the same generator header), identified by the
    `//	{ItemID: <id>, ItemName: "..."},` line the auto-generator emits
    inside each stub. An id also found in `implementedEffectItemIds` is
    dropped from this set -- the auto-gen stub is upstream's TODO list, not
    the last word: item_librams.go registers 27484 and 23203 as real
    `core.NewItemEffect` calls while the auto-gen file's TODO scanner
    (upstream's own db-diff tool, not this repo) has not yet noticed and
    pruned their commented stub blocks. A hand implementation always wins.

Run manually (regenerate after re-pinning vendor/tbc-new-fork):

    python scripts/generate_sim_implemented_effects.py

Refuses to run (exit 2) when the clone's HEAD differs from the pin in
data/wowsims-fork.lock.json: forkCommit must name the commit the artifact
describes, and check_sim_implemented_effects.py compares it against the pin
(ticket 213). Regenerating is therefore a pin-bump-time act, which was
already the documented workflow -- this makes it enforced instead of assumed.

Writes data/sim-implemented-effects.json. Exits 2 if vendor/tbc-new-fork is
absent or its HEAD is off the pin -- same "absence is ordinary, not a failure"
contract as check_engine_port_drift.py, since vendor/ is gitignored and a
fresh clone will not have the fork checked out.
"""

from __future__ import annotations

import json
import re
import subprocess
import sys
from collections.abc import Iterable
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FORK_ROOT = ROOT / "vendor/tbc-new-fork"
SIM_DIR = FORK_ROOT / "sim"
OUT_PATH = ROOT / "data/sim-implemented-effects.json"
LOCK_PATH = ROOT / "data/wowsims-fork.lock.json"


def lockfile_pin() -> str | None:
    """The fork commit this repo is pinned to, or None if unreadable."""
    try:
        data = json.loads(LOCK_PATH.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None
    # Valid JSON that is not an object has no .get; returning None here keeps
    # the callers' `pin is None` guards reachable instead of raising past them.
    return data.get("commit") if isinstance(data, dict) else None


# The one auto-gen file the ticket's diagnosis names, plus any sibling that
# shares its generator header (a second phase's auto-gen file would carry
# the same marker if one is ever added). Scanning by header rather than by
# hardcoded filename means a renamed or split file is still found.
AUTO_GEN_GLOB = "sim/common/**/*_auto_gen.go"
STUB_MARKER = "TODO: Manual implementation required"

# Matches an *active* (non-comment) registration call anywhere in the tree.
# `^\s*` (not `^\s*//`) is the exclusion: a commented-out call like
# metagems.go's `// core.NewItemEffect(25890, ...)` never matches this.
ACTIVE_CALL_RE = re.compile(
    r"^\s*(?:core\.NewItemEffect|shared\.NewSimpleStatActive)\(\s*(\d+)",
    re.MULTILINE,
)

# Some registrations are data-driven rather than a literal call argument:
# item_librams.go's LibramMap{{ItemID: 23203, ...}, ...}.RegisterAll(func(config
# LibramConfig) { core.NewItemEffect(config.ItemID, ...) }) pattern, mirrored
# by several other classes' item_sets.go / items.go files (hunter, shaman,
# warlock, warrior, mage, priest, rogue, common/tbc, common/classic -- all
# co-occur `ItemID:` literals with `core.NewItemEffect` calls). An active
# (non-commented) `{ItemID: <n>, ...}` struct literal is that pattern's
# registration site, so it counts the same as a direct call argument. The one
# place this must NOT fire is the stub auto-gen files, where every
# `{ItemID: <n>, ItemName: "..."}` line is already inside a `//` comment and
# so never matches `^\s*\{` (no leading `//`) in the first place.
ACTIVE_STRUCT_LITERAL_RE = re.compile(
    r"^\s*\{ItemID:\s*(\d+)",
    re.MULTILINE,
)

# A third registration shape: the effect is not registered through a call at
# all, it is read off the equipped set at runtime -- `HasItemEquipped(8345,
# ...)` gates Wolfshead Helm's feral energy behaviour in
# sim/druid/feralcat/rotation.go and sim/druid/forms.go. The item is as
# implemented as any NewItemEffect one, but neither call regex saw it, so it
# reported stub-only (ticket 233).
#
# Unlike the two above, this one is NOT anchored at the start of a line: these
# calls sit mid-expression, inside an `if` or a struct field, never first on
# the line. The leading negative lookahead does the comment exclusion that the
# anchor does for the others -- it rejects the whole line when a `//` appears
# anywhere before the match. That also rejects a real call sharing a line with
# a trailing comment, which is the safe direction: it under-counts rather than
# counting a commented-out registration as live.
#
# Limit, deliberate: this is a literal scan, so a caller passing a named
# constant -- HasItemEquipped(WolfsheadHelm, ...) -- is out of its reach,
# exactly as for the other two regexes. Nothing in the pinned tree does that.
ACTIVE_HAS_ITEM_EQUIPPED_RE = re.compile(
    r"^(?![^\n]*//)[^\n]*?HasItemEquipped\(\s*(\d+)",
    re.MULTILINE,
)

# The auto-generator's own stub-list line format, always commented:
# `//	{ItemID: 28592, ItemName: "Libram of Souls Redeemed"},`
STUB_ITEM_LINE_RE = re.compile(
    r"^\s*//\s*\{ItemID:\s*(\d+),\s*ItemName:\s*\"([^\"]*)\"\}",
    re.MULTILINE,
)


def active_item_ids_from_texts(texts: Iterable[str]) -> set[int]:
    ids: set[int] = set()
    for text in texts:
        for m in ACTIVE_CALL_RE.finditer(text):
            ids.add(int(m.group(1)))
        for m in ACTIVE_STRUCT_LITERAL_RE.finditer(text):
            ids.add(int(m.group(1)))
        for m in ACTIVE_HAS_ITEM_EQUIPPED_RE.finditer(text):
            ids.add(int(m.group(1)))
    return ids


def active_item_ids(go_files: list[Path]) -> set[int]:
    return active_item_ids_from_texts(p.read_text(encoding="utf-8") for p in go_files)


def stub_only_candidates(auto_gen_files: list[Path]) -> dict[int, str]:
    """Item id -> name, for every `{ItemID: ...}` line inside a stub block.

    Scoped to blocks that actually carry the TODO marker so a *registered*
    variants list (none exist today per the design's scope check, but the
    auto-gen format supports one) is never mistaken for a stub. Blocks are
    split on the marker itself: each stub starts with
    `// TODO: Manual implementation required` and runs until the next
    occurrence of that same marker or end of file.
    """
    return stub_only_candidates_from_texts(
        p.read_text(encoding="utf-8") for p in auto_gen_files
    )


def stub_only_candidates_from_texts(texts: Iterable[str]) -> dict[int, str]:
    out: dict[int, str] = {}
    for text in texts:
        if STUB_MARKER not in text:
            continue
        blocks = text.split(STUB_MARKER)[1:]  # first split chunk precedes any stub
        for block in blocks:
            for m in STUB_ITEM_LINE_RE.finditer(block):
                out[int(m.group(1))] = m.group(2)
    return out


def fork_commit(fork_root: Path) -> str | None:
    try:
        result = subprocess.run(
            ["git", "-C", str(fork_root), "rev-parse", "HEAD"],
            capture_output=True,
            text=True,
            check=True,
        )
    except (OSError, subprocess.CalledProcessError):
        return None
    return result.stdout.strip() or None


def main() -> int:
    if not SIM_DIR.is_dir():
        print(
            f"generate_sim_implemented_effects: {SIM_DIR} is absent (vendor/ is "
            "gitignored). Clone the fork before running this script -- see "
            "AGENTS.md / the fork's own README for the checkout command.",
            file=sys.stderr,
        )
        return 2

    pin = lockfile_pin()
    commit = fork_commit(FORK_ROOT)
    if pin is None:
        print(
            "generate_sim_implemented_effects: could not read the pin from "
            "data/wowsims-fork.lock.json -- the file is missing, is not valid "
            "JSON, is not a JSON object, or has no 'commit' field. Repair the "
            "lockfile, then re-run. (Not a HEAD/pin mismatch: the pin is "
            "unreadable, so resetting the clone to it is not possible.)",
            file=sys.stderr,
        )
        return 2
    if commit is None or commit != pin:
        print(
            f"generate_sim_implemented_effects: clone HEAD is {commit or 'unknown'} "
            f"but data/wowsims-fork.lock.json pins {pin or 'unknown'}. forkCommit "
            "must name the commit the artifact describes, so regeneration is "
            "valid only at pin-bump time: update the lockfile (or reset the "
            "clone to the pin), then re-run.",
            file=sys.stderr,
        )
        return 2

    go_files = sorted(SIM_DIR.rglob("*.go"))
    auto_gen_files = sorted(FORK_ROOT.glob(AUTO_GEN_GLOB))
    if not auto_gen_files:
        print(
            f"generate_sim_implemented_effects: no files matched {AUTO_GEN_GLOB} "
            "under the fork -- the auto-gen file this script depends on may have "
            "been renamed or removed upstream. Update AUTO_GEN_GLOB / STUB_MARKER.",
            file=sys.stderr,
        )
        return 2

    implemented = active_item_ids(go_files)
    stub_candidates = stub_only_candidates(auto_gen_files)
    # A hand implementation always wins over upstream's not-yet-pruned TODO
    # list -- see item_librams.go's 27484/23203, the design's own known cases.
    stub_only = {
        iid: name for iid, name in stub_candidates.items() if iid not in implemented
    }

    payload = {
        "generatedBy": "scripts/generate_sim_implemented_effects.py",
        "forkRepo": "dangreenberggit/tbc-new",
        "forkCommit": commit,
        "_comment": (
            "implementedEffectItemIds is informational -- assemble_universe.py "
            "does not consult it, because a stat-only item needs no "
            "registration at all. stubOnlyItemIds is the one that drives "
            "exclusion: an item id whose only appearance in the fork's Go "
            "tree is inside a commented `TODO: Manual implementation "
            "required` stub block, with no active core.NewItemEffect / "
            "shared.NewSimpleStatActive registration anywhere. Regenerate "
            "with `python scripts/generate_sim_implemented_effects.py` after "
            "re-pinning vendor/tbc-new-fork. "
            "Membership in implementedEffectItemIds means the item is actively "
            "registered or referenced in the fork's Go tree -- through a "
            "core.NewItemEffect / shared.NewSimpleStatActive call, a LibramMap "
            "{ItemID: ...} struct literal, or a runtime HasItemEquipped(<id>, "
            "...) gate. It does NOT mean the item's proc contributes DPS for "
            "your spec: ticket 226's direct sims measured a member of this "
            "list contributing nothing for the spec under test "
            "(.scratch/handoffs/ticket-226-direct-sims.md). Implemented and "
            "contributes are different questions and this key answers only the "
            "first. All three scans are literal-id scans, so a registration "
            "whose id is a named constant is out of their reach."
        ),
        "implementedEffectItemIdsCount": len(implemented),
        "implementedEffectItemIds": sorted(implemented),
        "stubOnlyItemIds": [
            {"itemId": iid, "name": stub_only[iid]} for iid in sorted(stub_only)
        ],
    }

    OUT_PATH.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(
        f"wrote {OUT_PATH.relative_to(ROOT)} -- "
        f"{len(implemented)} implemented, {len(stub_only)} stub-only "
        f"(fork commit {commit or 'unknown'})"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
