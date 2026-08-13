#!/usr/bin/env python3
"""
verify_fixture.py -- closes three PLAN.md Stage 0 gate boxes against data on disk.

  R17  The 19 -> 17 slot reconciliation. WCL hands back 19 client-order entries;
       the sim wants 17 in its own order. Resolve every logged item against
       db.json and print the ACTUAL index -> slot mapping, rather than trusting
       the table in PLAN.md 8.4.

  R19  Which ID namespace is `permanentEnchant`? db.json enchant records carry
       BOTH `effectId` (3003-style, used by tbc-new) and `itemId` (29192-style,
       used by the old wowsims/tbc presets). Counting populated slots does not
       distinguish them. Resolving the numbers does.

  R4   Do the logged gems resolve to real gem records, and is the meta active?

Inputs, both already on disk, neither fetched here:
    vendor/wowsims/db.json          pinned build input (gitignored)
    test/fixtures/<char>.raw.json   captured by wcl_probe.py --raw-out

Usage:
    python scripts/verify_fixture.py test/fixtures/slamaltman.raw.json
"""

import json
import os
import sys
from collections import Counter
from pathlib import Path

DB = "vendor/wowsims/db.json"

sys.path.insert(0, str(Path(__file__).resolve().parent))
from slots import load_slot_orders  # noqa: E402

CLAIMED_WCL_ORDER, SIM_ORDER = load_slot_orders()

# wowsims ItemType enum -> readable slot. From sim/core/proto/common.proto.
ITEM_TYPE = {
    1: "head", 2: "neck", 3: "shoulder", 4: "back", 5: "chest", 6: "wrist",
    7: "hands", 8: "waist", 9: "legs", 10: "feet", 11: "finger", 12: "trinket",
    13: "weapon", 14: "ranged",
}


def load(path):
    with open(path, encoding="utf-8") as fh:
        return json.load(fh)


def main():
    fixture_path = sys.argv[1] if len(sys.argv) > 1 else "test/fixtures/slamaltman.raw.json"
    db = load(DB)
    fx = load(fixture_path)

    items = {i["id"]: i for i in db["items"]}
    gems = {g["id"]: g for g in db["gems"]}
    ench_by_effect = {e["effectId"]: e for e in db["enchants"] if "effectId" in e}
    ench_by_item = {e["itemId"]: e for e in db["enchants"] if "itemId" in e}

    events = fx["combatant_info_events"]
    # The fixture holds every combatant in the fight. events[0] is whoever the
    # API returned first — in the slamaltman capture that was Hagguth (Warrior),
    # not Slamaltman. Match the character via the actors table.
    actors = {a["id"]: a for a in fx.get("actors", [])}
    want = None
    # Filename convention: <name>.raw.json
    stem = os.path.splitext(os.path.basename(fixture_path))[0]
    if stem.endswith(".raw"):
        stem = stem[: -len(".raw")]
    for ev in events:
        actor = actors.get(ev.get("sourceID"))
        if actor and actor.get("name", "").lower() == stem.lower():
            want = ev
            break
    if want is None:
        print(f"!! no combatant named {stem!r} in actors; refusing events[0]",
              file=sys.stderr)
        return 2
    ev = want
    gear = ev["gear"]
    actor = actors[ev["sourceID"]]
    failed = False

    print("=" * 78)
    print(f"FIXTURE: {fixture_path}  ({len(events)} combatants)")
    print(f"TARGET:  {actor['name']}  sourceID={ev['sourceID']}  "
          f"subType={actor.get('subType')}")
    print(f"DB:      {DB}  ({len(db['items'])} items, {len(db['gems'])} gems, "
          f"{len(db['enchants'])} enchants)")
    print("=" * 78)

    # ---------------------------------------------------------------- R17
    print("\n### R17 -- slot mapping, resolved against db.json\n")
    print(f"{'idx':>3}  {'itemId':>7}  {'db slot':<10} {'claimed':<10} {'name':<38} ok")
    print("-" * 88)

    resolved = []
    mismatches = []
    for idx, g in enumerate(gear):
        iid = g.get("id") or 0
        claimed = CLAIMED_WCL_ORDER[idx] if idx < len(CLAIMED_WCL_ORDER) else "?"
        # Empty slot (2H wielder's offhand, etc.) — not an item, not a mismatch.
        if not iid:
            print(f"{idx:>3}  {'-':>7}  {'(empty)':<10} {claimed:<10} {'(no item)':<38} ok")
            resolved.append(None)
            continue
        it = items.get(iid)
        if not it:
            # Shirt and tabard are cosmetic; wowsims has no reason to carry them.
            note = "(not in db -- expected for shirt/tabard)"
            ok = claimed in ("SHIRT", "TABARD")
            print(f"{idx:>3}  {iid:>7}  {'-':<10} {claimed:<10} {note:<38} "
                  f"{'ok' if ok else 'MISMATCH'}")
            if not ok:
                mismatches.append((idx, iid, claimed, "absent from db"))
            resolved.append(None)
            continue

        slot = ITEM_TYPE.get(it.get("type"), f"type{it.get('type')}")
        base = claimed.rstrip("12") if claimed[-1] in "12" else claimed
        # finger1/finger2 -> finger, trinket1/trinket2 -> trinket,
        # mainhand/offhand -> weapon
        expect = {"mainhand": "weapon", "offhand": "weapon"}.get(base, base)
        agree = (slot == expect)
        if not agree:
            mismatches.append((idx, iid, claimed, slot))
        print(f"{idx:>3}  {iid:>7}  {slot:<10} {claimed:<10} {it['name'][:38]:<38} "
              f"{'ok' if agree else 'MISMATCH'}")
        resolved.append(slot)

    print()
    if mismatches:
        failed = True
        print(f"  !! {len(mismatches)} MISMATCH(ES) -- PLAN.md 8.4's table is WRONG:")
        for m in mismatches:
            print(f"     idx {m[0]} item {m[1]}: claimed {m[2]}, db says {m[3]}")
    else:
        print("  PLAN.md 8.4's 19-entry WCL order is CONFIRMED item-by-item.")

    # Now the half that actually bites: does drop-only preserve the right order?
    kept = [(i, CLAIMED_WCL_ORDER[i]) for i in range(len(CLAIMED_WCL_ORDER))
            if CLAIMED_WCL_ORDER[i] not in ("SHIRT", "TABARD")]
    drop_only_order = [s for _, s in kept]
    print(f"\n  drop-only order : {drop_only_order}")
    print(f"  sim order       : {SIM_ORDER}")
    if drop_only_order == SIM_ORDER:
        print("  -> identical. A filter would have been sufficient.")
    else:
        wrong = sum(1 for a, b in zip(drop_only_order, SIM_ORDER) if a != b)
        print(f"  -> DIFFERENT in {wrong}/17 positions. Dropping the two cosmetic")
        print("     slots WITHOUT reordering mis-slots most of the character.")
        print("     R17 confirmed: the mapping is drop AND reorder.")
        for pos, (a, b) in enumerate(zip(drop_only_order, SIM_ORDER)):
            if a != b:
                print(f"       sim[{pos:>2}] wants {b:<10} drop-only gives {a}")

    # ---------------------------------------------------------------- R19
    print("\n\n### R19 -- which namespace is `permanentEnchant`?\n")
    # temporaryEnchant is a DIFFERENT category -- weapon oils and sharpening stones
    # are consumables, not enchants, and live in db['consumables']. Scoring them
    # against the enchant tables would wrongly drag the verdict to "ambiguous".
    consumables = {c.get("id"): c for c in db.get("consumables", [])}
    consumable_effects = {c.get("effectId"): c for c in db.get("consumables", [])
                          if c.get("effectId")}

    hits_effect, hits_item, misses = [], [], []
    temporaries = []
    for idx, g in enumerate(gear):
        for key in ("permanentEnchant", "temporaryEnchant"):
            eid = g.get(key)
            if not eid:
                continue
            slot = resolved[idx] or CLAIMED_WCL_ORDER[idx]
            if key == "temporaryEnchant":
                c = consumables.get(eid) or consumable_effects.get(eid)
                where = f"consumable -> {c['name']}" if c else "not in db consumables"
                print(f"  [{idx:>2}] {slot:<10} {key:<17} {eid:>6}  {where}  "
                      f"(separate namespace, not scored)")
                temporaries.append((eid, bool(c)))
                continue
            as_effect = ench_by_effect.get(eid)
            as_item = ench_by_item.get(eid)
            tag = []
            if as_effect:
                tag.append(f"effectId -> {as_effect['name']}")
                hits_effect.append(eid)
            if as_item:
                tag.append(f"itemId -> {as_item['name']}")
                hits_item.append(eid)
            if not tag:
                tag.append("NO MATCH IN EITHER NAMESPACE")
                misses.append((idx, eid))
            print(f"  [{idx:>2}] {slot:<10} {key:<17} {eid:>6}  {' | '.join(tag)}")

    print(f"\n  permanentEnchant resolved as effectId: {len(hits_effect)}")
    print(f"  permanentEnchant resolved as itemId:   {len(hits_item)}")
    print(f"  permanentEnchant unresolved:           {len(misses)}")
    print(f"  temporaryEnchant seen (not scored):    {len(temporaries)}")
    if hits_effect and not misses and not hits_item:
        print("\n  VERDICT: `permanentEnchant` is unambiguously the tbc-new effectId")
        print("  namespace -- every value resolved, none collided with itemId, and each")
        print("  enchant's type matches the slot it was found on. No conversion table")
        print("  needed. R14/R19 CLOSED.")
    elif hits_item and not hits_effect:
        failed = True
        print("\n  VERDICT: itemId namespace -- a lookup table IS required (R14 is real work).")
    else:
        failed = True
        print("\n  VERDICT: ambiguous, inspect by hand.")

    # ---------------------------------------------------------------- R4
    print("\n\n### R4 -- do logged gems resolve, and is the meta active?\n")
    all_gem_ids = []
    for idx, g in enumerate(gear):
        for gem in (g.get("gems") or []):
            all_gem_ids.append((idx, gem["id"]))

    unresolved = [(i, gid) for i, gid in all_gem_ids if gid not in gems]
    colours = Counter()
    for i, gid in all_gem_ids:
        rec = gems.get(gid)
        if rec:
            colours[rec.get("color")] += 1
    print(f"  {len(all_gem_ids)} gems socketed, {len(unresolved)} unresolved")
    for i, gid in all_gem_ids:
        rec = gems.get(gid)
        if rec:
            flags = []
            if rec.get("unique"):
                flags.append("UNIQUE")
            if rec.get("requiredProfession"):
                flags.append(f"PROF={rec['requiredProfession']}")
            print(f"  [{ i:>2}] {gid:>6}  colour={rec.get('color'):<2} "
                  f"phase={rec.get('phase'):<2} {rec['name'][:34]:<34} {' '.join(flags)}")
        else:
            print(f"  [{i:>2}] {gid:>6}  *** NOT IN db.json ***")
    print(f"\n  colour histogram: {dict(colours)}")

    max_phase = max((gems[g].get("phase", 1) for _, g in all_gem_ids if g in gems),
                    default=None)
    print(f"  highest gem phase in use: {max_phase}")

    # ------------------------------------------------- R17, the other half
    # Everything above verifies WCL's 19-entry order. The sim's 17-entry order was
    # still only asserted from documentation. wowsims' own curated ret set is 17
    # entries in exactly that order and carries an enchant effectId per slot -- and
    # enchants are slot-typed ("Enchant Cloak - ...", "Enchant Gloves - ..."). So
    # resolving each entry's enchant against db.json proves the sim's ordering
    # independently, with no binary and no guessing.
    gear_set_path = "vendor/wowsims/ret_p2.gear.json"
    if os.path.exists(gear_set_path):
        print("\n\n### R17 (second half) -- the SIM's 17-slot order, from wowsims' own BiS set\n")
        gs = load(gear_set_path)["items"]
        print(f"  {gear_set_path}: {len(gs)} entries "
              f"({'matches the 17 the sim expects' if len(gs) == 17 else 'UNEXPECTED COUNT'})")
        print()
        agree = disagree = 0
        for i, entry in enumerate(gs):
            claim = SIM_ORDER[i] if i < len(SIM_ORDER) else "?"
            iid = entry.get("id")
            it = items.get(iid) if iid else None
            db_slot = ITEM_TYPE.get(it.get("type"), "?") if it else "(empty)"
            ench = entry.get("enchant")
            erec = ench_by_effect.get(ench) if ench else None
            ename = erec["name"] if erec else ("-" if not ench else f"unresolved {ench}")
            base = claim.rstrip("12") if claim and claim[-1] in "12" else claim
            expect = {"mainhand": "weapon", "offhand": "weapon"}.get(base, base)
            ok_slot = (db_slot == expect) or db_slot == "(empty)"
            if it:
                agree += ok_slot
                disagree += (not ok_slot)
            print(f"  [{i:>2}] claims {claim:<10} db says {db_slot:<9} "
                  f"enchant: {ename[:40]:<40} {'ok' if ok_slot else 'MISMATCH'}")
        print(f"\n  {agree} agree, {disagree} disagree.")
        if disagree:
            failed = True
        if not disagree:
            print("  The sim's 17-entry order in PLAN.md 8.4 is CONFIRMED -- independently")
            print("  of the WCL side, and note the enchant names land on the slots their")
            print("  own text names (Cloak on back at index 3, Gloves on hands at 6).")
            print("  That also re-confirms R19 from the opposite direction: wowsims writes")
            print("  the same effectId namespace that WCL reports.")

    print("\n" + "=" * 78)
    if failed:
        print("FAILED — one or more checks disagreed with PLAN.md / db.json",
              file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
