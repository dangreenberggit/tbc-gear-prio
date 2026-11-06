#!/usr/bin/env python3
"""Checks for the verdict of scripts/check_desktop_tab.py: no server, no build.

Follows the check_merge_to_dev.py convention -- a standalone script of small
checks, not a pytest suite. The rest of the desktop gate needs go, make and
Chrome, so it is run by hand (`pnpm desktop-gate:check`), not here.

    python scripts/check_desktop_tab_verdict.py

Exit 0 ok, 1 a check failed.
"""

from __future__ import annotations

import contextlib
import io
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import check_desktop_tab as g  # noqa: E402

# (bytes_rc, gate_ok, golden_rc) -> expected verdict
CASES = [
    ((0, True, 0), True),
    ((1, True, 0), False),  # ticket 627: a byte mismatch printed PASS
    ((0, False, 0), False),
    ((0, True, 1), False),
]

# (bytes_rc, gate_ok) -> may --update-golden write?
GOLDEN_CASES = [
    ((0, True), True),
    ((1, True), False),  # a golden from a bundle that is not dist
    ((0, False), False),
]

# per-spec exit codes -> the command's exit code
OVERALL_CASES = [
    ([0, 0, 0, 0], 0),
    ([0, 1, 0, 0], 1),
    ([0, 1, 2, 0], 2),  # a spec nobody judged outranks a failure
    ([2], 2),
]

CAP = 40


def passing_readback(spec: str) -> dict:
    """A readback that meets (a)-(f) for `spec` at the gate's phase and cap."""
    return {
        "servedWorker": {"wasmRefs": 0, "readyFalse": 1},
        "runner": "WorkerPoolSimRunner",
        "requests": {"bulkSimAsync": 0, "raidSimAsync": 1},
        "workerSessionsAttached": 1,
        "done": True,
        "runTimedOut": False,
        "candidatesRequested": CAP,
        "eligibleCount": g.EXPECTED_ELIGIBLE[spec][g.DESKTOP_PHASE],
        "rowCount": g.CAPPED_ROWS[spec][g.DESKTOP_PHASE][CAP],
        "panicHit": False,
    }


def gate_ok(rb: dict, spec: str) -> bool:
    with contextlib.redirect_stdout(io.StringIO()):
        ok, _ = g.assert_gate(rb, CAP, spec, g.DESKTOP_PHASE)
    return ok


def table_problems() -> list[str]:
    """Every gated spec has every pinned number, a page and one golden, and
    every committed golden belongs to a gated spec, so the default run checks
    each golden on disk."""
    phase = g.DESKTOP_PHASE
    specs = g.gated_specs(phase)
    problems = [] if len(specs) > 1 else [f"gated_specs({phase}) gave {specs}"]
    for spec in specs:
        eligible = g.EXPECTED_ELIGIBLE.get(spec, {}).get(phase)
        cap = g.POOL_CAP.get(spec, {}).get(phase)
        rows = g.CAPPED_ROWS.get(spec, {}).get(phase, {}).get(CAP)
        if spec not in g.SPEC_PAGE:
            problems.append(f"{spec}: no SPEC_PAGE")
        if eligible is None or cap is None or eligible > cap:
            problems.append(f"{spec}: EXPECTED_ELIGIBLE {eligible} / POOL_CAP {cap}")
        if rows is None or rows > CAP:
            problems.append(f"{spec}: CAPPED_ROWS at cap {CAP} is {rows}")
        path = g.golden_path(spec, phase, CAP)
        if not path.is_file():
            problems.append(f"{spec}: no golden at {path.name}")
            continue
        golden = json.loads(path.read_text(encoding="utf-8"))
        held = (golden.get("spec"), golden.get("phase"),
                golden.get("candidatesRequested"), golden.get("rowCount"))
        if held != (spec, phase, CAP, rows):
            problems.append(f"{path.name}: spec/phase/cap/rowCount {held}, "
                            f"want {(spec, phase, CAP, rows)}")
    on_disk = {p.name for p in g.GOLDEN_DIR.glob("golden-*.json")}
    gated = {g.golden_path(s, phase, CAP).name for s in specs}
    if on_disk != gated:
        problems.append(f"goldens on disk {sorted(on_disk)} != gated {sorted(gated)}")
    return problems


def harness_problems() -> list[str]:
    problems = []
    out = Path("out.json")
    for spec in g.gated_specs(g.DESKTOP_PHASE):
        args = g.harness_args(out, CAP, spec, g.DESKTOP_PHASE)
        preset_tab, preset = g.START_PRESET[spec][g.DESKTOP_PHASE]
        page = args[args.index("--page") + 1] if args and "--page" in args else None
        if page != g.SPEC_PAGE[spec]:
            problems.append(f"{spec}: harness --page {page}")
        if args[args.index("--preset") + 1] != preset:
            problems.append(f"{spec}: harness --preset is not {preset!r}")
        # run-tab-cdp.mjs stops a page with no phase tabs that gets one.
        has_tab = "--preset-tab" in args
        if has_tab != (preset_tab is not None) or (
            has_tab and args[args.index("--preset-tab") + 1] != preset_tab
        ):
            problems.append(f"{spec}: harness preset tab args wrong for {preset_tab!r}")
    if g.harness_args(out, CAP, "no-such-spec", g.DESKTOP_PHASE) is not None:
        problems.append("harness_args ran an unpinned spec")
    return problems


def assertion_problems() -> list[str]:
    """(e) passes on each spec's own pinned numbers and fails one off."""
    problems = []
    for spec in g.gated_specs(g.DESKTOP_PHASE):
        try:
            rb = passing_readback(spec)
        except KeyError:
            continue  # table_problems names the missing pin

        if not gate_ok(rb, spec):
            problems.append(f"{spec}: (a)-(f) fail on its pinned numbers")
        for field in ("eligibleCount", "rowCount"):
            if gate_ok({**rb, field: rb[field] + 1}, spec):
                problems.append(f"{spec}: (e) passed with {field} one too high")
    return problems


def main() -> int:
    problems = [
        f"gate_passed{args} gave {got}, want {want}"
        for args, want in CASES
        if (got := g.gate_passed(*args)) != want
    ] + [
        f"golden_refusal{args} gave {got!r}, want a refusal: {not want}"
        for args, want in GOLDEN_CASES
        if ((got := g.golden_refusal(*args)) is None) != want
    ] + [
        f"overall_rc({rcs}) gave {got}, want {want}"
        for rcs, want in OVERALL_CASES
        if (got := g.overall_rc(rcs)) != want
    ] + table_problems() + harness_problems() + assertion_problems()
    for p in problems:
        print(f"  FAIL: {p}", file=sys.stderr)
    if problems:
        return 1
    count = len(CASES) + len(GOLDEN_CASES) + len(OVERALL_CASES)
    print(f"check_desktop_tab_verdict.py ok ({count} verdict cases, "
          f"{len(g.gated_specs(g.DESKTOP_PHASE))} gated specs)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
