Status: closed
Type: task
Origin: docs/reviews/docs-terminology-cleanup-plan.md
Closed: 2026-08-12

# check_rename_contradictions.py: fix stdout encoding, then decide if it earns its place

## Problem

Two findings against `scripts/check_rename_contradictions.py`, from the
adversarial axis (A4) and the independent commentary (C3).

**1. It prints UTF-8 content to a cp1252 console.** The script reads files as
UTF-8 but never reconfigures stdout, so a hit containing `§`, an em-dash, or a
curly quote renders as `?`:

    This is the payoff of ?8.2, and it's why feral is a Stage 2 *gate*...

It does not crash at a console — Python substitutes rather than raising — but
piped or redirected it can raise `UnicodeEncodeError` and abort mid-scan,
silently truncating a tool whose whole job is completeness. `merge_to_dev.py`
already handles this with `sys.stdout.reconfigure(encoding="utf-8")`.

**2. Its coverage is narrower than it looks.** The regex needs both tokens on
**one line** with a contrast word between them. This repo hard-wraps Markdown at
~80 columns, so the common case — a flattened sentence split across a line
wrap — is missed. It would have missed the `CONTEXT.md` bug it was written for
had that sentence wrapped one word earlier. It also cannot see table rows, where
the "Instead of / Write" contrast is structural rather than lexical.

Today its only live true positive is its own docstring.

## Fix

1. Add the `sys.stdout.reconfigure(encoding="utf-8")` block from
   `merge_to_dev.py`.
2. Make the scan multiline so a contrast spanning a wrapped line is caught.
   Read the file whole and match across newlines rather than iterating lines.
3. Then re-judge whether it belongs in `scripts/`. The commentary's argument is
   that a one-shot migration aid sitting beside ten checks `pnpm verify` runs
   invites a future reader to assume it is load-bearing. Either move it, or
   note in its docstring that nothing calls it.

## Do not

Wire it into `pnpm verify`. It takes the renamed token as an argument, so there
is nothing to pass on a routine commit, and it always exits 0 by design.

## Verify

Run it against `ee9e220`, the commit that carried the real defect. It must still
report `CONTEXT.md:91` and nothing else:

    git stash -u && git checkout ee9e220
    python /path/to/fixed/check_rename_contradictions.py merge-to-dev
    git checkout docs/terminology-cleanup-plan && git stash pop


## Resolution

Fixed in e39ba46: stdout reconfigured to UTF-8, and the scan now joins
hard-wrapped prose into logical blocks so a flattening across a line break is
caught. Verified against ee9e220 -- still reports CONTEXT.md:91 and nothing
else. Current tree drops from 4 hits to 1 (its own docstring).
