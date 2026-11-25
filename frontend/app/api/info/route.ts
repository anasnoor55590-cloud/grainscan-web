import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

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

export async function GET(_req: NextRequest) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12_000);

    let res: Response;
    try {
      res = await fetch(`${BACKEND}/api/info`, {
        method: "GET",
        signal: controller.signal,
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
        ? "Backend info request timed out."
        : "Could not reach the analysis server.";
    return NextResponse.json(
      {
        ready: false,
        error: message,
        model_version: null,
        device: null,
        max_upload_mb: 15,
      },
      { status: 503 }
    );
  }
}
