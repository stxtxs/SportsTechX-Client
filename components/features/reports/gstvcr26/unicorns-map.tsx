"use client";

/**
 * GSTVCR26 · Unicorns map. Same look as the Ecosystem map (Natural Earth
 * projection, ocean gradient, continent bubbles): each bubble is a pie of the
 * continent's unicorns by sector, sized by count, with the combined valuation
 * underneath. Clicking a bubble selects that continent.
 */
import React, { useEffect, useMemo, useState } from "react";
import * as topojsonClient from "topojson-client";
import { geoNaturalEarth1, geoPath } from "d3-geo";
import { BRAND } from "./brand";
import { SECTOR_COLORS, type Unicorn, type UnicornContinent } from "./unicorns-data";
import { billions, bySector, sumValue } from "./unicorns-stats";

const W = 900;
const H = 460;
const WORLD_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";
const CENTERS: Record<UnicornContinent, [number, number]> = {
  "North America": [-95, 44],
  "South America": [-58, -15],
  Europe: [12, 50],
  Asia: [100, 33],
};

type MapTheme = { bgCard: string; border: string; textMuted: string };
type Projected = { paths: string[]; centers: Record<UnicornContinent, [number, number]> };

function useWorld(): Projected | null {
  const [world, setWorld] = useState<Projected | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetch(WORLD_URL)
      .then((r) => r.json())
      .then((topo) => {
        if (cancelled) return;
        const proj = geoNaturalEarth1().scale(W / 6.28).translate([W / 2, H / 2]);
        const path = geoPath().projection(proj);
        const countries = topojsonClient.feature(topo, topo.objects.countries) as unknown as { features: object[] };
        const centers = Object.fromEntries(
          (Object.keys(CENTERS) as UnicornContinent[]).map((c) => [c, proj(CENTERS[c]) ?? [0, 0]]),
        ) as Record<UnicornContinent, [number, number]>;
        setWorld({ paths: countries.features.map((f) => path(f as never) ?? ""), centers });
      })
      .catch(() => { if (!cancelled) setWorld({ paths: [], centers: fallbackCenters() }); });
    return () => { cancelled = true; };
  }, []);
  return world;
}

/** Rough positions if the world outline cannot load: bubbles still render. */
function fallbackCenters(): Record<UnicornContinent, [number, number]> {
  const proj = geoNaturalEarth1().scale(W / 6.28).translate([W / 2, H / 2]);
  return Object.fromEntries((Object.keys(CENTERS) as UnicornContinent[]).map((c) => [c, proj(CENTERS[c]) ?? [0, 0]])) as Record<UnicornContinent, [number, number]>;
}

function Pie({ cx, cy, r, rows }: { cx: number; cy: number; r: number; rows: Unicorn[] }) {
  const parts = bySector(rows).filter((s) => s.count > 0);
  if (parts.length === 1) return <circle cx={cx} cy={cy} r={r} fill={SECTOR_COLORS[parts[0].key]} opacity={0.92} />;
  const total = rows.length;
  const arcs = parts.map((s, i) => {
    const before = parts.slice(0, i).reduce((sum, p) => sum + p.count, 0);
    const start = -Math.PI / 2 + (before / total) * 2 * Math.PI;
    const angle = (s.count / total) * 2 * Math.PI;
    return { key: s.key, start, end: start + angle, large: angle > Math.PI ? 1 : 0 };
  });
  return (
    <>
      {arcs.map((a) => (
        <path key={a.key} fill={SECTOR_COLORS[a.key]} opacity={0.92}
          d={`M ${cx},${cy} L ${cx + r * Math.cos(a.start)},${cy + r * Math.sin(a.start)} A ${r},${r} 0 ${a.large},1 ${cx + r * Math.cos(a.end)},${cy + r * Math.sin(a.end)} Z`} />
      ))}
    </>
  );
}

export function UnicornsMap({ rows, selected, onSelect, t, isDark, isPdf }: {
  rows: Unicorn[];
  selected: UnicornContinent | null;
  onSelect: (c: UnicornContinent | null) => void;
  t: MapTheme;
  isDark: boolean;
  isPdf: boolean;
}) {
  const world = useWorld();
  const [hovered, setHovered] = useState<UnicornContinent | null>(null);
  const groups = useMemo(
    () => (Object.keys(CENTERS) as UnicornContinent[]).map((c) => ({ c, rows: rows.filter((r) => r.continent === c) })).filter((g) => g.rows.length > 0),
    [rows],
  );
  const maxCount = Math.max(...groups.map((g) => g.rows.length), 1);

  return (
    <div style={{ position: "relative", background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 8, overflow: "hidden" }}>
      {!world ? (
        <div style={{ height: 380, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Mono',monospace", fontSize: 11, letterSpacing: 3, color: t.textMuted }}>LOADING MAP…</div>
      ) : (
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Unicorns by continent" style={{ width: "100%", height: "auto", display: "block" }}>
          <defs>
            <radialGradient id="unicornOcean" cx="50%" cy="50%" r="70%">
              <stop offset="0%" stopColor={isDark ? "#0e1624" : "#e8f0f8"} />
              <stop offset="100%" stopColor={isDark ? "#060d18" : "#d5e4f0"} />
            </radialGradient>
          </defs>
          <rect width={W} height={H} fill="url(#unicornOcean)" />
          {world.paths.map((d, i) => (
            <path key={i} d={d} fill={isDark ? "rgba(75,100,130,0.45)" : "rgba(160,185,210,0.55)"} stroke={isDark ? "rgba(190,208,227,0.18)" : "rgba(100,130,160,0.25)"} strokeWidth={0.4} />
          ))}
          {groups.map(({ c, rows: cRows }) => {
            const [x, y] = world.centers[c];
            const r = 18 + (cRows.length / maxCount) * 26;
            const isSel = selected === c;
            const isHov = hovered === c;
            const ring = isSel ? BRAND.pink : isHov ? BRAND.tealBright : "rgba(255,255,255,0.3)";
            return (
              <g key={c} style={{ cursor: isPdf ? "default" : "pointer" }}
                onClick={() => onSelect(isSel ? null : c)}
                onMouseEnter={() => setHovered(c)} onMouseLeave={() => setHovered(null)}>
                {!isPdf && !isSel && (
                  <circle cx={x} cy={y} r={r + 6} fill="none" stroke={ring} strokeWidth={1}>
                    <animate attributeName="r" values={`${r + 4};${r + 10};${r + 4}`} dur="3s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.4;0;0.4" dur="3s" repeatCount="indefinite" />
                  </circle>
                )}
                <circle cx={x} cy={y} r={r + 2} fill={isSel ? `${BRAND.pink}22` : "rgba(0,0,0,0.18)"} stroke={ring} strokeWidth={isSel ? 2 : 1} />
                <Pie cx={x} cy={y} r={r} rows={cRows} />
                <text x={x} y={y + 5} textAnchor="middle" style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: Math.max(14, r * 0.7), fill: "#fff", pointerEvents: "none" }}>{cRows.length}</text>
                <text x={x} y={y + r + 15} textAnchor="middle" style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, letterSpacing: 1.5, textTransform: "uppercase", fill: isSel ? BRAND.pink : isDark ? "rgba(190,208,227,0.75)" : "rgba(45,59,73,0.75)", pointerEvents: "none" }}>
                  {c} · {billions(sumValue(cRows))}
                </text>
              </g>
            );
          })}
        </svg>
      )}
    </div>
  );
}
