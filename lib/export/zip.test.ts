import JSZip from "jszip";
import sharp from "sharp";
import { beforeAll, describe, expect, it } from "vitest";
import { buildZip } from "./zip";

let pngBuffer: Buffer;

beforeAll(async () => {
  pngBuffer = await sharp({
    create: { width: 4, height: 4, channels: 3, background: { r: 1, g: 2, b: 3 } },
  })
    .png()
    .toBuffer();
});

describe("buildZip", () => {
  it("names each entry from the slug and label, in the requested format", async () => {
    const zipBuffer = await buildZip(
      [
        { label: "desktop-1", pngBuffer },
        { label: "mobile-1", pngBuffer },
      ],
      "example-com",
      "png",
    );
    const zip = await JSZip.loadAsync(zipBuffer);
    expect(Object.keys(zip.files).sort()).toEqual(["example-com-desktop-1.png", "example-com-mobile-1.png"]);
  });

  it("disambiguates entries that would otherwise share a filename", async () => {
    const zipBuffer = await buildZip(
      [
        { label: "desktop-1", pngBuffer },
        { label: "desktop-1", pngBuffer },
      ],
      "example-com",
      "png",
    );
    const zip = await JSZip.loadAsync(zipBuffer);
    expect(Object.keys(zip.files).sort()).toEqual(["example-com-desktop-1-1.png", "example-com-desktop-1.png"]);
  });

  it("converts every entry to the requested format", async () => {
    const zipBuffer = await buildZip([{ label: "desktop-1", pngBuffer }], "example-com", "webp");
    const zip = await JSZip.loadAsync(zipBuffer);
    const file = zip.file("example-com-desktop-1.webp");
    expect(file).not.toBeNull();
    const content = await file!.async("nodebuffer");
    const metadata = await sharp(content).metadata();
    expect(metadata.format).toBe("webp");
  });
});
