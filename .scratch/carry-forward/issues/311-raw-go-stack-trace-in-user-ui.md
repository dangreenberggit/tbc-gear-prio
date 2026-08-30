Status: open
Type: investigation
Origin: Chrome visual pass of the Upgrades tab, 2026-08-27 (branch `feat/upgrades-dedup-wowsims`, fork `342f6a74`)
Blocks: none
Blocked by: none

# A raw Go panic and stack trace are rendered in the end-user UI

**Investigative ticket.** The rendering is confirmed; the underlying sim failure
is not diagnosed and may be the more important half.

## Observed

During an ordinary Retribution Paladin run, one candidate was dropped and the
tab rendered the reason as plain wrapped text in the page:

```
Beast-tamer's Shoulders was dropped from the ranking: the sim failed on this
swap -- sim error (0): interface conversion:
*retribution.RetributionPaladin is not hunter.HunterAgent...
```

followed by a full raw Go stack trace.

It **wraps cleanly inside its container and does not break the page layout** —
this is not a layout defect. It is a content and error-handling question.

## Two separate questions, and the second may matter more

**1. Presentation.** A raw Go panic with a stack trace is not an end-user
message. A player reading it learns nothing actionable. What should a dropped
candidate show, and where should the underlying detail go instead (console, a
collapsed drawer, a diagnostics view)? Note the surrounding machinery is
deliberate and worth preserving: the tab already has a "dropped candidates and
substitutions" concept that correctly kept the run going rather than failing it.

**2. The failure itself — do not skip this.** The error is
`*retribution.RetributionPaladin is not hunter.HunterAgent`. A paladin sim
attempting a hunter interface conversion suggests the swap sent the backend a
request it mapped to the wrong spec, which is a correctness question about the
candidate-swap path, not a cosmetic one. It is not known whether:

- this item is mis-slotted or mis-tagged in the pool data,
- the swap built a malformed request,
- or the backend mis-dispatches for this item class generally.

**Beast-tamer's Shoulders** is the one observed trigger. Whether other items hit
it is unknown — only one occurrence was seen in one run.

## Investigated 2026-08-27 — diagnosed, and the pool is not at fault

**A. The immediate cause.** `vendor/tbc-new-fork/sim/hunter/item_sets.go:243-248`:

```go
// Beast-tamer's Shoulders
core.NewItemEffect(30892, func(agent core.Agent) {
	hunter := agent.(HunterAgent).GetHunter()
	...
})
```

An unchecked assertion (no comma-ok). `applyItemEffects`
(`sim/core/item_effects.go:75-95`) walks the equipped items and fires any
registered effect **keyed purely by item id, with no class check**. So the
hunter-flavored effect runs for a paladin and panics.

**B. Blast radius — one item, by construction.** Method:
`grep -rEn "agent\.\([A-Za-z]+Agent\)"` across every class package's
`items.go` / `item_sets.go` / `item_librams.go` / `item_trinkets.go` under
`sim/{hunter,mage,warrior,warlock,priest,rogue,druid,shaman}` (no `deathknight`
package exists in this TBC fork). **Every match is the unguarded form; none use
comma-ok.** Each `NewItemEffect` item id and each `ApplySetBonus` set id was
resolved and intersected against `data/universes/ret-p{3,4,5}.json`:

- **Per-item effects: 1 hit** — `30892`, present in all three ret pool phases.
- **Set-bonus effects: 0 hits.**

Exact for effects registered today. **Not future-proof:** any new off-class
on-equip effect on an item the pool's armor-type ceiling admits (cloth/leather/
mail — 250 of 467 ret-p3 rows) reproduces this same panic class. Other specs'
pools were not checked; the same mechanism applies to them.

**C. Ownership — the backend's bug, and NOT a duplicate of 228 or 301.**
Item 30892 is `itemType: 3` = Mail (`proto/common.proto:330-335`).
`canEquipItem` (`ui/core/proto_utils/utils.ts:1116`) uses
`playerClass.armorTypes[0] >= item.armorType` — the real WoW proficiency rule,
where a plate class may legally wear mail. `data/equip-eligibility.json`
confirms `RetributionPaladin` eligibility includes `30892`.

**The pool is correct — a paladin genuinely can equip this item.** So 228
(weapon proficiency) does not apply, this being armor; and 301 (eligibility
mirror drift) does not apply, the eligibility data being right. The defect is
that the Go sim's item-effect registration is **class-flavored but not
class-gated**: a legally-equippable item panics instead of no-op'ing or
returning a structured error. **We sent a valid request; the sim's dispatch has
no class check.**

**D. Presentation path.** The raw error is captured at
`packages/core/src/rank.ts:1002` (`err.message`, carrying the panic and stack
trace verbatim) and wrapped at `:1327-1333`. **The CLI/HTML report already fixes
this** — `firstLineOf` (`packages/core/src/rank-report.ts:154`) applied at
`:560`. **The Upgrades tab never got that fix:** `upgrades_tab.tsx:1783` renders
`{s.detail}` untrimmed. JSX auto-escapes, so this is a content defect, not an
injection risk.

### What this changes about the ticket

The ticket guessed the panic might be the larger half. It is — but not in the
way it guessed. There is no correctness bug on our side: the swap path is
behaving correctly and the pool is right. The two halves are now cleanly
separable and can be fixed independently:

1. **Presentation (ours, small).** Apply the existing `firstLineOf` treatment at
   `upgrades_tab.tsx:1783`. The helper already exists and is already used on the
   report path — this is borrowing, not inventing.
2. **The panic (the fork's, larger).** Class-flavored item effects need a guard.
   Whether that is comma-ok returning a no-op, a structured "not applicable"
   signal, or a class gate at registration is a **design decision, not made
   here**. Note this is upstream-shaped code: a change there arms the ported-file
   cycle in `docs/agents/known-traps.md` if it touches a ported file, and is a
   candidate to send upstream rather than carry as fork drift.

## What would close this ticket

- How many pool entries trigger this, not just the one observed. Run wider and
  count.
- Whether the trigger is item-specific, slot-specific, or spec-specific.
- Whether the backend request for the failing swap is malformed on our side, or
  the backend mis-dispatches a well-formed request. That decides which side owns
  the fix.
- Then, separately, a decision on what the UI should show in place of a stack
  trace.

## Limits of the observation

- Seen **once**, in one run, on one spec (Retribution Paladin), at 200
  iterations.
- The full stack trace was not captured verbatim beyond the leading lines quoted
  above.
- No check was made of whether the same item fails outside the Upgrades tab.

## 2026-08-29 — panic guard landed (both halves now addressed)

**Presentation half (already landed, verified C5):** `firstLineOf` is applied in
`upgrades_tab.tsx` (defined ~line 268, used ~line 2206) — the tab no longer
renders the untrimmed `{s.detail}` the ticket observed. Verified by
`grep -n "firstLineOf" vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades_tab.tsx`.

**The panic (fork commit `c4d1cb661`):** converted all ten
`agent.(HunterAgent).GetHunter()` assertions in
`vendor/tbc-new-fork/sim/hunter/item_sets.go` to comma-ok no-op guards. The five
`NewItemEffect` callbacks (incl. Beast-tamer's Shoulders 30892) are the live bug
— they fire keyed by item id with no class check; the five `ApplySetBonus`
callbacks get the same guard as defense-in-depth (0 hits in the ret pool today
per §B, but future-proofed). Item 30892 is still registered; the guard makes the
effect a no-op for a non-hunter agent instead of panicking.

Verified: `go build ./sim/...` exit 0, `go vet ./sim/hunter/` exit 0, `gofmt -l`
clean. The package's `TestHunter` is pre-broken on a stale `assets/database/db.bin`
fixture (`panic: No DB data for enchant with id: 2613`) — reproduces identically
with the file reverted, so it is unrelated to this guard (a hypothesis about the
db.bin being stale relative to the fork tip; the source db.json does carry
enchant 2613). Not this run's problem.

Blast radius unchanged from §B: one confirmed item (30892) in the ret pool; other
specs' pools **hypothesis, untested**. Upstream candidate (§2), not sent this run.

**Remaining before close:** the behavioral no-panic check — a targeted ret run
including 30892 renders the item ranked or cleanly dropped with a one-line reason
and NO raw stack trace. This is a runtime/CDP check performed in the same
automated re-verification pass as 313/315 (stage-gate step 7); the ticket closes
on that readback plus owner sign-off, not on the build signals alone.

## Comments
