#!/usr/bin/env python3
"""Run the Upgrades-tab layout gate when a merge changed the tab's layout.

Ticket 322 shipped `vendor/tbc-new-fork/test-layout.mjs` (`npm run test:layout`):
a DOM-geometry gate that renders the Upgrades tab headless and asserts layout
facts at four widths. It works and it bites -- but ticket 325 found nothing runs
it. This script is that wiring, invoked from `scripts/merge_to_dev.py` so the
gate fires on the one path where a finished feature is folded into `dev`.

Why here and not `pnpm verify`: the test takes ~2m19s and needs three things
that exist only on the main checkout -- the fork clone, a prior `make host`
build (`dist/tbc/lib.wasm.gz` -- or the uncompressed `dist/tbc/lib.wasm` --
plus `dist/tbc/assets`), and a Playwright Chromium.
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
component, its SCSS, the sim-tab shell, the ranking engine that produces the
result rows assertions 6-8 measure, AND the shared SCSS the tab's asserted
geometry resolves through (the breakpoint map and layout tokens in
`shared/_variables.scss`, the root font-size and spacer overrides in
`shared/_global.scss`, and `--sim-header-height` in `core/sim_ui/_shared.scss`
-- see SHARED_LAYOUT_FILES for why each is load-bearing) -- into one digest, and
compares it to the digest recorded the last time the gate ran green
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

That distinction cannot be drawn from the exit code: `test-layout.mjs` exits 1
both when it measured the geometry and found it wrong AND when it crashed on a
prereq before measuring anything. So the test prints a machine-readable verdict
line (`LAYOUT_GATE_VERDICT {...}`, outcome `measured` or `unmeasured`) and this
script reads it. `unmeasured` is reported as a skip -- and the baseline is left
alone, because recording a digest the gate never actually tested would skip the
gate forever, which is the "report success by skipping" failure mode again.

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
from collections.abc import Callable
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FORK_ROOT = ROOT / "vendor/tbc-new-fork"
LAYOUT_TEST = FORK_ROOT / "test-layout.mjs"
# The build-completed sentinel, in both the shapes `make host` can leave behind.
# The makefile's wasm recipe (vendor/tbc-new-fork/makefile:112) ends with
# `gzip -9 -f -n $(OUT_DIR)/lib.wasm`, which REPLACES the uncompressed file --
# so after the very `make host` this gate's own skip message tells you to run,
# only `lib.wasm.gz` is on disk. Checking solely for `lib.wasm` made the gate
# skip permanently and report success by skipping. The gzipped form is also the
# one the app actually fetches (`SIM_WASM_URL` in ui/core/worker_pool.ts), so it
# is the normal post-build state, not a degraded one. Either file present means
# the WASM build completed; nothing here reads the bytes.
DIST_WASM_CANDIDATES = (
    FORK_ROOT / "dist/tbc/lib.wasm.gz",
    FORK_ROOT / "dist/tbc/lib.wasm",
)
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
# them moving must re-arm the gate.
SHELL_FILES = (
    "ui/core/components/individual_sim_ui/upgrades_tab.tsx",
    "ui/scss/core/components/individual_sim_ui/_upgrades_tab.scss",
    "ui/scss/core/components/_sim_tab.scss",
    "ui/core/components/sim_tab.ts",
)

# The shared SCSS the tab's asserted geometry resolves THROUGH. The two tab SCSS
# files above declare no `@use`/`@import`; they consume globally-injected Sass
# variables and CSS custom properties, so a change in these shared files re-lays
# the tab at the exact widths the gate measures without touching a SHELL_FILE.
# Omitting them was finding A1 (round-2 review): editing `xl: 1200px -> 1100px`
# re-lays the tab at the asserted widths while `testedTabHash` stays put, so the
# gate would SKIP and a broken tab would merge green.
#
# Each is here because it feeds a measured assertion, not merely because the tab
# imports it:
#   - shared/_variables.scss  -- `$grid-breakpoints` (the values the
#     `media-breakpoint-*` mixins read; asserts 2/4/5 gate on xl=1200 / lg=992 /
#     md) AND the layout tokens the asserted rules consume (`--gap-width`,
#     `--container-padding`, `--section-spacer`, `--spacer-3`, `--border-default`).
#   - shared/_global.scss  -- the `:root` font-size (the rem base under every
#     dimension) and the `lg`/`xxl` `!important` overrides of `--section-spacer`
#     / `--container-padding` (they apply at >= lg = 992, i.e. the 1280 band).
#   - core/sim_ui/_shared.scss  -- `--sim-header-height` (assert 3's sticky
#     `top:`) with its `lg` override, and the `.sim-container` / `.sim-content`
#     flex host the tab renders inside.
#
# Boundary this digest does NOT cover (stated, not hidden): the Bootstrap
# `media-breakpoint-*` mixins themselves live in `node_modules`
# (`bootstrap/scss/mixins`), pinned by the fork's lockfile, not in the fork's own
# source -- a Bootstrap bump is governed by the lockfile, not by this hash. The
# digest is over the fork's OWN layout source.
SHARED_LAYOUT_FILES = (
    "ui/scss/shared/_variables.scss",
    "ui/scss/shared/_global.scss",
    "ui/scss/core/sim_ui/_shared.scss",
)


def _iter_layout_files() -> list[Path]:
    """Every fork source file whose content the gate depends on, sorted.

    Sorted by fork-relative posix path so the digest is stable across OSes and
    filesystem walk order. Missing shell files are reported by the caller (they
    are a real error -- the tab cannot render without them); the engine dir is
    globbed, so a renamed engine file just changes the digest.
    """
    files = [FORK_ROOT / rel for rel in SHELL_FILES + SHARED_LAYOUT_FILES]
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
    data["_comment"] = (
        "testedTabHash is the sha256 (over fork-relative path + bytes) of the "
        "Upgrades-tab layout source at the last green run of the layout gate: the "
        "shell files (upgrades_tab.tsx, _upgrades_tab.scss, _sim_tab.scss, "
        "sim_tab.ts), the ranking engine (upgrades/engine/**/*.ts), AND the shared "
        "SCSS the tab's asserted geometry resolves through -- shared/_variables.scss "
        "($grid-breakpoints + the layout tokens the asserted rules read), "
        "shared/_global.scss (root font-size + lg/xxl spacer overrides), and "
        "core/sim_ui/_shared.scss (--sim-header-height + the sim-content host). The "
        "shared files are hashed because the two tab SCSS files import nothing and "
        "consume globally-injected variables, so a breakpoint or token edit re-lays "
        "the tab at the asserted widths without touching a shell file (review "
        "finding A1). NOT covered: Bootstrap's own media-breakpoint mixins, which "
        "live in node_modules and are pinned by the fork's lockfile, not the fork's "
        "source. scripts/check_layout_gate.py compares the live digest to this on "
        "`pnpm merge-to-dev`; equal means the layout source that last passed is "
        "still on disk, so the ~2m19s gate is skipped. Advanced only by a green gate "
        "run (merge_to_dev commits the advance onto the feature branch so it enters "
        "the merge) or by --update-baseline after a hand-proven layout change. The "
        "fork itself is gitignored, so this record lives here rather than in the fork."
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


# The tagged verdict line `test-layout.mjs` prints just before it exits. The
# gate exits 1 for two unrelated things -- geometry it measured and found
# wrong, and a crash before it measured anything -- so the exit code alone
# cannot tell "the tab is broken" from "a prereq is missing". Reporting the
# second as the first is a false accusation and contradicts this script's own
# rule that a prereq absence never vetoes a merge. The verdict line is the
# discrimination: outcome "measured" (with a failure count) or "unmeasured"
# (with a reason). Preferred over matching an error string because it is a
# contract the test states deliberately, not an incidental phrasing.
VERDICT_TAG = "LAYOUT_GATE_VERDICT"


def _parse_verdict(stdout: str) -> dict | None:
    """The last tagged verdict line in `stdout`, parsed, or None if absent.

    None means the gate predates the verdict contract (an older fork clone) --
    the caller falls back to the exit code, which is the pre-existing
    behaviour.
    """
    found = None
    for line in stdout.splitlines():
        line = line.strip()
        if not line.startswith(VERDICT_TAG):
            continue
        try:
            parsed = json.loads(line[len(VERDICT_TAG) :].strip())
        except ValueError:
            continue
        if isinstance(parsed, dict):
            found = parsed
    return found


# run_gate's third outcome, distinct from both 0 (green) and 1 (broken): the
# gate did not measure anything, so the merge is not blocked BUT the baseline
# must not advance either. Advancing it would record an untested digest as
# tested and permanently skip the gate -- the same "report success by skipping"
# failure the lib.wasm.gz bug caused. Not an exit code; `run()` maps it to 0.
GATE_UNMEASURED = -1


def run_gate() -> int:
    """Run test:layout in the fork.

    Returns 0 (the gate ran green), 1 (the gate MEASURED the layout and it is
    broken), or GATE_UNMEASURED (it never measured a width, so it learned
    nothing about the tab and nothing may be blamed on it -- and nothing may be
    recorded as tested either).

    Caller has checked prereqs.
    """
    cmd = _layout_command()
    if cmd is None:
        print(
            "layout gate: SKIPPED -- no Node >= 22 and no `fnm` to select it. "
            "test-layout.mjs needs Node 22 (global WebSocket); refusing to run "
            "it on an older Node rather than fail for the wrong reason.",
        )
        return GATE_UNMEASURED
    argv, how = cmd
    print(f"layout gate: running `{' '.join(argv)}` in {FORK_ROOT} ({how})")
    print("(this renders the Upgrades tab headless at 4 widths; ~2-3 min)")
    # stdout is teed rather than buffered: each line is echoed as it arrives so
    # a ~2-3 minute run still shows progress live, while the verdict line is
    # kept for the run/skip decision below. stderr stays attached to the
    # terminal untouched.
    stdout_lines: list[str] = []
    with subprocess.Popen(
        argv,
        cwd=str(FORK_ROOT),
        stdout=subprocess.PIPE,
        text=True,
        encoding="utf-8",
        errors="replace",
        bufsize=1,
    ) as proc:
        assert proc.stdout is not None
        for line in proc.stdout:
            stdout_lines.append(line)
            print(line, end="", flush=True)
    captured = "".join(stdout_lines)

    if proc.returncode == 0:
        return 0

    v = _parse_verdict(captured)
    if v is None:
        # An older fork clone with no verdict contract. Fall back to the exit
        # code and say that the verdict is inferred, not read.
        print(
            "layout gate: test-layout.mjs printed no "
            f"{VERDICT_TAG} line (a fork clone predating the verdict contract) "
            "-- treating the nonzero exit as a layout failure, which is the "
            "old behaviour and may instead be a crash. Read the output above.",
            file=sys.stderr,
        )
        return 1

    if v.get("outcome") == "unmeasured":
        reason = v.get("reason") or "no reason reported"
        print(
            f"layout gate: SKIPPED -- test-layout.mjs exited {proc.returncode} "
            "without measuring any width, so it learned nothing about the tab's "
            f"layout. Reason: {reason}. This is a prereq/environment problem, "
            "not a layout failure, and does not block the merge. The baseline "
            "is left where it is, so the gate stays armed for the next attempt."
        )
        return GATE_UNMEASURED

    return 1


def _skip(msg: str) -> int:
    print(f"layout gate: SKIPPED -- {msg}")
    return 0


def run(
    print_hash: bool = False,
    update_baseline: bool = False,
    on_baseline_advanced: Callable[[Path, str], None] | None = None,
) -> int:
    """The gate. `merge_to_dev.py` calls this directly, argv-free.

    Kept separate from `main()` so the merge path never re-parses its own
    command line through this module's argparse -- `pnpm merge-to-dev
    --check-only` would otherwise hand `--check-only` to a parser that does not
    know it.

    `on_baseline_advanced`, when given, is called with (LOCK_PATH, new_digest)
    after -- and only after -- a green gate run rewrites the lock to a NEW
    digest. It is the caller's hook to persist that write so it does not leave
    the tree dirty: `merge_to_dev.py` uses it to commit the lock onto the
    feature branch BEFORE `git checkout dev`, so the advance enters the merge
    instead of being stranded uncommitted (review finding A2). The callback
    fires only on the green-advance path, so the skip-clean and fail-closed
    paths never touch git.
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
    if not any(p.is_file() for p in DIST_WASM_CANDIDATES) or not DIST_ASSETS.is_dir():
        wanted = " or ".join(
            p.relative_to(FORK_ROOT).as_posix() for p in DIST_WASM_CANDIDATES
        )
        return _skip(
            "the fork's built dist/ is absent (no prior `make host`: needs "
            f"{wanted}, plus "
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
    if rc == GATE_UNMEASURED:
        # Nothing was measured. Do not block, and do NOT advance the baseline:
        # recording an untested digest as tested would skip the gate forever.
        return 0
    if rc == 0:
        write_baseline(digest)
        print(
            f"\nlayout gate: PASSED. Advanced the baseline to {digest[:12]}... in "
            f"{_rel_root(LOCK_PATH)} -- this change is part of "
            "the merge; commit it so the next merge skips a re-test of the same "
            "source."
        )
        if on_baseline_advanced is not None:
            # Persist the advance now, before control returns to a caller that
            # may `git checkout dev` -- otherwise the write is stranded
            # uncommitted and never enters the merge (review finding A2).
            on_baseline_advanced(LOCK_PATH, digest)
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
