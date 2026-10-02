import { chromium, type Browser } from "playwright";

// Launching Chromium from scratch costs 1-2s. Keep one instance warm across
// requests in this Node process instead of paying that cost every time.
let browserPromise: Promise<Browser> | null = null;
// Identifies which launch browserPromise currently holds, so that concurrent
// callers who all observe a dead browser relaunch it only once instead of
// each racing to overwrite browserPromise with their own orphaned instance.
let launchId = 0;

export async function getSharedBrowser(): Promise<Browser> {
  if (!browserPromise) {
    launchId += 1;
    browserPromise = chromium.launch();
  }

  const thisLaunchId = launchId;
  const browser = await browserPromise;
  if (!browser.isConnected() && launchId === thisLaunchId) {
    launchId += 1;
    browserPromise = chromium.launch();
  }

  return browserPromise;
}
