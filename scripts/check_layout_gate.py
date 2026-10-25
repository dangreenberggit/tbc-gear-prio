#!/usr/bin/env python3
"""Run the Upgrades-tab layout gate when a merge changed the tab's layout.

Ticket 322 shipped `test-layout.mjs` (now `scripts/tab-harness/test-layout.mjs`):
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
measures, and the pool data), the tab body and its registration point, the
upstream ui-kit modules they import, and the theme CSS the tab's measured
geometry and contrast resolve through (breakpoints, colours, spacing,
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
  - no Playwright Chromium is on disk, or its path lookup fails -> skip, exit 0
  - the tab digest equals the last green-tested digest     -> skip, exit 0

Only a real assertion failure from `test-layout.mjs` -- the gate RAN and the
layout is broken -- returns nonzero and blocks the merge. The one exception is
a digest that cannot be computed (a missing tracked file, or a Chromium build
that `chromium.mjs --build` cannot read, as on a checkout with no Node 22 or
no `playwright` package): that exits 2 and also blocks the merge, because a
digest without the build in it could be recorded as a baseline that later
Playwright bumps match. A rotted browser path
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
`test-layout.mjs` uses Node 22's global `WebSocket` and `node:*` modules. On
the dev host Node comes from nvm: `nvm use "$(cat .node-version)"` puts the
repo's Node 22 on PATH (nvm itself reads only `.nvmrc`). When the `node` on
PATH is older, this script falls back to `fnm exec --using=22` if `fnm` is on
PATH, so the gate does not silently misbehave on a shell that resolved Node 20.
If neither a suitable Node nor `fnm` is available, the Chromium build cannot be
read, so the digest cannot be computed and the script exits 2 naming that
cause rather than run the gate wrong.

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
accessibility violation (test-layout.mjs exits 1 for either, and this
script blocks on any measured nonzero exit, so the a11y ratchet needs no branch
here), or the gate would run but a tab fixture is missing or unreadable; 2 = a
real error (could not read a tracked source file that the record
expects, or could not read the harness's Chromium build).

Accessibility: the gate passes TBC_A11Y_BASELINE (data/wowsims-fork-a11y-baseline.json)
to the gate script when it exists, so seeded/known violations are tracked debt
and only NEW critical/serious ones block. Absent -> the fork runs strict.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
from collections.abc import Callable, Sequence
from pathlib import Path
from typing import NamedTuple

from check_tab_fixtures import FIXTURE_DIR, check_fixture, fixture_paths

ROOT = Path(__file__).resolve().parents[1]
FORK_ROOT = ROOT / "vendor/tbc-new-fork"
# The gate scripts live in this repo (scripts/tab-harness/) and start their
# fork commands with the fork as cwd themselves, so they run with cwd at ROOT.
HARNESS_DIR = ROOT / "scripts/tab-harness"
LAYOUT_TEST = HARNESS_DIR / "test-layout.mjs"
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
# The accepted-a11y-debt baseline test-layout.mjs reads via
# TBC_A11Y_BASELINE. Absent -> the gate script runs strict (every
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
#   - ui/styles/theme/colors.css, vars.css -- the colour tokens the axe pass's
#     contrast checks resolve through.
#   - ui/styles/theme/specs.css -- each spec's `--color-primary`, which those
#     contrast checks also resolve through (ticket 580).
#   - ui/styles/theme/z-index.css -- the stacking order of popovers, dialogs and
#     toasts over the table (ticket 580).
#   - ui/styles/theme/effects.css -- radii, shadows and background images.
#     Whether it changes what the gate measures is untested; it is hashed
#     because `theme/index.css` imports it, so every theme file the tab loads is
#     in the digest (ticket 580).
#   - ui/styles/theme/index.css -- the `@import` list of the theme files above,
#     so a theme file upstream adds there moves the digest (ticket 581).
#   - package.json, package-lock.json -- the pinned versions of what renders
#     and measures the rows: `@tanstack/react-virtual` decides which rows are
#     in the DOM, `@tanstack/react-table` their order, and Tailwind the
#     utilities every width and gap resolves through (ticket 581). The whole
#     files are hashed, not those three entries: any dependency bump then
#     moves the digest and costs one measured run, the safe direction, and a
#     parser of the lock file's format is not needed.
#   - ui/ui-kit/TabPanelColumns/TabPanelColumns.css -- the two-column frame
#     whose gap check 13 measures.
#   - assets/locales/en/upgrades.json -- the accessible names the axe pass
#     reads are locale strings, so a copy edit can be an accessibility change.
#   - vite.config.mts -- the gate's `vite build` reads it. Whether the fixture
#     pass's code is in the bundle at all (finding A8) is now decided by the
#     tab's own `utils/dev_flags.ts` and the harness's VITE_TBC_TAB_FIXTURES=1
#     environment (scripts/tab-harness/test-tab-harness.mjs), not by this file.
# The upstream ui-kit modules the tab renders through (Button, Dialog,
# Popover, ...) are not listed here: `_iter_ui_kit_files` follows the imports,
# so a wowsims sync that changes one moves the digest. The fork pins no upstream
# base sha into the digest, so naming "the upstream base" as their pin, as this
# comment once did, left them unhashed (pre-merge review of
# feat/upstream-react-port, finding A2).
LAYOUT_FILES = (
    "ui/app/tabs/UpgradesTabBody.tsx",
    "ui/app/SimTabsSection.tsx",
    "package.json",
    "package-lock.json",
    "ui/styles/theme/breakpoints.css",
    "ui/styles/theme/colors.css",
    "ui/styles/theme/effects.css",
    "ui/styles/theme/index.css",
    "ui/styles/theme/spacing.css",
    "ui/styles/theme/specs.css",
    "ui/styles/theme/typography.css",
    "ui/styles/theme/vars.css",
    "ui/styles/theme/z-index.css",
    "ui/ui-kit/TabPanelColumns/TabPanelColumns.css",
    "assets/locales/en/upgrades.json",
    "vite.config.mts",
)

UI_KIT_DIR = FORK_ROOT / "ui/ui-kit"
# `@ui-kit/<path>` (the alias in the fork's tsconfig.json and vite.config.mts)
# or a relative path, in any quoted string. A quoted path that is not an
# import only adds a file to the digest, the safe direction.
UI_KIT_ALIAS_RE = re.compile(r"""['"]@ui-kit/([^'"]+)['"]""")
RELATIVE_IMPORT_RE = re.compile(r"""['"](\.{1,2}/[^'"]+)['"]""")
MODULE_SUFFIXES = (".ts", ".tsx", ".css")


# Files outside the fork source that decide what the gate measures, hashed by
# ROOT-relative name (never through `_rel`, which is fork-relative). The
# made-up tab fixtures (data/tab-fixtures/*.json, from `pnpm tab-fixtures:mock`)
# are what the fixture pass renders, and the harness files are the assertions
# themselves: editing one changes the gate's verdict without touching a line of
# tab source. `rows.mjs` is the row reader
# `test-layout.mjs` and `test-tab-harness.mjs` import (ticket 580).
# `chromium.mjs` decides which browser the harness launches; the build it
# resolves is hashed too (`_chromium_build`), because a `playwright` bump
# changes the browser without changing any file listed here.
ROOT_GATE_FILES = (
    "scripts/tab-harness/chromium.mjs",
    "scripts/tab-harness/rows.mjs",
    "scripts/tab-harness/test-layout.mjs",
    "scripts/tab-harness/test-tab-harness.mjs",
    "scripts/tab-harness/test-review.mjs",
)


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
    sources: set[Path] = set()
    if TAB_DIR.is_dir():
        sources.update(
            p for p in TAB_DIR.rglob("*") if _is_hashed_tab_file(p, TAB_SOURCE_SUFFIXES)
        )
        files.update(sources)
        for sub in TAB_DATA_DIRS:
            d = TAB_DIR / sub
            if d.is_dir():
                files.update(p for p in d.rglob("*") if _is_hashed_tab_file(p, None))
    sources.update(p for p in files if p.is_file() and p.suffix in (".ts", ".tsx"))
    files.update(_iter_ui_kit_files(sources))
    return sorted(files, key=_rel)


def _resolve_module(base: Path, spec: str) -> set[Path]:
    """The ui-kit files an import of `spec` from `base` reaches.

    A directory import (`@ui-kit/Dialog`) takes the whole component folder, its
    CSS included, since the folder's index re-exports from its siblings. Files
    outside ui/ui-kit are dropped: the tab's own folder is globbed already.
    """
    target = (base / spec).resolve()
    if target.is_dir():
        found = {p for p in target.rglob("*") if _is_hashed_tab_file(p, TAB_SOURCE_SUFFIXES)}
    elif target.is_file():
        found = {target}
    else:
        found = {
            target.with_name(target.name + s)
            for s in MODULE_SUFFIXES
            if target.with_name(target.name + s).is_file()
        }
    ui_kit = UI_KIT_DIR.resolve()
    return {p for p in found if p.is_relative_to(ui_kit)}


def _iter_ui_kit_files(sources: set[Path]) -> set[Path]:
    """Every ui-kit file reachable by imports from `sources`, transitively."""
    seen: set[Path] = set()
    queue = list(sources)
    while queue:
        path = queue.pop()
        text = path.read_text(encoding="utf-8", errors="replace")
        reached: set[Path] = set()
        for m in UI_KIT_ALIAS_RE.finditer(text):
            reached |= _resolve_module(UI_KIT_DIR, m.group(1))
        for m in RELATIVE_IMPORT_RE.finditer(text):
            reached |= _resolve_module(path.parent, m.group(1))
        for p in reached - seen:
            seen.add(p)
            if p.suffix in (".ts", ".tsx"):
                queue.append(p)
    # Back to FORK_ROOT-based paths so `_rel` works on a resolved symlink or
    # junction too.
    root = FORK_ROOT.resolve()
    return {FORK_ROOT / p.relative_to(root) for p in seen}


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
    """(digest, missing) over the layout source and the harness's Chromium build.

    Pure but for file reads and the `chromium.mjs --build` lookup.

    The digest folds in each file's fork-relative path as well as its bytes, so
    a rename or a delete moves the digest even when the surviving bytes are
    unchanged. `missing` lists any LAYOUT_FILES entry absent from disk.
    Raises ChromiumBuildUnknown when the Chromium build cannot be read.
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
    h.update(b"chromium-build\0")
    h.update(_chromium_build())
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
        "ui/app/SimTabsSection.tsx, the fork's package.json and package-lock.json "
        "(the pinned TanStack Virtual, TanStack Table and Tailwind versions that "
        "render and measure the rows; ticket 581), every ui/ui-kit/ file those "
        "sources reach by "
        "import (followed transitively; a component folder counts whole), every "
        "theme CSS file the tab loads, which the measured geometry and the axe "
        "contrast checks resolve through (ui/styles/theme/{breakpoints,colors,"
        "effects,index,spacing,specs,typography,vars,z-index}.css; tickets 580 "
        "and 581), ui/ui-kit/TabPanelColumns/TabPanelColumns.css, "
        "assets/locales/en/upgrades.json (the axe pass's accessible names are "
        "locale strings) and vite.config.mts (the gate's build reads it). "
        "It also covers, by repo-relative name, the gate's own harness "
        "(scripts/tab-harness/chromium.mjs, rows.mjs, test-layout.mjs, "
        "test-tab-harness.mjs, test-review.mjs; rows.mjs by ticket 580), the "
        "made-up tab fixtures the fixture pass renders (data/tab-fixtures/*.json, "
        "from `pnpm tab-fixtures:mock`), and the Chromium build the harness launches: the chromium "
        "entry of the browsers.json in the playwright-core that the pinned "
        "playwright resolves (`chromium.mjs --build`), so a playwright bump "
        "that changes the browser moves the digest. "
        "scripts/check_layout_gate.py compares the live digest to this on "
        "`pnpm merge-to-dev`; equal means the layout source that last passed is "
        "still on disk, so the gate is skipped. A green measured gate run "
        "advances it (merge_to_dev commits the advance onto the feature branch "
        "so it enters the merge); `--update-baseline` also writes it without "
        "running the gate, for seeding or after a change proven by hand, so a "
        "value here is not by itself proof of a green run. The fork itself is "
        "gitignored, so this record lives here rather than in the fork."
    )
    # newline="\n": the committed lock is LF; Windows text mode would otherwise
    # rewrite it as CRLF. Ticket 399.
    LOCK_PATH.write_text(
        json.dumps(data, indent=2) + "\n", encoding="utf-8", newline="\n"
    )


CHROMIUM_LOOKUP = HARNESS_DIR / "chromium.mjs"
CHROMIUM_LOOKUP_TIMEOUT_S = 60
# chromium.mjs exits 2 when Playwright named a path and no browser is there.
# Every other nonzero exit is the lookup itself failing (Node exits 1 when, say,
# the `playwright` package cannot be imported), which must not be reported as a
# missing browser: the install command below needs that package too.
CHROMIUM_NOT_INSTALLED_EXIT = 2
CHROMIUM_MISSING = (
    "Playwright's Chromium is not installed (scripts/tab-harness/chromium.mjs "
    "found none; install it with `pnpm exec playwright install chromium`)."
)
CHROMIUM_SKIP_NOTE = (
    "The gate drives a headless Chromium and cannot run without one -- a "
    "missing prerequisite skips the gate rather than blocking the merge."
)
LOOKUP_STDERR_CHARS = 600


def _run_chromium_lookup(
    extra: Sequence[str] = (),
) -> tuple[subprocess.CompletedProcess[str] | None, str]:
    """Run chromium.mjs under the gate's own Node selection.

    Returns (completed, "") when it ran to an exit code, or (None, why) when it
    could not run at all.
    """
    cmd = _node_command(CHROMIUM_LOOKUP, extra)
    if cmd is None:
        return None, (
            "no Node >= 22 is on PATH, so scripts/tab-harness/chromium.mjs "
            "could not run. Put the repo's Node 22 on PATH with "
            '`nvm use "$(cat .node-version)"`.'
        )
    argv, _how = cmd
    try:
        out = subprocess.run(
            argv,
            cwd=str(ROOT),
            capture_output=True,
            text=True,
            timeout=CHROMIUM_LOOKUP_TIMEOUT_S,
        )
    except subprocess.TimeoutExpired:
        return None, (
            f"`{' '.join(argv)}` did not finish in {CHROMIUM_LOOKUP_TIMEOUT_S} s. "
            "Run it by hand to see where it stops."
        )
    except (OSError, subprocess.SubprocessError) as err:
        return None, f"`{' '.join(argv)}` could not start: {err}."
    return out, ""


def _stderr_excerpt(stderr: str) -> str:
    """The error lines of a failed lookup's stderr, bounded for one message.

    Node prints a stack after the error line, so the lines naming an error say
    more than the tail does.
    """
    lines = [line.strip() for line in stderr.splitlines() if line.strip()]
    picked = [line for line in lines if re.search(r"\bError\b", line)][:2]
    text = " | ".join(picked or lines[-5:]) or "(empty)"
    if len(text) > LOOKUP_STDERR_CHARS:
        text = text[: LOOKUP_STDERR_CHARS - 3] + "..."
    return text


def _lookup_failure(out: subprocess.CompletedProcess[str], flags: str = "") -> str:
    """Why a chromium.mjs run that exited nonzero failed: its stderr and the fix."""
    if "MODULE_NOT_FOUND" in out.stderr:
        fix = (
            "A package it imports is missing from node_modules (a checkout "
            "where `pnpm install` has not run since `playwright` was added); "
            "run `pnpm install`."
        )
    else:
        fix = f"Run `node scripts/tab-harness/chromium.mjs{flags}` to see the whole error."
    return (
        f"scripts/tab-harness/chromium.mjs{flags} exited {out.returncode}. "
        f"stderr: {_stderr_excerpt(out.stderr)} {fix}"
    )


class ChromiumBuildUnknown(Exception):
    """`chromium.mjs --build` gave no build, so the tab digest cannot be computed.

    Not hashed as a placeholder: a green run would record that placeholder
    digest as the baseline, and while the lookup kept failing every later run
    would match it and skip as "unchanged", a Playwright bump included
    (review of feat/wsl-linux-support, finding R2-1).
    """


def _chromium_problem() -> str | None:
    """None when the Chromium the harness will launch is on disk, else why not.

    The layout test throws when it cannot find one, which would surface as a
    nonzero exit and read as "layout broken". A missing browser is a prereq
    absence, not a layout failure, so it must be detected here and turned into a
    clean skip -- the run/skip/fail distinction the whole gate is built on. The
    answer comes from the same helper the harness uses (chromium.mjs, which asks
    the pinned Playwright), so the gate and the test cannot disagree about it.
    The message names the real cause: a browser that is not installed, or a
    lookup that failed, with its stderr and the fix.
    """
    out, why = _run_chromium_lookup()
    if out is None:
        return f"The Chromium lookup failed: {why}"
    if out.returncode == CHROMIUM_NOT_INSTALLED_EXIT:
        return CHROMIUM_MISSING
    if out.returncode != 0:
        return (
            "The Chromium lookup failed, so whether Playwright's Chromium is "
            f"installed is unknown: {_lookup_failure(out)}"
        )
    if Path(out.stdout.strip()).is_file():
        return None
    return CHROMIUM_MISSING


def _chromium_build() -> bytes:
    """The Chromium build the harness would launch, as bytes for the digest.

    `chromium.mjs --build` reads it from the browsers.json of the
    playwright-core that the pinned `playwright` resolves, the file Playwright
    itself picks the build from, so a `playwright` bump that changes the build
    moves the digest. Raises ChromiumBuildUnknown, naming the cause, when the
    lookup does not give a build.
    """
    out, why = _run_chromium_lookup(["--build"])
    if out is None:
        raise ChromiumBuildUnknown(f"The Chromium build lookup failed: {why}")
    if out.returncode != 0:
        raise ChromiumBuildUnknown(
            f"The Chromium build lookup failed: {_lookup_failure(out, ' --build')}"
        )
    try:
        entry = json.loads(out.stdout.strip().splitlines()[-1])
    except (ValueError, IndexError):
        raise ChromiumBuildUnknown(
            "The Chromium build lookup printed no JSON line: "
            f"scripts/tab-harness/chromium.mjs --build wrote {out.stdout.strip()[:200]!r}."
        ) from None
    return json.dumps(entry, sort_keys=True).encode("utf-8")


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


def _node_command(
    script: Path, extra: Sequence[str] = ()
) -> tuple[list[str], str] | None:
    """The argv that runs a harness script under Node >= 22, or None.

    Returns (argv, how) where `how` names the interpreter path chosen, for the
    log. `script` is a file under scripts/tab-harness/, run with cwd at ROOT;
    `extra` is appended as its arguments (e.g. --manifest/--out for
    test-review.mjs). Node 22 is required; if the ambient node is already >= 22
    it is used directly, else `fnm exec --using=22` is preferred when fnm is on
    PATH. When neither is available it returns None, and the caller reports
    that rather than run the script on the wrong Node.
    """
    tail = [str(script), *extra]
    ambient = _node_major("node")
    if ambient is not None and ambient >= 22:
        return ["node", *tail], f"ambient node v{ambient}"

    fnm = shutil.which("fnm")
    if fnm:
        return [fnm, "exec", "--using=22", "node", *tail], "fnm --using=22"

    return None


def _layout_command() -> tuple[list[str], str] | None:
    """The argv that runs test-layout.mjs under Node >= 22, or None if unavailable."""
    return _node_command(LAYOUT_TEST)


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
    itself does not need a Python branch: test-layout.mjs exits 1 on
    any unbaselined critical/serious violation, and a nonzero measured exit is
    already `rc == 1` below -- the counts here are for the message only."""

    rc: int
    layout_failed: int | None
    a11y_failed: int | None


def run_gate(fixture: Path | None = None) -> GateResult:
    """Run scripts/tab-harness/test-layout.mjs against the fork.

    rc is 0 (the gate ran green), 1 (the gate MEASURED and something is broken
    -- layout OR a11y; the gate script's own exit 1 covers both), or
    GATE_UNMEASURED (it stopped before it measured the whole tab, and no check
    it ran failed, so nothing may be blamed on it -- and nothing may be
    recorded as tested either).

    Caller has checked prereqs.
    """
    cmd = _layout_command()
    if cmd is None:
        print(
            "layout gate: SKIPPED -- no Node >= 22 is on PATH. "
            "test-layout.mjs needs Node 22 (global WebSocket); refusing to run "
            "it on an older Node rather than fail for the wrong reason. Put the "
            'repo\'s Node 22 on PATH with `nvm use "$(cat .node-version)"`.',
        )
        return GateResult(GATE_UNMEASURED, None, None)
    argv, how = cmd
    print(f"layout gate: running `{' '.join(argv)}` in {ROOT} ({how})")
    print("(this renders the Upgrades tab headless at 4 widths)")
    # The child inherits the parent environment plus TBC_A11Y_BASELINE when the
    # baseline file exists (absent -> the gate script runs strict, its own
    # rule). TBC_A11Y_DUMP is left inherited so a caller that sets it (baseline
    # seeding) still reaches the child; nothing here sets it.
    env = dict(os.environ)
    if A11Y_BASELINE_PATH.is_file():
        env["TBC_A11Y_BASELINE"] = str(A11Y_BASELINE_PATH)
    # With no fixture handed down the harness renders every file in
    # data/tab-fixtures, which is what the digest covers, so an inherited
    # TBC_TAB_FIXTURE must not narrow it to one.
    env.pop("TBC_TAB_FIXTURE", None)
    if fixture is not None:
        env["TBC_TAB_FIXTURE"] = str(fixture)
    # stdout is teed rather than buffered: each line is echoed as it arrives so
    # a run still shows progress live, while the verdict line is
    # kept for the run/skip decision below. stderr stays attached to the
    # terminal untouched.
    stdout_lines: list[str] = []
    with subprocess.Popen(
        argv,
        cwd=str(ROOT),
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

    failed = v.get("failed") if isinstance(v.get("failed"), int) else None
    # The harness reports "measured" whenever a check failed, but a verdict
    # that says "unmeasured" and still counts failures is read as a failure
    # too: a failure that was measured must never become a skip.
    if v.get("outcome") == "unmeasured" and not failed:
        reason = v.get("reason") or "no reason reported"
        print(
            f"layout gate: SKIPPED -- test-layout.mjs exited {proc.returncode} "
            "before it measured the whole tab, and no check it ran failed. "
            f"Reason: {reason}. This is a prereq/environment problem, "
            "not a layout failure, and does not block the merge. The baseline "
            "is left where it is, so the gate stays armed for the next attempt."
        )
        return GateResult(GATE_UNMEASURED, None, None)

    a11y_failed = v.get("a11yFailed") if isinstance(v.get("a11yFailed"), int) else None
    return GateResult(1, failed, a11y_failed)


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
            f"{LAYOUT_TEST.relative_to(ROOT).as_posix()} is absent from this "
            "repo. Nothing to run."
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
    chromium_problem = _chromium_problem()
    if chromium_problem is not None:
        return f"{chromium_problem} {CHROMIUM_SKIP_NOTE}"

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

    try:
        digest, missing = compute_tab_hash()
    except ChromiumBuildUnknown as err:
        # Before --print-hash and --update-baseline too: no path may print or
        # record a digest that does not cover the Chromium build.
        print(
            f"layout gate: FAILED -- cannot compute the tab digest. {err} "
            "No baseline was read or written.",
            file=sys.stderr,
        )
        return 2
    if missing:
        # A named LAYOUT_FILES entry is gone. This is not an
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
            f"{LAYOUT_TEST.relative_to(ROOT).as_posix()} is absent from this "
            "repo. Nothing to run."
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
    chromium_problem = _chromium_problem()
    if chromium_problem is not None:
        return _skip(f"{chromium_problem} {CHROMIUM_SKIP_NOTE}")

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

    # Read here, not in main(), so `merge_to_dev.py`'s direct call gets the
    # fixture pass too. No fixture, or an unreadable one, fails rather than
    # skips: the fixture pass is what measures the result rows, so a green run
    # without it would record an untested digest as tested (review round 10,
    # finding A1).
    files = [fixture] if fixture is not None else fixture_paths()
    if not files:
        print(
            "layout gate: FAILED -- no made-up fixtures in data/tab-fixtures "
            "(run pnpm tab-fixtures:mock); the baseline is not advanced."
        )
        return 1
    unreadable = 0
    for path in files:
        fixture_readable, fixture_line = check_fixture(path)
        print(f"layout gate: {fixture_line}")
        if not fixture_readable:
            unreadable += 1
    if unreadable:
        print(
            f"layout gate: FAILED -- {unreadable} tab fixture(s) unreadable; the "
            "baseline is not advanced."
        )
        return 1

    result = run_gate(fixture)
    if result.rc == GATE_UNMEASURED:
        # Nothing was measured. Do not block, and do NOT advance the baseline:
        # recording an untested digest as tested would skip the gate forever.
        return 0
    if result.rc == 0 and fixture is not None:
        # The digest covers every file in data/tab-fixtures, and this run
        # rendered one, so recording it would let the next merge skip the
        # others (review finding A2).
        print(
            f"\nlayout gate: PASSED for {fixture.name} only. The baseline is not "
            "advanced: it covers every fixture in data/tab-fixtures, so only a "
            "run without --fixture advances it."
        )
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

    # A measured failure blocks the merge. The gate script exits 1 for a layout
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
            "one tab fixture for the fixture pass to render (default: every "
            "made-up fixture in data/tab-fixtures/). A green run with this "
            "never advances the baseline, because the baseline covers every "
            "fixture."
        ),
    )
    args = ap.parse_args()
    if args.preview_skip:
        try:
            reason = preview_skip_reason()
        except ChromiumBuildUnknown as err:
            print(f"layout: would fail -- cannot compute the tab digest. {err}")
            return 0
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
