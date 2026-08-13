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

## Execution log (2026-08-12, round-5 executor)

Base: `f491310` (the agent-md commit from the other session, as required).
All six Phase X items done, in the planned order. No landing, no merge.

- [x] **1. Ticket 136 item 5 (fixture)** — `2e55dce`. Two tests through
      `equipmentForCandidateSwap`. Both pass on arrival (the behaviour was
      already correct), so non-vacuity was shown by **mutation**: reverting each
      predicate independently fails the corresponding test. The round-4 null
      result is now a real measurement. The ADR-0025 decision-3 before/after
      commands were not re-run — the new coverage is a rank-level test, not a
      new CLI fixture, so those commands measure the same thing they did.
- [x] **2. Ticket 107** — `3539cfe`, closed. Report-shape decision recorded in
      the ticket: a new optional `RankedItem.gemSubstitutions` rather than
      extending the run-level `substitutions` list. **Residual disclosed**: the
      ticket's Reproduce command was not re-run, so "minimizeRegems may have
      shrunk the recolour set to zero" stays untested; a probe against the
      committed fixture found zero recolours, which is consistent with it.
- [x] **3. Ticket 135** — `a6b911c`, closed. `"repair-failed"` added; the
      renderer gap was caught by typecheck because `UNMEASURED_REASON_TEXT` is
      an exhaustive `Record`.
- [x] **4. Ticket 136 items 1–4** — `2f32a2b`, `c196c47`, `cc5b4b3`, closed.
      All four done, none rejected. Item 3 folded only the two
      *candidate* skip arrays; `packageSimSkips` was deliberately left out (its
      shape differs, and round-4 finding 5 exists because a `setId` once
      masqueraded as an `itemId`). Item 4 was verified by **re-running both
      five-seed arms** against the live sim binary — ret 3.4 / SE 1.678, feral
      3.6 / SE 1.774, both matching the committed artifacts byte-for-byte apart
      from the new `"spec"` field.
- [x] **5. Per-spec meta table** — `ec56939`, spike note updated in `6a0e259`.
      Both research gaps closed first (`23df60f`), from committed data:
      Chaotic Skyfire 34220 is **phase 1** in our db.json/palette (the online
      "phase 3" claim does not describe our data), and the vendored presets
      confirm one static meta for ret and **none at all** for feral.

      The plan's phrasing anticipated a table over the researched specs. The
      real constraint is `DetectedSpecId` = `ret | feral | feral-tank`, so the
      table can only have three rows; feral's is deliberately absent because
      upstream has no feral meta to copy (all five presets wear the socketless
      Wolfshead Helm 8345). Ret is byte-identical — no existing test changed.
- [x] **6. Commits per green slice; `pnpm verify` exit 0** at `ec56939`.
- [x] **7. No land, no merge, no push.**
