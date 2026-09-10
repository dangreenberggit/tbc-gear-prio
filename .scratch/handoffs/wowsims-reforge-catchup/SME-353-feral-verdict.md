# SME verdict — ticket 353 acceptance box 4 (feral rotation, above-cutoff jump, Bonereaver's Edge, EP weights)

Seat: `gate-sme` (Opus). Branch `feat/wowsims-reforge-catchup`, tip `ad7f2d7`.
Audience: the engineering team. Read-only session; no file outside this one was
touched, no git write was run.

**Verdict: `trust-with-caveats`.** Nothing here blocks the merge on domain
grounds. Details per question below, and the one thing that is genuinely
unmeasured is named in D.

---

## Summary table

| Q | Subject | Verdict |
| --- | --- | --- |
| A | −18 DPS feral rotation regression | **EXPECTED** — and the premise is stale; it was already measured away and reversed in sign |
| B | 15 → 27 above-cutoff rows | **EXPECTED** — pool grew ~60% and the baseline moved; ret's own base rate is 43/357 |
| C | Bonereaver's Edge (17076) | **EXPECTED** — real item, real proc, correct attribution, correctly excluded from the P3 pool |
| D | Feral EP weights computed on an older engine | **EXPECTED for the displayed ranking, NEEDS-MEASUREMENT for capped runs and gem choice** — safe by default, but the preset file's own scope note is wrong |

---

## A. The −18 DPS feral rotation regression

### The claim is stale, and the repo already knows it

Ticket 353 §4 says the prior pin review "recorded a **−18 DPS feral rotation
regression** ... with no domain look". The first half is true of the review
file. The second half is **not true of the repo**: an SME seat measured this,
reversed it, and closed the ticket three weeks ago.

`contested:` ticket 353 §4 states as fact that the −18 DPS feral rotation
regression is a domain question "nobody has answered". It was answered on
2026-08-21, the −18 figure was superseded, and the sign of the effect is the
opposite of the one the ticket carries forward.

Evidence, read from the repo:

- `.scratch/carry-forward/issues/250-feral-rotation-regression-unreviewed.md`
  is `Status: closed`. Its own line 23 flags the −18 sentence: "**This sentence
  is wrong and is corrected below**". Its acceptance boxes are all ticked.
- `docs/verification-log.md:1654-1669`, "Ticket 250, re-measured and closed":
  three arms, 20000 iterations, seed 42, on the pinned binary —

  | arm | rotation | consumables | DPS |
  | --- | --- | --- | --- |
  | Arm 1 | tip (22 actions) | tip | **782.14** |
  | Arm 2 | old (12 actions) | old | 740.67 |
  | Arm 3 | old (12 actions) | tip | 739.23 |

  Rotation main effect = Arm 3 − Arm 1 = **−42.91 DPS in favour of the new
  rotation**, against a pre-registered 2×combined-SEM bound of 1.38. Arm 2
  reproduces the old 740.67 to the cent, so **722.55 was the stale half of the
  original pair**, not 740.67.
- Prior SME handoff: `.scratch/handoffs/sme-rank-judgment-stage2-close-ticket-250.md`,
  verdict `trust-with-caveats`. It already carried the same `contested:` note.

Commands that read the above:

```
grep -n "Ticket 250" docs/verification-log.md
sed -n '1654,1680p' docs/verification-log.md
head -3 .scratch/carry-forward/issues/250-feral-rotation-regression-unreviewed.md
```

The domain reasoning the earlier seat recorded is sound and I endorse it on the
counts, not just the mean: powershifts 39.1 → 46.8, Shred 47.6 → 50.8,
Ferocious Bite 3.9 → 5.8, Mangle 14.5 → 17.5, with Rip flat at 10.3 → 10.1.
That is the correct shape for a feral gain — more shifts feeding Shred and
Bite while Rip stays a maintenance debuff. A gain driven by over-Ripping would
have been the artifact tell, and it is absent. Per-iteration stdev 32.23 (new)
vs 91.86 (old) is a second, independent statistic pointing the same way: the
old list is ~3× noisier, which is what an energy-starved feral APL looks like.

### The APL rewrite does not reach this repo's skeleton — confirmed

`scripts/build_feral_skeleton.py:64` sets
`FERAL_APL = ROOT / "data/presets/feral/owner-p2.settings-export.json"`, and
`FERAL_APL_PATH = ("player", "rotation")` at line 65. The rotation is read from
the **owner's own settings export**, a committed file, not from
`vendor/wowsims/feral_default.apl.json`. So upstream's 104-line APL rewrite in
this pin move **cannot** move this repo's feral numbers.

Measured, not assumed — the committed skeleton's rotation is unchanged in
shape:

```
python -c "import json;r=json.load(open('data/presets/feral/p2.raid-sim-skeleton.json'))['raid']['parties'][0]['players'][0]['rotation'];print('prepull',len(r.get('prepullActions') or []),'priority',len(r.get('priorityList') or []))"
```
→ `prepull 1 priority 22`

**Engineering note (small, not a blocker).** The docstring of that same script,
line 19, still reads "rotation: merged from the pinned
vendor/wowsims/feral_default.apl.json". That contradicts line 64 and is exactly
the sentence that would mislead the next reader into thinking upstream's APL
rewrite lands here. Worth a one-line correction; it is a comment bug, not a
behaviour bug.

### So what did move feral, and by how much?

The only feral-facing input that moved in this pin is
`data/presets/feral/buff-defaults.json`:

```
git diff bec0014^ bec0014 -- data/presets/feral/buff-defaults.json
```
→ `exposeWeaknessHunterAgility` `1080` → `1210`, one field, nothing else.

This is a **buff change and a correct one**. `vendor/wowsims/proto_utils.ts:1280-1283`
carries upstream's own phase map:

| Phase | exposeWeaknessHunterAgility |
| --- | --- |
| Phase1 | 1080 |
| Phase2 | 1150 |
| **Phase3** | **1210** |
| Phase4 | 1150 |

So `1080 → 1210` is precisely "Phase 1 → Phase 3", which is the content-tier
move ADR-0030 records. It is not drift and not a bug. The old 1080 was itself a
faithfully-mirrored upstream quirk (feral spread `defaultExposeWeaknessSettings(Phase.Phase1)`
with an explicit Phase1); the extractor fix in slice B made it read
`CURRENT_PHASE` statically, which is why it now tracks the tier.

**Expected direction and rough magnitude (domain reasoning, partly recalled —
see the label below).** Expose Weakness is a hunter debuff that grants the
*raid* attack power equal to a fraction of the hunter's agility. More hunter
agility means more attack power on the feral, at 90% uptime
(`exposeWeaknessUptime: 0.9`). So the direction is unambiguously **positive**
for feral DPS — this change makes the feral *stronger*, it cannot explain a
regression.

Magnitude: the input moved +130 agility, and the debuff grants a fraction of
it as AP to the raid, scaled by uptime. That lands in the low tens of attack
power, which for a cat is a low-single-digit-percent DPS effect at most and
plausibly under one percent. **recalled, unverified**: the exact Expose Weakness
coefficient (I did not read it out of the Go source, and the repo does not need
me to for this verdict). What matters for the engineering question is settled
from repo data and is not a recalled fact: the direction is positive, and the
magnitude is small.

**Verdict A: EXPECTED.** There is no −18 DPS regression on this pin. The figure
was superseded and reversed in sign by a measured three-arm experiment; the APL
rewrite provably does not reach this skeleton; and the one input that did move
is a correct tier-tracking buff increase whose sign is positive. Nothing here
signals a mismatch.

**Caveat carried forward, unchanged from the prior seat:** the −42.91 figure was
measured on an *unequipped* skeleton (`0 of 17` slots carry an item id). The
sign is safe because every arm is equally unequipped and only the rotation
moved. The **magnitude is not transferable to a geared feral** and nobody
should quote −42.91 as the gain a geared character sees. That remains untested.

---

## B. The 15 → 27 above-cutoff row jump

### What "above cutoff" means here

`packages/core/src/cutoff.ts:133`:

```
return deltaDps >= cutoff.absDps || deltaPct >= cutoff.pct;
```

Both deltas are measured against **the character's own equipped baseline**, and
the cutoff is an OR of an absolute arm (3.4 DPS for ret, 3.6 for feral) and a
percentage arm (0.15%). So the above-cutoff count is not an absolute property of
the engine — it is a joint function of (a) how many eligible items exist and
(b) how good the character's current gear already is.

### The pool grew by ~60%, measured

```
python -c "import json
for f in ['data/universes/feral-p2.json','data/universes/feral-p3.json','data/universes/ret-p2.json','data/universes/ret-p3.json']:
    d=json.load(open(f,encoding='utf-8')); print(f, d['entries'] if isinstance(d['entries'],int) else len(d['entries']))"
```

| universe | entries |
| --- | --- |
| feral-p2 | 227 |
| **feral-p3** | **364** |
| ret-p2 | 288 |
| **ret-p3** | **467** |

Feral p2 → p3 is **227 → 364, +60%**. Ret is +62%, and the 467 figure matches
the "467 eligible items for ret at Phase 3" the tab reports, so the tab and the
committed universe agree.

### Should a tier bump roughly double above-cutoff rows? Yes — plausibly more than double

The game reason is that Phase 3 is not an incremental content step. It adds
Serpentshrine Cavern and Tempest Keep — two full 25-man raids' worth of gear
that is a clear item-level tier above Karazhan/Gruul/Magtheridon P2 loot, plus
the tier 5 set. New items at P3 are not scattered uniformly across the quality
range: they are concentrated *at the top*, which is exactly the region that
clears an upgrade cutoff.

So the correct expectation is **super-linear**, not linear. A +60% pool whose
addition is top-weighted should move above-cutoff rows by more than +60%.
15 → 27 is +80%. That sits right where a domain reader would put it.

### The repo's own base rate agrees

`docs/verification-log.md:737` records a real ret P3 run: baseline 2003.26 DPS,
**357 ranked, 43 above cutoff** — about 12% of the ranked set clearing the bar
for a well-geared character. Feral's 27 out of a 364-entry P3 universe is the
same order (~7-8%), and on the conservative side of it.

### The counter-check: the prior seat measured the p2 counts live and got *fewer*

Ticket 250's closing section records that at the 2026-08-21 tip, feral p2
above-cutoff counts measured **14 (shredzepelin) and 12 (nexess)** — not 15 or
27. That is the tell that these counts track the character's baseline, not the
engine: both characters' baselines rose (2145.6 → 2266.9 / 2302.5), so marginal
sidegrades stopped clearing the bar. The same ticket states outright that the
15 → 27 movement "does not bear on the rotation question".

This matters for how engineering should read the number: **the 15 → 27 pair is
not two measurements of the same thing.** They were taken at different pins,
against different baselines, on different pool sizes. Treating the jump as a
behavioural regression compares two things that were never controlled against
each other.

**Verdict B: EXPECTED.** A ~60% top-weighted pool increase plus a baseline
change fully accounts for +80% in above-cutoff rows, and the direction and rough
size are what a domain reader would predict from a P2 → P3 content move. Not a
red flag. The engine is not implicated: ret's rotation was byte-identical across
the earlier pin pair and isolated the engine at **−0.03%**
(`docs/reviews/feat-engine-pin-backend-reforge.md:126-128`).

---

## C. Bonereaver's Edge (item 17076)

Four checks, all from repo data.

**1. Is it a real TBC-era item?** Yes, and it is a *vanilla* one. Read from
`data/items/index.json`:

```
python -c "import json;d=json.load(open('data/items/index.json',encoding='utf-8'));print({k:v for k,v in d['items']['17076'].items() if k in ('name','phase','slot','handType','weaponType','stats')})"
```
→ name `Bonereaver's Edge`, **`phase: 1`**, slot `weapon`, `handType: 4`
(two-handed), `weaponType: 9`. Bonereaver's Edge is the Ragnaros two-hander from
Molten Core — a level-60 raid sword that is carried in the DB because wowsims'
TBC DB spans the level-60 content it inherits.

**2. Is the proc plausible and does it matter to ret/feral?** The proc is real
and the implementation is faithful. From the fork:

```
git -C vendor/tbc-new-fork show ea112d982
```
→ `core.NewItemEffect(17076, ...)`, a stacking aura, `MaxStacks: 3`,
`BonusPerStack: stats.Stats{stats.ArmorPenetration: 700}`, `Duration: 10s`,
driven by a `NewStaticLegacyPPMManager(2, ...)` — a 2 PPM proc granting up to
2100 armor penetration. That matches the item as it exists in the game: a
stacking armour-penetration proc on a slow two-hander.

Does it matter to these two specs? **Only ret could ever hold it** — it is a
two-handed sword, which ret equips and a feral cat does not use as a stat stick
(a cat's weapon damage is discarded; the feral universe deliberately excludes
weapons carrying no feral attack power, per `feral-p3.json`'s `d7Note`). So the
implementation is ret-relevant in principle and feral-irrelevant.

**3. Is the attribution right?** Verified exactly:

```
git -C vendor/tbc-new-fork log -1 --format="%H %an %ad %s" ea112d982
```
→ `ea112d982e76aad4f5a5a98ac8987109c8195e61  Victor Westerstrand  Wed May 27 12:26:19 2026  add bonereaver's edge proc`,
touching one file, `sim/common/tbc/items_weapons.go`, +50 lines. Slice C's
attribution is correct in commit, subject, file and direction (one id added,
217 → 218 implemented).

**4. Does it change anything downstream?** No, and correctly so. It appears in
the ret P3 listing only as an **excluded** row:

```
grep -n "17076" data/pool-listings/ret-p3.md
```
→ `| 17076 | Bonereaver's Edge | 1 | e1 | drops only outside this phase's zones | — |`

That is the right game answer. A Molten Core drop is not obtainable content for
a TBC Phase 3 character, and the pool excludes it on a source rule rather than
on a stat comparison. It is absent from every universe file (`grep -rl 17076
data/universes/` returns nothing), which is why slice C's universe regen came
back byte-empty.

**Verdict C: EXPECTED.** Real item, faithful proc, correct attribution, and
correctly kept out of the Phase 3 pool for a sound loot-source reason. The
one-id move in `sim-implemented-effects.json` is exactly what it claims to be.

---

## D. The feral EP weights

### The situation, from the files

```
grep -h '"pin"' data/presets/*/*.ep-weights.json | sort | uniq -c
```
→ 17 files at `282d7b77c6f45f070b92d82b84bbb934c5dd3678`, 2 at `8aa378b3`, 1 at
`ac0ed034b`. **None of the 20 names the current engine pin `ec5c5f2`.** The
ticket's framing is right: `check_ep_presets.py` proves agreement with the fork,
not that the weights are current.

Feral is the sharper case, and its own file says why
(`data/presets/feral/p1.ep-weights.json`, `notes`): upstream ships **exactly one**
feral cat EP preset and it is named `P1_EP_PRESET`. There is no `P2` or `P3`
feral preset upstream. So feral's weights are not merely computed on an older
engine — they are Phase 1 weights being used against a Phase 3 universe, and
that was already true before this pin moved.

### Does it matter for ranking correctness? Not for the displayed order — but the preset file's own scope note is wrong, and that matters

**EP never decides the displayed ranking.** Display rank comes from measured
`deltaDps` only. That much is solid, and it is the difference between this and a
conventional EP-ranked tool.

But the feral weights file's `notes` claim is **false as written**. It says: "EP
only chooses gems here: meta repair ... and empty-socket fill ... The sim
decides the ranking, so a phase-1 gem preference does not rank items." The first
sentence is not true. `packages/core/src/candidate-order.ts:36-67`
(`orderCandidatesByEp`) ranks the **whole eligible candidate pool** by EP delta
against the worn item in that slot, and `rank.ts:739-745` calls it on every run.
`rank.ts:737-738` says so in its own comment: "This order also decides which N
the cap keeps (§5.1.1)."

So EP is wired into a shortlist mechanism, not only into gems:

```
sed -n '1098,1103p' packages/core/src/rank.ts
```
→
```
    // Every eligible candidate gets a full-iteration sim; the cap keeps the
    // first N of the EP order plus every owned row regardless of N (§5.1.1).
    const cap = input.candidateCap ?? ordered.length;
    const simCandidates = ordered.filter(
      (e, i) => i < cap || equippedIds.has(e.itemId)
    );
```

**When the cap is set, stale EP weights can drop a good item before it is ever
simmed.** That is the failure mode that would actually matter, and it is
reachable — not hypothetical.

### How reachable, measured

Two paths, and they differ:

- **The `pnpm rank` CLI never sets it.** `grep -rn "candidateCap"
  packages/core/src/` returns only the optional type declaration
  (`rank.ts:123`), the content-hash field (`rank.ts:775`) and the defaulting
  read (`rank.ts:1100`). Nothing assigns it. So `cap = ordered.length` and every
  eligible candidate is simmed — confirmed by the slice D runs
  (`universe=364`, `401 sims` feral; `universe=467`, `504 sims` ret). On this
  path EP affects only dispatch *order*, and the preset note's conclusion holds
  even though its premise does not.
- **The Upgrades tab — the primary product per ADR-0027 — exposes it as a
  user-facing control.** `upgrades_tab.tsx:897` wires a "Candidates"
  `NumberPicker` to `this.candidateCap`, read at click time by
  `readCandidateCap()` (`upgrades_tab.tsx:1183-1186`).

The tab's default is the safe one: the field initialises to `0`
(`upgrades_tab.tsx:399`), and `readCandidateCap` returns `undefined` for
anything not `> 0` — i.e. **no cap, sim everything**. Its own comment records
that this is deliberate: "no cap" also never sims fewer candidates than the user
could see, which is the safe direction to err". So a default tab run is not
exposed.

A user who *types* a candidate limit is exposed: their shortlist is the top N of
an EP order computed from Phase 1 feral weights that were themselves derived on
an older engine.

### Where it matters, and how much

Two exposures, ranked by how much a domain reader should care.

**1. Capped candidate order (the real one, but narrow).** Only when a tab user
types a candidate limit. Feral's weights are Phase 1 against a Phase 3 universe,
so the risk is that a P3 item whose value sits in stats P1 weights
under-rate gets ordered below the cut and never simmed. Feral's weight vector
leans on `41` (PhysicalDamage, 3.13) and `1`/`20`/`24` (1.16 / 1.02 / 1.02),
which are the stats feral gear is built from at every phase — the *shape* of a
feral cat's stat priority does not change between P1 and P3, only the magnitudes
do. So the ordering is unlikely to be badly wrong even when stale. But nobody has
measured it, and an item lost to the cap is invisible in the output rather than
shown as a bad row.

**2. Gem choice (small, and mostly self-cancelling).** EP decides which gem goes
in an empty socket and how a meta gem's activation is repaired. A wrong gem
costs a few DPS on a socketed item, applied consistently across candidates, so it
largely cancels in the *delta* comparison the report shows.

The engine-move component specifically is the smallest term of all. Ret's
rotation was byte-identical across the earlier pin pair, which isolates the
engine at **−0.03%** — an engine that moves whole-character DPS by three
hundredths of a percent does not reorder gem stat values or flip an EP ordering.

### How you would tell — the honest answer

**No measurement in this repo currently answers "are the fork's EP weights still
right on `ec5c5f2`", and none has been run.** To settle it you would recompute
EP weights on the current binary — upstream's own stat-weights routine, run
against the committed skeleton — and diff the resulting per-stat values against
the committed files. That is a sim job nobody has done. I am not claiming it is
unnecessary; I am claiming it is low-yield relative to its cost, for the reason
above: the output of these weights is gem selection, not item ranking.

**The mismatch is already disclosed rather than silent**, which is the property
that matters most for trusting the product. `packages/core/src/ep-weights.ts:102`
(`epWeightsPhaseNote`) emits e.g. `EP weights: P1 (requested: P3)` whenever the
weights' phase differs from the ranked phase, and its docstring is explicit that
staying quiet "because the file carries no phase number would be the
silent-degradation failure wearing a different hat". A feral P3 run surfaces the
note by construction.

**Verdict D: EXPECTED for the displayed ranking; NEEDS-MEASUREMENT for capped
runs and for gem choice.** Stale EP weights cannot corrupt the order of the rows
you see — that is measured `deltaDps`. They can, on a capped tab run, decide
which items never get simmed at all, and they can mildly mis-choose gems.
Neither has been measured on this engine. Both defaults are safe (CLI never
caps; the tab's Candidates field defaults to "no cap"), and the phase mismatch
is disclosed to the reader rather than hidden. Follow-up, not a merge blocker.

**Separate finding, and the sharper one for engineering:** the scope note inside
`data/presets/feral/p1.ep-weights.json` asserts "EP only chooses gems here",
which is false — `candidate-order.ts` uses the same weights to order the
candidate pool, and `rank.ts:1100` caps that order. A comment that under-states
where a stale input reaches is the kind of thing that makes the next reviewer
dismiss a real exposure. It deserves a correction whether or not the weights are
ever re-derived. (Ticket 353's own §2 inherits the same too-narrow framing,
calling the EP files "committed numbers derived from a sim run" without noting
they also gate a shortlist.)

---

## Confidence and caveats

- **Facts read from repo data** carry their command inline above: the skeleton's
  rotation source and shape, the buff-defaults diff, the Expose Weakness phase
  map, universe entry counts, the cutoff predicate, the Bonereaver's Edge stat
  line and pool row, the upstream commit, the EP pins, and ticket 250's closure.
- **recalled, unverified** — the exact Expose Weakness attack-power coefficient;
  the Molten Core / Ragnaros source of Bonereaver's Edge (the repo confirms
  `phase: 1` and "drops only outside this phase's zones", which is what the
  verdict rests on); and the specific raid composition of TBC Phase 3
  (Serpentshrine Cavern, Tempest Keep). None of these is load-bearing: each
  verdict is carried by a measured repo fact, and the recalled facts only supply
  the game-side explanation for it.
- **Not measured by me, and not measured by anyone:** whether the new feral
  rotation's advantage survives on a geared character (magnitude, not sign);
  whether the fork's EP weights are still correct on `ec5c5f2`; and whether a
  capped feral run loses any real P3 candidate to the stale P1 EP ordering. All
  three are named above as open.
- **One claim I checked rather than accepted.** My first pass took
  `p1.ep-weights.json`'s "EP only chooses gems here" note at face value, and a
  targeted search of every `epWeights` consumer showed it was wrong. Section D
  is written against the code (`candidate-order.ts:36-67`, `rank.ts:739-745`,
  `rank.ts:1098-1103`, `upgrades_tab.tsx:399,897,1183-1186`), not against the
  note. Flagging it because the note is exactly the sort of in-repo assurance a
  later reviewer would reasonably rely on.

`contested:` ticket 353 §2 lists `data/presets/*/*.ep-weights.json` under
"committed numbers derived from a sim run" and frames the risk as the weights
being "still right". That under-states the blast radius: those weights also
order the candidate pool, and a cap applied to that order decides which items
get simmed at all.
- I did not run any sim. Every number here was read from a committed artifact or
  a prior recorded measurement, with its source named.
- I did not touch `packages/core/test/fixtures/`, `data/presets/`, or
  `.scratch/carry-forward/issues/353-*`, per the concurrency instruction.

---

## Merge line

**Nothing in questions A-D blocks the merge on domain grounds.** All four are
acceptable-and-documented: A is a stale premise already measured and reversed, B
is fully explained by a top-weighted ~60% pool growth against a moved baseline,
C is a correct upstream addition correctly excluded from the pool, and D is a
bounded exposure that is safe on both default paths and cannot reach the
displayed row order.

Three things for the engineering team to note, none of them a domain blocker:

1. **Ticket 353 §4 should be corrected before it is used as a brief again.** It
   revives the −18 DPS figure as an open question; that figure was superseded in
   sign on 2026-08-21 and ticket 250 is closed. Propagating it a third time is
   how a stale number becomes folklore. The 15 → 27 pair should likewise be
   labelled as two uncontrolled measurements rather than a regression.
2. **`scripts/build_feral_skeleton.py:19`** still documents the rotation as
   coming from the vendored APL, contradicting line 64. One-line comment fix.
3. **`data/presets/feral/p1.ep-weights.json`'s "EP only chooses gems here" note
   is false** — `candidate-order.ts` orders the candidate pool with the same
   weights and `rank.ts:1100` caps that order. Correct the note; it currently
   hides a real (if narrow) path by which a stale input can drop an item before
   it is simmed.

The merge decision itself rests on the red test gate, which is an engineering
question and not mine: `pnpm verify` exits 1 on this tip with the 11 deferred
failures. My domain finding is relevant to how that is weighed — the 8 feral
recall misses are caused by a **correct** buff change (Phase 1 → Phase 3 Expose
Weakness), so re-recording them is a re-baseline against a legitimately moved
input, not a repair of a defect.
