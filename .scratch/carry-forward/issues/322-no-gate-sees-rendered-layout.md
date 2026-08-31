Status: closed
Type: enhancement
Origin: owner report, 2026-08-27 ("requires scoping them out the views visually (plus monitoring css changes)")
Blocks: none
Blocked by: none
Resolution: The gate this ticket asked for is built, runnable in this
environment, and proven to bite. `vendor/tbc-new-fork/test-layout.mjs` renders
the Upgrades tab headless over raw CDP (Playwright's on-disk Chromium, no new
dep) at 375/653/768/1280 and asserts structural facts (no viewport overflow,
control-group order, sticky Run, anti-jitter height reservation, F11 span) plus —
since ticket 329 — cell legibility on a real WASM run. Verified this pass: `npm
run test:layout` in vendor/tbc-new-fork prints "layout gate: OK -- 37
assertion(s) passed" (EXIT=0), and two deliberate breaks each fail it (dropping
the sub-md Slot nowrap → assertion 6 fails at 375/653; dropping the host's
`grid-column: 1 / -1` → assertion 5 fails at 1280). Every candidate assertion
this ticket listed is present. The DOM-geometry approach the ticket steered
toward (over screenshot capture, which was inert here) is exactly what shipped.
The one remaining half — making it run automatically rather than by hand — is
ticket 325, which stays open for an owner ruling (see that ticket for the
measured CI constraint). Closing 322 as "gate built and biting"; 325 owns the
wiring decision.

# Nothing in any gate renders the page, so layout regressions are invisible

Ticket 321 (desktop-only mobile layout) is the second layout defect in two
stages that every gate passed. That is not bad luck — it is the gate set.

## Measured

The five fork gates are `test:locales`, `lint:css` (stylelint), `type-check`
(tsc), `lint:js` (oxlint), and scoped `fmt` (oxfmt). **All five are static.**
`grep -rln 'playwright|puppeteer'` over `package.json`, `apps/` and `packages/`
returns **nothing** — the repo has no browser-driving dependency at all, and
`pnpm verify` does not see the fork in the first place.

So no gate can observe: an element rendering at the wrong width, a row landing
below the content it controls, a sticky rule silently dropping to `static`, a
re-parented row losing its rules (the C23 failure mode this project already
names), or anything at a viewport size nobody opened by hand.

Every layout claim this project has made was verified by a human or an agent
driving a browser once, then never re-checked. Those checks do not survive the
session that made them.

## What is wanted

A gate that renders the page at a small set of widths and asserts a handful of
structural facts, rather than a screenshot-diff suite. Full visual regression
(Percy/BackstopJS-style) is likely too heavy and too flaky for a solo project;
the useful core is much smaller. Candidate assertions, all of which are one-line
DOM measurements and each of which would have caught a real past defect:

- no element extends past the viewport at any tested width
- named control groups render **above** the content they govern
- a control that must stay reachable is either in view or pinned
- an element that must reserve height still reserves it (the anti-jitter rule)
- a re-parented row still computes the layout properties its class promises

Widths worth testing: 375 (phone), 768 (tablet), and one desktop width above the
`lg` breakpoint where the grid is genuinely active — the F11 containment is
inert below `lg`, so a narrow-only check passes vacuously and proves nothing.

## Constraint worth knowing before starting

Screenshot capture was **inert in this environment** on 2026-08-27 (the browser
pane would not composite frames), and ticket 310 hit the same wall twice. A gate
built on image capture may not run here at all. A gate built on measured DOM
geometry does — every figure in ticket 321 was obtained that way. Prefer
assertions over images for that reason, not only for flakiness.
