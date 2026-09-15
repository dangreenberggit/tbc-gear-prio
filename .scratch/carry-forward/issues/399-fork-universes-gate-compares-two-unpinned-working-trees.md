# 399 — `fork-universes:check` compares two working trees whose line endings nothing pins

Status: open
Type: tooling defect
Origin: workstream E, `feat/desktop-transport-gate`, 2026-09-15
Blocks: —
Related: 283 (generators write CRLF), 167 (same class, engine-port-drift gate), 211 (closed — built the gate, does not own this)

`pnpm fork-universes:check` has gone red on pure line-ending drift at least
four times, been cleared with `sync_fork_universes.py --write` each time, and
come back. No open ticket owned it before this one.

## The mechanism, measured

`scripts/sync_fork_universes.py:168` compares
`source.read_bytes() == copy.read_bytes()` — raw **working-tree** bytes on both
sides. Neither side's line endings are pinned:

- **Core:** `.gitattributes` ends in `* text=auto eol=lf`, so the committed
  blob is always LF — verified, `git show HEAD:data/universes/ret-p2.json`
  has 0 CR. The working tree is whatever the generator last wrote, which is
  *not* the same thing.
- **Fork:** `vendor/tbc-new-fork` has **no `.gitattributes` at all** (verified
  by `ls`). Nothing normalises it, in the tree or at commit.

The core working tree is currently split, by regeneration batch and not by
content. Census of all 88 files in `data/universes/` on 2026-09-15:

| Line endings | Count | mtime |
| --- | --- | --- |
| CRLF | 47 | all `2026-09-14 09:59` |
| LF | 41 | all `2026-09-14 15:22` |

No file crosses batches. This is ticket 283 (Python generators omit `newline=`)
showing up as a timestamp.

The writer is named: `scripts/assemble_universe.py` produces `data/universes/`
and is one of **14** scripts under `scripts/` that call `write_text(` with no
`newline=` argument (scoped grep, 2026-09-15). Others on that list include
`generate_sim_implemented_effects.py`, `generate_json_literal_types.py` and
`build_feral_skeleton.py`.

It is observable live rather than only in history. Running
`python scripts/generate_sim_implemented_effects.py` during this workstream
produced a working-tree file with **2036 CR** while the committed blob has
**0** — the `.gitattributes` catch-all normalising on staging, and the
generator writing CRLF underneath it. The write site is
`generate_sim_implemented_effects.py:279`:

```python
OUT_PATH.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
```

That is the whole mechanism, in one line, in a file that is not the fork.

**Consequence:** the gate passes whenever both sides happen to agree, at
whichever ending. The 2026-09-15 refresh made 29 pairs agree at LF; 15 other
pairs agree at CRLF on both sides and are equally green (`ret-p2`: core and
fork both 5603 CR, byte-equal). Any later regen that writes the other ending
re-reds the gate with no data change. Clearing the symptom cannot hold.

## Why it matters, and why it is not urgent

It is not a data risk. When this gate is red on line endings the parsed content
is identical — verified on all 29 drifted files on 2026-09-15 by two
independent methods (CR-stripped byte compare, and `json.loads` equality), both
agreeing on every file. The page is unaffected: `data.ts` imports these as
static JSON, so the bundler parses at build time and line endings never reach a
parsed value.

The cost is that a **merge-blocking gate cries wolf**. `pnpm merge-to-dev` runs
`pnpm verify`, so this red blocks merges; and a gate that is routinely red for a
harmless reason is one people learn to wave through, which is the condition
under which it will eventually be waved through while red for a real reason.

## Options

1. **Add `.gitattributes` to the fork** pinning `* text=auto eol=lf`, with
   `git add --renormalize .` in the same commit. Narrowest fix, matches what
   the core already does. Note the fork is a vendored clone of an upstream
   repo — adding a root dotfile there is a fork-local change that every future
   upstream merge carries, so consider scoping it to `upgrades/data/`.
2. **Fix 283 at the write sites** so generators pass `newline="\n"` and the
   core tree stops alternating. Fixes the class, including ticket 167's sibling
   gate. Larger, and does not by itself pin the fork side.
3. **Compare normalised bytes in the gate** — strip CR before comparing in
   `sync_fork_universes.py`. Cheapest, but it deliberately blinds the gate to
   an encoding change, which the script's own docstring says it wants to catch
   ("a byte check also catches a reformat or an encoding change that a parsed
   comparison would call equal"). Weakens the gate to quiet it; least
   preferred.

1 and 2 are complementary, not alternatives — 2 without 1 leaves the fork
unpinned, 1 without 2 leaves the core tree alternating under every other
consumer.

## A stale count in the fork lock's `_comment`, noticed in passing

`data/wowsims-fork.lock.json`'s `_comment` says of the `eb040855c` entry that
`data/sim-implemented-effects.json` had "counts unchanged at 218/451". The
artifact says **221/451**, both in the commit that prose describes and after a
fresh regen on 2026-09-15 (`implementedEffectItemIdsCount` 221, `stubOnlyItemIds`
451, and the regen changed only the embedded `forkCommit`). So "218" was wrong
when it was written, not made wrong later.

Nothing depends on the number — it is prose in a comment field, and no gate
reads it. Recorded here rather than rewritten, because editing the historical
narrative of a lock file to fix a past sentence is worse than a note.

## Verify the current state

```bash
python scripts/sync_fork_universes.py --check
```
