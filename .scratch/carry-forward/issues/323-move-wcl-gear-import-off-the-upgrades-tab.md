Status: open
Type: enhancement
Origin: owner review of the mobile layout, 2026-08-27
Blocks: none
Blocked by: none

# (Button removed 2026-08-28; the move itself is still open) "Import log" does not belong on the Upgrades tab, and the label is wrong

The owner, on seeing it in the run controls: they did not know what it was,
guessed WCL, and said that if so the label is bad and the Upgrades tab is not
where they would want gear imported from.

**All three are correct.** Verified:

- The button opens `WclGearImportModal` (`upgrades_tab.tsx:810-812`) — it imports
  gear from a Warcraft Logs report.
- Its locale keys are `upgrades_tab.import_wcl` ("Import gear from log") and
  `import_wcl_short` ("Import log", `translation.json:862-863`). The short form
  is what renders, and on its own it says nothing about gear or about WCL.

## The constraint whoever moves it must know

There is a documented reason it is not already a header importer
(`upgrades_tab.tsx:806-809`): it applies **only `player.equipment`**, whereas the
header importers (JSON / 60U / WoWHead / Addon) all apply race, talents and
professions too. So it cannot simply be registered alongside them — the
behavioural difference is deliberate and would have to be either preserved as an
option or consciously dropped.

That is what makes this a separate piece of work rather than a move: the
question "should importing gear from a log also import talents?" is a real
product question, and the answer decides where it can live.

## Scope

Explicitly **not** part of the Upgrades tab UI work. The owner's words: it would
be "something to add later, imported through the import button as an option
there on a separate PR even but not on this wowsims tab PR".

Immediate step, in the mobile/collapsible work: drop the button from the
Upgrades tab's run controls. Nothing else in the tab references it beyond its
own wiring (`grep -n importButton` → 5 hits, all declaration/mount/handler), so
removing it is self-contained.


## Update 2026-08-28 — button removed, move still open

The button, its ref, its handler, the now-unused `WclGearImportModal` import and
both locale keys (plus their `properties`/`required` schema entries) were removed
from the Upgrades tab in fork `0e94d3ea9`. Confirmed gone by measurement at 375px
(`.upgrades-import-button` is null) and by the locales gate passing, which it
would not with a schema mismatch.

**This ticket stays open**, because removing the button is not the work it
describes. Re-homing WCL gear import in the header import menu — and answering
whether importing gear from a log should also apply race/talents/professions,
which is why it was never a header importer — is still to do, on its own PR.