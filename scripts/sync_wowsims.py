#!/usr/bin/env python3
"""
sync_wowsims.py -- pin, verify and update our copy of the wowsims/tbc-new inputs.

Everything we take from upstream is pinned to ONE release tag, recorded in
data/wowsims.lock.json, and fetched into vendor/ (gitignored). What gets committed
is the generated output plus the lockfile -- so "which upstream release produced
this data" is always answerable from the repo alone.

The load-bearing field is CURRENT_PHASE.

    // ui/core/constants/other.ts
    export enum Phase { Phase1 = 1, Phase2, Phase3, Phase4, Phase5 }
    export const CURRENT_PHASE: Phase = Phase.Phase2;

That is upstream's own statement of what content tier the game is on, maintained by
people who track it for a living. It is the source of DEFAULT_MAX_PHASE (PLAN.md
1.1). We do NOT infer the tier from whatever raid a player's most recent log
happens to be in -- a guild farming Karazhan for badges would read as P1.

    python scripts/sync_wowsims.py --check     # drift report, no writes. CI-friendly.
    python scripts/sync_wowsims.py --update    # fetch latest tag, rewrite lockfile
    python scripts/sync_wowsims.py --update --tag v0.0.101

--check also reports files present in a WATCHED_DIRS directory but absent from
TRACKED -- a new gear set is otherwise invisible, since no tracked path or checksum
changes when upstream merely ADDS one.

Exit codes: 0 in sync, 1 drift detected (--check), 2 error.
"""

import argparse
import hashlib
import json
import os
import re
import subprocess
import sys
import urllib.request

REPO = "wowsims/tbc-new"
LOCKFILE = "data/wowsims.lock.json"
VENDOR = "vendor/wowsims"

# Everything we consume from upstream. Adding a file here and re-running --update
# is the whole process for taking on a new upstream input.
TRACKED = {
    "db.json": "assets/database/db.json",
    "constants_other.ts": "ui/core/constants/other.ts",
    "ret_p1.gear.json": "ui/paladin/retribution/gear_sets/p1.gear.json",
    "ret_p2.gear.json": "ui/paladin/retribution/gear_sets/p2.gear.json",
    "ret_preraid.gear.json": "ui/paladin/retribution/gear_sets/preraid.gear.json",
    "ret_default.apl.json": "ui/paladin/retribution/apls/default.apl.json",
}

# Directories where we intend to track EVERY file, so a file appearing upstream
# that TRACKED does not name is a finding worth reporting.
#
# Not every parent directory in TRACKED belongs here. We take exactly one file out
# of assets/database/ and ui/core/constants/ -- those are big shared upstream dirs
# whose other contents are none of our business, and listing them would bury the
# signal below under routine noise.
WATCHED_DIRS = (
    "ui/paladin/retribution/gear_sets",
    "ui/paladin/retribution/apls",
)

RAW = "https://raw.githubusercontent.com/{repo}/{sha}/{path}"


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


def fetch(sha, path):
    url = RAW.format(repo=REPO, sha=sha, path=path)
    with urllib.request.urlopen(url, timeout=120) as r:
        return r.read()


def list_dir(sha, path):
    """Names of the files directly inside an upstream directory at `sha`.
    Subdirectories are ignored -- TRACKED only ever names files."""
    raw = gh(f"repos/{REPO}/contents/{path}?ref={sha}", "--jq",
             '.[] | select(.type=="file") | .name')
    return [n for n in raw.splitlines() if n]


def untracked_upstream_files(sha):
    """TRACKED is a hardcoded path map, so a file upstream ADDS to a WATCHED_DIRS
    directory is otherwise invisible to --check: no tracked path changed, no
    checksum moved. That is exactly how a new tier's p3.gear.json would arrive,
    and PLAN.md 8.5 leans on --check as the P3 launch signal. Report those files;
    do not fetch them. Taking on a new upstream input stays a human decision --
    see the comment on TRACKED."""
    tracked = set(TRACKED.values())
    findings = []
    for d in WATCHED_DIRS:
        # A watched dir that no TRACKED path lives in would report every file in it
        # as new, or -- if upstream moved the dir -- quietly report nothing at all.
        # Either way the two lists have drifted apart and a human should look.
        if not any(p.startswith(f"{d}/") for p in tracked):
            findings.append(f"WATCHED_DIRS lists {d}/ but no TRACKED path is in it")
            continue
        try:
            names = list_dir(sha, d)
        except SystemExit as e:
            findings.append(f"could not list upstream {d}/: {e}")
            continue
        extra = sorted(n for n in names if f"{d}/{n}" not in tracked)
        for name in extra:
            findings.append(
                f"new upstream file {d}/{name} -- not in TRACKED. "
                "Decide whether to take it on, then add it to TRACKED and --update.")
    return findings


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


def do_update(tag):
    if tag:
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
        digest = hashlib.sha256(blob).hexdigest()
        files[local] = {"path": path, "sha256": digest, "bytes": len(blob)}
        print(f"    {local:<26} {len(blob):>9,} bytes  {digest[:12]}")
        if local == "constants_other.ts":
            current_phase = parse_current_phase(blob.decode("utf-8"))

    if current_phase is None:
        raise SystemExit("never resolved CURRENT_PHASE -- refusing to write a lockfile")

    prev = load_lock()
    lock = {
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
    with open(LOCKFILE, "w", encoding="utf-8") as fh:
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


def do_check():
    lock = load_lock()
    if not lock:
        print(f"  no {LOCKFILE} -- run --update first")
        return 1

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

    # Directory awareness. Checked at the PINNED ref, not at upstream HEAD: this
    # answers "is our TRACKED map complete for the release we are actually on",
    # which stays true (and keeps reporting) even when no new tag has landed.
    drift.extend(untracked_upstream_files(lock["commit"]))

    # Local tampering / partial fetches.
    for local, meta in lock.get("files", {}).items():
        path = os.path.join(VENDOR, local)
        if not os.path.exists(path):
            drift.append(f"missing locally: {path} (run --update)")
            continue
        with open(path, "rb") as fh:
            if hashlib.sha256(fh.read()).hexdigest() != meta["sha256"]:
                drift.append(f"checksum mismatch: {path}")

    print()
    if not drift:
        print("  in sync.")
        return 0
    for d in drift:
        print(f"  DRIFT: {d}")
    return 1


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true", help="report drift, write nothing")
    ap.add_argument("--update", action="store_true", help="fetch and rewrite the lockfile")
    ap.add_argument("--tag", help="pin a specific tag instead of the latest")
    args = ap.parse_args()

    if args.update:
        sys.exit(do_update(args.tag))
    elif args.check:
        sys.exit(do_check())
    else:
        ap.print_help()
        sys.exit(2)


if __name__ == "__main__":
    main()
