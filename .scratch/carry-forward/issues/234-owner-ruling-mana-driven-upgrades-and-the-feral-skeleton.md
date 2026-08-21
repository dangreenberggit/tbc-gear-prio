Status: wontfix
Type: decision (product ruling required; needs the owner, not an agent)
Origin: ticket 227 acceptance criterion 5e, 2026-08-19 — the executor of the
  tickets-226-230 stage-gate cannot rule on it; handoff at
  `.scratch/handoffs/ticket-227-healer-noise.md`
Blocks: 227
Blocked by: none

# Owner ruling: what to do about mana-driven upgrades on the feral fixture

## PARKED 2026-08-20 — do not investigate

**Owner ruling: punted.** `wontfix` here means parked indefinitely, not
judged wrong — it is the merge gate's vocabulary word for a ticket nobody is
working (`KNOWN_STATUSES`, `scripts/check_merge_ready.py:62`). Reopen it to
`open` if the owner ever wants the ruling made. No agent should
spend measurement time on it.

Why it is parked rather than answered: the question is shaped like an empirical
one and is not. Every agent that has picked it up has tried to *earn* the ruling
with sims, and the cost has been hours per attempt for no decision. The
measurements it would need already exist — `.scratch/handoffs/ticket-227-healer-noise.md`
and the ticket-226 direct sims. What is missing is a product judgement, and more
sim time does not produce one.

**If you are an agent reading this: stop here.** Do not run sims, do not
re-measure, do not open the handoffs to "check". Only the owner may move this
ticket. If some other work appears to be blocked on it, say so in chat and let
the owner decide — do not attempt to unblock it by ruling on their behalf.

This does not block the Stage 2 gate. The open Stage 2 box is the
"≥3 real characters produce believable shortlists" SME check
(`PLAN.md` §14), which is independent of this ruling.

Ticket 227 asked whether role-inappropriate items should be pooled at all,
and flagged it as a product question. The diagnostics answered the empirical
half and left the ruling. This ticket carries the ruling so 227 can close on
everything else.

## What was measured

Ten healer-statted items score +4.61 to +7.80 DPS for the feral P3 fixture
and clear the cutoff. Ticket 227 hypothesised noise. **That hypothesis is
refuted:** nine of the ten still clear at 30,000 iterations, and across five
independent seeds the delta for 29308 has a standard deviation of 0.212 DPS.

The mechanism was isolated by adding one stat at a time through `bonusStats`
with gear untouched:

| added stat | delta DPS at 30,000 it |
| --- | --- |
| intellect 25 | +29.92 |
| mp5 10 | +13.17 |
| healing power 64 | 0.0000 |
| spellpower 22 | 0.0000 |
| stamina 28 | 0.0000 |

Healing power and spellpower are worth exactly nothing, as expected. **The
character is mana-starved**, so intellect and mp5 buy casts. Both saturate at
the same ceiling (int +2500 → +157.13; mp5 +1000 → +156.76), which is the
signature of a hard mana constraint rather than a stat weight.

The cause is the fixture's raid setup:
`data/presets/feral/p2.raid-sim-skeleton.json` runs a **180-second** encounter
with Arcane Brilliance and Divine Spirit but **no Blessing of Wisdom and no
Innervate**.

**Correction (ticket 241, 2026-08-20):** this sentence originally also denied
the presence of a mana spring totem. That was false. The skeleton carries
both `manaSpringTotem` (line 1134) and `judgementOfWisdom` (line 1196) --
`grep -n "manaSpringTotem\|judgementOfWisdom"
data/presets/feral/p2.raid-sim-skeleton.json`. The character is mana-starved
*despite* both, which makes the starvation finding stronger, not weaker: the
obvious mana buff is already there and is not enough.

Reproduce: `npx tsx packages/core/test/measure-ticket-227-direct.ts`, plus the
`bonusStats` probe described in the handoff.

## What needs ruling

**1. Should the skeleton carry a mana-restoring buff?** This is the
higher-leverage question, because it moves every mana-sensitive row at once
instead of annotating them one by one. A feral druid in a real TBC raid
almost always has a paladin or shaman supplying mana; a 180-second fight
without any is arguably not the configuration this tool should be advising
against. Changing it would be a fixture change with a re-record behind it, so
it is not cheap — but it is the difference between the tool modelling a
typical raid and modelling an unusual one.

**2. Should role-inappropriate items stay in the pool?** Three options:

- **Exclude, as ticket 171 did.** Precedent exists (ticket 171 resolution,
  2026-08-15, excludes stub-only items) but does not transfer cleanly: 171
  excluded items the sim *could not score*, whereas these are scored
  correctly and genuinely do produce DPS here. Excluding would mean
  suppressing a true measurement because the answer is unintuitive.
- **Keep and caveat.** Keep them, and have the report say why a healer ring
  is showing as an upgrade — the gain is mana, not healing.
- **Keep as-is.** Only defensible if the reader is assumed to understand that
  a +5 DPS healer ring means something other than what it appears to.

**Executor's recommendation: fix the skeleton (1) and caveat (2).** The rows
are a true signal about the fixture's raid configuration, not about healer
gear. Excluding the items would hide the symptom of a modelling choice that is
better addressed directly.

## Acceptance criteria

- [ ] Owner rules on whether the feral skeleton gains a mana-restoring buff,
      and if so which; the change and its re-record are then their own ticket.
- [ ] Owner rules on pool membership for items with no class-usable stat:
      exclude, keep-and-caveat, or keep. If "keep" in any form, record that
      the report must not present them as upgrades without the caveat.
- [ ] Ticket 227's 5e checkbox is ticked with a pointer here, and 227 closes.

## Out of scope

- Re-recording any fixture before the ruling.
- Ticket 226's trinket and head findings, which are diagnosed and separate.
- The effects-classifier labels (ticket 237).
