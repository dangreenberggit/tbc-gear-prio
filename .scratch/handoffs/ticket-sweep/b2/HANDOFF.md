# Worker handoff — B2 (tickets 157, 163, 164)

## Status
success

## Branch
feat/sweep-ret-tickets

## Base
- spawned at `dc3fba0db06e506d788181151cea487f1eb69fc8` · expected same ·
  corrected: no (base matched, confirmed via `git rev-parse HEAD` before any
  work)

## What I did

1. Read `AGENTS.md`, B1's handoff, and all three ticket files. None of the
   three ticket files (157, 163, 164) existed in this worktree at the base
   commit — like B1's ticket 154, they were filed on a sibling branch
   (`feat/ret-p3-data`, commits `221fbf9`/`a300484`/`e1f460c`), not an
   ancestor of `dc3fba0`. Recovered their exact content with `git show
   <sha>:<path>` from those commits and wrote them into this worktree before
   starting (bookkeeping path, allowed).

2. **Ticket 157** — root cause confirmed as two failure modes on the same six
   items, not one shared filter as the ticket's hypothesis guessed:
   - 27484/22401/28034/28288 have a real `sources[]` entry in db.json, but
     each names a five-man zone that is neither a `phase_raids.json` raid
     nor listed in `PHASE_HEROIC_DUNGEONS` (deliberately narrow to
     Magisters' Terrace per ticket 17's scope decision — widening it would
     also admit ~280 unrelated phase-1 items from those same dungeons).
     Their Wowhead prose also mis-parses (`WOWHEAD_HEROIC_ZONE_RE` expects a
     `"Heroic X"` prefix; 27484's page reads `"X - Heroic"` suffix).
   - 31033/31856 carry no `sources[]` at all; their only witness is Wowhead
     quest prose the parser cannot turn into a real source.
   - Fix: `TICKET_157_FORCE_INCLUDE` in `scripts/assemble_universe.py`
     force-admits exactly these six items with `{"kind": "unknown"}` /
     `origin: "curated"` — the same shape `curated_unsourced` already uses
     — and the db/Wowhead loops skip adding those items' unusable raw
     source rows so the build's per-row validation guard never rejects
     them. Deliberately did not touch `PHASE_HEROIC_DUNGEONS` or reopen
     ticket 17's broader question.
   - All four ret universes regenerated. Recall on ret-p3:
     `wowheadRecall.recalled` 105/123 (85.4%) → 111/123 (90.2%), gain of
     exactly the six force-included items. The five pre-TBC trinkets the
     ticket named as defensibly excluded stay out.
   - P2's relic slot (also affected, three items are phase 1) grew from 3
     to 6 candidates.
   - Byte-stability confirmed: regenerated twice, `cmp`-identical both
     times. `git diff --numstat -- data/universes/` touches only the four
     `ret-*` pairs — feral untouched.
   - Repinned two universe-membership-count tests
     (`pool.test.ts` 241→247, `pool-hardening.test.ts` 394→400) with
     explanatory comments pointing back at this ticket.
   - Ticket bookkeeping: `Status: resolved`, comments with commands.
   - Commit `c718d38`.

3. **Ticket 163** — layer 2 (worn-but-unpooled guard) was **already on this
   branch's base**, landed in commit `2e6b257`, an ancestor of `dc3fba0`
   (confirmed via `git merge-base --is-ancestor`). No new engine work was
   needed. What changed: with ticket 157 landed, 27484 is now a real ret-p3
   pool member, so the guard has nothing to warn about — it correctly stays
   silent. Re-ran the full offline ranking
   (`npx tsx packages/core/src/cli.ts --region US --realm dreamscythe
   --character slamaltman --offline --max-phase 3 --report
   .scratch/handoffs/wowsims-tab/ret-p3-ranking/slamaltman-p3.html`, ~7 min,
   fetched `wowsimcli` v0.0.101 fresh since it was absent in this worktree)
   and confirmed:
   - `27484` present in both `test/fixtures/slamaltman.raw.json` and the
     regenerated `slamaltman-p3.json` (the one-liner check named in the
     prompt).
   - 27484 now scores `owned: true`, `deltaDps: 0`, `slot: "ranged"`, tagged
     `p3 BiS` — exactly like the other 15 worn items.
   - `plausibilityWarnings` is absent from the re-run's JSON (no dead-slot
     fires).
   - Layer 3 (distinct libram proc deltas) stays out of scope as directed —
     three libram TODO stubs in the pinned sim fork are untouched.
   - Updated the stale `PROVENANCE.md` with a dated addendum pointing at
     the superseded pre-157 figures rather than rewriting history in place.
   - Ticket bookkeeping: `Status: resolved`, comments with commands.
   - Commit `ea9b33f`.

4. **Ticket 164** — report-layer only, as scoped
   (`packages/core/src/rank-report.ts` / `rank-report-css.ts`, no engine
   changes). `renderRankHtml` now builds `deadSlotWarningsBySlot` (a
   `Map<slot, DeadSlotWarning>`; `dead-slot` is the only warning kind that
   names a slot). Each slot section that matches:
   - echoes the warning's own `message` verbatim in a new
     `.slot-retraction` block inside that `<section>`, styled with the
     same border-left/background language as the top plausibility panel
   - marks the section and each row `unmeasured`; CSS desaturates
     `.row.unmeasured .delta.down`/`.up` to muted and switches the border
     to dashed/neutral, so a scored-against-empty-slot row cannot read as
     a real downgrade
   - marks the sticky-nav chip `unmeasured` (dashed border in the down
     color), distinguishing it from a plain `no-bis` chip
   - Tested at the module interface: new cases in
     `plausibility-report.test.ts` build a real `Ranking` with a
     `dead-slot` warning plus real ranged/chest items and assert on
     `renderRankHtml`'s output — retraction lands only in the named
     section, only the named row/chip gets `unmeasured`. No stage-internals
     assertions (TDD red-first: confirmed the new tests failed before the
     implementation existed via the TDZ bug I introduced and fixed — see
     Notes).
   - Repinned the pre-existing byte-identical golden-hash test in
     `rank-report.test.ts` (31005→32389 bytes; the delta is exactly the
     three new CSS rules plus two sections' empty interpolation
     whitespace on a fixture with no dead-slot warning — confirmed by the
     comment's math, not just accepted blind).
   - **Trinket-slot half is explicitly not done.** No engine signal exists
     for "the guide named a candidate this slot never got to try" — only
     for "a worn item is missing from its own slot's pool." Producing
     that signal is engine-side work outside this ticket's report-layer
     scope. Filed as ticket 169 rather than silently dropping it.
   - Ticket bookkeeping: `Status: resolved` (for the scope it covers),
     comments state the trinket gap and the 165 pointer explicitly.
   - Commit `79aecf2`.

## Paths touched
- `scripts/assemble_universe.py`
- `data/universes/ret-p2.json`, `ret-p2.report.json`, `ret-p3.json`,
  `ret-p3.report.json`, `ret-p4.json`, `ret-p4.report.json`, `ret-p5.json`,
  `ret-p5.report.json`
- `packages/core/src/rank-report.ts`, `packages/core/src/rank-report-css.ts`
- `packages/core/test/pool.test.ts`, `packages/core/test/pool-hardening.test.ts`,
  `packages/core/test/plausibility-report.test.ts`,
  `packages/core/test/rank-report.test.ts`
- `.scratch/carry-forward/issues/157-ret-pool-missing-eligible-librams-and-trinkets.md`
  (recovered + resolved)
- `.scratch/carry-forward/issues/163-worn-relic-invisible-and-libram-deltas-identical.md`
  (recovered + resolved)
- `.scratch/carry-forward/issues/164-relic-retraction-does-not-travel-to-slot-section.md`
  (recovered + resolved)
- `.scratch/carry-forward/issues/169-trinket-slot-has-no-known-missing-candidate-signal.md`
  (new — follow-up filed per ticket 164's scope boundary)
- `.scratch/handoffs/wowsims-tab/ret-p3-ranking/slamaltman-p3.html`,
  `slamaltman-p3.json`, `PROVENANCE.md` (re-run + addendum)
- `.scratch/handoffs/ticket-sweep/b2/HANDOFF.md` (this file)

Not touched: `dead-slots.ts` (read only, layer 2 was already landed),
`vendor/**` (read only, fetched `wowsimcli` binary into gitignored `vendor/`
for the ranking re-run, never committed), `data/presets/ep-weights-by-phase.json`,
`packages/core/src/ep-weights.ts`, `packages/core/src/cli.ts` (B1's territory),
`scripts/check_sync_wowsims.py`, `PLAN.md` (B3's territory), `package.json`,
`pnpm-lock.yaml`, `packages/*/src/index.ts` (no line needed there).

## Verification
- `python scripts/assemble_universe.py --spec ret --max-phase {2,3,4,5} --out
  ... --report ...` → all four regenerate; re-run twice each,
  `cmp`-identical.
- `git diff --numstat -- data/universes/` → only the four `ret-*` pairs.
- `python -c "...ticket157ForceIncluded..."` → `[22401, 27484, 28034, 28288,
  31033, 31856]` present in `data/universes/ret-p3.json`.
- `python -c "...wowheadRecall..."` → 111/123 (90.2%), up from 105/123
  (85.4%) pre-fix.
- `npx tsx packages/core/src/cli.ts --region US --realm dreamscythe
  --character slamaltman --offline --max-phase 3 --report
  .scratch/handoffs/wowsims-tab/ret-p3-ranking/slamaltman-p3.html` → real
  wowsimcli run, 6-7 min, 437 sim invocations, wrote both artifacts.
- `python -c "...27484 in raw fixture and ranking JSON..."` → `True True`.
- `python -c "...ranged items owned/deltaDps..."` → 27484 `owned: True,
  deltaDps: 0`; `plausibilityWarnings` absent.
- `npx vitest run packages/core/test/plausibility-report.test.ts
  packages/core/test/rank-report.test.ts` → 149 tests passed.
- `npx tsc --noEmit -p packages/core/tsconfig.json` → clean.
- `pnpm verify` → exit 0. 40 test files / 773 tests passed, 2 todo. All
  data-pipeline gates green. AtlasLoot gates report "vendor/atlasloot
  absent — skipping" (never touched here, matching B1's precedent — a
  no-op skip, not a pass on content never examined).
- `git status --short` clean after each commit.

## Notes / concerns

- **Recall figures did change with 157 landing**, as the prompt asked me to
  state explicitly: ret-p3 `wowheadRecall.recallPct` moved from 85.4% to
  90.2% (+4.8 points, +6 items). `excludedNoSource` moved 1298→1297 (only
  the two fully-sourceless items, 31033/31856, previously counted there;
  the other four were excluded via the zone/heroic membership gate, not the
  no-source counter — confirmed by tracing `map_db_source`'s output for
  each id before the fix).
- The SME review's "would a ret trust this?" gate (ticket 157's own "Done
  when" clause) re-opens on this result per the ticket's instruction — I
  did not reopen or edit the SME verdict file, that call belongs to the
  user/reviewer.
- Ticket 164's byte-identical golden-hash repin
  (`rank-report.test.ts:636`) is a legitimate output-size change (+1384
  bytes: three new CSS rules plus two sections' empty interpolation
  whitespace on a fixture with no dead-slot warning), not a defect — same
  pattern the file already uses for every prior repin, with the same kind
  of diff-based justification in the comment.
- Hit a real TDD signal while wiring ticket 164: my first attempt placed
  `deadSlotWarningsBySlot`'s declaration *after* the `nav`/`sections`
  computations that reference it, which is a genuine temporal-dead-zone
  bug, not a stale mock — the new tests caught it immediately
  (`ReferenceError: Cannot access 'deadSlotWarningsBySlot' before
  initialization`) before I'd looked at the diff. Fixed by moving the
  `warnings`/`deadSlotWarningsBySlot` declarations above `nav`.
- Ticket 169 (new) is a real scope boundary, not deferred work I could have
  finished here: the report layer literally has no field to read for
  "candidate pool known incomplete" pre-157. Engine-side, out of this
  worker's `pathsAllowed`.
- No line needed in `package.json` / `pnpm-lock.yaml` /
  `packages/*/src/index.ts`.
- `vendor/wowsimcli-v0.0.101-win32-x64/` was fetched into this worktree for
  the ticket 163 ranking re-run (gitignored, never committed) — a fresh
  worktree/clone needs `python scripts/fetch_wowsimcli.py --platform
  win32-x64` before reproducing that step.

## Suggested follow-ups
- Ticket 169 (filed this session): engine-side signal for a slot whose
  candidate pool was known-incomplete (not just a worn item missing from
  it), so ticket 164's report-layer mechanism can extend to the trinket
  slot and any future case like it.
- Someone should re-run the SME "would a ret trust this?" verdict against
  the post-157/163/164 state — not spawned as a ticket, since that is a
  domain-judgment call for the user/SME reviewer, not an engineering task.
