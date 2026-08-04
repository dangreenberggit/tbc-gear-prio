# Handoff — implement `contentHash`, then settle the `Deps` shape

**Date:** 2026-08-03
**Written by:** the agent that finished `feat/p5-heroic-sources` (tickets 28, 24, 23 item 5)
**For:** a fresh agent taking on the `contentHash` cluster
**Base:** branch off `dev` **after** `feat/p5-heroic-sources` lands, or off that
branch's tip if it has not landed yet — ask the user which.

You do **not** need the phase-1 universe/pipeline context. This is engine and
architecture work. Ticket 17 (phase-1 pre-raid items) is explicitly **not**
yours.

---

## Why this is one job and not three

Two open items both reduce to "what shape should `Deps` be?", and neither can be
answered without `contentHash` being real:

- **Ticket 23 item 3** — `Deps` carries `pool` and `gemPalette`, which are data,
  not seams. The ticket argues they belong on `RankInput` *"because they are
  inputs and they are hashed."*
- **Ticket 24, "Unused `Deps` breadth"** — `rank.ts` ends with
  `void deps.store; void deps.clock;`. The whole `Store.job` surface
  (`create`/`update`/`read` plus `Job`/`JobCreateInput`/`JobUpdateInput`) is
  exported and tested with **no production consumer**.

The blocker is that the hashing argument is **currently false**. Verified
2026-08-03:

```
packages/core/src/rank.ts:355
  contentHash: `phase1-baseline:${input.character.name.toLowerCase()}`,
```

Nothing is hashed, so nothing is missing from the hash, so there is no evidence
for moving `pool` anywhere. Move it now and you have done a wide mechanical
refactor (`rank.ts`, `cli.ts`, every test that builds `Deps`) to satisfy a
requirement that does not exist yet.

Implement the hash and both items resolve with evidence instead of argument.

**Do them in this order.** The hash first, the `Deps` decision second, as a
consequence. Do not start by moving fields around.

---

## Part 1 — implement `contentHash`

### The spec exists and is good — read it first

**PLAN.md §7 "One hash, three payoffs"** (around line 450) gives the field list
and, more usefully, the three reasons the hash exists: ranking cache, job
dedupe, reproducibility stamp. Read the whole section. §4.1 and line 66 carry
the load-bearing rule:

> **No view changes a number.** … If a control would change a delta, it belongs
> on `RankInput` and in `contentHash` instead.

`ViewOptions` — pins, raid filter, grouping, hide-owned — are **deliberately
not hashed**. Hashing them means a full re-sim on every checkbox click. There is
a §14 gate checkbox on exactly this: *"toggling any `ViewOptions` field does not
change `contentHash` or trigger a sim."*

### The spec is partly stale — this is the real work

§7 names fields that **do not exist in the shipped engine**. Counted in
`packages/core/src/` on 2026-08-03:

| §7 field | occurrences in src | note |
|---|---:|---|
| `gearSnapshot` | 0 | the gear *is* read; there is no field by this name |
| `poolId`, `poolVersion` | 0 | ADR-0017 replaced the single curated pool with per-tier generated universes — these no longer describe anything |
| `presetVersion` | 0 | `presetId` appears twice |
| `epVersion` | 0 | §7's own comment ties this to the rank-time EP prefilter… |
| `fullPool` | 0 | …which **was never built** — see ADR-0018 |
| `encounterProfile` | 0 | |
| `engineVersion` | 0 | |
| `simVersion` | 8 | exists |
| `iterations`, `seeds` | 27 / 7 | exist, and are on `RankInput` |

So **you cannot implement §7 literally.** Two of its fields (`epVersion`,
`fullPool`) reference a prefilter that ADR-0018 records as never having been
built, and two more (`poolId`/`poolVersion`) reference a pool architecture
ADR-0017 replaced.

**Read ADR-0017 and ADR-0018 before designing the field list.** Then decide what
actually belongs, and write an ADR for the delta. The test is not "does it match
§7" — it is **"if this value changes, do the numbers change?"** If yes, hash it.
If no, keep it out.

Current shipped inputs that plainly change the numbers:

```
RankInput:  character, spec, maxPhase, fight?, race?, iterations?, seeds?
Deps:       raidSimSkeleton, epWeights, gemPalette?, pool?
```

That `Deps` line is the crux — see Part 2.

### Watch for

- **Canonical JSON.** §7 says `sha256(canonicalJson({...}))`. Key order,
  float formatting and `undefined`-vs-absent all have to be pinned, or the same
  inputs hash differently across runs and the cache silently never hits. Test
  that two structurally-equal inputs built in different key orders agree.
- **`contentHash` is already user-visible.** It renders in the report footer
  (`rank-report.ts:267`). A hash that changes when nothing meaningful changed is
  a broken promise on the page, not just a cache miss.
- **The `Store` already keys on it.** `seams/store.ts` has `Job.contentHash`
  and `JobCreateInput.contentHash`, and `store.test.ts` exercises them. The
  seam is built and waiting; nothing calls it from `rank.ts`.
- **`engineVersion` is the honest escape hatch.** PLAN.md line 880 wants
  `simVersion` in the hash so a sim upgrade invalidates the cache. Same for a
  ranking-logic change. Without one of these, a bug fix serves stale rankings
  forever.

### Done when

- `contentHash` is a real hash of inputs that affect the numbers, with the
  field list justified in an ADR against §7.
- Equal inputs → equal hash (order-independent); any hashed field changing →
  different hash. Both tested.
- No `ViewOptions` field is in the hash — the §14 gate line, as a test.
- The `Ranking` cache actually works: a second `rankUpgrades` with the same
  hash returns from `deps.store` **without spawning a sim**. PLAN.md §4 line
  161 requires "cache hits fire `onProgress` once and resolve."

---

## Part 2 — then settle `Deps`, with evidence

Once the hash is real, `pool` and `gemPalette` are decidable:

- If the candidate set is in the hash (it should be — change the pool, the
  numbers change), then a cache keyed without it serves stale rankings. That is
  the argument for `RankInput`, and now it is demonstrable rather than asserted.
- If you conclude they should stay on `Deps`, **amend PLAN.md §4 with the
  reason.** Ticket 23's whole point is that drift must be a recorded decision,
  not silence.

Implementing the cache also gives `deps.store` its first production consumer,
which resolves ticket 24's "unused breadth" item as a side effect — `void
deps.store` should be gone by the end. `deps.clock` likewise: cache entries and
job rows want timestamps.

### One correction to carry forward

Ticket 23's own text says moving `pool` to `RankInput` would have fixed a test
hazard (a hand-built two-item fixture standing in for the shipped universe).
**It would not** — a test can pass a two-item list to `RankInput` just as
easily. That was already fixed the right way, by a test against the real
`ret-p2.json` in `pool.test.ts`. Do not re-litigate it.

---

## Scope boundaries

**In:** `contentHash`, the ranking cache, the `Deps`/`RankInput` decision plus
its ADR or PLAN.md amendment, and the ticket-24 `Deps`-breadth item.

**Out:**

- **Ticket 17** (phase-1 pre-raid items). Not yours.
- **Ticket 19** — already **closed**. ADR-0016 deferred the second
  `GearSource`/`Store` adapters to Phase 2. You will see tickets 23 and 24
  point at 19 as if it were open; it is not. You need `MemoryStore` to work,
  not `SqliteStore` to exist.
- Re-running `pnpm rank`. A re-rank is ~15 min and this work should not need
  one; if you think it does, say why first.

---

## Repo rules that will bite

Read `AGENTS.md` fully. The ones that catch people here:

- **`pnpm verify` before every push.** Includes `codegen:json-types:check`.
- **Never derive a TypeScript type from a JSON import.** Widens to `string`;
  `as const` is TS1355; assertions against it pass **vacuously**. This repo hit
  it twice. Shared lists go through `scripts/generate_json_literal_types.py`.
  See `AGENTS.md` § "Types from JSON".
- **Do not land or merge into `dev` without an explicit ask** — and the ask has
  to come *after* `pre-merge-review` has written `docs/reviews/<branch>.md` and
  the user has seen it. "Review and land" in one message means review, then
  stop.
- **Ticket 23 is `Blocks: phase-2`.** `pnpm land` on a `phase-N/*` branch fails
  while it is open. This is a gate item, not optional cleanup.
- **Commit before mutation-testing.** The previous agent lost work three times
  running `git checkout -- <file>` to undo a mutation on a file that also held
  uncommitted real edits. Commit first, mutate, then `git checkout` is safe.

---

## Useful starting commands

```bash
pnpm issues:open
```

```bash
grep -rn "contentHash" packages/core/src packages/core/test PLAN.md
```

```bash
pnpm verify
```

Read in this order: PLAN.md §7, §4.1, §5; `docs/adr/0017-*` and `0018-*`;
tickets 23 and 24; then `packages/core/src/rank.ts` and `seams/store.ts`.
