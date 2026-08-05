# SME critique — pool redesign Options A & B

**Role:** TBC Anniversary retribution (game domain)  
**Audience:** engineering gate (not player loot coaching)  
**Inputs:** `pool-redesign-external-brief.md`, `option-a.md`, `option-b.md`; context from `candidates-origin-sme.md`, `pool-composition-audit.md`, `belt-delta-investigation.md`, recent Loop 1–4 SME rank reviews  
**Not done here:** code, pool regen, land/merge

---

## Scope

Would the shortlists these designs produce look like something a competent Anniversary ret would chase — before sims order them for a specific logged set?

Bar: chase-piece coverage, equip legality, leather exceptions, librams vs bows, 2H path, Kael encounter temps vs keepable loot, plate vs leather/mail, raid vs PvP. Findings are **game facts**. Mapping to design mechanics is allowed only where needed to say whether the shortlist would contain the right items.

---

## Equip rules (must hold under either design)

| Rule | Game fact | Design implication |
|------|-----------|-------------------|
| **Leather / mail BiS** | Ret’s armor class is plate, but some physical BiS are leather (or mail). Belt of One-Hundred Deaths (Vashj) is the canonical waist exception; Mask of the Deceiver, Bow-stitched Leggings, and similar pieces are the same class of exception — not “mistakes.” | Any membership path that only admits plate body armor cannot produce a credible chase list without a special inject. Both options correctly refuse plate-only. |
| **Ranged** | Paladin relic/ranged is a **libram**. Bows, guns, crossbows, thrown are unequippable. Netherstrand Longbow must never appear as a ret upgrade. | Hard filter to librams is non-negotiable. Guides list librams; Option B’s “all librams into Stage-2” matches the game (librams often carry little/no raw scaling stats). |
| **Weapons** | Raid ret DPS chase is **two-hand sticks**. Ret *can* wear 1H + shield; that is not this product’s DPS path. Paladins **cannot** use staves. Paladins **can** use 2H polearms — excluding them is a product choice, not an equip fact. | 2H-only for the ranked path is correct. Staff ban is correct. Polearm include (both options’ default lean) is equip-legal; whether many polearms belong on a ret chase shortlist is a softer product call. |
| **Kael’thas** | Advisor/leg weapons (Netherstrand, Warp Slicer, Devastation, Infinity Blade, Cosmic Infuser, Staff of Disintegration, Phaseshift Bulwark) exist **only inside that encounter** — not keepable gear. Twinblade of the Phoenix is normal persistent loot from that boss. Band of the Ranger-General is keepable jewelry. | Hard exclude encounter-only IDs; keep Twinblade and Ranger-General eligible. |
| **Plate vs leather/mail** | Most body slots are plate chase; leather/mail compete when sockets, expertise, or AP make them win. They must be allowed to compete, not treated as illegal. | Fair competition (A via lists; B via sim) is required. Slight Stage-1 mail demotion in B is a soft bias, not an equip ban — acceptable if leather still reaches Stage-2. |
| **PvP vs raid** | Arena / Glad weapons and gear can be real DPS sticks, but they are a **different chase** than BT/Hyjal/SSC raid goals. Mixing them unlabeled into a “raid tonight” mental model fails the human gate. | Default raid pool should not be flooded with arena seasons. Optional PvP layer or soft demotion after membership is fine; silent omission of every arena stick is also fine if product scope is raid-first. |

Gem naming check: **Sovereign Nightseye** is one purple gem. Irrelevant to membership except do not split the name in audits.

---

## Critique — Option A (lists-first)

### What it gets right (game)

- Membership from wowsims ret gear sets + transcribed phase BiS/alt tables matches how rets already decide what is “chase” before opening a sim.
- Leather/mail chase pieces enter because guides and sets name them — no plate gate.
- Librams enter because guides name them; bows never should if product rules fire.
- Kael temps stay out via the same ID denylist; Twinblade stays if lists cite it (they do).
- Evidence already in-repo: many IDs in pinned `ret_preraid` / `ret_p1` / `ret_p2` sets are absent from today’s pool (Dragonspine Trophy, Bloodlust Brooch, Shapeshifter’s Signet, Justicar Crown, Mask of the Deceiver, etc.). Lists-first would have put those in by construction.

### Coverage of real chase pieces

**Strong for named BiS and common alts** — if transcription includes Alt / hit / craft / badge rows, not BiS-only.

From recent Phase 3 SME loops, a credible P3 shortlist for a mid-P3 set looks like: Torch of the Damned, Cataclysm’s Edge, Twinblade of the Phoenix, Belt of One-Hundred Deaths, Seething Fury / Lightbearer, Band of Devastation, Band of the Ranger-General, Shadowmoon Destroyer’s Drape / Cloak of Darkness, Bow-stitched Leggings, Onslaught / Lightbringer / Bulwark chests and legs, Libram of Avengement (and peer librams). Option A’s union of Anniversary Wowhead tables + wowsims sets through P2 is the path most likely to contain that universe without rediscovery luck.

### Guide blind spots (game risk)

Guides under-emphasize pieces competent rets still chase as **alts**:

- Craft: Red Belt of Battle, Swiftsteel Bracers, **Bindings of Lightning Reflexes** (already flagged as a soft wrist miss in Loop SME), Bulwark of the Ancient Kings / Kings.
- Hit / expertise fillers when a set is starved (rings, necks, cloaks that are “not BiS” but real upgrades off weak slots).
- Badge / rep / crafted sleepers that appear in one guide’s alt column and not another.
- Cross-class leather that wins as a single swap (Bow-stitched) only if the alt table is dense enough.

**Density gate (0–2 = block ship)** is the right game instinct. BiS-only union would fail that gate and fail the mid-gear player.

### Anniversary vs Classic TBC divergence

Anniversary patch/meta and guide dates matter. Classic-era or 2021-era tables can disagree with Anniversary BiS pages on:

- Which leather exceptions are “real BiS” vs optional
- Arena season stick priority vs raid sticks
- Craft competitiveness after patch changes

Option A’s mitigation (prefer Anniversary-dated pages, lock `retrievedAt`) is necessary, not optional. Stale transcription is the main way A produces a **wrong** chase list while still looking authoritative.

### Stale wowsims sets

Pinned wowsims ret sets stop at **P2**. Using archived old-tbc P3–P5 sets as seed IDs is **risky game content** — those encode older understanding. Flagging `stale-seed` and requiring Wowhead spot-check before ship is correct. Prefer Anniversary Wowhead as authority above P2; treat old wowsims P3+ as disagreement noise until verified.

### Alt / hit pieces

Without mandatory Alt / hit / craft roles in manifests, Option A collapses to “export the BiS sheet,” which is **not** the same as a relative-upgrade candidate universe. A mid-gear ret chasing off Shattrath legs / Endless Pit / Kara cloak needs the alt ladder, not only Torch and Vashj belt.

**Open question A must answer in game terms:** how many alt tiers per slot before the pool is chase-credible for non-BiS characters? SME answer: at least primary BiS + close second + one craft/badge path + one prior-phase holdover for slots that stay competitive (trinkets, rings, librams, weapons).

### Option A failure modes that matter to the gate

1. Stale or Classic-not-Anniversary guides → wrong chase names.  
2. BiS-only / thin alts → missing Bindings / Red Belt / hit fillers.  
3. Transcription wrong itemId → silent wrong piece (CI id/slot check helps).  
4. PvP included because a guide mentions Glad weapons → raid shortlist pollution unless tagged/excluded by default.  
5. Set pieces included (good) but readers must still understand single-swap can look weak — that is sim truth, not a pool bug.

---

## Critique — Option B (multi-shell sim membership)

### What it gets right (game)

- Drops plate-only body gate: leather/mail can compete; Belt of One-Hundred Deaths need not be a special inject to be *eligible*.
- Librams hardbanded: correct — many librams do not look like “good EP sticks” on raw stats.
- Effect-bearing trinkets hardbanded: Dragonspine Trophy / Bloodlust Brooch–class procs are not linear armor.
- Stage-1 weapon white DPS before Stage-2: addresses the known game failure where hit-heavy weak sticks outrank Twinblade / Gorehowl–class weapons on stat-only scoring.
- Multi-shell (hit-starved vs capped vs mid) matches real ret nonlinearity: hit value collapses past softcap; expertise on Human vs other races changes belt/ring value (belt investigation: Human nearer expertise cap clips belt expertise value).
- Kael denylist + Twinblade eligible: correct.
- Polearms in universe: equip-legal.

### Do multi-shell sims capture chase reality?

**Partially — contingent on shell recipes.**

Membership score = max Δ (or union of per-shell top-K) on **single-slot swaps** against pinned shells. That rediscovers chase pieces **only if**:

1. Stage-1 still admits them (ilvl/sockets/set hardbands), and  
2. At least one shell’s worn piece in that slot is weak enough that the chase item wins top-K.

**Game risks:**

- **Shell already near BiS in a slot** → famous chase piece looks flat/negative and falls out of top-K. Example: a mid shell that already wears a strong waist may never promote Belt of One-Hundred Deaths, even though that belt is *the* P3 waist chase for many logged sets wearing Endless Pit / craft.
- **Shells too similar** (all capped plate mid-tier) → hit fillers and leather exceptions that matter for starved or leather-leaning sets never win a shell. Starved shell is mandatory; without it, Option B re-creates “only capped BiS looks good.”
- **Set bonuses** — single-slot swap on a no-set shell undervalues Onslaught / Lightbringer / Crystalforge chase. Set-break shell + Stage-1 set auto-include are load-bearing, not optional polish.
- **Trinkets / librams** — hardbands into Stage-2 are the correct game move; ranking them by low-iter Δ is fine for membership if noise is controlled. Do not let Stage-1 struct (ilvl) starve these slots.

### Shell choice risk (primary game objection to B)

Shell construction from “max white_dps weapon ≤ phase + high-ilvl plate” can **smuggle a plate-heavy, guide-free BiS skeleton** that still fails Anniversary chase intuition:

- Underranks leather competition if Stage-1 mail bias + plate-heavy shells never let leather win Δ.  
- Overranks high-ilvl PvP / wrong-flavor plate that sims okay on that shell but no ret would chase as raid prio.  
- Misses craft alts that lose slightly on the mid shell but win on real mid-gear characters (Red Belt, Bindings).

Without a **golden chase-ID list** (leather belt, Twinblade, Gorehowl, key librams, DST, etc.), engineering cannot know Stage-2 failed the game — and that golden list is essentially Option A’s thesis admitted through the back door.

### Effect slots

Hardband all librams + effect trinkets: **approve**. Softcaps and sockets alone do not explain relic/trinket chase. Stage-2 cost on “all effect trinkets” must stay phase-bounded so P5 junk procs do not crowd out Dragonspine / Bloodlust–class peers.

### Leather competition under B

Eligibility is fixed. **Promotion** is not. Leather BiS often win on sockets + expertise/AP under gem fill. If Stage-2 gem fill under-ranks socketed leather (wrong gem heuristic), Belt of One-Hundred Deaths can lose membership even while eligible — same class of failure Loop 4 saw when ungemmed Softcap fill preferred Glinting + Sovereign Nightseye over Bold×2 on that belt. B’s note to reuse production softcap-aware fill is game-critical.

### Option B failure modes that matter to the gate

1. Shell coverage holes → miss leather / hit / set chase.  
2. Low-iter noise → flip near-ties (trinkets, librams, close belts).  
3. Stage-1 ilvl flood → PvP and classic leftovers consume quotas before real P3 chase arrives (per-phase quotas help).  
4. Set under-sampling without set-break shell.  
5. Temptation to put linear weights back into Stage-1 — would recreate today’s weapon/leather blindness.

---

## Head-to-head (game credibility)

| Question | Option A | Option B |
|----------|----------|----------|
| Would famous P2/P3 chase pieces appear? | **Yes**, if transcription + wowsims union is complete | **Maybe**, if shells + Stage-1 + hardbands promote them |
| Leather BiS without special inject? | Yes (lists name them) | Eligible yes; membership depends on Δ vs shells |
| Librams only, no bows? | Yes with product rule + guide content | Yes with Stage-0 + hardband |
| Kael temps excluded / Twinblade kept? | Yes | Yes |
| Alt / craft / hit coverage for mid-gear? | Strong if Alt roles required; weak if BiS-only | Weak unless shells span mid-gear poverty |
| Anniversary-correct names? | Depends on guide freshness | Depends on sim model + shell recipes; no editorial Anniversary check |
| PvP pollution? | Controllable via default-off arena | Controllable via quotas / soft demote; sim may still promote Glad sticks |
| Aligns with “what a ret would chase”? | **Directly** — chase lists *are* that social object | **Indirectly** — rediscovers chase via sims; can diverge from community chase without failing a numeric test |

**Credibility verdict between the two:** Option A produces a shortlist that *looks like* a ret chase list by construction. Option B produces a shortlist that *sims well against its shells* — which is related but not identical to “pieces Anniversary rets actually chase,” especially for alts, crafts, and leather exceptions on the wrong shells.

---

## What must appear in any credible P2 / P3 pool

Concrete examples (not exhaustive). Absence of several of these without a written game reason fails the SME gate.

### Persistent rules (both phases)

- **Ranged:** Libram of Avengement, Libram of Zeal / Absolute Truth (and peer ret librams in phase) — **no** bows/guns.  
- **Kael:** Twinblade of the Phoenix eligible; Netherstrand / other encounter-only legendaries **absent**.  
- **2H path only** for weapons; no caster 1H (Tempest of Chaos), no staff.

### Phase 2–leaning chase

- Weapons: Twinblade of the Phoenix, Lionheart Executioner / Champion (and peer physical 2H of the tier).  
- Trinkets: Dragonspine Trophy, Bloodlust Brooch.  
- Jewelry / cloak / misc often in sets: Shapeshifter’s Signet, Mithril Chain of Heroism, Vengeance Wrap (as cited in wowsims-set miss lists).  
- Armor: Justicar / Crystalforge Battlegear pieces that rets actually wear; Mask of the Deceiver where guides/sets treat it as a real head option.

### Phase 3 chase (BT / Hyjal / SSC leftovers)

- Weapons: Torch of the Damned, Cataclysm’s Edge, Gorehowl, World Breaker, Soul Cleaver (physical BT/Hyjal ladder); Twinblade still relevant as keepable Kael stick.  
- Waist: **Belt of One-Hundred Deaths**; Seething Fury; Belt of the Lightbearer; craft **Red Belt of Battle** as alt.  
- Legs: Bow-stitched Leggings; Onslaught Greaves; Legguards of Endless Rage.  
- Rings: Band of Devastation; Band of the Ranger-General.  
- Back: Shadowmoon Destroyer’s Drape; Cloak of Darkness.  
- Chest / set: Onslaught / Lightbringer Battlegear pieces; Bulwark of the Ancient Kings (craft) as common alt.  
- Wrists: Swiftsteel Bracers; **Bindings of Lightning Reflexes** as craft competitors.

Arena Glad / Merciless / Vengeful 2H may appear as optional PvP-tagged rows; they must not be the only weapon ladder and should not dominate an unlabeled raid shortlist.

---

## Verdict

**Option A better serves a real Anniversary ret shortlist** for game credibility — provided manifests are Anniversary-dated, Alt/craft/hit rows are mandatory, wowsims sets through P2 are unioned in full, and P3+ does not rely on unverified stale wowsims seeds.

**Option B is not game-illegitimate**, and its equip universe + libram/trinket hardbands + white-DPS weapon narrow are the right *hygiene* relative to today’s plate/EP blindness. As a **sole** membership engine it is weaker: shell choice can miss leather BiS, crafts, and hit alts that define real mid-gear chase, and proving it did not miss them requires golden chase IDs that are list knowledge by another name.

**Neither alone is perfect.**

- Prefer **A as primary membership**.  
- Borrow **B’s Stage-0 equip rules** (leather/mail, libram-only, Kael denylist, 2H + polearm policy made explicit) and **B’s refusal to use linear reference scores as a membership cut**.  
- Keep a short **golden chase-ID oracle** (must-contain for P2/P3) for CI — game regression, not runtime FORCE theater.  
- Do **not** ship B’s multi-shell membership without that oracle and without starved + set-break shells proven against the must-appear list above.

**Gate answer:** Would a competent ret trust the resulting candidate universe?  
- **A (done properly):** yes.  
- **B (alone):** only after goldens prove the shells rediscovered the same chase names — until then, do not trust.
