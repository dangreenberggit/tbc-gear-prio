"""Shared pinned-fetch helpers for the sync scripts.

`sync_atlasloot.py`, `sync_wowsims.py` and `fetch_protos.py` each download
files from a pinned commit and verify them against a sha256 recorded in a
lockfile. Three copies of "download and verify against a pin" is three places
for a supply-chain check to rot, so the primitives live here.

Each script keeps its own REPO, lockfile path and layout — only the fetch,
the digest and the lock-entry shape are shared.

IF YOU ARE ADDING A SCRIPT THAT WRITES data/wowsims.lock.json, READ THIS.
That file is shared: `sync_wowsims.py` owns the upstream pin (its OWNED_KEYS),
`fetch_protos.py` owns "proto" (its OWNED_KEY). The rule is touch only your own
top-level key and carry every other key through untouched — load the lockfile
immediately before writing, set your key, write the whole dict back. Do NOT
rebuild it from the keys you happen to know about: `sync_wowsims.py --update`
did exactly that and deleted the entire 16-entry "proto" block, and because the
result was still valid JSON nothing failed until someone diffed it by hand.

A new writer that ignores this is the one case scripts/check_lock_merge.py
cannot catch in advance — it verifies the two existing owners agree, but it
only notices a third owner after that script has already run and clobbered
something. So declare your key as a module-level OWNED_KEY, and add it to the
allowance in check_lock_merge.check_owned_keys_match_writer().
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


def is_crlf_drift(blob: bytes, meta: dict) -> bool:
    """True if `blob` only fails the lock digest because of CRLF line endings.

    `.gitattributes` normalises checked-in text (e.g. data/proto/**) to LF, but
    that rule does not retroactively fix a worktree that was checked out before
    the rule applied -- a stale Windows clone stays CRLF forever until someone
    re-checks-out the tree. That misreports as a tampered pin (ticket 26)
    unless callers distinguish it from a genuine content mismatch.
    """
    expect = meta.get("sha256")
    if not expect:
        return False
    return digest(blob.replace(b"\r\n", b"\n")) == expect
