#!/usr/bin/env python3
"""
sync_wowsims.py -- pin, verify and update our copy of the wowsims/tbc-new inputs.

Everything we take from upstream is pinned to ONE release tag, recorded in
data/wowsims.lock.json, and fetched into vendor/ (gitignored). What gets committed
is the generated output plus the lockfile -- so "which upstream release produced
this data" is always answerable from the repo alone.

This script is NOT the only writer of that lockfile -- it owns OWNED_KEYS below
and must leave every other top-level key alone (see merge_lock). Adding a third
writer? Read the contract in scripts/pinned_fetch.py first.

The load-bearing field is CURRENT_PHASE.

    // ui/core/constants/other.ts
    export enum Phase { Phase1 = 1, Phase2, Phase3, Phase4, Phase5 }
    export const CURRENT_PHASE: Phase = Phase.Phase2;

That is upstream's own statement of what content tier the game is on, maintained by
people who track it for a living. It is the source of DEFAULT_MAX_PHASE (PLAN.md
1.1). We do NOT infer the tier from whatever raid a player's most recent log
happens to be in -- a guild farming Karazhan for badges would read as P1.

    python scripts/sync_wowsims.py --check     # drift report, no writes
    python scripts/sync_wowsims.py --restore  # fetch lock pin into vendor/ (CI / fresh tree)
    python scripts/sync_wowsims.py --update    # fetch latest tag, rewrite lockfile
    python scripts/sync_wowsims.py --update --tag v0.0.101
    python scripts/sync_wowsims.py --update --ref feature/backend-reforge
    python scripts/sync_wowsims.py --update --ref d09edaaf8
    python scripts/sync_wowsims.py --watch-ref --ref feature/backend-reforge

--ref (with --update) resolves a branch name or a commit sha via
`gh api repos/<repo>/commits/<ref>` rather than the tags endpoint --tag uses.
It writes the same lockfile shape (tag becomes the literal ref you passed, so
`lock["tag"]` on a --ref pin is a branch name or sha rather than a release tag
-- read it back and check before assuming it names a tag). This is how we
track a branch under active development, e.g. feature/backend-reforge, without
moving the tag pin used for building (issue #1).

--watch-ref (with --ref) records a ref in lock["watchedRefs"] WITHOUT fetching
files or touching vendor/ -- it is a pure drift tripwire, checked by --check,
for a branch we build from the tag but want to know about if it moves.

Exit codes: 0 in sync, 1 drift detected (--check), 2 error.
"""

import argparse
import datetime
import json
import os
import re
import subprocess
import sys

from pinned_fetch import digest as sha256_of
from pinned_fetch import fetch as pinned_fetch
from pinned_fetch import lock_entry
from pinned_fetch import verify as verify_blob

REPO = "wowsims/tbc-new"
LOCKFILE = "data/wowsims.lock.json"
VENDOR = "vendor/wowsims"

# Everything we consume from upstream. Adding a file here and re-running --update
# is the whole process for taking on a new upstream input.
#
# Per-phase refresh runbook (manual — not automated in CI):
# - Ret's gear sets stop at p2 upstream; feral cat's run to p5. Taking on a new
#   phase's set is a hand edit to TRACKED followed by
#   `--update --tag <the tag already in data/wowsims.lock.json>` — plain
#   `--restore` iterates the lockfile, so it cannot fetch a file that has no
#   entry yet, and a bare `--update` would chase latest and move every other
#   pin in the same diff.
# - Pool membership refreshes from AtlasLoot (data/atlasloot_sources.json),
#   Wowhead ret lists (data/wowhead-lists/ret/), and the tier token map
#   (data/two-hop/ret-tokens.json) — not from wowsims curated gear sets
#   (those are bisTags/display input only).
# - Each new tier needs token-to-piece verification against Wowhead before
#   extending data/two-hop/ret-tokens.json; groupings differ by tier (D9).
#
# Feral cat is not shaped like ret upstream. Retribution ships one curated set
# per stage and genuinely stops at p2; feral cat ships sixteen, split
# BiS/Alt/Realistic and again by 6-piece against 9-piece tier bonus, and runs
# to p5.
#
# The p2 *and p3* pairs are tracked, plus pre-raid: those are the stages this
# repo assembles universes for, and a max-phase-3 run tagging its BiS rows from
# p2's list silently presents a stale curated set as the current one. p4/p5
# stay untracked until a universe is assembled for them — the point is to cover
# the phases we rank, not to mirror upstream's whole catalogue.
#
# The `_6p`/`_9p` suffix is a hit percentage, not a piece count (carry-forward
# 88). Only the BiS pair per stage is tracked; upstream's Alt/Realistic
# variants are a different claim and would need their own tag vocabulary.
TRACKED = {
    "db.json": "assets/database/db.json",
    "constants_other.ts": "ui/core/constants/other.ts",
    "ret_p1.gear.json": "ui/paladin/retribution/gear_sets/p1.gear.json",
    "ret_p2.gear.json": "ui/paladin/retribution/gear_sets/p2.gear.json",
    "ret_preraid.gear.json": "ui/paladin/retribution/gear_sets/preraid.gear.json",
    "ret_default.apl.json": "ui/paladin/retribution/apls/default.apl.json",
    "feral_p2_6p.gear.json": "ui/druid/feralcat/gear_sets/p2_6p.gear.json",
    "feral_p2_9p.gear.json": "ui/druid/feralcat/gear_sets/p2_9p.gear.json",
    "feral_p3_6p.gear.json": "ui/druid/feralcat/gear_sets/p3_6p.gear.json",
    "feral_p3_9p.gear.json": "ui/druid/feralcat/gear_sets/p3_9p.gear.json",
    "feral_preraid.gear.json": "ui/druid/feralcat/gear_sets/pre_raid.gear.json",
    "feral_default.apl.json": "ui/druid/feralcat/apls/default.apl.json",
    # Sources for scripts/extract_sim_defaults.mjs (ADR-0022). Unlike everything
    # above these are TypeScript, not data: the buff/debuff defaults live in
    # `sim.ts` as constructor calls, so they are parsed with the TS compiler API
    # rather than json.load'ed. Pinned here so a tag bump trips the checksum
    # instead of silently invalidating data/presets/*/buff-defaults.json.
    "feral_sim.ts": "ui/druid/feralcat/sim.ts",
    "proto_utils.ts": "ui/core/proto_utils/utils.ts",
}

def gh(*args):
    """Call gh api. Kept as a subprocess so this stays stdlib-only and reuses
    whatever auth the developer already has."""
    out = subprocess.run(["gh", "api", *args], capture_output=True, text=True)
    if out.returncode != 0:
        raise SystemExit(f"gh api failed: {out.stderr.strip()[:300]}")
    return out.stdout.strip()


def latest_tag():
    raw = gh(f"repos/{REPO}/tags", "--jq", ".[0].name + \"\\t\" + .[0].commit.sha")
    name, sha = raw.split("\t")
    return name, sha


def tag_sha(tag):
    return gh(f"repos/{REPO}/tags", "--jq",
              f'.[] | select(.name=="{tag}") | .commit.sha')


def ref_sha(ref):
    """Resolve a branch name or commit sha to a commit sha via the commits
    endpoint (not the tags endpoint tag_sha uses) -- this is how --ref covers
    an unreleased branch like feature/backend-reforge, which has no tag."""
    try:
        return gh(f"repos/{REPO}/commits/{ref}", "--jq", ".sha")
    except SystemExit as e:
        raise SystemExit(f"ref {ref!r} not found on {REPO}: {e}")


def fetch(sha, path):
    return pinned_fetch(REPO, sha, path)


def parse_current_phase(ts_source):
    """CURRENT_PHASE is written as `Phase.PhaseN`, not as a bare number, so resolve
    through the enum. Fail loudly rather than guessing -- a wrong default here
    silently changes every ranking's candidate pool and gem palette."""
    m = re.search(r"CURRENT_PHASE\s*:\s*Phase\s*=\s*Phase\.Phase(\d)", ts_source)
    if m:
        return int(m.group(1))
    m = re.search(r"CURRENT_PHASE\s*:\s*Phase\s*=\s*(\d)", ts_source)
    if m:
        return int(m.group(1))
    raise SystemExit(
        "could not parse CURRENT_PHASE out of ui/core/constants/other.ts.\n"
        "Upstream changed the declaration. Do NOT fall back to a hardcoded default; "
        "read the file and fix the parser."
    )


def load_lock():
    if not os.path.exists(LOCKFILE):
        return None
    with open(LOCKFILE, encoding="utf-8") as fh:
        return json.load(fh)


def vendor_is_empty():
    """True if VENDOR is missing or has no files.

    vendor/ is gitignored, so a fresh clone or a worktree that never ran
    --restore has none of the tracked files. Left unchecked, that reads to a
    downstream consumer (e.g. build_feral_skeleton.py) as "upstream doesn't
    have this file" -- issue #1's actual failure -- instead of "the sync never
    ran here". Only --check refuses on it -- --restore's whole job is to fill
    an empty vendor/, so refusing there would be wrong.
    """
    if not os.path.isdir(VENDOR):
        return True
    return not any(os.scandir(VENDOR))


# Keys in the lockfile that this script owns and rewrites on every --update.
# Everything else in there belongs to another script -- data/proto/'s pin is
# written by scripts/fetch_protos.py -- and must survive untouched. Rebuilding
# the dict from scratch and dropping the rest silently destroyed the `proto`
# block once already; carry unknown keys forward rather than naming them, so
# the next script to add a block doesn't have to edit this one.
OWNED_KEYS = frozenset(
    {
        "repo",
        "tag",
        "commit",
        "currentPhase",
        "defaultMaxPhase",
        "files",
        "_comment",
        "watchedRefs",
    }
)


def merge_lock(prev, owned):
    """Overlay this script's freshly-built keys onto the previous lockfile,
    preserving any top-level key we don't own.

    Raises SystemExit if `owned` contains a key missing from OWNED_KEYS. That
    combination is the dangerous one: the key would be classified as another
    script's, so the *previous* value would win and the freshly-fetched one be
    discarded -- a pin that looks updated but never moves again. Refusing to
    write beats a lockfile that quietly lies about what it points at."""
    unclaimed = set(owned) - OWNED_KEYS
    if unclaimed:
        raise SystemExit(
            f"do_update() built key(s) {sorted(unclaimed)} that are not in OWNED_KEYS.\n"
            "Add them to OWNED_KEYS -- otherwise merge_lock() treats them as another "
            "script's data and keeps the stale value forever."
        )
    foreign = {k: v for k, v in (prev or {}).items() if k not in OWNED_KEYS}
    if not foreign:
        return dict(owned)
    # Our keys lead; foreign blocks keep their relative order at the tail.
    return {**owned, **foreign}


def do_update(tag, ref=None):
    if ref:
        if tag:
            raise SystemExit("--tag and --ref are mutually exclusive")
        sha = ref_sha(ref)
        if not sha:
            raise SystemExit(f"ref {ref} not found on {REPO}")
        tag = ref
    elif tag:
        sha = tag_sha(tag)
        if not sha:
            raise SystemExit(f"tag {tag} not found on {REPO}")
    else:
        tag, sha = latest_tag()

    print(f"  pinning {REPO} @ {tag} ({sha[:12]})")
    os.makedirs(VENDOR, exist_ok=True)
    os.makedirs(os.path.dirname(LOCKFILE), exist_ok=True)

    files, current_phase = {}, None
    for local, path in TRACKED.items():
        try:
            blob = fetch(sha, path)
        except Exception as e:
            print(f"    !! {path}: {e}")
            continue
        dest = os.path.join(VENDOR, local)
        with open(dest, "wb") as fh:
            fh.write(blob)
        entry = lock_entry(path, blob)
        files[local] = entry
        digest = entry["sha256"]
        print(f"    {local:<26} {len(blob):>9,} bytes  {digest[:12]}")
        if local == "constants_other.ts":
            current_phase = parse_current_phase(blob.decode("utf-8"))

    if current_phase is None:
        raise SystemExit("never resolved CURRENT_PHASE -- refusing to write a lockfile")

    prev = load_lock()
    owned = {
        "repo": REPO,
        "tag": tag,
        "commit": sha,
        "currentPhase": current_phase,
        "defaultMaxPhase": current_phase,
        "files": files,
        "_comment": (
            "Generated by scripts/sync_wowsims.py. currentPhase is upstream's own "
            "CURRENT_PHASE from ui/core/constants/other.ts and is the single source "
            "of DEFAULT_MAX_PHASE (PLAN.md 1.1). Never infer the content tier from a "
            "player's most recent log."
        ),
    }
    # watchedRefs is owned by this script but not touched by a normal --update
    # -- refreshing it is --check-refs' job (do_check_refs). Carry the previous
    # value forward explicitly: merge_lock() only forwards keys NOT in
    # OWNED_KEYS, so an owned key this call doesn't set would otherwise be
    # dropped rather than preserved.
    if prev and "watchedRefs" in prev:
        owned["watchedRefs"] = prev["watchedRefs"]
    lock = merge_lock(prev, owned)
    # newline="" so Windows does not translate "\n" to "\r\n": the lockfile is
    # committed, and a CRLF rewrite makes every line of the diff look changed,
    # hiding which pins actually moved. Same defect as 393ab4f fixed for the
    # AtlasLoot artifacts.
    with open(LOCKFILE, "w", encoding="utf-8", newline="") as fh:
        json.dump(lock, fh, indent=2)
        fh.write("\n")

    print(f"\n  CURRENT_PHASE = {current_phase}  -> DEFAULT_MAX_PHASE = {current_phase}")
    print(f"  lockfile written: {LOCKFILE}")

    if prev and prev.get("currentPhase") != current_phase:
        print(f"\n  *** CONTENT TIER CHANGED: {prev.get('currentPhase')} -> {current_phase} ***")
        print("  This is the P3 launch signal. Required follow-up (PLAN.md 14, Phase 5+):")
        print("    1. regenerate data/items/index.json and data/gems/palette.json")
        print("    2. curate the new tier's items into data/pools/<spec>.json, with `source`")
        print("    3. bump engineVersion to invalidate cached rankings")
    return 0


def do_restore():
    """Fetch pinned files into vendor/ from the lock commit. Does not rewrite the lock.

    CI and fresh worktrees need this — vendor/ is gitignored, and --update would
    chase latest and rewrite data/wowsims.lock.json.
    """
    lock = load_lock()
    if not lock:
        print(f"  no {LOCKFILE} -- run --update first", file=sys.stderr)
        return 2

    sha = lock["commit"]
    files = lock.get("files") or {}
    if not files:
        print(f"  {LOCKFILE} has no files map", file=sys.stderr)
        return 2

    print(f"  restoring {lock['repo']} @ {lock['tag']} ({sha[:12]}) -> {VENDOR}")
    os.makedirs(VENDOR, exist_ok=True)

    errors = []
    for local, meta in files.items():
        path = meta.get("path")
        if not path or not meta.get("sha256"):
            errors.append(f"{local}: lock entry missing path/sha256")
            continue
        try:
            blob = fetch(sha, path)
        except Exception as e:
            errors.append(f"{local}: fetch failed: {e}")
            continue
        reason = verify_blob(blob, meta)
        if reason:
            errors.append(f"{local}: {reason}")
            continue
        dest = os.path.join(VENDOR, local)
        with open(dest, "wb") as fh:
            fh.write(blob)
        print(f"    {local:<26} {len(blob):>9,} bytes")

    if errors:
        for e in errors:
            print(f"  !! {e}", file=sys.stderr)
        return 2
    print("  restore ok.")
    return 0


def do_check():
    lock = load_lock()
    if not lock:
        print(f"  no {LOCKFILE} -- run --update first")
        return 1

    if vendor_is_empty():
        print(f"  {VENDOR}/ is empty or missing -- the source isn't here.", file=sys.stderr)
        print("  run: python scripts/sync_wowsims.py --restore", file=sys.stderr)
        return 2

    tag, sha = latest_tag()
    drift = []

    print(f"  pinned:   {lock['tag']} ({lock['commit'][:12]})  phase {lock['currentPhase']}")
    print(f"  upstream: {tag} ({sha[:12]})")

    if lock["commit"] != sha:
        drift.append(f"new release available: {lock['tag']} -> {tag}")
        try:
            upstream_phase = parse_current_phase(
                fetch(sha, TRACKED["constants_other.ts"]).decode("utf-8"))
            print(f"  upstream CURRENT_PHASE = {upstream_phase}")
            if upstream_phase != lock["currentPhase"]:
                drift.append(
                    f"*** CONTENT TIER CHANGED {lock['currentPhase']} -> {upstream_phase} *** "
                    "-- new tier launched; pools, gem palette and engineVersion all need work")
        except SystemExit as e:
            drift.append(f"could not read upstream CURRENT_PHASE: {e}")

    # Local tampering / partial fetches.
    for local, meta in lock.get("files", {}).items():
        path = os.path.join(VENDOR, local)
        if not os.path.exists(path):
            drift.append(f"missing locally: {path} (run --restore or --update)")
            continue
        with open(path, "rb") as fh:
            if sha256_of(fh.read()) != meta["sha256"]:
                drift.append(f"checksum mismatch: {path}")

    # Watched refs: branches under active upstream development that we don't
    # build from but want to know when they move (issue #1 -- the optimizer
    # that "didn't exist" was live on feature/backend-reforge the whole time).
    for name, meta in lock.get("watchedRefs", {}).items():
        try:
            current_sha = ref_sha(name)
        except SystemExit as e:
            drift.append(f"watched ref {name}: could not resolve: {e}")
            continue
        if current_sha != meta.get("commit"):
            drift.append(
                f"watched ref {name} moved: {meta.get('commit', '?')[:12]} -> "
                f"{current_sha[:12]} (informational -- not a build pin; re-review "
                "before treating its features as still absent)"
            )

    print()
    if not drift:
        print("  in sync.")
        return 0
    for d in drift:
        print(f"  DRIFT: {d}")
    return 1


def do_watch_ref(ref):
    """Add or refresh one entry in lock["watchedRefs"]. Does not fetch files or
    touch vendor/ -- a watched ref is tracked for drift, not built from."""
    lock = load_lock()
    if not lock:
        print(f"  no {LOCKFILE} -- run --update first", file=sys.stderr)
        return 2
    sha = ref_sha(ref)
    if not sha:
        print(f"  ref {ref} not found on {REPO}", file=sys.stderr)
        return 2
    watched = dict(lock.get("watchedRefs") or {})
    watched[ref] = {
        "commit": sha,
        "fetchedAt": datetime.date.today().isoformat(),
    }
    lock["watchedRefs"] = watched
    with open(LOCKFILE, "w", encoding="utf-8", newline="") as fh:
        json.dump(lock, fh, indent=2)
        fh.write("\n")
    print(f"  watching {ref} @ {sha[:12]}")
    return 0


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true", help="report drift, write nothing")
    ap.add_argument("--update", action="store_true", help="fetch and rewrite the lockfile")
    ap.add_argument(
        "--restore",
        action="store_true",
        help="fetch pinned files into vendor/ from the lock (no lock rewrite)",
    )
    ap.add_argument("--tag", help="pin a specific tag instead of the latest")
    ap.add_argument(
        "--ref",
        help="with --update: pin a branch name or commit sha instead of a tag "
        "(e.g. feature/backend-reforge) -- mutually exclusive with --tag. "
        "With --watch-ref: the ref to add/refresh as a watched ref.",
    )
    ap.add_argument(
        "--watch-ref",
        action="store_true",
        help="add/refresh --ref in lock['watchedRefs'] for drift tracking "
        "(does not fetch files or touch vendor/)",
    )
    args = ap.parse_args()

    if args.tag and args.ref and not args.watch_ref:
        print("--tag and --ref are mutually exclusive", file=sys.stderr)
        sys.exit(2)

    if args.watch_ref:
        if not args.ref:
            print("--watch-ref requires --ref <branch-or-sha>", file=sys.stderr)
            sys.exit(2)
        sys.exit(do_watch_ref(args.ref))
    elif args.update:
        sys.exit(do_update(args.tag, ref=args.ref))
    elif args.restore:
        sys.exit(do_restore())
    elif args.check:
        sys.exit(do_check())
    else:
        ap.print_help()
        sys.exit(2)


if __name__ == "__main__":
    main()
