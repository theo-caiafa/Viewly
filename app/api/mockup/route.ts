import { NextRequest, NextResponse } from "next/server";
import {
  captureMockups,
  CaptureCancelledError,
  DEFAULT_DEVICES,
  type CaptureMode,
  type CaptureQuality,
  type DeviceConfig,
} from "@/lib/capture";
import { buildZip } from "@/lib/zip";
import { buildPdf } from "@/lib/pdf";
import { siteSlug } from "@/lib/siteSlug";
import { createJob, updateJob, setProgress, getJob } from "@/lib/jobs";

export const runtime = "nodejs";

const VALID_MODES: CaptureMode[] = ["full", "sections"];
const VALID_QUALITIES: CaptureQuality[] = ["standard", "high"];
const VALID_DEVICE_IDS = ["desktop", "tablet", "mobile"];

interface RequestBody {
  url?: unknown;
  mode?: unknown;
  quality?: unknown;
  username?: unknown;
  password?: unknown;
  devices?: unknown;
  // Keyed by device id ("desktop" | "tablet" | "mobile"); a device without
  // an entry here keeps its DEFAULT_DEVICES size.
  resolutions?: unknown;
}

interface CustomResolution {
  width: number;
  height: number;
}

const MIN_DIMENSION = 200;
const MAX_DIMENSION = 3840;

function parseResolutions(input: unknown): Record<string, CustomResolution> | null {
  if (input === undefined) return {};
  if (typeof input !== "object" || input === null || Array.isArray(input)) return null;

  const result: Record<string, CustomResolution> = {};
  for (const [id, value] of Object.entries(input as Record<string, unknown>)) {
    if (!VALID_DEVICE_IDS.includes(id)) return null;
    if (typeof value !== "object" || value === null) return null;
    const { width, height } = value as Record<string, unknown>;
    if (typeof width !== "number" || typeof height !== "number") return null;
    if (width < MIN_DIMENSION || width > MAX_DIMENSION || height < MIN_DIMENSION || height > MAX_DIMENSION) {
      return null;
    }
    result[id] = { width: Math.round(width), height: Math.round(height) };
  }
  return result;
}

export async function POST(request: NextRequest) {
  let body: RequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps de requête invalide." }, { status: 400 });
  }

  const { url, mode, quality, username, password, devices, resolutions } = body;

  if (typeof url !== "string" || url.trim().length === 0) {
    return NextResponse.json({ error: "Merci de fournir une URL." }, { status: 400 });
  }

  if (mode !== undefined && !VALID_MODES.includes(mode as CaptureMode)) {
    return NextResponse.json({ error: "Mode de capture invalide." }, { status: 400 });
  }

  if (quality !== undefined && !VALID_QUALITIES.includes(quality as CaptureQuality)) {
    return NextResponse.json({ error: "Niveau de qualité invalide." }, { status: 400 });
  }

  const hasUsername = typeof username === "string" && username.length > 0;
  const hasPassword = typeof password === "string" && password.length > 0;
  if (hasUsername !== hasPassword) {
    return NextResponse.json(
      { error: "Renseigne à la fois l'identifiant et le mot de passe, ou aucun des deux." },
      { status: 400 },
    );
  }

  let selectedDeviceIds: string[];
  if (devices === undefined) {
    selectedDeviceIds = VALID_DEVICE_IDS;
  } else if (
    Array.isArray(devices) &&
    devices.every((d) => typeof d === "string" && VALID_DEVICE_IDS.includes(d))
  ) {
    selectedDeviceIds = devices as string[];
  } else {
    return NextResponse.json({ error: "Sélection de devices invalide." }, { status: 400 });
  }
  if (selectedDeviceIds.length === 0) {
    return NextResponse.json({ error: "Sélectionne au moins un device." }, { status: 400 });
  }

  const customResolutions = parseResolutions(resolutions);
  if (customResolutions === null) {
    return NextResponse.json({ error: "Résolution personnalisée invalide." }, { status: 400 });
  }

  const resolvedDevices: DeviceConfig[] = selectedDeviceIds.map((id) => {
    const custom = customResolutions[id];
    if (custom) {
      return { label: id, width: custom.width, height: custom.height };
    }
    return DEFAULT_DEVICES.find((d) => d.label === id)!;
  });

  const job = createJob();
  const httpCredentials =
    hasUsername && hasPassword
      ? { username: username as string, password: password as string }
      : undefined;

  void (async () => {
    try {
      const { images } = await captureMockups(url, {
        mode: mode as CaptureMode | undefined,
        quality: quality as CaptureQuality | undefined,
        devices: resolvedDevices,
        httpCredentials,
        onProgress: (event) => setProgress(job.id, event.device, event.current, event.total),
        onWarning: (message) => updateJob(job.id, { warning: message }),
        isCancelled: () => getJob(job.id)?.cancelRequested ?? false,
      });

      const slug = siteSlug(url);
      const [zip, pdf] = await Promise.all([buildZip(images, slug), buildPdf(images)]);

      updateJob(job.id, {
        status: "done",
        images: images.map((image) => ({
          label: image.label,
          dataUrl: `data:image/png;base64,${image.buffer.toString("base64")}`,
        })),
        zipDataUrl: `data:application/zip;base64,${zip.toString("base64")}`,
        pdfDataUrl: `data:application/pdf;base64,${pdf.toString("base64")}`,
      });
    } catch (error) {
      if (error instanceof CaptureCancelledError) {
        updateJob(job.id, { status: "cancelled" });
        return;
      }
      const message = error instanceof Error ? error.message : "Erreur inconnue.";
      updateJob(job.id, { status: "error", error: `Impossible de générer les mockups : ${message}` });
    }
  })();

  return NextResponse.json({ jobId: job.id }, { status: 202 });
}
