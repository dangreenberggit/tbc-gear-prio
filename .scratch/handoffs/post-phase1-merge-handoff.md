# Handoff — after the Phase 1 merge, starting the extra-ticket branch

**Date:** 2026-08-03
**Base:** `dev` at `9be1496` (merge of `phase-1/five-seed-spread`)
**State:** `pnpm verify` green — 154 tests, 3 todo, 22 files. Tree clean.
**Nothing is on `main`.** That needs a §14 gate entry in
`docs/verification-log.md`, which Phase 1 has; the promotion itself was not
asked for and was not done.

This is the delta since `.scratch/handoffs/phase1-remaining-tickets-handoff.md`.
Read that one first for anything older; it is still accurate except where
contradicted below.

---

## What landed

`phase-1/five-seed-spread` merged into `dev` with `pnpm land`, after the
incremental review at
[`docs/reviews/phase-1-five-seed-spread-incremental.md`](../../docs/reviews/phase-1-five-seed-spread-incremental.md).

Tickets closed: **13, 14, 15, 25, 27** (and 18/19/20/21/22 earlier).
Tickets still open: **17, 23, 24, 28**.

### The merge had conflicts, and how they were resolved

`dev` had moved on — it received `feat/cursor-worker-composer`, which edited
the same agent-policy files. Six conflicted hunks across four real files
(`.agents/` and `.claude/` are mirrors, so half were duplicates).

Both sides had reached the **same policy** (Composer workhorse, Grok high
sharp), so every hunk kept both intents rather than picking a side. Facts
that survived only because they were merged in deliberately:

- `dev`'s reason for the Composer pin — Other-pool Terra/Sol often **die at
  spawn** on Cursor Pro.
- `dev`'s **two billing pools** (Cursor Models vs Other Models, ~$20/mo).
- `dev`'s "Claude Code / Codex" line, which named both harnesses where this
  branch's version named only Codex.

If policy text looks redundant, that is why. Do not "tidy" it without
checking both ancestors.

---

## Numbers that changed — re-derive before quoting anything older

| | was | now |
|---|---|---|
| Universes shipped | p2, p3 | **p2, p3, p4, p5** |
| `ret-p4` / `ret-p5` rows | — | **401 / 467** |
| Test count | 119 | **154** |
| Enchant index | did not exist | **141 records under 137 effectIds** |

`ret-p2` (230) and `ret-p3` (354) are **unchanged** and still pinned in
`pool.test.ts` / `pool-hardening.test.ts`. Every change this round was
attribution or scoring, never membership — verified by diffing sorted id
lists on all four tiers.

Still true from the previous handoff: baseline DPS 2003.26, cutoff
`{absDps: 3.4, pct: 0.15}`, held-out Wowhead recall 78/123 (63.4%).

---

## Ground rules this round earned the hard way

1. **A count that looks like a total may be a collision.** The index
   generator printed "137 enchants" and I logged it as a count. It *was* the
   bug: 141 records collapsing to 137 keys, last-write-wins, silently
   dropping worn enchants. It now prints records and ids separately. When a
   generated artifact reports one number, ask what it is a count *of*.
2. **"I measured X and it was blocked" is not "X is impossible."** I typed
   `slotChoice` as `string`, justified by a real `resolveJsonModule` finding
   — about a function that does not read JSON at all. Both review axes caught
   it independently. Name the approach you measured, not the conclusion you
   want.
3. **Do not join on the field you happen to have.** My ticket-13 measurement
   concluded the recipe→product map "does not exist in the committed inputs".
   It does: AtlasLoot records it in the **trailing Lua comment**
   (`{ 3, 32736 }, -- Plans: Swiftsteel Bracers`), which the parser discarded.
   I had only ever tried item ids. A delegated agent found it in one pass.
4. **Content type is not a scope test.** I dismissed missing items as "out of
   raid scope". Whether an item belongs in a tier's universe is about **its
   power at that tier**. A heroic dungeon dropping a P5 BiS trinket does not
   make it out of scope. See ticket 28.
5. **Do not run a background agent and edit the same tree.** I dispatched the
   ticket-13 agent, then started editing; its stash/restore cycle reverted my
   in-flight work. Nothing was lost, but this is the collision AGENTS.md
   already warns about — either wait, or give the agent a worktree.
6. **Reviewers are not automatically right.** Domain claimed ticket 17's
   "ilvl 159" should be 154. `scalingOptions.0.ilvl` says 159 for all three.
   I nearly propagated a wrong correction; it is now recorded on the ticket
   so nobody re-applies it.

---

## Open tickets — what each actually needs

### 28 — p5 BiS items outside raid zones *(new, and the sharpest)*

`ret-p5.json` omits five phase-5 items the Wowhead ret list names, four of
them BiS-labelled. **34472 Shard of Contempt** is 44 expertise rating —
weighted 2.14, the second-heaviest ret term — and the domain review called
the "Absolute BIS" label *understated*.

**The mechanism is half-built.** `ITEM_SOURCE_KINDS` already includes
`"heroic"`, `source_zones()` already treats it like `raid`, `pool.ts` has a
`heroic` variant with a `dungeon` field, and `rank-report.ts` already formats
it. **Nothing emits a `heroic` source.** Membership gates on the zone being
in `phase_raids.json`, which lists raids only.

Needs a phase→heroic-dungeon map plus a source path for the four items
db.json gives `sources: null` (Shattered Sun badge/craft/rep). Only a **p5**
run is affected.

### 24 — standards smells *(two items left)*

Done: pinned-fetch dedupe, `EpWeights` rename, silent slot-drop, membership
assertions, `slotChoice` union, `findMetaGemId` move.

Left: **`ITEM_SOURCE_KINDS` duplicated three ways** (Python constant, TS
union, test literal — cross-language, so the fix is a shared JSON like
`slots-table.json` already is), and the `GemContext` data-clump grouping.

### 23 — spec drift *(one item left, deliberately deferred)*

Items 1, 2, 4, 5 and the tier gap are resolved. Item 3 (`Deps` shape) is
**deferred with reasons**: the ticket argues `pool` belongs in `RankInput`
because "they are hashed", but `contentHash` is still the literal placeholder
`` `phase1-baseline:${character}` ``. **Revisit when `contentHash` is real** —
that is when the field's home decides whether the cache is correct.

### 17 — the no-source gap *(triaged; the actionable half is now 28)*

71 ret-relevant items are excluded and **every one is phase 1**, all from the
Wowhead **pre-raid** stage list. That is defensible on its own terms. The
phase-5 half moved to ticket 28.

---

## Things that look like bugs but are not

Carried forward and still true:

- **Non-raid items missing from p2/p3** — pre-raid-stage items; see 17.
- **`ranged` has only 3 candidates** — raid-scoped, and librams are correct.
- **Caster items in the universe** — no armor-type gate on cloaks/rings/necks
  and the junk filter is off. The sim sorts them below cutoff unaided.
- **Polearms below cutoff** — correct for slamaltman, who wields a strong
  sword.
- **`wowheadRecall` in the default report is circular** — use
  `--hold-out-wowhead`. `wontfix`.
- **Sockets unscored in `curationHint`** — deliberate. It moves the weapon
  *tail* (Glaive, Hammer of the Naaru) but not the top; a per-socket estimate
  is a magnitude there is no measurement for. Recorded on ticket 27.
- **`fullPool` missing from `RankInput`** — ADR-0018.
- **The `shield`/`staff`/`off-hand` branches in `enchants.ts`** — cannot fire
  for ret, kept deliberately. The off-hand branch is an *inequality*, so
  deleting the "unreachable" half changes the reachable half's semantics.

---

## Repo hazards

- **`vendor/` is gitignored.** `pool-hardening.test.ts` skips vendor-dependent
  tests when `vendor/wowsims/db.json` is absent, so **a green CI run proves
  less than a green local run.**
- **`.scratch/wowsims-tbc-new-src/` and `.scratch/wt-*/` are now gitignored**
  (`8bc35d2`). They are embedded clones that made `pnpm land` refuse the tree.
  The wowsims clone is the **authority for game mechanics** — use it instead
  of recalling TBC facts.
- **`pnpm land` counts untracked files as dirty**, including `.scratch/`
  probes. Stash them (`git stash push -u -- .scratch`) rather than deleting.
- **A stale `data/proto/` worktree fails `fetch:protos:check` on Windows**
  with CRLF checksum mismatches. Fix:
  `rm -f data/proto/*.proto && git checkout -- data/proto/`.
- **`pnpm verify` typecheck can take >2 min** cold. A timeout is not a hang.
- Regenerate universes with **absolute paths only**:
  ```
  python scripts/assemble_universe.py --max-phase 3 \
    --out /abs/path/data/universes/ret-p3.json \
    --report /abs/path/data/universes/ret-p3.report.json
  ```
- A re-rank is ~15 minutes. **That figure is untested as written** — ADR-0018
  now says so. Do not run `pnpm rank` casually.

---

## Do not

- Land or merge into `dev` without an explicit ask, or set
  `TBC_ALLOW_DEV_MERGE=1` for anything but a reviewed merge.
- Promote `dev` to `main` without a §14 gate entry.
- Quote 238/362 universe counts, or the "22.6 dps margin" argument.
- Remove the `ranged` / `trinket` exemptions from `is_caster_junk`.
- Re-apply the "ilvl 154" correction on ticket 17 — it is wrong.
- Fan out slices that touch the same file, or edit a tree a background agent
  is working in.
