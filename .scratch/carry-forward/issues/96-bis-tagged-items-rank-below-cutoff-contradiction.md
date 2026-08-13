Status: closed
Closed: e3eceb3
Type: bug
Origin: SME rank review, 2026-08-10 (`.scratch/set-bonus-value/sme-review-2026-08-10.md`, G5)
Blocks: none
Blocked by: none, but may dissolve if 90/92 resolve — see below

# BiS-tagged items rank below cutoff (contradiction)

Both upstream curated P3 gear sets (`vendor/wowsims/feral_p3_6p.gear.json`,
`vendor/wowsims/feral_p3_9p.gear.json`) equip exactly four Thunderheart
pieces — shoulder 31048, chest 31042, hands 31034, legs 31044 — giving a
live T6 4pc. Both curated sets carry **zero** T4 (Malorne) and **zero** T5
(Nordrassil) pieces.

Our engine tags 31042 and 31048 `bisTags: ["BiS"]` (they appear in the
curated upstream set, which is how the BiS tag is derived) while ranking
them at −100.16 and −106.16 DPS respectively — below cutoff. The same row
simultaneously asserts "this is best in slot" and "this is a ~100 DPS
downgrade". Verify:

```
node -e "const j=require('./.scratch/rank-reports/shredzepelin-p3.json');for(const id of [31042,31048]){const i=j.ranking.items.find(x=>x.itemId===id);console.log(id,i.name,i.deltaDps.toFixed(2),JSON.stringify(i.bisTags))}"
```

## Why this matters

This is visible in the UI now and is the most user-facing symptom of the
underlying set-bonus measurement questions (tickets 90, 92). A player
reading the report sees a "BiS" badge on an item ranked near the bottom of
its slot, with no reconciling explanation.

## Disposition depends on 90/92

Whether the fix belongs in ranking (the −100/−106 figures are wrong,
per the unresolved B estimate in ticket 92) or in display (BiS tagging and
numeric rank should not contradict regardless of the true DPS value) is not
yet decided. This ticket may **dissolve** rather than resolve — if 90/92
land and the underlying Malorne-break toll is corrected or disclosed
properly, the −100/−106 figures may no longer contradict the BiS tag, and
no separate display fix would be needed. Do not treat this as guaranteed
independent work; re-check after 90/92 before starting.


---

## Disposition (2026-08-10) — does NOT dissolve, but the cause is now measured

The ticket predicted this might dissolve once 90/92 landed. **It does not.**
Ticket 90 (landed, `283dd0b`) suppresses a break-confounded *bonus* from the
sort key and cutoff; it does not touch a row's raw `deltaDps`. The two figures
that create the contradiction are unchanged:

```
node -e "const j=require('./.scratch/rank-reports/shredzepelin-p3.json');for(const id of [31042,31048]){const i=j.ranking.items.find(x=>x.itemId===id);console.log(id,i.name,i.deltaDps.toFixed(2),JSON.stringify(i.bisTags))}"
# 31042 Thunderheart Chestguard -100.16 ["BiS"]
# 31048 Thunderheart Pauldrons  -106.16 ["BiS"]
```

### Both sides of the contradiction are CORRECT

Measurement (ticket 92) resolves what was previously an open question:

- **The Malorne 2pc is worth 131.1 ± 6.6 DPS** on a T4-era reference set.
- Chest and shoulder are the only two slots whose worn item belongs to a set, so
  **every** single-swap candidate in those slots breaks the 2pc and forfeits
  ~131 DPS. A −100 delta on a strictly-better item is therefore **arithmetically
  right**, not a measurement fault.
- The **BiS tag is also right**: upstream's curated P3 set equips all four
  Thunderheart pieces, and the completed package (Thunderheart 2pc 30.5 + 4pc
  73.5 ≈ 104 DPS, ticket 99) genuinely beats the Malorne 2pc it replaces.

So the row is not lying twice — it is reporting a **single-swap** number next to
a **package** judgement. The contradiction is a framing mismatch, not a bug in
either number.

### Consequence: this is ticket 91's job, not a separate display fix

The reconciling disclosure this ticket asks for is exactly what ticket 91's
**package-as-card** treatment provides: the Set potential panel names the
completing items (`packageItemIds`) and shows the package's value, which is where
a "BiS but −100 alone" item becomes legible. No separate per-row mechanism should
be built.

**Remaining work:** confirm, once ticket 91's panel is in place, that a reader
landing on a BiS-tagged negative row can reach the package explanation. If they
cannot, add a short row-level pointer to the Set potential panel — a pointer, not
a recomputed number. Keeping this ticket open for that check.

**Do NOT** "fix" this by correcting the −100/−106 figures. They are correct, and
ADR-0020 (absolute cutoff) forecloses moving the bar to surface these rows.

---

## Closed (2026-08-10) — pointer added, `e3eceb3`

The confirmation step this ticket was held open for: **the reader could not
reach the explanation by default.**

What a default reader saw on the 31042 row before this commit:

- the `BiS` tag,
- `-100.16 DPS`,
- `setBonusNote` = "breaks 2-piece Malorne Harness (below 2)" — ungated, and the
  half of the reconciliation that explains *why the number is negative*.

What they could not reach: anything explaining what the BiS tag was claiming.
The per-row set-potential annotation is gated on `withSetPotential`
(`rank-report.ts`), and the Set potential panel — unblocked by carry-forward 100
in `b51f08c` — renders elsewhere on the page with nothing on the row linking to
it.

So the answer to "is it reachable" was **no**, and the minimal per-row pointer
this ticket authorised was added: `formatCuratedPackagePointer` in
`rank-report-rules.ts` renders

```
BiS as part of Thunderheart Harness, not as this swap alone — see Set potential
```

on any curated-BiS row that is below cutoff and carries a `setContext`. It is a
pointer only — no figure is restated, per this ticket's own "a pointer, not a
recomputed number" and carry-forward 90's suppression rule. The `-100.16` and
`-106.16` deltas are untouched, as this ticket required.

Verify:

```
cd packages/core && npx vitest run test/rank-report.test.ts -t "points a below-cutoff curated row"
```

Red confirmed before green. Full suite: `pnpm verify` green, 623 tests.
