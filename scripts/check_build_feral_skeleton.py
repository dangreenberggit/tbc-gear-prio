#!/usr/bin/env python3
"""Checks for the APL schema gate in build_feral_skeleton.py (issue #1, step 8).

Pure-logic / temp-file checks, no network. Follows the check_lock_merge.py
convention (a standalone script of small checks), since this repo has no
pytest infra. Not wired into `pnpm verify` -- package.json is out of scope
for this slice.

    python scripts/check_build_feral_skeleton.py

Exit 0 ok, 1 a check failed.
"""

from __future__ import annotations

import json
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import build_feral_skeleton  # noqa: E402
from apl_schema import known_fields, unknown_field_keys  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]


def check_known_schema_accepts_the_real_ret_apl() -> list[str]:
    """The committed ret skeleton's rotation block is a real, sim-verified
    APL (design C / PLAN.md §8.2). If the extractor is too strict it will
    reject fields the pinned proto plainly does declare -- a false positive
    on day one would make this gate untrustworthy."""
    golden = json.loads(
        (ROOT / "data/presets/ret/p2.raid-sim-skeleton.json").read_text(encoding="utf-8")
    )
    rotation = golden["raid"]["parties"][0]["players"][0]["rotation"]
    unknown = unknown_field_keys(rotation, known_fields())
    if unknown:
        return [f"schema gate false-positives on the real, working ret APL: {unknown}"]
    return []


def check_rejects_unknown_apl_field() -> list[str]:
    """The motivating case named in issue #1 step 8, re-aimed by ticket 244.

    It originally used timeToNextEnergyTick. That field is now DECLARED by the
    pinned proto, so asserting it is unknown asserted the opposite of the truth
    and made this check fail for being right. selectedPotion replaces it: the
    owner's APL uses it, upstream added it in 3267f8dfa (2026-08-19), and the
    pin predates that commit -- so it is a real, current gap rather than a
    synthetic one, and this check keeps documenting the live blocker.

    When the pin next moves past 3267f8dfa this check will fail the same way.
    That failure is the signal to re-aim it again at whatever is then absent,
    not to weaken it."""
    apl_value_with_bad_field = {
        "cmp": {
            "op": "OpLe",
            "lhs": {"selectedPotion": {"potionId": {"itemId": 22832}}},
            "rhs": {"const": {"val": "1s"}},
        }
    }
    unknown = unknown_field_keys(apl_value_with_bad_field, known_fields())
    if "selectedPotion" not in unknown:
        return [
            "unknown_field_keys() did not flag selectedPotion -- either the "
            "field has been added to data/proto/apl.proto (re-pin applied, this "
            "check is stale and should be re-aimed at a field the new pin still "
            "lacks) or the walk/extraction regressed"
        ]
    return []


def check_build_feral_skeleton_refuses_unknown_apl_field() -> list[str]:
    """End-to-end: point build_feral_skeleton.main() at a fabricated APL file
    carrying the bad field and confirm it exits 1 and writes nothing, rather
    than silently producing a skeleton the pinned binary would half-ignore."""
    problems: list[str] = []
    orig_feral_apl = build_feral_skeleton.FERAL_APL
    orig_out = build_feral_skeleton.OUT
    with tempfile.TemporaryDirectory() as td:
        fake_apl_path = Path(td, "feral_default.apl.json")
        fake_apl_path.write_text(
            json.dumps(
                {
                    "prepullActions": [],
                    "priorityList": [
                        {
                            "action": {
                                "condition": {
                                    "cmp": {
                                        "op": "OpLe",
                                        "lhs": {
                                            "selectedPotion": {
                                                "potionId": {"itemId": 22832}
                                            }
                                        },
                                        "rhs": {"const": {"val": "1s"}},
                                    }
                                },
                                "autocastOtherCooldowns": {},
                            }
                        }
                    ],
                    "groups": [],
                    "valueVariables": [],
                }
            ),
            encoding="utf-8",
        )
        fake_out_path = Path(td, "p2.raid-sim-skeleton.json")
        build_feral_skeleton.FERAL_APL = fake_apl_path
        build_feral_skeleton.OUT = fake_out_path
        try:
            rc = build_feral_skeleton.main()
            if rc != 1:
                problems.append(f"main() returned {rc}, expected 1 (unknown APL field)")
            if fake_out_path.exists():
                problems.append(
                    "main() wrote a skeleton despite the unknown field -- "
                    "the gate must refuse before writing, not after"
                )
        finally:
            build_feral_skeleton.FERAL_APL = orig_feral_apl
            build_feral_skeleton.OUT = orig_out
    return problems


CHECKS = (
    check_known_schema_accepts_the_real_ret_apl,
    check_rejects_unknown_apl_field,
    check_build_feral_skeleton_refuses_unknown_apl_field,
)


def main() -> int:
    problems = [p for check in CHECKS for p in check()]
    if not problems:
        print(f"feral skeleton APL schema gate ok ({len(CHECKS)} checks)")
        return 0
    for p in problems:
        print(f"  FAIL: {p}", file=sys.stderr)
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
