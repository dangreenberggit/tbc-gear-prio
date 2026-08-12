# Round-5 plan — close the issue-1 residuals + per-spec meta table

Owner-approved 2026-08-12: fix the open issues from the round-4 review and
implement the per-spec preferred-meta table (step6-meta-choice-spike.md,
option 1), with an edge-case research pass first. Executor: a single Opus
(high-depth) agent on `feat/set-bonus-value`, spawned only after the pending
agent-md commit from the other session lands. Research: Sonnet, online,
runs immediately (repo-independent).

## Phase R — meta-gem edge-case research (Sonnet, online, no repo writes)

Question: in TBC (Classic-era wowsims `tbc-new` presets, wowhead "best gems"
guides, phase BiS lists), does any DPS spec's recommended META gem change
across phases or conditions — e.g. a caster swapping spell-crit-damage
(Chaotic Skyfire) for a haste/other meta in some phase, or a meta choice that
depends on gear/hit levels? Deliverable: a markdown note per researched spec
(ret, feral cat, plus the obvious casters/melee wowsims supports) listing the
recommended meta per phase with sources, and a verdict: static-per-spec table
sufficient, or does any spec need per-phase entries / a disclosed caveat?
Output file: `.scratch/handoffs/issue-1-upstream-gem-cleanup/meta-gem-research.md`.

## Phase X — execution (Opus, after the agent-md commit lands), in this order

1. **Ticket 136 item 5 (fixture) FIRST** — add coverage that actually
   exercises both changed socket-bonus branches: a character/layout with an
   inactive worn meta, and a meta-only-socket item (e.g. 28559) in reach.
   Rank-level test through the recorded adapters (or a committed fixture) so
   the round-4 null result becomes a real measurement. Re-run the before/after
   commands from ADR-0025 decision 3 if a new fixture makes them meaningful.
2. **Ticket 107 (candidate-arm substitution disclosure)** — swaps made inside
   `equipmentForCandidateSwap` currently vanish. Surface them per-row
   (PLAN.md §9: every adjustment disclosed as a substitution). Mind the
   report-shape: per-row data, not just the run-level `substitutions` list;
   re-pin goldens render-only.
3. **Ticket 135** — add `"repair-failed"` to `UnmeasuredReason`
   (`set-value.ts`), use it at the `buildSetBonuses` push site, test, check
   renderers switching on the enum.
4. **Ticket 136 items 1–4 (cleanups)** — one shared socket-bonus predicate,
   `repairAndMinimize` helper, skip-array fold, five-seed script dedupe.
   Each is small; do or explicitly reject in the ticket.
5. **Per-spec meta table** — per the spike note. Phase R verdict
   (meta-gem-research.md, 2026-08-12): static table defensible — melee DPS →
   Relentless 32409, caster DPS → Chaotic Skyfire 34220, across phases, no
   crit/hit-breakpoint switching found. Two gaps the executor must close
   locally before writing table rows: (a) confirm Chaotic Skyfire 34220's
   phase in our own gem data (`data/gems/` palette / db.json phase field) —
   one online source claimed "phase 3", UNVERIFIED, and a pre-P3 caster row
   must respect whatever our data says; (b) read the vendored upstream
   presets (`vendor/wowsims/`, sync first) to confirm each spec's presets
   carry one static meta — the online agent could not inspect the repo. thread `DetectedSpecId` into
   the fill/repair palette context; `SPEC_PREFERRED_METAS` with ret `[32409]`
   byte-identical behavior; fail-loud "no meta preference recorded" disclosure
   path + test for uncovered specs; stamp entries "as of wowsims/tbc-new @
   v0.0.101 (8aa378b3)". **Incorporate Phase R's verdict**: if any spec's meta
   is phase- or condition-dependent, shape the table (or its disclosure) to
   say so rather than baking a single silent choice. Feral's entry waits for
   the re-pin if upstream presets at the pin don't carry it.
6. Per green slice: commit; `pnpm verify` before finishing. Close tickets with
   checked (or annotated) acceptance boxes. Update this file's checklist.
7. Do NOT land, merge to dev, or run `pnpm land`. End with a handoff
   (Status/what/paths/verification/concerns).

## Constraints

- TDD (`tdd` skill) for every fix; failing test first.
- Durable-claims rule for every measurement written down.
- Comment policy: why, never what.
- The other session's agent-md commit must be the base or an ancestor —
  assert the base SHA in the handoff.
