import type { Page } from "playwright";
import { attemptDismissCookieBanners, hideKnownOverlays } from "./cookieBanners";
import { getSharedBrowser } from "./browserManager";

export type CaptureMode = "full" | "sections";
export type CaptureQuality = "standard" | "high";

export class CaptureCancelledError extends Error {
  constructor() {
    super("Génération annulée.");
    this.name = "CaptureCancelledError";
  }
}

export interface HttpCredentials {
  username: string;
  password: string;
}

export interface DeviceConfig {
  label: string;
  width: number;
  height: number;
}

export interface ProgressEvent {
  device: string;
  current: number;
  total: number;
}

export interface CaptureOptions {
  mode?: CaptureMode;
  quality?: CaptureQuality;
  httpCredentials?: HttpCredentials;
  devices?: DeviceConfig[];
  onProgress?: (event: ProgressEvent) => void;
  onWarning?: (message: string) => void;
  isCancelled?: () => boolean;
}

export interface MockupImage {
  label: string;
  buffer: Buffer;
}

export const DEFAULT_DEVICES: DeviceConfig[] = [
  { label: "desktop", width: 1440, height: 900 },
  { label: "tablet", width: 768, height: 1024 },
  { label: "mobile", width: 375, height: 812 },
];

const NAV_TIMEOUT_MS = 30_000;
const LONG_PAGE_SCREEN_THRESHOLD = 8;

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

const BLOCK_TITLE_PATTERNS =
  /just a moment|attention required|checking your browser|access denied|are you a robot|verify you are human|captcha/i;

const DEVICE_SCALE_FACTOR: Record<CaptureQuality, number> = {
  standard: 1,
  high: 2,
};

interface ResolvedCaptureOptions {
  mode: CaptureMode;
  quality: CaptureQuality;
  httpCredentials?: HttpCredentials;
  devices: DeviceConfig[];
  onProgress: (event: ProgressEvent) => void;
  onWarning: (message: string) => void;
  isCancelled: () => boolean;
}

function checkCancelled(isCancelled: () => boolean): void {
  if (isCancelled()) {
    throw new CaptureCancelledError();
  }
}

function classifyNavigationError(error: unknown): Error {
  const message = error instanceof Error ? error.message : String(error);
  if (/ERR_NAME_NOT_RESOLVED|ERR_INTERNET_DISCONNECTED/.test(message)) {
    return new Error("Nom de domaine introuvable — vérifie l'URL.");
  }
  if (/ERR_CONNECTION_REFUSED|ERR_CONNECTION_TIMED_OUT|ERR_CONNECTION_CLOSED/.test(message)) {
    return new Error("Impossible de se connecter au site (connexion refusée).");
  }
  if (/Timeout.*exceeded/i.test(message)) {
    return new Error("Le site a mis trop de temps à répondre (délai dépassé).");
  }
  return new Error(`Impossible de charger la page : ${message}`);
}

async function detectBlockChallenge(page: Page): Promise<void> {
  const title = await page.title();
  if (BLOCK_TITLE_PATTERNS.test(title)) {
    throw new Error("Le site semble bloquer les navigateurs automatisés (protection anti-bot détectée).");
  }
}

/**
 * Give web fonts and in-viewport images a moment to finish loading before a
 * screenshot, so we don't capture a fallback-font flash or a half-loaded
 * image. Capped at 3s so one stuck resource can't stall the whole capture.
 */
async function waitForVisualReadiness(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const fontsReady = document.fonts ? document.fonts.ready : Promise.resolve();
    const imagesReady = Promise.all(
      Array.from(document.images).map((img) =>
        img.complete
          ? Promise.resolve()
          : new Promise<void>((resolve) => {
              img.addEventListener("load", () => resolve(), { once: true });
              img.addEventListener("error", () => resolve(), { once: true });
            }),
      ),
    );
    await Promise.race([
      Promise.all([fontsReady, imagesReady]),
      new Promise((resolve) => setTimeout(resolve, 3000)),
    ]);
  });
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

async function prepareForScreenshot(page: Page): Promise<void> {
  await waitForVisualReadiness(page);
  await settleAnimations(page);
  await hideKnownOverlays(page);
}

async function captureFull(page: Page): Promise<Buffer> {
  await prepareForScreenshot(page);
  return page.screenshot({ fullPage: true, type: "png", animations: "disabled" });
}

/**
 * Screen-by-screen pagination: one fixed-size image per viewport-height of
 * content, exactly what the visitor would see without scrolling — not a DOM
 * section boundary. The last frame is clamped to the bottom of the page so
 * it stays full-height instead of trailing off into blank space.
 */
async function captureScreens(
  page: Page,
  viewportHeight: number,
  device: string,
  onProgress: (event: ProgressEvent) => void,
  onWarning: (message: string) => void,
  isCancelled: () => boolean,
): Promise<Buffer[]> {
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

  if (positions.length > LONG_PAGE_SCREEN_THRESHOLD) {
    onWarning(
      `Page longue détectée pour ${device} (~${positions.length} écrans) — la génération va prendre plus de temps.`,
    );
  }

  const buffers: Buffer[] = [];
  for (let i = 0; i < positions.length; i++) {
    checkCancelled(isCancelled);
    onProgress({ device, current: i, total: positions.length });

    await page.evaluate((scrollY) => window.scrollTo(0, scrollY), positions[i]);
    await page.waitForTimeout(300);
    await prepareForScreenshot(page);
    const buffer = await page.screenshot({ type: "png", animations: "disabled" });
    buffers.push(buffer);
  }

  onProgress({ device, current: positions.length, total: positions.length });
  return buffers;
}

async function captureOne(
  url: string,
  device: DeviceConfig,
  options: ResolvedCaptureOptions,
): Promise<MockupImage[]> {
  checkCancelled(options.isCancelled);
  options.onProgress({ device: device.label, current: 0, total: 0 });

  const browser = await getSharedBrowser();
  const context = await browser.newContext({
    viewport: { width: device.width, height: device.height },
    deviceScaleFactor: DEVICE_SCALE_FACTOR[options.quality],
    reducedMotion: "reduce",
    userAgent: USER_AGENT,
    httpCredentials: options.httpCredentials,
  });
  const page = await context.newPage();

  // Cancellation can arrive while we're mid-await inside Playwright (goto,
  // screenshot...) where a simple flag check between steps wouldn't help.
  // Closing the context forces whatever is in flight to reject immediately.
  let cancelledMidFlight = false;
  const cancelWatcher = setInterval(() => {
    if (options.isCancelled()) {
      cancelledMidFlight = true;
      clearInterval(cancelWatcher);
      context.close().catch(() => {});
    }
  }, 250);

  try {
    try {
      await page.goto(url, { waitUntil: "networkidle", timeout: NAV_TIMEOUT_MS });
    } catch (error) {
      throw classifyNavigationError(error);
    }

    await detectBlockChallenge(page);
    await attemptDismissCookieBanners(page);
    await autoScroll(page);
    checkCancelled(options.isCancelled);

    if (options.mode === "full") {
      return [{ label: device.label, buffer: await captureFull(page) }];
    }

    const screens = await captureScreens(
      page,
      device.height,
      device.label,
      options.onProgress,
      options.onWarning,
      options.isCancelled,
    );
    return screens.map((buffer, index) => ({
      label: `${device.label}-${index + 1}`,
      buffer,
    }));
  } catch (error) {
    if (cancelledMidFlight) throw new CaptureCancelledError();
    throw error;
  } finally {
    clearInterval(cancelWatcher);
    await context.close().catch(() => {});
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
    devices: options.devices && options.devices.length > 0 ? options.devices : DEFAULT_DEVICES,
    onProgress: options.onProgress ?? (() => {}),
    onWarning: options.onWarning ?? (() => {}),
    isCancelled: options.isCancelled ?? (() => false),
  };

  const results = await Promise.all(
    resolvedOptions.devices.map((device) => captureOne(url, device, resolvedOptions)),
  );
  return results.flat();
}
