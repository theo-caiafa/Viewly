import sharp from "sharp";
import { buildSinglePagePdf } from "./pdf";

export type ExportFormat = "png" | "webp" | "pdf";

export const EXPORT_MIME_TYPES: Record<ExportFormat, string> = {
  png: "image/png",
  webp: "image/webp",
  pdf: "application/pdf",
};

const WEBP_QUALITY = 90;

/**
 * Mockups are always captured and stored as PNG (see capture.ts) — this
 * converts on demand for whichever format the user picked in the export
 * dropdown, so a format switch never requires re-capturing the site.
 */
export async function convertImage(pngBuffer: Buffer, format: ExportFormat): Promise<Buffer> {
  if (format === "png") return pngBuffer;
  if (format === "webp") return sharp(pngBuffer).webp({ quality: WEBP_QUALITY }).toBuffer();
  return buildSinglePagePdf(pngBuffer);
}

export function exportFilename(baseName: string, format: ExportFormat): string {
  return `${baseName}.${format}`;
}
