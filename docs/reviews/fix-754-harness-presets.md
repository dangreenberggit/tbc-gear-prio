# Pre-merge review — fix/754-harness-presets

Reviewed range: `b04649232eb0a4946fa202a8b187b934318140f3..02d5e25814bdcb6eb0e8423c10cec221a28ef6ac`

Reviewed range: `02d5e25814bdcb6eb0e8423c10cec221a28ef6ac..22a67b322fba607ad92743485274c3655f245611`

## Dispatch note

- Tooling check: `python scripts/check_merge_ready.py --product-files`
  (rc 0) printed two product files: `scripts/tab-harness/README.md` and
  `scripts/tab-harness/run-tab-cdp.mjs`. The other changed file is the
  closed ticket `.scratch/carry-forward/issues/754-*.md`.
  `instruction-review` was not run on it: it is a ticket, not agent
  instructions, and the Spec axis read it as its spec and checked its
  closing note.
- Lane: full axes. `git diff --shortstat dev...HEAD` gave
  `3 files changed, 135 insertions(+), 41 deletions(-)`: 176 lines, over
  the small-change limit of 150.
- Domain axis skipped: the diff changes how a test harness picks a gear
  set chip on the page; it states no TBC, WCL or wowsims fact.
- Reviewers: `codex` is not on PATH, so each axis ran as a fresh
  `general-task` agent on Opus. The Standards + Spec agent ran the
  `code-review` skill.

## Adversarial

- **A1 (silent wrong result):** `run-tab-cdp.mjs:585-587`. `--preset` no
  longer needs `--preset-tab`, and nothing checks whether the page has
  phase tabs. On a page that has them, a run without `--preset-tab` takes
  the chip from the phase shown on load (Phase 3 in a fresh profile,
  `vendor/tbc-new-fork/ui/sim/constants/other.ts:12`). Hunter's
  `DW - 6% hit` exists in Phases 1-3 for both specs
  (`ui/specs/hunter/dps/presets.ts:69-111`), so a run meant to start from
  Phase 2 loads Phase 3 with rc 0. The old harness refused this call.
- **A2 (evidence):** the live runs did not run the committed file: the
  throw in `754-runs/live.harness.log` is at `:965`, the committed file has
  it at `:967`, and the file's mtime is after the log's last write.

The axis checked and found sound: the Gear Sets block lookup on both page
layouts, the spec labels, the same-name check, the desktop gate call
(`ret-p4-p3-cap40.json` equals `golden-ret-p4-cap40.json` on rows,
aboveCutoffItems, baselineDps, rowCount, aboveCutoff), `node --check`.

## Domain

Skipped (see the dispatch note).

## Standards + Spec

- **S1 (claimed silent wrong result):** `run-tab-cdp.mjs:589-593` counts
  matches as soon as one chip matches, so if one spec's chips render
  before the other's, the duplicate check would miss.
- **S2 (misleading docs):** `run-tab-cdp.mjs:45-47` and
  `README.md:109-110` still credit the preset flags to ticket 522 and say
  leaving them out changes nothing.
- **S3 (code quality):** the `'['+spec+'] '+chip` label is built at
  `:557` and `:591`, and `names` calls `specOf(c)` twice per chip.
- **S4:** `--preset-spec` with `--preset '?'` is accepted and does
  nothing.
- **P1 (evidence):** same as A2.
- **P2 (evidence):** the closing note's "without `--preset-spec` the same
  call stops" comes from a different call on older code
  (`probes.harness.log`).
- **P3 (gap against spec):** the ticket asks for every DPS spec page the
  fork serves. Only balance among the six no-phase-tab pages has a load
  run; warlock and enhancement were only listed; shadow, elemental, rogue
  and warrior Arms were not run. The README names all of them as
  supported.
- **P4 (evidence):** the `Verified by:` commands leave out
  `GOFLAGS=-buildvcs=false`, `TBC_TAB_TYPE_CHECKER=0` and a
  `PLAYWRIGHT_BROWSERS_PATH` workaround the runs used.
- **P5 (small scope creep):** `presetWorn` now returns every item, and the
  `?` list no longer repeats phase tab names.

**Standards:** the ticket close, commit message and comments follow the
documented rules.

## Code quality

| ID  | Row                                                                                                                    |
| --- | ---------------------------------------------------------------------------------------------------------------------- |
| S3  | One helper for the `[spec] chip` label at `run-tab-cdp.mjs:557` and `:591`; call `specOf(c)` once per chip in `names`. |

## Focused check (round 2)

No fork range: the branch never moves the fork pin. One fresh
`general-task` agent on Opus ran the check over
`02d5e258..22a67b32`.

1. **Conditions 1 and 2: pass.** `2fe2f6c7` fixes A1, S2 and S4;
   `f06d9997` is the code-quality pass (S3); `22a67b32` only edits
   ticket 754's closing comment. The A1 guard (`run-tab-cdp.mjs:596-598`),
   the S4 check (`:134-137`) and the S3 helper (`:564-565`, `:602`) are at
   the cited places; the rest is comments and README text (S2).
2. **Each fix changes only what its finding asks: pass.**
3. **Tests: pass.** The branch adds no tests; no unit test covers the
   harness. The A1 guard is shown firing in
   `754-runs-r2/errors-and-lists.harness.log`, and S4 by
   `node scripts/tab-harness/run-tab-cdp.mjs --origin http://localhost:1 --preset '?' --preset-spec Survival`
   (rc 1).
4. **Touched tests pass: pass.** `node --check` passes under v22.23.2.
   The r2 logs record HEAD `f06d9997` with clean harness files, and their
   line numbers match that file (closing A2/P1). Every load the ticket
   names exits rc 0 and wears its gear-set file; the ret run equals
   `golden-ret-p4-cap40.json`; `pnpm verify` rc 0 on `22a67b32`.

The agent confirmed the `wontfix` reasons for S1 (both specs' chips
render in one pass, `PresetGroupPicker.tsx:53-64` at fork `b603564e`) and
P5 (the closing note's evidence rests on the full `presetWorn` list).

**Finding F1 (code quality):** the A1 guard at `run-tab-cdp.mjs:598`
builds the tab-name list with a second copy of the expression already in
`tabNames`/`tabNote` at `:576-577`. No effect on results today.

## Summary

Round 2 is the last round and reported F1, a code-quality finding in the
lines the A1 fix wrote, so the review stops here (`~/.claude/AGENTS.md`
§ Review round limits). Every round-1 finding is fixed or has a checked
`wontfix` reason; F1 is the only open finding. The merge check was not
run.
