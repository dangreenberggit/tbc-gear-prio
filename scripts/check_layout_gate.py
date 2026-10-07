#!/usr/bin/env python3
"""Run the Upgrades-tab layout gate when a merge changed the tab's layout.

Ticket 322 shipped `vendor/tbc-new-fork/test-layout.mjs` (`npm run test:layout`):
a DOM-geometry gate that renders the Upgrades tab headless and asserts layout
facts at four widths. It works and it bites -- but ticket 325 found nothing runs
it. This script is that wiring, invoked from `scripts/merge_to_dev.py` so the
gate fires on the one path where a finished feature is folded into `dev`.

Why here and not `pnpm verify`: the test is slow and needs three things
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

Instead this compares CONTENT. It hashes the fork's layout source -- the
React tab's own source under `ui/features/upgrades/` (components, hooks, model
including the ranking engine whose view code renders the rows the fixture pass
measures, and the pool data), the tab body and its registration point, and the
theme CSS the tab's measured geometry resolves through (breakpoints, spacing,
typography, the two-column frame) -- see `_iter_layout_files` -- into one digest, and
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
ran and MEASURED a failure -- a broken layout OR an unbaselined critical/serious
accessibility violation (the fork's test-layout.mjs exits 1 for either, and this
script blocks on any measured nonzero exit, so the a11y ratchet needs no branch
here), or the gate would run but its tab fixture is missing or unreadable; 2 = a
real error (could not read a tracked source file that the record
expects).

Accessibility: the gate passes TBC_A11Y_BASELINE (data/wowsims-fork-a11y-baseline.json)
to the fork script when it exists, so seeded/known violations are tracked debt
and only NEW critical/serious ones block. Absent -> the fork runs strict.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import shutil
import subprocess
import sys
from collections.abc import Callable, Sequence
from pathlib import Path
from typing import NamedTuple

from check_tab_fixtures import FIXTURE_DIR, check_fixture

ROOT = Path(__file__).resolve().parents[1]
FORK_ROOT = ROOT / "vendor/tbc-new-fork"
LAYOUT_TEST = FORK_ROOT / "test-layout.mjs"
# The build-completed sentinel, in both the shapes `make host` can leave behind.
# The makefile's wasm recipe (vendor/tbc-new-fork/makefile:112) ends with
# `gzip -9 -f -n $(OUT_DIR)/lib.wasm`, which REPLACES the uncompressed file --
# so after the very `make host` this gate's own skip message tells you to run,
# only `lib.wasm.gz` is on disk. Checking solely for `lib.wasm` made the gate
# skip permanently and report success by skipping. The gzipped form is also the
# one the app actually fetches (`SIM_WASM_URL` in ui/sim/workers/worker_pool.ts), so it
# is the normal post-build state, not a degraded one. Either file present means
# the WASM build completed; nothing here reads the bytes.
DIST_WASM_CANDIDATES = (
    FORK_ROOT / "dist/tbc/lib.wasm.gz",
    FORK_ROOT / "dist/tbc/lib.wasm",
)
DIST_ASSETS = FORK_ROOT / "dist/tbc/assets"
LOCK_PATH = ROOT / "data/wowsims-fork-layout.lock.json"
# The accepted-a11y-debt baseline the fork's test-layout.mjs reads via
# TBC_A11Y_BASELINE. Absent -> the fork script runs strict (every
# critical/serious WCAG violation fails). Seeded once from a real gate run;
# each entry carries a ticket or a wontfix reason. Lives here, not in the fork,
# for the same reason the layout lock does: the fork is gitignored.
A11Y_BASELINE_PATH = ROOT / "data/wowsims-fork-a11y-baseline.json"

# The fork source `test-layout.mjs` renders and measures (ticket 560 re-derived
# it for the React tab; the old tab's files and its shared SCSS are gone).
#
# TAB_DIR: every non-test `.ts`, `.tsx` and `.css` file of the tab feature --
# its components and hooks build the DOM the pre-run checks measure, and its
# model (the ranking engine's view code among it) renders the rows the fixture
# pass measures. Globbed, so a new or renamed tab file moves the digest.
# TAB_DATA_DIRS: every non-test file of the tab's adapters and pool data, JSON
# included (the fixture loader is an adapter, and the pool feeds the settings
# column's sources, sets and eligible count), as before ticket 560 (finding A8).
TAB_DIR = FORK_ROOT / "ui/features/upgrades"
TAB_SOURCE_SUFFIXES = frozenset({".ts", ".tsx", ".css"})
TAB_DATA_DIRS = ("model/adapters", "model/data")
# Gitignored in the fork (its .gitignore names it): the owner's own WCL
# credentials. Hashing it would tie the committed digest to one machine's
# secrets file.
LOCAL_ONLY_FILES = frozenset({"local.wcl-credentials.ts"})

# Named fork files outside the tab feature that change what the gate observes.
# Each must exist: a missing one fails the script with its name (exit 2).
#   - ui/app/tabs/UpgradesTabBody.tsx, ui/app/SimTabsSection.tsx -- the tab
#     body and the place the tab is registered among the sim tabs.
#   - ui/styles/theme/breakpoints.css -- the only `--breakpoint-*` definer;
#     the gate's widths straddle `xl` (checks 2 and 3 switch on it).
#   - ui/styles/theme/spacing.css, typography.css -- the spacing scale and
#     the root font size every rem-based width (the results column widths
#     among them) resolves through.
#   - ui/ui-kit/TabPanelColumns/TabPanelColumns.css -- the two-column frame
#     whose gap check 13 measures.
#   - assets/locales/en/translation.json -- the accessible names the axe pass
#     reads are locale strings, so a copy edit can be an accessibility change.
#   - vite.config.mts -- it defines `__TBC_TAB_FIXTURES__`, which decides
#     whether the fixture pass's code is in the bundle at all (finding A8).
# NOT covered: Tailwind's own utilities and the upstream ui-kit components
# other than the frame above; the fork's lockfile and upstream base pin them,
# and the tab does not edit them.
LAYOUT_FILES = (
    "ui/app/tabs/UpgradesTabBody.tsx",
    "ui/app/SimTabsSection.tsx",
    "ui/styles/theme/breakpoints.css",
    "ui/styles/theme/spacing.css",
    "ui/styles/theme/typography.css",
    "ui/ui-kit/TabPanelColumns/TabPanelColumns.css",
    "assets/locales/en/translation.json",
    "vite.config.mts",
)


# Files outside the fork source that decide what the gate measures, hashed by
# ROOT-relative name (never through `_rel`, which is fork-relative). The
# recorded tab fixtures (ticket 504) are what the fixture pass renders, and the
# two harness files are the assertions themselves: editing either changes the
# gate's verdict without touching a line of tab source.
ROOT_GATE_FILES = (
    "vendor/tbc-new-fork/test-layout.mjs",
    "vendor/tbc-new-fork/test-tab-harness.mjs",
    "vendor/tbc-new-fork/test-review.mjs",
)
# The fixture the fixture pass renders unless `--fixture` names another: feral
# on the Phase 2 BiS preset at page phase 3, which has set rows.
DEFAULT_FIXTURE = FIXTURE_DIR / "feral-p3-p2bis.json"


def _iter_root_gate_files() -> list[Path]:
    files = [ROOT / rel for rel in ROOT_GATE_FILES]
    if FIXTURE_DIR.is_dir():
        files.extend(sorted(FIXTURE_DIR.glob("*.json")))
    return files


def _is_hashed_tab_file(path: Path, suffixes: frozenset[str] | None) -> bool:
    if not path.is_file() or ".test." in path.name or path.name in LOCAL_ONLY_FILES:
        return False
    return suffixes is None or path.suffix in suffixes


def _iter_layout_files() -> list[Path]:
    """Every fork source file whose content the gate depends on, sorted.

    Sorted by fork-relative posix path so the digest is stable across OSes and
    filesystem walk order. A missing LAYOUT_FILES entry stays in the list so
    the caller reports it by name; the tab directories are globbed, so a
    renamed tab file just changes the digest.
    """
    files = {FORK_ROOT / rel for rel in LAYOUT_FILES}
    if TAB_DIR.is_dir():
        files.update(
            p for p in TAB_DIR.rglob("*") if _is_hashed_tab_file(p, TAB_SOURCE_SUFFIXES)
        )
        for sub in TAB_DATA_DIRS:
            d = TAB_DIR / sub
            if d.is_dir():
                files.update(p for p in d.rglob("*") if _is_hashed_tab_file(p, None))
    return sorted(files, key=_rel)


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
    unchanged. `missing` lists any LAYOUT_FILES entry absent from disk.
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
    # An absent harness file is not reported as missing: a clone that predates
    # the gate must keep its "nothing to run" skip below, not become an error.
    for path in sorted(_iter_root_gate_files(), key=_rel_root):
        h.update(_rel_root(path).encode("utf-8"))
        h.update(b"\0")
        h.update(path.read_bytes() if path.is_file() else b"<absent>")
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
        "Upgrades-tab layout source at the last green run of the layout gate "
        "(scripts/check_layout_gate.py `_iter_layout_files`; re-derived for the "
        "React tab by ticket 560): every non-test .ts/.tsx/.css file under "
        "ui/features/upgrades/ (components, hooks, and the model with the "
        "ranking engine), every non-test file of its model/adapters/ and "
        "model/data/ (pool data, except the gitignored local.wcl-credentials.ts), "
        "the tab body ui/app/tabs/UpgradesTabBody.tsx and its registration "
        "ui/app/SimTabsSection.tsx, the theme CSS the measured geometry resolves "
        "through (ui/styles/theme/{breakpoints,spacing,typography}.css and "
        "ui/ui-kit/TabPanelColumns/TabPanelColumns.css), "
        "assets/locales/en/translation.json (the axe pass's accessible names are "
        "locale strings) and vite.config.mts (it defines __TBC_TAB_FIXTURES__). "
        "It also covers, by repo-relative name, the gate's own harness "
        "(vendor/tbc-new-fork/test-layout.mjs, test-tab-harness.mjs, "
        "test-review.mjs) and the recorded tab fixtures the fixture pass renders "
        "(data/tab-fixtures/*.json, ticket 504). NOT covered: Tailwind and the "
        "upstream ui-kit beyond the frame CSS, which the fork's lockfile and "
        "upstream base pin. scripts/check_layout_gate.py compares the live digest "
        "to this on `pnpm merge-to-dev`; equal means the layout source that last "
        "passed is still on disk, so the gate is skipped. Advanced only by a green "
        "measured gate run (merge_to_dev commits the advance onto the feature "
        "branch so it enters the merge). The fork itself is gitignored, so this "
        "record lives here rather than in the fork."
    )
    # newline="\n": the committed lock is LF; Windows text mode would otherwise
    # rewrite it as CRLF. Ticket 399.
    LOCK_PATH.write_text(
        json.dumps(data, indent=2) + "\n", encoding="utf-8", newline="\n"
    )


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


def _npm_command(
    script: str, extra: Sequence[str] = ()
) -> tuple[list[str], str] | None:
    """The argv that runs a fork npm script under Node >= 22, or None.

    Returns (argv, how) where `how` names the interpreter path chosen, for the
    log. `npm run <script>` is the fork's own script (package.json), run with
    cwd at the fork. When `extra` is non-empty it is appended after `--` so npm
    forwards the arguments to the script (e.g. --manifest/--out for test:review).
    Node 22 is required; if the ambient node is already >= 22 it is used
    directly, else `fnm exec --using=22` is preferred when fnm is on PATH. When
    neither is available the gate is skipped, not run wrong.
    """
    npm = "npm.cmd" if os.name == "nt" and shutil.which("npm.cmd") else "npm"
    tail = ["run", script]
    if extra:
        tail += ["--", *extra]
    ambient = _node_major("node")
    if ambient is not None and ambient >= 22:
        return [npm, *tail], f"ambient node v{ambient}"

    fnm = shutil.which("fnm")
    if fnm:
        return [fnm, "exec", "--using=22", npm, *tail], "fnm --using=22"

    return None


def _layout_command() -> tuple[list[str], str] | None:
    """The argv that runs test:layout under Node >= 22, or None if unavailable."""
    return _npm_command("test:layout")


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


class GateResult(NamedTuple):
    """What `run_gate` learned. `rc` is 0/1/GATE_UNMEASURED as before; the two
    counts are the parsed verdict fields (None when the verdict was absent or
    unmeasured) so `run()` can name both in the FAILED message. The a11y block
    itself does not need a Python branch: the fork's test-layout.mjs exits 1 on
    any unbaselined critical/serious violation, and a nonzero measured exit is
    already `rc == 1` below -- the counts here are for the message only."""

    rc: int
    layout_failed: int | None
    a11y_failed: int | None


def run_gate(fixture: Path | None = None) -> GateResult:
    """Run test:layout in the fork.

    rc is 0 (the gate ran green), 1 (the gate MEASURED and something is broken
    -- layout OR a11y; the fork script's own exit 1 covers both), or
    GATE_UNMEASURED (it never measured a width, so it learned nothing about the
    tab and nothing may be blamed on it -- and nothing may be recorded as tested
    either).

    Caller has checked prereqs.
    """
    cmd = _layout_command()
    if cmd is None:
        print(
            "layout gate: SKIPPED -- no Node >= 22 and no `fnm` to select it. "
            "test-layout.mjs needs Node 22 (global WebSocket); refusing to run "
            "it on an older Node rather than fail for the wrong reason.",
        )
        return GateResult(GATE_UNMEASURED, None, None)
    argv, how = cmd
    print(f"layout gate: running `{' '.join(argv)}` in {FORK_ROOT} ({how})")
    print("(this renders the Upgrades tab headless at 4 widths)")
    # The child inherits the parent environment plus TBC_A11Y_BASELINE when the
    # baseline file exists (absent -> the fork script runs strict, its own
    # rule). TBC_A11Y_DUMP is left inherited so a caller that sets it (baseline
    # seeding) still reaches the child; nothing here sets it.
    env = dict(os.environ)
    if A11Y_BASELINE_PATH.is_file():
        env["TBC_A11Y_BASELINE"] = str(A11Y_BASELINE_PATH)
    # The fixture pass (ticket 504) runs only when a fixture is handed down.
    if fixture is not None:
        env["TBC_TAB_FIXTURE"] = str(fixture)
    # stdout is teed rather than buffered: each line is echoed as it arrives so
    # a run still shows progress live, while the verdict line is
    # kept for the run/skip decision below. stderr stays attached to the
    # terminal untouched.
    stdout_lines: list[str] = []
    with subprocess.Popen(
        argv,
        cwd=str(FORK_ROOT),
        env=env,
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

    v = _parse_verdict(captured)

    if proc.returncode == 0:
        return GateResult(0, 0, 0)

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
        return GateResult(1, None, None)

    if v.get("outcome") == "unmeasured":
        reason = v.get("reason") or "no reason reported"
        print(
            f"layout gate: SKIPPED -- test-layout.mjs exited {proc.returncode} "
            "without measuring any width, so it learned nothing about the tab's "
            f"layout. Reason: {reason}. This is a prereq/environment problem, "
            "not a layout failure, and does not block the merge. The baseline "
            "is left where it is, so the gate stays armed for the next attempt."
        )
        return GateResult(GATE_UNMEASURED, None, None)

    layout_failed = v.get("failed") if isinstance(v.get("failed"), int) else None
    a11y_failed = v.get("a11yFailed") if isinstance(v.get("a11yFailed"), int) else None
    return GateResult(1, layout_failed, a11y_failed)


def _skip(msg: str) -> int:
    print(f"layout gate: SKIPPED -- {msg}")
    return 0


def preview_skip_reason() -> str | None:
    """The reason `run()` would skip right now, or None if it would actually
    run the gate.

    Mirrors `run()`'s guard sequence up to -- and never including --
    `run_gate()`, so calling this from `pnpm verify`'s tail summary (ticket
    400) costs a handful of file reads and a hash over the tab source, never
    the Playwright run. `run()` itself remains the only caller that can
    trigger `run_gate()`; this function does not import verdict-only state
    (baseline advance, on_baseline_advanced) because it never gets that far.
    """
    if not FORK_ROOT.is_dir():
        return (
            "vendor/tbc-new-fork is absent (the clone is gitignored and is not "
            "restored in CI). The tab layout lives only on the main checkout."
        )

    digest, missing = compute_tab_hash()
    if missing:
        # Not an ordinary skip -- the fork is present but a tracked layout
        # source is gone. Let the caller's own run() surface this as the
        # error it is instead of reporting it as a quiet skip.
        return None

    baseline = read_baseline()
    if baseline == digest:
        return (
            f"tab layout source unchanged since the last green run "
            f"(digest {digest[:12]}...). Nothing to re-test."
        )

    if not LAYOUT_TEST.is_file():
        return (
            f"{LAYOUT_TEST.relative_to(FORK_ROOT).as_posix()} is absent from the "
            "fork -- the clone is present but predates the layout gate "
            "(ticket 322). Nothing to run."
        )
    if not any(p.is_file() for p in DIST_WASM_CANDIDATES) or not DIST_ASSETS.is_dir():
        wanted = " or ".join(
            p.relative_to(FORK_ROOT).as_posix() for p in DIST_WASM_CANDIDATES
        )
        return (
            "the fork's built dist/ is absent (no prior `make host`: needs "
            f"{wanted}, plus "
            f"{DIST_ASSETS.relative_to(FORK_ROOT).as_posix()}). The gate builds "
            "the bundle on top of it and cannot run without it. Run `make host` "
            "in the fork once to arm the gate."
        )
    if _find_chromium() is None:
        return (
            "no Playwright Chromium found under ~/AppData/Local/ms-playwright "
            "(chromium-*/chrome-win64/chrome.exe). The gate drives a headless "
            "Chromium and cannot run without one -- a missing/rotted browser "
            "path skips the gate rather than blocking the merge."
        )

    return None


def run(
    print_hash: bool = False,
    update_baseline: bool = False,
    on_baseline_advanced: Callable[[Path, str], None] | None = None,
    fixture: Path | None = None,
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

    # Defaulted here, not in main(), so `merge_to_dev.py`'s direct call gets the
    # fixture pass too.
    if fixture is None and DEFAULT_FIXTURE.is_file():
        fixture = DEFAULT_FIXTURE
    # A missing or unreadable fixture fails rather than skips: the fixture pass
    # is what measures the result rows, so a green run without it would record
    # an untested digest as tested (review round 10, finding A1).
    if fixture is None:
        print(
            "layout gate: FAILED -- no tab fixture on disk, so the post-run "
            "checks cannot run; the baseline is not advanced."
        )
        return 1
    fixture_readable, fixture_line = check_fixture(fixture)
    print(f"layout gate: {fixture_line}")
    if not fixture_readable:
        print(
            "layout gate: FAILED -- the tab fixture is unreadable; the baseline "
            "is not advanced."
        )
        return 1

    result = run_gate(fixture)
    if result.rc == GATE_UNMEASURED:
        # Nothing was measured. Do not block, and do NOT advance the baseline:
        # recording an untested digest as tested would skip the gate forever.
        return 0
    if result.rc == 0:
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

    # A measured failure blocks the merge. The fork script exits 1 for a layout
    # failure OR an unbaselined critical/serious a11y violation, so name both
    # counts (unknown -> "?") rather than saying "layout is broken" alone.
    layout = "?" if result.layout_failed is None else result.layout_failed
    a11y = "?" if result.a11y_failed is None else result.a11y_failed
    print(
        f"\nlayout gate: FAILED. layout failures: {layout}, a11y failures: {a11y} "
        "(unbaselined critical/serious; see data/wowsims-fork-a11y-baseline.json). "
        "See the failures above. The merge is blocked. Fix the layout or "
        "accessibility, or if this is an intended change run the gate green (and "
        "re-seed the a11y baseline) before merging.",
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
    ap.add_argument(
        "--preview-skip",
        action="store_true",
        help=(
            "print 'layout: skipped -- <reason>' and exit 0 if the gate would "
            "skip right now, or 'layout: would run' and exit 0 otherwise. Never "
            "runs the gate itself (ticket 400 / pnpm verify's tail summary)."
        ),
    )
    ap.add_argument(
        "--fixture",
        type=Path,
        default=None,
        help=(
            "the recorded tab fixture the fixture pass renders (default: "
            "data/tab-fixtures/feral-p3-p2bis.json when it exists)"
        ),
    )
    args = ap.parse_args()
    if args.preview_skip:
        reason = preview_skip_reason()
        if reason is None:
            print("layout: would run (not a verify step; see pnpm merge-to-dev)")
        else:
            print(f"layout: skipped -- {reason}")
        return 0
    fixture = args.fixture.resolve() if args.fixture else None
    return run(
        print_hash=args.print_hash,
        update_baseline=args.update_baseline,
        fixture=fixture,
    )


if __name__ == "__main__":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass
    raise SystemExit(main())
