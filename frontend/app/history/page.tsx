"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import type { HistoryEntry } from "@/lib/types";
import { HEX, loadHistory, saveHistory } from "@/lib/utils";

function Spark({ values }: { values: number[] }) {
  if (values.length < 2) return <p className="muted small">Scan at least two photos to see a trend.</p>;
  const W = 600, H = 120, max = Math.max(5, ...values);
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * W},${H - (v / max) * (H - 10) - 5}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="120" role="img" aria-label="Broken percentage per scan">
      <polyline points={pts} fill="none" stroke={HEX.broken} strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export default function HistoryPage() {
  const [list, setList] = useState<HistoryEntry[] | null>(null);
  useEffect(() => setList(loadHistory()), []);

  if (list === null) return <div style={{ padding: "40px 0" }} className="muted">Loading…</div>;

  const avg = list.length ? list.reduce((a, e) => a + e.broken_pct, 0) / list.length : 0;
  const gradeA = list.length ? (100 * list.filter((e) => e.grade === "A").length) / list.length : 0;

  return (
    <div className="stack" style={{ padding: "28px 0 8px" }}>
      <div className="row between">
        <h1 className="display" style={{ fontSize: 32 }}>Scan history</h1>
        {list.length > 0 && (
          <button className="btn" onClick={() => { if (window.confirm("Delete all history on this device?")) { saveHistory([]); setList([]); } }}>
            Delete history
          </button>
        )}
      </div>
      <p className="muted small">History is stored only in this browser. Photos are not saved.</p>

      {list.length === 0 ? (
        <div className="card">
          <p>No scans yet.</p>
          <Link href="/" className="btn btn-primary mt">Scan your first photo</Link>
        </div>
      ) : (
        <>
          <div className="kpis">
            <div className="kpi" style={{ ["--k" as string]: "#6366f1" }}><div className="l">Scans</div><div className="v">{list.length}</div><div className="s" /></div>
            <div className="kpi" style={{ ["--k" as string]: HEX.broken }}><div className="l">Average broken</div><div className="v">{avg.toFixed(1)}%</div><div className="s" /></div>
            <div className="kpi" style={{ ["--k" as string]: HEX.standard }}><div className="l">Grade A share</div><div className="v">{gradeA.toFixed(0)}%</div><div className="s">demo grade</div></div>
          </div>
          <div className="card"><h4>Broken % per scan</h4><Spark values={list.map((e) => e.broken_pct)} /></div>
          <div className="tablewrap">
            <table className="t">
              <thead><tr><th>Date</th><th>File</th><th>Grains</th><th>Broken %</th><th>Grade</th><th>Dominant</th><th>Review</th></tr></thead>
              <tbody>
                {[...list].reverse().map((e) => (
                  <tr key={e.id}>
                    <td>{new Date(e.ts).toLocaleString()}</td><td>{e.file}</td><td>{e.total}</td>
                    <td>{e.broken_pct.toFixed(1)}</td><td>{e.grade}</td><td>{e.dominant ?? "–"}</td><td>{e.low}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
