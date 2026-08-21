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

## Are we overriding user settings? No — we are supplying assumptions the user never gets to make

There is **no user-supplied skeleton**. `cli.ts:83` documents every flag; none
of them names a skeleton, preset, rotation, or raid setup. The user supplies
`--region`, `--realm`, `--character`, `--spec`, `--max-phase`, and presentation
flags. Everything about the simulated raid — the rotation, buffs, debuffs,
talents, consumables, encounter length and target — is chosen by us.

So this is not an override question. It is that the assumptions are **ours**,
they are invisible to the user, and at least one of them (a druid that starves
for 12.34 of 180 seconds) is demonstrably wrong.

`PRESET_ID_BY_SPEC` (`rank.ts:545-548`) maps both specs to
`p2.raid-sim-skeleton`. Its comment explains only how the id is *plumbed* —
"Hashed and disclosed from one place, so the two cannot drift apart" — so the
preset id reaches the content hash and the assumptions drawer together. That
explains the wiring. **It does not explain why the values are what they are,**
and no comment, ADR, or commit message found so far does. Establishing whether
the P2 choice was reasoned or merely inherited is part of this ticket's work.

Two concrete defects around it:

1. **`p2` is baked in twice** — in the map above and again in the CLI's path
   (`cli.ts:304-305`, `data/presets/${args.spec}/p2.raid-sim-skeleton.json`) —
   while `--max-phase` is a real user input accepting 2/3/4/5 (`cli.ts:199`).
   So the one phase-related thing a user *can* state, the skeleton ignores. P3
   gear is ranked in a P2 raid environment, and no feral P3 skeleton exists.
2. **Disclosed is not validated.** The assumptions drawer reports what was
   assumed; nothing checks the assumptions describe a sane character.
   Disclosure is not a substitute for the values being right.

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
3. **Were these assumptions ever chosen, or merely inherited?** Establish the
   provenance of the P2 skeleton and its contents — `git log`/`git blame` on
   `data/presets/*/p2.raid-sim-skeleton.json` and on `PRESET_ID_BY_SPEC`, plus
   any ADR or PLAN.md section. If a reasoned choice exists, record it. If the
   values were inherited from an upstream preset and never revisited, say so
   plainly — that is a different (and worse) situation than a considered
   default, and it changes what a fix looks like.

4. **What is the right relationship between the skeleton and a ranking?** The
   current design pins one file per spec and discloses its hash. Alternatives
   worth pricing: validate the skeleton at load; make phase track
   `--max-phase` rather than hardcoding `p2`; let a user supply their own
   skeleton (there is no such flag today); assert properties (non-starving,
   non-empty equipment) rather than pinning content. Each needs a stated
   winning condition before measuring. Note the owner's framing: assumptions
   that are "some random dogshit we're throwing into the program" are
   something to **fix**, not merely to disclose.
5. **Is `secondsOomAvg` worth capturing?** `SimObservation`
   (`seams/sim-runner.ts:20-25`) carries only `{dps, stdev, iterationsDone,
   simVersion}`; `CliSimRunner` (`cli-sim-runner.ts:73-82`) reads
   `raidMetrics.dps.{avg,stdev}` and discards the rest. `secondsOomAvg` lives
   at `raidMetrics.parties[0].players[0].secondsOomAvg`. It predicted every arm
   above. **Cost note:** `SimRunner` is one of the three architectural seams
   (PLAN.md §5) and `RecordedSimRunner` replays committed fixtures storing only
   those four fields, so adding a fifth means regenerating recordings — not a
   one-line change. Price it before proposing it.
6. **Does the P2-skeleton-for-P3-gear mismatch change any ranking?** Measurable
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

---

## 2026-08-20 session — failure record

**Status: ticket NOT advanced. Read this before trusting anything attributed
to that session, including any subagent report or plan review from it.**

A stage-gate session (plan / adversarial review / execute) ran against this
ticket and produced results that were then discarded by the owner. The reason
is recorded here because the failure pattern is the reusable part.

### What was committed, and why only this

1. The `manaSpringTotem` correction (commit `903c714`) — the one claim
   verified directly against the artifact it describes.
2. Three probe scripts, each carrying a provenance disclaimer (`b82719c`) —
   kept for two output-parsing traps and an ablation harness, explicitly not
   for their numbers.

Everything else was reset. No findings document, no ticket answers, no
`secondsOomAvg` change.

### The false claims, and how each entered

All five were stated as fact by the orchestrating agent. Three came from
relaying a subagent report without checking it; two from reading part of an
artifact and asserting a conclusion about the rest.

| Claim stated | Truth | How it entered |
| --- | --- | --- |
| `secondsOomAvg` is at `raidMetrics.dps.secondsOomAvg` | It is on `UnitMetrics` (`api_pb.ts:912`, field `:960`); `RaidMetrics.dps` is `DistributionMetrics` (`:853-897`), which has no such field. **This ticket's original path was correct.** | Subagent report, relayed unchecked into the brief and the plan; a plan step would have written the falsehood into two committed artifacts as a "correction" |
| The rotation's last priority entry is an **unguarded** Cat Form cast | Entry 11 is guarded by `currentEnergy <= 30` | Partial read — saw the cast, did not read the adjacent condition. Became a whole hypothesis |
| Item 12662 is a Major Mana Potion | It is `conjuredId`, a Demonic Rune (mana at the cost of health). The potion is `potId` 22838, a Haste Potion, on a different entry | Partial read of the consumables block |
| Cat Form casts are 0 per iteration | The top-level `casts` field is empty; counts live in `targets[].casts`. See the probe scripts | Own script summed the wrong field and returned a confident zero |
| Intellect buys +0.76 shifts at 120s rising to +3.04 at 600s | Not reproduced by the orchestrator. Relayed from an executor report as though first-hand | Relayed unverified |

Two of the five were caught by the adversarial reviewer, two by a later run,
one by the owner.

### Consequence for the artifacts of that session

The plan reviews were **fed the false claims as premises**. A review can only
attack what it is given, so its clean verdicts on those points prove nothing.
Any plan, review, or executor report from 2026-08-20 should be treated as
unverified regardless of how carefully it reads.

### What is still open, and what is not

**Not open — verified independently by the owner and re-checked:** the skeleton
carries `manaSpringTotem` and `judgementOfWisdom`.

**Open, and untouched by this session:** the six questions in this ticket.
Q1's displacement answer was produced during the corrupted session and was
reset with the rest; it is not established.

**Open, and worth its own ticket (hypothesis, untested):** melee hit rating
measured 0.00 DPS per 30 rating in both mana conditions during the discarded
session. If a hit-capped baseline is real, hit-bearing candidates would rank
falsely weak. Unconfirmed — the measurement came from the corrupted session.

### Process note

The session churned: the brief was rewritten three times mid-review, a running
reviewer was messaged twice with new instructions, and the scope was re-opened
after a plan had already been reviewed. Injecting unverified facts between
rounds is what made the reviews worthless — each round re-vetted a moving
target whose premises were wrong.
