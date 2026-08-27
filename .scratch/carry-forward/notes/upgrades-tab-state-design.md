# Upgrades tab: state presentation design note

Closes the design half of ticket 290. Written during the ticket-304 UI
quality pass, before the states cluster (304 items 1 and 2) was
implemented, so the implementation follows a reviewed design rather than
the other way round.

Scope: this tab only. It does not set cross-tab precedent, so it is a
note under `.scratch/carry-forward/notes/`, not an ADR — 290's own
wording makes ADR conditional on setting precedent beyond this tab.

## The measurement this note is built on

Ticket 304 item 1 says the grey text is unreadable. That was checked in
devtools against the running tab (ret sim, localhost:5173, 1280x720)
rather than argued from the token names, and the result changes what the
fix has to be:

| What | Value |
| --- | --- |
| Computed colour of every `.text-muted` in this tab | `rgba(33, 37, 41, 0.75)` |
| Effective background behind it | `rgb(21, 23, 30)` (`#15171e`) |
| Blend | `rgb(30, 34, 38)` |
| **Contrast ratio** | **1.11:1** |
| Body text (`#fff`) on the same background, for comparison | 17.9:1 |
| Font size in all cases | 14px |

WCAG AA for body text is 4.5:1. **1.11:1 is not a hierarchy problem, it
is invisible text** — dark grey on a near-black background.

Cause: the fork sets the Bootstrap SCSS variables `$body-bg: #15171e`
and `$body-color: $white` (`ui/scss/shared/_variables.scss:250-251`) but
never sets `$body-secondary-color`. Bootstrap 5.3 emits
`--bs-secondary-color` from that separate variable, so it keeps its
light-theme default, `rgba(33, 37, 41, .75)` — a colour meant for a
white page. `.text-muted` resolves to it. Confirmed by reading
`--bs-secondary-color` off `:root` in the running page, and by
`grep -rn secondary-color ui/scss`, which finds only
`--main-secondary-color`, an unrelated token.

**But `.text-muted` is not site styling — we invented it.** It appears in
exactly two files, `upgrades_tab.tsx` (10 uses) and
`upgrades/wcl_import_modal.tsx` (4), both added by our own commits
(`git log --diff-filter=A`). Nothing else in `ui/` uses `text-muted`,
`text-body-secondary` or `text-secondary`, and no SCSS reads
`--bs-secondary-color`.

What upstream actually does for de-emphasised text is set an explicit
grey: `var(--bs-gray-300)` (`_dropdown_picker.scss:26`),
`var(--bs-gray-500)` (`_stat_weights_action.scss:124`), `$gray-600` for
`$form-text-color` (`_variables.scss:354`).

Measured against the `#15171e` body background:

| Colour | Ratio |
| --- | --- |
| `--bs-gray-300` (#dee2e6) | 13.75:1 |
| `--bs-gray-500` (#adb5bd) | **8.63:1** |
| `--bs-gray-600` (#6c757d) | 3.82:1 — fails AA, not used for text |
| body white (#fff) | 17.9:1 |

### What follows for this tab

Two things must not be confused:

**Decided (owner ruling): do not touch the theme token.** Setting
`$body-secondary-color` would re-theme every tab to fix a token only
these two files read. Creating a tab-local muted colour would be a
second idiom, which is the exact failure ticket 304 exists to correct.
Instead `.text-muted` is dropped from both files and the site's own
`var(--bs-gray-*)` convention is used, at the level the emphasis map
below assigns. The whole change stays inside the files we own.

That still leaves this tab over-muting: muting was the default rather
than an emphasis choice, so nothing read as primary. The emphasis map
settles that separately from the colour question.

## The seven states

Controls behave the same in every state and are listed once: Run is
disabled only while running; Stop is enabled only while running; the
view filters (set-bonus potential, BiS-only, content) are absent until a
run has produced rows that need them, which is a deliberate recorded
decision (WP5) and is kept.

| State | Status line | Results area | Notes |
| --- | --- | --- | --- |
| **idle** | "Ranks upgrades against your current gear and settings on this page." — body colour, not muted. It is the only instruction on screen. | Designed empty state: heading, one line of why it is empty, and the Run call to action. | Currently a bare muted div (`empty_no_ranking`, tsx:1284). |
| **running** | Stage label plus landed-row count, e.g. "Simming 33/97… (33 rows landed)", with the progress bar in a reserved column so it cannot slide. Body colour. | Provisional table of rows landed so far; when none have landed yet, "Rows appear here as their sims finish." | The reserved-width label and the fixed grid are ticket 304 item 11's fix, already landed. |
| **done** | "Your current gear: {dps} DPS. Took {n}s." Body colour. | Shortlist table, then the collapsed below-cutoff group. | The elapsed time is genuinely secondary and may stay muted once the token is readable. |
| **done + stale** | Same, plus "settings changed since this ranking — results may be out of date" in warning tone. | Unchanged from done. | Warning tone already carries the signal; the stale clause should stay `<strong>`, not muted. |
| **stopped** | "Stopped early. Your current gear: {dps} DPS. No candidate rows to show — run again for a full ranking." Warning tone. | Empty — matches the reset behaviour. | **290's wording item is already satisfied.** The stale text 290 complains about ("rows still simming were skipped") is gone: `grep -rn "rows still simming" ui assets` returns nothing. The current string already reconciles with the reset. No change needed. |
| **error** | "Ranking failed: {message}" in danger tone. | Empty. | One red line is enough signal here: the message is specific, and the assertive live region already interrupts. Recorded as a deliberate answer to 290's "is one red text line enough?" — yes, because the failure is not silent and the recovery is the same Run button. |
| **unsupported-spec** | "This spec has no ranking data yet." | Designed empty state, but with no Run call to action — Run cannot help. | The one empty state whose CTA must be absent rather than present. |

### The three empty states are three different messages

They currently render as the same bare muted div. They are not the same
message:

- `empty_no_ranking` (idle) — "nothing has been run yet". Gets the full
  treatment: heading, explanation, Run CTA. This is the first thing a
  new user sees on the tab.
- `rows_pending` (running, nothing landed) — "this is filling in".
  Transient, measured in seconds. No heading and no CTA; a CTA here
  would invite the user to interrupt their own run. One line is right.
- `empty_no_upgrades` (done, genuinely nothing) — "the run worked and
  found nothing above the cutoff". This is a *result*, not an absence,
  and it is the state most likely to be misread as broken. Heading plus
  one line explaining that the cutoff is why; no Run CTA, because
  re-running the same settings gives the same answer. Pointing at the
  filters is the useful next step.

## Text emphasis map

Decided from the measurement above, not by eye. Once the muted token is
readable, muting means "deliberately secondary". Until then, every one
of these should be body colour, because muted is currently invisible.

Expressed in `--bs-gray-*` levels, not `text-muted`, which no longer
exists in either file. "body" means no colour class at all — inherit
white at 17.9:1. "secondary" means `.upgrades-text-secondary`, backed by
`var(--bs-gray-500)` at 8.63:1.

| Site (tsx line) | Today | Should be | Why |
| --- | --- | --- | --- |
| idle status (934) | muted | **body** | The only instruction on the screen. |
| unsupported-spec status (936) | muted | **body** | Explains why the tab is inert. |
| running status (947) | muted | **body** | The live state of the thing the user just started. |
| done status (976) | muted | **body**, with the elapsed clause secondary | The DPS baseline is the headline number. |
| `empty_no_ranking` (1284) | muted | **body** heading + secondary explanation | Primary content of an otherwise empty screen. |
| `rows_pending` (1301) | muted | secondary (legitimately) | Transient, and the progress bar carries the real signal. |
| `empty_no_upgrades` (1354, 1366) | muted | **body** | A result, not an absence. |
| owned row (1501) | `upgrades-row-owned text-muted` | secondary (legitimately), but not via the broken token | "You already have this" is exactly what secondary means. Stacking two muting mechanisms is what made these rows unreadable. |
| `(Owned)` suffix (1541) | muted | secondary (legitimately) | Same reason. |

So: four of the six status/empty uses become body colour; the three
owned/pending uses stay secondary because secondary is what they mean.

## Owner questions

Neither is guessed here.

1. ~~Fix `--bs-secondary-color` site-wide?~~ **Answered: no.** The token
   is read only by the two files we added, so the fix is to adopt
   upstream's `var(--bs-gray-*)` convention in those files rather than
   change the theme. No cross-tab blast radius. See above.
2. **Should slot sub-tabs appear for slots with no rows?** Today a tab
   exists only for slots present in the ranking
   (`slotsInView(unfilteredView())`, deliberate per the comment at
   tsx:~1130). Rendering all 17 equip slots and grey-disabling the empty
   ones is a behaviour change, not styling, and it is a product ruling
   about whether "no upgrade for this slot" is information worth showing.
3. **Should the tab strip be grouped into rows (armour / jewellery /
   weapons)?** Ticket 304 item 10 asks for organisation. Counts,
   pinned-first ordering and muted zero-count tabs are shipping as the
   baseline. A grouped strip has **no site idiom to borrow** — no other
   nav on the site groups tabs into labelled sections — so inventing one
   is exactly the failure mode the ticket's summary judgment names. Left
   as a follow-up if the owner wants it.

## Known gap, recorded rather than fixed

Ticket 304 item 5 (vertical jitter) is only half addressed by the
ticket-304 pass. Measured: `.upgrades-status` is a constant height in
idle, running and done, so the status line is *not* the cause. The jump
comes from `.upgrades-toolbar` growing from 69.6px to 108.1px at
completion, when `refreshViewControlVisibility()` reveals the view
filters and pushes everything below down ~82px.

**Answered (owner ruling): reserve the height always**, accepting an
empty strip before the first run. This overrides WP5's decision to drop
the group from layout while empty. WP5's stated concern was not drawing
an empty *bordered box* in the pre-run states; bare reserved height with
no border and no separator honours that concern while removing the jump
the owner reported. Measured after the change: toolbar height is a
single value, 111.6px, across every sample of a full run.

One residual shift remains and belongs to item 10, not item 5: the slot
sub-tab strip grows as tabs appear for slots in the ranking.
