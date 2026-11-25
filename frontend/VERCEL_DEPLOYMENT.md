# GrainScan frontend — Vercel + Hugging Face ZeroGPU

## Vercel project settings

- Framework preset: **Next.js**
- Root Directory: **frontend** (enable the option to include files outside the root directory only if your project setup requires it; this frontend does not need backend files)
- Install command: `npm install`
- Build command: `npm run build`
- Output directory: leave the Next.js default
- Node.js: 20.x or newer (18.18+ is required by the Gradio JS client)

## Environment variables

Add these in Vercel → Project → Settings → Environment Variables:

```env
NEXT_PUBLIC_HF_SPACE_ID=YOUR_HF_USERNAME/YOUR_SPACE_NAME
NEXT_PUBLIC_MAX_MB=15
```

Use the Space ID (`owner/space-name`), not `https://owner-space-name.hf.space`.
Do not add `HF_TOKEN` to Vercel. The browser must never receive your private Hugging Face token.

Apply the variables to Production (and Preview/Development if you use those environments), then redeploy.

## Local run

```bash
cd frontend
cp .env.example .env.local
# Edit .env.local and set your actual Space ID
npm install
npm run dev
```

## Required Hugging Face Space API contract

The Space must be public and expose a named Gradio endpoint `/analyze` with:

- Input: one `gr.File(type="filepath")`
- Output: one `gr.JSON`
- The function must return the full GrainScan response object, including `image`, `summary`, `warnings`, `timings_ms`, `grade_thresholds`, and `grains`.

The frontend calls the Space using `@gradio/client` and uploads the selected browser file directly to Hugging Face. Vercel does not proxy the image upload.

## Common deployment mistakes

1. Setting Vercel Root Directory to the repository root instead of `frontend`.
2. Setting `NEXT_PUBLIC_API_URL` (the old FastAPI variable) instead of `NEXT_PUBLIC_HF_SPACE_ID`.
3. Entering the full `.hf.space` URL instead of `owner/space-name`.
4. Forgetting to redeploy after changing `NEXT_PUBLIC_*` variables.
5. Making the Space private without implementing authenticated client access. This frontend assumes a public Space; do not put a read token in a `NEXT_PUBLIC_*` variable.
6. The Space's Gradio endpoint is named differently from `/analyze` or returns a different output shape.

The header indicator means the Space ID is configured; it does not claim that the Space is currently awake. Actual connectivity is tested when the user starts a scan.
