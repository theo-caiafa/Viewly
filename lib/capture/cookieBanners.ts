import type { Page } from "playwright";

const SELECTORS = [
  "#onetrust-accept-btn-handler",
  "#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll",
  "#CybotCookiebotDialogBodyButtonAccept",
  ".cc-btn.cc-allow",
  "[data-testid='cookie-accept']",
  "[data-testid='uc-accept-all-button']",
  "#didomi-notice-agree-button",
  ".fc-cta-consent",
  "#accept-cookie-notification",
  "#termly-consent-banner .t-accept-all-button",
  "[data-cky-tag='accept-button']",
  "#osano-cm-accept-all",
  "#usercentrics-root",
];

const TEXT_PATTERNS = [
  "accept all",
  "accept cookies",
  "j'accepte",
  "tout accepter",
  "accepter tout",
  "accepter les cookies",
  "accepter",
  "i agree",
  "allow all",
  "got it",
  "j'ai compris",
];

// Fixed/sticky elements whose id or class contains one of these are hidden
// right before every screenshot — covers cookie banners plus the other
// common floating intrusions (chat bubbles, promo/newsletter widgets) that
// aren't part of the page's actual design.
const OVERLAY_KEYWORDS = [
  "cookie",
  "consent",
  "gdpr",
  "rgpd",
  "privacy-banner",
  "intercom",
  "crisp-client",
  "drift-widget",
  "tawk",
  "chatwoot",
  "hubspot-messages-iframe-container",
  "livechat",
  "zendesk",
  "tidio",
  "chat-widget",
  "klaviyo-form",
  "onesignal-slidedown-dialog",
];

/**
 * Best-effort click on a known "accept" button. Run once, right after
 * navigation. Sites often animate the banner closed over a few hundred ms,
 * so the visual removal lags behind the click — hideKnownOverlays() below
 * is the synchronous backstop for whatever is still on screen when a
 * screenshot is about to be taken.
 */
export async function attemptDismissCookieBanners(page: Page): Promise<void> {
  for (const selector of SELECTORS) {
    try {
      const el = page.locator(selector).first();
      if (await el.isVisible({ timeout: 500 })) {
        await el.click({ timeout: 1000 });
        await page.waitForTimeout(300);
        return;
      }
    } catch {
      // selector not present or not clickable, try the next one
    }
  }

  for (const text of TEXT_PATTERNS) {
    try {
      const button = page.getByRole("button", { name: new RegExp(text, "i") }).first();
      if (await button.isVisible({ timeout: 500 })) {
        await button.click({ timeout: 1000 });
        await page.waitForTimeout(300);
        return;
      }
    } catch {
      // no match, try the next pattern
    }
  }
}

/**
 * Cheap synchronous safety net (a few tens of ms even on heavy pages):
 * force-hides any fixed/sticky element that still looks like a cookie
 * banner, chat widget, or promo popup. Safe to call right before every
 * screenshot.
 */
export async function hideKnownOverlays(page: Page): Promise<void> {
  await page.evaluate((keywords) => {
    const elements = document.querySelectorAll<HTMLElement>("body *");
    for (const el of elements) {
      const identity = `${el.id ?? ""} ${String(el.className ?? "")}`.toLowerCase();
      if (!keywords.some((keyword) => identity.includes(keyword))) continue;
      const position = getComputedStyle(el).position;
      if (position === "fixed" || position === "sticky") {
        el.style.setProperty("display", "none", "important");
      }
    }
  }, OVERLAY_KEYWORDS);
}
