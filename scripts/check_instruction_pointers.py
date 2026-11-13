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
    style: bool = False  # the problem is a ruled-out way of writing it
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


UNBACKTICKED = re.compile(r"(?:^|[\s(])(~/[\w./-]+|[\w./-]*[\w-]\.md)$")
QUOTED = re.compile(r'(`[^`\n]+`),?\s*["\u201c]([^"\u201d\n]{1,120})["\u201d]')
GLOBAL_RULE = re.compile(r'\bthe global rule\s+["\u201c]([^"\u201d\n]{1,120})["\u201d]', re.I)


def _style_problem(before: str, span: str | None, rest: str, said: str, world: World) -> str | None:
    """Why the text around a § is a ruled-out style, or None."""
    m = re.search(r"\bglobal\s+`([^`]+)`$", before)
    if m:
        name = m.group(1).rsplit("/", 1)[-1]
        return f"drop `global` and write the full path: `~/.claude/{name}` § {said}."
    m = re.search(r"`([\w:.-]+)`\s+skill(?:'s)?,?$", before)
    if m:
        x = m.group(1)
        return f"name the skill's file, not the skill: `~/.claude/skills/{x}/SKILL.md` § {said} (or `.claude/skills/{x}/SKILL.md` for a repo skill)."
    if before.endswith("("):
        inner = before[:-1].rstrip()
        m = re.search(r"`([^`]+)`$", inner)
        if m and _looks_like_path(m.group(1)):
            return f"drop the parentheses: `{m.group(1)}` § {said}."
    if span is not None and _looks_like_path(span):
        if "/" not in span and not (world.repo / span).is_file():
            return f"`{span}` has no folder and is not a root file of the repo; write its path, such as `docs/agents/{span}` § {said} or `~/.claude/{span}` § {said}."
    elif span is None:
        m = UNBACKTICKED.search(before)
        if m:
            return f"put the path in backticks: `{m.group(1)}` § {said}."
    if not rest.startswith(" "):
        return f"write a space after §: `§ {said}`."
    if rest[1:2] in ('"', "\u201c"):
        return f"drop the quotes: § {said.strip(chr(34) + chr(0x201c) + chr(0x201d))}."
    return None


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
        said = _said(rest[1:] if rest[:1] == " " else rest)
        p = Pointer(site, line, target, said)
        p.problem = _style_problem(stripped, span, rest, said, world)
        p.style = p.problem is not None
        end = _resolve(p, rest, world, pos + 1)
        found.append(p)
        prev = (target, end, pos, para)
    return found


def quoted_pointers(site: Doc, world: World) -> list[Pointer]:
    """Pointers written as a path and a quoted heading, with no §."""
    text = blank_fences(site.text)
    found = []
    for m in QUOTED.finditer(text):
        path = m.group(1).strip("`").strip()
        if not _looks_like_path(path):
            continue
        doc = world.doc(path)
        quote = m.group(2)
        if doc is not None and any(norm(h) == norm(quote) for _, h in doc.heads):
            p = Pointer(site, text.count("\n", 0, m.start()) + 1, path, quote)
            p.problem, p.style = f"write `{path}` § {quote}.", True
            found.append(p)
    for m in GLOBAL_RULE.finditer(text):
        p = Pointer(site, text.count("\n", 0, m.start()) + 1, "~/.claude/AGENTS.md", m.group(1))
        p.problem, p.style = f"write `~/.claude/AGENTS.md` § {m.group(1)}.", True
        found.append(p)
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
        pointers += pointers_in(site, world) + quoted_pointers(site, world)
    return pointers, errors


def run_check(world: World, out, err) -> int:
    pointers, errors = collect(world)
    for e in errors:
        print(e, file=err)
    bad = sorted((p for p in pointers if p.problem), key=lambda p: (p.site.shown, p.line))
    for p in bad:
        print(f"{p.site.shown}:{p.line}: {p.problem}", file=err)
    dead = [p for p in bad if not p.style]
    style = [p for p in bad if p.style]
    checked = [p for p in pointers if not p.skipped]
    home_skipped = sum(1 for p in pointers if p.skipped == "home")
    scratch_skipped = sum(1 for p in pointers if p.skipped == "scratch")
    summary = f"pointers: {len(checked)} checked, {len(dead)} dead, {len(style)} style"
    if home_skipped:
        summary += f"; {home_skipped} into ~/.claude skipped (CI)"
    if scratch_skipped:
        summary += f"; {scratch_skipped} into .scratch skipped"
    print(summary, file=out)
    return 1 if bad or errors else 0


def file_key(world: World, arg: str) -> str:
    """How pointers name the file the user typed."""
    arg = arg.strip()
    if arg.startswith("~/"):
        return arg
    path = Path(arg)
    if path.is_absolute():
        for base, prefix in ((world.repo, ""), (world.home, "~/")):
            try:
                return prefix + path.resolve().relative_to(base).as_posix()
            except ValueError:
                pass
    return path.as_posix()


def _by_heading(world: World, key: str):
    doc = world.doc(key)
    if doc is None:
        return None, [], []
    pointers, _ = collect(world)
    into = [p for p in pointers if p.target == key and not p.style]
    return doc, into, pointers


def run_refs(world: World, arg: str, out, err, sites: bool = True) -> int:
    path, sep, heading = arg.partition(" § ")
    key = file_key(world, path)
    doc, into, pointers = _by_heading(world, key)
    if doc is None:
        print(f"{key}: missing or unreadable", file=err)
        return 1
    if sep:
        hits, _ = _match_heading(doc.heads, heading)
        exact = [h for h in hits if norm(h) == norm(heading)] or hits
        if len(exact) != 1:
            print(f'{key} has no heading "{heading}" (headings: {", ".join(h for _, h in doc.heads)})', file=err)
            return 1
        mine = [p for p in into if p.heading == exact[0]]
        n = len(mine)
        print(f"{key} § {exact[0]}: {n} pointer{'s' * (n != 1)}", file=out)
        for p in mine:
            print(f"  {p.site.shown}:{p.line}", file=out)
        return 0
    print(key, file=out)
    unused = []
    for _, h in doc.heads:
        mine = [p for p in into if p.heading == h]
        print(f"  {len(mine)}  {h}", file=out)
        if sites:
            for p in mine:
                print(f"       {p.site.shown}:{p.line}", file=out)
        if not mine:
            unused.append(h)
    if sites:
        print(f"safe to rename (0 pointers): {'; '.join(unused) or 'none'}", file=out)
        dead = [p for p in into if p.problem]
        if dead:
            print("dead pointers into this file: " + "; ".join(f"{p.site.shown}:{p.line} § {p.said}" for p in dead), file=out)
        mention = re.compile(re.escape(key) + r"(?!`?\s*§)")
        count = 0
        repo_keys, home_keys = site_keys(world)
        for k in repo_keys + home_keys:
            d = world.doc(k)
            if d is not None and k != key:
                count += len(mention.findall(d.text))
        print(f"plain mentions of {key} without §: {count}", file=out)
    return 0


def run_mermaid(world: World, focus: str | None, out) -> int:
    """A file-level chart: one node per file, one edge per file pair,
    labelled with its pointer count; an edge with any dead pointer is red."""
    pointers, _ = collect(world)
    edges: dict[tuple[str, str], list[Pointer]] = {}
    for p in pointers:
        if p.skipped or p.style or p.target == p.site.key:
            continue
        edges.setdefault((p.site.key, p.target), []).append(p)
    if focus:
        f = file_key(world, focus)
        edges = {k: v for k, v in edges.items() if f in k}
    ids: dict[str, str] = {}
    for a, b in sorted(edges):
        for k in (a, b):
            ids.setdefault(k, f"n{len(ids)}")
    print("flowchart LR", file=out)
    for k, i in ids.items():
        print(f'  {i}["{k}"]', file=out)
    red = []
    for n, ((a, b), ps) in enumerate(sorted(edges.items())):
        print(f"  {ids[a]} -->|{len(ps)}| {ids[b]}", file=out)
        if any(p.problem for p in ps):
            red.append(str(n))
    if red:
        print(f"  linkStyle {','.join(red)} stroke:red", file=out)
    return 0


def main(argv: list[str], *, home: Path, ci: bool, out=sys.stdout, err=sys.stderr) -> int:
    ap = argparse.ArgumentParser(prog="check_instruction_pointers.py", description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("cmd", nargs="?", choices=("check", "refs", "headings"))
    ap.add_argument("arg", nargs="?")
    ap.add_argument("--repo", type=Path, default=ROOT)
    ap.add_argument("--home-overlay", type=Path)
    ap.add_argument("--mermaid", action="store_true")
    ap.add_argument("--focus")
    ap.add_argument("--self-test", action="store_true")
    a = ap.parse_args(argv)
    if a.self_test:
        return self_test()
    world = World(a.repo.resolve(), home, ci, a.home_overlay.resolve() if a.home_overlay else None)
    if a.mermaid:
        return run_mermaid(world, a.focus, out)
    if a.cmd == "check":
        return run_check(world, out, err)
    if a.cmd in ("refs", "headings") and a.arg:
        return run_refs(world, a.arg, out, err, sites=a.cmd == "refs")
    ap.print_usage(err)
    return 2


# --------------------------------------------------------------------------
# Self-test: fixture trees in a temp folder, run through main().
# --------------------------------------------------------------------------


_BASE: str | None = None  # self_test's temp folder; removed when it ends


def _tree(base: Path, files: dict[str, str]) -> None:
    for rel, text in files.items():
        p = base / rel
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(text)


def _run(files: dict[str, str], argv: list[str], *, ci: bool = False, home_files=None):
    """Write a repo (and a home with ~/.claude unless home_files is None and
    the caller wants none), run main, return (rc, stdout, stderr)."""
    tmp = Path(tempfile.mkdtemp(prefix="ptr-selftest-", dir=_BASE))
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


def _style(text: str, extra: dict | None = None):
    files = {"AGENTS.md": text, "docs/agents/a.md": "## Heading one\n## 2. Two\n"}
    files.update(extra or {})
    return _check(files)


def t_style_unbackticked_path():
    for text in (
        "See docs/agents/a.md § Heading one.\n",
        "description: Spawn (~/.claude/routing.md § Decision table).\n",
        "As AGENTS.md § Heading one says.\n",
    ):
        rc, out, err = _style(text)
        assert rc == 1 and "1 style" in out and "backticks" in err, (text, out, err)


def t_style_global_before_path():
    rc, out, err = _style("Per global `AGENTS.md` § Heading one.\n")
    assert rc == 1 and "1 style" in out and "global" in err and "~/.claude/AGENTS.md" in err, (out, err)


def t_style_name_without_folder():
    rc, out, err = _style("See `a.md` § Heading one.\n")
    assert rc == 1 and "1 style" in out and "folder" in err, (out, err)
    rc, out, err = _style("See `PLAN.md` § 14.\n", {"PLAN.md": "## 14. Gates\n"})
    assert rc == 0, (out, err)


def t_style_skill_name():
    for text in (
        "Read the `stage-gate` skill's § Heading one.\n",
        "The `pre-merge-review` skill, § Heading one, says.\n",
    ):
        rc, out, err = _style(text)
        assert rc == 1 and "1 style" in out and "SKILL.md" in err, (text, out, err)


def t_style_parenthesised():
    rc, out, err = _style("See `docs/agents/a.md` (§ Heading one).\n")
    assert rc == 1 and "1 style" in out and "parentheses" in err, (out, err)


def t_style_quoted_heading():
    for text in (
        'See `docs/agents/a.md`, "Heading one".\n',
        'See `docs/agents/a.md` "Heading one".\n',
        'See `docs/agents/a.md` § "Heading one".\n',
    ):
        rc, out, err = _style(text)
        assert rc == 1 and "1 style" in out and "§ Heading one" in err, (text, out, err)
    # A quote that is no heading of that file is prose, not a pointer.
    rc, out, err = _style('`docs/agents/a.md` "says this".\n')
    assert rc == 0, (out, err)


def t_style_global_rule():
    rc, out, err = _style('Follow the global rule "Orchestrator mode".\n')
    assert rc == 1 and "1 style" in out and "~/.claude/AGENTS.md" in err, (out, err)


def t_style_space_after_section_sign():
    rc, out, err = _style("See `docs/agents/a.md` §2.\n")
    assert rc == 1 and "1 style" in out and "§ 2" in err, (out, err)


HOME = {
    ".claude/AGENTS.md": "# G\n## Subagent reports\n",
    ".claude/routing.md": "## Decision table\nSee `~/.claude/AGENTS.md` § Subagent reports.\n",
    ".claude/agents/general-task.md": "Report: `~/.claude/AGENTS.md` § Gone.\n",
    ".claude/skills/x/SKILL.md": "`~/.claude/routing.md` § Decision table\n",
    ".claude/skills/.trash/old/SKILL.md": "`~/.claude/routing.md` § Gone\n",
    ".claude_router/agents/glm-task.md": "Then `~/.claude/routing.md` § Decision table.\n",
}


def t_home_pointers_and_home_sites():
    rc, out, err = _check(
        {"AGENTS.md": "See `~/.claude/routing.md` § Decision table.\n"}, home_files=HOME
    )
    # repo 1 + routing 1 + general-task 1 (dead) + skill 1 + glm 1; .trash skipped
    assert rc == 1 and "5 checked, 1 dead" in out, (out, err)
    assert "~/.claude/agents/general-task.md:1:" in err and "Gone" in err, err


def t_ci_skips_and_counts_home_pointers():
    rc, out, err = _check(
        {
            "AGENTS.md": "See `~/.claude/routing.md` § Gone and `docs/agents/a.md` § A.\n",
            "docs/agents/a.md": "## A\n",
        },
        ci=True,
        home_files={},
    )
    assert rc == 0, (out, err)
    assert "1 checked, 0 dead, 0 style; 1 into ~/.claude skipped (CI)" in out, out


def t_missing_home_claude_fails_off_ci():
    rc, out, err = _check({"AGENTS.md": "x\n"}, home_files={})
    assert rc == 1 and ".claude is missing or unreadable" in err, (out, err)


def t_scratch_targets_skipped_and_counted():
    rc, out, err = _check({"AGENTS.md": "See `.scratch/x.md` § Whatever.\n"})
    assert rc == 0 and "0 checked" in out and "1 into .scratch skipped" in out, (out, err)


def t_home_overlay_replaces_home_files():
    tmp = Path(tempfile.mkdtemp(prefix="ptr-overlay-", dir=_BASE))
    _tree(
        tmp,
        {
            "agents/general-task.md": "Report: `~/.claude/AGENTS.md` § Subagent reports.\n",
            "agents/glm-task.md": "Then `~/.claude/routing.md` § Size bound.\n",
            "routing.md": "## Decision table\n## Size bound\n",
            "skills/new/SKILL.md": "`~/.claude/routing.md` § Nope\n",
            "install.sh": "not a site\n",
        },
    )
    home = dict(HOME)
    home[".claude_router/agents/glm-task.md"] = "Then `~/.claude/routing.md` § Gone.\n"
    rc, out, err = _run(
        {"AGENTS.md": "x\n"}, ["check", "--home-overlay", str(tmp)], home_files=home
    )
    # The overlay fixes general-task and feeds both agent homes; its new
    # skill is a site, and its pointer is dead.
    assert rc == 1 and "1 dead" in out, (out, err)
    assert str(tmp / "skills/new/SKILL.md") + ":1:" in err, err
    assert "general-task" not in err and "glm-task" not in err, err


REFS_REPO = {
    "AGENTS.md": (
        "## Mine\n\nBy `docs/agents/a.md` § Report's rules; `docs/agents/a.md` § Report rules extra.\n"
        "\nAlso `docs/agents/a.md` § Report, and § Gone. Read docs/agents/a.md and `docs/agents/a.md`.\n"
    ),
    "docs/workflow.md": "See `docs/agents/a.md` § Report.\n",
    "docs/agents/a.md": "## Report\n## Report rules extra\n## Unused\n",
}


def t_refs_one_section_lists_its_sites():
    rc, out, err = _run(REFS_REPO, ["refs", "docs/agents/a.md § Report rules extra"])
    assert rc == 0, (out, err)
    # Longest heading wins: line 3's "§ Report rules extra" is not § Report.
    assert out.split() == ["docs/agents/a.md", "§", "Report", "rules", "extra:", "1", "pointer", "AGENTS.md:3"], out
    rc, out, err = _run(REFS_REPO, ["refs", "docs/agents/a.md § Report"])
    assert "3 pointers" in out and "AGENTS.md:3" in out and "AGENTS.md:5" in out and "docs/workflow.md:1" in out, out
    rc, out, err = _run(REFS_REPO, ["refs", "docs/agents/a.md § Nope"])
    assert rc == 1 and "no heading" in err, (out, err)


def t_refs_file_lists_every_section():
    rc, out, err = _run(REFS_REPO, ["refs", "docs/agents/a.md"])
    assert rc == 0, (out, err)
    lines = [l.strip() for l in out.splitlines()]
    assert "3  Report" in lines and "1  Report rules extra" in lines and "0  Unused" in lines, out
    assert "docs/workflow.md:1" in lines, out
    assert "safe to rename (0 pointers): Unused" in lines, out
    assert "dead pointers into this file: AGENTS.md:5 § Gone" in lines, out
    assert "plain mentions of docs/agents/a.md without §: 2" in lines, out


def t_headings_counts_without_sites():
    rc, out, err = _run(REFS_REPO, ["headings", "docs/agents/a.md"])
    lines = [l.strip() for l in out.splitlines()]
    assert rc == 0 and "3  Report" in lines and "0  Unused" in lines, out
    assert "docs/workflow.md:1" not in out, out


def t_refs_home_file_by_tilde_or_full_path():
    tmp_home_rc, out, err = _run(
        {"AGENTS.md": "See `~/.claude/routing.md` § Decision table.\n"},
        ["refs", "~/.claude/routing.md § Decision table"],
        home_files=HOME,
    )
    assert "AGENTS.md:1" in out and "~/.claude/skills/x/SKILL.md:1" in out, out
    assert "~/.claude_router/agents/glm-task.md:1" in out, out


def t_mermaid_file_level_with_dead_edges_red():
    files = dict(REFS_REPO)
    files["docs/agents/b.md"] = "See `docs/agents/a.md` § Unused and `docs/workflow.md` § Nope.\n"
    rc, out, err = _run(files, ["--mermaid"])
    assert rc == 0, (out, err)
    lines = [l.strip() for l in out.splitlines()]
    assert lines[0] == "flowchart LR", out
    nodes = {l.split("[")[0]: l.split('"')[1] for l in lines if '["' in l}
    ids = {v: k for k, v in nodes.items()}
    a, w, b, g = ids["AGENTS.md"], ids["docs/workflow.md"], ids["docs/agents/b.md"], ids["docs/agents/a.md"]
    edges = [l for l in lines if "-->" in l]
    # AGENTS.md -> a.md: 4 pointers (one dead); no self edge for AGENTS.md
    assert f"{a} -->|4| {g}" in edges and f"{w} -->|1| {g}" in edges, edges
    assert f"{b} -->|1| {g}" in edges and f"{b} -->|1| {w}" in edges, edges
    assert len(edges) == 4, edges
    red = [l for l in lines if l.startswith("linkStyle")]
    dead_idx = sorted(edges.index(e) for e in (f"{a} -->|4| {g}", f"{b} -->|1| {w}"))
    assert red == [f"linkStyle {','.join(map(str, dead_idx))} stroke:red"], (red, edges)


def t_mermaid_focus_and_no_file_written():
    files = dict(REFS_REPO)
    files["docs/agents/b.md"] = "See `docs/workflow.md` § Nope.\n"
    tmp = Path(tempfile.mkdtemp(prefix="ptr-mermaid-", dir=_BASE))
    _tree(tmp / "repo", files)
    (tmp / "home/.claude").mkdir(parents=True)
    before = sorted(p for p in tmp.rglob("*"))
    o, e = io.StringIO(), io.StringIO()
    rc = main(["--repo", str(tmp / "repo"), "--mermaid", "--focus", "docs/workflow.md"], home=tmp / "home", ci=False, out=o, err=e)
    assert rc == 0 and sorted(p for p in tmp.rglob("*")) == before, e.getvalue()
    edges = [l.strip() for l in o.getvalue().splitlines() if "-->" in l]
    assert len(edges) == 2 and all("|1|" in l for l in edges), edges  # workflow->a, b->workflow


TESTS = [v for k, v in sorted(globals().items()) if k.startswith("t_")]


def self_test() -> int:
    global _BASE
    failed = 0
    with tempfile.TemporaryDirectory(prefix="ptr-selftest-") as base:
        _BASE = base
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
    sys.exit(main(sys.argv[1:], home=Path.home(), ci=bool(os.environ.get("CI"))))
