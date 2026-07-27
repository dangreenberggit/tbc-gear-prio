Status: open
Type: task
Origin: docs/reviews/phase-0-close-gates.md
Blocks: phase-1

# Map temporaryEnchant into the sim consumable/imbue path

## Problem

Compose drops `temporaryEnchant`. Slamaltman's MH carries `2639` (consumable
namespace, not `effectId`). The committed `RaidSimResult` is a clean number
for permanent-enchant-only weapons — not the logged weapon state.

## Done when

- Normalize/compose applies weapon imbues from `temporaryEnchant` via the
  consumables table (eligibility-aware).
- Fixture or test covers a character with a present temporary enchant.
