# Close Phase 0 — the last two gate boxes

**Status:** resolved
**Blocks:** all of Phase 1. PLAN.md §14: no phase starts until the previous gate is
written into `docs/verification-log.md`.
**Estimate:** one sitting. Both boxes are exercises against `wowsimcli` and share
all their setup, so do them together.

---

## Where things stand

Everything readable from Warcraft Logs or from `db.json` is settled and recorded in
[`docs/verification-log.md`](../../docs/verification-log.md). Closed in the last
sitting: the 19→17 slot mapping (both directions), the enchant/gem ID namespace,
the content-tier default, and race (closed as a **negative** — not retrievable).

**Neither remaining box has ever been exercised.** The Phase 0 probe stopped at
reading WCL. These two are the half that proves the *whole* Phase 0 premise: a
readable payload we can't feed to the sim de-risks nothing.

Prerequisite for both: **`wowsimcli` is not vendored yet.** That's step 0.

---

## Box 1 — real logged ret gear produces a valid `RaidSimResult`

Hand-compose a `RaidSimRequest` from `slamaltman`'s actual logged gear and run it
through the pinned binary.

The fixture is already on disk: `test/fixtures/slamaltman.raw.json` (25 combatants
+ buffs table). `scripts/verify_fixture.py` already resolves it against `db.json`.

**Done when:** a `RaidSimResult` comes back with a plausible DPS number, and the
result is committed as a `RecordedSimRunner` fixture.

### Things already known that will bite here

- **The slot array is drop *and* reorder.** WCL gives 19 client-order entries; the
  sim wants 17 in its own order. A filter-only implementation gets **11 of 17
  positions wrong** and throws no error — you get a valid request and a wrong
  number. The verified mapping is in PLAN.md §8.4, and
  `scripts/verify_fixture.py` prints it. Port that assertion, don't rewrite it.
- **Enchants are `effectId`, not item ID.** Verified: WCL's `permanentEnchant`
  matches `tbc-new`'s `effectId` namespace directly, no conversion. `3003` is
  Glyph of Ferocity in both.
- **`temporaryEnchant` is a consumable**, a different namespace. slamaltman's
  `2713` does not resolve against `db['enchants']` and shouldn't.
- **`IndividualSimSettings` ≠ `RaidSimRequest`.** Different protobuf messages.
  Whatever you hand-compose here is a `RaidSimRequest`. PLAN.md §8.2.
- **Meta gem.** slamaltman is wearing `32409` Relentless Earthstorm Diamond. The
  Go sim does **not** enforce meta activation (PLAN.md §9) — if the composed
  request has an inactive meta, the sim will happily return a number anyway.
- **Windows dev, Linux deploy.** Vendor per-platform from line one
  (`win32-x64` here, `linux-x64` in the container).

## Box 2 — confirm the preset decode path

Run `wowsimcli decodelink` against a real wowsims share link.

Review R10 asserts the subcommand exists; that is a claim about the tool, not an
observation of ours. `wowsimcli` is documented as having exactly three
subcommands: `sim`, `decodelink`, `version`.

**Done when:** either a share link decodes to inspectable `IndividualSimSettings`
JSON, or the fallback is scoped.

**Keep the fallback scoped either way** — it's zlib+base64 over
`IndividualSimSettings`, and the same codec is needed for the *export* side
(PLAN.md §12), so it is not wasted work whichever way this lands.

If it works, the output is the first real spec preset:
`data/presets/ret/p2.individual-sim-settings.json` — filename states the message,
deliberately.

---

## Recording the result

1. Append to `docs/verification-log.md`, one entry per box, in the existing style:
   what was actually run and what came back, with reproduction commands. Record
   negatives as findings, not as omissions — see the race entry for the shape.
2. Tick the boxes in PLAN.md §14 Phase 0 **and** in `docs/phase0-findings.md`'s
   gate checklist. Both lists exist and both are currently accurate; keep them so.
3. If anything contradicts the plan, fix the plan in the same change. PLAN.md is
   the living document, not a historical record.

## Workflow

- Branch off `dev`: `phase-0/close-gates`.
- `pnpm verify` before every push (typecheck, lint, format, test) — enforced by
  `.githooks/pre-push`, and CI runs the same.
- Merge to `dev` with `--no-ff`.
- `main` only receives a merge from `dev` once the §14 gate is fully checked off
  in `docs/verification-log.md` — which is exactly what this ticket produces.
- Python here is probe/script tooling, not part of `pnpm verify`. Don't wire it in.

## Loose ends

- ~~**`pnpm sync:wowsims` doesn't exist yet.**~~ Done — `sync:wowsims` / `sync:wowsims:check`.
- ~~**`findings.json` / `findings2.json` at repo root.**~~ Moved to
  `docs/phase0-probe-summaries/{slamaltman,shredzepelin}.json`.
- **Third fixture still wanted:** a different encounter/tier, and ideally a
  character with an **inactive meta** so the gem solver has something to repair on
  day one. Both existing fixtures are the same fight (Hydross, SSC/TK).

## Comments

### 2026-07-26 — resolved

Both boxes closed. Also found and fixed: `events[0]` ≠ named character (was
Hagguth Warrior). See `docs/verification-log.md` third sitting.

## Answer

- Box 1: `test/fixtures/slamaltman.raid-sim-{request,result}.json` — DPS avg 2042.85
- Box 2: `data/presets/ret/p2.individual-sim-settings.json` via `wowsimcli decodelink`
- Vendor: `pnpm fetch:wowsimcli` → `vendor/wowsimcli-v0.0.101-<platform>/`
