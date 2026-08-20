Status: open
Type: investigation (scope unclear; owner has ruled on the acceptance bar, not the fix)
Origin: owner question during the 2026-08-20 ticket 227/234 investigation — "i'm
  more interested in whether or not WE ARE THE PROBLEM--our development of our
  program and whether its flawed"
Blocks: none
Blocked by: none

# The raid-sim skeleton silently determines every ranking, and nothing validates it

## The owner's question, which this ticket exists to answer

Not "can we detect bad settings" — that is a different and easier question. The
question is **whether our own pipeline produces nonsense**, independent of what
settings anyone brings.

## What was established on 2026-08-20

Measured, re-runnable. Six arms, 25,000 iterations, seed 443754031, 180s:

| gear | rotation | `secondsOomAvg` | +40 int | DPS/int |
| --- | --- | --- | --- | --- |
| owner's | TypeSimple | 0.00 | +0.17 (SE 0.66) | ~0 |
| owner's | TypeAPL @ our pin | 4.64 | +8.80 (SE 0.81) | 0.22 |
| repo env | TypeSimple | 0.00 | +0.60 (SE 0.66) | ~0 |
| repo env | TypeAPL @ our pin | 12.34 | +20.51 (SE 0.79) | 0.57 |

The rule held with no exception across every arm: **intellect moves DPS only
where `secondsOomAvg > 0`, and the sensitivity scales with it.**

The owner independently ran the real wowsims online sim (12,500 iterations,
180s, Pendant of the Violet Eye = +40 int): **0 DPS change** on `TypeSimple`
(a 0.67 loss), **+14 DPS** on the upstream-fixed APL. The `TypeSimple` arm was
reproduced locally (delta +0.32, SE 0.66 — inside its own error bar).

**Not reproduced:** ticket 234's +29.92 for +25 int. The steepest measured on
the pinned APL was +14.15 (SE 0.80). Ticket 234's figure is at 30,000
iterations on the committed feral-P3 fixture with composed gear; the arms above
used transplanted gear. Direction agrees, magnitude does not. The gap is
**unexplained, not reconciled** — re-run
`npx tsx packages/core/test/measure-ticket-227-direct.ts` to reproduce it.

## The structural finding

`compose()` (`packages/core/src/compose.ts:29-51`) sets exactly four things on
the skeleton: `name`, `race`, `equipment`, and optionally `database`.

Everything else is inherited from the pinned skeleton file and never
re-examined: **talents** (noted explicitly at `rank.ts:1918` — "leaves
`talentsString` untouched"), **the entire rotation/APL**, all buffs, debuffs,
party buffs, consumables, encounter length, and the target.

So one committed file silently determines the answer for every item ranked, and
nothing in the pipeline treats it as a load-bearing input. No test asserts the
skeleton is sane. No gate checks the character it describes is not starving.

The mana artifact is a **symptom** of that, not the disease: nobody chose a
starving character, it came baked into a skeleton nobody re-examined, and every
ranking inherited it.

## Why the skeleton is hardcoded (answered — it is not a stub)

`PRESET_ID_BY_SPEC` (`rank.ts:545-548`) maps `feral` and `ret` to
`p2.raid-sim-skeleton`. Its comment states the purpose: the preset id is
"Hashed and disclosed from one place, so the two cannot drift apart", routed
through one function so a new spec "reaches the content hash and the
assumptions drawer together or not at all."

The intent is sound — be explicit about which assumptions produced a ranking.
Two things go wrong around it:

1. **`p2` is baked in twice** — in the map above and again in the CLI's path
   (`cli.ts:304-305`, `data/presets/${args.spec}/p2.raid-sim-skeleton.json`).
   P3 gear is ranked in a P2 raid environment, and no feral P3 skeleton exists.
2. **Disclosed is not validated.** The assumptions drawer tells a reader what
   was assumed; nothing checks the assumptions produce a sane character.

## The owner's ruling on the acceptance bar

Quoted, 2026-08-20:

> "let in the mana gear in this weird fringe situation and let the user decide
> what to do--if they ignore mana gear, or it makes our simming slightly
> slower, fine, i guess--as long as it doesnt knock out real upgrades which
> would be insane and would occur if we value int as a zillion nonsensical dps"

So the bar is **not** "mana gear must never appear." It is:

- Mana-statted rows appearing in the pool is acceptable.
- Being slightly slower is acceptable.
- **Displacing real upgrades is not acceptable.** That is the failure to
  prevent and the thing a fix must be measured against.

This reframes the fix: the target is not the presence of these rows, it is
whether the ranking's ordering of *genuine* upgrades survives.

## Open questions — this ticket is an investigation, not a specified fix

The owner's words: "It'll be tricky, because im still not sure what the problem
is, let alone what the solution would look like or how we'd know what a fix is."
So treat the following as the work, and do not assume a fix is known:

1. **Does the artifact actually displace real upgrades today?** Nobody has
   measured this. Take the committed feral-p3 ranking, identify rows that are
   genuine upgrades, and determine whether any is pushed below the cutoff or
   below a mana-statted row. If the answer is "no displacement", the owner's
   bar is already met and the priority drops sharply. **Answer this first** —
   it sizes everything else.
2. **Reconcile or refute ticket 234's +29.92.** The 2x gap against the measured
   +14.15 is unexplained. Which config produces it, and is that config the one
   the pipeline uses?
3. **What is the right relationship between the skeleton and a ranking?** The
   current design pins one file per spec and discloses its hash. Alternatives
   worth pricing: validate the skeleton at load; make phase track the gear
   rather than hardcoding `p2`; accept a user-supplied skeleton; assert
   properties (non-starving, non-zero equipment) rather than pinning content.
   Each needs a stated winning condition before measuring.
4. **Is `secondsOomAvg` worth capturing?** `SimObservation`
   (`seams/sim-runner.ts:20-25`) carries only `{dps, stdev, iterationsDone,
   simVersion}`; `CliSimRunner` (`cli-sim-runner.ts:73-82`) reads
   `raidMetrics.dps.{avg,stdev}` and discards the rest. `secondsOomAvg` lives
   at `raidMetrics.parties[0].players[0].secondsOomAvg`. It predicted every arm
   above. **Cost note:** `SimRunner` is one of the three architectural seams
   (PLAN.md §5) and `RecordedSimRunner` replays committed fixtures storing only
   those four fields, so adding a fifth means regenerating recordings — not a
   one-line change. Price it before proposing it.
5. **Does the P2-skeleton-for-P3-gear mismatch change any ranking?** Measurable
   by comparison, currently unmeasured. **Hypothesis, untested.**

## Out of scope

- Ticket 234's product ruling (whether the skeleton gains a mana buff) — still
  the owner's, still open, still blocking 227.
- Changing the pinned upstream APL, or re-pinning protos. The newer upstream
  APL uses `timeToNextEnergyTick`, absent from our pinned proto and silently
  dropped by `wowsimcli` (`DiscardUnknown: true`) — 12 occurrences across 7 of
  22 priority entries. Drop confirmed behaviourally: 32.89 shifts/iteration vs
  41.85. See ticket 239.
- Whether any particular APL is correct. The pipeline question is separate.

## Prior art — read before re-deriving

- Ticket 234 — the stat-isolation table and the mana-starvation diagnosis were
  already recorded there. A 2026-08-20 investigation re-derived them
  independently before noticing. Read 234 first.
- Ticket 227 — the ten healer rows; blocked on 234.
- Ticket 239 — the proto pin and `timeToNextEnergyTick`.
- `.scratch/handoffs/ticket-227-healer-noise.md` — measured findings. Note it
  asserts the fixture has "no mana spring totem"; that is **false**
  (`p2.raid-sim-skeleton.json` carries `manaSpringTotem` and
  `judgementOfWisdom`). Correct it if this ticket touches that file.
