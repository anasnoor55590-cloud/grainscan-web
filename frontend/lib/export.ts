import type { AnalyzeResponse, ViewMode } from "./types";
import { HEX, download, grainKey } from "./utils";

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

/** Draws the grain polygons onto the photo and downloads it as a JPEG. */
export async function exportAnnotated(url: string, data: AnalyzeResponse, mode: ViewMode, hidden: Set<string>) {
  const img = await loadImage(url);
  const { w, h } = data.image;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.drawImage(img, 0, 0, w, h);
  for (const g of data.grains) {
    const key = grainKey(g, mode);
    if (hidden.has(key)) continue;
    ctx.beginPath();
    g.poly.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
    ctx.globalAlpha = 0.45;
    ctx.fillStyle = HEX[key] ?? HEX.standard;
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.lineWidth = 2;
    ctx.strokeStyle = HEX[key] ?? HEX.standard;
    ctx.stroke();
  }
  canvas.toBlob((b) => b && download("grainscan-result.jpg", b), "image/jpeg", 0.92);
}
