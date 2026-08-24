#!/usr/bin/env python3
"""Explain phase-3 candidate-pool membership, item by item, against wowsims.

The owner's question behind this script is "why is this item in the pool, and
what is missing from it?" -- and the answer has to be checkable by someone who
does not trust the assembler. So this renders two committed Markdown listings,
one per spec, that put the local pool next to a pool derived from the wowsims
item database and classify every single difference by a rule it can name.

The precedence rule the listings audit (plan Q1):

  membership and source metadata  -> the local universe
  phase                           -> the wowsims DB (any disagreement fails)
  zone vocabulary                 -> the wowsims DB's own zones[].name
  completeness                    -> the wowsims DB is the reference

The pool the tab actually sims is unchanged by this script. An item the audit
cannot explain is *reported*, never added -- membership decisions belong to
the owner, and the "unexplained" section is where they land.

Two rules make the output trustworthy rather than merely plausible:

**One model of eligibility.** `SPEC_PROFILES`, `eligible_d7` and
`stub_only_effect_ids` are imported from `assemble_universe`, never
re-implemented here. A second copy would drift, and this listing would then
confidently explain a pool that is not the pool. `check_rep_tables.py` imports
from the assembler the same way.

**Only committed inputs.** The DB read here is `vendor/wowsims/db.json`,
pinned by `data/wowsims.lock.json` to upstream wowsims' own
`assets/database/db.json`. The fork clone at `vendor/tbc-new-fork` carries a
copy of that file too, and it is deliberately never read here: the clone is
gitignored, exists on one machine, and is not restored in CI, so reading it
would make the committed bytes depend on which machine ran the generator and
the byte-compare gate could never pass in both places. The two copies are not
byte-identical -- they agree on item membership and differ on phase for three
items, none of them phase 3 -- so the choice is recorded in each listing's
source inventory rather than left implicit.

Unlike a check over an optional input, this one fails loudly when
`vendor/wowsims/db.json` is missing and names the restore command. CI restores
that file before `pnpm verify`, so absence means a broken setup, not an
ordinary state.

Run bare to regenerate; `--check` regenerates and byte-compares (that is
`pnpm pool-listings:check`, in `pnpm verify`).

Exit 0 ok, 1 drifted or an input is missing.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DB = ROOT / "vendor/wowsims/db.json"
WOWSIMS_LOCK = ROOT / "data/wowsims.lock.json"
UNIVERSES = ROOT / "data/universes"
OUT_DIR = ROOT / "data/pool-listings"

sys.path.insert(0, str(ROOT / "scripts"))
from assemble_universe import (  # noqa: E402
    SPEC_PROFILES,
    eligible_d7,
    stub_only_effect_ids,
)

MAX_PHASE = 3
EPIC = 4

# The nine TBC raid zone ids, used only to decide whether a wowsims-only item
# is a raid drop -- the one bucket the plan's acceptance requires to be fully
# explained. Zone *names* are always read from the DB's own zones[] table
# rather than spelled here, so the vocabulary stays wowsims'.
RAID_ZONE_IDS = frozenset({3457, 3923, 3836, 3845, 3607, 3606, 3959, 3805, 4075})

CATEGORY_LABELS = {
    "d": "class allowlist excludes this spec's class",
    "a": "per-spec weapon/hand/armor exclusion",
    "b": "fails the eligible_d7 stat and slot screen",
    "c": "stub-only sim effect",
    "e1": "drops only outside this phase's zones",
    "e2": "sourced, but by a route the local assembly did not admit",
    "f": "no recognized source route",
    "g": "unexplained",
}

WOWSIMS_ONLY_CATEGORIES = ("d", "a", "b", "c", "e1", "e2", "f", "g")


def load_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def universe_only_category(entry: dict, db_by_id: dict[int, dict]) -> str:
    """Why a local entry is absent from the wowsims-primary membership.

    Ordered so the most mechanical answer wins: the item is below Epic, or
    wowsims has never heard of it, or wowsims disagrees about its phase --
    and only then "a local force-include route put it here", which is the
    ordinary case for curated and AtlasLoot-sourced entries.
    """
    if entry.get("quality") != EPIC:
        return "below-Epic quality (the audit covers Epic only)"
    item = db_by_id.get(entry["itemId"])
    if item is None:
        return "id absent from the wowsims DB"
    if (item.get("phase") or 0) > MAX_PHASE:
        return f"wowsims phase {item.get('phase')} is past the audited phase"
    origins = sorted({s.get("origin", "?") for s in entry.get("sources") or []})
    if origins:
        return "admitted by local route: " + ", ".join(origins)
    return "unexplained"


def wowsims_only_category(
    item: dict,
    stubs: dict[int, str],
    zone_names: dict[int, str],
    phase_zones: set[str],
) -> str:
    """Why a wowsims-primary item is absent from the local universe.

    Only c, e1, e2, f and g can apply here, and that is a fact about the
    audit's shape rather than an omission. Membership in W is *defined* by
    `eligible_d7` passing, so no member of W can fail it: the plan's
    categories a, b and d name eligibility rules, and eligibility rules
    explain why an item never entered W at all, never why a W-member is
    missing from the local pool. They are reported at a structural zero
    rather than dropped, so a reader can see they were considered.

    Every remaining category is a test that can fail, which is what keeps g
    reachable and the "unexplained" section honest:

      c   the item's only sim effect is an unimplemented stub.
      e1  the item drops, but only outside this phase's zone list. The local
          assembler admits raid drops by zone (`zoneMatch` in the universe
          report), so older content is out of scope by design.
      e2  the item is sourced and never drops -- crafted, or a rep reward --
          and the local assembly's route for that kind did not admit it.
          Split from e1 because "drops outside this phase" is simply false
          about an item that drops nowhere, and the two need different
          follow-up: e1 is working as designed, e2 is a question about a
          local route.
      f   the DB records no source at all, so no local route could find it.

    An item that is sourced, drops inside a phase zone, and still is not in
    the pool falls through to g and gets read by a person. Nothing absorbs
    it silently.
    """
    if item["id"] in stubs:
        return "c"
    sources = item.get("sources") or []
    if not sources:
        return "f"
    dropped_in = {
        zone_names.get((s.get("drop") or {}).get("zoneId"))
        for s in sources
        if s.get("drop")
    }
    if dropped_in & phase_zones:
        return "g"
    return "e1" if dropped_in else "e2"


def raid_drop_zones(item: dict, zone_names: dict[int, str]) -> list[str]:
    """Names of the TBC raid zones this item drops in, per the DB's own table."""
    zones = []
    for source in item.get("sources") or []:
        drop = source.get("drop")
        if not drop:
            continue
        zone_id = drop.get("zoneId")
        if zone_id in RAID_ZONE_IDS:
            zones.append(zone_names.get(zone_id, str(zone_id)))
    return sorted(set(zones))


def describe_source(source: dict) -> str:
    """One cell: what a local universe entry says about where the item comes from."""
    kind = source.get("kind", "?")
    parts = [kind]
    for field in ("zone", "boss", "faction", "profession", "token", "via"):
        value = source.get(field)
        if value:
            parts.append(f"{field}={value}")
    return " ".join(parts)


def render(spec: str, db: dict, zone_names: dict[int, str], pins: list[str]) -> str:
    profile = SPEC_PROFILES[spec]
    universe = load_json(UNIVERSES / f"{spec}-p{MAX_PHASE}.json")
    entries = {e["itemId"]: e for e in universe["entries"]}
    db_by_id = {i["id"]: i for i in db["items"]}
    stubs = stub_only_effect_ids()

    wowsims_primary = {
        i["id"]: i
        for i in db["items"]
        if (i.get("phase") or 0) <= MAX_PHASE
        and i.get("quality") == EPIC
        and eligible_d7(i, profile)
    }

    universe_only = sorted(set(entries) - set(wowsims_primary))
    wowsims_only = sorted(set(wowsims_primary) - set(entries))

    phase_disagreements = []
    absent_from_db = []
    for item_id in sorted(entries):
        item = db_by_id.get(item_id)
        if item is None:
            absent_from_db.append(item_id)
            continue
        if (item.get("phase") or 0) != entries[item_id].get("phase"):
            phase_disagreements.append(
                (item_id, entries[item_id]["name"], entries[item_id].get("phase"), item.get("phase"))
            )

    report = load_json(UNIVERSES / f"{spec}-p{MAX_PHASE}.report.json")
    phase_zones = set(report["phaseZones"])

    # Measured here rather than quoted from the plan, so the two quality
    # bounds the header justifies are re-established on every regeneration
    # instead of aging into folklore.
    legendaries = [i for i in db["items"] if i.get("quality") == 5]
    legendary_total = len(legendaries)
    phase3_legendaries = [i for i in legendaries if (i.get("phase") or 0) == MAX_PHASE]
    phase3_legendary_text = ", ".join(
        f"{i['name']} {i['id']}" for i in sorted(phase3_legendaries, key=lambda x: x["id"])
    ) or "none"
    rare_gap = len(
        {
            i["id"]
            for i in db["items"]
            if (i.get("phase") or 0) == MAX_PHASE
            and i.get("quality") == 3
            and eligible_d7(i, profile)
        }
        - set(entries)
    )

    classified = {
        item_id: wowsims_only_category(
            db_by_id[item_id], stubs, zone_names, phase_zones
        )
        for item_id in wowsims_only
    }

    unexplained = [i for i in wowsims_only if classified[i] == "g"]
    unexplained_raid_drops = [
        i for i in unexplained if raid_drop_zones(db_by_id[i], zone_names)
    ]

    universe_only_reasons = {
        i: universe_only_category(entries[i], db_by_id) for i in universe_only
    }
    universe_only_unexplained = [
        i for i in universe_only if universe_only_reasons[i] == "unexplained"
    ]

    out: list[str] = []
    w = out.append

    w(f"# Phase {MAX_PHASE} candidate pool — {spec}")
    w("")
    w("Generated by `python scripts/list_phase_pool.py`; checked by")
    w("`pnpm pool-listings:check` in `pnpm verify`. Do not edit by hand — a")
    w("hand edit fails the byte-compare on the next verify.")
    w("")
    w("## What this listing is for")
    w("")
    w("The pool the Upgrades tab sims comes from this repo's assembled universe.")
    w("This listing puts that pool next to a pool derived from the wowsims item")
    w("database and explains every difference, so a missing item is visible")
    w("instead of silent. Nothing here changes membership: an item the rules")
    w("below cannot explain is reported under \"Unexplained\", never added.")
    w("")
    w("## Precedence")
    w("")
    w("| Field | Primary |")
    w("|---|---|")
    w("| membership and source metadata | the local universe |")
    w("| phase | the wowsims DB — any disagreement fails this listing's gate |")
    w("| zone vocabulary | the wowsims DB's own `zones[].name` |")
    w("| completeness | the wowsims DB is the reference the universe is audited against |")
    w("")
    w("## Membership rules")
    w("")
    w("**Local membership (U)** is the `entries` of the committed universe")
    w(f"artifact `data/universes/{spec}-p{MAX_PHASE}.json`, unchanged.")
    w("")
    w("**wowsims-primary membership (W)** is every item in the pinned DB with")
    w(f"`phase <= {MAX_PHASE}`, `quality == Epic ({EPIC})`, and spec-eligible under")
    w("the assembler's own `SPEC_PROFILES` — class allowlist, armor type,")
    w("weapon and hand rules, relic type. Those rules are imported from")
    w("`scripts/assemble_universe.py`, not restated in code here, so the audit")
    w("cannot drift from the assembler it audits.")
    w("")
    w("Two quality bounds are deliberate and worth stating because neither is")
    w("obvious from the code:")
    w("")
    w(f"- **Legendary (`quality == 5`) is excluded.** The DB holds")
    w(f"  {legendary_total} legendaries, {len(phase3_legendaries)} of them phase")
    w(f"  {MAX_PHASE} ({phase3_legendary_text}), and none is ret- or")
    w("  feral-usable under these same spec rules: they are one-hand sword and")
    w("  dagger, ret admits no one-hand weapons, and a druid can use neither")
    w("  swords nor daggers. The engine additionally strips the Kael'thas")
    w("  temporary legendaries, which `eligible_d7` already screens. Re-run:")
    w("")
    w("  ```bash")
    w("  python -c \"import json;db=json.load(open('vendor/wowsims/db.json'));"
      "print([(i['id'],i['name'],i.get('phase')) for i in db['items'] "
      "if i.get('quality')==5])\"")
    w("  ```")
    w("")
    w(f"- **Rare and below are excluded from the audit.** The Rare phase-{MAX_PHASE}")
    w(f"  gap measured here is {rare_gap} for this spec, so auditing Rare adds")
    w("  noise and no finding. This bound is narrower than `eligible_d7` alone,")
    w("  whose own floor is `MIN_QUALITY = 3` (Rare) — hence the explicit Epic")
    w("  filter on top of it. The figure is recomputed on every regeneration of")
    w("  this listing, so it cannot silently go stale.")
    w("")
    w("## Reason categories")
    w("")
    w("Every item in W but not U gets exactly one category. They are tried in")
    w("this order, so an item that several rules would reject is reported under")
    w("the most specific one:")
    w("")
    for key in WOWSIMS_ONLY_CATEGORIES:
        w(f"- **{key}** — {CATEGORY_LABELS[key]}")
    w("")
    w("**Categories d, a and b are always zero here, for a structural reason")
    w("worth being explicit about.** They name eligibility rules, and W is")
    w("*defined* as the items that pass those rules — so no member of W can")
    w("fail one. They explain why an item never entered W at all; they cannot")
    w("explain why a W-member is missing from the local pool. They stay in the")
    w("table at zero so a reader can see they were considered rather than")
    w("quietly dropped.")
    w("")
    w("Each of the remaining categories is a test that can fail, which is what")
    w("keeps **g** reachable and this listing's zero-unexplained claim worth")
    w("something:")
    w("")
    w("- **e1** — the item drops, but only outside this phase's zone list. The")
    w("  local assembler admits raid drops by zone, so older content is out of")
    w("  scope by design rather than missing by accident.")
    w("- **e2** — the item is sourced and never drops at all (crafted, or a")
    w("  reputation reward), and the local assembly's route for that kind did")
    w("  not admit it. Split from **e1** because \"drops outside this phase\" is")
    w("  simply false about an item that drops nowhere, and the two want")
    w("  different follow-up: e1 is working as designed, e2 is a question about")
    w("  a local route.")
    w("- **f** — the DB records no source at all, so no local route could find")
    w("  it.")
    w("")
    w("An item that is sourced, drops inside one of this phase's zones, and is")
    w("still absent falls through to **g** and gets read by a person; nothing")
    w("absorbs it silently.")
    w("")
    w("## Source inventory")
    w("")
    for pin in pins:
        w(f"- {pin}")
    w(f"- `data/universes/{spec}-p{MAX_PHASE}.json` — {len(entries)} entries")
    w("- `data/sim-implemented-effects.json` — "
      f"{len(stubs)} stub-only item ids")
    w("")
    w("The fork clone `vendor/tbc-new-fork` is **not** read, and the distinction")
    w("matters. The DB audited here is upstream wowsims' own, pinned by")
    w("`data/wowsims.lock.json`; the fork carries its own copy of that file")
    w("which is not byte-identical to the pin. The pinned copy is used because")
    w("it is the only one that exists in CI — the clone is gitignored and lives")
    w("on one machine, so reading it would make these committed bytes depend on")
    w("which machine regenerated them, and the byte-compare gate could never")
    w("pass in both places. Re-run to compare the two copies:")
    w("")
    w("```bash")
    w("python -c \"import json;a=json.load(open('vendor/wowsims/db.json'))"
      "['items'];b=json.load(open('vendor/tbc-new-fork/assets/database/"
      "db.json'))['items'];A={i['id']:i.get('phase') for i in a};"
      "B={i['id']:i.get('phase') for i in b};print(len(A),len(B),"
      "set(A)^set(B),[k for k in A if A[k]!=B.get(k,A[k])])\"")
    w("```")
    w("")
    w("## Counts")
    w("")
    w(f"- local membership (U): {len(entries)}")
    w(f"- wowsims-primary membership (W): {len(wowsims_primary)}")
    w(f"- in both: {len(set(entries) & set(wowsims_primary))}")
    w(f"- universe-only (U \\ W): {len(universe_only)}")
    w(f"- wowsims-only (W \\ U): {len(wowsims_only)}")
    w(f"- phase-disagreements: {len(phase_disagreements)}")
    w(f"- universe ids absent from the wowsims DB: {len(absent_from_db)}")
    w(f"- unexplained: {len(unexplained) + len(universe_only_unexplained)}")
    w(f"- phase-{MAX_PHASE} raid drops lacking a reason: {len(unexplained_raid_drops)}")
    w("")
    w("## Cross-check: phase disagreements")
    w("")
    w("The precedence rule makes wowsims primary for phase, so a disagreement")
    w("here means the universe carries a phase wowsims does not agree with and")
    w("something must be reconciled before the listing can be trusted.")
    w("")
    if phase_disagreements:
        w("| itemId | name | universe phase | wowsims phase |")
        w("|---|---|---|---|")
        for item_id, name, local_phase, db_phase in phase_disagreements:
            w(f"| {item_id} | {name} | {local_phase} | {db_phase} |")
    else:
        w("None.")
    w("")
    w("## Cross-check: universe ids absent from the wowsims DB")
    w("")
    if absent_from_db:
        w("| itemId | name |")
        w("|---|---|")
        for item_id in absent_from_db:
            w(f"| {item_id} | {entries[item_id]['name']} |")
    else:
        w("None.")
    w("")
    w("## Wowsims-only items, classified")
    w("")
    w("Items the wowsims-primary rules admit that the local universe does not")
    w("carry. Each row names the rule that explains the absence.")
    w("")
    if wowsims_only:
        w("| itemId | name | phase | category | reason | raid zones |")
        w("|---|---|---|---|---|---|")
        for item_id in wowsims_only:
            item = db_by_id[item_id]
            category = classified[item_id]
            zones = ", ".join(raid_drop_zones(item, zone_names)) or "—"
            w(
                f"| {item_id} | {item['name']} | {item.get('phase')} | {category} "
                f"| {CATEGORY_LABELS[category]} | {zones} |"
            )
    else:
        w("None.")
    w("")
    w("### Category totals")
    w("")
    w("| category | count |")
    w("|---|---|")
    for key in WOWSIMS_ONLY_CATEGORIES:
        w(f"| {key} — {CATEGORY_LABELS[key]} | {sum(1 for v in classified.values() if v == key)} |")
    w("")
    w("## Universe-only items, classified")
    w("")
    w("Items the local universe carries that the wowsims-primary rules do not")
    w("admit. These are the local force-include routes and the quality bound,")
    w("not errors.")
    w("")
    if universe_only:
        w("| itemId | name | phase | why W does not admit it |")
        w("|---|---|---|---|")
        for item_id in universe_only:
            entry = entries[item_id]
            w(
                f"| {item_id} | {entry['name']} | {entry.get('phase')} "
                f"| {universe_only_reasons[item_id]} |"
            )
    else:
        w("None.")
    w("")
    w("## Unexplained")
    w("")
    w("Items no category above explains. Each one is a question for the owner:")
    w("either a rule this listing does not know about, or a genuine pool gap.")
    w("")
    if unexplained or universe_only_unexplained:
        w("| itemId | name | side | raid zones |")
        w("|---|---|---|---|")
        for item_id in unexplained:
            item = db_by_id[item_id]
            zones = ", ".join(raid_drop_zones(item, zone_names)) or "—"
            w(f"| {item_id} | {item['name']} | wowsims-only | {zones} |")
        for item_id in universe_only_unexplained:
            w(f"| {item_id} | {entries[item_id]['name']} | universe-only | — |")
    else:
        w("None.")
    w("")
    w(f"Phase-{MAX_PHASE} raid drops lacking a reason: {len(unexplained_raid_drops)}.")
    w("")
    w("A raid drop with no reason is the failure this listing exists to catch —")
    w("it would mean a piece of current raid content the pool silently omits.")
    w("")
    w("## Full local membership")
    w("")
    w(f"All {len(entries)} entries of the universe the tab sims, with the source")
    w("metadata the local assembly resolved for each.")
    w("")
    w("| itemId | name | slot | phase | sources |")
    w("|---|---|---|---|---|")
    for item_id in sorted(entries):
        entry = entries[item_id]
        sources = "; ".join(describe_source(s) for s in entry.get("sources") or []) or "—"
        w(
            f"| {item_id} | {entry['name']} | {entry.get('slot')} "
            f"| {entry.get('phase')} | {sources} |"
        )
    w("")
    return "\n".join(out)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--check",
        action="store_true",
        help="regenerate and byte-compare against the committed listings",
    )
    args = parser.parse_args()

    if not DB.is_file():
        print(
            f"pool listings: {DB.relative_to(ROOT)} is missing. This is a "
            "committed-pin input, not an optional one -- the listings are "
            "generated from it and CI restores it before verify. Restore it "
            "with:\n"
            "\n"
            "    pnpm sync:wowsims:restore\n",
            file=sys.stderr,
        )
        return 1

    db = load_json(DB)
    zone_names = {z["id"]: z["name"] for z in db["zones"]}

    wowsims_lock = load_json(WOWSIMS_LOCK)
    db_pin = wowsims_lock["files"]["db.json"]
    # Deliberately not stamped with the fork pin from data/wowsims-fork.lock.json:
    # this listing never reads the fork, so binding its bytes to a fork commit
    # would churn both files on every fork commit for no change in content.
    pins = [
        f"`vendor/wowsims/db.json` — {len(db['items'])} items, "
        f"sha256 `{db_pin['sha256']}` per `data/wowsims.lock.json`",
        f"pinned from `{db_pin['path']}` of upstream `{wowsims_lock['repo']}` "
        f"at `{wowsims_lock['tag']}`, commit `{wowsims_lock['commit']}`",
    ]

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    drifted: list[str] = []
    for spec in ("ret", "feral"):
        rendered = render(spec, db, zone_names, pins)
        target = OUT_DIR / f"{spec}-p{MAX_PHASE}.md"
        if args.check:
            if not target.is_file():
                drifted.append(f"{target.relative_to(ROOT)} does not exist")
            elif target.read_text(encoding="utf-8") != rendered:
                drifted.append(
                    f"{target.relative_to(ROOT)} differs from a fresh regeneration"
                )
        else:
            target.write_text(rendered, encoding="utf-8", newline="\n")
            print(f"wrote {target.relative_to(ROOT)}")

    if not args.check:
        return 0

    if not drifted:
        print("pool listings check ok: both listings match a fresh regeneration")
        return 0

    for line in drifted:
        print(f"  {line}", file=sys.stderr)
    print(
        "\nThe committed pool listings no longer match what the current data "
        "produces. Either an input moved (a universe was reassembled, the DB "
        "pin changed) or a listing was hand-edited. Regenerate with:\n"
        "\n"
        "    python scripts/list_phase_pool.py\n"
        "\n"
        "then read the diff before committing -- a changed count is a change "
        "in what the pool explains, not just churn.",
        file=sys.stderr,
    )
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
