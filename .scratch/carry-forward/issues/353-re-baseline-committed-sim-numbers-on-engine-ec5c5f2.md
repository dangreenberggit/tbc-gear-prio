# 353 — Re-baseline committed sim numbers and recorded fixtures against engine `ec5c5f2`

Status: closed
Opened: 2026-09-10
Blocks: none
Blocked by: none
Relates to: ADR-0030, tickets 251, 337, 354, 355; branch `feat/wowsims-reforge-catchup`

## What happened

The engine pin moved from `v0.0.119` (`3267f8d`) to
`feature/backend-reforge` `ec5c5f205e61049d730e460967f8488774a7fe2a`, and the
default content tier moved 2 → 3 with it (ADR-0030). Those 153 upstream commits
include real sim changes — rogue, enchant `BasePoints`/`DieSides`, incapacitate,
Vampiric Touch, bear rage — plus a 104-line feral APL rewrite.

Deferring the re-baseline is deliberate: re-recording fixtures in the same
commit that moves the engine would put the change and its own detector in one
diff. The stale recordings are more informative kept, because they stand as a
comparison against the old engine. **What must not be deferred is the
inventory**, which is what this ticket carries.

## Blast radius — what is now suspect, enumerated

### 1. Recorded sim fixtures (11 failing tests today)

`packages/core/test/fixtures/synthetic-roster-recordings.json` (240,820 bytes)
holds recorded sim responses keyed by a sha256 of the `RaidSimRequest`.

Eight of the failures are **request-hash misses**, not wrong numbers:
`data/presets/feral/buff-defaults.json`'s `exposeWeaknessHunterAgility` moved
1080 → 1210 when the pin moved, which changes the request built for every feral
candidate, so its hash matches no recorded key. All feral; ret is untouched.

| File | Count | Symptom |
| --- | --- | --- |
| `packages/core/test/full-sweep-recall.test.ts` | 8 | `no recording for sim key ...` |
| `packages/core/test/synthetic-fixtures.test.ts` | 2 | same recall path, synthetic replay |
| `packages/core/test/individual-settings.test.ts` | 1 | `CURRENT_API_VERSION` 15 vs fixture `apiVersion` 13 |

The 11th is a **separate, differently-caused** staleness: `common.proto`'s
`CURRENT_API_VERSION` reached 15, while a hand-authored, never-regenerated
preset fixture still declares 13. It is not a recording miss and will not be
fixed by re-recording.

### 2. Committed numbers derived from a sim run

- `data/presets/*/*.ep-weights.json` (20 files). These are EP weights read from
  fork symbols and gated by `check_ep_presets.py`, so they match the fork —
  but the fork's own weights were computed on an older engine. The gate proves
  agreement with the fork, **not** that the weights are still right.
- `data/presets/feral/buff-defaults.json` and
  `data/presets/feral/p2.raid-sim-skeleton.json` — moved with the pin already;
  the question is whether the resulting feral numbers are right, not whether
  the extraction is.

### 3. Not suspect — checked, so nobody re-checks

- `data/pool-listings/{ret,feral}-p3.md` carry **membership**, not DPS. No
  numbers to re-baseline.
- `data/universes/*` carry membership and provenance only; verified byte-empty
  diff across the whole pin move.
- `docs/verification-log.md` — confirm no phase-gate figure quotes a DPS number
  produced by the old engine before closing this ticket.

### 4. The domain question — answered 2026-09-10

**Correction.** This section previously revived a "−18 DPS feral rotation
regression" as an open question. That figure was superseded **and reversed in
sign** on 2026-08-21: ticket 250 is closed, and `docs/verification-log.md:1654-1669`
records a three-arm, 20k-iteration experiment measuring the rotation main
effect at **+42.91 DPS in favour of the new rotation**, against a pre-registered
bound of 1.38. Arm 2 reproduces the old 740.67 to the cent, identifying 722.55
as the stale half. Propagating −18 again was its third appearance; it is wrong
and is struck here so it stops resurfacing.

The "15 → 27 above-cutoff rows" pair is likewise **two uncontrolled
measurements**, not a regression — the cutoff is measured against each
character's own baseline. This re-record does not reproduce it: feral-p3 sits
at 43 above cutoff both before and after.

Upstream rewrote the feral APL (104 lines), but `build_feral_skeleton.py:64-66`
takes the rotation from the owner's own export rather than the vendored APL, so
that rewrite provably does not enter this repo's skeleton (the committed
skeleton still measures prepull 1 / priority 22).

**SME verdict: `trust-with-caveats`, nothing blocking** —
`.scratch/handoffs/wowsims-reforge-catchup/SME-353-feral-verdict.md` (seat
`gate-sme`, 2026-09-10). Feral's whole +7.53 DPS move is request-driven, not
engine drift: `exposeWeaknessHunterAgility` 1080 → 1210 is exactly Phase1 →
Phase3 in upstream's own map (`vendor/wowsims/proto_utils.ts:1280-1283`), a buff
*increase*. Ret is the control — all 267 of its old request bodies survive and
return bit-identical DPS on the new binary, while feral shares zero bodies.
`aboveCutoffItemIds` is unchanged on all three rows.

Two caveats the SME raised, carried forward as ticket 358 rather than fixed
here: the scope note in `data/presets/feral/p1.ep-weights.json` claiming "EP
only chooses gems here" is false (`candidate-order.ts:36-67` plus `rank.ts:1100`
mean stale EP weights decide what is never simmed on a capped run — both
defaults are safe), and `scripts/build_feral_skeleton.py:19` still documents the
rotation as coming from the vendored APL, contradicting line 64.

## Acceptance

- [x] Re-record the feral recordings against `ec5c5f2`, or decide deliberately
      not to and say why in this ticket. — **re-recorded**, `fda1126`
- [x] Regenerate or correct the `apiVersion` 13 preset fixture (distinct fix
      from the recordings). — **corrected the assertion**, `c135b0b`
- [x] `pnpm verify` green on the test gate, with each previously-failing test
      named and accounted for. — all 11 named below
- [x] SME verdict on the feral rotation change and the above-cutoff row count
      — **`trust-with-caveats`, nothing blocking**, see §4 and
      `.scratch/handoffs/wowsims-reforge-catchup/SME-353-feral-verdict.md`
      (`sme-rank-review`), audience the engineering team. — **still open**,
      deliberately left for a review-lane seat
- [x] Confirm `docs/verification-log.md` quotes no stale engine figure. — read,
      no edit needed

## What was done (2026-09-10)

### Re-recorded, not deferred

`npx tsx scripts/record_synthetic_fixtures.mjs` over all three rows (~984 sims,
3000 iterations, seed 42, ~10 min). Recording every row starts a fresh header
rather than merging, which is the path that script reserves for an engine pin
move (ticket 244). `git diff --numstat` moved exactly one tracked path,
`packages/core/test/fixtures/synthetic-roster-recordings.json`, as predicted
before the run; nothing under `data/`.

Deferring further was the wrong call once the pin had landed in `bec0014`: the
ticket's reason for deferring — not putting the engine change and its own
detector in one diff — is satisfied by this being a separate commit, and 1210 is
now the *correct* value, being what upstream's `defaultExposeWeaknessSettings()`
yields at `CURRENT_PHASE` 3. The old recordings answered a question nobody will
ask again.

| row | poolSize | aboveCutoff | baselineDps |
| --- | --- | --- | --- |
| ret | 240 -> 288 | 38 -> 38 | 1834.33 -> 1834.33 |
| feral | 228 -> 227 | 20 -> 20 | 2145.59 -> 2153.12 |
| feral-p3 | 366 -> 364 | 43 -> 43 | 2145.59 -> 2153.12 |

`aboveCutoffItemIds` is unchanged on all three rows — the exact item sets, not
merely the counts. **The new engine moved no shortlist membership.**

The ret row isolates engine drift from request drift, which sharpens §4's
question: all 267 of ret's old request bodies survive into the new file and all
267 return bit-identical DPS under the new binary. Feral shares **zero** bodies
with the old file, so its +7.53 DPS is attributable to the changed Expose
Weakness agility in the request, not to engine drift.

Two corrections to this ticket's own §1. The value does not reach the request
from `buff-defaults.json` at runtime — `packages/core` never reads that file; it
flows through the committed, regenerated `p2.raid-sim-skeleton.json`. And the
committed `poolSize` values were stale *before* this branch: `data/universes/*`
already held 288/227/364 and did not move here.

### The `apiVersion` fixture — the ticket's premise was wrong

§1 calls `data/presets/ret/p2.individual-sim-settings.json` "hand-authored,
never-regenerated" and offers "regenerate or correct". It is neither
hand-authored nor regenerable:

- It is a **capture** — `wowsimcli decodelink` on a Phase-0 ret P2 share link.
- Re-decoding that same link with the newly pinned `ec5c5f2` binary reproduces
  the committed file byte-identically and still reports `apiVersion: 13`.
  `decodelink` is a plain protobuf unmarshal that runs no migrations, so the
  stamp is a fact about the browser session that exported the link. **No
  regeneration moves it to 15.**

`apiVersion` was load-bearing to exactly one assertion. `share-link.test.ts`
round-trips the preset against itself; `compose.test.ts` and
`check_raid_sim_skeleton.py` read only raidBuffs/debuffs/partyBuffs/encounter;
no `src/` code loads the fixture. So `expect(CURRENT_API_VERSION).toBe(
preset.apiVersion)` coupled a historical capture to a live constant and would
break on every future pin bump while proving nothing. Replaced with the
relationship that must hold: the capture carries a real, non-default version and
does not claim to exceed the engine's. The invariant the equality was reaching
for — that an export of *ours* stamps the current version — was already covered
by the neighbouring test.

Importing the 13-stamped capture is content-stable regardless:
`individual_sim_ui.tsx`'s `conversionMap` holds one key, 7, so migrating 13 -> 15
runs zero conversion functions.

### The 11 previously-failing tests

| File | Test | Disposition |
| --- | --- | --- |
| `full-sweep-recall.test.ts` | feral: sims every eligible candidate, and at no other iteration count | green, re-recorded |
| `full-sweep-recall.test.ts` | feral: leaves no row unsimmed | green, re-recorded |
| `full-sweep-recall.test.ts` | feral: reproduces the recorded above-cutoff set | green, re-recorded |
| `full-sweep-recall.test.ts` | feral: ranks every above-cutoff row | green, re-recorded |
| `full-sweep-recall.test.ts` | feral-p3: same four | green, re-recorded |
| `synthetic-fixtures.test.ts` | feral: replays the recorded full-sweep ranking | green, re-recorded |
| `synthetic-fixtures.test.ts` | feral-p3: replays the recorded full-sweep ranking | green, re-recorded |
| `individual-settings.test.ts` | matches the apiVersion the committed preset carries | **assertion replaced**, see above |

Measured: 25 passed across the three files, exit 0 read outside the pipe.

### `docs/verification-log.md` — read, no edit

No stale engine figure in a load-bearing position. Every DPS number sits inside
a dated entry or is explicitly scoped to its binary, and no PLAN.md §14 phase
gate names a DPS threshold. The "ret baseline is unreconciled" passage (ticket
274) disarms itself with a sentence saying its numbers are internal comparisons,
not values to check against the fixture; "C11 superseded" is a retraction, where
the stale 2145.6 appears only as the thing withdrawn. Flagged, not edited:
`PLAN.md:826` still carries `v0.0.101` / `2042.85 DPS` in the Stage 0 gate table
— correctly pinned to its binary, so not stale by this ticket's definition.

### Why the SME box stays open

These tests replay against whatever is recorded and compare to the recorded row,
so a fresh recording makes them green **by construction**. Passing tests are not
evidence the new feral numbers are right. §4's question is untouched by this
work and still needs a review-lane seat.

What the re-record hands that seat, which it did not have before: the feral move
is +7.53 DPS on both rows, it comes from the request rather than the engine (ret
proves the engine is bit-identical on unchanged requests), and no above-cutoff
item set moved on any row. So the "15 -> 27 above-cutoff rows" jump §4 mentions
is **not** reproduced here — feral-p3 sits at 43 both before and after.
