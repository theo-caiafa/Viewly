import { NextRequest, NextResponse } from "next/server";
import { getJob, requestCancel } from "@/lib/jobs";

export const runtime = "nodejs";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const job = getJob(id);
  if (!job) {
    return NextResponse.json({ error: "Génération introuvable ou expirée." }, { status: 404 });
  }

  // sourceContext carries httpCredentials and internal replay recipes —
  // server-only, never sent to the client. Its presence/absence tells the
  // client whether this job has a live site to re-navigate to (e.g.
  // imported media doesn't), which is what gates the video capture button.
  const { sourceContext, ...publicJob } = job;
  return NextResponse.json({ ...publicJob, hasSourceContext: !!sourceContext });
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ok = requestCancel(id);
  if (!ok) {
    return NextResponse.json({ error: "Génération introuvable ou expirée." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
