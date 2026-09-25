# Tooltip and data-table conventions

This note collects published rules for tooltips, disabled controls, numbers in
tables, missing values and interface wording. It is the research step that
`.scratch/handoffs/494-set-hover-redo.md` section 6 asks for before the
set-bonus hover (ticket 494) and the disabled "Set potential" message (ticket 501) are designed again. Each rule links to the page that states it. Where
sources disagree, the note gives both.

Source notes:

- The Material Design 3 pages load their text with JavaScript, and the fetch
  tool used for this note could not read them. Material rules below come from
  Google's Android Compose tooltip page, which implements Material 3.
- The Carbon usage pages were read from the Carbon website's source files on
  GitHub. The links point to the published pages.

## 1. Tooltip content and length

- A tooltip is brief extra help. NN/g calls tooltips "microcontent" that must
  make sense on their own, and says to keep them brief.
  <https://www.nngroup.com/articles/tooltip-guidelines/>
- Apple sets a length limit: keep tooltip text to about 60 to 75 characters.
  Apple also says to describe only the control the person is pointing at, and
  to use a sentence fragment and omit articles where you can.
  <https://developer.apple.com/design/human-interface-guidelines/offering-help>
- Apple says that if a tooltip needs a lot of text, you should simplify the
  interface instead. Apple also says to leave out ending punctuation when the
  text is complete sentences.
  <https://developer.apple.com/design/human-interface-guidelines/offering-help>
- Material 3 has two kinds. A plain tooltip gives a brief description of an
  element, such as an icon button. A rich tooltip gives more detail and can
  have a title, a link and buttons.
  <https://developer.android.com/develop/ui/compose/components/tooltip>
  (Material 3 page, not machine-readable for this note:
  <https://m3.material.io/components/tooltips/guidelines>)
- Fluent says a tooltip gives additional information, not redundant
  information, and that "robust, formatted information" belongs in a popover.
  <https://fluent2.microsoft.design/components/web/react/core/tooltip/usage>
- Carbon separates the three patterns. A tooltip opens on hover or focus and
  holds brief information with nothing to click. A toggletip opens on click or
  Enter and can hold interactive elements. A popover is the base layer that
  both are built on.
  <https://carbondesignsystem.com/components/tooltip/usage/> and
  <https://carbondesignsystem.com/components/toggletip/usage/>
- Carbon limits a toggletip to 288px wide and says content must never scroll
  sideways or run off the page.
  <https://carbondesignsystem.com/components/toggletip/usage/>
- A tooltip must not contain links, buttons or anything else that takes focus.
  The WAI-ARIA pattern says to use a non-modal dialog for that.
  <https://www.w3.org/WAI/ARIA/apg/patterns/tooltip/>. Carbon and Atlassian
  say the same: <https://carbondesignsystem.com/components/tooltip/usage/>,
  <https://atlassian.design/components/tooltip/usage>
- Custom tooltips must meet WCAG 1.4.13. The person must be able to dismiss
  the tooltip without moving the pointer or focus (for example with Escape),
  move the pointer onto the tooltip without it closing, and read it until they
  move away.
  <https://www.w3.org/WAI/WCAG22/Understanding/content-on-hover-or-focus.html>
- A tooltip must open on keyboard focus as well as on mouse hover.
  <https://www.nngroup.com/articles/tooltip-guidelines/>,
  <https://www.w3.org/WAI/ARIA/apg/patterns/tooltip/>
- A tooltip's own text must not be cut off. Atlassian says to make sure the
  content fits without truncation.
  <https://atlassian.design/components/tooltip/usage>

## 2. When a tooltip should not exist

- Do not put information in a tooltip if the person needs it to finish the
  task. Show it on the page instead.
  <https://www.nngroup.com/articles/tooltip-guidelines/>,
  <https://carbondesignsystem.com/components/tooltip/usage/>,
  <https://atlassian.design/components/tooltip/usage>
- Do not repeat what a visible label already says.
  <https://www.nngroup.com/articles/tooltip-guidelines/>,
  <https://atlassian.design/components/tooltip/usage>
- Apple says to avoid repeating a control's name in its tooltip, because it
  takes space and rarely adds value.
  <https://developer.apple.com/design/human-interface-guidelines/offering-help>
- Heydon Pickering, who named the toggletip pattern, argues that clear visible
  labels usually make tooltips unnecessary, and that important text belongs in
  the page itself.
  <https://inclusive-components.design/tooltips-toggletips/>
- Atlassian says to use tooltips only on interactive elements, such as
  buttons, links and menu items, so that keyboard and screen reader users can
  reach them. <https://atlassian.design/components/tooltip/usage>
- Use tooltips the same way across the product, not on a few elements only.
  <https://www.nngroup.com/articles/tooltip-guidelines/>

## 3. Labelling numbers in a tooltip or small overlay

No source found for this note gives rules written for numbers inside a
tooltip. The nearest rules are the ones for tables, which follow. They apply
to any list of figures.

- Describe the units unless every figure in the table has the same units.
  <https://analysisfunction.civilservice.gov.uk/policy-store/data-visualisation-tables/>
- Use the same number of decimal places for every figure in a column, and
  right-align figures so units sit over units.
  <https://analysisfunction.civilservice.gov.uk/policy-store/data-visualisation-tables/>
- Use a minus sign for negative numbers, and write 0.5, not .5.
  <https://guidance.publishing.service.gov.uk/writing-to-gov-uk-standards/style-guides/a-to-z-style-guide/>
- The ONS allows the plus and minus symbols only in a dataset or table. In
  running text it asks writers to avoid them, because some screen readers read
  out every symbol.
  <https://service-manual.ons.gov.uk/content/formatting-and-punctuation/symbols-and-special-characters>
- Do not use colour as the only way to show meaning. A red or green figure
  still needs its sign or a word.
  <https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html>
- Apple says a tooltip describes only the control the person points at. For a
  figure, this means the tooltip explains that figure and not the figures
  around it.
  <https://developer.apple.com/design/human-interface-guidelines/offering-help>
- Avoid footnotes where you can, because jumping between parts of the text
  confuses readers.
  <https://analysisfunction.civilservice.gov.uk/policy-store/data-visualisation-tables/>

## 4. Explaining a disabled control

Whether to disable at all:

- GOV.UK says disabled buttons have poor contrast and can confuse some users,
  so avoid them if possible. Use them only if research shows they make the
  interface easier to understand.
  <https://design-system.service.gov.uk/components/button/>
- NN/g says disabled buttons often confuse people, should be used sparingly,
  and must clearly explain why they are disabled.
  <https://www.nngroup.com/videos/why-disabled-buttons-hurt-ux-and-how-to-fix-them/>
- NN/g says a disabled control should look muted, but its label must stay
  readable. <https://www.nngroup.com/articles/button-states-communicate-interaction/>

Whether a disabled control can have a tooltip. The sources disagree:

- Atlassian says never to put a tooltip on a disabled button, because a
  disabled button cannot take keyboard focus.
  <https://atlassian.design/components/tooltip/usage>
- Fluent says that on a disabled control the tooltip should state the
  circumstances that can enable the control.
  <https://fluent2.microsoft.design/components/web/react/core/tooltip/usage>

The technical facts behind that disagreement:

- The HTML `disabled` attribute takes an element out of the focus order.
  `aria-disabled="true"` marks it as disabled but keeps it focusable, and it
  has no default styling.
  <https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-disabled>
- The WAI-ARIA practices keep a disabled element focusable when people need
  to find it, and let it leave the focus order when people can work out that
  it is there from the controls around it.
  <https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/>
- NN/g recommends `aria-disabled` so the control still takes focus and screen
  readers announce that it is inactive.
  <https://www.nngroup.com/articles/button-states-communicate-interaction/>
- Tippy.js (the tooltip library the tab uses) cannot open on an element with
  the `disabled` attribute. Its documented workaround is a wrapper element
  with `tabindex="0"`, and it warns that this "has accessibility concerns".
  <https://atomiks.github.io/tippyjs/v6/constructor/>

How to write the explanation:

- Say what would make the control available (Fluent) and why it is not
  available now (NN/g). Links as above.
- Apple suggests context-sensitive tooltips: different text for each state of
  a control. So each message should describe only the state it is shown in.
  <https://developer.apple.com/design/human-interface-guidelines/offering-help>
- No source found for this note says directly that one message must be true
  in every state it can appear in. That requirement follows from Apple's rule
  above; treat it as this note's reading, not a quoted rule.

## 5. Data-table conventions

Signed figures, alignment and decimals:

- Right-align figures and their column headings, and use the same precision
  in each column.
  <https://analysisfunction.civilservice.gov.uk/policy-store/data-visualisation-tables/>
- GOV.UK: when comparing columns of numbers, align the numbers to the right.
  <https://design-system.service.gov.uk/components/table/>
- USWDS tables use right alignment and tabular (fixed-width) figures for
  numbers, and show negative numbers with a sign.
  <https://designsystem.digital.gov/components/table/>
- PatternFly offers a tabular-figures style for numbers, and says every row
  must use the same format and a cell's content must match its column's type.
  <https://www.patternfly.org/components/table/design-guidelines>
- The plus and minus symbols are acceptable in tables.
  <https://service-manual.ons.gov.uk/content/formatting-and-punctuation/symbols-and-special-characters>

Secondary lines under a cell value:

- No source found for this note gives a rule for a small second line under a
  number in a table cell. The nearest rule is PatternFly's: rows must be
  consistent, including how text wraps in each row.
  <https://www.patternfly.org/components/table/design-guidelines>

Truncation and wrapping in narrow cells:

- WCAG 1.4.4 requires that text can grow to 200 percent without loss of
  content, which rules out clipping text at larger sizes.
  <https://www.w3.org/WAI/WCAG22/Understanding/resize-text.html>
- Atlassian allows a tooltip to show the full text when truncation cannot be
  avoided. <https://atlassian.design/components/tooltip/usage>
- PatternFly shows a count label (for example "+3") when a list in a cell is
  cut short. <https://www.patternfly.org/components/table/design-guidelines>
- USWDS puts wide tables in a scrolling container rather than cutting cells.
  <https://designsystem.digital.gov/components/table/>

## 6. Showing "not measured" or "not available"

- Use 0 only for a true zero. For a value that rounds to zero but is not
  zero, the UK Government Analysis Function uses `[low]`.
  <https://analysisfunction.civilservice.gov.uk/policy-store/symbols-in-tables-definitions-and-help/>
- The same guidance uses `[x]` for "not available" and `[z]` for "not
  applicable", and explains every shorthand above the table.
  <https://analysisfunction.civilservice.gov.uk/policy-store/symbols-in-tables-definitions-and-help/>
- It does not recommend "NA", because readers cannot tell whether it means
  "not applicable" or "not available".
  <https://analysisfunction.civilservice.gov.uk/policy-store/symbols-in-tables-definitions-and-help/>
- The Canada.ca Content Style Guide (section 5.3) says to explain why a cell
  has no value, in the notes, caption or nearby text. If the cell needs
  content, it allows "no data", "0" or "n/a". It notes that assistive
  technology announces blank cells. <https://design.canada.ca/style-guide/>
- The sources disagree on "n/a": Canada.ca allows it, and the Analysis
  Function advises against "NA". Both agree that the reason must be explained
  and that a blank cell alone does not say why it is blank.

## 7. Plain language for interface text

- Plain English is mandatory on GOV.UK. Use short words ("buy", not
  "purchase"), split sentences over 25 words, explain a specialist term the
  first time you use it, and prefer the active voice. GOV.UK warns that
  buzzwords are vague and lead to misinterpretation.
  <https://guidance.publishing.service.gov.uk/writing-to-gov-uk-standards/writing-guidelines/clear-language/>
- A technical term is not jargon if you explain it the first time you use it.
  <https://guidance.publishing.service.gov.uk/writing-to-gov-uk-standards/style-guides/a-to-z-style-guide/>
- Google's style guide says to replace jargon with plainer words where you
  can, and to define a term on first use when you must keep it.
  <https://developers.google.com/style/jargon>
- Use the active voice so it is clear who or what does the action.
  <https://developers.google.com/style/voice>
- Expert readers also prefer plain text: NN/g found that highly educated
  readers "crave succinct information that is easy to scan".
  <https://www.nngroup.com/articles/plain-language-experts/>
- Apple asks for sentence case in tooltips, and a verb first when the tooltip
  describes an action.
  <https://developer.apple.com/design/human-interface-guidelines/offering-help>

## What this means for the Upgrades tab

Each check names the section it comes from.

- The hover describes only the figure it opens from, not other rows or the toggle. (Sections 1, 3)
- The hover describes only the toggle state on screen now; it never shows the "Set potential" off and on totals together. (Section 4, Apple context-sensitive rule)
- The hover has no links or buttons; if it needs them, it becomes a click-opened toggletip or dialog. (Section 1)
- The hover opens on keyboard focus, closes on Escape, and stays open while the pointer is over it. (Section 1, WCAG 1.4.13)
- Each hover line fits in about 60 to 75 characters; if the content needs full sentences, the design is too complex for a tooltip. (Section 1)
- If the row has nothing the figure does not already say, there is no hover and no sub-line. (Section 2)
- Anything the user needs to judge the row is on the row, not only in the hover. (Section 2)
- Every figure in the hover has a label that names what it measures; the unit is stated once if all figures share it. (Section 3)
- Every figure has a sign (+ or −, a true minus), one decimal place, and right alignment in a column of figures. (Sections 3, 5)
- Colour is never the only sign of gain or loss. (Section 3)
- The sub-line uses the same wording and position on every row that has one. (Section 5)
- No figure or sub-line is clipped at 200 percent text size in the 5.5rem cell. (Section 5, WCAG 1.4.4)
- A value that was not measured is never shown as 0 or as a blank; it uses a word that says why, explained once. (Section 6)
- "Too small to count" (between 0 and the floor) and "no gain" (at or below 0) use different words, because they mean different things. (Section 6)
- Before disabling the "Set potential" toggle, check whether it can stay enabled; if it is disabled, it uses `aria-disabled` or a focusable wrapper so its message can open on focus. (Section 4)
- The disabled message says why the toggle is unavailable and what would make it available, and it is true for every row set it can appear with. (Section 4)
- If there are several disabled reasons, each message is written from one statement of the mechanism, so the messages do not contradict each other. (Section 4, Section 7)
- No label is a made-up phrase; each uses words a player already knows, or explains the term the first time. (Section 7)
- Labels use sentence case, short common words and the active voice. (Section 7)

## The four rejected labels

- **"In this DPS now"**: it states something false, because the item is not
  equipped yet, and it is an invented phrase. GOV.UK warns that vague
  phrasing leads to misinterpretation, and a tooltip must describe the state
  the person actually sees.
  <https://guidance.publishing.service.gov.uk/writing-to-gov-uk-standards/writing-guidelines/clear-language/>,
  <https://developer.apple.com/design/human-interface-guidelines/offering-help>
- **"needs breaking"**: it is a fragment with no subject or object, so the
  reader cannot tell what must break or why. It is jargon with no definition,
  which Google's style guide asks writers to replace or define.
  <https://developers.google.com/style/jargon>
- **"Set potential adds"**: it repeats the toggle's name inside the hover,
  which Apple says rarely adds value, and it describes what the other toggle
  state would add rather than the state on screen.
  <https://developer.apple.com/design/human-interface-guidelines/offering-help>
- **"Not counted"**: it does not say why the value is left out (too small,
  no gain, or not measured). The Analysis Function rejects "NA" for the same
  kind of ambiguity, and Canada.ca asks for the reason to be explained.
  <https://analysisfunction.civilservice.gov.uk/policy-store/symbols-in-tables-definitions-and-help/>,
  <https://design.canada.ca/style-guide/>

## Sources

- <https://www.nngroup.com/articles/tooltip-guidelines/>
- <https://www.nngroup.com/articles/button-states-communicate-interaction/>
- <https://www.nngroup.com/videos/why-disabled-buttons-hurt-ux-and-how-to-fix-them/>
- <https://www.nngroup.com/articles/plain-language-experts/>
- <https://m3.material.io/components/tooltips/guidelines>
- <https://developer.android.com/develop/ui/compose/components/tooltip>
- <https://developer.apple.com/design/human-interface-guidelines/offering-help>
- <https://www.w3.org/WAI/ARIA/apg/patterns/tooltip/>
- <https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/>
- <https://www.w3.org/WAI/WCAG22/Understanding/content-on-hover-or-focus.html>
- <https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html>
- <https://www.w3.org/WAI/WCAG22/Understanding/resize-text.html>
- <https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-disabled>
- <https://carbondesignsystem.com/components/tooltip/usage/>
- <https://carbondesignsystem.com/components/toggletip/usage/>
- <https://atlassian.design/components/tooltip/usage>
- <https://fluent2.microsoft.design/components/web/react/core/tooltip/usage>
- <https://inclusive-components.design/tooltips-toggletips/>
- <https://atomiks.github.io/tippyjs/v6/constructor/>
- <https://design-system.service.gov.uk/components/button/>
- <https://design-system.service.gov.uk/components/table/>
- <https://guidance.publishing.service.gov.uk/writing-to-gov-uk-standards/style-guides/a-to-z-style-guide/>
- <https://guidance.publishing.service.gov.uk/writing-to-gov-uk-standards/writing-guidelines/clear-language/>
- <https://analysisfunction.civilservice.gov.uk/policy-store/data-visualisation-tables/>
- <https://analysisfunction.civilservice.gov.uk/policy-store/symbols-in-tables-definitions-and-help/>
- <https://service-manual.ons.gov.uk/content/formatting-and-punctuation/symbols-and-special-characters>
- <https://design.canada.ca/style-guide/>
- <https://designsystem.digital.gov/components/table/>
- <https://www.patternfly.org/components/table/design-guidelines>
- <https://developers.google.com/style/voice>
- <https://developers.google.com/style/jargon>
