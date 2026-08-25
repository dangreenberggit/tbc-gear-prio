Status: closed (2026-08-24, fork commit fe1e4ad42, per the owner ruling —
Stop renders idle's empty results body, PartialRanking retained in memory
unread, re-Run verified working with the 285 filter selection surviving.
Assumptions drawer deliberately still renders (describes inputs); stopped
message wording reconciled under ticket 290.)
Type: UI defect
Origin: WP5 review, 2026-08-24
Blocks: none
Blocked by: none

# Stopped runs show ranked rows with no view controls and no sortable headers

Found by the WP5 review while ruling on the hidden-view-controls affordance
question (ruled wontfix; this is the real defect underneath it). Measured
live at fork tip e565d4a67-era code: Stop pressed mid-run leaves 85 ranked
rows on screen with all three view controls `d-none` (group display: none),
the content filter emptied to 0 options, and the plain non-sortable table
header.

## Mechanism

A single over-broad gate: `refreshViewControlVisibility` returns early on
`this.state.kind !== 'done'`, and `refreshRaidFilter` does the same, while
the stopped state is typed `{ kind: 'stopped'; ranking: PartialRanking }` —
it carries a ranking. The data the controls need exists; only the done-only
test withholds it. The same gate explains why stopped renders the
non-sortable header path (ticket 280 scoped sorting to done-state tables).

Functionality is withheld from data already on screen — this is not an
affordance problem.

## Scope warning

More than a sweep item: fixing it means deciding what each view control
means over a partial ranking (set-potential or BiS filtering over rows that
were never simmed is a semantic question), then touching the visibility
gate, the raid-filter populate path, and the table-header choice, with the
seven-state matrix re-verified. Probable direction: gate on "a ranking
exists" rather than `kind === 'done'` — hypothesis, untested.

Related: ticket 285 (filter selection wiped during running ticks) touched
the same refreshRaidFilter code; its fix landed first (fork 270f57da9).
The pre-merge adversarial axis added: `currentViewOptions()` still reads
`raidFilterSelect.value` off the DOM, correct today only because
`refreshRaidFilter()` runs before `renderSubTabs()` in `render()` — two
sources of truth for one value. When reworking the gates here, route the
applied filter through `pendingRaidFilter` so the invariant is structural,
not order-dependent.

## Owner ruling (2026-08-24)

A half-finished ranking is not worth exposing: **Stop resets the tab**
instead of showing a partial table with withheld controls. Keep what the
run already computed behind the scenes only if that is cheap and minimal
(the stopped state already carries a `PartialRanking` in memory — keeping
that reference is free; no persistence/local-storage work). This replaces
the earlier direction of enabling filters/sorting over partial rows.

## Done when

- Pressing Stop returns the tab to a state with no partial results table:
  the status line says the run was stopped, and the controls/table read as
  idle (no half-populated rows, no withheld-controls limbo).
- The already-computed partial ranking may be retained in memory but is
  not rendered; no new persistence is added.
- The status-state matrix still renders one status line per state on the
  served page, and a subsequent Run works normally after a Stop.
