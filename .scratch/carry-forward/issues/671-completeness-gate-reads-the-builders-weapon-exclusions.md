Status: closed
Serves: .scratch/plans/upgrades-tab-finish-line.md, follow-on of 610 (scope bucket for the orchestrator to set)
Type: bug
Origin: pre-merge review of feat/tab-item-lists (docs/reviews/feat-tab-item-lists.md, finding P2), 2026-10-16
Blocks: none
Blocked by: none
Related: 610

# The completeness gate reads the weapon exclusions the builder writes

`scripts/check_pool_completeness.py` says independence from the builder is
its point: it "imports nothing from the builder nor reads its
`*.report.json`, so a rule the builder drops or bends shows up here as a
failure instead of passing by construction" (docstring, lines 10-15). But
it reads `data/weapon-type-exclusions.json` (`:199-203`), and
`scripts/assemble_universe.py` rewrites that file from its own
`SPEC_PROFILES` on every run (`:11-13`, `EXCLUSIONS_MANIFEST` at `:720`).

So when the builder's weapon-type rule for a spec changes, the gate's rule
changes with it in the same regen, and the gate cannot catch the change.
Today the two agree (the review's adversarial axis rebuilt all 44 lists
byte-identical at 3b9bb690); no list is wrong because of this. Plan C26 of
stage tab-blocking-finish listed the file as a gate input, so the gap came
from the plan.

The gate already restates four builder-only rules as its own constants
(docstring, "Four rules exist only as builder code"). One fix is to restate
the per-spec weapon-type exclusions the same way, so a drift between the
two fails the gate.

Done when: the gate gets its weapon-type exclusions from somewhere other
than the builder's output; changing one spec's exclusion in
`SPEC_PROFILES` and regenerating makes `pnpm pool-listings:check` fail
(a red run recorded in the closing note); `pnpm verify` rc 0.

## Comments

## Closed 2026-10-16 (pre-merge review fixes, feat/tab-item-lists)

`scripts/check_pool_completeness.py` no longer reads
`data/weapon-type-exclusions.json`. It states each spec's policy weapon
types itself, `POLICY_EXCLUDED_WEAPON_TYPES` (`:125`, ret off-hands and
shields, feral polearms), citing the two SME rulings under
`.scratch/handoffs/` that set them. Weapon types a spec cannot equip at all
were already removed through `data/equip-eligibility.json`, so the
manifest's derived part added nothing. The gate now also fails when a list
holds a weapon that this policy or ret's two-hand-only rule excludes
(`:475-481`); without that, a builder that dropped a rule would pass,
because the gate skips such items when it lists what a spec can wear.
On the real lists the gate still reports 0 findings and no listing drifts.

Red runs. Each copied `scripts/assemble_universe.py` to an untracked
scratch name in the pair, changed feral's `policy_excluded_weapon_types`,
rebuilt feral p2-p5 with `--spec feral --max-phase <P> --out <tmp>` into a
temp folder holding copies of the other 40 lists, and ran the gate with
`--check --universes-dir <tmp>`. The scratch builder also rewrote
`data/weapon-type-exclusions.json`, so the gate as committed at `60f08375`
(read from `git show 60f08375:scripts/check_pool_completeness.py`) saw the
changed rule; the file was restored with `git checkout` afterwards.

1. Staves (type 8) added to feral's exclusions: feral lists shrank
   479/686/767/962 -> 466/666/744/931. The `60f08375` gate: rc 0, 0
   findings. The new gate: rc 1, 87 findings (13/20/23/31 per phase), each
   "absent but E-raid/E-arena/... expects it", for example 28604
   Nightstaff of the Everliving.
2. Polearms removed from feral's exclusions: feral lists grew
   479/686/767/962 -> 483/692/773/970. The `60f08375` gate: rc 0, 0
   findings. The new gate: rc 1, 24 findings, each "present but feral's
   weapon policy excludes it", for example 34183 Shivering Felspine.

Verified by: `pnpm pool-listings:check` (rc 0, "44 lists, 0 findings, 0
drifted listings") on the real lists, and the two red runs above.
