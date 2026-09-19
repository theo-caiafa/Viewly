import { chromium, type Browser, type Page } from "playwright";
import { attemptDismissCookieBanners, hideConsentOverlays } from "./cookieBanners";
import { tagZones, zoneSelector, labelZones, hideFloatingOverlays } from "./zones";
import { composeSections } from "./composeSections";

export type CaptureMode = "full" | "sections";
export type CaptureQuality = "standard" | "high";

export interface CaptureOptions {
  mode?: CaptureMode;
  quality?: CaptureQuality;
}

export interface MockupImage {
  label: string;
  buffer: Buffer;
}

interface ViewportConfig {
  label: string;
  width: number;
  height: number;
}

const VIEWPORTS: ViewportConfig[] = [
  { label: "desktop", width: 1440, height: 900 },
  { label: "tablet", width: 768, height: 1024 },
  { label: "mobile", width: 375, height: 812 },
];

const NAV_TIMEOUT_MS = 30_000;

const DEVICE_SCALE_FACTOR: Record<CaptureQuality, number> = {
  standard: 1,
  high: 2,
};

async function autoScroll(page: Page): Promise<void> {
  await page.evaluate(async () => {
    await new Promise<void>((resolve) => {
      let total = 0;
      const step = 400;
      const timer = setInterval(() => {
        window.scrollBy(0, step);
        total += step;
        if (total >= document.body.scrollHeight) {
          clearInterval(timer);
          window.scrollTo(0, 0);
          setTimeout(resolve, 200);
        }
      }, 100);
    });
  });
}

async function captureFull(page: Page): Promise<Buffer> {
  await hideConsentOverlays(page);
  return page.screenshot({ fullPage: true, type: "png", animations: "disabled" });
}

async function captureSections(page: Page, deviceScaleFactor: number): Promise<Buffer> {
  const zones = await page.evaluate(tagZones);
  await page.evaluate(hideFloatingOverlays);
  const labeled = labelZones(zones);
  const buffers: Buffer[] = [];

  for (const { zone } of labeled) {
    try {
      await hideConsentOverlays(page);
      const buffer = await page
        .locator(zoneSelector(zone.index))
        .screenshot({ type: "png", animations: "disabled", timeout: 8_000 });
      buffers.push(buffer);
    } catch {
      // element vanished or is unreachable (e.g. hidden by a script) — skip it
    }
  }

  if (buffers.length === 0) {
    return captureFull(page);
  }

  return composeSections(buffers, deviceScaleFactor);
}

async function captureOne(
  browser: Browser,
  url: string,
  viewport: ViewportConfig,
  options: Required<CaptureOptions>,
): Promise<MockupImage> {
  const deviceScaleFactor = DEVICE_SCALE_FACTOR[options.quality];
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor,
  });
  const page = await context.newPage();

  try {
    await page.goto(url, { waitUntil: "networkidle", timeout: NAV_TIMEOUT_MS });
    await attemptDismissCookieBanners(page);
    await autoScroll(page);

    const buffer =
      options.mode === "full"
        ? await captureFull(page)
        : await captureSections(page, deviceScaleFactor);

    return { label: viewport.label, buffer };
  } finally {
    await context.close();
  }
}

export function normalizeUrl(input: string): string {
  const trimmed = input.trim();
  if (!/^https?:\/\//i.test(trimmed)) {
    return `https://${trimmed}`;
  }
  return trimmed;
}

export async function captureMockups(
  rawUrl: string,
  options: CaptureOptions = {},
): Promise<MockupImage[]> {
  const url = normalizeUrl(rawUrl);
  new URL(url); // throws if invalid

  const resolvedOptions: Required<CaptureOptions> = {
    mode: options.mode ?? "full",
    quality: options.quality ?? "standard",
  };

  const browser = await chromium.launch();
  try {
    return await Promise.all(
      VIEWPORTS.map((viewport) => captureOne(browser, url, viewport, resolvedOptions)),
    );
  } finally {
    await browser.close();
  }
}
