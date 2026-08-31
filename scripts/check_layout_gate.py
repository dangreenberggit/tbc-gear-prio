#!/usr/bin/env python3
"""Run the Upgrades-tab layout gate when a merge changed the tab's layout.

Ticket 322 shipped `vendor/tbc-new-fork/test-layout.mjs` (`npm run test:layout`):
a DOM-geometry gate that renders the Upgrades tab headless and asserts layout
facts at four widths. It works and it bites -- but ticket 325 found nothing runs
it. This script is that wiring, invoked from `scripts/merge_to_dev.py` so the
gate fires on the one path where a finished feature is folded into `dev`.

Why here and not `pnpm verify`: the test takes ~2m19s and needs three things
that exist only on the main checkout -- the fork clone, a prior `make host`
build (`dist/tbc/lib.wasm` + `dist/tbc/assets`), and a Playwright Chromium.
`pnpm verify` runs on every push and inside CI, where none of those is present
and where the cost would be paid every time. `pnpm merge-to-dev` runs on the
main checkout, at the moment a feature ships, only when the developer asks --
the right cadence for a slow, prereq-heavy gate (ticket 325 options file,
Option-B build note, folding in the merge-gate placement the owner chose over
`pnpm verify`).

Fork-aware change detection, and why it cannot use the merge diff
-----------------------------------------------------------------
The tab's layout source lives in the fork (`vendor/tbc-new-fork`), which is a
SEPARATE git repo, gitignored from this one. A "did this merge touch a tab
file?" check run against THIS repo's diff answers "no" every time -- even the
big `feat/wowsims-tab-tickets` merge shows zero fork files in `git show --stat`,
because the fork's files are not tracked here at all. So the merge diff is the
wrong instrument.

Instead this compares CONTENT. It hashes the fork's layout source -- the tab
component, its SCSS, the sim-tab shell, and the ranking engine that produces the
result rows assertions 6-8 measure -- into one digest, and compares it to the
digest recorded the last time the gate ran green
(`data/wowsims-fork-layout.lock.json`, `testedTabHash`). Equal digest ->
the exact tab source that last passed is still on disk -> nothing to re-test ->
skip. Different digest -> the layout source moved since the last green run ->
run the gate. On a green run the recorded digest is advanced (and the caller is
told to commit it). This is the same content-hash-vs-committed-record shape as
`scripts/check_engine_port_drift.py`, chosen for the same reason: the fork's
commit history is not keyed to this repo's branches, so a byte digest of the
files themselves is the honest question.

Skip cleanly, and the run/skip/fail distinction
-----------------------------------------------
Absence of a prerequisite is an ordinary state, never a merge veto:

  - the fork clone is absent (fresh clone, CI)            -> skip, exit 0
  - the built `dist/` is absent (no prior `make host`)    -> skip, exit 0
  - no Playwright Chromium is on disk                      -> skip, exit 0
  - the tab digest equals the last green-tested digest     -> skip, exit 0

Only a real assertion failure from `test-layout.mjs` -- the gate RAN and the
layout is broken -- returns nonzero and blocks the merge. A rotted browser path
or a stale `dist/` must never wall off a merge; those are "skipped, prereq
absent", reported as such and distinguished from "ran and failed".

Node 22 note
------------
`test-layout.mjs` uses Node 22's global `WebSocket` and `node:*` modules. This
script launches it under `fnm exec --using=22` when `fnm` is on PATH and the
running interpreter's Node is older, so the gate does not silently misbehave on
a shell that resolved Node 20. If neither a suitable Node nor `fnm` is
available, that is reported and the gate is skipped rather than run wrong.

Usage
-----
    python scripts/check_layout_gate.py            # run/skip per the rules above
    python scripts/check_layout_gate.py --print-hash   # print the current tab digest and exit
    python scripts/check_layout_gate.py --update-baseline
        # recompute and write testedTabHash WITHOUT running the gate. For
        # seeding the record, or after a deliberate layout change already
        # proven by hand. Prints the new digest; commit the lock file.

Exit codes: 0 = ok (ran green, or skipped for any reason above); 1 = the gate
ran and the layout is broken; 2 = a real error (could not read a tracked source
file that the record expects).
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FORK_ROOT = ROOT / "vendor/tbc-new-fork"
LAYOUT_TEST = FORK_ROOT / "test-layout.mjs"
DIST_WASM = FORK_ROOT / "dist/tbc/lib.wasm"
DIST_ASSETS = FORK_ROOT / "dist/tbc/assets"
LOCK_PATH = ROOT / "data/wowsims-fork-layout.lock.json"

ENGINE_DIR = FORK_ROOT / "ui/core/components/individual_sim_ui/upgrades/engine"

# The fork source `test-layout.mjs` actually renders and measures.
#
# The shell files drive assertions 1-5 (the pre-run layout): the tab component
# builds the DOM, the two SCSS files style it, and the sim-tab shell hosts it.
# The engine directory drives assertions 6-8 (row legibility): those measure the
# result rows a real WASM run lands, and the ranking engine is what produces
# them. A change to any of these can change what the gate observes, so any of
# them moving must re-arm the gate. `*.scss` partials the tab imports transitively
# are covered only if they are one of these named files; the gate's own comments
# name `_upgrades_tab.scss` and `_sim_tab.scss` as the styles it asserts on
# (`test-layout.mjs:248`), so those two are the layout contract.
SHELL_FILES = (
    "ui/core/components/individual_sim_ui/upgrades_tab.tsx",
    "ui/scss/core/components/individual_sim_ui/_upgrades_tab.scss",
    "ui/scss/core/components/_sim_tab.scss",
    "ui/core/components/sim_tab.ts",
)


def _iter_layout_files() -> list[Path]:
    """Every fork source file whose content the gate depends on, sorted.

    Sorted by fork-relative posix path so the digest is stable across OSes and
    filesystem walk order. Missing shell files are reported by the caller (they
    are a real error -- the tab cannot render without them); the engine dir is
    globbed, so a renamed engine file just changes the digest.
    """
    files = [FORK_ROOT / rel for rel in SHELL_FILES]
    if ENGINE_DIR.is_dir():
        files.extend(sorted(ENGINE_DIR.rglob("*.ts")))
    return files


def _rel(path: Path) -> str:
    return path.relative_to(FORK_ROOT).as_posix()


def _rel_root(path: Path) -> str:
    """Repo-relative posix path, falling back to the raw string off-tree.

    The lock lives under ROOT in production, but keeping the display robust the
    way `_fork_gate._display` does means a message never crashes just because a
    caller pointed a path elsewhere (a test harness, a relocated checkout)."""
    try:
        return path.relative_to(ROOT).as_posix()
    except ValueError:
        return str(path)


def compute_tab_hash() -> tuple[str, list[str]]:
    """(digest, missing) over the layout source. Pure but for file reads.

    The digest folds in each file's fork-relative path as well as its bytes, so
    a rename or a delete moves the digest even when the surviving bytes are
    unchanged. `missing` lists any expected shell file absent from disk.
    """
    h = hashlib.sha256()
    missing: list[str] = []
    for path in sorted(_iter_layout_files(), key=_rel):
        rel = _rel(path)
        if not path.is_file():
            missing.append(rel)
            continue
        h.update(rel.encode("utf-8"))
        h.update(b"\0")
        h.update(path.read_bytes())
        h.update(b"\0")
    return h.hexdigest(), missing


def read_baseline() -> str | None:
    try:
        data = json.loads(LOCK_PATH.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return None
    if not isinstance(data, dict):
        return None
    val = data.get("testedTabHash")
    return val if isinstance(val, str) and val else None


def write_baseline(digest: str) -> None:
    """Write testedTabHash, preserving any other keys already in the lock."""
    data: dict = {}
    if LOCK_PATH.is_file():
        try:
            loaded = json.loads(LOCK_PATH.read_text(encoding="utf-8"))
            if isinstance(loaded, dict):
                data = loaded
        except ValueError:
            pass
    data["testedTabHash"] = digest
    data.setdefault(
        "_comment",
        "testedTabHash is the sha256 (over fork-relative path + bytes of the "
        "Upgrades-tab layout source: upgrades_tab.tsx, _upgrades_tab.scss, "
        "_sim_tab.scss, sim_tab.ts, and upgrades/engine/**/*.ts) at the last "
        "green run of the layout gate. scripts/check_layout_gate.py compares "
        "the live digest to this on `pnpm merge-to-dev`; equal means the tab "
        "source that last passed is still on disk, so the ~2m19s gate is "
        "skipped. Advanced only by a green gate run (commit the change) or by "
        "--update-baseline after a hand-proven layout change. The fork itself "
        "is gitignored, so this record lives here rather than in the fork.",
    )
    LOCK_PATH.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")


def _find_chromium() -> Path | None:
    """A Playwright Chromium on disk, or None. Mirrors test-layout.mjs findChromium.

    The layout test throws when it cannot find one, which would surface as a
    nonzero exit and read as "layout broken". A missing browser is a prereq
    absence, not a layout failure, so it must be detected here and turned into a
    clean skip -- the run/skip/fail distinction the whole gate is built on. The
    search matches the fork's own: any `chromium-*/chrome-win64/chrome.exe` under
    the user's `ms-playwright`, so a version bump that moves the pinned path
    still counts as present.
    """
    base = Path(os.path.expanduser("~")) / "AppData" / "Local" / "ms-playwright"
    if not base.is_dir():
        return None
    try:
        for child in sorted(base.iterdir()):
            if not child.name.startswith("chromium-"):
                continue
            exe = child / "chrome-win64" / "chrome.exe"
            if exe.is_file():
                return exe
    except OSError:
        return None
    return None


def _node_major(node_exe: str = "node") -> int | None:
    try:
        out = subprocess.run(
            [node_exe, "--version"], capture_output=True, text=True, timeout=15
        )
    except (OSError, subprocess.SubprocessError):
        return None
    v = out.stdout.strip().lstrip("v")
    try:
        return int(v.split(".")[0])
    except (ValueError, IndexError):
        return None


def _layout_command() -> tuple[list[str], str] | None:
    """The argv that runs test:layout under Node >= 22, or None if unavailable.

    Returns (argv, how) where `how` names the interpreter path chosen, for the
    log. `npm run test:layout` is the fork's own script (package.json), run with
    cwd at the fork. Node 22 is required; if the ambient node is already >= 22
    it is used directly, else `fnm exec --using=22` is preferred when fnm is on
    PATH. When neither is available the gate is skipped, not run wrong.
    """
    npm = "npm.cmd" if os.name == "nt" and shutil.which("npm.cmd") else "npm"
    ambient = _node_major("node")
    if ambient is not None and ambient >= 22:
        return [npm, "run", "test:layout"], f"ambient node v{ambient}"

    fnm = shutil.which("fnm")
    if fnm:
        return [fnm, "exec", "--using=22", npm, "run", "test:layout"], "fnm --using=22"

    return None


def run_gate() -> int:
    """Run test:layout in the fork. 0 green, 1 broken. Caller has checked prereqs."""
    cmd = _layout_command()
    if cmd is None:
        print(
            "layout gate: SKIPPED -- no Node >= 22 and no `fnm` to select it. "
            "test-layout.mjs needs Node 22 (global WebSocket); refusing to run "
            "it on an older Node rather than fail for the wrong reason.",
        )
        return 0
    argv, how = cmd
    print(f"layout gate: running `{' '.join(argv)}` in {FORK_ROOT} ({how})")
    print("(this renders the Upgrades tab headless at 4 widths; ~2-3 min)")
    proc = subprocess.run(argv, cwd=str(FORK_ROOT))
    return proc.returncode


def _skip(msg: str) -> int:
    print(f"layout gate: SKIPPED -- {msg}")
    return 0


def run(print_hash: bool = False, update_baseline: bool = False) -> int:
    """The gate. `merge_to_dev.py` calls this directly, argv-free.

    Kept separate from `main()` so the merge path never re-parses its own
    command line through this module's argparse -- `pnpm merge-to-dev
    --check-only` would otherwise hand `--check-only` to a parser that does not
    know it.
    """
    if not FORK_ROOT.is_dir():
        return _skip(
            "vendor/tbc-new-fork is absent (the clone is gitignored and is not "
            "restored in CI). The tab layout lives only on the main checkout."
        )

    digest, missing = compute_tab_hash()
    if missing:
        # A shell file the tab cannot render without is gone. This is not an
        # ordinary absence like a missing clone -- the fork is present but a
        # tracked layout source is not. Report it as an error, not a skip.
        print(
            "layout gate: cannot hash the tab source -- these expected files are "
            "missing from the fork:",
            file=sys.stderr,
        )
        for rel in missing:
            print(f"  - {rel}", file=sys.stderr)
        return 2

    if print_hash:
        print(digest)
        return 0

    if update_baseline:
        write_baseline(digest)
        print(f"layout gate: baseline set to {digest}")
        print(f"  wrote {_rel_root(LOCK_PATH)} -- commit it.")
        return 0

    baseline = read_baseline()
    if baseline == digest:
        return _skip(
            f"tab layout source unchanged since the last green run "
            f"(digest {digest[:12]}...). Nothing to re-test."
        )

    if not LAYOUT_TEST.is_file():
        return _skip(
            f"{LAYOUT_TEST.relative_to(FORK_ROOT).as_posix()} is absent from the "
            "fork -- the clone is present but predates the layout gate "
            "(ticket 322). Nothing to run."
        )
    if not DIST_WASM.is_file() or not DIST_ASSETS.is_dir():
        return _skip(
            "the fork's built dist/ is absent (no prior `make host`: "
            f"{DIST_WASM.relative_to(FORK_ROOT).as_posix()} / "
            f"{DIST_ASSETS.relative_to(FORK_ROOT).as_posix()}). The gate builds "
            "the bundle on top of it and cannot run without it. Run `make host` "
            "in the fork once to arm the gate."
        )
    if _find_chromium() is None:
        return _skip(
            "no Playwright Chromium found under ~/AppData/Local/ms-playwright "
            "(chromium-*/chrome-win64/chrome.exe). The gate drives a headless "
            "Chromium and cannot run without one -- a missing/rotted browser "
            "path skips the gate rather than blocking the merge."
        )

    if baseline is None:
        print(
            "layout gate: no recorded baseline "
            f"({_rel_root(LOCK_PATH)} absent or unreadable) -- "
            "treating this as a tab change and running the gate."
        )
    else:
        print(
            "layout gate: tab layout source changed since the last green run "
            f"(recorded {baseline[:12]}..., now {digest[:12]}...) -- running the gate."
        )

    rc = run_gate()
    if rc == 0:
        write_baseline(digest)
        print(
            f"\nlayout gate: PASSED. Advanced the baseline to {digest[:12]}... in "
            f"{_rel_root(LOCK_PATH)} -- this change is part of "
            "the merge; commit it so the next merge skips a re-test of the same "
            "source."
        )
        return 0

    print(
        f"\nlayout gate: FAILED (test:layout exited {rc}). The Upgrades tab "
        "layout is broken at one or more widths -- see the failures above. The "
        "merge is blocked. Fix the layout, or if this is an intended change run "
        "the gate green before merging.",
        file=sys.stderr,
    )
    return 1


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument(
        "--print-hash",
        action="store_true",
        help="print the current tab digest and exit (no gate, no write)",
    )
    ap.add_argument(
        "--update-baseline",
        action="store_true",
        help="write testedTabHash from the current source WITHOUT running the gate",
    )
    args = ap.parse_args()
    return run(print_hash=args.print_hash, update_baseline=args.update_baseline)


if __name__ == "__main__":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass
    raise SystemExit(main())
