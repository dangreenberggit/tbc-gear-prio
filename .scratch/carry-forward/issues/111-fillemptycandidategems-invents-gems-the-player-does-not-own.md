Status: open
Type: bug
Origin: combined 103/106 diagnostic loop, 2026-08-10 (`.scratch/set-bonus-value/loop-103-106/08-sequential-gems-typesimple.md`)
Blocks: none
Blocked by: none

# `fillEmptyCandidateGems` fills sockets wowsims leaves empty, inflating candidate deltas

**This needs an owner decision before any code moves.** It is a real, measured
overstatement, but removing it collides with a settled spec requirement — so it
is filed as a decision, not a bug to fix.

## The measurement

On the owner's gear under their `TypeSimple` rotation, seeds [11,22,33,44,55] @
3000 iters, pinned CLI v0.0.101
(`python .scratch/set-bonus-value/loop-103-106/sim_pkg_uimigrate.py`; see
`08-sequential-gems-typesimple.md` for the exact invocations):

| T6 four-piece arm | delta |
|---|---|
| `PKG_PROD` (production today) | **+113.42** |
| `PKG_FILL24028` (fill, but with a gem the owner actually owns) | +111.72 |
| `PKG_UIMIGRATE` (true wowsims UI semantics) | **+102.99** |

**Our figure overstates the swap by 10.43 DPS** against what a player equipping
those four items in wowsims would see. Under our own APL rotation the same
mechanism is worth −7.76, so the effect is rotation-modulated but not
rotation-caused.

## The mechanism — one gem in one slot

Upstream `ui/core/proto_utils/equipped_item.ts` at the pinned commit `8aa378b`:
`EquippedItem.withItem` (:138-168) migrates gems colour-matched-then-eligible,
drops overflow, and **leaves leftover sockets null — it never auto-fills**.

Our `migrateGemsToItem` is a faithful port of that. The divergence is the step
we run *afterwards*: `fillEmptyCandidateGems`
(`packages/core/src/candidate-gems.ts:117`, called from
`packages/core/src/rank.ts:1462`), which **has no upstream counterpart on the
equip path**. Its own docstring concedes the shape — "EP-fill only empty sockets
(after UI-style migrate)" (`candidate-gems.ts:114-116`).

Concretely, in this swap: the owner's worn gloves 29947 have **no sockets**, so
migration leaves T6 gloves 31034's single socket empty, and we EP-fill it with
**32194** — a phase-3 epic +10-agi gem **the player wears nowhere in their gear**.
The `PKG_UIONLY_*` intermediates isolate it: shoulder/chest/legs land exactly on
`PKG_PROD`, hands lands exactly on `PKG_UIMIGRATE`. One socket carries the whole
10.43.

No `repairMeta` rewrite is involved — no T6 piece has a meta socket.

## Why this is a decision and not a fix

`fillEmptyCandidateGems` is load-bearing for a settled requirement: **spec §2.2
step 1 requires byte-identical gem policy between package and single swaps**, and
the fill exists so a candidate is not penalised merely for arriving with sockets
its predecessor could not supply. Removing or changing it moves **every**
candidate delta in every report, not just this package.

The tension, stated fairly:

- **Keeping the fill** models "this item, gemmed as you would gem it" — arguably
  the more useful ranking, and it does not punish socket-rich items. But it
  prices gems the player may not own, and it disagrees with what they will see
  in wowsims after equipping the item, which is the tool's oracle.
- **Matching upstream** makes our numbers reproducible against wowsims and stops
  inventing owned inventory. But it penalises items whose sockets cannot be
  filled from the outgoing item's gems, which is exactly what the fill was
  introduced to avoid.

A middle option worth costing: fill only from gems the player **demonstrably
owns** (present elsewhere in their logged gear), which preserves the
no-penalty property without inventing inventory. `PKG_FILL24028` above prices
that variant at +111.72, i.e. it recovers only 1.70 of the 10.43 — so it is a
smaller change than it sounds and does **not** by itself close the gap.

## Evidence that would sharpen the decision

The load-bearing premise is what wowsims actually leaves in that gloves socket
after equipping 31034. Confirmed from upstream source above; **confirming it
from the owner's own UI would settle it beyond doubt** and is one screenshot.

## Relationship to other tickets

- **103** — this is 10.43 of that ticket's 16.42 DPS overshoot against the
  owner's +97. The remaining −5.99 is unattributed there.
- Supersedes the "sequential re-gemming" framing carried in 103's earlier
  sections: the sequential application is not the mechanism, and iteration 03
  never tested this (all three of its arms filled the socket; it varied *which*
  gem, never *whether*).

## DECIDED, 2026-08-11 — model the wowsims two-step, and constrain step 2

**Type changes from `decision` to `bug`.** The owner settled the design by
describing what they actually do in the wowsims web UI, and it is a two-step
process our code already half-implements:

1. **Equip.** Swapping to an item with more sockets migrates the gems that fit
   and leaves the leftover sockets **empty**. Nothing is auto-chosen.
2. **Auto-gem.** The player then clicks the suggest-gems button, which offers
   filters for gem **rarity** and gem **phase availability** — because epic gems
   are not realistically obtainable before phase 3.

The owner's earlier position ("keep gems the same across comparisons so nobody
has to argue about rarity") is not withdrawn. It is the *reason* step 2 needs
constraints, not a reason step 2 should not exist.

**So the defect is not that `fillEmptyCandidateGems` exists. The defect is that
it runs unconstrained.** The framing in the sections above — where removing the
fill was one of two options — is superseded. **Keep the fill and give it the two
filters the UI gives the player.**

None of the measurements above are withdrawn. They are still the evidence that
an unconstrained fill overstates a swap.

### Where the two steps already live

Both sit inside `swapItemAt` (`packages/core/src/rank.ts:1451-1479`), in one
expression:

    fillEmptyCandidateGems(
      itemId,
      migrateGemsToItem(spec.gems ?? [], spec.id ?? 0, itemId),
      gemCtx.palette,
      gemCtx.weightRecord,
      fillOptsForSwap(equipment, slotIndex)
    )

- **Step 1 is done and correct, and stays exactly as it is.**
  `migrateGemsToItem` (`packages/core/src/migrate-gems.ts:15`) is a faithful
  port of upstream's `EquippedItem.withItem`, leftover sockets left at 0.
- **Step 2 is `fillEmptyCandidateGems`**
  (`packages/core/src/candidate-gems.ts:117`). This is the one that changes.

### Phase is already handled — check before "fixing" it

The palette `fillEmptyCandidateGems` receives is `gemsForPhase(input.maxPhase)`
(`packages/core/src/rank.ts:455`, `:467-468`), which filters
`data/gems/palette.json` on each entry's `phase` field. Gem 32194 is `phase: 3`
and the run that produced it was a P3 run, so the phase filter passed it
legitimately.

**Adding a phase parameter to `fillEmptyCandidateGems` would be a second copy of
a filter that already fires.** Confirm that before writing any code:

    node -e "const p=require('./data/gems/palette.json');console.log(p.filter(g=>g.id===32194))"

Expect one entry with `phase: 3`.

### Rarity is the missing constraint, and the palette cannot express it

`data/gems/palette.json` carries `id`, `colour`, `stats`, `phase`, `unique` —
no quality. Upstream `vendor/wowsims/db.json` does carry `quality` per gem;
`build_gem_palette` (`scripts/generate_item_gem_index.py:229-250`) drops it.
Confirm:

    python -c "import json,collections;db=json.load(open('vendor/wowsims/db.json'));print(collections.Counter((g['quality'],g['phase']) for g in db['gems']))"

Observed 2026-08-11 (quality, phase) → count:

    (2,1) 32   (3,1) 68   (3,2) 6   (3,5) 3   (4,1) 63   (4,3) 39   (4,5) 3

So this ticket has a **data-pipeline prerequisite**: carry `quality` through into
`data/gems/palette.json`. That part is a `data-pipeline-work` job — regenerate
with the pinned toolchain, tree matching `HEAD` before commit.

### The rarity policy — pick one before implementing

The obvious rule ("no epics before phase 3") is **wrong on this data**, so read
this section before choosing. 63 of the 105 epic gems are `phase: 1`, and they
are mostly the unique BoP raid-drop epics (Void Sphere, the
Ornate / Sovereign / Shifting line):

    python -c "import json;db=json.load(open('vendor/wowsims/db.json'));print([(g['id'],g['name'],bool(g.get('unique'))) for g in db['gems'] if g['quality']==4 and g['phase']==1][:12])"

Two candidate policies, both cheap, materially different in effect:

- **A — cap quality at rare (3) unless the gem's own phase is ≥ 3.** Matches
  "epics aren't really available before P3" as stated. But the phase field
  already gates the P3 epics, so in a P3 run this changes nothing about 32194
  and the measured defect survives untouched.
- **B — cap quality at rare (3) for auto-fill, full stop.** Auto-fill only ever
  reaches for rare gems; an epic enters a build only by being migrated off a
  piece the player already wears. This matches the owner's stated preference
  (keep gems the same across comparisons) and does move the measured case: it
  would have picked 24028 rather than 32194 — the `PKG_FILL24028` rung at
  +111.72.

**B is the recommendation** and should be the default. State plainly in the
commit message what it buys: +111.72 against the +113.42 we ship today, versus
+102.99 for a pure UI-semantics arm. **It recovers 1.70 of the 10.43, and the
commit message should say that number.** The rest is the fill happening at all,
which the owner has now decided to keep.

**Left for the owner:** whether the cap is a fixed default or a run-level input
(a `--gem-quality-max` flag / `RankInput` field mirroring `maxPhase`). A fixed
default is smaller and is what the instructions below assume; a flag is the
honest analogue of the UI's own dropdown. The two have different test surfaces,
so decide first.

### Spec §2.2's symmetry rule is not at risk

`.scratch/set-bonus-value/spec.md` §2.2 step 1 requires package pieces to go
through the same per-slot helper as single swaps, so gem policy is byte-identical
between the two paths. Both arms call `equipmentForCandidateSwap`, so
constraining step 2 constrains **both arms identically** and the invariant holds
by construction, exactly as it does today. The rule constrains *which code path
runs*, not *what that path may choose*. Nothing here needs an amendment to §2.2
or to ADR-0024.

### Implementation instructions

1. **Data first.** Add `quality` to each entry in `build_gem_palette`
   (`scripts/generate_item_gem_index.py`), regenerate with
   `pnpm data:items:generate`, and add `quality: number` to `GemEntry`
   (`packages/core/src/gems.ts:18-26`). Run the generator twice and confirm the
   second run leaves the tree clean.
2. **Add a filter beside the existing phase one.** Either
   `gemsForQuality(palette, maxQuality)` next to `gemsForPhase`
   (`packages/core/src/gems.ts:38`), or one `gemsForFill(maxPhase, maxQuality)`.
   Keep it in `gems.ts`: what counts as an available gem is a fact about gem
   data, the same reasoning already written above `findMetaGemId`.
3. **Apply it to step 2 only.** `fillEmptyCandidateGems` gets the restricted
   palette; `repairMeta` keeps the full one, because meta gems are quality 4 by
   nature and a rarity cap makes every meta unsolvable. The two share one
   palette today: `gemContext` (`rank.ts:467`) feeds both the fill and the
   `repairMeta` call (`rank.ts:1435-1440`). Separate them — carry two lists on
   `GemContext` (`palette` for repair, `fillPalette` for fill), or pass the
   restricted list to the fill as an explicit argument. **`GemContext.palette`
   itself keeps every gem it has today.** Narrowing it throws
   `MetaUnsolvableError` on any candidate helm with a meta socket, which is the
   symptom to expect if this step goes wrong.
4. **`migrateGemsToItem` stays byte-for-byte as it is.** A gem the player
   already wears rides through step 1 whatever its quality. Capping migration
   would delete gems off the player's own gear.

### Tests and goldens that move

- `packages/core/test/candidate-gems.test.ts` — `fillEmptyCandidateGems` is a
  pure function and is unit-tested directly (AGENTS.md, Testing). Start red:
  with a rare cap, an empty socket in a P3 run gets 24028, not 32194.
- `packages/core/test/migrate-gems.test.ts` — must stay green **untouched**. If
  it moves, step 1 was changed and that is out of scope.
- `packages/core/test/items-gems.test.ts` — the palette gains a field; anything
  asserting entry shape moves here.
- `packages/core/test/rank.test.ts` — the swap path through
  `equipmentForCandidateSwap`, which is the primary test at the module seam.
- `packages/core/test/meta-repair.test.ts` — must stay green. This is the guard
  that instruction 3 did not narrow the repair palette.
- **Every recorded rank artifact changes numerically.** Goldens pinning simmed
  deltas are invalidated, not merely re-pinned: re-record through the recorded
  adapters, and state in the commit message that numbers moved and why.

### What the disclosure must say afterward

`GEM_POLICY_QUALIFIER` (`packages/core/src/rank-report-rules.ts:223`) reads:

> gem handling differs from a wowsims run and this figure may read low

That becomes wrong in two ways once this lands. "May read low" is already
falsified — the measured direction is that we read **high**, by 10.43. And
"differs from a wowsims run" stops being a useful warning once we are
deliberately modelling the wowsims two-step.

Replace it with a statement of the model, not an apology for it. It must say:
sockets a swap leaves empty are auto-gemmed the way the suggest-gems button
would, restricted to gems of a phase and rarity the player could actually have.
Keep the claim to what has been measured — that is our gem model, stated. **A
claim that the figure matches a wowsims run would be unsourced**: nobody has
measured that, and −5.99 of the original residue is still unattributed.

Ticket 107 is the neighbouring surface: it requires the report to disclose gem
substitutions it currently reports as `substitutions: []`. An auto-filled socket
is the same class of change to the player's gear. **Whichever of 111 and 107
lands second should make the fill appear in that disclosure**, so a reader can
see which sockets we chose gems for. Neither blocks the other, so this is
deliberately not a dependency.

### Acceptance criteria

- [ ] Every entry in `data/gems/palette.json` has a `quality` field, and running
      `pnpm data:items:generate` twice leaves the tree clean against `HEAD`.
- [ ] With the cap on, `fillEmptyCandidateGems` never returns a gem whose
      palette `quality` exceeds it — asserted directly in
      `candidate-gems.test.ts`.
- [ ] `git diff` touches no line of `packages/core/src/migrate-gems.ts`.
- [ ] `packages/core/test/meta-repair.test.ts` passes with no edits.
- [ ] `GEM_POLICY_QUALIFIER` no longer contains "may read low", and
      `grep -rn "GEM_POLICY_QUALIFIER" packages/core/src` still shows exactly
      one definition.
- [ ] `pnpm verify` green.
- [ ] Re-running the arm below shows the hands socket carrying a rare gem rather
      than 32194.

### Re-run commands for every figure cited

The three arms (+113.42 production / +111.72 fill-with-24028 / +102.99 pure UI
semantics) on the owner's corrected gear under their `TypeSimple` rotation,
seeds [11,22,33,44,55] @ 3000 iterations, pinned CLI `v0.0.101` from
`data/wowsims.lock.json`:

    python .scratch/set-bonus-value/loop-103-106/sim_uigems.py simplerot

The APL control, where the same mechanism is worth −7.76:

    python .scratch/set-bonus-value/loop-103-106/sim_uigems.py apl

Transcripts: `sim_uigems_simplerot.stdout.log` and `sim_uigems_apl.stdout.log`
in that directory; narrative in `08-sequential-gems-typesimple.md`.

**Correcting this ticket's own record:** the section above cites
`sim_pkg_uimigrate.py` as the re-run command. **No such file exists.**
`sim_uigems.py` produced those numbers.

## CONFIRMED AT THE ORACLE, 2026-08-11 — plus the owner's rarity decision

The owner ran the protocol on wowsims web
(`.scratch/set-bonus-value/loop-103-106/owner-web-results-2026-08-11.md`). The
web's **own exported payload** for the package arm contains:

```json
{"id":31034,"enchant":2564,"gems":[0]}
```

**The gloves socket is empty.** wowsims left the migrated-in socket unfilled,
exactly as upstream `equipped_item.ts:138-168` said it would. This ticket's
premise is no longer an inference from source — it is observed behaviour of the
tool we treat as the oracle, in its own export format.

The magnitude is confirmed from the other direction too: our `PKG_UIMIGRATE`
payload is **byte-identical to the owner's exported package payload, 17/17
slots, same order** (`10-baseline-offset.md`), so the +113.42 our pipeline ships
today against their +98.17 is not an input difference. **The honest comparison is
+102.99 vs +98.17**, and the ~10.4 DPS between +113.42 and +102.99 is this
defect.

### Owner decision — rarity policy

**Cap auto-fill at RARE for testing**, with a note to open it up later
(eventually an option resembling wowsims' own rarity / phase dropdowns,
especially if we integrate with wowsims directly).

The owner's stated principle: *the user must know which gems were used, and it
must be consistent.* A user with epic gems equipped keeps their epic gems — that
is what migrate already does — while **auto-fill assumes only rare
availability**. That directly addresses this ticket's complaint: today we fill
with 32194, a phase-3 epic the player wears nowhere.

Note this decision **keeps the fill** rather than removing it, so spec §2.2 step
1's byte-identical gem policy is preserved and the "decision" framing above is
resolved: implement the rarity cap, do not delete the fill.

### Two behavioural facts that bound what we should imitate

From the owner's session, about the web's own "suggest gems" button:

1. **It does NOT place meta gems.** After equipping Cursed Vision the meta had to
   be seated manually.
2. **It DOES change existing body gems** (boots 24028→24067, belt 24058→24067),
   i.e. it is closer to a **re-gem than a fill-only**.

So the web button is *not* the model for our step 2. Our chosen consistency
principle — keep the player's existing gems and fill only what is empty — is a
**deliberate simplification, not a mirror of the button**, and should be
documented as such so a later agent does not "fix" us toward the button's
behaviour and silently start re-gemming worn slots.

**Status: open**, now an implementation task (rarity-capped auto-fill) rather
than an open question. TDD, and note that changing the fill moves candidate
deltas in every existing report.

## Implementation note, 2026-08-11 — cap landed as a fixed default

The cap is `MAX_FILL_QUALITY = 3` in `packages/core/src/candidate-gems.ts`,
applied via `GemContext.fillPalette` to the fill path only (`repairMeta` keeps
the full palette). **Future work, per the owner decision:** open the cap up as
a run-level option — a `RankInput` field / CLI flag mirroring wowsims' own
rarity and phase dropdowns, especially if we integrate with wowsims directly.
Not scheduled; no ticket yet.
