# Archetype tests lack behavioural swap-semantics coverage

Status: open
Origin: pre-merge review feat/upgrades-all-dps-specs (adversarial A4, with A3 residue)
Blocks: none

`packages/core/test/archetype-specs.test.ts` drives `rankUpgrades` through a
`SyntheticSimRunner` whose DPS is `(itemId % 977) * index` — it responds to any
id in any slot, so the suite passes structurally even on physically impossible
gear sets. The A2 offhand guard now has a dedicated non-vacuous regression
test, but the three archetypes still have no behavioural coverage of swap
semantics. Add recorded-adapter fixtures (or a legality-aware synthetic
runner) for shadow/rogue/hunter.
