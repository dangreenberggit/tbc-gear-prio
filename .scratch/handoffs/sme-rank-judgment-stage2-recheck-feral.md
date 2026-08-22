# SME rank judgment — stage2-close recheck, feral characters

Seat: SME (gate-sme), Opus 5. Model self-check passed ("Opus 5" contains
"Opus"). Ticket 252's equality-test misreading of that guard did not recur.

Scope: **shredzepelin and nexess only**, both feral cat, maxPhase 2.
slamaltman was judged `trust-with-caveats` by the previous seat
(`.scratch/handoffs/sme-rank-judgment-stage2-recheck.md`) and is not reopened
here.

## 0. Verdicts

| character | spec / phase | verdict |
| --- | --- | --- |
| shredzepelin | feral cat, maxPhase 2 | **trust-with-caveats** |
| nexess | feral cat, maxPhase 2 | **trust-with-caveats** |

---

## 1. shredzepelin — `trust-with-caveats`

### What was reviewed

- `.scratch/rank-reports/stage2-close-shredzepelin.json` — full `ranking`
  object: 228 pool rows, 14 above cutoff, 13 worn rows, baseline, caps,
  assumptions, substitutions, setBonuses, plausibilityWarnings.
- `data/items/index.json` — stat lines for all 14 ranked rows, all 16 worn
  items, and the four head candidates that drive the largest deltas.
- `vendor/wowsims/db.json` — item type, `armorType`, `classAllowlist`,
  `itemEffects`, and weapon damage for the rows where the stat map alone is
  not the whole item.
- `vendor/wowsims/feral_p2_6p.gear.json` and `feral_p2_9p.gear.json` — the
  pinned upstream P2 feral gear sets, used as an independent corroborating
  source this repo did not author.
- `vendor/tbc-new-fork/sim/druid/` — `items.go`, `forms.go`,
  `feralcat/rotation.go`, to establish what the sim actually does with
  Wolfshead Helm.

Fight: Void Reaver, WCL report `YwahQLgv2jBrZGn6` fight 63. Baseline
2266.9 DPS, stdev 73.8. Cutoff 3.6 DPS / 0.15%.

Baseline gear reads as a coherent mid-T5-progression feral cat set:
Wolfshead Helm, Mantle and Breastplate of Malorne (2pc), Skulker's Greaves,
Edgewalker Longboots, Gloves of the Searing Grip, Vambraces of Ending,
Ring of Lethality, Shapeshifter's Signet, Bloodlust Brooch, Hourglass of the
Unraveller, Terestian's Stranglestaff, Everbloom Idol. Nothing worn is shown
as an upgrade; all 13 worn rows sit at exactly `0.00`.

### The shortlist is believable

I went in prepared to confirm the earlier `do-not-trust` and could not.

The strongest single piece of evidence is that the upstream pinned P2 feral
BiS sets — which this repo did not write — line up with the shortlist almost
item for item. Of the 18 distinct items across `feral_p2_6p` and
`feral_p2_9p`:

- 9 are **already worn** and score `0.00`;
- 6 are **not worn and all land in the top 10**: Merciless Gladiator's Maul
  (#1, +57.2), Belt of One-Hundred Deaths (#2, +48.0), Leggings of Murderous
  Intent (#4, +24.7), Telonicus's Pendant of Mayhem (#5, +12.9), Thalassian
  Wildercloak (#9, +7.8), Tsunami Talisman (#10, +7.2);
- 2 are the 9p-variant alternates and score as small losses against what is
  already worn — Band of the Ranger-General (-4.2), Drape of the Dark Reavers
  (-8.5), which is the expected sign for a swap between two near-equal sets;
- 1 is **absent from the pool entirely** — Idol of the Raven Goddess. That is
  a finding, below.

Command: `node -e` over
`.scratch/rank-reports/stage2-close-shredzepelin.json` cross-referenced
against `vendor/wowsims/feral_p2_6p.gear.json`,
`vendor/wowsims/feral_p2_9p.gear.json` and `vendor/wowsims/db.json`.

Every ranked row is a feral-appropriate item. I read the stat lines rather
than the names. The 42-wide arrays in `data/items/index.json` are positional
against the `Stat` enum in `packages/core/src/proto/common_pb.ts` (~line
1900); indices that matter: 0 str, 1 agi, 2 sta, 17 AP, 19 feralAP, 20 hit,
21 crit, 24 expertise, 31 armor. Ranked rows carry agility, attack power,
feral attack power, hit and crit — no spell power, no intellect, no spirit.
No mail and no plate appears anywhere in the 228-row pool. The two ranked
rows whose `armorType` is 1 (Thalassian Wildercloak, Razor-Scale Battlecloak)
are **cloaks**, which every class wears; that is not an equip-rule violation.

The weapon at #1 is a two-handed maul. Druids can equip two-handed maces, so
that is legal. It is a PvP arena piece and the report labels it
`{"kind":"pvp","via":"arena"}`, which is the honest label — it is a real,
farmable, persistent item, not encounter-only loot. Merciless Gladiator's
Maul carrying 1010 feral attack power against Terestian's Stranglestaff's 829
makes a +57 DPS gain unremarkable, and the arena weapon being the P2 feral
weapon of choice is a well-known TBC fact that the upstream BiS set
independently confirms.

### The one thing that looked like a bug and is not

Head-slot candidates score -208 to -277 DPS against a worn Wolfshead Helm
that carries 10 spirit and 109 armor at item level 45. Nordrassil Headdress
— the druid tier 5 head, 46 str / 33 agi / 43 sta / 341 armor — scores
**-208.3**. On its face that is the shape of a scoring fault: a tier head
losing 9% of total DPS to a level-40 crafted helm.

It is correct. Wolfshead Helm grants +20 energy on every shift into cat form,
and TBC feral cat play used that to powershift. The pinned sim implements
this and, more importantly, **branches the rotation on it** — `Wolfshead` is
a rotation flag set from whether item 8345 is in the head slot
(`vendor/tbc-new-fork/sim/druid/feralcat/rotation.go:52`), and it changes the
energy-pooling decisions at `rotation.go:174` and `rotation.go:260`. Losing
the helm does not cost the helm's stats; it costs the rotation. A druid who
wore T5 head over Wolfshead in P2 was playing a materially worse rotation,
and the magnitude reflects that. The `unique-effect` dead-slot warning on
head is therefore an accurate description of the game, not a hedge.

I record this at length because it is the most alarming-looking number in the
report and the next reader will stop on it too.

### Findings

| finding | severity | evidence |
| --- | --- | --- |
| **Ranged (idol) slot has exactly one candidate — the worn Everbloom Idol — so the shortlist says nothing about a slot that is a live decision in P2.** Idol of the Raven Goddess is in the pinned upstream P2 BiS set for this spec and is absent from the pool entirely. Idol of Terror and Idol of Feral Shadows are likewise absent. A feral reading this report learns nothing about their idol. | **medium** | Per-slot count from the JSON: `ranged 1 \| top: Everbloom Idol(0.0)`. Cross-reference: item 32387 Idol of the Raven Goddess appears in both `feral_p2_6p.gear.json` and `feral_p2_9p.gear.json` but `inPool=false` against `ranking.items`. |
| **Waist dominates the shortlist out of proportion — 5 of 14 ranked rows are belts** (#2 +48.0, #3 +25.7, #6 +11.6, #7 +11.2, #8 +10.9). The top two are believable; four separate sub-BiS belts sitting above the cutoff while whole slots contribute nothing makes the list read as lopsided rather than as a ranked set of decisions. | low | Per-slot grouping of `ranking.items`; the worn belt (Girdle of the Deathdealer, 28 agi / 28 sta / 56 AP / 20 hit) is genuinely the weakest thing worn, so the gains are real — this is a presentation-balance point, not a wrong number. |
| **Three slots (neck, back, waist) have no row for the worn item.** Disclosed accurately: the warning now says the rows were still measured against the worn item and their deltas stand. I confirmed the claim — every one of the 13 worn items that *is* in its pool scores exactly `0.00`, which is what a baseline composed from worn gear produces. | low | `ranking.plausibilityWarnings[0..2]`, `cause: "worn-unrankable"`; and the 13 `0.00` worn rows in `ranking.items`. |
| **Meta gem sockets on candidate items were left empty** — no meta preference is recorded for feral, so socketed candidates are priced without a meta gem's stats or effect. Candidates with a meta socket are therefore priced slightly low relative to the worn baseline. | low | `ranking.substitutions[0]`, `field: "gems.meta-preference"`. **Recalled, unverified:** that Relentless Earthstorm Diamond (3% increased critical damage) is the standard feral meta — I did not check that against repo data. |
| **The head, chest and shoulder pools contain caster cloth** — Crown of the Sun (108 spell power, 49 spirit), Cowl of the Grand Engineer, Uni-Mind Headdress, Robe of the Elder Scribes, Vestments of the Sea-Witch, Masquerade Gown. Druids can legally equip cloth, so this breaks no rule, and all of them score correctly and deeply negative. It is pool noise that costs sim budget and pads the "no positive candidate" slots. | low | Per-slot listing; `armorType: 1` and null `classAllowlist` on those ids in `vendor/wowsims/db.json`. |
| Hit is 125 rating against an assumed cap of 141.9, on an assumed Night Elf with talents taken from the pinned preset rather than read from the log. Rows whose value is mostly hit are priced against an assumption. | low | `ranking.caps.hit`, `ranking.assumptions.standing`. Disclosed, hence a caveat. |

### Rows that look fine

Ranks 1–10 are all either upstream-BiS-corroborated or obvious on their stat
lines. #3 Belt of Deep Shadow and #7 Belt of Natural Power are Leatherworking
crafted belts, correctly labelled as crafted. #6 Girdle of Treachery is
Karazhan Chess Event loot, correctly labelled. #11 Haramad's Bargain is
reputation loot, correctly labelled. Nothing in the list is encounter-only or
non-persistent. Ranks 11–14 are small gains (+7.1 down to +3.8) but all clear
twice their own standard error, so their ordering is judgment, not noise.

### Replicate spread

Not a factor. All 14 ranked rows clear 2×se — measured by the previous seat
and re-confirmed in my own row dump (largest se among ranked rows is 1.39
against a 7.22 delta). Ticket 236's seed machinery cannot explain any finding
in this section.

### Gate

Would a feral druid who knows TBC act on this? For weapon, waist, legs and
neck — yes, without hesitation, and those are the four decisions that matter
most at this gear level. For the idol slot they would get nothing at all, and
they would notice.

### What would have flipped it

- **To `do-not-trust`:** a ranked row the class cannot equip; a worn item
  shown as a nonzero upgrade; the top rows failing to correspond to the
  upstream pinned P2 feral set; or the Wolfshead head deltas turning out to
  be unbacked by a real rotation effect in the sim. None of these hold — I
  checked each one directly.
- **To clean `trust`:** the idol slot carrying real candidates (Idol of the
  Raven Goddess at minimum), and a meta gem preference recorded for feral.

### Contested

**Nothing contested.** The input note's central claim — that the earlier
retraction text was false and the rows in the three worn-unrankable slots
were always measured against the worn item — is consistent with everything I
read. Every worn item present in its own pool scores exactly `0.00`, which is
the signature of a baseline composed from full logged equipment.

I do **not** confirm the earlier `do-not-trust` on this character. On the
merits of the gear, this shortlist is usable.

---

## 2. nexess — `trust-with-caveats`

### What was reviewed

- `.scratch/rank-reports/stage2-close-nexess.json` — 228 pool rows, 12 above
  cutoff, 15 worn rows, baseline, caps, assumptions, substitutions,
  plausibilityWarnings.
- `data/items/index.json` — stat lines for all 12 ranked rows and all 15 worn
  items, decoded through the positional `Stat` enum.
- `vendor/wowsims/db.json` — sockets, socket bonuses, item level and armor
  type for the wrist cluster and the top rows.
- The same two pinned upstream P2 feral gear sets used in section 1.

Fight: Fathom-Lord Karathress, WCL report `4C2fJrMvcjaXL3KN` fight 32.
Baseline 2302.5 DPS, stdev 77.5. Same cutoff, same 228-row pool as
shredzepelin.

Baseline gear is a further-along version of the same set: Wolfshead Helm,
Mantle and Breastplate of Malorne, Leggings of Murderous Intent, Thalassian
Wildercloak, Edgewalker Longboots, Gloves of Dexterous Manipulation,
Shackles of Quagmirran, Ring of Lethality, Overseer's Signet, Worgen Claw
Necklace, Girdle of Treachery, Tsunami Talisman, Bloodlust Brooch,
Terestian's Stranglestaff, Everbloom Idol. All 15 worn rows score `0.00`.

### The shortlist is believable

This one corroborates more cleanly than shredzepelin. Against the pinned
upstream P2 feral sets: **11 of 18 items are already worn** and score `0.00`,
5 more are ranked (Merciless Gladiator's Maul #1 +59.8, Belt of One-Hundred
Deaths #2 +38.0, Vambraces of Ending #3 +17.7, Telonicus's Pendant #5 +15.2,
Band of the Ranger-General #12 +4.8), 1 just misses the cutoff (Gloves of the
Searing Grip +2.6 against a 3.6 cutoff), and 1 is absent from the pool
(Idol of the Raven Goddess). Two upstream items score as losses —
Drape of the Dark Reavers -15.7 and Skulker's Greaves -23.0 — which is
correct, because the character already wears the pieces those two would
displace (Thalassian Wildercloak and Leggings of Murderous Intent, both from
the 6p variant of the same set).

Command: same `node -e` cross-reference as section 1, run against
`.scratch/rank-reports/stage2-close-nexess.json`.

Every ranked row is feral-appropriate on its stat line: agility, attack
power, feral attack power, hit, crit, expertise. **No mail or plate appears
above the cutoff, and none appears in the pool at all.** The head-slot
Wolfshead picture is identical to shredzepelin's (-206.5 for Nordrassil
Headdress) and has the same correct explanation — see section 1.

The two characters agreeing on #1 and #2 while differing in the middle of the
list is what two ferals at slightly different gear levels should produce. That
internal consistency is itself weak evidence the pipeline is behaving.

### The row that looked wrong and is not

Shard-bound Bracers rank #9 at **+10.27** against the worn Shackles of
Quagmirran. Their stat lines are nearly identical — 20 agi / 18 sta / 42 AP /
146 armor versus 20 agi / 18 sta / 40 AP / 128 armor — and Shard-bound
Bracers are the *lower* item level of the two (105 versus 115). A +10 DPS gain
from +2 attack power would be nonsense.

It is not nonsense: Shard-bound Bracers carry a **socket plus a socket bonus**
(`"sockets":[3]`, socket bonus +4 AP in `vendor/wowsims/db.json`) and the
worn Shackles carry neither. A gem in that socket plus the bonus accounts for
the gap comfortably. Item level is the wrong yardstick when one item is
socketed and the other is not.

### Findings

| finding | severity | evidence |
| --- | --- | --- |
| **Ranged (idol) slot has exactly one candidate — the worn Everbloom Idol.** Same defect as shredzepelin, same missing item (32387 Idol of the Raven Goddess, present in both pinned upstream P2 sets). Both runs share a 228-row pool, so this is one pool-level gap showing twice, not two independent findings. | **medium** | Per-slot count: `ranged 1 \| Everbloom Idol(0.0)`. `inPool=false` for 32387 in both reports. |
| **Wrist has three ranked candidates spanning +17.7 to +10.3 and no row for the worn item**, because Shackles of Quagmirran is not in the wrist pool. The three deltas are honest and the disclosure is accurate, but wrist is simultaneously the slot with the most movement in this shortlist and the slot with no visible baseline. That combination is the weakest reading experience in the report. | low | `ranking.plausibilityWarnings[0]`, `cause: "worn-unrankable"`, `wornItemName: "Shackles of Quagmirran"`; wrist rows at ranks 3, 7, 9. |
| **Per-row gem choices are not exposed in the JSON.** The Shard-bound Bracers row above is only explicable through the socket, and I had to reach into `vendor/wowsims/db.json` to find it. A reader comparing two stat lines in the report has no way to see why the lower-item-level bracer wins. | low | `Object.keys()` on the ranked rows returns no `gems` or `enchant` field. |
| **Meta gem sockets left empty**, identical to shredzepelin. | low | `ranking.substitutions[0]`. |
| **Hit is 94 rating against an assumed cap of 141.9 — a 48-rating gap**, materially larger than shredzepelin's 17. Rows carrying hit are therefore worth more to this character than to the other, and that pricing rests on an assumed Night Elf with preset talents rather than anything read from the log. The top of the list is carried by attack power rather than hit, so the assumption is not driving the headline result. | low | `ranking.caps.hit`: `rating: 94, capRating: 141.92, gap: 47.92, capUncertainty: 15.77`; `ranking.assumptions.standing`. Disclosed. |
| **Caster cloth in the head, chest and shoulder pools**, identical to shredzepelin and with the same benign outcome. | low | Same per-slot listing method. |

### Rows that look fine

All 12. Sources are labelled honestly across the mix — arena, honor PvP,
raid, reputation, Leatherworking crafted — and nothing in the list is
encounter-only or otherwise non-persistent. The three reputation rows
(Shapeshifter's Signet, Shard-bound Bracers, Haramad's Bargain) are normal
persistent gear.

### Replicate spread

Not a factor. All 12 ranked rows clear 2×se; the tightest margin is rank 12
(Band of the Ranger-General, +4.81 against se 1.43, which is 3.4×). Ticket
236 cannot explain any finding here.

### Gate

Would a feral druid act on this? Yes for weapon, waist, wrist and neck. The
idol slot is silent, and wrist — the slot with three live candidates — shows
no baseline row. Both are annoyances rather than reasons to distrust the
numbers.

### What would have flipped it

- **To `do-not-trust`:** Shard-bound Bracers turning out to have no socket
  (which would have made +10.3 unexplainable); any ranked row the class
  cannot equip; a worn item shown as a nonzero upgrade; or the ranked rows
  failing to line up with the pinned upstream P2 feral set. None hold.
- **To clean `trust`:** real idol candidates in the ranged slot, and a
  visible baseline row or explicit worn-item stat line for wrist.

### Contested

**Nothing contested.** As with shredzepelin, the input note's claim that the
worn-unrankable rows were always measured against the worn item is borne out:
all 15 worn items present in their pools score exactly `0.00`.

---

## 3. Cross-character notes for engineering

- **The idol gap is one bug, not two.** Both runs share a 228-row pool and
  both have exactly one ranged candidate. Item 32387 Idol of the Raven
  Goddess sits in the pinned upstream P2 feral sets and in neither pool.
  Whatever excludes it excludes it for every feral run. This is the single
  highest-value fix in this pass.
- **Wolfshead Helm will keep looking like a bug.** Any future reader will
  stop on a -208 DPS tier-5 head. It is correct, because the pinned sim
  branches the cat rotation on whether item 8345 is equipped
  (`vendor/tbc-new-fork/sim/druid/feralcat/rotation.go:52`, `:174`, `:260`).
  Consider surfacing that in the `unique-effect` warning text so the next
  person does not re-derive it.
- **`bisTags` against the pinned upstream gear sets is the fastest honest
  check available** and it worked on both characters. The previous seat found
  this for slamaltman; it generalises.
- **Item level is not a usable yardstick when sockets differ.** The
  Shard-bound Bracers row would read as a defect to anyone comparing item
  levels. Exposing the chosen gems per row would remove a whole class of
  false alarm.
- Neither feral report is a noise-ordering problem. Every ranked row on both
  characters clears twice its own standard error.

## 4. Confidence

Moderate-to-good on both. I read stat lines rather than item names for every
ranked row and every worn item, and I resolved the two largest-looking
anomalies (Wolfshead head deltas, Shard-bound Bracers) against sim source and
vendor data rather than leaving them as suspicions. The upstream pinned gear
sets are an independent corroborating source this repo did not author, and
both shortlists line up with them.

Weaker points in my own pass: I did not open either HTML report — I judged
the machine-readable JSON, so I have not verified that the corrected
disclosure text renders as the input note describes. I did not verify the
feral meta gem claim against repo data. I did not independently confirm that
Idol of Terror and Idol of Feral Shadows are P2-relevant beyond their absence
from the pool being suspicious alongside the confirmed absence of Idol of the
Raven Goddess.

Nothing was committed. No git commands were run.
