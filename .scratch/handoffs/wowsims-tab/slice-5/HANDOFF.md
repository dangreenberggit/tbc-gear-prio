# Slice 5 — WCL gear-only importer: DONE, E-W4 passed

Fork: `vendor/tbc-new-fork`, branch `feat/upgrades-tab`, tip
`adb0d135336a26eab613215fa85b1265d7ce2e5d` (parent
`e1fbf0e2db2695bc1f3b47393235805b230198f2`, two commits: `d205f0b79` adds the
importer, `adb0d1353` fixes blank-credential reporting). Not pushed —
`data/wowsims-fork.lock.json` still records `"pushed": false`.

## What was built

A modal, opened by a new "Import gear from log" button beside the tab's Run
button (`ui/core/components/individual_sim_ui/upgrades_tab.tsx`), that:

1. Parses a pasted WCL report link
   (`ui/core/components/individual_sim_ui/upgrades/adapters/wcl_gear_import.ts`,
   `parseReportUrl` — same regex shape as
   `ui/raid/components/importers/raid_wcl_importer.tsx`'s `parseURL`).
2. If the link has no `#fight=N`, lists the report's kills
   (`HttpWclClient.listFights`) and lets the user pick one.
3. Reads the fight's roster (`HttpWclClient.readRoster`, WCL's
   `table(dataType: Casts, killType: All, viewBy: Default)` query — the same
   query the raid importer uses, one player at a time instead of the whole
   raid) and lets the user pick their character.
4. Builds an `EquipmentSpec` from that player's `gear` array
   (`resolveGearFromRoster`), resolves it against the sim's item database
   using `Database.loadLeftoversIfNecessary` + per-item `lookupItemSpec`
   (`bulk_gear_json_importer.tsx`'s idiom, named in the E-W4 method doc as
   the pattern to copy), and reports any item ids that failed to resolve
   rather than dropping them silently.
5. Applies the result with `player.setGear(eventID, gear)` — **only this
   call**, matching E-W4's bound application call
   (`wcl_import_modal.tsx`'s `onRosterPick`, with a comment pointing back at
   the method doc so a future edit can't switch to `fromProto(..., [Gear])`
   without noticing the gate it would invalidate).

Files:
- `ui/core/components/individual_sim_ui/upgrades/adapters/wcl_gear_import.ts`
  — fetch/parse/resolve, no UI. `HttpWclClient` implements OAuth2
  client-credentials against `classic.warcraftlogs.com`, reading the id/secret
  from a gitignored local file.
- `ui/core/components/individual_sim_ui/upgrades/adapters/local.wcl-credentials.ts`
  (gitignored, not committed) and its committed template,
  `local.wcl-credentials.example.ts`.
- `ui/core/components/individual_sim_ui/upgrades/wcl_import_modal.tsx` — the
  three-step modal UI (URL → fight pick if needed → roster pick → apply).
- `ui/core/components/individual_sim_ui/upgrades_tab.tsx` — one new button
  wired to open the modal.
- `assets/locales/en/translation.json` — one new string,
  `upgrades_tab.import_wcl`.
- `.gitignore` — new entry for the credentials file.

**`upgrades/engine/` was not touched.** Confirmed by `git diff` scope in the
commit (6 files, none under `engine/`) and by the drift gate staying 30/30
after the change (see Verification below) — nothing here needed re-porting.

## Placement decision

The importer is a button inside the Upgrades tab, not a header import link
(`simHeader.addImportLink`) alongside JSON/60U/WoWHead/Addon. Reason: every
header importer applies race + talents + professions in addition to gear
(`finishIndividualImport`, `ui/core/components/individual_sim_ui/importers/individual_importer.tsx:53-63`).
This importer is scoped to "gear for ranking" only — E-W4 binds it to
`setGear` alone — so reusing the header importer's shared helper would have
applied more than the ask permits. This is a placement choice, not a
deviation from "follow upstream's importer placement idiom": the *modal*
mechanics (`Importer`/`BaseModal`, `Toast` on completion) are copied
idiom-for-idiom; only the trigger point differs, because the scope differs.

## E-W4: PASSED

Full method run per `docs/plans/wowsims-tab/experiments/e-w4-method.md`,
verdict and full script output in
`docs/plans/wowsims-tab/experiments/e-w4-result.md` (this repo, committed
alongside the before/after captures and the diff script). Summary:

- Served the ret page (`npx vite serve --port 5199` — port 5173 was held by
  another chat's dev server on this machine; otherwise the method doc's
  recipe unchanged).
- Set every settings category to a visibly non-default value
  (gear = PreRaid preset, bonus stats, item swap, talents, rotation,
  consumes, distance from target, one raid buff, one debuff, encounter
  duration, iterations), each applied and read back through both the live
  in-memory getters and the page's own autosave before trusting a capture —
  this caught and discarded one bad "before" capture mid-run where a
  rotation edit hadn't round-tripped through the autosave yet.
- Applied `ui/paladin/retribution/gear_sets/p1.gear.json` via
  `player.setGear(eventID, simUI.sim.db.lookupEquipmentSpec(spec))` — the
  exact call slice 5 ships.
- Diff (`e-w4-diff.mjs`, the method doc's script verbatim): **PASS, empty
  diff outside `player.equipment`, exit 0.** Sanity check confirmed
  `player.equipment` did change (index 0: `32087` → `29073`).
- One incidental finding, recorded in the result file's Notes: after the
  gear-only import, `player.itemSwap.items[0]` still carries the old
  PreRaid weapon id — direct confirmation that the item-swap *setting*
  (part of the Gear category, not the equipment field) is untouched by
  `setGear`, matching the method doc's field-by-field derivation.

The harness hook (`window.__ew4` in `IndividualSimUI`'s constructor) was
removed after the run; `git diff` on `ui/core/individual_sim_ui.tsx` is
empty in the shipped commit.

## Verification

- Fork: `npx tsc --noEmit` → **exit 0** (verified twice — once mid-build
  after fixing two `role` prop typing errors on list items, once after the
  harness hook was removed).
- Fork: `git status --short` after the commit shows only the pre-existing
  untracked `.ew1-scratch/` (E-W1 leftovers from an earlier slice, not
  committed, not this slice's concern).
- Outer repo: `pnpm verify` → **exit 0**, 760 tests passed (1 skipped, 2
  todo, both pre-existing), including E-W3
  (`wowsims-fork-parity.test.ts`, 3.5s, unaffected since `engine/` wasn't
  touched).
- Outer repo: `pnpm engine-port-drift:check` → **30/30 ported files match
  PROVENANCE.md**.
- `packages/core/src/` untouched — confirmed by `git status --short`
  showing no changes there.
- `data/wowsims-fork.lock.json` bumped to the new fork tip
  (`adb0d135336a26eab613215fa85b1265d7ce2e5d`); `pushed` stays `false`.
- One outer-repo change beyond the experiment artifacts:
  `eslint.config.js` gained
  `docs/plans/wowsims-tab/experiments/**/*.mjs` on the existing
  `scripts/**/*.mjs` Node-globals override, because `e-w4-diff.mjs` (copied
  verbatim from the method doc, per its own instruction) uses `process` and
  `console` and is committed outside `scripts/`. Same override, not a new
  rule.

## Untested / honestly flagged

- **Live WCL fetching is untested.** No WCL client id/secret was available
  in this environment; `local.wcl-credentials.ts` is committed-gitignored
  with blank values. `HttpWclClient`'s auth flow, `listFights`, and
  `readRoster` were built by close reading of
  `raid_wcl_importer.tsx`'s working implementation (same endpoints, same
  query shapes, same response field names) but never exercised against the
  live API. E-W4 does not require this — it tests `setGear` application,
  not fetching — but a first real user of this button is the first live
  test of the fetch path.
- **The fight-list picker UI (`fightPickContent`) and roster picker UI
  (`rosterPickContent`) were not click-tested in a browser.** E-W4's harness
  drove `setGear` directly from the console rather than through the modal's
  click handlers, because the harness needed a known fixture, not a live
  WCL round trip. The modal's URL-parsing step (`parseReportUrl`) is plain
  TypeScript with no DOM dependency and is exercised by construction
  wherever it's called, but nothing here clicked the actual buttons.
- **Unresolved-item reporting (`resolveGearFromRoster`'s
  `unresolvedItemIds`) is untested against a real gap** — no fixture in
  this session had an item outside the loaded database, so the Toast
  message path for that case was read, not run.
- ~~`WCL_CLIENT_ID`/`WCL_CLIENT_SECRET` being empty strings reaches WCL's
  API with an opaque error instead of a friendly message~~ **fixed**
  (`adb0d1353`): `loadWclCredentials` now checks for blank values alongside
  the missing-file case, so a real user who copies `.example.ts` and
  forgets to fill it in sees the same actionable message.
