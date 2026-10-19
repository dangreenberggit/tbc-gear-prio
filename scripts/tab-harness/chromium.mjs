// The Chromium the tab harnesses drive: the one the pinned `playwright`
// devDependency installs. Asking Playwright for the path, instead of
// searching its cache folder, follows its own per-OS layout and the browser
// revision this repo pins, and honours PLAYWRIGHT_BROWSERS_PATH.
//
// The pin is 1.57.0 (Chromium 143, build 1200): the build the layout gate ran
// on under Windows, where it was the only one installed. Whether a newer build
// moves the measured geometry is untested, so the layout gate's digest
// includes the build (`--build` below), and a bump reruns the gate.
//
// Run directly, it prints the path and exits 0, or prints why there is none
// and exits 1. With `--build` it prints the Chromium entry of Playwright's
// browsers.json as JSON. The Python gates (check_layout_gate.py) call it that
// way.
//
// Install the browser once per machine:
//   pnpm exec playwright install chromium

import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright";

export const INSTALL_HINT = "pnpm exec playwright install chromium";

/**
 * The `chromium` entry (revision, browserVersion, any per-host overrides) of
 * the browsers.json that the resolved `playwright` package's playwright-core
 * reads to choose the build it launches. It is the same on every OS, unlike
 * the executable path.
 */
export function chromiumBuild() {
  // playwright-core is resolved from playwright's own folder because pnpm
  // does not link it into the root node_modules.
  const fromHere = createRequire(import.meta.url);
  const fromPlaywright = createRequire(fromHere.resolve("playwright"));
  const coreDir = path.dirname(
    fromPlaywright.resolve("playwright-core/package.json")
  );
  const { browsers } = JSON.parse(
    fs.readFileSync(path.join(coreDir, "browsers.json"), "utf8")
  );
  const entry = browsers.find((b) => b.name === "chromium");
  if (!entry) throw new Error(`no chromium entry in ${coreDir}/browsers.json`);
  return entry;
}

/** The Chromium executable's path; throws when it is not installed. */
export function findChromium() {
  const exe = chromium.executablePath();
  if (!fs.existsSync(exe))
    throw new Error(
      `Playwright's Chromium is not installed (expected ${exe}). Run: ${INSTALL_HINT}`
    );
  return exe;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    if (process.argv.includes("--build"))
      console.log(JSON.stringify(chromiumBuild()));
    else console.log(findChromium());
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}
