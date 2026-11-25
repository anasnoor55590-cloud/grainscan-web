import { Client, handle_file } from "@gradio/client";
import type { AnalyzeResponse } from "./types";

/** Hugging Face Space ID, not the .hf.space URL. */
export const HF_SPACE_ID = (process.env.NEXT_PUBLIC_HF_SPACE_ID ?? "").trim();
export const MAX_MB = Number(process.env.NEXT_PUBLIC_MAX_MB ?? "15");

export class ApiError extends Error {
  retryable: boolean;
  constructor(message: string, retryable = false) {
    super(message);
    this.name = "ApiError";
    this.retryable = retryable;
  }
}

let clientPromise: ReturnType<typeof Client.connect> | null = null;

async function getClient() {
  if (!HF_SPACE_ID) {
    throw new ApiError(
      "Hugging Face Space is not configured. Set NEXT_PUBLIC_HF_SPACE_ID in Vercel and redeploy."
    );
  }

  if (!clientPromise) clientPromise = Client.connect(HF_SPACE_ID);
  try {
    return await clientPromise;
  } catch (error) {
    clientPromise = null;
    const message = error instanceof Error ? error.message : String(error);
    throw new ApiError(
      `Could not connect to Hugging Face Space (${HF_SPACE_ID}). ${message}`,
      isTemporarySpaceError(message)
    );
  }
}

function isTemporarySpaceError(message: string) {
  return /sleep|starting|waking|loading|temporar|unavailable|502|503|504|network|fetch failed|timeout|connect/i.test(message);
}

function isAnalyzeResponse(value: unknown): value is AnalyzeResponse {
  if (!value || typeof value !== "object") return false;
  const data = value as Partial<AnalyzeResponse>;
  return Boolean(
    data.image && data.summary && Array.isArray(data.grains) &&
    Array.isArray(data.warnings) && data.timings_ms && data.grade_thresholds
  );
}

export async function analyzeImage(file: File, signal?: AbortSignal): Promise<AnalyzeResponse> {
  if (signal?.aborted) throw new DOMException("Request aborted", "AbortError");
  if (file.size > MAX_MB * 1024 * 1024) {
    throw new ApiError(`This image is larger than ${MAX_MB} MB. Please choose a smaller image.`);
  }

  try {
    const client = await getClient();
    if (signal?.aborted) throw new DOMException("Request aborted", "AbortError");

    // The browser uploads the File directly to Gradio. Vercel does not proxy the image.
    const prediction = client.predict("/analyze", [handle_file(file)]);
    let result;
    if (signal) {
      let abortHandler: (() => void) | undefined;
      try {
        result = await Promise.race([
          prediction,
          new Promise<never>((_, reject) => {
            abortHandler = () => reject(new DOMException("Request aborted", "AbortError"));
            signal.addEventListener("abort", abortHandler, { once: true });
          }),
        ]);
      } finally {
        if (abortHandler) signal.removeEventListener("abort", abortHandler);
      }
    } else {
      result = await prediction;
    }

    const payload = result.data?.[0];
    if (!isAnalyzeResponse(payload)) {
      throw new ApiError(
        "Hugging Face returned an unexpected response. Check that the Space endpoint /analyze returns the complete GrainScan JSON."
      );
    }
    return payload;
  } catch (error) {
    if ((error as Error).name === "AbortError") throw error;
    if (error instanceof ApiError) throw error;

    const message = error instanceof Error ? error.message : String(error);
    if (/quota|daily limit|gpu time|zerogpu.*limit|exceeded.*gpu/i.test(message)) {
      throw new ApiError(`Hugging Face ZeroGPU daily GPU quota may be exhausted. ${message}`);
    }
    if (/queue|busy|pending|rank/i.test(message)) {
      throw new ApiError(`Your request is waiting for Hugging Face ZeroGPU. ${message}`, true);
    }
    throw new ApiError(
      `GrainScan could not complete the analysis. Check that the HF Space is running and its /analyze endpoint works. ${message}`,
      isTemporarySpaceError(message)
    );
  }
}
