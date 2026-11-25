# GrainScan frontend deployment (Vercel + Hugging Face ZeroGPU)

## Vercel project settings

- Framework preset: Next.js
- Root directory: `frontend`
- Build command: `npm run build`
- Install command: `npm install`
- Output directory: leave default
- Node.js: `20.x`

## Environment variables

Set these in Vercel → Project → Settings → Environment Variables (Production, Preview, and Development as needed):

```env
NEXT_PUBLIC_HF_SPACE_ID=YOUR_HF_USERNAME/YOUR_SPACE_NAME
NEXT_PUBLIC_MAX_MB=15
```

Use `owner/space-name`, not the `.hf.space` URL. Do not put `HF_TOKEN` in Vercel or any `NEXT_PUBLIC_` variable. The browser calls a public Gradio Space.

After changing variables, redeploy.

## Hugging Face API contract

The Space must expose the named Gradio endpoint `/analyze`, accept one image file, and return one JSON object matching `AnalyzeResponse` (`image`, `summary`, `grains`, `warnings`, `timings_ms`, and `grade_thresholds`).

## Troubleshooting

1. Confirm Root Directory is `frontend`.
2. Confirm the build logs reach `Running \`npm run build\``. If they stop after dependency installation, copy the complete end of the log; that is not enough information to identify a TypeScript error.
3. Confirm `NEXT_PUBLIC_HF_SPACE_ID` is exactly `owner/space-name`.
4. Confirm the Space is public and `/analyze` appears in its Use via API panel.
5. Do not use the old `NEXT_PUBLIC_API_URL` variable.
