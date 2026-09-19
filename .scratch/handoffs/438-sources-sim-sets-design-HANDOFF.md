# 438 — Sources filter and Sim-sets organisation: design recommendation

For the owner's pick. This is a **decision document**, not code: ticket 438 asks
to find and match the native wowsims idiom for two upgrades-tab controls before
building anything, and the owner tied this class of change to the not-yet-built
visual+a11y reviewer (session 2), so the implementation is session 3, after the
pick. No fork code is changed here.

The native candidates below are located by file:line in the fork
(`vendor/tbc-new-fork`). "Native fit" is judged one way throughout: the count of
new `.upgrades-*` selectors/classes a candidate adds versus the native classes
it reuses unchanged, plus the native file:line it copies from. A candidate that
needs zero new visual rules and one native component wins native-fit outright.

Measurements were taken on the live :3333 Feral page, pre-run, at desktop width
(innerWidth 1703, the >= xl sticky-sidebar layout). A true 375 CSS viewport was
not reachable through the browser tooling this session, so the 375 figures are
structural estimates from the same DOM with the method stated; the direction and
rough size hold at 375 because the controls are single-column there.

## Current state (measured)
- Settings card height = **1106.8px** (outer 1127.8px); width 287.8px (sticky
  sidebar column). This is the tall card ticket 321 fought.
  `document.querySelector('.upgrades-settings-container').getBoundingClientRect().height`
- Sources filter = **472.8px tall, 14 checkboxes** — about 43% of the card.
  `document.querySelector('.upgrades-source-filter-group').getBoundingClientRect().height`
  `[...document.querySelectorAll('.upgrades-source-filter-group input[type=checkbox]')].length`
- Sim-set chips = **16 total**; default selected = **P3 - BiS 6% + P3 - BiS 9%**
  (current phase P3, confirms ticket 433). Phase spread: P1×7, P2×4, P3×2, P4×2, P5×1.
  `[...document.querySelectorAll('.upgrades-set-chip')].length`

---

## Q1 — the Sources filter

Current: a vertical stack of native `BooleanPicker` checkboxes inside a
`.upgrades-source-filter-group content-block` (`upgrades_tab.tsx:740-747`,
`_upgrades_tab.scss:83-103`). 14 checkboxes, 472.8px tall.

| Candidate | Borrows (native file:line) | New `.upgrades-*` selectors | Height effect (measured/estimated) |
| --- | --- | --- | --- |
| **(a) Native Filters modal** — a `btn` "Sources…" in the settings card opening a `BaseModal` with `menu-section`s ("Raids", "Other sources"), each a 2-col grid of `BooleanPicker`s; a one-line summary under the button ("3 of 9 sources excluded") keeps state visible. | `filters_menu.tsx:21-296` (sections `:76-123`, `newSection` `:298-309`), `_filters_menu.scss:41-48` (2-col grid), `base_modal.tsx`. This is how wowsims itself filters items by source (`Sim.ALL_SOURCES` + `Sim.ALL_RAIDS`). | ~1 (a summary-line class); 0 new visual rules (reuses the modal + grid). | Removes the 472.8px checkbox stack, replaced by a button + summary (~60px): **≈ −413px** off the 1106.8px card (≈37% shorter). Same or larger saving at 375 (card full-width, stack single-column). |
| **(b) Inline native sections** — keep the checkboxes in place but lay them out as the Filters modal does: two `menu-section` headers with the 2-col grid, no modal. | Same `_filters_menu.scss:41-48` grid + `menu-section` markup, reused inline. Distinct from (a): no modal, state always visible. | ~2 (two section wrappers). | 2-col grid halves the stack's rows: **≈ −236px** (half of 472.8). State stays always-visible. |
| (c) Chip multi-select — one `saved-data-set-chip` per source | native chip idiom (`upgrades_tab.tsx:1916`, `_saved_data_manager.scss`) | several | **Dropped:** wowsims uses chips for *selecting sets*, checkboxes for *filtering* — chips are the wrong idiom for a filter. |
| (d) `DropdownPicker` with header rows | `dropdown_picker.tsx:144-253` | — | **Dropped:** single-select by design (`currentSelection` `:45`); multi-select would be bespoke. |

**Recommended: (a) Native Filters modal. Runner-up: (b).**
Reason: (a) is the exact control wowsims already uses for this taxonomy, wins
native-fit (0 new visual rules, ~1 class), and removes the largest chunk of the
phone-height cost ticket 321 fought. Pick (b) instead if you want the filter
state visible without a click and accept a smaller (~236px) saving.

---

## Q2 — the Sim-sets organisation

Current: one flat chip row, presets then saved sets
(`upgrades_tab.tsx:1878-1942`); default selection = current phase's BiS preset
(ticket 433). 16 chips; at P3, 14 are off-phase.

| Candidate | Borrows (native file:line) | New `.upgrades-*` selectors | Off-phase-selected discoverability |
| --- | --- | --- | --- |
| **(a) Native phase tabs** — a `preset-group-phase-tabs` row over the preset chips, active tab = `sim.getPhase()`; saved sets flat beneath, as `GearTab` composes `PresetGroupPicker` + `SavedDataManager`. | `preset_group_picker.tsx:21-219` (tabs `:125-128`, current-phase default `:116-118`), `_preset_group_picker.scss`, `gear_tab.ts:39-93`. | ~1 (a selected-count badge). | A P2 set selected while P3 is active sits under an inactive tab — **needs a selected-count badge** or the selection hides behind the tab. |
| **(b) Current phase + "Other phases (n)" disclosure** — chips for `set.phase === sim.getPhase()` and all saved sets shown; the rest behind a `button[aria-expanded]` + class (the tab's own disclosure idiom, ticket 321). A selected off-phase chip is always shown. | The tab's own button-plus-class collapse (`upgrades_tab.tsx:704-711`); chip markup unchanged. | ~1 (the collapse class). | **Every selected chip stays visible by construction.** At P3: 2 P3 chips shown, **14 of 16 hidden** behind the disclosure — > half, meets the "hide >= half" bar. |
| (c) Grouped sub-headings, nothing hidden (`preset-group-label` per phase) | `preset_group_picker.tsx:184-197` | — | **Dropped:** does not hide off-phase sets (the owner's ask). |

**Recommended: (b) disclosure. Runner-up: (a). — OWNER CONFIRMED (b), 2026-09-19.**
Reason: the tab already has a phase selector (`upgrades_tab.tsx:774`), so a second
phase-tab row duplicates a control the page has; and phase tabs are a
single-view filter idiom while Sim-sets is a multi-select whose off-phase
selections must stay visible — which (b) guarantees without a badge. (a) is the
more literally native *look* and is the runner-up if you prefer that over
avoiding the duplicated phase control.

**Chosen Q2: (b) "Other phases (n)" disclosure** — the owner confirmed this pick.
Session 3 implements it under the `gate-visual` seat.

---

## Status of the two picks

- **Q2 (Sim-sets): RESOLVED — owner chose (b) "Other phases (n)" disclosure
  (2026-09-19).** Session 3 implements it under the `gate-visual` seat.
- **Q1 (Sources filter): RESOLVED — owner chose (A) the native "Sources…" popup
  (2026-09-19).** After a re-exploration that built clickable scratch prototypes
  of both a popup and a multi-select dropdown
  (`.scratch/prototypes/q1-sources-filter/index.html`), the owner picked the
  popup: the dropdown (B) surfaced EXCLUSIONS rather than inclusions, which is
  unintuitive, and its chip rail crowds once several sources are excluded. So Q1
  is the modal/popup idiom — a "Sources…" button opening an overlay of grouped
  checkboxes (Raids section + Other-sources), reusing the native
  `gear_picker/filters_menu.tsx` idiom (near-zero net-new). Session 3 implements
  it under the `gate-visual` seat, alongside Q2.
  Retired: the dropdown prototype (B) is not the direction; the popup is.
