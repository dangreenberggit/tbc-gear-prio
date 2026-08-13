# Context — domain vocabulary

The words this project uses, and the words it deliberately does not.

Engineering skills read this file before exploring the codebase
(`docs/agents/domain.md`). If you are naming something — an issue title, a test
name, a hypothesis, a commit message — use the terms defined here.

---

## Glossary

### Stage

A delivery step in our build plan: `Stage 0` through `Stage 5+`, each with a
written exit gate. Defined in `PLAN.md` §14.

Never call one of these a "phase". That is the whole point of this glossary —
see the invariant below.

**"Stage" is ours, and it never describes the game.** TBC has no stages — it has
phases and tiers. If a sentence is about game content (curated sets, BiS scope,
gear, gems, loot), the word is **phase**, never "stage", whatever its case.

The one other legitimate use is internal: the eight stages of the `rankUpgrades`
pipeline (`PLAN.md` §3), and the `stage:` field on its progress events. Those
were always called stages and keep the name. Say "pipeline stage" where a
sentence could be read either way — do not rely on capitalisation to carry the
difference, for the same reason the R2 rule failed.

### tier

A TBC game content release: T4–T6, also written P1–P5. This is the
player-facing term and the one to use in prose.

The two notations map like this:

| Content phase | Tier                                    |
| ------------- | --------------------------------------- |
| P1            | T4                                      |
| P2            | T5                                      |
| P3            | T6 — head, shoulder, chest, legs, hands |
| P4            | no tier token (Zul'Aman)                |
| P5            | T6 — belt, boots, bracers (Sunwell)     |

The `T4/P1 … T6/P5` shorthand is established player language and is not being
retired.

**Phase and tier are not one-to-one.** T6 is split across two phases: P3 drops
the five token slots, and P5 (Sunwell) drops the remaining three of the _same_
set — Absolution Regalia, Lightbringer Battlegear, Thunderheart Harness all
carry `phase: 3` and `phase: 5` pieces in `db.json`. P4 (Zul'Aman) drops no
tier token at all.

So the 1–5 control is labelled by **phase**, not tier: "candidates: phase ≤ 2"
names a value the filter actually takes, and "tier ≤ 2" would be wrong twice
over — it is the wrong number, and no single tier number identifies P5. Use
"tier" when naming which gear a phase yields; use "phase" for the control
itself, which the CLI spells `--max-phase`.

**"tier" also means the armour set** — _tier set_, _tier piece_, _tier token_
(Justicar, Crystalforge, Lightbringer). The compound form is what tells the two
apart. That sense is not being retired either; in TBC the two align, because P3
content drops the T6 set.

### `phase`

The _identifier_ for a content tier, in code and on the wire only.

It stays as `phase` because `CURRENT_PHASE` and the per-item `phase` field are
**upstream wowsims identifiers** — `scripts/sync_wowsims.py` parses
`CURRENT_PHASE` out of upstream TypeScript with a regex, so renaming it breaks
the sync.

`phase` never refers to a delivery step. Write it in backticks when you mean the
identifier; write "tier" when you mean the thing in the game.

Frozen identifiers, not to be renamed: `CURRENT_PHASE`, `currentPhase`,
`defaultMaxPhase`, `maxPhase`, `ContentPhase`, `DEFAULT_MAX_PHASE`,
`Phase.Phase1`–`Phase.Phase5`, `export enum Phase`.

### `maxPhase`

User input: an inclusive content-tier filter, `1`–`5`.

At `maxPhase: 2` the pool holds T4 and T5 gear, and the gem palette excludes
epic gems. **Inclusive is the load-bearing word** — at `maxPhase: 2` a player
still sees Karazhan drops and Badge of Justice gear, much of which is still
competitive at T5.

It appears in `contentHash`, in `assumptions`, and on the CLI surface.

---

## Banned words

### "Phase N" for a delivery step → **`Stage N`**

It collides with the game's content tiers, which are also phases and which
players, wowsims and Blizzard all call phases. We do not get to have that word.

An earlier attempt (review R2) tried to solve this with capitalisation —
capital "Phase N" for delivery, lowercase for content. It failed, and was broken
about fifteen times in the document that declared it. Capitalisation is invisible
mid-sentence, does not survive being read aloud, and cannot be put in an
identifier or a filename.

### "land" / "lands" / "landed" for merging, shipping, or building

Say the thing you actually mean:

| Instead of                  | Write                                              |
| --------------------------- | -------------------------------------------------- |
| "it lands in Stage 2"       | "it ships in Stage 2", or "it is built in Stage 2" |
| "after this branch lands"   | "after this branch merges to `dev`"                |
| "the corrections landed"    | "the corrections were applied"                     |
| "rows fill in as sims land" | "rows fill in as sims finish"                      |

The command is **`pnpm merge-to-dev`**. There is no `pnpm land`; it was renamed
for exactly this reason.

"Land" was doing four jobs at once — merge, ship, build, and arrive — which is
exactly the ambiguity the word buys you. It saves no characters over the verb
you meant.

**Two exceptions, both literal and correct English:**

- Enchant names _landing on_ the gear slots they describe. TBC enchants are
  slot-typed; this is the real verb.
- A figure _landing on_ a scale, or _landing below_ a cutoff.

---

## The invariant

**After this cleanup, "phase" in this repo means the game sense only.**
"Phase 2" written about our own plan is a mistake, and a detectable one.

That is what the rename buys: you no longer have to read the surrounding
sentence to know which kind of phase someone meant.

### Two deliberate exceptions

The invariant holds for prose. Two things keep the old sense on purpose — do not
"fix" them:

- **`docs/reviews/phase-*.md`** — historical records of reviews that happened.
  Renaming them would falsify what was reviewed, and when.
- **The `phase-N/*` branch convention** and the `Blocks: phase-N` ticket format —
  `scripts/merge_to_dev.py` parses both. Renaming them is a tooling migration
  with real risk and no reader benefit.
