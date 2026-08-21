Status: open
Type: task (test coverage; CI trust)
Origin: `.scratch/stage-gate/weapon-type-coverage/plan.md` step 4, filed while
  resolving ticket 228's box 4
Blocks: none
Blocked by: none

# Eleven vendor-gated tests silently skip on a fresh clone

## The finding

`packages/core/test/pool-hardening.test.ts` computes

```ts
const hasWowsimsVendor = existsSync(wowsimsDbPath);   // :60
```

against `vendor/wowsims/db.json`, which is untracked and gitignored, and then
guards eleven tests on it:

```
699  715  768  800  886  908  984  1032  1069  1075  1087
```

Re-runnable: `grep -n "hasWowsimsVendor" packages/core/test/pool-hardening.test.ts`.

`it.skipIf` does not fail when the condition holds — it skips, and vitest
reports the file as passed. On a fresh clone, and in CI where no vendor sync
runs, all eleven prove nothing while reading green. A reviewer checking "does
the suite pass?" gets yes; a reviewer checking "did this assertion execute?"
has to read the verbose reporter for the tick.

This is not hypothetical harm. Ticket 228's box 4 discharged its ret half
against the staff test at :984 on the strength of one local run, and that
closure was rejected on 2026-08-20 precisely because the check does not hold
anywhere else. See the "Closure rejected" section in
`.scratch/carry-forward/issues/228-pool-admits-weapons-the-class-cannot-equip.md`.

## Scope

Ticket 228 fixed only the weapon-exclusion consequence, and only by adding a
separate committed-data test (`packages/core/test/weapon-type-exclusion.test.ts`)
rather than by touching any of the eleven sites. The eleven are untouched and
still skip.

Deciding what each site should become is this ticket's work, and it is a
per-site judgment rather than one sweep:

- **hard-fail** — correct where the assertion is load-bearing and the vendor
  file is genuinely required to make it, since a loud failure at least tells a
  fresh clone that it is not running the check. Note this alone does not make
  the test runnable in CI; it converts a silent gap into a visible one.
- **committed fixture** — correct where the fact under test can be pinned from
  data already committed, or from a small new fixture. This is what ticket 228
  turned out to need: the "no committed-fixture substitute exists" reasoning
  there was wrong, because `data/items/index.json` is committed and carries
  `weaponType`. Other sites may have the same escape and it is worth checking
  each before assuming otherwise.
- **delete** — correct where the assertion is redundant with a test that
  already runs everywhere.

Untested hypothesis, stated as such: some of the eleven likely fall into the
second bucket for the same reason 228 did, but no per-site measurement has been
made, and this ticket should not assume a distribution before doing that work.

## Acceptance

- [ ] Each of the eleven sites has a recorded disposition (hard-fail, committed
      fixture, or delete) with the reason.
- [ ] No assertion in `pool-hardening.test.ts` silently skips on a clone
      without `vendor/wowsims/db.json`.
- [ ] Whatever remains gated is gated loudly, and the fact that it does not run
      in CI is written down rather than implied.
