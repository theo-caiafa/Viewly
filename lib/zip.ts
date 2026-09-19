import JSZip from "jszip";
import type { MockupImage } from "./capture";

export async function buildZip(images: MockupImage[]): Promise<Buffer> {
  const zip = new JSZip();
  for (const image of images) {
    zip.file(`${image.label}.png`, image.buffer);
  }
  return zip.generateAsync({ type: "nodebuffer" });
}
