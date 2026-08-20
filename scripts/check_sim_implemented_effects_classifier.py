#!/usr/bin/env python3
"""Pure unit checks for generate_sim_implemented_effects.py's classifier.

No fork checkout needed -- these run against small synthetic Go source
strings written in-line, the same way check_lock_merge.py checks merge_lock()
without touching the real lockfile. Exercises the four known cases ticket 171
names (28592/30063/32368 excluded, 27484/23203 kept) plus the edge cases that
made the classifier non-trivial: the LibramMap struct-literal registration
path, and a hand implementation overriding a stale auto-gen TODO stub for the
same id.

    python scripts/check_sim_implemented_effects_classifier.py
"""

from __future__ import annotations

import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from generate_sim_implemented_effects import (  # noqa: E402
    active_item_ids,
    stub_only_candidates,
)

# A trimmed stand-in for stat_bonus_procs_auto_gen.go: three stub blocks (the
# ticket's known-excluded ids) plus one commented block whose id is ALSO
# registered elsewhere (the librams.go stand-in below) -- this is the
# override case, item_librams.go's real 27484/23203.
AUTO_GEN_SNIPPET = """\
package tbc

func RegisterAllProcEffects() {
	// TODO: Manual implementation required
	//       This can be ignored if the effect has already been implemented.
	// shared.NewProcStatBonusEffectWithVariants(shared.ProcStatBonusEffect{
	// }, []shared.ItemVariant{
	//	{ItemID: 28592, ItemName: "Libram of Souls Redeemed"},
	// })

	// TODO: Manual implementation required
	//       This can be ignored if the effect has already been implemented.
	// shared.NewProcStatBonusEffectWithVariants(shared.ProcStatBonusEffect{
	// }, []shared.ItemVariant{
	//	{ItemID: 30063, ItemName: "Libram of Absolute Truth"},
	// })

	// TODO: Manual implementation required
	//       This can be ignored if the effect has already been implemented.
	// shared.NewProcStatBonusEffectWithVariants(shared.ProcStatBonusEffect{
	// }, []shared.ItemVariant{
	//	{ItemID: 32368, ItemName: "Tome of the Lightbringer"},
	// })

	// TODO: Manual implementation required
	//       This can be ignored if the effect has already been implemented.
	// shared.NewProcStatBonusEffectWithVariants(shared.ProcStatBonusEffect{
	// }, []shared.ItemVariant{
	//	{ItemID: 23203, ItemName: "Libram of Fervor"},
	// })
}
"""

# A trimmed stand-in for item_librams.go: 27484 registered directly, 23203
# registered through the LibramMap{{ItemID: ...}}.RegisterAll(...) pattern --
# so 23203 is real, but not a literal argument to core.NewItemEffect.
LIBRAMS_SNIPPET = """\
package paladin

func init() {
	core.NewItemEffect(27484, func(agent core.Agent) {})

	LibramMap{
		{ItemID: 23203, AuraID: 28852, StatValue: 48, Label: "Libram of Fervor"},
	}.RegisterAll(func(config LibramConfig) {
		core.NewItemEffect(config.ItemID, func(agent core.Agent) {})
	})
}
"""

# A commented-out registration outside the auto-gen TODO format (metagems.go's
# shape): must not count as active, and must not be picked up as a stub
# either, since it carries no `{ItemID: ...}` line.
METAGEM_SNIPPET = """\
package tbc

func init() {
	// Destructive Skyfire Diamond
	// core.NewItemEffect(25890, func(agent core.Agent) {})

	core.NewItemEffect(25893, func(agent core.Agent) {})
}
"""


def _write(tmp: Path, name: str, text: str) -> Path:
    path = tmp / name
    path.write_text(text, encoding="utf-8")
    return path


def check_known_cases() -> list[str]:
    problems: list[str] = []
    with tempfile.TemporaryDirectory() as td:
        tmp = Path(td)
        auto_gen = _write(tmp, "stat_bonus_procs_auto_gen.go", AUTO_GEN_SNIPPET)
        librams = _write(tmp, "item_librams.go", LIBRAMS_SNIPPET)

        implemented = active_item_ids([auto_gen, librams])
        candidates = stub_only_candidates([auto_gen])
        stub_only = {i for i in candidates if i not in implemented}

        for iid in (28592, 30063, 32368):
            if iid not in stub_only:
                problems.append(f"{iid} should be stub-only (ticket 171's excluded set)")
        for iid in (27484, 23203):
            if iid in stub_only:
                problems.append(f"{iid} should NOT be stub-only -- it has a real registration")
            if iid not in implemented:
                problems.append(f"{iid} should be counted as implemented")
    return problems


def check_libram_map_struct_literal_counts() -> list[str]:
    """The struct-literal path (23203) must resolve the same as a direct call
    argument (27484) -- neither is "more implemented" than the other."""
    problems: list[str] = []
    with tempfile.TemporaryDirectory() as td:
        tmp = Path(td)
        librams = _write(tmp, "item_librams.go", LIBRAMS_SNIPPET)
        implemented = active_item_ids([librams])
        if {27484, 23203} - implemented:
            problems.append(
                "LibramMap struct-literal registration (23203) must count as "
                "implemented exactly like a direct core.NewItemEffect(27484, ...) call"
            )
    return problems


def check_commented_call_not_active() -> list[str]:
    problems: list[str] = []
    with tempfile.TemporaryDirectory() as td:
        tmp = Path(td)
        metagems = _write(tmp, "metagems.go", METAGEM_SNIPPET)
        implemented = active_item_ids([metagems])
        if 25890 in implemented:
            problems.append(
                "a commented-out `// core.NewItemEffect(25890, ...)` must not count "
                "as active -- metagems.go has several of these"
            )
        if 25893 not in implemented:
            problems.append("an active call on the very next line must still be found")
    return problems


def check_stub_candidates_ignore_non_stub_files() -> list[str]:
    """stub_only_candidates must only read files actually passed to it -- a
    file with no TODO marker anywhere contributes nothing, even if it has
    `{ItemID: ...}` lines (the LibramMap snippet)."""
    problems: list[str] = []
    with tempfile.TemporaryDirectory() as td:
        tmp = Path(td)
        librams = _write(tmp, "item_librams.go", LIBRAMS_SNIPPET)
        candidates = stub_only_candidates([librams])
        if candidates:
            problems.append(
                f"stub_only_candidates found {candidates} in a file with no "
                "TODO marker -- it must only read auto-gen files, never scan "
                "arbitrary sim/**/*.go for the {ItemID: ...} shape"
            )
    return problems


# A trimmed stand-in for sim/druid/feralcat/rotation.go and sim/druid/forms.go:
# Wolfshead Helm (8345) is never registered through a call, it is read off the
# equipped set at runtime. Both real call shapes appear -- a struct field and
# an `if` condition -- plus the two that must NOT count: a commented-out call,
# and a caller passing a named constant instead of a literal id (ticket 233).
HAS_ITEM_EQUIPPED_SNIPPET = """package feralcat

func (cat *FeralDruid) setupRotation() {
	cat.Rotation = &FeralDruidRotation{
		Wolfshead: cat.HasItemEquipped(8345, []proto.ItemSlot{proto.ItemSlot_ItemSlotHead}),
	}
	if cat.HasItemEquipped(32387, []proto.ItemSlot{proto.ItemSlot_ItemSlotRanged}) {
		cat.applyIdol()
	}
	// legacy: cat.HasItemEquipped(29390, []proto.ItemSlot{proto.ItemSlot_ItemSlotHead})
	if cat.HasItemEquipped(WolfsheadHelmID, []proto.ItemSlot{proto.ItemSlot_ItemSlotHead}) {
		cat.applyNamedConstantPath()
	}
}
"""


def check_has_item_equipped_counts_as_implemented() -> list[str]:
    """A runtime `HasItemEquipped(<literal>, ...)` gate is a registration.

    Wolfshead Helm (8345) is wired only this way, so before this path existed
    the generator reported it stub-only while the fork implements it -- one of
    the two directions ticket 233 names. Unlike the other two regexes this one
    is not line-anchored, so its comment exclusion is a lookahead rather than
    the anchor, and both need holding down.
    """
    problems: list[str] = []
    with tempfile.TemporaryDirectory() as td:
        tmp = Path(td)
        rotation = _write(tmp, "rotation.go", HAS_ITEM_EQUIPPED_SNIPPET)
        implemented = active_item_ids([rotation])
        for iid in (8345, 32387):
            if iid not in implemented:
                problems.append(
                    f"HasItemEquipped({iid}, ...) must count as implemented -- "
                    "it is how the fork wires an equipped-item effect with no "
                    "NewItemEffect call"
                )
        if 29390 in implemented:
            problems.append(
                "a commented-out `// ... HasItemEquipped(29390, ...)` must not "
                "count -- this regex is not line-anchored, so the comment "
                "exclusion is a lookahead and is the part that can regress"
            )
    return problems


def check_has_item_equipped_ignores_named_constants() -> list[str]:
    """The scan is literal-only, and that limit is deliberate.

    `HasItemEquipped(WolfsheadHelmID, ...)` is out of reach of a literal scan,
    exactly as for the other two regexes. Nothing in the pinned tree does this
    today; this check exists so a future widening is a decision rather than an
    accident, and so the regex cannot silently start matching identifiers.
    """
    problems: list[str] = []
    with tempfile.TemporaryDirectory() as td:
        tmp = Path(td)
        rotation = _write(tmp, "rotation.go", HAS_ITEM_EQUIPPED_SNIPPET)
        implemented = active_item_ids([rotation])
        if implemented != {8345, 32387}:
            problems.append(
                "the HasItemEquipped scan must find exactly the two literal "
                f"ids and nothing else, got {sorted(implemented)} -- a named "
                "constant caller must not resolve to some id"
            )
    return problems


CHECKS = (
    check_known_cases,
    check_libram_map_struct_literal_counts,
    check_commented_call_not_active,
    check_stub_candidates_ignore_non_stub_files,
    check_has_item_equipped_counts_as_implemented,
    check_has_item_equipped_ignores_named_constants,
)


def main() -> int:
    problems = [p for check in CHECKS for p in check()]
    if not problems:
        print(f"sim-implemented-effects classifier checks ok ({len(CHECKS)} checks)")
        return 0
    for p in problems:
        print(f"  FAIL: {p}", file=sys.stderr)
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
