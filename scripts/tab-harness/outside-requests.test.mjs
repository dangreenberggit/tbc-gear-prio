import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { chromiumExecutablePath } from "./chromium.mjs";
import {
  fontAwesomeFile,
  OFFLINE_CHROME_FLAGS,
  serveFontAwesome,
} from "./outside-requests.mjs";
import {
  attachPage,
  cdp,
  evaluate,
  FORK_ROOT,
  launchChrome,
  sleep,
} from "./test-tab-harness.mjs";

// Ticket 902: the tab page loads Font Awesome from cdnjs, and the tab's icon
// buttons (favorite star, batch toggle) are 0 px tall without it. The layout
// gate serves it from the pinned npm package and blocks every other outside
// request, so a desktop run and a sandbox run measure the same page.
const CDN = "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0";
const TEMPLATE = path.join(FORK_ROOT, "ui/index_template.html");

describe("fontAwesomeFile", () => {
  it("maps the CDN stylesheet and fonts to the pinned package", () => {
    expect(fontAwesomeFile(`${CDN}/css/all.min.css`)).toMatch(
      /@fortawesome[\\/]fontawesome-free[\\/]css[\\/]all\.min\.css$/
    );
    expect(fontAwesomeFile(`${CDN}/webfonts/fa-solid-900.woff2`)).toMatch(
      /[\\/]webfonts[\\/]fa-solid-900\.woff2$/
    );
  });

  it("has no file for another version, a missing file or a path outside the package", () => {
    expect(
      fontAwesomeFile(
        "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css"
      )
    ).toBeNull();
    expect(fontAwesomeFile(`${CDN}/css/nope.css`)).toBeNull();
    expect(fontAwesomeFile(`${CDN}/css/../package.json`)).toBeNull();
    expect(fontAwesomeFile(`${CDN}/css/all.min.css?x=1`)).toBeNull();
  });

  // The page loads the stylesheet with an SRI hash, so the browser refuses a
  // local copy that differs from the CDN's by one byte.
  it.skipIf(!fs.existsSync(TEMPLATE))(
    "serves the exact stylesheet the fork's page asks for",
    () => {
      const html = fs.readFileSync(TEMPLATE, "utf8");
      const link = html.match(
        /href="(https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/font-awesome\/[^"]+)"\s+integrity="sha512-([^"]+)"/
      );
      expect(link, "the page's Font Awesome <link>").not.toBeNull();
      const file = fontAwesomeFile(link[1]);
      expect(file, `a local file for ${link[1]}`).not.toBeNull();
      const digest = crypto
        .createHash("sha512")
        .update(fs.readFileSync(file))
        .digest("base64");
      expect(digest).toBe(link[2]);
    }
  );
});

describe.skipIf(!fs.existsSync(chromiumExecutablePath()))(
  "an offline browser with Font Awesome served",
  () => {
    it("loads the stylesheet and its font, and fails every other outside request at name lookup", async () => {
      const chrome = await launchChrome({ offline: true });
      const client = cdp(chrome.wsUrl, { callTimeoutMs: 30000 });
      try {
        await client.ready;
        const { send, sessionId } = await attachPage(client);
        const fa = await serveFontAwesome(client, sessionId);
        const failed = new Map();
        const urls = new Map();
        client.onEvent((m) => {
          if (m.sessionId !== sessionId) return;
          if (m.method === "Network.requestWillBeSent")
            urls.set(m.params.requestId, m.params.request.url);
          if (m.method === "Network.loadingFailed")
            failed.set(urls.get(m.params.requestId), m.params.errorText);
        });
        await send("Network.enable", {});
        const html = `<link rel="stylesheet" href="${CDN}/css/all.min.css" crossorigin="anonymous"><i class="fa-solid fa-star"></i><img src="https://wow.zamimg.com/images/wow/icons/large/inv_mace_49.jpg">`;
        await send("Page.navigate", {
          url: `data:text/html,${encodeURIComponent(html)}`,
        });
        await sleep(300);
        const state = await evaluate(
          send,
          `(async () => { await document.fonts.ready; const r = document.querySelector('i').getBoundingClientRect(); return { faFont: document.fonts.check('900 16px "Font Awesome 6 Free"'), w: r.width, h: r.height }; })()`
        );
        expect(state.faFont).toBe(true);
        expect(state.w).toBeGreaterThan(0);
        expect(fa.missing).toEqual([]);
        // ~NOTFOUND in --host-resolver-rules: the same error on a desktop and
        // in the sandbox, whose proxy would give ERR_TUNNEL_CONNECTION_FAILED.
        expect(
          failed.get(
            "https://wow.zamimg.com/images/wow/icons/large/inv_mace_49.jpg"
          )
        ).toBe("net::ERR_NAME_NOT_RESOLVED");
      } finally {
        client.close();
        chrome.kill();
      }
    }, 30000);

    it("records a Font Awesome file it has no copy of, and fails that request", async () => {
      const chrome = await launchChrome({ offline: true });
      const client = cdp(chrome.wsUrl, { callTimeoutMs: 30000 });
      try {
        await client.ready;
        const { send, sessionId } = await attachPage(client);
        const fa = await serveFontAwesome(client, sessionId);
        const other =
          "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css";
        await send("Page.navigate", {
          url: `data:text/html,${encodeURIComponent(`<link rel="stylesheet" href="${other}">`)}`,
        });
        await sleep(500);
        expect(fa.missing).toEqual([other]);
      } finally {
        client.close();
        chrome.kill();
      }
    }, 30000);
  }
);

describe.skipIf(process.platform === "win32")(
  "launchChrome({ offline })",
  () => {
    it("passes the flags that block outside requests", async () => {
      const dir = fs.mkdtempSync(
        path.join(process.env.TMPDIR ?? "/tmp", "tbc-args-")
      );
      const out = path.join(dir, "args");
      const exe = path.join(dir, "chrome");
      fs.writeFileSync(
        exe,
        `#!/bin/sh\nprintf '%s\\n' "$@" > '${out}'\nexit 3\n`,
        {
          mode: 0o755,
        }
      );
      try {
        await launchChrome({ exe, offline: true, timeoutMs: 5000 }).catch(
          () => {}
        );
        const args = fs.readFileSync(out, "utf8").split("\n");
        for (const flag of OFFLINE_CHROME_FLAGS) expect(args).toContain(flag);
        await launchChrome({ exe, timeoutMs: 5000 }).catch(() => {});
        const plain = fs.readFileSync(out, "utf8").split("\n");
        for (const flag of OFFLINE_CHROME_FLAGS)
          expect(plain).not.toContain(flag);
      } finally {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    });
  }
);
