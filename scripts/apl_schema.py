"""Known-field extraction for the pinned wowsims APL/proto schema.

The pinned wowsimcli binary (v0.0.101) unmarshals JSON with
`protojson.UnmarshalOptions{DiscardUnknown: true}` -- a field name it
doesn't recognise is dropped, not rejected, so a copy-forward of upstream's
APL JSON can silently lose an action or condition and still produce a
plausible (wrong) DPS number. build_feral_skeleton.py's regen never runs the
binary itself to notice; it just writes JSON. This module gives it something
to check the JSON against instead: the field names our *pinned* proto
sources actually declare.

Scope and its limit: this extracts a single flat set of every camelCase
field name declared anywhere across data/proto/*.proto, not a per-message
schema. A stricter per-message walk (rejecting `val` where `spellId` is
expected) would also catch a field used in the wrong place; this only
catches a field name that is unknown ANYWHERE in the pinned schema. That is
enough for the case this gate exists for -- upstream's new feral APL uses
`timeToNextEnergyTick`, which is absent from data/proto entirely (checked
against APLValueEnergyTimeToTarget and every other APLValue* message in
apl.proto) -- but a name collision across unrelated messages would pass here
silently. Tighten to per-message if that ever bites.
"""

from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PROTO_DIR = ROOT / "data/proto"

# `  int32 rand_prop_points = 1;` / `repeated APLValue vals = 1;` inside a
# message body. Deliberately loose (does not track message boundaries or
# nesting) -- see module docstring for what that trades away.
FIELD_LINE = re.compile(
    r"^\s*(?:repeated\s+|optional\s+)?"
    r"(?:map<[^>]+>|[A-Za-z_][\w.]*)\s+"
    r"([a-z][a-z0-9_]*)\s*=\s*\d+\s*(?:\[[^\]]*\])?\s*;",
    re.MULTILINE,
)


def snake_to_camel(name: str) -> str:
    head, *rest = name.split("_")
    return head + "".join(w.capitalize() for w in rest)


def known_fields(proto_dir: Path = PROTO_DIR) -> set[str]:
    """Every field name declared in any .proto under `proto_dir`, as the
    camelCase key protojson would use. Comment lines are not stripped
    separately -- FIELD_LINE requires a `name = N;` shape a `//` comment
    won't produce, so this is safe without a full tokenizer."""
    fields: set[str] = set()
    for proto_path in sorted(proto_dir.glob("*.proto")):
        text = proto_path.read_text(encoding="utf-8")
        for m in FIELD_LINE.finditer(text):
            fields.add(snake_to_camel(m.group(1)))
    return fields


def unknown_field_keys(value: object, known: set[str]) -> list[str]:
    """Every dict key in `value` (walked recursively through dicts and
    lists) that is not in `known`. Enum values ("OpGe", "MeleeAuto", ...)
    only ever appear as JSON *values* in this schema, never as keys, so a
    key-only walk cannot mistake one for a field name.

    Returns keys in first-seen order, not a set, so a caller can report
    "field X first seen at ..." style messages without re-walking.
    """
    seen: list[str] = []
    seen_set: set[str] = set()

    def walk(node: object) -> None:
        if isinstance(node, dict):
            for k, v in node.items():
                if k not in known and k not in seen_set:
                    seen_set.add(k)
                    seen.append(k)
                walk(v)
        elif isinstance(node, list):
            for v in node:
                walk(v)

    walk(value)
    return seen
