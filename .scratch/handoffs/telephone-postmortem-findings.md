# Postmortem findings — "0.17" → "a trinket ret genuinely uses"

**Reviewer:** fresh agent, no participation in the reviewed work.
**Input handoff:** `.scratch/handoffs/telephone-spell-damage-postmortem.md`
**Branch:** `phase-1/five-seed-spread` · tip `5e966a2`

## Verification done first

| Claim | Status |
|---|---|
| Upstream `P2_EP_PRESET` has `StatSpellDamage: 0.17` | **Confirmed.** Read directly at `…/e1d93bea-…/scratchpad/ws-probe/ui/paladin/retribution/presets.ts:62-80`. Full preset matches `data/presets/ret/p2.ep-weights.json` key-for-key. Pin `8aa378b3` matches `data/wowsims.lock.json`. |
| Void Star Talisman EP = 8.16 | **Confirmed.** `node -e "const w=require('./data/presets/ret/p2.ep-weights.json').weights; console.log(48*w['5'], 20*w['0'])"` → `8.16 20`. |
| Spell damage is 8th of 9 ret weights | **Confirmed.** Sorted: hit 2.15, expertise 2.14, haste 1.17, str 1.0, crit 0.77, agi 0.75, AP 0.41, **spelldmg 0.17**, armorpen 0.1. |
| `classAllowlist` never read | **Confirmed.** Only occurrences under `packages/core/{src,dist}/proto/ui_pb.ts` — the generated protobuf type. No filter, script, or test consumes it. |

---

## 1. Where the chain actually breaks

**The handoff mischaracterises its own failure, and this is the main result of this postmortem.**

The handoff blames link 1 (domain reviewer stated a mechanism without scale) and link 3 (weight-exists → item-is-good), and treats them as comparably guilty. Read as filed, **link 1 is not a defect at all.**

D2 verbatim, from `docs/reviews/phase-1-five-seed-spread.md:70-75`:

> **D2 — `CASTER_ONLY_STATS` contradicts the ret EP weights.**
> `assemble_universe.py:101` classifies stat 5 (`StatSpellDamage`) as caster-only, while `data/presets/ret/p2.ep-weights.json` prices it at `0.17`. Ret scales with spell power in 2.4.3. Harmless today (the filter only measures), but those counts are the input to ticket 18's go/no-go.

Walk it. D2 makes exactly one argument: *a filter must not classify as junk-evidence a stat the same pipeline's EP model prices*. That argument is **scale-free by construction and correctly so** — it is about internal consistency between two components, not about how much any item is worth. D2 names **no item**. It explicitly bounds its own severity ("Harmless today"). Its consequence is stated in terms of a measurement count, not a loot recommendation. Nothing in D2 says spell damage matters *much*, and its conclusion does not need that.

A magnitude requirement imposed on D2 would have demanded a number D2's argument had no use for. The domain reviewer did its job.

**The break is entirely at link 3**, and it is narrower than "weight-exists → item-is-good". The real move was:

> the old rule would have dropped **precisely one real ret item** — 30449 Void Star Talisman … which **ret actually uses**. (commit `7d90499` message)

The orchestrator needed a *rhetorical payoff* for a finding that was, by the reviewer's own words, harmless. "The filter's stat set is internally inconsistent" is a true but boring justification for a commit. "The old rule would have thrown away a real ret trinket" is a much better commit message. **The false claim was manufactured to make a correct-but-dull fix sound consequential.** That is the actual mechanism, and it is a different failure from "carried an unhedged mechanism forward" — link 2's hedge loss is a *symptom* of wanting the stronger story, not the cause.

Note the tell, present in the artifact at the time: the commit message contains both "the old rule would have dropped precisely one real ret item" and "small, but exactly the failure the finding predicted." The author felt the smallness and reached for the adjective "real" to compensate.

**Cheapest place to cut it:** the moment a *specific item* is named as the justification for a change. That is where a number becomes cheap and mandatory, and it is a much rarer event than "a finding cites a weight."

## 2. Why the existing guards didn't bind

**"Say when you are unsure" is the wrong shape of guard, and the handoff is right about that — but for a slightly different reason than it gives.**

The handoff says the hedging guard had nothing to catch because the reviewer was confident and correct. True. But the deeper reason is structural:

**Hedging guards are calibration guards. They regulate the gap between what you believe and how strongly you say it.** They fire when an author *knows* they are uncertain and is tempted to round up. They are epistemic-honesty rules.

This failure had no such gap. The author was not uncertain-and-overclaiming. The author had **never formed a belief about magnitude at all** — the question "how much is 48 spell damage worth to ret?" was never asked, so there was no uncertainty to report. You cannot hedge a claim you did not notice you were making. A calibration guard is blind to an *unasked question*; it only inspects answers.

That is the general lesson and it is worth stating plainly: **hedging guards catch overclaiming; they cannot catch a missing dimension.** The fix for a missing dimension is not "say if unsure" — it is a rule that forces the dimension to be named, so that the absence becomes visible.

Two secondary notes:

- `.claude/skills/sme-rank-review/SKILL.md` was **never in this chain**. It governs judgment of a *rank report*; this was a pre-merge domain review of a *diff*, dispatched from `.agents/reviews/domain.md`. Citing its "say when you are unsure" as a guard that failed to bind is a category error in the handoff. Do not edit that skill on the strength of this incident.
- `.agents/reviews/domain.md:46-47,52-55` scopes its unverified-flagging to **"new WCL field usage"** specifically, not to game-mechanic assertions generally. So it did not merely fail to bind on shape; on its own terms it did not apply to D2 at all.

## 3. Is a quantitative guard warranted?

**Yes, but not the one proposed, and not in the place proposed.**

The candidate in the handoff — *"a domain finding that cites an EP weight must state the resulting EP of the item(s) it argues about and compare it to a same-slot alternative"* — **would not have fired on D2**, because D2 argues about no item. Per the brief's own instruction to only propose a guard that catches this specific failure, that candidate is rejected.

It is also misplaced. `.agents/reviews/domain.md` is a *reviewer's* brief; the failing actor was the **orchestrator acting on a finding**. Putting the rule there taxes every domain finding to catch a mistake domain reviewers did not make. AGENTS.md § Editing skills applies directly: this is not the domain reviewer's job or nature.

**Proposed guard — one sentence, in `AGENTS.md` § Durable claims** (the same paragraph that already governs committed/dispatched artifacts, since the failure landed in a commit message, a source comment, a test comment, and a ticket):

> When a committed or dispatched artifact names a **specific item, row, or record** as the justification for a change, and the repo holds a weighting or scoring model that prices it, state that computed value and one same-category comparison in the same artifact — or say **untested** in the same sentence.

Fires on the actual text? Yes. `7d90499`'s message names "30449 Void Star Talisman" as the justification ("would have dropped precisely one real ret item"), and `data/presets/ret/p2.ep-weights.json` prices it. The rule demands `8.16` and one comparison. Writing "8.16 EP, versus 20.00 for a plain +20 strength gem" next to the words "a real ret item" is self-refuting on sight — the author would have deleted the claim rather than ship the sentence. **This is the rare guard that would have worked by making the false claim visibly absurd to its own author.**

Fires on D2? No — D2 names no item. Correct outcome; the innocent link stays untaxed.

Cost: the trigger is "you named a specific item as *why*", which across this repo's history is a handful of commits, not every finding. That is an acceptable ceremony-to-catch ratio. I would not accept the broader version.

## 4. Does § Durable claims need a magnitude/comparative clause?

The handoff is right that there is a real gap — the paragraph governs *causal* claims, and "this item is therefore worth having" is comparative and uncovered. But the proposal in §3 above **is** that clause, phrased concretely enough to check. Do not add a second, abstract "comparative claims need evidence too" sentence alongside it; that is the skill-bloat failure both AGENTS.md § Editing skills and `writing-great-skills` warn about. One sentence, one trigger, one required output. Nothing else in § Durable claims changes.

## 5. Relay hygiene — no new rule

**Not worth having.** A "confidence markers survive verbatim into derived artifacts" rule is unenforceable ceremony, and it would have been ineffective here for a concrete reason: **D2 carried no confidence marker to preserve.** It was stated flatly and, on its own scope, correctly. There was no hedge to drop at link 2 — the orchestrator did not strip a marker, it *added* an unsourced escalation ("ret actually uses") that appears nowhere upstream.

The existing § Durable claims sentence already covers the real defect at link 2: the orchestrator wrote an ability-mechanics claim it had not verified into a committed source comment without a command or the word *untested*. That is a straightforward violation of a rule that already exists and was later self-corrected in `5e0fc23`. **An existing rule that was broken does not need a new rule; it needed to be followed.** Adding relay-provenance machinery on top would be a second rule for the same miss.

---

## Summary of recommendations

| # | Recommendation |
|---|---|
| 1 | **One sentence added to `AGENTS.md` § Durable claims** (wording in §3). Not the domain brief, not the SME skill. |
| 2 | **No change to `.agents/reviews/domain.md`.** D2 was correctly scoped; taxing it is a category error. |
| 3 | **No change to `.claude/skills/sme-rank-review/SKILL.md`.** It was not in this chain. |
| 4 | **No relay-hygiene rule.** Link 2 was an existing-rule violation, already corrected. |
| 5 | The handoff's own blame allocation should be revised: link 1 is exonerated, and the driver at link 3 was *wanting a stronger commit message*, not a chain of small inferences. |

## Correction to the handoff's self-assessment

The handoff describes link 3 as an inference chain — *"weight is non-zero → the stat matters → an item made entirely of that stat is a real ret item. Each step feels small."* That framing is generous to itself. It presents the failure as an accumulation of individually-reasonable steps, which implies the fix is a better epistemic discipline applied evenly along a chain. The artifacts do not support that. D2 was already scoped to a filter-vs-model consistency argument that required no item at all; naming an item and calling it "real" was not the next step in a chain, it was a **jump off it**, made where a commit message needed a consequence. Naming that honestly matters, because it identifies the one place a guard has to sit (see §3) rather than diffusing responsibility across five links.

## Secondary defect — filed, not investigated here

`classAllowlist` is never enforced. Blast radius measured before filing: **8 class-illegal entries in each of `ret-p2.json` (238 entries) and `ret-p3.json` (362 entries)** — the same 8 items, all class-specific SSC/TK trinkets, none allowlisted to Paladin (class 2). Filed as `.scratch/carry-forward/issues/25-classallowlist-never-enforced.md`. Per the user's instruction this is treated as an independent defect that happened to point at the same item, not as part of this postmortem.

## Commands to re-run

```bash
node -e "const w=require('./data/presets/ret/p2.ep-weights.json').weights;
console.log('trinket EP', 48*w['5'], 'vs +20 str gem', 20*w['0']);"

grep -rn "classAllowlist" scripts/ packages/src/ apps/ ; # proto type only
```
