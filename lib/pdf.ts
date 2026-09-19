import { PDFDocument } from "pdf-lib";
import type { MockupImage } from "./capture";

export async function buildPdf(images: MockupImage[]): Promise<Buffer> {
  const doc = await PDFDocument.create();

  for (const image of images) {
    const png = await doc.embedPng(image.buffer);
    const page = doc.addPage([png.width, png.height]);
    page.drawImage(png, { x: 0, y: 0, width: png.width, height: png.height });
  }

  const bytes = await doc.save();
  return Buffer.from(bytes);
}
