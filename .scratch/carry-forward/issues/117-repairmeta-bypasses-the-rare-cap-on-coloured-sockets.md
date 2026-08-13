Status: resolved
Resolved: a61628a (fix + tests), 2026-08-11
Type: bug
Origin: convergence check, 2026-08-11
(`.scratch/set-bonus-value/loop-103-106/convergence-check-2026-08-11.md`)
Blocks: none
Blocked by: none

# repairMeta bypasses the rare cap on coloured sockets

Ticket 111 capped `fillEmptyCandidateGems` at rare quality, and deliberately
left `repairMeta` on the full palette so meta gems stay solvable (111's
instruction 3 — metas must never become unfillable). The convergence check
measured a hole in that split: `repairMeta` does not confine itself to the
meta socket. To satisfy the meta's colour condition it re-gems COLOURED
sockets too, choosing from the uncapped list.

Measured, not inferred (`.scratch/set-bonus-value/loop-103-106/probe_helm_fill_0811.ts`):
on both helms (Cursed Vision 32235, Vengeful 33672) the fill correctly
returns `[32409, 24028]` — cap honoured — and `repairMeta` then overwrites
the coloured socket with **32220 Glinting Pyrestone, quality 4 (epic),
phase 3**.

Consequence: ticket 111's acceptance criterion passed on the T6 package only
because no T6 piece has a meta socket (the ticket says so itself). On every
candidate WITH a meta socket, the rare cap is silently void. Distinct from
tickets 114/115/116.

## Possibly related, hypothesis/untested

The helm A/B moved +8.61 → +7.90 (vs owner web +10.69, z 2.44) after the
cap landed. The epic sits in both arms so it should largely cancel; what
changed is WHICH epic (32194 red +10agi → 32220 orange +5/+5), which is not
gem-neutral. A capped-repair arm has not been simmed — do that before
attributing the regression to this defect.

## The policy decision (owner's call, do not implement without it)

1. **Cap the coloured sockets repairMeta touches** at the same rare limit,
   leaving only the meta socket itself on the full palette. Consistent with
   the two-step model; metas stay solvable; colour-condition satisfaction
   may occasionally need more re-gemming from the smaller list (verify it
   still always solves).
2. **Accept epics whenever a meta is involved** — document the exception in
   `GEM_POLICY_QUALIFIER`'s model text instead of changing code.

Option 1 matches the owner's stated principle (user must know which gems
are used, consistently; auto-fill assumes rare availability). Whichever way
it goes, add a test that pins repairMeta's coloured-socket choices to the
chosen policy, and re-run the helm A/B to re-measure against the owner's
+10.69.

## Second data set: ret-p3 (2026-08-11, ret catch-up round) — blast radius includes T6; bypass latent on this artifact

Sources: `.scratch/set-bonus-value/ret-catchup/01-survey.md` §5 (universe/db
join) and `03-verify.md` task 5 (fill replay). Artifact re-run:
`pnpm rank --offline --region US --realm dreamscythe --character slamaltman --spec ret --max-phase 3 --with-set-potential --show-below-cutoff --report`.

- **13 meta-socket candidates in the ret-p3 universe, all head slot**,
  including **30989 Lightbringer War-Helm (T6)** — so this ticket's "no T6
  piece has a meta socket" escape does **NOT** hold on ret: the ret tier
  package itself contains a meta-socket piece, inside the LB 4pc package.
  Full 13-row table in 01-survey.md §5.
- **But on THIS artifact the bypass is latent: 0 of 13 heads show epic
  fills.** Slamaltman's worn head (32461 Furious Gizmatic Goggles) is fully
  gemmed [32409 meta, 24054]; `migrateGemsToItem` carries both gems onto
  every candidate (all 13 heads have exactly 2 sockets), so
  `fillEmptyCandidateGems` finds no empty socket and `repairMeta` no-ops
  (baseline `metaAdjusted: false`). Verified by replaying the exact swap
  path (`equipmentForCandidateSwap` + `gemsForPhase(3)`) on all 13 heads —
  per-head table in 03-verify.md task 5.
- **Any barer worn head re-exposes all 13**: the defect needs an empty
  coloured socket or an unsatisfied meta condition; a character whose worn
  head has fewer gems (or no head sockets, like feral's Wolfshead) puts
  every one of these rows, T6 included, back in the blast radius. Record
  only; the policy decision above is unchanged.

## DECIDED AND FIXED, 2026-08-11 — option 1, coloured swaps capped at rare

**The owner chose option 1.** The gem-swapping step that keeps the meta gem's
colour requirement satisfied must stop picking replacements from the
unrestricted list. The sim is an apples-to-apples comparison of gear upgrades,
not hidden gem upgrades: if we aren't deliberately re-gemming someone with epic
gems they didn't have, we shouldn't do it. So the coloured-socket swaps
`repairMeta` makes now draw from the same rare-capped list the socket-filling
step uses. The meta socket itself keeps whatever it needs — which turns out to
be automatic, see below.

### What upstream wowsims actually does (checked before writing our own policy)

The owner asked for upstream's regem / suggest-gems behaviour to be checked
first, at the pin `8aa378b3671a0923fd11fb34b4b3753e53f20c9b`
(`data/wowsims.lock.json`, repo `wowsims/tbc-new`).

**The pinned upstream has no automatic gem-choosing code at all.** The vendored
copies under `vendor/wowsims/` don't include the UI gear code, so the full file
tree at the pin was listed through the GitHub API
(`gh api "repos/wowsims/tbc-new/git/trees/8aa378b3671a0923fd11fb34b4b3753e53f20c9b?recursive=1"`)
and every gem-related file fetched and read at that commit: `ui/core/proto_utils/gems.ts`,
`gear.ts`, the gear picker (`gear_picker.tsx`, `item_list.tsx`,
`quick_gem_popover.tsx`, `filters_menu.tsx`), `gear_tab.ts`, `gem_summary.tsx`,
and the bulk-sim `gem_selector_modal.tsx`. What they contain: manual gem
picking, gem migration on equip that leaves leftover sockets empty (already
ported as `migrateGemsToItem`), and a check whether the meta's colour condition
is met (`hasActiveMetaGem` / `isMetaGemActive`). When the condition fails, the
sim simply withholds the meta bonus. **Upstream never swaps a player's gems to
keep a meta lit — our `repairMeta` pass has no upstream counterpart.**

The suggest-gems button the owner used in their web session (ticket 111,
"Two behavioural facts") is **not in the pinned source**, and a filename sweep
of the current tip of `wowsims/tbc-new` found no suggest-gems file there
either — where that button's code lives is unresolved, and nothing local pins
it. The closest findable implementation in the wowsims family is
`wowsims/wotlk`'s `ui/core/components/suggest_gems_action.ts` (fetched from
that repo's tip, not our pin): it clears every gem and rebuilds the whole set
from per-spec hardcoded gem-id priority lists — it doesn't select by rarity at
all, the spec author's list simply is the policy.

**So there was no upstream approach to reuse at the pin.** The relation of our
behaviour to upstream is now: upstream never introduces gems on its own; we do
(the owner-decided auto-fill plus this repair pass), and after this fix
everything we introduce respects the same rare cap. We are strictly more
conservative than the button the owner observed, which re-gemmed worn body
gems; we never touch a gem the player actually wears unless the meta condition
forces it, and then only with rares.

### The fix

Both `repairMeta` call sites in `packages/core/src/rank.ts` (the worn-gear
repair at rank start and the candidate-swap path in
`equipmentForCandidateSwap`) now pass `GemContext.fillPalette` — the
rare-capped list — instead of the full palette. `repairMeta` itself is
unchanged: it never touches the meta socket (its search skips meta sockets),
so "the meta socket may use whatever it needs" holds automatically — the meta
gem is seated by the fill step, and all 18 TBC metas are quality 3, so they
pass the cap. The stale docstring on `GemContext.fillPalette`
(`packages/core/src/candidate-gems.ts`) that said repair keeps the full
palette is rewritten.

**Solvability with the smaller list, verified:** any non-meta gem may legally
sit in any coloured socket (colour only decides the socket bonus), and every
gem colour exists at rare quality, so capping cannot make a repair unsolvable
that the full list could solve. Checked by running the repair for all 18 metas
against a worst-case all-red body: every one activates except 25898
(Tenacious, needs 5 blue), which fails identically with the full palette —
that failure is a socket-count limit of the test gear, not a quality limit.
Pinned by tests:

- `packages/core/test/rank.test.ts` — "meta repair never places a gem above
  the rare fill cap" (red before the fix: the swap onto Cursed Vision seated
  epic 30549 on the helm and epic 32220 twice on the chest).
- `packages/core/test/meta-repair.test.ts` — "still solves from the
  rare-capped palette (ticket 117)".

Commit: `a61628a` on `feat/set-bonus-value`. `pnpm verify` green.

### Re-measured helm A/B — the "possibly related" hypothesis is disproven

Same protocol as the convergence check (owner's gear + TypeSimple rotation,
seeds [11,22,33,44,55] @ 3000 iterations, pinned wowsimcli v0.0.101):

    pnpm exec tsx .scratch/set-bonus-value/loop-103-106/build_convergence_arms_0811.ts
    python .scratch/set-bonus-value/loop-103-106/sim_convergence_0811.py

Both helm arms now carry [32409, 24061 Glinting Noble Topaz (rare)] instead of
[32409, 32220 Glinting Pyrestone (epic)]. Results
(`sims-convergence-0811/per-seed.json`, transcript
`sim_convergence_0811_ticket117.stdout.log`):

| measurement | value |
|---|---|
| Cursed − Vengeful, capped repair | **+6.76** (SE 0.912; per-seed 6.778, 6.675, 6.677, 6.837, 6.838) |
| owner web | +10.69 (SE 0.693) |
| gap | −3.93, z = 3.43 |

History of this A/B: +8.61 (before the rare cap) → +7.90 (cap on fill, epic
repair) → **+6.76** (cap on fill and repair). The section above suspected the
epic repair swap caused the +8.61 → +7.90 drop; **that hypothesis is now
disproven in direction** — removing the epic from both arms moved the figure
further from the owner, not closer. Each step toward cheaper gems lowers the
A/B, which makes sense: the same two gems sit in both arms, but Cursed Vision's
socket bonus and stat mix profit more from a stronger gem, so cheaper gems
shrink the gap between the helms. The remaining −3.93 against the owner is
**not** attributable to gem quality policy; the owner's web arms carried their
own manual gem choices, and the unversioned-web-vs-pinned-CLI offset (ticket
113) is still open. The policy is correct by decision, not because it closes
this comparison — the owner chose consistency over chasing the web figure.

Unchanged cross-checks from the same run: baseline 2219.82 (bit-identical to
the pre-fix run, so same engine), belt +50.45 (no meta socket involved, so the
fix correctly left it alone).
