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

/** Server-only HF token — never expose as NEXT_PUBLIC_* */
function authHeaders(): HeadersInit {
  const token = (process.env.HF_TOKEN ?? process.env.HUGGING_FACE_HUB_TOKEN ?? "").trim();
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

/**
 * Gradio 4+ flow (HF Space is Gradio, not raw FastAPI):
 * 1) POST file  → /gradio_api/upload  → [serverPath]
 * 2) POST JSON  → /gradio_api/call/analyze  → { event_id }
 * 3) GET SSE    → /gradio_api/call/analyze/{event_id}  → event: complete + data
 */
async function uploadFile(file: Blob, filename: string): Promise<string> {
  const form = new FormData();
  form.append("files", file, filename);

  const res = await fetch(`${BACKEND}/gradio_api/upload`, {
    method: "POST",
    body: form,
    headers: authHeaders(),
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Upload failed (${res.status}): ${text.slice(0, 200)}`);
  }

  const paths = (await res.json()) as string[];
  if (!Array.isArray(paths) || !paths[0]) {
    throw new Error("Upload returned no file path.");
  }
  return paths[0];
}

async function callAnalyze(serverPath: string): Promise<string> {
  const res = await fetch(`${BACKEND}/gradio_api/call/analyze`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify({
      data: [
        {
          path: serverPath,
          meta: { _type: "gradio.FileData" },
        },
      ],
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Call analyze failed (${res.status}): ${text.slice(0, 200)}`);
  }

  const json = (await res.json()) as { event_id?: string };
  if (!json.event_id) {
    throw new Error("No event_id returned from Gradio call.");
  }
  return json.event_id;
}

function friendlyError(raw: string): string {
  // ZeroGPU quota exceeded (common on free Spaces)
  if (/ZeroGPU quota|exceeded your ZeroGPU/i.test(raw)) {
    return (
      "ZeroGPU quota exceeded for today. " +
      "Wait for the daily reset, or set HF_TOKEN in Vercel (Hugging Face token) for higher quota. " +
      "Create a token at https://huggingface.co/settings/tokens"
    );
  }
  if (/timed out|AbortError/i.test(raw)) {
    return "Analysis timed out. The backend may be starting up — please try again.";
  }
  return raw.slice(0, 400);
}

async function pollResult(eventId: string, timeoutMs = 50_000): Promise<unknown> {
  const url = `${BACKEND}/gradio_api/call/analyze/${eventId}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "text/event-stream",
        ...authHeaders(),
      },
      signal: controller.signal,
      cache: "no-store",
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Poll failed (${res.status}): ${text.slice(0, 200)}`);
    }

    const text = await res.text();
    // SSE lines: event: complete\ndata: [...]
    const lines = text.split(/\r?\n/);
    let lastData: string | null = null;
    let lastEvent = "";

    for (const line of lines) {
      if (line.startsWith("event:")) {
        lastEvent = line.slice(6).trim();
      } else if (line.startsWith("data:")) {
        lastData = line.slice(5).trim();
      }
    }

    if (!lastData) {
      throw new Error("No data received from Gradio SSE stream.");
    }

    if (lastEvent === "error") {
      throw new Error(friendlyError(lastData));
    }

    const parsed = JSON.parse(lastData);
    // Gradio sometimes returns error objects inside the data array
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed) && parsed.error) {
      throw new Error(friendlyError(typeof parsed.error === "string" ? parsed.error : JSON.stringify(parsed)));
    }
    if (Array.isArray(parsed)) {
      const first = parsed[0];
      if (first && typeof first === "object" && first.error) {
        throw new Error(friendlyError(typeof first.error === "string" ? first.error : JSON.stringify(first)));
      }
      return first;
    }
    return parsed;
  } finally {
    clearTimeout(timer);
  }
}

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

    const filename =
      typeof (file as File).name === "string" && (file as File).name
        ? (file as File).name
        : "upload.jpg";

    const serverPath = await uploadFile(file, filename);
    const eventId = await callAnalyze(serverPath);
    const result = await pollResult(eventId);

    return NextResponse.json(result, {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    const raw =
      err instanceof Error
        ? err.name === "AbortError"
          ? "Analysis timed out. The backend may be starting up — please try again."
          : err.message
        : "Could not reach the analysis server.";

    const message = friendlyError(raw);
    const isQuota = /ZeroGPU quota/i.test(message);
    const status = isQuota ? 429 : /timed out|starting up/i.test(message) ? 503 : 502;

    return NextResponse.json({ detail: message }, { status });
  }
}
