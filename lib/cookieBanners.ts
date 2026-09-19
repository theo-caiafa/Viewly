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
];

const TEXT_PATTERNS = [
  "accept all",
  "accept cookies",
  "j'accepte",
  "tout accepter",
  "accepter tout",
  "accepter les cookies",
  "i agree",
  "allow all",
  "got it",
];

export async function dismissCookieBanners(page: Page): Promise<void> {
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
