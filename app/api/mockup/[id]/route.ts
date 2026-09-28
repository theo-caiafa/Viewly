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
  // server-only, never sent to the client.
  const { sourceContext: _sourceContext, ...publicJob } = job;
  return NextResponse.json(publicJob);
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ok = requestCancel(id);
  if (!ok) {
    return NextResponse.json({ error: "Génération introuvable ou expirée." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
