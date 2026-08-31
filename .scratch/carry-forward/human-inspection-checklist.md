# Human-inspection checklist — WoWSims Upgrades tab

Everything left that needs the **owner's own eyes or a taste/decision call** before
the Upgrades-tab work can close. Bucket 2 (the objective, no-inspection tickets) is
done and committed on `feat/tab-bucket2-loose-ends` — see the bottom section for
what that pass changed and what it turned up.

Walk this top to bottom in one sitting. Two kinds of item:

- **SIGN-OFF** — the code/wording landed and is evidenced; you just need to look at
  the rendered tab (or the captured screenshot) and say yes/no.
- **DECISION** — a real choice only you can make; the options and their trade-offs
  are laid out so you can pick without re-deriving anything.

## Where the evidence lives (read this first)

All rendered evidence for the sign-off items is in the **main checkout only**, under
`.scratch/stage-gate/wowsims-tab-tickets/` (gitignored — it does not travel to a
fresh clone or CI). Key files:

- Screenshots at 375/653/767/1280, pre-run and post-run:
  `layout-evidence/prerun-*.png`, `postrun-*.png`, `ranking-stage-*.png`
- Set-bonus display, before/after 330's reword and 336's disclosure:
  `d-evidence/before/*.png`, `d-evidence/after/*.png`,
  `d-evidence/disclosure-harness/*.png`
- Live DOM readbacks (the exact strings rendered, read back from the page):
  `d-evidence/after/readback.json`, `cdp-reverify.json`,
  `layout-evidence/ranking-stage-evidence.json`

To see any of this live yourself: from `vendor/tbc-new-fork`, run the tab
(`make host` once for the WASM/assets, then serve `dist/`), open the ret or feral
page, and click into the Upgrades tab. The layout gate `npm run test:layout` also
renders it headless at four widths if you just want the geometry confirmed.

---

## Theme A — Set-bonus display (tickets 313, 315, 330, 336)

These four are one feature seen from four angles: the tab now shows *how much of a
row's DPS gain is the set bonus*, and discloses a reachable 4-piece bonus. The code
landed and every display state was rendered and read back live. Your call is whether
the **numbers, wording, and layout read right to a TBC player**.

### 313 + 315 — the set-bonus share on the row  → SIGN-OFF (these two close together)

- **Look at:** with the "Set potential" toggle ON, the small sub-line under rows that
  have a set context (it shows the bonus DPS and the set/threshold).
- **Owner question:** does the sub-line correctly and legibly tell you how much of the
  row's number is the set bonus — and do the four states read as clearly different?
  The four states, rendered and read back verbatim from the live DOM
  (`d-evidence/after/readback.json`):
  - *prospective:* `"toward Malorne Harness 4pc (+15.9)"`
  - *crosses* (bonus already inside the number): `"includes the 4pc Justicar Battlegear bonus"`
  - *confounded* (breaks another set, disclosed but not ranked):
    `"+83.3 set bonus (Nordrassil Harness) — not counted in ranking: breaks Malorne Harness 2pc"`
  - *no set context:* no line at all
- **Why linked:** 315 is "is this ever observable?" — answer: yes, reachable and
  observed (a real run carries 19 `setContext` rows). 313 is the display itself. They
  were kept open to close **together on your sign-off**, never by an executor.
- **Note (from bucket 2, ticket 335):** the sub-noise suppression floor is now
  documented honestly as the deliberate 2pc bar; that is a code-comment fix, not a
  behaviour change, and does not affect what you see here.

### 330 — the prospective line's wording  → SIGN-OFF

- **Look at:** the exact prospective string above (`"toward {set} {threshold}pc (+{dps})"`).
- **Owner question:** is this the wording you want? You already picked the "toward …"
  form (implies no arrival at a bonus not yet earned, names the threshold once, keeps
  the correct number, and is shorter than the old string). Confirm the rendered result
  matches your intent. Old vs new for reference:
  - old: `"counts toward {threshold}pc {set} (+{dps} at {threshold}pc)"`
  - new: `"toward {set} {threshold}pc (+{dps})"`
- **Settled fact (so you don't re-litigate it):** the number itself is **not**
  mislabeled — when the line says `/2`, the `+dps` really is the 2-piece incremental
  bonus. That was traced and confirmed; only the arrow wording was the issue, and it
  was fixed.

### 336 — disclosing a reachable 4-piece bonus  → SIGN-OFF

- **Look at:** on a row whose set has a reachable 4pc, the extra disclosure line
  naming the 4pc, its DPS, and the pieces. Rendered live on ret:
  `"also opens Crystalforge Battlegear 4pc (+15.5, 4 pieces) — not in this row's number"`
  (screenshots in `d-evidence/disclosure-harness/`).
- **Owner question:** does this disclosure surface the 4pc implication clearly, without
  reading as if the 4pc is credited to the row's number? The row's own number and the
  sort order are deliberately **unchanged** (crediting the 4pc onto the row is the
  game-wrong path ticket 91 rejected); this is disclosure only. Confirm that reads
  right — a large 4pc (Thunderheart +64 class of case) surfaces, a sub-noise 4pc does
  not.

---

## Theme B — TMB export box (tickets 314, 328-copy)

### 314 — the ThatsMyBis export box  → SIGN-OFF (one small gap to eyeball)

- **Look at:** the export box that sits with the results after a run — a monospace
  textarea of `{"items":[{"id":…}]}`, an item count, a Copy button, and the caveat line.
- **Owner question:** does the box export the **displayed** rows in **cross-slot ranked
  order** (a loot-priority list), not slot-grouped? Verified by readback: a 15-id ret
  payload whose slots interleave (`weapon, waist, chest, head, head, chest, …`) — the
  slot-grouping failure mode is refuted — with zero duplicate ids, count `"15 items"`,
  and the caveat `"Copy these raid-drop upgrades as JSON to import into a loot-priority tool."`
- **The one thing not re-captured (your eyes worth it):** the payload updating live
  when you toggle **BiS-only** on/off. Displayed order is confirmed and the payload is
  built from the displayed rows by construction, but the explicit toggle-and-watch-it-
  change readback was not re-driven. Toggle BiS-only and confirm the JSON changes.
- **Still tracked separately, not part of this sign-off:** ticket 126 (export should
  emit *token/pattern* ids for tier/craftables) — a payload-correctness follow-up.

---

## Theme C — Native styling & mobile legibility (tickets 328, 327)

### 328 — controls and export button match native wowsims styling  → SIGN-OFF

- **Look at:** the export **Copy** button (should look enabled/filled, not disabled),
  the "Set potential" / "BiS only" checkboxes (should be normal size, not oversized),
  and the "Content" dropdown (normal `.form-select` size).
- **Owner question:** do these controls now match how wowsims styles its own pages?
  Verified: Copy is the filled native `btn-secondary` with `fa-copy` (solid grey
  `rgb(108,117,125)`, opacity 1); the checkboxes are native `BooleanPicker`s at ~28px;
  the dropdown is a native `.form-select` at ~28px. Screenshots in
  `layout-evidence/ranking-stage-evidence.json` + PNGs.
- **Copy sub-item (your wording call):** the export blurb and the set-potential
  **tooltip** were reworded (blurb above; tooltip: `"When on, a row's DPS gain includes
  a set bonus the swap would earn. Bonuses too small to change the ranking are
  ignored."`). Confirm the tooltip wording reads right. Note it was written against the
  current understanding of what the toggle does; if ticket 331's open question about
  toggle semantics ever changes that, the tooltip should be revisited.

### 327 — results table legible below 768px  → SIGN-OFF (raised three times — worth a real look)

- **Look at:** the results table at **375 / 653 / 767** (phone/narrow) on a feral or
  ret run. Slot labels and DPS figures must each be on **one horizontal line**; no
  vertical letter-stacking, no clipped text, no huge row gaps. The table scrolls
  horizontally inside its panel rather than shattering.
- **Owner question:** is the sub-768 table now legible (your prior verdict was
  "0.5/10 on CSS fundamentals")? Verified: the layout gate passes 37 assertions at
  375/653/768/1280 against a real run, and `postrun-375.png` shows "Chest"/"Head"
  labels and "+22.0 DPS"/"-30.8 DPS" each on one line. **Bucket 2 additionally proved
  the gate *bites* on this exact defect** — shattering the Slot cell to ~1ch makes the
  gate fail — so a future regression here will be caught. Still, this defect has been
  reported three times; a direct look at the narrow widths is warranted.

---

## DECISIONS — real calls only you can make

### 320 — "Raid zones" filter group lists "World Bosses"  → DECISION (new, surfaced in bucket 2)

- **What was found (measured, not guessed):** enumerated every distinct `zone` value
  across all 44 built universes. Nine of ten are genuine TBC raids and correctly sit
  under "Raid zones". The tenth is **"World Bosses"** (20 items, e.g. Doomwalker /
  Kazzak) — a raid-*difficulty* outdoor bucket, not a raid *instance*, that currently
  shows under the "Raid zones" group label.
- **Why it's deliberate (context for your call):** the pipeline assigns
  `WORLD_BOSS_ZONE = "World Bosses"` because outdoor bosses have no zoneId — it's the
  only thing tying their drops to a phase — matching AtlasLoot's own `WorldBossesBC`
  grouping, which files world bosses alongside raids.
- **Your options:**
  - **A (cleanest):** rename the group label "Raid zones" → **"Content"** (the ticket's
    own suggestion; true of raids and world bosses alike). One i18n string.
  - **B:** move "World Bosses" into the "Other sources" group. But it's legitimately
    raid-tier gear a raider shortlists, so demoting it may read as *more* wrong.
  - **C:** accept it (AtlasLoot and many players group world bosses with raids); the
    measurement is now recorded, closing the "unmeasured hypothesis" gap. Zero code.
- **Recommendation:** A if the label bothers you, else C. Detail + measurement table in
  ticket 320 (left open pending your pick).

### 325 — where the layout gate runs automatically  → DECISION (new, surfaced in bucket 2)

- **What was found (measured):** the layout gate (`test-layout.mjs`) is built, runs from
  the main checkout, and now bites (322/329/326 all handled). But it is invoked by
  **nothing automatic**, and the ticket's assumed home — the fork's CI — doesn't work:
  - the fork's CI (`run_tests.yml`) runs only `test:locales` (not lint/type-check/layout)
    and fires only on PRs to upstream `master`, which this fork never opens
    (`pushed: false`);
  - that CI has **no Chromium**, which the gate needs;
  - `pnpm verify` runs on machines where the fork is absent (CI, fresh clones), so it
    can't be a hard gate there either.
  - **So the gate can only run automatically from the main checkout, as a local/pre-merge
    step.** That constraint is what decides it — recorded per the ticket's instruction.
- **Your options:**
  - **A:** fold it into the `pre-merge-review` step or `docs/workflow.md`'s loop — "when a
    change touches the fork's tab SCSS/tsx, run `npm run test:layout` and record the
    result." No new automation; relies on the reviewer.
  - **B:** a soft local check (main-checkout-only script that skips when the fork /
    `dist/` / Chromium is absent), optionally surfaced by `pnpm verify` as a
    warning-only line the way `upstream-drift:warn` already is.
  - **C:** accept manual invocation, just document its existence in
    `docs/upgrades-tab-scope.md`.
- **Recommendation:** A or B — both keep the gate honest without pretending CI runs it.
  This is a workflow-ownership call, and it steers future sessions, so it's yours to
  make (and any doc/skill edit to implement it should be proposed in chat first). Detail
  in ticket 325 (left open).

### 270 — "Already have it" control semantics  → DECISION (known, still open)

- **The question:** the shipped control is a `greyOwned` checkbox that greys/un-greys
  owned rows — which "answers no user question." TMB's equivalent is show/hide received.
- **Your options (from the ticket):**
  1. Remove the toggle; owned rows are always greyed (matches PLAN.md §12 as written).
  2. Make it "Hide already-have" — **not allowed** under §8.3.3 (owned rows never
     dropped) unless you amend that rule.
  3. Keep the toggle and document why un-greying is useful.
- Detail in ticket 270.

### 337 — upstream content tier 2 → 3  → PARKED (already ruled, no action)

- **Not an open decision.** You already ruled (2026-08-30): keep the tab on **Phase 2**;
  the PR targets `feature/backend-reforge`, which is still Phase 2 at its tip, so a
  Phase-2 tab is *correct* for this PR, not a compromise. Ticket is `blocked` on reforge
  reaching Phase 3, not awaiting a fresh call. Listed here only so you don't trip over it
  as if it were open.

---

## What bucket 2 changed (context, no action needed)

Committed on `feat/tab-bucket2-loose-ends` (off `dev`), **not merged** — awaiting your
review/merge ask. `pnpm verify` green (EXIT 0, 56 test files); fork `type-check` and
`test:layout` green.

- **335 (closed):** the set-bonus noise-floor doc comment now honestly names the `√2`
  factor as the deliberate 2pc bar (measured: no committed 4pc bonus lands in the
  under-filtered band, so branching the floor would change nothing and point the wrong
  way). Ported to the fork twin via the full PROVENANCE cycle. Core `fd83a67`, fork
  `03f5f003c`.
- **317 + 319 (closed):** both round-4 findings against the fork's `upgrades_tab.tsx`
  (settings emitter never emitted; stale read-helper guard comments) were already fixed
  on the fork tip; verified by `type-check` and closed. `0db9e57`.
- **322 + 326 + 329 (closed):** the layout gate is built, hardened (assertion #5's
  width-parity escape hatch closed), and its legibility assertions verified to bite.
  Core `000a680`, fork `cab940cd6`.
- **320 + 325 (left open):** the two DECISION items above — surfaced with measurements,
  left for your call rather than guessed.
