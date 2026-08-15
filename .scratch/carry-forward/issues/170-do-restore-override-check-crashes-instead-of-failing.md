Status: open
Type: test quality
Origin: adversarial axis, pre-merge review of `feat/sweep-ret-tickets`, 2026-08-14
(`docs/reviews/feat-sweep-ret-tickets.md`, finding A1)
Blocks: none
Blocked by: none

# The `do_restore` override check crashes instead of reporting the regression

`check_restore_fetches_override_not_main_pin` in `scripts/check_sync_wowsims.py`
is the case that covers `do_restore` reading a file's own `"commit"` override
instead of the top-level pin (`scripts/sync_wowsims.py:378`). When that read is
broken, the checker does **not** print a `FAIL` naming the regression. It dies
with an unhandled `FileNotFoundError` deep in its own harness.

## Reproduce

In `scripts/sync_wowsims.py`, replace

```python
file_sha = meta.get("commit", sha)
```

with `file_sha = sha`, then:

```bash
python scripts/check_sync_wowsims.py; echo "exit=$?"
```

Observed 2026-08-14 on `feat/sweep-ret-tickets` @ `952fdc6`:

```
FileNotFoundError: [Errno 2] No such file or directory:
  '...\\Temp\\tmp9n06ppzb\\vendor\\ret_p3.gear.json'
exit=1
```

with **zero** `FAIL` lines in the output.

## What is and is not wrong

**The gate still holds.** Exit is `1`, so `pnpm verify` fails and the
regression cannot land silently. An earlier reading of this finding claimed the
checker returned `guard rails ok` and exit `0` against the mutation; that does
**not** reproduce — re-run the commands above before acting on any such claim.

**The diagnosis is what is broken.** The mutation breaks `do_restore`'s
override read, so the override file is never written to the temp vendor dir,
and the next assertion opens a file that is not there. The traceback names a
temp path, not the mechanism, so the failure reads as a broken *test harness*
rather than as the exact regression the ticket-160 case was written to catch.
The next person to touch `do_restore` will see a `FileNotFoundError` in a temp
directory and reasonably suspect their environment first.

This is the same family as the defect ticket 160 was filed for — the mechanism
was correct but uncovered — one layer further in: now covered, but the coverage
cannot say what it caught.

## Done when

- Breaking `do_restore`'s `meta.get("commit", sha)` read produces a `FAIL` line
  that names the override mechanism, not an unhandled traceback.
- The check asserts the override file exists (and carries the override bytes)
  before reading it, so a missing file is reported as the failure it is.
- The other three ticket-160 cases are spot-checked the same way: mutate the
  thing each claims to cover and confirm the output names it. Finding A1's
  companion result — that mutating `do_update`'s
  `PER_FILE_PIN.get(local, sha)` yields 8 distinct `FAIL` lines across three
  checks — is the standard to match.

## Note

Do not "fix" this by wrapping the harness in a bare `except`. The value is in
the message, not in the exit code, which is already correct.
