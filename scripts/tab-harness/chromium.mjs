// The Chromium the tab harnesses drive: the one the pinned `playwright`
// devDependency installs. Asking Playwright for the path, instead of
// searching its cache folder, follows its own per-OS layout and the browser
// revision this repo pins, and honours PLAYWRIGHT_BROWSERS_PATH.
//
// The pin is 1.57.0 (Chromium 143, build 1200): the build the layout gate ran
// on under Windows, where it was the only one installed. Whether a newer build
// moves the measured geometry is untested, so a bump should rerun the gate.
//
// Run directly, it prints the path and exits 0, or prints why there is none
// and exits 1. The Python gates (check_layout_gate.py) call it that way.
//
// Install the browser once per machine:
//   pnpm exec playwright install chromium

import fs from "node:fs";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright";

export const INSTALL_HINT = "pnpm exec playwright install chromium";

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
    console.log(findChromium());
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}
