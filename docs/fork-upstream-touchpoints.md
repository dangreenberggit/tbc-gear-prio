# Fork touchpoints on upstream wowsims files

## Why this document exists

We intend to open an upstream PR to wowsims, and the owner's requirement is to
minimize impact on the wowsims codebase. The owner defined "impact" precisely:

> "It's not just about likes or code it's also about where the code is — in new
> file[s] we own specific to our feature or, much much more serious and to be
> avoided unless necessary and expressly noted to me in a very durable and
> viewable way so I don't miss it or skip it, if it touches existing files the
> wowsims repo has."

So there are two categories, and they are not equally serious:

- **New files in our own tree are cheap.** 122 of them; not enumerated here.
- **Modifications to files that already exist upstream are the serious thing.**
  There are **13**. Every one is named below, with what it does, why it was
  necessary, what would break if a future merge resolved it away, and whether we
  judge it avoidable.

This file is the durable record that requirement asks for. Read it before the
next upstream merge and before opening any PR.

**If you are here to merge from upstream, not to open a PR**, the section you
need is "Merge-conflict view" below: it ranks the same files by conflict risk,
records the one file that has already conflicted and how that was resolved, and
names the two changes that must be treated as atomic.

This is the single ledger for ticket 369. It supersedes
`docs/fork-upstream-divergence.md`, which answered the same ticket from a second
session and framed the same files by merge-conflict risk rather than by
upstream-PR impact. That document was deleted in the commit that added this
paragraph, "Fold the divergence ledger into the touchpoints ledger"; its framing
now lives in the "Merge-conflict view" section below, and its per-file "What
changed / Why / Risk on next merge" table is reproduced there in full.

## How to reproduce every number here

All commands run against the fork clone at `vendor/tbc-new-fork` (gitignored;
it has its own `.git` pointing at the personal fork).

```
# the full changed-file set, partitioned by A (added) / M (modified)
git -C vendor/tbc-new-fork diff --name-status -M \
  ec5c5f205e61049d730e460967f8488774a7fe2a..bbad1b8a4325d8168758a909a520cf4dced875f6

# per-file line counts
git -C vendor/tbc-new-fork diff --numstat \
  ec5c5f205e61049d730e460967f8488774a7fe2a..bbad1b8a4325d8168758a909a520cf4dced875f6

# the superseded document's command: a pathspec excluding our tab's own trees
git -C vendor/tbc-new-fork diff --name-only \
  ec5c5f205e61049d730e460967f8488774a7fe2a..bbad1b8a4325d8168758a909a520cf4dced875f6 \
  -- ':!*upgrades*' ':!*_upgrades*'
```

Measured 2026-09-11. Totals: 135 files changed, 630520 insertions, 480
deletions — the insertion count is dominated by our bundled universe JSON, not
by upstream-file edits.

### Reconciling the counts: 13, 14 and 15

Three different numbers are in circulation for "how many files do we touch",
and they are all correct — they answer different questions. Re-derived
2026-09-12 and recorded with full output in
`.scratch/stage-gate/ledger-consolidation-and-merge-train/reconciliation.txt`.

| Command                                                              | At `f90b12a7b` | At `bbad1b8a4` | At `5e9013b78` |
| -------------------------------------------------------------------- | -------------- | -------------- | -------------- |
| `--name-status -M`, `M` rows only (this document)                    | —              | **13**         | **13**         |
| `--name-only` with the `:!*upgrades*` pathspec (superseded document) | **15**         | **14**         | **14**         |

The two extra paths in the pathspec count are:

- **`test-layout.mjs`** — an **added** file of ours, not a modification of a
  file upstream already had. It is judged in Category A below, on placement.
- **`ui/core/sim.ts`** — modified at `f90b12a7b`, then **reverted** at
  `bbad1b8a4` to byte-identical with upstream. `git diff --name-only` does not
  list a file whose diff is empty, which is why the pathspec count drops from
  15 to 14 at `bbad1b8a4` while the `M`-row count stays 13.

15 − {`test-layout.mjs`, `ui/core/sim.ts`} = 13, verified as a set comparison,
path for path, not merely as a count.

**13 is a scope choice, not an undercount.** The superseded document read the
gap the other way and claimed ticket 369's list "undercounted by two". That
reading was wrong: it compared a **pathspec count** — which includes one added
file and one since-reverted file — against a count of **modified upstream
files**. Its own table already marked both extra rows as not divergence
(`test-layout.mjs` "not upstream divergence … listed here only because the diff
command above returns it"; `ui/core/sim.ts` "None remaining … zero diff"). The
two documents never disagreed about the facts, only about what to count.

One sentence from the superseded document must not be carried forward: it said
the pathspec command "returns `ui/core/sim.ts` with a diff-stat of 0". It does
not. At `bbad1b8a4` the command returns 14 paths and `ui/core/sim.ts` is not
among them, because `--name-only` omits zero-diff files entirely.

### Why `ec5c5f2` is the right base, and the verification that it is

The fork's history contains a **merge** of upstream, not a rebase (ADR-0030,
ticket 251), so "diff against the upstream pin" is not automatically the right
comparison — a naive diff against a later upstream tip would fold in upstream's
own changes and overstate our footprint. The correct base is the merge-base.
Verified:

```
git -C vendor/tbc-new-fork merge-base bbad1b8a ec5c5f205e61049d730e460967f8488774a7fe2a
# -> ec5c5f205e61049d730e460967f8488774a7fe2a
```

The merge-base _is_ `ec5c5f2` exactly, which is also `branchedFrom` in
`data/wowsims-fork.lock.json`. So diffing `ec5c5f2..bbad1b8a` shows our changes
and nothing of upstream's. `ec5c5f2` is a genuine upstream commit, not a
fork-only one — it is reachable from `upstream/feature/backend-reforge`
(`git -C vendor/tbc-new-fork branch -a --contains ec5c5f2`) and its subject is
"Merge remote-tracking branch 'origin/master' into feature/backend-reforge",
dated 2026-09-03.

### Which fork commit this describes

This inventory is measured at fork commit **`bbad1b8a4`**, which is the `commit`
pin in `data/wowsims-fork.lock.json` on `dev` as of `a2a4295`. The commit that
took the pin there is "Revert the dead iterations parameter on
makeRaidSimRequest", which **removes** `ui/core/sim.ts` from this inventory —
see the reconciliation subsection above.

The next fork commit, **`5e9013b78`**, is pinned by the branch
`fix/sim-header-null-assertion` and is not yet on `dev`. It is `pushed: false`
in that branch's lockfile until the owner pushes it to the fork remote. It
changes exactly one file, `ui/core/components/sim_header.tsx`, by +4/−3, and
the row count of this inventory stays 13 there. The pin ancestry is strictly
linear and verified:

```
git -C vendor/tbc-new-fork merge-base --is-ancestor f90b12a7b bbad1b8a4   # rc 0
git -C vendor/tbc-new-fork merge-base --is-ancestor bbad1b8a4 5e9013b78   # rc 0
```

## Category B — the 13 modified upstream files

Counts are added/removed from `--numstat` over the range above.
**Avoidability is our judgement, not a measurement**, and is labelled as such.

| #   | File                                                   | +/−                                        | Upstream candidate? | Avoidable? (judgement)         |
| --- | ------------------------------------------------------ | ------------------------------------------ | ------------------- | ------------------------------ |
| 1   | `.gitignore`                                           | 3/0                                        | local-only          | yes — nest it in our tree      |
| 2   | `assets/locales/en/translation.json`                   | 92/0                                       | local-only          | yes — runtime resource bundle  |
| 3   | `package-lock.json`                                    | 2247/337                                   | local-only          | yes — drop from the PR         |
| 4   | `package.json`                                         | 2/1                                        | local-only          | yes — if the layout gate moves |
| 5   | `schemas/translation.schema.json`                      | 309/1                                      | local-only          | yes — goes with #2             |
| 6   | `sim/hunter/item_sets.go`                              | 55/10                                      | **yes**             | no — and should not be         |
| 7   | `test-locales.mjs`                                     | 32/2                                       | **yes**             | no — shared gate               |
| 8   | `tsconfig.json`                                        | 1/0                                        | local-only          | **yes — measured dead**        |
| 9   | `ui/core/components/gear_picker/item_list.tsx`         | 125/114                                    | local-only          | yes — reducible to ~1 line     |
| 10  | `ui/core/components/sim_header.tsx`                    | 50/15 at `bbad1b8a4`; 51/15 at `5e9013b78` | **yes**             | no — from our tree             |
| 11  | `ui/core/individual_sim_ui.tsx`                        | 6/0                                        | local-only          | **no — irreducible**           |
| 12  | `ui/scss/core/components/individual_sim_ui/index.scss` | 1/0                                        | local-only          | **no — irreducible**           |
| 13  | `ui/scss/core/sim_ui/_header.scss`                     | 28/0                                       | **yes** (with #10)  | no — pairs with #10            |

Three are genuine upstream fixes that can leave our PR entirely (#6, #7,
#10+#13). Of what remains, the irreducible core is **8 lines across three
files** (#11, #12, and #8 if it were still needed — it is not).

---

### 1. `.gitignore` — 3/0 — local-only

**What.** Ignores a personal WoWCombatLogs credentials file that lives inside
our upgrades tree.

**Why.** The WCL import needs an API key. We keep it in an untracked
`local.wcl-credentials.ts` beside a committed `.example.ts`.

**Load-bearing.** In the safety sense only: resolve it away and the next commit
can leak a private API key. Nothing breaks at runtime.

**Avoidability (judgement).** Avoidable. The rule names a path entirely inside
our own tree, so it can move to a nested `.gitignore` under
`ui/core/components/individual_sim_ui/upgrades/` with identical effect and zero
upstream diff.

### 2. `assets/locales/en/translation.json` — 92/0 — local-only

**What.** Appends one `upgrades_tab` block of our UI strings.

**Why.** wowsims routes all UI text through i18n, so every copy string in our
tab lands in this file.

**Load-bearing.** One hunk, zero removed lines — purely additive, no upstream
string is edited. Resolving it away drops the block and the tab renders raw i18n
keys. Ugly, not fatal.

**Avoidability (judgement).** Avoidable, and the biggest structural win here.
i18next can take a resource bundle at runtime (`addResourceBundle`) from our own
JSON under `upgrades/`. That removes this file **and** #5 — 401 lines of
upstream diff — by one mechanism.

### 3. `package-lock.json` — 2247/337 — local-only

**What.** A full lockfile regeneration, not a dependency addition.

**Why.** Ticket 272 regenerated it so native deps record all platforms, plus
drift from the upstream merge.

**Load-bearing.** No. Version lines move in both directions, including at least
one downgrade. This is environment drift, not our feature.

**Avoidability (judgement).** Avoidable, and it should simply be excluded.
`package.json` adds **no dependency at all** (see #4 — the only change is a
script line), so the correct lock diff for this feature is zero bytes. This is
the single largest reduction available and costs nothing. A maintainer seeing
2584 changed lock lines against no dependency change reads it as noise, or as a
mistake.

### 4. `package.json` — 2/1 — local-only

**What.** Adds a `test:layout` script pointing at our `test-layout.mjs`.

**Why.** Ticket 322's DOM-geometry layout gate needs an entry point. The −1 is
the trailing comma on the preceding line, not a deletion.

**Load-bearing.** No — a dev script.

**Avoidability (judgement).** Avoidable if `test-layout.mjs` moves into
`upgrades/tools/` (see Category A below), which removes this line and the root
file together.

### 5. `schemas/translation.schema.json` — 309/1 — local-only

**What.** Adds the JSON-Schema shape for our `upgrades_tab` strings.

**Why.** The schema sets `additionalProperties: false`, so adding strings
without updating it makes `test:locales` fail.

**Load-bearing — and this one needs care.** The "1 removed line" is only a
trailing-comma rewrite, but do not read that as "purely additive": the
top-level `required` array **gains a member**, and that is a change to an
upstream rule. The direction matters — adding `upgrades_tab` to `required`
means **the upstream file now fails validation without our block present.** A
merge that keeps this line and drops #2 turns the locales gate red for wowsims.
If this file ships at all, `upgrades_tab` belongs in `properties` but **not** in
`required`. Verified by parsing the `required` array at each end: base ends
`…, "sidebar"`, head ends `…, "sidebar", "upgrades_tab"`.

**Avoidability (judgement).** Avoidable — disappears with #2.

### 6. `sim/hunter/item_sets.go` — 55/10 — **upstream candidate**

**What.** Replaces ten unchecked `agent.(HunterAgent)` type assertions with
comma-ok guards that return early for a non-hunter agent.

**Why.** `sim/core/item_effects.go` `applyItemEffects` dispatches by item id
with no class check, so a hunter-flavoured effect on a mail item a paladin can
wear runs hunter code and panics (ticket 311; confirmed item 30892,
Beast-tamer's Shoulders).

**Load-bearing.** All ten guards — each is the difference between a return and a
panic. They are load-bearing _for upstream_, not for us.

**Avoidability (judgement).** Not avoidable, and should not be avoided. This is
the only Go file we touch, and its change converts a panic into a no-op — no
arithmetic, no coefficient, no aura. It does not move sim output.

**Recommendation.** Send as its **own PR, first**, with the reproduction. It is
self-contained, has no relationship to our tab, and removes a Go file from the
tab PR entirely. Note it fixes one of eight class packages carrying the same
unguarded pattern (`hypothesis, untested` — ticket 311's own claim, not
re-measured here).

### 7. `test-locales.mjs` — 32/2 — **upstream candidate**

**What.** Fixes the locales gate so it actually validates files on Windows, and
makes it fail loudly when it validates nothing.

**Why.** Two real bugs: `path.join` yields backslashes on Windows, glob reads
those as escape characters, so **zero files match and the gate exits 0 having
validated nothing**; and `filePath.split(localesPath)[1]` returns undefined on
native separators.

**Load-bearing.** The `validatedCount === 0` check and its `process.exit(1)` —
resolve that away and the gate silently returns to reporting green while
checking nothing, the exact failure it was written to prevent. The per-schema
`filePaths.length === 0` continue is load-bearing more subtly: upstream ships
`gear.schema.json` with no matching `gear.json`, so making zero-match fatal
per-schema would turn the gate red on a pre-existing upstream gap.

**Avoidability (judgement).** Not avoidable — it is a shared gate, and nothing
in our own tree can fix it.

**Recommendation.** Its own PR, independent of the tab.

### 8. `tsconfig.json` — 1/0 — local-only

**What.** Enables `allowImportingTsExtensions`.

**Why.** It was added to let imports carry an explicit `.ts` suffix.

**Load-bearing.** No. It is a compile-time permission, and a global one — it
relaxes a compiler rule across the whole wowsims codebase to serve our subtree.

**Avoidability (judgement) — measured, not guessed.** **Avoidable outright.** At
fork HEAD, **zero** single-quoted `.ts`-suffixed imports exist in any `.ts`,
`.tsx` or `.mts` file:

```
git -C vendor/tbc-new-fork grep -E "from '[^']*\.ts'" bbad1b8a -- '*.ts' '*.tsx' '*.mts' | wc -l
# -> 0
```

Note the exact scope of that pattern: it is single-quote only. Broadening it to
double quotes and `.mts` targets finds one hit,
`upgrades/tools/export_equip_eligibility.mts` importing `'./headless.mts'` — a
tools file not compiled under this `tsconfig.json`, so the conclusion is
unchanged. The flag serves nothing that this `tsconfig.json` governs. Delete the
line and this file leaves the inventory.

### 9. `ui/core/components/gear_picker/item_list.tsx` — 125/114 — local-only

**What.** Moves the private `getSourceInfo` method body out to an exported free
function in the same file; the method now forwards one line to it.

**Why.** Our tab renders the same Source cell as the gear picker (zone, NPC,
quest, reputation) and needs the resolution logic without re-deriving it.

**Load-bearing.** Only the two structural lines — `return getSourceInfo(item,
sim);` inside the method at line 648, and `export function getSourceInfo(...)`
at line 663. The near-symmetric +125/−114 is the tell: this is **moved text, not
changed logic.** Verified mechanically rather than by eye: brace-matching both
bodies from their declarations and removing **all** whitespace (`re.sub(r'\s+',
'', body)`) gives **3031 characters on each side and an exact match**, so the
move altered nothing. Re-measured 2026-09-12; collapsing only spaces and tabs
(`re.sub(r'[ \t]+', '', body)`) gives 3163 on each side and also matches, so
either normalisation settles it. A merge resolving the move away while keeping
our import breaks the tab's Source column at build time (loud, not silent).

**Avoidability (judgement).** Reducible from 239 changed lines to about one. The
original method is still present and still `private` at line 647. The extracted
body compiles standalone as a free function, which implies it never touches
`this`, so changing the method from `private` to `public static` — a one-word
diff — should let our tab call `ItemList.getSourceInfo(...)` with no extraction
at all **(inferred; the `public static` variant has not been compiled)**. This
is the second-biggest reduction after #2/#5.

### 10. `ui/core/components/sim_header.tsx` — 50/15 at `bbad1b8a4` — **upstream candidate**

**What.** Wraps the header's tab strip in a new `.sim-header-container-wrap` div
and adds JavaScript toggling a `scrolled-to-end` class, so a fade at the right
edge signals more scrollable tabs.

**Why.** Adding a seventh tab overflowed the strip on narrow screens with no
visual cue.

**Load-bearing — the worked example, and the behaviour differs by fork commit.**
`wireTabStripScrollAffordance` uses **three** non-null assertions, not one. Two
target elements that already exist upstream and are safe. The third targets
`.sim-header-container-wrap` — the div **this same diff introduces**, about 200
lines away in `customRootElement()`. A merge that keeps the method but resolves
away the JSX wrapper is entirely plausible, because that hunk looks like pure
re-indentation.

**At `bbad1b8a4`** the result is not a degraded fade: the assertion yields
`null` and the first `update()` throws during header construction. This was
reproduced during the `fix/sim-header-null-assertion` review — see finding A3 in
`docs/reviews/fix-sim-header-null-assertion.md`, which lands on `dev` only when
that branch merges; until then read it with
`git show fix/sim-header-null-assertion:docs/reviews/fix-sim-header-null-assertion.md`.
Carry its caveat: the
negative half of that reproduction ran a hand-copied method body rather than the
shipped constructor, so it proved a hand-copied closure throws; the positive
half is real end-to-end evidence, and the conclusion also stands on source
reading (`wrap` is null, `update()` runs unconditionally, `null.classList`
throws).

**At `5e9013b78`** the lookups are guarded with an early return, so a missing
wrapper **degrades to a lost scroll-fade and no longer throws.** That commit is
pinned by `fix/sim-header-null-assertion` and is not on `dev` yet; until it
lands, the crash behaviour above is the live one.

A second load-bearing choice, documented in the code comment at lines 55–63 and
worth preserving: **all three** triggers are needed, and they cover different
events. The method wires a scroll listener, a `ResizeObserver` on
`.sim-header-container`, and a `MutationObserver` on `.sim-tabs` childList
(lines 74–76). The comment's point is not that ResizeObserver is wrong — it is
that ResizeObserver alone **never fires from `addTab()`**: `.sim-tabs` has
`flex-wrap: nowrap` inside a flex row, so its own border-box is fixed by the
flex layout and only its _content_ overflows, which ResizeObserver does not
report. The MutationObserver is what catches a tab being added or removed; the
scroll listener separately covers the user scrolling to the end. Dropping any
one of the three yields a fade that is stale for that trigger
**(the rationale is quoted from the code comment; the failure is inferred,
untested)**.

**Avoidability (judgement).** Not avoidable from our own tree — the wrapper div
must exist in upstream's `customRootElement()`, and nothing in `upgrades/` can
inject a parent around an element upstream creates without fragile DOM surgery.
Two ways to shrink the risk: make the method tolerate a missing wrapper (null
check and early return, so a bad merge degrades instead of crashing) — worth
doing regardless; and submit #10+#13 as their own PR, leaving the tab PR with
zero diff here.

Roughly half this diff is re-indentation and formatter reflow, not new logic.

**Recommendation.** Upstream candidate paired with #13. An overflowing tab strip
with no scroll cue is an existing upstream defect on narrow screens; our seventh
tab exposed it rather than caused it.

### 11. `ui/core/individual_sim_ui.tsx` — 6/0 — local-only

**What.** Imports `UpgradesTab` and instantiates it after the Batch tab.

**Why.** This is the tab's registration — the thing that makes the feature exist.

**Load-bearing.** All six lines. There is no partial resolution that half-works.

**Avoidability (judgement).** **Not avoidable. This is the irreducible core of
the PR.** Upstream has no tab-registration hook; tabs are constructed inline in
`IndividualSimUI`. We could propose such a hook, but that is a larger
architectural ask than the feature itself and should not lead the PR. Six lines
in the file that composes the UI is the honest minimum, and worth stating
plainly in the PR description.

### 12. `ui/scss/core/components/individual_sim_ui/index.scss` — 1/0 — local-only

**What.** Adds `@import './upgrades_tab';` to the partial barrel.

**Why.** SCSS partials are only compiled if something imports them, and this
barrel is the import point.

**Load-bearing.** The one line — without it our 960-line partial never compiles
and the tab renders unstyled.

**Avoidability (judgement).** Not avoidable, and the least objectionable diff in
the set: one line, matching the file's existing convention.

### 13. `ui/scss/core/sim_ui/_header.scss` — 28/0 — **upstream candidate** (with #10)

**What.** Styles `.sim-header-container-wrap`: `position: relative` plus an
`::after` right-edge gradient that hides when `.scrolled-to-end` is set.

**Why.** The visual half of #10.

**Load-bearing.** Purely additive — no upstream rule is edited, so a bad merge
loses the fade but breaks nothing. **The pairing is what matters:** this CSS is
inert without #10's div, and #10's JS throws without it. Treat them as one
atomic change.

**Avoidability (judgement).** Not avoidable alongside #10.

---

## Category A — new files that land inside upstream directories

122 files are ours and new. Two deserve a placement judgement, because a file
being "new" does not by itself make its location uncontroversial.

### `test-layout.mjs` — repo root, 809 lines — **placement is intrusive**

The pathspec command from the superseded `docs/fork-upstream-divergence.md`
returns this file, because
`test-layout.mjs` matches neither `*upgrades*` nor `*_upgrades*`. That is why
that document counted 15 where this one counts 13. **It is not upstream
divergence** — it is a new file of ours, so it is judged here on placement
rather than on diff size. Row 4 (`package.json`) depends on it: that
modification's avoidability note holds only if this file moves.

It sits at the repo root beside upstream's own `test-locales.mjs`, so it reads
as a peer of the project's test infrastructure rather than as feature code.
Three specific frictions:

- It drives an on-disk Chromium over raw CDP using Node 22's global `WebSocket`.
  The file's header says this is deliberate — "no puppeteer, no playwright, no
  jsdom, nothing added to package.json" — but it means the gate depends on a
  Playwright browser being installed while Playwright is not a declared
  dependency. That is a hidden environment requirement at the root of someone
  else's repo.
- It hardcodes our scout's spec: `PAGE_PATH = '/tbc/paladin/retribution/'`.
- It asserts layout facts about the Upgrades tab specifically — a feature test
  in a project gate's clothing.

**Less intrusive alternative (judgement).** Move it to
`ui/core/components/individual_sim_ui/upgrades/tools/`, which is entirely ours
and already holds this kind of script (`bulk-spike.mts`, `equiv-campaign.mts`,
`headless.mts`), and document invocation in the `README.md` already there. That
removes a file from the root **and** eliminates modification #4, at no cost to
the gate.

### `ui/scss/core/components/individual_sim_ui/_upgrades_tab.scss` — 960 lines — **placement is fine**

This one follows the established convention exactly and should not move. At the
base commit that directory already holds ten per-tab partials — `_bulk_tab`,
`_gear_tab`, `_rotation_tab`, `_settings_tab`, `_talents_tab` and others — each
registered in the same barrel (`git -C vendor/tbc-new-fork ls-tree --name-only
ec5c5f20 ui/scss/core/components/individual_sim_ui/`). A leading-underscore
partial here is precisely where a tab's styles belong; anywhere else would be
the surprising choice.

## Merge-conflict view (folded from fork-upstream-divergence.md)

The sections above judge these files by **upstream-PR impact**. This section
judges the same files by **risk on the next merge from upstream** — the framing
of the superseded `docs/fork-upstream-divergence.md`, carried across whole so
that framing is not lost. Read it before any merge from upstream.

### Files by risk on the next upstream merge

Same 13 files as Category B above, plus `test-layout.mjs` marked as not
divergence. Line counts here are measured at `bbad1b8a4`, the same base as the
Category B table — where the superseded document quoted counts from the older
pin `f90b12a7b`, they have been re-measured rather than copied.

This table keeps the superseded document's fourth column as **risk on the next
merge**. Its upstream-candidate/local-only judgement is **not** carried here,
because Category B above re-judged three of those files against the owner's
PR-impact requirement and reached the opposite answer: `item_list.tsx` from
upstream-candidate to local-only (it is reducible to about one line, so there is
little to send), and `sim_header.tsx` and `_header.scss` from local-only to
upstream candidates (an overflowing tab strip with no scroll cue is an existing
upstream defect our seventh tab exposed). Category B's column is the current
one.

| Path                                                   | What changed                                                                                                                                                         | Why                                                                                                                                                              | Risk on next merge                                                          |
| ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `sim/hunter/item_sets.go`                              | Ten `agent.(HunterAgent)` assertions → comma-ok guards returning no-op                                                                                               | `applyItemEffects` dispatches by item id with no class check, so a mail item a paladin can wear runs hunter code and panics — a real upstream bug, not our tab's | Low                                                                         |
| `ui/core/components/gear_picker/item_list.tsx`         | `getSourceInfo` extracted from a private method to an exported free function; body moved verbatim, 239 lines                                                         | Our tab needs the source-info formatting outside the gear picker's own class                                                                                     | **Highest** — 239 moved lines; git cannot reason about a relocated function |
| `ui/core/components/sim_header.tsx`                    | Adds a `.sim-header-container-wrap` div and a scroll-fade affordance                                                                                                 | Local UI fix (Upgrades tab mobile layout)                                                                                                                        | **High — already conflicted once**                                          |
| `ui/core/sim.ts`                                       | None remaining                                                                                                                                                       | The optional `iterations` parameter was reverted                                                                                                                 | **Resolved — reverted, zero diff**                                          |
| `ui/core/individual_sim_ui.tsx`                        | +6 lines, registers the Upgrades tab                                                                                                                                 | Wiring for our added tab                                                                                                                                         | Low                                                                         |
| `ui/scss/core/sim_ui/_header.scss`                     | +28 lines, fade mask pairing with `sim_header.tsx`                                                                                                                   | Styles the wrapper div above                                                                                                                                     | Low                                                                         |
| `ui/scss/core/components/individual_sim_ui/index.scss` | +1 import                                                                                                                                                            | Pulls in our tab's scss                                                                                                                                          | Nil                                                                         |
| `test-locales.mjs`                                     | Fixes a Windows `path.join`/glob bug that made the gate exit 0 having validated nothing; adds a `validatedCount` guard so a silently-empty glob fails loudly instead | Genuine upstream bug — the gate was passing on Windows while validating zero files                                                                               | Low                                                                         |
| `assets/locales/en/translation.json`                   | 92/0                                                                                                                                                                 | Our tab's own strings, under an `upgrades_tab` key                                                                                                               | Low                                                                         |
| `schemas/translation.schema.json`                      | 309/1 — and the `required` array gains a member, so this is not purely additive; see item 5 above                                                                    | Schema entry the locale gate requires for the additive strings above                                                                                             | Low                                                                         |
| `package.json`                                         | +1 line, `test:layout` script                                                                                                                                        | Registers our layout-gate tooling                                                                                                                                | Nil                                                                         |
| `tsconfig.json`                                        | +1 line, `allowImportingTsExtensions`                                                                                                                                | Needed by our tab's own module layout                                                                                                                            | Low                                                                         |
| `.gitignore`                                           | +3 lines                                                                                                                                                             | Ignores a local WCL-credentials file our tab's importer reads                                                                                                    | Nil                                                                         |
| `package-lock.json`                                    | Full regen, ~2,584 changed lines                                                                                                                                     | Regenerated so native deps record all platforms; not a dependency version change                                                                                 | Low-medium                                                                  |
| `test-layout.mjs`                                      | +809 lines (new file, not an upstream file at all)                                                                                                                   | Our own layout gate, ported to run inside the fork tree                                                                                                          | **Not divergence** — listed only because the pathspec command returns it    |

### `sim_header.tsx` already conflicted once: merge `ab59127d9`

The risk on that file is not theoretical. The last merge from upstream
(`ab59127d9`, "Merge upstream feature/backend-reforge at ec5c5f2") produced
exactly one conflict, and it was this file. Its commit body is the only place
the resolution reasoning was written down before this document existed:

> The wrapper is load-bearing for our own code. sim_header.tsx:67 does
> `querySelector<HTMLElement>('.sim-header-container-wrap')!` -- a
> non-null assertion that would throw at runtime without it -- and
> ui/scss/core/sim_ui/_header.scss:42 styles it. It came from our
> commit d7ea63197 "Unbreak the Upgrades tab on mobile".
>
> "within-raid-sim-hide" is gone from upstream entirely (0 hits at
> ec5c5f2, 8 at our pre-merge tip) along with raid-sim. The merge had
> already auto-resolved the other 7 away; keeping this one would leave
> an orphan class with no SCSS definition anywhere in the merged tree.

Read the full body with:

```
git -C vendor/tbc-new-fork show ab59127d9 --no-patch --format=%B
```

The resolution kept our wrapper div and took upstream's unrelated class removal
in the same hunk — a single JSX conflict, not two independent edits, which is
why "keep both" was not the answer. Any future merge that touches this file's
`customRootElement()` should re-read that commit before resolving.

That body's phrase "would throw at runtime without it" was true at
`ab59127d9` and remains true at `bbad1b8a4`. It is **no longer true at
`5e9013b78`**, where the lookups are guarded and a missing wrapper degrades to a
lost scroll-fade — see item 10 above.

### Highest merge risk: `item_list.tsx`

`getSourceInfo`'s extraction moved 239 lines from a private method to an
exported free function, body unchanged. Git diffs a moved function as a large
deletion plus a large addition — it cannot represent "this logic moved and
nothing else changed", so a future merge-tree simulation is more likely to show
a real conflict here than a resolvable rename. Read the extraction's diff
directly rather than trusting a merge preview's conflict count for this file.

### `ui/core/sim.ts` — resolved: the `iterations` parameter, reverted

Ticket 369 asked to wire up or revert the dead `iterations?: number` parameter
on `makeRaidSimRequest`. It was **reverted** to upstream's exact shape, in fork
commit `bbad1b8a4`:

```
git -C vendor/tbc-new-fork diff --stat \
  ec5c5f205e61049d730e460967f8488774a7fe2a..bbad1b8a4 -- ui/core/sim.ts
```

now returns **no output** — `sim.ts` has zero diff against upstream.

The parameter existed for a per-request iteration override that
`docs/plans/wowsims-tab/candidate-pool.md` §6.3 argued for, then corrected
(dated 2026-08-15, same section) once the screening pass turned out not to need
it: the upgrades tab's `WasmSimRunner.run` builds its own request from
`SimRunOpts.iterations` (`upgrades/engine/seams/sim-runner.ts:23-26`) and never
calls `makeRaidSimRequest` at all. All seven call sites — five in `sim.ts`, one
in `exporters/individual_cli_exporter.tsx:13`, one in
`upgrades/adapters/skeleton.ts:28` — passed exactly one argument, confirming the
second parameter had no live caller. Reverting it removed an upstream-file
divergence that bought nothing and would have conflicted for no benefit, which
is exactly what the ticket named as the risk.

### What is not claimed

Neither this section nor the inventory above claims sim output is unchanged as
measured fact. The `item_sets.go` guard and the `sim.ts` revert were **read, not
run** through the sim before and after — reading the diff shows no arithmetic,
coefficient, or aura change, which is a claim about the diff's content, not
about simulated DPS. Ticket 311's blast-radius claim (one confirmed item, other
specs `hypothesis, untested`) is that ticket's own and was not re-measured here.
Where a re-run would settle a question, this document says so rather than
asserting the untested case as verified.

## Before opening any PR: strip private-tracker references

Comments across the fork cite our private tracker — "ticket 311", "ticket 304
item 3", "WP1 defect 3" — which mean nothing to a wowsims maintainer. This is
the **complete** sweep at fork HEAD, not a sample:

```
git -C vendor/tbc-new-fork grep -c -iE "ticket [0-9]+|WP[0-9] defect|\(this repo\)" bbad1b8a -- .
```

25 files. The command above counts matching **lines** and sums to 171;
re-running it with `-o` counts matching **references** and gives 178, because
some lines carry more than one. Both re-measured 2026-09-12. Ranked by matching
lines per file:

| File                                        | Refs   |
| ------------------------------------------- | ------ |
| `upgrades_tab.tsx`                          | 66     |
| `_upgrades_tab.scss`                        | 32     |
| `upgrades/engine/rank.ts`                   | 12     |
| `upgrades/engine/candidate-gems.ts`         | 10     |
| `upgrades/data/PROVENANCE.md`               | 8      |
| `test-layout.mjs`                           | 8      |
| `upgrades/adapters/sim_database.ts`         | 5      |
| `upgrades/engine/PROVENANCE.md`             | 4      |
| `upgrades/engine/view.ts`                   | 3      |
| `upgrades/adapters/bulk_wasm_sim_runner.ts` | 3      |
| `upgrades/adapters/bulk_screen_driver.ts`   | 3      |
| `upgrades/engine/seams/sim-runner.ts`       | 2      |
| `upgrades/engine/cutoff.ts`                 | 2      |
| **`sim/hunter/item_sets.go`**               | **2**  |
| **`ui/scss/core/sim_ui/_header.scss`**      | **1**  |
| **`ui/core/components/sim_header.tsx`**     | **1**  |
| 9 more files under `upgrades/`              | 1 each |

**The three bolded rows are the ones inside upstream-modified files** (four
references total), and they matter most because they ship inside the three PRs
we most want accepted. But `upgrades_tab.tsx` at 66 is the largest single
offender by far and ships in the tab PR, so it is not optional either. Replace
all of them with descriptions of the actual bug.

## Reconciliation with ticket 369's original list

Ticket 369 listed thirteen paths, and this document lists thirteen — but they
are **not the same thirteen**, and the difference is a real improvement:

- **`ui/core/sim.ts` is gone.** The ticket recorded an optional `iterations`
  parameter on `makeRaidSimRequest` with no caller passing a value, and its
  acceptance asked for that to be wired up or reverted. It was **reverted**, by
  fork commit `bbad1b8a4`. Confirmed: `git -C vendor/tbc-new-fork diff --stat
ec5c5f20..bbad1b8a -- ui/core/sim.ts` produces **empty output**, so the file
  is byte-identical to the base.
- **`test-layout.mjs` is added in its place** — but as an _added_ file, not a
  modification. The ticket's table folded it in; this document separates it into
  Category A, where its placement is judged rather than its diff.

Ticket 369 was closed on `dev` at `21d0b37`, citing the now-superseded
`docs/fork-upstream-divergence.md`. **This document now closes it.** The
ticket's acceptance note spoke of "fifteen paths at fork HEAD `f90b12a7b`" and
of its own table having "undercounted at fourteen rows"; that wording came from
the superseded document's pathspec count, and it is reconciled against this
document's 13 in "Reconciling the counts: 13, 14 and 15" above.

## Recommended sequence, if we act on this

Nothing here has been implemented — this document is inventory and
recommendation only.

1. **Three standalone upstream PRs, first**, each defensible without our tab:
   the hunter panic fix (#6), the locales-gate Windows fix (#7), and the tab
   strip scroll affordance (#10 + #13 together).
2. **Then shrink the tab PR**, in descending value: drop `package-lock.json`
   (#3, ~2584 lines, zero cost); move i18n to a runtime resource bundle (#2+#5,
   401 lines); make `getSourceInfo` `public static` instead of extracting it
   (#9, 239 lines to ~1); relocate `test-layout.mjs` (removes #4); nest the
   `.gitignore` rule (#1); delete the dead `tsconfig.json` flag (#8).
3. **Fix the `sim_header.tsx` null assertion** regardless of PR plans — it is a
   latent crash a future merge can arm.

What would remain in the tab PR: our own 122 files, plus **seven lines across
two upstream files** (#11's six, #12's one).
