import sharp from "sharp";
import { beforeAll, describe, expect, it } from "vitest";
import { EXPORT_MIME_TYPES, convertImage, exportFilename } from "./imageFormat";

let pngBuffer: Buffer;

beforeAll(async () => {
  pngBuffer = await sharp({
    create: { width: 4, height: 4, channels: 3, background: { r: 10, g: 20, b: 30 } },
  })
    .png()
    .toBuffer();
});

describe("convertImage", () => {
  it("returns the same buffer unchanged for png", async () => {
    const result = await convertImage(pngBuffer, "png");
    expect(result).toBe(pngBuffer);
  });

  it("produces a valid webp buffer", async () => {
    const result = await convertImage(pngBuffer, "webp");
    const metadata = await sharp(result).metadata();
    expect(metadata.format).toBe("webp");
  });

  it("produces a pdf buffer with the PDF magic header", async () => {
    const result = await convertImage(pngBuffer, "pdf");
    expect(result.subarray(0, 5).toString("ascii")).toBe("%PDF-");
  });
});

describe("exportFilename", () => {
  it("appends the format as a file extension", () => {
    expect(exportFilename("example-com-desktop-1", "webp")).toBe("example-com-desktop-1.webp");
  });
});

describe("EXPORT_MIME_TYPES", () => {
  it("maps every export format to its mime type", () => {
    expect(EXPORT_MIME_TYPES).toEqual({
      png: "image/png",
      webp: "image/webp",
      pdf: "application/pdf",
    });
  });
});
