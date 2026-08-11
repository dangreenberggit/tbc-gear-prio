# Gear snapshot provenance — is the shredzepelin fixture the wrong fight?

Investigation, 2026-08-10, branch `feat/set-bonus-value`. Read-only on
production source; nothing under `packages/`, `data/`, or `test/fixtures/`
was modified.

## Headline

**The wrong-fight theory is refuted.** The fixture the pipeline uses today is
already the corrected, DPS-fight snapshot — the fix the owner remembers exists,
was applied on 2026-08-08, and is still in place. The 10-of-17 slot difference
against the owner's export is **not** a tank-set-vs-DPS-set difference. It is
**gear progression**: the owner's export is uniformly higher item level, from a
later raid phase, than the fight our fixture was captured from.

The owner's memory is accurate — it just describes the *previous* fixture, which
is still on disk under a different name.

## 1. Where the snapshot comes from

| thing | value |
|---|---|
| fixture in use | `test/fixtures/shredzepelin-cat.raw.json` |
| bound at | `packages/core/src/cli.ts:340` (`FERAL_FIXTURES`) |
| capture route | Warcraft Logs report, via `scripts/capture_fixture.py` |
| report code | `YwahQLgv2jBrZGn6` |
| fight | id **63**, **Void Reaver**, kill, difficulty 3 |
| player | `Shredzepelin`, sourceID 21 |
| introduced by | commit `78ca9af`, 2026-08-08 17:10:39 -0700 |
| touched since | never — `78ca9af` is the only commit on this path |

Re-runnable:

```
git log --oneline --follow -- test/fixtures/shredzepelin-cat.raw.json
python -c "import json; d=json.load(open('test/fixtures/shredzepelin-cat.raw.json')); print(d['report_code'], d['fight'])"
```

The `GearSource` seam is not doing live fetching here — the CLI hard-binds a
committed fixture per character (`FERAL_FIXTURES`), so "which fight" is a
**commit-time human choice**, not runtime selection logic. That matters for the
fix shape (§5).

Three shredzepelin fixtures exist, all from the same report `YwahQLgv2jBrZGn6`:

| file | fight | armor | stamina | salvation |
|---|---|---|---|---|
| `shredzepelin-cat.raw.json` **(in use)** | 63 Void Reaver | 4705 | 615 | Hand of Salvation, **100%** |
| `shredzepelin.raw.json` (regression fixture) | 39 Morogrim Tidewalker | 6027 | 810 | **none** |
| `shredzepelin-bear.raw.json` | 33 Fathom-Lord Karathress | 23239 | 1313 | none (bear) |

## 2. The past fix — it exists, and it held

Ticket **06** (`.scratch/phase-2/issues/06-shredzepelin-gear-incorrect.md`,
Status: closed) is exactly the work the owner remembers. Landed as `78ca9af`,
"Read shredzepelin's cat gear from a DPS fight, not the off-tank one".

What it did:

1. **Re-snapshotted** from Void Reaver instead of Morogrim. The commit message
   records that all ten kills in the report were probed for form uptime and
   salvation; Void Reaver was chosen at 98.8% cat (nearest to Morogrim's 99.1%)
   so the tank-vs-DPS variable moved alone. Baseline moved 1917.50 → 2067.99.
2. **Kept the Morogrim fixture** deliberately, renamed/rebound as `offtank`, as
   the regression case for the warning — "calling it `cat` is what made the
   wrong fight easy to keep using".
3. **Shipped a detector** — `salvationUptimeOf` in `packages/core/src/spec.ts:204`
   and the warning text in `packages/core/src/disclosure.ts:196`: *"no Blessing
   of Salvation on this fight — were you off-tanking… this gear is not your DPS
   set."*
4. **Fixed a live hole in that detector**: `SALVATION_AURAS` originally knew only
   the two Blessings, but this raid used **Hand of Salvation**, a separate spell.
   A clean DPS fight scored 0 and drew the exact false warning the ticket
   existed to prevent. All three names are now in the set.

Evidence trail: `docs/verification-log.md` lines ~1328–1540.

**Did it regress?** No. Verified directly:

```
python -c "
import json
c=json.load(open('test/fixtures/shredzepelin-cat.raw.json'))
tt=c['buffs_table']['data']['totalTime']
for a in c['buffs_table']['data']['auras']:
    if 'alva' in str(a.get('name')): print(a['name'], a['totalUptime'], '/', tt)
"
```

gives `Hand of Salvation 158369 / 158369` — **100% uptime**. The same probe on
`shredzepelin.raw.json` returns an empty list. The detector fires on the old
fixture and stays quiet on the current one, which is the intended behaviour.

## 3. The owner's tells, checked against the data

| tell | verdict on the **current** fixture | verdict on the **old** Morogrim fixture |
|---|---|---|
| "no Blessing of Salvation" | **False** — Hand of Salvation, 100% uptime | **True** — zero salvation auras |
| "tankier gear" | **False** — see stat table below | **True** — armor 6027 vs 4705, stamina 810 vs 615 |
| "backup-tank fight" | **False** — Void Reaver | **True** — Morogrim, per ticket 06 |

Every tell the owner names is a true statement about `shredzepelin.raw.json`
and a false one about `shredzepelin-cat.raw.json`.

### The 10 differing slots are progression, not tanking

Resolved against the pinned `vendor/wowsims/db.json`:

| slot | fixture (Void Reaver) | ilvl | owner's export | ilvl |
|---|---|---|---|---|
| neck | Amulet of Bitter Hatred (278827) | 128 | Telonicus's Pendant of Mayhem (30017) | 138 |
| back | The Frost Lord's War Cloak (278819) | 128 | Thalassian Wildercloak (29994) | 138 |
| waist | Girdle of the Deathdealer (29247) | 110 | Belt of One-Hundred Deaths (30106) | 138 |
| legs | Skulker's Greaves (28741) | 115 | Leggings of Murderous Intent (29995) | 138 |
| finger1 | Ring of Lethality (30052) | 128 | Band of the Ranger-General (29997) | 138 |
| finger2 | Shapeshifter's Signet (30834) | 100 | Ring of Lethality (30052) | 128 |
| trinket | Hourglass of the Unraveller (28034) | 112 | Tsunami Talisman (30627) | 128 |
| weapon | Terestian's Stranglestaff (28658) | 115 | Merciless Gladiator's Maul (32014) | 136 |
| relic | Everbloom Idol (29390) | 110 | Idol of the Raven Goddess (32387) | 115 |

**Every single differing slot is an ilvl increase in the owner's favour**, and
five of nine move from phase 1 to phase 2 items. Not one slot in the fixture is
a stamina/armor-leaning tank piece that the export replaces with a DPS piece —
that is the signature the tank-set theory predicts, and it is absent.

Aggregate stat comparison over the 16 resolvable slots (owner minus fixture):
agility **+26**, attack power **+181**, crit rating **+113**, armor **+117**,
strength **−40**, hit rating **−47**. That is a straightforward "more of
everything that matters, traded a little strength/hit for crit" upgrade
profile, not a tank-to-DPS reprofile. Compare the tanking signature on the
Morogrim fixture: **+1322 armor and +195 stamina** in-fight versus Void Reaver.

Reproduce with the per-slot script recorded in
`.scratch/set-bonus-value/loop-103-106/06-owner-settings-diff.md` §"The gear",
or the ilvl variant used above (item stats read from
`vendor/wowsims/db.json` `scalingOptions`).

## 4. So what *is* wrong

The fixture is **stale**, not mis-selected. It is a faithful snapshot of a
correct DPS fight — from an earlier point in the character's progression than
the owner is playing now. The whole ranking pipeline measures every candidate
delta against this baseline (`cli.ts:340`), so the report is advising a
better-geared player using a worse-geared baseline.

The 103/106 loop already priced this: the gear difference is worth −7.9 DPS on
the T6 package delta and +4.49 on the CURSED−VENG helm ordering
(`.scratch/set-bonus-value/loop-103-106/06-owner-settings-diff.md`, Part 2).
Real, but small relative to the rotation difference (+31) that loop also found.

Ticket **108** covers a narrower slice of the same fixture: the two out-of-range
ids `278827` / `278819` in neck and back. Both of those slots are among the ten
that changed, so a re-snapshot would incidentally retire them — but it would not
retire the underlying silent-resolution bug 108 describes, which is about the
id mapping, not about which fight was captured. **They are separate; 108 stays
as it is.**

## 5. Fix shape (described, not implemented)

Filed as ticket **110**. Summary:

- **Re-snapshot** `shredzepelin-cat.raw.json` from a recent DPS fight in the
  owner's current gear (or accept the owner's `IndividualSimSettings` export as
  a gear source directly — note ticket 72 records that no
  `IndividualSimSettings` → `RaidSimRequest` lift exists yet).
- **Selection logic is not the gap.** The salvation/form detector already works
  and already fires correctly. Adding more selection cleverness would not have
  caught this, because staleness is invisible to a within-report check — every
  fight in report `YwahQLgv2jBrZGn6` is equally stale.
- What *would* catch it: a **freshness signal**. The disclosure line already
  prints the fight name; it should also print the capture date, and the report
  should say how old the snapshot is so a stale baseline is visible rather than
  silent. **Hypothesis, untested**: this is the cheapest guard, since fixture
  selection is a commit-time human choice and no runtime code path can re-pick.

## Open, not chased

- Whether the owner's export corresponds to a specific logged fight (it is a
  settings export, not a log capture, so it carries no fight id). **Untested.**
- Whether re-snapshotting closes the remaining +87.6 vs +97 residue on 103 —
  the 103/106 loop attributes most of that residue to rotation, not gear, and
  ticket 109 covers the rotation import. **Untested.**
