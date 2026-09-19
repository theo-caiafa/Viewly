import { chromium, type Browser } from "playwright";
import { dismissCookieBanners } from "./cookieBanners";

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

async function autoScroll(page: import("playwright").Page): Promise<void> {
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

async function captureOne(browser: Browser, url: string, viewport: ViewportConfig): Promise<MockupImage> {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
  });
  const page = await context.newPage();

  try {
    await page.goto(url, { waitUntil: "networkidle", timeout: NAV_TIMEOUT_MS });
    await dismissCookieBanners(page);
    await autoScroll(page);
    const buffer = await page.screenshot({ fullPage: true, type: "png" });
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

export async function captureMockups(rawUrl: string): Promise<MockupImage[]> {
  const url = normalizeUrl(rawUrl);
  new URL(url); // throws if invalid

  const browser = await chromium.launch();
  try {
    const results = await Promise.all(
      VIEWPORTS.map((viewport) => captureOne(browser, url, viewport)),
    );
    return results;
  } finally {
    await browser.close();
  }
}
