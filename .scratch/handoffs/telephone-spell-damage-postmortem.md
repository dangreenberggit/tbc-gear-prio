# Handoff — postmortem: how "0.17" became "a trinket ret genuinely uses"

**For:** a fresh Opus agent with no memory of the work that produced this.
**Task:** work out how a true, authoritative number was progressively
re-interpreted into a false domain claim across a review chain, and propose a
guard that would have stopped it.
**Date:** 2026-07-29 · **Branch:** `phase-1/five-seed-spread` · **Tip:** `5e966a2`

The user's framing, which is the actual assignment:

> "the bigger problem is the thought process that led to this overblown idea of
> the trinket being good for this purpose when its definitely not, not by a long
> shot … there were comments or thoughts involving the SME review that were along
> the lines of 'ret paladin scaled well with spell damage'. thats the game of
> telephone I'm talking about."

**Do not** get pulled into the class-restriction angle (below). The user
explicitly deprioritised it: *"the class restriction shouldve knocked it out but
it never shouldve been elevated on any merits."* The question is the reasoning
chain, not the missing filter.

---

## The item at the centre

`30449 Void Star Talisman`, from `vendor/wowsims/db.json`:

```json
{
  "id": 30449, "name": "Void Star Talisman", "type": 12, "phase": 2,
  "quality": 4, "unique": true,
  "classAllowlist": [9],
  "scalingOptions": { "0": { "stats": { "5": 48 }, "ilvl": 128 } }
}
```

`+48 spell damage`, nothing else. It is in both shipping universes
(`data/universes/ret-p2.json`, `ret-p3.json`) and is pinned there by a test in
`packages/core/test/pool-hardening.test.ts`.

---

## The chain, link by link

### Link 0 — the seed, and it is TRUE

`data/presets/ret/p2.ep-weights.json` weights stat 5 (`StatSpellDamage`) at
**0.17**. This is not invented: it is copied from upstream wowsims
`ui/paladin/retribution/presets.ts`, `P2_EP_PRESET`, at the pinned commit
`8aa378b3`. Verified in a local sparse clone at
`…/scratchpad/ws-probe/ui/paladin/retribution/presets.ts:62-80`:

```ts
export const P2_EP_PRESET = PresetUtils.makePresetEpWeights('P2', Stats.fromMap({
  [Stat.StatStrength]: 1.0,
  ...
  [Stat.StatSpellDamage]: 0.17,
}, ...));
```

So ret's EP model *does* assign spell damage a non-zero value. Every later claim
traces back to this one true fact.

### Link 1 — the domain reviewer generalises the number into a mechanism

The pre-merge domain review (a fresh Opus subagent, brief
`.agents/reviews/domain.md`) filed finding **D2**. As recorded in
`docs/reviews/phase-1-five-seed-spread.md`:

> **D2 — `CASTER_ONLY_STATS` contradicts the ret EP weights.**
> `assemble_universe.py:101` classifies stat 5 (`StatSpellDamage`) as
> caster-only, while `data/presets/ret/p2.ep-weights.json` prices it at `0.17`.
> **Ret scales with spell power in 2.4.3.**

Its fuller version named specific abilities — Seal/Judgement of Blood, Judgement
of Command, Crusader Strike — as carrying spell-power coefficients.

**This is where the corruption starts, and note it is not a factual error.** The
ability claim is very likely true. The defect is a *scale* omission: it says
spell power matters, and never says how much. It also never asks whether a
non-zero weight makes any individual item worth having.

### Link 2 — I adopt the mechanism as verified and drop the hedge

I (the orchestrating agent) took D2 at face value. Committed in `7d90499`, in
`scripts/assemble_universe.py`:

```python
# Stat 5 (SpellDamage) is deliberately NOT here: ret scales with spell power in
# 2.4.3 via Seal/Judgement of Blood, Judgement of Command and Crusader Strike,
# and data/presets/ret/p2.ep-weights.json prices it at 0.17.
```

I had verified none of the ability mechanics. I wrote it as settled fact in a
committed source comment — a direct breach of AGENTS.md § Durable claims, which
requires a re-runnable command or the word *hypothesis*/*untested* in the same
sentence.

### Link 3 — the number becomes a value judgement about a specific item

When I searched for what the old rule would have wrongly rejected, exactly one
item surfaced: Void Star Talisman. In chat I then wrote:

> "**Void Star Talisman** — a pure +48 spell damage trinket that **ret genuinely
> uses in TBC**. Under the old rule it was flagged caster-only despite the EP
> model pricing it."

And in the test comment and ticket 18: *"a trinket ret genuinely uses."*

**This link is pure invention.** Nothing upstream said the item was good. The
inference ran: weight is non-zero → the stat matters → an item made entirely of
that stat is a real ret item. Each step feels small; the conclusion is false.

### Link 4 — the number that refutes the claim was in my hands the whole time

Never computed until the user pushed back:

| | |
|---|---|
| Void Star Talisman total EP | `48 × 0.17` = **8.16** |
| A plain +20 strength gem | `20 × 1.0` = **20.00** |
| Spell damage rank among ret's 9 weights | **8th of 9** — only armor pen (0.1) is lower |

The entire trinket is worth **less than half of one strength gem**, in a trinket
slot where real ret options are worth many times that. The 0.17 I kept citing as
justification is, in context, evidence the item is near-worthless for ret.

### Link 5 — the independent check that should have caught it, didn't

`classAllowlist: [9]` is **Warlock**. Paladin is 2. The item is unequippable by
the character it was admitted for. `classAllowlist` is **never read anywhere in
the codebase** — `grep -rn classAllowlist scripts/ packages/` returns nothing.

Per the user, treat this as a *second, independent* failure that happened to
point at the same item — not as the headline. It is worth its own ticket.

---

## What was corrected already (so you don't redo it)

Commit `5e0fc23` hedged links 2 and 3 everywhere they were committed:

- `scripts/assemble_universe.py` — ability claim now attributed to the domain
  review and marked untested; the EP weight alone carries the argument.
- `packages/core/test/pool-hardening.test.ts` — "ret actually uses" removed.
- `.scratch/carry-forward/issues/18-universe-recall-measurement.md` — marked
  **Untested**.
- Commit `7d90499`'s message still carries the unhedged version (immutable);
  ticket 18 records the correction.

**The underlying decision was NOT reverted and is still believed correct:**
removing stat 5 from `CASTER_ONLY_STATS` is right, because a junk filter must
not contradict the EP model the same pipeline uses to rank. What is wrong is
every sentence that went further than that.

---

## Your questions

1. **Where exactly does the reasoning become invalid?** Link 1 states a true
   mechanism without scale. Link 3 converts "stat has weight" into "item is
   good". Which single link, if guarded, kills the chain most cheaply?
2. **Why did the existing guards not bind?** Both process artifacts already
   contain the right instruction:
   - `.agents/reviews/domain.md:46,52-55` — "flag it as unverified, not wrong",
     report "**unverified** separately from actual contradictions".
   - `.claude/skills/sme-rank-review/SKILL.md:77-78` — "Flag results that
     contradict well-known tier expectations **when you are confident; say when
     you are unsure**."
   The domain reviewer *was* confident, and was right about the mechanism — the
   hedging guard has nothing to catch, because the false step was an unstated
   *magnitude*, not an unhedged assertion. Is "say when unsure" simply the wrong
   shape of guard for this failure?
3. **Is there a quantitative guard?** The refutation was one multiplication
   against data already on disk. Should a domain finding that cites an EP weight
   be *required* to state the resulting EP of the item(s) it is arguing about,
   and compare it to something in the same slot? Consider whether that belongs
   in `.agents/reviews/domain.md`, the SME skill, or AGENTS.md § Durable claims.
4. **Does AGENTS.md § Durable claims need a magnitude clause?** It currently
   governs *causal* claims ("X because Y"). "Ret scales with spell power" passes
   as stated. "This item is therefore worth having" is a *comparative* claim with
   no rule covering it.
5. **Relay hygiene.** I lost the hedge when copying D2 into a source comment.
   Should there be a rule that a finding's confidence markers survive
   verbatim into any artifact derived from it?

---

## Artifacts to read

| Path | Why |
|---|---|
| `data/presets/ret/p2.ep-weights.json` | link 0, the true seed |
| `…/scratchpad/ws-probe/ui/paladin/retribution/presets.ts:62-80` | upstream proof of 0.17 (sparse clone may be gone; `git clone --filter=blob:none` wowsims/tbc-new) |
| `docs/reviews/phase-1-five-seed-spread.md` § Domain, D2 | link 1 as filed |
| `git show 7d90499` | link 2, the unhedged commit |
| `git show 5e0fc23` | the correction |
| `scripts/assemble_universe.py` (`CASTER_ONLY_STATS`, ~line 104) | current hedged state |
| `packages/core/test/pool-hardening.test.ts` (spell-damage test) | the test pinning the item |
| `.scratch/carry-forward/issues/18-universe-recall-measurement.md` | where D2 landed |
| `.agents/reviews/domain.md` | the domain brief and its existing guards |
| `.claude/skills/sme-rank-review/SKILL.md` | the SME skill and its "say when unsure" |
| `AGENTS.md` § Durable claims, § Editing skills | where a new guard would go |

Reproduce the refutation:

```bash
node -e "const w=require('./data/presets/ret/p2.ep-weights.json').weights;
console.log('trinket EP', 48*w['5'], 'vs +20 str gem', 20*w['0']);"
```

---

## Deliverable

A short written finding — not a code change — covering: where the chain broke,
why the existing hedging guards were the wrong shape, and a concrete proposed
guard with the exact file it belongs in and draft wording. If you conclude no
new guard is warranted and this was ordinary human-style error, say so plainly;
`.claude/skills/writing-great-skills` and AGENTS.md § Editing skills both warn
against dumping process rules into the wrong artifact.

Also file a separate ticket for `classAllowlist` never being enforced
(`.scratch/carry-forward/issues/`, next free number, see
`docs/agents/issue-tracker.md`) — measure how many universe entries are
class-illegal for paladin before writing it.

**Do not** land, merge, or set `TBC_ALLOW_DEV_MERGE=1`.
