import sharp from "sharp";
import { PDFDocument } from "pdf-lib";
import { beforeAll, describe, expect, it } from "vitest";
import { buildSinglePagePdf } from "./pdf";

let pngBuffer: Buffer;

beforeAll(async () => {
  pngBuffer = await sharp({
    create: { width: 200, height: 100, channels: 3, background: { r: 0, g: 0, b: 0 } },
  })
    .png()
    .toBuffer();
});

describe("buildSinglePagePdf", () => {
  it("produces a single-page pdf sized to the source image", async () => {
    const result = await buildSinglePagePdf(pngBuffer);
    const doc = await PDFDocument.load(result);
    expect(doc.getPageCount()).toBe(1);
    const page = doc.getPage(0);
    expect(page.getWidth()).toBe(200);
    expect(page.getHeight()).toBe(100);
  });
});
