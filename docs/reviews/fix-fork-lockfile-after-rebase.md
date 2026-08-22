# Review — `fix/fork-lockfile-after-rebase`

Reviewed 2026-08-21. Two-field correction to `data/wowsims-fork.lock.json`,
plus closing the ticket that should never have been filed for it.

Self-reviewed. The change is small enough that a fan-out would cost more than
it returns, and the verification is mechanical: the values either match the
clone or they do not.

## Verdict

**Merge.**

## What landed

`data/wowsims-fork.lock.json` recorded the fork's pre-rebase state while
`feat/engine-pin-backend-reforge` moved the engine pin and rebased the fork onto
the new base. The one file whose job is answering "which fork commit pairs with
this repo state" gave the old answer.

Both values re-read from the clone rather than copied out of the ticket:

- `commit` `7de45ea…` → `f359239572c38af9acb24c1ee178088bfe44692c`
- `branchedFrom` `8aa378b…` → `cbf6b75a889e52c4106351976db66efd914ea349`

Verified the tip actually sits on the new base:

```
git -C vendor/tbc-new-fork merge-base --is-ancestor cbf6b75a889e52c4106351976db66efd914ea349 feat/upgrades-tab
```

`pushed: false` untouched — nothing has left the machine, and flipping that flag
is a deliberate act per plan section 1.

## Finding beyond the ticket

The `_comment` asserted _"branchedFrom is the v0.0.101 pin from
wowsims.lock.json"_. The pin move had already made that false, and ticket 248
did not notice. Updating only the two numeric fields would have left a committed
file explaining itself with a stale premise — the same defect one layer down.

Reworded to state the rule rather than name a version: _"branchedFrom is
whatever wowsims.lock.json currently pins (feature/backend-reforge as of
2026-08-21)"_. That form survives the next pin move.

## Process note, which is the durable part

Filing ticket 248 was the wrong call, and the reasoning is worth keeping.

`AGENTS.md:128` says _deferred_ findings become tickets. It governs what to do
with a finding already decided to be deferred; it does not say to defer. That
decision was never made here. The finding arrived from a reviewer at merge time,
it did not block the merge, and it went into the write-it-down pile without
anyone asking whether filing cost more than fixing. It did — two fields against
a whole ticket file.

The test applied was _"does this block the merge"_. The right test is _"is
writing the ticket more work than the fix"_. A `fixed` disposition already
existed and was used for four other findings on the same review; the vocabulary
was not missing anything.

Not proposing an `AGENTS.md` change off one instance. Recorded here so the next
review has the counter-example rather than only the rule.

## Limits

- Self-reviewed, no independent reviewer.
- The fork itself is unchanged by this branch — it only records where the fork
  already is. The fork still has never been compiled on its new base (154
  upstream commits); keep `backup/pre-reforge-rebase` until it has.

## Second pass, 2026-08-21 — the pin move and the owner's APL

The branch grew well past its name after the first pass. Reviewed again by an
independent reviewer plus this session's checks. Still not the full three-axis
`pre-merge-review`; no SME axis ran on the ranking changes.

### What else landed

- Engine pin moved again, from `feature/backend-reforge` to tag **v0.0.119**,
  which is `status: identical` to upstream master and is what wowsims.com/tbc
  serves. Accuracy was the reason: only master carries `selected_potion` and
  `selected_conjured`, so only master can run the owner's APL without silently
  dropping guards.
- The feral skeleton is now built from the owner's committed export — **rotation
  and consumables both** — rather than upstream's default APL and a hardcoded
  dict.
- Band of the Eternal Defender (29297) ships, having become implemented.
- Tickets 239 and 244 closed; 251 filed.

### Finding: `pnpm verify` was red at review time (fixed, `b7bcf51`)

The reviewer caught this and it was a real blocker, not a nitpick. Changing the
skeleton's input contract left three gates asserting the old arrangement, and
one of them is wired into `pnpm verify`:

- `check_build_feral_skeleton.py` built its fake APL in the flat vendor shape,
  so the new consumables guard rejected it **before** the check reached the
  unknown-field gate it exists for. It failed for the wrong reason.
- Both of that script's field checks used real field names — first
  `timeToNextEnergyTick`, then `selectedPotion` — and the pin move made both
  known, so each began asserting the opposite of the truth. Now synthetic.
- `check_raid_sim_skeleton.py` and `feral-preset.test.ts` compared feral's
  skeleton against the vendored default. Both repointed; the APL source is
  per-spec, so ret still tracks upstream.

**Worth recording as a process failure, not just a bug.** Ticket 239 was closed
with a box saying `check_build_feral_skeleton.py` passes. That was true when
written and stale by the time the ticket closed, because the contract changed
afterwards and nobody re-ran it. Ticket 244 was closed with its own
`pnpm verify` box still unchecked. Closing a ticket is not the same as
re-verifying its claims.

### Finding: the fork no longer sits on the pin (deferred — ticket 251)

`data/wowsims-fork.lock.json` records `branchedFrom: cbf6b75` while the engine
pin is now `3267f8dfa4a2`. The data is **accurate** — the fork really is on
`cbf6b75` — but plan decision **D2** says the fork sits on the pin, and it no
longer does.

Not a two-field edit, unlike the finding that started this branch. The bases
have **diverged** (20 ahead, 52 behind), so realigning is a second rebase of 25
commits, and it collides with the fork's own purpose: `feat/upgrades-tab`
targets `feature/backend-reforge` for a PR. Left as an owner decision.

The one flatly false thing was fixed: the `_comment` no longer claims
`branchedFrom` equals the current pin. `branchedFrom` itself is untouched,
deliberately — editing it would make an accurate file inaccurate and bury the
question.

### Verified independently

The reviewer re-checked and confirmed: v0.0.119 resolves to the same commit as
master; every committed `data/proto/*.proto` sha256 matches the lockfile;
`apl.proto` declares all three field groups; `fetch_wowsimcli.py` resolves a
real release asset on a tag pin; the binary reports `v0.0.119`; 29297 is in
`sim-implemented-effects.json` with the count at 217; and the owner's APL loses
zero fields into the skeleton (17 `timeToNextEnergyTick`, 2 each of the potion
and conjured values, in and out).

### Not verified

- **The DPS figures were not independently reproduced.** 782.14 / 744.10 and
  ret's 1909.74 → 1909.09 come from this session's runs. The committed skeleton
  ships bare gear, so reproducing them needs the compose step's gear, which the
  reviewer judged out of cheap reach. The supporting mechanics were all
  confirmed; the numbers themselves rest on one source.
- **No SME looked at the ranking changes.** Feral's above-cutoff set is now 20
  rows at p2 and 43 at p3, against 15 and 36 before. Nobody with feral judgment
  has said whether that movement is plausible.
- The rebased fork still has never been compiled on any new base. Keep
  `backup/pre-reforge-rebase`.

## Disposition

| ID  | Axis        | Disposition | Note                                                                                                                                                 |
| --- | ----------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | standards   | fixed       | Fork lockfile records the post-rebase `commit` and `branchedFrom`, both re-read from the clone                                                       |
| 2   | standards   | fixed       | `_comment` no longer names v0.0.101 as the base; states the rule so it survives the next pin move                                                    |
| 3   | process     | fixed       | Ticket 248 closed as fixed rather than left open, with why filing it was wrong recorded in the ticket and above                                      |
| 4   | correctness | fixed       | Three feral gates re-aimed after the skeleton's input contract changed; `pnpm verify` was red at review time (`b7bcf51`)                             |
| 5   | standards   | defer       | Fork no longer sits on the engine pin, breaking plan decision D2 — `.scratch/carry-forward/issues/251-fork-base-no-longer-matches-the-engine-pin.md` |
| 6   | process     | fixed       | Tickets 239 and 244 were closed carrying claims that had gone stale; re-verified and the gates fixed                                                 |
