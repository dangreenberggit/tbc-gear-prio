Status: open
Serves: .scratch/plans/upgrades-tab-finish-line.md, Chunk 3b (DPS spec list) — rule 1 of § How plans nest
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

- **Desktop gate golden:** `data/desktop-gate/golden-ret-p4-cap40.json` is the only
  golden — a single ret P4 fixture. The gate proves nothing about other specs'
  ranking output. (Updated 2026-10-17: the 2026-09-19 inventory named
  `golden-ret-p5-cap40.json`; commits 5b919b9f and d72b6ccf on 2026-10-06
  replaced it with the P4 file — `git log --oneline --name-status -- 'data/desktop-gate/*'`.)
- **Gates / pipeline scripts** (grep hits for feralcat|retribution|/druid/feral|
  /paladin/retribution): `scripts/check_desktop_tab.py`, `scripts/build_feral_skeleton.py`,
  `scripts/check_ep_presets.py`, `scripts/assemble_universe.py`,
  `scripts/generate_sim_implemented_effects.py`, `scripts/check_sim_implemented_effects_classifier.py`,
  `scripts/sync_wowsims.py`, `scripts/check_sync_wowsims.py`.
- **Tab harness:** `scripts/tab-harness/test-tab-harness.mjs` sets one hardcoded
  spec page, `PAGE_PATH = "/tbc/paladin/retribution/"`, and
  `scripts/tab-harness/test-layout.mjs` and `scripts/tab-harness/test-review.mjs`
  navigate only to that page. So the layout gate, the a11y ratchet, and the
  visual-review capture ALL only ever look at one spec — a caster or other DPS
  spec's controls/violations are invisible to every gate. (This is the same class
  as 449/450: a gate that only scans one surface can't catch a defect on another.)
  Recorded fixtures can open a second page: `PAGE_PATH_BY_SPEC` in the same file
  maps only `ret` and `feral`. (Updated 2026-10-17: the 2026-09-19 inventory named
  `vendor/tbc-new-fork/test-tab-harness.mjs` with the page `/tbc/druid/feralcat/`;
  fork commit a59711d17 and main-repo commit 152f591e on 2026-10-08 moved the file
  to `scripts/tab-harness/`.)
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
`grep -rliE "feralcat|retribution|/druid/feral|/paladin/retribution" scripts/`
before acting. Since 2026-10-08 the tab harness is under `scripts/tab-harness/`,
so that grep covers it; the fork's own `ui/` code is not covered.

2026-10-24: `feat/dps-spec-coverage` (merged to dev `12bce63d`, 2026-10-20)
served this epic: off-hand and shield rows for balance, mage, shadow,
elemental, warlock, ret and feral; the two-hander hold-out and its drop lines;
separate keys for hunter/warrior same-name gear sets; 8 fixtures recorded at
fork `b908771dd` (ret, 5 feral, warlock, enhancement). The recorder's
`PAGE_PATH_BY_SPEC` now also maps warlock and enh (`5a8f337e`), so the
sentence above about ret and feral only is out of date. Owner ruling
2026-10-24: tab page checks use made-up results and no sim recordings; that
work runs as stage `tab-checks-without-sims`. Scope unchanged.

2026-10-24, stage `tab-checks-without-sims`: the 8 recordings above are no longer
gate inputs; six are frozen engine test data under
`packages/core/test/fixtures/tab-recordings/`, two were deleted; the gate
renders six made-up fixtures from `pnpm tab-fixtures:mock`.

2026-11-03, stage `p45-dps-pass-452`: the phase 4 and phase 5 live pass
over the 11 DPS specs ran (22 runs, all counted; report
`docs/live-runs/2026-11-03-p45-dps-pass.md`, SME handoffs
`.scratch/handoffs/sme-rank-judgment-452-{p4,p5}-{casters,physical}.md`).
Tickets filed: 750, 751, 752, 753. The report's § For epic 452 lists, for
each "done" bullet, what the pass met, what it did not and the work left;
the pass meets no bullet in full. Q-452-golden (does the 2026-10-24 ruling
also cover the desktop gate's single ret golden?) is open for the owner;
either answer leaves the other parts of bullet 2 open. Whether to close or
re-slice this epic is the owner's decision.

2026-11-06, owner rulings, word for word (recorded in the main checkout's
untracked handoff `.scratch/handoffs/2026-11-06-452-slicing.md`, lines 8-11):

- On Q-452-golden: "I don't know if this is a UI component test, a layout
  test, or a function/ sim component test. I can't answer the question of
  what this is supposed to test if I don't know what this is supposed to
  test, and if you figure out what it's supposed to test I assume that
  mostly answers the question"
- On the spec list: "yes, those other dps specs are included . Wowsims tbc
  also has default "saved talents" that include these, but notably they
  dont see to be different website routes"
  (The question proposed 13 specs: the 11 of the p45 pass plus Survival
  hunter and Arms warrior.)
- On next steps: "definitely splitting, potentially in another session
  unless it's very related to this content"

What the desktop gate tests, as the slicing session answered it: it is a
sim-output test, not a UI component or layout test. Check (h) of
`scripts/check_desktop_tab.py` compares a run's `rows`, `aboveCutoffItems`
and `baselineDps` exactly against the golden; its docstring calls it "the
only automatic check on DPS values, row order and the above-cutoff set".
The 2026-10-24 ruling covers page checks, which test what the page shows
for given results; the golden tests the results themselves. So the golden
part of bullet 2 stays open, with goldens for more specs than ret. The
owner has not commented on this answer; slice C acts on it.

The spec list (bullet 1) is these 13 specs: balance, mage, shadow,
elemental, warlock, feral cat, ret, rogue, hunter (Beast Mastery), Survival
hunter, enhancement, warrior (Fury) and Arms warrior. Survival and Arms are
not separate site routes, as far as the owner could see ("dont see to be
different website routes", above); in the fork they are the hunter and
warrior pages with their own gear sets.

Slices, worked by a chain of sessions in this order (one branch each, no
merge without the owner's ask): A, this note and the slice tickets, plus
an audit of the per-spec checks; B, 799 (Survival and Arms live runs,
with 803 first);
C, 800 (desktop-gate goldens for more specs); D, 746 (meta-gem repair at
the hit cap for every spec, with 804); E, 801 (axe and visual-review scans on every
spec page); F, 802 (reword ret-and-feral examples, then check this bar and
close). B, C and E branch off A's branch, D off C's branch, and F comes
last. The order is the chain's; each ticket's `Blocked by:` line names
its real dependencies.

2026-11-06, slice A audit of the per-spec checks (EP presets, universes,
sim-implemented effects, pool), read at fork `b603564ee`, the current pin.
`pnpm verify` runs every one of these checks (`package.json`, `verify:steps`).
The tab no longer reads `data/universes` or the sim-implemented-effects
file (ADR-0038), so checking those per spec matters only to the CLI. Two
gaps in what the tab uses, filed: 803 (Survival and Arms pages gem with
Beast Mastery and Fury EP weights) and 804 (no check pins any spec's
phase-1 pool). 803 joins slice B, before its runs, so those runs gem with
each spec's own weights. 804 joins slice D: both are fork changes, so one
re-pin carries them. 802 waits on both.

2026-11-06, slice F (ticket 802, branch `feat/452-reword-and-close`,
stacked on E's branch): the epic stays open. No slice branch (A to E) is
on `dev` yet, so no bar line is met on `dev`. Each line, and where the
work stands:

- **Spec list (bullet 1):** the 13 specs in the note above (owner ruling,
  2026-11-06). Met once A's branch `chore/452-slice-tickets` merges.
- **Goldens (bullet 2):** C's branch `feat/452-desktop-goldens` gates ret,
  mage (caster), rogue (melee) and enh (hybrid) at phase 4, cap 40 (`GATED`
  in `scripts/check_desktop_tab.py` on that branch). Ticket 800 is still
  open there.
- **Page checks on more than one spec page (bullet 2) and the a11y ratchet
  on each spec's tab (bullet 3):** E's branch scans all 11 spec pages;
  ticket 801 is closed on it. Survival and Arms have no page of their own
  (owner, 2026-11-06), so the hunter and warrior pages cover them. E's
  merge waits on owner question Q-452e-r1.
- **EP presets per spec (bullet 2):** `pnpm ep-presets:check` is in
  `pnpm verify`; ticket 803 (Survival and Arms weights) is closed on B's
  branch `feat/452-survival-arms`, with 799.
- **Universes and the sim-effects file per spec (bullet 2):** the tab reads
  neither (ADR-0038). Whether this part means "what the tab uses" is put to
  the owner as Q-452-bar-universes; there is no ruling yet.
- **Pool and meta-gem repair per spec:** tickets 746 and 804 are closed on
  D's branch `feat/452-meta-repair-hit-cap`. D's merge waits on owner
  question Q-452d-review.
- **Wording (bullet 4):** this branch rewords `data/pools/README.md`,
  `scripts/tab-harness/README.md` and a comment in
  `packages/core/src/pool.ts`. The `sme-rank-review` skill frames each
  review as a ret player (lines 11, 28 and 56); that text waits for the
  owner's approval (Q-452-sme-skill), so 802 stays open.

452 closes when 799, 800, 746, 801, 803 and 804 are closed on `dev`, 802 is
closed, and Q-452-bar-universes is answered.
