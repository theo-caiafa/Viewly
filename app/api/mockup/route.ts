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
  desktopWidth?: unknown;
  desktopHeight?: unknown;
}

export async function POST(request: NextRequest) {
  let body: RequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps de requête invalide." }, { status: 400 });
  }

  const { url, mode, quality, username, password, devices, desktopWidth, desktopHeight } = body;

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

  const hasCustomDesktopResolution =
    typeof desktopWidth === "number" && typeof desktopHeight === "number";
  if (
    hasCustomDesktopResolution &&
    (desktopWidth < 320 || desktopWidth > 3840 || desktopHeight < 240 || desktopHeight > 3840)
  ) {
    return NextResponse.json({ error: "Résolution desktop invalide." }, { status: 400 });
  }

  const resolvedDevices: DeviceConfig[] = selectedDeviceIds.map((id) => {
    const base = DEFAULT_DEVICES.find((d) => d.label === id)!;
    if (id === "desktop" && hasCustomDesktopResolution) {
      return {
        label: "desktop",
        width: Math.round(desktopWidth as number),
        height: Math.round(desktopHeight as number),
      };
    }
    return base;
  });

  const job = createJob();

  void (async () => {
    try {
      const images = await captureMockups(url, {
        mode: mode as CaptureMode | undefined,
        quality: quality as CaptureQuality | undefined,
        devices: resolvedDevices,
        httpCredentials:
          hasUsername && hasPassword
            ? { username: username as string, password: password as string }
            : undefined,
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
