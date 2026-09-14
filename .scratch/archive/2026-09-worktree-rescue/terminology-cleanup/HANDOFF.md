# Handoff — terminology cleanup plan

## State

The plan is **written and complete**. Nothing has been published. No project
files have been modified.

The user asked for this plan as a deliverable in their first message. It was
initially answered only as conversational analysis — no file was written, so
when they asked for a link there was nothing to link to. The files below were
written late, and still have not been published anywhere the user can reach.
Publishing them is the only outstanding task.

## What exists

All under `.scratch/terminology-cleanup/` (gitignored, untracked):

- `spec.md` — orchestrator brief: two problems, six settled decisions (D1–D6),
  scope + exclusions, hard constraints, execution order, dispatch table,
  definition of done
- `issues/01-context-md.md` — write `CONTEXT.md` (human, blocking)
- `issues/02-stage-rename.md` — Phase N → Stage N (3 × haiku, parallel)
- `issues/03-land-removal.md` — remove jargon "land" (1 × sonnet)
- `issues/04-prose-phase-to-tier.md` — prose phase → tier (1 × sonnet)
- `issues/05-verify.md` — verification sweep (haiku + human)

~636 lines total.

## The one remaining task

Publish the above as an artifact and give the user the URL. Read the six files,
render them as a single page, call the Artifact tool, return the link.

Do not redesign, re-plan, or re-verify anything. The content is done and the
user has approved its substance. Just publish it.

## Decisions already settled — do not reopen

- **D1** Delivery steps rename Phase N → **Stage N**. User confirmed: "stage is fine."
- **D3** `maxPhase` / `CURRENT_PHASE` / per-item `phase` **stay unchanged** —
  they are the game-content sense and partly upstream wowsims identifiers.
  User confirmed: "if its for the game its fine."
- **D5** "land" is deleted, not replaced — three distinct meanings, each gets
  the plain verb it means.
- **D6** `.agents/**` and `.claude/**` are vendored third-party skills, out of scope.

## One open question for the user

`PLAN-REVIEW.md` is a historical record of a completed review, including a
`| Finding | Landed in |` results table. Editing it rewrites the past.
Default in the plan is **leave it alone** (spec §6 option a). Not yet ruled on.
This blocks issue `03`, not the publish.

## Notes for whoever picks this up

Three findings from line-level verification that are already baked into the
issue files and should not be re-derived:

1. `[P0]` markers (~14 in `PLAN.md`, meaning "verified in Phase 0") must become
   `[S0]`, or the rename reintroduces the exact ambiguity being killed.
2. Three "land" sites are literal correct English about enchant names landing on
   gear slots — `PLAN.md:589`, `docs/verification-log.md:46`,
   `scripts/verify_fixture.py:257`. A sed pass would corrupt them.
3. `python scripts/sync_wowsims.py --check` is the real regression test — it
   parses `CURRENT_PHASE` by regex at `scripts/sync_wowsims.py:85`, so any
   overreach into frozen identifiers fails there. `pnpm verify` will not catch
   a terminology error.
