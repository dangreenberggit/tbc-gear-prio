# W1 survey — ret catch-up for the set-bonus arc

Date: 2026-08-11. Branch `feat/set-bonus-value`. All commands below were run in
this session; re-run them to reproduce.

## 1. CURATED_SET_PHASE and the feral p3 pin recipe

**TS mirror** — `packages/core/src/rank-report-rules.ts:386-391`:
`{ preraid: 1, p1: 1, p2: 2, p3: 3 }`. Documented as a read-only mirror of the
Python source, gate-checked by `scripts/check_curated_set_phase.py` under
`pnpm verify` (comment at rank-report-rules.ts:371-384, carry-forward 102).

**Python source** — `scripts/assemble_universe.py:354`:
`CURATED_SET_PHASE: dict[str, int] = {"preraid": 1, "p1": 1, "p2": 2, "p3": 3}`.
No entry covers ret specifically — the map is label→phase, spec-agnostic.

**What feeds ret BiS tags**: `SPEC_PROFILES["ret"].gear_sets`
(assemble_universe.py:188-192) lists exactly three vendored files:
`vendor/wowsims/ret_preraid.gear.json`, `ret_p1.gear.json`, `ret_p2.gear.json`.
`wowsims_curated_sets_by_item` (line 406) unions their item ids;
`bis_set_labels_for_max_phase` (line 366) scopes the "BiS" claim to the newest
vendored stage ≤ max_phase — so a ret max-phase-3/4/5 run **degrades to p2's
list** (its docstring at lines 381-384 says ret "genuinely stops at p2 upstream
and still degrades this way").

**Feral p3 pin mechanics** (`git show --stat 02f2f85`): 8 files —
`data/wowsims.lock.json` (+10 lines: two new pins at the same tag via
`sync_wowsims.py --update --tag v0.0.101`), `scripts/sync_wowsims.py` (TRACKED
gains feral_p3_6p/9p; CRLF lockfile fix), `scripts/assemble_universe.py`
(SpecProfile gear_sets gains the two files; `p3` added to CURATED_SET_PHASE),
regenerated `data/universes/feral-p3.json` + `.report.json`,
`packages/core/src/rank-report.ts` (warning wording), and two test files.
The per-phase runbook is written down at `scripts/sync_wowsims.py:52-58`.

**Would the recipe apply to ret?** Mechanically yes, but see §3: there is
nothing upstream to pin.

## 2. Do ret universes carry BiS tags?

Yes. `data/universes/ret-p3.json` measured (python, this session):

- 394 entries; per-entry keys are `armorType, curationHint, handType, itemId,
  name, phase, quality, slot, sources` — bis/curated fields appear only on
  tagged rows.
- **15 rows with `bisTags: ["BiS"]`**, the same 15 with `bisSets: ["p2"]`.
- **32 rows with `curatedSets`** (label counts: p2×15, p1×15, preraid×12,
  overlapping rows).

Mechanism: `bisSets`/`bisTags` come from `bis_set_labels_for_max_phase` — at
max_phase 3 the newest available ret stage is p2, so the p3 universe's BiS
claims are **p2's list** (the documented degrade). `curatedSets` is full
provenance across all vendored stages. `ret-p3.report.json` carries pool
accounting only (maxPhase, perSlot, wowheadRecall, ...), no bis fields.

## 3. Does upstream ship ret p3+ presets to vendor?

**No.** Verified read-only against GitHub:

- `gh api "repos/wowsims/tbc-new/contents/ui/paladin/retribution/gear_sets?ref=v0.0.101"`
  → `p1.gear.json, p2.gear.json, preraid.gear.json` only.
- Same dir on the **default branch today** → identical three files.
- Latest release is `v0.0.113`; still no ret p3.
- Contrast feral at v0.0.101: 16 files up to `p5.gear.json`.
- (`ui/paladin/retribution` has no other preset dir: `apls, gear_sets, index.ts,
  inputs.ts, presets.ts, sim.ts`.)

How feral files were pinned: lockfile `data/wowsims.lock.json` pins
tag v0.0.101 / commit 8aa378b…, entries added by hand-editing `TRACKED` in
`scripts/sync_wowsims.py:80` then `--update --tag v0.0.101` (runbook at
sync_wowsims.py:52-58; `git log --follow` on feral_p3 files is moot — vendor/ is
gitignored, only the lockfile is tracked, and commit 02f2f85 shows the lockfile
gaining the two pins).

**Cost estimate**: the *mechanical* pin+regen recipe is cheap (~an hour, proven
by 02f2f85), but it is **not available for ret** — there is no upstream file to
pin at the locked tag, at the latest release, or on today's default branch.
Getting a ret P3 curated list means either upstream shipping one someday or a
hand-curated local source with its own tag vocabulary (a design decision, not a
pin). That is the expensive path.

## 4. Slamaltman fixture provenance / staleness

`test/fixtures/slamaltman.raw.json`, bound at `packages/core/src/cli.ts:322-361`
via `SLAMALTMAN_REF` (US/dreamscythe/slamaltman, `fixtures/slamaltman-offline.ts`).

- **Capture**: report `VGjFb3mtX9xHgyav`, fight 8 **Hydross the Unstable
  (kill)** in SSC. Committed in `57253c8` (2026-07-26, "Commit Phase 0
  planning…") and never touched since (`git log --oneline --follow` shows that
  single commit). ~2 weeks old today.
- **Worn gear** (25 combatant events in the fixture; slamaltman is sourceID 11,
  Paladin): 32461 Furious Gizmatic Goggles (p2), 30022, 30055,
  **30129 Crystalforge Breastplate (p2 — the only worn tier piece, 1/5)**,
  28779, 30257, 30081, 28795, 29947, 28757, 30834 Shapeshifter's Signet, 28830
  DST, 29383, 28672, 28430 Lionheart Executioner (p2), 27484 Libram of
  Avengement. All phase 1-2 in the pinned db.
- **Out-of-range check** (ticket 108/110's probe, ids > 100000): **none**. The
  only unresolved ids are shirt 3342, tabard 28788, and an empty offhand (0) —
  slots the 19→17 mapping drops. Note tickets 108 and 110 both ended
  **withdrawn/closed** for shredzepelin (the >100000 ids were legitimate TBC
  Ahune re-releases; the fixture matched the owner's real gear), so their range
  probe is a hygiene check, not a live defect pattern.
- **Blockers for `--max-phase 3`**: none found. `data/universes/ret-p3.json`
  exists, the fixture's gear all resolves in the pinned db,
  `parseArgs` accepts `--max-phase 3` (cli.ts:177), and
  `vendor/wowsimcli-v0.0.101-win32-x64` is present. The lock's
  `defaultMaxPhase` is 2, so the flag must be passed explicitly.
- **Staleness caveat**: unlike shredzepelin there is no owner settings export
  to verify against, so "snapshot of 2026-07-26 = current gear" is
  **unverified**, not confirmed. The gear reads as an early-P2 set (1/5
  Crystalforge, several P1 pieces).

## 5. Ret-p3 candidates with meta sockets (for ticket 117's record)

Join of `data/universes/ret-p3.json` entries against `vendor/wowsims/db.json`
`gemSockets` (socket color 1 = `GemColorMeta`, `packages/core/src/proto/common_pb.ts:2727`).
**13 candidates, all head slot**:

| itemId | name | phase |
|---|---|---|
| 32235 | Cursed Vision of Sargeras | 3 |
| 32373 | Helm of the Illidari Shatterer | 3 |
| 32376 | Forest Prowler's Helm | 3 |
| 30989 | Lightbringer War-Helm | 3 |
| 32241 | Helm of Soothing Currents | 3 |
| 32354 | Crown of Empowered Fate | 3 |
| 32240 | Guise of the Tidal Lurker | 3 |
| 32521 | Faceplate of the Impenetrable | 3 |
| 32461 | Furious Gizmatic Goggles | 2 (worn baseline head) |
| 30131 | Crystalforge War-Helm | 2 |
| 32041 | Merciless Gladiator's Scaled Helm | 2 |
| 32087 | Mask of the Deceiver | 1 |
| 29073 | Justicar Crown | 1 |

Ticket 117 (open): `repairMeta` re-gems coloured sockets from the uncapped
palette on any candidate with a meta socket — every one of these 13 rows is in
that defect's blast radius on a ret run, including the T6 Lightbringer War-Helm
(so, unlike feral T6, the **ret tier package itself** contains a meta-socket
piece — 117's "no T6 piece has a meta socket" escape does not hold for ret).

## 6. Other ret-vs-feral gaps in the set-bonus arc

- **Engine is not feral-gated.** `rank.ts`, `set-value.ts`, `dead-slots.ts`,
  view/report layers contain no spec branches (only cli.ts:285/323/344 pick
  presets and fixtures per spec; rank.ts:377 maps feral's skeleton preset id).
  `--with-set-potential` is a pure ViewOptions flag (cli.ts:144-147, consumed at
  448-454 and 483-486) — works end to end for ret.
- **IMPLEMENTED_IN_SIM covers ret**: 626 Justicar, 629 Crystalforge, 680
  Lightbringer (`set-value.ts:29-39`), alongside the three feral sets.
- **Tests**: the arc's engine tests are substantially **ret-flavoured already**:
  `set-value.test.ts` builds on Justicar/Crystalforge (626/629) plus
  Malorne/Thunderheart cases; `rank.test.ts`'s set-bonus integration suite
  (~line 2340+) uses `spec: "ret"`, `slamaltmanLoggedGear()` and a synthetic
  Justicar 4pc; `set-bonus.test.ts` uses Crystalforge; `cli-shortlist.test.ts`
  uses `presetId: "ret/p2.raid-sim-skeleton"`. Feral-only test flavour:
  `dead-slots.test.ts` (Thunderheart names throughout; no ret case) and the
  measurement artifacts under `.scratch/set-bonus-value/` (all shredzepelin).
  **No ret set-bonus artifact/measurement exists** — the plausibility numbers
  (tickets 97-99) were all taken on feral.
- **Presets**: ret has `data/presets/ret/p2.ep-weights.json`,
  `p2.raid-sim-skeleton.json`, `p2.individual-sim-settings.json`; no p3
  EP preset (cli.ts:284-288 hardcodes ret→p2 weights — same degrade pattern as
  feral→p1). APL: `vendor/wowsims/ret_default.apl.json` is pinned.
- **Curated/BiS**: the one real data gap — ret has no curated list past p2
  (§3), so a P3 rank tags 15 BiS rows from p2's list and `--pin-bis` prints
  "no curated BiS data at maxPhase=3" (cli.ts:455-460 keys off
  `view.pinBisAvailable`; note the code comment there, "ret's curated sets stop
  at P2", is accurate).

## 7. Exact offline ret P3 invocation

From `parseArgs`/`usage` (cli.ts:77-226):

```
pnpm rank --offline --region US --realm dreamscythe --character slamaltman \
  --spec ret --max-phase 3 --with-set-potential --report
```

- `--offline` mandatory (live WCL path refuses at cli.ts:262-267).
- region/realm/character must match `SLAMALTMAN_REF` exactly
  (US / dreamscythe, case-insensitive realm+name, cli.ts:322-326) or the gear
  map is empty.
- `--spec ret` is the default (cli.ts:114) so it may be omitted; shown for
  clarity. Note `--spec` is accepted by parseArgs but **missing from the usage
  string** (cli.ts:79).
- `--max-phase 3` required (lock default is 2).
- `--with-set-potential` turns on the set panel + per-row potential lines.
- `--report` with no path writes
  `.scratch/rank-reports/slamaltman@dreamscythe-US-<stamp>.html`; pass a path
  to choose. The JSON export is automatic: same path with `.json`
  (cli.ts:542-547) carrying `{meta, ranking}`.
- Optional: `--show-below-cutoff`, `--assumptions`, `--pin-bis` (will print the
  no-P3-curated-data note), `--group-by`, `--raid`, `--boss`, `--hide-owned`.

**Pool size**: ret-p3 universe holds **394 entries** (header prints
`universe=394`), vs feral-p3's 407 — expect a comparable sim runtime to the
feral P3 runs, plus package sims for the measurable ret thresholds.

## Missing pieces (cheap → expensive)

1. **Run the P3 ret rank artifact** — everything needed is on disk (universe,
   fixture, binary, presets); one command from §7. Cheap.
2. **Ret meta-socket record for ticket 117** — table in §5, done; folding it
   into the ticket is an edit. Cheap.
3. **Fixture staleness disclosure** — slamaltman snapshot is 2026-07-26 with no
   owner export to verify against; asking the owner for a current settings
   export (as was done for shredzepelin) is the cheap verification. Cheap-ish.
4. **Ret dead-slots / set-bonus measurement pass** — plausibility bands
   (tickets 97-99) exist only for feral; a ret equivalent needs sim runs.
   Moderate.
5. **Ret dead-slots test flavour** — dead-slots.test.ts has no ret case;
   mechanical once an artifact exists. Moderate.
6. **Ret P3 curated BiS list** — does not exist upstream (v0.0.101, v0.0.113,
   and today's default branch all stop at p2; verified via gh api). The feral
   pin recipe cannot apply; needs upstream to ship one or a hand-curated local
   source with owner sign-off. Expensive.
