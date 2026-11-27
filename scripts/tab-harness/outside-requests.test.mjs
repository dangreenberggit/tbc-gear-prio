import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { chromiumExecutablePath } from "./chromium.mjs";
import {
  fontAwesomeFile,
  fontAwesomeServed,
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
const ICON = "https://wow.zamimg.com/images/wow/icons/large/inv_mace_49.jpg";

// Under `pnpm verify`'s parallel load, a fixed sleep was too short for the
// browser's events to arrive.
async function waitFor(pred, ms = 10000) {
  const deadline = Date.now() + ms;
  while (!pred() && Date.now() < deadline) await sleep(50);
}
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
        const html = `<link rel="stylesheet" href="${CDN}/css/all.min.css" crossorigin="anonymous"><i class="fa-solid fa-star"></i><img src="${ICON}">`;
        await send("Page.navigate", {
          url: `data:text/html,${encodeURIComponent(html)}`,
        });
        await waitFor(() => failed.has(ICON));
        const state = await evaluate(
          send,
          `(async () => { while (document.readyState !== 'complete') await new Promise((r) => setTimeout(r, 50)); await document.fonts.load('900 16px "Font Awesome 6 Free"'); await document.fonts.ready; const r = document.querySelector('i').getBoundingClientRect(); return { faFont: document.fonts.check('900 16px "Font Awesome 6 Free"'), w: r.width, h: r.height }; })()`
        );
        expect(state.faFont).toBe(true);
        expect(state.w).toBeGreaterThan(0);
        expect(fa.missing).toEqual([]);
        // ~NOTFOUND in --host-resolver-rules: the same error on a desktop and
        // in the sandbox, whose proxy would give ERR_TUNNEL_CONNECTION_FAILED.
        expect(failed.get(ICON)).toBe("net::ERR_NAME_NOT_RESOLVED");
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
        await waitFor(() => fa.missing.length > 0);
        expect(fa.missing).toEqual([other]);
      } finally {
        client.close();
        chrome.kill();
      }
    }, 30000);

    // Review finding A1: a page that moved Font Awesome to another CDN got it
    // blocked by name lookup, with nothing recorded, and its icons at 0 px.
    it("records Font Awesome asked for from another host", async () => {
      const chrome = await launchChrome({ offline: true });
      const client = cdp(chrome.wsUrl, { callTimeoutMs: 30000 });
      try {
        await client.ready;
        const { send, sessionId } = await attachPage(client);
        const fa = await serveFontAwesome(client, sessionId);
        const other =
          "https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.0.0/css/all.min.css";
        await send("Page.navigate", {
          url: `data:text/html,${encodeURIComponent(`<link rel="stylesheet" href="${other}">`)}`,
        });
        await waitFor(() => fa.missing.length > 0);
        expect(fa.missing).toEqual([other]);
      } finally {
        client.close();
        chrome.kill();
      }
    }, 30000);
  }
);

// Ticket 903: the tab-review capture serves Font Awesome but leaves the other
// outside requests to the network, so a desktop capture keeps its item icons.
// Fetch answers the request before it reaches any proxy, so the sandbox's
// failing proxy does not matter.
describe.skipIf(!fs.existsSync(chromiumExecutablePath()))(
  "an online browser with Font Awesome served",
  () => {
    it("loads the stylesheet and its font, and leaves other outside requests to the network", async () => {
      const chrome = await launchChrome();
      const client = cdp(chrome.wsUrl, { callTimeoutMs: 30000 });
      try {
        await client.ready;
        const { send, sessionId } = await attachPage(client);
        const fa = await serveFontAwesome(client, sessionId);
        const urls = new Map();
        const settled = new Map();
        client.onEvent((m) => {
          if (m.sessionId !== sessionId) return;
          if (m.method === "Network.requestWillBeSent")
            urls.set(m.params.requestId, m.params.request.url);
          if (m.method === "Network.loadingFinished")
            settled.set(urls.get(m.params.requestId), "loaded");
          if (m.method === "Network.loadingFailed")
            settled.set(urls.get(m.params.requestId), m.params.errorText);
        });
        await send("Network.enable", {});
        const html = `<link rel="stylesheet" href="${CDN}/css/all.min.css" crossorigin="anonymous"><i class="fa-solid fa-star"></i><img src="${ICON}">`;
        await send("Page.navigate", {
          url: `data:text/html,${encodeURIComponent(html)}`,
        });
        await waitFor(() => settled.has(ICON), 20000);
        const state = await evaluate(
          send,
          `(async () => { while (document.readyState !== 'complete') await new Promise((r) => setTimeout(r, 50)); await document.fonts.load('900 16px "Font Awesome 6 Free"'); await document.fonts.ready; const r = document.querySelector('i').getBoundingClientRect(); return { faFont: document.fonts.check('900 16px "Font Awesome 6 Free"'), w: r.width, h: r.height }; })()`
        );
        expect(state.faFont).toBe(true);
        expect(state.w).toBeGreaterThan(0);
        expect(fontAwesomeServed(fa).ok).toBe(true);
        // The item icon went to the network: it loads on a desktop and fails
        // at the sandbox's proxy, but neither the harness nor a resolver rule
        // stopped it.
        expect(settled.has(ICON)).toBe(true);
        expect(settled.get(ICON)).not.toBe("net::ERR_BLOCKED_BY_CLIENT");
        expect(settled.get(ICON)).not.toBe("net::ERR_NAME_NOT_RESOLVED");
      } finally {
        client.close();
        chrome.kill();
      }
    }, 30000);
  }
);

// Review finding N2/A4: a rejected answer to a paused request was swallowed,
// which leaves the page on a fallback font with nothing said.
describe("serveFontAwesome with a failing answer", () => {
  it("records the request it could not answer, without an unhandled rejection", async () => {
    let listener;
    const client = {
      onEvent: (fn) => (listener = fn),
      send: (method) =>
        method === "Fetch.enable"
          ? Promise.resolve({})
          : Promise.reject(new Error("CDP WebSocket closed (code 1006)")),
    };
    const fa = await serveFontAwesome(client, "S1");
    listener({
      method: "Fetch.requestPaused",
      sessionId: "S1",
      params: { requestId: "R1", request: { url: `${CDN}/css/all.min.css` } },
    });
    await waitFor(() => fa.unanswered.length > 0, 1000);
    expect(fa.unanswered).toEqual([
      `${CDN}/css/all.min.css: CDP WebSocket closed (code 1006)`,
    ]);
  });
});

// Review finding A2: a missing file stopped the gate as "unmeasured", which
// merge-to-dev skips without blocking. It is now a failed check.
describe("fontAwesomeServed", () => {
  it("passes when every Font Awesome request was answered from the package", () => {
    expect(fontAwesomeServed({ missing: [], unanswered: [] }).ok).toBe(true);
  });

  it("fails, naming the files, when one was missing or unanswered", () => {
    const missing = fontAwesomeServed({ missing: ["u1"], unanswered: [] });
    expect(missing.ok).toBe(false);
    expect(missing.detail.missing).toEqual(["u1"]);
    expect(missing.detail.error).toMatch(/@fortawesome\/fontawesome-free/);
    expect(
      fontAwesomeServed({ missing: [], unanswered: ["u2: closed"] }).ok
    ).toBe(false);
  });
});

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
