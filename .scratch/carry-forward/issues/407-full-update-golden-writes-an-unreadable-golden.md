# 407 — `--full --update-golden` writes an unreadable golden (adversarial A1, material)

Status: open
Type: bug
Origin: pre-merge review of feat/desktop-transport-gate, round 3 (2026-09-16)
Blocks: —
Blocked by: none

## What

`scripts/check_desktop_tab.py:640` sets `candidates = 0` when `args.full` is
set. `:657` then calls `write_golden(rb, args.spec, args.phase, candidates)`
with that zero, and `golden_path` (`:91`) interpolates the candidate count
into the filename, producing `data/desktop-gate/golden-ret-p5-cap0.json`. But
`:660` makes `--full` skip check (h) unconditionally ("(h) skipped: no golden
for an uncapped run"), so a cap-0 golden is never read by anything.

The two flags are not mutually exclusive in the argparse block
(`scripts/check_desktop_tab.py:598-611`): `--full` and `--update-golden` are
both plain `action="store_true"` with no `mutually_exclusive_group`.

## Why it matters

Failure scenario: after a fork re-pin a developer runs
`--full --update-golden`, sees `golden written to ...`, commits it, and
believes the gate is refreshed. The real `cap40` golden
(`golden-ret-p5-cap40.json`) is still stale and still enforced, so the next
plain run goes red for a reason the developer thinks they already handled —
the exact reflexive-regeneration failure the golden's own `_note` field and
`data/desktop-gate/README.md` warn about.

## Fix options (do not choose)

- Make `--full` and `--update-golden` mutually exclusive in argparse and
  error if both are passed.
- Have `--full --update-golden` refuse with an explicit message instead of
  writing.
- Give `--full` a golden that (h) actually reads, so the write is not inert.

## Verify

Run `--full --update-golden` and check which file appears under
`data/desktop-gate/`. It should be the cap40 golden, or the command should
refuse.

## Also in this file — three minor findings from the same review

These are small cleanups in `scripts/check_desktop_tab.py` that should ride
along with 407's fix since they touch the same file.

1. **Duplicated comment paragraph.** `check_desktop_tab.py:98-102` and
   `:103-106` are two near-identical paragraphs stacked above
   `EXPECTED_ELIGIBLE` (`:107`), both saying the same thing (measured at step
   5, fork `2781486d6`, ret P5, 617 candidates, re-measure on universe
   regen). AGENTS.md § Comment policy: "If a comment restates the code,
   delete it… Load-bearing comments only" — a comment restating another
   comment is worse. Keep `:103-106` (it carries the date `2026-09-14` and
   the file path `data/universes/ret-p5.json`); delete `:98-102`.

2. **Stale comment provenance.** `:110-114` (not `:110-113` — the paragraph
   runs one line longer than stated) asserts "an uncapped run lands 601 rows
   against 617 eligible candidates (16 screened-out candidates do not land
   as rows)". That mechanism was measured on the *screened* path. Since
   ticket 403 nothing screens, so the stated cause no longer applies to the
   path the gate exercises. The row count may still be right for a different
   reason. It is not cheaply re-measurable (the full pool is forbidden), so
   the fix is a label: mark it measured pre-403 on the screened path,
   untested since. Note also that `FULL_ROWS` (`:115`) is only read on the
   `--full` branch (`:563,571`), and `--full` skips check (h) — so nothing on
   the normal path exercises it.

3. **Dead parameter.** `assert_gate(rb, candidates, spec, phase)` — signature
   at `:531`, called at `:645` — the `candidates` parameter is never read
   inside the function body; check (e) derives everything from
   `rb["candidatesRequested"]` (`:564`). Drop it from the signature and the
   call site.

Line numbers verified against the source as of this review; the brief's
`:98-106` collapsed the two paragraphs into one range (they are `:98-102`
and `:103-106`), and its `:110-113` for the FULL_ROWS comment was short by
one line (`:110-114`).
