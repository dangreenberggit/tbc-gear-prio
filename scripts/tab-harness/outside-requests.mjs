// Ticket 902: the tab page (the fork's ui/index_template.html) loads Font
// Awesome, Google Tag Manager, Wowhead's tooltips.js, item icons, Wowhead
// tooltip data and the GitHub releases API from outside the local server.
// Inside the agent sandbox they all fail; on a desktop they load, so the two
// runs measured different pages. Measured for 902
// (.scratch/agent-reports/2026-11-26-902-outside-resources/): of all of them,
// only Font Awesome moves the tab's geometry. Without its CSS the tab's icon
// buttons (favorite star, batch toggle) are 0 px tall; nothing else moved.
//
// So a gate run blocks every outside request in the browser and answers the
// Font Awesome ones from the pinned npm package, which is byte-identical to
// the CDN copy (the page's SRI hash checks the stylesheet). Every run then
// measures the desktop page's geometry, whatever network it has.
//
// The tab-review capture (test-review.mjs, ticket 903) serves Font Awesome the
// same way but does not block: its screenshots keep a desktop's item icons.

import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

// direct://: the sandbox sets proxy variables, and through a proxy the browser
// never resolves the outside host itself, so the resolver rule below would not
// apply. The headless shell still used the proxy with --no-proxy-server
// (measured for 902). ~NOTFOUND then fails each outside lookup with
// ERR_NAME_NOT_RESOLVED, on any machine.
export const OFFLINE_CHROME_FLAGS = [
  "--proxy-server=direct://",
  "--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1, EXCLUDE localhost",
];

const require = createRequire(import.meta.url);
const FA_PACKAGE = "@fortawesome/fontawesome-free";
const FA_DIR = path.dirname(require.resolve(`${FA_PACKAGE}/package.json`));
const FA_VERSION = require(`${FA_PACKAGE}/package.json`).version;
const FA_URL =
  /^https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/font-awesome\/([^/?#]+)\/((?:css|webfonts)\/[\w-]+(?:\.[\w-]+)*)$/;
const CONTENT_TYPES = {
  ".css": "text/css",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
};

/**
 * The pinned package's copy of a cdnjs Font Awesome URL, or null when the
 * URL names another version or a file the package does not have.
 */
export function fontAwesomeFile(url) {
  const m = FA_URL.exec(url);
  if (!m || m[1] !== FA_VERSION) return null;
  const file = path.join(FA_DIR, m[2]);
  return fs.existsSync(file) ? file : null;
}

/**
 * Answers the page's Font Awesome requests from the pinned package. Any URL
 * that names Font Awesome, on any host, is caught here rather than left to the
 * blocked name lookup. One with no local copy is failed and pushed to
 * `missing`; an answer the browser did not take is pushed to `unanswered`.
 * The caller checks both with `fontAwesomeServed`: the page changed its
 * Font Awesome, so the package pin must follow before a run means anything.
 */
export async function serveFontAwesome(client, sessionId) {
  const missing = [];
  const unanswered = [];
  const send = (method, params) => client.send(method, params, sessionId);
  // Caught, or a rejection as the socket closes at the end of a run would end
  // the process before its verdict. Recorded, so one during the run fails the
  // check instead of leaving the page on a fallback font.
  const answer = (url, method, params) =>
    send(method, params).catch((err) =>
      unanswered.push(`${url}: ${err.message}`)
    );
  client.onEvent((m) => {
    if (m.method !== "Fetch.requestPaused" || m.sessionId !== sessionId) return;
    const { requestId, request } = m.params;
    const file = fontAwesomeFile(request.url);
    if (!file) {
      missing.push(request.url);
      answer(request.url, "Fetch.failRequest", {
        requestId,
        errorReason: "BlockedByClient",
      });
      return;
    }
    answer(request.url, "Fetch.fulfillRequest", {
      requestId,
      responseCode: 200,
      responseHeaders: [
        {
          name: "Content-Type",
          value:
            CONTENT_TYPES[path.extname(file)] ?? "application/octet-stream",
        },
        // The stylesheet is loaded with crossorigin, and fonts always are.
        { name: "Access-Control-Allow-Origin", value: "*" },
      ],
      body: fs.readFileSync(file).toString("base64"),
    });
  });
  await send("Fetch.enable", {
    patterns: ["*font-awesome*", "*fontawesome*"].map((urlPattern) => ({
      urlPattern,
      requestStage: "Request",
    })),
  });
  return { missing, unanswered };
}

/**
 * Whether the page got its Font Awesome: the layout gate's check 24, and an
 * entry error in the tab-review capture. In the gate a failed check, not an
 * unmeasured run: merge-to-dev lets an unmeasured run through, and without
 * Font Awesome the gate measures icon buttons 0 px tall.
 */
export function fontAwesomeServed({ missing, unanswered }) {
  const ok = missing.length === 0 && unanswered.length === 0;
  return {
    ok,
    detail: ok
      ? {}
      : {
          missing,
          unanswered,
          error: `the page's Font Awesome was not served from the pinned ${FA_PACKAGE}@${FA_VERSION}; move the devDependency to the version and host the page asks for (outside-requests.mjs)`,
        },
  };
}
