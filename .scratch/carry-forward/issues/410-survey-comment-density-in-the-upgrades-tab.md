# 410 — Survey comment density in the upgrades tab, then decide what to cut

Status: open
Type: task
Origin: noticed 2026-09-16 while answering where to record "why we never let the
bulk tournament cull" — the answer was "it is already recorded," at 55 lines
Blocks: —
Blocked by: none

## What

Survey first, cut second. The suspicion is that parts of the upgrades tab carry
comment blocks well past the point where they help, but that is an impression
from one file, not a measurement. This ticket is a survey with a possible fix
attached, not a trim job with a foregone conclusion.

The trigger case is `MAX_CANDIDATES_PER_BULK_REQUEST` in
`vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades/engine/bulk/partition.ts:15-68`
— roughly 55 lines of doc comment, including a twelve-row data table, above a
one-line `const`. See the assessment below before treating it as the worst case;
it may be the *best* case of the pattern, because most of what it says is real.

## Survey

Measure before proposing anything:

- Comment-to-code ratio per file across `upgrades/`, so the outliers are named by
  measurement rather than by whoever happened to read the file.
- For each outlier, classify every block against this repo's own policy
  (`AGENTS.md`, "Comment policy": why not what, load-bearing only, rename before
  explaining): **load-bearing** (a non-obvious constraint, an external-system
  quirk, why a slower path was chosen on purpose, a pointer to the finding that
  forced the shape) vs **restatement** vs **duplicated by a test or a ticket**.
- Note whether the density concentrates in the ported engine files, the adapters,
  or the tab, since those have different provenance rules and the answer probably
  differs by area.

Do not treat length as the defect. A long comment carrying four load-bearing
facts is fine; a short one restating its own line is not.

## Assessment of the trigger case (impressions, not a verdict)

Recorded here so the survey starts from a concrete reading rather than a vibe.
This is one reader's judgment on one file and the survey may overturn it.

What earns its place in `partition.ts:15-68`:

- **The real gate is `shouldUseLegacyBulkSim`, not the Medium stage's
  `MaxSurvivors: 25`.** Two different mechanisms carry the number 25 and only one
  sets the boundary. This corrects a wrong inference a reader would otherwise
  make from a coincidence, and nothing in the code says it.
- **n = 33 returns 5 rows of 33 silently, with no error field set.** An
  external-system quirk with no local symptom. Exactly what a comment is for.
- **The bound prevents culling but does not by itself guarantee a row per
  candidate**, because results lacking `dpsMetrics` are dropped downstream. This
  is the sentence that stops someone deleting the per-chunk row-count assertion
  as redundant.
- **Why 25 rather than the 32 both engines could carry** — headroom given up on
  purpose to keep the two transports on one batch size. A deliberate slower/
  narrower choice, which the policy names explicitly.

What looks like it could go:

- **The twelve-row iteration table.** The comment itself says
  `packages/core/test/bulk-boundary.test.ts` reproduces it. A table maintained in
  two places drifts, and the test is the copy that fails when it is wrong. The
  *conclusion* drawn from it — 25 and 26 are single-stage at every measured count
  — is load-bearing and should stay; the twelve rows behind it can be a pointer
  to the test.
- **The inequality walk-through** (`high×(n+1) ≥ high×n`, then the n = 26 and
  n = 27 cases). This derives the conclusion rather than recording it. It reads
  as a proof someone needed to write once to convince themselves, which is a
  ticket or an ADR, not a comment above a constant.
- **The `PROVENANCE.md` paragraph** at the top of the file, explaining that the
  file has no ancestor and so carries no drift-checker row. Possibly true and
  useful, but it is a fact about repo tooling rather than about this code, and
  the same note likely belongs in one place for every such file rather than
  repeated per file. Check whether it is repeated before cutting it.

Rough shape if that holds: the four load-bearing facts plus the conclusion, with
pointers to the test and to ticket 349 for anyone who wants the derivation.
Perhaps fifteen lines instead of fifty-five. **Untested** — nobody has tried
writing the shorter version and checked that nothing needed goes missing.

## Watch out for

- **Much of this code is currently dead at runtime** (ticket 406) — the bulk path
  is switched off at `makeSimRunner(bulk = false)`. Comments are the only live
  documentation of machinery that may be re-enabled, so the bar for cutting is
  *higher* here than in live code, not lower.
- **Ported engine files have their own rules.** Read
  `docs/agents/known-traps.md` before editing anything under a ported path; a
  comment edit can trip the drift checker the same as a code edit.
- Anything cut should land where a reader will still find it — the ticket, the
  test, or an ADR — not simply be deleted.

## Comments

**2026-09-16.** 406 closed with an agent's recommendation to keep, not an owner
ruling — see its Resolution, which lists why that recommendation is rebuttable.
So the "may be re-enabled" premise under "Watch out for" is still a possibility
rather than settled policy, and the higher bar for cutting rests on an open
question. If 406 is reopened and the code is deleted, this ticket's trigger case
goes with it.

`partition.ts`'s constant comment gained a leading paragraph in fork commit
`633169c7f4e835540f3041b7e4bb407218bffc5b` saying the constant is unreachable at
runtime, with the grep that proves it. Any trim must keep that paragraph; it is
the only place the dead-at-runtime fact is recorded in the fork. Nothing else in
the comment was touched — the 406 branch trimmed nothing, so this ticket is
unblocked and its survey scope is unchanged.

## Survey, 2026-09-17

Full-scope survey (the 406 keep-ruling means the bulk substrate stays for
ticket 411, so it is surveyed with a **higher bar for cutting** — a comment that
would read as restatement in live code is often the only record of why a dead
path is kept). Nothing was cut; this is the survey and its classification for the
owner's Gate G2 decision.

**Measurement.** Per-file comment-to-code ratio produced by a throwaway script,
`.scratch/stage-gate/bulk-cleanup-cluster/comment_density.py` (gitignored). It
counts lines inside `/* … */` blocks and lines whose first non-blank chars are
`//` as comment, other non-blank lines as code, and sorts by comment share.
Command, over the full scope (fork commit `614edd3e1`):

```
python .scratch/stage-gate/bulk-cleanup-cluster/comment_density.py \
  vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades \
  vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades_tab.tsx
```

53 files, **median comment share 0.333**. Table sorted by share (a `*` marks an
outlier: share above the median OR more than 40 comment lines):

| File | Comment | Code | Share |
| --- | ---: | ---: | ---: |
| `engine_provenance.ts` * | 19 | 1 | 0.950 |
| `engine/bulk/partition.ts` * | 82 | 17 | 0.828 |
| `adapters/local.wcl-credentials.example.ts` * | 8 | 2 | 0.800 |
| `adapters/sim_database.ts` * | 52 | 14 | 0.788 |
| `adapters/local.wcl-credentials.ts` * | 6 | 2 | 0.750 |
| `adapters/bulk_http_sim_runner.ts` * | 52 | 20 | 0.722 |
| `engine/cutoff.ts` * | 108 | 43 | 0.715 |
| `adapters/bulk_request_builder.ts` * | 79 | 37 | 0.681 |
| `adapters/skeleton.ts` * | 21 | 10 | 0.677 |
| `engine/enchants.ts` * | 29 | 17 | 0.630 |
| `adapters/bulk_wasm_sim_runner.ts` * | 111 | 73 | 0.603 |
| `adapters/wasm_sim_runner.ts` * | 79 | 59 | 0.572 |
| `engine/cap-profile.ts` * | 196 | 163 | 0.546 |
| `engine/candidate-gems.ts` * | 222 | 227 | 0.494 |
| `adapters/bulk_screen_driver.ts` * | 64 | 67 | 0.489 |
| `engine/seams/sim-runner.ts` * | 91 | 104 | 0.467 |
| `engine/content-hash.ts` * | 26 | 30 | 0.464 |
| `engine/stats.ts` * | 17 | 20 | 0.459 |
| `adapters/player_gear_source.ts` * | 42 | 50 | 0.457 |
| `engine/promise-pool.ts` * | 29 | 35 | 0.453 |
| `engine/items.ts` * | 33 | 41 | 0.446 |
| `upgrades_tab.tsx` * | 1080 | 1357 | 0.443 |
| `engine/types.ts` * | 27 | 35 | 0.435 |
| `engine/caps.ts` * | 128 | 175 | 0.422 |
| `engine/candidate-order.ts` * | 26 | 38 | 0.406 |
| `tools/bulk-spike.mts` * | 103 | 200 | 0.340 |
| `tools/headless.mts` | 22 | 44 | 0.333 |
| `engine/slots.ts` | 12 | 25 | 0.324 |
| `tools/export_equip_eligibility.mts` | 34 | 74 | 0.315 |
| `data/data.ts` * | 128 | 286 | 0.309 |
| `engine/compose.ts` | 16 | 36 | 0.308 |
| `tools/equiv-campaign.mts` * | 149 | 336 | 0.307 |
| `adapters/wcl_gear_import.ts` * | 46 | 122 | 0.274 |
| `engine/rank.ts` * | 519 | 1550 | 0.251 |
| `engine/logged-gear.ts` | 7 | 22 | 0.241 |
| `engine/gems.ts` | 20 | 63 | 0.241 |
| `engine/meta.ts` | 34 | 113 | 0.231 |
| `engine/migrate-gems.ts` | 13 | 45 | 0.224 |
| `engine/pool.ts` * | 65 | 232 | 0.219 |
| `engine/fixtures/slamaltman-offline.ts` | 7 | 25 | 0.219 |
| `engine/view.ts` * | 42 | 205 | 0.170 |
| `engine/seams/gear-source.ts` | 12 | 81 | 0.129 |
| `wcl_import_modal.tsx` | 26 | 178 | 0.127 |
| `engine/kael-temp.ts` | 1 | 7 | 0.125 |
| `engine/set-value.ts` | 31 | 220 | 0.124 |
| `engine/set-bonus.ts` | 6 | 43 | 0.122 |
| `engine/fixtures/report-events-offline.ts` | 20 | 156 | 0.114 |
| `engine/seams/store.ts` | 10 | 79 | 0.112 |
| `engine/se.ts` | 4 | 39 | 0.093 |
| `engine/disclosure.ts` | 7 | 143 | 0.047 |
| `engine/plausibility.ts` | 7 | 156 | 0.043 |
| `engine/dead-slots.ts` | 6 | 156 | 0.037 |
| `engine/meta-repair.ts` | 6 | 247 | 0.024 |

### Classification of the 32 outliers

Against `AGENTS.md` § Comment policy (why not what; load-bearing only). Each
notable block: first line, `path:line-line`, and class. "Higher bar" = dead bulk
code kept for 411, where re-enable documentation is load-bearing by being the
only record of why the dead path stays.

**Adapters.**
- `engine_provenance.ts` — one 19-line header over a single const. "Fork commit
  identifier…" `:1-19` load-bearing (fork build has no git-info plumbing;
  hand-maintained-literal convention; why it may lag HEAD). High share is a
  one-line-of-code artifact. **Load-bearing.**
- `adapters/sim_database.ts` — "Per-request item rows…" `:1-38` load-bearing
  (with_db-vs-no-with_db panic; upstream's path; item-swap merge invariant;
  tickets 212/362/156); "Builds the resolver…" `:46-55` load-bearing; "Unguarded,
  like the engine's own items.ts…" `:58-61` load-bearing (deliberate throw-not-guard,
  the 212 bug). **Load-bearing.**
- `adapters/bulk_http_sim_runner.ts` (dead) — header `:1-35`, "Its own pool…"
  `:49-52`, "The chunk bound…" `:56-59`, "/asyncProgress returns 204…" `:64-72`
  all load-bearing under the higher bar (the 204-as-completion trap is a genuine
  external-system quirk regardless). **Load-bearing (higher bar).**
- `adapters/bulk_request_builder.ts` (dead) — "Asserts that a built chunk…"
  `:20-48`, "Four things this must get right…" `:57-85` (four loud-but-obscure
  failure modes with upstream file:line — highest-value block in the bulk set),
  `:87-91`, `:96-101` all load-bearing under the higher bar. **Load-bearing (higher bar).**
- `adapters/bulk_wasm_sim_runner.ts` (dead) — "Maps one chunk's BulkSimResult…"
  `:23-46`, "Reads the user's worker-count setting" `:81-105`, "Why the WASM
  default is the per-candidate loop…" `:152-177` (the ticket-346/411 re-enable
  trigger with the 332s-vs-9.35s measurement — keystone keep), `:182-192`.
  **Load-bearing (higher bar).**
- `adapters/bulk_screen_driver.ts` (dead) — header `:1-38`, inline `:70-77`,
  `:87-92`, `:96-104` (explicitly "Untested… cannot be produced deterministically"),
  `:112-123` load-bearing (concurrency-window constraints no test covers).
  **Load-bearing (higher bar).**
- `adapters/skeleton.ts` — "Skeleton serialization…" `:1-21` load-bearing (D5
  by-construction match; why debug:false). Tiny-function artifact. **Load-bearing.**
- `adapters/wasm_sim_runner.ts` — header `:1-37` (why own pool; seed-sharding
  quirk; the bulk-removed-406 correction block), "E-W5 measured 183.8 MB…"
  `:50-63` (explicitly flagged HYPOTHESIS — durable-claim discipline),
  `:65-77`/`:89-98` (deviceMemory quirk; two-distinct-numbers). **Load-bearing.**
- `adapters/player_gear_source.ts` — "PlayerGearSource…" `:1-34` load-bearing
  (resolves plan's open verification item; ascending-numeric-key guarantee),
  `:89-95` (why throw on length≠3). **Load-bearing.**
- `adapters/wcl_gear_import.ts` — `:1-28` (which upstream importer each idiom is
  adapted from; credentials-never-committed), `:57-64` (MISSING_FIGHT_ID divergence).
  **Load-bearing.**
- `adapters/local.wcl-credentials.example.ts` `:1-8`, `adapters/local.wcl-credentials.ts`
  `:1-6` — load-bearing (copy-this-file / gitignored-untested provenance);
  two-line-file artifact.

**Engine.**
- `engine/bulk/partition.ts` (dead) — `:1-11` (no-PROVENANCE-row rationale);
  `:15-79` the boundary measurement + iteration table + n≤25 invariance proof +
  ticket 349/406 (names "read 406's Resolution before relying on it" — the keep
  record 411 needs); `:82-87` borderline restatement of `slice` but carries the
  load-bearing "split not trimmed / no candidate dropped" invariant. **Load-bearing
  (higher bar); this file IS the dead-code justification.**
- `engine/cutoff.ts` — `:1-4` port provenance; the √2 setBonusNoiseFloorDps
  derivation `:22-64`, CUTOFF_BY_SPEC totality `:80-89`, "?? CUTOFF" distinction
  `:112-121`, etc. (ADR-0020/0021; tickets 254/331/332/335; re-runnable "no row
  in the under-filtered band" claim). **Load-bearing.**
- `engine/cap-profile.ts` — densest engine file; per-spec game-fact table with
  sourced rulings + SME-gate caveats (`:82-105` spell-cap 16-not-17 with sim
  file:line; every per-spec block). Reference data with citations, not narration.
  **Load-bearing.**
- `engine/candidate-gems.ts` — `:1-8` port; meta-EP block `:99-123`;
  SPEC_PREFERRED_METAS `:125-203` (owner ruling 2026-08-22 ticket 257, bear-preset
  judgment with re-check command); `:294-303`/`:324-334`/`:419-423` (deliberate
  divergence, tickets 111/139). **Load-bearing.**
- `engine/enchants.ts` — "NOT ported…" `:1-13` (why bridge not re-derive),
  `:19-26`/`:33-37`/`:47-49` (why scan every slot). **Load-bearing.**
- `engine/seams/sim-runner.ts` — `:1-19` (D4 no-node:crypto); the bulk type docs
  and both error classes load-bearing under the higher bar; `bulkScreenCacheKey`
  and RecordedSimRunner own-property block `:172-198` (why own property not
  prototype). **Load-bearing (higher bar).**
- `engine/content-hash.ts` — `:1-22` (why sha256 dropped; ADR-0026),
  ENGINE_VERSION `:49-52` (when to bump). **Load-bearing.**
- `engine/stats.ts` — `:1-10` port provenance; EpWeights/epScore sparse-vs-dense
  shape note. **Load-bearing** (thin; small-file artifact).
- `engine/promise-pool.ts` — header + `:12-23` (results-by-index; no-cancellation),
  `:44-48` (deterministic-not-time-ordered), `:59-62` (the silent-success path it
  prevents). **Load-bearing.**
- `engine/items.ts` — "NOT ported…" `:1-17` (why not the 6.8MB snapshot),
  `:52-56`/`:67-73` (0→null normalization keeps ported callers correct). **Load-bearing.**
- `engine/types.ts` — `:1-9`/`:19-28`/`:42-48` (why SpecId totality is the point).
  **Load-bearing.**
- `engine/caps.ts` — model why-comments with measured examples ("two Bands of
  Accuria" `:93-107`; carry-forward 47/60; advisory-vs-load-bearing distinction).
  **Load-bearing.**
- `engine/candidate-order.ts` — `:1-9`/`:18-28`/`:49-53` (plan §0
  never-changes-a-number invariant; total-order determinism). **Load-bearing.**
- `engine/pool.ts`, `engine/view.ts` — below the median share (outliers only by
  count); headers and port notes (tickets 90/288/331/332; display-vs-ranking
  agreement). **Load-bearing; already lean.**

**Data / tools.**
- `data/data.ts` — RawUniverse "Never derive a type from a JSON import" `:71-80`
  (the repo's twice-hit TS1355 trap, verbatim the AGENTS.md rule); the disclosure
  and mirror-of-python-source-of-truth notes (review A6, ticket 291). **Load-bearing.**
- `tools/bulk-spike.mts` (dead) — header `:1-46` (why-in-browser; why-port-4180;
  embedded-DB-must-cover-every-candidate) + `:91-131`/`:298-306`. **Load-bearing
  (higher bar); the comments are the measurement's provenance.**
- `tools/equiv-campaign.mts` (dead) — "Track B measurement harness…" `:1-54`
  (judges-nothing separation; how-to-drive) + `:321-326`/`:361-374`/`:386-395`
  (each records a real bug that happened — the byte-identical "null" arm).
  **Load-bearing (higher bar).**

**The two large files (classified by the executor directly).**
- `engine/rank.ts` (519/1550, share 0.251 — outlier by count, not density) — the
  engine's core orchestrator. Its comments are why-comments throughout: port
  provenance and adaptation records (D4, ADR-0026 racing removal), deliberate-choice
  rationale (the `DEFAULT_ITERATIONS` flat-not-adaptive note, ticket 339; the
  `attemptEligibility` off-hand/paired-slot guards with tickets 308/309/350; the
  `individualDeltasByItemId` same-run-delta no-re-basing rule with the set-bonus
  arithmetic), and the surviving bulk-screening cluster held under the higher bar.
  (Executor note: the 406 keep-branch left `screenIterations: null` as a frozen
  cache-key literal at `rank.ts:588` with a comment saying it moves only with an
  ENGINE_VERSION bump — that comment is load-bearing.) At share 0.251 this file is
  already well below the median; its 519 comment lines are a large-file artifact,
  not high density. **Load-bearing; bulk portions held by the higher bar. No cut
  candidate.**
- `upgrades_tab.tsx` (1080/1357, share 0.443) — the fork's own renderer; the
  single largest comment count in the survey. Sampled across the file, its comments
  are the same why-genres: DOM/render quirks with reasons (rebuilding a `<select>`
  resets `.value`; recompute-on-render drift), wowsims-integration traps (the
  insecure-origin `alert` behaviour), state-narrowing constraints (`complete`
  narrowing; the late-progress-tick clobber guard), disclosure-drawer rationale,
  and 97 ticket/ADR/plan/review pointers. Density (0.443) is near the median; the
  1080 count is because it is the largest file (2574 lines). It is the one file
  where a line-by-line pass is most likely to surface a handful of render-narration
  restatement lines — but no clean cut candidate is identifiable without the
  block-by-block pass this survey deliberately does not do. **Mostly load-bearing;
  the file to scan hardest if the owner wants a trim.**

### Where the density concentrates, and cut candidates

Density is **overwhelmingly load-bearing** and concentrates in the **ported engine
files** and the **dead-but-kept bulk substrate** — not in narration. Three genres
account for nearly all of it: (1) port-provenance / adaptation notes (PORTED /
NOT-ported / D4-D6) justifying why the fork copy diverges from `packages/core`;
(2) per-spec game-fact citations with sim `file:line` and SME-gate caveats
(`cap-profile.ts`, `candidate-gems.ts`, `caps.ts`) — reference data, not comments
about code; (3) the bulk files' re-enable / why-it-exists documentation
(`partition.ts:15-79` and `bulk_wasm_sim_runner.ts:152-177` are the keystones),
which under the 406 keep-ruling and the 411 higher bar are the only record of why
the dead path is kept.

**Genuine cut candidates surviving the higher bar: effectively none** across the
30 files read plus `rank.ts`. The only borderline is `partition.ts:82-87` (partly
restates `slice`) and it still carries a load-bearing no-candidate-dropped
invariant. High shares are otherwise explained by tiny code bodies
(`engine_provenance.ts`, `skeleton.ts`, the two credentials files) or genuine
provenance / reference / dead-code documentation. If real cut candidates exist
anywhere, they are in `upgrades_tab.tsx`'s render blocks (1080 comment lines) —
the one file worth the hardest scan. **For Gate G2:** under the 406/411 keep-ruling
the survey offers no defensible trim without a targeted `upgrades_tab.tsx` pass,
which is the owner's call. Nothing was cut.

## Done when

The survey exists with per-file numbers and the outliers classified, and the
owner has decided whether to act on it. If yes, the cuts land as their own
commits with the relocated material placed first.
