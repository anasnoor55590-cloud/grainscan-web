import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function resolveBackendUrl(): string {
  const explicit = (process.env.NEXT_PUBLIC_API_URL ?? process.env.API_URL ?? "").trim();
  if (explicit) return explicit.replace(/\/+$/, "");

  const spaceId = (process.env.NEXT_PUBLIC_HF_SPACE_ID ?? process.env.HF_SPACE_ID ?? "").trim();
  if (spaceId) {
    return `https://${spaceId.replace(/\//g, "-")}.hf.space`;
  }

  return "https://prome21-grainscan-api.hf.space";
}

const BACKEND = resolveBackendUrl();

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json(
        { detail: "Missing or invalid 'file' field." },
        { status: 400 }
      );
    }

    const upstream = new FormData();
    // Preserve original filename when available (File has name; Blob may not)
    const filename =
      typeof (file as File).name === "string" && (file as File).name
        ? (file as File).name
        : "upload.jpg";
    upstream.append("file", file, filename);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 55_000);

    let res: Response;
    try {
      res = await fetch(`${BACKEND}/api/analyze`, {
        method: "POST",
        body: upstream,
        signal: controller.signal,
        // Do not forward browser Origin / cookies — this is server-to-server
        cache: "no-store",
      });
    } finally {
      clearTimeout(timeout);
    }

    const contentType = res.headers.get("content-type") || "application/json";
    const body = await res.arrayBuffer();

    return new NextResponse(body, {
      status: res.status,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    const message =
      err instanceof Error && err.name === "AbortError"
        ? "Analysis timed out. The backend may be starting up — please try again."
        : "Could not reach the analysis server. It may still be waking up.";
    return NextResponse.json({ detail: message }, { status: 503 });
  }
}
