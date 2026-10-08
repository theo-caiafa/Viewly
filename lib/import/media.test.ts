import sharp from "sharp";
import { describe, expect, it } from "vitest";
import {
  assignMediaLabels,
  isAcceptedMediaMimeType,
  isMediaDeviceId,
  normalizeMediaImage,
} from "./media";

describe("isAcceptedMediaMimeType", () => {
  it("accepts png, jpeg and webp", () => {
    expect(isAcceptedMediaMimeType("image/png")).toBe(true);
    expect(isAcceptedMediaMimeType("image/jpeg")).toBe(true);
    expect(isAcceptedMediaMimeType("image/webp")).toBe(true);
  });

  it("rejects everything else", () => {
    expect(isAcceptedMediaMimeType("image/svg+xml")).toBe(false);
    expect(isAcceptedMediaMimeType("application/pdf")).toBe(false);
  });
});

describe("isMediaDeviceId", () => {
  it("accepts the three known device ids", () => {
    expect(isMediaDeviceId("desktop")).toBe(true);
    expect(isMediaDeviceId("tablet")).toBe(true);
    expect(isMediaDeviceId("mobile")).toBe(true);
  });

  it("rejects anything else", () => {
    expect(isMediaDeviceId("watch")).toBe(false);
    expect(isMediaDeviceId("")).toBe(false);
  });
});

describe("assignMediaLabels", () => {
  it("numbers each device independently from 1", () => {
    expect(assignMediaLabels(["desktop", "mobile", "desktop"])).toEqual([
      "desktop-1",
      "mobile-1",
      "desktop-2",
    ]);
  });
});

describe("normalizeMediaImage", () => {
  it("re-encodes a jpeg to png and reports its real dimensions", async () => {
    const jpegBuffer = await sharp({
      create: { width: 12, height: 8, channels: 3, background: { r: 200, g: 100, b: 50 } },
    })
      .jpeg()
      .toBuffer();

    const result = await normalizeMediaImage(jpegBuffer);
    expect(result.width).toBe(12);
    expect(result.height).toBe(8);
    const metadata = await sharp(result.pngBuffer).metadata();
    expect(metadata.format).toBe("png");
  });

  it("re-encodes a webp to png", async () => {
    const webpBuffer = await sharp({
      create: { width: 6, height: 6, channels: 3, background: { r: 0, g: 0, b: 0 } },
    })
      .webp()
      .toBuffer();

    const result = await normalizeMediaImage(webpBuffer);
    const metadata = await sharp(result.pngBuffer).metadata();
    expect(metadata.format).toBe("png");
  });

  it("rejects a buffer that isn't a real image", async () => {
    await expect(normalizeMediaImage(Buffer.from("not an image"))).rejects.toThrow();
  });
});
