# Plan — pool listing and its gate (nested Step 4 of phase-item-pool)

> Nested planner's output, saved verbatim. One design decision the planner
> stated before the plan: the committed listings must be byte-identical
> whether or not the fork clone exists (CI regenerates and byte-compares, and
> CI has no clone), so the generator reads only the pinned
> `vendor/wowsims/db.json` — which the lockfile pins *to* the fork's
> `assets/database/db.json` — and never the clone.

## Goal

`scripts/list_phase_pool.py` deterministically regenerates two committed Markdown listings, `data/pool-listings/ret-p3.md` and `data/pool-listings/feral-p3.md`, that explain phase-3 candidate-pool membership item by item against the wowsims fork's item database. A new `pnpm pool-listings:check` script regenerates both and byte-compares them against the committed files, appended to the `verify` chain. Acceptance is property-based throughout; the listings establish every count.

## Approach

**One model of eligibility.** The generator imports `SPEC_PROFILES`, `eligible_d7`, and `stub_only_effect_ids` from `scripts/assemble_universe.py` via the same `sys.path.insert(0, str(ROOT / "scripts"))` mechanism `scripts/check_rep_tables.py` uses (its lines 39–46). No eligibility rule is re-implemented.

**Which DB is "the fork's DB".** The generator reads `vendor/wowsims/db.json` only. Rationale, stated in each listing's header: `data/wowsims.lock.json` pins that file byte-for-byte to the fork's `assets/database/db.json` at the pinned fork commit (`files["db.json"].path == "assets/database/db.json"`), CI restores it via `pnpm sync:wowsims:restore` before `pnpm verify`, and the gitignored clone at `vendor/tbc-new-fork` exists in no other environment. Reading the clone would make the committed bytes depend on clone presence and tip, breaking the byte-compare gate between this machine and CI. The clone's current tip differs from the pin (3,087,592 vs 3,089,210 bytes); parent-plan C11 measured that the two agree on item membership (8257 = 8257) and disagree on phase for exactly three items (35317/35319/35320, none phase-3 on the pinned side). The listing's source inventory records: the lockfile's `sha256` for db.json, the fork commit from `data/wowsims-fork.lock.json`, and the universe file paths — all committed inputs, so the inventory is reproducible in CI. The clone-absent question from the brief is thereby answered: the generator never needs the clone, so nothing skips and nothing fails on its absence.

**Membership sets.** For each spec:
- **U** (local): the `entries` of `data/universes/<spec>-p3.json` (fields `itemId, name, slot, phase, quality, sources[{kind, zone, boss, origin}]`, per parent C4).
- **W** (wowsims-primary): items of the pinned db.json with `phase <= 3`, `quality == 4` exactly, and `eligible_d7(item, SPEC_PROFILES[spec])` True. `quality == 4` is applied on top of `eligible_d7` (whose own floor is `quality >= MIN_QUALITY`) so that Legendary (`quality == 5`) is excluded; the header states the parent plan's legendary rationale verbatim (Warglaives 32837/32838 are 1H sword/dagger — ret excludes 1H, feral cannot use swords/daggers; the engine additionally strips Kael temp legendaries, and `eligible_d7` already screens `KAEL_TEMP_LEGENDARY_IDS`) and the Rare-and-below audit exclusion (measured Rare phase-3 gap is zero for both specs, parent C12).

**Precedence rule (Q1, verbatim in the header):** membership and source metadata — local universe; phase — wowsims DB, audited with a loud failure on any disagreement; zone vocabulary — wowsims `zones[].name`; completeness — the wowsims DB is the reference the universe is audited against.

**Classification of the symmetric difference.**
- *Wowsims-only items (W \ U)* land in exactly one category via this deterministic precedence order, stated in the listing: **d** class allowlist (item's `classAllowlist` excludes the profile's `class_id`) → **a** per-spec weapon/hand exclusion (`excluded_weapon_types`, `allow_one_hand`/off-hand rule, armor type vs `profile.armor_types`) → **b** `eligible_d7` False for any remaining reason (slot mapping, stat screen — the residual after d and a, which are its own component checks pulled forward because they are the informative reasons) → **c** stub-only effect id (`stub_only_effect_ids()` membership) → **e** has at least one entry in the db.json item's `sources[]` but is absent from the universe (excluded by a local assembler rule — the C16b bucket) → **f** `sources` empty or missing (no recognized source route — the C16a bucket) → **g** unexplained (reachable only if the code above is wrong; the property checks force it to be visible, never silently absorbed). d and a are re-derived from the *imported* `SpecProfile` fields and the same field reads `eligible_d7` makes — they decompose the imported rule for reporting; category b is assigned by calling the imported `eligible_d7` itself, so the decomposition can never contradict the one model (a d/a-classified item is asserted to also fail `eligible_d7`; violation is a loud failure).
- *Universe-only items (U \ W)*: each classified into exactly one mechanical bucket derived from its own committed metadata, in precedence order: below-Epic quality (`quality != 4`); id absent from the fork DB (also surfaced in the cross-check section); phase in db.json > 3 (would be a phase disagreement — audited to zero); otherwise by primary `origin` (`curated`/`wowhead`/`sunmote`/`atlasloot` force-include routes); anything left is "unexplained". This satisfies the parent acceptance line "every symmetric-difference item carries exactly one category … or appears under unexplained" on both sides of the difference.

**Cross-check sections per listing:** phase disagreements (every U entry's `phase` vs the db.json item's `phase`; the table lists any offender; the count line the gate asserts on); U itemIds absent from db.json `items`; the classified W\U and U\W tables; the "unexplained" section (union of both sides' g-items); and the "phase-3 raid drops lacking a reason" count — wowsims-only items whose db.json `sources[]` contain a raid-zone drop (zone id in the nine raid ids of parent C13, resolved through `zones[].name`) and whose category is g.

**Determinism:** rows sorted by itemId; sections in fixed order; no timestamps, no environment strings; pins read from committed lockfiles only. `--check` regenerates to an in-memory string (or scratch temp) and byte-compares against the committed files, exiting 1 with a per-file diff summary on mismatch. When `vendor/wowsims/db.json` is absent, the script **fails loudly** (exit 1) with a message naming `pnpm sync:wowsims:restore` — explicitly *not* copying `check_rep_tables.py`'s soft-skip, per the brief's correction of the parent plan's precedent claim.

## Claims register

| ID | Claim | Load-bearing | Verified by |
| --- | --- | --- | --- |
| N1 | `scripts/check_rep_tables.py:39-46` imports from `assemble_universe` via `sys.path.insert(0, str(ROOT / "scripts"))` — the import precedent to copy | yes | `sed -n '39,46p' scripts/check_rep_tables.py` |
| N2 | `assemble_universe.py` exposes `SPEC_PROFILES: dict[str, SpecProfile]` (line 255, keys `"ret"`, `"feral"`), `eligible_d7(it, profile) -> bool` (line 596), `stub_only_effect_ids() -> dict[int, str]` (line 474, reads `data/sim-implemented-effects.json` key `stubOnlyItemIds`, returns `{}` if the file is missing) | yes | `grep -n 'SPEC_PROFILES\|def eligible_d7\|def stub_only_effect_ids' scripts/assemble_universe.py` |
| N3 | `SpecProfile` carries `class_id`, `armor_types`, `allow_one_hand`, `excluded_weapon_types`, `tier_piece_ids` — enough to decompose categories a and d without re-implementing rules | yes | `sed -n '199,260p' scripts/assemble_universe.py` |
| N4 | `eligible_d7` screens `KAEL_TEMP_LEGENDARY_IDS`, `classAllowlist` vs `profile.class_id`, slot mapping, `quality >= MIN_QUALITY`, armor type, weapon hand/excluded types — so W needs an explicit extra `quality == 4` filter to exclude Legendary | yes | `sed -n '596,640p' scripts/assemble_universe.py; grep -n 'MIN_QUALITY' scripts/assemble_universe.py` |
| N5 | `vendor/wowsims/db.json` exists locally (3,089,210 bytes), is pinned by `data/wowsims.lock.json` (`files["db.json"]`: `path: "assets/database/db.json"`, sha256, bytes 3089210), restored by `pnpm sync:wowsims:restore` (package.json line 22); CI restores it before `pnpm verify` (parent C7) | yes | `python -c "import json;l=json.load(open('data/wowsims.lock.json'))['files']['db.json'];import os;print(l['bytes'], os.path.getsize('vendor/wowsims/db.json'))"` |
| N6 | The fork clone's `assets/database/db.json` (3,087,592 bytes) differs in bytes from the pin but agrees on item membership; phase differs on exactly 3 items (35317/35319/35320), none phase-3 on the pinned side — so auditing against the pinned copy loses nothing at p3 | yes | Parent C11's reviewer runs; re-runnable: `python -c "import json;a=json.load(open('vendor/wowsims/db.json'))['items'];b=json.load(open('vendor/tbc-new-fork/assets/database/db.json'))['items'];A={i['id']:i.get('phase') for i in a};B={i['id']:i.get('phase') for i in b};print(set(A)^set(B), [k for k in A if A[k]!=B.get(k,A[k])])"` |
| N7 | The committed listings must be byte-identical with and without the fork clone (CI has no clone and byte-compares), so the generator reads only committed/pinned inputs and never `vendor/tbc-new-fork` | yes | Design decision, forced by parent C7 + the byte-compare gate; verified by Step 3's acceptance (`pnpm pool-listings:check` exits 0 in a tree where the clone is ignored by the script — `grep -c 'tbc-new-fork' scripts/list_phase_pool.py` → 0) |
| N8 | Universe artifacts carry everything the U-side needs: `entries[].{itemId,name,slot,phase,quality,sources[{kind,zone,boss,origin}]}`; origins emitted by the assembler are `db, atlasloot, sunmote, wowhead, curated` | yes | `python -c "import json;u=json.load(open('data/universes/ret-p3.json'));e=u['entries'][0];print(sorted(e), sorted({s['origin'] for x in u['entries'] for s in x['sources']}))"` |
| N9 | db.json items carry `id, name, phase, quality, type, weaponType/handType/armorType, classAllowlist?, sources[]` (kind-tagged dicts); `zones[]` maps zone id → canonical name; the nine raid zone ids are 3457, 3923, 3836, 3845, 3607, 3606, 3959, 3805, 4075 (parent C13) | yes | `python -c "import json;db=json.load(open('vendor/wowsims/db.json'));z={x['id']:x['name'] for x in db['zones']};print([z[i] for i in (3457,3923,3836,3845,3607,3606,3959,3805,4075)])"` |
| N10 | The `verify` chain in package.json is a `&&`-chain of `pnpm run <x>:check` steps run with plain `python`; appending `pool-listings:check` follows the existing pattern (e.g. `"rep-tables:check": "python scripts/check_rep_tables.py"`) | yes | `grep -n '"verify"\|rep-tables:check' package.json` |
| N11 | `check_rep_tables.py` soft-skips a missing db.json (`db_rep_usage` returns empty at lines 70–72) and names `pnpm sync:wowsims:check`, not the restore command — the brief overrides this precedent; the new script must exit 1 naming `pnpm sync:wowsims:restore` | yes | `sed -n '70,72p' scripts/check_rep_tables.py`; brief lines 90–94 |
| N12 | Every wowsims-only phase-3 raid drop is explainable by categories a–f, so the "raid drops lacking a reason" count is 0 | yes | hypothesis, untested until Step 2 runs — this is the required property from parent C17, not a prediction; if the run finds a counterexample the executor stops and reports (the item is listed under "unexplained", never added to the pool) |
| N13 | Phase disagreement count between each universe and the pinned db.json is 0 | yes | Parent C11 measured zero; re-established as a property by every `pnpm pool-listings:check` run |
| N14 | A d/a-classified item always also fails the imported `eligible_d7` (the decomposition cannot contradict the one model) | yes | Enforced by an assertion in the script (loud failure); property, not prediction |

## Steps

**Step 1 — write `scripts/list_phase_pool.py`.**
Structure: import block per N1/N2; `build_membership(spec)` → (U from the universe file, W from pinned db.json with `phase <= 3 and quality == 4 and eligible_d7(...)`); `classify_wowsims_only(item, profile, stubs)` implementing the d→a→b→c→e→f→g precedence with the N14 assertion; `classify_universe_only(entry, db_items)` per the Approach; `render(spec)` → the full Markdown (header: pins + precedence rule + membership rules including the legendary and Rare-audit exclusions + category precedence order, all in the listing's own words; then the seven sections from the brief, membership table with per-item source `kind/zone/boss` and `origin`); `--check` mode regenerating and byte-comparing both committed files; missing-db.json guard exiting 1 with a message containing `pnpm sync:wowsims:restore`. No timestamps or environment-dependent strings anywhere in the rendered output. Comments explain why (e.g. why quality == 4 sits outside `eligible_d7`, why the clone is never read), never what.
*Acceptance:* `python scripts/list_phase_pool.py --help` (or bare run) exits 0 and writes both files under `data/pool-listings/`; `grep -c 'tbc-new-fork' scripts/list_phase_pool.py` → 0; `grep -n 'from assemble_universe import' scripts/list_phase_pool.py` shows `SPEC_PROFILES, eligible_d7, stub_only_effect_ids` imported, and `grep -n 'def eligible_d7\|def stub_only_effect_ids' scripts/list_phase_pool.py` → no matches (nothing re-implemented); renaming `vendor/wowsims/db.json` aside and running `--check` exits 1 and the message contains `pnpm sync:wowsims:restore` (restore the file after). Depends: N1–N5, N7–N11.

**Step 2 — generate, inspect, commit the listings.**
Run the generator; read both listings end to end. Gate before committing: phase-disagreement count is 0 in both (N13); "raid drops lacking a reason" is 0 in both (N12); every symmetric-difference item on both sides carries exactly one category or sits under "unexplained"; every "unexplained" item is genuinely one no category a–f explains (spot-read each — the section is expected to exist even when empty, with an explicit `none` line). If any of these properties fails, stop and report per the stage-gate rules — do not tune membership, do not add items (brief constraint: an unexplainable item is reported, never added). Run the generator twice and byte-compare the second run against the first (determinism proof). Commit `scripts/list_phase_pool.py` + both listings together (repo, `feat/phase-item-pool`), commit body citing the regen command.
*Acceptance:* `python scripts/list_phase_pool.py && git status --porcelain` empty after commit (regen is a fixpoint); both zero-count properties hold as read from the committed files (`grep -n 'disagreement' data/pool-listings/*.md`, `grep -n 'lacking a reason' data/pool-listings/*.md` show the count lines reading 0); two consecutive runs byte-identical. Depends: Step 1, N12, N13, N14.

**Step 3 — wire the gate.**
Add to package.json: `"pool-listings:check": "python scripts/list_phase_pool.py --check"`, and append `&& pnpm run pool-listings:check` to the `verify` chain (after `fork-universes:check`, before `upstream-drift:warn`, matching the chain's check-then-warn shape). Commit (repo).
*Acceptance:* `pnpm pool-listings:check` exits 0; `pnpm verify` green end to end; `grep -n 'pool-listings:check' package.json` shows both the script entry and its place in the `verify` chain. Depends: Steps 1–2, N10.

## Paths manifest

| Path | Action |
| --- | --- |
| `scripts/list_phase_pool.py` | create |
| `data/pool-listings/ret-p3.md` | create (generated, committed) |
| `data/pool-listings/feral-p3.md` | create (generated, committed) |
| `package.json` | edit (add `pool-listings:check`, extend `verify`) |

Read-only inputs (not touched): `scripts/assemble_universe.py`, `vendor/wowsims/db.json`, `data/wowsims.lock.json`, `data/wowsims-fork.lock.json`, `data/universes/{ret,feral}-p3.json` (+ `.report.json`), `data/sim-implemented-effects.json`. `vendor/tbc-new-fork/**` is neither read nor written by any deliverable.

## Verify recipe

```
# from C:/Users/dgree/Code/lulz/tbc-gear-prio
python scripts/list_phase_pool.py            # regenerates both listings
git status --porcelain                       # must be empty (fixpoint)
pnpm pool-listings:check                     # exit 0
grep -n 'disagreement\|lacking a reason' data/pool-listings/ret-p3.md data/pool-listings/feral-p3.md
                                             # both counts read 0
pnpm verify                                  # full chain green, includes the new gate
```

Missing-input behavior check (destructive, restore after): move `vendor/wowsims/db.json` aside, run `pnpm pool-listings:check` → exit 1, message names `pnpm sync:wowsims:restore`; run that restore command; re-run check → exit 0.

## Out of scope

- Any pool-membership change. An item the audit cannot explain is reported under "unexplained"; the C16a/C16b owner questions belong to parent Step 5.
- Reading or writing anything under `vendor/tbc-new-fork` (decision N7), and any change to `scripts/assemble_universe.py`, `scripts/check_rep_tables.py` (its soft-skip stays as-is), universes, lockfiles, ranking math, or CI workflow files.
- Rare-and-below audit coverage (excluded per the parent's measured zero gap), phases other than 3, and specs other than ret/feral.
- The ADR and tickets (parent Step 5) and every fork-side step (parent Steps 6–10).
