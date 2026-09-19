import { NextRequest, NextResponse } from "next/server";
import { captureMockups, type CaptureMode, type CaptureQuality } from "@/lib/capture";
import { buildZip } from "@/lib/zip";

export const runtime = "nodejs";
export const maxDuration = 180;

const VALID_MODES: CaptureMode[] = ["full", "sections"];
const VALID_QUALITIES: CaptureQuality[] = ["standard", "high"];

export async function POST(request: NextRequest) {
  let body: { url?: unknown; mode?: unknown; quality?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps de requête invalide." }, { status: 400 });
  }

  const { url, mode, quality } = body;

  if (typeof url !== "string" || url.trim().length === 0) {
    return NextResponse.json({ error: "Merci de fournir une URL." }, { status: 400 });
  }

  if (mode !== undefined && !VALID_MODES.includes(mode as CaptureMode)) {
    return NextResponse.json({ error: "Mode de capture invalide." }, { status: 400 });
  }

  if (quality !== undefined && !VALID_QUALITIES.includes(quality as CaptureQuality)) {
    return NextResponse.json({ error: "Niveau de qualité invalide." }, { status: 400 });
  }

  try {
    const images = await captureMockups(url, {
      mode: mode as CaptureMode | undefined,
      quality: quality as CaptureQuality | undefined,
    });
    const zip = await buildZip(images);

    return NextResponse.json({
      images: images.map((image) => ({
        label: image.label,
        dataUrl: `data:image/png;base64,${image.buffer.toString("base64")}`,
      })),
      zipDataUrl: `data:application/zip;base64,${zip.toString("base64")}`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur inconnue.";
    return NextResponse.json(
      { error: `Impossible de générer les mockups : ${message}` },
      { status: 502 },
    );
  }
}
