#!/usr/bin/env python3
"""Check that every DPS spec's item list holds every item it should (ticket 610).

For each spec and each phase 2-5 this derives, from data alone, which wearable
epics a list must contain, and fails when one is absent, when a tier or Sunmote
piece is present with the wrong source kind, or when an epic is absent and no
named policy says why. It also renders `data/pool-listings/<spec>-p<P>.md`,
which name every absent epic and the policy that excludes it.

Independence is the point. The builder (`scripts/assemble_universe.py`) decides
membership; this script restates the rules from committed data and imports
nothing from the builder nor reads its `*.report.json`, so a rule the builder
drops or bends shows up here as a failure instead of passing by construction
(the defect of the earlier listing audit, which imported the builder's
eligibility rules). Inputs:
`vendor/wowsims/db.json` (pinned by `data/wowsims.lock.json`), the universes
under check, and these committed files: `data/equip-eligibility.json`,
`packages/core/src/spec-registry.json`, `data/weapon-type-exclusions.json`,
`data/class-restricted-sets.json`, `data/phase_raids.json`,
`data/atlasloot_sources.json`, `data/sim-implemented-effects.json`,
`data/two-hop/raid-recipes.json`, `data/two-hop/tier-sets.json`,
`data/two-hop/sunmote-pairs.json`.

Four rules exist only as builder code, so they are restated here as constants:
Magisters' Terrace as the one admitted heroic dungeon, the four Gladiator name
prefixes, Kael's temporary legendaries, and retribution's two-hand-only rule.
A drift between a constant here and the builder's shows as a gate failure.

Every epic (quality >= 4) a spec can wear is classified, first match wins:

  hard policy (absent by rule; present is a failure)
    P-stub         in `stubOnlyItemIds`: the sim has only a TODO stub for its
                   effect, so its figure would be wrong
  expectation rules (must be present)
    E-arena        name starts with a Gladiator season prefix, item phase <= P;
                   present with the source {kind pvp, via arena, season N},
                   N = 1-4 from the prefix (owner ruling 2026-10-15, ticket
                   642: the player removes it with the "PvP vendor" source).
                   Checked before E-sourceless, which arena items would
                   otherwise match. Item phase > P falls to P-later-phase.
    E-token       `setId` is one of the spec's tier sets, item phase <= P;
                   present with a `token` source
    E-sunmote      upgrade of a Sunmote pair whose upgrade is not below its base
                   in item level, P = 5; present with a `Sunmote + ...` token
    E-raid         drops in a raid of phase <= P (db.json drop or AtlasLoot row)
    E-heroic       heroic drop in Magisters' Terrace, P = 5, item phase <= P
    E-rep          reputation reward: a faction `phase_raids.json` lists at
                   phase <= P, or a faction it does not list and the db-phase
                   item-level rule below; item phase <= P
    E-recipe       crafted, and its pattern drops in a raid (or is sold by a
                   listed faction) of phase <= P; item phase <= P
    E-sourceless   no source in db.json or AtlasLoot, item phase <= P, item
                   level >= 100 or an effect the sim implements
  soft policies (absent is explained; present is allowed, another route such
  as a guide list or a curated set can admit it)
    P-later-phase              every route it has opens after phase P
    P-vanilla                  no source, item level < 100: vanilla gear
                               (ticket 613, Q-613-vanilla)
    P-rep-below-floor          reward of an unlisted faction below the
                               db-phase item level
    P-vanilla-zone             drops only in a pre-TBC zone (Naxxramas, AQ...)
    P-heroic-dungeon           heroic five-man drop outside the admitted
                               heroic (Stage 2 heroic ruling)
    P-normal-dungeon           normal five-man drop (Stage 2 heroic ruling)
    P-crafted-no-raid-pattern  crafted, pattern not a raid drop (ticket 418)
  uncovered: matches none of the above. A failure: name a rule or a policy.

Run bare to rewrite the listings; `--check` regenerates, byte-compares and
fails on any finding (that is `pnpm pool-listings:check`, in `pnpm verify`);
`--report` prints the per-list count table. `--universes-dir` reads the lists
from another directory, for the red checks in ticket 610.

Exit 0 ok, 1 a finding or a drifted listing, 2 an input is missing.
"""

from __future__ import annotations

import argparse
import json
import sys
import time
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DB = ROOT / "vendor/wowsims/db.json"
WOWSIMS_LOCK = ROOT / "data/wowsims.lock.json"
UNIVERSES = ROOT / "data/universes"
OUT_DIR = ROOT / "data/pool-listings"
PHASES = (2, 3, 4, 5)

ARENA_SEASON_BY_PREFIX = {
    "Gladiator's ": 1,
    "Merciless Gladiator's ": 2,
    "Vengeful Gladiator's ": 3,
    "Brutal Gladiator's ": 4,
}
KAEL_TEMP_LEGENDARY_IDS = frozenset({30311, 30312, 30313, 30314, 30316, 30317, 30318})
TWO_HAND_ONLY_SPECS = frozenset({"ret"})
HAND_TYPE_TWO_HAND = 4
HEROIC_DUNGEON_PHASES = {"Magisters' Terrace": 5}
DIFFICULTY_HEROIC = 2
MIN_QUALITY = 4
MIN_SOURCELESS_ILVL = 100
# db.json zones[].expansion: 1 is the original game.
EXPANSION_VANILLA = 1

HARD = ("P-stub",)
EXPECT = (
    "E-arena",
    "E-token",
    "E-sunmote",
    "E-raid",
    "E-heroic",
    "E-rep",
    "E-recipe",
    "E-sourceless",
)
SOFT = (
    "P-later-phase",
    "P-vanilla",
    "P-rep-below-floor",
    "P-vanilla-zone",
    "P-heroic-dungeon",
    "P-normal-dungeon",
    "P-crafted-no-raid-pattern",
)
POLICY_REASONS = {
    "P-stub": "the sim implements only a TODO stub for its effect "
    "(`stubOnlyItemIds`), so its figure would be wrong",
    "P-later-phase": "every route it has (raid, faction, recipe, or its own "
    "phase) opens after this phase",
    "P-vanilla": "no source and item level below 100: vanilla gear "
    "(ticket 613, Q-613-vanilla)",
    "P-vanilla-zone": "drops only in a pre-TBC zone",
    "P-heroic-dungeon": "heroic five-man drop; only Magisters' Terrace is "
    "admitted (Stage 2 heroic ruling)",
    "P-normal-dungeon": "normal five-man drop (Stage 2 heroic ruling)",
    "P-crafted-no-raid-pattern": "crafted, and the pattern is not a raid drop "
    "(ticket 418)",
    "P-rep-below-floor": "reward of a faction `phase_raids.json` does not list, "
    "below item level 100",
    "uncovered": "no rule and no policy names it",
}


def load(path: Path) -> object:
    return json.loads(path.read_text(encoding="utf-8"))


def ilvl(it: dict) -> int:
    return int(((it.get("scalingOptions") or {}).get("0") or {}).get("ilvl") or 0)


def phase_of(it: dict) -> int:
    return int(it.get("phase") or 99)


class Inputs:
    def __init__(self) -> None:
        missing = [p for p in (DB,) if not p.is_file()]
        if missing:
            print(
                f"missing {missing[0].relative_to(ROOT)} -- run "
                "pnpm sync:wowsims:restore",
                file=sys.stderr,
            )
            sys.exit(2)
        db = load(DB)
        assert isinstance(db, dict)
        self.items = [it for it in db["items"] if isinstance(it, dict)]
        self.by_id = {int(it["id"]): it for it in self.items}
        self.zone_name = {int(z["id"]): str(z["name"]) for z in db["zones"]}
        self.zone_expansion = {
            int(z["id"]): int(z.get("expansion") or 0) for z in db["zones"]
        }
        self.eligible = {
            name: frozenset(int(i) for i in ids)
            for name, ids in load(ROOT / "data/equip-eligibility.json")["specs"].items()
        }
        self.fork_spec = {
            slug: row["forkSpec"]
            for slug, row in load(ROOT / "packages/core/src/spec-registry.json")[
                "specs"
            ].items()
        }
        self.weapon_excl = {
            s: frozenset(v)
            for s, v in load(ROOT / "data/weapon-type-exclusions.json").items()
            if isinstance(v, list)
        }
        self.set_class = {
            int(sid): int(row["classId"])
            for sid, row in load(ROOT / "data/class-restricted-sets.json")[
                "sets"
            ].items()
        }
        pr = load(ROOT / "data/phase_raids.json")
        self.raid_phase = {str(z["name"]): int(z["phase"]) for z in pr["zones"]}
        self.raid_phase_by_id = {
            int(z["zoneId"]): int(z["phase"])
            for z in pr["zones"]
            if z.get("zoneId") is not None
        }
        self.faction_phase = {
            int(r["factionId"]): int(r["phase"]) for r in pr["repFactions"]
        }
        effects = load(ROOT / "data/sim-implemented-effects.json")
        self.stub = frozenset(int(r["itemId"]) for r in effects["stubOnlyItemIds"])
        self.implemented = frozenset(
            int(i) for i in effects["implementedEffectItemIds"]
        )
        self.atlasloot = {
            int(k): [r for r in v if isinstance(r, dict)]
            for k, v in load(ROOT / "data/atlasloot_sources.json").items()
            if isinstance(v, list)
        }
        self.recipes: dict[int, dict] = {}
        for e in load(ROOT / "data/two-hop/raid-recipes.json")["entries"]:
            self.recipes[int(e["productId"])] = e
        self.tier_sets = {
            s: frozenset(int(r["setId"]) for r in rows)
            for s, rows in load(ROOT / "data/two-hop/tier-sets.json").items()
            if isinstance(rows, list)
        }
        self.sunmote_upgrades = self._sunmote_upgrades(
            load(ROOT / "data/two-hop/sunmote-pairs.json")["pairs"]
        )
        self.spec_class = {s: self._class_of(s) for s in self.fork_spec}

    def _class_of(self, spec: str) -> int:
        # The class a spec belongs to, read off its own tier pieces rather than
        # a hand map: every tier set is locked to one class in db.json.
        classes = {
            c
            for it in self.items
            if int(it.get("setId") or 0) in self.tier_sets.get(spec, ())
            for c in it.get("classAllowlist") or []
        }
        if len(classes) != 1:
            raise SystemExit(f"{spec}: tier pieces name classes {sorted(classes)}")
        return classes.pop()

    def _sunmote_upgrades(self, pairs: list) -> frozenset[int]:
        out = set()
        for p in pairs:
            base = self.by_id.get(int(p["baseId"]))
            up = self.by_id.get(int(p["upgradeId"]))
            if base is None or up is None:
                continue
            if base.get("type") != up.get("type"):
                continue
            if phase_of(base) != 5 or phase_of(up) != 5:
                continue
            if ilvl(up) < ilvl(base):
                continue
            if not any(
                self.raid_phase_by_id.get(int((s.get("drop") or {}).get("zoneId") or 0))
                for s in base.get("sources") or []
            ):
                continue
            out.add(int(p["upgradeId"]))
        return frozenset(out)

    def wearable(self, spec: str) -> list[dict]:
        ids = self.eligible[self.fork_spec[spec]]
        excl = self.weapon_excl.get(spec, frozenset())
        out = []
        for it in self.items:
            iid = int(it["id"])
            if iid not in ids or int(it.get("quality") or 0) < MIN_QUALITY:
                continue
            if iid in KAEL_TEMP_LEGENDARY_IDS:
                continue
            set_class = self.set_class.get(int(it.get("setId") or 0))
            if set_class is not None and set_class != self.spec_class[spec]:
                continue
            wt = it.get("weaponType")
            if wt and int(wt) in excl:
                continue
            if spec in TWO_HAND_ONLY_SPECS and wt and it.get("handType") != HAND_TYPE_TWO_HAND:
                continue
            out.append(it)
        return out


def arena_season(it: dict) -> int | None:
    name = str(it.get("name") or "")
    for prefix, season in ARENA_SEASON_BY_PREFIX.items():
        if name.startswith(prefix):
            return season
    return None


def classify(it: dict, spec: str, phase: int, inp: Inputs) -> str:
    iid = int(it["id"])
    if iid in inp.stub:
        return "P-stub"
    own_ok = phase_of(it) <= phase
    if arena_season(it) is not None:
        return "E-arena" if own_ok else "P-later-phase"
    db_sources = it.get("sources") or []
    drops = [s["drop"] for s in db_sources if isinstance(s.get("drop"), dict)]
    al = inp.atlasloot.get(iid, [])
    floor_ok = ilvl(it) >= MIN_SOURCELESS_ILVL or iid in inp.implemented

    if int(it.get("setId") or 0) in inp.tier_sets.get(spec, ()):
        return "E-token" if own_ok else "P-later-phase"
    if iid in inp.sunmote_upgrades:
        return "E-sunmote" if phase >= 5 else "P-later-phase"

    raid_phases = [
        inp.raid_phase_by_id[int(d["zoneId"])]
        for d in drops
        if int(d.get("zoneId") or 0) in inp.raid_phase_by_id
    ] + [
        inp.raid_phase[str(r["zone"])]
        for r in al
        if r.get("kind") == "raid" and str(r.get("zone")) in inp.raid_phase
    ]
    if any(p <= phase for p in raid_phases):
        return "E-raid"

    heroic_zones = [
        inp.zone_name.get(int(d.get("zoneId") or 0), "")
        for d in drops
        if int(d.get("difficulty") or 0) == DIFFICULTY_HEROIC
    ] + [str(r.get("dungeon")) for r in al if r.get("kind") == "heroic"]
    heroic_phases = [HEROIC_DUNGEON_PHASES[z] for z in heroic_zones if z in HEROIC_DUNGEON_PHASES]
    if own_ok and any(p <= phase for p in heroic_phases):
        return "E-heroic"

    factions = {
        int(s["rep"]["repFactionId"])
        for s in db_sources
        if isinstance(s.get("rep"), dict) and s["rep"].get("repFactionId") is not None
    } | {
        int(r["factionId"])
        for r in al
        if r.get("kind") == "rep" and r.get("factionId") is not None
    }
    listed_now = any(inp.faction_phase.get(f, 99) <= phase for f in factions)
    unlisted = any(f not in inp.faction_phase for f in factions)
    if own_ok and (listed_now or (unlisted and floor_ok)):
        return "E-rep"

    crafted = any("crafted" in s for s in db_sources)
    recipe = inp.recipes.get(iid) if crafted else None
    recipe_phases = []
    if recipe:
        recipe_phases = [
            inp.raid_phase[str(z["zone"])]
            for z in recipe.get("zones") or []
            if str(z.get("zone")) in inp.raid_phase
        ] + [
            inp.faction_phase[int(r["factionId"])]
            for r in recipe.get("reps") or []
            if r.get("factionId") is not None and int(r["factionId"]) in inp.faction_phase
        ]
    if own_ok and any(p <= phase for p in recipe_phases):
        return "E-recipe"

    sourceless = not db_sources and not al
    if sourceless and own_ok and floor_ok:
        return "E-sourceless"

    # Nothing expects it. Name why, most specific first.
    later = (
        not own_ok
        or any(p > phase for p in raid_phases + heroic_phases + recipe_phases)
        or any(inp.faction_phase.get(f, 0) > phase for f in factions)
    )
    if later:
        return "P-later-phase"
    if sourceless:
        return "P-vanilla"
    if factions and not floor_ok:
        return "P-rep-below-floor"
    drop_zones = [int(d.get("zoneId") or 0) for d in drops]
    if drop_zones and all(
        inp.zone_expansion.get(z) == EXPANSION_VANILLA for z in drop_zones
    ):
        return "P-vanilla-zone"
    if heroic_zones:
        return "P-heroic-dungeon"
    if drops and all(
        int(d.get("difficulty") or 0) != DIFFICULTY_HEROIC
        and int(d.get("zoneId") or 0) not in inp.raid_phase_by_id
        for d in drops
    ):
        return "P-normal-dungeon"
    if crafted:
        return "P-crafted-no-raid-pattern"
    return "uncovered"


def check_list(
    spec: str, phase: int, inp: Inputs, universes: Path
) -> tuple[Counter, list[dict], list[str]]:
    """Counts per rule, the absent rows, and the findings for one list."""
    doc = load(universes / f"{spec}-p{phase}.json")
    entries = {int(e["itemId"]): e for e in doc["entries"]}
    counts: Counter = Counter()
    absent: list[dict] = []
    findings: list[str] = []
    for it in inp.wearable(spec):
        iid = int(it["id"])
        rule = classify(it, spec, phase, inp)
        present = iid in entries
        counts[rule] += 1
        counts["present" if present else "absent"] += 1
        label = f"{spec}-p{phase}: {iid} {it.get('name')}"
        if rule in HARD:
            if present:
                findings.append(f"{label} is present but {rule} excludes it")
            else:
                absent.append({"id": iid, "name": it.get("name"), "rule": rule})
        elif rule in EXPECT:
            if not present:
                findings.append(f"{label} is absent but {rule} expects it")
                continue
            kinds = entries[iid].get("sources") or []
            if rule == "E-arena":
                arena = {"kind": "pvp", "via": "arena", "season": arena_season(it)}
                if not any(all(s.get(k) == v for k, v in arena.items()) for s in kinds):
                    findings.append(f"{label} wrong source: {rule} expects {arena}")
            if rule == "E-token" and not any(s.get("kind") == "token" for s in kinds):
                findings.append(f"{label} wrong kind: {rule} expects a token source")
            if rule == "E-sunmote" and not any(
                s.get("kind") == "token" and str(s.get("token", "")).startswith("Sunmote")
                for s in kinds
            ):
                findings.append(
                    f"{label} wrong kind: {rule} expects a 'Sunmote + ...' token source"
                )
        elif rule == "uncovered":
            if not present:
                findings.append(f"{label} is uncovered: absent, and no rule or policy names it")
                absent.append({"id": iid, "name": it.get("name"), "rule": rule})
        elif not present:
            absent.append({"id": iid, "name": it.get("name"), "rule": rule})
    counts["listSize"] = len(entries)
    return counts, absent, findings


def render(spec: str, phase: int, counts: Counter, absent: list[dict], pin: str) -> str:
    out: list[str] = []
    w = out.append
    w(f"# Item list completeness — {spec}, phase {phase}")
    w("")
    w("Generated by `python scripts/check_pool_completeness.py`; checked by")
    w("`pnpm pool-listings:check` in `pnpm verify`. Do not edit by hand.")
    w("The rules are in the script's docstring; this file names every wearable")
    w("epic the list does not hold, and the policy that excludes it.")
    w("")
    w(f"List: `data/universes/{spec}-p{phase}.json`, {counts['listSize']} entries.")
    w(f"Wowsims DB: {pin}.")
    w("")
    w("## Counts")
    w("")
    w("| Rule | Wearable epics |")
    w("| --- | --- |")
    for rule in HARD + EXPECT + SOFT + ("uncovered",):
        w(f"| {rule} | {counts.get(rule, 0)} |")
    w(f"| present in the list | {counts.get('present', 0)} |")
    w(f"| absent from the list | {counts.get('absent', 0)} |")
    w("")
    w("## Absent, by policy")
    for rule in HARD + SOFT + ("uncovered",):
        rows = sorted((r for r in absent if r["rule"] == rule), key=lambda r: r["id"])
        if not rows:
            continue
        w("")
        w(f"### {rule} ({len(rows)})")
        w("")
        w(POLICY_REASONS[rule] + ".")
        w("")
        for r in rows:
            w(f"- {r['id']} {r['name']}")
    w("")
    return "\n".join(out)


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--check", action="store_true")
    ap.add_argument("--report", action="store_true")
    ap.add_argument("--universes-dir", type=Path, default=UNIVERSES)
    args = ap.parse_args()
    started = time.monotonic()
    inp = Inputs()
    lock = load(WOWSIMS_LOCK)
    pin = (
        f"`{lock['repo']}` commit `{lock['commit']}`, "
        f"sha256 `{lock['files']['db.json']['sha256']}`"
    )
    all_findings: list[str] = []
    drifted: list[str] = []
    table: list[tuple[str, int, Counter]] = []
    for spec in sorted(inp.fork_spec):
        for phase in PHASES:
            counts, absent, findings = check_list(spec, phase, inp, args.universes_dir)
            table.append((spec, phase, counts))
            all_findings += findings
            rendered = render(spec, phase, counts, absent, pin)
            target = OUT_DIR / f"{spec}-p{phase}.md"
            if args.check:
                if args.universes_dir.resolve() != UNIVERSES.resolve():
                    continue
                if not target.is_file():
                    drifted.append(f"{target.relative_to(ROOT).as_posix()} does not exist")
                elif target.read_text(encoding="utf-8") != rendered:
                    drifted.append(
                        f"{target.relative_to(ROOT).as_posix()} differs from a fresh regeneration"
                    )
            elif not args.report:
                OUT_DIR.mkdir(parents=True, exist_ok=True)
                target.write_text(rendered, encoding="utf-8", newline="\n")
    if not args.check and not args.report:
        expected = {f"{s}-p{p}.md" for s, p, _ in table}
        for stale in OUT_DIR.glob("*.md"):
            if stale.name not in expected:
                stale.unlink()
        print(f"wrote {len(table)} listings to {OUT_DIR.relative_to(ROOT).as_posix()}")
    if args.report:
        cols = HARD + EXPECT + SOFT + ("uncovered",)
        print("| list | size | " + " | ".join(cols) + " |")
        print("| --- | --- | " + " | ".join("---" for _ in cols) + " |")
        for spec, phase, c in table:
            print(
                f"| {spec}-p{phase} | {c['listSize']} | "
                + " | ".join(str(c.get(k, 0)) for k in cols)
                + " |"
            )
    for f in all_findings:
        print(f"  {f}", file=sys.stderr)
    for d in drifted:
        print(f"  {d}", file=sys.stderr)
    elapsed = time.monotonic() - started
    status = "ok" if not all_findings and not drifted else "FAIL"
    print(
        f"pool-completeness: {status}: {len(table)} lists, "
        f"{len(all_findings)} findings, {len(drifted)} drifted listings, "
        f"{elapsed:.1f} s"
    )
    if drifted:
        print(
            "Regenerate with `python scripts/check_pool_completeness.py` and read "
            "the diff before committing.",
            file=sys.stderr,
        )
    return 1 if all_findings or drifted else 0


if __name__ == "__main__":
    raise SystemExit(main())
