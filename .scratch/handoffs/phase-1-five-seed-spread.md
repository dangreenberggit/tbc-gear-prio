# Handoff — Phase 1 engine work (`phase-1/five-seed-spread`)

**Date:** 2026-07-26  
**From:** Cursor session on `tbc-gear-prio`  
**For:** another coding harness (Claude / Codex / etc.)  
**Paused:** yes — do not land to `dev` unless the user explicitly asks after review

---

## Status

partial

## Branch

`phase-1/five-seed-spread` @ `bc148e8`

- Already contains a merge of latest `dev` (parallel-phase skill, model-policy, ask-before-land).
- **Not pushed** (local only when this handoff was written). `dev` is also ahead of `origin/dev` by ~14 commits.
- Current IDE checkout may be a *different* branch (e.g. `feat/cursor-worker-composer`) — **switch to `phase-1/five-seed-spread` before continuing Phase 1.**

```bash
git checkout phase-1/five-seed-spread
pnpm install
pnpm verify
```

---

## What is done (committed on the feature branch)

Four commits on top of the `dev` merge base:

| Commit     | What |
| ---------- | ---- |
| `f61cd02`  | Five-seed spread experiment; cutoff **`{ absDps: 3.4, pct: 0.15 }`**; `scripts/five_seed_spread.py`; `docs/five-seed-spread.json`; verification-log entry |
| `1dfa8f4`  | Core scaffold: `CUTOFF`, types, `rankUpgrades` stub, three seam ports, `MemoryStore`, `RecordedGearSource`, `RecordedSimRunner`, stub `pnpm rank --offline` |
| `f62c5bc`  | Shared 19→17 slot table (`packages/core/src/slots-table.json` + `slots.ts` + `scripts/slots.py`); full slamaltman fixture assert; **ticket 02 closed** |
| `49c97a2`  | `CliSimRunner` (live `wowsimcli` spawn) + integration test |
| `bc148e8`  | Merge `dev` → feature branch (workflow docs only) |

**Phase 1 gate boxes already ☑ in PLAN.md §14:**

- 5-seed spread recorded and cutoff derived
- slot mapping asserted in a test

**`pnpm verify` was green** on the tip after CliSimRunner (~22 tests). Re-run after checkout.

### Key constants / paths

- Cutoff: `packages/core/src/cutoff.ts` → `{ absDps: 3.4, pct: 0.15 }`
- Seams: `packages/core/src/seams/{gear-source,sim-runner,store,cli-sim-runner}.ts`
- Slots: `packages/core/src/slots-table.json` (single source of truth for TS + Python)
- Fixtures: `test/fixtures/slamaltman.*` — **never use `events[0]`**; resolve actor by name
- Wowsims pin: `data/wowsims.lock.json` → `v0.0.101` / commit `8aa378b…`
- Binary: `pnpm fetch:wowsimcli` → gitignored `vendor/wowsimcli-…`
- DB inputs: `pnpm sync:wowsims` → gitignored `vendor/wowsims/db.json`
- CLI: `pnpm rank --region US --realm dreamscythe --character slamaltman --offline` → exits 1 with “not-implemented” (expected)

### Open carry-forward tickets (`Blocks: phase-1`)

On **this** branch tip, ticket **02 is closed**. Still open:

1. `01-specid-unusable.md` — `specID: 0` everywhere; classify via talent-tree plurality
2. `03-temporary-enchant-imbue.md` — map `temporaryEnchant` into consumable/imbue path
3. `04-meta-activation-check.md` — detect/repair inactive meta before trusting baseline DPS

List: `pnpm issues:open` (must be checked out on the feature branch).

---

## What was in flight when paused

### A. Spec classifier (started, NOT committed)

Intent: close ticket 01.

- Slamaltman fixture facts (verified): `specID: 0`, talents points **`[5, 11, 45]`** → Ret (paladin tree index 2).
- Files were drafted in-session then lost when the checkout moved:
  - intended: `packages/core/src/spec.ts`, `packages/core/test/spec.test.ts`
  - exports from `packages/core/src/index.ts`
  - PLAN.md / `docs/phase0-findings.md` updates
  - close ticket 01
- **Stash on this machine:** `stash@{0}` message `phase-1 wip before model-policy tweak` — contains **partial** PLAN.md + `index.ts` edits only, **not** `spec.ts` / tests. Inspect before applying:
  ```bash
  git checkout phase-1/five-seed-spread
  git stash show -p stash@{0}
  ```
- Classifier shape that was drafted: `classifySpec("Paladin", [5,11,45])` → `{ ok: true, spec: "ret", treeIndex: 2, … }`; ties → `ambiguous`; non-paladin → `unsupported-class`; `talentPointsFromWclTalents` reads `talents[].id` as points spent (R18).

### B. Parallel workers (failed — no branches)

Three `best-of-n-runner` workers were spawned with `model: gpt-5.6-terra-medium`. All died immediately:

```
API usage limit reached Switched to grok-4.5 after reaching API limit.
```

No worker branches, no worktrees, no commits. Not a prompt/path bug — Terra usage wall before first tool call.

Planned slices (still good partition if another harness can fan out):

| Slice | Branch name (suggested) | Goal |
| ----- | ----------------------- | ---- |
| Protos | `phase-1/w-protos` | PLAN §8.1 — pin `.proto` from wowsims@lock into `data/proto/`, generate protobuf-es into `packages/core/src/proto/`, `pnpm proto:generate` idempotent |
| Item/gem index | `phase-1/w-item-gem-index` | Generate committed `data/items/index.json` + `data/gems/palette.json` from `vendor/wowsims/db.json` (Python script; do not read db at runtime) |
| Spec classify | `phase-1/w-spec-classify` | Close ticket 01 as above |

`package.json` ownership: give to **protos** worker only; item-gem handoff can suggest `pnpm` aliases.

After fan-in: `pnpm verify` on feature tip → `pre-merge-review` → **ask before** `pnpm land`.

---

## Suggested next steps (priority order)

1. `git checkout phase-1/five-seed-spread` && `pnpm verify`
2. Finish **ticket 01 / `spec.ts`** (small, unblocks normalize design) — TDD against slamaltman `[5,11,45]`
3. **Item + gem index generation** from pinned `db.json` (unblocks eligibility-aware normalize / gem solver)
4. **Proto generate** (§8.1) — replace opaque `RaidSimRequest` when ready
5. Then stages behind `rankUpgrades`, tickets 03/04, pool curation, real offline ranking

Do **not** treat full wowsims git checkout as a dep — pin binary + selected files via lock (already). Protos are the missing pin.

---

## Workflow reminders (from merged `dev`)

- Skills: `parallel-phase`, `pre-merge-review`, `tdd`; model policy in `docs/agents/model-policy.md`
- Seams to test at (only these three unless agreed): `GearSource`, `SimRunner`, `Store`
- Land: review file on branch → **explicit user ask** → `pnpm land` (never raw merge to `dev`)
- On `phase-N/*`, open `Blocks: phase-N` tickets need `--ack-open-blockers` or close first
- Comments: why, never what

---

## Verification

```bash
git checkout phase-1/five-seed-spread
pnpm install
pnpm verify
pnpm issues:open
pnpm experiment:five-seed          # optional; needs vendored wowsimcli
pnpm rank --region US --realm dreamscythe --character slamaltman --offline
```

Expected: verify green; issues list 01/03/04 open (02 closed); rank exits 1 not-implemented.

---

## Notes / concerns

- Opaque `RaidSimRequest = Readonly<Record<string, unknown>>` until protos land — intentional scaffold debt.
- `SqliteStore` / live `WclGearSource` not started; CLI offline path uses Memory + Recorded adapters.
- Ticket 02 appears “open” if you run `pnpm issues:open` on `dev` or another branch that lacks `f62c5bc`.
- Local uncommitted work on `feat/cursor-worker-composer` (parallel-phase/cursor adapter + model-policy edits) is **orthogonal** — do not mix into Phase 1 without intent.
