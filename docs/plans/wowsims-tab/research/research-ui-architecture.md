# wowsims/tbc-new UI Architecture Research

Pinned commit: `8aa378b3671a0923fd11fb34b4b3753e53f20c9b` (tag `v0.0.101`), detached HEAD.
Clone location referenced below: `C:\Users\dgree\AppData\Local\Temp\claude\C--Users-dgree-Code-lulz-tbc-gear-prio\27d7d3fa-1f83-47cd-962f-706324b5a0d4\scratchpad\tbc-new`
All paths below are relative to that clone root unless given as absolute paths. HEAD was not moved; all reads were done at the pinned checkout.

## Repo metadata

- **Default branch**: `master` (confirmed via `git remote show origin` → "HEAD branch: master", and `refs/remotes/origin/HEAD` → `refs/remotes/origin/master`). A PR against this repo would target `master`.
- **How far ahead of v0.0.101**: `git rev-list --count 8aa378b3671a0923fd11fb34b4b3753e53f20c9b..origin/master` = **112 commits**. Tip of `origin/master` at time of research was `d7d89da2a2f473f2c9848856f77edb18b2a86025`, dated `2026-08-14 09:13:37 +0200` ("Merge pull request #462 from wowsims/MageP3"), vs. the pin's date `2026-07-25 01:38:59 +0200` — about 3 weeks of upstream activity ahead of the pin.

---

## Question 1: Individual sim UI structure and top-level tabs

### How a spec's sim page is built

`ui/paladin/retribution/sim.ts` (237 lines, read in full) does two things:

1. Calls `registerSpecConfig(Spec.SpecRetributionPaladin, { ... })` (line 43) to build a big config object (`IndividualSimUIConfig<Spec.SpecRetributionPaladin>`) describing EP stats, display stats, defaults (gear/consumes/talents/buffs/rotation), preset lists, rotation input config, etc. This is pure data/config, not UI construction.
2. Defines and exports the concrete UI class:

```ts
// ui/paladin/retribution/sim.ts:231-236
export class RetributionPaladinSimUI extends IndividualSimUI<Spec.SpecRetributionPaladin> {
  constructor(
    parentElem: HTMLElement,
    player: Player<Spec.SpecRetributionPaladin>
  ) {
    super(parentElem, player, SPEC_CONFIG);
    this.reforger = new ReforgeOptimizer(this);
  }
}
```

So every spec's "sim page" is just a thin subclass of `IndividualSimUI` constructed with `(parentElem, player, config)`. All of the actual tab-building work happens in the base class.

### `IndividualSimUI` (ui/core/individual_sim_ui.tsx, read in full)

`IndividualSimUI<SpecType>` extends `SimUI` (ui/core/sim_ui.tsx). Its constructor (lines 247-359) does the following, in order, after building sidebar warnings:

```ts
// ui/core/individual_sim_ui.tsx:344-358
this.addSidebarComponents();
this.addGearTab();
this.addSettingsTab();
this.addTalentsTab();
this.addRotationTab();

if (!this.isWithinRaidSim) {
  this.addDetailedResultsTab();
}

this.bt = this.addBulkTab();

this.sim.waitForInit().then(() => {
  this.addTopbarComponents();
});
```

Each `addXTab` is a private method (lines 432-463) that instantiates a `SimTab` subclass, passing `this.simTabContentsContainer` (inherited from `SimUI`) and `this` (the `IndividualSimUI` instance) as constructor args:

```ts
// ui/core/individual_sim_ui.tsx:432-463
private addGearTab() {
	const gearTab = new GearTab(this.simTabContentsContainer, this);
	gearTab.rootElem.classList.add('active', 'show');
}
private addBulkTab(): BulkTab {
	const bulkTab = new BulkTab(this.simTabContentsContainer, this);
	return bulkTab;
}
private addSettingsTab() {
	new SettingsTab(this.simTabContentsContainer, this);
}
private addTalentsTab() {
	new TalentsTab(this.simTabContentsContainer, this);
}
private addRotationTab() {
	new RotationTab(this.simTabContentsContainer, this);
}
private addDetailedResultsTab() {
	const detailedResults = (<div className="detailed-results"></div>) as HTMLElement;
	this.addTab(i18n.t('results_tab.title'), 'detailed-results-tab', detailedResults);
	new DetailedResults(detailedResults, this, this.raidSimResultsManager!);
}
```

### Top-level tab order the user sees

Based on constructor call order in `individual_sim_ui.tsx`:

1. **Gear** (`GearTab`, `ui/core/components/individual_sim_ui/gear_tab.ts`) — added first, forced `active show`.
2. **Settings** (`SettingsTab`, `ui/core/components/individual_sim_ui/settings_tab.ts`)
3. **Talents** (`TalentsTab`, `ui/core/components/individual_sim_ui/talents_tab.ts`)
4. **Rotation** (`RotationTab`, `ui/core/components/individual_sim_ui/rotation_tab.ts`)
5. **Results** (`DetailedResults`, added via the generic `SimUI.addTab` helper, not a `SimTab` subclass — see below) — only added `if (!this.isWithinRaidSim)`.
6. **Batch** (`BulkTab`, `ui/core/components/individual_sim_ui/bulk_tab.ts`) — added last of the tab set.

Import/Export are **not** tabs — they're dropdown menus in the header, added separately by `addTopbarComponents()` (lines 465-477) via `this.simHeader.addImportLink(...)` / `addExportLink(...)`, populating `.import-dropdown` / `.export-dropdown` menus defined in `SimHeader.customRootElement()`.

### Where tabs are registered — two registration paths

There are **two different mechanisms** used interchangeably, both terminating in the same header nav list (`.sim-tabs`, a `<ul class="sim-tabs nav nav-tabs">` — `ui/core/components/sim_header.tsx:242`):

**Path A — `SimTab` base class self-registers.** `ui/core/components/sim_tab.ts` (read in full):

```ts
// ui/core/components/sim_tab.ts:10-42
export abstract class SimTab extends Component {
  protected simUI: SimUI;
  protected config: SimTabConfig; // { identifier: string; title: string }

  readonly navItem: HTMLElement;
  readonly navLink: HTMLElement;
  readonly contentContainer: HTMLElement;

  constructor(parentElem: HTMLElement, simUI: SimUI, config: SimTabConfig) {
    super(parentElem, "sim-tab");
    this.rootElem.classList.add(config.identifier);
    this.simUI = simUI;
    this.config = config;
    this.rootElem.id = this.config.identifier;
    this.rootElem.classList.add("tab-pane", "fade");
    if (parentElem.childNodes.length == 0)
      this.rootElem.classList.add("active", "show");

    this.navItem = this.buildNavItem();
    this.navLink = this.navItem.children[0] as HTMLElement;
    this.contentContainer = document.createElement("div");
    this.contentContainer.classList.add("tab-pane-content-container");
    this.rootElem.appendChild(this.contentContainer);

    this.simUI.simHeader.addSimTabLink(this); // <-- registration point

    this.navItem.addEventListener("click", () => {
      trackPageView(config.title, config.identifier);
    });
  }

  private buildNavItem(): HTMLElement {
    const tabFragment = document.createElement("fragment");
    tabFragment.innerHTML = `
			<li class="${this.config.identifier} nav-item" role="presentation">
				<button class="nav-link" type="button" data-bs-toggle="tab"
					data-bs-target="#${this.config.identifier}" role="tab"
					aria-controls="${this.config.identifier}">${this.config.title}</button>
			</li>
		`;
    return tabFragment.children[0] as HTMLElement;
  }
}
```

Every subclass (`GearTab`, `SettingsTab`, `TalentsTab`, `RotationTab`, `BulkTab`) extends `SimTab`, so simply constructing one (e.g. `new BulkTab(this.simTabContentsContainer, this)`) both builds its DOM content (in `.simTabContentsContainer`, the `.sim-main.tab-content` element) **and** self-registers its nav pill into the header via `simUI.simHeader.addSimTabLink(this)`.

`SimHeader.addSimTabLink` (`ui/core/components/sim_header.tsx:85-93`):

```ts
addSimTabLink(tab: SimTab) {
	const isFirstTab = this.simTabsContainer.children.length == 0;
	tab.navLink.setAttribute('aria-selected', isFirstTab.toString());
	if (isFirstTab) tab.navLink.classList.add('active', 'show');
	this.simTabsContainer.appendChild(tab.navItem);
}
```

**Path B — raw `addTab` helper** used by `IndividualSimUI.addDetailedResultsTab` and also exposed generically on `SimUI`:

```ts
// ui/core/sim_ui.tsx:273-287
addTab(title: string, cssClass: string, content: HTMLElement | Element) {
	const contentId = cssClass.replace(/\s+/g, '-') + '-tab';
	const isFirstTab = this.simTabContentsContainer.children.length == 0;

	this.simHeader.addTab(title, contentId);
	this.simTabContentsContainer.appendChild(
		<div id={contentId} className={clsx('tab-pane fade', isFirstTab && 'active show')}>
			{content}
		</div>,
	);
}

addSimTab(tab: SimTab) {
	this.simHeader.addSimTabLink(tab);
}
```

`SimHeader.addTab` (`ui/core/components/sim_header.tsx:57-83`) builds and appends the `<li><button>` nav item directly into `.simTabsContainer` (the same `.sim-tabs` `<ul>`), given just a title string and content element ID — no `SimTab` subclass required.

There is **no central array/list of tab definitions** — tabs are registered _imperatively_, in call order, by whichever mechanism the caller uses. Order in the DOM (and hence order shown) is simply insertion order into `this.simTabsContainer` (the `<ul class="sim-tabs">`), which mirrors the call order of `addXTab()` methods in `IndividualSimUI`'s constructor.

### How to add a NEW top-level tab between "Batch" and "Import"

"Import"/"Export" are not tabs (they're header dropdown menus, not part of `.sim-tabs`), so a new tab can only be visually "between Batch and Import" in the sense of being the _last_ tab in the `.sim-tabs` list, immediately before the import/export dropdown UI in the header's flex layout (see `SimHeader.customRootElement()`, `ui/core/components/sim_header.tsx:238-261`, where `.sim-tabs`, then `.import-export`, then `.sim-toolbar` are siblings in `.sim-header-container`).

Concretely, to add a new top-level tab called e.g. "MyFeature":

1. Create a class extending `SimTab` (mirroring e.g. `ui/core/components/individual_sim_ui/bulk_tab.ts` or `rotation_tab.ts`), constructed as `new MyFeatureTab(parentElem: HTMLElement, simUI: IndividualSimUI<SpecType>)`, calling `super(parentElem, simUI, { identifier: 'my-feature-tab', title: 'MyFeature' })` and building its own content into `this.contentContainer`.
2. In `ui/core/individual_sim_ui.tsx`, add a private method `addMyFeatureTab()` analogous to `addBulkTab()` (lines 437-444), and call it in the constructor **after** `this.bt = this.addBulkTab();` (line 354) and before `addDetailedResultsTab()`/`addTopbarComponents()` if you want it to land after Batch in tab order:

```ts
// individual_sim_ui.tsx constructor, after line 354:
this.bt = this.addBulkTab();
this.myFeature = this.addMyFeatureTab(); // new
```

Because tab order = DOM insertion order = call order, placing the call right after `addBulkTab()` makes it appear directly after "Batch" in the `.sim-tabs` nav list. No separate registration array exists to edit — the "registration" _is_ the constructor call (which triggers `SimTab`'s own `simUI.simHeader.addSimTabLink(this)` call, or `SimUI.addTab`/`addSimTab` if not going through a full `SimTab` subclass).

---

## Question 2: Results tab / sub-tabs

### Results panel / detailed results

Two relevant files under `ui/core/components/`:

- `ui/core/components/results_viewer.tsx` — the small, always-visible sidebar summary (DPS/HPS number, pending/error/warning states). Constructed once in `SimUI`'s constructor: `this.resultsViewer = new ResultsViewer(resultsViewerElem)` (`ui/core/sim_ui.tsx:199-200`), mounted into `.sim-sidebar-results`. This is not a tab; it's the sidebar quick-glance panel.
- `ui/core/components/detailed_results.tsx` (read first ~220 lines) — the full "Results" **tab** content, only added for individual (non-raid-embedded) sims via `IndividualSimUI.addDetailedResultsTab()` (`individual_sim_ui.tsx:458-463`), which calls the generic `SimUI.addTab(i18n.t('results_tab.title'), 'detailed-results-tab', detailedResults)` — i.e. **Path B** from Question 1, not a `SimTab` subclass.

### Sub-tabs within the Results tab — hand-rolled Bootstrap nav-tabs

`DetailedResults` (`ui/core/components/detailed_results.tsx`) implements its own internal tab strip using plain Bootstrap 5 `nav-tabs` markup, **not** a reusable component. It defines a local `tabs: Tab[]` array (lines 28-81):

```ts
// ui/core/components/detailed_results.tsx:28-81
type Tab = {
  isActive?: boolean;
  targetId: string;
  label: string;
  classes?: string[];
};

const tabs: Tab[] = [
  {
    isActive: true,
    targetId: "damageTab",
    label: i18n.t("results_tab.details.tabs.damage"),
    classes: ["damage-metrics-tab"],
  },
  {
    targetId: "threatTab",
    label: i18n.t("results_tab.details.tabs.threat"),
    classes: ["threat-metrics-tab"],
  },
  { targetId: "healingTab", label: i18n.t("results_tab.details.tabs.healing") },
  {
    targetId: "damageTakenTab",
    label: i18n.t("results_tab.details.tabs.damage_taken"),
  },
  { targetId: "buffsTab", label: i18n.t("results_tab.details.tabs.buffs") },
  { targetId: "debuffsTab", label: i18n.t("results_tab.details.tabs.debuffs") },
  { targetId: "castsTab", label: i18n.t("results_tab.details.tabs.casts") },
  {
    targetId: "resourcesTab",
    label: i18n.t("results_tab.details.tabs.resources"),
  },
  {
    targetId: "timelineTab",
    label: i18n.t("results_tab.details.tabs.timeline"),
  },
  { targetId: "logTab", label: i18n.t("results_tab.details.tabs.log") },
];
```

...and renders it directly with JSX in the constructor (lines 99-125), then a matching `.tab-content` with `.tab-pane`-classed `<div>`s per `targetId` (lines 126+):

```tsx
// ui/core/components/detailed_results.tsx:99-125 (abridged)
this.rootDiv = (
  <div className="dr-root dr-no-results">
    <div className="dr-toolbar">
      <div className="results-filter"></div>
      <div className="tabs-filler"></div>
      <ul className="nav nav-tabs" attributes={{ role: "tablist" }}>
        {tabs.map(({ label, targetId, isActive, classes }) => (
          <li
            className={`nav-item dr-tab-tab ${classes?.join(" ") || ""}`}
            attributes={{ role: "presentation" }}
          >
            <button
              className={`nav-link${isActive ? " active" : ""}`}
              type="button"
              attributes={{
                role: "tab",
                "aria-controls": targetId,
                "aria-selected": !!isActive,
              }}
              dataset={{ bsToggle: "tab", bsTarget: `#${targetId}` }}
            >
              {label}
            </button>
          </li>
        ))}
      </ul>
    </div>
    <div className="tab-content">
      <div
        id="noResultsTab"
        className="tab-pane dr-tab-content fade active show"
      >
        ...
      </div>
      <div
        id="damageTab"
        className="tab-pane dr-tab-content damage-content fade active show"
      >
        <div className="dr-row topline-results" />
        ...
      </div>
      <div
        id="threatTab"
        className="tab-pane dr-tab-content threat-content fade"
      >
        ...
      </div>
      ... (healingTab, damageTakenTab, buffsTab, debuffsTab, castsTab,
      resourcesTab, timelineTab, logTab)
    </div>
  </div>
);
```

So: **there is no reusable sub-tab/tab-strip component.** This is hand-rolled Bootstrap `nav nav-tabs` + `tab-content`/`tab-pane` markup with `data-bs-toggle="tab"` / `data-bs-target` attributes, relying on Bootstrap 5's JS tab plugin (bundled via the `bootstrap` npm dependency, see Question 4) for the actual show/hide behavior — the exact same pattern used for the _top-level_ sim tabs (`SimHeader.addTab`/`SimTab.buildNavItem`, Question 1) and for the outer `.sim-tabs` header nav. Each individual metrics table (`AuraMetricsTable`, `CastMetricsTable`, `DamageMetricsTable`, `DpsHistogram`, `DtpsMetricsTable`, `HealingMetricsTable`, `LogRunner`, `PlayerDamageMetricsTable`, `PlayerDamageTakenMetricsTable`, `ResourceMetricsTable`, `ThreatMetricsTable`, `Timeline`, `ToplineResults`) lives under `ui/core/components/detailed_results/` and is mounted by CSS-class selector into the corresponding placeholder `<div>` inside these tab panes (mounting code is further down in the file, past what was read).

---

## Question 3: UI state access patterns

### Player — `ui/core/player.tsx`

Class declared at line 235: `export class Player<SpecType extends Spec>`.

Gear access (via `simUI.player`):

- `readonly gearChangeEmitter = new TypedEvent<void>('PlayerGear');` — line 288
- `getGear(): Gear` — line 703, returns the currently equipped `Gear` object.
- `setGear(eventID: EventID, newGear: Gear, forceUpdate?: boolean)` — line 707, emits `gearChangeEmitter` (line 719) after applying.
- `readonly professionChangeEmitter` (line 289) and `readonly talentsChangeEmitter` (line 292) — analogous change emitters for professions/talents.
- `getEpWeights(): Stats` — line 479; `setEpWeights(eventID, newEpWeights: Stats)` — line 483.

Example usage pattern already seen in `IndividualSimUI`'s constructor (`individual_sim_ui.tsx:267-280`):

```ts
this.addWarning({
	updateOn: this.player.gearChangeEmitter,
	getContent: () => {
		if (!this.player.getGear().hasInactiveMetaGem()) return '';
		...
	},
});
```

This is the idiomatic way any component reads gear reactively: subscribe to `player.gearChangeEmitter.on(...)` (or pass it as `updateOn` to a helper like `addWarning`), and pull the current value with `player.getGear()` inside the callback — the emitter carries no payload, it's just a "something changed, re-read" signal.

### Sim / Encounter — `ui/core/sim.ts`

Class declared at line 65: `export class Sim`. Reachable from any component holding a `simUI: IndividualSimUI` as `simUI.sim`.

- `readonly changeEmitter: TypedEvent<void>` — line 112, defined as `TypedEvent.onAny([this.settingsChangeEmitter, this.raid.changeEmitter, this.encounter.changeEmitter])` (line 172) — fires on any sim/raid/encounter-level setting change.
- `readonly iterationsChangeEmitter = new TypedEvent<void>();` — line 89.
- `getIterations(): number` — line 708; `setIterations(eventID, newIterations: number)` — line 711 (emits `iterationsChangeEmitter`).
- `sim.raid` and `sim.encounter` are the nested Raid/Encounter objects (not fully read in this pass, but referenced throughout `individual_sim_ui.tsx`, e.g. `this.sim.raid.setBuffs(...)`, `this.sim.encounter.applyDefaults(...)`, `this.sim.raid.setDebuffs(...)`) — buffs/consumes/encounter settings hang off `sim.raid` / `sim.encounter`, not directly off `Sim`.
- `sim.db` is the loaded `Database` instance (see below), used e.g. at `individual_sim_ui.tsx:335`: `ItemNotice.registerSetBonusNotices(this.sim.db)`, and `individual_sim_ui.tsx:575`: `this.sim.db.lookupEquipmentSpec(...)`.

`SimUI` (base class, `ui/core/sim_ui.tsx:52-70`) exposes `readonly sim: Sim` and its own `readonly changeEmitter` (aliasing `TypedEvent.onAny([this.sim.changeEmitter], 'SimUIChange')`, line 121), plus `readonly iterationsPicker` UI widget bound directly to `sim.getIterations()`/`sim.setIterations()`/`sim.iterationsChangeEmitter` (lines 182-197).

### Item database — `ui/core/proto_utils/database.ts`

`export class Database` — declared line 36. It's a singleton loaded asynchronously:

```ts
// database.ts:40-59 (abridged)
static async get(options: { signal?: AbortSignal } = {}): Promise<Database> {
	if (!Database.loadPromise) {
		Database.loadPromise = (async () => {
			...
			const resp = await fetch(dbUrlJson, { signal: options?.signal }); // '/tbc/assets/database/db.json'
			const json = await resp.json();
			dbData = UIDatabase.fromJson(json);
			...
			const db = new Database(dbData);
			Database.instance = db;
			return db;
		})();
	}
	return Database.loadPromise;
}

static getSync(): Database {
	if (!Database.instance) throw new Error('Database not yet loaded; call `await Database.get()` before using getSync()');
	return Database.instance;
}
```

Key lookup methods found via grep:

- `getGems(socketColor?: GemColor): Array<Gem>` — line 260
- `lookupEquipmentSpec(equipSpec: EquipmentSpec): Gear` — line 321 (used by `IndividualSimUI.applyDefaults`, `individual_sim_ui.tsx:575`, to convert a proto `EquipmentSpec` into a live `Gear` object)
- `lookupItemSwap(itemSwap: ItemSwap): ItemSwapGear` — line 340

In practice, any component with access to `simUI: IndividualSimUI` reaches the DB via `simUI.sim.db` (the `Sim` class holds a loaded `Database` as `sim.db`; confirmed by the individual_sim_ui.tsx call sites cited above). It is loaded once, after `this.sim.waitForInit()` resolves (`individual_sim_ui.tsx:331-342`).

### EP weights

- `Player.getEpWeights(): Stats` / `Player.setEpWeights(eventID, Stats)` — `player.tsx:479,483` (cited above).
- `IndividualSimUIConfig.defaults.epWeights: Stats` and `.epStats: Array<Stat>` / `.epPseudoStats?: Array<PseudoStat>` / `.epReferenceStat: Stat` are spec-config fields (`individual_sim_ui.tsx:130-132,145`), populated per-spec, e.g. in `ui/paladin/retribution/sim.ts:51-65` (`epStats: [Stat.StatStrength, ...]`, `epReferenceStat: Stat.StatStrength`).
- `EpWeightsMenu` and `addStatWeightsAction` (imported from `./components/stat_weights_action`, `individual_sim_ui.tsx:33`) drive the EP-weight-calculation UI/modal; `this.epWeightsModal = addStatWeightsAction(this, this.statWeightActionSettings)` is set up after `sim.waitForInit()` (`individual_sim_ui.tsx:418-420`). (Not read in full this pass — flagged as **uncertain** re: internal implementation details of EP computation itself, since `stat_weights_action.ts` wasn't opened.)

### Key classes summary

| Class              | File                                 | One-line description                                                                                                                           | Key members (with line refs)                                                                                                                    |
| ------------------ | ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `Player<SpecType>` | `ui/core/player.tsx:235`             | Represents one simmed character: gear, talents, consumes, buffs, spec options.                                                                 | `getGear()`/`setGear()` (703/707), `gearChangeEmitter` (288), `getEpWeights()`/`setEpWeights()` (479/483)                                       |
| `Sim`              | `ui/core/sim.ts:65`                  | Top-level sim orchestrator: iterations, raid, encounter, db, run methods.                                                                      | `getIterations()`/`setIterations()` (708/711), `changeEmitter` (112), `db` (Database instance, referenced e.g. `individual_sim_ui.tsx:335,575`) |
| `Database`         | `ui/core/proto_utils/database.ts:36` | Singleton loader/holder for the item/gem/enchant JSON database (`db.json`).                                                                    | `Database.get()` (40, async singleton loader), `getSync()` (61), `lookupEquipmentSpec()` (321)                                                  |
| `EventID`          | `ui/core/typed_event.ts:6`           | `type EventID = number` — a token uniquely identifying one causal batch of changes, used to dedupe/guard event re-firing (esp. for undo/redo). | Produced by `TypedEvent.nextEventID()` (141)                                                                                                    |
| `TypedEvent<T>`    | `ui/core/typed_event.ts:27`          | Type-safe pub/sub emitter with a "freeze all, batch, then fire" mechanism so one user action doesn't cause redundant renders.                  | `on()`/`off()` (45/53), `emit(eventID, event)` (72), `static freezeAllAndDo(func)` (113), `static onAny(events)` (145)                          |

---

## Question 4: Build & dev workflow

Primary sources: `makefile` (read in full), `package.json` scripts (read in full), `README.md`, `docs/commands.md`, `docs/installation.md`, `docs/adding_sim.md` (all read in full), `vite.config.mts` (partially read), `go.mod` (`module github.com/wowsims/tbc`, `go 1.25.0`).

### Local build/run

Per `docs/installation.md`, dependencies are **Go ≥ 1.25**, **protobuf-compiler + Go plugins**, and **Node ≥ 22**. `package.json` also states `"engines": { "node": ">=22" }` and pins `"volta": { "node": "22.17.1" }`.

Per `docs/commands.md` and `makefile`, the standard commands:

- `npm start` (→ `cross-env WATCH=1 make devmode`, `package.json:13`) or `make host` — host a local version of the full UI at `http://localhost:8080`, e.g. `http://localhost:8080/tbc/retribution_paladin`. `make host` (`makefile:277-285`) depends on `air`, `$(OUT_DIR)/.dirstamp`, and `node_modules`; it recompiles the whole client (Go/wasm + TS) via the dependency chain rooted at `$(OUT_DIR)/.dirstamp` before serving via `npx http-server`.
- `WATCH=1 make host` — same, but auto-restarts/recompiles on Go or TS changes (uses `air`).
- `make host_$spec` (e.g. `make host_elemental_shaman`) — recompiles TS only for one spec.
- `WATCH=1 make rundevserver` — compiles+runs the native `wowsimtbc` Go server binary on port 3333, serving `/dist`; this is called out as **"the fastest way to iterate on core go simulator code"** since it avoids full client rebuilds (you `make $spec` to rebuild just that spec's client, then refresh).
- `WATCH=1 make devmode` — combines the above: runs `wowsimtbc` on `--host=":3333"` **and** `npx vite serve --host` for sub-second TS-only reloads (`makefile:287-293`). Doc calls this "the same as rundevserver currently" plus Vite serve, i.e. the most complete watch-everything dev loop.
- `make webworkers` (optionally `WATCH=1`) — rebuilds just `/ui/worker` web workers for easier debugging.
- `make test` — runs the Go backend test suite (`GOARCH=amd64 go test --tags=with_db ./sim/...`); "Currently only the backend sim has tests" per docs.
- `make clean` — deletes generated proto `.ts`/`.pb.go`, `dist/`, binaries, `node_modules`, generated `index.html`s.

### Does wasm/Go need to be installed?

**Yes**, for a _full_ local dev loop. Evidence:

- `go.mod` exists at repo root (`module github.com/wowsims/tbc`, `go 1.25.0`), and there's Go source under `sim/` (referenced throughout the makefile, e.g. `sim/wasm/*`, `sim/core/proto/api.pb.go`, `sim/web/main.go`) plus a `cmd/wowsimcli` binary (built for CLI use, `makefile:189,199`).
- `$(OUT_DIR)/lib.wasm` (`makefile:118-128`) is built via `GOOS=js GOARCH=wasm go build -o ./$(OUT_DIR)/lib.wasm ./sim/wasm/` — this is the client-side WASM simulator binary that `make host`'s full dependency chain requires (`$(OUT_DIR)/.dirstamp` depends on `$(OUT_DIR)/lib.wasm`).
- `docs/installation.md` explicitly lists Go ≥1.25, protobuf-compiler + Go plugins as required deps, with per-OS install instructions (Ubuntu curl script, Docker image, Windows via WSL/Docker or native Go+NVM+make install, Mac via Homebrew).
- A Docker path exists (`docs/installation.md:36-65`) that pre-bakes all these deps into an image (`docker build --tag wowsims-tbc .`), useful for avoiding native Go/protoc setup, especially cited for Windows.

### Fastest dev loop for UI-only changes

For pure UI/TS iteration without waiting on Go/wasm rebuilds, `WATCH=1 make devmode` is the documented answer — it explicitly runs `npx vite serve --host` alongside the Go server:

```makefile
# makefile:287-293
devmode: air devserver
ifeq ($(WATCH), 1)
	npx tsx vite.build-workers.mts & npx vite serve --host &
	air -tmp_dir "/tmp" -build.include_ext "go,proto" -build.args_bin "--usefs=true --launch=false --wasm=false" -build.bin "./wowsimtbc" -build.cmd "make devserver" -build.exclude_dir "assets,dist,node_modules,ui,tools"
else
	./wowsimtbc --usefs=true --launch=false --host=":3333"
endif
```

Note `--wasm=false` in the `air`-driven binary args when in watch mode — the docs describe this combined mode (`WATCH=1 make devmode`) as giving "sub second reloads on TS changes," combining the Go-server-without-full-client-rebuild benefit of `rundevserver` with Vite's fast TS refresh. The `vite.config.mts` (partially read) confirms a `serveExternalAssets()` middleware that proxies `/tbc/*` asset/worker/wasm requests from the Vite dev server through to `dist/tbc/*` on disk (lines 19-65), so Vite serve still needs _some_ prior full build to have produced `lib.wasm`/workers once — but subsequent UI-only edits reload fast via Vite without rebuilding Go or wasm.

`make host_$spec` is a narrower option for TS-only rebuild of a single spec (no Vite dev server / no auto-reload), still requiring a Go/wasm build to already exist on disk.

Documented at `docs/commands.md:14-45` (matches makefile behavior above).

---

## Question 5: Framework/idiom

### UI framework — custom hyperscript-style, not React/Preact

`tsconfig.json` (read in full):

```json
"jsx": "preserve",
"jsxFactory": "element",
"jsxFragmentFactory": "fragment"
```

`vite.config.mts:145`:

```ts
jsxInject: "import { element, fragment } from 'tsx-vanilla';",
```

So JSX in this codebase compiles to calls to `element(...)`/`fragment(...)` from the **`tsx-vanilla`** npm package (`package.json:44`, `"tsx-vanilla": "^1.2.0"`), which is a small library that turns JSX syntax directly into real DOM `Element`/`DocumentFragment` objects — **not** React or Preact, and not a virtual-DOM diffing system. JSX expressions in this codebase (e.g. `(<div className="..."></div>) as HTMLElement`, seen throughout `sim_ui.tsx`, `sim_header.tsx`, `detailed_results.tsx`) evaluate immediately to real DOM nodes that are then manually `.appendChild()`'d. (I did not find a local `node_modules/tsx-vanilla` in the clone to inspect its internals directly — this conclusion is drawn from the tsconfig/vite jsxFactory wiring plus the package name/version in `package.json` and consistent DOM-returning usage across all files read. Its internal `element()`/`fragment()` implementation itself is **uncertain** beyond "it's the tsx-vanilla package's hyperscript function," since I could not locate/read that library's source in this checkout.)

### `TypedEvent` — plain event-emitter with coalescing/freeze semantics, not reactive state

`ui/core/typed_event.ts` (read in full, 160 lines). It's a manual pub/sub class (`on`/`off`/`once`/`emit`), used _instead of_ a reactive framework's state system. Two notable extra mechanics beyond a bare `EventEmitter`:

1. **Event-ID deduplication** — `emit(eventID, event)` (lines 72-98) records `firedEvents` per instance and no-ops if the same `eventID` was already fired on that instance, preventing the same causal update from re-triggering a listener chain redundantly.
2. **Global freeze/thaw batching** — `static freezeAllAndDo(func)` (lines 113-139) increments a module-level `freezeCount`; while frozen, `emit()` queues events into `frozenEvents` per-instance instead of firing listeners immediately (lines 87-94); once the outermost `freezeAllAndDo` call unwinds, all queued events fire. This is how one user action (e.g. changing gear, which cascades into stat updates, EP recalculation, sidebar warnings, etc.) is made to only trigger downstream listeners _once_, after all related state has settled — seen in use throughout `individual_sim_ui.tsx`, e.g. `applyDefaults()` (line 568) and `loadSettings()` (line 375) both wrap their whole body in `TypedEvent.freezeAllAndDo(() => { ... })`.
3. `static onAny(events)` (line 145) merges N `TypedEvent`s into one derived event that fires whenever any of them does — used pervasively to build composite "something changed" signals (e.g. `SimUI.changeEmitter = TypedEvent.onAny([this.sim.changeEmitter], 'SimUIChange')`, `sim_ui.tsx:121`).

Components subscribe with `someEmitter.on((eventID, event) => { ... })` and typically just re-read current state from the source object (`player.getGear()`, `sim.getIterations()`, etc.) rather than receiving new state as the event payload — the emitter is a "something changed, go re-read" signal, not a value stream.

### Idiom summary for new code

- **Components are classes extending `Component`** (`ui/core/components/component.ts`, read in full — abstract base with `rootElem: HTMLElement`, optional `customRootElement()` override, `addOnDisposeCallback`/`dispose()` for cleanup), constructed as `new SomeComponent(parentElem: HTMLElement, ...args)`. The constructor is responsible for building and appending its own DOM (via JSX → `tsx-vanilla`'s `element()`/`fragment()`) and, if applicable, subscribing to relevant `TypedEvent`s to keep itself in sync.
- **Sim-page-level tabs specifically extend `SimTab`** (`ui/core/components/sim_tab.ts`), constructed as `new SomeTab(parentElem: HTMLElement, simUI: SimUI, config: { identifier, title })` — this self-registers into the header nav via `simUI.simHeader.addSimTabLink(this)`.
- **Any component that needs access to sim state takes a `simUI: IndividualSimUI<SpecType>` (or plain `SimUI`) constructor argument** and reaches everything through it: `simUI.player` (gear/talents/consumes for the one modeled character), `simUI.sim` (iterations/raid/encounter/db), `simUI.sim.db` (item database, a `Database` singleton), and `simUI.individualConfig` (the static per-spec `IndividualSimUIConfig` — EP stats, defaults, presets, input configs).
- **State changes always go through a `TypedEvent`**, keyed by an `EventID` obtained via `TypedEvent.nextEventID()`, usually wrapped in `TypedEvent.freezeAllAndDo(() => { ... })` when more than one setter is called together, so downstream listeners fire once after all related mutations are applied.
- **Markup is JSX that returns real DOM nodes** (via the `tsx-vanilla` `element`/`fragment` factories configured in `tsconfig.json`/`vite.config.mts`), manually composed with `appendChild`/`querySelector` — there is no virtual DOM, no component re-render cycle, and no declarative reactive binding; visibility/tab-switching for both top-level and nested tab strips is handled by Bootstrap 5's own `data-bs-toggle="tab"` JS plugin against `nav-tabs`/`tab-content`/`tab-pane` markup (see Question 2), not by this codebase's own component system.
