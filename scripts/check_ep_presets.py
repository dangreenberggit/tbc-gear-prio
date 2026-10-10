#!/usr/bin/env python3
"""Diff every committed EP-weight preset against the fork symbol it names.

`data/presets/<spec>/<phase>.ep-weights.json` files are hand-transcribed from
the fork's per-spec `presets.ts`. Each one names its exact source symbol and the
pin it was copied at:

    "source": "wowsims/tbc-new ui/paladin/retribution/presets.ts P2_EP_PRESET"

which is honest about provenance and proves nothing about the numbers. Nothing
re-read the fork, so a weight that changed upstream -- or a typo made during
transcription -- would sit in the ranking indefinitely.

This reads the named symbol out of the named file and compares weight for
weight. Two vocabularies have to meet: the fork writes `[Stat.StatAgility]:
0.75`, the JSON writes `"1": 0.75`. The Stat/PseudoStat name -> number mapping
is read from the fork's own generated `ui/generated/proto/common.ts`, never
written down here, so a renumbered proto enum cannot silently pass.

Skips cleanly (exit 0) when vendor/tbc-new-fork is absent -- it is gitignored,
so a fresh clone has none. Refuses (exit 2) when the clone's HEAD is not the
commit data/wowsims-fork.lock.json pins, matching the contract of
check_equip_eligibility.py and generate_sim_implemented_effects.py.

Note the per-file `pin` field records the fork commit a file was transcribed
at, which is deliberately NOT the current lock pin -- these were copied over
many months. The comparison is against the fork as checked out now, which is
the point: a difference means the transcription no longer matches upstream,
whenever it was made.

Run via `pnpm verify` (`pnpm ep-presets:check`).

Exit 0 ok (including "nothing to check"), 1 drifted, 2 could not run.
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from _fork_gate import ForkGateError, require_pinned_fork  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
FORK_ROOT = ROOT / "vendor/tbc-new-fork"
PROTO_COMMON = FORK_ROOT / "ui/generated/proto/common.ts"
PRESETS_DIR = ROOT / "data/presets"

# Both sides are short decimal literals a human typed, so any real difference is
# an edit, not accumulated float error. The tolerance exists only so that a
# value which round-trips through JSON and Python floats at a different last
# bit -- 0.1 + 0.2 territory -- is not reported as drift. It is deliberately far
# tighter than any transcription difference could be: across the 199 non-zero
# values in the committed set the smallest magnitude is 0.01, so a genuine typo
# is at least seven orders of magnitude above this.
TOLERANCE = 1e-9

# Two prefixes are in use and both name this same fork: files transcribed
# before the fork existed say "wowsims/tbc-new", later ones "tbc-new-fork".
SOURCE_RE = re.compile(
    r"^(?:wowsims/tbc-new|tbc-new-fork)\s+(?P<path>\S+\.ts)\s+(?P<symbol>\w+)$"
)
# The trailing comma is optional: the last member of a generated enum has none,
# which silently hid StatPhysicalDamage (41) on the first run of this check.
ENUM_MEMBER_RE = re.compile(
    r"^\s*(?P<name>(?:Stat|PseudoStat)\w+)\s*=\s*(?P<value>\d+),?\s*$", re.MULTILINE
)
STAT_ENTRY_RE = re.compile(r"\[(?:Stat|PseudoStat)\.(?P<name>\w+)\]\s*:\s*(?P<value>-?[\d.]+)")


def stat_numbers() -> dict[str, int]:
    """Stat/PseudoStat member name -> number, from the fork's generated proto."""
    text = PROTO_COMMON.read_text(encoding="utf-8")
    out: dict[str, int] = {}
    for m in ENUM_MEMBER_RE.finditer(text):
        out.setdefault(m.group("name"), int(m.group("value")))
    return out


def symbol_body(text: str, symbol: str) -> str | None:
    """The source text of `export const <symbol> = ...`, to the next export."""
    start = re.search(rf"export const {re.escape(symbol)}\b", text)
    if not start:
        return None
    rest = text[start.end():]
    nxt = re.search(r"\nexport (?:const|function|type|interface|class)\b", rest)
    return rest[: nxt.start()] if nxt else rest


def fork_weights(preset_path: Path, symbol: str, names: dict[str, int]) -> tuple[dict[int, float], dict[int, float]] | str:
    """(weights, pseudoWeights) keyed by number, or an error string."""
    if not preset_path.is_file():
        return f"named file {preset_path.relative_to(FORK_ROOT)} does not exist in the fork"
    body = symbol_body(preset_path.read_text(encoding="utf-8"), symbol)
    if body is None:
        return f"symbol {symbol} not found in {preset_path.relative_to(FORK_ROOT)}"

    # Stats.fromMap takes two object literals: stats, then pseudo-stats.
    weights: dict[int, float] = {}
    pseudo: dict[int, float] = {}
    for m in STAT_ENTRY_RE.finditer(body):
        name, value = m.group("name"), float(m.group("value"))
        if name not in names:
            return f"{symbol}: {name} is not a Stat/PseudoStat member in the fork's proto"
        target = pseudo if name.startswith("PseudoStat") else weights
        target[names[name]] = value
    if not weights:
        return f"{symbol}: no stat entries parsed -- the preset's shape changed"
    return weights, pseudo


def compare(label: str, ours: dict[int, float], theirs: dict[int, float]) -> list[str]:
    problems = []
    for key in sorted(set(ours) | set(theirs)):
        a, b = ours.get(key), theirs.get(key)
        if a is None:
            problems.append(f"{label}[{key}]: the fork has {b}, the committed file has no entry")
        elif b is None:
            problems.append(f"{label}[{key}]: committed {a}, the fork has no entry")
        elif abs(a - b) > TOLERANCE:
            problems.append(f"{label}[{key}]: committed {a}, the fork has {b}")
    return problems


def main() -> int:
    if not FORK_ROOT.is_dir():
        print(
            "ep presets check: skipped -- vendor/tbc-new-fork is absent (it is "
            "gitignored, so a fresh clone has none). Clone the fork to check the "
            "committed EP weights against the symbols they name."
        )
        return 0

    try:
        require_pinned_fork("ep presets check", FORK_ROOT)
    except ForkGateError as exc:
        print(exc.message, file=sys.stderr)
        return 2

    if not PROTO_COMMON.is_file():
        print(
            f"ep presets check: {PROTO_COMMON.relative_to(ROOT)} is missing -- the "
            "Stat enum numbering is read from it and cannot be assumed.",
            file=sys.stderr,
        )
        return 2

    names = stat_numbers()
    if not names:
        print(
            "ep presets check: parsed no Stat members from the fork's proto -- "
            "the generated enum's shape changed.",
            file=sys.stderr,
        )
        return 2

    files = sorted(PRESETS_DIR.glob("*/*.ep-weights.json"))
    if not files:
        print("ep presets check: no *.ep-weights.json files found -- nothing to check.")
        return 0

    problems: list[str] = []
    unverifiable: list[str] = []
    checked = 0
    for path in files:
        rel = path.relative_to(ROOT)
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, ValueError) as exc:
            problems.append(f"{rel}: could not read: {exc}")
            continue

        source = data.get("source")
        if not isinstance(source, str):
            problems.append(f"{rel}: no 'source' field naming the fork symbol")
            continue
        m = SOURCE_RE.match(source.strip())
        if not m:
            problems.append(
                f"{rel}: 'source' is {source!r}, which does not match "
                "'wowsims/tbc-new <path>.ts <SYMBOL>' -- cannot resolve it"
            )
            continue

        got = fork_weights(FORK_ROOT / m.group("path"), m.group("symbol"), names)
        if isinstance(got, str):
            # A file may name a symbol that does not exist at the current pin:
            # data/presets/ret/p3.ep-weights.json was transcribed from a commit
            # ahead of it, and says so in its own `pin` field. That is a known,
            # recorded state, not drift -- but it is also unverifiable, so it is
            # reported every run rather than passing quietly. It stops being
            # unverifiable when the pin advances past the symbol's commit.
            if "not found in" in got or "does not exist in the fork" in got:
                unverifiable.append(f"{rel}: {got}\n      recorded pin: {data.get('pin', '(none)')}")
                continue
            problems.append(f"{rel}: {got}")
            continue
        their_w, their_p = got

        our_w = {int(k): float(v) for k, v in (data.get("weights") or {}).items()}
        our_p = {int(k): float(v) for k, v in (data.get("pseudoWeights") or {}).items()}
        problems += compare(f"{rel} weights", our_w, their_w)
        problems += compare(f"{rel} pseudoWeights", our_p, their_p)
        checked += 1

    if problems:
        print(
            "committed EP weights disagree with the fork symbols they name:\n",
            file=sys.stderr,
        )
        for problem in problems:
            print(f"  - {problem}", file=sys.stderr)
        print(
            "\nThese files are hand-transcribed. A difference means either the "
            "upstream preset changed and the copy is stale, or the transcription "
            "was wrong. Re-copy the numbers from the named symbol; do not edit "
            "the fork to match.",
            file=sys.stderr,
        )
        return 1

    for note in unverifiable:
        print(f"ep presets check: NOT VERIFIED -- {note}")
    suffix = f"; {len(unverifiable)} not verifiable at this pin" if unverifiable else ""
    print(f"ep presets check ok: {checked} files match the fork symbols they name{suffix}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
