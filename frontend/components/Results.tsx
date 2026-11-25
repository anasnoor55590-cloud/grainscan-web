"use client";
import { useState } from "react";
import type { AnalyzeResponse, ViewMode } from "@/lib/types";
import { HEX, download, grainConf, grainsToCsv } from "@/lib/utils";
import { exportAnnotated } from "@/lib/export";
import AnnotatedView from "./AnnotatedView";
import Gallery from "./Gallery";

type Tab = "image" | "gallery" | "data" | "perf";

function Donut({ parts, center, sub }: { parts: { pct: number; color: string }[]; center: string; sub: string }) {
  const r = 54;
  const c = 2 * Math.PI * r;
  let off = 0;
  return (
    <svg width="150" height="150" viewBox="0 0 150 150" role="img" aria-label={`${center} ${sub}`}>
      <circle cx="75" cy="75" r={r} fill="none" stroke="var(--surface-2)" strokeWidth="18" />
      {parts.map((p, i) => {
        const len = (c * Math.max(0, Math.min(100, p.pct))) / 100;
        const el = (
          <circle key={i} cx="75" cy="75" r={r} fill="none" stroke={p.color} strokeWidth="18"
            strokeDasharray={`${len} ${c - len}`} strokeDashoffset={-off} transform="rotate(-90 75 75)" />
        );
        off += len;
        return el;
      })}
      <text x="75" y="72" textAnchor="middle" dominantBaseline="central" fontSize="27" fontWeight="700"
        fill="currentColor" className="display">{center}</text>
      <text x="75" y="96" textAnchor="middle" fontSize="11" fill="var(--muted)">{sub}</text>
    </svg>
  );
}

function Bar({ label, value, pct, color }: { label: string; value: string; pct: number; color: string }) {
  return (
    <div className="bar-wrap">
      <div className="bar-lbl"><span>{label}</span><span>{value}</span></div>
      <div className="bar-bg"><div className="bar-fg" style={{ width: `${Math.min(100, pct)}%`, background: color }} /></div>
    </div>
  );
}

function Kpi({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color: string }) {
  return (
    <div className="kpi" style={{ ["--k" as string]: color }}>
      <div className="l">{label}</div>
      <div className="v">{value}</div>
      <div className="s">{sub ?? ""}</div>
    </div>
  );
}

export default function Results({ fileName, url, data, onReset }: {
  fileName: string;
  url: string;
  data: AnalyzeResponse;
  onReset: () => void;
}) {
  const S = data.summary;
  const [tab, setTab] = useState<Tab>("image");
  const [mode, setMode] = useState<ViewMode>("variety");
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<number | null>(null);
  const sel = data.grains.find((g) => g.id === selected) ?? null;
  const total_s = (data.timings_ms.total ?? 0) / 1000;

  const legend = mode === "variety" ? ["broken", "Kainat 1509", "Supri 86"] : ["broken", "standard"];
  const toggle = (k: string) =>
    setHidden((h) => {
      const n = new Set(h);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });

  const TABS: { id: Tab; label: string }[] = [
    { id: "image", label: "Annotated image" },
    { id: "gallery", label: "Grain gallery" },
    { id: "data", label: "Data & export" },
    { id: "perf", label: "Performance" },
  ];

  return (
    <div className="stack" style={{ padding: "24px 0 8px" }}>
      <div className="row between">
        <div className="row">
          <span className="chip">📄 {fileName}</span>
          <span className="chip hide-sm">{data.image.orig_w}×{data.image.orig_h} px → {data.image.w}×{data.image.h}</span>
        </div>
        <button className="btn btn-primary" onClick={onReset}>Scan another photo</button>
      </div>

      <section className="hero" aria-label="Result summary">
        <div>
          <div className="eyebrow">Result summary</div>
          <div className="big display">{S.broken_pct.toFixed(1)}% broken</div>
          <p style={{ fontSize: 16, fontWeight: 600, marginTop: 8 }}>
            {S.dominant ? <>Dominant variety: {S.dominant} ({S.dominant_share.toFixed(0)}% of standard grains)</> : "No standard grains found"}
          </p>
          <div className="row" style={{ marginTop: 14 }}>
            <span className="chip">{S.total} grains</span>
            <span className="chip">{S.low} need review</span>
            <span className="chip">{S.edge} touch the border</span>
            <span className="chip">{total_s.toFixed(2)} s</span>
            {S.edge > 0 && S.broken_pct_inner !== null && (
              <span className="chip">{S.broken_pct_inner.toFixed(1)}% broken without border grains</span>
            )}
          </div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div className={`grade ${S.grade}`} aria-label={`Demo grade ${S.grade}`}>{S.grade}</div>
          <div className="muted small" style={{ marginTop: 8 }}>
            Demo grade<br />A ≤ {data.grade_thresholds.a_max}% · B ≤ {data.grade_thresholds.b_max}% broken
          </div>
        </div>
      </section>

      <div className="stack" style={{ gap: 8 }}>
        {data.warnings.length === 0 ? (
          <div className="note ok">✅ <span>No quality warnings for this photo.</span></div>
        ) : (
          data.warnings.map((w) => (
            <div key={w.code} className="note warn">⚠️ <span>{w.message}</span></div>
          ))
        )}
      </div>

      <div className="kpis">
        <Kpi label="Total grains" value={S.total} sub="analysed" color="#6366f1" />
        <Kpi label="Broken" value={S.broken} sub={`${S.broken_pct.toFixed(1)}%`} color={HEX.broken} />
        <Kpi label="Standard" value={S.standard} sub={`${S.std_pct.toFixed(1)}%`} color={HEX.standard} />
        <Kpi label="Kainat 1509" value={S.kainat} sub={`${S.kainat_pct.toFixed(1)}% of standard`} color={HEX["Kainat 1509"]} />
        <Kpi label="Supri 86" value={S.supri} sub={`${S.supri_pct.toFixed(1)}% of standard`} color={HEX["Supri 86"]} />
        <Kpi label="Needs review" value={S.low} sub={`score < ${data.review_conf.toFixed(2)}`} color="#f59e0b" />
      </div>

      <div className="two">
        <div className="card">
          <h4>Quality split</h4>
          <div className="donut-row">
            <Donut parts={[{ pct: S.broken_pct, color: HEX.broken }, { pct: S.std_pct, color: HEX.standard }]}
              center={`${S.broken_pct.toFixed(0)}%`} sub="broken" />
            <div className="stack" style={{ gap: 8 }}>
              <span className="chip"><i className="sw" style={{ background: HEX.broken }} />Broken {S.broken}</span>
              <span className="chip"><i className="sw" style={{ background: HEX.standard }} />Standard {S.standard}</span>
            </div>
          </div>
        </div>
        <div className="card">
          <h4>Variety split (standard grains)</h4>
          <Bar label="Kainat 1509" value={`${S.kainat} · ${S.kainat_pct.toFixed(1)}%`} pct={S.kainat_pct} color={HEX["Kainat 1509"]} />
          <Bar label="Supri 86" value={`${S.supri} · ${S.supri_pct.toFixed(1)}%`} pct={S.supri_pct} color={HEX["Supri 86"]} />
        </div>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div className="tabs" role="tablist" style={{ padding: "0 12px" }}>
          {TABS.map((t) => (
            <button key={t.id} role="tab" className="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}>{t.label}</button>
          ))}
        </div>
        <div style={{ padding: 18 }} role="tabpanel">
          {tab === "image" && (
            <div className="stack">
              <div className="row between">
                <div className="seg" role="group" aria-label="Colour mode">
                  <button aria-pressed={mode === "variety"} onClick={() => setMode("variety")}>Variety</button>
                  <button aria-pressed={mode === "quality"} onClick={() => setMode("quality")}>Broken vs standard</button>
                </div>
                <button className="btn" onClick={() => exportAnnotated(url, data, mode, hidden)}>⬇ Download image</button>
              </div>
              <div className="row">
                {legend.map((k) => (
                  <span key={k} className={`chip ${hidden.has(k) ? "off" : ""}`}>
                    <button onClick={() => toggle(k)} aria-pressed={!hidden.has(k)}>
                      <i className="sw" style={{ background: HEX[k] }} />{k === "broken" ? "Broken" : k === "standard" ? "Standard" : k}
                    </button>
                  </span>
                ))}
                <span className="muted small">Click a colour to show or hide it.</span>
              </div>
              <AnnotatedView url={url} data={data} mode={mode} hidden={hidden} selected={selected} onSelect={setSelected} />
            </div>
          )}

          {tab === "gallery" && <Gallery data={data} selected={selected} onSelect={setSelected} />}

          {tab === "data" && (
            <div className="stack">
              <div className="row between">
                <span className="muted small">{data.grains.length} grains · lengths and widths are in pixels at 1280 px image size</span>
                <button className="btn" onClick={() => download("grains.csv", new Blob([grainsToCsv(data.grains)], { type: "text/csv" }))}>⬇ Download CSV</button>
              </div>
              <div className="tablewrap">
                <table className="t">
                  <thead>
                    <tr><th>#</th><th>Status</th><th>Variety</th><th>Stage 1</th><th>Variety score</th><th>Length</th><th>Width</th><th>Border</th></tr>
                  </thead>
                  <tbody>
                    {data.grains.slice(0, 300).map((g) => (
                      <tr key={g.id} onClick={() => setSelected(g.id)} style={{ cursor: "pointer" }}>
                        <td>{g.id}</td><td>{g.status}</td><td>{g.variety ?? "–"}</td><td>{g.bs_conf.toFixed(3)}</td>
                        <td>{g.var_conf?.toFixed(3) ?? "–"}</td><td>{g.length_px.toFixed(0)}</td><td>{g.width_px.toFixed(0)}</td>
                        <td>{g.edge ? "yes" : ""}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === "perf" && (
            <div>
              {Object.entries(data.timings_ms).filter(([k]) => k !== "total").map(([k, v]) => (
                <Bar key={k} label={k.replace(/_/g, " ")} value={`${v.toFixed(0)} ms`}
                  pct={data.timings_ms.total ? (100 * v) / data.timings_ms.total : 0} color="#6366f1" />
              ))}
              <div className="note ok mt">⏱ <span><b>Server time: {(data.timings_ms.total ?? 0).toFixed(0)} ms.</b> Upload and network time are not included.
                Model version {data.model_version} · request {data.request_id}.</span></div>
            </div>
          )}
        </div>
      </div>

      {sel && (
        <div className="card" aria-live="polite">
          <h4>Selected grain #{sel.id}</h4>
          <div className="detail">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`data:image/jpeg;base64,${sel.thumb}`} alt={`Grain ${sel.id}`} />
            <dl className="dl">
              <dt>Stage 1</dt><dd>{sel.status === "broken" ? "Broken" : "Standard"} ({sel.bs_conf.toFixed(2)})</dd>
              <dt>Variety</dt><dd>{sel.variety ? `${sel.variety} (${sel.var_conf?.toFixed(2)})` : "–"}</dd>
              <dt>Size</dt><dd>{sel.length_px.toFixed(0)} × {sel.width_px.toFixed(0)} px</dd>
              <dt>Aspect ratio</dt><dd>{(sel.length_px / Math.max(sel.width_px, 1)).toFixed(2)}</dd>
              <dt>Review</dt><dd>{sel.low ? "Low score, please check" : "OK"} · {grainConf(sel).toFixed(2)}</dd>
              <dt>Border</dt><dd>{sel.edge ? "Touches the image border" : "Fully inside the frame"}</dd>
            </dl>
            <button className="btn" onClick={() => setSelected(null)}>Clear</button>
          </div>
        </div>
      )}
    </div>
  );
}
