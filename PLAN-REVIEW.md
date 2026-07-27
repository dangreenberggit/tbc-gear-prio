# PLAN.md — domain review

**Reviewer:** Claude (domain/game-reality pass)
**Date:** 2026-07-26
**Subject:** `PLAN.md` rev of 2026-07-26
**Reviewed against:** the TBC domain context reference, §12 checklist

This is a **domain** review, not an architecture review. It assumes §3's "one deep
module, three seams" is settled and does not re-litigate it. Everything here is a
correction to what the plan believes about the *game*, the *simulator*, or the
*data*.

Findings are numbered `R1`…`R14` so they can be referenced. Status is one of
**APPLIED** (already edited into `PLAN.md`), **DECIDED** (call made, edit not yet
applied), or **OPEN**.

> **Disposition, 2026-07-26 (later).** Every finding in this document has now been
> applied to `PLAN.md`, with three answered differently from the recommendation
> here — see the **Disposition log** at the foot of this file. Per-finding status
> headings below are left at their original values so the review reads as it was
> written; the log is authoritative.

---

## Summary

The plan is materially stronger than typical on the two things this domain
punishes hardest:

- **§10 (statistics)** is better than the checklist demands. It independently
  identifies that shared seeds make baseline and candidate runs positively
  correlated, that the independent-SE formula therefore overstates the variance
  of the delta, and that this can't be fixed by algebra because `wowsimcli`
  returns per-run mean and stdev rather than paired per-iteration deltas. It then
  defers to a measurement instead of guessing. Do not "simplify" this section.
- **§8.3 (pool)** refuses to derive the candidate pool from the item DB's
  `sources` field. That field is null on ~1,169 of 2,167 phase-1 epics
  **including every tier piece**, so zone-based filtering silently drops the most
  contested loot in the game. The plan gets this right and says so twice.

Also correct and worth not undoing: §8.2's decode-a-share-link approach sidesteps
wowsims' wildly uneven gear-preset coverage (feral has 16 sets, ret has 3 and
stops at P2, mage is Arcane-only). Because the plan never reads gear presets, that
unevenness can't bite it.

Three findings block implementation: **R2**, **R3**, **R4**.

---

## Resolved decisions

### R1 — That's My BiS is downstream only, never a data source · **APPLIED**

TMB is a guild loot *wishlist* site. It records what players say they want. It has
no public API and no item rankings, so it cannot validate or supply anything.
Two places in the plan treated it as a peer of Wowhead/wowsims as a data source.

BiS tags come from **wowsims' own curated gear sets** —
`ui/<class>/<spec>/gear_sets/*.gear.json`, which carry the `BiS` / `Alt` /
`Realistic` variants the plan already wants to surface.

TMB's only role: a destination a user can take our **exported** wishlist to. That
is why §12 exports `IndividualSimSettings`-shaped JSON — wowsims → TMB is an
import path guilds already use, so our output lands in an existing loot workflow
without TMB needing to cooperate.

Edits made: §8.3 closing paragraph, §14 Phase 1 gate, §12 exports paragraph.

> **Caveat that survives the fix:** ret's wowsims curated sets stop at P2. There
> is no P3 tag source yet. Tags must degrade to empty rather than block a
> ranking. The older `wowsims/tbc` repo has complete P1–P5 sets for all sixteen
> specs, but they are four years old and encode 2021-era understanding — usable
> as a starting point, not as truth.

### R2 — Content phase is a user input, not a build-time target · **DECIDED, not applied** · *blocking*

**What the plan currently says.** The first spec is locked to "Retribution
paladin, Phase 1 (T4/P1)", with `contentPhase: 'p1'` and
`data/{presets,pools,bis-tags}/ret/p1.json`.

**Why that's wrong.** The game has been on **P2 (SSC / Tempest Keep) since
May 14, 2026**. A character pulled from a recent log is wearing P2 gear — that
isn't a choice, it comes from the log. Simming P2 gear against a P1-only
candidate pool produces a list of downgrades, which cannot satisfy the Phase 1
exit gate ("a ranking you would act on tonight").

**The decision — do it the way wowsims does it.** The user selects a **maximum
phase**, and the pool is filtered **inclusively**:

```ts
poolItems.filter(i => i.phase <= input.maxPhase)
```

Inclusive is the load-bearing word. At `maxPhase: 2` the player still sees
Karazhan drops and Badge of Justice gear, much of which remains competitive at
T5. A per-phase pool would have wrongly excluded all of it.

**Concrete changes:**

1. `RankInput.contentPhase: ContentPhase` → `maxPhase: ContentPhase` (1–5).
   No build-time phase target anywhere.
2. **Pool becomes one file per spec, not one per phase.** `data/pools/ret.json`,
   each entry carrying its own `phase` (sourced from the item DB's `phase`
   field). Filtering happens at rank time. Curation accumulates instead of being
   redone per phase.
3. **The same `maxPhase` filters the gem palette** (§9). This is the consistency
   point that matters: gem counts by phase are 163 / 6 / 39 / 0 / 6 for P1–P5,
   and the 39 phase-3 gems are the **epic gems** arriving Aug 27, 2026. A user
   simming at `maxPhase: 2` must not be told to socket an epic gem.
   (Meta gems are unaffected — all 18 are phase 1.)
4. **`maxPhase` goes into `contentHash`** (§7). It changes the answer, so it must
   be in the hash. The current `poolId, poolVersion` fields no longer capture it
   once the pool file is phase-agnostic.
5. **`maxPhase` goes into `assumptions`** and is displayed — "candidates: phase ≤ 2".
6. Default value lives in **one** constant, not scattered through the code.

**What this buys.** P3 on Aug 27 becomes a data-only change — add P3 items to the
pool file, add the 39 epic gems to the palette, bump `engineVersion` to invalidate
cached rankings. No code change, no migration, no dated risk row. Users who
haven't reached P3 are unaffected because they select a lower max.

**Naming collision to fix while you're in there.** "Phase 1" means two different
things in `PLAN.md`: the delivery phase and the game's content phase. §14's
heading `### Phase 1 — The engine (ret, P1, no web)` uses both in six words. Call
the game one **tier** or **content phase** consistently.

---

## Feature additions

*(Numbering is by order of discovery, not document order. R15 was added after the
first review pass.)*

### R15 — "Pin wowsims BiS set to the top" toggle · **DECIDED, not applied**

**The feature.** A toggle that takes the wowsims curated BiS gear set for
(spec, phase) and pins those items to the top of the shortlist. Crucially, the
pinned group is **still ordered by our simmed `deltaDps`** — wowsims' sets are
17 entries in fixed *slot* order (head, neck, shoulder, …) and carry no ranking
information whatsoever. Slot order is membership data, not priority data, and
must not leak into the display order.

**Why it's cheap.** `RankedItem.bisTags: Array<'BiS' | 'Alt' | 'Realistic'>`
already exists in §4, and `data/bis-tags/<spec>.json` is already in the §5.1
layout. So this is:

```
sortKey = [ pinEnabled && item.bisTags.includes('BiS') ? 0 : 1, -item.deltaDps ]
```

**It is display-only, and that's a real design win.** The toggle changes no
simulation input, so it must **not** enter `contentHash` (§7). Consequences worth
stating explicitly, because they're easy to get wrong in the other direction:

- Toggling is instant — a pure re-sort of an existing `Ranking`, no re-sim, no
  cache invalidation.
- It therefore does **not** belong on `RankInput`. `RankInput` drives the sim and
  the hash; this is a render-time option on the CLI and the web view.
- `Ranking` needs no new fields at all.

**Three domain wrinkles:**

1. **Pinned items will sometimes show negative deltas, and that is correct.** An
   item is BiS *as a member of a whole optimized set*. Dropped singly onto the
   player's current gear it can genuinely lose DPS — most often by breaking a
   tier 2-set or 4-set bonus, or by being hit-light for a player who is under the
   9% yellow hit cap (see R8). Keep the signed delta visible on pinned rows and
   don't let the pin imply "upgrade". The existing `setBonusNote` is what explains
   the common case.
2. **§2 needs amending, not just §4.** It currently reads: *"Curated BiS
   membership is a tag and a tiebreaker. Never a pool filter."* A pin is stronger
   than a tiebreaker — it's a primary sort key. The *spirit* survives, because
   nothing is excluded from the pool and no delta changes; but the sentence should
   be restated as **"a tag, a tiebreaker, and an opt-in display sort — never a
   pool filter."** Leaving §2 as-is makes the feature look like a violation of a
   stated product constraint.
3. **The toggle must degrade to disabled.** Ret has only 3 curated sets in
   `tbc-new` and they stop at P2 (see R1), so at `maxPhase >= 3` there is nothing
   to pin. Hide or disable the toggle when no set data exists for
   (spec, maxPhase) rather than silently rendering an unchanged list — a toggle
   that visibly does nothing reads as a bug.

**One open choice.** The curated sets ship as `BiS` / `Alt` / `Realistic`
variants. Recommend pinning **`BiS` only** by default, since `Alt` and
`Realistic` exist precisely to describe *attainable* alternatives and pinning
them would swamp the group. The tags are already per-item, so a three-way
selector is possible later without a data change.

**Interaction with §12's motion rule.** §12 forbids re-sorting during a run and
allows "exactly one animated re-sort at completion". A user-initiated toggle is a
third case and is fine — the objection there is to lists reshuffling *unprompted*
while being read. Worth one clarifying clause so the rule isn't read as
prohibiting this.

### R16 — Filter/group the shortlist by source (e.g. "just Black Temple") · **DECIDED, not applied**

**The feature.** Each ranked item carries its acquisition source, and the user can
filter or group by it — most importantly by raid, so someone raiding Hyjal tonight
can see only Hyjal drops.

This aligns with §1.1's product question better than the unfiltered list does.
"What should I want to drop tonight?" is *inherently* raid-scoped. Treat it as
core to the framing rather than as a nice-to-have.

**The problem: this is the one field the item database doesn't have.** §8.3 and
the R3 discussion already establish that `sources` is null on **1,169 of 2,167
phase-1 epics, including every tier piece**. The plan's response was to never
derive the *pool* from `sources` — which works, because the pool is built from
stats and missing source data is harmless there.

A user-facing **filter** inverts that. Missing source data no longer means "item
still included"; it means **the item silently vanishes from the view**. A
"Karazhan" filter that omits every T4 piece is a far more visible failure than
the one the plan already guarded against, and it fails quietly.

**So source must be a curated field, not a derived one.** Concretely, extending
machinery §8.3 already has:

1. Add `source` as a **required** field on every `data/pools/<spec>.json` entry.
2. The generator pre-fills it from `db.json` where present (R3 makes `db.json` a
   build input anyway) and writes `source: null` where absent.
3. The generator's existing diff mode (§8.3 step 3) **reports unresolved
   `null`s** as a curation gap. Same mechanism as add/drop reporting.
4. A `null` source is a build-time failure for a pool that ships, not a runtime
   shrug.

**"Source" is not a zone string — it needs a discriminated shape.** TBC has at
least eight acquisition paths, and Badge of Justice gear in particular is
*frequently competitive with raid drops*, so a raid-only model strands a major
gearing path:

```ts
type ItemSource =
  | { kind: 'raid';    zone: string; boss?: string }
  | { kind: 'token';   zone: string; boss?: string; token: string }  // see below
  | { kind: 'badge';   cost: number }
  | { kind: 'crafted'; profession: string }
  | { kind: 'rep';     faction: string; standing: string }
  | { kind: 'heroic';  dungeon: string }
  | { kind: 'pvp';     via: 'arena' | 'honor'; season?: number }
  | { kind: 'world' }
```

**Tier tokens are the case that matters most, and they're two-hop.** A user
filtering "Black Temple" *wants* their T6 pieces listed — but the armor piece is
bought from a vendor; the **token** is what drops in BT. That two-hop indirection
is exactly why tier has no source in the database.

So `{ kind: 'token' }` must carry the **zone the token drops in**, and the raid
filter must match on it. Model tier as a vendor item with no zone and it falls
out of every raid filter, which defeats the entire feature for the most contested
gear in the game.

Token groupings are per-tier data and change at T6 — T4/T5 use
Champion / Defender / Hero, T6 switches to Conqueror / Protector / Vanquisher,
*and the class groupings differ between them*. Verify against Wowhead before
committing a mapping; the domain reference flags its own table as unverified.

**Display-only, same as R15.** Filtering changes no simulation input, so it must
not enter `contentHash`, needs no re-sim, and doesn't belong on `RankInput`. Two
interactions to get right:

- **This is now the second mechanism that hides rows**, alongside §10's
  below-cutoff expand ("hidden, never deleted"). Decide how they compose — most
  likely: filter first, then apply the cutoff *within* the filtered view, since a
  2 DPS gain may be the best thing available in one specific raid.
- **Keep `rank` absolute, not per-filter.** Renumbering inside a filtered view
  shows "rank 1" for an item that is 12th overall, which misleads on exactly the
  question the tool exists to answer. Show the true rank and let the filter remove
  rows around it.

**Explicitly out of scope: attunement.** Filtering to a raid the player can't
enter yet is their business — modelling attunement state is the kind of user
context §1.1 rules out. Noted here so nobody builds it on the grounds that it
"completes" the raid filter.

---

## Blocking

### R3 — `--tags=with_db` is not a way to read the item database

§17 concludes: *"Item DB is not [in git]; the binary ships with it
(`--tags=with_db`), so we never vendor it."*

`wowsimcli` has exactly three subcommands: `sim`, `decodelink`, `version`. There
is no dump or query mode. The embedded database lets the **simulator** resolve
item IDs; it gives **us** no read access to item data.

But item data is needed in at least three places:

- §8.3 step 1 — "EP-scores every equippable item" needs stats, slot, armor type,
  quality and **phase** (now load-bearing per R2) across all 8,257 items
- `RankedItem.name` and `.slot` (§4)
- `setBonusNote` needs set IDs

**Fix.** Treat `assets/database/db.json` as a required **build input**, pinned to
the same wowsims release as the binary. Have the pool generator read it and
**bake `name`, `slot`, `setId` and `phase` into `data/pools/<spec>.json`**. Then
nothing at runtime needs the DB, and §17's "don't vendor the DB" stays true where
it was actually trying to be true.

### R4 — The gem solver doesn't price socket bonuses

§9's repair algorithm: *"while the meta is inactive, recolour the socket whose
change costs the least EP."*

Items grant a **socket bonus** only when every socket holds a colour-matching
gem. Recolouring to satisfy a meta condition can break that match and forfeit the
bonus. If the cost function prices only the gem's own stat delta, the solver will
take a recolour that loses 4 stats of socket bonus to save 2 stats of gem — and
report it as the minimum-loss repair.

**Fix.** `cost = ΔEP(gem) + EP(socket bonus forfeited, if this recolour breaks the match)`.
It has to be inside the cost function; a post-hoc check picks the wrong move and
then notices.

Two further gaps in the same section:

- **Palette filtering is unspecified.** Beyond phase (R2), the palette must
  exclude **unique** gems and **Jewelcrafting-restricted** gems. wowsims' own
  filter does all three.
- **Professions are not modelled at all**, so JC-only gems and
  profession-locked items leak into both the palette and the pool. Professions
  aren't reliably available from combatant info, so the honest move is to exclude
  profession-restricted gems and items outright and record it as a stated
  assumption.

---

## Significant

### R5 — With `seMethod: 'independent'`, the 1 DPS cutoff sits below the noise floor

§10 hedges that the variance reduction from shared seeds "may be small." The
measurement says otherwise: at 5,000 iterations on ret gear, repeated runs of
*identical* gear with **independent** seeds spread across **1.58 DPS**; with a
**shared** seed that collapses to **0.06 DPS**. Roughly 25×.

The Phase 1 consequence is concrete. The plan shares seeds (correct) but
*reports* independent SE, which is on the ~1.5 DPS scale. Tie groups form from
overlapping intervals, and the cutoff is "~1 DPS or 0.15%" — below that scale. So
a large part of the shortlist collapses into one tie group and is displayed as
undifferentiated, whatever length the list is.

**Fix, cheapest first.** Raise the cutoff to **2–3 DPS**. It's above the noise
floor, it costs nothing, and it makes the displayed ordering honest. Then run
§10's five-seed spread experiment to find out what the real number is — that
experiment currently sits as a Phase 1 *exit* item, and it wants to happen
before the cutoff is chosen rather than after. Paired-replicate SE for the top
~8 stays a Phase 2 refinement; it buys resolution, not correctness.

> **Scope note:** this is a statistics finding, not a game-domain one. It's in
> this document because it changes what the user sees, not because the plan
> misunderstands TBC.

### R6 — `IndividualSimSettings` → `RaidSimRequest` conversion is unnamed work

§8.2 decodes a share link and commits the result as the spec preset. Share links
carry **`IndividualSimSettings`**. `wowsimcli sim` consumes **`RaidSimRequest`**.
Different protobuf messages. §12 notes the distinction for the *export* path;
§8.2 never acknowledges it for the *import* path.

So `data/presets/ret/*.json` holds `IndividualSimSettings`, and something must
lift the player into a raid, attach buffs/debuffs and set the encounter.
Presumably the `compose` stage — but the plan never says, and confusing these two
messages is called out in the domain reference as an easy and common mistake.

**Fix.** Name the conversion and its owning stage. Make the preset filename say
which message it holds.

**Related cache-correctness nit.** `SimRunner.run(req, { seed, iterations })`
passes seed and iterations *outside* the request, but in protobuf they live
*inside* `RaidSimRequest.simOptions`, so the runner must mutate. §7 then keys the
sim cache on `hash(RaidSimRequest) + simVersion + seed + iterations`, which
double-counts if hashed post-injection. **Specify: hash pre-injection.**

### R7 — `readGear` returning `talents` invites an uncatchable bug

§5.2: `readGear(f): Promise<LoggedGear>  // items, gems, enchants, talents, provenance`

**Individual talent selections are not present in TBC log files.** Only the
per-tree point distribution is, via `talentPoints` on the combatant record. You
cannot build a sim talent string from `[0, 5, 51]`.

The plan is safe in practice — §5.4 uses preset talents — but a field named
`talents` on the gear record will eventually be wired into the sim by someone who
reads the type and reasonably assumes it's usable. The resulting run would
succeed and return a plausible wrong number.

**Fix.** Rename to `talentPoints: [number, number, number]` and document it as
spec-detection input only, never a sim input.

**The larger issue this exposes.** §4 defines `substitutions` as "every field we
invented rather than read," and §9 uses it for meta repairs — framing
substitutions as *exceptional*. But talents, APL, buffs, consumes and the
encounter profile are **all** invented on **every** run, and that gap is far
larger than a gem recolour. If `substitutions` is honest, every ranking carries
five entries before anything unusual happens. Design the assumptions drawer for
that, or it will quietly under-disclose the biggest approximation in the tool.

### R8 — Hit-cap path dependency will be misread as multiple upgrades

Ret's dominant gearing constraint is the **9% yellow (melee special) hit cap**,
about 142 hit rating — 8% base miss vs a level 73 boss plus 1% hit suppression.
Stat value is **discontinuous** there: hit is often the most valuable stat on the
sheet right up to the cap and worth approximately zero past it.

So if a player is 20 rating under cap, three different items each carrying 20 hit
will each sim as a large gain — but taking one erases most of the other two's
value. The ranking presents them as three independent upgrades.

Per the scoping principle ("rank each item on its own merits, don't model the
user's context") this behaviour is **correct** and combinations should not be
modelled. But it is a known misreading trap, and the engine already has
everything needed to flag it — baseline hit versus cap is one subtraction.

**Fix.** A `hitDriven` flag on `RankedItem`, or a banner: *"you're 20 rating under
the hit cap — several of these fill the same gap."* Near-free, and it prevents the
most likely way a user acts wrongly on a correct ranking.

**Unmentioned and related: race must come from the log, not the preset.** Draenei
*Heroic Presence* grants +1% hit to the party, moving the effective cap by ~16
rating. If the preset's race differs from the player's, every hit-adjacent
ranking shifts. `wcl_probe.py` does not currently look for race — add it.

### R9 — The `/c/` route is the WCL point-budget hole

§12's `/c/$region/$realm/$name` resolves and renders gear before the user
commits. That is the right call for trust and I'd keep it.

But WCL rate limiting is a **points-per-hour budget**, and "list recent
qualifying fights" is a **live** query that cannot be cached indefinitely — while
gear snapshots, being immutable per fight, can. This route fires for anyone who
types any name into an unauthenticated form.

**Fix.** Short TTL on the fight-list query specifically, plus per-IP rate
limiting. Neither is mentioned. Given that commercial use requires prior
approval, an open public form over a live query is the most likely way to get
throttled or noticed.

**Also:** §4 states cost as "up to one WCL query." Resolving a character, listing
fights and reading combatant info is at least two or three GraphQL operations,
more via the events fallback. Restate the budget in **points**, not queries —
`rateLimitData` is introspectable, so measure it in Phase 0 (the gate already
asks for this).

---

## Minor

### R10 — `decodelink` exists

§8.2 flags it as unconfirmed and scopes a fallback. It is a real subcommand. Keep
the fallback scoped anyway — the zlib+base64 codec over `IndividualSimSettings`
is needed for the **export** side regardless, so it isn't wasted work.

### R11 — Equippability cannot come from `classAllowlist`

It is empty on essentially all items in the database. §8.3's "every equippable
item" must derive equippability from **armor type + weapon type**. For ret
specifically: plate, and paladins cannot use polearms or staves — a naive "2H
weapon" filter will happily include both.

### R12 — Feral's disambiguation rule should be data, or the Phase 2 gate fails on a technicality

§5.4 says the bear/cat split lives "behind `GearSource.findFights` as a per-spec
confidence field, not a branch in the engine." But *computing* it is a branch
somewhere, and §14's Phase 2 gate demands feral ship "without a structural change
to `rankUpgrades` or its seams."

**Fix.** Declare the rule declaratively in the preset, e.g.
`{ disambiguate: { buff: 'Bear Form', maxUptime: 0.2 } }` — matching how WCL
itself splits feral, on Bear Form uptime against an 80% threshold combined with
tank-detection checks. Then the gate is genuinely testable rather than a judgment
call about what counts as "structural."

### R13 — Pool density is too conservative

§8.3 targets 3–5 options per slot (~60 candidates), and rings/trinkets double via
`slotChoice: 'a' | 'b'`.

Budget check: ~1,000 iterations per 0.4s per core → 5,000 iterations ≈ 2s.
Sixty candidates ≈ 120 core-seconds ≈ **~17s on 7 cores**. The plan's own budget
is "tens of seconds to a couple of minutes." There is room for 150+ candidates.

Since a static per-spec pool cannot know *this* player's hit gap (R8), widening
the pool is a cheaper and more robust hedge than tuning EP weights. Note also
that EP is a **local linear approximation evaluated at one point in gear space**,
computed on reference gear rather than the player's — it degrades with distance
and breaks at caps. The plan correctly uses it only as a shortlisting filter;
widening the pool just makes that filter less likely to be the thing that loses
the right item.

Unhandled in the same area: **unique-equipped** constraints, and candidates the
player already wears.

### R14 — Enchant ID schemes

The old `wowsims/tbc` presets store enchants by **item ID** (e.g. 29192); the
current `tbc-new` stores them by **effect ID** (e.g. 3003). The plan is safe
because it decodes from `tbc-new` and explicitly rejects porting old presets.
Worth one line in an ADR so that a future "let's just borrow the old repo's
presets, they cover all five phases" idea doesn't silently break every enchant.

---

## §12 checklist coverage

| Check | Verdict |
|---|---|
| Baseline and candidates share a seed | **Pass** — §10, explicit and well reasoned |
| Accounts for sampling error | **Partial** — see R5; the cutoff is below the reported noise floor |
| Assumes `wowsimcli` bulk/droptimizer mode | **Pass** — no such assumption |
| Treats EP as final answer | **Pass** — used as a pool filter only |
| Assumes shipped EP presets fit arbitrary gear | **Partial** — see R13 |
| Treats stat value as linear | **Pass** for ranking (real sims); **gap** in user-facing reading — R8 |
| Enforces meta activation itself | **Pass** — §9, correctly identifies the Go sim does not |
| Gem phase / uniqueness / profession gating | **Fail** — R2, R4 |
| Handles enchants on swap | **Pass** — §9 rule 4 |
| Set-bonus breakage can be legitimately negative | **Pass** — `setBonusNote`, and a Phase 1 gate item |
| Fixed encounter profile stated | **Pass** — in `assumptions` and the drawer |
| Pool built from drop-zone data alone | **Pass** — explicitly refused, twice |
| Badge / crafted / rep / heroic covered | **Partial** — via manual curation only; R16 makes `source` a required curated field with generator gap-reporting, which closes most of this |
| Assumes uniform preset coverage | **Pass** — sidestepped entirely by §8.2 |
| Treats old `wowsims/tbc` presets as current | **Pass** — see R14 for the trap |
| Assumes `classAllowlist` constrains equippability | **Fail** — R11 |
| Confuses `RaidSimRequest` / `IndividualSimSettings` | **Partial** — R6 |
| Assumes individual talents recoverable | **Pass in effect, risky in shape** — R7 |
| Assumes rankings cover all fights | **Pass** — events fallback planned |
| Budgets for rate limit; caches gear permanently | **Partial** — R9 |
| Assumes enchant/gem IDs present unverified | **Pass** — Phase 0 gate blocks on exactly this |
| Requires context the tool lacks | **Pass** — §2 is disciplined about this |
| Presents sim baseline as the player's DPS | **Pass** — §2, and a risk row |
| Hardcodes a current phase | **Fail → resolved by R2** |
| Pins `wowsimcli`, version-stamps caches | **Pass** — `simVersion` inside `contentHash` |

---

## Addendum — re-review against Phase 0 findings (2026-07-26, later same day)

Re-read against the current `PLAN.md` (now carrying `[P0]` markers) and
`docs/phase0-findings.md`. No git diff available — `PLAN.md` is untracked — so
this is a content comparison against the rev reviewed above.

### Absorbed into the plan; no longer action items

| Finding | Status |
|---|---|
| **R3** (`db.json` as build input) | **Absorbed and extended.** §17 corrected; `--tags=with_db` mechanism retired. Extended usefully: P0 §6 found the item DB is also needed at *runtime* by normalization, for socket/enchantability metadata on items the player already wears — which the pool file wouldn't contain. Hence `data/items/index.json` covering all equippable items, "not just pool members". My original fix was too narrow. |
| **R7** (talents) | **Absorbed, and the reality is worse than assumed** — see R18. |
| **R9** (points not queries) | **Absorbed.** Measured at ~10.6 points per cold resolve against 3,600/hr ≈ 340 resolves/hr. Correctly downgraded for solo use while keeping the `/c/…` live-query concern for anything public. |
| **R12** (spec classification) | **Absorbed and generalized correctly.** P0 §4 found `subType` returns class-level strings only — no spec label for *any* class. Now two-level in §5.2: talent-tree plurality for all specs, behavioural uptime for feral only. This is a better structure than my finding proposed. |
| Gems/enchants present in TBC logs | **Risk retired.** The apparent 10/19 and 7/19 sparsity traced to slot *eligibility*, cross-checked item-by-item against `db.json` sockets. Good verification — this was the plan's single biggest unknown. |

### R2 is now empirically confirmed, and still not applied · *blocking*

Both Phase 0 fixture characters — `slamaltman` and `shredzepelin` — are logged on
**Hydross the Unstable, SSC/Tempest Keep**. That is **P2 content**.

Meanwhile `PLAN.md` line 27 still reads `Retribution paladin, Phase 1 (T4/P1)`
and line 128 still `contentPhase: ContentPhase // 'p1'`.

So the plan's own fixture gear, chosen independently, demonstrates R2: rank
`slamaltman`'s real SSC gear against a P1-only pool and essentially every delta is
negative. This is no longer an argument about what players are wearing — it's the
data on disk. R2's `maxPhase` design is unapplied and should go in before
`RankInput` is written against.

### R17 — WCL's 19 slots vs the sim's 17: it's shirt and tabard, *and a reorder* · **NEW**

P0 §6 and §9 log this as "slot-count reconciliation … a manual TODO". It's less
open than it looks. WoW's equipment array is 19 entries 0-indexed:

```
0 head   1 neck    2 shoulder  3 SHIRT   4 chest    5 waist   6 legs
7 feet   8 wrist   9 hands    10 finger1 11 finger2 12 trinket1 13 trinket2
14 back 15 mainhand 16 offhand 17 ranged 18 TABARD
```

Shirt and tabard carry no stats and don't exist in the sim. 19 − 2 = 17. Exactly
the discrepancy.

**The trap is the second half.** The sim's 17-entry equipment format is in its own
fixed order — `head, neck, shoulder, back, chest, wrist, hands, waist, legs, feet,
finger1, finger2, trinket1, trinket2, mainhand, offhand, ranged` — which is **not
WCL's order**. Note `back`: 4th in the sim, 15th in WCL. So reconciliation is two
operations, drop-then-**reorder**, and a plausible-looking implementation that
merely filters out the two empty entries preserves WCL's ordering and silently
mis-slots most of the character. That failure produces a valid `RaidSimRequest`
and a wrong number with no error — the same class of bug §8.1 generates proto
types to prevent.

Verify the index positions against the committed fixture rather than trusting the
list above, then assert the mapping in a test.

### R18 — `talents[].id` is a point count, not an ID · **NEW**

P0 §5: `CombatantInfo.talentPoints` is **absent entirely** — my R7 assumed it was
present and merely misshapen. What's actually there is a `talents` array of
`{id, icon}`, three entries, one per tree, where **`id` is the number of points
spent in that tree** (`[{id: 21}, {id: 40}, {id: 0}]` = 21/40/0).

This is a worse trap than the original R7. A field called `id` on a field called
`talents` that means "points" will be read as a talent identifier by anyone who
doesn't check — `talents.map(t => t.id)` returns `[21, 40, 0]`, which looks
entirely plausible as a list of talent IDs and is nonsense.

**Fix.** Normalize at the seam boundary. `GearSource` should never surface WCL's
shape; it should return `treePoints: [number, number, number]` and the raw
`talents` array should not escape the adapter.

### R19 — Which ID namespace is `permanentEnchant`? · **NEW, promotes R14**

R14 was filed as a note-for-later: the old `wowsims/tbc` presets store enchants by
**item ID** (29192), `tbc-new` by **effect ID** (3003), both present on the same
enchant record.

Phase 0 makes it live. We now read `permanentEnchant` off WCL and will write it
into a `RaidSimRequest`, so the two namespaces meet in production code. P0 §6
confirms the *key exists* and that populated slots match enchantable slots — but
counting slots does not establish which namespace the numbers are in.

Same gap for gems: gem *counts* were cross-checked against `db.json` sockets,
which is good, but nothing yet confirms the gem IDs **resolve** to real gem
records rather than merely being present and plausible.

**Fix — cheap, do it on the existing fixtures.** Take `slamaltman`'s populated
enchants and gems and look every one up in `db.json`. If the enchant numbers hit
`effectId`, we match `tbc-new` and no conversion is needed. If they hit item IDs,
a lookup table is required and R14 becomes real work. Either way it's a few
minutes against data already on disk, and getting it wrong means every enchant is
silently absent from the baseline.

### Still open from the original review

- **R8 (race)** — unaddressed. The probe didn't look for race, so Draenei *Heroic
  Presence* (+1% party hit, ~16 rating of effective cap) remains unverified as
  retrievable. Still worth folding into the next probe run.
- **R10 (`decodelink`)** — correctly listed as still open in both documents. The
  subcommand exists; it has not been run against the pinned binary.
- **R15, R16** — feature additions, not yet applied. R16's `ItemSource` shape
  still wants deciding before the pool format sets.
- **R5** — cutoff still `~1 DPS` in §10.

### One caution on `specID`

P0 §4 offers `CombatantInfo.specID` as a spec signal. Worth noting that TBC has
no native concept of a specialization ID — that only arrives much later in WoW's
history — so any `specID` on a TBC Classic log is something Warcraft Logs
*derived*, not something the client recorded. It may well be reliable, but it is
not primary data.

Prefer **talent-tree plurality as the source of truth** (it's what WCL itself
uses) and treat `specID` as a cross-check. Cheap validation: confirm the two agree
on both existing fixtures before depending on either.

---

## Recommended order

1. **R2** — phase as user-selected `maxPhase`. Touches the interface, so do it
   before anything is written against `RankInput`.
2. **R3** — `db.json` as a build input. Blocks the pool generator entirely.
3. **R8 (race) + R9 (points measurement)** — fold into `wcl_probe.py` while
   Phase 0 is still open and you're already in that file.
4. **R5** — run the five-seed experiment before fixing the cutoff.
5. **R4** — socket-bonus cost, palette filtering. Needed before the gem solver
   is trusted.
6. **R6, R7, R11** — during implementation.
7. **R16's data model** — decide the `ItemSource` shape *before* the pool file
   format is settled, since `source` becomes a required field on every entry and
   retrofitting it means re-curating. The UI half can come much later.
8. **R15** — display-only, so it can land any time after the pool and BiS tags
   exist. The §2 wording amendment should go in now, though, while the reason is
   fresh.
9. **R10, R12, R13, R14** — notes; no action until their phase.

Nothing here changes §3's architecture. These are corrections to the pool, the
preset pipeline, the gem solver and the statistics — the deep module, the three
seams and the content hash all survive intact.

---

## Disposition log — 2026-07-26, applied

All findings are now in `PLAN.md`. Where a finding was applied as recommended,
the plan carries an `[Rn]` marker at the point of change. Three were applied
differently, and those are the only ones worth reading twice.

### Applied as recommended

| Finding | Landed in |
|---|---|
| R2 — `maxPhase` as user input, inclusive | §1.1, §4, §7, §8.3, §9, §14 Phase 5 |
| R4 — socket bonus inside the cost function; palette filtering; professions excluded | §9 |
| R5 — cutoff raised above the noise floor; experiment moved to the *start* of Phase 1 | §10, §14 |
| R6 — `IndividualSimSettings` → `RaidSimRequest` named, owned by `compose`; hash pre-injection | §8.2, §7 |
| R7/R18 — `talentPointsByTree`; raw `talents` never escapes the adapter; two-tier drawer | §5.2, §9 |
| R8 — `CapState`, `hitDriven`, the banner, race from the log | §4, §12, §14 Phase 0 gate |
| R9 — fight-list TTL and per-IP limiting on `/c/…` | §12 |
| R10 — fallback kept scoped; needed for export regardless | §8.2 |
| R11 — equippability from armor/weapon type | §8.3 |
| R14/R19 — enchant namespace as a Phase 0 gate box and an ADR | §14, §16 |
| R17 — 19→17 is drop **and** reorder; own file, own test | §8.4, §5.1, §6 |
| Terminology — delivery *Phase* vs content *tier* | §1.1, throughout |

### Applied differently

**R16 — source data.** The review framed `source` as a curation burden to be
accepted or declined. It's smaller than that: `source` is only needed for **pool
members** (~180 items), not the 2,167 the null-count is drawn from. So the answer
isn't "hand-curate or don't ship the filter", it's a **fill pipeline** —
`db.json`'s own `sources`, then a vendored loot-table dataset
([AtlasLootClassic](https://github.com/Hoizame/AtlasLootClassic), which is
organised exactly as "what drops where" and covers token and badge vendors), then
a human with Wowhead open for the residue. Required field and build gate as
recommended; the `ItemSource` shape adopted verbatim. §8.3.2.

**R15 — the pin toggle.** Kept, but generalised. Rather than one bespoke control,
the display layer borrows **TMB's own vocabulary** — raid filter, boss filter,
slot grouping, and already-have-it greyed rather than hidden — since we export
into TMB's workflow and matching its idiom costs nothing. This folded R15 and R16
into a single `ViewOptions` / `applyView` surface (§4.1) and, as a side effect,
closed R13's loose end about *"candidates the player already wears"*: they're
marked `owned` and greyed, not dropped. Control labels are sourced from TMB's
public wishlist pages and its companion addon, **not** from a live guild view, and
are flagged for confirmation before the Phase 3 UI is built.

### Verified since — three findings moved from "applied" to "measured"

Run 2026-07-26, second sitting. Detail in [`docs/verification-log.md`](docs/verification-log.md).

- **R17 — confirmed and the severity revised upward.** The review named `back` as the reordered slot. Measured against the fixture, a drop-only implementation is wrong in **11 of 17 positions**; only head, neck, shoulder and the three weapon slots survive. Both orders verified — WCL's 19/19 against `db.json`, and the sim's 16/16 against wowsims' own curated ret set, which carries slot-typed enchants and so pins the ordering without the binary.
- **R14/R19 — closed, and R14 turns out not to be real work.** `permanentEnchant` is unambiguously the `tbc-new` `effectId` namespace: 10/10 resolved as `effectId`, 0 as `itemId`, each enchant's type matching its slot. Confirmed again from the other side — upstream's ret set writes `enchant: 3003` on the head, and the logged head enchant is also `3003`. No conversion table.
- **R8 — the race half fails, decisively.** WCL has no race field by any route, and *Heroic Presence* is untracked across 6/6 reports. The review's instinct was right that race matters and wrong that it was retrievable; the deeper point it missed is that **race is only a proxy** — *Heroic Presence* is party-wide, so a non-Draenei grouped with one still gets the hit, and race alone would give the wrong answer in both directions. The plan now carries an assumed race, `capUncertainty: 16`, and a user override, and phrases the banner to match. Both fixture characters being Alliance (where every shaman is a Draenei) is what makes the negative conclusive rather than merely unobserved.

Also settled, and better than the review's framing: **the content-tier default**. Rather than a hand-maintained constant, `DEFAULT_MAX_PHASE` is now wowsims' own `CURRENT_PHASE`, pinned through `data/wowsims.lock.json`. Deriving it from the player's most recent log was considered and rejected — a guild farming Karazhan for badges would read as P1. A change in `CURRENT_PHASE` is the P3 launch signal, which retires the dated risk row entirely.

**R13 — pool density.** The review offered "60 vs 150". Neither, quite. The two
costs are paid in different currencies, so they're separated: the **curated pool
widens to ~8/slot (~180)**, which costs curation and no runtime, while a
**rank-time EP prefilter** picks ~80 to actually sim. The prefilter is the real
change — EP is re-evaluated **at the player's own logged gear**, with hit and
expertise weights **clipped at their remaining gap to cap**, instead of on
reference gear. That addresses R13's root complaint (a static pool can't know this
player's hit gap) one level deeper than widening does, and it subsumes the
narrower *"only widen when hit is involved"* idea: the gap now moves the
**weights**, so an over-cap player also gets hit-heavy items correctly *demoted*.
Costs `epVersion` in `contentHash` and a note that `poolId`/`poolVersion` no
longer describe what was simmed. §8.3.3.
