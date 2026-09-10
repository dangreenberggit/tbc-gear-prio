# 353 — Re-baseline committed sim numbers and recorded fixtures against engine `ec5c5f2`

Status: open
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

### 4. The domain question, unanswered

The prior pin review recorded a **−18 DPS feral rotation regression** and a
15 → 27 jump in above-cutoff rows, with no domain look. Upstream has since
rewritten the feral APL (104 lines). `build_feral_skeleton.py:64-66` takes the
rotation from the owner's own export rather than the vendored APL, so that
rewrite does **not** enter this repo's skeleton — but whether the feral numbers
this repo now produces are correct is an SME question that nobody has answered.

## Acceptance

- [ ] Re-record the feral recordings against `ec5c5f2`, or decide deliberately
      not to and say why in this ticket.
- [ ] Regenerate or correct the `apiVersion` 13 preset fixture (distinct fix
      from the recordings).
- [ ] `pnpm verify` green on the test gate, with each previously-failing test
      named and accounted for.
- [ ] SME verdict on the feral rotation change and the above-cutoff row count
      (`sme-rank-review`), audience the engineering team.
- [ ] Confirm `docs/verification-log.md` quotes no stale engine figure.
