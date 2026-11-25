import type { AnalyzeResponse, ServerInfo } from "./types";

export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:7860").replace(/\/+$/, "");
export const MAX_MB = Number(process.env.NEXT_PUBLIC_MAX_MB ?? "15");

export class ApiError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.status = status;
  }
}

export async function getInfo(signal?: AbortSignal): Promise<ServerInfo> {
  const r = await fetch(`${API_URL}/api/info`, { signal, cache: "no-store" });
  if (!r.ok) throw new ApiError(`Server responded ${r.status}`, r.status);
  return r.json();
}

const FRIENDLY: Record<number, string> = {
  400: "This file could not be read as an image. Please upload a JPG, PNG or WebP photo.",
  413: "This image is too large. Please use a smaller photo.",
  429: "Too many requests. Please wait a minute and try again.",
  503: "The analysis server is starting up. Please try again in a moment.",
};

export async function analyzeImage(file: File, signal?: AbortSignal): Promise<AnalyzeResponse> {
  const body = new FormData();
  body.append("file", file);
  let r: Response;
  try {
    r = await fetch(`${API_URL}/api/analyze`, { method: "POST", body, signal });
  } catch (e) {
    if ((e as Error).name === "AbortError") throw e;
    throw new ApiError("Could not reach the analysis server. It may still be waking up.");
  }
  if (!r.ok) {
    let detail = "";
    try {
      const j = await r.json();
      if (typeof j.detail === "string") detail = j.detail;
    } catch {
      /* ignore */
    }
    throw new ApiError(detail || FRIENDLY[r.status] || `Server error (${r.status}).`, r.status);
  }
  return r.json();
}
