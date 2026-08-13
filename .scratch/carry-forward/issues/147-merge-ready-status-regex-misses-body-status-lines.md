Status: open
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
