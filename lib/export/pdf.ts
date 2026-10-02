import { PDFDocument } from "pdf-lib";

/**
 * One mockup per PDF, sized to that image exactly — used both for the
 * single-mockup "download as PDF" button and for each entry when the zip
 * export format is set to PDF (see imageFormat.ts and zip.ts). There's no
 * combined multi-page PDF anymore: every export format now produces one
 * file per mockup, PDF included, for a consistent "download all" model.
 */
export async function buildSinglePagePdf(pngBuffer: Buffer): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const png = await doc.embedPng(pngBuffer);
  const page = doc.addPage([png.width, png.height]);
  page.drawImage(png, { x: 0, y: 0, width: png.width, height: png.height });

  const bytes = await doc.save();
  return Buffer.from(bytes);
}
