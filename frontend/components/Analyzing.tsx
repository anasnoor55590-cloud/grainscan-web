"use client";
import { useEffect, useState } from "react";

const STEPS = [
  "Preparing the photo",
  "Finding every grain",
  "Cropping and straightening each grain",
  "Checking broken vs standard",
  "Identifying the variety",
];

/** Progress steps are time-based (cosmetic); the real work happens on the server. */
export default function Analyzing({ url, note }: { url: string; note?: string | null }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((v) => Math.min(v + 1, STEPS.length - 1)), 1400);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="analyze-wrap">
      <div className="stage">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="photo" src={url} alt="Your uploaded photo" />
        <div className="scanline" />
      </div>
      <div className="card" aria-live="polite">
        <h4>Analysing your photo</h4>
        {STEPS.map((s, k) => (
          <div key={s} className={`progress-step ${k < i ? "done" : k === i ? "active" : ""}`}>
            {k < i ? <span className="tick">✓</span> : k === i ? <span className="spinner" /> : <span className="tick">·</span>}
            <span>{s}</span>
          </div>
        ))}
        {note && <div className="note warn mt">⏳ <span>{note}</span></div>}
        <p className="muted small mt">This usually takes a few seconds. The first scan after a long break can take longer while the server wakes up.</p>
      </div>
    </div>
  );
}
