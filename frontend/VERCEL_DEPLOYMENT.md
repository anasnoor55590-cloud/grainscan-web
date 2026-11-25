# GrainScan frontend deployment (Vercel + Hugging Face Gradio)

## Vercel project settings

- Framework preset: Next.js
- Root directory: `frontend`
- Build command: `npm run build`
- Install command: `npm install`
- Node.js: `20.x` (or any >= 18)

## Environment variables

```env
NEXT_PUBLIC_HF_SPACE_ID=prome21/grainscan-api
NEXT_PUBLIC_MAX_MB=15
```

## Architecture

Browser → Vercel same-origin routes only:

| Client request | Server proxy does |
|----------------|-------------------|
| `GET  /api/info` | Probe `GET {HF}/gradio_api/info` → `ServerInfo` |
| `POST /api/analyze` (FormData) | 1. Upload to `{HF}/gradio_api/upload`<br>2. Call `{HF}/gradio_api/call/analyze`<br>3. Poll SSE for result |

HF Spaces block browser (and some form) POSTs to non-Gradio paths. Gradio API endpoints work from the server.

## Troubleshooting

1. Network tab: analyze request must hit **your** domain `/api/analyze` (200).
2. If 502/503: Space may be cold-starting (ZeroGPU) — wait and retry.
3. Confirm Space shows Gradio UI and named endpoint `/analyze` under Use via API.
