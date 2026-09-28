import JSZip from "jszip";
import { convertImage, exportFilename, type ExportFormat } from "./imageFormat";

export interface ZipEntryInput {
  label: string;
  pngBuffer: Buffer;
}

function sanitizeFilename(label: string): string {
  return label.toLowerCase().replace(/[^a-z0-9-]+/g, "-");
}

/**
 * One file per mockup, converted to the requested format — PNG passes
 * through untouched, WebP and PDF are generated per image via
 * imageFormat.ts. Every export format follows this same "one file per
 * mockup, zipped together" shape now; there's no combined multi-page
 * document for any format.
 */
export async function buildZip(images: ZipEntryInput[], slug: string, format: ExportFormat): Promise<Buffer> {
  const zip = new JSZip();
  const usedNames = new Map<string, number>();

  // Filenames are assigned in order first (cheap, deterministic), then all
  // conversions run concurrently — a WebP/PDF zip of many screenshots would
  // otherwise pay for each sharp/pdf-lib encode one at a time.
  const entries = images.map((image) => {
    const base = `${slug}-${sanitizeFilename(image.label)}`;
    const count = usedNames.get(base) ?? 0;
    usedNames.set(base, count + 1);
    const filename = count === 0 ? exportFilename(base, format) : exportFilename(`${base}-${count}`, format);
    return { filename, pngBuffer: image.pngBuffer };
  });

  const converted = await Promise.all(entries.map((entry) => convertImage(entry.pngBuffer, format)));
  entries.forEach((entry, i) => zip.file(entry.filename, converted[i]));

  return zip.generateAsync({ type: "nodebuffer" });
}
