Status: closed
Type: investigation
Origin: owner report, 2026-08-10
Blocks: none
Blocked by: none

# loop: why does the S3 PvP helm sim ~equal to Cursed Vision?

The owner reports the Season 3 PvP helm (Vengeful Gladiator's Dragonhide
Helm) sims at about the same DPS as Cursed Vision of Sargeras in our
report, when Cursed Vision should be roughly +10 DPS ahead — assuming both
helms have an activated meta gem and the same gems. Something in our inputs
or outputs is probably distorting the comparison (operating principle:
wowsims is the oracle; if a result looks wrong, suspect what we fed it or
how we read it — see the design note
`.scratch/set-bonus-value/design-note-sim-vs-ui-2026-08-10.md`).

Run this as a diagnostic loop, using the method that worked for the
T6-shoulders investigation: `.scratch/set-bonus-value/loop-brief-t6-shoulder-upgrade-invisible.md`
(hypothesis → smallest falsifying experiment → log → revise, every entry in
a running log with the exact command).

Phase 1 — reproduce the owner's expectation as ground truth:

1. Identify both item ids in `data/universes/` / `vendor/wowsims/db.json`
   and read what our report currently shows for each (delta, gems used).
2. Sim both helms directly on the character's gear with the pinned
   wowsimcli, explicitly controlling the things the owner named: meta gem
   activated in both arms, same gems both arms. Pattern:
   `.scratch/set-bonus-value/measure_shredzepelin_t6.py`. If the direct sims
   show Cursed Vision ~+10 ahead, the gap is ours; find where.

Phase 2 — the prime suspects, cheapest first:

- **Meta activation.** The candidate-swap builder holds current gems and
  moves them under constraints (see ticket 103). If the swap into one helm
  leaves its sockets empty or breaks the meta's activation condition
  (socket-color counts), that helm sims without its meta — easily worth
  ~10-25 DPS and exactly the size of the discrepancy. Check the actual
  equipment payload our pipeline built for each helm's sim arm.
- **Socket bonuses / gem placement** differing between the two arms.
- **Wrong item variant** (PvP items have multiple ids across seasons/ranks).
- **Noise** — if the deltas' error bars overlap by more than ~10 DPS, the
  comparison may be within noise; ticket 105 is investigating spread
  generally. Report the error bars alongside the point estimates.

Phase 3 — if the cause is the gem-handling in the swap builder, that is
ticket 103's root cause showing up in a second place: record the connection
in both tickets rather than fixing it twice, and propose the fix once.

Owner's expected outcome (+10 for Cursed Vision) is ground truth to
reproduce, not to explain away — same rule as the T6 loop. Label anything
unmeasured as hypothesis/untested.

## Owner-added context, 2026-08-10

How wowsims itself handles regemming matters here: it is quick and good at
it, and it activates the meta gem. In the owner's own comparison sim, both
helm arms carried the same gem sets relative to each other (not the same as
the Wolfshead Helm baseline, which has no meta gem — but identical between
the two candidate helms, both with an active meta), which is what made the
quick manual sim valid. Any reproduction here should match that setup: same
gems in both arms, meta active in both. If our pipeline's swap builder
cannot produce that configuration for one of the helms, that inability is
itself the likely answer.

## Loop findings, 2026-08-10 — the report's near-equality is CORRECT; every named suspect falsified

Ran as a combined loop with ticket 103. Director log:
`.scratch/set-bonus-value/loop-103-106/DIRECTOR.md`; agent logs `01`–`05` in the
same directory, with measurement scripts committed alongside.

Phase 2's suspects, taken cheapest-first exactly as this ticket ordered them,
are all eliminated **by measurement**:

**Meta activation — not broken.** The payload production builds (dumped by
calling the real `equipmentForCandidateSwap`, not a reimplementation:
`.scratch/set-bonus-value/loop-103-106/dump-payloads.ts`) has the meta **ACTIVE
in both helm arms**, confirmed with the real `metaStatus`
(`packages/core/src/meta.ts`): `{red:12, yellow:2, blue:2}` against
`minRed:2 minYellow:2 minBlue:2` for gem 32409.

**Gems and socket bonuses — identical between the arms.** The two payloads are
identical apart from the item id itself: same 2 sockets, same gems (meta 32409 +
red 32194), same carried enchant, identical whole-equipment gem multiset (13
gems). This is exactly the setup the owner's context section asks for — same
gems both arms, meta active in both — so our builder *can* produce it.

**Wrong item variant — no.** 32235 (Cursed Vision) and 33672 (Vengeful
Gladiator's Dragonhide Helm) are the only matching ids in
`vendor/wowsims/db.json` and are the ids `.scratch/rank-reports/shredzepelin-p3.json`
actually uses.

**Noise — the near-equality is real, and reproduces exactly.** Simming the
production requests byte-for-byte (`04-artifact-vs-direct.md`,
`sim_prod_requests.py`) reproduces the stored figures to two decimals: CURSED
32235 stored −202.13357 vs simmed −202.13; VENG 33672 stored −202.04970 vs
simmed −202.05. A 5-seed re-run gives CURSED − VENG = **+0.15**, matching the
stored −0.084 in being flat. The two helms genuinely sim within noise.

### The trap this loop fell into, recorded so it is not repeated

An intermediate measurement (`02-helm-ab.md`) appeared to show CURSED +2.84 /
+4.97 ahead and each helm ~15 DPS above the stored figure. That was a **harness
error**: the script substituted only the head slot and left the rest of the gear
at the baseline's `24028` gems, skipping the four-gem recolour on shoulder 29100
and chest 29096 that `repairMeta` performs to satisfy the new meta's colour
condition. Those arms had the meta socketed but its condition unmet — and the Go
sim applies 32409's **+3% crit damage unconditionally** even then. Isolating the
head socket (`05-meta-tax.md`, `sim_meta_arms.py`) prices that free ride at
**~35 DPS**: `ISO_META − ISO_32194 = +39.25` for +2 agi where the measured rate
(1 agi ≈ 1.83 DPS) predicts ~+3.7. So the apparent gap was impossible stats, the
exact case PLAN.md §9 exists to prevent — **any future arm built for this
comparison must go through `equipmentForCandidateSwap`, never a hand-substituted
slot.**

`repairMeta` was also cleared while we were there: activation is a net **+22.40
DPS gain** here (`META_ACTIVE` −201.98 vs `NO_META` −224.38, winning on all five
paired seeds), so the recolouring cost is worth paying and the 8 affected rows
are not undervalued.

### Disposition

Our side is exonerated on every mechanism this ticket named. The owner's ~+10
expectation is **not reproduced** — but nor is it refuted, because we cannot see
their run's settings. The residue is the same as ticket 103's: our numbers
reproduce themselves exactly and disagree with a wowsims web run, leaving the
sim *request* (not the equipment) as the only place left to look. The untested
leads are shared with 103 (`exposeWeaknessHunterAgility` phase pinning; the
talent preset).

**Recommend: keep open, blocked on owner evidence** — the exported wowsims
settings for the two helm runs. A leaf-level request diff against those would
settle it; more sims on our side will not.

**The unblock already has a ticket.** Ticket 72 (import a user-supplied wowsims
setup) names this exact investigation as its motivating case — "an unexplained
helm-ranking gap between our sim and wowsims". Its stage 1 (`--sim-settings`
flag feeding `Deps.raidSimSkeleton`) is what would let us diff the owner's run
against ours at leaf level. Recommend 72 as the blocker for both 103 and 106.

## RESOLVED, 2026-08-10 — the owner's settings export arrived and closed it

Evidence at `.scratch/set-bonus-value/loop-103-106/owner-settings-export.json`
(apiVersion 14); full diff and measurements in `06-owner-settings-diff.md`.

**Our near-equality was a correct measurement of our configuration. The owner's
~+10 is a correct measurement of theirs. Two differences separate them.**

The settings themselves were almost identical — all raid/party buffs, all
debuffs, talents, race, professions, `reactionTimeMs`, consumables, and the
whole encounter block (180s ±5, level-73 Mechanical, `parryHaste`) match
byte-for-byte, and `exposeWeaknessHunterAgility` is 1080 on both sides. Every
Phase-2 suspect in this ticket was already eliminated by measurement; every
sim-request suspect turned out to be identical. What differed:

1. **Gear** — the owner benchmarked a different, better-geared character (10 of
   17 slots differ; baseline 2264 vs our 2152).
2. **Rotation** — ours pins upstream's default APL, theirs uses the `TypeSimple`
   biteweave/mangleTrick preset.

Measured (seeds [11,22,33,44,55] @ 3000 iters, pinned CLI, arms built through
the real `equipmentForCandidateSwap`):

| CURSED − VENG | our APL | owner's TypeSimple |
|---|---|---|
| our gear | **+0.15** (= stored −0.084) | +6.75 |
| owner gear | +4.64 | **+7.78** |

**+7.78 against the owner's ~+10**, resolvable on every paired seed. Both
differences push the same way, and the helms separate once either is applied —
which is why the effect looked like it had vanished on our configuration rather
than merely shrunk.

**Disposition: close.** Every mechanism this ticket named — meta activation, gem
handling, socket bonuses, item variant, noise — was falsified by direct
measurement, and the report's flat ordering was right for the inputs it was
given. The `repairMeta` trap recorded above stands as the loop's main
methodological warning.

The rotation question (which rotation should the tool model?) is carried in
ticket 103's resolution as a proposal for the owner; it is a
`data/presets/feral/` decision, not a bug. A reverse-direction export of our
settings for web-side parity checking is at
`.scratch/set-bonus-value/loop-103-106/our-settings-for-web-import.json`.

## CORRECTION, 2026-08-10 — same conclusion, corrected reasoning; stays closed

The owner's first settings export carried the wrong equipment. The corrected
export (`owner-settings-export-v2.json`) shows it is **the same character** as
our fixture — 15 of 17 slots identical, the two "differing" slots being the same
two rings in swapped order. The "different, better-geared character" reasoning
in the section above is therefore **void**, and the +7.78 figure was measured on
gear the owner does not have.

Re-priced on the corrected gear (`07-corrected-gear.md`, seeds [11,22,33,44,55]
@ 3000 iters, pinned CLI):

| CURSED − VENG | value |
|---|---|
| our configuration (stored) | −0.084 |
| corrected owner gear + TypeSimple rotation | **+8.61** |
| owner's ground truth | ~+10 |

**The conclusion is unchanged and now better supported**: the helms separate
under the owner's rotation and stay flat under ours, so the report's
near-equality was a correct measurement of our configuration. The +1.86 shift
from the earlier wrong-gear figure was attributed by isolated measurement, not
assumption — feet gem 24028→24058 (+1.52), shoulder enchant (+0.29), ring
enchants (~0), summing to +1.78 against +1.86 measured.

**Remains closed.** The residue against ~+10 is inside plausible rounding, and
the dominant lever is still the rotation, carried as ticket 109. Ticket 108
(out-of-range ids) is closed as **invalid** — 278827 / 278819 are legitimate
TBC Ahune/Midsummer items at Phase-2 item levels and appear in the owner's own
corrected export, so the cross-reference in the section above is void. Ticket
103 is **reopened** on a genuine defect found while re-pricing
(`fillEmptyCandidateGems`, ticket 111); it does not affect this comparison,
since neither helm's swap leaves a socket the fill would touch differently.
