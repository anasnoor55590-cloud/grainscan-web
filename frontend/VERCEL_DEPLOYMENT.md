# GrainScan frontend deployment (Vercel + Hugging Face Gradio)

## Vercel project settings

- Framework preset: Next.js
- Root directory: `frontend`
- Build command: `npm run build`
- Install command: `npm install`
- Node.js: `20.x` (or any >= 18)

## Environment variables

**Required / recommended:**

```env
NEXT_PUBLIC_HF_SPACE_ID=prome21/grainscan-api
NEXT_PUBLIC_MAX_MB=15
```

**For higher ZeroGPU quota (recommended):**

```env
HF_TOKEN=hf_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

- Create token: https://huggingface.co/settings/tokens (read access is enough)
- Add in Vercel → Project → Settings → Environment Variables
- **Do NOT** use `NEXT_PUBLIC_HF_TOKEN` — token must stay server-only
- After adding, **Redeploy**

## Architecture

Browser → Vercel same-origin only:

| Client | Server proxy |
|--------|----------------|
| `GET  /api/info` | Probe Gradio `/gradio_api/info` (+ optional Bearer token) |
| `POST /api/analyze` | Upload → call → poll Gradio API (+ optional Bearer token) |

## ZeroGPU quota

Free/anonymous ZeroGPU has a daily time limit. If you see "ZeroGPU quota exceeded":

1. Set `HF_TOKEN` (logged-in quota is higher), or
2. Wait for daily reset (~24h), or
3. Upgrade to HF Pro for much larger quota.

## Troubleshooting

1. Network tab: `/api/analyze` must hit **your** domain and return 200.
2. 429 + quota message → set `HF_TOKEN` and redeploy.
3. 503 → Space cold-starting; retry after a minute.
