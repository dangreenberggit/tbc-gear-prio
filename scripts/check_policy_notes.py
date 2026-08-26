#!/usr/bin/env python3
"""Every policy exclusion a spec carries must be published in its d7Note.

Follows the check_sync_wowsims.py / check_lock_merge.py convention -- a
standalone script of small checks, not a pytest suite (this repo has no pytest
infra).

The point being defended: a policy exclusion is this repo overriding the sim's
own equip answer, so ADR-0029 makes it first-class -- named, justified, and
**published in the committed artifact** rather than living only in the
generator. `SpecProfile.__init__` enforces the "justified" half by refusing a
policy exclusion with no note. This enforces the "published" half.

The two halves drifted apart once already: the constructor accepted
`policy_two_hand_only` alone, while `d7_note` branched only on
`policy_excluded_weapon_types`, so ret's mandatory note was swallowed and the
payload shipped the bare base sentence. A reader of the artifact then has no
way to learn why 376 items are missing from the pool. Caught in pre-merge
review (A1/ST3), not by any check -- hence this one.

Run via `pnpm verify` (`pnpm policy-notes:check`), or by hand:

    python scripts/check_policy_notes.py

Exit 0 ok, 1 a check failed.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))

import assemble_universe as au  # noqa: E402

UNIVERSES = ROOT / "data/universes"


def check_note_published_for_each_policy_kind() -> list[str]:
    """Each policy field, alone, must reach the note. Pinned per field.

    Deliberately one synthetic profile per policy *kind* rather than a loop
    over the shipped specs: the bug was a policy kind the publisher did not
    know about, and a spec that happens to set two kinds at once would hide it.
    """
    problems: list[str] = []
    marker = "SENTINEL-POLICY-JUSTIFICATION"

    kinds = {
        "policy_excluded_weapon_types": {"policy_excluded_weapon_types": frozenset({6})},
        "policy_two_hand_only": {"policy_two_hand_only": True},
    }

    for kind, kwargs in sorted(kinds.items()):
        profile = au.SpecProfile(
            "ret",
            ep_weights=ROOT / "unused",
            gear_sets=[],
            wowhead_dir=None,
            two_hop=None,
            sunmote_upgrades=None,
            tier_piece_ids=frozenset(),
            class_id=2,
            policy_exclusion_note=marker,
            **kwargs,
        )
        note = au.d7_note(profile)
        if marker not in note:
            problems.append(
                f"a profile setting only {kind} publishes a d7Note that omits its "
                f"justification -- the note is mandatory but unpublished. Got: {note!r}"
            )
    return problems


def check_no_policy_without_a_note() -> list[str]:
    """The constructor's guard still refuses an unexplained policy exclusion."""
    try:
        au.SpecProfile(
            "ret",
            ep_weights=ROOT / "unused",
            gear_sets=[],
            wowhead_dir=None,
            two_hop=None,
            sunmote_upgrades=None,
            tier_piece_ids=frozenset(),
            class_id=2,
            policy_two_hand_only=True,
        )
    except ValueError:
        return []
    return ["a policy exclusion with no policy_exclusion_note was accepted"]


def check_shipped_universes_publish_their_policies() -> list[str]:
    """The committed artifacts actually carry the notes, not just the generator.

    Reads what shipped rather than re-deriving it: the failure mode is a
    payload whose note went stale or empty while the profile stayed correct.
    """
    problems: list[str] = []
    for slug, profile in sorted(au.SPEC_PROFILES.items()):
        if not (profile.policy_excluded_weapon_types or profile.policy_two_hand_only):
            continue
        expected = au.d7_note(profile)
        for path in sorted(UNIVERSES.glob(f"{slug}-p*.json")):
            if path.name.endswith(".report.json"):
                continue
            try:
                payload = json.loads(path.read_text(encoding="utf-8"))
            except (OSError, ValueError) as exc:
                problems.append(f"{path.name}: could not read: {exc}")
                continue
            got = payload.get("d7Note", "")
            if got != expected:
                problems.append(
                    f"{path.name}: d7Note does not match what {slug}'s profile "
                    f"publishes.\n      shipped:  {got!r}\n      expected: {expected!r}"
                )
    return problems


def main() -> int:
    problems: list[str] = []
    problems += check_note_published_for_each_policy_kind()
    problems += check_no_policy_without_a_note()
    problems += check_shipped_universes_publish_their_policies()

    if problems:
        print("policy notes check failed:\n", file=sys.stderr)
        for problem in problems:
            print(f"  - {problem}", file=sys.stderr)
        print(
            "\nA policy exclusion overrides the sim's own equip answer, so "
            "ADR-0029 requires it to be published where a reader of the "
            "committed artifact can find it. Fix d7_note (or regenerate the "
            "universes) so every policy a profile carries reaches its payload.",
            file=sys.stderr,
        )
        return 1

    policied = sum(
        1
        for p in au.SPEC_PROFILES.values()
        if p.policy_excluded_weapon_types or p.policy_two_hand_only
    )
    print(
        f"policy notes check ok: both policy kinds publish their justification; "
        f"{policied} specs carry one and their universes agree"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
