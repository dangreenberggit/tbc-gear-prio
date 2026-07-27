#!/usr/bin/env python3
"""
fetch_wowsimcli.py — download the pinned wowsimcli binary into vendor/.

Pin matches data/wowsims.lock.json (same upstream release as db.json).
Windows dev / Linux deploy — platform is chosen, not auto-detected from a
cross-compile matrix beyond the two we actually run.

    python scripts/fetch_wowsimcli.py              # this machine's platform
    python scripts/fetch_wowsimcli.py --platform win32-x64
    python scripts/fetch_wowsimcli.py --platform linux-x64
"""

from __future__ import annotations

import argparse
import json
import sys
import tempfile
import urllib.request
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LOCK = ROOT / "data/wowsims.lock.json"
VENDOR = ROOT / "vendor"

# platform → (GitHub release zip name, binary name inside that zip)
ASSETS = {
    "win32-x64": ("wowsimcli-windows.exe.zip", "wowsimcli-windows.exe"),
    "linux-x64": ("wowsimcli-amd64-linux.zip", "wowsimcli"),
}


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument(
        "--platform",
        choices=sorted(ASSETS),
        default="win32-x64" if sys.platform.startswith("win") else "linux-x64",
    )
    args = ap.parse_args()

    lock = json.loads(LOCK.read_text(encoding="utf-8"))
    tag = lock["tag"]
    asset, binary = ASSETS[args.platform]
    url = f"https://github.com/wowsims/tbc-new/releases/download/{tag}/{asset}"
    dest_dir = VENDOR / f"wowsimcli-{tag}-{args.platform}"
    dest_dir.mkdir(parents=True, exist_ok=True)
    dest = dest_dir / binary

    print(f"fetching {url}")
    with tempfile.TemporaryDirectory() as tmp:
        zpath = Path(tmp) / asset
        with urllib.request.urlopen(url, timeout=120) as r, open(zpath, "wb") as out:
            out.write(r.read())
        with zipfile.ZipFile(zpath) as zf:
            zf.extract(binary, dest_dir)

    dest.chmod(dest.stat().st_mode | 0o111)
    print(f"wrote {dest.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
