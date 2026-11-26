Status: open
Type: bug (tooling)
Origin: ticket 901 investigation, .scratch/agent-reports/2026-11-26-901-layout-compare/
Blocks: none
Blocked by: none
Related: 901

# The layout gate's page loads outside resources, so sandbox and desktop runs measure different pages

## What happens

The page the layout gate renders (`ui/index_template.html` in the fork)
loads resources from outside the local server: Font Awesome's CSS from
cdnjs (line 16), Google Tag Manager (line 24), Wowhead's `tooltips.js`
(line 41), plus item icons from `wow.zamimg.com`, Wowhead tooltip data
and the GitHub releases API.

Inside the agent sandbox every one of those requests fails (the headless
shell reports `net::ERR_FAILED`, `net::ERR_ABORTED` or
`net::ERR_TUNNEL_CONNECTION_FAILED`;
`.scratch/agent-reports/2026-11-26-901-layout-compare/boot-probe.mjs`).
On a desktop run outside the sandbox they load. So the two runs measure
different pages, with or without Font Awesome's CSS and the icon images,
even with the same browser.

## Not known

Whether any of these resources moves the Upgrades tab's measured geometry.
The tab's own source uses no `fa-` class
(`grep -rln "fa-" vendor/tbc-new-fork/ui/features/upgrades` finds nothing),
and `tooltips.js` runs with `colorLinks: true` only (line 39), which
changes colour, not layout. Icon images with fixed CSS sizes would not
move layout either (hypothesis, untested).

## Done when

Either a desktop run and a sandbox run of `pnpm layout-gate:check` are
shown to measure the same geometry (a geometry dump like
`geom-dump.mjs` in the folder above, diffed), or the harness makes every
run see the same page, for example by blocking outside requests.
