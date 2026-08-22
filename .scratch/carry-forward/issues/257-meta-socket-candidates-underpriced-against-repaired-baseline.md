Status: open (investigated; recommendation is close as works-as-designed -- the
  close is a scope call, left to the owner)
Type: bug (as filed) -- investigation 2026-08-21 did not reproduce the asymmetry;
  see Investigation below
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

- [x] Decide whether candidates should carry a repaired meta, or the baseline
      should be priced without one — the two sides must match, either way.
      **Decided: they already match. No code change.** See below.
- [x] Re-run shredzepelin's feral p2 ranking and report whether the head warning
      survives. **It survives, and is correctly attributed as-is.**
- [x] If the warning survives, update its stated cause to name both contributors.
      **Not done, deliberately — the measurement shows there is no second
      contributor.** Naming one would write a false cause into the product.

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
