import type { Grain, HistoryEntry, ViewMode } from "./types";

export const HEX: Record<string, string> = {
  broken: "#dc2626",
  standard: "#16a34a",
  "Kainat 1509": "#ca8a04",
  "Supri 86": "#2563eb",
};

export function grainKey(g: Grain, mode: ViewMode): string {
  if (g.status === "broken") return "broken";
  return mode === "variety" ? g.variety ?? "standard" : "standard";
}

export function grainConf(g: Grain): number {
  return g.status === "broken" ? g.bs_conf : Math.min(g.bs_conf, g.var_conf ?? 1);
}

export function download(name: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function grainsToCsv(grains: Grain[]): string {
  const head = [
    "id",
    "status",
    "variety",
    "stage1_conf",
    "variety_conf",
    "length_px",
    "width_px",
    "aspect",
    "touches_border",
    "needs_review",
    "detection_conf",
  ];
  const rows = grains.map((g) =>
    [
      g.id,
      g.status,
      g.variety ?? "",
      g.bs_conf,
      g.var_conf ?? "",
      g.length_px,
      g.width_px,
      (g.length_px / Math.max(g.width_px, 1)).toFixed(2),
      g.edge,
      g.low,
      g.det_conf,
    ].join(","),
  );
  return [head.join(","), ...rows].join("\n");
}

const HKEY = "grainscan:history:v1";

export function loadHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(HKEY);
    return raw ? (JSON.parse(raw) as HistoryEntry[]) : [];
  } catch {
    return [];
  }
}

export function saveHistory(list: HistoryEntry[]) {
  try {
    localStorage.setItem(HKEY, JSON.stringify(list.slice(-50)));
  } catch {
    /* storage may be unavailable (private mode) */
  }
}
