# ADR-0031 — The raid-sim skeleton is a CLI-harness input, not a product input

**Status:** accepted
**Date:** 2026-09-10
**Related:** [`ADR-0022`](0022-each-spec-carries-its-own-upstream-buff-defaults.md), [`ADR-0027`](0027-the-wowsims-upgrades-tab-is-the-primary-product.md), `PLAN.md` §8.2; tickets `.scratch/carry-forward/issues/350-two-hander-swap-leaves-worn-offhand.md`, `365-no-committed-dual-wield-raid-sim-request-fixture.md`, `367-generated-local-dev-skeleton-set-has-no-consumer.md`

## Context

The owner named the distinction on 2026-09-10:

> skeletons may have just been for the tbc gear prio app and not the wowsims
> upgrade tab that should be able to get settings from how the user uses the
> app or the defaults before they touch it

That reframe is correct, and this record exists because agents have re-derived
the opposite conclusion more than once — reading "2 of 11 skeletons exist" as a
product gap and reaching for a nine-spec generator to close it.

There are exactly two places a skeleton is obtained, and they are different
mechanisms:

- **The CLI harness reads a file.** `loadOfflineInputs` in
  `packages/core/src/cli-wiring.ts` builds the path by template and reads it
  with no existence check:

  ```
  $ grep 'raid-sim-skeleton.json' packages/core/src/cli-wiring.ts
      join(root, "data", "presets", spec, "p2.raid-sim-skeleton.json")
  ```

- **The tab builds one from the live page.** `currentPageSkeleton` in the
  fork's `upgrades/adapters/skeleton.ts` calls upstream's own request builder
  and strips two fields:

  ```
  $ grep 'makeRaidSimRequest(false)' \
      vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades/adapters/skeleton.ts
    const proto = simUI.sim.makeRaidSimRequest(false);
  ```

  That is the same builder the page's own Simulate button runs, so the skeleton
  is the user's live gear, talents, consumables, buffs and rotation as
  configured right now — or wowsims' own defaults before the user touches
  anything.

The tab directory contains no reader of a skeleton file at all. Its single
mention of the term is a comment saying so:

```
$ grep -rl 'raid-sim-skeleton' \
    vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades/
.../upgrades/engine/rank.ts
```

That single hit is a comment, not a read. It reads: kept as a stable label
rather than packages/core's "`ret/p2.raid-sim-skeleton` file-path style, since
there is no such file here — the skeleton comes from the page, not from disk."

`PRESET_ID_BY_SPEC` in `packages/core/src/rank.ts` names a skeleton id for all
eleven specs while only two files exist:

```
$ grep -c 'raid-sim-skeleton"' packages/core/src/rank.ts
11
$ ls data/presets/*/p2.raid-sim-skeleton.json
data/presets/feral/p2.raid-sim-skeleton.json
data/presets/ret/p2.raid-sim-skeleton.json
```

The fork tree was present and re-read for this record on 2026-09-10; every fork
command above was run, not cited from an earlier session.

## Decision

**The raid-sim skeleton is a CLI-harness input.** `packages/core` has no page to
read state from, so it loads a canned character from disk. The Upgrades tab has
a page, and takes the user's live state or wowsims' defaults. It never reads a
committed skeleton.

Therefore **"2 of 11 skeletons exist" is a CLI test-coverage limitation, not a
product gap**, and it has never blocked the tab.

## Q2 evidence — does a skeleton alone make a spec CLI-rankable?

No. Three independent gates sit between a committed skeleton and a CLI ranking,
and a skeleton clears none of them. Measured 2026-09-10 from Bash at base
`43052fb`; output kept under
`.scratch/stage-gate/skeleton-scope-and-local-dev-fixture/probe/`.

**Gate 1 — the `pnpm rank` front door rejects the spec before loading anything.**
`parseArgs` in `packages/core/src/cli.ts` carries a hardcoded literal:

```
$ grep 'known: ret, feral' packages/core/src/cli.ts
        console.error(`unknown spec: ${next} (known: ret, feral)`);

$ pnpm rank --region US --realm Testrealm --character Nobody \
    --offline --spec enh --max-phase 2
unknown spec: enh (known: ret, feral)
rc=2
```

Stated precisely, because the distinction matters: **this gates one entry point,
not the ranker.** `rankUpgrades` is also called directly by
`packages/core/test/archetype-specs.test.ts` with shadow, rogue, warrior and
hunter. Those callers never reach `parseArgs` — they supply their own in-line
request and read no preset file (see Q1 below). The gate is real for `pnpm rank`
and would be false if stated as a property of `rankUpgrades`.

**Gate 2 — there is no live gear path.** Without `--offline` the CLI exits 2:

```
$ grep -c 'live WCL path is not wired yet' packages/core/src/cli.ts
1
```

That one hit is in `main`, so every run is an offline run.

**Gate 3 — offline runs need a recorded character, which a skeleton does not
supply.** `offlineGearRecordings` in `cli-wiring.ts` returns `undefined` for any
character outside `RECORDED_CHARACTERS` (one ret, two feral), `findFights`
returns `[]`, and `rankUpgrades` raises `no-qualifying-fight`. Measured on
**ret**, a spec that _has_ a skeleton, which is what isolates the skeleton from
the outcome:

```
$ pnpm rank --region US --realm Testrealm --character Nobody \
    --offline --spec ret --max-phase 2
rank Nobody@Testrealm-US (offline) maxPhase=2 universe=288 cutoff=3.4 DPS / 0.15%
no-qualifying-fight: no qualifying fights for Nobody
rc=1
```

This conclusion rests on the code read of the `RECORDED_CHARACTERS` →
`findFights` → `resolveFight` chain. The single "Nobody" run is consistent with
it but does not by itself isolate the cause: a realm or region mismatch on a
real character yields the identical message.

**The caller census — who reads a committed skeleton at all.** The only reader
is `loadOfflineInputs`, and it builds its path by template. A grep for literal
per-spec paths therefore returns zero whether or not a reader exists, and
**cannot show absence** — so it was not used. The measurement that can is the
census of call sites:

```
$ grep -rl 'loadOfflineInputs(' packages apps scripts --include=*.ts \
    | grep -v /dist/
packages/core/src/cli.ts
apps/web/server/wiring.ts
apps/web/test/recordings.ts
```

Exactly three, and each is independently gated to ret/feral: `cli.ts` by
`parseArgs` above; `apps/web/server/wiring.ts` upstream by
`const SPECS: readonly SpecId[] = ["ret", "feral"];` in `apps/web/server/routes.ts`;
and `apps/web/test/recordings.ts` by an `input.spec !== "ret"` guard that returns 404. Full output and the per-caller greps are in
`probe/loadOfflineInputs-callers.txt`.

## Q1 decision — build no generator

**No skeleton generator is built, for any spec.** A generated skeleton for the
nine missing specs would have zero readers: the three `loadOfflineInputs`
callers are gated to ret/feral, and the tests that do exercise all eleven specs
read no file. `archetype-specs.test.ts` builds a tab-shaped skeleton in-line as
an object literal and says so in its own comment ("The tab builds its skeleton
from the live page ... not from a committed per-spec file"):

```
$ grep -A20 'function skeletonFor' packages/core/test/archetype-specs.test.ts \
    | grep -c 'readFileSync\|loadJson'
0
```

Nine generated files that nobody opens is the whole of what the build would buy
today.

Candidates considered, each with the condition that would have made it win:

- **The subset generator** — the four specs with one unambiguous `p2.gear.json`
  and one `default.apl.json` (balance, shadow, ele, enh). It would have won if
  the structure generalizing were the binding constraint; it looked cheap
  because it is (copy ret's encounter block, blank seventeen slots, gate the APL
  through `scripts/apl_schema.py`). It loses on two counts. The output still has
  no reader, and ADR-0022 forbids reusing another spec's buff blocks, so each
  spec needs its own extraction — and extraction is single-spec today:

  ```
  $ ls vendor/wowsims/*_sim.ts
  vendor/wowsims/feral_sim.ts
  ```

  with one matching `SPECS` entry in `scripts/extract_sim_defaults.mjs`. That is
  four new `TRACKED` entries plus extractor plumbing to produce artifacts
  nothing reads.

- **The full nine-spec generator.** It would have won if every spec's inputs
  were unambiguous. They are not: three specs have no unambiguous default APL
  (mage has four files and no `default`, rogue has `swords.apl.json` only,
  warlock has five and no `default`), warlock's gear is tier-named rather than
  phase-numbered, and hunter's p2 gear is nested and doubly split
  (bm/sv × 2h/dw × 6p/9p). Inventory measured 2026-09-10 and reproduced in
  ticket 367.

- **Extend `parseArgs` past ret/feral and route a preset gear set through
  `syntheticOfflineRecordings` as a synthetic character.** This is the candidate
  that would give a skeleton a real consumer — the skeleton would be the input
  to that route. It is **deferred, not rejected**: no consumer has asked for CLI
  ranking of non-recorded specs, and ADR-0027 makes the tab the primary product.
  It is ticket 367's reopening condition, and the reason 367 is filed `open`
  rather than `wontfix`.

## Q3 decision — which source a generated skeleton may read from

Unchanged from the pre-plan derivation, recorded here so it is not re-litigated.
If a skeleton is ever generated **and committed**, its inputs come only from the
pinned mirror `vendor/wowsims/`, added via a hand edit to `TRACKED` in
`scripts/sync_wowsims.py` followed by `--update --tag <the tag already in
data/wowsims.lock.json>` (`ec5c5f205e61049d730e460967f8488774a7fe2a`).

The **fork checkout is not a legitimate source for a committed artifact.** Both
trees are gitignored, so neither exists in a fresh clone; the difference is
restorability. `vendor/wowsims/` has `TRACKED` + `data/wowsims.lock.json` +
`sync_wowsims.py` and can be reconstructed at its pin. `vendor/tbc-new-fork` is
a working checkout whose pinned commit `0b50f402` is on no remote — measured
2026-09-10:

```
$ git -C vendor/tbc-new-fork ls-remote origin refs/heads/feat/upgrades-tab
d49096e9012c2513e64a85fb7bdbc539d41b8b49	refs/heads/feat/upgrades-tab
$ git -C vendor/tbc-new-fork branch -r --contains 0b50f402 | wc -l
0
$ git -C vendor/tbc-new-fork log --oneline d49096e9..0b50f402 | wc -l
211
```

A generator reading it would make its output unreproducible and the byte-compare
gate unrunnable. A **gitignored local-dev stub** may read either tree, since
nothing gates it and no committed artifact depends on it.

Ticket 355 tracks pushing or archiving that fork branch. This record states the
measurement and does not widen that ticket.

## Consequences

1. **Ticket 365 is a CLI-only test-coverage gap.** It does not block ticket 350,
   and its sentence citing ticket 362 was stale — 362 is closed.

2. **Ticket 350 is unblocked** (`Blocked by: none`). The tab reaches its case
   from live page state with no fixture at all.

3. **Ticket 367 is `open`, deferred pending a consumer**, with the reopening
   condition named. It is deliberately not `wontfix`: that status tells future
   agents never to look again, which is the failure this record exists to
   prevent.

4. **`PRESET_ID_BY_SPEC` naming eleven ids while two files exist is not a defect
   to fix.** The extra ids are labels on a map whose territory is the CLI
   harness; nine of them have no file because nine specs have no recorded
   character to rank.

5. **Anyone reading "2 of 11" as a product gap should stop here.** The tab has
   never needed a committed skeleton, and generating nine would ship files with
   no reader.
