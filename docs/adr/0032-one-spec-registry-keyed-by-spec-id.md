# ADR-0032 — One spec registry, keyed by `SpecId`

**Status:** accepted
**Date:** 2026-09-11
**Related:** [`ADR-0029`](0029-borrow-the-decision-derive-with-a-gate-or-justify-the-copy.md), [`ADR-0031`](0031-the-raid-sim-skeleton-is-a-cli-harness-input-not-a-product-input.md), `AGENTS.md` § Types from JSON; tickets `.scratch/carry-forward/issues/372-fork-clone-head-is-behind-the-lockfile-pin.md`, `367-generated-local-dev-skeleton-set-has-no-consumer.md`, `371-*` (ret/feral allow-lists), `159` (EP-weights map)

## Context

Adding a spec to the wowsims Upgrades feature cost roughly fourteen
hand-written touch points split across two repos. On the repo side there were
seven per-spec tables, each total over `SpecId` and each its own edit:
`CAP_PROFILE_BY_SPEC`, `CUTOFF_BY_SPEC`, `SPEC_PREFERRED_METAS`,
`PRESET_ID_BY_SPEC`, `SPEC_TREE_INDEX`, `SPEC_CLASS_NAME` and `SPEC_PAGE`, plus
the `SpecId` union itself, an EP-weights entry, and Python's
`SLUG_TO_FORK_SPEC` and `SPEC_PROFILES`.

The totality of those tables was deliberate and load-bearing: a missing per-spec
row had to stay a compile error rather than a silent inheritance of ret's
numbers. Any replacement had to keep that property, not trade it for a runtime
lookup.

This record exists because the registry's mechanism is easy to get wrong in a
way that reads as rigour and proves nothing — see Q3.

## Decision

Every repo-side per-spec fact is read from one registry:

- `packages/core/src/spec-registry.json` — the spec ids and each one's fork
  proto `Spec` name. A value file, shared with Python.
- `packages/core/src/spec-ids.generated.ts` — `SPEC_IDS` and `SpecId`, emitted
  from the JSON's keys by `scripts/generate_json_literal_types.py`.
- `packages/core/src/spec-registry.ts` — `SPEC_REGISTRY`, one annotated object
  literal of type `Readonly<Record<SpecId, SpecEntry>>` with every `SpecEntry`
  field required: class name, tree index, site path, cap profile, cutoff,
  preferred metas.

Consumers read through accessors that index the registry **directly** on the
typed path — `SPEC_REGISTRY[spec].field`, no `?.`, no `??`, and no derived
tables.

## Q1 — Where does the registry live?

**Candidate (a): one repo-side registry that the fork's tables are generated
from, with a gate proving they match.** Would win if the gate could run on every
`pnpm verify`, including CI and fresh worktrees.

_Measured:_ it cannot. `vendor/tbc-new-fork` is gitignored, and both fork-facing
gates skip with exit 0 when the clone is absent — so the gate would be advisory
exactly where verify runs unattended. Writing into the fork also means a fork
commit, which needs steps 3–5 of the ported-engine cycle even when nothing
ported changes (`docs/agents/known-traps.md`). Dropped.

**Candidate (b), chosen: repo-side only; the fork's six touches stay.** Would
win if the repo-side hand-written count fell by at least half with zero fork
edits and zero drift-gate members touched.

_Measured:_ 12 hand-written sites → 4 (Q4), zero fork paths touched, and the
drift gate still green:

```
$ python scripts/check_engine_port_drift.py
engine port drift check ok: 33 ported files match PROVENANCE.md; ItemSlot,
ITEM_SOURCE_KINDS and SIM_ORDER match their sources member-for-member
rc=0
```

## Q2 — What is the registry's key?

The brief inherited "keyed by proto `Spec`" from tranche 1. **Refuted.** On the
repo side the proto name is hand-written in exactly one place —
`SLUG_TO_FORK_SPEC` — while every other site keys by the slug. Keying by the
fork's vocabulary would have required translating at ten sites to serve one.

Chosen: key by the slug (`SpecId`); the proto name is a `forkSpec` field whose
validity `check_equip_eligibility.py` already gates as total, injective, and
present in `data/equip-eligibility.json`.

## Q3 — How is compile-time totality preserved?

This is the question the design turns on, because two plausible mechanisms are
vacuous.

**Rejected: a generic `projectRegistry<T>()` helper deriving each `_BY_SPEC`
table.** Its body cannot return `Readonly<Record<SpecId, T>>` without a cast —
iterating and indexing yields `Partial<Record<…>>` (TS2322). Once laundered
through that cast, a registry with `warlock` **omitted** compiled clean at rc 0.
A check that reads as rigour and proves nothing.

**Rejected: `satisfies Record<SpecId, …>` at four projection sites.** It does
catch omission, but four per-spec literals are the four touch points this work
set out to remove.

**Chosen: one annotated literal, required fields, no derived tables, direct
indexing.** Indexing a `Record<SpecId, …>` with a `SpecId` is exact under
`noUncheckedIndexedAccess`, so the read needs neither `?.` nor `??` to compile
and no cast appears anywhere. The four independent checks the old tables gave
become 44: 11 entries × 4 required game-fact fields, none fillable by omission.

### Totality demonstrated

Three directions, each run against this repo at the tip of `feat/spec-registry`
and reverted afterwards (`pnpm typecheck`; full output in the execution report):

**(a) Omit an entry** — delete the whole `warlock: { … }` entry, JSON untouched:

```
packages/core/src/spec-registry.ts(176,14): error TS2741: Property 'warlock' is
missing in type '{ balance: … }' but required in type 'Readonly<Record<"balance"
| "feral" | … | "warlock" | "warrior", SpecEntry>>'.
rc=2
```

**(b) Omit one field** — delete only `cutoff:` from the `warlock` entry:

```
packages/core/src/spec-registry.ts(453,3): error TS2741: Property 'cutoff' is
missing in type '{ className: string; … }' but required in type 'SpecEntry'.
rc=2
```

**(c) Add an id** — add `"zzz"` to `spec-registry.json`, run
`pnpm codegen:json-types`, then typecheck:

```
packages/core/src/spec-registry.ts(176,14): error TS2741: Property 'zzz' is
missing in type '{ balance: … }' but required in type 'Readonly<Record<… |
"warrior" | "zzz", SpecEntry>>'.
rc=2
```

Direction (c) is why `SpecId` is generated rather than hand-written: a JSON
import widens every string to `string`, so a union derived from one accepts any
string and an `extends` assertion against it passes vacuously (`AGENTS.md`
§ Types from JSON — this repo has been burned twice). The generator emits
committed `as const` code, gated by `--check` in `pnpm verify`.

A direct `as Readonly<Record<…>>` on a literal missing `warlock` does **not**
compile (TS2352 — the types do not sufficiently overlap); only the _derived_
`Partial`-shaped table laundered. The no-`as`/no-`satisfies` rule on
`spec-registry.ts` is therefore defence in depth against the derived-table and
double-cast shapes, not the mechanism itself. It is checked code-only, so it
does not fire on the prose in the file's own doc comments:

```
$ ! (sed -E 's#//.*$##' packages/core/src/spec-registry.ts \
    | grep -v -E '^\s*(\*|/\*)' | grep -q -E ' as |\bsatisfies\b')
rc=0
$ # positive control — the same pipeline on candidate-gems.ts finds its real cast
1
```

### Runtime: the same shape, and the boundary that is different

A direct index on an absent entry throws `TypeError` instead of returning ret's
numbers, which is what the brief asks for at the one place the type system
cannot reach — a stale build, a JS caller. An optional chain would return the
fallback silently, re-creating the failure the registry exists to prevent.

The genuinely untyped boundary is a separate question and is handled by an
explicit membership guard, `isSpecId(x)` over `SPEC_IDS`, not by an operator. An
id **outside** `SPEC_IDS` degrades exactly as before; an id **inside**
`SPEC_IDS` whose entry is absent throws. Two existing tests pin the degrade half
and still pass unchanged in substance: `cap-profile.test.ts` (an unlisted spec
through a cast reads ret's profile) and `cutoff.test.ts` (`"feral-tank"` reads
`CUTOFF`). A third case is pinned in `candidate-gems.test.ts`, where four tests
drive an unlisted spec through `preferredMetasFor` to prove gem fill discloses
rather than throws.

## Q4 — What is the honest before/after cost?

**Before** — 13 lines / 12 hand-written sites, reproduced at `624eb3c`:

```
$ git grep -n -E '(^\s*warlock:|"warlock")' -- packages apps scripts \
    data/presets/ep-weights-by-phase.json | grep -v -E '\.test\.ts|api_pb\.ts'
apps/web/server/exports.ts:61
data/presets/ep-weights-by-phase.json:52
packages/core/src/candidate-gems.ts:223
packages/core/src/cap-profile.ts:321
packages/core/src/cutoff.ts:104
packages/core/src/fixtures/synthetic-offline.ts:52
packages/core/src/fixtures/synthetic-offline.ts:66
packages/core/src/rank.ts:582
packages/core/src/types.ts:31
scripts/assemble_universe.py:638
scripts/assemble_universe.py:710
scripts/assemble_universe.py:1051
scripts/assemble_universe.py:1052
```

**After** — 8 lines across 5 files, which is **4 hand-written sites** plus one
generated line:

```
data/presets/ep-weights-by-phase.json:52     EP-weights entry      (site 1)
packages/core/src/spec-ids.generated.ts:28   GENERATED
packages/core/src/spec-registry.json:13      registry JSON row     (site 2)
packages/core/src/spec-registry.ts:453       registry entry        (site 3)
packages/core/src/spec-registry.ts:457         — same entry, `sitePath` value
scripts/assemble_universe.py:1028            SPEC_PROFILES entry   (site 4)
scripts/assemble_universe.py:1029              — same entry, positional arg
scripts/assemble_universe.py:1036              — same entry, `**_ep_fields()`
```

The planned projection was 6 lines. The measured figure is 8, and the two extra
lines are both **second and third matches inside an entry already counted**, not
new places to edit:

- `spec-registry.ts:457` is `sitePath: "warlock"` — warlock's site path happens
  to equal its slug, so the grep matches the value as well as the key. Nine of
  the eleven specs have a nested path (`druid/feral`, `priest/shadow`) and match
  once.
- `assemble_universe.py:1036` is `**_ep_fields("warlock")`. Folding the
  per-spec EP constants into `SPEC_PROFILES` removed the old
  `_ep_weights_map("warlock")` line but put the slug at the call site instead,
  so the fold moved that line rather than deleting it.

Counted the way the brief asks — places a human edits to add a spec — the figure
is **12 → 4**, with the fifth line generated. Fork side: 6, unchanged.

## Fidelity: how "behaviour unchanged" was established

Hand-copying expected values would have been the same person copying the same
source twice in one sitting, agreeing with itself while being wrong. Instead the
proof is mechanical and lives in one commit.

`STEP5_SHA = f79e46d35bfda9c08b1b76f2d3329baf315cb5f4` is the both-shapes-alive
commit: the registry reached its final form while every old table still existed,
and two temporary tests asserted `SPEC_REGISTRY[id].<field>` against
`<OLD_TABLE>[id]` for **every** id across **every** moved table — 23 assertions,
no expected value typed by hand.

The consumer flips that followed are each gated on the registry not moving:

```
$ git diff f79e46d35bfda9c08b1b76f2d3329baf315cb5f4 --stat -- \
    packages/core/src/spec-registry.ts
(empty)
```

So the registry proven equal to the old tables is byte-for-byte the registry
that ships. Both fidelity tests were deleted with the last table; a two-case
smoke test remains for the share-link URL template, and
`packages/core/test/spec-registry.test.ts` covers the registry's own surface.

## Consequences

- Adding a spec is four edits and one generator run. The compiler names each
  unfinished entry.
- The public API of `@tbc-gear-prio/core` gained `SPEC_REGISTRY`, `SPEC_IDS`,
  `SpecEntry`, `skeletonPresetIdFor` and `isSpecId`, and lost nothing:

  ```
  $ ! git diff 624eb3c -- packages/core/src/index.ts | grep -q -E '^-[^-]'
  rc=0
  $ git grep -n 'from "@tbc-gear-prio/core"' -- apps/web | wc -l
  18
  ```

- `SPEC_IDS` and `isSpecId` are exported so ticket 371 can replace the stale
  ret/feral allow-lists without re-deriving the list.
- The fork's six touch points are unchanged and stay a separate edit, for the
  reasons in Q1.
- Not attempted: folding `data/presets/ep-weights-by-phase.json` into the
  registry JSON. It is already a two-language value source under ticket 159, and
  merging it would buy one fewer touch at the cost of re-plumbing
  `resolveEpWeights` and `_ep_weights_map`.

## Verification

`pnpm verify` fails at `equip-eligibility:check` with rc 2 on this checkout,
before and after this work, for an environmental reason: the fork clone's HEAD
is `bbad1b8` while `data/wowsims-fork.lock.json` pins `f90b12a`. That is ticket
372 and is not fixed here — the pin was deliberately not bumped. Confirmed
pre-existing by running the gate at the base commit with all of this work
stashed, where it fails with byte-identical text.

Two further gates refuse for the identical reason and are equally pre-existing:
`fork-lint:check` and `meta-conditions:check`, both rc 2 with the same clone-vs-
pin message. All three are the fork-gate contract doing its job — they compare a
committed artifact against the pinned commit and decline to compare it against a
different one.

Every gate that does not need the fork clone was run individually at the tip and
is green: `codegen:json-types:check`, `typecheck`, `lint`, `test` (65 files,
1289 passing), `engine-port-drift:check`, `skeleton:check`,
`pool-listings:check`, `fork-universes:check`, `policy-notes:check`,
`upstream-drift:warn`, and the slug-map half of the equip-eligibility gate,
which is split out precisely so it runs without the fork.
