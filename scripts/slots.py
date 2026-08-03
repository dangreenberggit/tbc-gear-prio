"""Load the shared 19→17 slot table (packages/core/src/slots-table.json)."""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SLOTS_TABLE = ROOT / "packages/core/src/slots-table.json"


def load_slot_orders() -> tuple[list[str], list[str]]:
    table = json.loads(SLOTS_TABLE.read_text(encoding="utf-8"))
    return list(table["wclOrder"]), list(table["simOrder"])


def map_wcl_gear_to_sim(wcl_gear: list, *, wcl_to_item) -> list:
    """Drop shirt/tabard and reorder into sim equipment order.

    `wcl_to_item` converts one WCL gear entry to the caller's item shape.
    Asserts the full 17-slot round-trip against the source ids so a
    filter-only regression fails before any sim runs.
    """
    wcl_order, sim_order = load_slot_orders()
    if len(wcl_gear) != len(wcl_order):
        raise ValueError(
            f"expected {len(wcl_order)} WCL gear slots, got {len(wcl_gear)}"
        )

    by_slot = {}
    for idx, name in enumerate(wcl_order):
        if name in ("SHIRT", "TABARD"):
            continue
        by_slot[name] = wcl_to_item(wcl_gear[idx])

    items = [by_slot[name] for name in sim_order]

    # Full round-trip: every kept WCL slot must land on its sim index.
    expected_ids = []
    for name in sim_order:
        wcl_idx = wcl_order.index(name)
        expected_ids.append(wcl_gear[wcl_idx].get("id") or 0)

    got_ids = []
    for item in items:
        if not item:
            got_ids.append(0)
        else:
            got_ids.append(item.get("id") or 0)

    if got_ids != expected_ids:
        raise AssertionError(
            f"slot map round-trip failed:\n  got {got_ids}\n  expected {expected_ids}"
        )
    return items
