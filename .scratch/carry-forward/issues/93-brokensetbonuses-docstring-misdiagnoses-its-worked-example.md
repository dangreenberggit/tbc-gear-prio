Status: closed
Type: docs
Origin: set-bonus 4pc-invisible investigation, 2026-08-10 (`.scratch/set-bonus-value/break-confound-correctability.md`); widened 2026-08-10 from the adversarial audit (`.scratch/set-bonus-value/audit-2026-08-10-numbers.md`, C6)
Blocks: none
Blocked by: none

# brokenSetBonuses docstring misdiagnoses its worked example

The `brokenSetBonuses` docstring in `packages/core/src/set-value.ts:220-234`
states that a broken bonus is "charged once inside `packageDelta` but twice
across `Σ singles`" as a general property. This only holds when `k=2` (k =
number of package slots that displace a piece of the broken set) — see
ticket 90 for the derivation:

```
bonus_reported = bonus_true + (k-1)·B
```

At `k=1`, the single charge inside `packageDelta` and the single charge
inside `Σ singles` cancel exactly — no inflation at all. The docstring's
"charged twice" framing is the `k=2` special case, stated as if universal.

## This is not merely a misapplied example — the docstring's general claim is false

The adversarial audit derived the mechanism directly from `computeSynergy`
(`set-value.ts:332-345`) and confirmed algebraically and numerically that
the lost bonus is charged **k times, not twice**, for any k. Let B be the
broken bonus's DPS, T the true set bonus, k the package pieces landing on
slots held by the broken set:

- `reported = packageDelta − Σ singles = T + k·B − B·[k≥1]`
- i.e. `reported = T + (k−1)·B` for k≥1, and `reported = T` exactly for k=0.

Numerically verified (B=116, T=20, n=4): k=0 → 20.00, k=1 → **20.00** (exactly
zero inflation), k=2 → 136.00, k=3 → 252.00, k=4 → 368.00 — matching the
closed form at every k. **k=1 yields exactly zero inflation, not "half the
usual amount" or any other partial effect** — the docstring's "twice" is
accidentally correct only for the k=2 case sitting in front of it in the
worked example, not a general property that happens to be mis-stated. A
reader who generalises "twice" to, say, k=3 (expecting `2B` of inflation)
would be equally wrong: k=3 gives `2B` too, but for k=4 it gives `3B`, not
`2B`. The docstring's wording implies a constant, and there is no constant —
the multiplier is `(k−1)`, which the docstring never names.

## The worked example is misdiagnosed

The docstring cites `verification.md` V0b as "exactly this bug". V0b's
package was head(31039)/shoulder(31048)/hands(31034)/legs(31044), against
gear wearing Malorne at chest **and** shoulder — only the shoulder is in the
package, so `k=1`. By the algebra above, **V0b's +91.68 was not inflated by
the Malorne break confound at all**. Its caveat block
(`verification.md:52-60`) misdiagnoses the mechanism: it correctly states
"charged twice in `Σ singles`, once in `packageDelta`" for the general k=2
case but applies it to a k=1 run, where the two charges cancel.

The V0b(+91.68) → V0c(+20.89) comparison, cited elsewhere as evidence the
confound is large, is **not evidence of this confound at all** — V0b and
V0c measure two different sets' different bonuses (Thunderheart 4pc vs
Malorne 4pc), not the same bonus with and without the break. This
comparison should not be used to argue confound magnitude anywhere it
currently is.

## Fix

Update both:
- The `brokenSetBonuses` docstring at `packages/core/src/set-value.ts:220-234`
  — state the `(k-1)·B` relationship, note k=1 produces zero inflation, and
  either drop the V0b citation or correct it to note V0b is the k=1
  (unconfounded) case.
- The corresponding passage in `.scratch/set-bonus-value/verification.md`
  — V0b's caveat block (`verification.md:52-60`).

## Related gap

`docs/adr/` contains nothing on set bonuses (a grep for `set bonus|setBonus`
over `docs/adr/` and `CONTEXT.md` returns nothing per the design review).
The threshold-selection rule has now been decided once (spec.md §2.3) and
mis-remembered once (this docstring). If tickets 90/91 land, an ADR should
close that gap.


---

## Disposition (2026-08-10) - FIXED, commits `2e0b499` and `915e3a3`

`2e0b499` (comments and docs only, no behaviour change):

- The `brokenSetBonuses` docstring now states the closed form. It defines `B`,
  `T` and `k`, records that `packageDelta` charges `k*B` while `Sum singles`
  charges `B*[k>=1]`, giving `reported = T + (k-1)*B`, and says explicitly that
  the inflation is not a constant: `k=0` and `k=1` both report `T` exactly (at
  k=1 the two charges cancel) and only `k>=2` inflates.
- The V0b citation is corrected rather than dropped - it now reads as the `k=1`
  case, unconfounded despite the break - and the "no sim can separate the two"
  caveat is narrowed to `k>=2` where it actually applies.
- `verification.md`: V0b's heading and caveat block rewritten, the post-table
  sentence corrected, and the V0c conclusion - which had cited the
  20.89-vs-91.68 gap as "direct evidence that V0b's confound mattered" -
  reversed, since those two runs measure different sets' bonuses, not one bonus
  with and without a break. The "Production consequence (finding 8)" paragraph
  was re-anchored on the general `k>=2` case, because it had justified the whole
  feature on V0b's now-absent confound.

`915e3a3` additionally fixed the same stale citation in `formatBreaksSuffix`'s
JSDoc (`rank-report-rules.ts`), which pointed at "verification.md V0b vs V0c"; it
now points at the `(k-1)*B` closed form on `brokenSetBonuses`.

### Related gap - still open

This ticket's closing note asks for an **ADR on set bonuses** once 90/91 land.
Both have now landed (`283dd0b`, `915e3a3`) and `docs/adr/` still contains
nothing on set bonuses. The threshold-selection rule has been decided once
(spec.md 2.3) and mis-remembered once (this docstring). **Not written here** -
worth its own ticket.
