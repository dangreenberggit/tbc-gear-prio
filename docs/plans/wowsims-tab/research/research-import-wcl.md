# wowsims/tbc-new import/export research

**Commit verified:** `8aa378b3671a0923fd11fb34b4b3753e53f20c9b` (tag v0.0.101)
Confirmed via `git rev-parse HEAD` and `git log -1`:

```
commit 8aa378b3671a0923fd11fb34b4b3753e53f20c9b
Merge: a8513bc0c fd1644f7f
Author: Johan Hillerström <progr@mmer.nu>
Date:   Sat Jul 25 01:38:59 2026 +0200

    Merge pull request #428 from wowsims/fix/exp-racial-display
```

**Clone location:** `C:\Users\dgree\AppData\Local\Temp\claude\C--Users-dgree-Code-lulz-tbc-gear-prio\27d7d3fa-1f83-47cd-962f-706324b5a0d4\scratchpad\tbc-new-import` (fresh clone made by this agent — see note below on why).

Note on the pre-existing `tbc-new` sibling directory: it existed in the scratchpad already, but it was on a different, much later commit (`d7d89da2a2f473f2c9848856f77edb18b2a86025`, dated 2026-08-14) with an actively dirty working tree (many deleted files, mid-operation), so per instructions I left it untouched and cloned my own copy instead.

All file paths below are relative to the repo root (`tbc-new-import/`).

---

## 1. Import tab inventory

**Individual sim UI** import tabs are registered in `ui/core/individual_sim_ui.tsx:466-469`:

```
this.simHeader.addImportLink('JSON', new IndividualJsonImporter(this.rootElem, this), true);
this.simHeader.addImportLink('60U TBC', new Individual60UImporter(this.rootElem, this), true);
this.simHeader.addImportLink('WoWHead', new IndividualWowheadGearPlannerImporter(this.rootElem, this), false, false);
this.simHeader.addImportLink('Addon', new IndividualAddonImporter(this.rootElem, this), true);
```

So the buttons are: **JSON**, **60U TBC** (Sixty Upgrades), **WoWHead** (gear planner URL), **Addon** (WoWSimsExporter addon export). There is no user-facing "Link" import button — link import instead happens automatically by parsing `window.location.hash` on page load (see §5).

**Directory layout** — `ui/core/components/individual_sim_ui/importers/`:

- `index.ts` — barrel export (`ui/core/components/individual_sim_ui/importers/index.ts:1-6`):
  ```
  export { BulkGearJsonImporter } from './bulk_gear_json_importer';
  export { Individual60UImporter } from './individual_60u_importer';
  export { IndividualAddonImporter } from './individual_addon_importer';
  export { IndividualJsonImporter } from './individual_json_importer';
  export { IndividualLinkImporter } from './individual_link_importer';
  export { IndividualWowheadGearPlannerImporter } from './individual_wowhead_gear_planner_importer';
  ```
- `individual_importer.tsx` — abstract base for individual-sim importers
- one file per importer

Parallel structure exists for exporters (`ui/core/components/individual_sim_ui/exporters/`) and for the raid UI (`ui/raid/components/importers/`, `ui/raid/components/exporters/`).

**Base class / component contract:**

- Root abstract class `Importer` (`ui/core/components/importer.tsx:14-82`), extends `BaseModal`. Constructor takes `(parent: HTMLElement, options: ImporterOptions)` where `ImporterOptions = { title: string; allowFileUpload?: boolean }` (`ui/core/components/importer.tsx:9-12`). It builds a modal with a textarea + (optional) file-upload button + an Import button, and wires the Import button's click handler to call the abstract method:

  ```ts
  abstract onImport(data: string): Promise<void>;
  ```

  (`ui/core/components/importer.tsx:81`)

- Individual-sim-specific abstract subclass `IndividualImporter<SpecType extends Spec>` (`ui/core/components/individual_sim_ui/importers/individual_importer.tsx:12-79`), extends `Importer`. Adds:
  - static `DEFAULT_CATEGORIES` (all `SimSettingCategories` except `UISettings`) and `CATEGORY_PARAM = 'i'` (used for the link-import category URL param).
  - constructor `(parent: HTMLElement, simUI: IndividualSimUI<SpecType>, options: ImporterOptions)`.
  - a shared helper `finishIndividualImport(simUI, { charClass, race, equipmentSpec, talentsStr, professions, missingEnchants?, missingItems? })` (`individual_importer.tsx:24-78`) that every concrete individual importer (Addon, 60U, WoWHead) calls at the end of its `onImport`. This helper validates class match, resolves the equipment spec against the DB, then inside a single `TypedEvent.freezeAllAndDo` block calls:
    ```ts
    simUI.player.setRace(eventID, race);
    simUI.player.setGear(eventID, gear);
    if (talentsStr && talentsStr != "--")
      simUI.player.setTalentsString(eventID, talentsStr);
    if (professions.length > 0)
      simUI.player.setProfessions(eventID, professions);
    ```
    (`individual_importer.tsx:53-63`)

- Concrete importers each implement `onImport(data: string): Promise<void>` and either call `finishIndividualImport` (Addon/60U/WoWHead) or apply a full proto directly (JSON importer — see §2).

To add a new importer: extend `IndividualImporter<SpecType>` (or `Importer` directly if not tied to the individual-sim proto model), implement `onImport`, and register it with `simHeader.addImportLink(label, instance, ...)` in `ui/core/individual_sim_ui.tsx`.

---

## 2. Gear-only import

**No existing individual-sim importer (Addon, 60U, WoWHead, JSON) imports gear only.** All of them apply gear + race + talents + professions (Addon/60U/WoWHead via `finishIndividualImport`, see §1), or the _entire_ `IndividualSimSettings` proto (JSON importer, see below) — none pass a category filter that would exclude non-gear categories.

**JSON importer** (`ui/core/components/individual_sim_ui/importers/individual_json_importer.tsx:21-39`) parses the pasted text as an `IndividualSimSettings` proto and calls:

```ts
if (this.simUI.isWithinRaidSim) {
  if (proto.player) {
    this.simUI.player.fromProto(TypedEvent.nextEventID(), proto.player);
  }
} else {
  this.simUI.fromProto(TypedEvent.nextEventID(), proto);
}
```

Neither call passes an `includeCategories` argument, so it defaults to "apply everything" (see below) — this is a full-settings import, not gear-only.

**The API does support gear-only application**, but only the underlying `Player.fromProto` / `IndividualSimUI.fromProto` methods expose it — no shipped importer exercises this path for individual-sim gear-only import. The mechanism is `SimSettingCategories`:

```ts
// ui/core/constants/sim_settings.ts
export enum SimSettingCategories {
  Gear = 0,
  Talents,
  Rotation,
  Consumes,
  Miscellaneous, // Spec-specific settings, Distance from target, tank status, etc
  External, // Buffs and debuffs
  Encounter,
  UISettings, // # iterations, EP weights, filters, etc
}
```

`Player.fromProto` (`ui/core/player.tsx:1495-1543`) takes an optional `includeCategories?: Array<SimSettingCategories>` and gates each category of state behind a `loadCategory(cat)` check:

```ts
fromProto(eventID: EventID, proto: PlayerProto, includeCategories?: Array<SimSettingCategories>) {
    TypedEvent.freezeAllAndDo(() => {
        Player.updateProtoVersion(proto);
        const loadCategory = (cat: SimSettingCategories) => !includeCategories || includeCategories.length == 0 || includeCategories.includes(cat);
        eventID = TypedEvent.nextEventID();
        if (loadCategory(SimSettingCategories.Gear)) {
            this.setGear(eventID, proto.equipment ? this.sim.db.lookupEquipmentSpec(proto.equipment) : new Gear({}));
            this.itemSwapSettings.setItemSwapSettings(...);
            this.setBonusStats(eventID, Stats.fromProto(proto.bonusStats || UnitStats.create()));
        }
        if (loadCategory(SimSettingCategories.Talents)) { this.setTalentsString(eventID, proto.talentsString); }
        if (loadCategory(SimSettingCategories.Rotation)) { ... }
        if (loadCategory(SimSettingCategories.Consumes)) { ... }
        if (loadCategory(SimSettingCategories.Miscellaneous)) { ... race, profession1/2, name, reaction time, ... }
        if (loadCategory(SimSettingCategories.External)) { this.setBuffs(eventID, proto.buffs || IndividualBuffs.create()); }
    });
}
```

(`ui/core/player.tsx:1495-1543`, category block quoted above)

Calling `player.fromProto(eventID, proto, [SimSettingCategories.Gear])` would set **only** gear (equipment + item-swap gear + bonus stats) and leave talents/rotation/consumes/race/professions/buffs untouched — i.e. exactly a "gear only, don't override local settings" import, if the caller supplies the category array. `IndividualSimUI.fromProto` (`ui/core/individual_sim_ui.tsx:699-764`) has the equivalent `includeCategories` parameter and the same `loadCategory` gating pattern for its own top-level settings (tanks, raid/party buffs, encounter, EP weights, etc.), and it forwards `includeCategories` straight to `this.player.fromProto(eventID, settings.player, includeCategories)` (`individual_sim_ui.tsx:712`).

**Exact method signatures found:**

```ts
// ui/core/player.tsx:707
setGear(eventID: EventID, newGear: Gear, forceUpdate?: boolean): void

// ui/core/player.tsx:722
async setGearAsync(eventID: EventID, newGear: Gear, forceUpdate?: boolean): Promise<void>

// ui/core/player.tsx:1495
fromProto(eventID: EventID, proto: PlayerProto, includeCategories?: Array<SimSettingCategories>): void

// ui/core/individual_sim_ui.tsx:699
fromProto(eventID: EventID, settings: IndividualSimSettings, includeCategories?: Array<SimSettingCategories>): void

// ui/core/player.tsx:611
setRace(eventID: EventID, newRace: Race): void

// ui/core/player.tsx:639
setProfessions(eventID: EventID, newProfessions: Array<Profession>): void

// ui/core/player.tsx:958
setTalentsString(eventID: EventID, newTalentsString: string): void
```

The only place in the shipped UI that actually passes a **non-default** `includeCategories` value is the link importer/exporter pair (see §5), driven by a URL query param — not gear-specific but general "pick which categories to include."

---

## 3. WCL import

**tbc-new DOES have a Warcraft Logs importer, but it is raid-UI only, not individual-sim.**

File: `ui/raid/components/importers/raid_wcl_importer.tsx` — **776 lines** (same line count noted for the old `wowsims/tbc` repo's `ui/raid/components/importers/raid_wcl_importer.tsx`).

Registration — only in the raid sim UI:

```ts
// ui/raid/raid_sim_ui.tsx:103-104
this.simHeader.addImportLink("JSON", new RaidJsonImporter(this.rootElem, this));
this.simHeader.addImportLink("WCL", new RaidWCLImporter(this.rootElem, this));
```

There is no equivalent registration anywhere under `ui/core/individual_sim_ui.tsx` or `ui/core/components/individual_sim_ui/importers/`. A grep of the whole `ui/core/components/individual_sim_ui/importers/index.ts` barrel confirms only JSON/60U/Addon/WoWHead/Link/BulkGearJson importers exist there (no WCL).

**Auth:** hardcoded OAuth2 client-credentials flow, client id and secret **hardcoded in the frontend source**:

```ts
// ui/raid/components/importers/raid_wcl_importer.tsx:376-392
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

This is a **wowsims-owned WCL client id/secret**, sent directly from the browser (Basic auth over `btoa(id:secret)`), not a user-provided token and not a server-side proxy. No proxy layer exists in this file or referenced by it.

**Endpoint:**

```ts
// ui/raid/components/importers/raid_wcl_importer.tsx:402
const queryURL = `https://classic.warcraftlogs.com/api/v2/client?query=${query}`;
```

GraphQL POST-as-GET style query against WCL's `classic.warcraftlogs.com` API v2 client endpoint, with `Authorization: Bearer <token>` (`raid_wcl_importer.tsx:394-419`).

**Input:** report + fight ID only — not character search:

```ts
// ui/raid/components/importers/raid_wcl_importer.tsx:421-424
const match = url.match(
  /classic\.warcraftlogs\.com\/reports\/([a-zA-Z0-9:]+)\/?(#.*fight=((\d+)|(last)))?/
);
if (!match) {
  throw new Error(
    `Invalid WCL URL ${url}, must look like "classic.warcraftlogs.com/reports/XXXX"`
  );
}
```

The UI description text confirms: _"To import, paste the WCL report and fight link (https://classic.warcraftlogs.com/reports/REPORTID#fight=FIGHTID). Include the fight ID or else the first fight in the report will be used."_ (`raid_wcl_importer.tsx:340-345`). If no fight ID is given it queries `reportData.report.fights` and defaults to the first (or last, if `#fight=last`) fight (`raid_wcl_importer.tsx:432-456`).

**State applied** — much more than gear, applied per-player across the whole raid:

- Player name, class/spec (inferred from `data.icon`), gear (items, permanent enchant, gems) — `raid_wcl_importer.tsx:94-108`:
  ```ts
  this.player.setName(eventID, data.name);
  this.player.setGear(
    eventID,
    simUI.sim.db.lookupEquipmentSpec(
      EquipmentSpec.create({
        items: data.gear.map((gear) =>
          ItemSpec.create({
            id: gear.id,
            enchant: gear.permanentEnchant,
            gems: gear.gems ? gear.gems.map((gemInfo) => gemInfo.id) : [],
          })
        ),
      })
    )
  );
  ```
- Talents: **not** taken directly from the log (WCL only gives a tree-point summary like "51/20/0"); instead the importer picks the closest matching preset build from `playerPresets` by point-distance (`raid_wcl_importer.tsx:74-84, 111-131`), and applies `preset.talents.talentsString`, `preset.consumables`, `preset.specOptions` as defaults before overwriting name/gear (`raid_wcl_importer.tsx:86-91`).
- Race: inferred from race-specific ability casts (Draenei's Heroic Presence, Blood Elf/Troll/Orc/Gnome/Dwarf/Tauren/Undead/Human racials) or falls back to `preset.defaultFactionRaces[faction]` (`raid_wcl_importer.tsx:560-597`).
- Professions: inferred from profession-tagged spell casts (Lifeblood → Herbalism, Skinning) or gear requirements, defaulting to Engineering+Jewelcrafting (`raid_wcl_importer.tsx:599-625`).
- Buff/CD assignments (e.g. Innervate target), party composition (inferred from party-restricted heal/aura events), encounter (matched to a preset encounter by fight name, or a default target) — `raid_wcl_importer.tsx:627-752`.
- Explicitly NOT imported per the in-UI description: "Rotation / Spec-specific options, Consumes, Paladin Blessings" use spec-specific defaults (`raid_wcl_importer.tsx:365-370`).

So this is a full-raid import (name, class/spec, gear, inferred race/professions/talents/party/assignments), not a gear-only importer, and it lives entirely in the raid UI code path — it is not reachable from the individual sim UI at this commit.

**Whole-repo grep for vestiges** — ran `grep -rniE 'warcraftlogs|\bwcl\b'` over the entire repo (not just `ui/`), excluding `node_modules`. All hits:

- `assets/locales/en/translation.json:2118` — unrelated: an error string for the _WoWhead_ gear-planner importer that happens to say "Invalid WCL URL" (copy-paste artifact referring to the Wowhead URL, not Warcraft Logs).
- `sim/core/base_stats.go:22` — a code comment: `// Values verified against WCL TBC-anniversary COMBATANT_INFO audit snapshots` (data provenance note, not an importer).
- `sim/mage/talents.go:492` — a comment containing a `warcraftlogs.com/reports/...` link as a citation/reference for a talent mechanic, not code.
- `ui/core/components/individual_sim_ui/importers/individual_wowhead_gear_planner_importer.tsx:135` — same "Invalid WCL URL" string artifact as above (this file is the Wowhead importer, unrelated to Warcraft Logs).
- All remaining hits are inside `ui/raid/components/importers/raid_wcl_importer.tsx` (the file already covered above) and its one registration line in `ui/raid/raid_sim_ui.tsx:104`.

No `backend/`, `server/`, `scripts/`, `docs/`, or Go tooling code references Warcraft Logs at all beyond the two incidental comments noted. There is no separate config file, env var, or `.env.example` entry for a WCL client id/secret anywhere in the repo — the credentials are inline in the `.tsx` file itself.

---

## 4. CORS/auth reality

From the code found in §3, an in-browser WCL call in this repo authenticates via a **hardcoded OAuth2 client-credentials grant**, using a **wowsims-owned client id and secret embedded directly in client-side TypeScript**, sent as a `Basic` auth header from the browser to `https://classic.warcraftlogs.com/oauth/token`, and then the resulting bearer token is used directly from the browser against `https://classic.warcraftlogs.com/api/v2/client`. There is:

- no user-provided token flow,
- no server-side proxy,
- no implicit/authorization-code OAuth flow (it's `grant_type=client_credentials`, the machine-to-machine flow — no user login/redirect involved),
- no CORS-handling code, no `mode: 'no-cors'`, no proxy rewrite rules in this file or elsewhere in the repo. The `fetch()` calls are plain cross-origin requests, implying the request either succeeds because `classic.warcraftlogs.com` sends permissive CORS headers for these endpoints, or (more likely, given `client_credentials` requests typically don't need browser CORS preflight complications the way cookie-based auth would) WCL's API v2 already permits browser-based cross-origin calls for this grant type.

**I could not confirm from this repo whether WCL's public API actually allows this cross-origin browser call by policy** — that is, whether `classic.warcraftlogs.com` returns `Access-Control-Allow-Origin` headers permitting arbitrary origins, or whether this only works because of some WCL-side allowlisting of the wowsims domain, or another mechanism. **This is not answerable from this repo alone.** WCL's public API v2 documentation (referenced in a code comment at `raid_wcl_importer.tsx:494` as `https://www.warcraftlogs.com/v2-api-docs/warcraft/`) would need to be checked separately to determine what CORS policy WCL's API actually exposes and whether embedding a client secret in frontend code is WCL's documented/intended integration pattern for `client_credentials` grants or an anti-pattern that happens to work. I have not fetched or read that documentation, and I am not fabricating what it says.

---

## 5. Link/share codec

Confirmed: the share-link mechanism is **zlib-family compression (via the `pako` library's `deflate`/`inflate`, i.e. DEFLATE/zlib) applied to a serialized `IndividualSimSettings` protobuf, then base64-encoded (via `btoa`/`atob`) into the URL hash fragment.**

**Export (encode)** — `ui/core/components/individual_sim_ui/exporters/individual_link_exporter.tsx`, static method `IndividualLinkExporter.createLink` (lines 24-46):

```ts
static createLink(simUI: IndividualSimUI<any>, exportCategories?: Array<SimSettingCategories>): string {
    if (!exportCategories) {
        exportCategories = IndividualImporter.DEFAULT_CATEGORIES;
    }
    const proto = simUI.toProto(exportCategories);
    const protoBytes = IndividualSimSettings.toBinary(proto);
    // @ts-ignore Pako did some weird stuff between versions and the @types package doesn't correctly support this syntax for version 2.0.4 but it's completely valid
    const deflated = pako.deflate(protoBytes, { to: 'string' });
    const encoded = btoa(String.fromCharCode(...deflated));

    const linkUrl = new URL(window.location.href);
    linkUrl.hash = encoded;
    if (arrayEquals(exportCategories, IndividualImporter.DEFAULT_CATEGORIES)) {
        linkUrl.searchParams.delete(IndividualImporter.CATEGORY_PARAM);
    } else {
        const categoryCharString = exportCategories.map(c => SIM_CATEGORY_KEYS.get(c)).join('');
        linkUrl.searchParams.set(IndividualImporter.CATEGORY_PARAM, categoryCharString);
    }
    return linkUrl.toString();
}
```

(`ui/core/components/individual_sim_ui/exporters/individual_link_exporter.tsx:24-46`)

So: protobuf-serialize (`IndividualSimSettings.toBinary`) → `pako.deflate` (zlib DEFLATE) → base64 (`btoa`) → placed in the URL hash. If the exported category set is non-default, single-letter category codes (from `SIM_CATEGORY_KEYS`, e.g. `g` for Gear, `t` for Talents) are appended as the `?i=` query param (`IndividualImporter.CATEGORY_PARAM`) so the importer knows which categories to selectively apply.

**Import (decode)** — `ui/core/components/individual_sim_ui/importers/individual_link_importer.tsx`, static method `IndividualLinkImporter.tryParseUrlLocation` (lines 14-46):

```ts
static tryParseUrlLocation(location: Location | URL): UrlParseData | null {
    let hash = location.hash;
    if (hash.length <= 1) return null;

    hash = hash.substring(1); // Remove leading '#'
    const binary = atob(hash);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < bytes.length; i++) bytes[i] = binary.charCodeAt(i);

    const settingsBytes = pako.inflate(bytes);
    const settings = IndividualSimSettings.fromBinary(settingsBytes);

    let exportCategories = IndividualImporter.DEFAULT_CATEGORIES;
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has(IndividualImporter.CATEGORY_PARAM)) {
        const categoryChars = urlParams.get(IndividualImporter.CATEGORY_PARAM)!.split('');
        exportCategories = categoryChars
            .map(char => [...SIM_CATEGORY_KEYS.entries()].find(e => e[1] == char))
            .filter(e => e)
            .map(e => e![0]);
    }

    return { settings: settings, categories: exportCategories };
}
```

(`ui/core/components/individual_sim_ui/importers/individual_link_importer.tsx:14-46`)

This is invoked automatically on individual-sim page load (not via a modal "Link" import button — there is no such button registered):

```ts
// ui/core/individual_sim_ui.tsx:393-395
const urlParseResults = IndividualLinkImporter.tryParseUrlLocation(window.location);
...
this.fromProto(initEventID, urlParseResults.settings, urlParseResults.categories);
```

This is the concrete evidence that the `SimSettingCategories`/`includeCategories` partial-apply mechanism described in §2 is real, exercised code in this repo — it's just driven by URL params for link-sharing, not exposed as a "gear only" checkbox/toggle in any of the modal importers (Addon/60U/WoWHead/JSON).

---

## Uncertainty / gaps

**Confirmed absent from repo** (searched and found nothing):

- No Warcraft Logs importer registered in the individual sim UI at this commit — confirmed by reading `ui/core/individual_sim_ui.tsx:465-477` (only JSON/60U TBC/WoWHead/Addon import links registered) and the full importer barrel `ui/core/components/individual_sim_ui/importers/index.ts`.
- No server-side proxy, backend route, or config file for WCL credentials anywhere in the repo — confirmed by a whole-repo grep for `warcraftlogs`/`wcl` outside `ui/raid/components/importers/raid_wcl_importer.tsx` turning up only unrelated comments/strings (see §3).
- No existing individual-sim importer applies gear only by default — confirmed by reading all four individual importer files (`individual_addon_importer.tsx`, `individual_60u_importer.tsx`, `individual_wowhead_gear_planner_importer.tsx`, `individual_json_importer.tsx`) end to end.

**Did not find / did not look** (not fully explored — distinct from "confirmed absent"):

- Whether `classic.warcraftlogs.com` actually serves permissive CORS headers for the `oauth/token` and `api/v2/client` endpoints used here — this is a fact about WCL's server, not about this repo, and I did not fetch WCL's API documentation or make a live network request to check. Flagged explicitly in §4 as not answerable from this repo.
- I did not read `ui/core/components/individual_sim_ui/importers/bulk_gear_json_importer.tsx` (the bulk-gear JSON importer) in full — it appeared in the importer barrel and directory listing but the task's five questions didn't require it, so I did not verify whether it is itself a gear-only import path. This is worth checking separately if "bulk gear import" semantics matter for the planning task, since its name suggests it might already do gear-only application for bulk items, which would be directly relevant to a "gear-only import" feature design.
- I did not review the `IndividualSimUI` `toProto` method's category-filtering behavior in detail (only `fromProto`), though it's referenced in the link exporter (`simUI.toProto(exportCategories)`); the get side is symmetric based on the code read, but I did not open its implementation to confirm.
- I did not check whether any later/newer commit of tbc-new (after this pin) reintroduces or removes a WCL importer from the individual sim UI — this research is scoped strictly to the pinned commit `8aa378b3671a0923fd11fb34b4b3753e53f20c9b` as instructed.
