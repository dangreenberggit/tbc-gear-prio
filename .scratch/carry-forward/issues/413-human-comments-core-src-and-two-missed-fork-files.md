# 413 — Human comments in core/src originals and the two fork files 412 missed

Status: closed
Closed: 2026-09-17
Type: task
Origin: 412 follow-up (2026-09-17) — two investigations after 412's execution found
in-scope files 412 did not touch. Surfaced by the owner.
Blocks: —
Blocked by: none

## What

Extend the "make comments human" cleanup (kill-list LLM-tell words, WHY-never-WHAT,
no rhetorical build-up) to the files 412 left out, both confirmed in scope by git
evidence:

### Part 1 — `packages/core/src/` originals (MAIN repo, committed, shipped)

This is the source of truth. The fork's `engine/*.ts` files are a hand-maintained
port copied FROM `packages/core/src/` INTO the fork (PROVENANCE.md: "Every file
under `engine/` traces to a `packages/core/src/` file"). 412 cleaned the fork
port copies and left the originals dirtier than the copies. The originals carry
**115 kill-list hits across 34 files** (measured 2026-09-17), top files:
`rank.ts` (21), `rank-report-rules.ts` (21), `rank-report.ts` (8), `pool.ts` (6),
`view.ts` (5), `spec-registry.ts` / `dead-slots.ts` / `caps.ts` /
`candidate-gems.ts` (4 each). These are tracked, committed, shipped prose in the
main repo (only `vendor/` is gitignored) — the real product, not a dev artifact.

### Part 2 — the two fork files 412 skipped on a glob gap

Both are fork-authored (whole `upgrades/` dir postdates the upstream merge-base;
neither exists on `upstream/master`), so in scope by 412's own rule. 412 skipped
them only because its grep globbed `.ts`/`.mts`:
- `vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades/tools/run-tab-cdp.mjs`
  — a `.mjs` file; "carries" at ~line 135.
- `vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades/engine/PROVENANCE.md`
  — our own port-manifest prose; "carries"/"shape"/"shaped" at lines ~91/127/160/
  164/166/178 (blame: our commits, not upstream quotes). Editing its prose trips
  no gate (`check_engine_port_drift.py` hashes the files PROVENANCE.md lists, never
  PROVENANCE.md itself).

## The writing standard — same as 412, this is the point

Every touched comment must read as a person explaining the thing, not an AI
performing cleverness. Apply the AGENTS.md § Plain English rubric (kill-list:
surface-as-verb, load-bearing, the tell, cuts against, lands, carries, the real
exposure, worth the record, orthogonal, decisive, at the sharp end, shape/shaped)
and the WHY-never-WHAT comment policy, as a TWO-PASS procedure, with an inspectable
before/after prose record per touched block (the 412 mechanism — a clean grep is
the floor, not the target; per-line judgment, not blanket word-swap; "API shape"
and other genuine technical uses of a kill-list word stay).

## Scope, repos, and gates

- **Two repos.** Part 1 is the MAIN repo (`packages/core/src/`, committed — this is
  the normal loop, ordinary commits on the branch). Part 2 is the FORK clone
  (`vendor/tbc-new-fork`, gitignored, serial fork queue) and drags the re-pin cycle.
  The planner must sequence these correctly — they are different repos with
  different commit/gate mechanics.
- **The core/src edit is independent of parity.** E-W3 (`wowsims-fork-parity.test.ts`)
  tests behaviour, not comment text; `check_engine_port_drift.py` hashes the fork's
  own bytes against PROVENANCE.md, never core-vs-fork. So cleaning core needs no
  matching fork edit and cannot break either gate. Confirmed 2026-09-17.
- **Some `shape` hits are legitimate** ("API shape", "request shape") — per-line
  judgment, keep the technical ones, same as 412's good rank.ts calls.
- Behaviour-preserving: comments only, no logic/identifier/string/proto/test/golden
  change. `pnpm verify` green. If Part 2 moves the fork pin, desktop gate (a)-(h)
  with no golden update.
- Do not push the fork, do not merge to dev.

## Done when

- Part 1: `packages/core/src/` kill-list grep returns only genuine technical uses
  (e.g. "API shape"); each touched block meets the writing standard, evidenced by
  the prose record; committed to the main repo; `pnpm verify` green.
- Part 2: the two fork files' our-authored kill-list words cleaned to the same
  standard; if this moves the fork pin, re-pin + desktop gate (a)-(h) no golden
  update; both trees clean.
- Every touched comment reads human by the rubric, checked as a second pass against
  an inspectable before/after record, not asserted.

## Execution note (2026-09-17)

Executed via the stage-gate pipeline. Leaving Status for the orchestrator.

### Part 1 — packages/core/src (main repo, committed)

Four ordinary commits on `feat/406-keep-bulk-dead-note`:
- `5474fa50` — rank.ts, rank-report-rules.ts, rank-report.ts
- `e7575236` — pool.ts + eight kin (view, spec-registry, dead-slots, caps, candidate-gems, fixtures/synthetic-offline, enchants, spec)
- `92c76948` — 18 core seams/leaf files
- `af5484e6` — the generated spec-ids doc comment, fixed in `scripts/generate_json_literal_types.py` and regenerated (`pnpm codegen:json-types`; :check rc 0)

Measured 113 comment-line kill-list hits (not the ticket's 115 — the word-boundary
regex correctly excludes `proto/druid_pb.ts:262`'s generated `natural_shapeshifter`;
whole-file 117 boundary / 118 non-boundary vs the ticket's 119). 110 hand-written
comment hits edited or kept; 94 distinct comment blocks touched, each recorded in
`prose-record.md` with Before (from `git show e7488208`), After, and a What-changed
line. Kept-technical: `index.ts:1` and `index.ts:51` ("public surface" — genuine API
term). `pnpm verify` rc 0 at the Part-1 tip.

Out of scope (hit survives): the 4 code/string lines (report-events-offline.ts:73,
item-source-kinds.json:2, rank-report-rules.ts:169, rank-report.ts:749),
proto/api_pb.ts:1461 (upstream-generated), rank-report-css.ts:175 (CSS in the shipped
REPORT_CSS string), and **rank-report.ts:829** — a comment inside the shipped
`setWeightScript` template literal (an inline `<script>`). The plan's C2 missed 829;
editing "carries"→"shows" changed the emitted HTML (32575→32573 bytes) and failed the
rank-report.test.ts digest, so it was reverted and kept, same category as css:175.

### Part 2 — fork (vendor/tbc-new-fork)

- Fork commit `d754ac1b4350567ac94f66fc9d5ca5c2cbd3844f` on `feat/upgrades-tab`:
  reworded run-tab-cdp.mjs (one block) and engine/PROVENANCE.md (prose only). No
  PROVENANCE hash row moved — the sorted 64-hex set and the 33-row count are
  byte-identical to f7e4398c; `check_engine_port_drift.py` rc 0. Kept fork lines:
  PROVENANCE.md 166 (WCL-shaped data layout), 174 and 184 (surface-as-noun).
- Re-pinned `data/wowsims-fork.lock.json` to the new fork tip; `pushed` stays false;
  `branchedFrom` unchanged. `pnpm sim-implemented-effects:generate` moved only
  `forkCommit` (counts unchanged 221/451).
- Desktop gate (`pnpm desktop-gate:check`, no --update-golden): rc 0, (a)-(h) all
  pass, (h) matches the golden with no golden change. See `desktop-gate.md`.

`pnpm verify` rc 0 at the final tip. Both trees clean. Fork not pushed; not merged
to dev; Status left for the orchestrator.
