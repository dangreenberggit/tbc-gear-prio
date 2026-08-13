#!/usr/bin/env python3
"""
probe_ranked_route.py -- is a character reachable through the RANKED route?

`FightSummary.route` (packages/core/src/seams/gear-source.ts) distinguishes
'ranked' -- resolved through WCL's encounterRankings -- from 'report-events',
which walks a report's fights instead. The Stage 2 gate box

    fallback route exercised on a character with no ranked kills

turns on that distinction, and the obvious reading of it is wrong: "no ranked
kills" is about a ranked PARSE, not about whether the boss died. A character
can have ten kills on an encounter and zero ranks on it.

This script answers the question directly, in three parts:

  1. KILLS      -- how many kills does each recent report contain?
  2. RANKS      -- what does encounterRankings return for this character?
  3. CONTROL    -- does the same query return ranks for SOMEBODY?

Part 3 is not optional, and it is what carries the conclusion. Zero ranks only
means "unranked" if the query is capable of returning a non-zero, so the control
pulls a character off the encounter leaderboard and re-asks about them. Without
it, a broken query and an unranked character look identical.

SCOPE LIMIT, so this is not over-read: parts 1 and 2 do NOT join. A report's
fight carries `encounterID` in a prefixed namespace (Hydross is 100623 in
test/fixtures/*.raw.json), while `encounterRankings` and `worldData.encounter`
take the unprefixed id (623). Part 1 counts kills across whatever bosses a
report contains; part 2 asks about three named encounters. So "ten kills on
encounters with zero ranks" is a conclusion the reader draws across both, not
one this script establishes. The control is what makes it sound.

Read-only: issues GraphQL queries and writes nothing. Costs WCL points.

Usage:
    python scripts/probe_ranked_route.py --name slamaltman \
        --server-slug dreamscythe --region US

Credentials come from the environment or a .env file, same as wcl_probe.py.
"""

import argparse
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from wcl_probe import Probe, authenticate, gql, load_env  # noqa: E402

# Encounters to ask about, in the UNPREFIXED namespace that encounterRankings
# and worldData.encounter take -- not the 100623-style id a report's fight
# carries. Zone 1010 (SSC / TK) on TBC Anniversary; confirmed against
# worldData.zones rather than assumed, since a wrong id returns the same empty
# result as an unranked character.
DEFAULT_ENCOUNTERS = [
    (623, "Hydross the Unstable"),
    (624, "The Lurker Below"),
    (625, "Leotheras the Blind"),
]

RECENT_REPORTS = """
query($n:String!,$s:String!,$r:String!,$limit:Int!){
  characterData { character(name:$n, serverSlug:$s, serverRegion:$r) {
    recentReports(limit: $limit) { data { code zone { name } } }
  } }
}"""

REPORT_FIGHTS = """
query($c:String!){
  reportData { report(code:$c) { fights { id encounterID kill } } }
}"""

CHARACTER_RANKS = """
query($n:String!,$s:String!,$r:String!,$e:Int!){
  characterData { character(name:$n, serverSlug:$s, serverRegion:$r) {
    encounterRankings(encounterID:$e)
  } }
}"""

LEADERBOARD = """
query($e:Int!){
  worldData { encounter(id:$e) {
    name
    characterRankings(metric: dps, page: 1)
  } }
}"""


def kills_per_report(p, name, slug, region, limit):
    d = gql(p, RECENT_REPORTS,
            {"n": name, "s": slug, "r": region, "limit": limit}, quiet=True)
    ch = (d.get("characterData") or {}).get("character")
    if not ch:
        print(f"  character not found: {name} @ {slug} ({region})")
        return
    reports = ((ch.get("recentReports") or {}).get("data")) or []
    print(f"  {len(reports)} recent reports")
    no_kill = 0
    for r in reports:
        rd = gql(p, REPORT_FIGHTS, {"c": r["code"]}, quiet=True)
        fights = ((rd.get("reportData") or {}).get("report") or {}).get("fights") or []
        boss = [f for f in fights if f.get("encounterID")]
        kills = [f for f in boss if f.get("kill")]
        if boss and not kills:
            no_kill += 1
        print(f"    {r['code']}  zone={(r.get('zone') or {}).get('name')}  "
              f"boss={len(boss)} kills={len(kills)}"
              f"{'   <-- NO KILLS' if boss and not kills else ''}")
    print(f"  reports with boss fights but no kills: {no_kill}")


def ranks_for(p, name, slug, region, encounters):
    """Returns True if this character is ranked on any listed encounter."""
    any_ranked = False
    for enc_id, enc_name in encounters:
        d = gql(p, CHARACTER_RANKS,
                {"n": name, "s": slug, "r": region, "e": enc_id}, quiet=True)
        ch = (d.get("characterData") or {}).get("character")
        er = (ch or {}).get("encounterRankings")
        er = er if isinstance(er, dict) else {}
        n_ranks = len(er.get("ranks") or [])
        if n_ranks:
            any_ranked = True
        print(f"    {enc_id} {enc_name:.<32} totalKills={er.get('totalKills')} "
              f"ranks={n_ranks}")
    return any_ranked


def control(p, encounter_id):
    """Prove the query can return ranks at all, via the leaderboard's top entry."""
    d = gql(p, LEADERBOARD, {"e": encounter_id}, quiet=True)
    enc = (d.get("worldData") or {}).get("encounter") or {}
    cr = enc.get("characterRankings") or {}
    ranks = cr.get("rankings") or []
    print(f"    {enc.get('name')}: {cr.get('count')} ranked characters")
    if not ranks:
        print("    NOBODY is ranked on this encounter -- control is inconclusive.")
        return
    top = ranks[0]
    srv = top.get("server") or {}
    slug = srv.get("slug") or (srv.get("name") or "").lower().replace(" ", "-")
    print(f"    top: {top.get('name')} @ {srv.get('name')} ({srv.get('region')})")
    ranked = ranks_for(p, top.get("name"), slug, srv.get("region") or "US",
                       [(encounter_id, enc.get("name") or str(encounter_id))])
    print(f"    -> control character ranked: {ranked}")


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--name", required=True)
    ap.add_argument("--server-slug", required=True,
                    help="lowercase, hyphenated, e.g. 'dreamscythe'")
    ap.add_argument("--region", default="US")
    ap.add_argument("--reports", type=int, default=25,
                    help="how many recent reports to check for kills")
    ap.add_argument("--env-file", default=".env")
    ap.add_argument("--skip-kills", action="store_true",
                    help="skip part 1, which is the expensive one")
    args = ap.parse_args()

    load_env(args.env_file)
    cid = os.environ.get("WCL_CLIENT_ID")
    secret = os.environ.get("WCL_CLIENT_SECRET")
    if not cid or not secret:
        raise SystemExit(
            "Missing WCL_CLIENT_ID / WCL_CLIENT_SECRET.\n"
            f"Looked in environment and {args.env_file}."
        )

    p = Probe()
    authenticate(p, cid, secret)

    if not args.skip_kills:
        print("\n1. KILLS PER RECENT REPORT")
        kills_per_report(p, args.name, args.server_slug, args.region, args.reports)

    print(f"\n2. RANKS FOR {args.name}")
    ranked = ranks_for(p, args.name, args.server_slug, args.region,
                       DEFAULT_ENCOUNTERS)

    print("\n3. CONTROL -- does encounterRankings ever return ranks?")
    control(p, DEFAULT_ENCOUNTERS[0][0])

    print("\nVERDICT")
    if ranked:
        print(f"  {args.name} IS ranked -- resolves through the 'ranked' route.")
    else:
        print(f"  {args.name} has NO ranked kills -- the 'report-events' fallback")
        print("  is the only route that reaches this character's gear.")


if __name__ == "__main__":
    main()
