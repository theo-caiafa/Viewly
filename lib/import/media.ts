import sharp from "sharp";

export type MediaDeviceId = "desktop" | "tablet" | "mobile";

export const MEDIA_MAX_FILE_BYTES = 20 * 1024 * 1024;
export const MEDIA_MAX_FILES = 10;
export const ACCEPTED_MEDIA_MIME_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;
export const MEDIA_DEVICE_IDS: MediaDeviceId[] = ["desktop", "tablet", "mobile"];

export function isAcceptedMediaMimeType(mimeType: string): boolean {
  return (ACCEPTED_MEDIA_MIME_TYPES as readonly string[]).includes(mimeType);
}

export function isMediaDeviceId(value: string): value is MediaDeviceId {
  return (MEDIA_DEVICE_IDS as string[]).includes(value);
}

export interface NormalizedMediaImage {
  pngBuffer: Buffer;
  width: number;
  height: number;
}

/**
 * Imported files may already be PNG, JPEG or WebP — re-encoding through
 * sharp regardless of input format keeps every stored mockup a PNG, same as
 * a captured screenshot, so the rest of the pipeline (export, zip) never
 * needs to know an image came from an upload instead of a browser capture.
 * Dimensions come from sharp's own decode rather than client-reported
 * values, which can't be trusted.
 */
export async function normalizeMediaImage(buffer: Buffer): Promise<NormalizedMediaImage> {
  const metadata = await sharp(buffer).metadata();
  if (!metadata.width || !metadata.height) {
    throw new Error("Dimensions de l'image illisibles.");
  }
  const pngBuffer = await sharp(buffer).png().toBuffer();
  return { pngBuffer, width: metadata.width, height: metadata.height };
}

/**
 * Mirrors the "device-index" label convention captured screenshots already
 * use (desktop-1, desktop-2...) so imported images slot into the same
 * gallery/export/zip code without any of it needing to know the image came
 * from an upload.
 */
export function assignMediaLabels(deviceIds: MediaDeviceId[]): string[] {
  const counters: Partial<Record<MediaDeviceId, number>> = {};
  return deviceIds.map((id) => {
    const next = (counters[id] ?? 0) + 1;
    counters[id] = next;
    return `${id}-${next}`;
  });
}
