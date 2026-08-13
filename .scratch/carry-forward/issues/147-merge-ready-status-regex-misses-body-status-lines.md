Status: closed
Closed: 1f03344
Type: bug
Origin: docs/reviews/feat-set-bonus-value.md round 5 (process P4)
Blocks: none
Blocked by: none

# `check_merge_ready.py`'s status regex misses two open tickets

`STATUS_RE` (`scripts/check_merge_ready.py:35`) matches a line-start
`Status:`. Tickets 88 and 89 write `**Status:** open` inside the body instead,
so both are invisible to the parser: `--list-only` reports 36 open when 38
are.

Same class as open ticket **85** ("merge-ready parses only the first
disposition table") — silent under-reporting by a parser that assumes a shape
the corpus does not always have. A ticket the gate cannot see is a ticket the
gate cannot block on.

Related hygiene found in the same audit, lower priority: ~36 closed tickets
cite no sha anywhere, and 17 use a non-canonical `resolved` status with no
`Closed:` field, so their closes are unauditable. No closing sha was found to
be fake — ten non-resolving hex strings are all correctly upstream pins or
content digests, and three apparent mismatches (96, 101, 102) are one-commit
paperwork lag.

## Fix

Either normalise the two offending tickets to a line-start `Status:`, or widen
`STATUS_RE` to tolerate leading markup. Prefer widening **and** normalising:
the regex should not silently drop a ticket it cannot parse — an unparseable
ticket file should be an error, not a zero.

## Resolution (1f03344, tickets normalised in 71eb58f)

Three changes: `STATUS_RE` accepts optional `**` around the label,
`read_status` strips stray markdown off the value, and
`unparseable_status_tickets()` makes an unreadable or unknown status a FAIL
rather than silently absent -- the half that stops the next unusual format
disappearing the same way. Tickets 88 and 89 were also normalised to the plain
form, so both directions are covered.

**Correction to this ticket's figures.** The "36 -> 38" counts do not
reproduce. Measured across the 153 ticket files at the pre-run tip `7d3e420`,
the old regex saw 47 open and the widened one sees 49. The +2 delta and its
cause (tickets 88 and 89) are what this ticket got right.

    python scripts/check_merge_ready.py --list-only | tail -n +2 | wc -l

reads 42 today, because this run closed six tickets.
