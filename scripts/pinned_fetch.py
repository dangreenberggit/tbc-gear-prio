"""Shared pinned-fetch helpers for the sync scripts.

`sync_atlasloot.py`, `sync_wowsims.py` and `fetch_protos.py` each download
files from a pinned commit and verify them against a sha256 recorded in a
lockfile. Three copies of "download and verify against a pin" is three places
for a supply-chain check to rot, so the primitives live here.

Each script keeps its own REPO, lockfile path and layout — only the fetch,
the digest and the lock-entry shape are shared.
"""

from __future__ import annotations

import hashlib
import urllib.request

RAW = "https://raw.githubusercontent.com/{repo}/{sha}/{path}"

# GitHub raw occasionally stalls rather than refusing; without a bound a sync
# hangs a CI job instead of failing it.
FETCH_TIMEOUT_SECONDS = 120


def raw_url(repo: str, sha: str, path: str) -> str:
    return RAW.format(repo=repo, sha=sha, path=path)


def fetch(repo: str, sha: str, path: str) -> bytes:
    """Download one file from a pinned commit. Does not verify — see `verify`."""
    with urllib.request.urlopen(
        raw_url(repo, sha, path), timeout=FETCH_TIMEOUT_SECONDS
    ) as r:
        return r.read()


def digest(blob: bytes) -> str:
    return hashlib.sha256(blob).hexdigest()


def lock_entry(path: str, blob: bytes) -> dict:
    """The `{path, sha256, bytes}` record every lockfile stores per file."""
    return {"path": path, "sha256": digest(blob), "bytes": len(blob)}


def verify(blob: bytes, meta: dict) -> str | None:
    """Return None if `blob` matches the lock entry, else a reason string.

    Returning the reason rather than raising lets callers accumulate every
    mismatch in a sync instead of stopping at the first.
    """
    expect = meta.get("sha256")
    if not expect:
        return "lock entry missing sha256"
    got = digest(blob)
    if got != expect:
        return f"sha256 mismatch (got {got[:12]}, lock {expect[:12]})"
    return None
