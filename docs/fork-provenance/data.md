# Data copy provenance

Plan §2.5: "universe/EP-weight data copied into the fork" — deferred by
slice 2 (`engine/PROVENANCE.md`'s own "Data files copied into the fork"
section), done here in slice 3, the first slice that has a consumer for it
(`data.ts` in this directory).

Copied verbatim (byte-for-byte, no field rewriting) from
[`dgreenberggit/tbc-gear-prio`](https://github.com/dgreenberggit/tbc-gear-prio),
`feat/shopping-list-wowsims-tab`. Universes originally copied at commit
`8730a1cf`, **refreshed 2026-08-16 from `60e05571`** (see "Refresh" below);
the two EP-weight files are unchanged since `8730a1cf` and were verified
identical to their sources at the refresh.

**Moved 2026-10-05 (ticket 558):** this folder was
`ui/core/components/individual_sim_ui/upgrades/data/` on fork branch
`feat/upgrades-tab` (`cb561067`); on `feat/upgrades-tab-react` it is
`ui/features/upgrades/model/data/`. Every JSON file is byte-identical to its
`cb561067` copy; `data.ts` changed in its import lines only. Commands below
that name the old path describe the tree as it was when they ran.

| Fork file                          | Source                                          |
| ---------------------------------- | ----------------------------------------------- |
| `ret-p2.universe.json`             | `data/universes/ret-p2.json`                    |
| `ret-p3.universe.json`             | `data/universes/ret-p3.json`                    |
| `ret-p4.universe.json`             | `data/universes/ret-p4.json`                    |
| `ret-p5.universe.json`             | `data/universes/ret-p5.json`                    |
| `feral-p2.universe.json`           | `data/universes/feral-p2.json`                  |
| `feral-p3.universe.json`           | `data/universes/feral-p3.json`                  |
| `ret-p2.ep-weights.json`           | `data/presets/ret/p2.ep-weights.json`           |
| `feral-p1.ep-weights.json`         | `data/presets/feral/p1.ep-weights.json`         |
| `balance-p2.universe.json`         | `data/universes/balance-p2.json`                |
| `balance-p3.universe.json`         | `data/universes/balance-p3.json`                |
| `balance-p4.universe.json`         | `data/universes/balance-p4.json`                |
| `balance-p5.universe.json`         | `data/universes/balance-p5.json`                |
| `hunter-p2.universe.json`          | `data/universes/hunter-p2.json`                 |
| `hunter-p3.universe.json`          | `data/universes/hunter-p3.json`                 |
| `hunter-p4.universe.json`          | `data/universes/hunter-p4.json`                 |
| `hunter-p5.universe.json`          | `data/universes/hunter-p5.json`                 |
| `mage-p2.universe.json`            | `data/universes/mage-p2.json`                   |
| `mage-p3.universe.json`            | `data/universes/mage-p3.json`                   |
| `mage-p4.universe.json`            | `data/universes/mage-p4.json`                   |
| `mage-p5.universe.json`            | `data/universes/mage-p5.json`                   |
| `shadow-p2.universe.json`          | `data/universes/shadow-p2.json`                 |
| `shadow-p3.universe.json`          | `data/universes/shadow-p3.json`                 |
| `shadow-p4.universe.json`          | `data/universes/shadow-p4.json`                 |
| `shadow-p5.universe.json`          | `data/universes/shadow-p5.json`                 |
| `rogue-p2.universe.json`           | `data/universes/rogue-p2.json`                  |
| `rogue-p3.universe.json`           | `data/universes/rogue-p3.json`                  |
| `rogue-p4.universe.json`           | `data/universes/rogue-p4.json`                  |
| `rogue-p5.universe.json`           | `data/universes/rogue-p5.json`                  |
| `ele-p2.universe.json`             | `data/universes/ele-p2.json`                    |
| `ele-p3.universe.json`             | `data/universes/ele-p3.json`                    |
| `ele-p4.universe.json`             | `data/universes/ele-p4.json`                    |
| `ele-p5.universe.json`             | `data/universes/ele-p5.json`                    |
| `enh-p2.universe.json`             | `data/universes/enh-p2.json`                    |
| `enh-p3.universe.json`             | `data/universes/enh-p3.json`                    |
| `enh-p4.universe.json`             | `data/universes/enh-p4.json`                    |
| `enh-p5.universe.json`             | `data/universes/enh-p5.json`                    |
| `warlock-p2.universe.json`         | `data/universes/warlock-p2.json`                |
| `warlock-p3.universe.json`         | `data/universes/warlock-p3.json`                |
| `warlock-p4.universe.json`         | `data/universes/warlock-p4.json`                |
| `warlock-p5.universe.json`         | `data/universes/warlock-p5.json`                |
| `warrior-p2.universe.json`         | `data/universes/warrior-p2.json`                |
| `warrior-p3.universe.json`         | `data/universes/warrior-p3.json`                |
| `warrior-p4.universe.json`         | `data/universes/warrior-p4.json`                |
| `warrior-p5.universe.json`         | `data/universes/warrior-p5.json`                |
| `feral-p4.universe.json`           | `data/universes/feral-p4.json`                  |
| `feral-p5.universe.json`           | `data/universes/feral-p5.json`                  |
| `balance-fallback.ep-weights.json` | `data/presets/balance/fallback.ep-weights.json` |
| `balance-p1.ep-weights.json`       | `data/presets/balance/p1.ep-weights.json`       |
| `balance-p2.ep-weights.json`       | `data/presets/balance/p2.ep-weights.json`       |
| `balance-p3.ep-weights.json`       | `data/presets/balance/p3.ep-weights.json`       |
| `balance-p4.ep-weights.json`       | `data/presets/balance/p4.ep-weights.json`       |
| `hunter-fallback.ep-weights.json`  | `data/presets/hunter/fallback.ep-weights.json`  |
| `mage-fallback.ep-weights.json`    | `data/presets/mage/fallback.ep-weights.json`    |
| `mage-p2.ep-weights.json`          | `data/presets/mage/p2.ep-weights.json`          |
| `shadow-fallback.ep-weights.json`  | `data/presets/shadow/fallback.ep-weights.json`  |
| `shadow-p3.ep-weights.json`        | `data/presets/shadow/p3.ep-weights.json`        |
| `rogue-fallback.ep-weights.json`   | `data/presets/rogue/fallback.ep-weights.json`   |
| `ele-fallback.ep-weights.json`     | `data/presets/ele/fallback.ep-weights.json`     |
| `enh-fallback.ep-weights.json`     | `data/presets/enh/fallback.ep-weights.json`     |
| `enh-p3.ep-weights.json`           | `data/presets/enh/p3.ep-weights.json`           |
| `warlock-fallback.ep-weights.json` | `data/presets/warlock/fallback.ep-weights.json` |
| `warrior-fallback.ep-weights.json` | `data/presets/warrior/fallback.ep-weights.json` |
| `warrior-p2.ep-weights.json`       | `data/presets/warrior/p2.ep-weights.json`       |
| `tier-exchange.json`               | `data/two-hop/tier-exchange.json`               |

## Refresh, 2026-08-16 (ticket 211)

**Nothing regenerates these copies, so they went stale and nothing noticed.**
By 2026-08-16 every one of the six universes had drifted from its source —
ret-p5 by 28 items, and on ret-p3 alone 300 of 384 shared entries differed in
content (`curationHint` values had been rescored). The copies also predated
`epWeights` provenance being stamped into the artifacts, so that key was
missing entirely.

Two upstream commits explain the membership half, and both are deliberate
decisions the stale copies were silently reverting:

- `c718d38` force-admits six SME-flagged ret librams and trinkets (Darkmoon
  Card: Crusade, Hourglass of the Unraveller, Abacus of Violent Odds, and
  three librams). The stale copies were **missing** all six, so the tab could
  not rank them at all.
- `1fcfcaf` drops stub-only sim effects per ticket 171's user ruling — an item
  whose only sim effect is a `TODO: Manual implementation required` stub must
  not appear in any pool. The stale copies still **contained** those items, so
  the tab was offering candidates the ruling excluded by design.

Refreshed by straight copy from `data/universes/*.json` at `60e05571`; all six
now compare `==` to their sources under `json.load`. Re-runnable check:

```bash
python -c "
import json
for f in ['ret-p2','ret-p3','ret-p4','ret-p5','feral-p2','feral-p3']:
    a=json.load(open(f'data/universes/{f}.json',encoding='utf-8'))
    b=json.load(open(f'vendor/tbc-new-fork/ui/features/upgrades/model/data/{f}.universe.json',encoding='utf-8'))
    print(f, a==b)
"
```

`data.ts` reads only `entries` (its `RawUniverse` type), so the newly present
`epWeights` key is inert; `npm run type-check` and this repo's full suite
(832 tests, including E-W3) pass after the refresh.

**Unresolved:** there is still no automated check that these copies match, so
they can drift again the moment a universe is regenerated. Ticket 211 owns
that; this refresh fixes the data, not the mechanism.

## Refresh, 2026-08-23 (ticket 211 closes)

They drifted again, exactly as the 2026-08-16 note predicted. Five of the
eight copies were stale; `ret-p2.universe.json` and both EP-weight files
still matched. Two upstream commits in `dgreenberggit/tbc-gear-prio` explain
every one of the five, and each file below is attributed to its cause:

| Fork file                | Delta vs its source                           | Cause                                    |
| ------------------------ | --------------------------------------------- | ---------------------------------------- |
| `ret-p3.universe.json`   | 1 local-only: 29297                           | `5cf0ea0`                                |
| `ret-p4.universe.json`   | 1 local-only: 29297                           | `5cf0ea0`                                |
| `ret-p5.universe.json`   | 2 local-only: 29297, 34470                    | `5cf0ea0`                                |
| `feral-p2.universe.json` | 18 fork-only weapon rows                      | `5c42a37`                                |
| `feral-p3.universe.json` | 33 fork-only weapon rows; 1 local-only: 29297 | `5c42a37` (removals) + `5cf0ea0` (29297) |

- `5cf0ea0` "Ship Band of the Eternal Defender, now that the sim implements
  it" admits Band of the Eternal Defender (29297) to ret-p3, ret-p4, ret-p5
  and feral-p3, and Timbal's Focusing Crystal (34470, phase 5) to ret-p5.
  The stale copies were **missing** those rings, so the tab could not rank
  them.
- `5c42a37` "Exclude weapon types a druid cannot equip" removes
  druid-unusable weapon rows from the feral universes (18 from p2, 33 from
  p3). The stale copies still **contained** them, so the tab was offering a
  feral player weapons a druid cannot equip.

No shared entry differed in content in any of the five files -- this drift
was membership only.

**Resolved:** `scripts/sync_fork_universes.py` in the source repo now owns
the mechanism the last refresh left open. `pnpm fork-universes:check` runs
in that repo's `pnpm verify` and byte-compares every row of the mapping
table above; `python scripts/sync_fork_universes.py --write` is the
one-command refresh. Run from the source repo:

```bash
python scripts/sync_fork_universes.py --check
```

## Known staleness, carried over rather than fixed here

- **Ret only has EP weights at p2.** Plan §7 flags this: "ret p3 rankings
  with p2 weights are _usable but degraded_" — EP only drives the prefilter
  and gem fill (sims produce every ranking number), so a p3/p4/p5 run uses
  `ret-p2.ep-weights.json` for that role until slice 6 lands a p3 set.
  `data.ts` makes this explicit rather than silently reusing the file with
  no comment.
- **Ret p3-p5 `bisTags` trace to p2-era membership**, per plan §7 — wowsims
  had no ret p3 curated set at the time these universes were assembled.
  Slice 6 (`docs/plans/wowsims-tab/orchestration.md`: "PARKED at data done,
  review pending") is the refresh; not done in this slice.
- **Feral has no p1 universe file** — only `feral-p2.universe.json` and
  `feral-p3.universe.json` exist upstream in this repo, but the EP weights
  file is `p1.ep-weights.json` (upstream ships exactly one feral EP preset,
  named P1 — see that file's own `notes`). `data.ts` uses the p1 EP weights
  for every feral phase, same "usable but degraded" reasoning as ret's p2
  weights covering p3-p5.

No field-level transformation was applied to any file — `poolFromUniverse`
(`engine/pool.ts`) and `epScore`/`EpWeights` (`engine/stats.ts`) already
accept these shapes unchanged, confirmed by reading both source files
against the copied JSON before writing `data.ts`.

## Refresh, 2026-08-25 (equip legality borrowed from `canEquipItem`)

28 of the 63 copies drifted, caught by `pnpm fork-universes:check` and
refreshed with `python scripts/sync_fork_universes.py --write`. One upstream
change explains all 28: the source repo stopped re-implementing this fork's
equip rules in Python and now consumes `canEquipItem`'s own answer, exported
by `upgrades/tools/export_equip_eligibility.mts` in this fork.

| Fork files                        | Delta vs source                         | Cause                                                |
| --------------------------------- | --------------------------------------- | ---------------------------------------------------- |
| `ret-p2/p3/p4/p5`                 | 48/76/85/97 local-only, all cloth armor | Ret's pool no longer filters by armor class          |
| `feral-p2/p3/p4/p5`               | 1/2/3/5 fork-only                       | Off-hand-only fist weapons a druid cannot dual-wield |
| `balance-p2/p3/p4/p5`             | 6/7/8/14 fork-only                      | Same off-hand rule                                   |
| `ele-p2/p3/p4/p5`                 | 6/7/8/14 fork-only                      | Same off-hand rule                                   |
| `mage`, `shadow`, `warlock` p2-p5 | 1/1/1/3 fork-only each                  | Same off-hand rule                                   |

Two kinds of change, both deliberate:

- **Removals (99 rows across 24 files) are a correctness fix.** Every one is
  an off-hand-only weapon (proto `HandTypeOffHand = 3`) held by a spec that
  cannot dual-wield. The Python mirror had no off-hand check at all, so the
  stale copies were offering weapons the sim's own gear picker refuses — the
  same failure class as the rogue two-handed sword in ticket 301. Off-hand
  _frills_ (`WeaponTypeOffHand`) are unaffected and stay in: any class may
  hold one.
- **Additions (306 rows, ret only) are a ruled policy change.** A paladin can
  equip cloth, and every other spec's pool already admitted it — warrior, the
  other plate class, ships 177 cloth pieces at p5. Ret's omission was an
  unexplained outlier, ruled so by the SME gate for this branch. Ret keeps its
  two-hander-only weapon rule, which survives as a _named_ policy exclusion
  rather than as an equip rule.

No shared entry differed in content in any of the 28 files — membership only.

## Refresh, 2026-08-25 (ret policy note corrected)

`ret-p2/p3/p4/p5.universe.json` only, and **text only — no membership change**
(`0 local-only; 0 fork-only; 0 shared entries differ in content`; the delta is
the payload's `d7Note` string).

Pre-merge review found two defects in the same note:

- The generator published a policy justification only for a weapon-type
  exclusion, so ret's two-hander rule — which is a hand-type rule — shipped its
  mandatory note silently. A reader of the artifact could not learn why the
  one-handers were missing. `scripts/check_policy_notes.py` now pins each
  policy kind separately.
- The note cited "Bulwark of Azzinoth (id 28593)". 28593 is Eternium Greathelm,
  a plate helm that is legitimately **in** ret's pool; Bulwark of Azzinoth is 32375. The example named an included item as an excluded one.

## Refresh, 2026-08-29 (ticket 126 token ids; ticket 211 gate fixed)

44 of the 63 copies drifted and were refreshed with
`python scripts/sync_fork_universes.py --write`. Two causes, both deliberate,
neither a membership change (`0 local-only; 0 fork-only; 0 shared entries
differ in content` on every file — the delta is a new field, not a new row):

- **`tokenId` added to tier pieces' `token` sources (ticket 126).**
  `assemble_universe.py` now threads the class-token item id from
  `data/two-hop/<spec>-tokens.json` onto each tier piece's `token` source, so
  both the report export and this tab can emit the id that actually drops in
  the raid (the token) rather than the gear id. 635 `tokenId` fields added
  across the 63 copies; nothing else in the payload moved. Verify the content
  delta is tokenId-only:

  ```bash
  git -C vendor/tbc-new-fork diff --ignore-cr-at-eol -- \
    ui/core/components/individual_sim_ui/upgrades/data/ \
    | grep -E '^[+-]' | grep -vE '^(\+\+\+|---)' | grep -v '"tokenId":'
  # (empty output)
  ```

- **`feral-p3.universe.json` also normalised CRLF -> LF.** Its committed source
  `data/universes/feral-p3.json` had been committed with CRLF line endings
  (every sibling universe is LF, and `.gitattributes` pins `eol=lf`); the regen
  rewrote it LF, matching the others. Byte-only; the parsed content delta is
  still tokenId-only.

The 43 formatting-only drifts `pnpm fork-universes:check` had been reporting
red since before this branch (ticket 211's open gate) are fixed by the same
`--write`: the check is green afterwards. Re-runnable:

```bash
pnpm fork-universes:check
```

No engine file changed — `upgrades/engine/PROVENANCE.md` and every ported
`.ts` are untouched, so `pnpm engine-port-drift:check` stays green.

## Refresh, 2026-09-10 (ADR-0030 re-pin to `ec5c5f2`, slice B)

All 44 `.universe.json` copies drifted and were refreshed with
`python scripts/sync_fork_universes.py --write`, in the same session that
moved `data/wowsims.lock.json`'s pin from `v0.0.119` to
`ec5c5f205e61049d730e460967f8488774a7fe2a` (`feature/backend-reforge`) and
regenerated `data/universes/*` from it.

**The regen produced zero content movement in every universe** — confirmed
by parsed-JSON comparison, not just the check's own summary:

```bash
git -C vendor/tbc-new-fork show HEAD:ui/.../data/<spec>-p<N>.universe.json | tr -d '\r' | sha256sum
tr -d '\r' < ui/.../data/<spec>-p<N>.universe.json | sha256sum
# identical, for every one of the 44 files
```

`sync_fork_universes.py --check`'s drift line
(`0 local-only; 0 fork-only; 0 shared entries differ in content`) is
therefore not describing a data change at all — the script compares
`source.read_bytes() == copy.read_bytes()` (raw bytes, not parsed JSON), so
it flags a pure line-ending mismatch the same way it flags a real drift.
This session's `data/universes/*` regen wrote LF (the repo's own
`.gitattributes` convention, `eol=lf`); the fork's bundled copies had
drifted to CRLF at some point before this session (not from anything this
session did to them) and `--write` normalised them back to LF along with
copying across the pin move. Same mechanism as the
`feral-p3.universe.json` CRLF note in the 2026-08-29 refresh above, this
time across all 44 rather than one.

No membership or stat changed in any universe — `db.json`'s five item
phase-bucket corrections (see slice B's commit body: 32649, 32757 dropped
p5->p3; 35317, 35319, 35320 rose p3->p4) did not move any universe's
membership at any phase, meaning the phase-bucket correction and the
universe's own phase-gating produced the same set either way. Verify:

```bash
pnpm fork-universes:check
```

No engine file changed here either — this refresh touches only
`upgrades/data/*.universe.json`; `upgrades/engine/PROVENANCE.md` and every
ported `.ts` are untouched.

## Refresh, 2026-09-14 (ADR-0033 re-pin to `master` `17a8fb2`)

The engine pin moved from `ec5c5f205e61049d730e460967f8488774a7fe2a` to upstream
`master` `17a8fb28c5ad14b649acecdaacd488594048f467` (ADR-0033), and
`data/universes/*` was regenerated against the refreshed `db.json`.

`sync_fork_universes.py --write` reported **30 refreshed, 33 already matching, 63
listed here**. Unlike the 2026-09-10 refresh, **none of this is line endings**:
`git diff --stat` and `git diff --stat --ignore-cr-at-eol` over
`upgrades/data/` are byte-identical (592 insertions, 154 deletions either way),
and the set difference of their `--name-only` lists is empty. Every one of the 30
carries a real content change.

Two causes, both traceable:

1. **Three items gained a source in the refreshed `db.json`** — 35317, 35319 and
   35320 — so they now enter the universes that phase-gate them in. For example
   `shadow-p3.universe.json` gains `Vindicator's Band of Subjugation` (35320,
   `phase` 3, `sources: [{kind: "unknown", origin: "db"}]`), and
   `shadow-p3.report.json` moves `excludedNoSource` 514 -> 511 and
   `universeTotal` 628 -> 631. This is membership growth with a named cause, not
   drift.
2. **`feral-p1.ep-weights.json`** carries the ticket-358 note correction. Its
   `notes[1]` used to say EP "only chooses gems here"; it now records that EP also
   orders candidates (`packages/core/src/candidate-order.ts:36-67`, capped by
   `rank.ts:1100`), which on a capped run decides which candidates are never
   simmed. Data values are unchanged — only the disclosure note.

No engine file changed: this refresh touches only `upgrades/data/*`.
`upgrades/engine/PROVENANCE.md` and every ported `.ts` are untouched.

Verify:

```bash
pnpm fork-universes:check
```

## Refresh, 2026-09-15 (line endings only; clears the `verify` blocker)

`pnpm fork-universes:check` was red on 29 of 63 copies, blocking
`pnpm merge-to-dev` on `feat/desktop-transport-gate`. Refreshed with
`python scripts/sync_fork_universes.py --write`: **29 refreshed, 34 already
matching, 63 listed here**. The check is green afterwards (`63 bundled copies
byte-match their data/ sources`).

**Nothing but line endings changed.** All 29 were measured two independent
ways before the write, and both agree on every file: stripping CR from both
sides makes the pair byte-equal, and `json.loads` on both sides compares
equal. `describe_delta` reported `0 local-only; 0 fork-only; 0 shared entries
differ in content` on all 29. After the write, `git diff --ignore-cr-at-eol`
over this directory is **empty** while the plain `git diff --stat` reports
463442 insertions and 463442 deletions across 29 files — identical counts,
which is the signature of a pure line-ending rewrite. Each file's CR count
also exactly accounted for its excess bytes over the source
(`fork_bytes - core_bytes == fork_CR`) on all 29.

### Why this keeps coming back — the gate compares two unpinned working trees

Earlier entries describe this as the fork's copies drifting to CRLF. The
measurement this time says something more specific, and it explains the
recurrence better.

`sync_fork_universes.py:168` compares **working-tree bytes** on both sides.
Neither side's line endings are pinned:

- The core's `.gitattributes` ends in `* text=auto eol=lf`, so the _committed
  blob_ is always LF (`git show HEAD:data/universes/ret-p2.json` has 0 CR)
  — but the _working tree_ is whatever the generator last wrote.
- **The fork clone has no `.gitattributes` at all**, so nothing normalises its
  side, in the tree or in the commit.

The core working tree is currently split, and the split is by regeneration
batch rather than by content: of 88 files under `data/universes/`, **47 have
CRLF and every one of them is stamped `2026-09-14 09:59`; 41 are LF and every
one is stamped `2026-09-14 15:22`.** No file crosses batches. That is ticket
283 (Python generators omit `newline=` and write CRLF on Windows) visible as a
timestamp.

So the gate goes green whenever both sides happen to agree, **at whichever
ending**. This refresh made 29 pairs agree at LF; the other 34 were already
agreeing, 15 of them at CRLF on both sides (e.g. `ret-p2`, core and fork both
5603 CR, byte-equal). A later regen that writes the other ending re-reds the
gate without any data changing. That is why clearing it has not held.

**This refresh clears the symptom; it does not fix the cause.** A durable fix
is a `.gitattributes` in the fork pinning `eol=lf` (with
`git add --renormalize` in the same commit), or fixing 283 at the generator
write sites so the core tree stops alternating. Ticket 283 scopes itself to
the core repo and argues committed bytes are safe there because of the
`.gitattributes` catch-all — that argument does not extend to this fork, which
has no such file. Ticket 167 is the same failure class on the sibling gate
`check_engine_port_drift.py`.

> **Superseded by the 2026-09-15 entry below**, which did both halves of that
> durable fix. The census and the "no `.gitattributes` at all" claim above
> describe the state before it.

Ticket 211 is **not** this. 211 is `Status: closed`; it owned the _absence_ of
a comparison mechanism and was closed by building `sync_fork_universes.py`.
The stale "211 owns the red gate" pointer appears in this branch's decision log
and review and should not be carried forward.

No engine file changed: this refresh touches only `upgrades/data/*.universe.json`.
`upgrades/engine/PROVENANCE.md` and every ported `.ts` are untouched.

Verify:

```bash
pnpm fork-universes:check
```

## Pin, 2026-09-15 (both halves of the durable fix; ticket 399)

The entry above left the cause in place. This one closes it from both sides, so
the gate stops going red on line endings.

**Fork side — this directory now has a `.gitattributes`** pinning `* text eol=lf`,
staged with `git add --renormalize` in the same commit. Before it,
`git check-attr text eol` on these copies reported both **unspecified**;
after, `text: set` / `eol: lf`. The renormalize is what moves the _committed_
blobs: 15 copies were committed as CRLF (`ret-p2` 5603 CR, `warrior-p2` 15350 CR,
and 13 others), and a worktree refresh alone would have left those blobs CRLF.

It is scoped to this directory rather than the fork root deliberately. This is a
fork-local file that every future merge from `wowsims/tbc-new` carries, and only
these copies need the guarantee.

**Core side — the generators no longer write CRLF.** Ticket 283's cause was 13
`write_text(` call sites across 11 scripts in `tbc-gear-prio` that omitted
`newline=`, so Windows text mode translated `\n` to `\r\n`.
`scripts/assemble_universe.py` is the one that feeds this directory; all 13 now
pass `newline="\n"`. The 44 universes and 44 reports were regenerated
afterwards, taking `data/universes/` from **47 CRLF / 41 LF to 0 CRLF / 88 LF**.

**Nothing but line endings changed, measured the same two ways as above.** Across
every file the regen touched: stripping CR from both sides makes each pair
byte-equal, and `json.loads` on both sides compares equal — 0 mismatches by
either method. `describe_delta` reported `0 local-only; 0 fork-only; 0 shared
entries differ in content` on all 15 drifted copies. The staged fork diff is
149428 insertions against 149416 deletions over 16 files, and the 12-line excess
is this `.gitattributes`; the rest is the line-ending rewrite.

Sequence, for anyone reproducing it: the core regen flipped `data/universes/` to
LF, which turned the gate **red at exactly the 15 copies committed as CRLF** —
that red is the fix surfacing, not a new fault. `--write` then refreshed those
15, and the renormalize pinned them.

No engine file changed: this touches only `upgrades/data/`.
`upgrades/engine/PROVENANCE.md` and every ported `.ts` are untouched.

Verify:

```bash
pnpm fork-universes:check
git -C . check-attr text eol -- ret-p2.universe.json
```

## Refresh, 2026-10-05 (ticket 558: EP-weight `source` paths)

Upstream moved each spec's `presets.ts` from `ui/<class>/<spec>/` to
`ui/specs/<class>/<spec>/`, so the source repo rewrote the `source` field of
its 20 `data/presets/*/*.ep-weights.json` files to the new path, and
`scripts/check_ep_presets.py` now reads the presets from there.
`python scripts/sync_fork_universes.py --write` reported **19 refreshed, 44
already matching, 63 listed here**: the 19 bundled EP-weight copies. In each,
the `source` line is the only changed line (`git diff --stat`: 19 files, 19
insertions, 19 deletions). No weight and no universe changed.

No engine file changed: this touches only `ui/features/upgrades/model/data/`.

Verify:

```bash
pnpm fork-universes:check
```

## Refresh, 2026-10-06 (engine pin 17a8fb28 → 42c75dc9, ticket 558 P4)

The source repo's engine pin moved from upstream `master`
`17a8fb28c5ad14b649acecdaacd488594048f467` to `master`
`42c75dc9b6ef447202588250480a7d504182409a`, and `data/universes/*` was
regenerated against that pin's `db.json`.

`python scripts/sync_fork_universes.py --write` reported **36 refreshed, 27
already matching, 63 listed here**: the p2-p5 universes of the nine specs
that admit items by db phase (balance, ele, enh, hunter, mage, rogue, shadow,
warlock, warrior). None of it is line endings: `git diff --stat` and
`git diff --stat --ignore-cr-at-eol` agree (36 files, 2390 insertions, 2255
deletions), and so do their `--name-only` lists. The ret and feral universes
and all 19 EP-weight files are unchanged.

One cause: upstream re-issued the Brewfest items under new ids and removed
Battlemaster's Alacrity.

1. **Brewfest re-issues.** `db.json` drops 37597, 38287, 38288, 38289, 38290,
   37127 and 37128 and adds 281903 (Direbrew's Shanker), 281739 (Empty Mug of
   Direbrew), 281748 (Direbrew Hops), 281743 (Coren's Lucky Coin), 281735
   (Dark Iron Smoking Pipe), 281895 (Brightbrew Charm) and 281893 (Balebrew
   Charm), all at `phase` 3 and item level 141. So the p2 universes lose five
   entries and gain none; p3 swaps the five for the seven; p4 and p5 swap
   seven for seven.
2. **Battlemaster's items.** 35326 (Battlemaster's Alacrity) is gone from
   `db.json`, so p4 and p5 lose it. 33832, 34049, 34050, 34162, 34163 and
   35327 move from `phase` 4 to 3: p3 gains them, and in p4 and p5 only their
   `phase` field changes.

No engine file changed: this touches only `ui/features/upgrades/model/data/`.

Verify:

```bash
pnpm fork-universes:check
```

## Refresh, 2026-10-08 (other classes' Tier 3 pieces dropped, ticket 576)

`scripts/assemble_universe.py` now drops a piece of a set listed in
`data/class-restricted-sets.json` from every other class's universe. That
table holds the nine Naxxramas Tier 3 sets (setIds 521 and 523-530), each
with the one class Wowhead tags it with: the "Class:" line on the set's
tooltip, since the pieces' own tooltips have no class line. The fork's
`canEquipItem` had let them into other classes' pools. Dungeon Set 2
(511-519) is not listed: Wowhead tags it with an armor type and no class.
Ticket 579 asked whether another class can obtain those pieces; the next
refresh records the answer.

`python scripts/sync_fork_universes.py --write` reported **36 refreshed, 27
already matching, 63 listed here**: the p2-p5 universes of balance, ele, enh,
hunter, mage, rogue, shadow, warlock and warrior. Each loses only entries,
the same number at every phase: warrior 64, hunter 48, ele 48, enh 48,
balance 32, rogue 32, mage 16, shadow 16, warlock 16 (1,280 in all). No
other entry and no header field changed. The ret and feral universes and
all 19 EP-weight files are unchanged. `git diff --stat` and
`git diff --stat --ignore-cr-at-eol` agree (36 files).

No engine file changed: this touches only `ui/features/upgrades/model/data/`.

Verify:

```bash
pnpm fork-universes:check
pnpm class-restricted-sets:check
```

## Refresh, 2026-10-09 (other classes' Dungeon Set 2 pieces dropped, ticket 579)

The owner confirmed that a class cannot obtain another class's Dungeon Set 2
pieces ("I'm confirming it. Remove.", decision-log 2026-10-09), so
`data/class-restricted-sets.json` now also lists setIds 511-519. Wowhead's
TBC set tooltip gives those sets an armor type and no class, and
`vendor/wowsims/db.json` gives their pieces no `classAllowlist`, so each row
cites Wowhead's appearance-set page for the set, whose "Classes:" line names
the class (for example `https://www.wowhead.com/classic/transmog-set=935`,
Battlegear of Heroism, Warrior), and carries a `confirmed` note.
`scripts/check_class_restricted_sets.py` counts these rows apart from the
Tier 3 rows it holds to db.json's ring allowlists.

`python scripts/sync_fork_universes.py --write` reported **36 refreshed, 27
already matching, 63 listed here**: the p2-p5 universes of balance, ele, enh,
hunter, mage, rogue, shadow, warlock and warrior. Each loses only entries,
the same number at every phase: warrior 21, hunter 18, ele 15, enh 15,
balance 12, rogue 12, mage 6, shadow 6, warlock 6 (444 in all). No other
entry and no header field changed. The ret and feral universes and all 19
EP-weight files are unchanged. `git diff --stat` and
`git diff --stat --ignore-cr-at-eol` agree (36 files, 7,104 lines removed).

No engine file changed: this touches only `ui/features/upgrades/model/data/`.

Verify:

```bash
pnpm fork-universes:check
pnpm class-restricted-sets:check
```

## No refresh, 2026-10-09 (engine pin 42c75dc9 → 5262ff38, ticket 565)

The source repo's engine pin moved from upstream `master`
`42c75dc9b6ef447202588250480a7d504182409a` to `master`
`5262ff386bd171e6349d0f9cf00f4d762a6c9951` (v0.0.148), and the fork branch
merged the same commit. Upstream's two commits in that range change one line
of `ui/styles/theme/z-index.css` and no file the source repo's lock pins, so
all 44 `data/universes/*` files regenerated byte-identical.

`python scripts/sync_fork_universes.py --write` reported **0 refreshed, 63
already matching, 63 listed here**. No bundled copy changed.

Verify:

```bash
pnpm fork-universes:check
```

## Refresh, 2026-10-12 (feral Sunwell tier pieces added, ticket 609)

The tier-token maps under `data/two-hop/` are now generated by
`scripts/generate_tier_tokens.py` from AtlasLoot's `T4_SET`/`T5_SET`/`T6_SET`
tables, `vendor/wowsims/db.json`'s set pieces and
`data/two-hop/token-groups.json`. The generator reproduced all 195 hand-made
rows and added the three Sunwell Harness pieces feral's map had left out:
Thunderheart Wristguards 34444, Waistguard 34556 and Treads 34573, bought with
tokens 34852, 34855 and 34858 (Kalecgos, Brutallus, Felmyst).

`python scripts/sync_fork_universes.py --write` reported **1 refreshed, 62
already matching, 63 listed here**: `feral-p5.universe.json` gains those three
entries, each with one `token` source in Sunwell Plateau. No other entry, no
other universe and no EP-weight file changed.

No engine file changed: this touches only `ui/features/upgrades/model/data/`.

Verify:

```bash
pnpm atlasloot:regen:check
pnpm fork-universes:check
```

## Refresh, 2026-10-15 (Sunmote upgrades for every spec, ticket 612)

The Sunmote upgrades now come from `data/two-hop/sunmote-pairs.json`, which
`scripts/parse_atlasloot.py` writes from the commented rows AtlasLoot keeps
under each Sunwell Plateau base item (28 pairs). `scripts/assemble_universe.py`
applies them to every spec and keeps a pair when both items are phase 5, share
a slot and the upgrade's item level is not below the base's; the five head
pairs whose commented item is ilvl 159 under an ilvl 164 base are dropped. The
hand-made `data/two-hop/ret-sunmote-upgrades.json` (3 rows) is deleted.

`python scripts/sync_fork_universes.py --write` refreshed 11 of 63 copies, all
phase 5: `ret-p5.universe.json` gains 20 entries (617 to 637) and
`feral-p5.universe.json` gains 13 (484 to 497), each with one Sunwell Plateau
`token` source named `Sunmote + <base item>`. In the other nine specs' p5
copies (balance, ele, enh, hunter, mage, rogue, shadow, warlock, warrior) the
entry count is unchanged; 5 to 23 entries per file that were `unknown`
(db-phase) now carry that `token` source. No EP-weight file changed.

The fork's `ui/features/upgrades/model/settings_pool.test.ts` ret phase-5 count
moves from 617 to 637 in the same commit. No engine file changed.

Verify:

```bash
pnpm atlasloot:regen:check
pnpm fork-universes:check
```

## Refresh, 2026-10-15 (one list rule set for every spec, tickets 611 and 613)

`scripts/assemble_universe.py` now builds every spec's list with the same
rules. Ret and feral take db-phase admission (an epic with no source, admitted
at its db.json `phase`) and the Gladiator arena exclusion, which only the nine
other specs had. The db-phase route skips an item below item level 100 unless
the pinned sim implements its effect (`implementedEffectItemIds` in
`data/sim-implemented-effects.json`); this drops the vanilla epics. A new
route admits a crafted item whose pattern drops in a raid of the list's phase.

`python scripts/sync_fork_universes.py --write` refreshed all 44 universe
copies:

- ret p2–p5: 288/467/523/637 to 480/715/838/1059 (db-phase +179/+224/+291/+370,
  crafted +15/+28/+28/+56, arena −2/−4/−4/−4).
- feral p2–p5: 227/364/408/497 to 405/587/668/836 (db-phase +174/+217/+254/+314,
  crafted +6/+13/+13/+32, arena −2/−7/−7/−7).
- the nine others: each list loses 162–267 vanilla db-phase rows (the same
  count at every phase) and gains 4–65 crafted rows.

No existing entry changed. No EP-weight file changed. The fork's
`ui/features/upgrades/model/settings_pool.test.ts` ret counts move from
523/637 to 838/1059, and `ui/features/upgrades/model/feral_p5_pool.test.ts`
is new (fork-added). No engine file changed.

Verify:

```bash
pnpm fork-universes:check
```

## Refresh, 2026-10-15 (rewards of factions the raid map does not list)

`scripts/assemble_universe.py` gains one route for every spec: an item whose
own reputation source names a faction `data/phase_raids.json` does not list
(The Violet Eye, The Sha'tar, The Consortium and others) is admitted on the
db-phase rules: epic, its db.json `phase` within the list's phase, item level
at least 100 unless the sim implements its effect. These items had a source,
so db-phase admission skipped them, and the raid-tier faction map skipped
their faction, so no list held them. A craft whose pattern such a faction
sells is not admitted (ticket 418).

`python scripts/sync_fork_universes.py --write` refreshed all 44 universe
copies. Every list gains the same rows at every phase: ret +22, feral +26,
balance +29, ele +30, enh +31, hunter +34, mage +27, rogue +34, shadow +27,
warlock +28, warrior +39 (ret p2–p5 now 502/737/860/1081, feral
431/613/694/862).

No existing entry changed. No EP-weight file changed. The fork's
`ui/features/upgrades/model/settings_pool.test.ts` ret counts move from
838/1059 to 860/1081. No engine file changed.

Verify:

```bash
pnpm fork-universes:check
```

## Refresh, 2026-10-16 (arena gear as a source, ticket 642; 23206)

`scripts/assemble_universe.py` no longer excludes arena gear. Every item of
the four Gladiator season lines enters every spec's list once its season is
open (its db.json `phase`: seasons 1, 2, 3 and 4 at phases 1, 2, 3 and 5),
with one source `{"kind": "pvp", "via": "arena", "season": N}`. The tab's
Sources dialog removes all of it under "PvP vendor". Stub-only arena pieces
stay out. Separately, guide prose that names a place outside TBC's raids and
admitted heroics no longer counts as a source, which admits 23206 Mark of the
Champion to ret and feral p2–p5 and 32387 Idol of the Raven Goddess to feral
p2–p5.

`python scripts/sync_fork_universes.py --write` refreshed all 44 universe
copies. Lists p2–p5 are now: ret 541/794/917/1156, feral 479/686/767/962,
balance 479/686/767/964, ele 550/803/912/1151, enh 568/829/939/1191, hunter
503/737/846/1080, mage 359/508/563/697, rogue 458/664/748/951, shadow
384/545/599/744, warlock 370/523/578/716, warrior 644/950/1092/1396.

No existing entry changed. No EP-weight file changed. The fork's
`ui/features/upgrades/model/settings_pool.test.ts` ret counts move from
860/1081 to 917/1156, and `ui/features/upgrades/model/arena_source.test.ts`
is a new fork-added test. No engine file changed.

Verify:

```bash
pnpm fork-universes:check
python scripts/check_pool_completeness.py --check
```

## No refresh, 2026-10-16 (engine pin 5262ff38 → e804c29e, ticket 674)

The source repo's engine pin moved from upstream `master`
`5262ff386bd171e6349d0f9cf00f4d762a6c9951` to `master`
`e804c29e8d615fcc6dcc632a1b0c782605e27d46` (v0.0.150), and the fork branch
merged the same commit. Upstream's eight commits in that range change the
arcane mage APL and spec, a UI helper, and the sim's seed-0 handling, and no
file the source repo's lock pins, so all 44 `data/universes/*` files
regenerated byte-identical. Only the commit line of the 44
`data/pool-listings/*` files moved.

`python scripts/sync_fork_universes.py --write` reported **0 refreshed, 63
already matching, 63 listed here**. No bundled copy changed.

Verify:

```bash
pnpm fork-universes:check
python scripts/check_pool_completeness.py --check
```

## Refresh, 2026-10-16 (db sources for the force-included items, tickets 174 and 646)

`scripts/assemble_universe.py` no longer skips the six items ticket 157
force-includes when it reads db.json, AtlasLoot and the Wowhead lists. Their
membership route is unchanged, but each now carries the source an input
records instead of `{"kind": "unknown"}`: 28288 Abacus of Violent Odds `raid`
The Mechanar · Pathaleon the Calculator, 28034 Hourglass of the Unraveller
`raid` The Black Morass · Temporus (each followed by AtlasLoot's `heroic`
row), 27484 Libram of Avengement `heroic` The Blood Furnace and 22401 Libram
of Hope `raid` Dire Maul with no boss. The validation guard now accepts a
`raid` zone or `heroic` dungeon that db.json's zone table names; `token`
zones stay limited to `data/phase_raids.json`. Separately, a
`correctedSourceText` in `data/wowhead-lists/ret/p3.json`–`p5.json` makes
33910 Vindicator's Scaled Bracers `pvp` via `honor`, like its four siblings.
31033 and 31856 stay `unknown`: no committed input records a source for them.

`python scripts/sync_fork_universes.py --write` refreshed 20 of 63 copies:
ret, enh, feral, hunter and rogue p2–p5. In ret the `sources` of 22401,
27484, 28034 and 28288 change, and 33910's in p3–p5; enh, hunter and rogue
change 28288 only, feral 28034 only. No entry is added or removed, so every
list keeps its count.

No EP-weight file changed. No fork test changed, and no engine file changed.

Verify:

```bash
pnpm fork-universes:check
python scripts/check_pool_completeness.py --check
```

## Refresh, 2026-10-17 (cross-spec list sources, honour seasons, Libram of Hope's boss; tickets 676, 680, 681)

`scripts/assemble_universe.py` at `5674783e` changes the `sources` of
existing rows in three ways, and adds or removes no entry:

- A row that would get `{"kind": "unknown"}` now takes the `badge`, `pvp`
  or `world` source that any spec's vendored Wowhead list gives the item
  (ticket 676). At p5 this fills 59 rows across the 11 specs; over p2–p5 it
  fills 195.
- An honour `pvp` source now carries the season its list names, such as
  `Vendor: Honor Points (Season 3)` (ticket 681). This adds a season to the
  19 honour rows that had none.
- 22401 Libram of Hope's `raid` source in ret p2–p5 names its boss,
  `Isalien`. Upstream's db.json names npc 16097
  `Isalien"].." - "..format(AL["Tier %s Sets`, and the builder now keeps the
  text before the first `"]` instead of dropping the boss (ticket 680).

`python scripts/sync_fork_universes.py --write` refreshed 44 of 63 copies:
every universe, p2–p5 for all 11 specs. The 44 copies differ from the old
ones in 218 shared entries (195 + 19 + 4), with 0 entries only on one side;
ret changes only 22401 (p2–p5) and 33910's season (p3–p5). No EP-weight
file changed.

The fork's Source cell applies the same `"]` rule to the npc name it reads
from upstream's database (`overrunNpcKey`,
`ui/features/upgrades/utils/item_source.ts`, fork `d5d4a45e2`), so the tab
and the universe name the same boss. No engine file changed.

Verify:

```bash
pnpm fork-universes:check
python scripts/check_pool_completeness.py --check
```

## Refresh, 2026-10-17 (pre-raid list sources; review finding A2 of feat/tab-follow-ups)

`scripts/assemble_universe.py` at `c90d416c` makes the cross-spec index also
read `data/wowhead-lists/ret/pre-raid.json` for its badge, PvP and world
rows. No membership route reads that list, so no entry is added or removed.
Five items that showed `unknown` now name a source, in 104 rows over p2–p5:
29382 Blood Knight War Cloak (badge, cost 25, all 11 specs), 28645 and 28646
(honour, ret and warrior), 31318 and 31322 (world drop).

`python scripts/sync_fork_universes.py --write` refreshed 44 of 63 copies
(fork `160ae36c2`). No EP-weight file changed and no engine file changed.

Verify:

```bash
pnpm fork-universes:check
python scripts/check_pool_completeness.py --check
```
