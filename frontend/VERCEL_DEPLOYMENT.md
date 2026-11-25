# GrainScan frontend deployment (Vercel + Hugging Face)

## Vercel project settings

- Framework preset: Next.js
- Root directory: `frontend`
- Build command: `npm run build`
- Install command: `npm install`
- Output directory: leave default
- Node.js: `20.x`

## Environment variables

Set these in Vercel → Project → Settings → Environment Variables:

```env
NEXT_PUBLIC_HF_SPACE_ID=prome21/grainscan-api
NEXT_PUBLIC_MAX_MB=15
```

Optional override (server-side only; not required if HF_SPACE_ID is set):

```env
NEXT_PUBLIC_API_URL=https://prome21-grainscan-api.hf.space
```

Do **not** put `HF_TOKEN` in any `NEXT_PUBLIC_` variable.

After changing variables, redeploy.

## Architecture (important)

The browser talks **only** to your Vercel domain:

- `GET  /api/info`     → Next.js route → proxies to HF Space `/api/info`
- `POST /api/analyze`  → Next.js route → proxies FormData to HF Space `/api/analyze`

This avoids Hugging Face’s “Cross-site POST form submissions are forbidden” (403) block that applies to direct browser POSTs to `*.hf.space`.

## Hugging Face API contract

The Space must expose:

- `GET  /api/info`  → `ServerInfo` JSON
- `POST /api/analyze` (multipart `file`) → `AnalyzeResponse` JSON

## Troubleshooting

1. Confirm Root Directory is `frontend`.
2. Confirm build reaches `Running \`npm run build\``.
3. Confirm `NEXT_PUBLIC_HF_SPACE_ID` is `owner/space-name`.
4. Confirm the Space is public and the FastAPI routes are live.
5. In browser Network tab, the analyze request must go to **your** domain `/api/analyze`, not to `*.hf.space`.
