# 412 — Align comment style: our fork-side bulk comments, and upgrades/ density

Status: open
Type: task
Origin: 411 follow-up (2026-09-17) — comment-style contrast between the upstream
bulk sim code and our upgrades sim code, surfaced by the owner
Blocks: —
Blocked by: none

## What

Two related comment-style clean-ups this branch must handle before it is done.

### Part A — our added comments inside the upstream bulk dir

Commit `993320fab` ("Size the bulk finalist stage independently", the 411
finalist-stage fix) added our-style comments into upstream files under
`vendor/tbc-new-fork/sim/core/bulk/`. They stand out against upstream's terse
norm — long, WHY-focused, citing tickets and measured numbers. This is a **fork
edit** and goes through the fork queue (single shared working tree, strictly
serial) and drags the re-pin cycle.

Rule: **do not change comments or code that is already upstream.** Only our own
added lines are in scope. Upstream-original comments and all upstream code stay
byte-identical (the bulk dir is otherwise byte-identical to upstream/master, and
we want to keep the divergence as small as possible for future catch-ups).

The named blocks to bring back toward upstream's terse style (or remove if they
restate the code):
- `sim/core/bulk/bulk_sim.go:117-123` — the culling-interval comment ("Iteration
  targeting deliberately keeps using the current stage's count... inflates the
  final stage's iterations (measured +17.6%)").
- `sim/core/bulk/bulk_sim.go:191-193`, `:207-209` — cross-references "(see
  bulk_sim.go / merge.go)", "(C4)".
- `sim/core/bulk/merge.go:73-79`, `:87-90` — the `bulkSimFinalistCount` and
  `mergeBulkSimFinalists` doc comments citing "ticket 403/411" and "(C4)".

A load-bearing WHY that upstream would genuinely need (e.g. why the merge exists
at all) can stay, but stated the way upstream states things: short, no ticket
numbers, no C-id references, no measured percentages. Ticket/C-id provenance
belongs in our own tracked docs, not in fork-side Go source that ships next to
upstream code.

### Part B — our upgrades/ comment density

Our own TypeScript under
`vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades/` runs to dense
multi-paragraph comment blocks that sometimes exceed the code they annotate
(`screenCandidates` in `engine/rank.ts` has a ~40-line doc comment over a ~90-line
function; `engine/bulk/partition.ts` spends ~65 comment lines on an 11-line
function). Review whether these should be trimmed toward the project's
"comments explain WHY, never WHAT" policy without losing the load-bearing WHY.

Judgment call, not a blanket cut: **development-time comments that are currently
useful may stay until the work is done.** This is a keep-until-end review, run
near the branch's finish, not an immediate removal. The test per comment is the
project policy: does it explain a non-obvious WHY (a constraint, a rejected
alternative that is an inviting mistake, a pointer to the finding that forced the
shape), or does it restate the code? Restatements go; load-bearing WHY stays,
tightened.

## Why

The comment-style contrast (411 follow-up): upstream bulk comments are short
functional notes (1-4 lines, mostly WHAT); ours are dense arguments that cite
tickets/specs/measured numbers and pre-empt a reader's wrong instinct. Part A is
about keeping our fork divergence minimal and not carrying our provenance idioms
into shipped upstream-adjacent code. Part B is about our own code meeting our own
policy without throwing away genuinely useful development context prematurely.

## Done when

- Part A: our added comments in `sim/core/bulk/` are either removed or rewritten
  in upstream's terse style; no upstream-original comment or code is touched;
  fork re-pinned; `pnpm verify` green; desktop gate (a)-(h) still pass. Verify
  `git -C vendor/tbc-new-fork diff upstream/master -- sim/core/bulk/` shows only
  the functional change plus minimal terse comments, no ticket/C-id idioms.
- Part B: a reviewed pass over `upgrades/` comment density, run near branch
  finish, with each trimmed block justified against the WHY-never-WHAT policy and
  each kept block still load-bearing. Development comments kept until the work
  they support is done are noted as such.
