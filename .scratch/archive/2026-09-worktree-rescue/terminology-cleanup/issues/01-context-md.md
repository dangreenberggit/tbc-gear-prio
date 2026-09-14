# 01 — Write CONTEXT.md

Type: task
Status: open
Assignee: human (do not delegate)
Blocked by: —

## Why this is first

`docs/agents/domain.md:7` already tells every engineering skill to read
`CONTEXT.md` before exploring the codebase. `docs/agents/domain.md:27` already
says *"use the term as defined in `CONTEXT.md`. Don't drift to synonyms the
glossary explicitly avoids."*

The enforcement mechanism exists and points at a file that was never written.

Review R2 already tried to fix the phase overload once, by burying a
capitalisation ruling at `PLAN.md:41`. It was violated ~15 times in the same
document. The lesson is not "try harder" — it is that a ruling has to live where
the tooling looks.

## Task

Create `CONTEXT.md` at the repo root.

### Required content

**Glossary entries:**

- **Stage** — a delivery step in our build plan, `Stage 0`–`Stage 5+`, each with
  a written exit gate. Defined in `PLAN.md` §14. Never "phase".
- **tier** — a TBC game content release, T4–T6 / P1–P5. The player-facing and
  prose term for the game sense.
- **`phase`** — the *identifier* for content tier, in code and on the wire only.
  Kept because `CURRENT_PHASE` and the per-item `phase` field are upstream
  wowsims identifiers that `scripts/sync_wowsims.py` parses by regex. Never
  refers to a delivery step.
- **`maxPhase`** — user input; inclusive content-tier filter (`1`–`5`). At
  `maxPhase: 2` the pool holds T4/T5 gear and the gem palette excludes epic
  gems. In `contentHash` and `assumptions`.

**Banned words** — state each with its replacement and a one-line reason:

- *"Phase N" for a delivery step* → `Stage N`. Collides with game content tiers.
- *"land" / "lands" / "landed" for merging, shipping, or building* → say the
  actual thing: "merge to main", "ship in Stage 2", "is built in Stage 2".
  Ambiguous shorthand that saves no words.
  - Note the legitimate exception: enchant names *landing on* gear slots is
    literal and correct English. The ban is on the merge/ship/build sense.

**The invariant, stated plainly:** after this cleanup, "phase" in this repo means
the game sense only. "Phase 2" written about our plan is always a mistake.

## Then

Replace the terminology paragraph at `PLAN.md:41` — it currently states the
failed R2 capitalisation rule — with a one-line pointer to `CONTEXT.md`. Keep
the `[R2]` attribution so the review trail survives.

## Done when

- [ ] `CONTEXT.md` exists at repo root
- [ ] All four glossary entries present
- [ ] Banned-words list covers both "Phase N" and "land", each with a reason
- [ ] The literal-"land" exception is noted
- [ ] `PLAN.md:41` points at `CONTEXT.md`; no capitalisation rule survives
- [ ] Committed
