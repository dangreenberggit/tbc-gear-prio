# 04 — Prose "phase" → "tier" (game sense)

Type: task
Status: open
Assignee: 1 × sonnet
Blocked by: 03

The hard pass, and the one review R2 got wrong. Every site needs a per-sentence
call: is this sentence naming *the identifier* (leave it, backtick it) or
*the concept* (say "tier")?

By this point issue `02` has removed every delivery-sense "phase", so anything
still reading "phase" is game-sense. This issue is polish, not disambiguation —
the ambiguity is already gone. **If a site reads fine as-is, leave it.** Do not
churn prose for uniformity's sake.

## The test to apply per site

> Could you replace this word with the literal string `maxPhase` and have the
> sentence still be true?
>
> - **Yes** → it is naming the identifier. Leave it; backtick it if bare.
> - **No, it means the game's content release** → write "tier".

## Constraints

> **NEVER modify:** `CURRENT_PHASE`, `currentPhase`, `defaultMaxPhase`,
> `maxPhase`, `ContentPhase`, `DEFAULT_MAX_PHASE`, `Phase.PhaseN`,
> `export enum Phase` — including in quoted upstream blocks and regexes.
>
> **Do not touch:** `.agents/**`, `.claude/**`, `test/fixtures/**`,
> `data/wowsims.lock.json`, `PLAN-REVIEW.md`, `scripts/sync_wowsims.py`
> (game-sense throughout; `02` already made its one edit).
>
> Prose only. No behaviour changes. Preserve the T4/P1…T6/P5 notation — it is
> established player shorthand and is not being retired.

## Candidate sites in `PLAN.md`

Judgment required on each; the suggestion is a starting point.

- `:163` — "displayed as *'candidates: phase ≤ 2'*" — **user-facing UI string.**
  → *"candidates: tier ≤ 2"*. Strongest case in the file.
- `:650` — "**Phase ≤ `maxPhase`**" heading — mixes concept and identifier
  → "**Tier ≤ `maxPhase`**"
- `:650` — "the 39 phase-3 gems are the epic gems arriving 2026-08-27"
  → "the 39 T6 gems…"
- `:650` — "all 18 are phase 1" → "all 18 are T4"
- `:516` — "1,169 of 2,167 phase-1 epics" → "T4 epics"
- `:300` — "Each entry carries its own `phase`" — **identifier.** Leave.
- `:296` — "One per (spec, tier); selected by maxPhase" — already correct. Leave.
- `:504` — "every entry carries its own `phase`" — **identifier.** Leave.
- `:305`, `:308` — field lists in a directory tree — **identifiers.** Leave.
- `:259` — "they stop at P2" — player shorthand. Leave.
- `:631` — "inherit from the spec preset for that phase/slot"
  → "for that tier/slot"
- `:29` — content-tier table row; check it reads cleanly post-`02`
- `:847`, `:868`, `:873`, `:889` — check; likely already fine

## Candidate sites in `docs/`

- `docs/verification-log.md:90` — "Highest gem phase in use is 1." → "…tier is T4."
- `docs/verification-log.md:150-151` — "Gems by phase are 163 / 6 / 39 / 0 / 6"
  and "the 39 phase-3 epic gems that `maxPhase` must gate" → "Gems by tier…",
  "the 39 T6 epic gems…"
- `docs/verification-log.md:147` — "hunter *additionally* carries
  `builds/phase_N/*.build.json`" — **upstream path.** Leave.
- `docs/stage0-findings.md:58` — "a single default per spec/phase"
  → "per spec/tier"

## Deliberately excluded

- `scripts/verify_fixture.py:214`, `:219-221` — `phase=` in printed output and
  the `max_phase` local mirror the data field. Renaming the local buys nothing
  and risks the script. Leave.
- `data/wowsims.lock.json` — generated. Leave.

## Report back

Every change as `file:line` — before → after — **and** a list of sites
considered and deliberately skipped, with the reason. The skip list is the
valuable half: it is the record of where "phase" is correct, which is what stops
a future pass from re-churning these lines.

## Done when

- [ ] Every candidate site visited and either changed or explicitly skipped
- [ ] No frozen identifier altered
- [ ] `pnpm verify` passes
- [ ] `python scripts/sync_wowsims.py --check` passes
- [ ] Change list + skip list reported and reviewed
- [ ] Committed
