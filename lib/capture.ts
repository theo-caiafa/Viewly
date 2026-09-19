import { chromium, type Browser, type Page } from "playwright";
import { attemptDismissCookieBanners, hideConsentOverlays } from "./cookieBanners";

export type CaptureMode = "full" | "sections";
export type CaptureQuality = "standard" | "high";

export interface HttpCredentials {
  username: string;
  password: string;
}

export interface CaptureOptions {
  mode?: CaptureMode;
  quality?: CaptureQuality;
  httpCredentials?: HttpCredentials;
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

interface ResolvedCaptureOptions {
  mode: CaptureMode;
  quality: CaptureQuality;
  httpCredentials?: HttpCredentials;
}

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

/**
 * animations:"disabled" on page.screenshot() only freezes CSS
 * animations/transitions. Scroll-triggered reveal effects (fade-in,
 * slide-in libraries like AOS or Framer Motion) are still mid-flight at
 * that point, so force every currently running animation the browser
 * knows about (CSS or Web Animations API) to jump to its end state.
 */
async function settleAnimations(page: Page): Promise<void> {
  await page.evaluate(() => {
    for (const animation of document.getAnimations()) {
      try {
        animation.finish();
      } catch {
        // infinite animations (looping spinners, background gradients)
        // throw on finish() — leave those running, they're decorative
      }
    }
  });
}

async function captureFull(page: Page): Promise<Buffer> {
  await settleAnimations(page);
  await hideConsentOverlays(page);
  return page.screenshot({ fullPage: true, type: "png", animations: "disabled" });
}

/**
 * Screen-by-screen pagination: one fixed-size image per viewport-height of
 * content, exactly what the visitor would see without scrolling — not a DOM
 * section boundary. The last frame is clamped to the bottom of the page so
 * it stays full-height instead of trailing off into blank space.
 */
async function captureScreens(page: Page, viewportHeight: number): Promise<Buffer[]> {
  const scrollHeight = await page.evaluate(() => document.documentElement.scrollHeight);

  const positions: number[] = [];
  let y = 0;
  while (y < scrollHeight) {
    positions.push(y);
    y += viewportHeight;
  }
  if (positions.length > 1) {
    positions[positions.length - 1] = Math.max(scrollHeight - viewportHeight, 0);
  }

  const buffers: Buffer[] = [];
  for (const position of positions) {
    await page.evaluate((scrollY) => window.scrollTo(0, scrollY), position);
    await page.waitForTimeout(300);
    await settleAnimations(page);
    await hideConsentOverlays(page);
    const buffer = await page.screenshot({ type: "png", animations: "disabled" });
    buffers.push(buffer);
  }

  return buffers;
}

async function captureOne(
  browser: Browser,
  url: string,
  viewport: ViewportConfig,
  options: ResolvedCaptureOptions,
): Promise<MockupImage[]> {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: DEVICE_SCALE_FACTOR[options.quality],
    reducedMotion: "reduce",
    httpCredentials: options.httpCredentials,
  });
  const page = await context.newPage();

  try {
    await page.goto(url, { waitUntil: "networkidle", timeout: NAV_TIMEOUT_MS });
    await attemptDismissCookieBanners(page);
    await autoScroll(page);

    if (options.mode === "full") {
      return [{ label: viewport.label, buffer: await captureFull(page) }];
    }

    const screens = await captureScreens(page, viewport.height);
    return screens.map((buffer, index) => ({
      label: `${viewport.label}-${index + 1}`,
      buffer,
    }));
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

  const resolvedOptions: ResolvedCaptureOptions = {
    mode: options.mode ?? "full",
    quality: options.quality ?? "standard",
    httpCredentials: options.httpCredentials,
  };

  const browser = await chromium.launch();
  try {
    const results = await Promise.all(
      VIEWPORTS.map((viewport) => captureOne(browser, url, viewport, resolvedOptions)),
    );
    return results.flat();
  } finally {
    await browser.close();
  }
}
