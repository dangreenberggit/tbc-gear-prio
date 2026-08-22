Status: resolved 2026-08-22. Owner ruled feral may seat 32409 (see "Independent
  verification (2026-08-22)"); fix committed on fix/ticket-257-feral-meta-preference,
  commit 601dfd8. See "Resolution (2026-08-22)" at the end of this file.
Type: bug (confirmed, narrower than filed; fixed)
Origin: pre-merge domain axis on feat/stage-2-close-shortlist-box, 2026-08-21
Blocks: none
Blocked by: none

# Meta-socketed candidates are priced with an empty meta against a repaired baseline

## The finding

The `gems.meta-preference` substitution leaves meta sockets empty on **candidate**
items for feral. Meanwhile PLAN.md §9 repairs the **worn** item's meta to active
before the baseline sim. So a meta-socketed candidate is scored without its meta
gem against a baseline that has one — a systematic under-pricing of exactly the
items most likely to be upgrades.

The branch that surfaced this treated the substitution as bounded ("does not
touch this shortlist"). The domain axis disagrees: it is not a display caveat,
it is a scoring asymmetry.

## Why it matters, concretely

For feral it lands hardest on **head**, which is the slot carrying a
"no positive candidate" plausibility warning against Wolfshead Helm in
`.scratch/rank-reports/stage2-close-shredzepelin.json`. That warning is currently
attributed entirely to Wolfshead's unique effect. The empty-meta pricing is a
second contributor, and the stated cause is therefore **at best incomplete**.

Head is where meta gems live, so the slot with the bias and the slot with the
unexplained warning are the same slot. That is suggestive, not proven.

## Not established

- Whether correcting the pricing would actually surface a positive head
  candidate, or whether Wolfshead's effect dominates regardless. **Untested** —
  it needs a re-run with the meta filled on candidates.
- Whether other specs are affected. The substitution was read as feral-scoped;
  ret was not checked.

## Acceptance

> **Reopened 2026-08-22.** The independent verification at the end of this file
> overturns the reasoning behind the first two boxes. They are re-marked below;
> the 2026-08-21 text is kept verbatim so the change of verdict is auditable.

- [x] Decide whether candidates should carry a repaired meta, or the baseline
      should be priced without one — the two sides must match, either way.
      ~~**Decided: they already match. No code change.**~~ **Re-opened, then
      settled 2026-08-22:** the owner ruled option 1 — feral (and feral-tank)
      seat Relentless Earthstorm Diamond 32409, the same id ret's row already
      carries. See "Resolution (2026-08-22)" at the end of this file.
- [x] Re-run shredzepelin's feral p2 ranking and report whether the head warning
      survives. **It survives.** (The re-run itself stands; only the claim that
      it proves the warning is *completely* attributed was overturned.)
- [~] If the warning survives, update its stated cause to name both contributors.
      **Refusal upheld 2026-08-22, on narrower grounds.** The 208 DPS argument
      below does not establish what it claims (see claim 4 in the verification),
      but the conclusion still stands for this slot: naming the empty meta as a
      contributor to *Wolfshead's* warning would be asserting a magnitude nobody
      has measured. The honest statement is "unquantified", not "second cause".
      Original 2026-08-21 reasoning, kept for audit:
      **Refused, deliberately — not done, and not obsolete either.** The
      measurement shows there is no second contributor: the baseline is
      socketless Wolfshead Helm, so no meta was repaired on either side, and the
      head gap is ~208 DPS against a best-in-run upgrade of 57. Naming the empty
      meta as a cause would write a false explanation into the product to satisfy
      a checkbox. Marked `[~]` rather than `[x]`: this criterion was not met, it
      was declined, and the reason is the finding.

## Investigation (2026-08-21, `fix/worn-item-pool-coverage`)

**Outcome: no code change. The premise does not hold for this case, and the
measurement rules out the hypothesised effect by an order of magnitude.**

### The two sides already match

The ticket assumes the baseline carries a repaired meta while candidates do not.
For shredzepelin the baseline is **Wolfshead Helm 8345, which has no sockets at
all** — so the baseline has no meta gem either. The re-run reports
`metaAdjusted=false`: nothing was repaired, because there was nothing to repair.
PLAN.md §9 rule 3 names this case exactly — "Head with no meta socket (Wolfshead
and friends): no meta condition, skip."

Both sides are metaless, so the symmetry invariant §9 actually requires
("applied identically to baseline and every candidate") is **already satisfied**.

The general case is symmetric too, in the other direction: `swapItemAt`
(`packages/core/src/rank.ts:2011-2019`) calls `migrateGemsToItem`
(`packages/core/src/migrate-gems.ts:15`) *before* the fill, and
`gemEligibleForSocket` (`migrate-gems.ts:54-62`) permits meta-into-meta. So when
a player **does** wear a meta gem, the candidate inherits it and the socket is
not empty. The socket is left empty only when the player wears no meta — in
which case the baseline has none either.

### The empty socket is a deliberate fail-loud design, not an oversight

`SPEC_PREFERRED_METAS` (`packages/core/src/candidate-gems.ts:152-156`) has one
row, `ret`. Feral's absence is documented at `candidate-gems.ts:124-151`: all
five vendored feral presets wear the socketless Wolfshead, so upstream records
no feral meta to copy, and EP cannot rank metas (nine of eighteen score 0.00).
Seating ret's Relentless on a feral candidate would be, in the comment's words, a
guess dressed in ret's evidence. The chosen path is to leave it empty and
disclose loudly — `candidate-gems.ts:334`.

That disclosure fires at both levels, and both were present in the re-run: the
run-level `gems.meta-preference` substitution, and a per-row `emptyMetaSocket`
flag on exactly the two affected rows (`grep -c "empty meta socket"` on the HTML
report returns 2).

### The measurement

Re-run against the pinned `vendor/wowsimcli-v0.0.119-win32-x64/wowsimcli-windows.exe`
(present locally; `vendor/` is gitignored, so on a fresh worktree run
`pnpm fetch:wowsimcli && pnpm sync:wowsims` first). Output is bit-identical to the
already-tracked `.scratch/rank-reports/stage2-close-shredzepelin.json` — same
baseline 2266.914080374483, same head deltas to 2dp, i.e. deterministic — so the
re-run's own files were **not** committed as a duplicate. Reproduce with:

```
pnpm rank --region US --realm dreamscythe --character shredzepelin --offline \
  --spec feral --max-phase 2 \
  --report .scratch/rank-reports/ticket257-shredzepelin.html
```

The head warning **survives**, unchanged:

> No positive candidate in head: nothing in a full pool matches Wolfshead Helm's
> effect. Expected for a unique effect, but worth confirming it is not a
> measurement fault.

Only **two rows in the entire 265-sim run** carry `emptyMetaSocket`, both in head:

| candidate | Δ DPS vs Wolfshead | empty meta |
| --- | ---: | --- |
| Nordrassil Headdress 30228 | −208.31 | yes |
| Stag-Helm of Malorne 29098 | −213.74 | yes |
| Cowl of Defiance 28732 | −222.76 | no |

### Why the hypothesis is ruled out, not merely unconfirmed

The best empty-meta candidate is **208.31 DPS behind** Wolfshead. The gem that
would fill that socket — Relentless Earthstorm Diamond 32409, the only plausible
pick — is worth **12 agility** plus 3% crit damage (`data/gems/palette.json`,
id 32409, stat index 1 = 12).

The calibration that settles it: the **largest positive delta anywhere in the
run** is Merciless Gladiator's Maul at **+57.17 DPS** — an entire weapon swap.
The head gap is **3.6× that**. A single 12-agility gem cannot close a gap 3.6
times larger than the best whole-item upgrade the run found. Wolfshead's effect
dominates, and the warning's stated cause is correct as written.

Note also that the two flagged candidates are *not* the closest ones — Cowl of
Defiance at −222.76 has no empty meta and sits further behind. Filling the metas
would not even reorder the head slot's top three.

### Not established (unchanged from the original ticket)

- **Ret is unaffected**, by construction rather than by an explicit branch:
  `candidate-gems.ts:329` resolves `SPEC_PREFERRED_METAS["ret"]` to `[32409]`, so
  ret candidates are seated normally. Only feral and feral-tank reach the empty
  path.
- Two adjacent issues were noticed and are **out of scope here**, not filed:
  (a) `candidate-gems.ts:335-338` — if a preference *is* recorded but the id is
  missing from the palette, control falls through to a generic EP pick rather
  than the empty path; (b) `candidate-gems.ts:107-111` records that activation is
  deliberately not checked when seating ret's meta, so a ret candidate can be
  priced with Relentless's full value even when the colours would not switch it
  on — an inverse asymmetry (candidate *over*-priced) to the one this ticket
  alleges. Both are **untested** observations from reading, not measurements.

### Recommendation

Close as **works as designed**. If the scope call goes the other way and feral
should carry a meta preference, that is a separate decision about which gem to
seat and on what evidence — it needs a source for the feral meta that upstream
does not provide, and it would change ret's over-pricing question at the same
time. It is not a bug fix.

## Independent verification (2026-08-22)

Adversarial re-check of the 2026-08-21 investigation, commissioned because the
owner suspected the investigation itself might be confused rather than the
ticket. **The suspicion is partly justified.** The investigation's individual
facts are almost all correct; its *conclusion* is not supported by them,
because every measurement it made was taken on the one character whose gear
makes the defect invisible. That is the same reasoning error ticket 117 caught
and wrote up in its "Second data set" section ("on THIS artifact the bypass is
latent... any barer worn head re-exposes all 13").

All evidence below is static analysis plus probes driving the **real**
production swap path (`equipmentForCandidateSwap`, `packages/core/src/rank.ts:1955`)
against committed data. No sim binary was used and none is needed for any claim
made here. The probes were temporary and have been deleted; each is reproduced
in "Reproducing the probes" below so a reader can re-run it.

### Claim-by-claim

**Claim 1 — shredzepelin's baseline is socketless Wolfshead 8345, so nothing
was repaired on either side. HOLDS.** Confirmed against committed item data:
`socketsFor(8345)` returns `[]`. Also confirmed that `repairMeta`
(`packages/core/src/meta-repair.ts:96-99`) returns `metaAdjusted:false` early
whenever the head carries no meta socket, so `metaAdjusted=false` is forced by
the worn item and is not evidence about candidates. **This claim is true and
irrelevant to the general case** — see the verdict.

**Claim 2 — `swapItemAt` migrates a worn meta onto the candidate, so the two
sides are symmetric in general. HOLDS ONLY IN THE CASE IT NAMES; FAILS AS A
GENERAL ARGUMENT.** Measured, not read. Driving the real swap path:

| worn head | candidate | resulting candidate gems | meta socket |
| --- | --- | --- | --- |
| 32461 Gizmatic, gems `[32409, 24054]` | 30228 Nordrassil | `[24054, 32409]` | filled |
| 8345 Wolfshead (no sockets) | 30228 Nordrassil | `[24028, 0]` | **EMPTY** |
| 32461 Gizmatic, gems `[0, 24054]` (meta socket empty) | 30228 Nordrassil | `[24054, 0]` | **EMPTY** |

So meta-into-meta migration is real (row 1), but it fires only when the player
**already wears a meta gem**. The investigation then argued: "The socket is left
empty only when the player wears no meta — in which case the baseline has none
either." **That inference is false**, and it is the load-bearing sentence of the
whole investigation. The two cases are not equivalent:

- A player whose worn head has **no meta socket at all** (Wolfshead) has a
  baseline that is *complete* — the baseline is not missing anything, because
  the item has nothing to miss. The candidate is a helm that *does* have a meta
  socket, and it is priced with that socket **empty**. The candidate is
  therefore priced below what the player would actually get, while the baseline
  is priced at full value. **That is a genuine asymmetry**, and it is precisely
  the shredzepelin case the investigation used to declare there was none.
- The symmetry the investigation claimed would hold only if both sides were
  equally handicapped. They are not: the baseline loses nothing, the candidate
  loses a gem.

The investigation's own framing ("both sides are metaless, so the symmetry
invariant is already satisfied") treats "neither has a meta" as symmetric. But
one side has no *socket* and the other has an *unfilled* socket. Those differ,
and the difference is exactly the alleged under-pricing.

**Claim 3 — the empty socket is a deliberate fail-loud design. HOLDS, and is
correctly described.** `SPEC_PREFERRED_METAS` (`packages/core/src/candidate-gems.ts:152-156`)
has only a `ret` row; the feral absence is documented at length at
`candidate-gems.ts:124-151`, and the empty path is taken at
`candidate-gems.ts:334` (`if (!preferredIds) return undefined;`). Disclosure
fires at run level (`missingMetaPreferenceNote`, `candidate-gems.ts:166`) and
per row (`metaSocketUnpriced`, `candidate-gems.ts:186`, wired at
`rank.ts:1012`). **This is the one claim that genuinely settles something:** the
behaviour is intentional and disclosed, so this is a known-limitation / data-gap
issue rather than a silent scoring bug. It does not make the under-pricing stop
happening.

**Claim 4 — the 208.31 DPS head gap versus a 12-agility gem rules the
hypothesis out by 3.6x. FAILS. This is a category error, and it also understates
the gem.** Two separate defects:

1. *Wrong question.* The ticket alleges systematic mispricing **across items,
   specs and characters**. The investigation measured **one slot on one
   character** and generalised a rule-out from it. AGENTS.md: "A property
   measured against one option is not a comparison." Comparing the head gap to
   the run's best whole-item delta (+57.17, a weapon) compares two unrelated
   quantities — the weapon's delta bounds nothing about what a meta gem is worth
   in a head slot. The correct question is "how much is the omitted gem worth,
   and on how many rows is it omitted", which was never asked.
2. *Wrong value for the gem.* The investigation valued Relentless Earthstorm
   Diamond 32409 at "12 agility" by reading `data/gems/palette.json` (stat
   index 1 = 12, confirmed). But the codebase's own comment at
   `candidate-gems.ts:88-101` states that the gem's headline effect is **+3%
   critical damage**, a multiplier (`CritDamageMultiplier *= 1.03`) that
   **additive EP cannot see**, worth "roughly 0.6% of damage at 10% crit up to
   2.4% at 40%". On a ~2267 DPS baseline that is roughly 14-54 DPS *on top of*
   the agility (arithmetic on the comment's own stated percentages; the
   percentages themselves are the comment's claim, not re-derived here). The
   investigation quoted the 12-agility number from the same file whose
   neighbouring comment says that number is not the gem's value.

The 208 DPS conclusion about *Wolfshead specifically* may still be right —
Wolfshead's unique effect plausibly does dominate. But it was not established by
this argument, and it says nothing about any other row.

**Claim 5 — only 2 rows of 265 carry `emptyMetaSocket`, so the effect is tiny.
FAILS. The number 2 is a property of the feral-p2 universe, not of the code.**
Measured across every committed universe under `data/universes/` by testing
`socketsFor(itemId).includes(GemColor.GemColorMeta)` on every entry:

| universe | entries | meta-socket entries |
| --- | ---: | ---: |
| feral-p2 | 228 | **2** |
| feral-p3 | 366 | **8** |
| ret-p2 | 240 | 5 |
| ret-p3 | 391 | 13 |
| ret-p4 | 438 | 13 |
| ret-p5 | 520 | 20 |

Every one is a head. The "2 of 265" figure is simply **the total number of
meta-socket items that exist in feral-p2 at all** — it is not a measurement of
how often the defect bites, it is the size of the smallest universe the tool
ships. On feral-p3 the identical code would flag **8**, a 4x increase. The two
feral-p3 rows most likely to matter are `32235 Cursed Vision of Sargeras` and
`33672 Vengeful Gladiator's Dragonhide Helm`, both strong feral heads.

Ret is **not** affected (see observation (b)), so the exposure is: **every
meta-socket head in a feral or feral-tank universe, whenever the player does not
already wear a meta gem.**

### The two "out of scope, not filed" observations

**(a) `candidate-gems.ts:335-338` palette fall-through — REAL BUT CURRENTLY
UNREACHABLE. No ticket filed; recorded here.** The reading is correct: if a spec
*has* a `SPEC_PREFERRED_METAS` row but none of its ids is present in the
palette, the `for` loop finds nothing, control falls past the `if` block, and
the generic best-by-EP pick at `candidate-gems.ts:341-350` runs — exactly the
"arbitrary gem wearing the authority of a measurement" the comment three lines
above says must not happen. It cannot fire today: `data/gems/palette.json`
contains 18 meta-colour gems, **all phase 1 and all quality 3**, so 32409
survives both the phase filter and the rare cap (`FILL_MAX_QUALITY`) in every
phase. Verified by reading the palette directly. Latent only; it becomes live
the moment a preferred meta id is added that is not phase 1 / quality 3. A
defensive `return undefined` would be worth having, but this is a robustness
nit, not a defect.

**(b) `candidate-gems.ts:107-111` ret meta seated without an activation check,
over-pricing ret candidates — DISPROVEN. No ticket filed.** This was the
observation most likely to be the more serious bug, so it was tested rather than
read. It does not happen, because activation is enforced *downstream* of the
seating, in the meta-repair pass:

- Ret candidate helm 30131, worn head socketless, body carrying **no gems at
  all**: `equipmentForCandidateSwap` **throws `MetaInfeasibleError`** — "no legal
  recolour activates meta 32409 (Requires at least 2 Red Gems, at least 2 Yellow
  Gems, and at least 2 Blue Gems.)" (thrown at `meta-repair.ts:120`, reached via
  `repairAndMinimize` → `candidateSwapWithRepairs` at `rank.ts:1989`).
- Same setup but body wearing three red gems: repair recolours the body and
  `metaStatus` returns
  `{"kind":"active","metaId":32409,"counts":{"red":2,"yellow":2,"blue":2}}` —
  the meta is genuinely lit, and the recolours are disclosed as
  `gemSubstitutions` (`rank.ts:1009-1015`).

Both branches are correct. `rank.ts:905` and `rank.ts:1550` catch
`MetaRepairError` and record the row in `candidateSkips` / `packageSimSkips`
rather than pricing it, so a ret candidate whose meta cannot be activated is
**skipped and disclosed, never over-priced**. The comment at
`candidate-gems.ts:107-111` describes the seating step in isolation; it is
locally accurate but reads as if it were the final word, and it is not. A
docstring pointing at the repair pass would help the next reader.

### Verdict

**REAL, BUT NARROWER THAN FILED — and narrow along a different axis than the
title suggests.**

- The filed *mechanism* ("candidate priced with an empty meta while the
  baseline's meta is repaired") is **not** what happens. Where the worn head has
  a meta socket, the worn meta migrates onto the candidate and both sides match;
  the investigation established this correctly.
- The *effect* the ticket names — meta-socketed candidates systematically priced
  below what the player would actually get — **is real**, by a different route:
  a feral player who wears **no meta gem** (most obviously every Wolfshead
  wearer, which upstream's own presets say is the normal feral case) has every
  meta-socket head candidate priced with an empty meta socket, against a
  baseline that is missing nothing.
- **Blast radius: feral and feral-tank only, head slot only, every meta-socket
  head in the universe.** 2 rows in feral-p2, **8 in feral-p3**. Ret is
  unaffected. The per-row magnitude is bounded below by 12 agility and above by
  12 agility plus the crit-damage multiplier EP cannot price (the comment at
  `candidate-gems.ts:96-99` puts that at 0.6-2.4% of damage depending on crit).
  It is **disclosed** at both run and row level, which is why this is a
  known-limitation bug rather than a silent one.
- The investigation's recommendation to **close as works-as-designed is
  rejected**. "Disclosed" is not "symmetric", and the measurement offered in
  support of the close does not test the claim it was offered against.

Status stays **open**, scope sharpened to the statement above.

### What the fix requires — and why it is a decision, not a patch

There is **no code change that is obviously correct**, which is the honest
reason this ticket is hard; the investigation was right that the fix is a scope
call, even though it reached that point by the wrong route. The options:

1. **Seat a feral meta.** Requires choosing one. Upstream records none —
   `candidate-gems.ts:124-151` documents that all five vendored feral presets
   wear socketless Wolfshead. Relentless Earthstorm Diamond 32409 is the
   near-universal feral-DPS choice in TBC practice, but this repo's standard of
   evidence is "read it from the vendored presets", and that evidence does not
   exist. Seating it anyway is the "guess dressed in ret's evidence" the spike
   explicitly rejected.
2. **Handicap the baseline to match.** Price the baseline as if its meta were
   absent too. Symmetric, but it makes every number wrong in a new way and
   contradicts PLAN.md §9's repair rule.
3. **Keep the behaviour, fix the disclosure.** The current per-row flag says the
   item "was priced without any meta gem's stats or effect". It does not say the
   *baseline was not similarly handicapped*, which is the fact a reader needs in
   order to interpret the delta. Cheapest honest option.

**Recommended: option 1, with the evidence gap stated in the substitution
text** — but this is a **values call about evidentiary standards** and belongs to
the owner (see "Open question").

If option 1 is chosen, the exact change and its test:

- **Change:** add `feral` and `feral-tank` rows to `SPEC_PREFERRED_METAS`
  (`packages/core/src/candidate-gems.ts:152-156`) mapping to `[32409]`. Amend the
  comment block at `candidate-gems.ts:124-151` to record that these rows are
  sourced from community practice, **not** from a vendored preset, and that they
  are the rows in the table whose provenance differs. `missingMetaPreferenceNote`
  and `metaSocketUnpriced` then return falsy for feral automatically — no other
  code changes needed.
- **Test that pins it** (`packages/core/test/rank.test.ts`, alongside the
  existing ticket-117 block, which is the right template): drive
  `equipmentForCandidateSwap` with worn head `8345` (socketless Wolfshead),
  candidate `30228` Nordrassil Headdress, and
  `gemContext(gemsForPhase(2), feralWeights, "feral")`; assert the candidate's
  meta socket holds `32409`, that `metaStatus(socketsFor(30228), allGems).kind`
  is `"active"`, and that `metaSocketUnpriced(30228, gems, "feral")` is `false`.
  **This test is red on the current tip** — the probe above returns `[24028, 0]`
  for exactly this input — and green after the change.

If option 3 is chosen instead, the change is to `missingMetaPreferenceNote`'s
text only and the test is a string assertion, with no behavioural pin.

### Open question for the owner (values, not measurement)

**May a `SPEC_PREFERRED_METAS` row be sourced from community consensus rather
than from a vendored upstream preset?**

Everything measurable here has been measured; this is the only thing left, and
running something cannot settle it. The table's current rule is "read the meta
from that spec's upstream presets". Feral has no such preset — upstream's feral
sets wear a socketless helm — so under the current rule feral can *never* get a
row, and the under-pricing above is permanent for as long as that rule stands.
Answering "yes, with the provenance recorded" unblocks option 1 immediately.
Answering "no" makes option 3 the fix and closes this ticket as a documented
limitation.

### Reproducing the probes

Three temporary vitest files under `packages/core/test/` produced every
measurement above. They were deleted after use rather than committed — they are
probes, not pins; the pin that should be committed is the red test specified in
the fix section. To re-run, recreate them as described and run
`pnpm -C packages/core exec vitest run <file>`:

1. **Migration probe.** Call
   `equipmentForCandidateSwap(eq, SIM_ORDER.indexOf("head"), candidateId, gemContext(gemsForPhase(3), feralP1Weights, "feral"))`
   with `eq` a bare `SIM_ORDER.map(() => ({ id: 0, gems: [] }))`, head set to the
   worn item under test and chest set to `{ id: 30129, gems: [24027, 24027, 24054] }`.
   Log the head slot's resulting gems. Produces the three-row table under claim 2.
2. **Blast-radius probe.** For each non-`.report.json` file in `data/universes/`,
   parse `.entries` and count those where
   `socketsFor(e.itemId).includes(GemColor.GemColorMeta)`. Produces the six-row
   universe table under claim 5.
3. **Ret activation probe.** Same swap-path call as (1) but with
   `gemContext(gemsForPhase(3), retP2Weights, "ret")`, candidate `30131`, worn
   head `8345`, and chest either absent (throws `MetaInfeasibleError`) or
   `{ id: 30129, gems: [24027, 24027, 24027] }` (repairs to an active meta).
   Produces the two bullets under observation (b).

`pnpm verify` was **not** run: this task changed no source, and the three probe
files were removed. The working tree at the time of writing carried one
unrelated pre-existing modification
(`.scratch/carry-forward/issues/227-healer-role-items-score-above-the-feral-cutoff.md`),
untouched by this work.

## Resolution (2026-08-22)

**Fix shipped on `fix/ticket-257-feral-meta-preference`, commit `601dfd8`.**
Owner ruling, verbatim: *"if theyre based on wowsims code, leave it i guess...
but if it is just for feral dps then you can just assume relentless earthstorm
would be the chosen meta gem, ezpz, done."* Both conditions the ruling turns on
were checked and hold: the engine ranks exactly `SpecId = "ret" | "feral"`
(`feral-tank` exists only for identification, `packages/core/src/types.ts:12,20`),
so feral was the entire gap; and Relentless Earthstorm Diamond 32409 is
wowsims-sourced — it is the meta socketed in wowsims' own vendored ret presets
(`ret_p1`, `ret_p2`, `ret_p3` gear sets, plus `db.json`), not an invented value.

### The change

Added `feral` and `feral-tank` rows to `SPEC_PREFERRED_METAS`
(`packages/core/src/candidate-gems.ts:152-157`), both mapping to `[32409]` —
the same id ret's row already carried. Rewrote the block comment at
`candidate-gems.ts:115-152` that used to argue at length for leaving feral out;
it now records the owner's ruling, that 32409 is the gem wowsims' own presets
use, and keeps the substance of the ticket-142 / review-row-5-D4 warning about
growing this table when `DetectedSpecId` grows — that warning is still live,
because with all three current entries filled, the *next* spec added to
`DetectedSpecId` is exactly the case that warning is for.

### Test: red before, green after

Added `packages/core/test/rank.test.ts`, describe block
`"equipmentForCandidateSwap feral meta preference (ticket 257)"`. Drives
`equipmentForCandidateSwap` with worn head 8345 (socketless Wolfshead),
candidate 30228 Nordrassil Headdress, and
`gemContext(gemsForPhase(2), feralWeights, "feral")`, with three additional
worn pieces (21865 Soulcloth Vest, 23510 Enchanted Adamantite Belt, 21863
Soulcloth Gloves) supplying the red/yellow/blue gems Relentless needs to
activate. Confirmed genuinely red on the pre-fix tip:
`pnpm -C packages/core exec vitest run rank.test.ts -t "ticket 257"` failed
with `expected [ 24028, +0 ] to include 32409` — the candidate's meta socket
came back empty, exactly as the ticket predicted. After the `SPEC_PREFERRED_METAS`
change the same command is green: the candidate's meta socket holds 32409,
`metaStatus(...).kind` is `"active"`, and `metaSocketUnpriced(30228, gems,
"feral")` is `false`.

### Disclosure paths: now unreachable for every detectable spec, not deleted

`missingMetaPreferenceNote` and the per-row `metaSocketUnpriced` /
`emptyMetaSocket` flag both gate on `SPEC_PREFERRED_METAS[spec]` being falsy.
With `ret`, `feral`, and `feral-tank` — the entirety of `DetectedSpecId` — all
now carrying an entry, neither function's fail-loud branch can fire through
any spec the pipeline can actually detect today. The functions were **not**
deleted: they still matter the moment a new `DetectedSpecId` is added without
a row (the case ticket 142 / review row 5-D4 warned about), and the comment on
`SPEC_PREFERRED_METAS` says so explicitly. Both test suites that pinned the
old feral disclosure were rewritten rather than left to assert a now-false
behaviour or silently deleted:

- `packages/core/test/candidate-gems.test.ts`: the `SPEC_PREFERRED_METAS`
  describe block now asserts all three specs carry `[32409]`, adds a positive
  "seats the same preferred meta for feral" case, and exercises the fail-loud
  branch with a synthetic `"unlisted-future-spec"` cast through `DetectedSpecId`
  — documented inline as standing in for the next spec that table warning is
  for, since no real `DetectedSpecId` can reach that branch anymore.
- `packages/core/test/rank.test.ts`: the `rankUpgrades per-spec meta
  preference` block's feral case was inverted from "discloses the unpriced
  meta socket on a feral run" to "seats the feral preferred meta ... instead of
  disclosing an empty socket" — same shredzepelin fixture and candidate 29098,
  now asserting `emptyMetaSocket` is falsy and no `"no meta preference
  recorded"` substitution appears.

Full suite green: `pnpm -C packages/core exec vitest run rank.test.ts
candidate-gems.test.ts` — 100 passed (80 + 20), 0 failed.

### Measured effect: feral p2 and p3 rankings, before vs after

Reproduce with (pinned `vendor/wowsimcli-v0.0.119-win32-x64/wowsimcli-windows.exe`,
present locally; on a fresh worktree run `pnpm fetch:wowsimcli && pnpm
sync:wowsims` first):

```
pnpm rank --region US --realm dreamscythe --character shredzepelin --offline \
  --spec feral --max-phase 2 \
  --report .scratch/rank-reports/ticket257-shredzepelin-after-p2.html
pnpm rank --region US --realm dreamscythe --character shredzepelin --offline \
  --spec feral --max-phase 3 \
  --report .scratch/rank-reports/ticket257-shredzepelin-after-p3.html
```

**p2 head-slot deltas, before (pre-fix, already-committed
`.scratch/rank-reports/ticket257-shredzepelin.json`) vs after:**

| candidate | before Δ DPS | after Δ DPS | change | emptyMetaSocket before → after |
| --- | ---: | ---: | ---: | --- |
| 30228 Nordrassil Headdress | −208.31 | **−174.61** | **+33.70** | true → (absent) |
| 29098 Stag-Helm of Malorne | −213.74 | **−171.69** | **+42.05** | true → (absent) |

Both meta-socket head candidates moved up by 30-40 DPS and swapped relative
order (29098 is now closer to Wolfshead than 30228, the reverse of before).
The run-level `gems.meta-preference` substitution
(`"no meta preference recorded for feral — ..."`) is present in the before
JSON's `ranking.substitutions` and absent in the after JSON. The "No positive
candidate in head" plausibility warning still fires in the after run — the
fix corrects pricing, it does not claim to flip that warning, which the
2026-08-21 investigation already argued is dominated by Wolfshead's unique
effect (a claim about magnitude this fix does not revisit).

**p3 head-slot rows, after only** (no pre-fix p3 run exists to diff against —
the original investigation only ran p2). All 8 meta-socket heads named in the
task brief are present and none carries `emptyMetaSocket`:

| candidate | after Δ DPS |
| --- | ---: |
| 32235 Cursed Vision of Sargeras | −147.75 |
| 33672 Vengeful Gladiator's Dragonhide Helm | −152.42 |
| 31039 Thunderheart Cover | −162.51 |
| 29098 Stag-Helm of Malorne | −171.69 |
| 30228 Nordrassil Headdress | −174.61 |
| 32240 Guise of the Tidal Lurker | −228.34 |
| 32329 Cowl of Benevolence | −234.15 |
| 32525 Cowl of the Illidari High Lord | −235.71 |

32235 Cursed Vision of Sargeras is now the closest head candidate to
Wolfshead of any row in the pool (meta-socketed or not) — before the fix it
would have been priced with an empty socket like the other seven.

Report files (`.scratch/rank-reports/ticket257-shredzepelin-after-p2.{html,json,stdout.txt}`,
`ticket257-shredzepelin-after-p3.{html,json,stdout.txt}`, and a preserved copy
of the pre-fix p2 JSON at `ticket257-shredzepelin-before-p2.json`) are
gitignored (`.scratch/rank-reports/*`) and were not committed, matching how
the original investigation's own re-run was handled.

### `pnpm verify`

Green. Full output includes: typecheck, lint, format, all 46 test files / 861
tests passed (1 skipped, 2 todo — pre-existing, unrelated to this change), and
every data-pipeline check (`sim-defaults`, `skeleton`, `boss-aliases`,
`atlasloot`, `rep-tables`, `wowhead-prose`, `curated-set-phase`, `mirrors`,
`lock-merge`, `sync-wowsims`, `feral-skeleton-apl`, `sim-implemented-effects*`,
`engine-port-drift`, `upstream-drift`).

Not merged to `dev`. Branch `fix/ticket-257-feral-meta-preference` stops here
per instruction; tickets 227 and 234 were not touched.
