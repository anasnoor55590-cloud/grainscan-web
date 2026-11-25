import type { AnalyzeResponse, ServerInfo } from "./types";
export const API_URL = ""; // same-origin; paths are /api/info and /api/analyze
export const HF_SPACE_ID = (process.env.NEXT_PUBLIC_HF_SPACE_ID ?? "prome21/grainscan-api").trim();
export const MAX_MB = Number(process.env.NEXT_PUBLIC_MAX_MB ?? "15");

export class ApiError extends Error {
  status?: number;
  retryable: boolean;
  constructor(message: string, status?: number, retryable = false) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.retryable = retryable;
  }
}

function isTemporaryStatus(status?: number): boolean {
  return status === undefined || status === 502 || status === 503 || status === 504;
}

function isAnalyzeResponse(value: unknown): value is AnalyzeResponse {
  if (!value || typeof value !== "object") return false;
  const data = value as Partial<AnalyzeResponse>;
  return Boolean(
    data.image &&
      data.summary &&
      Array.isArray(data.grains) &&
      Array.isArray(data.warnings) &&
      data.timings_ms &&
      data.grade_thresholds
  );
}

export async function getInfo(signal?: AbortSignal): Promise<ServerInfo> {
  const r = await fetch(`/api/info`, { signal, cache: "no-store" });
  if (!r.ok) {
    throw new ApiError(`Server responded ${r.status}`, r.status, isTemporaryStatus(r.status));
  }
  return r.json();
}

const FRIENDLY: Record<number, string> = {
  400: "This file could not be read as an image. Please upload a JPG, PNG or WebP photo.",
  405: "Endpoint method mismatch (HTTP 405). Verify the backend /api/analyze POST route is active.",
  413: "This image is too large. Please use a smaller photo.",
  429: "Too many requests. Please wait a minute and try again.",
  503: "The analysis server is starting up. Please try again in a moment.",
};

export async function analyzeImage(file: File, signal?: AbortSignal): Promise<AnalyzeResponse> {
  if (signal?.aborted) throw new DOMException("Request aborted", "AbortError");
  if (file.size > MAX_MB * 1024 * 1024) {
    throw new ApiError(`This image is larger than ${MAX_MB} MB. Please choose a smaller image.`);
  }

  const body = new FormData();
  body.append("file", file);

  let r: Response;
  try {
    // Same-origin proxy — browser never posts directly to *.hf.space
    r = await fetch(`/api/analyze`, {
      method: "POST",
      body,
      signal,
    });
  } catch (e) {
    if ((e as Error).name === "AbortError") throw e;
    throw new ApiError(
      "Could not reach the analysis server. It may still be waking up.",
      undefined,
      true
    );
  }

  if (!r.ok) {
    let detail = "";
    try {
      const j = await r.json();
      if (typeof j.detail === "string") detail = j.detail;
    } catch {
      /* ignore non-JSON body */
    }
    throw new ApiError(
      detail || FRIENDLY[r.status] || `Server error (${r.status}).`,
      r.status,
      isTemporaryStatus(r.status)
    );
  }

  const payload = await r.json();
  if (!isAnalyzeResponse(payload)) {
    throw new ApiError(
      "Backend returned an unexpected response format from /api/analyze."
    );
  }

  return payload;
}
