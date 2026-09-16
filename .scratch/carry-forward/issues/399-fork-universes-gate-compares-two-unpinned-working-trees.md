# 399 — `fork-universes:check` compares two working trees whose line endings nothing pins

Status: closed — fixed 2026-09-15 on `feat/desktop-transport-gate` (options 1 + 2; see "Resolution")
Type: tooling defect
Origin: workstream E, `feat/desktop-transport-gate`, 2026-09-15
Blocks: —
Related: 283 (generators write CRLF — its core-side write sites are fixed here), 167 (same class, engine-port-drift gate — still open), 211 (closed — built the gate, does not own this)

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

## Resolution, 2026-09-15 — options 1 and 2, both

Option 3 was rejected as filed: it blinds the gate to the encoding changes the
script's docstring says it exists to catch.

**Option 2, core side.** 13 `write_text(` call sites across 11 scripts omitted
`newline=`; all now pass `newline="\n"`, matching the existing pattern at
`scripts/generate_item_gem_index.py:281` and `scripts/list_phase_pool.py:558`.
The sites: `assemble_universe.py` (exclusions manifest, universe payload,
report), `generate_sim_implemented_effects.py`, `build_feral_skeleton.py`,
`generate_json_literal_types.py`, `check_layout_gate.py`, `fetch_protos.py`,
`capture_fixture.py`, `compose_feral_raid_sim.py` (×2),
`compose_slamaltman_raid_sim.py` (×2), `five_seed_spread.py`. Deliberately not
touched: the three probe `infile` writes (`crn_pairing_probe.py:69`,
`five_seed_spread.py:84`, `seed_overlap_probe.py:68`) and two writes inside
`TemporaryDirectory` — all scratch, none committed.

Note the "14 scripts" figure in the grep above was wrong; the real count is 13
sites in 11 scripts, and `list_phase_pool.py` was already correct.

All 44 universes and 44 reports were then regenerated
(`python scripts/assemble_universe.py --max-phase N --spec S`, 1s each), taking
`data/universes/` from **47 CRLF / 41 LF to 0 CRLF / 88 LF**.
`data/sim-implemented-effects.json` went 2036 CR → 0.

**Option 1, fork side.** `.gitattributes` added at
`ui/core/components/individual_sim_ui/upgrades/data/` pinning `* text eol=lf`,
with `git add --renormalize` in the same commit. `git check-attr text eol` on
the copies went from both **unspecified** to `text: set` / `eol: lf`. Scoped to
that directory, not the fork root, per this ticket's own note — it is a
fork-local file every future upstream merge carries.

The renormalize was load-bearing: **15 copies were committed as CRLF** in the
fork (`ret-p2` 5603 CR, `warrior-p2` 15350 CR, and 13 others), so refreshing the
worktree alone would have left the blobs CRLF.

**Sequence worth knowing.** The core regen flipped `data/universes/` to LF,
which turned the gate **red at exactly those 15 copies** — that red is the fix
surfacing, not a new fault. `sync_fork_universes.py --write` refreshed the 15,
the renormalize pinned them, and the gate returned to
`63 bundled copies byte-match their data/ sources`, rc=0.

**Nothing but line endings changed**, verified the same two ways this ticket
used: CR-stripped byte compare and `json.loads` equality, **0 mismatches by
either method** across every file the regen touched, plus
`0 local-only; 0 fork-only; 0 shared entries differ in content` from
`describe_delta` on all 15.

### Left alone, on purpose

Five tracked files are committed CRLF and were not renormalized:
`docs/five-seed-spread.json` (51 CR), `docs/five-seed-spread-feral.json` (52),
`test/fixtures/shredzepelin-cat.raid-sim-request.json` (1338),
`test/fixtures/shredzepelin-cat.raid-sim-result.json` (28), and
`packages/core/test/candidate-gems.test.ts` (398). No gate compares them, their
writers are now fixed so they will normalize on their next real regen, and
regenerating the first four needs `wowsimcli` and live sim runs. The `.ts` file
is hand-written with no generator. The ~294 CRLF files under `.scratch/` are
also untouched — tracked, but not build inputs.

**Ticket 167 is not closed by this.** Its sibling gate
(`check_engine_port_drift.py`) compares the fork's engine `.ts` ports, which
this `.gitattributes` does not cover and no generator here writes.

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

Confirm the fork pin is live. **This needs the fork clone on disk**, and
`vendor/` is gitignored — a fresh checkout has no `vendor/tbc-new-fork` and
cannot verify the fork half of this ticket at all (`sync_fork_universes.py`
exits 0 with a skip message by design). Clone it to the pin in
`data/wowsims-fork.lock.json` first:

```bash
git clone https://github.com/dangreenberggit/tbc-new.git vendor/tbc-new-fork
git -C vendor/tbc-new-fork checkout $(python -c "import json;print(json.load(open('data/wowsims-fork.lock.json'))['commit'])")
git -C vendor/tbc-new-fork check-attr text eol -- ui/core/components/individual_sim_ui/upgrades/data/ret-p2.universe.json
```

The checkout step will fail today: the pinned commit `e94d927af` is
`pushed: false` and exists on one disk only, three commits ahead of
`origin/feat/upgrades-tab` (`2781486d6`). Until the fork is pushed, only the
machine that made it can verify Option 1 — the ticket-355 exposure ADR-0030
Consequence 4 accepts.

Confirm a regen no longer writes CRLF:

```bash
python scripts/assemble_universe.py --max-phase 2 --spec ret && git diff --stat -- data/universes/ret-p2.json
```
