---
name: sme-rank-review
description: >-
  Game-domain (SME) judgment of a gear ranking for the engineering team. Use
  when the user asks for an SME review, subject-matter check, or domain
  judgment of a rank report — not player loot advice, not pipeline debugging.
---

# SME rank review

Use **game knowledge** (TBC Anniversary ret, equip rules, loot rules, set
bonuses, raid vs PvP, community BiS / guides / wowsims sets) to judge whether
the ranking **results look right for the game**.

**Audience is the engineering team**, not the character. Do not coach the
player (“farm X tonight”). Say what is wrong or suspicious about the output
so engineers can fix the product.

This skill is **not** for explaining our pipeline (pools, EP filters, how
candidates are chosen). If something looks missing or wrong, state the **game
fact**. Leave “why our code did that” to engineering follow-up.

Sharp model lane — see [`docs/agents/model-policy.md`](../../../docs/agents/model-policy.md).

## When to run

- After a real rank that needs a game-domain check
- When asking whether Phase 1 “would a ret trust this?” gates can close
- When reviewing a prior SME writeup (second opinion) — same rules

## Steps

1. **Read the results** — ranked items, baseline gear if available, and any
   stated assumptions (race, phase, preset). You do not need to know how the
   engine built the list.

2. **Ask game questions only**  
   - Can this class equip that item?  
   - Is this normal persistent gear, or special/temporary loot?  
   - Is this raid loot, arena, or something else?  
   - Given what the character is wearing, do large gains/losses make sense?  
   - Are well-known strong pieces for this tier absent from the results in a
     way that looks wrong?  
   - Are weak or irrelevant pieces showing up as if they mattered?

3. **Write the handoff** under `.scratch/handoffs/` (e.g.
   `sme-rank-judgment-<label>.md`). Required sections:

   - **Verdict** — `trust` / `trust-with-caveats` / `do-not-trust` (product
     gate, not player coaching)
   - **What was reviewed** — character, phase, baseline gear summary, where
     the results came from (file paths)
   - **Game problems** — each finding is a game fact (equip, loot rules,
     BiS expectations, nonsense deltas). Plain language.
   - **Rows that look fine** — brief
   - **Gate** — would you trust this output as a ret who knows the game?
     What must be true before yes?
   - **Notes for engineering** — optional one-line pointers (“bow on a
     paladin”, “item already equipped but shown as a loss”) without pipeline
     jargon

4. **Done when** the handoff exists, uses those verdict labels, speaks to
   engineers, and every finding is grounded in the game — not in how our
   filters work.

## Hard rules (game only)

- Prefer plain, short sentences. No slogans.
- Call out **class equip rules** (e.g. ret ranged slot is a libram, not a
  bow or gun).
- Call out **special loot rules** when relevant (e.g. Kael’thas legendary
  weapons exist only inside that fight/raid and are not normal gear you keep).
- Separate **raid loot**, **arena / PvP**, and **temporary / encounter-only**
  items.
- Flag **already-worn gear** shown as an upgrade or as a large loss — that
  fails a basic sanity check in-game.
- Flag results that contradict well-known tier expectations when you are
  confident; say when you are unsure.
- Soft ordering when gains are tiny is fine to note as “not worth arguing
  over,” without inventing a wishlist.

## Forbidden

- Player coaching (“act on tonight”, “chase this”) as the main message
- Teaching or relying on **our** terms: shortlist mechanics, EP top-N,
  “never offered”, prefilter, candidate pipeline, weapon-damage-in-EP, etc.
- Diagnosing root cause in code or data generation (engineers do that next)

## Second opinion

Same audience and same game-only scope. Score how useful the writeup is for
engineers deciding whether the **game-facing output** is trustworthy.
