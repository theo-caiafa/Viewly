import { NextRequest, NextResponse } from "next/server";
import { getJob } from "@/lib/jobs";
import { getSharedBrowser } from "@/lib/capture/browserManager";
import { listHoverableElements } from "@/lib/capture/videoCapture";

export const runtime = "nodejs";

interface RequestBody {
  label?: unknown;
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

  const { label } = body;
  if (typeof label !== "string") {
    return NextResponse.json({ error: "Écran manquant." }, { status: 400 });
  }

  const replay = job.sourceContext.replaysByLabel[label];
  if (!replay) {
    const imageExists = job.images?.some((img) => img.label === label);
    const message = imageExists
      ? "La détection de survol n'est disponible qu'en mode « par écrans »."
      : "Écran introuvable pour cette génération.";
    return NextResponse.json({ error: message }, { status: imageExists ? 400 : 404 });
  }

  const deviceId = label.split("-")[0];
  const device = job.sourceContext.devices.find((d) => d.label === deviceId);
  if (!device) {
    return NextResponse.json({ error: "Device introuvable pour cette génération." }, { status: 404 });
  }

  try {
    const browser = await getSharedBrowser();
    const elements = await listHoverableElements(browser, {
      url: job.sourceContext.url,
      device,
      replay,
      httpCredentials: job.sourceContext.httpCredentials,
    });

    return NextResponse.json({ elements });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur inconnue.";
    return NextResponse.json({ error: `Analyse impossible : ${message}` }, { status: 500 });
  }
}
