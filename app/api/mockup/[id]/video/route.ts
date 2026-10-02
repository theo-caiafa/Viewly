import { NextRequest, NextResponse } from "next/server";
import { getJob } from "@/lib/jobs";
import { getSharedBrowser } from "@/lib/capture/browserManager";
import { captureScreenVideo, type HoverPoint } from "@/lib/capture/videoCapture";
import { DEVICE_SCALE_FACTOR } from "@/lib/capture/capture";

export const runtime = "nodejs";

const MIN_DURATION_MS = 1000;
const MAX_DURATION_MS = 30_000;
const MIN_SCALE = 0.25;
const MAX_SCALE = 1;

interface RequestBody {
  label?: unknown;
  durationMs?: unknown;
  scale?: unknown;
  hoverPoint?: unknown;
  scrollToNextScreen?: unknown;
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const job = getJob(id);
  if (!job) {
    return NextResponse.json({ error: "Génération introuvable ou expirée." }, { status: 404 });
  }
  if (!job.sourceContext) {
    return NextResponse.json({ error: "Contexte de génération indisponible." }, { status: 410 });
  }

  let body: RequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps de requête invalide." }, { status: 400 });
  }

  const { label, durationMs, scale, hoverPoint, scrollToNextScreen } = body;

  if (typeof label !== "string") {
    return NextResponse.json({ error: "Écran manquant." }, { status: 400 });
  }
  if (typeof durationMs !== "number" || durationMs < MIN_DURATION_MS || durationMs > MAX_DURATION_MS) {
    return NextResponse.json({ error: "Durée invalide (1 à 30 secondes)." }, { status: 400 });
  }
  if (typeof scale !== "number" || scale < MIN_SCALE || scale > MAX_SCALE) {
    return NextResponse.json({ error: "Échelle invalide." }, { status: 400 });
  }

  let parsedHoverPoint: HoverPoint | undefined;
  if (hoverPoint !== undefined) {
    if (
      typeof hoverPoint !== "object" ||
      hoverPoint === null ||
      typeof (hoverPoint as Record<string, unknown>).x !== "number" ||
      typeof (hoverPoint as Record<string, unknown>).y !== "number"
    ) {
      return NextResponse.json({ error: "Point de survol invalide." }, { status: 400 });
    }
    parsedHoverPoint = hoverPoint as HoverPoint;
  }

  if (scrollToNextScreen !== undefined && typeof scrollToNextScreen !== "boolean") {
    return NextResponse.json({ error: "Option de scroll invalide." }, { status: 400 });
  }

  const replay = job.sourceContext.replaysByLabel[label];
  if (!replay) {
    const imageExists = job.images?.some((img) => img.label === label);
    const message = imageExists
      ? "La capture vidéo n'est disponible qu'en mode « par écrans »."
      : "Écran introuvable pour cette génération.";
    return NextResponse.json({ error: message }, { status: imageExists ? 400 : 404 });
  }

  const deviceId = label.split("-")[0];
  const device = job.sourceContext.devices.find((d) => d.label === deviceId);
  if (!device) {
    return NextResponse.json({ error: "Device introuvable pour cette génération." }, { status: 404 });
  }

  let scrollToReplay = undefined;
  if (scrollToNextScreen) {
    const screenIndex = Number(label.split("-")[1]);
    if (!Number.isFinite(screenIndex)) {
      return NextResponse.json({ error: "Pas d'écran suivant pour ce mode de capture." }, { status: 400 });
    }
    const nextLabel = `${deviceId}-${screenIndex + 1}`;
    const nextReplay = job.sourceContext.replaysByLabel[nextLabel];
    if (!nextReplay) {
      return NextResponse.json({ error: "Aucun écran suivant à filmer." }, { status: 400 });
    }
    scrollToReplay = nextReplay;
  }

  try {
    const browser = await getSharedBrowser();
    const buffer = await captureScreenVideo(browser, {
      url: job.sourceContext.url,
      device,
      replay,
      durationMs,
      scale,
      deviceScaleFactor: DEVICE_SCALE_FACTOR[job.sourceContext.quality],
      httpCredentials: job.sourceContext.httpCredentials,
      hoverPoint: parsedHoverPoint,
      scrollToReplay,
    });

    return NextResponse.json({ dataUrl: `data:video/webm;base64,${buffer.toString("base64")}` });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur inconnue.";
    return NextResponse.json({ error: `Capture vidéo impossible : ${message}` }, { status: 500 });
  }
}
