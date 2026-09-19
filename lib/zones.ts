export interface ZoneDescriptor {
  index: number;
  tag: string;
}

const ATTRIBUTE = "data-viewly-zone";

/**
 * Runs in the browser context. Tags candidate "section" elements with
 * data-viewly-zone so they can be located and screenshotted individually.
 * Heuristic: prefer semantic landmarks, keep only the outermost ones (no
 * nested duplicates), and fall back to direct children of <main>/<body>
 * when a page has fewer than two semantic landmarks.
 */
export function tagZones(): ZoneDescriptor[] {
  const isSignificant = (el: Element) => {
    const rect = el.getBoundingClientRect();
    const style = getComputedStyle(el);
    return (
      rect.height > 120 &&
      rect.width > 200 &&
      style.display !== "none" &&
      style.visibility !== "hidden"
    );
  };

  let candidates = Array.from(
    document.querySelectorAll("header, section, footer, nav, main > *, article"),
  );
  candidates = candidates.filter(
    (el) => !candidates.some((other) => other !== el && other.contains(el)),
  );

  if (candidates.length < 2) {
    const root = document.querySelector("main") ?? document.body;
    candidates = Array.from(root.children);
  }

  candidates = candidates.filter(isSignificant).slice(0, 15);

  const descriptors: { index: number; tag: string }[] = [];
  candidates.forEach((el, index) => {
    el.setAttribute("data-viewly-zone", String(index));
    descriptors.push({ index, tag: el.tagName.toLowerCase() });
  });

  return descriptors;
}

export function zoneSelector(index: number): string {
  return `[${ATTRIBUTE}="${index}"]`;
}

/**
 * Runs in the browser context, after tagZones(). A fixed/sticky element
 * (nav bar, chat widget, cookie banner...) stays glued to the viewport
 * while we scroll each zone into view, so it can bleed into an unrelated
 * zone's screenshot at whatever scroll position it happens to be captured.
 * Hide every such element except the ones we're deliberately capturing as
 * their own zone (e.g. a real <header> landmark), so it still gets its own
 * clean screenshot when its turn comes.
 */
export function hideFloatingOverlays(): void {
  const elements = document.querySelectorAll<HTMLElement>("body *");
  for (const el of elements) {
    if (el.hasAttribute("data-viewly-zone")) continue;
    const position = getComputedStyle(el).position;
    if (position === "fixed" || position === "sticky") {
      el.style.setProperty("display", "none", "important");
    }
  }
}

export function labelZones(zones: ZoneDescriptor[]): { zone: ZoneDescriptor; label: string }[] {
  const seenCounts = new Map<string, number>();
  return zones.map((zone) => {
    const niceName: Record<string, string> = {
      header: "Header",
      footer: "Footer",
      nav: "Nav",
    };
    if (niceName[zone.tag]) {
      return { zone, label: niceName[zone.tag] };
    }
    const count = (seenCounts.get(zone.tag) ?? 0) + 1;
    seenCounts.set(zone.tag, count);
    return { zone, label: `Section ${count}` };
  });
}
