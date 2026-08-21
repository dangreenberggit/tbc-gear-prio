Status: open — all mechanical work done on `feat/drift-warner-proven`; open
  solely on the last acceptance box, an owner decision on the proposed
  `AGENTS.md` wording (see "Decision, 2026-08-21" below)
Type: defect (process gap; a tripwire nothing ran)
Origin: ticket 244 investigation, 2026-08-20 — found while establishing why the
  `timeToNextEnergyTick` gap went unnoticed for weeks
Blocks: none
Blocked by: none

# The watched-ref drift tripwire was wired to nothing, for the second time

## The finding

`scripts/sync_wowsims.py --check` detects upstream drift, including watched refs
moving. It reports, right now:

```
python scripts/sync_wowsims.py --check
```

```
DRIFT: new release available: v0.0.101 -> v0.0.119
DRIFT: watched ref feature/backend-reforge moved: 33970a8f3c65 -> cbf6b75a889e
  (informational -- not a build pin; re-review before treating its features as still absent)
```

> **These exact lines depend on the branch's lock pin, so do not treat them as
> a fixture.** They are what `dev` produces (pin `v0.0.101`). On
> `feat/engine-pin-backend-reforge` the pin is the watched branch itself, so the
> watched-ref line disappears and the release line reads
> `feature/backend-reforge -> v0.0.119`. The contract checks added for this
> ticket assert the *shape* — the token, the exit codes, the branches — and
> hardcode no ref name or pin, because the pin decision from ticket 244 is still
> open and may move again.

**Nothing ran it.** `sync:wowsims:check` existed in `package.json` but was not
in `pnpm verify`'s 20-check chain, so it fired only if a human typed it. It also
exits 0 in the informational case, so even a manual run does not announce
itself.

## Why it matters — this is the second instance, not the first

The consequence: tickets 239 and 244 were both written on the premise that
`timeToNextEnergyTick` was simply unavailable to us. It has been present on
`feature/backend-reforge` — the branch this repo already chose to watch — for
weeks. That branch is at **v0.0.115 + 54 commits**, 14 tags ahead of our pin.

`do_check`'s own comment records the first instance verbatim
(`scripts/sync_wowsims.py:443`):

> Watched refs: branches under active upstream development that we don't build
> from but want to know when they move (issue #1 -- the optimizer that "didn't
> exist" was live on feature/backend-reforge the whole time).

Same branch. Same failure mode. The watch was added *because* of the first
occurrence, and then never wired to a gate, so it could not prevent the second.

The drift message even says "re-review before treating its features as still
absent" — the exact review that did not happen.

## What was done already (2026-08-20)

Owner chose **warn without failing**. Implemented:

- `scripts/warn_upstream_drift.py` — runs `--check`, prints any `DRIFT:` lines,
  and **always exits 0**.
- `pnpm upstream-drift:warn` added to the end of `pnpm verify`.

It is a wrapper rather than a direct `--check` call because `--check` would turn
a green build red for reasons unrelated to the commit under test: it exits 2
when `vendor/` is absent (fresh clone, CI before `sync:wowsims:restore`), exits
1 whenever upstream tags a release, and needs network plus `gh` auth. The
wrapper swallows all three.

Verified 2026-08-20 — `python scripts/warn_upstream_drift.py` prints both drift
lines and exits 0.

> **That verification covered only the happy path.** It was run on a machine
> with `gh` authenticated and `vendor/` populated, which is the one condition
> the wrapper did not need to survive. Two of the five boxes below turned out to
> be broken, and one of them — CI — was broken on every commit. "It works here"
> is what the boxes exist to distrust.

## What is left — the reason this ticket is open

The warner is unproven in the conditions it exists to survive. Each of these is
a way it could silently become useless:

- [x] **No network / no `gh` auth** — **it failed.** It did not print a skip
      line: it printed `upstream drift check ok: in sync with the pin` and
      exited 0. `--check` dies on an uncaught `SystemExit` from `gh()` and exits
      1, and the warner read "no `DRIFT:` lines" as proof of sync. Measured by
      copying `scripts/` and `data/` to a temp tree and repointing the `gh()`
      wrapper at a binary that does not exist:
      `subprocess.run(["gh-does-not-exist", "api", *args]`, then
      `python scripts/warn_upstream_drift.py`. Fixed in ae1a590; the same
      command now prints `CHECK DID NOT RUN -- drift is UNKNOWN, not absent`.
      The 60s timeout is separately confirmed working — patched `--check` to
      `time.sleep(30)` against a 2s timeout, got
      `upstream drift: check timed out (network?) -- skipped, not a failure`,
      exit 0.
- [x] **Empty `vendor/`** — correct as built. In a temp tree with no `vendor/`,
      `--check` exits 2 and the warner prints
      `upstream drift: vendor/ absent -- skipped (run pnpm sync:wowsims:restore)`
      and exits 0. Note the first attempt at this test was invalid: the temp
      tree was missing `scripts/pinned_fetch.py`, so `--check` died on an import
      and exited 1, not 2. That accident is what surfaced the box-1 defect.
- [x] **CI** — **it failed, and worse than locally.** Run
      [32504123312](https://github.com/dangreenberggit/tbc-gear-prio/actions/runs/32504123312)
      printed:

      upstream drift: CHECK DID NOT RUN -- drift is UNKNOWN, not absent.
        sync_wowsims.py --check exited 1 without reporting drift.
        | gh api failed: gh: To use GitHub CLI in a GitHub Actions workflow,
        | set the GH_TOKEN environment variable.

      `gh` in Actions has no credentials unless the workflow passes one, and
      `verify.yml` passed none. **The drift check has never run in CI, on any
      commit, since it was added.** Before ae1a590 those same conditions printed
      `in sync with the pin` — a green build asserting there was no upstream
      drift, on the one machine whose output nobody reads by hand. Fixed in
      91f3803 by giving the `verify` step
      `GH_TOKEN: ${{ github.token }}`.

      Confirmed fixed by run
      [32504851836](https://github.com/dangreenberggit/tbc-gear-prio/actions/runs/32504851836)
      — green, and the drift check ran for real in CI for the first time:

      upstream drift (warning only -- does not fail the build):
        DRIFT: new release available: v0.0.101 -> v0.0.119
        DRIFT: watched ref feature/backend-reforge moved: 33970a8f3c65 -> cbf6b75a889e
        NOTE: the pin is an ANCESTOR of watched ref feature/backend-reforge (154 commits ahead, 0 behind).
              Features on that branch are reachable by fast-forward -- do not call them absent.

      Both runs read with `gh run view <id> --log`, not predicted from local
      output.
- [x] **It stays visible.** Kept as-is, deliberately. Measured: on a green run
      the warner's output is the **last thing `pnpm verify` prints** — 249 lines
      total, nothing after it to scroll past — and it is the final step of the
      chain, so a failure anywhere earlier aborts before reaching it. A repeat
      banner would have nothing to sit below. A separate `pnpm drift` was
      considered and rejected: `pnpm sync:wowsims:check` already is that command
      and returns a real exit code, so a third alias adds a name without adding
      a capability. What was missing was not volume but *content* — the old line
      said drift existed without saying what to conclude. The `NOTE:` line now
      states the conclusion in words: *the pin is an ANCESTOR of watched ref X,
      features on that branch are reachable by fast-forward, do not call them
      absent.*
- [x] **The wrapper cannot rot silently.** Six checks added to
      `scripts/check_sync_wowsims.py` (already in `pnpm verify` as
      `sync-wowsims:unit:check`), 16 checks total. They pin the `DRIFT:` token,
      the exit codes `do_check()` returns, and all four warner branches. Each
      was verified to **fail** against a mutation of the code it guards — see
      "Mutation evidence" below.

## Mutation evidence

A check that has never failed is the same unproven thing this ticket is about,
so each was run against a deliberately broken copy in a temp tree. All six fail
when they should:

| Mutation | Caught by |
|---|---|
| `do_check()` prints `CHANGED:` instead of `DRIFT:` | token check (2 failures) |
| `do_check()`'s `return 2` renumbered to `3` | exit-code check |
| `do_check()`'s `return 1` renumbered to `9` | exit-code check |
| the did-not-run branch deleted (i.e. ae1a590 reverted) | never-claims-in-sync check (2 failures) |
| warner returns 1 on drift instead of 0 | stays-green check (3 failures) |
| warner prints "in sync" on exit 2 | vendor-skip check (2 failures) |
| warner stops echoing the `DRIFT:` lines | reports-drift check (2 failures) |

One mutation deliberately **does not** fail, and that is correct: renaming the
token to `UPSTREAM-DRIFT:` keeps `DRIFT:` as a substring, so the warner still
matches it and nothing is broken. Verified directly rather than assumed —
`[l for l in body.splitlines() if w.DRIFT_TOKEN in l]` still returns the line.

## The warning is necessary, not sufficient

Recorded 2026-08-20 after the owner asked whether the warn would catch this.
Partly. It closes the gap it was built for — the drift is now in front of a
human on every verify instead of behind a command nobody typed. But it does not
reach the failure that actually happened, and this ticket should not be closed
believing it does.

**Both instances were an agent reasoning from "we do not have this feature",**
not a human missing a notification. In the first, an optimizer was declared
absent while live on this branch. In the second, tickets 239 and 244 were both
written on the premise that `timeToNextEnergyTick` was unavailable, and 244
went further — it listed `feature/backend-reforge` as an option and called it
marginal without ever resolving what version the branch was on.

A line at the tail of a 21-step green build does not intercept that. Three
concrete ways it still fails:

1. **It warns; it does not stop.** The agent writing 239 could have read the
   drift line and continued, because the line does not contradict the specific
   claim being made.
2. **Nobody reads the tail of a passing build.** That is the standing weakness
   of every warn-only check, and it is why the visibility box above is open
   rather than assumed closed.
   — *Still true, and unfixable by volume. Closed as "kept as-is": the line is
   already last, and the fix applied was to the line's **content** (the `NOTE:`
   now states the conclusion, not just the fact) rather than its loudness.*
3. **It can rot into a reassuring lie.** If `--check`'s output format changes,
   the `"DRIFT:"` match stops matching and the warner reports "in sync"
   permanently — worse than no warner, and a third instance of the same shape.
   — *This was not hypothetical. It was already true in CI on every commit, via
   a different route than the one predicted: not a format change but a missing
   `GH_TOKEN`. Fixed in ae1a590 (honest reporting) and 91f3803 (CI token), and
   guarded by the six contract checks.*

**Follow-up option, deliberately not implemented yet.** The intervention that
would reach the real failure belongs at the point of reasoning, not the point of
build: a rule stating that *before asserting an upstream feature is absent,
resolve every ref in `watchedRefs` and say what you found* — placed where an
agent reads it while forming the claim (`AGENTS.md`, or a `_comment` on
`data/wowsims.lock.json` beside `watchedRefs` itself).

Not written yet on purpose. Per `AGENTS.md`, changes to `AGENTS.md` and skill
files are proposed in chat and wait for approval, because they steer every
future session. And the cheap mechanical fix is already in place and working —
adding a second, unproven intervention on top of an unvalidated one is how the
first tripwire ended up wired to nothing. Close the boxes above first, then
decide whether this is still needed.

### Decision, 2026-08-21: adopt, but generalised — proposed, awaiting approval

**Still needed.** Closing the boxes did not reach the failure. The CI finding
sharpened the case rather than weakening it: the mechanical tripwire was
*itself* silently broken on every commit, so an agent forming an absence claim
would have found the build agreeing with it. A rule at the point of reasoning
does not share that failure mode, because it does not depend on a script
running.

**Not the watchedRefs-specific wording, though.** The ticket proposed *"before
asserting an upstream feature is absent, resolve every ref in `watchedRefs`"*.
That covers two of the four known instances. There are now four, and the shape
they share is broader — in each, a property was measured against **one** ref or
option and then treated as decisive without measuring the alternatives:

1. An optimizer declared absent while live on `feature/backend-reforge`.
2. Tickets 239 and 244 written on the premise `timeToNextEnergyTick` was
   unavailable, without resolving what the watched branch was on.
3. Ticket 244's decision closed on *"our pin is an ancestor of
   backend-reforge, so it is a fast-forward, therefore choose it"* — true but
   non-discriminating: the pin is an ancestor of **every** candidate
   (v0.0.119 ahead 122 behind 0; v0.0.105 ahead 30 behind 0). One ref was
   measured; the alternatives never were. Retracted in 294d229.
4. *"The site almost certainly runs master"* — stated as near-fact before
   checking. It happens to be true (`deploy.yml` triggers on push to master).

A `watchedRefs` rule catches 1 and 2 and misses 3 and 4. The generalisation
catches all four, and it belongs in `AGENTS.md` § Durable claims, next to
**"An exit code is not evidence that work happened"** — the same shape of
error, where a signal that looks like proof is not one.

Proposed wording, for approval before any edit:

> **A property measured against one option is not a comparison.** Before
> ruling an option in or out — a version, a branch, a library, an approach —
> name the alternatives and say what the same measurement gives for each. "Our
> pin is an ancestor of that branch" and "we do not have that feature" are both
> claims about one ref; neither is evidence until the other candidates are
> measured the same way. When the claim is that something is *absent*, resolve
> the refs that could contain it — `watchedRefs` in `data/wowsims.lock.json` is
> tracked precisely because a feature was twice called missing while live on a
> branch this repo already watched.

Status: **proposed in chat, not yet written to `AGENTS.md`.** This ticket stays
open until the owner approves or rejects the wording.

## Acceptance

- [x] All five boxes above closed, each naming the command run. Two of the five
      failed and were fixed rather than merely confirmed.
- [x] The output-format contract between `--check` and the warner is asserted by
      a check in `pnpm verify`, so a format change fails loudly instead of
      turning the warner into a no-op. Six checks in
      `scripts/check_sync_wowsims.py`, run by `pnpm sync-wowsims:unit:check`
      (16 checks total), each proven to fail against a mutation.
- [x] `pnpm verify` green — locally (exit 0) and in CI run
      [32504851836](https://github.com/dangreenberggit/tbc-gear-prio/actions/runs/32504851836).
      One caveat on the local run: `pnpm sync:wowsims:restore` must be run first
      if `vendor/` was populated from a branch with a different pin, or
      `feral-preset.test.ts` fails on a `timeToNextEnergyTick` mismatch that has
      nothing to do with this ticket.
- [ ] A decision recorded on the follow-up option above — adopted (with the
      wording proposed in chat first) or dropped, with the reason.
