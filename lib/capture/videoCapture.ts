import { mkdtemp, readFile, rm } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { spawn } from "child_process";
import ffmpegPath from "ffmpeg-static";
import type { Browser, Page } from "playwright";
import { attemptDismissCookieBanners, hideKnownOverlays } from "./cookieBanners";
import type { DeviceConfig, HttpCredentials, ScreenReplay } from "./capture";

export interface HoverPoint {
  x: number;
  y: number;
}

export interface CaptureScreenVideoOptions {
  url: string;
  device: DeviceConfig;
  replay: ScreenReplay;
  durationMs: number;
  scale: number;
  // Matches the deviceScaleFactor the mockup PNGs were captured with (see
  // DEVICE_SCALE_FACTOR in capture.ts) — without this the page always
  // renders at 1x internally and recordVideo.size just stretches that
  // softer source, so "haute qualité" mockups had no effect on video sharpness.
  deviceScaleFactor: number;
  httpCredentials?: HttpCredentials;
  // Held for the whole recording — nothing moves the mouse afterward, so a
  // hover-only animation (card lift, button fill) plays for the full clip
  // instead of only the instant right after landing on the screen.
  hoverPoint?: HoverPoint;
  // Scrolls from this screen's position to scrollToReplay's over the
  // recording instead of sitting still — for capturing the scroll motion
  // itself (parallax, staggered reveal) rather than a resting screen.
  scrollToReplay?: ScreenReplay;
}

export interface HoverableElement {
  id: string;
  label: string;
  point: HoverPoint;
}

const NAV_TIMEOUT_MS = 30_000;
// Matches capture.ts's own wheel step — the replay must scroll the same
// distance per gesture the original capture used, or step N lands somewhere
// else on a scroll-jacked page.
const WHEEL_STEP_PX = 700;
const WHEEL_REPLAY_SETTLE_MS = 400;
// Bails out of the fallback wheel-nudging below rather than scrolling
// forever if the page never settles near the recorded position.
const MAX_FALLBACK_WHEEL_STEPS = 20;

/**
 * Re-navigates and replays whatever got a screen into view during the
 * regular mockup capture (see ScreenReplay in capture.ts). Shared by video
 * capture and hoverable-element scanning — both need "arrive at exactly
 * this screen" and nothing else, from a fresh context/page (the mockup
 * pass's context is long closed by the time either is requested).
 *
 * The recorded replay kind (native scroll vs. simulated wheel) reflects
 * whatever capture.ts observed at capture time, which isn't guaranteed to
 * still hold — a site can scroll-jack only after a cookie banner is
 * dismissed, for instance, so a page captured post-dismissal records
 * "scroll" but a fresh replay (banner back, not yet dismissed) hits
 * scroll-jacking again. window.scrollTo would silently no-op in that case,
 * so a "scroll" replay is verified after the fact and, if it didn't move,
 * nudged toward the target position with wheel gestures instead.
 */
async function navigateAndReplay(page: Page, url: string, replay: ScreenReplay): Promise<void> {
  await page.goto(url, { waitUntil: "networkidle", timeout: NAV_TIMEOUT_MS });
  await attemptDismissCookieBanners(page);

  if (replay.kind === "scroll") {
    await page.evaluate((y) => window.scrollTo(0, y), replay.scrollY);
    await page.waitForTimeout(300);

    const landedY = await page.evaluate(() => window.scrollY);
    if (replay.scrollY > 0 && landedY < replay.scrollY / 2) {
      // Native scroll didn't take — approximate the same position by
      // wheel-nudging until we're close, capped so a page that never
      // settles doesn't hang the request.
      for (let i = 0; i < MAX_FALLBACK_WHEEL_STEPS; i++) {
        const currentY = await page.evaluate(() => window.scrollY);
        if (currentY >= replay.scrollY - WHEEL_STEP_PX) break;
        await page.mouse.wheel(0, WHEEL_STEP_PX);
        await page.waitForTimeout(WHEEL_REPLAY_SETTLE_MS);
      }
    }
  } else {
    for (let i = 0; i < replay.steps; i++) {
      await page.mouse.wheel(0, WHEEL_STEP_PX);
      await page.waitForTimeout(WHEEL_REPLAY_SETTLE_MS);
    }
  }

  await hideKnownOverlays(page);
}

/**
 * Re-navigates and replays whatever got a screen into view during the
 * regular mockup capture, then records a WebM of the resulting viewport. A
 * fresh context per capture rather than reusing the mockup pass's — that
 * context is long closed by the time a user picks a screen to export (jobs
 * are async, results already shipped), and a video recording needs
 * recordVideo set at context-creation time anyway, which the original
 * mockup context never had.
 */
export async function captureScreenVideo(browser: Browser, options: CaptureScreenVideoOptions): Promise<Buffer> {
  const videoDir = await mkdtemp(join(tmpdir(), "viewly-video-"));
  const recordedWidth = Math.max(1, Math.round(options.device.width * options.scale));
  const recordedHeight = Math.max(1, Math.round(options.device.height * options.scale));

  const context = await browser.newContext({
    viewport: { width: options.device.width, height: options.device.height },
    deviceScaleFactor: options.deviceScaleFactor,
    httpCredentials: options.httpCredentials,
    recordVideo: {
      dir: videoDir,
      size: { width: recordedWidth, height: recordedHeight },
    },
  });
  const page = await context.newPage();
  // Playwright's video starts recording the moment the page is created —
  // before goto() even resolves — so navigation and the scroll/wheel replay
  // both land in the raw file ahead of the part the user actually asked
  // for. Timing from here lets the raw recording be trimmed down to just
  // the "durationMs on the target screen" window afterward.
  const recordingStartedAt = Date.now();

  try {
    await navigateAndReplay(page, options.url, options.replay);

    if (options.hoverPoint) {
      await page.mouse.move(options.hoverPoint.x, options.hoverPoint.y);
      await page.waitForTimeout(150); // let the hover-triggered transition start before the timed window begins
    }

    const trimStartMs = Date.now() - recordingStartedAt;

    if (options.scrollToReplay) {
      await animateScrollTo(page, options.scrollToReplay, options.durationMs);
    } else if (options.hoverPoint) {
      // Nothing else moves the mouse during a plain wait, but re-asserting
      // partway through guards against a site programmatically resetting
      // hover state (e.g. a carousel autoplay) mid-recording.
      await page.waitForTimeout(options.durationMs / 2);
      await page.mouse.move(options.hoverPoint.x, options.hoverPoint.y);
      await page.waitForTimeout(options.durationMs / 2);
    } else {
      await page.waitForTimeout(options.durationMs);
    }

    const video = page.video();
    if (!video) throw new Error("Enregistrement vidéo indisponible.");

    await context.close();
    const rawPath = await video.path();
    return await trimVideo(rawPath, trimStartMs, options.durationMs, videoDir);
  } finally {
    await context.close().catch(() => {});
    await rm(videoDir, { recursive: true, force: true }).catch(() => {});
  }
}

/**
 * Scrolls smoothly from the current position to the target replay's
 * position over durationMs, in small steps, so the recording shows motion
 * (parallax, staggered reveals triggered by scroll position) instead of a
 * jump cut. Only meaningful for "scroll" replays — a scroll-jacked page's
 * "position" is a wheel-step count, and simulating that smoothly would mean
 * guessing how far each wheel event moves the page, which capture.ts itself
 * doesn't assume either.
 */
async function animateScrollTo(page: Page, targetReplay: ScreenReplay, durationMs: number): Promise<void> {
  if (targetReplay.kind !== "scroll") {
    await page.waitForTimeout(durationMs);
    return;
  }

  const startY = await page.evaluate(() => window.scrollY);
  const distance = targetReplay.scrollY - startY;
  const stepMs = 50;
  const steps = Math.max(1, Math.round(durationMs / stepMs));

  for (let i = 1; i <= steps; i++) {
    const progress = i / steps;
    const y = startY + distance * progress;
    await page.evaluate((scrollY) => window.scrollTo(0, scrollY), y);
    await page.waitForTimeout(stepMs);
  }
}

/**
 * Lists clickable-looking elements visible in the viewport after landing on
 * a screen, for the "simulate a hover" picker — the user chooses from named
 * elements instead of having to point at coordinates on an image.
 */
export async function listHoverableElements(
  browser: Browser,
  options: {
    url: string;
    device: DeviceConfig;
    replay: ScreenReplay;
    httpCredentials?: HttpCredentials;
  },
): Promise<HoverableElement[]> {
  const context = await browser.newContext({
    viewport: { width: options.device.width, height: options.device.height },
    httpCredentials: options.httpCredentials,
  });
  const page = await context.newPage();

  try {
    await navigateAndReplay(page, options.url, options.replay);

    const elements = await page.evaluate(() => {
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;
      const nodes = document.querySelectorAll<HTMLElement>(
        "a, button, [role='button'], [class*='card' i], [class*='btn' i]",
      );
      const found: Array<{ label: string; x: number; y: number }> = [];
      const seenLabels = new Set<string>();

      for (const el of nodes) {
        if (found.length >= 20) break;
        const rect = el.getBoundingClientRect();
        if (rect.bottom <= 0 || rect.top >= viewportHeight) continue;
        if (rect.right <= 0 || rect.left >= viewportWidth) continue;
        if (rect.width < 20 || rect.height < 20) continue;

        const style = getComputedStyle(el);
        if (style.cursor !== "pointer" && el.tagName !== "A" && el.tagName !== "BUTTON") continue;

        const text = (el.textContent ?? "").trim().replace(/\s+/g, " ").slice(0, 40);
        const label = text || el.getAttribute("aria-label") || `${el.tagName.toLowerCase()} sans texte`;
        const dedupeKey = `${label}-${Math.round(rect.top / 10)}`;
        if (seenLabels.has(dedupeKey)) continue;
        seenLabels.add(dedupeKey);

        found.push({
          label,
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
        });
      }
      return found;
    });

    return elements.map((el, index) => ({
      id: String(index),
      label: el.label,
      point: { x: el.x, y: el.y },
    }));
  } finally {
    await context.close().catch(() => {});
  }
}

// Playwright's own VP8 encoder targets a low, fixed bitrate regardless of
// resolution — it's built for debugging test runs, not for export, so a
// 1920x1080 recording looks as compressed as a 480p one. Re-encoding here
// (rather than a plain stream copy) is what actually fixes the visible
// blockiness the raw recording has at any resolution.
const VP9_CRF = 24; // lower = higher quality/bigger file; 20-30 is a reasonable band for VP9
const ENCODE_TIMEOUT_MS = 60_000;

/**
 * Cuts [trimStartMs, trimStartMs + durationMs] out of the raw recording and
 * re-encodes it in VP9 at a fixed quality (CRF) instead of Playwright's low
 * capture bitrate. Trimming before re-encoding (rather than re-encoding the
 * whole raw file then cutting) keeps this fast — only the seconds the user
 * asked for get the expensive quality pass.
 */
async function trimVideo(rawPath: string, trimStartMs: number, durationMs: number, workDir: string): Promise<Buffer> {
  if (!ffmpegPath) throw new Error("Binaire ffmpeg introuvable.");

  const trimmedPath = join(workDir, "trimmed.webm");
  const startSeconds = (Math.max(0, trimStartMs) / 1000).toFixed(3);
  const durationSeconds = (durationMs / 1000).toFixed(3);

  await new Promise<void>((resolve, reject) => {
    const proc = spawn(ffmpegPath as string, [
      "-y",
      "-ss",
      startSeconds,
      "-i",
      rawPath,
      "-t",
      durationSeconds,
      "-c:v",
      "libvpx-vp9",
      "-crf",
      String(VP9_CRF),
      "-b:v",
      "0", // 0 = pure CRF (quality-driven), no target bitrate cap
      "-deadline",
      "good",
      "-cpu-used",
      "2",
      "-an",
      trimmedPath,
    ]);
    let stderr = "";
    const timer = setTimeout(() => {
      proc.kill("SIGKILL");
      reject(new Error("Encodage vidéo trop long."));
    }, ENCODE_TIMEOUT_MS);
    proc.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    proc.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
    proc.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg a échoué (code ${code}): ${stderr.slice(-500)}`));
    });
  });

  return readFile(trimmedPath);
}
