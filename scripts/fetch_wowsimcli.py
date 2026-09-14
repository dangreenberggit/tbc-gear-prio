#!/usr/bin/env python3
"""
fetch_wowsimcli.py — produce the pinned wowsimcli binary into vendor/.

Pin matches data/wowsims.lock.json (same upstream ref as db.json).
Windows dev / Linux deploy — platform is chosen, not auto-detected from a
cross-compile matrix beyond the two we actually run.

    python scripts/fetch_wowsimcli.py              # this machine's platform
    python scripts/fetch_wowsimcli.py --platform win32-x64
    python scripts/fetch_wowsimcli.py --platform linux-x64

`lock["tag"]` names either a release tag (`vX.Y.Z`) or, since ADR-0030, a
commit sha on `feature/backend-reforge`. A release tag downloads the GitHub
release asset, unchanged. A sha has no release asset (releases are cut from
tagged commits only), so it is built from source instead, with the
reproducible recipe from ticket 244: clone/fetch the commit, regenerate the
Go protobuf bindings, then `go build -trimpath` with `main.Version` set to
the commit so `CliSimRunner.version()` matches `lock.commit`.

Building needs `go`, `protoc`, and `protoc-gen-go` (google.golang.org/protobuf,
not the deprecated github.com/golang/protobuf plugin) on PATH, plus network
access to clone/fetch `github.com/wowsims/tbc-new`. This is a real loss of
fresh-clone ergonomics versus the old release-only path (ADR-0030
Consequences): on a machine without that toolchain, this command now hard-
fails where it used to download a zip. Invisible to CI, which never calls
this script.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import shutil
import subprocess
import sys
import tempfile
import urllib.request
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LOCK = ROOT / "data/wowsims.lock.json"
VENDOR = ROOT / "vendor"
FORK = ROOT / "vendor/tbc-new-fork"
UPSTREAM_URL = "https://github.com/wowsims/tbc-new.git"

RELEASE_TAG_RE = re.compile(r"^v\d+\.\d+\.\d+$")
# A --ref pin writes the resolved sha into lock["tag"] (sync_wowsims.py), so the
# tag and the commit name the same object. Any other tag shape does not, and
# building from lock["commit"] under that name would stamp a binary with a
# version it does not have -- refuse instead of guessing (ticket 356).
FULL_SHA_RE = re.compile(r"^[0-9a-f]{40}$")

# platform → (GitHub release zip name, binary name inside that zip, GOOS, GOARCH)
ASSETS = {
    "win32-x64": ("wowsimcli-windows.exe.zip", "wowsimcli-windows.exe", "windows", "amd64"),
    "linux-x64": ("wowsimcli-amd64-linux.zip", "wowsimcli", "linux", "amd64"),
}


def run(cmd: list[str], **kwargs) -> subprocess.CompletedProcess:
    print(f"+ {' '.join(cmd)}")
    return subprocess.run(cmd, check=True, **kwargs)


def fetch_release(tag: str, platform: str, dest_dir: Path) -> None:
    asset, binary, _goos, _goarch = ASSETS[platform]
    url = f"https://github.com/wowsims/tbc-new/releases/download/{tag}/{asset}"
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


def check_protoc_gen_go() -> None:
    protoc_gen_go = shutil.which("protoc-gen-go")
    if protoc_gen_go is None:
        print(
            "ERROR: protoc-gen-go not found on PATH.\n"
            "Fix:  go install google.golang.org/protobuf/cmd/protoc-gen-go@latest",
            file=sys.stderr,
        )
        raise SystemExit(1)
    probe = subprocess.run(
        ["go", "version", "-m", protoc_gen_go], capture_output=True, text=True
    )
    if re.search(r"^\s+mod\s+github\.com/golang/protobuf\s", probe.stdout, re.MULTILINE):
        print(
            "ERROR: your protoc-gen-go is the deprecated github.com/golang/protobuf plugin;\n"
            "it generates code that no longer builds against this repo's protobuf version.\n"
            "Fix:  go install google.golang.org/protobuf/cmd/protoc-gen-go@latest\n"
            "then: retry",
            file=sys.stderr,
        )
        raise SystemExit(1)


def obtain_source(commit: str, scratch: Path) -> tuple[Path, str]:
    """Return (directory checked out at `commit`, mode).

    `mode` is "worktree" when the directory is a worktree off the shared fork
    clone, or "clone" when it is a standalone scratch clone. The caller must
    clean up on this value rather than re-testing `(FORK / ".git").exists()`:
    the two can disagree between entry and cleanup, and a `worktree remove`
    aimed at a plain clone -- or skipped for a real worktree -- leaves a
    registration in `.git/worktrees/` pointing at a deleted directory. The
    worktree path is deterministic per commit, so such a leak blocks every
    later build of that same commit until someone prunes by hand (ticket 357).
    """
    if (FORK / ".git").exists():
        run(["git", "-C", str(FORK), "fetch", UPSTREAM_URL, commit])
        wt = scratch / f"wowsims-src-{commit[:12]}"
        # Defensive: clear any registration an earlier failed build leaked, so
        # a retry of the same commit is not refused as "already registered".
        run(["git", "-C", str(FORK), "worktree", "prune"])
        run(["git", "-C", str(FORK), "worktree", "add", "--detach", str(wt), commit])
        return wt, "worktree"

    # Fallback: a blobless partial clone fetches only the default branch's
    # history, and `commit` may live on a non-default branch (e.g.
    # feature/backend-reforge) — so checkout by ref, not by clone depth.
    # `--no-checkout` + an explicit `fetch origin <commit>` guarantees the
    # commit is reachable before we try to check it out.
    src = scratch / f"wowsims-src-{commit[:12]}"
    run(["git", "clone", "--filter=blob:none", "--no-checkout", UPSTREAM_URL, str(src)])
    run(["git", "-C", str(src), "fetch", "origin", commit])
    run(["git", "-C", str(src), "checkout", "--detach", commit])
    verify = subprocess.run(
        ["git", "-C", str(src), "rev-parse", "HEAD"], capture_output=True, text=True, check=True
    )
    got = verify.stdout.strip()
    if got != commit:
        print(
            f"ERROR: checkout landed on {got}, expected {commit} — "
            "the fallback clone could not find the pinned commit.",
            file=sys.stderr,
        )
        raise SystemExit(1)
    return src, "clone"


def build_from_source(commit: str, platform: str, dest_dir: Path) -> Path:
    check_protoc_gen_go()
    _asset, binary, goos, goarch = ASSETS[platform]

    scratch_root = Path(tempfile.mkdtemp(prefix="wowsimcli-build-"))
    src = None
    mode = None
    try:
        src, mode = obtain_source(commit, scratch_root)

        proto_files = sorted(p.name for p in (src / "proto").glob("*.proto"))
        run(
            [
                "protoc",
                "-I=./proto",
                "--go_opt=Mgoogle/protobuf/descriptor.proto=google.golang.org/protobuf/types/descriptorpb",
                "--go_out=./sim/core",
                *[f"proto/{name}" for name in proto_files],
            ],
            cwd=src,
        )

        dest_dir.mkdir(parents=True, exist_ok=True)
        dest = dest_dir / binary
        env_overrides = {"GOOS": goos, "GOARCH": goarch, "GOAMD64": "v2"}
        import os

        env = {**os.environ, **env_overrides}
        run(
            [
                "go",
                "build",
                "-trimpath",
                "-o",
                str(dest.resolve()),
                "--tags=with_db",
                f"-ldflags=-X 'main.Version={commit}' -s -w",
            ],
            cwd=src / "cmd/wowsimcli",
            env=env,
        )

        dest.chmod(dest.stat().st_mode | 0o111)
        sha256 = hashlib.sha256(dest.read_bytes()).hexdigest()
        print(f"wrote {dest.relative_to(ROOT)}")
        print(f"commit={commit} main.Version={commit} sha256={sha256}")
        print(
            "recipe: protoc -I=./proto "
            "--go_opt=Mgoogle/protobuf/descriptor.proto=google.golang.org/protobuf/types/descriptorpb "
            "--go_out=./sim/core ./proto/*.proto && "
            f"GOOS={goos} GOARCH={goarch} GOAMD64=v2 go build -trimpath -o {binary} "
            f"--tags=with_db -ldflags=\"-X 'main.Version={commit}' -s -w\"  (from cmd/wowsimcli)"
        )
        return dest
    finally:
        # Branch on the mode obtain_source actually took, never on a re-test of
        # the filesystem (ticket 357 (a)).
        if src is not None and mode == "worktree":
            run(["git", "-C", str(FORK), "worktree", "remove", "--force", str(src)])
        shutil.rmtree(scratch_root, ignore_errors=True)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument(
        "--platform",
        choices=sorted(ASSETS),
        default="win32-x64" if sys.platform.startswith("win") else "linux-x64",
    )
    ap.add_argument(
        "--commit",
        help="override the lock's commit (pre-pin proving; build-from-source path only)",
    )
    ap.add_argument(
        "--tag-dir",
        help="override the vendor directory name (defaults to lock['tag'], or --commit if given)",
    )
    args = ap.parse_args()

    lock = json.loads(LOCK.read_text(encoding="utf-8"))
    tag = lock["tag"]

    # --commit is an explicit request to build from source (pre-pin proving,
    # and slice 1's own reproducibility test) — it always takes the build
    # path, regardless of what the current lock's tag looks like.
    if args.commit is None and RELEASE_TAG_RE.match(tag):
        dir_name = args.tag_dir or tag
        dest_dir = VENDOR / f"wowsimcli-{dir_name}-{args.platform}"
        fetch_release(tag, args.platform, dest_dir)
        return 0

    if args.commit is None and "/" in tag:
        print(
            f"lock tag `{tag}` contains `/`; pin a commit sha "
            "(`sync_wowsims.py --update --ref <sha>`) — a slash nests the vendor "
            "directory (docs/reviews/feat-engine-pin-backend-reforge.md)",
            file=sys.stderr,
        )
        return 2

    if args.commit is None and not FULL_SHA_RE.match(tag):
        print(
            f"lock tag `{tag}` is neither a release tag (vX.Y.Z) nor a 40-character "
            f"commit sha, so it does not name the commit the build would use "
            f"(`{lock['commit'][:12]}`). Building anyway would stamp the binary with "
            "a version it does not have. Re-pin with "
            "`sync_wowsims.py --update --ref <sha>` or `--tag <vX.Y.Z>`, or pass "
            "--commit to build from source deliberately.",
            file=sys.stderr,
        )
        return 2

    if args.commit is None and tag != lock["commit"]:
        print(
            f"lock tag `{tag[:12]}` and lock commit `{lock['commit'][:12]}` are both "
            "shas but disagree; the lockfile is inconsistent. Re-run "
            "`sync_wowsims.py --update --ref <sha>`.",
            file=sys.stderr,
        )
        return 2

    commit = args.commit or lock["commit"]
    dir_name = args.tag_dir or (commit if args.commit else tag)
    # Every consumer resolves the vendor directory from lock["tag"], so a
    # directory named anything else holds a binary nothing will pick up. That is
    # what --commit is for (pre-pin proving), but silence here means a developer
    # can watch this build succeed and then run the OLD binary (ticket 357 (b)).
    if args.commit is not None and dir_name != tag:
        print(
            f"NOTE: proving build only -- vendor/wowsimcli-{dir_name}-{args.platform} "
            f"is not the directory lock.tag (`{tag[:12]}`) resolves, so pnpm rank and "
            "the fixtures recorder will keep using the pinned build."
        )
    dest_dir = VENDOR / f"wowsimcli-{dir_name}-{args.platform}"
    build_from_source(commit, args.platform, dest_dir)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
