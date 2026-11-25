"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Dropzone from "@/components/Dropzone";
import Analyzing from "@/components/Analyzing";
import Results from "@/components/Results";
import { ApiError, analyzeImage } from "@/lib/api";
import type { AnalyzeResponse } from "@/lib/types";
import { loadHistory, saveHistory } from "@/lib/utils";

type Phase =
  | { kind: "idle" }
  | { kind: "analyzing"; file: File; url: string; note: string | null }
  | { kind: "done"; file: File; url: string; data: AnalyzeResponse }
  | { kind: "error"; message: string; file?: File; url?: string };

function sleep(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve) => {
    if (signal.aborted) return resolve();
    const finish = () => {
      clearTimeout(timer);
      signal.removeEventListener("abort", finish);
      resolve();
    };
    const timer = setTimeout(finish, ms);
    signal.addEventListener("abort", finish, { once: true });
  });
}

export default function Home() {
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const abort = useRef<AbortController | null>(null);
  const urlRef = useRef<string | null>(null);

  useEffect(() => () => { abort.current?.abort(); if (urlRef.current) URL.revokeObjectURL(urlRef.current); }, []);

  const run = useCallback(async (file: File, url: string) => {
    abort.current?.abort();
    const ac = new AbortController();
    abort.current = ac;
    setPhase({ kind: "analyzing", file, url, note: null });
    let attempt = 0;
    for (;;) {
      try {
        const data = await analyzeImage(file, ac.signal);
        const S = data.summary;
        const list = loadHistory();
        list.push({
          id: globalThis.crypto?.randomUUID?.() ?? String(Date.now()),
          ts: new Date().toISOString(), file: file.name || "photo", total: S.total, broken: S.broken,
          broken_pct: S.broken_pct, grade: S.grade, dominant: S.dominant, kainat: S.kainat, supri: S.supri, low: S.low,
        });
        saveHistory(list);
        setPhase({ kind: "done", file, url, data });
        return;
      } catch (e) {
        if ((e as Error).name === "AbortError") return;
        const err = e as ApiError;
        const loadFailed = err.message.includes("failed to load");
        const retryable = err.retryable && !loadFailed;
        if (retryable && attempt < 12) {
          attempt += 1;
          setPhase((p) => p.kind === "analyzing"
            ? { ...p, note: "Connecting to Hugging Face / waiting for ZeroGPU. The Space may be starting or your request may be queued." } : p);
          await sleep(4000, ac.signal);
          continue;
        }
        setPhase({ kind: "error", message: err.message, file, url });
        return;
      }
    }
  }, []);

  const onFile = (file: File) => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    const url = URL.createObjectURL(file);
    urlRef.current = url;
    run(file, url);
  };

  const reset = () => {
    abort.current?.abort();
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = null;
    setPhase({ kind: "idle" });
  };

  if (phase.kind === "analyzing") return <Analyzing url={phase.url} note={phase.note} />;
  if (phase.kind === "done") return <Results fileName={phase.file.name || "photo"} url={phase.url} data={phase.data} onReset={reset} />;

  return (
    <div className="landing">
      <div>
        <h1 className="display">Know your rice in seconds.</h1>
        <p className="lead">
          Upload one photo of rice grains. GrainScan finds every grain, measures how much is broken and tells you the
          variety split, with a clear view of how much to trust each result.
        </p>
        {phase.kind === "error" && (
          <div className="note err" role="alert" style={{ marginBottom: 14, alignItems: "center", flexWrap: "wrap" }}>
            ⚠️ <span style={{ flex: 1 }}>{phase.message}</span>
            {phase.file && phase.url && <button className="btn" onClick={() => run(phase.file!, phase.url!)}>Try again</button>}
          </div>
        )}
        <Dropzone onFile={onFile} />
      </div>
      <div className="stack">
        <div className="card">
          <h4>How it works</h4>
          <div className="steps">
            <div className="step"><span className="n">1</span><span>Every grain is found and outlined individually.</span></div>
            <div className="step"><span className="n">2</span><span>Each grain is straightened and cropped at its real size.</span></div>
            <div className="step"><span className="n">3</span><span>It is classified as broken or standard.</span></div>
            <div className="step"><span className="n">4</span><span>Standard grains get a variety: Kainat 1509 or Supri 86.</span></div>
          </div>
        </div>
        <div className="card">
          <h4>For the best photo</h4>
          <div className="tip"><span>🟫</span><span>One layer of grains on a plain dark tray, not touching each other.</span></div>
          <div className="tip"><span>💡</span><span>Even light, camera held straight above the tray.</span></div>
          <div className="tip"><span>📏</span><span>Same distance and zoom as the training photos.</span></div>
          <div className="tip"><span>🖼️</span><span>Keep every grain fully inside the frame.</span></div>
        </div>
      </div>
    </div>
  );
}
