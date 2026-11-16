"use client";

/**
 * GSTVCR26 · Data In Full → Equity · "Sub-Sector Snapshot".
 * Live from Prod v2 (GET /api/reports/gstvcr26/sub-sector-snapshot), following
 * the section's period + region filters. Web: pick one sub-sector. PDF: every
 * sub-sector, one per page.
 */

import { useMemo, useState, type ReactNode } from "react";
import useSWR from "swr";
import { BRAND } from "./brand";
import { getCountryFlag } from "./flags";
import { companyLogoSrc, websiteHref } from "./logos";
import { money, periodYears, subSectorCaption, type Period, type RegionCode } from "./captions";

type Theme = {
  bg: string; bgSec: string; bgCard: string; text: string; textSec: string;
  textMuted: string; border: string; titleColor: string; tableRowAlt: string;
};
type Slice = { name: string; total_m: number; deals: number };
type Snapshot = {
  sector: string;
  subSector: string;
  timeline: { year: number; total_m: number; deals: number }[];
  janOct2025: { total_m: number; deals: number };
  subSubSectors: Slice[];
  businessModels: Slice[];
  topCountries: { country: string; total_m: number; deals: number; top_city: string | null }[];
  topCompanies: { name: string; total_m: number; deals: number; website: string | null; logo_url: string | null; city: string | null; country: string | null }[];
};

const MONO = "'DM Mono',monospace";
const DISPLAY = "'Bebas Neue',sans-serif";

/** Sector → audience label + colours already used across the report. */
const SECTOR_STYLE: Record<string, { label: string; main: string; second: string }> = {
  "Activity & Performance": { label: "For Athletes", main: BRAND.athletes, second: BRAND.athletesSec },
  "Fans & Content": { label: "For Fans", main: BRAND.fans, second: BRAND.fansSec },
  "Management & Organisation": { label: "For Executives", main: BRAND.execs, second: BRAND.execsSec },
};
const styleOf = (sector: string) => SECTOR_STYLE[sector] ?? { label: sector, main: BRAND.navy, second: BRAND.lightBlue };
const EXTRA_SLICE_COLORS = [BRAND.teal, BRAND.lightBlue, BRAND.slate, BRAND.peach];
const MODEL_COLORS: Record<string, string> = { B2C: BRAND.b2c, B2B: BRAND.b2b, B2B2C: "#D98CA8", "Not specified": BRAND.lightBlue };

const periodTitle = (p: Period) => (p === "2026" ? "2026 (Jan–Oct)" : "2021 – 2025");

export function SubSectorSnapshotSection({ period, region, header, t, isMobile, isPdf }: {
  period: Period;
  region: RegionCode | null;
  /** The section's standard heading (with the period toggle). */
  header: ReactNode;
  t: Theme;
  isMobile: boolean;
  isPdf: boolean;
}) {
  const key = useMemo(() => ["/api/reports/gstvcr26/sub-sector-snapshot", { fundingPeriod: period, fundingRegion: region ?? undefined }] as const, [period, region]);
  const { data, error, isLoading } = useSWR<{ subSectors: Snapshot[] }>(key, { keepPreviousData: true });
  const snapshots = data?.subSectors ?? [];
  const [selected, setSelected] = useState<string | null>(null);
  const active = snapshots.find((s) => s.subSector === selected) ?? snapshots[0];

  return (
    <div style={{ marginTop: 72 }} className="stx-reveal">
      {header}
      {error && <p role="status" style={{ fontFamily: MONO, fontSize: 11, color: BRAND.pink, marginTop: 16 }}>Couldn&apos;t load the sub-sector data. Please refresh the page.</p>}
      {!error && isLoading && !data && <div style={{ height: 520, marginTop: 24, background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 6 }} />}
      {snapshots.length > 0 && (isPdf ? (
        snapshots.map((s) => (
          <div key={s.subSector} style={{ breakBefore: "page", paddingTop: 40 }}>
            <SnapshotCard s={s} period={period} region={region} t={t} isMobile={false} />
          </div>
        ))
      ) : (
        <>
          <SubSectorPicker snapshots={snapshots} value={active?.subSector ?? null} onChange={setSelected} t={t} isMobile={isMobile} />
          {active && <SnapshotCard s={active} period={period} region={region} t={t} isMobile={isMobile} />}
        </>
      ))}
    </div>
  );
}

// ── Selector: pills grouped by sector (dropdown on mobile) ────────────────────

function SubSectorPicker({ snapshots, value, onChange, t, isMobile }: {
  snapshots: Snapshot[]; value: string | null; onChange: (v: string) => void; t: Theme; isMobile: boolean;
}) {
  const groups = snapshots.reduce<Record<string, Snapshot[]>>((acc, s) => ({ ...acc, [s.sector]: [...(acc[s.sector] ?? []), s] }), {});
  if (isMobile) {
    return (
      <label style={{ display: "block", margin: "20px 0 8px" }}>
        <span style={{ display: "block", fontFamily: MONO, fontSize: 9, letterSpacing: 2, color: t.textMuted, textTransform: "uppercase", marginBottom: 8 }}>Sub-sector</span>
        <select value={value ?? ""} onChange={(e) => onChange(e.target.value)}
          style={{ width: "100%", padding: "10px 12px", fontFamily: MONO, fontSize: 12, color: t.text, background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 8 }}>
          {Object.entries(groups).map(([sector, list]) => (
            <optgroup key={sector} label={styleOf(sector).label}>
              {list.map((s) => <option key={s.subSector} value={s.subSector}>{s.subSector}</option>)}
            </optgroup>
          ))}
        </select>
      </label>
    );
  }
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 20, margin: "24px 0 8px" }}>
      {Object.entries(groups).map(([sector, list]) => {
        const st = styleOf(sector);
        return (
          <div key={sector}>
            <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: 2, color: st.main, textTransform: "uppercase", marginBottom: 8, fontWeight: 700 }}>{st.label}</div>
            <div style={{ display: "inline-flex", flexWrap: "wrap", background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 20, padding: 3, gap: 2 }}>
              {list.map((s) => {
                const on = s.subSector === value;
                return (
                  <button key={s.subSector} type="button" aria-pressed={on} onClick={() => onChange(s.subSector)}
                    style={{ fontFamily: MONO, fontSize: 10, letterSpacing: 1, padding: "5px 14px", borderRadius: 16, border: "none", cursor: "pointer", outline: "none",
                      background: on ? st.main : "transparent", color: on ? "#fff" : t.textMuted, fontWeight: on ? 700 : 400, transition: "all 0.18s" }}>
                    {s.subSector}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── One snapshot ─────────────────────────────────────────────────────────────

function SnapshotCard({ s, period, region, t, isMobile }: { s: Snapshot; period: Period; region: RegionCode | null; t: Theme; isMobile: boolean }) {
  const st = styleOf(s.sector);
  const years = periodYears(period);
  const bars = years.map((y) => s.timeline.find((r) => Number(r.year) === y) ?? { year: y, total_m: 0, deals: 0 });
  const periodTotal = bars.reduce((a, b) => a + b.total_m, 0);
  const y2026 = s.timeline.find((r) => Number(r.year) === 2026)?.total_m ?? 0;
  const caption = subSectorCaption({ subSector: s.subSector, period, region, timeline: s.timeline, janOct2025: s.janOct2025, subSubSectors: s.subSubSectors, businessModels: s.businessModels });
  const totalLabel = period === "2026" ? "Total (2026 Jan–Oct / 2025 Jan–Oct)" : "Total (2021–2025 / 2026 Jan–Oct)";
  const totalValue = period === "2026" ? `${money(y2026)} / ${money(s.janOct2025.total_m)}` : `${money(periodTotal)} / ${money(y2026)}`;
  const subColors = [st.main, st.second, ...EXTRA_SLICE_COLORS];

  return (
    <div style={{ marginTop: 20, background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 6, padding: isMobile ? 16 : 32 }}>
      <div style={{ fontFamily: DISPLAY, fontSize: isMobile ? 26 : 38, lineHeight: 1, color: BRAND.pink }}>Sub-Sector Snapshot:</div>
      <div style={{ fontFamily: DISPLAY, fontSize: isMobile ? 26 : 38, lineHeight: 1.05, color: t.titleColor, marginTop: 4 }}>{s.subSector} {periodTitle(period)}</div>
      <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: 2, color: st.main, textTransform: "uppercase", marginTop: 8 }}>{st.label}</div>
      <p style={{ fontSize: 14, color: t.textMuted, lineHeight: 1.8, maxWidth: 760, margin: "14px 0 0" }}>{caption}</p>

      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1.4fr 1fr", gap: isMobile ? 28 : 40, marginTop: 28 }}>
        <div>
          <BlockTitle t={t}>Funding Amounts</BlockTitle>
          <div style={{ display: "inline-block", background: t.bg, border: `1px solid ${t.border}`, borderRadius: 4, padding: "8px 12px", margin: "4px 0 16px" }}>
            <div style={{ fontFamily: MONO, fontSize: 10, color: t.textMuted }}>{totalLabel}</div>
            <div style={{ fontFamily: MONO, fontSize: 14, color: BRAND.pink, fontWeight: 700, marginTop: 2 }}>{totalValue}</div>
          </div>
          <SnapshotBars bars={bars} t={t} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          <div>
            <BlockTitle t={t}>Funding per Sub-Sub-Sector</BlockTitle>
            <Donut slices={s.subSubSectors} colors={(i) => subColors[i % subColors.length]} t={t} />
          </div>
          <div>
            <BlockTitle t={t}>B2B vs B2C Funding</BlockTitle>
            <Donut slices={s.businessModels} colors={(i, name) => MODEL_COLORS[name] ?? EXTRA_SLICE_COLORS[i % EXTRA_SLICE_COLORS.length]} t={t} />
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: isMobile ? 28 : 32, marginTop: 36 }}>
        <RankTable t={t} title="Top Funded Countries" headers={["#", "Country", "Amount ($M)", "Top City"]}
          rows={s.topCountries.map((c, i) => [
            String(i + 1),
            <span key="c" style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>{getCountryFlag(c.country)}<span style={{ fontWeight: 600, color: t.text }}>{c.country}</span></span>,
            <span key="a" style={{ color: BRAND.pink }}>{c.total_m.toLocaleString("en-US")}</span>,
            c.top_city ?? "—",
          ])} />
        <RankTable t={t} title="Top Funded Companies" headers={["#", "Company", "Amount ($M)", "HQ City"]}
          rows={s.topCompanies.map((c, i) => [
            String(i + 1),
            <CompanyCell key="c" name={c.name} website={c.website} logoUrl={c.logo_url} color={st.main} t={t} />,
            <span key="a" style={{ color: BRAND.pink }}>{c.total_m.toLocaleString("en-US")}</span>,
            <span key="h" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>{c.country ? getCountryFlag(c.country) : null}{c.city ?? c.country ?? "—"}</span>,
          ])} />
      </div>
    </div>
  );
}

function BlockTitle({ children, t }: { children: ReactNode; t: Theme }) {
  return <div style={{ fontFamily: DISPLAY, fontSize: 22, letterSpacing: 0.5, color: t.titleColor, marginBottom: 6 }}>{children}</div>;
}

/** Yearly bars with $M labels and a rounds row, in the report's chart style. */
function SnapshotBars({ bars, t }: { bars: { year: number; total_m: number; deals: number }[]; t: Theme }) {
  const max = Math.max(1, ...bars.map((b) => b.total_m));
  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 10, height: 220, borderBottom: `1px solid ${t.border}`, paddingTop: 24 }}>
        {bars.map((b, i) => (
          <div key={b.year} title={`${b.year === 2026 ? "2026 (Jan–Oct)" : b.year}: ${money(b.total_m)} across ${b.deals} rounds`}
            style={{ flex: 1, height: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end", alignItems: "center" }}>
            <span style={{ fontFamily: MONO, fontSize: 10, color: t.textSec, fontWeight: 600, marginBottom: 4 }}>{b.total_m.toLocaleString("en-US")}</span>
            <div style={{ width: "100%", maxWidth: 64, height: `${(b.total_m / max) * 100}%`, minHeight: b.total_m > 0 ? 2 : 0, borderRadius: "3px 3px 0 0",
              background: i % 2 === 0 ? `linear-gradient(to top,${BRAND.teal},${BRAND.teal}cc)` : `linear-gradient(to top,${BRAND.execsSec},${BRAND.execsSec}88)` }} />
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
        {bars.map((b) => (
          <div key={b.year} style={{ flex: 1, textAlign: "center", fontFamily: MONO, fontSize: 10, color: t.textMuted }}>{b.year === 2026 ? "2026 (Jan–Oct)" : b.year}</div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 10, marginTop: 8, background: t.tableRowAlt, borderRadius: 4, padding: "6px 0" }}>
        {bars.map((b) => (
          <div key={b.year} style={{ flex: 1, textAlign: "center", fontFamily: MONO, fontSize: 11, color: t.text }}>{b.deals}</div>
        ))}
      </div>
      <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: 2, color: t.textMuted, textTransform: "uppercase", marginTop: 6 }}>Rounds per year · amounts in $M</div>
    </div>
  );
}

/** SVG donut + legend with % of funding. */
function Donut({ slices, colors, t }: { slices: Slice[]; colors: (i: number, name: string) => string; t: Theme }) {
  const total = slices.reduce((a, s) => a + s.total_m, 0);
  if (total <= 0) return <div style={{ fontFamily: MONO, fontSize: 11, color: t.textMuted, padding: "16px 0" }}>No disclosed funding for this selection.</div>;
  const R = 52, C = 2 * Math.PI * R;
  // Each slice's arc length and where it starts (sum of the slices before it).
  const arcs = slices.map((s) => (s.total_m / total) * C);
  const starts = arcs.map((_, i) => arcs.slice(0, i).reduce((a, b) => a + b, 0));
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
      <svg width={140} height={140} viewBox="0 0 140 140" role="img" aria-label={slices.map((s) => `${s.name} ${((s.total_m / total) * 100).toFixed(1)}%`).join(", ")} style={{ flexShrink: 0 }}>
        <g transform="rotate(-90 70 70)">
          {slices.map((s, i) => (
            <circle key={s.name} cx={70} cy={70} r={R} fill="none" stroke={colors(i, s.name)} strokeWidth={26}
              strokeDasharray={`${arcs[i]} ${C - arcs[i]}`} strokeDashoffset={-starts[i]} />
          ))}
        </g>
      </svg>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 0 }}>
        {slices.map((s, i) => (
          <div key={s.name} style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: colors(i, s.name), flexShrink: 0, alignSelf: "center" }} />
            <span style={{ fontSize: 13, color: t.text, fontWeight: 600 }}>{s.name}</span>
            <span style={{ fontFamily: MONO, fontSize: 11, color: t.textMuted }}>{((s.total_m / total) * 100).toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CompanyCell({ name, website, logoUrl, color, t }: { name: string; website: string | null; logoUrl: string | null; color: string; t: Theme }) {
  const src = companyLogoSrc(logoUrl, website);
  const tile = (
    <span style={{ width: 26, height: 26, borderRadius: 4, overflow: "hidden", position: "relative", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      {/* eslint-disable-next-line @next/next/no-img-element -- external favicon/logo URLs; same as the rest of the report */}
      {src && <img src={src} alt="" width={26} height={26} style={{ objectFit: "contain", position: "absolute", inset: 0, width: "100%", height: "100%", background: "#fff", borderRadius: 4, zIndex: 1 }} onError={(e) => { e.currentTarget.style.display = "none"; }} />}
      <span style={{ width: 26, height: 26, background: color, borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 11, fontFamily: DISPLAY }}>{name.charAt(0)}</span>
    </span>
  );
  const href = websiteHref(website);
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 10, minWidth: 0 }}>
      {href ? <a href={href} target="_blank" rel="noopener noreferrer" style={{ lineHeight: 0 }}>{tile}</a> : tile}
      <span style={{ fontWeight: 600, color: t.text, overflow: "hidden", textOverflow: "ellipsis" }}>{name}</span>
    </span>
  );
}

function RankTable({ title, headers, rows, t }: { title: string; headers: string[]; rows: ReactNode[][]; t: Theme }) {
  return (
    <div>
      <BlockTitle t={t}>{title}</BlockTitle>
      <div style={{ border: `1px solid ${t.border}`, borderRadius: 4, overflow: "hidden", marginTop: 8 }}>
        <div style={{ display: "grid", gridTemplateColumns: "28px 1.6fr 1fr 1.1fr", gap: "0 10px", padding: "10px 14px", background: BRAND.darkTitle, fontFamily: MONO, fontSize: 9, letterSpacing: 1.5, textTransform: "uppercase", color: "#fff" }}>
          {headers.map((h) => <span key={h}>{h}</span>)}
        </div>
        {rows.length === 0 && <div style={{ padding: "16px 14px", fontSize: 13, color: t.textMuted }}>No data for this selection.</div>}
        {rows.map((r, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "28px 1.6fr 1fr 1.1fr", gap: "0 10px", padding: "12px 14px", borderTop: `1px solid ${t.border}`, background: i % 2 ? t.tableRowAlt : "transparent", fontSize: 13, color: t.textMuted, alignItems: "center" }}>
            {r.map((cell, j) => <span key={j} style={{ minWidth: 0 }}>{cell}</span>)}
          </div>
        ))}
      </div>
    </div>
  );
}
