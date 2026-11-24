"use client";

/**
 * GSTVCR26 · Unicorns. Sits after the Ecosystem section.
 * List and valuations: ./unicorns-data (the Unicorns 2026 analysis sheet).
 * Links, logos and equity raised: live from Atlas (GET /api/reports/gstvcr26/unicorns),
 * matched by website. The section renders fully without them; rows just lose their links.
 * Web and PDF share this component; in PDF nothing depends on hover or clicks.
 */
import React, { useMemo, useState } from "react";
import useSWR from "swr";
import { BRAND } from "./brand";
import { getCountryFlag } from "./flags";
import { companyLogoSrc } from "./logos";
import { money } from "./format";
import { SECTOR_LABEL } from "./sector-labels";
import {
  SECTOR_COLORS, STATUS_LABELS, UNICORNS, UNICORN_DOMAINS, UNICORN_EXITS, UNICORN_PENDING,
  UNICORNS_2025_COUNT, UNICORNS_2025_VALUE_B, type Unicorn, type UnicornContinent,
} from "./unicorns-data";
import {
  billions, byContinent, byModel, bySector, byStatus, movers, newEntrants, pct, ranked, staleMarks, sumValue, STALE_MARK_YEAR,
  type Share,
} from "./unicorns-stats";
import { UnicornsMap } from "./unicorns-map";

type SectionTheme = { bg: string; bgSec: string; bgCard: string; text: string; textMuted: string; border: string; titleColor: string };
type CompanyLink = { domain: string; slug: string | null; logo_url: string | null; total_raised_m: number; rounds: number };

const MONO = "'DM Mono',monospace";
const DISPLAY = "'Bebas Neue',sans-serif";
const UP = BRAND.teal;
const DOWN = BRAND.pink;
const STATUS_COLORS = { private: BRAND.darkTitle, public: BRAND.tealBright, owned: BRAND.lightBlue } as const;
const MODEL_COLORS = { B2C: BRAND.b2c, B2B: BRAND.b2b, B2B2C: BRAND.slate } as const;

export interface UnicornsCopy { eyebrow: string; title: string; intro: string }

const eyebrow = (text: string, color: string = BRAND.teal): React.ReactNode => (
  <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: 3, color, textTransform: "uppercase", marginBottom: 14 }}>{text}</div>
);
const card = (t: SectionTheme): React.CSSProperties => ({ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 10, padding: 20, breakInside: "avoid" });
const companyHref = (link: CompanyLink | undefined): string | undefined => (link?.slug ? `/companies/${link.slug}` : undefined);

function useCompanyLinks(): Map<string, CompanyLink> {
  const { data } = useSWR<{ companies: CompanyLink[] }>(["/api/reports/gstvcr26/unicorns", { domains: UNICORN_DOMAINS.join(",") }]);
  return useMemo(() => new Map((data?.companies ?? []).map((c) => [c.domain, c])), [data]);
}

function Logo({ name, domain, link, size = 28 }: { name: string; domain: string; link?: CompanyLink; size?: number }) {
  const [failed, setFailed] = useState(false);
  const src = companyLogoSrc(link?.logo_url, `https://${domain}`);
  return (
    <div style={{ width: size, height: size, borderRadius: 6, background: "#fff", border: "1px solid #e5e7eb", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0, fontFamily: MONO, fontSize: 10, color: BRAND.darkTitle }}>
      {/* Favicons from many external hosts; next/image would need each host allow-listed. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {src && !failed ? <img src={src} alt="" width={size - 8} height={size - 8} onError={() => setFailed(true)} style={{ objectFit: "contain" }} /> : name.slice(0, 2).toUpperCase()}
    </div>
  );
}

function CompanyName({ name, link, t }: { name: string; link?: CompanyLink; t: SectionTheme }) {
  const href = companyHref(link);
  const style: React.CSSProperties = { fontSize: 13, fontWeight: 600, color: t.titleColor, textDecoration: "none" };
  return href ? <a href={href} target="_blank" rel="noopener noreferrer" style={style}>{name} <span style={{ color: BRAND.pink, fontSize: 11 }}>↗</span></a> : <span style={style}>{name}</span>;
}

/** 100%-wide stacked bar with a legend underneath. */
function MixBar<K extends string>({ title, parts, colors, labels, by, t }: {
  title: string; parts: Share<K>[]; colors: Record<K, string>; labels: Record<K, string>; by: "count" | "value"; t: SectionTheme;
}) {
  const total = parts.reduce((s, p) => s + p[by], 0);
  return (
    <div>
      <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: 2, color: t.textMuted, textTransform: "uppercase", marginBottom: 8 }}>{title}</div>
      <div style={{ display: "flex", height: 14, borderRadius: 3, overflow: "hidden" }}>
        {parts.filter((p) => p[by] > 0).map((p) => <div key={p.key} style={{ width: pct(p[by], total), background: colors[p.key] }} />)}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 14px", marginTop: 8 }}>
        {parts.filter((p) => p[by] > 0).map((p) => (
          <span key={p.key} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: t.text }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: colors[p.key] }} />
            {labels[p.key]} <span style={{ fontFamily: MONO, color: t.textMuted }}>{by === "count" ? p.count : billions(p.value)} · {pct(p[by], total)}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function MoversChart({ rows, t }: { rows: Unicorn[]; t: SectionTheme }) {
  const list = movers(rows);
  const max = Math.max(...list.map((m) => Math.abs(m.delta)), 1);
  return (
    <div style={card(t)}>
      {eyebrow("Valuation moves since the 2025 list ($B)")}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {list.map((m) => {
          // Bars use up to 38% each side of the axis, leaving the outer edge for the value label.
          const w = `${(Math.abs(m.delta) / max) * 38}%`;
          const up = m.delta > 0;
          return (
            <div key={m.name} style={{ display: "grid", gridTemplateColumns: "34% 1fr", alignItems: "center", gap: 10 }}>
              <div style={{ fontSize: 12, color: t.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={`${m.name}: ${billions(m.from)} → ${billions(m.to)}`}>{m.name}</div>
              <div style={{ position: "relative", height: 16 }}>
                <div style={{ position: "absolute", left: "50%", top: -2, bottom: -2, width: 1, background: t.border }} />
                <div style={{ position: "absolute", top: 2, height: 12, borderRadius: 2, background: up ? UP : DOWN, width: w, ...(up ? { left: "50%" } : { right: "50%" }) }} />
                <div style={{ position: "absolute", top: 0, fontFamily: MONO, fontSize: 10, color: up ? UP : DOWN, ...(up ? { right: 0 } : { left: 0 }) }}>{up ? "+" : ""}{m.delta.toFixed(1)}</div>
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ fontSize: 11, lineHeight: 1.5, color: t.textMuted, marginTop: 12 }}>
        Listed companies are marked to market; private ones move only on a new round or deal. DAZN and Topgolf are left out: their 2025 figures were corrected, not revalued.
      </div>
    </div>
  );
}

/** Joined / left / on the cusp: one card, one line per company. */
function InOut({ links, t, isMobile }: { links: Map<string, CompanyLink>; t: SectionTheme; isMobile: boolean }) {
  const groups = [
    { title: "Joined", color: UP, items: newEntrants(UNICORNS).map((x) => ({ name: x.name, domain: x.domain, value: billions(x.val2026), short: x.short ?? "", note: x.basis })) },
    { title: "Left the list", color: DOWN, items: UNICORN_EXITS.map((x) => ({ name: x.name, domain: x.domain, value: billions(x.val2025), short: x.short, note: x.reason })) },
    { title: "On the cusp", color: BRAND.slate, items: UNICORN_PENDING.map((x) => ({ name: x.name, domain: x.domain, value: billions(x.val2026), short: x.short, note: `${x.note}. Not counted until confirmed.` })) },
  ];
  return (
    <div style={{ ...card(t), display: "grid", gridTemplateColumns: isMobile ? "minmax(0,1fr)" : "repeat(3, minmax(0,1fr))", gap: isMobile ? 18 : 28 }}>
      {groups.map((g) => (
        <div key={g.title} style={{ minWidth: 0 }}>
          {eyebrow(`${g.title} · ${g.items.length}`, g.color)}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {g.items.map((x) => (
              <div key={x.name} title={x.note} style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                <Logo name={x.name} domain={x.domain} link={links.get(x.domain)} size={20} />
                <div style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  <CompanyName name={x.name} link={links.get(x.domain)} t={t} />
                  <span style={{ fontSize: 11, color: t.textMuted, marginLeft: 6 }}>{x.short}</span>
                </div>
                <span style={{ fontFamily: MONO, fontSize: 11, color: g.color, flexShrink: 0 }}>{x.value}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

const LIST_PREVIEW = 8;
type Tab = UnicornContinent | "All";

/** Ranked unicorns for one continent tab: compact rows, the basis on hover. */
function UnicornList({ rows, links, t, showAll, isPdf }: { rows: Unicorn[]; links: Map<string, CompanyLink>; t: SectionTheme; showAll: boolean; isPdf: boolean }) {
  const list = ranked(rows);
  const visible = isPdf || showAll ? list : list.slice(0, LIST_PREVIEW);
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {visible.map((r) => {
        const link = links.get(r.domain);
        const delta = r.val2025 === null ? null : Math.round((r.val2026 - r.val2025) * 10) / 10;
        const deltaText = delta === null ? "NEW" : r.prevCorrected || delta === 0 ? "" : `${delta > 0 ? "+" : ""}${delta.toFixed(1)}`;
        const raised = link && link.total_raised_m > 0 ? ` · ${money(link.total_raised_m)} raised` : "";
        return (
          <div key={r.name} title={`${r.basis}${raised}`} style={{ display: "grid", gridTemplateColumns: "22px 28px 1fr auto 44px", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: `1px solid ${t.border}`, breakInside: "avoid" }}>
            <span style={{ fontFamily: MONO, fontSize: 10, color: t.textMuted }}>{list.indexOf(r) + 1}</span>
            <Logo name={r.name} domain={r.domain} link={link} />
            <div style={{ minWidth: 0 }}>
              <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}><CompanyName name={r.name} link={link} t={t} /></div>
              <div style={{ fontSize: 10, color: t.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                <span style={{ display: "inline-block", width: 7, height: 7, borderRadius: "50%", background: SECTOR_COLORS[r.sector], marginRight: 5 }} />
                {getCountryFlag(r.country)} {r.city} · {STATUS_LABELS[r.status]}
              </div>
            </div>
            <a href={r.source} target="_blank" rel="noopener noreferrer" style={{ fontFamily: DISPLAY, fontSize: 20, color: t.titleColor, textDecoration: "none", textAlign: "right" }}>{billions(r.val2026)}</a>
            <span style={{ fontFamily: MONO, fontSize: 10, textAlign: "right", color: delta === null ? BRAND.pink : delta > 0 ? UP : DOWN }}>{deltaText}</span>
          </div>
        );
      })}
    </div>
  );
}

export function UnicornsSection({ copy, t, isDark, isMobile, isPdf }: { copy: UnicornsCopy; t: SectionTheme; isDark: boolean; isMobile: boolean; isPdf: boolean }) {
  const links = useCompanyLinks();
  const [tab, setTab] = useState<Tab>("All");
  const [showAll, setShowAll] = useState(false);
  const pick = (next: Tab) => { setTab(next); setShowAll(false); };
  const shown = tab === "All" || isPdf ? UNICORNS : UNICORNS.filter((r) => r.continent === tab);

  const total = sumValue(UNICORNS);
  const top = ranked(UNICORNS);
  const largest = top.filter((r) => r.val2026 === top[0].val2026);
  const na = byContinent(UNICORNS).find((c) => c.key === "North America");
  const stale = staleMarks(UNICORNS);
  const sectorLabels = { fans: SECTOR_LABEL.fans, athletes: SECTOR_LABEL.athletes, execs: SECTOR_LABEL.execs };
  const tabs: { key: Tab; count: number }[] = [
    { key: "All", count: UNICORNS.length },
    ...byContinent(UNICORNS).filter((c) => c.count > 0).map((c) => ({ key: c.key as Tab, count: c.count })),
  ];
  const figures = [
    { value: billions(total), label: `combined valuation of ${UNICORNS.length} sportstech unicorns, vs ${billions(UNICORNS_2025_VALUE_B)} across ${UNICORNS_2025_COUNT} in 2025` },
    { value: billions(top[0].val2026), label: `largest: ${largest.map((r) => r.name).join(" and ")}` },
    { value: na ? pct(na.count, UNICORNS.length) : "–", label: `of unicorns are in North America, holding ${na ? pct(na.value, total) : "–"} of the value` },
    { value: String(stale.length), label: `private unicorns still carry a valuation set in ${STALE_MARK_YEAR} or earlier` },
  ];
  const tabStyle = (active: boolean): React.CSSProperties => ({
    fontFamily: MONO, fontSize: 9, letterSpacing: 0.5, textTransform: "uppercase", whiteSpace: "nowrap",
    padding: "5px 8px", borderRadius: 14, cursor: "pointer",
    border: `1px solid ${active ? BRAND.pink : t.border}`, background: active ? `${BRAND.pink}12` : "transparent", color: active ? BRAND.pink : t.textMuted,
  });

  return (
    <div style={{ padding: isMobile ? "48px 0" : "88px 0", background: t.bg }}>
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: isMobile ? "0 16px" : "0 40px", display: "flex", flexDirection: "column", gap: 24 }}>
        <div className="stx-reveal" style={{ display: "flex", justifyContent: "space-between", gap: isMobile ? 24 : 40, flexDirection: isMobile ? "column" : "row" }}>
          <div>
            <p style={{ fontFamily: MONO, fontSize: 10, letterSpacing: 4, color: BRAND.pink, textTransform: "uppercase", marginBottom: 14 }}>{copy.eyebrow}</p>
            <h2 style={{ fontFamily: DISPLAY, fontSize: "clamp(42px,6vw,88px)", lineHeight: 0.92, color: t.titleColor, whiteSpace: "pre-line", margin: 0 }}>{copy.title}</h2>
          </div>
          <div style={{ maxWidth: isMobile ? "100%" : 440, paddingTop: isMobile ? 0 : 28 }}>
            <p style={{ fontSize: 13, color: t.textMuted, lineHeight: 1.8, margin: "0 0 16px" }}>{copy.intro}</p>
            <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
              {bySector(UNICORNS).map((s) => (
                <span key={s.key} style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: MONO, fontSize: 10, letterSpacing: 2, color: t.textMuted, textTransform: "uppercase" }}>
                  <span style={{ width: 10, height: 10, borderRadius: "50%", background: SECTOR_COLORS[s.key] }} />{sectorLabels[s.key]}
                  <span style={{ color: SECTOR_COLORS[s.key], background: `${SECTOR_COLORS[s.key]}15`, padding: "1px 7px", borderRadius: 8 }}>{s.count}</span>
                </span>
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)", gap: 12 }}>
          {figures.map((f) => (
            <div key={f.label} style={{ ...card(t), padding: "18px 16px" }}>
              <div style={{ fontFamily: DISPLAY, fontSize: isMobile ? 34 : 46, lineHeight: 1, color: BRAND.pink }}>{f.value}</div>
              <div style={{ fontSize: 12, lineHeight: 1.5, color: t.textMuted, marginTop: 8 }}>{f.label}</div>
            </div>
          ))}
        </div>

        {/* Map + ranked list side by side: the list is visible straight away,
            one click on a tab (or a map bubble) filters it, no scrolling jumps. */}
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1.35fr 1fr", gap: 16, alignItems: "start" }}>
          <UnicornsMap rows={UNICORNS} selected={tab === "All" || isPdf ? null : tab} onSelect={(c) => pick(c ?? "All")} t={t} isDark={isDark} isPdf={isPdf} />
          <div style={card(t)}>
            {!isPdf && (
              <div role="tablist" aria-label="Filter by continent" style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                {tabs.map((x) => (
                  <button key={x.key} type="button" role="tab" aria-selected={tab === x.key} onClick={() => pick(x.key)} style={tabStyle(tab === x.key)}>
                    {x.key === "North America" ? "N. America" : x.key === "South America" ? "S. America" : x.key} {x.count}
                  </button>
                ))}
              </div>
            )}
            <UnicornList rows={shown} links={links} t={t} showAll={showAll} isPdf={isPdf} />
            {!isPdf && shown.length > LIST_PREVIEW && (
              <button type="button" onClick={() => setShowAll((v) => !v)} style={{ marginTop: 10, fontFamily: MONO, fontSize: 10, letterSpacing: 1, color: BRAND.pink, background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                {showAll ? "SHOW TOP 8 ▲" : `SHOW ALL ${shown.length} ▼`}
              </button>
            )}
            <div style={{ fontSize: 10, lineHeight: 1.5, color: t.textMuted, marginTop: 10 }}>
              $B, Oct–Nov 2026: market cap if listed, else the last priced round or deal. Hover a row for its basis; names open the Atlas profile.
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1.2fr 1fr", gap: 16 }}>
          <MoversChart rows={UNICORNS} t={t} />
          <div style={{ ...card(t), display: "flex", flexDirection: "column", gap: 20 }}>
            {eyebrow("What the club is made of")}
            <MixBar title="Sector, by count" parts={bySector(UNICORNS)} colors={SECTOR_COLORS} labels={sectorLabels} by="count" t={t} />
            <MixBar title="Sector, by value" parts={bySector(UNICORNS)} colors={SECTOR_COLORS} labels={sectorLabels} by="value" t={t} />
            <MixBar title="Business model" parts={byModel(UNICORNS)} colors={MODEL_COLORS} labels={{ B2C: "B2C", B2B: "B2B", B2B2C: "B2B2C" }} by="count" t={t} />
            <MixBar title="Ownership" parts={byStatus(UNICORNS)} colors={STATUS_COLORS} labels={STATUS_LABELS} by="count" t={t} />
          </div>
        </div>

        <InOut links={links} t={t} isMobile={isMobile} />
      </div>
    </div>
  );
}
