Status: closed
Type: task
Origin: ticket 304 execution, gate flagged rather than papered over, 2026-08-27
Blocks: none
Blocked by: none

# `oxfmt --check` is red at baseline in the fork (194 files)

Found while running the fork's own gates for ticket 304. Filed rather than
silently worked around, because it makes one of the four fork gates unusable as
a pass/fail signal.

## What is wrong

In the fork checkout `vendor/tbc-new-fork` (branch `feat/upgrades-tab`), the
`fmt` gate fails:

```
[gate oxfmt] exit=1  Format issues found in above 194 files
```

The installed `oxfmt` disagrees with the tree's committed formatting — reported
causes include arrow-parens and line width. This is **pre-existing and
tree-wide**, not caused by any recent work: the same 194 files fail at the
stage-open commit `fd4d65c4a` and at the current tip, identically.

## Why it was not fixed in ticket 304

Making the gate green means running `oxfmt` without `--check`, which reformats
**194 files**, nearly all unrelated to the UI work. That would bury a focused UI
change under a tree-wide reformat and make the diff unreviewable. The executor
correctly refused, and ticket 304 explicitly does **not** claim `fmt` green.

## Why it matters

The fork's four gates are what actually cover UI code — `pnpm verify` in the
main repo does not lint, typecheck or test the fork at all (`grep -c vendor
package.json` → 0). Three of the four are usable signals:

```
[gate locales]   exit=0
[gate tsc]       exit=0
[gate stylelint] exit=0
[gate oxlint]    exit=0   (pre-existing warnings only)
[gate oxfmt]     exit=1   <- this ticket
```

A gate that is always red teaches everyone to ignore it, and a real formatting
regression would hide in the noise.

## Options

- **Reformat the tree once**, in a commit that does nothing else, and keep the
  gate green from then on. Large diff, but it is mechanical and one-time.
- **Pin or configure `oxfmt`** to match the committed style, if the disagreement
  is a version or config drift rather than a genuine style change. Investigate
  before assuming: check whether the fork's `oxfmt` version is pinned and what
  config it reads.
- **Drop `fmt` from the fork gate set** and say so explicitly, so nobody treats
  its redness as meaningful.

Prefer the second if the cause turns out to be drift — that fixes it without a
194-file diff. Measure first.

## Note on invocation

The `node_modules/.bin/` shims fail in this environment with an fnm error.
Invoke through `node` against real entry points; the working commands for all
four gates are recorded in
`.scratch/stage-gate/upgrades-ui-quality/fork-gates.md`.

## Acceptance

- [x] Cause identified: config/version drift versus a real style change.
      **Neither — the tree is simply unformatted, and most of it is upstream's.**
- [x] One of the three options taken, and the choice recorded. **A scoped gate**
      — a refinement of the third option that keeps a real signal instead of
      dropping one.
- [x] Either `oxfmt --check` exits 0 in the fork, or the gate set is documented
      as three gates with the reason `fmt` is excluded. **Satisfied in intent:**
      the scoped `--check` exits 0, and `fork-gates.md` documents the scope and
      every exclusion.

## Resolution

Closed 2026-08-27.

**Cause: not drift.** `oxfmt` is pinned `^0.62.0` with 0.62.0 installed, and the
config is upstream's own. Measured from *inside* each tree so `.oxfmtrc.json`
resolves:

- our fork tip: **194 failing over 643 files**
- pristine upstream base `cbf6b75a889e`: **85 failing over 529 files**

Upstream's own tree fails upstream's own config, so the config is not
misconfigured and the version is not drifting — the tree is unformatted, and 85
of the 194 are inherited.

**A measurement correction worth keeping.** An earlier figure of 157 at base was
wrong. It came from running oxfmt against a worktree *path* from outside that
tree, which silently loses the config and scans 674 files instead of 529.
oxfmt 0.62.0 prints no "no config found" diagnostic, so nothing flags the bad
run — **verify the invocation form by scan count**, not by looking for a config
message.

**Option taken: a scoped gate over the ten files we own.** The tip−base
difference is 109 files, and it decomposes cleanly:

| Group | Files | Why not formatted |
| --- | --- | --- |
| `upgrades/engine/**` | 34 | Byte-gated by `check_engine_port_drift.py` against `engine/PROVENANCE.md`; oxfmt reindents them 2-space → tabs, which would break the hashes |
| `upgrades/data/**` | 65 | Committed **generated** artifacts and their `PROVENANCE.md`; no regenerator would reproduce a hand-formatted result |
| ours | 10 | Formatted — see below |

Reformatting all 194 was rejected: it would hand-rewrite 65 generated files.
Dropping `fmt` entirely was rejected because `pnpm verify` never sees the fork
(`grep -c vendor package.json` → 0), so dropping it leaves our own UI code
covered by nothing.

The ten owned files are formatted, and `--check` over exactly those ten exits 0.
The list lives at `.scratch/stage-gate/tickets-306-308/fmt-owned-files.txt`; the
new `fmt` row and the exclusion reasoning are in
`.scratch/stage-gate/upgrades-ui-quality/fork-gates.md`.

`oxfmt --check ./ui` stays red tree-wide **by design**, and the gate doc now
says so, so its redness is no longer mistaken for a signal.

One thing the next reader should know: `lint:js` warns
`simple-import-sort(imports)` on several of the formatted files, because oxlint
and oxfmt want different import orders. The warning count is **265 both before
and after** the format pass, so it is upstream baseline noise rather than a
regression this work introduced.

## Comments
