# Fork pin investigation — why `pnpm verify` is red, and what it costs to fix

Opus investigation, 2026-08-27, commissioned when `pnpm equip-eligibility:check`
began failing after ticket 304's fork commits. The owner's words: "I have no
idea wtf is going on, this is way over my head." Read-only; nothing was
modified, and all measurement ran against scratch copies.

## The short version

Nothing is broken and nothing is lost. The gate is doing its job and reporting a
**stale note, not stale data**.

A file in this repo records "`data/equip-eligibility.json` was generated from
fork commit `fd4d65c4a`". Ticket 304's UI work moved the fork to `44f63ae78`.
The note and reality now disagree, and the gate refuses to run rather than
silently compare two different questions.

**The generated data does not change between those two commits.** So the fix is
one line, not a regeneration.

## Why the machinery exists

Per ADR-0027, the Upgrades tab inside a personal fork of the wowsims TBC site is
the primary product. That creates a split: the equip rules ("can a rogue wear
this two-hander?") live in the fork's TypeScript, but the ranking pipeline is
Python. Those rules were once hand-ported to Python and the port drifted — it
offered a rogue a two-handed sword the sim itself refuses (ticket 301).

ADR-0029's response — "borrow the decision, derive with a gate" — is to stop
re-implementing: a tool inside the fork runs the fork's own real `canEquipItem`
over the fork's own item database and writes the answers out; Python reads that
file instead of guessing. The lock file records which fork commit the answers
came from, and the gate enforces the pairing.

The clone is gitignored because it is a separate ~200MB repo with its own `.git`
pointing at a personal GitHub fork.

## The two lock files are different jobs

| File | Tracks | Job |
| --- | --- | --- |
| `data/wowsims.lock.json` | `wowsims/tbc-new` upstream (v0.0.119) | the **engine** simmed against |
| `data/wowsims-fork.lock.json` | the personal fork, branch `feat/upgrades-tab` | the **fork clone** the tab is built in and equip rules derive from |

**Ticket 251's drift is a separate matter.** 251 concerns the `branchedFrom`
field — the fork branch sits on `cbf6b75` while the engine pin is v0.0.119, and
those have genuinely diverged. The owner already ruled on it (2026-08-22): keep
building on the fork's current base, decide about pushing later. It is `blocked`
on the owner deliberately.

Today's failure is the **`commit`** field. Different field, different question.
Fixing today does not touch 251 and does not need it resolved.

## What bumping actually costs — measured, not reasoned

The generator (`export_equip_eligibility.mts`) reads exactly three inputs:
`PlayerSpecs`, `assets/database/db.json`, and `canEquipItem` in
`ui/core/proto_utils/utils.ts`.

The four commits touch five files, none of them an input:

```
assets/locales/en/translation.json
schemas/translation.schema.json
ui/core/components/individual_sim_ui/upgrades/wcl_import_modal.tsx
ui/core/components/individual_sim_ui/upgrades_tab.tsx
ui/scss/core/components/individual_sim_ui/_upgrades_tab.scss
```

Re-running the real generator at the new HEAD and diffing against the committed
artifact yields **one changed line** — the recorded commit — with both files
477,248 bytes, `itemCount` 8257 on both sides, and the `specs` payload hashing
identically (`3dae1cb4…e7c6`).

Further, **the checker never reads `generatedFrom`** — it compares only
`itemCount` and `specs`. So the committed artifact does not even need
regenerating. Verified end-to-end: with a bumped pin in a scratch lock file, the
check passes against the currently committed artifact.

The feared downstream cascade does not exist. `assemble_universe.py` reads only
`raw["specs"]`, which is unchanged; `fork-universes:check` and
`pool-listings:check` both pass as-is.

### Orchestrator's independent verification

The load-bearing claim was re-checked directly rather than taken on the
investigator's word — git blob identity at both commits:

```
assets/database/db.json      e493949cc00bb7ffb79214717a83e7fda93317cc  IDENTICAL
ui/core/proto_utils/utils.ts aa82ba74e52546891338b5702c48dc1f23566c03  IDENTICAL
```

Same blob on both sides, so no equip answer can have changed. `git diff --stat`
confirms the five-file scope above.

## Three checks are blocked, not one

`equip-eligibility`, `ep-presets` and `meta-conditions` all share
`scripts/_fork_gate.py` and all fail on the same stale pin. `pnpm verify` stops
at the first, so they would otherwise surface one at a time. All three go green
with the bumped pin.

## No push is required

`pushed: false` records that the fork's commits have never left the machine —
confirmed accurate: `feat/upgrades-tab` has no remote tracking branch. The gate
compares a local clone's HEAD against a local lock file; nothing about the fix
touches the network. The flag stays `false`, and flipping it needs the owner's
explicit say-so.

## Options

- **A — bump the `commit` field to `44f63ae78…`. Recommended.** One line. No
  regeneration needed (measured). Risk essentially zero.
- **B — reset the fork clone to `fd4d65c4a`. Do not.** It destroys the four
  commits of UI work ticket 304 just produced. It "fixes" the gate by deleting
  what moved it.
- **C — file a ticket and defer.** Leaves `pnpm verify` red, so the branch
  cannot merge, in exchange for deferring a one-line edit. Only sensible if
  regeneration were expensive, and it is not.
- **D — loosen the gate to ignore UI-only commits.** Wrong. The gate is cheap
  and has already caught one real drift (ticket 301). The gate is behaving
  correctly; the note is stale.

## Recommendation

Option A. The gate exists to catch the case where the fork's equip rules or item
data moved under the committed artifact. Measurement shows that did not happen,
so updating the note is the honest fix.

Sequencing per AGENTS.md: the bump is a normal commit on
`feat/upgrades-dedup-wowsims`; then `pre-merge-review` writes its report; then
merging to `dev` is a **separate explicit ask** from the owner after they have
seen the review summary.

## Blocker at time of writing

The fork clone had **uncommitted work** — the two-row slot-strip SCSS rule, the
executor's live response to the owner's tab-strip ruling. The pin bump must wait
until that lands, because the pin must name the commit that includes it.
Touching the tree while a worker holds uncommitted edits is the exact race
AGENTS.md warns about.
