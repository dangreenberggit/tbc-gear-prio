# Handoff — workstream E, the CRLF merge blocker is cleared

Written 2026-09-15 by the session that ran workstream E from
`.scratch/handoffs/post-chunk2-five-workstreams-HANDOFF.md`.
**Revised later the same day**, after ticket 399 was fixed by a subsequent
session — the original text described a state that no longer exists. See
"Revision note" at the end for what changed and why.

**E is done. The branch is not merged — that needs the owner's explicit ask.**

## State, measured on the current tip

| Thing | Value | How established |
| --- | --- | --- |
| Core tip | `933305b1` | `git log --oneline` |
| Fork HEAD | `e94d927af0ff7c31f071c961d1d7789980c8b8c9` | `git -C <fork> rev-parse HEAD` |
| Fork remote | same sha — **pushed** | `ls-remote origin refs/heads/feat/upgrades-tab` |
| Pin coherence | lock `commit`, fork HEAD and `sim-implemented-effects.json`'s `forkCommit` all agree | read all three |
| `pnpm verify` | **rc=0**, full run | `fork universes check ok: 63 bundled copies byte-match` |
| Review | `docs/reviews/feat-desktop-transport-gate.md`, round 2, S1 retired | committed |
| Ticket 399 | **closed** — fixed, options 1 + 2 | its `Status:` line |

Both trees clean.

## What E did, and what a later session did on top

E cleared the symptom: 29 of 63 bundled copies were drifted, **all 29 line
endings only**, refreshed with `sync_fork_universes.py --write`. Verified two
independent ways before writing anything, agreeing on every file — CR-stripped
byte compare, and `json.loads` equality. `git diff --ignore-cr-at-eol` empty
afterwards against a plain diff of 463442 insertions / 463442 deletions. No item
added, dropped or altered.

A later session then fixed the **cause** under ticket 399, applying both of the
options E had left open. That work is done and verified:

- Core generators now pass `newline="\n"`; `data/universes/` went from 47 CRLF /
  41 LF to **88 files, 0 CR**.
- The fork gained a scoped `.gitattributes` at `upgrades/data/` pinning
  `* text eol=lf`, with `git add --renormalize` — **15 copies had been committed
  CRLF**, so the renormalize was load-bearing. Fork copies now **63 files,
  0 CR**.

## Why it used to recur — the mechanism, for the record

Worth keeping because it explains the class of bug, not just this instance.

`sync_fork_universes.py:168` compares **working-tree** bytes on both sides, and
before 399 neither side was pinned: the core normalised only on commit via
`.gitattributes` (committed blob always LF, working tree whatever the generator
last wrote), and the fork had no `.gitattributes` at all. The core tree sat
split 47 CRLF / 41 LF purely by regeneration batch — every CRLF file stamped
`2026-09-14 09:59`, every LF file `15:22`, no file crossing batches.

So the gate went green whenever both sides happened to agree, at whichever
ending, and any later regen writing the other ending re-redded it with no data
change. That is why clearing it three times had not held.

## The pin-bump trap — still live, still worth knowing

This is the one operational lesson here that outlives the ticket.

Committing the fork moves its HEAD and **breaks five core gates at once**.
`scripts/_fork_gate.py:require_pinned_fork` raises when clone HEAD ≠ the pin in
`data/wowsims-fork.lock.json`, and `sim-implemented-effects`,
`equip-eligibility`, `fork-lint`, `ep-presets` and `meta-conditions` all call it.
**A fork commit is never complete without the lock bump and the
`sim-implemented-effects` regen.**

The regen is cheap and self-verifying: it moves only `forkCommit` when the fork
commit touches nothing under `sim/`, and `equip-eligibility` then prints the new
sha back at you (`17 specs match the fork at e94d927af0ff`).

## Corrections to claims inherited from the prior handoff

- `.scratch/handoffs/` is **not** gitignored — `git check-ignore` returns 1, 131
  files already tracked.
- An unpushed fork commit does **not** block the merge. `pushed` has no reader
  in any script, and `merge_to_dev.py` has no push or fork-lock logic. Settled by
  a passing full verify, not by grep. (The fork has since been pushed anyway.)
- The fork lock's `_comment` says `sim-implemented-effects.json` counts were
  "218/451". The artifact says **221/451**, before and after. "218" was wrong
  when written. Noted in 399, not rewritten.

## What is next

E was the only merge blocker and it is cleared. The next step is **the merge
ask, which is the owner's to make** — `pnpm merge-to-dev` is the only door, and a
combined "review and merge" does not count.

Then A (+D), B (ticket 398, accuracy), C (ticket 397, speed), unchanged and
untouched by this session.

One piece of bookkeeping is open: **ticket 283 still reads `Status: open`**
though 399's fix satisfied most of its "Done when". It wants closing or
narrowing to what actually remains — 5 `write_text(` calls without `newline=`,
all of them scratch or probe writes that 399 deliberately skipped (verified by a
paren-balancing scan, not a line grep). Ticket 167 is the still-open sibling case
on `check_engine_port_drift.py`.

## Fork queue

`vendor/tbc-new-fork` is one shared working tree. E's work is done, committed and
pushed, so the queue is free. Ask whether another session is live before
touching it.

## Revision note

The original version of this file was written before ticket 399 was fixed, and
seven of its claims went stale within hours: both commit shas, the fork push
state (`pushed: false` → pushed, remote "two commits behind" → current), the
CRLF census (47/41 → 88/0), the "14 scripts" figure (a line-based grep; the real
count was 13 sites in 11 scripts), 399's status (open with three options → closed
via options 1 + 2), and the framing of the durable fix as an open owner decision.

Rewritten rather than patched, because a handoff whose state table is wrong is
worse than no handoff — the reader cannot tell which half to trust. The
measurements E actually made are preserved above; what changed is that they now
describe history rather than the current tip.
