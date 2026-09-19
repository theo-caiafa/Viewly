import { chromium, type Browser } from "playwright";

// Launching Chromium from scratch costs 1-2s. Keep one instance warm across
// requests in this Node process instead of paying that cost every time.
let browserPromise: Promise<Browser> | null = null;

export async function getSharedBrowser(): Promise<Browser> {
  if (!browserPromise) {
    browserPromise = chromium.launch();
  }

  const browser = await browserPromise;
  if (!browser.isConnected()) {
    browserPromise = chromium.launch();
    return browserPromise;
  }

  return browser;
}
