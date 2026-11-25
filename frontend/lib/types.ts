export type Status = "broken" | "standard";
export type ViewMode = "variety" | "quality";

export interface Grain {
  id: number;
  status: Status;
  variety: string | null;
  bs_conf: number;
  var_conf: number | null;
  length_px: number;
  width_px: number;
  edge: boolean;
  low: boolean;
  det_conf: number;
  poly: number[][];
  thumb: string; // base64 JPEG
}

export interface Summary {
  total: number;
  broken: number;
  standard: number;
  kainat: number;
  supri: number;
  edge: number;
  edge_broken: number;
  low: number;
  broken_pct: number;
  std_pct: number;
  broken_pct_inner: number | null;
  kainat_pct: number;
  supri_pct: number;
  dominant: string | null;
  dominant_share: number;
  grade: "A" | "B" | "C";
}

export interface Warning {
  code: string;
  message: string;
}

export interface AnalyzeResponse {
  request_id: string;
  model_version: string;
  image: { orig_w: number; orig_h: number; w: number; h: number };
  summary: Summary;
  warnings: Warning[];
  reliable: boolean;
  timings_ms: Record<string, number>;
  grade_thresholds: { a_max: number; b_max: number; note: string };
  review_conf: number;
  grains: Grain[];
}

export interface ServerInfo {
  ready: boolean;
  error: string | null;
  model_version: string | null;
  device: string | null;
  max_upload_mb: number;
}

export interface HistoryEntry {
  id: string;
  ts: string;
  file: string;
  total: number;
  broken: number;
  broken_pct: number;
  grade: string;
  dominant: string | null;
  kainat: number;
  supri: number;
  low: number;
}
