"use client";
import { useMemo, useState } from "react";
import type { AnalyzeResponse, Grain } from "@/lib/types";
import { HEX, grainConf } from "@/lib/utils";

type Filter = "all" | "broken" | "Kainat 1509" | "Supri 86" | "review" | "border";
const MAX = 120;

export default function Gallery({ data, selected, onSelect }: {
  data: AnalyzeResponse;
  selected: number | null;
  onSelect: (id: number | null) => void;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<"order" | "conf">("order");

  const items = useMemo(() => {
    let list: Grain[] = data.grains;
    if (filter === "broken") list = list.filter((g) => g.status === "broken");
    else if (filter === "Kainat 1509" || filter === "Supri 86") list = list.filter((g) => g.variety === filter);
    else if (filter === "review") list = list.filter((g) => g.low);
    else if (filter === "border") list = list.filter((g) => g.edge);
    if (sort === "conf") list = [...list].sort((a, b) => grainConf(a) - grainConf(b));
    return list;
  }, [data, filter, sort]);

  const FILTERS: { id: Filter; label: string }[] = [
    { id: "all", label: "All" },
    { id: "broken", label: "Broken" },
    { id: "Kainat 1509", label: "Kainat 1509" },
    { id: "Supri 86", label: "Supri 86" },
    { id: "review", label: "Needs review" },
    { id: "border", label: "Touching border" },
  ];

  return (
    <div className="stack">
      <div className="row between">
        <div className="seg" role="group" aria-label="Filter grains" style={{ flexWrap: "wrap" }}>
          {FILTERS.map((f) => (
            <button key={f.id} aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}>{f.label}</button>
          ))}
        </div>
        <select className="sel" value={sort} onChange={(e) => setSort(e.target.value as "order" | "conf")} aria-label="Sort grains">
          <option value="order">Original order</option>
          <option value="conf">Lowest score first</option>
        </select>
      </div>
      <p className="muted small">
        {items.length} grain{items.length === 1 ? "" : "s"}
        {items.length > MAX ? ` (showing the first ${MAX})` : ""} · ⚑ touches the image border
      </p>
      {items.length === 0 ? (
        <div className="note ok">No grains match this filter.</div>
      ) : (
        <div className="grid">
          {items.slice(0, MAX).map((g) => {
            const key = g.status === "broken" ? "broken" : g.variety ?? "standard";
            const label = g.status === "broken" ? "Broken" : (g.variety ?? "Std").split(" ")[0];
            return (
              <button key={g.id} className="gcard" aria-pressed={selected === g.id}
                style={{ borderColor: HEX[key] }} onClick={() => onSelect(selected === g.id ? null : g.id)}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`data:image/jpeg;base64,${g.thumb}`} alt={`Grain ${g.id}`} loading="lazy" />
                <div className="m"><span>#{g.id}{g.edge ? " ⚑" : ""}</span><span>{label} {grainConf(g).toFixed(2)}</span></div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
