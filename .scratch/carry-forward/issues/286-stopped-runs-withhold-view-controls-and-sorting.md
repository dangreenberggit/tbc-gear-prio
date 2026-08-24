Status: open
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

Related: ticket 285 (filter selection wiped during running ticks) touches
the same refreshRaidFilter code; fix together or sequence deliberately.

## Done when

- After Stop, the on-screen partial rows can be filtered and sorted, with
  the semantics of each view control over a partial ranking decided and
  written down.
- The seven-state matrix (idle, running, done, done+stale, stopped, error,
  unsupported-spec) still renders one status line per state on the served
  page.
