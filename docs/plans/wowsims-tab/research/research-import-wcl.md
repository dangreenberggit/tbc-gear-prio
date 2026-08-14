# wowsims/tbc-new import/export research

**Repo**: https://github.com/wowsims/tbc-new
**Pinned commit**: `8aa378b3671a0923fd11fb34b4b3753e53f20c9b` (tag v0.0.101)
**Clone location**: `C:\Users\dgree\AppData\Local\Temp\claude\C--Users-dgree-Code-lulz-tbc-gear-prio\27d7d3fa-1f83-47cd-962f-706324b5a0d4\scratchpad\tbc-new`
**Verification**: `git rev-parse HEAD` in that clone returned `8aa378b3671a0923fd11fb34b4b3753e53f20c9b` at the time of this research; `git log -1` shows commit date 2026-07-25 ("Merge pull request #428 from wowsims/fix/exp-racial-display"), matching the pinned commit. Working tree was clean before checkout.

All file paths below are relative to the repo root.

---

## 1. Import tab inventory

Individual-sim importers live in `ui/core/components/individual_sim_ui/importers/`. Exporters live in the sibling `exporters/` directory. Raid-sim importers/exporters live in `ui/raid/components/importers/` and `ui/raid/components/exporters/`.

**Base class chain** (individual sim):

- `ui/core/components/importer.tsx` — `export abstract class Importer extends BaseModal`. Constructor takes `(parent: HTMLElement, options: ImporterOptions)` where `ImporterOptions = { title: string; allowFileUpload?: boolean }`. It builds the modal (textarea + optional file-upload button + Import button), wires the Import button to call `abstract onImport(data: string): Promise<void>`, and catches errors into a `Toast`. **This is the component contract for adding a new importer**: subclass `Importer` (or one of its subclasses below), implement `onImport(data)`.
- `ui/core/components/individual_sim_ui/importers/individual_importer.tsx` — `export abstract class IndividualImporter<SpecType extends Spec> extends Importer`. Adds `simUI: IndividualSimUI<any>` and a shared helper `finishIndividualImport(simUI, { charClass, race, equipmentSpec, talentsStr, professions, missingEnchants?, missingItems? })` that validates class match, loads DB leftovers, resolves the `EquipmentSpec` via `simUI.sim.db.lookupEquipmentSpec`, then inside `TypedEvent.freezeAllAndDo`: `simUI.player.setRace(eventID, race)`, `simUI.player.setGear(eventID, gear)`, optionally `simUI.player.setTalentsString(eventID, talentsStr)`, optionally `simUI.player.setProfessions(eventID, professions)`. Also defines static constants `DEFAULT_CATEGORIES` (all `SimSettingCategories` except `UISettings`) and `CATEGORY_PARAM = 'i'` used by the link importer/exporter.
- `ui/raid/components/raid_importer.tsx` — `export abstract class RaidImporter extends Importer`, analogous but holds `simUI: RaidSimUI`.

**Concrete individual-sim importers registered** in `ui/core/individual_sim_ui.tsx:466-469`:

```
this.simHeader.addImportLink('JSON', new IndividualJsonImporter(this.rootElem, this), true);
this.simHeader.addImportLink('60U TBC', new Individual60UImporter(this.rootElem, this), true);
this.simHeader.addImportLink('WoWHead', new IndividualWowheadGearPlannerImporter(this.rootElem, this), false, false);
this.simHeader.addImportLink('Addon', new IndividualAddonImporter(this.rootElem, this), true);
```

Plus **Link import**, which is not a modal — it's handled separately via `IndividualLinkImporter.tryParseUrlLocation(window.location)` called at init (`ui/core/individual_sim_ui.tsx:393-395`), decoding the URL hash rather than presenting a paste-box.
Plus **Bulk Gear JSON** import (`ui/core/components/individual_sim_ui/importers/bulk_gear_json_importer.tsx`), used only inside the Bulk tab, not the main import-link row.

Concrete files:

- `individual_addon_importer.tsx` — `IndividualAddonImporter`
- `individual_60u_importer.tsx` — `Individual60UImporter` (Sixty Upgrades)
- `individual_wowhead_gear_planner_importer.tsx` — `IndividualWowheadGearPlannerImporter`
- `individual_json_importer.tsx` — `IndividualJsonImporter`
- `individual_link_importer.tsx` — `IndividualLinkImporter` (static-only, does not extend `Importer`)
- `bulk_gear_json_importer.tsx` — `BulkGearJsonImporter`

**Raid-sim importers registered** in `ui/raid/raid_sim_ui.tsx:104` (and a JSON one alongside):

```
this.simHeader.addImportLink('WCL', new RaidWCLImporter(this.rootElem, this));
```

(`RaidJsonImporter` is also imported at `raid_sim_ui.tsx:18` — the exact registration line for it wasn't captured but the import statement confirms its presence: `import { RaidJsonImporter, RaidWCLImporter } from './components/importers';`.)

---

## 2. Gear-only import — is it achievable, and how do importers apply state?

**Two distinct application paths exist in the codebase**:

**(a) The "helper" path used by Addon/60U/WoWHead importers** — `IndividualImporter.finishIndividualImport` (`ui/core/components/individual_sim_ui/importers/individual_importer.tsx:24-78`). This method unconditionally calls, inside `TypedEvent.freezeAllAndDo`:

```ts
simUI.player.setRace(eventID, race);
simUI.player.setGear(eventID, gear);
if (talentsStr && talentsStr != "--") {
  simUI.player.setTalentsString(eventID, talentsStr);
}
if (professions.length > 0) {
  simUI.player.setProfessions(eventID, professions);
}
```

This always sets gear **and** race; talents/professions are set only if present in the source data. **None of the three shipped importers that use this path (Addon, 60U, WoWHead) offer a "gear only" mode** — they all set race unconditionally, and 60U's own description text says: _"This feature imports gear, race, and (optionally) talents. It does NOT import buffs, debuffs, consumes, rotation, or custom stats."_ (`individual_60u_importer.tsx:22`). So even the "narrowest" existing importers still touch race and potentially talents — not gear-only in the strict sense, though they never touch buffs/consumes/rotation.

**(b) The proto/category-filtered path used by JSON and Link importers.** This is the mechanism that _can_ achieve true gear-only import:

- `Player.fromProto(eventID: EventID, proto: PlayerProto, includeCategories?: Array<SimSettingCategories>)` — `ui/core/player.tsx:1495-1543`. Internally it does `const loadCategory = (cat) => !includeCategories || includeCategories.length == 0 || includeCategories.includes(cat)` and gates each settings group (`Gear`, `Talents`, `Rotation`, `Consumes`, `Miscellaneous`, `External`) behind `loadCategory(...)`. The `Gear` branch (lines 1501-1510) calls `this.setGear(eventID, proto.equipment ? this.sim.db.lookupEquipmentSpec(proto.equipment) : new Gear({}))`, sets item-swap settings, and bonus stats — **and nothing else** if `includeCategories` is `[SimSettingCategories.Gear]`.
- `IndividualSimUI.fromProto(eventID: EventID, settings: IndividualSimSettings, includeCategories?: Array<SimSettingCategories>)` — `ui/core/individual_sim_ui.tsx:699-758` — threads the same `includeCategories` down into `this.player.fromProto(eventID, settings.player, includeCategories)` (line 712), and separately gates encounter/EP-weights/reforge/sim-settings application behind similar category checks.
- Callers: `IndividualJsonImporter.onImport` (`.../importers/individual_json_importer.tsx:33-37`) calls `this.simUI.fromProto(TypedEvent.nextEventID(), proto)` with **no** category filter (imports everything present in the JSON). The link-import init path (`ui/core/individual_sim_ui.tsx:393-395`) calls `this.fromProto(initEventID, urlParseResults.settings, urlParseResults.categories)`, where `categories` comes from parsing the `?i=` URL query param (a string of single-char codes mapped via `SIM_CATEGORY_KEYS`) — this is the one place in the shipped code that actually restricts import to a category subset, driven by the export-side category selection.

**Direct low-level API**: `Player.setGear(eventID: EventID, newGear: Gear, forceUpdate?: boolean)` (`ui/core/player.tsx:707-720`) — sets `this.gear`, re-adjusts weapon-stone imbues, and fires the gear-change emitter. This is the single call that mutates gear and nothing else; it is exactly what a bespoke "gear only" importer in a sibling project would call directly (bypassing `fromProto` entirely) after resolving item IDs via `sim.db.lookupEquipmentSpec(equipmentSpec)`.

**Conclusion**: Yes — a "gear only, don't override local settings" import is achievable with the existing Player API, via either:

1. `player.setGear(eventID, sim.db.lookupEquipmentSpec(equipmentSpec))` directly (no proto involved, no interference with talents/buffs/consumes at all — this is the cleanest, most surgical gear-only path and is what `finishIndividualImport` uses under the hood for the gear line only), or
2. `player.fromProto(eventID, proto, [SimSettingCategories.Gear])` / `simUI.fromProto(eventID, settings, [SimSettingCategories.Gear])` if starting from a full `IndividualSimSettings`/`PlayerProto` and wanting the engine's own category-filter plumbing.

No shipped importer currently exercises option 2 with a `Gear`-only category array — that combination exists in the API (proven by the link-importer's category-param mechanism) but isn't used that way by any current importer. A sibling project wanting real gear-only import would be writing new code, but entirely with existing, un-forked API surface.

---

## 3. WCL import

**tbc-new DOES have a Warcraft Logs importer**, but only for the **raid** sim UI, not the individual sim UI. File: `ui/raid/components/importers/raid_wcl_importer.tsx` (776 lines — same line count as the old wowsims/tbc repo's `raid_wcl_importer.tsx`, consistent with this being a carried-over/ported file). Class: `export class RaidWCLImporter extends RaidImporter` (`raid_wcl_importer.tsx:331`). Registered at `ui/raid/raid_sim_ui.tsx:104`: `this.simHeader.addImportLink('WCL', new RaidWCLImporter(this.rootElem, this));`.

**Auth**: Uses OAuth2 client-credentials grant against WCL directly from the browser, with a **hardcoded client id and secret embedded in the front-end source**:

```ts
// raid_wcl_importer.tsx:376-392
private token = '';
private async getWCLBearerToken(): Promise<string> {
    if (this.token == '') {
        const response = await fetch('https://classic.warcraftlogs.com/oauth/token', {
            method: 'POST',
            headers: {
                Authorization: 'Basic ' + btoa('963d31c8-7efa-4dde-87cf-1b254a8a2f8c:lRJVhujEEnF96xfUoxVHSpnqKN9v8bTqGEjutsO3'),
            },
            body: new URLSearchParams({ grant_type: 'client_credentials' }),
        });
        const json = await response.json();
        this.token = json.access_token;
    }
    return this.token;
}
```

`git blame` on that line at the pinned commit attributes it to commit `b96a69e38` (Kayla Glick, 2025-11-26). This is a wowsims-owned client id/secret pair, shipped in plaintext to every browser that loads the raid sim page. There is no server-side proxy — the token request and all subsequent GraphQL queries go straight from the browser to `classic.warcraftlogs.com`.

**Endpoint**: GraphQL queries against `https://classic.warcraftlogs.com/api/v2/client?query=...` (`raid_wcl_importer.tsx:394-419`, method `queryWCL`), i.e. WCL's public API v2 (classic realm variant).

**Input**: Report + fight ID, parsed from a pasted URL of the form `classic.warcraftlogs.com/reports/REPORTID#fight=FIGHTID` (`parseURL`, `raid_wcl_importer.tsx:421-460`). If no fight ID is given, it queries `report(code).fights(killType: Kills)` and uses the first (or last, if `#fight=last`) fight. There is **no character-name search** — only report+fight URL input.

**What it applies**: Substantially more than gear. Per the in-UI description text (`raid_wcl_importer.tsx:338-373`) and the code:

- Directly from the report: player name, equipment (items/enchants/gems) via `player.setGear(eventID, ...)` (`raid_wcl_importer.tsx:95-108`), faction, and a best-effort matched preset Encounter.
- Inferred (best-effort heuristics): talents (matched to the closest preset build from the tree-point summary), race (from race-specific ability casts), professions (from profession-locked items/casts), buff/CD target assignments (Innervate etc., from cast events), and party composition (from party-restricted heal/aura effects).
- Explicitly NOT imported — left at spec-specific defaults: rotation/spec-specific options, consumes, Paladin blessings.

Class `WCLSimPlayer` (`raid_wcl_importer.tsx:37-147`) is the per-player builder: it first applies a matched preset's defaults (`applySharedDefaults`, `setTalentsString`, `setConsumes`, `setSpecOptions`, `setProfessions`) and _then_ overwrites name and gear from the WCL report data — so gear import is layered on top of preset talents/consumes, not isolated.

Coverage is also limited: `fullTypeToSpec` (`raid_wcl_importer.tsx:149-183`) maps only a subset of spec icon strings to `Spec` enum values — many specs (Mage, Hunter, Rogue, Warlock, most Warrior/Feral specs) are commented out as unimplemented, so the importer silently throws `'Player type not implemented: ' + fullType` for unmapped specs (`raid_wcl_importer.tsx:67-70`).

**Individual sim UI has no WCL importer.** Confirmed by both the explicit importer-list at `ui/core/individual_sim_ui.tsx:466-469` (JSON, 60U, WoWHead, Addon only — no WCL) and a full-repo grep (below).

**Full-repo grep results** (case-insensitive, whole repo including `sim/`, `assets/`, non-`ui/` code):

- `warcraftlogs` / `WarcraftLogs`: 2 files matched — `sim/mage/talents.go` and `ui/raid/components/importers/raid_wcl_importer.tsx`. The `sim/mage/talents.go` hit is unrelated to importer code (not inspected further since it's clearly not import/export logic — a mage talents file).
- `wcl` (case-insensitive, whole repo): 5 files — `sim/core/base_stats.go` (false positive: comment "Values verified against **WCL** TBC-anniversary COMBATANT_INFO audit snapshots" — WCL used only as a data-verification citation, not code), `assets/locales/en/translation.json` (false positive: unrelated i18n string containing "WCL URL" for the _WoWHead_ importer's error message, `error_invalid_url`), `ui/raid/raid_sim_ui.tsx` (the real registration, confirmed above), `ui/raid/components/importers/raid_wcl_importer.tsx` (the importer itself), and `ui/core/components/individual_sim_ui/importers/individual_wowhead_gear_planner_importer.tsx` (false positive: its error message template also happens to contain "WCL" — actually a leftover/copy-paste artifact in the WoWHead importer's error text, unrelated to WCL functionality).
- `graphql` (not separately re-run as a distinct grep, but all GraphQL usage found is inside `raid_wcl_importer.tsx`'s `queryWCL` method — no GraphQL client library, schema file, or codegen setup exists elsewhere in the repo as far as this search went).

No backend/server-side WCL code, no `.env`/config file referencing WCL credentials outside the hardcoded string in the `.tsx` file, and no scripts directory reference to WCL.

---

## 4. CORS/auth reality

From the code in question 3: the browser calls `https://classic.warcraftlogs.com/oauth/token` directly with HTTP Basic auth built from a hardcoded `client_id:client_secret` pair, using the OAuth2 `client_credentials` grant, then calls `https://classic.warcraftlogs.com/api/v2/client` directly with the resulting Bearer token. **There is no server-side proxy** — both the token exchange and the GraphQL queries are plain `fetch()` calls from `raid_wcl_importer.tsx` running in the user's browser (confirmed: no `X-Forwarded`, no wowsims-owned API host, no reference to any wowsims backend endpoint anywhere in this file or elsewhere in the repo).

This implies WCL's classic API (`classic.warcraftlogs.com`) must accept cross-origin `fetch()` calls from arbitrary browser origins for both the `/oauth/token` and `/api/v2/client` endpoints, since this code works as shipped (or is intended to). **I did not verify this against WCL's own API documentation** — that would require checking `https://www.warcraftlogs.com/v2-api-docs/warcraft/` or equivalent classic-realm docs directly, which is outside this repo and outside the scope of what I fetched. Flagging explicitly: whether WCL's public API v2 formally supports/documents CORS and the client-credentials flow for browser use is **not answerable from this repo alone** — only that this repo's code assumes/relies on it working, using a client-credentials grant (not an implicit/authorization-code OAuth flow, and not a per-user token) with a single shared, hardcoded client id.

Practical implication for a sibling project: reusing this pattern would mean either (a) minting your own WCL API client id/secret and hardcoding it client-side the same way (same CORS assumption, same secret-exposure trade-off already accepted by wowsims), or (b) building your own server-side proxy to avoid shipping a secret to the browser. This repo's approach is (a); it does not demonstrate or need a proxy because — per this code — WCL's classic API apparently allows the direct browser calls today.

---

## 5. Link/share codec

Confirmed: zlib-family compression (`pako`, a JS zlib/deflate implementation) + base64 (`btoa`) over the **binary-serialized** `IndividualSimSettings` protobuf message, carried in the URL fragment (`#...`), with an optional `?i=` query param encoding which `SimSettingCategories` were included.

**Encode** — `ui/core/components/individual_sim_ui/exporters/individual_link_exporter.tsx`, static method `IndividualLinkExporter.createLink(simUI, exportCategories?)` (lines 24-46):

```ts
const proto = simUI.toProto(exportCategories);
const protoBytes = IndividualSimSettings.toBinary(proto);
const deflated = pako.deflate(protoBytes, { to: "string" });
const encoded = btoa(String.fromCharCode(...deflated));
const linkUrl = new URL(window.location.href);
linkUrl.hash = encoded;
// ...sets ?i=<category-chars> on linkUrl if exportCategories differs from IndividualImporter.DEFAULT_CATEGORIES
```

**Decode** — `ui/core/components/individual_sim_ui/importers/individual_link_importer.tsx`, static method `IndividualLinkImporter.tryParseUrlLocation(location)` (lines 14-45):

```ts
let hash = location.hash.substring(1); // strip leading '#'
const binary = atob(hash);
const bytes = new Uint8Array(binary.length);
for (let i = 0; i < bytes.length; i++) bytes[i] = binary.charCodeAt(i);
const settingsBytes = pako.inflate(bytes);
const settings = IndividualSimSettings.fromBinary(settingsBytes);
// ...reads ?i= query param, maps chars back to SimSettingCategories via SIM_CATEGORY_KEYS, defaults to IndividualImporter.DEFAULT_CATEGORIES
```

Note the asymmetry worth flagging for anyone reusing this codec: encode uses `pako.deflate(bytes, { to: 'string' })` producing a JS string of raw byte-valued chars (then `btoa`'d), while decode uses `atob` then manually walks `charCodeAt` into a `Uint8Array` before `pako.inflate` (standard zlib inflate, no `{ to: 'string' }` option needed on decode since `fromBinary` wants a `Uint8Array`). This is the exact "zlib + base64 over a proto" pattern the sibling project already assumes — confirmed to be `IndividualSimSettings` (not `PlayerProto` alone; `IndividualSimSettings` wraps player + encounter + raid buffs + sim settings, etc., per `individual_sim_ui.tsx:654-694`'s `toProto`).

Both encode and decode consume/produce the same category-filtering (`SimSettingCategories`) used elsewhere (see Q2) via `simUI.toProto(exportCategories)` and the `?i=` param — so a category-restricted link (e.g. gear-only) is also achievable through this exact codec by passing `[SimSettingCategories.Gear]` as `exportCategories` to `createLink`.

---

## Uncertainty / gaps

**Confirmed absent from repo** (searched, found nothing):

- No Warcraft Logs importer for the **individual** sim UI — confirmed via both the explicit importer registration list (`ui/core/individual_sim_ui.tsx:466-469`) and full-repo grep for `warcraftlogs`/`wcl`.
- No server-side proxy for WCL calls anywhere in the repo — confirmed via reading the entirety of `raid_wcl_importer.tsx` (all network calls target `classic.warcraftlogs.com` directly) and grep for `warcraftlogs` across the whole repo (only 2 hits, one unrelated Go file, one the importer itself).
- No GraphQL client library, codegen, or schema file elsewhere in the repo tied to WCL (only ad hoc query-string building in `queryWCL`).

**Did not find / did not look** (gaps, not confirmed absent):

- I did not fetch or read WCL's own API documentation to confirm whether `classic.warcraftlogs.com`'s OAuth token endpoint and GraphQL endpoint formally document/support CORS or the client-credentials grant for browser-based public clients. I flagged this explicitly in Q4 rather than assert it either way.
- I did not exhaustively verify every file under `sim/mage/talents.go` beyond the single grep line — I did not open that file to confirm the WCL mention there is unrelated (it's very likely a comment referencing "WCL" as a talent-data verification source, structurally identical to the `sim/core/base_stats.go` hit I did inspect, but I did not open `talents.go` itself to double check).
- I did not check whether the hardcoded WCL client id/secret in `raid_wcl_importer.tsx:382` is still valid/active today, nor whether it's rate-limited or scoped in a particular way — that's a runtime fact about the WCL account behind those credentials, not discoverable from source.
- I did not review git history beyond a single `git blame` on the auth line — I don't know if this WCL importer has been present since tbc-new's inception or was added/ported at some specific point relative to other individual-sim importer additions.
- Raid-sim `RaidJsonImporter` file was located only via its import statement (`ui/raid/raid_sim_ui.tsx:18`) — I did not open `ui/raid/components/importers/raid_json_importer.tsx` itself, so I can't cite its exact behavior beyond its existence and name.
