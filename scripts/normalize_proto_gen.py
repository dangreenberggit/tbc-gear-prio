#!/usr/bin/env python3
"""
Strip trailing whitespace from generated packages/core/src/proto/*.ts.

protoc-gen-es emits empty JSDoc lines as ``   * `` (space after *) on Windows
and ``   *`` on Linux for the same empty ``//`` lines in data/proto. CI's
``git diff --exit-code`` after ``pnpm proto:generate`` fails on that alone
(run https://github.com/dangreenberggit/tbc-gear-prio/actions/runs/30409397254).
Normalize after generate so both platforms commit the same bytes.
"""

from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PROTO_OUT = ROOT / "packages" / "core" / "src" / "proto"


def main() -> int:
    if not PROTO_OUT.is_dir():
        print(f"missing {PROTO_OUT.relative_to(ROOT)}", flush=True)
        return 2
    changed = 0
    for path in sorted(PROTO_OUT.glob("*.ts")):
        text = path.read_text(encoding="utf-8")
        lines = text.splitlines(keepends=True)
        out: list[str] = []
        dirty = False
        for line in lines:
            if line.endswith("\r\n"):
                body, ending = line[:-2], "\r\n"
            elif line.endswith("\n"):
                body, ending = line[:-1], "\n"
            elif line.endswith("\r"):
                body, ending = line[:-1], "\r"
            else:
                body, ending = line, ""
            stripped = body.rstrip(" \t")
            if stripped != body:
                dirty = True
            out.append(stripped + ending)
        if dirty:
            path.write_text("".join(out), encoding="utf-8", newline="")
            changed += 1
            print(f"  normalized {path.relative_to(ROOT)}")
    print(f"  {changed} file(s) normalized")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
