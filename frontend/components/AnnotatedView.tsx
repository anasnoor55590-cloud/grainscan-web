"use client";
import { useMemo, useState } from "react";
import type { AnalyzeResponse, ViewMode } from "@/lib/types";
import { HEX, grainKey } from "@/lib/utils";

interface Props {
  url: string;
  data: AnalyzeResponse;
  mode: ViewMode;
  hidden: Set<string>;
  selected: number | null;
  onSelect: (id: number | null) => void;
}

export default function AnnotatedView({ url, data, mode, hidden, selected, onSelect }: Props) {
  const [hover, setHover] = useState<number | null>(null);
  const points = useMemo(() => data.grains.map((g) => g.poly.map((p) => `${p[0]},${p[1]}`).join(" ")), [data]);
  const active = data.grains.find((g) => g.id === (hover ?? selected));
  const { w, h } = data.image;

  return (
    <div className="stack">
      <div className="stage">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="photo" src={url} alt="Uploaded photo with detected grains" />
        <svg className="overlay" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" role="group" aria-label="Detected grains">
          {data.grains.map((g, i) => {
            const key = grainKey(g, mode);
            if (hidden.has(key)) return null;
            const color = HEX[key] ?? HEX.standard;
            const sel = g.id === selected;
            return (
              <polygon
                key={g.id}
                className="poly"
                points={points[i]}
                fill={color}
                fillOpacity={sel ? 0.78 : 0.42}
                stroke={sel ? "#ffffff" : color}
                strokeWidth={sel ? 3 : 1.5}
                vectorEffect="non-scaling-stroke"
                onMouseEnter={() => setHover(g.id)}
                onMouseLeave={() => setHover(null)}
                onClick={() => onSelect(sel ? null : g.id)}
              >
                <title>{`Grain #${g.id}`}</title>
              </polygon>
            );
          })}
        </svg>
      </div>
      <div className="hint" aria-live="polite">
        {active ? (
          <>
            <b>Grain #{active.id}</b> · {active.status === "broken" ? "Broken" : active.variety ?? "Standard"} · score{" "}
            {(active.status === "broken" ? active.bs_conf : active.var_conf ?? active.bs_conf).toFixed(2)} ·{" "}
            {active.length_px.toFixed(0)}×{active.width_px.toFixed(0)} px{active.edge ? " · touches image border" : ""}
          </>
        ) : (
          <span className="muted">Hover or tap a grain to see its details.</span>
        )}
      </div>
    </div>
  );
}
