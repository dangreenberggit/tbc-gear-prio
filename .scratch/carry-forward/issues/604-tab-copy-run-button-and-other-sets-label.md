Status: open
Serves: .scratch/plans/upgrades-tab-finish-line.md, Chunk 3b
Type: bug
Origin: Chunk 3b step 7 regression check (commit c5741e2c), findings F1 and the ticket-438 closing note
Blocks: none
Blocked by: none
Related: 438 (closed design exploration), 448 (closed; built the disclosure)

# Two tab strings are wrong: "Press Run" and "Other sets (n)"

Both fixes are text in the tab's locale file,
`vendor/tbc-new-fork/assets/locales/en/upgrades.json` (line numbers at fork
`316326a95`).

## 1. The empty state names a button that does not exist

Before the first run, the results area says "This tab ranks gear upgrades
against the character and settings on this page. Press Run to start."
(`empty_no_ranking_body`, `:127`). The button is labelled "Simulate"
(`run`, `:9`). The line above the empty state, "Ranks upgrades against
your current gear and settings on this page." (`idle`, `:41`), says the
same thing as the body's first sentence, so the two lines repeat each
other.

Seen in the capture `312-settings-pre-run-1280-0.png` (main checkout,
gitignored, `.scratch/tab-scope-refresh/review/`; rebuild with
`pnpm tab-review` and that folder's `manifest.json`).

## 2. The Sim-sets disclosure is not worded as the owner's pick

The Sim-sets control hides other phases' sets behind a disclosure that
reads "Other sets (3)" (`sets_other_phases`, `:21`; same capture). What it
hides is sets from other phases: `splitSetChips` keeps current-phase,
phaseless and selected sets and hides the rest
(`ui/features/upgrades/model/settings_pool.ts:132-136`).

The owner's pick, recorded in
`.scratch/handoffs/438-sources-sim-sets-design-HANDOFF.md:64` and `:67`
(commit `0cff00e5`, 2026-09-19): option "(b) Current phase + 'Other phases
(n)' disclosure", marked "Recommended: (b) disclosure. Runner-up: (a). —
OWNER CONFIRMED (b), 2026-09-19." Ticket 448 built it with the label "Other
phases ({{n}})" and recorded that string as a "placeholder (owner-taste, to
confirm)" (448, last lines). The React port wrote "Other sets ({{n}})" when
it added the tab strings (fork commit `0678266a0`, 2026-10-05). The record
shows the owner chose option (b), whose name contained "Other phases (n)";
it does not show the owner ruling on the wording itself.

## What would close this

- The empty-state body names the button by its label, or no button, and
  the intro and the empty state no longer repeat each other.
- The disclosure reads "Other phases (n)", or the owner rules that "Other
  sets (n)" stays (quote the ruling here).
- `node test-locales.mjs` in the fork passes (ticket 432: it is not part of
  `pnpm verify`).
