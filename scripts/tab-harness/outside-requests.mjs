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
 * Answers the page's Font Awesome requests from the pinned package. A
 * Font Awesome URL with no local copy is failed and pushed to `missing`, which
 * the caller checks: the page changed its Font Awesome, so the package pin
 * must follow before a run means anything.
 */
export async function serveFontAwesome(client, sessionId) {
  const missing = [];
  const send = (method, params) => client.send(method, params, sessionId);
  client.onEvent((m) => {
    if (m.method !== "Fetch.requestPaused" || m.sessionId !== sessionId) return;
    const { requestId, request } = m.params;
    const file = fontAwesomeFile(request.url);
    if (!file) {
      missing.push(request.url);
      send("Fetch.failRequest", { requestId, errorReason: "BlockedByClient" });
      return;
    }
    send("Fetch.fulfillRequest", {
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
    patterns: [
      {
        urlPattern: "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/*",
        requestStage: "Request",
      },
    ],
  });
  return { missing };
}
