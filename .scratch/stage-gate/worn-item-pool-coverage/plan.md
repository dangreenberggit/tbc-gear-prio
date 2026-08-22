# Plan — worn-item-pool-coverage

## Goal

When a character's worn item is absent from the candidate pool for its slot, `rankUpgrades` synthesizes a candidate entry for that worn item in its own slot, so the slot gets a normal anchor row (`owned`, delta ≈ 0), the `worn-unrankable` retraction stops being emitted for it, and its provenance says something true. After the change, regenerating the three Stage 2 shortlists yields `worn-unrankable` counts 0/0/0 against the recorded baseline of shredzepelin 3 / nexess 1 / slamaltman 0, `pnpm verify` is green, and ticket 253's open acceptance boxes are resolvable. The gate box in PLAN.md stays ☐.

## Correction the reviewer must see first — the brief's "empty slot" mechanism is wrong

The three settled facts in the brief (heroic exclusion deliberate; Ahune `sources: null` upstream; ticket 108's resolution fix holds) were **not** re-derived and stand. But the brief's causal mechanism — "the engine scores that slot against an **empty slot**, so every candidate in it shows an inflated gain" — is contradicted by both the code and the shipped numbers:

- The baseline sim is composed from the character's full worn equipment: `packages/core/src/rank.ts:652-677` builds `equipment` via `equipmentFromLoggedGear` (no filtering — `packages/core/src/logged-gear.ts` is 25 lines with no `getItem` gate) and sims `composeFor(equipment)` as the baseline. Every candidate delta is `candObs.dps - baselineDps` after swapping the candidate **over the worn item** (`rank.ts:892-899, 940`). The worn Ahune items are in that request and the sim pays their stats (ticket 108, externally verified).
- The shipped deltas are inconsistent with an empty baseline. Re-run:
  `python -c "import json;r=json.load(open('.scratch/rank-reports/stage2-close-shredzepelin.json'))['ranking'];items=r['items'];[print(s,[ (i['name'],round(i['deltaDps'],1)) for i in sorted([x for x in items if x['slot']==s],key=lambda x:-x['deltaDps'])[:3]]) for s in ('neck','back','waist')]"`
  → neck tops out at **+12.9** (Telonicus's Pendant over the worn Amulet of Bitter Hatred), back at **+7.8**. An empty-neck baseline would price a phase-2 epic at roughly +80–150 DPS. The deltas are already measured against real gear.

What is actually defective is narrower and still worth fixing: because the worn item has no `PoolEntry`, no identity row anchors the slot, `wornUnrankable` fires (`rank.ts:1195-1204`), and the emitted warning **text** (`plausibility.ts`, rendered in the shipped JSON) falsely tells the reader "every row shown for neck was scored against an empty slot … Do not read any of them as an upgrade or a loss." The SME's `do-not-trust` was fed by that false retraction plus the missing anchor rows. So the fix below still clears the gate blocker — it makes the affected slots behave identically to healthy slots and deletes the false disclosure — but the executor must also correct the warning prose and record this correction in ticket 253 with the commands above. If the reviewer believes the empty-slot mechanism after all, the decisive check is the delta-magnitude command above plus `sed -n '652,680p' packages/core/src/rank.ts`.

## Approach

**Chosen: rank-time force-include (Q1 Candidate A), in TypeScript, in `rankUpgrades`.** After the pool is phase-filtered and capped, for each equipped item id that resolves via `getItem` and has no pool entry covering its sim slot, synthesize a `PoolEntry` (`{ itemId, name, slot, phase, source: { kind: "worn" } }`) and append it to the candidate list. The existing machinery then does everything else unchanged: the identity swap in its own slot is not skipped (`wornAt === slotIndex` passes the paired-slot guard, `rank.ts:887-888`), the row comes back `owned: true` (`rank.ts:1107`), and `wornUnrankable` empties for that slot because the worn id now appears in `rankedItemIds` (`rank.ts:1194`). `ENGINE_VERSION` (currently 6, `content-hash.ts:47`) is bumped.

**Layer choice (why not Python / pool load).** Universe assembly (`scripts/assemble_universe.py`) is player-agnostic; a worn item is only knowable at rank time, after gear is read. A Python-side fix would mean either bloating every committed universe with sourceless items (re-opening exactly the scope gates the brief forbids) or making assembly per-player, and either way regenerating committed artifacts under `data/` — `data-pipeline-work` territory with its own gates, for zero benefit. Pool-*load* injection has the same information problem: the loader does not know the character. `rank.ts` is the one place where `equipment` and the pool already meet, and PLAN.md line 595 already accepts a player-dependent candidate set. No new port: this uses `getItem` and `deps.pool`, both already inside the module — the three-seam rule (PLAN.md §5) is untouched.

**Strongest rejected alternative — Q1 Candidate B, baseline-side only (score against worn without adding it to the pool).** Given the correction above, B degenerates to "fix the warning text only", because the baseline already reads worn gear. It loses because it leaves the slot with no anchor row: the dead-slot classifier (`dead-slots.ts`) still cannot join against a worn row, `wornUnrankable` still fires, the SME still sees retracted slots, and ticket 173's next silently-dropped item is still silent. A keeps the pool's meaning almost clean at the cost of one honestly-flagged non-candidate per affected slot; consumers already tolerate that shape (the `owned` pill exists for worn-in-pool items today, e.g. Wolfshead Helm's delta-0 row).

### Q2 — provenance for a worn item with no source data

**Chosen: Candidate A, a new source kind `worn`** — but as its own variant, not a synthesized origin claim. Ticket 174's complaint is items shipping `kind: "unknown"` ("origin not recorded by any input") **while their origin is recorded**; that is exactly what reusing `unknown` here would repeat for Girdle of the Deathdealer, whose heroic source *is* recorded in `data/atlasloot_sources.json` and merely scope-excluded. `{ kind: "worn" }` asserts only what is true for all four items: "in this candidate set because the character wears it; pool provenance not asserted." Rendered as "Currently equipped".

**Candidate B (allow `sources: null` on worn-only entries)** is rejected: `PoolEntry.source` is a required field of a closed discriminated union (`pool.ts:107-127`), report-side helpers fall back `item.sources ?? [item.source]` (`view.ts:99-101`, `rank-report.ts:100-101`), and `pool-hardening.test.ts` asserts pool entries never ship empty sources. Making every consumer null-safe is a wider blast radius than one new union arm, for a less informative result.

**Consumers checked, concretely** (from a full sweep, citations verified this session):

| Consumer | Effect of `kind: "worn"` |
| --- | --- |
| `pool.ts:27-89` `ItemSource` union | new arm required (typecheck-gated) |
| `item-source-kinds.json` + `item-source-kinds.generated.ts` | add `"worn"`, run `pnpm codegen:json-types`; `pnpm verify` fails while out of step. **Never hand-edit the generated file** (AGENTS.md Types-from-JSON) |
| `rank-report.ts:49-82` `formatItemSource` | exhaustive switch, **no default** — new `case "worn"` or the build breaks; that breakage is the safety net |
| `view.ts:124-135` `ZONELESS_SOURCE_LABELS` | `Record` lookup, degrades silently to raw kind text — add a `worn` label explicitly |
| `view.ts:111-133` `matchesZone`/`matchesBoss`/`zoneKeyOf` | `worn` has no zone → excluded from zone/boss filters, same as `unknown` today; acceptable, the item is on the character |
| `rank-report.ts:192-201` source filter chips | picks up `worn` as a chip value; no code change |
| `pool-hardening.test.ts` | reads universe files under `data/`, not rank output; synthesized rank-time entries never appear there — no change, and no new id joins the ticket-174 exclusion list |
| `cli.ts`, `disclosure.ts` | no `ItemSource` consumers found (grep) |
| `scripts/assemble_universe.py` | shares kind _names_ via the JSON but never emits `worn`; no Python change, no universe regen |

### Q3 — does it clear the gate blocker?

Verification question. Measured by re-running the three recorded commands (verification-log.md:1602-1604) and comparing `worn-unrankable` counts to the measured baseline 3/1/0 (command in Verify recipe). Expected: 0/0/0, with the four slots now carrying an `owned` anchor row and classifying as whatever the dead-slot classifier honestly finds (`thin-pool`/`benign-nothing-better`), not `worn-unrankable`. If any warning remains, the executor names the slot and the reason (e.g. worn id absent from `data/items/index.json`, which the residual warning path still covers).

## Claims register

| ID | Claim | Load-bearing | Verified by |
| --- | --- | --- | --- |
| C1 | The baseline sim already wears the full logged equipment; deltas are relative to worn gear, not an empty slot. | yes | `sed -n '652,680p' packages/core/src/rank.ts` (composeFor(equipment) as baseline); delta-magnitude command in the Correction section |
| C2 | The shipped `worn-unrankable` warning text asserts empty-slot scoring, which C1 refutes; the SME verdict consumed that text. | yes | `python -c "import json;print(json.load(open('.scratch/rank-reports/stage2-close-shredzepelin.json'))['ranking']['plausibilityWarnings'][0]['message'])"` |
| C3 | Recorded baseline warning counts are shredzepelin 3 (neck/back/waist), nexess 1 (wrist), slamaltman 0. | yes | measured this session: `python` loop over `.scratch/rank-reports/stage2-close-*.json` counting `cause=='worn-unrankable'` (Verify recipe) |
| C4 | `wornUnrankable` is built at `rank.ts:1195-1204` from equipped ids with no ranked row that resolve via `getItem`; classified in `dead-slots.ts:215-254`; folded into `dead-slot` warnings in `plausibility.ts` (~line 196). | yes | `grep -n wornUnrankable packages/core/src/rank.ts packages/core/src/dead-slots.ts packages/core/src/plausibility.ts` |
| C5 | A worn item's own-slot identity swap is not skipped: the paired-slot guard only skips `wornAt !== slotIndex`. | yes | `sed -n '885,890p' packages/core/src/rank.ts` |
| C6 | The candidate list is hashed (`candidates: {itemId,slot}[]`, `rank.ts:730`; `content-hash.ts:57-99`), so injection changes `contentHash` by construction; `ENGINE_VERSION=6` exists to be bumped on ranking-logic changes and does not invalidate the per-sim cache (keyed on request hash + simVersion). | yes | `grep -n 'ENGINE_VERSION\|candidates' packages/core/src/content-hash.ts packages/core/src/rank.ts` |
| C7 | `content-hash.test.ts` pins a hardcoded hash literal (~line 115); the ENGINE_VERSION bump breaks it and the test must be updated. | no | `grep -n '"' packages/core/test/content-hash.test.ts \| sed -n '1,20p'` after the bump: `pnpm -C . test content-hash` |
| C8 | `formatItemSource` (`rank-report.ts:49-82`) is an exhaustive switch with no default; a new kind without a case fails typecheck. | yes | `sed -n '49,82p' packages/core/src/rank-report.ts` |
| C9 | The kind vocabulary lives in `item-source-kinds.json`, codegen'd by `scripts/generate_json_literal_types.py`, gated by `pnpm verify` (`codegen:json-types:check`). | yes | `pnpm codegen:json-types:check` |
| C10 | `unknown` is reserved for "origin not recorded by any input" and ticket 174 exists because force-included items violated that; Girdle of the Deathdealer's heroic origin _is_ recorded, so `unknown` would repeat the mistake. | yes | `.scratch/carry-forward/issues/174-*.md`; `python -c "import json;print(json.load(open('data/atlasloot_sources.json'))['29247'])"` (key shape per ticket 253 — executor verifies exact accessor) |
| C11 | The identity-swap candidate composes a request byte-identical to the baseline request, so it costs a per-sim cache hit, not a new sim. | no | hypothesis, untested — plausible from `candidateSwapWithRepairs` returning unchanged equipment; if false, cost is 4 extra sims total, which is acceptable |
| C12 | The three shortlists were produced by the exact commands at `docs/verification-log.md:1602-1604` (`pnpm rank … --offline`, slamaltman ret p3, shredzepelin/nexess feral p2) with live sim on the pinned binary. | yes | `sed -n '1600,1606p' docs/verification-log.md`; `head -4 .scratch/rank-reports/stage2-close-nexess.stdout.txt` |
| C13 | Heroic exclusion is deliberate (`assemble_universe.py:68-76`); Ahune ids 278827/278819 have `sources: null` in `vendor/wowsims/db.json`; ticket 108's resolution fix holds. Settled by the brief; not re-derived. | yes | commands in `.scratch/carry-forward/issues/253-*.md` |
| C14 | No new architectural seam: the fix uses `deps.pool` and `getItem`, both already inside the module; `GearSource`/`SimRunner`/`Store` untouched. | yes | code review of the diff; `grep -n 'interface.*Source\|interface.*Runner\|interface.*Store' packages/core/src/seams/` unchanged |
| C15 | `sourcesOf`-style fallbacks (`view.ts:99-101`, `rank-report.ts:100-101`) mean a single-`source` synthesized entry renders without needing `sources[]`. | no | `sed -n '95,105p' packages/core/src/view.ts` |
| C16 | Injection must happen after any candidate cap so the worn anchor cannot be capped out; `candidateCap` is an optional hashed field. | no | `grep -n candidateCap packages/core/src/content-hash.ts packages/core/src/rank.ts`; hypothesis about cap ordering, untested — executor confirms where the cap applies and injects after it |

## Steps

1. **Red test at the module interface.** New test (suggested: `packages/core/test/worn-pool-coverage.test.ts`) driving `rankUpgrades` through the recorded adapters, modeled on the existing offline rank tests, with a character whose worn item for one slot is absent from `deps.pool`. Assert: (a) the ranking contains a row for the worn item in its own slot with `owned: true` and `deltaDps` ≈ 0; (b) no `plausibilityWarnings` entry with `cause: "worn-unrankable"` for that slot; (c) the row's source kind is `worn`. Run it, watch it fail for the current reason (no row, warning present). Commit the red test only if the repo's tdd convention allows; otherwise proceed in the same slice. Depends on C4, C5. **Acceptance:** `pnpm -C . test worn-pool-coverage` fails before step 3, passes after.
2. **Add the `worn` source kind.** Edit `packages/core/src/item-source-kinds.json` (append `"worn"`), run `pnpm codegen:json-types` to regenerate `item-source-kinds.generated.ts`, add the union arm in `pool.ts` with a doc comment stating its meaning ("member of the candidate set because the character wears it; pool provenance not asserted"), add `case "worn"` in `rank-report.ts` `formatItemSource` ("Currently equipped"), add the `worn` entry to `view.ts` `ZONELESS_SOURCE_LABELS`. Depends on C8, C9, C10, C15. **Acceptance:** `pnpm codegen:json-types:check && pnpm typecheck` green; `grep -n '"worn"' packages/core/src/item-source-kinds.json packages/core/src/pool.ts packages/core/src/rank-report.ts packages/core/src/view.ts` hits all four.
3. **Inject worn items in `rankUpgrades`.** In `rank.ts`, after phase filter, Kael-temp filter, EP ordering and any candidate cap (C16 — confirm cap location first): for each equipped id resolving via `getItem` with no pool entry whose `simSlotsForPoolSlot(entry.slot)` covers that item's worn sim slot, append a synthesized `PoolEntry` with `source: { kind: "worn" }` and the item's real `phase` (injected regardless of `maxPhase` — the character wears it; leave a why-comment). Bump `ENGINE_VERSION` in `content-hash.ts` with a one-line comment naming this change. Depends on C1, C4, C5, C6, C14, C16. **Acceptance:** step 1's test goes green; `pnpm -C . test rank` (existing interface tests) green.
4. **Make the residual warning truthful.** The `worn-unrankable` path still exists for a worn id `getItem` cannot resolve. Reword the message in `plausibility.ts` (and its echo in `dead-slots.ts` doc comments) to stop claiming empty-slot scoring: the true residual statement is "the worn item could not be added to the candidate set, so this slot has no anchor row." Update `plausibility.test.ts` / `plausibility-report.test.ts` / `dead-slots.test.ts` expectations; update the content-hash hardcoded literal test (C7). Depends on C2, C4, C7. **Acceptance:** `pnpm verify` green.
5. **Regenerate the three shortlists** with the exact commands from `docs/verification-log.md:1602-1604` (same flags, same output paths — slamaltman `--spec ret --max-phase 3`, shredzepelin and nexess `--spec feral --max-phase 2`, all `--offline`). This is a live re-sim on the pinned binary; `contentHash` changes by design (C6), the per-sim cache keeps most of the cost down (C11, hypothesis). Depends on C3, C11, C12. **Acceptance:** the count command in the Verify recipe prints 0 / 0 / 0; if not, the plan requires naming each remaining slot and its residual cause in the ticket, not silently accepting it.
6. **Update ticket 253.** Record: what landed, the correction from this plan's Correction section (with its two commands — this is a durable causal claim and must cite them), the new counts, and resolve the two open acceptance boxes (the second box — "an SME seat re-reads it" — is explicitly _not_ satisfied here; note it as the remaining step for the gate). Depends on C1, C2, C3. **Acceptance:** ticket text contains the re-runnable commands; `pnpm issues:open` still lists 253 only if boxes remain, per tracker convention.
7. **Commit hygiene throughout:** one commit per green slice (steps 1–3 may be one red→green slice; 4, 5, 6 separate), `git status` clean of unrelated files before each commit, `pnpm verify` before any push. No merge to `dev`.

## Paths manifest

Modified:

- `packages/core/src/rank.ts`
- `packages/core/src/pool.ts`
- `packages/core/src/item-source-kinds.json`
- `packages/core/src/item-source-kinds.generated.ts` (via `pnpm codegen:json-types` only)
- `packages/core/src/rank-report.ts`
- `packages/core/src/view.ts`
- `packages/core/src/plausibility.ts`
- `packages/core/src/dead-slots.ts` (doc-comment prose only)
- `packages/core/src/content-hash.ts` (ENGINE_VERSION bump)
- `packages/core/test/content-hash.test.ts`
- `packages/core/test/plausibility.test.ts`, `packages/core/test/plausibility-report.test.ts`, `packages/core/test/dead-slots.test.ts` (whichever assert the reworded message; executor confirms the exact set)
- `.scratch/rank-reports/stage2-close-slamaltman.{html,json,stdout.txt}`
- `.scratch/rank-reports/stage2-close-shredzepelin.{html,json,stdout.txt}`
- `.scratch/rank-reports/stage2-close-nexess.{html,json,stdout.txt}`
- `.scratch/carry-forward/issues/253-worn-gear-missing-from-pool-makes-slots-unrankable.md`

Created:

- `packages/core/test/worn-pool-coverage.test.ts` (name at executor's discretion, one new test file)

No Partition subsection: this is a single serial slice; the source-kind step and the injection step share `pool.ts`/`rank.ts` types, so fan-out would violate disjointness.

Explicitly untouched: `scripts/assemble_universe.py`, everything under `data/`, `PLAN.md`, `packages/core/src/seams/`.

## Verify recipe

```
pnpm verify
pnpm -C . test worn-pool-coverage

# regenerate (live sim on the pinned binary; ret is max-phase 3):
pnpm rank --region US --realm dreamscythe --character slamaltman   --offline --spec ret   --max-phase 3 --report .scratch/rank-reports/stage2-close-slamaltman.html
pnpm rank --region US --realm dreamscythe --character shredzepelin --offline --spec feral --max-phase 2 --report .scratch/rank-reports/stage2-close-shredzepelin.html
pnpm rank --region US --realm dreamscythe --character nexess       --offline --spec feral --max-phase 2 --report .scratch/rank-reports/stage2-close-nexess.html

# count against recorded baseline 3 / 1 / 0 (must print 0 for each file):
python -c "import json,glob;[print(f,sum(1 for w in json.load(open(f))['ranking'].get('plausibilityWarnings',[]) if w.get('cause')=='worn-unrankable')) for f in sorted(glob.glob('.scratch/rank-reports/stage2-close-*.json'))]"

# anchor rows exist and are owned, delta ~0 (shredzepelin neck/back/waist, nexess wrist):
python -c "import json;r=json.load(open('.scratch/rank-reports/stage2-close-shredzepelin.json'))['ranking'];[print(i['slot'],i['name'],i.get('owned'),round(i['deltaDps'],1)) for i in r['items'] if i['itemId'] in (278827,278819,29247)]"
```

## Out of scope

- Widening the heroic gate (`assemble_universe.py:68-76` stands; ticket 17's question).
- Inventing holiday/world-event source data; any change to `data/` or committed universes.
- Ticket 227 (parked `wontfix`); ticket 173's general detector (this fix removes one class of silent drop; 173 stays open on its own merits).
- Closing the PLAN.md §14 Stage 2 gate box or editing its line — that needs a fresh SME pass after this lands.
- `WclGearSource` / live mode / Stage 3.
- Ticket 174's own fix (the six force-included Python-side items keep their current shape; the new `worn` kind is rank-time-only and never enters a universe file).
- Merging to `dev`.
