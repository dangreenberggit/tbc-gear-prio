#!/usr/bin/env python3
"""Keep the TypeScript CURATED_SET_PHASE mirror in step with its Python source.

`scripts/assemble_universe.py` produces the curated-set phase labels; the map in
`packages/core/src/rank-report-rules.ts` reads them back to decide whether to
warn that a BiS list is older than the ranked phase. Two copies of one table,
hand-kept.

It drifted once and the failure was silent, not loud: the TS map stopped at
`p2` after the branch pinned `p3` curated sets, so `curatedSetPhase("p3")`
returned None, `bisStale` computed False, and the "No curated set is pinned for
PN" warning did not render. A reader got a stale BiS list under a newer heading
with nothing saying so -- it failed in the direction that looks correct, which
is why no test caught it and why the wrong expectation got test-locked instead.

This re-derives the TS side from the file rather than restating it, so the two
cannot diverge again without `pnpm verify` going red.

Run via `pnpm verify` (`pnpm curated-set-phase:check`).

Exit 0 ok, 1 drifted, 2 could not parse.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RULES_TS = ROOT / "packages/core/src/rank-report-rules.ts"

sys.path.insert(0, str(ROOT / "scripts"))
from assemble_universe import CURATED_SET_PHASE as PY_PHASES  # noqa: E402

# The object literal body only. Anchored on the declaration so an unrelated
# `Record<string, number>` elsewhere in the file cannot be picked up instead.
DECL = re.compile(
    r"const CURATED_SET_PHASE:\s*Record<string,\s*number>\s*=\s*\{(.*?)\}",
    re.DOTALL,
)
ENTRY = re.compile(r"([A-Za-z_][A-Za-z0-9_]*)\s*:\s*(\d+)")


def ts_phases() -> dict[str, int]:
    body = DECL.search(RULES_TS.read_text(encoding="utf-8"))
    if body is None:
        print(f"could not find CURATED_SET_PHASE in {RULES_TS}", file=sys.stderr)
        raise SystemExit(2)
    return {k: int(v) for k, v in ENTRY.findall(body.group(1))}


def main() -> int:
    ts = ts_phases()
    if ts == PY_PHASES:
        print(f"curated set phase mirror ok: {len(ts)} phases in step")
        return 0

    for label in sorted(set(PY_PHASES) | set(ts)):
        want, got = PY_PHASES.get(label), ts.get(label)
        if want != got:
            print(
                f"  {label}: assemble_universe.py={want!r} rank-report-rules.ts={got!r}",
                file=sys.stderr,
            )
    print(
        "CURATED_SET_PHASE drifted. `scripts/assemble_universe.py` is the source "
        "of truth -- it produces the labels; the TypeScript only reads them back.",
        file=sys.stderr,
    )
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
