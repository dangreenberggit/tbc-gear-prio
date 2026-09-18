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

## 2026-09-17 — Part A done, Part B vocabulary pass done, density deferred (stage-gate 412-comment-style)

Two comment-only fork commits on `feat/upgrades-tab`, then one core re-pin. Fork
tip moved 693a3f3c -> f7e4398c (via 5be3a563). `pushed` stays false. Behaviour
unchanged: `git diff upstream/master -- sim/core/bulk/ | grep -c '^-[^-]'` is
still 3, desktop gate (a)-(h) pass with no golden update, `pnpm verify` rc 0.

Part A (fork commit 5be3a563): trimmed the four added finalist-stage comments in
`sim/core/bulk/` (bulk_sim.go:191-193 merge comment, merge.go bulkSimFinalistCount
and mergeBulkSimFinalists docs, stage.go runBulkSimFinalistStage doc) to upstream
terse style — ticket/C-id idioms and the "carries" AI-voice phrasing dropped, the
WHY kept. The culling-interval comment the ticket named (bulk_sim.go ~117-123,
"measured +17.6%") is upstream-original, not ours (`git log -S'measured +17.6'
upstream/master` traces it to upstream commit 748434c9a), so it was left alone;
likewise the three upstream kill-list lines in the dir (bulk_sim.go "lands",
merge.go "carries", merge.go "surface it"). The ticket's :207-209 pointer is the
upstream paired-errors comment, also left alone. This ticket's Part A block list
misattributed the culling comment as ours.

Part B vocabulary pass (fork commit f7e4398c): kill-list pass over 81 comment
lines in 29 files under `upgrades/` (the C9 grep counted 82 lines in 31 files;
two of those files, engine/migrate-gems.ts and engine/slots.ts, held only a
surface-as-noun hit — allowed by the rubric — so they were left unedited, leaving
29 touched). Six surface-as-noun lines kept: player_gear_source.ts:4/:41,
rank.ts:6, migrate-gems.ts:10, slots.ts:7, fixtures/report-events-offline.ts:49.
The two code-line kill-list hits were not touched (report-events-offline.ts:121
template literal, export_equip_eligibility.mts:83 Error string — editing them
changes behaviour). 17 engine files are PROVENANCE-tracked; 15 changed bytes and
their sha256 rows were recomputed; E-W3 green before and after; engine-port-drift
reds before the row edits (by design) and passes after. The per-block before/after
record is at `.scratch/stage-gate/412-comment-style/prose-record.md` (4 Part A
entries + 67 Part B entries).

Part B **density** judgment deferred to branch finish, per this ticket's own
keep-until-end rule and ticket 410's survey ("overwhelmingly load-bearing",
"no defensible cut" under the 406 keep-ruling; only `upgrades_tab.tsx` named for
a harder scan). This pass changed vocabulary and dropped idioms; it did not open
untouched blocks or trim density. Not touched: `upgrades_tab.tsx` (outside the
Part B path), `packages/core/src/` mirrors (the core-side originals carry the same
comments — a possible orchestrator follow-up).
