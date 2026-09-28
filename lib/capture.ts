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

// How to put the page back into the exact state a given screen was
// captured from, for a later video capture of that same screen. Two kinds
// because captureScreens picks its strategy per device (see
// nativeScrollWorks): a page with working native scroll can jump straight
// to a Y position, but a scroll-jacked page (GSAP ScrollTrigger and
// similar) has no reliable scrollY at all — the only way back is to replay
// the same number of simulated wheel gestures used to get there originally.
export type ScreenReplay = { kind: "scroll"; scrollY: number } | { kind: "wheel"; steps: number };

export interface MockupImage {
  label: string;
  buffer: Buffer;
  replay?: ScreenReplay;
}

export interface CaptureResult {
  images: MockupImage[];
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

export const DEVICE_SCALE_FACTOR: Record<CaptureQuality, number> = {
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

const INTRO_CHECK_INTERVAL_MS = 300;
const INTRO_MAX_WAIT_MS = 6000;
const INTRO_STABLE_CHECKS_REQUIRED = 2;
// Fraction of sampled bytes that must shift beyond COLOR_DELTA_THRESHOLD to
// count the frame as "still changing" — small enough to catch a preloader
// wipe or intro transition, large enough to ignore a blinking cursor.
const CHANGED_BYTE_RATIO_THRESHOLD = 0.02;
const COLOR_DELTA_THRESHOLD = 18;
const SAMPLE_COUNT = 4096;

/**
 * Many portfolio/agency sites (the kind you'd find on Awwwards) run a splash
 * screen, page-load transition, or staggered hero reveal that's still
 * mid-flight when networkidle fires — Playwright's load signals only track
 * network activity, not visual/CSS-driven sequences. Capturing right away
 * freezes the mockup on an intro frame (a loader logo, a wipe half-done)
 * instead of the page's actual resting state.
 *
 * This waits for the viewport to stop visibly changing between samples,
 * polling instead of using a fixed delay so a fast site isn't slowed down
 * and a slow intro gets the time it needs — capped so a page with a genuine
 * looping animation (video background, particle canvas) doesn't stall the
 * whole capture waiting for stillness that will never come.
 */
async function waitForIntroToSettle(page: Page): Promise<void> {
  // Some preloaders (agency/portfolio sites especially) wait for the
  // visitor's first gesture before finishing or even starting their exit
  // animation — networkidle alone never triggers them. A small synthetic
  // wheel nudge mimics that first gesture without scrolling the page
  // anywhere a human wouldn't glance on load.
  try {
    await page.mouse.wheel(0, 40);
    await page.waitForTimeout(150);
    await page.mouse.wheel(0, -40);
  } catch {
    // best-effort — if this fails the settle loop below still runs
  }

  await waitForVisualStillness(page, INTRO_MAX_WAIT_MS);
}

/**
 * Polls screenshots until two consecutive ones are near-identical (or a
 * deadline is hit), instead of trusting a fixed delay. Used both right after
 * page load (an intro/preloader might still be mid-sequence) and after each
 * simulated wheel step on scroll-jacked sites (a GSAP-driven section
 * transition is JS/rAF-based, not a Web Animations API animation, so
 * settleAnimations()'s animation.finish() can't fast-forward it — waiting it
 * out for real is the only option).
 */
async function waitForVisualStillness(page: Page, maxWaitMs: number): Promise<void> {
  let previous: Buffer;
  try {
    previous = await page.screenshot({ type: "png", animations: "allow" });
  } catch {
    return;
  }

  let stableStreak = 0;
  const deadline = Date.now() + maxWaitMs;

  while (Date.now() < deadline) {
    await page.waitForTimeout(INTRO_CHECK_INTERVAL_MS);

    let current: Buffer;
    try {
      current = await page.screenshot({ type: "png", animations: "allow" });
    } catch {
      return;
    }

    if (pngBuffersDiffer(previous, current)) {
      stableStreak = 0;
    } else {
      stableStreak++;
      if (stableStreak >= INTRO_STABLE_CHECKS_REQUIRED) return;
    }
    previous = current;
  }
}

/**
 * PNG is compressed, so byte offsets don't map to pixel positions — an exact
 * pixel-grid compare would need a decoder. As a fast proxy: identical bytes
 * means nothing moved, and once they differ, sampling raw encoded bytes at a
 * fixed stride still reliably separates a few pixels of drift from a real
 * visible change across the frame.
 *
 * changedRatioThreshold is exposed rather than fixed: settling-detection
 * wants the strict default (any real motion counts as "still changing"),
 * while "is this frame basically a repeat of one I've already captured"
 * (the wheel-scroll fallback) needs a much looser bar — a looping marquee or
 * ticking counter keeps a sliver of the frame in constant motion, and at the
 * strict threshold two frames of the same resting section never count as
 * equal.
 */
function pngBuffersDiffer(before: Buffer, after: Buffer, changedRatioThreshold = CHANGED_BYTE_RATIO_THRESHOLD): boolean {
  if (before.length === after.length && before.equals(after)) return false;

  const lengthDeltaRatio = Math.abs(before.length - after.length) / Math.max(before.length, after.length, 1);
  if (lengthDeltaRatio > 0.01) return true;

  const shorter = Math.min(before.length, after.length);
  const step = Math.max(1, Math.floor(shorter / SAMPLE_COUNT));
  let differing = 0;
  let checked = 0;
  for (let i = 0; i < shorter; i += step) {
    checked++;
    if (Math.abs(before[i] - after[i]) > COLOR_DELTA_THRESHOLD) differing++;
  }
  if (checked === 0) return false;

  return differing / checked > changedRatioThreshold;
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

/**
 * Some sites (heavy GSAP ScrollTrigger setups especially) intercept wheel
 * input and animate content via transforms without ever moving the native
 * scroll position — window.scrollTo becomes a no-op and
 * document.documentElement.scrollHeight stays pinned at one viewport's
 * height. Detected by asking for a scroll and checking whether scrollY
 * actually changed; when it didn't, callers should fall back to simulated
 * wheel input instead of scrollTo/scrollHeight, since those never move here.
 */
async function nativeScrollWorks(page: Page): Promise<boolean> {
  const before = await page.evaluate(() => window.scrollY);
  await page.evaluate(() => window.scrollTo(0, 200));
  await page.waitForTimeout(150);
  const after = await page.evaluate(() => window.scrollY);
  await page.evaluate(() => window.scrollTo(0, 0));
  return after !== before;
}

async function captureFull(page: Page, device: string, onWarning: (message: string) => void): Promise<Buffer> {
  await prepareForScreenshot(page);

  if (await nativeScrollWorks(page)) {
    return page.screenshot({ fullPage: true, type: "png", animations: "disabled" });
  }

  // fullPage capture relies on the browser's own scrollHeight bookkeeping,
  // which is exactly what's broken here — there's no reliable way to stitch
  // a full-page image from wheel-simulated, JS-driven scroll. Falling back
  // to a single viewport-sized shot of the resting hero beats silently
  // returning a truncated "full page" image.
  onWarning(
    `${device} : ce site pilote son scroll en JavaScript — seule la première section a pu être capturée en vue complète.`,
  );
  return page.screenshot({ type: "png", animations: "disabled" });
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
): Promise<Array<{ buffer: Buffer; replay: ScreenReplay }>> {
  if (!(await nativeScrollWorks(page))) {
    onWarning(
      `${device} : ce site pilote son scroll en JavaScript, la pagination par écrans peut être incomplète.`,
    );
    return captureScreensByWheel(page, device, onProgress, isCancelled);
  }

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

  const results: Array<{ buffer: Buffer; replay: ScreenReplay }> = [];
  for (let i = 0; i < positions.length; i++) {
    checkCancelled(isCancelled);
    onProgress({ device, current: i, total: positions.length });

    await page.evaluate((scrollY) => window.scrollTo(0, scrollY), positions[i]);
    await page.waitForTimeout(300);
    await prepareForScreenshot(page);
    const buffer = await page.screenshot({ type: "png", animations: "disabled" });
    results.push({ buffer, replay: { kind: "scroll", scrollY: positions[i] } });
  }

  onProgress({ device, current: positions.length, total: positions.length });
  return results;
}

const WHEEL_STEP_PX = 700;
const WHEEL_SETTLE_MAX_WAIT_MS = 2500;
const MAX_WHEEL_SCREENS = 15;
// Loose on purpose — this asks "is this basically the same section", not
// "did anything move at all", so a marquee/ticker occupying a small corner
// of the frame shouldn't stop two otherwise-identical screens from matching.
const REPEATED_FRAME_THRESHOLD = 0.15;

/**
 * Fallback for sites where native scroll is a no-op (see nativeScrollWorks):
 * repeatedly simulate a wheel gesture and screenshot after each, stopping
 * once a new frame looks like one already captured — the only available
 * "did we reach the bottom" signal when scrollHeight can't be trusted.
 *
 * Compares against every frame captured so far, not just the last one: a
 * looping marquee or ticking counter keeps SOME part of the frame changing
 * forever, so "differs from the previous frame" alone never fires and the
 * whole budget gets spent re-capturing the same resting section. Once the
 * bulk of the frame (not just a sliver) repeats something already seen,
 * that's the actual end of new content.
 */
async function captureScreensByWheel(
  page: Page,
  device: string,
  onProgress: (event: ProgressEvent) => void,
  isCancelled: () => boolean,
): Promise<Array<{ buffer: Buffer; replay: ScreenReplay }>> {
  const results: Array<{ buffer: Buffer; replay: ScreenReplay }> = [];

  await prepareForScreenshot(page);
  const first = await page.screenshot({ type: "png", animations: "disabled" });
  results.push({ buffer: first, replay: { kind: "wheel", steps: 0 } });
  onProgress({ device, current: 1, total: 0 });

  for (let i = 1; i < MAX_WHEEL_SCREENS; i++) {
    checkCancelled(isCancelled);

    await page.mouse.wheel(0, WHEEL_STEP_PX);
    await waitForVisualStillness(page, WHEEL_SETTLE_MAX_WAIT_MS);
    await prepareForScreenshot(page);
    const current = await page.screenshot({ type: "png", animations: "disabled" });

    const repeatsEarlierFrame = results.some((seen) => !pngBuffersDiffer(seen.buffer, current, REPEATED_FRAME_THRESHOLD));
    if (repeatsEarlierFrame) break;

    results.push({ buffer: current, replay: { kind: "wheel", steps: i } });
    onProgress({ device, current: results.length, total: 0 });
  }

  onProgress({ device, current: results.length, total: results.length });
  return results;
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
    // Before scrolling or measuring page height: a splash/preloader can
    // still be resizing or replacing the DOM, which would throw off both.
    await waitForIntroToSettle(page);
    checkCancelled(options.isCancelled);

    await autoScroll(page);
    checkCancelled(options.isCancelled);

    if (options.mode === "full") {
      return [{ label: device.label, buffer: await captureFull(page, device.label, options.onWarning) }];
    }

    const screens = await captureScreens(
      page,
      device.height,
      device.label,
      options.onProgress,
      options.onWarning,
      options.isCancelled,
    );
    return screens.map(({ buffer, replay }, index) => ({
      label: `${device.label}-${index + 1}`,
      buffer,
      replay,
    }));
  } catch (error) {
    if (cancelledMidFlight) throw new CaptureCancelledError();
    throw error;
  } finally {
    clearInterval(cancelWatcher);
    await context.close().catch(() => {});
  }
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
): Promise<CaptureResult> {
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

  return { images: results.flat() };
}
