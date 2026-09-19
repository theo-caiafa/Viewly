import JSZip from "jszip";
import type { MockupImage } from "./capture";

function sanitizeFilename(label: string): string {
  return label.toLowerCase().replace(/[^a-z0-9-]+/g, "-");
}

export async function buildZip(images: MockupImage[], slug: string): Promise<Buffer> {
  const zip = new JSZip();
  const usedNames = new Map<string, number>();

  for (const image of images) {
    const base = `${slug}-${sanitizeFilename(image.label)}`;
    const count = usedNames.get(base) ?? 0;
    usedNames.set(base, count + 1);
    const filename = count === 0 ? `${base}.png` : `${base}-${count}.png`;
    zip.file(filename, image.buffer);
  }

  return zip.generateAsync({ type: "nodebuffer" });
}
