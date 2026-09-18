# Pre-merge review — phase-3/tab-layout-verify

Reviewed range: `e13edd4d..82c31453`

The branch is Chunk 3 of the upgrades-tab-finish-line plan. Its one commit is a
docs-only diff: dated 2026-09-18 re-verification notes appended to five tab
tickets (327, 310, 312, 328, 314). The styling those tickets track was already
landed on the fork (Execution B, 2026-08-29); this session re-verified it on the
post-Chunk-1 fork tip `d754ac1b` (which moved after that evidence was captured —
the `master` merge plus the WasmSimRunner→WorkerPoolSimRunner rename) and refreshed
each ticket's evidence. No source changed; no Status line moved (the tickets close
on owner sign-off in Chunk 4 step 5).

All four axes ran on the review lane (Opus, effort medium) with fresh context.

## Adversarial

Read every load-bearing claim against the cited evidence. The layout claims are
fully backed — `test-layout-run.log` shows exactly 37 PASS lines and
`{"outcome":"measured","passed":37,"failed":0}` against a real 5-row WASM run
(30.4s) at 375/653/768/1280, and every numeric figure quoted in the notes is a
verbatim log line. All re-runnable commands resolve; fork tip and branch match;
`grep -c '<input type="checkbox"'` returns 0 as claimed; every `upgrades_tab.tsx`
line citation lands. Status honesty is clean (all five notes leave Status
unchanged and say so); both trees clean.

One finding: **314's `[~]` box was headed "closed by construction," which
overstates.** The box asked for a live toggle-and-diff readback; the
by-construction argument proves the wiring is present, not that the payload was
observed to change. The note body was honest ("live readback still owed"); only
the heading reached past the evidence.

## Domain

Checked the TBC/wowsims facts against the shipped fork source at `d754ac1b`. The
game mechanics are sound — 314's cross-slot ranked (not slot-grouped) export is
the domain-correct shape for a TMB priority list; the `{"items":[{"id":N}]}`
shape, `Set` dedupe, and displayed-order iteration all verify in source; the 328
native `CopyButton`/`btn-secondary` claim matches. Two notes described the code
inaccurately:

- **MAJOR — the 314 note said ticket 126 (token ids) "stays deferred," but the
  tip ships it, on by default.** `exportTokenFlavour = true`
  (`upgrades_tab.tsx:432`) → the export emits tier token ids via `exportIdForRow`
  (`:2110`, `:2137-2149`), landed by fork commit `ed31676a`. A reader trusting
  the note would mis-state what the export produces. (The domain logic itself is
  correct: T4/T5/T6 tokens drop and trade for the tier piece, Sunmote falls
  through to the gear id.)
- **MINOR — "every control is a native picker component" is false.** The
  `grep -c '<input type="checkbox"'` returns 0 only on whitespace: line 754 is a
  deliberate raw `<input ... type="checkbox" ...>` (the export flavour toggle,
  whose own comment says it is a plain checkbox for the export format).
  `grep -c 'type="checkbox"'` returns 1. The grep is true; the gloss drawn from
  it is wrong. The 328 note repeats the same gloss.

## Standards

Verified against the repo's durable-claims discipline. **Clean.** Every causal
claim in all five notes carries a re-runnable command in the same note or is an
in-source structural fact with a line citation; the one live-behaviour box (314's
filter-reactivity) is explicitly recast as a by-construction argument rather than
asserted as observed — the hedge the standard wants. Environment claims are
grounded (the "5 rows in 30.4s" run and the fork tip both match the artifacts on
disk). No writing-style breaches; ticket-note convention followed in all five.

## Spec

**Clean.** The diff is exactly what Chunk 3, as actually scoped, asked for. No
requirement missed: 314's `[~]` box is legitimately settled for what Chunk 3 owns
(the plan's acceptance is "the layout gate plus the owner's eyes," not a runtime
toggle-diff — the live readback stays the owner's at sign-off). No scope creep: no
Status flips, only the five named files edited, and the deferred concerns (314's
126 token-id and 328's copy/330) are respected, not acted on. Nothing done-but-wrong:
no ticket is closed by this session, and the cited evidence (the layout gate and
the zero-raw-checkbox grep) matches Chunk 3's stated acceptance.

## Summary

Adversarial: 1 finding (heading overstatement, fixed). Domain: 2 findings (one
major, one minor, both fixed). Standards: clean. Spec: clean. The worst issue was
the domain major — the 314 note claiming ticket 126 was deferred when the tip
ships it by default; corrected in the note. The re-verification itself is
well-sourced and honest; every finding was in the wording of the notes, not in the
verification.

## Disposition

| ID  | Axis        | Disposition | Ticket / note                                                                                                                                                                                                                                                          |
| --- | ----------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | Adversarial | fixed       | 314 note: heading + `[~]` bullet reworded from "closed by construction" to "sound by construction; live readback still owed at sign-off"                                                                                                                               |
| D1  | Domain      | fixed       | 314 note: added a correction stating ticket 126 (token ids) shipped and is on by default (`exportTokenFlavour = true`); 126 is itself `Status: resolved`, so no ticket filed                                                                                           |
| D2  | Domain      | fixed       | 312 and 328 notes: replaced "every control is a native picker" / "not raw checkboxes" gloss with the precise fact — the export flavour toggle at `upgrades_tab.tsx:754` is a deliberate raw checkbox, and the `<input type="checkbox"` grep reads 0 only on whitespace |
