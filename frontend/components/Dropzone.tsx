"use client";
import { useRef, useState } from "react";
import { MAX_MB } from "@/lib/api";

const OK_EXT = /\.(jpe?g|png|webp|heic|heif)$/i;

export default function Dropzone({ onFile }: { onFile: (f: File) => void }) {
  const pick = useRef<HTMLInputElement>(null);
  const cam = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const handle = (f?: File | null) => {
    if (!f) return;
    if (!f.type.startsWith("image/") && !OK_EXT.test(f.name)) {
      setErr("Please choose an image file (JPG, PNG or WebP).");
      return;
    }
    if (f.size > MAX_MB * 1024 * 1024) {
      setErr(`This photo is larger than ${MAX_MB} MB. Please use a smaller one.`);
      return;
    }
    setErr(null);
    onFile(f);
  };

  return (
    <div
      className={`dropzone ${drag ? "drag" : ""}`}
      onDragOver={(e) => {
        e.preventDefault();
        setDrag(true);
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        handle(e.dataTransfer.files?.[0]);
      }}
    >
      <div className="ico" aria-hidden>📷</div>
      <h3>Drop a photo of rice grains here</h3>
      <p className="muted small">JPG, PNG or WebP · up to {MAX_MB} MB · analysis starts automatically</p>
      <div className="dz-actions">
        <button className="btn btn-primary btn-lg" onClick={() => pick.current?.click()}>Choose a photo</button>
        <button className="btn btn-lg" onClick={() => cam.current?.click()}>Take a photo</button>
      </div>
      <input ref={pick} type="file" hidden accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
        onChange={(e) => { handle(e.target.files?.[0]); e.target.value = ""; }} />
      <input ref={cam} type="file" hidden accept="image/*" capture="environment"
        onChange={(e) => { handle(e.target.files?.[0]); e.target.value = ""; }} />
      {err && <div className="note err mt" role="alert" style={{ textAlign: "left" }}>⚠️ <span>{err}</span></div>}
    </div>
  );
}
