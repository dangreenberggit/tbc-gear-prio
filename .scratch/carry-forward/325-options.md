# Ticket 325 — where should the Upgrades-tab layout test run automatically?

A decision write-up for the owner. Written 2026-08-30. No code was changed.

## The one-paragraph problem

There is a test that opens the WoWSims **Upgrades tab** in an invisible,
automated browser and checks the layout has not broken — text still legible,
columns not collapsed — at four screen widths (375, 653, 768, 1280 px). You run
it by typing `npm run test:layout` from `vendor/tbc-new-fork`. It works and it
catches real breakage (it was proven by a deliberate-failure run under ticket
322). The problem is that **nothing runs it for you.** A person has to remember
to type the command. If they forget before shipping a tab-layout change, a
regression sails through. Ticket 325 asks: how do we make sure this test runs
before a tab-layout change ships, so that can't happen quietly?

## Terms, defined once

- **The fork** — a copy of someone else's code (the WoWSims website) that this
  project keeps under `vendor/tbc-new-fork/`. It holds the Upgrades tab's screen
  code. It is **git-ignored**: it lives only on your own machine (this "main
  checkout"). If someone freshly copied this project from the server, the fork
  folder would not come with it.
- **`pnpm verify`** — this project's one automatic self-check. It runs a long
  list of type-checks, lint, formatting, tests, and data checks. Two machines
  run it: your machine before every push, and the project's build server on
  every push. Because the fork is git-ignored, **the build server never has the
  fork**, and several of `pnpm verify`'s fork-related checks are written to
  *quietly skip themselves when the fork is missing* rather than fail. (Verified:
  `scripts/_fork_gate.py:8-14`, `scripts/sync_fork_universes.py:121`.)
- **CI (the build server)** — an automatic machine, run by GitHub, that runs
  `pnpm verify` on every push (`.github/workflows/verify.yml`, referenced in
  `docs/workflow.md:196-201`). It is the backstop that can't be skipped. It has
  no fork and no automated browser.
- **`pnpm merge-to-dev`** — the single supported "door" for folding a finished
  feature into the shared `dev` branch. Before it lets a merge through it runs
  `pnpm verify` and checks that a written review exists
  (`scripts/merge_to_dev.py:105-119`, `scripts/check_merge_ready.py:435-441`).
- **Pre-merge review** — a required human/agent step (a skill,
  `.claude/skills/pre-merge-review/SKILL.md`) that reviews a finished branch on
  three axes and writes the result to `docs/reviews/<branch>.md`. It already
  includes a "prove the check by hand" step (SKILL.md step 4).

## Why the test can only run on your machine — the fact that shapes everything

The layout test (`vendor/tbc-new-fork/test-layout.mjs`) needs three things that
only exist on your main checkout:

1. **The fork itself** — git-ignored, present only here (`docs/workflow.md`
   branch model; ticket 325 lines 32-37).
2. **An automated browser** — it drives a Playwright Chromium at a path that
   starts `C:\Users\dgree\...ms-playwright\...\chrome.exe` and throws an error if
   it can't find one (`test-layout.mjs:54-67`). No build server here has that
   installed.
3. **A prior full build of the fork.** It rebuilds the JavaScript/CSS itself,
   but it refuses to run unless `dist/tbc/lib.wasm` and `dist/tbc/assets` already
   exist from a one-time `make host` build (`test-layout.mjs:98-102`).

**Consequence, and it is not negotiable:** this test cannot run on the project's
build server (CI) or on a fresh copy of the project. It can only run
automatically as a **local step on your own main checkout.** Every option below
lives inside that box. (This was already established and recorded in the ticket's
own investigation, lines 7-37; the investigation above re-confirmed each of the
three preconditions against the file.)

**It is also confirmed the test has no home today.** `test:layout` is defined
once, in the fork's `package.json:26`, and is called by *nothing* — not by the
fork's own `lint`/`format` scripts, not by the fork's CI (its only test job runs
`npm run test:locales`, `vendor/tbc-new-fork/.github/workflows/run_tests.yml:54`,
and that job only fires on pull requests this project never opens), and not by
this project's `pnpm verify`. So there is no existing "fork check bundle" to just
slot it into. That premise — which the ticket was originally written assuming —
does not exist.

## Does the split-repo thread (tickets 251 / 263) block any of this?

**No.** Tickets 251 and 263 are about *which upstream source* the project should
read gear presets from — a data-provenance question about the fork's git base
(`251-fork-base-no-longer-matches-the-engine-pin.md`,
`263-derive-meta-preferences-once-upstream-is-one-repo-one-branch.md`). The
layout test renders the fork's already-built screen; it does not read gear
presets and does not care which commit the fork sits on. None of the options
below wait on 251/263. (Checked: both tickets read start to finish; neither
mentions the layout gate, and the gate touches none of the files they name.)

---

## The options

Aim: pick where `test:layout` fires automatically, given it can only run on your
machine.

### Option A — a documented pre-merge step, recorded in the review

**What it means concretely.** Add one line to the pre-merge-review process: when
a branch being reviewed changed any of the fork's tab screen files (its `.scss`
styling or `.tsx` screen code), the reviewer runs `npm run test:layout` from
`vendor/tbc-new-fork` and writes the result — pass or fail — into the branch's
review file `docs/reviews/<branch>.md`. The test fires **once per feature, at
review time, just before you'd ask to merge.** The natural insertion point
already exists: pre-merge-review's step 4 is literally "prove the check by hand"
and already runs `pnpm merge-to-dev --check-only` there
(`.claude/skills/pre-merge-review/SKILL.md` step 4). The reviewer already has the
list of changed files pinned in step 1, so testing the "did this touch the tab?"
condition is free.

**Cost to set up.** Very small: a few sentences added to the pre-merge-review
skill and a matching note in `docs/workflow.md`'s loop. No new script, no new
automation.

**Cost to maintain.** Near zero. Nothing to keep running.

**What it protects against.** A regression is caught **before a human ships** —
specifically before the merge into `dev`, at the last structured checkpoint. This
is exactly how the project already handles other checks that a machine can't
enforce: the "comment policy" line in the gates table is marked "Not mechanically
enforced — a pre-merge-review finding" (`docs/workflow.md:88`). It would sit in
good company.

**What it still leaves exposed.** It relies on the reviewer actually running it.
Nothing forces it — `pnpm merge-to-dev` checks that a review *file* exists, not
that a layout line is in it (`scripts/check_merge_ready.py:435-449`). If the
reviewer skips the step or misjudges "did this touch the tab?", the regression
still gets through. It also does nothing between commits — you could push broken
layout to your feature branch and only find out at review.

**Dependencies / blockers.** None. Not blocked on 251/263.

**Honest downside.** It is a discipline, not a gate. For a solo developer who is
often also the reviewer, "remember to run it at review" is only a modest
improvement over "remember to run it before shipping" — it moves the reminder to
a more reliable moment but keeps it a reminder.

### Option B — a soft check surfaced by `pnpm verify` (warn-only, self-skipping)

**What it means concretely.** Add a small wrapper script and chain it onto the
end of `pnpm verify`, exactly modeled on the existing `upstream-drift:warn`. The
wrapper: if the fork, its built `dist/`, and a Chromium are all present (i.e.
you're on the main checkout), it runs `test:layout` and prints the result; if any
of those is missing (a fresh copy, or the build server), it prints "skipped" and
**always exits 0** so it never turns a build red for the wrong reason. Because
`pnpm verify` runs before every push and inside `pnpm merge-to-dev`, the test
would then fire **on your machine every time you push or merge** — automatically,
without anyone remembering.

This shape is not hypothetical; it is the established pattern here. See
`scripts/warn_upstream_drift.py` (chained last into `pnpm verify` at
`package.json:14`, always exits 0, lines 14/36) — its own opening rationale is
literally *"A tripwire wired to nothing is not a tripwire"* (line 23), which is
ticket 325's problem word for word. And the "skip cleanly when the fork is
absent" half is the port-drift pattern (`scripts/check_engine_port_drift.py:31`,
`scripts/_fork_gate.py:8-14`).

**Cost to set up.** Small-to-moderate: one new ~30-line Python (or shell)
wrapper, one line added to the `verify` chain. More than Option A, but all of it
copies scripts that already exist.

**Cost to maintain.** Low, but real: the test currently hardcodes a Chromium path
that begins with your Windows user folder (`test-layout.mjs:55`). As long as the
check is warn-only, a moved or missing Chromium just prints "skipped" instead of
breaking the build — so the maintenance risk is contained, at the cost of the
check silently not running if that path rots.

**What it protects against.** The strongest of the four. On your machine the test
runs **every push and every merge, unprompted** — a regression is caught before
it even reaches your feature branch's remote, let alone `dev`. On the build
server and fresh copies it correctly does nothing.

**What it still leaves exposed.** Because it is warn-only (exit 0), it *reports*
a broken layout but does not *stop* the push or merge on its own — you have to
read the warning. That is a deliberate trade (the same one `upstream-drift:warn`
makes) so that a rotted Chromium path or a missing build can't wall off your
whole workflow. If you want it to actually block, that is a later one-line
change, but blocking a warn-check that self-skips on absence is risky (it would
also need to distinguish "skipped, fine" from "ran and failed").

**Dependencies / blockers.** None. Not blocked on 251/263. One thing to decide at
build time: whether the wrapper should also require the prior `make host` build
and just skip if `dist/` is stale — cheap to handle the port-drift way.

**Honest downside.** It adds a line to `pnpm verify`, the project's most-run
command, and `pnpm verify` is deliberately kept fork-agnostic today. This check
is fork-aware-but-self-skipping, so it doesn't break that principle, but it is
the first fork-*rendering* thing in the chain, and it makes `pnpm verify` a bit
slower on your machine (a browser launch + build) even when you didn't touch the
tab — unless the wrapper is written to first check whether tab files changed.

### Option C — just document that the test exists

**What it means concretely.** Change nothing about automation. Add a sentence to
`docs/upgrades-tab-scope.md` (and/or the tab's known-traps note) saying: "A
layout test exists — run `npm run test:layout` from `vendor/tbc-new-fork` after
any tab-layout change." The test fires **only when a person reads that note and
chooses to run it.**

**Cost to set up.** Trivial — one sentence.

**Cost to maintain.** Zero.

**What it protects against.** Almost nothing beyond today. It makes the test
*discoverable* so a future you (or another contributor) knows it's there. It does
not make it *run*.

**What it still leaves exposed.** Everything Option A and B close: a forgotten
run still ships a regression. This is barely different from the current state,
where the test's existence is already recorded in ticket 322 and this ticket.

**Dependencies / blockers.** None.

**Honest downside.** It answers "how do we make sure this runs?" with "we
don't" — it just writes down that it's optional. Worth mentioning only as the
floor.

### Option D — install a browser on CI and run it there (why it's off the table)

**What it means concretely.** Make the project's build server (CI) run the layout
test: install a headless Chromium and the fork on the server, then run
`test:layout` in `.github/workflows/verify.yml`.

**Why it does not work here.** Three hard blockers, each verified:
1. The build server never has the fork — it's git-ignored and not fetched
   (`docs/workflow.md:196-201` shows CI fetches `vendor/wowsims/`, not the fork).
2. The build server has no automated browser, and the test points at a Chromium
   path under your personal Windows folder (`test-layout.mjs:55`).
3. It would mean resolving the whole "should the fork even be pushed / become its
   own repo" question — the split-repo thread the owner deliberately deferred
   (tickets 251/263, and the ticket's own note that the fork opens no pull
   requests, `data/wowsims-fork.lock.json` `"pushed": false`).

**Verdict.** Listed for completeness so the option is visibly considered and
ruled out, not silently dropped. It is the only option that *is* entangled with
251/263, and it is the wrong shape for how this project works (single developer,
fork lives only locally). Do not pursue it.

---

## Recommendation

**Do Option B (soft check surfaced by `pnpm verify`), and fold in the one useful
half of Option A.**

The reasoning that separates it from the runners-up:

- **B is the only option that makes the test actually run without anyone
  remembering.** That is the literal ask of ticket 325. A and C both still depend
  on a human choosing to run it; they relocate or advertise the reminder but keep
  it a reminder. B wires the test to the command you already run before every
  push and every merge.
- **B has a proven template in this exact repo.** `upstream-drift:warn`
  (`scripts/warn_upstream_drift.py`) is the same shape — a check that must run
  only where its input exists, self-skips cleanly everywhere else, rides on
  `pnpm verify`, and never falsely reddens a build. Its own reason for existing
  ("a tripwire wired to nothing is not a tripwire") is ticket 325 restated. The
  fork-absent skip is the port-drift pattern (`_fork_gate.py`). B is not new
  machinery; it is copying two scripts that already work.
- **The single-developer, local-only-fork reality favours B over A.** For a solo
  dev who is often the reviewer too, Option A's "run it at review" is only a
  little better than today. B removes the human from the loop on the one machine
  that can run the test.
- **Fold in Option A's good half** because B is deliberately warn-only and does
  not hard-block. Keep a one-line pre-merge-review note (Option A) so that when a
  branch touched the tab, the reviewer confirms the `test:layout` line ran green
  and records it in `docs/reviews/<branch>.md`. That gives you belt-and-braces:
  B makes it run automatically and loudly; A makes "did it run green?" a recorded
  review item at the merge gate. Together they cost little and close the gap that
  either alone leaves (B can be ignored if you don't read the warning; A can be
  forgotten).

**Why not the runners-up.** Option A alone leaves the test dependent on
reviewer discipline. Option C is essentially the status quo with a signpost.
Option D is blocked on the fork's environment and on the deferred split-repo
decision, and is the wrong architecture for a local-only fork.

**Build-time note for whoever implements this** (not a decision for the owner):
write the B wrapper to (a) skip-and-exit-0 when the fork, its `dist/`, or a
Chromium is absent — the port-drift pattern; (b) ideally only launch the browser
when the branch actually changed a tab file, to keep `pnpm verify` fast when it
didn't; (c) consider generalising the hardcoded Chromium path
(`test-layout.mjs:55`) so the skip is by genuine absence, not by a stale personal
path. None of that changes the recommendation; it's the shape of the small build.
