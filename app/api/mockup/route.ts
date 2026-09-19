import { NextRequest, NextResponse } from "next/server";
import { captureMockups } from "@/lib/capture";
import { buildZip } from "@/lib/zip";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  let url: unknown;
  try {
    const body = await request.json();
    url = body.url;
  } catch {
    return NextResponse.json({ error: "Corps de requête invalide." }, { status: 400 });
  }

  if (typeof url !== "string" || url.trim().length === 0) {
    return NextResponse.json({ error: "Merci de fournir une URL." }, { status: 400 });
  }

  try {
    const images = await captureMockups(url);
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
