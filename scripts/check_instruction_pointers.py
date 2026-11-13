#!/usr/bin/env python3
"""Checks section pointers in agent instruction files.

A section pointer is `` `<path>` § <heading> ``. A `~/` path is that file
under the home folder; any other path is relative to the repo root. The
heading is the target heading's full text (case, `#`, backticks and `*`
ignored, line breaks read as spaces), or a numbered heading's number alone
(`§ 14` matches `## 14. Stages and gates`). `, § B`, `and § C` and `or § C`
continue the same file. `§ H` with no path means this file.

    check_instruction_pointers.py check     # exit 1 on a dead pointer or a
                                            # ruled-out style; for pnpm verify
    check_instruction_pointers.py refs '<path> § <heading>'
                                            # every file:line that points there
    check_instruction_pointers.py refs <path>
                                            # each section's pointers; run before
                                            # renaming or removing a heading/file
    check_instruction_pointers.py headings <path>
                                            # each section's pointer count
    check_instruction_pointers.py --mermaid [--focus <path>]
                                            # file-level chart on stdout, for a
                                            # person to look at; never stored
    check_instruction_pointers.py --self-test

Options: `--repo <path>` checks another repo; `--home-overlay <dir>` reads
`<dir>/X` in place of `~/.claude/X` (and `<dir>/agents/X` in place of
`~/.claude_router/agents/X`), to check a setup tree before it is installed.

The file sets below are globs read at run time; no list of pointers is
stored anywhere. On CI (`CI` set) every pointer whose site or target is
under `~/` is skipped and counted. Off CI a missing or unreadable
`~/.claude` fails, so a stubbed HOME cannot pass silently.

Not seen: code that reads headings by name (for example a hook that reads a
routing.md section). `refs` cannot list those readers.
"""

from __future__ import annotations

import argparse
import io
import os
import re
import sys
import tempfile
from dataclasses import dataclass, field
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

# Repo files that hold pointers. docs/agents/home is an archive, and
# .agents/skills is a mirror of .claude/skills.
REPO_SITE_GLOBS = (
    "AGENTS.md",
    "CLAUDE.md",
    "docs/workflow.md",
    "docs/agents/*.md",
    ".claude/skills/**/*.md",
    ".claude/agents/*.md",
)
# Home files that hold pointers, relative to the home folder.
HOME_SITE_GLOBS = (
    ".claude/*.md",
    ".claude/agents/*.md",
    ".claude/skills/**/*.md",
    ".claude_router/agents/*.md",
)
HOME_SKIP_PARTS = (".trash",)

FENCE = re.compile(r"^\s*(```|~~~)")
HEADING = re.compile(r"^(#{1,6})\s+(.*?)\s*#*\s*$")
CODE_SPAN = re.compile(r"(`+)((?:(?!\n[ \t]*\n).)+?)\1", re.S)
CONNECTOR = re.compile(r"^\s*(,|,?\s*and|,?\s*or)\s*$", re.I)
NUMBER = re.compile(r"(\d+)(?![\d]|\.\d)")


def norm(text: str) -> str:
    text = re.sub(r"[`*]", "", text).replace("#", "")
    return re.sub(r"\s+", " ", text).strip().lower()


def blank_fences(text: str) -> str:
    """The text with fenced blocks blanked, line count kept."""
    out, inside = [], False
    for line in text.split("\n"):
        if FENCE.match(line):
            inside = not inside
            out.append("")
        else:
            out.append("" if inside else line)
    return "\n".join(out)


def headings_of(text: str) -> list[tuple[int, str]]:
    found = []
    for i, line in enumerate(blank_fences(text).split("\n"), 1):
        m = HEADING.match(line)
        if m:
            found.append((i, m.group(2)))
    return found


@dataclass
class Doc:
    key: str  # how pointers name it: repo-relative, or ~/...
    shown: str  # what messages print as the site
    text: str
    _heads: list[tuple[int, str]] | None = None

    @property
    def heads(self) -> list[tuple[int, str]]:
        if self._heads is None:
            self._heads = headings_of(self.text)
        return self._heads


@dataclass
class Pointer:
    site: Doc
    line: int
    target: str  # file key
    said: str  # the heading text as written, for messages
    heading: str | None = None  # matched heading text, when resolved
    problem: str | None = None
    skipped: str | None = None  # "home" or "scratch"


@dataclass
class World:
    repo: Path
    home: Path
    ci: bool
    overlay: Path | None = None
    docs: dict[str, Doc | None] = field(default_factory=dict)

    def home_path(self, rel: str) -> tuple[Path, bool]:
        """Where ~/<rel> is read from, and whether that is the overlay."""
        if self.overlay is not None:
            for prefix, sub in ((".claude/", ""), (".claude_router/agents/", "agents/")):
                if rel.startswith(prefix):
                    o = self.overlay / (sub + rel[len(prefix):])
                    if o.is_file():
                        return o, True
        return self.home / rel, False

    def doc(self, key: str) -> Doc | None:
        if key not in self.docs:
            if key.startswith("~/"):
                path, from_overlay = self.home_path(key[2:])
                shown = str(path) if from_overlay else key
            else:
                path, shown = self.repo / key, key
            try:
                self.docs[key] = Doc(key, shown, path.read_text()) if path.is_file() else None
            except (OSError, UnicodeDecodeError):
                self.docs[key] = None
        return self.docs[key]


def _glob(base: Path, pattern: str) -> list[Path]:
    if "**" not in pattern:
        return sorted(p for p in base.glob(pattern) if p.is_file())
    top, _, name = pattern.partition("/**/")
    found = []
    for d, dirs, files in os.walk(base / top, followlinks=True):
        dirs[:] = [x for x in dirs if x not in HOME_SKIP_PARTS]
        found += [Path(d) / f for f in files if Path(f).match(name)]
    return sorted(found)


def site_keys(world: World) -> tuple[list[str], list[str]]:
    """Repo site keys and home site keys. Problems reading the home go in
    the second list's place as an exception from the caller."""
    repo = []
    for g in REPO_SITE_GLOBS:
        repo += [p.relative_to(world.repo).as_posix() for p in _glob(world.repo, g)]
    home: list[str] = []
    if world.ci:
        return sorted(set(repo)), home
    for g in HOME_SITE_GLOBS:
        home += ["~/" + p.relative_to(world.home).as_posix() for p in _glob(world.home, g)]
    if world.overlay is not None:
        for g in HOME_SITE_GLOBS:
            if g.startswith(".claude/"):
                home += [
                    "~/.claude/" + p.relative_to(world.overlay).as_posix()
                    for p in _glob(world.overlay, g[len(".claude/"):])
                ]
    return sorted(set(repo)), sorted(set(home))


def _spans(text: str) -> list[tuple[int, int, str]]:
    return [(m.start(), m.end(), m.group(2).strip()) for m in CODE_SPAN.finditer(text)]


def _looks_like_path(s: str) -> bool:
    return s.startswith("~/") or "/" in s or bool(re.search(r"\.(md|py|sh|json|mjs|ts|txt|yaml|yml)$", s))


def _paragraph_start(text: str, pos: int) -> int:
    m = None
    for m in re.finditer(r"\n[ \t]*\n", text[:pos]):
        pass
    return m.end() if m else 0


def _match_heading(heads: list[tuple[int, str]], rest: str) -> tuple[list[str], int]:
    """Headings that the text after `§ ` names, and how many characters of
    `rest` the match used. Full text first (longest wins), then a number."""
    flat = rest[:400].replace("\n", " ")
    # Map each normalised character back to its index in flat.
    normed, index = [], []
    prev_space = True
    for i, ch in enumerate(flat):
        if ch in "`*#":
            continue
        if ch.isspace():
            if prev_space:
                continue
            ch, prev_space = " ", True
        else:
            prev_space = False
        normed.append(ch.lower())
        index.append(i)
    n = "".join(normed)
    best: list[str] = []
    best_len = 0
    for _, h in heads:
        hn = norm(h)
        if hn and n.startswith(hn) and (len(n) == len(hn) or not n[len(hn)].isalnum()):
            if len(hn) > best_len:
                best, best_len = [h], len(hn)
            elif len(hn) == best_len:
                best.append(h)
    if best:
        return best, index[best_len - 1] + 1
    m = NUMBER.match(n)
    if m:
        num = m.group(1)
        hits = [h for _, h in heads if re.match(rf"{num}(\.|\)|\s|$)", norm(h))]
        if hits:
            return hits, index[len(num) - 1] + 1
    return [], 0


def _said(rest: str) -> str:
    flat = re.sub(r"\s+", " ", rest[:120]).strip()
    m = re.match(r"[^.;:()|\[\]]*", flat)
    return (m.group(0) if m else flat)[:60].strip(" ,")


def pointers_in(site: Doc, world: World) -> list[Pointer]:
    text = blank_fences(site.text)
    spans = _spans(text)
    in_span = [False] * (len(text) + 1)
    for a, b, _ in spans:
        for i in range(a, b):
            in_span[i] = True
    span_ending_at = {b: s for a, b, s in spans}
    found: list[Pointer] = []
    prev: tuple[str, int | None, int, int] | None = None  # target, end, § pos, para
    for m in re.finditer("§", text):
        pos = m.start()
        if in_span[pos]:
            continue
        line = text.count("\n", 0, pos) + 1
        para = _paragraph_start(text, pos)
        rest = text[pos + 1 :]
        before = text[para:pos]
        stripped = before.rstrip()
        target: str | None = None
        problem: str | None = None
        span = span_ending_at.get(para + len(stripped))
        if span is not None and _looks_like_path(span):
            target = span
        elif prev is not None and prev[3] == para:
            ptarget, pend, ppos, _ = prev
            gap = text[pend:pos] if pend is not None else ""
            if pend is not None and CONNECTOR.match(gap):
                target = ptarget
            elif pend is None and re.search(r"(,|\band|\bor)\s*$", stripped) and "`" not in text[ppos:pos] and "." not in text[ppos + 1 : pos]:
                target = ptarget
        if target is None:
            target = site.key
        p = Pointer(site, line, target, _said(rest[1:] if rest[:1] == " " else rest))
        p.problem = problem
        end = _resolve(p, rest, world, pos + 1)
        found.append(p)
        prev = (target, end, pos, para)
    return found


def _resolve(p: Pointer, rest: str, world: World, offset: int) -> int | None:
    """Fill in p.heading / p.problem / p.skipped; return where the matched
    heading ends in the site text, when it matched."""
    if p.problem:
        return None
    if p.target.startswith(".scratch/"):
        p.skipped = "scratch"
        return None
    if world.ci and (p.target.startswith("~/") or p.site.key.startswith("~/")):
        p.skipped = "home"
        return None
    doc = world.doc(p.target)
    if doc is None:
        p.problem = f"{p.target} is missing. Fix the path, or write the reference as prose with no §."
        return None
    if not rest.startswith(" "):
        p.problem = f"write a space after §: `§ {p.said}`."
        return None
    hits, used = _match_heading(doc.heads, rest[1:])
    if len(hits) == 1:
        p.heading = hits[0]
        return offset + 1 + used
    if len(hits) > 1:
        p.problem = f'{len(hits)} headings match "{p.said}" in {p.target}: {"; ".join(hits)}. Name the full heading, or make the headings differ.'
        return None
    heads = ", ".join(h for _, h in doc.heads) or "none"
    if p.target == p.site.key:
        p.problem = (
            f'§ {p.said} is not a heading in this file. If {p.said} is in another file, '
            f"write `path` § {p.said}; if the file varies, say it in words. Headings here: {heads}."
        )
    else:
        p.problem = (
            f'{p.target} has no heading "{p.said}" (headings: {heads}). Fix the pointer or the heading; '
            f"`pnpm pointers refs {p.target}` lists every pointer into the file."
        )
    return None


def collect(world: World) -> tuple[list[Pointer], list[str]]:
    errors: list[str] = []
    if not world.ci:
        claude = world.home / ".claude"
        if not claude.is_dir() or not os.access(claude, os.R_OK | os.X_OK):
            errors.append(f"{claude} is missing or unreadable; pointers into it cannot be checked (set CI only on CI).")
    repo_keys, home_keys = site_keys(world)
    pointers: list[Pointer] = []
    for key in repo_keys + home_keys:
        site = world.doc(key)
        if site is None:
            errors.append(f"{key}: cannot read")
            continue
        pointers += pointers_in(site, world)
    return pointers, errors


def run_check(world: World, out, err) -> int:
    pointers, errors = collect(world)
    for e in errors:
        print(e, file=err)
    dead = [p for p in pointers if p.problem]
    for p in dead:
        print(f"{p.site.shown}:{p.line}: {p.problem}", file=err)
    checked = [p for p in pointers if not p.skipped]
    home_skipped = sum(1 for p in pointers if p.skipped == "home")
    scratch_skipped = sum(1 for p in pointers if p.skipped == "scratch")
    summary = f"pointers: {len(checked)} checked, {len(dead)} dead, 0 style"
    if home_skipped:
        summary += f"; {home_skipped} into ~/.claude skipped (CI)"
    if scratch_skipped:
        summary += f"; {scratch_skipped} into .scratch skipped"
    print(summary, file=out)
    return 1 if dead or errors else 0


def main(argv: list[str], *, home: Path, ci: bool, out=sys.stdout, err=sys.stderr) -> int:
    ap = argparse.ArgumentParser(prog="check_instruction_pointers.py", description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("cmd", nargs="?", choices=("check", "refs", "headings"))
    ap.add_argument("arg", nargs="?")
    ap.add_argument("--repo", type=Path, default=ROOT)
    ap.add_argument("--home-overlay", type=Path)
    ap.add_argument("--mermaid", action="store_true")
    ap.add_argument("--focus")
    a = ap.parse_args(argv)
    world = World(a.repo.resolve(), home, ci, a.home_overlay.resolve() if a.home_overlay else None)
    if a.cmd == "check":
        return run_check(world, out, err)
    ap.print_usage(err)
    return 2


# --------------------------------------------------------------------------
# Self-test: fixture trees in a temp folder, run through main().
# --------------------------------------------------------------------------


def _tree(base: Path, files: dict[str, str]) -> None:
    for rel, text in files.items():
        p = base / rel
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(text)


def _run(files: dict[str, str], argv: list[str], *, ci: bool = False, home_files=None):
    """Write a repo (and a home with ~/.claude unless home_files is None and
    the caller wants none), run main, return (rc, stdout, stderr)."""
    tmp = Path(tempfile.mkdtemp(prefix="ptr-selftest-"))
    repo, home = tmp / "repo", tmp / "home"
    _tree(repo, files)
    if home_files is not None:
        _tree(home, home_files)
    else:
        (home / ".claude").mkdir(parents=True)
    o, e = io.StringIO(), io.StringIO()
    rc = main(["--repo", str(repo), *argv], home=home, ci=ci, out=o, err=e)
    return rc, o.getvalue(), e.getvalue()


def _check(files, **kw):
    return _run(files, ["check"], **kw)


def t_live_repo_pointer_passes():
    rc, out, err = _check(
        {
            "AGENTS.md": "See `docs/agents/a.md` § Before you start.\n",
            "docs/agents/a.md": "# A\n\n## Before you start\n",
        }
    )
    assert rc == 0, (rc, out, err)
    assert "1 checked, 0 dead, 0 style" in out, out


def t_dead_heading_fails_with_site_and_headings():
    rc, out, err = _check(
        {
            "AGENTS.md": "x\n\nSee `docs/agents/a.md` § Gates.\n",
            "docs/agents/a.md": "# A\n\n## Gates — what's enforced vs. advisory\n## Other\n",
        }
    )
    assert rc == 1, (rc, out, err)
    assert "AGENTS.md:3:" in err, err
    assert 'no heading "Gates' in err, err
    assert "Other" in err, err  # lists the headings it has
    assert "pointers refs docs/agents/a.md" in err, err


def t_missing_target_file_fails():
    rc, out, err = _check({"AGENTS.md": "See `docs/agents/nope.md` § X.\n"})
    assert rc == 1 and "docs/agents/nope.md" in err and "missing" in err, (rc, err)


def t_full_heading_normalised_and_wrapped():
    rc, out, err = _check(
        {
            "docs/workflow.md": (
                "Read `docs/agents/a.md` § before writing a `pnpm\n"
                "tab-review` *manifest* first.\n"
            ),
            "docs/agents/a.md": "## Before writing a `pnpm tab-review` manifest\n",
        }
    )
    assert rc == 0 and "1 checked" in out, (rc, out, err)


def t_longest_heading_wins_and_apostrophe_is_a_boundary():
    rc, out, err = _check(
        {
            "AGENTS.md": "By `docs/agents/a.md` § Report's rules; `docs/agents/a.md` § Report rules extra.\n",
            "docs/agents/a.md": "## Report\n## Report rules extra\n",
        }
    )
    assert rc == 0 and "2 checked" in out, (rc, out, err)


def t_numbered_heading_by_number():
    rc, out, err = _check(
        {
            "AGENTS.md": "Gate: `PLAN.md` § 14, then § 7 step 5 here.\n\n## 7. Merge\n",
            "PLAN.md": "## 14. Stages and gates\n",
        }
    )
    assert rc == 0 and "2 checked" in out, (rc, out, err)


def t_two_matching_headings_fail():
    rc, out, err = _check(
        {
            "AGENTS.md": "See `docs/agents/a.md` § 1.\n",
            "docs/agents/a.md": "## X\n### 1. Brief\n## Y\n### 1. Plan\n",
        }
    )
    assert rc == 1 and "2 headings match" in err, (rc, err)


def t_same_file_pointer():
    ok = _check({"AGENTS.md": "## Spawning\n\nAs § Spawning says (§ Spawning).\n"})
    assert ok[0] == 0, ok
    rc, out, err = _check({"AGENTS.md": "## Spawning\n\nAs § Lane is per job says.\n"})
    assert rc == 1 and "AGENTS.md:3:" in err, err
    assert "is not a heading in this file" in err and "is in another file" in err, err


def t_list_continuation_uses_the_same_file():
    files = {
        "AGENTS.md": "## Mine\n\nRead `docs/agents/r.md` § Bars, § Size bound and § Hand-backs; or § Mine.\n",
        "docs/agents/r.md": "## Bars\n## Size bound\n## Hand-backs\n",
    }
    rc, out, err = _check(files)
    assert rc == 0, (rc, err)
    assert "4 checked" in out, out
    files["docs/agents/r.md"] = "## Bars\n## Size bound\n"
    rc, out, err = _check(files)
    assert rc == 1 and "docs/agents/r.md has no heading \"Hand-backs" in err, err


def t_fences_and_code_spans_are_skipped():
    rc, out, err = _check(
        {
            "AGENTS.md": "```\n`docs/x.md` § Nope\n```\n\nRun `pnpm pointers refs 'docs/x.md § Nope'`.\n",
        }
    )
    assert rc == 0 and "0 checked" in out, (rc, out, err)


def t_site_set():
    """Sites are the repo's instruction files; docs/agents/home is skipped."""
    rc, out, err = _check(
        {
            "docs/agents/home/AGENTS.md": "`docs/x.md` § Nope\n",
            "docs/other.md": "`docs/x.md` § Nope\n",
            ".claude/skills/s/SKILL.md": "`docs/agents/a.md` § A\n",
            ".claude/skills/s/more/x.md": "`docs/agents/a.md` § A\n",
            ".claude/agents/g.md": "`docs/agents/a.md` § A\n",
            "CLAUDE.md": "`docs/agents/a.md` § A\n",
            "docs/agents/a.md": "## A\n",
        }
    )
    assert rc == 0 and "4 checked" in out, (rc, out, err)


TESTS = [v for k, v in sorted(globals().items()) if k.startswith("t_")]


def self_test() -> int:
    failed = 0
    for t in TESTS:
        try:
            t()
        except AssertionError as e:
            failed += 1
            print(f"  FAIL {t.__name__}: {e}", file=sys.stderr)
    if failed:
        print(f"check_instruction_pointers.py self-test: {failed} of {len(TESTS)} failed", file=sys.stderr)
        return 1
    print(f"check_instruction_pointers.py self-test ok ({len(TESTS)} tests)")
    return 0


if __name__ == "__main__":
    if sys.argv[1:] == ["--self-test"]:
        sys.exit(self_test())
    sys.exit(main(sys.argv[1:], home=Path.home(), ci=bool(os.environ.get("CI"))))
