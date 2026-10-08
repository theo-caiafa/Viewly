import { NextRequest, NextResponse } from "next/server";
import {
  MEDIA_MAX_FILES,
  MEDIA_MAX_FILE_BYTES,
  type MediaDeviceId,
  assignMediaLabels,
  isAcceptedMediaMimeType,
  isMediaDeviceId,
  normalizeMediaImage,
} from "@/lib/import/media";
import { createJob, updateJob } from "@/lib/jobs";
import type { JobImage } from "@/lib/jobs";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Corps de requête invalide." }, { status: 400 });
  }

  const files = formData.getAll("file");
  const deviceChoices = formData.getAll("device");

  if (files.length === 0) {
    return NextResponse.json({ error: "Aucun fichier à importer." }, { status: 400 });
  }
  if (files.length > MEDIA_MAX_FILES) {
    return NextResponse.json({ error: `Maximum ${MEDIA_MAX_FILES} fichiers par import.` }, { status: 400 });
  }
  if (files.length !== deviceChoices.length) {
    return NextResponse.json({ error: "Chaque fichier doit avoir un device associé." }, { status: 400 });
  }

  const deviceIds: MediaDeviceId[] = [];
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const device = deviceChoices[i];

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Fichier invalide." }, { status: 400 });
    }
    if (!isAcceptedMediaMimeType(file.type)) {
      return NextResponse.json({ error: `Format non supporté : ${file.name}.` }, { status: 400 });
    }
    if (file.size > MEDIA_MAX_FILE_BYTES) {
      return NextResponse.json({ error: `Fichier trop volumineux : ${file.name}.` }, { status: 400 });
    }
    if (typeof device !== "string" || !isMediaDeviceId(device)) {
      return NextResponse.json({ error: `Device invalide pour ${file.name}.` }, { status: 400 });
    }
    deviceIds.push(device);
  }

  const job = createJob();

  try {
    const labels = assignMediaLabels(deviceIds);
    const images: JobImage[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i] as File;
      const buffer = Buffer.from(await file.arrayBuffer());
      const normalized = await normalizeMediaImage(buffer);
      images.push({
        label: labels[i],
        dataUrl: `data:image/png;base64,${normalized.pngBuffer.toString("base64")}`,
        width: normalized.width,
        height: normalized.height,
      });
    }

    // No sourceContext: there's no live site behind an imported image, so
    // the video/hoverable routes (which require it) stay unavailable for
    // these jobs — same guard that already protects "vue complète" jobs.
    updateJob(job.id, { status: "done", images });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur inconnue.";
    updateJob(job.id, { status: "error", error: `Import impossible : ${message}` });
  }

  return NextResponse.json({ jobId: job.id });
}
