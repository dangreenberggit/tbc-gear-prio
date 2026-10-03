Status: open
Type: epic
Severity: major (product-scope gap: the tool is meant to support all DPS specs; ret+feralcat were only initial-dev test specs)
Origin: owner directive, 2026-09-19 (raised during the tab-438 arc human review)
Blocks: none (but gates future spec-coverage work)
Blocked by: none
Related: 449/450 (a11y ratchet only scans one spec's page — same blind-spot class, one dimension over), the desktop-gate golden, the layout/visual/a11y harness

# End the ret/feralcat tunnel vision — support all DPS specs

**Owner directive (verbatim intent):** the project's obsession with only
Retribution paladin and Feral(cat) druid needs to end. The tool is supposed to
support **at least all DPS specs**. Ret and feralcat were the *test specs for
initial development* — they have leaked into load-bearing gates, fixtures,
harnesses, and even review reasoning as if they were the whole universe.

This is an EPIC, not a single change — it spans data pipeline, gates, harness, and
the reviewers. Scope it into slices before working it; do not try to do it in one
branch. It is explicitly NOT part of the feat/tab-signoff-followups merge.

## Where the assumption is baked in (hotspots found 2026-09-19, verify before acting)

- **Desktop gate golden:** `data/desktop-gate/golden-ret-p5-cap40.json` is the only
  golden — a single ret P5 fixture. The gate proves nothing about other specs'
  ranking output.
- **Gates / pipeline scripts** (grep hits for feralcat|retribution|/druid/feral|
  /paladin/retribution): `scripts/check_desktop_tab.py`, `scripts/build_feral_skeleton.py`,
  `scripts/check_ep_presets.py`, `scripts/assemble_universe.py`,
  `scripts/generate_sim_implemented_effects.py`, `scripts/check_sim_implemented_effects_classifier.py`,
  `scripts/sync_wowsims.py`, `scripts/check_sync_wowsims.py`.
- **Fork harness:** `vendor/tbc-new-fork/test-tab-harness.mjs` (and the layout/
  review/desktop harnesses that consume it) drive a single hardcoded spec page
  (`/tbc/druid/feralcat/`). So the layout gate, the a11y ratchet, and the
  visual-review capture ALL only ever look at one spec — a caster or other DPS
  spec's controls/violations are invisible to every gate. (This is the same class
  as 449/450: a gate that only scans one surface can't catch a defect on another.)
- **Review reasoning:** round-4 domain/adversarial review reasoned in terms of
  "ret P3" / "feral P5" as the universe. Any future review should treat "all DPS
  specs" as the coverage bar.

## What "done" looks like (to be sliced, not a single PR)

- A defined list of the DPS specs in scope (at least all DPS specs the wowsims
  fork supports for the phases this tool ships).
- Gates and fixtures that exercise more than ret+feralcat: golden coverage across
  representative specs (melee + caster + hybrid), the a11y/layout/visual harness
  able to scan more than one spec page, EP-presets and universe/sim-effects
  pipeline validated per spec.
- The a11y ratchet (see 450) scanning each in-scope spec's tab, not just one.
- Docs/skills that name "ret and feralcat" as examples reworded to "the in-scope
  DPS specs".

## What would close this

- A slicing plan (own planning session) that breaks the above into shippable
  tickets with an agreed spec list; then those tickets executed. This epic ticket
  tracks the directive and the hotspot inventory; it closes when the slice tickets
  are filed and the coverage bar is met, or when the owner re-scopes it.

## Notes

Hotspot inventory is from a bounded grep on 2026-09-19 — re-run
`grep -rlie "feralcat|retribution|/druid/feral|/paladin/retribution" scripts/ vendor/tbc-new-fork/*.mjs`
before acting; the fork is gitignored so its matches won't show in a main-repo grep.
