Status: closed
Type: investigation
Origin: SME rank review, 2026-08-10 (`.scratch/set-bonus-value/sme-review-2026-08-10.md`, G1/Q1)
Blocks: none
Blocked by: none

# no independent plausibility band for set bonus magnitudes

Every estimate of the Thunderheart (T6) 4pc produced so far — 78, and the
100–145 range spanning both sides of ticket 92's disagreement — is derived
by subtracting a correction from the engine's own reported 193.89
(`sme-review-2026-08-10.md` G4, "Consequence for the pipeline"). That is
circular: if 193.89 is wrong for a reason nobody has identified yet, every
"corrected" value inherits the same error, because all of them start from
it.

The SME review derived a band from the game mechanic itself — what the
bonus actually does, independent of the engine's output — which is the only
estimate in this investigation not anchored to 193.89.

## The independent band

`sme-review-2026-08-10.md` G1: T6 feral 4pc is a `SpellMod_DamageDone_Flat
+0.15` on `Rip | Swipe | FerociousBite` (per `verification.md:144`, itself a
hand-transcription — see caveat below).

The SME checked what the APL actually casts rather than assuming:

```
python -c "import json,re; s=open('vendor/wowsims/feral_default.apl.json').read(); \
print(sorted(set(int(x) for x in re.findall(r'\"spellId\"\s*:\s*(\d+)',s))))"
```

This confirmed two things that bear directly on the bonus's value:

- **Ferocious Bite is the APL's default 5-combo-point finisher** for every
  finisher after the first Rip (action 4 of 12) — not a fringe or skipped
  cast, contrary to standard TBC feral practice of avoiding Bite.
- **Swipe is absent from the APL entirely.** The Swipe component of the
  3-ability modifier contributes nothing in this rotation.

So two of the three buffed abilities (Rip, Ferocious Bite) are live, one
(Swipe) is dead weight. A +15% modifier on abilities covering roughly a
30% damage share works out to **~4.5% of total DPS, centred near 95 DPS**,
with a defensible band of **~60–120 DPS**.

**Domain-knowledge-unverified-against-repo, carried verbatim from the
source:** the SME states plainly that it did not read a damage breakdown
and that the ~30% Rip+Bite damage-share figure is recall, not measurement —
"the single number most worth replacing with a real breakdown, since the
whole G1 band rests on it" (source, "What I did not check"). The SME also
flags, separately and also unverified, that T6 feral 4pc was in reality
"mostly a threat/bear and AoE bonus with a modest cat single-target
component" and was never regarded as a huge cat DPS gain in TBC. Neither
claim should be upgraded to established fact by this ticket or by any
ticket downstream of it.

## Why this matters — a falsification test, not a number to ship

This ticket does not produce a number of its own. It exists to be **checked
against** ticket 92's result once that sim runs. Ticket 92's deciding sim
(swap one Malorne piece for a stat-identical non-set item, measure directly)
will produce a corrected 4pc figure via `193.889 − (k-1)·B`. When that
figure exists:

- If it lands inside ~60–120, the single-scalar-toll model (`bonus_reported
  = bonus_true + (k-1)·B`, ticket 90) is corroborated by an independent
  line of evidence.
- If it lands outside ~60–120, the single-scalar-toll model is wrong and
  something else is still inflating 193.89 beyond the break confound —
  this is exactly the open question ticket 92 itself raises but cannot
  answer with algebra alone (see `92-measure-malorne-2pc-to-de-confound-break-savings.md`,
  "The reconciliation test that distinguishes them").

Record that purpose explicitly wherever this ticket is picked up: it is a
falsification test against 92's output, not a competing estimate to average
in.

## Sourcing gap this ticket surfaces

`sme-review-2026-08-10.md` verified directly that **`vendor/wowsims/db.json`
carries no set-bonus text at all** — no `itemSets`/`setBonuses` keys, no
`2pc`/`4pc` strings anywhere in the 3MB file. Every set-bonus mechanic used
anywhere in this investigation (this ticket, tickets 90/92/93/94/96, the
handoff) traces to a single source: `.scratch/set-bonus-value/verification.md`
V1's hand-transcription of the pinned Go source
(`sim/druid/item_sets.go` at pin `8aa378b3671a0923fd11fb34b4b3753e53f20c9b`).

Nothing currently checks that V1 still matches the pinned Go source. If V1
has drifted — a typo in transcription, a stale re-pin that moved the Go
source underneath it, anything — every plausibility judgement in this
investigation, including this ticket's own 60–120 band, moves with it. This
is a real gap, not a hypothetical one: no diff or re-verification against
`sim/druid/item_sets.go` at the pin has been run as part of this
investigation.

## Suggested order

Most useful **after** ticket 92 produces its corrected figure — this ticket
is the check, not a prerequisite. Not blocked by 92 mechanically (the band
above is already derivable today), but reading it before 92 lands gives a
number with nothing yet to test it against.


---

## Disposition (2026-08-10) — BAND HELD; both gaps closed by measurement

### The falsification test PASSED

This ticket's purpose was to be checked against a measured 4pc, not to produce a
number. The measurement now exists (ticket 99): **Thunderheart 4pc = 73.5 ± 6.3
DPS**, measured in isolation on `feral_p3_9p`.

73.5 lands **inside** this ticket's mechanically-derived 60–120 band, on the low
side of its ~95 centre. Per this ticket's own stated criterion, that
**corroborates** the model: an estimate derived from the game mechanic alone and
a direct simulation agree, and the engine's reported 193.89 (~9.0% of baseline)
is confirmed as the outlier.

### Sourcing gap CLOSED — V1's transcription verified against the pin

The ticket flagged that nothing checked `verification.md` V1's hand-transcription
against the pinned Go source, and that every plausibility judgement moves with it.
Diffed directly:

```
cd .scratch/wowsims-tbc-new-src && git rev-parse HEAD
# -> 8aa378b3671a0923fd11fb34b4b3753e53f20c9b, matches data/wowsims.lock.json
sed -n '77,116p;222,250p' sim/druid/item_sets.go
```

- **Thunderheart 4pc** — `SpellMod_DamageDone_Flat +0.15` on
  `DruidSpellRip | DruidSpellSwipe | DruidSpellFerociousBite`. **Accurate.**
- **Thunderheart 2pc** — Mangle (Cat) `PowerCost_Flat −5`, Mangle (Bear) threat
  `+15%`. **Accurate.**
- **Malorne 2pc** — 4% on `ProcMaskMelee`, `OutcomeLanded`, +20 energy in Cat.
  Accurate as far as it goes, but V1 does not record two load-bearing details:
  `ProcMaskMelee` is `ProcMaskMeleeWhiteHit | ProcMaskMeleeSpecial`
  (`sim/core/flags.go:78`) and the trigger has **no ICD**. Both matter — see below.
- **Malorne 4pc** — +30 Strength in Cat Form. **Accurate.**

No drift. The band does not move.

### The recalled ~30% damage share CONFIRMED by measurement

The ticket named this "the single number most worth replacing with a real
breakdown, since the whole G1 band rests on it". Measured from the run's own
per-spell output:

| ability | share |
|---|---|
| Shred | 35.30% |
| white melee | 28.96% |
| **Rip** | **21.18%** (buffed) |
| **Ferocious Bite** | **8.99%** (buffed) |
| Mangle (Cat) | 5.49% |
| Swipe | 0.00% |

**Rip + Ferocious Bite + Swipe = 30.16%.** The recalled ~30% was right. Swipe's
absence from the APL is confirmed independently (no spellId 27006 in
`vendor/wowsims/feral_default.apl.json`).

```
python -c "
import json
d=json.load(open('.scratch/set-bonus-value/sims/A4-11.json'))
p=d['raidMetrics']['parties'][0]['players'][0]
tot=buffed=0
for a in p['actions']:
    dmg=sum(t.get('damage',0)+t.get('tickDamage',0) for t in a.get('targets',[]))
    tot+=dmg
    if a['id'].get('spellId') in (27008,24248,27006): buffed+=dmg
print(f'{buffed/tot*100:.2f}%')"
```

A naive `0.15 × 30.16% × 2441.74 ≈ 110 DPS` overshoots the measured 73.5, as
expected: the +15% applies to base damage while much of the observed damage is
crit-inflated and multiplied by other effects, so share-times-modifier is an
upper bound. **Labelled reasoning, not measurement.**

### The SME's *other* unverified claim did NOT hold

The ticket carried forward, explicitly unverified, the SME's view that the T6
feral 4pc was "never regarded as a huge cat DPS gain". At 73.5 DPS (~3.4% of
baseline) it is a solid single-target cat bonus, not a threat/bear curiosity.
More importantly the SME's mechanical estimate for the **Malorne 2pc** (15–40)
was refuted outright by direct measurement at **131.1 ± 6.6** (ticket 92). The
proc mask and missing ICD that V1 did not record point the right way but do
**not** account for the size — the measured proc rate is 3.66/min, close to the
SME's own assumption — so *why* the bonus is that large remains open (ticket 92,
"Unresolved anomaly"). The durable lesson stands regardless: domain reasoning
that is not checked against the source, and not measured, can be confidently
wrong in either direction.
