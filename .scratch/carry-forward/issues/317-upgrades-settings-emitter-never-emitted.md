Status: open
Type: bug
Origin: pre-merge review round 4, Adversarial axis finding A1, 2026-08-27
Blocks: none
Blocked by: none

# Upgrades tab's settings emitter is wired but never emitted

`settingsChangedEmitter` is declared at `upgrades_tab.tsx:343` and passed as
`changedEvent` to all three pickers (`:742`, `:757`, `:770`), but the tab never
emits it. Verified: `grep -rn 'settingsChangedEmitter\.emit' ui/` returns four
hits, **all in `bulk_tab.tsx`** (`:596`, `:638`, `:658`, `:664`), none in
`upgrades_tab.tsx`. The borrowed idiom was copied without its emitting half.

## Currently latent, not a live bug

The pickers write through `setValue` on their own DOM `change` listener, so
user edits do reach `iterations` / `candidateCap` / `bisPrune`, and `run()`
reads the right values. What is missing is the `Input` base's re-sync path,
which repaints a field from its source on that event.

## The trap

Any **programmatic** write to those three fields would leave the field
displaying a stale value while `run()` uses the new one. Nothing writes them
programmatically today, so nothing is broken now — but no gate can see this,
and the next person to set one in code inherits a silent inconsistency.

Fix is small: emit the event where the tab changes those fields, or drop the
emitter and the `changedEvent` wiring if the re-sync path is genuinely not
wanted. Either is defensible; leaving it half-wired is the part worth closing.
