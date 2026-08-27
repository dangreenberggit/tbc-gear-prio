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

**This is not an Upgrades-tab bug.** Every `.text-muted` on the site has
the same computed colour. The tab is simply where it was noticed, and it
is the tab that uses muting most (10 uses, `grep -n text-muted
upgrades_tab.tsx`).

### What follows for this tab

Two things must not be confused:

1. **The token is broken site-wide.** Fixing `--bs-secondary-color`
   belongs in the theme, not in this tab's partial, and it changes every
   tab. That is a separate change with a separate blast radius — see
   "Owner questions" below.
2. **This tab over-mutes regardless.** Even with a readable muted token,
   muting is currently the default rather than an emphasis choice:
   status lines, all three empty states, and whole owned rows are muted,
   so nothing reads as primary. That part is this tab's to fix and is
   what the emphasis map below decides.

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

1. **Fix `--bs-secondary-color` site-wide?** The token is wrong for a
   dark theme on every tab, and 1.11:1 is unreadable everywhere it is
   used, not only here. Setting `$body-secondary-color` in
   `_variables.scss` is a one-line theme change with a site-wide blast
   radius, so it is not made inside a tab-scoped UI pass. If the answer
   is no, this tab needs its own readable secondary colour, which is a
   second idiom and worse.
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

Reserving that space permanently would contradict the recorded WP5
decision that view options stay hidden until a run produces rows. The
options are: accept the one-time shift at completion (it happens once,
not every tick, and the user is looking at newly-arrived results);
reserve the row height always and accept an empty gap in idle; or
animate it. This is a design call, so it is listed here rather than
decided in a CSS commit.
