import { NextRequest, NextResponse } from "next/server";
import { getJob } from "@/lib/jobs";
import { buildZip } from "@/lib/zip";
import { convertImage, exportFilename, EXPORT_MIME_TYPES, type ExportFormat } from "@/lib/imageFormat";

export const runtime = "nodejs";

const VALID_FORMATS: ExportFormat[] = ["png", "webp", "pdf"];

interface RequestBody {
  format?: unknown;
  label?: unknown;
}

function pngBufferFromDataUrl(dataUrl: string): Buffer {
  const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
  return Buffer.from(base64, "base64");
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const job = getJob(id);
  if (!job) {
    return NextResponse.json({ error: "Génération introuvable ou expirée." }, { status: 404 });
  }
  if (!job.images || !job.sourceContext) {
    return NextResponse.json({ error: "Aucun mockup disponible pour cette génération." }, { status: 410 });
  }

  let body: RequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps de requête invalide." }, { status: 400 });
  }

  const { format, label } = body;
  if (typeof format !== "string" || !VALID_FORMATS.includes(format as ExportFormat)) {
    return NextResponse.json({ error: "Format d'export invalide." }, { status: 400 });
  }
  const resolvedFormat = format as ExportFormat;

  if (label !== undefined) {
    if (typeof label !== "string") {
      return NextResponse.json({ error: "Écran invalide." }, { status: 400 });
    }
    const image = job.images.find((img) => img.label === label);
    if (!image) {
      return NextResponse.json({ error: "Écran introuvable pour cette génération." }, { status: 404 });
    }

    try {
      const converted = await convertImage(pngBufferFromDataUrl(image.dataUrl), resolvedFormat);
      const mime = EXPORT_MIME_TYPES[resolvedFormat];
      return NextResponse.json({
        dataUrl: `data:${mime};base64,${converted.toString("base64")}`,
        filename: exportFilename(`${job.sourceContext.slug}-${label}`, resolvedFormat),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erreur inconnue.";
      return NextResponse.json({ error: `Export impossible : ${message}` }, { status: 500 });
    }
  }

  try {
    const zip = await buildZip(
      job.images.map((image) => ({ label: image.label, pngBuffer: pngBufferFromDataUrl(image.dataUrl) })),
      job.sourceContext.slug,
      resolvedFormat,
    );
    return NextResponse.json({
      dataUrl: `data:application/zip;base64,${zip.toString("base64")}`,
      filename: `${job.sourceContext.slug}-mockups.zip`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur inconnue.";
    return NextResponse.json({ error: `Export impossible : ${message}` }, { status: 500 });
  }
}
