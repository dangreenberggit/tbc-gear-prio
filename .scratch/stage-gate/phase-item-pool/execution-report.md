# Execution report — phase-item-pool

Executor seat (Opus), saved by the orchestrator from the seat's part reports
(1–4 and final). Full readings live in `measurements.md`; gate outcomes in
`decision-log.md`.

## Commits

**Repo** — `feat/phase-item-pool`, base `7a12bd8`

| SHA | Step |
| --- | --- |
| `5633709f7d4ec8a2df386255304bb5b1c876fd5d` | 1 — fork-universes drift check |
| `8806c97f0f87471d23e27236d716a8cf09f3d0dc` | 3 — gate wired, ticket 211 closed |
| `a532250a7204851a9ce9466f22344bcae3fa1b61` | 4 — pool listings + generator |
| `3bc4182bd012923d5b86e34d074b0a3724276497` | 4 fix — split the misleading bucket |
| `d851b7035509152c3e83ad291cb5bc87b6a9cbc4` | 5 — ADR-0028, ticket work |
| `58db6a11a941ba7d043e9061098b2c811b7d19f7` | 6 — core `view.ts` zone buckets |
| `84c74c6245bd5d9d1ec9e8024744ed6450ee1f5b` | R2 — NEXT counter |
| `9d0c8f3ec96d30ad18c0f2e1a805e4030d68da8e` | re-pin after fork rewrite |
| `490bab6e046a25d367a34edb5f22892a450d6c23` | 10 — measurements, log, STATUS |

(`b3e844f` and `dff8288` on this branch are the orchestrator's decision-log
commits.)

**Fork** — `feat/upgrades-tab`, base `cfcdd7ea1`

| SHA | Step |
| --- | --- |
| `a00a50c6fe3893fd6ce11c2e8314e35785ed1754` | 2 — refresh five drifted copies |
| `76f26996243900ac53460daf5955ae28b28e510c` | 7 — phase naming, selector, locales gate (LF rewrite of `c544c139a`) |
| `eb65670764d42a5b919dded5f8252ddf3a3f5bc4` | 8 — post-sim content filter (LF rewrite of `074da83f`) |

## Verify recipe on the tips

Repo: `pnpm verify` exit 0 · `fork-universes:check` → 8 bundled copies
byte-match · `pool-listings:check` → both listings match a fresh regeneration ·
phase-disagreements 0 and raid-drops-lacking-a-reason 0 in both listings ·
Unexplained section present · lockfile-matches (`eb65670`) · status empty ·
ticket 211 closed · ADR-0028 present · verification-log entry present ·
exactly one STATUS file.

Fork: status empty · type-check 0 · lint 0 · `test:locales` exit 0 naming its
three files · direct ajv VALID · `this phase` 0 · `makePhaseSelector` 2 ·
`upgrades-raid-filter` 2 · schema carries `upgrades_tab` · drift gate ok: 32 ·
CRLF count 0 in both rewritten files · branch diff 402/17, content-sized.

Nothing pushed, nothing merged, `pushed: false` intact. Servers stopped,
browser window closed.

## Step 9 headline measurements (details in measurements.md)

- No "this phase" on ret/feral at phase 2 and 3; drawer shows
  `Max phase: Phase 3 (2.2 - T6)` and
  `Pool source: feral-p3.universe.json (366 entries)` — matching the committed
  listing's membership.
- Phase selector shared-state proven both directions (tab→page, page→tab, up
  to Phase 5 and back).
- Feral prune-on run: `Your current gear: 2132.2 DPS. Took 302 s.`, 366 → 17
  candidates; the eight non-All filter values partition the 17 rows exactly
  (no overlap, none unreachable); the zoneless PvP-vendor bucket carries the
  run's largest upgrade (Vengeful Gladiator's Staff, +90.9 DPS). Zero hidden
  intervals during the run.
- (d) recorded as a labelled substitute: the console tool cannot capture
  load-time logs; a directly spawned `sim_worker.js` posts
  `{"msg":"ready","outputData":{"0":1}}` (isWasm true).
- **302 s vs the plan's ~61 s estimate: unexplained**, four candidate causes
  recorded as untested hypotheses in the verification log.

## Deviation ledger (complete)

| Step | Plan said | Found | Action | Why |
| --- | --- | --- | --- | --- |
| 2,7,8 | `npm --prefix <fork> run …` | npm spawns cmd.exe, which cannot run the POSIX-relative `node_modules/…/tsc` | adapt | Used `cd <fork> && npm run … --script-shell=bash`. Same checks, different shell selection. |
| 4 | `check_rep_tables.py` is the fail-loud precedent naming the restore command | It soft-skips and names no command | adapt | Implemented fail-loud per the plan's explicit instruction; the cited precedent is wrong. Warned the nested planner. |
| 4 | Nested N7: the lockfile pins `db.json` to the fork's DB | It pins to upstream `wowsims/tbc-new` v0.0.119 `3267f8d`; the fork's copy is a different file | adapt | Corrected inventory and docstring. The decision (read the pin, never the clone) was right; only its stated reason was wrong. Re-verified C11. |
| 4 | Categories a/b/d classify wowsims-only items | Structurally impossible — W is defined by `eligible_d7` passing | adapt | Kept them at a stated structural zero rather than three silent gaps. Confirmed on the plan's own C17 examples. |
| 4 | Category f is "no recognized source route" | First draft made it an unconditional catch-all, so "zero unexplained" passed vacuously | adapt | Made it a real test; verified `g` reachable by direct call. |
| 4 | Category e is one bucket | Its label was false for ~25% of members (crafted/rep gear that drops nowhere) | adapt | Split e1/e2. Same items, honest labels, different follow-up. |
| 5 | Annotate 89 with the stub-only PvP explanation | True for its armour; false for its four named weapons, two already in a universe | adapt | Recorded the differentiated finding; flagged 89 for re-scoping. |
| 7 | Fix the `test-locales.mjs` glob | A second identical Windows bug one line later (crash, not vacuous pass) | adapt | Fixed both. |
| 8 | Raid filter resets on spec change | No spec-change subscription exists | adapt | `refreshRaidFilter` rebuilds per ranking and falls back to "All". |
| 7 | `grep -c makePhaseSelector` → 1 | Returns 2 (import + mount) | flag | One mounted selector is the substance. Accepted at Gate C. |
| 7 | Manifest lists fork `upgrades/data/` for Step 2 only | Step 7's `pool_universe` row needed `poolSourceFor` in `data.ts` | flag | In Step 7's spec; accepted at Gate C. |
| R1 | — | Python `write_text` without `newline='\n'` flipped two upstream files to CRLF | rework | Branch rewritten; both files LF, diffs content-only; `PROVENANCE.md` kept at its baseline CRLF. Standing rule: per-file stat check before every fork commit; `newline='\n'` on every Python fork write. |
| 9 | Serve `dist/tbc` | Bundle hardcodes `/tbc/`; that root 404s the entry and renders blank | adapt | Served `dist` on 8975; trap recorded. |
| 9 | Foreground the tab | Extension put it in a 0×0 window — permanently hidden | adapt | `resize_window` 1600×1000 → visible, focused, zero hidden intervals. |
| 9(d) | Quote the Worker Ready console line | Console tracker never sees load-time logs | adapt | Substitute measurement at source, labelled. |
| 9(c) | ~61 s feral run | 302 s, unthrottled | flag | Recorded as measured; delta unexplained, hypotheses listed. |
| 10 | Delete STATUS-2026-08-23, create STATUS-<date> | Same date → same filename | adapt | Rewrote in place; exactly one STATUS file. |
