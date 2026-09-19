Status: open
Type: bug
Origin: stage-gate tab-ui-refinements plan review, 2026-09-18
Blocks: none
Blocked by: none
Related: 419 (added set_bonus.total), the tab-ui-refinements batch (fixes the schema in passing)

# Fork locale gate is red on tip and not wired into pnpm verify

Found during the tab-ui-refinements plan review. Two linked defects:

1. **The fork locale gate is already failing on `feat/upgrades-tab` tip
   `d17587b5a`.** `node vendor/tbc-new-fork/test-locales.mjs` → rc=1:
   `❌ en/translation.json is invalid: schema/upgrades_tab must NOT have
   additional properties`. Cause: the prior batch's ticket 419 added
   `upgrades_tab.set_bonus.total` to `assets/locales/en/translation.json` but NOT
   to `schemas/translation.schema.json`, whose `set_bonus` block is
   `additionalProperties:false` with only `prospective/crosses/confounded/
   package_disclosure` allowed.

2. **`test-locales.mjs` is not part of `pnpm verify`.** That is why 419 shipped
   with a red locale gate and the batch still merged clean. The gate only runs if
   someone invokes it by hand.

## What would close this

- `node vendor/tbc-new-fork/test-locales.mjs` exits 0 on the fork tip (schema and
  locale agree). The tab-ui-refinements batch (Step for 431) fixes the schema in
  lockstep with its own key changes, which incidentally clears the pre-existing
  `total` gap — confirm that batch's re-pin leaves the locale gate green, and if
  so this ticket's item 1 closes with it.
- Decide whether to wire the fork locale check into `pnpm verify` (or a fork gate
  it already runs) so a locale/schema drift fails CI rather than sitting latent.
  This is a process decision — if yes, add it; if no, record why (e.g. the fork's
  own CI covers it) so the gap is deliberate, not forgotten.

## Where

`vendor/tbc-new-fork/schemas/translation.schema.json` (the `upgrades_tab` block),
`vendor/tbc-new-fork/assets/locales/en/translation.json`,
`vendor/tbc-new-fork/test-locales.mjs`, and `package.json` `verify:steps` (if
wiring it in).

## Notes

The schema half is being fixed opportunistically by the tab-ui-refinements batch
(its 431 step must edit the schema anyway). The wiring-into-verify half is the
durable process fix and is the real reason to keep this ticket after the batch
lands.
