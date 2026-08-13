#!/usr/bin/env python3
"""
wcl_probe.py — Stage 0 validation probe for the TBC gear priority project.

Answers the open questions from the plan:
  1. Does auth work against the Classic endpoint?
  2. What does the points budget look like, and what do these queries cost?
  3. What fields does Character actually expose? (introspected, not assumed)
  4. What are the current TBC zone and encounter IDs?
  5. Does CombatantInfo carry gear? With enchant IDs? With gem IDs?
  6. Is talentPoints present, and what shape?
  7. What are the real specName strings for TBC?
  8. Can we get form uptime for the feral bear/cat split?
  9. Is RACE retrievable? (Draenei Heroic Presence moves the hit cap ~16 rating,
     so a preset race differing from the player's shifts every hit-adjacent
     ranking. PLAN.md review R8.)

IMPORTANT: pass --raw-out to persist the full CombatantInfo event. The summary
written by --json-out is NOT a fixture -- it records "enchants: present (10/19)"
and throws the actual payload away, which is how the first probe run left the
slot mapping (R17) and the enchant ID namespace (R19) unverifiable after the
fact. The raw dump is the committed test fixture the plan depends on.

Stdlib only. No pip install needed.

Usage:
    python wcl_probe.py --name Yourchar --server-slug your-realm --region US
    python wcl_probe.py --name Yourchar --server-slug your-realm --region US --spec Retribution
    python wcl_probe.py --report-code aBcDeFgH        # skip character lookup, probe a known report

Credentials are read from WCL_CLIENT_ID / WCL_CLIENT_SECRET in the environment,
or from a .env file in the current directory (or --env-file).
"""

import argparse
import base64
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request

TOKEN_URLS = [
    "https://www.warcraftlogs.com/oauth/token",
    "https://classic.warcraftlogs.com/oauth/token",
]
API_URLS = [
    "https://classic.warcraftlogs.com/api/v2/client",
    "https://www.warcraftlogs.com/api/v2/client",
]

# ---------------------------------------------------------------- utilities

class Probe:
    def __init__(self):
        self.token = None
        self.api_url = None
        self.points_start = None
        self.findings = {}
        self.raw = {}          # full payloads, for --raw-out. THIS is the fixture.

    def note(self, key, value):
        self.findings[key] = value


def load_env(path):
    """Minimal .env parser. Does not overwrite real environment variables."""
    if not os.path.exists(path):
        return
    with open(path) as fh:
        for line in fh:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, val = line.partition("=")
            key = key.strip()
            val = val.strip().strip('"').strip("'")
            if key and key not in os.environ:
                os.environ[key] = val


def post(url, data=None, headers=None, form=False):
    headers = headers or {}
    if form:
        body = urllib.parse.urlencode(data).encode()
        headers.setdefault("Content-Type", "application/x-www-form-urlencoded")
    else:
        body = json.dumps(data).encode()
        headers.setdefault("Content-Type", "application/json")
    req = urllib.request.Request(url, data=body, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=45) as resp:
            return json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        detail = e.read().decode()[:400]
        raise RuntimeError(f"HTTP {e.code} from {url}: {detail}") from None


def hr(title):
    print(f"\n{'=' * 72}\n{title}\n{'=' * 72}")


def ok(msg):
    print(f"  [OK]    {msg}")


def bad(msg):
    print(f"  [FAIL]  {msg}")


def info(msg):
    print(f"  [INFO]  {msg}")


def warn(msg):
    print(f"  [WARN]  {msg}")


# ---------------------------------------------------------------- auth

def authenticate(p, client_id, client_secret):
    hr("1. AUTHENTICATION")
    basic = base64.b64encode(f"{client_id}:{client_secret}".encode()).decode()
    last_err = None
    for turl in TOKEN_URLS:
        try:
            res = post(turl, {"grant_type": "client_credentials"},
                       {"Authorization": f"Basic {basic}"}, form=True)
            p.token = res["access_token"]
            ok(f"token acquired from {turl}")
            info(f"expires_in: {res.get('expires_in')} seconds")
            p.note("token_url", turl)
            return
        except Exception as e:
            last_err = e
            warn(f"{turl} failed: {e}")
    bad("could not authenticate against any token endpoint")
    raise SystemExit(f"last error: {last_err}")


def gql(p, query, variables=None, quiet=False):
    payload = {"query": query}
    if variables:
        payload["variables"] = variables
    headers = {"Authorization": f"Bearer {p.token}"}

    urls = [p.api_url] if p.api_url else API_URLS
    last_err = None
    for url in urls:
        try:
            res = post(url, payload, headers)
        except Exception as e:
            last_err = e
            continue
        if "errors" in res and not res.get("data"):
            last_err = RuntimeError(json.dumps(res["errors"])[:400])
            continue
        if p.api_url is None:
            p.api_url = url
            ok(f"GraphQL endpoint confirmed: {url}")
        if "errors" in res and not quiet:
            warn(f"partial errors: {json.dumps(res['errors'])[:300]}")
        return res.get("data") or {}
    raise RuntimeError(f"all endpoints failed. last: {last_err}")


# ---------------------------------------------------------------- probes

def probe_rate_limit(p, label=""):
    data = gql(p, "{ rateLimitData { limitPerHour pointsSpentThisHour pointsResetIn } }")
    rl = data.get("rateLimitData") or {}
    spent = rl.get("pointsSpentThisHour")
    if p.points_start is None:
        hr("2. RATE LIMIT BUDGET")
        ok(f"limitPerHour:        {rl.get('limitPerHour')}")
        ok(f"pointsSpentThisHour: {spent}")
        ok(f"pointsResetIn:       {rl.get('pointsResetIn')} seconds")
        p.points_start = spent
        p.note("limit_per_hour", rl.get("limitPerHour"))
    elif spent is not None:
        info(f"points spent so far this run{label}: ~{spent - p.points_start:.2f}")
    return spent


def probe_schema(p):
    hr("3. SCHEMA INTROSPECTION (what actually exists, not what docs claim)")

    q = """
    { __type(name: "Character") { fields { name args { name type { name kind
        ofType { name } } } type { name kind ofType { name } } } } }
    """
    data = gql(p, q)
    t = data.get("__type")
    if not t:
        bad("could not introspect Character type")
    else:
        names = [f["name"] for f in t["fields"]]
        ok(f"Character fields ({len(names)}): {', '.join(sorted(names))}")
        p.note("character_fields", names)

        for f in t["fields"]:
            if f["name"] in ("encounterRankings", "zoneRankings", "recentReports"):
                args = ", ".join(a["name"] for a in f["args"])
                info(f"  {f['name']}({args})")

        for critical in ("recentReports", "encounterRankings", "zoneRankings"):
            if critical in names:
                ok(f"'{critical}' is available")
            else:
                warn(f"'{critical}' NOT present on Character")

    for enum_name in ("EventDataType", "TableDataType"):
        d = gql(p, '{ __type(name: "%s") { enumValues { name } } }' % enum_name)
        et = d.get("__type")
        if et:
            vals = [v["name"] for v in et["enumValues"]]
            ok(f"{enum_name}: {', '.join(vals)}")
            p.note(enum_name, vals)
            if enum_name == "EventDataType":
                for need in ("CombatantInfo", "Buffs", "Casts"):
                    (ok if need in vals else bad)(f"  {need} {'present' if need in vals else 'MISSING'}")


def probe_zones(p):
    hr("4. TBC ZONE AND ENCOUNTER IDS")
    q = "{ worldData { zones { id name encounters { id name } } } }"
    data = gql(p, q)
    zones = ((data.get("worldData") or {}).get("zones")) or []
    if not zones:
        bad("no zones returned")
        return
    ok(f"{len(zones)} zones visible on this endpoint")
    keywords = ("karazhan", "gruul", "magtheridon", "serpentshrine", "tempest",
                "eye", "hyjal", "black temple", "zul'aman", "zul'gurub",
                "sunwell", "outland", "tier")
    hits = [z for z in zones if any(k in (z["name"] or "").lower() for k in keywords)]
    for z in hits:
        encs = z.get("encounters") or []
        print(f"    zone {z['id']:>5}  {z['name']}")
        for e in encs[:12]:
            print(f"           enc {e['id']:>5}  {e['name']}")
    if not hits:
        warn("no TBC-looking zones matched; listing first 15 raw")
        for z in zones[:15]:
            print(f"    zone {z['id']:>5}  {z['name']}")
    p.note("tbc_zones", [(z["id"], z["name"]) for z in hits])


def probe_character(p, name, server, region, spec):
    hr("5. CHARACTER LOOKUP AND RECENT REPORTS")
    fields = p.findings.get("character_fields", [])

    inner = "id name classID"
    if "recentReports" in fields:
        inner += """
        recentReports(limit: 10) {
          data { code startTime endTime zone { id name } }
        }"""

    q = """
    query($n:String!,$s:String!,$r:String!){
      characterData { character(name:$n, serverSlug:$s, serverRegion:$r) { %s } }
    }""" % inner

    data = gql(p, q, {"n": name, "s": server, "r": region})
    ch = ((data.get("characterData") or {}).get("character"))
    if not ch:
        bad("character not found. Check name spelling, server slug (lowercase, "
            "hyphenated) and region (US/EU).")
        return None
    ok(f"found: {ch['name']} (id {ch['id']}, classID {ch.get('classID')})")

    reports = (((ch.get("recentReports") or {}).get("data")) or [])
    if reports:
        ok(f"{len(reports)} recent reports")
        for r in reports[:5]:
            zn = (r.get("zone") or {}).get("name")
            print(f"    {r['code']}  zone={zn}  start={r.get('startTime')}")
        p.note("recent_reports", [r["code"] for r in reports])
    else:
        warn("no recentReports returned (may not exist on this schema)")

    if spec and "encounterRankings" in fields:
        info(f"NOTE: encounterRankings needs an encounterID. Use one from section 4, "
             f"then query with specName='{spec}' and includeCombatantInfo:true.")

    return reports[0]["code"] if reports else None


def probe_report(p, code):
    hr(f"6. REPORT PROBE — {code}")
    q = """
    query($c:String!){
      reportData { report(code:$c) {
        code startTime endTime
        zone { id name }
        fights { id name encounterID kill startTime endTime difficulty }
        masterData { actors(type:"Player") { id name subType server } }
      } }
    }"""
    data = gql(p, q, {"c": code})
    rep = ((data.get("reportData") or {}).get("report"))
    if not rep:
        bad("report not found or not public")
        return None
    zn = (rep.get("zone") or {}).get("name")
    ok(f"report loaded. zone={zn}")

    fights = rep.get("fights") or []
    boss = [f for f in fights if f.get("encounterID")]
    kills = [f for f in boss if f.get("kill")]
    ok(f"{len(fights)} fights, {len(boss)} boss fights, {len(kills)} kills")

    actors = ((rep.get("masterData") or {}).get("actors")) or []
    specs = sorted({a.get("subType") for a in actors if a.get("subType")})
    ok(f"{len(actors)} players")
    ok(f"SPEC STRINGS SEEN (this is the answer to 'what are TBC specName values'):")
    print(f"    {', '.join(specs)}")
    p.note("spec_strings", specs)

    target = (kills or boss or fights)
    if not target:
        bad("no fights to probe")
        return None
    return rep, target[0]


def probe_combatant_info(p, code, fight):
    hr("7. COMBATANTINFO — GEAR, ENCHANTS, GEMS, TALENTS")
    print(f"  probing fight {fight['id']} '{fight.get('name')}' "
          f"({fight['startTime']}..{fight['endTime']})")

    q = """
    query($c:String!,$s:Float!,$e:Float!,$f:[Int]){
      reportData { report(code:$c) {
        events(dataType: CombatantInfo, startTime:$s, endTime:$e,
               fightIDs:$f, limit: 100) { data }
      } }
    }"""
    data = gql(p, q, {"c": code, "s": float(fight["startTime"]),
                      "e": float(fight["endTime"]), "f": [fight["id"]]})
    events = ((((data.get("reportData") or {}).get("report")) or {})
              .get("events") or {}).get("data") or []

    if not events:
        bad("NO CombatantInfo events returned.")
        bad("=> This is the failure mode the plan flagged. Gear cannot be read "
            "from this log via CombatantInfo. Fall back to encounterRankings "
            "with includeCombatantInfo, and re-run this probe on another log.")
        p.note("combatantinfo", "ABSENT")
        return

    ok(f"{len(events)} CombatantInfo events")
    ev = events[0]
    ok(f"top-level keys: {', '.join(sorted(ev.keys()))}")

    # Keep every event, not just the first -- the fixture is more useful with the
    # whole raid in it, and it costs nothing extra since we already paid for the query.
    p.raw["combatant_info_events"] = events
    p.raw["fight"] = fight

    # --- race (review R8)
    race_keys = [k for k in ev if "race" in k.lower()]
    if race_keys:
        ok(f"RACE: found key(s) {race_keys} -> {[ev[k] for k in race_keys]}")
        p.note("race", {k: ev[k] for k in race_keys})
    else:
        warn("RACE: not on the CombatantInfo event; trying Character.gameData "
             "and the actor list instead (see section 9)")
        p.note("race", "ABSENT-from-combatantinfo")

    # --- talents
    if "talentPoints" in ev:
        ok(f"talentPoints PRESENT: {ev['talentPoints']}  <- per-tree distribution")
        p.note("talentPoints", ev["talentPoints"])
    elif "talents" in ev:
        warn(f"'talents' present instead of talentPoints: "
             f"{json.dumps(ev['talents'])[:200]}")
        p.note("talentPoints", "talents-field")
    else:
        warn("no talent data on this event")
        p.note("talentPoints", "ABSENT")

    # --- gear
    gear = ev.get("gear")
    if not gear:
        bad("NO 'gear' key. Gear is not available from this log.")
        p.note("gear", "ABSENT")
        return

    ok(f"gear array present, {len(gear)} entries")

    # Print EVERY entry with its index. The index is the whole point: the sim wants
    # 17 slots in its own order, WCL gives 19 in the client's order, and the mapping
    # between them is drop-two-AND-reorder (PLAN.md 8.4, review R17). Verifying that
    # needs the positions, not a sample.
    print("\n  --- RAW GEAR ARRAY, INDEXED (verbatim) ---")
    for i, g in enumerate(gear):
        print(f"    [{i:>2}] {json.dumps(g)}")

    keys = set()
    for g in gear:
        if isinstance(g, dict):
            keys.update(g.keys())
    ok(f"union of gear entry keys: {', '.join(sorted(keys))}")

    # THE critical question
    print()
    enchant_keys = [k for k in keys if "enchant" in k.lower()]
    gem_keys = [k for k in keys if "gem" in k.lower()]

    if enchant_keys:
        populated = sum(1 for g in gear if isinstance(g, dict)
                        and any(g.get(k) for k in enchant_keys))
        ok(f"ENCHANTS: key(s) {enchant_keys}, populated on {populated}/{len(gear)} slots")
        p.note("enchants", f"present ({populated}/{len(gear)})")
    else:
        bad("ENCHANTS: no enchant key found -> must substitute from presets")
        p.note("enchants", "ABSENT")

    if gem_keys:
        populated = sum(1 for g in gear if isinstance(g, dict)
                        and g.get(gem_keys[0]))
        ok(f"GEMS: key(s) {gem_keys}, populated on {populated}/{len(gear)} slots")
        for g in gear:
            if isinstance(g, dict) and g.get(gem_keys[0]):
                print(f"    example gem payload: {json.dumps(g[gem_keys[0]])}")
                break
        p.note("gems", f"present ({populated}/{len(gear)})")
    else:
        bad("GEMS: no gem key found -> meta gem state unknowable, must synthesize")
        p.note("gems", "ABSENT")

    info(f"slot count is {len(gear)} (sim expects 17; confirm ordering by hand)")


def probe_race(p, name, server, region, code, fight):
    """Review R8. Draenei Heroic Presence grants +1% party hit, worth ~16 rating of
    effective hit cap. Ret's dominant gearing constraint IS the hit cap, so if the
    preset's race differs from the player's, every hit-adjacent ranking shifts.
    Find out where race actually lives before the normalize stage assumes it."""
    hr("9. RACE (review R8 -- moves the effective hit cap)")

    # 1. Is there a race field on the actor list?
    d = gql(p, '{ __type(name: "ReportActor") { fields { name } } }', quiet=True)
    t = d.get("__type")
    if t:
        fields = [f["name"] for f in t["fields"]]
        info(f"ReportActor fields: {', '.join(sorted(fields))}")
        if any("race" in f.lower() for f in fields):
            ok("ReportActor exposes a race field")
        else:
            warn("no race field on ReportActor")

    # 2. Character.gameData is an untyped JSON blob and is the most likely home.
    if name and server:
        q = """
        query($n:String!,$s:String!,$r:String!){
          characterData { character(name:$n, serverSlug:$s, serverRegion:$r) {
            gameData
          } }
        }"""
        try:
            data = gql(p, q, {"n": name, "s": server, "r": region})
            gd = ((data.get("characterData") or {}).get("character") or {}).get("gameData")
            if gd:
                ok(f"Character.gameData returned: {json.dumps(gd)[:400]}")
                p.raw["gameData"] = gd
                blob = json.dumps(gd).lower()
                if "race" in blob:
                    ok("  -> 'race' appears in gameData. This is the source to use.")
                    p.note("race_source", "Character.gameData")
                else:
                    warn("  -> no 'race' key in gameData")
            else:
                warn("Character.gameData empty or unavailable")
        except Exception as e:
            bad(f"gameData query failed: {e}")

    # 3. The one that actually matters.
    #
    # We do not need race. We need to know whether this player benefited from the
    # +1% hit that moves their cap -- and in TBC that is Draenei HEROIC PRESENCE,
    # which is a PARTY-WIDE aura. So a player who is not Draenei but is grouped with
    # one still gets it, and reading race would give the WRONG answer for them in
    # both directions. The buff is the ground truth; race is a proxy for it.
    #
    # Same Buffs table already confirmed for the feral form split, so no new machinery.
    print()
    info("checking the Buffs table for hit-relevant auras and racials")
    q = """
    query($c:String!,$s:Float!,$e:Float!,$f:[Int]){
      reportData { report(code:$c) {
        table(dataType: Buffs, startTime:$s, endTime:$e, fightIDs:$f)
      } }
    }"""
    try:
        data = gql(p, q, {"c": code, "s": float(fight["startTime"]),
                          "e": float(fight["endTime"]), "f": [fight["id"]]})
    except Exception as e:
        bad(f"Buffs table query failed: {e}")
        return
    tbl = (((data.get("reportData") or {}).get("report")) or {}).get("table")
    if not tbl:
        warn("empty Buffs table")
        return
    p.raw["buffs_table"] = tbl
    blob = json.dumps(tbl)

    if "Heroic Presence" in blob:
        ok("FOUND 'Heroic Presence' -> the +1% hit aura is visible per-player in "
           "the Buffs table. This is a better signal than race (R8).")
        p.note("heroic_presence", "present-in-buffs-table")
    else:
        warn("'Heroic Presence' not in this fight's buff table -- either no Draenei "
             "in the party, or the aura is not tracked. Needs a Draenei fight to "
             "distinguish those two.")
        p.note("heroic_presence", "absent-this-fight")

    racials = ("Blood Fury", "Berserking", "Stoneform", "Shadowmeld",
               "Will of the Forsaken", "War Stomp", "Arcane Torrent", "Perception",
               "Gift of the Naaru")
    seen = [r for r in racials if r in blob]
    if seen:
        ok(f"racial abilities visible in buff data: {', '.join(seen)}")
        p.note("racials_seen", seen)
    else:
        info("no racial abilities in this fight's buff table (they are mostly "
             "on-use, so the Casts table is the better place to look)")


def probe_buff_uptime(p, code, fight):
    hr("8. BUFF UPTIME (the feral bear/cat split)")
    q = """
    query($c:String!,$s:Float!,$e:Float!,$f:[Int]){
      reportData { report(code:$c) {
        table(dataType: Buffs, startTime:$s, endTime:$e, fightIDs:$f)
      } }
    }"""
    try:
        data = gql(p, q, {"c": code, "s": float(fight["startTime"]),
                          "e": float(fight["endTime"]), "f": [fight["id"]]})
    except Exception as e:
        bad(f"Buffs table query failed: {e}")
        return
    tbl = (((data.get("reportData") or {}).get("report")) or {}).get("table")
    if not tbl:
        warn("empty Buffs table")
        return
    ok("Buffs table returned")
    blob = json.dumps(tbl)
    for form in ("Dire Bear Form", "Bear Form", "Cat Form", "Moonkin"):
        if form in blob:
            ok(f"  found '{form}' in buff data -> form uptime is derivable")
    info(f"table payload size: {len(blob)} chars (inspect shape before parsing)")


# ---------------------------------------------------------------- main

def main():
    ap = argparse.ArgumentParser(description="Stage 0 Warcraft Logs probe")
    ap.add_argument("--name")
    ap.add_argument("--server-slug", help="lowercase, hyphenated, e.g. 'faerlina'")
    ap.add_argument("--region", default="US", help="US, EU, KR, TW, CN")
    ap.add_argument("--spec", help="e.g. Retribution, Feral")
    ap.add_argument("--report-code", help="probe this report directly")
    ap.add_argument("--env-file", default=".env")
    ap.add_argument("--json-out", help="write findings SUMMARY to this path (not a fixture)")
    ap.add_argument("--raw-out", help="write FULL payloads here. This is the test "
                                      "fixture -- always pass it.")
    args = ap.parse_args()

    load_env(args.env_file)
    cid = os.environ.get("WCL_CLIENT_ID")
    secret = os.environ.get("WCL_CLIENT_SECRET")
    if not cid or not secret:
        raise SystemExit(
            "Missing WCL_CLIENT_ID / WCL_CLIENT_SECRET.\n"
            f"Looked in environment and {args.env_file}.\n"
            "The client must be a CONFIDENTIAL client, not public."
        )

    p = Probe()
    authenticate(p, cid, secret)
    probe_rate_limit(p)
    probe_schema(p)
    probe_zones(p)

    code = args.report_code
    if not code:
        if not (args.name and args.server_slug):
            warn("\nNo --report-code and no --name/--server-slug given. "
                 "Stopping after schema probes.")
            code = None
        else:
            code = probe_character(p, args.name, args.server_slug,
                                   args.region, args.spec)

    if code:
        result = probe_report(p, code)
        if result:
            rep, fight = result
            p.raw["report_code"] = code
            p.raw["actors"] = ((rep.get("masterData") or {}).get("actors")) or []
            probe_combatant_info(p, code, fight)
            probe_buff_uptime(p, code, fight)
            probe_race(p, args.name, args.server_slug, args.region, code, fight)

    hr("9. VERDICT")
    checks = [
        ("Auth against Classic endpoint", "token_url"),
        ("CombatantInfo events present", "combatantinfo"),
        ("Gear enchant IDs", "enchants"),
        ("Gear gem IDs", "gems"),
        ("Talent tree points", "talentPoints"),
        ("TBC spec strings", "spec_strings"),
    ]
    for label, key in checks:
        val = p.findings.get(key, "not reached")
        if isinstance(val, list):
            val = f"{len(val)} values"
        print(f"  {label:.<40} {val}")

    probe_rate_limit(p, " (total)")

    if args.json_out:
        with open(args.json_out, "w") as fh:
            json.dump(p.findings, fh, indent=2, default=str)
        print(f"\n  findings summary written to {args.json_out}")

    if args.raw_out:
        os.makedirs(os.path.dirname(args.raw_out) or ".", exist_ok=True)
        with open(args.raw_out, "w") as fh:
            json.dump(p.raw, fh, indent=2, default=str)
        print(f"  RAW FIXTURE written to {args.raw_out}")
    else:
        warn("no --raw-out given: the payload is gone when this process exits. "
             "The summary is not a fixture.")

    print("\n  The decisive lines are 'Gear enchant IDs' and 'Gear gem IDs'.")
    print("  ABSENT on either means the normalization layer must synthesize them,")
    print("  and the baseline gets adjusted the same way as every candidate.\n")


if __name__ == "__main__":
    main()
