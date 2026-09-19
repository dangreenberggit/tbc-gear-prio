Status: open
Type: bug
Origin: owner viewing session, 2026-09-19
Blocks: none
Blocked by: none
Related: the tab's transport/worker error path (worker_pool.ts), C7 of the finish-line plan

# "Ranking failed: Failed to fetch" is a junky user-facing error

Owner viewing the tab (on the vite-only dev server, which does not serve the sim
worker/WASM — see the handoff) hit a run failure rendered in the UI as:

    Ranking failed: Failed to fetch

Two problems:
1. The raw fetch-error string ("Failed to fetch") is dumped straight into the UI.
   It reads as junk to a user — no context, no guidance.
2. The tab should CATCH a transport/worker load failure and show a plain,
   human message (e.g. "Couldn't reach the sim engine — reload or check the
   server", whatever fits) rather than surfacing the underlying Error.message.

NOTE on cause: in this instance the failure was environmental (the vite dev
server returns its HTML fallback for `sim_worker.js`/`lib.wasm` instead of the
real files, so the worker 404s — `worker_pool.ts:292`). That specific cause won't
happen in a proper embedded/deploy build. But the point stands regardless: a
worker/transport failure should degrade to a clean message, not a raw fetch
error, whatever the cause.

## What would close this

- A run that fails because the sim worker/WASM can't load shows a plain,
  non-technical message in the tab, not the raw `Error.message`.
- Verify by pointing the tab at a server that doesn't serve the worker (the vite
  dev server reproduces it) and confirming the message is clean.

## Where

`vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades_tab.tsx`
(the catch that renders "Ranking failed: {msg}") and possibly
`ui/core/worker_pool.ts` (where the fetch throws). Keep it plain per the standing
copy rule.

## Notes

New from the owner's 2026-09-19 viewing session. Small, real UI-polish bug —
distinct from the environmental dev-server cause (which is not a branch defect).
