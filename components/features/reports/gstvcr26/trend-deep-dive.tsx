"use client";

/**
 * GSTVCR26 · Trends: the deep dive shown under a trend card.
 * Big figures, what is happening, charts, evidence, companies to watch and
 * "What it means". Content comes from ./trend-content (the Trend Research doc).
 * Charts are plain CSS bars, so the PDF (?pdf=true) renders them as on the web.
 */
import React from "react";
import { BRAND } from "./brand";
import { money } from "./format";
import type { TrendChart, TrendDeepDive } from "./trend-content";

type TrendTheme = { bg: string; bgSec: string; bgCard: string; text: string; textMuted: string; border: string; titleColor: string };

const MONO = "'DM Mono',monospace";
const DISPLAY = "'Bebas Neue',sans-serif";
const EARLIER_SERIES = [BRAND.lightBlue, BRAND.slate];
/** The latest series (the last one) is always pink; earlier ones are muted. */
const seriesColor = (i: number, count: number): string => (i === count - 1 ? BRAND.pink : EARLIER_SERIES[i % EARLIER_SERIES.length]);

function formatValue(value: number, unit: TrendChart["unit"]): string {
  if (unit === "usd_m") return money(value);
  if (unit === "usd_b") return `$${value.toFixed(1)}B`;
  if (unit === "pct") return `${value}%`;
  return value.toLocaleString("en-US");
}

const eyebrow = (text: string, color: string = BRAND.teal): React.ReactNode => (
  <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: 3, color, textTransform: "uppercase", marginBottom: 14 }}>{text}</div>
);

const heading = (text: string, t: TrendTheme): React.ReactNode => (
  <div style={{ fontFamily: DISPLAY, fontSize: 28, color: t.titleColor, marginBottom: 16 }}>{text}</div>
);

function BarsChart({ chart, t }: { chart: Extract<TrendChart, { kind: "bars" }>; t: TrendTheme }) {
  const max = Math.max(...chart.items.map((d) => d.value), 0) || 1;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {chart.items.map((d) => (
        <div key={d.label} style={{ display: "grid", gridTemplateColumns: "minmax(0, 38%) 1fr", alignItems: "center", gap: 12 }}>
          <div style={{ fontSize: 12, color: t.text, lineHeight: 1.3 }}>{d.label}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ height: 14, width: `${Math.max((d.value / max) * 100, d.value > 0 ? 2 : 0)}%`, maxWidth: "calc(100% - 64px)", borderRadius: 3, background: d.highlight ? BRAND.pink : BRAND.slate }} />
            <div style={{ fontFamily: MONO, fontSize: 11, color: d.highlight ? BRAND.pink : t.text, whiteSpace: "nowrap" }}>{d.display ?? formatValue(d.value, chart.unit)}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

/** One row per category, one bar per series. Each row scales on its own max,
 *  so rows in different units (deal count vs value) can sit in one chart. */
function GroupChart({ chart, t }: { chart: Extract<TrendChart, { kind: "group" }>; t: TrendTheme }) {
  return (
    <div>
      <div style={{ display: "flex", gap: 16, marginBottom: 12 }}>
        {chart.series.map((s, i) => (
          <div key={s} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: seriesColor(i, chart.series.length) }} />
            <span style={{ fontFamily: MONO, fontSize: 10, color: t.textMuted }}>{s}</span>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {chart.rows.map((row) => {
          const max = Math.max(...row.values.map((v) => v ?? 0), 0) || 1;
          return (
            <div key={row.label}>
              <div style={{ fontSize: 12, color: t.text, marginBottom: 6 }}>{row.label}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {row.values.map((v, i) => {
                  const label = row.displays?.[i] ?? (v === null ? "n/a" : formatValue(v, chart.unit));
                  return (
                    <div key={chart.series[i]} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ height: 10, width: `${v === null ? 0 : Math.max((v / max) * 100, 2)}%`, maxWidth: "calc(100% - 72px)", borderRadius: 2, background: seriesColor(i, chart.series.length) }} />
                      <div style={{ fontFamily: MONO, fontSize: 10, color: v === null ? t.textMuted : t.text, whiteSpace: "nowrap" }}>{label}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ChartCard({ chart, t }: { chart: TrendChart; t: TrendTheme }) {
  return (
    <div style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 10, padding: "20px 20px 16px", breakInside: "avoid" }}>
      {eyebrow(chart.title)}
      {chart.kind === "bars" ? <BarsChart chart={chart} t={t} /> : <GroupChart chart={chart} t={t} />}
      {chart.note && <div style={{ fontSize: 11, lineHeight: 1.5, color: t.textMuted, marginTop: 14 }}>{chart.note}</div>}
    </div>
  );
}

export function TrendDeepDiveBody({ trend, t, isMobile }: { trend: TrendDeepDive; t: TrendTheme; isMobile: boolean }) {
  const twoCol = isMobile ? "1fr" : "1fr 1fr";
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 36, textAlign: "left" }}>
      <div>
        <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: 2, color: BRAND.pink, textTransform: "uppercase" }}>{trend.tag}</div>
        <div style={{ fontFamily: DISPLAY, fontSize: isMobile ? 26 : 36, lineHeight: 1.1, color: t.titleColor, marginTop: 6 }}>{trend.title}: {trend.headline}</div>
        <p style={{ fontSize: 14, lineHeight: 1.7, color: t.textMuted, marginTop: 8 }}>{trend.summary}</p>
        <div style={{ fontSize: 11, color: t.textMuted, marginTop: 6, fontFamily: MONO }}>{trend.category}</div>
      </div>

      {/* Big figures */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)", gap: 12, breakInside: "avoid" }}>
        {trend.figures.map((f) => (
          <div key={f.value + f.label} style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 10, padding: "18px 16px" }}>
            <div style={{ fontFamily: DISPLAY, fontSize: isMobile ? 34 : 44, lineHeight: 1, color: BRAND.pink }}>{f.value}</div>
            <div style={{ fontSize: 12, lineHeight: 1.5, color: t.textMuted, marginTop: 8 }}>{f.label}</div>
          </div>
        ))}
      </div>

      <div>
        {heading("What is happening", t)}
        {trend.happening.map((p, i) => <p key={i} style={{ fontSize: 14, lineHeight: 1.8, color: t.text, marginBottom: 14 }}>{p}</p>)}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: twoCol, gap: 16 }}>
        {trend.charts.map((c) => <ChartCard key={c.title} chart={c} t={t} />)}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: twoCol, gap: 24 }}>
        <div style={{ breakInside: "avoid" }}>
          {heading(trend.evidenceTitle, t)}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {trend.evidence.map((e) => (
              <div key={e.who + e.date} style={{ borderLeft: `3px solid ${BRAND.teal}`, paddingLeft: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: t.titleColor }}>{e.who}</span>
                  <span style={{ fontFamily: MONO, fontSize: 10, color: t.textMuted, whiteSpace: "nowrap" }}>{e.date}</span>
                </div>
                <div style={{ fontSize: 12, lineHeight: 1.5, color: t.text }}>{e.what}</div>
                <div style={{ fontSize: 11, lineHeight: 1.5, color: t.textMuted }}>{e.why}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ breakInside: "avoid" }}>
          {heading("Companies to watch", t)}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {trend.watch.map((w) => (
              <div key={w.name} style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 8, padding: "12px 12px" }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: t.titleColor }}>{w.name}</div>
                <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: 1, color: BRAND.teal, textTransform: "uppercase", marginTop: 2 }}>{w.country}</div>
                <div style={{ fontSize: 11, lineHeight: 1.5, color: t.textMuted, marginTop: 6 }}>{w.note}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* What it means */}
      <div style={{ background: `${BRAND.darkTitle}0D`, borderRadius: 10, padding: isMobile ? "20px 16px" : "28px 32px", breakInside: "avoid" }}>
        {heading("What it means", t)}
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : `repeat(${trend.meaning.length}, 1fr)`, gap: 20 }}>
          {trend.meaning.map((m, i) => (
            <div key={i}>
              <div style={{ fontFamily: MONO, fontSize: 11, color: BRAND.pink, marginBottom: 6 }}>{String(i + 1).padStart(2, "0")}</div>
              <div style={{ fontSize: 13, lineHeight: 1.7, color: t.text }}>{m}</div>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 12, lineHeight: 1.6, color: t.textMuted, marginTop: 18 }}>
          <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: 2, color: BRAND.pink, textTransform: "uppercase", marginRight: 8 }}>Risks</span>
          {trend.risks}
        </div>
        <blockquote style={{ margin: "24px 0 0", paddingLeft: 16, borderLeft: `3px solid ${BRAND.pink}`, fontSize: 15, lineHeight: 1.7, fontStyle: "italic", color: t.titleColor }}>
          {trend.narrative}
        </blockquote>
      </div>

      <div style={{ fontSize: 10, lineHeight: 1.7, color: t.textMuted }}>
        <span style={{ fontFamily: MONO, letterSpacing: 2, textTransform: "uppercase", marginRight: 8 }}>Sources</span>
        SportsTechX database (January to October each year) ·{" "}
        {trend.sources.map((s, i) => (
          <React.Fragment key={s.url}>
            {i > 0 && " · "}
            <a href={s.url} target="_blank" rel="noopener noreferrer" style={{ color: t.textMuted, textDecoration: "underline" }}>{s.label}</a>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
