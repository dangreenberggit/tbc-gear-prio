# Handoff — workstream E, the CRLF merge blocker is cleared

Written 2026-09-15 by the session that ran workstream E from
`.scratch/handoffs/post-chunk2-five-workstreams-HANDOFF.md`.

**E is done. The branch is not merged — that needs the owner's explicit ask.**

Every number here was measured in this session and says how. Nothing is
inherited prose.

## What changed

| Repo | Commit | Contents |
| --- | --- | --- |
| fork (`vendor/tbc-new-fork`) | `0b3c418e5848d32beebff717bbd8fe86f45ad940` | 29 universe copies refreshed to LF + a PROVENANCE.md refresh entry |
| core | `40d19e27` | fork pin bump, `sim-implemented-effects.json` regen, ticket 399, the two prior handoffs |

Both trees are clean (`git status --porcelain` empty in each).

## The blocker is cleared, measured

`pnpm verify` run to completion after the change:

- `fork universes check ok: 63 bundled copies byte-match their data/ sources`
- 65 test files passed
- `rc=0`

That was a full run, not `--check-only`. The prior run's sole failing gate was
`fork-universes:check`; it now passes and nothing else broke.

## What the drift actually was

29 of 63 copies drifted, **all 29 line endings only**. Verified two independent
ways before writing anything, agreeing on every file:

1. CR-stripped byte compare (`cmp` on both sides with `tr -d '\r'`) — equal on
   all 29.
2. `json.loads` equality on both sides — `True` on all 29.

Arithmetic corroborates: `fork_bytes - core_bytes == fork_CR` exactly, on all
29. After the write, `git diff --ignore-cr-at-eol` over `upgrades/data/` is
**empty** while the plain `git diff --stat` reports 463442 insertions against
463442 deletions across 29 files.

No item added, dropped or altered.

## Why it recurs — this is new, and it corrects the inherited story

The prior handoff described the fork's copies drifting to CRLF. The measurement
says something more specific.

`sync_fork_universes.py:168` compares **working-tree** bytes on both sides, and
neither side is pinned:

- **Core:** `.gitattributes` ends in `* text=auto eol=lf`, so the committed blob
  is always LF (`git show HEAD:data/universes/ret-p2.json` → 0 CR). The working
  tree is whatever the generator last wrote.
- **Fork:** has **no `.gitattributes` at all**.

The core working tree is split by regeneration batch, not by content. Census of
all 88 files in `data/universes/`:

| Endings | Count | mtime |
| --- | --- | --- |
| CRLF | 47 | all `2026-09-14 09:59` |
| LF | 41 | all `2026-09-14 15:22` |

No file crosses batches. The writer is `scripts/assemble_universe.py`, one of
**14** scripts under `scripts/` calling `write_text(` with no `newline=`.

**So the gate goes green whenever both sides happen to agree, at whichever
ending.** This refresh made 29 pairs agree at LF; 15 other pairs agree at CRLF
on both sides and are equally green (`ret-p2`: both 5603 CR, byte-equal). Any
later regen writing the other ending re-reds the gate with no data change.
That is why clearing it three times has not held.

Observable live: running `generate_sim_implemented_effects.py` this session
produced a working-tree file with 2036 CR against 0 in the committed blob.

## The pin bump — a trap worth knowing

Committing the fork moved its HEAD and **broke five core gates at once**.
`scripts/_fork_gate.py:require_pinned_fork` raises when clone HEAD ≠ the pin in
`data/wowsims-fork.lock.json`, and `sim-implemented-effects`,
`equip-eligibility`, `fork-lint`, `ep-presets` and `meta-conditions` all call
it. A fork commit is therefore never complete without the lock bump.

Done: pin → `0b3c418e5848d32beebff717bbd8fe86f45ad940`, then
`python scripts/generate_sim_implemented_effects.py`. The regen changed **only**
`forkCommit` — `implementedEffectItemIdsCount`, `implementedEffectItemIds` and
`stubOnlyItemIds` all compare equal to the committed versions, counts 221/451 —
because the fork commit touches nothing under `sim/`.

`equip-eligibility` then printed `17 specs match the fork at 0b3c418e5848`,
naming the new sha, which is the pin bump verifying itself.

## Ticket 399, filed

`.scratch/carry-forward/issues/399-fork-universes-gate-compares-two-unpinned-working-trees.md`

No open ticket owned this failure. 211 was being cited for it in this branch's
decision log and review — **211 is `Status: closed`**, it owned the *absence* of
a comparison mechanism and was closed by building `sync_fork_universes.py`.

399 lays out three options and does not choose: a `.gitattributes` in the fork,
fixing 283 at the 14 write sites, or normalising inside the gate (least
preferred — it blinds a check the script's own docstring says it wants). The
first two are complementary, not alternatives. **This is an owner decision and
it is still open.**

## Corrections to inherited claims

- The prior handoff said `.scratch/handoffs/` might be gitignored. It is not —
  `git check-ignore` returns 1 (no match), 131 files already tracked. Both prior
  handoffs are now committed.
- It said an unpushed fork commit might block the merge. `pushed` has **no
  reader** anywhere in `scripts/*.py`, and `merge_to_dev.py` has no push or
  fork-lock logic in its gate list. The full verify passed with `pushed: false`,
  which settles it by running rather than by grep.
- The fork lock's `_comment` claims `sim-implemented-effects.json` counts were
  "218/451" at `eb040855c`. The artifact says **221/451**, before and after.
  "218" was wrong when written. Noted in 399, not rewritten.

## Fork push state

The fork remote is now **two commits behind** local: `ls-remote` returns
`2781486d6b324c3092c0c5dcd51a26bbb7103d78`, while local HEAD is `0b3c418e5`
(via `eb040855c`). `pushed` is correctly `false`. Both exist on one disk only —
the ticket-355 exposure ADR-0030 Consequence 4 accepts. **Pushing needs the
owner's ask.**

## What is next

Per the five-workstream plan, E was the only merge blocker and it is cleared.
The next step in that plan is **the merge ask, which is the owner's to make** —
`pnpm merge-to-dev` is the only door, and a combined "review and merge" does not
count.

Then A (+D), B (ticket 398, accuracy), C (ticket 397, speed), unchanged. Those
three are untouched by this session.

## Fork queue

`vendor/tbc-new-fork` is one shared working tree. E's refresh is **done and
committed**, so the queue is free for B's harness edit or C's fix. Ask whether
another session is live before touching it.
