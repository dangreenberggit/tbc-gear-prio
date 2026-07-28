Status: open
Type: task
Origin: docs/reviews/phase-1-five-seed-spread.md (split from 11)
Blocks: none
Blocked by: none

# Import wowsims BiS tags onto universe rows

## Problem

Raid-scoped handoff: wowsims curated gear-set IDs should become `bisTags`
for display/pinning only. Universe rows currently ship with empty/absent
tags. S6 (tags do not change membership) is already tested.

## Done when

- Universe assembly (or a follow-on tag pass) populates `bisTags` from the
  pinned wowsims ret gear sets where IDs match.
- Rank membership is unchanged when tags are stripped (existing S6 tests).
