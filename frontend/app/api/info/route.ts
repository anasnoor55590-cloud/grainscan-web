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

function authHeaders(): HeadersInit {
  const token = (process.env.HF_TOKEN ?? process.env.HUGGING_FACE_HUB_TOKEN ?? "").trim();
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

/**
 * Gradio Space has no /api/info. We probe /gradio_api/info and synthesize ServerInfo.
 */
export async function GET(_req: NextRequest) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12_000);

    let res: Response;
    try {
      res = await fetch(`${BACKEND}/gradio_api/info`, {
        method: "GET",
        headers: authHeaders(),
        signal: controller.signal,
        cache: "no-store",
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!res.ok) {
      return NextResponse.json(
        {
          ready: false,
          error: `Backend responded ${res.status}`,
          model_version: null,
          device: null,
          max_upload_mb: 15,
        },
        { status: 200, headers: { "Cache-Control": "no-store" } }
      );
    }

    const info = await res.json();
    const hasAnalyze =
      info &&
      typeof info === "object" &&
      info.named_endpoints &&
      "/analyze" in info.named_endpoints;

    return NextResponse.json(
      {
        ready: Boolean(hasAnalyze),
        error: hasAnalyze ? null : "Analyze endpoint not found on Gradio Space",
        model_version: hasAnalyze ? "zerogpu-models" : null,
        device: "zerogpu",
        max_upload_mb: 15,
      },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
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
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  }
}
