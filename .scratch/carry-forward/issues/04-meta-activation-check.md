Status: open
Type: task
Origin: docs/reviews/phase-0-close-gates.md
Blocks: phase-1

# Check meta activation before trusting baseline DPS

## Problem

`verify_fixture.py` R4 asks whether the meta is active but only resolves gem
IDs / colours. The Go sim does not enforce meta activation (PLAN.md §9).
Phase 0's 2042.85 DPS proves "logged gear sims," not "legal gemming."

## Done when

- Baseline path records meta active/inactive.
- Inactive meta is repaired at minimum EP loss (PLAN §9), disclosed as a
  substitution — not silently simmed as-is for rankings users act on.
