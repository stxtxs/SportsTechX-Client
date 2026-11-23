// @ts-nocheck
/* eslint-disable */
"use client";

import React, { useEffect, useRef, useState, useMemo, lazy, Suspense } from "react";
import useSWR from "swr";
import { qk } from "@/lib/query-keys";
import { track } from "@/lib/analytics";
import { ReportNav } from "../report-nav";
import { LandingFooter } from "@/components/landing/landing-footer";
import "@/components/landing/landing.css";
/* Same font set the Atlas site mounts on its .lp wrapper (app/page.tsx), so the
   shared footer renders exactly as on atlas.sportstechx.com. */
import { lpDisplay, lpMono, lpSerif } from "@/app/fonts";
import "./ftabr26.css";
import Lenis from "lenis";
import "lenis/dist/lenis.css";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import { getCountryFlag } from "./lib/flags";
import { BRAND, DARK, LIGHT, type Theme } from "./lib/report-theme";
import type {
  Ftabr26EcosystemEntry, Ftabr26LeaderRow as LeaderRow, Ftabr26CompanyRow as CompanyRow, Ftabr26YearRow as YearRow,
} from "./lib/ftabr26-types";
import { formatFtabr26Money, formatFtabr26Percent } from "./lib/ftabr26-format";
import {
  ecoHref, ecoLogoUrl, ecoFlagCode, startupLogoUrl, indexFtabr26Startups, lookupFtabr26Startups,
  ecoContinents, ecoLocations, startupMatchKey,
  type Ftabr26Startup, type Ftabr26ContinentId,
} from "./lib/ftabr26-ecosystem";
import { Ftabr26PersonAvatar } from "./components/ftabr26-person-avatar";
import { Ftabr26McoPanel } from "./components/ftabr26-mco-panel";
import { Ftabr26PersonDrawer } from "./components/ftabr26-person-drawer";
import { Ftabr26SoccermentFeature } from "./components/ftabr26-soccerment-feature";
import { Ftabr26PartnerHeader } from "./components/ftabr26-partner-header";
import { LockedPart, lockedNow } from "../locked-part";
import { Ftabr26AtlasCta } from "./components/ftabr26-atlas-cta";

/* The ecosystem map pulls in d3 and the world topojson, neither of which any
   other section needs — it loads when the reader gets there. */
const Ftabr26EcosystemMap = lazy(() => import("./components/ftabr26-ecosystem-map"));

/* ── Everything this page shows comes from reports.content (edited in the
   admin report editor); this file only lays it out. Keys per page block:
   page (hero, about, credits, partOrder, pageLabels, pageSummary, pageSectors,
   pagePrint) is always present; a block's keys are absent when it is locked
   for the reader, and the block then renders as <LockedPart>. */

/* Shapes of content items (the template is untyped, see the pragma above) */
type InsightArticle = any;
type WorldCupTech = any;
type FtabrInnovator = any;

gsap.registerPlugin(ScrollTrigger);

/* Pitch green — the report's highlight colour. Accents only: pitch markings,
   card rules, table header bands and the Football Only data series. Body copy
   stays black, figures stay STX magenta, grey carries everything secondary. */
const PITCH       = BRAND.green;
const PITCH_LIGHT = BRAND.greenLight;
const PITCH_TINT  = "rgba(56,117,83,0.08)";
/* Cover: deep pitch green with 7 vertical mowed bands and tone-on-tone lines */
const COVER_BG      = "#1C332B";
const COVER_STRIPE  = "#213A31";
const COVER_LINES   = "#3A5C4F";
const COVER_STRIPES = `repeating-linear-gradient(90deg, ${COVER_BG} 0, ${COVER_BG} 14.2857%, ${COVER_STRIPE} 14.2857%, ${COVER_STRIPE} 28.5714%)`;
/* Innovators: one neutral ring for everyone; the region is shown as text */
const INNOVATOR_RING = BRAND.slate;
/* Loading / not-yet-published background (the route's loading colour) */
const LOADING_BG = "#2d3b49";
/* "13 Nov 2026" from an ISO date; `tbc` when there is none, the raw value if unparseable. */
const formatEventDate = (iso: string | null | undefined, tbc: string) => {
  if (!iso) return tbc;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
};

/* The two dealflow series read as pitch green against neutral grey */
const ONLY_COLOR = PITCH;
const ALSO_COLOR = BRAND.slate;

/* Tinted card with an accent edge — the drawer bodies are built from these. */
const drawerCardStyle = (accent: string, isDark: boolean): React.CSSProperties => ({
  background: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
  border: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)"}`,
  borderLeft: `3px solid ${accent}`,
  borderRadius: 14, padding: "14px 16px",
});

const fmt = formatFtabr26Money;

/* ─── Shared primitives (carried over from report-gster26.tsx) ─────────── */

function AccordionBody({ isOpen, windowWidth, children }: { isOpen: boolean; windowWidth: number; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);
  useEffect(() => {
    if (ref.current) setHeight(ref.current.scrollHeight);
  }, [isOpen, windowWidth, children]);
  useEffect(() => {
    if (!ref.current || !isOpen) return;
    const ro = new ResizeObserver(() => {
      if (ref.current) setHeight(ref.current.scrollHeight);
    });
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, [isOpen]);
  return (
    <div className={isOpen ? "ft26-acc-open" : undefined}
      style={{
        maxHeight: isOpen ? height : 0,
        opacity: isOpen ? 1 : 0,
        overflow: "hidden",
        overflowAnchor: "none" as const,
        transition: "max-height 0.45s cubic-bezier(0.4,0,0.2,1), opacity 0.45s cubic-bezier(0.4,0,0.2,1)",
      }}
    >
      <div ref={ref}>{children}</div>
    </div>
  );
}

function useWindowWidth() {
  const [w, setW] = useState(() => typeof window !== "undefined" ? window.innerWidth : 1200);
  useEffect(() => {
    const h = () => setW(window.innerWidth);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  return w;
}

function useReveal(dep?: unknown) {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add("stx-visible"); }),
      { threshold: 0.08 }
    );
    const els = document.querySelectorAll(".stx-reveal");
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [dep]);
}

function ParticleCanvas({ dark }: { dark: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let animId: number;
    const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; };
    resize();
    window.addEventListener("resize", resize);
    const particles = Array.from({ length: 70 }, () => ({
      x: Math.random() * (canvas.width || 800),
      y: Math.random() * (canvas.height || 600),
      r: Math.random() * 1.5 + 0.5,
      vx: (Math.random() - 0.5) * 0.35,
      vy: (Math.random() - 0.5) * 0.35,
      a: Math.random() * 0.4 + 0.1,
    }));
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of particles) {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(237,26,94,${p.a})`;
        ctx.fill();
      }
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x, dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 110) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(237,26,94,${0.05 * (1 - dist / 110)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }
      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => { window.removeEventListener("resize", resize); cancelAnimationFrame(animId); };
  }, [dark]);
  return <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />;
}

function AnimatedBar({ pct, color = PITCH, trackColor, delay = 0, isPdf = false }: { pct: number; color?: string; trackColor?: string; delay?: number; isPdf?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const [animated, setAnimated] = useState(isPdf);
  useEffect(() => {
    if (isPdf) return;
    const el = ref.current; if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setTimeout(() => setAnimated(true), delay); }, { threshold: 0.2 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [delay, isPdf]);
  return (
    <div ref={ref} style={{ height: 6, background: trackColor || "rgba(190,208,227,0.15)", borderRadius: 3, overflow: "hidden" }}>
      <div style={{ height: "100%", width: animated ? `${pct}%` : "0%", background: `linear-gradient(to right,${color},${color}bb)`, borderRadius: 3, transition: isPdf ? "none" : "width 1.2s cubic-bezier(0.16,1,0.3,1)" }} />
    </div>
  );
}

function ProgressRow({ label, value, pct, emoji, delay = 0, t, color, isPdf = false }: { label: string; value: string; pct: number; emoji?: React.ReactNode; delay?: number; t: Theme; color?: string; isPdf?: boolean }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ color: t.text, fontSize: 13, fontWeight: 500 }}>{emoji ? <>{emoji} </> : ""}{label}</span>
        <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 12, color: BRAND.pink, fontWeight: 600 }}>{value}</span>
      </div>
      <AnimatedBar pct={pct} delay={delay} color={color} trackColor={t.border} isPdf={isPdf} />
    </div>
  );
}

function StatCard({ num, label, t, subtitle, style, footer }: { num: React.ReactNode; label: string; t: Theme; subtitle?: string; style?: React.CSSProperties; footer?: React.ReactNode }) {
  return (
    <div className="stx-reveal"
      style={{ background: t.bgCard, padding: "36px 32px", position: "relative", overflow: "hidden", borderRadius: 14, border: `1px solid ${t.border}`, ...style }}>
      <div aria-hidden style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg,${PITCH},${PITCH}88)` }} />
      <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: "clamp(44px,4.5vw,64px)", color: BRAND.pink, lineHeight: 1 }}>{num}</div>
      <div style={{ marginTop: 10, fontSize: 14, fontWeight: 600, color: t.text, lineHeight: 1.4 }}>{label}</div>
      {subtitle && <div style={{ marginTop: 8, fontSize: 12, color: t.textMuted, lineHeight: 1.5 }}>{subtitle}</div>}
      {footer}
    </div>
  );
}

/* ─── Charts ──────────────────────────────────────────────────────────────
   SplitBarChart is the Football Only / Football Also two-series stacked bar,
   adapted from GSTER26's MaStackedBarChart (same geometry, same animation,
   same label treatment) so both reports read as one system.
   ──────────────────────────────────────────────────────────────────────── */

type SplitDatum = { label: string; only: number; also: number; roundsOnly: number; roundsAlso: number };

/* `tip`: the bar tooltip's wording around the two amounts (dataLabels.chartTip) */
function SplitBarChart({ data, tip, t, isPdf = false }: { data: SplitDatum[]; tip: { only: string; also: string }; t: Theme; isPdf?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const [animated, setAnimated] = useState(isPdf);
  useEffect(() => {
    if (isPdf) return;
    const el = ref.current; if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setAnimated(true); }, { threshold: 0.15 });
    obs.observe(el); return () => obs.disconnect();
  }, [isPdf]);
  const val = (d: SplitDatum) => ({ a: d.only, b: d.also });
  const maxTotal = Math.max(...data.map(d => { const v = val(d); return v.a + v.b; }));
  return (
    <div ref={ref} style={{ display: "flex", alignItems: "flex-end", gap: 10, height: 280, paddingBottom: 44, borderBottom: `1px solid ${t.border}`, position: "relative" }}>
      {data.map((d, i) => {
        const v = val(d);
        const total = v.a + v.b;
        const pct = maxTotal > 0 ? (total / maxTotal) * 100 : 0;
        const aPct = total > 0 ? (v.a / total) * 100 : 0;
        const bPct = total > 0 ? (v.b / total) * 100 : 0;
        const label = fmt(total);
        return (
          <div key={d.label}
            title={`${d.label}: ${fmt(d.only)}${tip.only}${fmt(d.also)}${tip.also}`}
            style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, height: "100%", justifyContent: "flex-end", cursor: "default" }}>
            <div style={{ width: "100%", height: animated ? `${pct}%` : "0%", transition: `height 1.4s cubic-bezier(0.16,1,0.3,1) ${i * 0.08}s`, position: "relative", minHeight: 4, borderRadius: "3px 3px 0 0", display: "flex", flexDirection: "column" }}>
              <span style={{ position: "absolute", top: -26, left: "50%", transform: "translateX(-50%)", fontFamily: "'DM Mono',monospace", fontSize: 10, color: BRAND.pink, whiteSpace: "nowrap", fontWeight: 700 }}>
                {label}
              </span>
              <div style={{ height: `${bPct}%`, background: `linear-gradient(to top,${ALSO_COLOR},${ALSO_COLOR}99)`, borderRadius: "3px 3px 0 0", minHeight: bPct > 0 ? 2 : 0 }} />
              <div style={{ height: `${aPct}%`, background: `linear-gradient(to top,${PITCH},${PITCH_LIGHT})`, borderRadius: bPct === 0 ? "3px 3px 0 0" : 0, minHeight: aPct > 0 ? 2 : 0 }} />
            </div>
            <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: t.textMuted, textAlign: "center" }}>
              {d.label}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* Donut for the sector-share splits */
function DonutChart({ slices, t, title, isPdf = false }: { slices: { label: string; pct: number; color: string }[]; t: Theme; title: string; isPdf?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const [animated, setAnimated] = useState(isPdf);
  useEffect(() => {
    if (isPdf) return;
    const el = ref.current; if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setAnimated(true); }, { threshold: 0.25 });
    obs.observe(el); return () => obs.disconnect();
  }, [isPdf]);
  const R = 62, STROKE = 26, C = 2 * Math.PI * R;
  let offset = 0;
  return (
    <div ref={ref} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
      <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: 2, color: t.textMuted, textTransform: "uppercase", textAlign: "center" }}>{title}</div>
      <svg width="170" height="170" viewBox="0 0 170 170" role="img" aria-label={title}>
        <g transform="translate(85,85) rotate(-90)">
          {slices.map((s) => {
            const len = (s.pct / 100) * C;
            const dash = animated ? `${len} ${C - len}` : `0 ${C}`;
            const el = (
              <circle key={s.label} r={R} fill="none" stroke={s.color} strokeWidth={STROKE}
                strokeDasharray={dash} strokeDashoffset={-offset}
                style={{ transition: isPdf ? "none" : "stroke-dasharray 1.1s cubic-bezier(0.16,1,0.3,1)" }} />
            );
            offset += len;
            return el;
          })}
        </g>
      </svg>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, width: "100%" }}>
        {slices.map(s => (
          <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: s.color, flexShrink: 0 }} />
            <span style={{ color: t.textMuted, flex: 1 }}>{s.label}</span>
            <span style={{ fontFamily: "'DM Mono',monospace", color: BRAND.pink, fontWeight: 700 }}>{formatFtabr26Percent(s.pct)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════ */
/* TABS                                                                    */
/* ═══════════════════════════════════════════════════════════════════════ */

/* Dealflow accordion ids per tab, in page order. */
const DF_GROUPS = {
  investment:   ["df-year", "df-region", "df-sector"],
  leaderboards: ["df-countries", "df-cities", "df-companies"],
} as const;

/* Tab bar without a native scrollbar. When the tabs overflow (mobile), soft
   left/right arrows appear on the side that has more to show. */
function TabStrip({ t, style, wrapStyle, children }: { t: any; style?: React.CSSProperties; wrapStyle?: React.CSSProperties; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [edge, setEdge] = useState({ left: false, right: false });
  const update = () => {
    const el = ref.current; if (!el) return;
    const left = el.scrollLeft > 2, right = el.scrollLeft + el.clientWidth < el.scrollWidth - 2;
    setEdge(e => (e.left === left && e.right === right ? e : { left, right }));
  };
  useEffect(() => {
    update();
    const el = ref.current;
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(update) : null;
    if (el && ro) ro.observe(el);
    window.addEventListener("resize", update);
    return () => { ro?.disconnect(); window.removeEventListener("resize", update); };
  }, []);
  const arrow = (dir: -1 | 1) => (
    <button type="button" aria-label={dir < 0 ? "Scroll tabs left" : "Scroll tabs right"}
      onClick={() => ref.current?.scrollBy({ left: dir * 220, behavior: "smooth" })}
      style={{ position: "absolute", top: 0, bottom: 2, [dir < 0 ? "left" : "right"]: 0, width: 36, zIndex: 2, border: "none", cursor: "pointer",
        color: t.textMuted, fontSize: 22, lineHeight: 1, padding: 0,
        background: `linear-gradient(${dir < 0 ? 90 : 270}deg, ${t.bg} 55%, transparent)` }}>
      {dir < 0 ? "‹" : "›"}
    </button>
  );
  return (
    <div style={{ position: "relative", ...wrapStyle }}>
      {edge.left && arrow(-1)}
      <div ref={ref} onScroll={update} className="ft26-tabstrip" style={{ ...style, overflowX: "auto", overflowY: "hidden", scrollbarWidth: "none" }}>
        {children}
      </div>
      {edge.right && arrow(1)}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════ */
/* MAIN REPORT                                                             */
/* ═══════════════════════════════════════════════════════════════════════ */

export default function ReportFTABR26({ slug = "ftabr26", content, preview = false }: {
  slug?: string;
  /** Content to render instead of fetching it — the admin editor's live preview passes its draft. */
  content?: Record<string, any> | null;
  preview?: boolean;
}) {
  // ── The report document (reports.content jsonb) — the only source of what this page shows ──
  const { data: doc, isLoading, error } = useSWR<{ content?: Record<string, any> | null; locked_parts?: string[] }>(content !== undefined ? null : qk.reports.detail(slug));
  const ov: Record<string, any> | null | undefined = content !== undefined ? content : doc?.content;
  const ready = !!ov?.pageLabels;
  /* Blocks drawn locked for this reader (their keys are absent from the document) */
  const locked = lockedNow(content, doc);
  const isLocked = (id: string) => locked.includes(id);

  /* page */
  const L = ov?.pageLabels;
  const PP = ov?.pagePrint;
  const FTABR26_HERO = ov?.hero;
  const FTABR26_ABOUT = ov?.about;
  const FTABR26_CREDITS = ov?.credits;
  const SUMMARY: { num: string; label: string; subtitle?: string }[] = ov?.pageSummary ?? [];
  const SECTORS: { key: "athletes" | "fans" | "execs"; label: string; color: string }[] = ov?.pageSectors ?? [];
  const SECTOR_COLOR: Record<string, string> = Object.fromEntries(SECTORS.map(x => [x.key, x.color]));
  const SECTOR_LABEL: Record<string, string> = Object.fromEntries(SECTORS.map(x => [x.key, x.label]));
  /* trends */
  const TL = ov?.trendsLabels;
  const FTABR26_INSIGHTS: InsightArticle[] = ov?.insights ?? [];
  const FTABR26_CREATOR_DEALS = ov?.creatorDeals ?? [];
  const FTABR26_WOMENS_MCO_GROUPS = ov?.womensMcoGroups ?? [];
  const FTABR26_WORLDCUP = ov?.worldcup;
  const WC_COLORS: Record<string, string> = ov?.trendsWorldcupColors ?? {};
  const INSIGHT_STYLE: Record<string, { circle?: boolean }> = ov?.trendsInsightStyle ?? {};
  /* featured / soccerment / partners */
  const FTABR26_FEATURED = ov?.featured;
  const FL = ov?.featuredLabels;
  const FTABR26_SOCCERMENT = ov?.soccerment;
  const SOL = ov?.soccermentLabels;
  const FTABR26_PARTNERS = ov?.partners ?? [];
  const PL = ov?.partnersLabels;
  /* innovators / startups */
  const IL = ov?.innovatorsLabels;
  const FTABR26_INNOVATORS: FtabrInnovator[] = ov?.innovators ?? [];
  const FTABR26_QUESTIONS = ov?.questions;
  const SL = ov?.startupsLabels;
  const FTABR26_PLAYMAKER_COMPANIES = ov?.playmakerCompanies;
  const FTABR26_STARTUPS_NOTE = ov?.startupsNote;
  /* ecomap */
  const ECL = ov?.ecomapLabels;
  const ECO_LOGOS: Record<string, string> = ov?.ecomapLogos ?? {};
  /* data */
  const DL = ov?.dataLabels;
  const FTABR26_METHODOLOGY = ov?.methodology;

  /* Imprint line, shared by the web page and the PDF:
     Published by … · email · website · Legal notice */
  const imprintLine = (linkColor: string) => {
    const im = FTABR26_CREDITS.imprint;
    const site = String(im.website).replace(/^https?:\/\//, "");
    return (<>
      {L.imprintPrefix}{im.publisher} · <a href={`mailto:${im.contact}`} style={{ color: linkColor }}>{im.contact}</a>
      {" · "}<a href={`https://${site}`} target="_blank" rel="noopener noreferrer" style={{ color: linkColor }}>{site}</a>
      {" · "}<a href={im.legalNotice.href} target="_blank" rel="noopener noreferrer" style={{ color: linkColor }}>{im.legalNotice.label}</a>
    </>);
  };
  const INSIGHT_TABS: { key: string; label: string; bonus?: true }[] = [
    ...FTABR26_INSIGHTS.map(a => ({ key: a.key, label: a.label })),
    ...(TL ? [{ key: TL.bonusTab.key, label: TL.bonusTab.label, bonus: true as const }] : []),
  ];
  /* World Cup tech, bucketed into its categories for the accordion; empty categories drop out. */
  const WORLDCUP_TECH_GROUPS: { category: string; items: WorldCupTech[] }[] =
    (ov?.worldcupTechCategories ?? [])
      .map(category => ({ category, items: (FTABR26_WORLDCUP?.tech ?? []).filter(item => item.category === category) }))
      .filter(group => group.items.length > 0);
  /* Featured company panel takes the company's own brand colour */
  const FEAT_COL = FTABR26_FEATURED?.brandColor;
  const featLabel: React.CSSProperties = { fontFamily: "'DM Mono',monospace", fontSize: 9, letterSpacing: 3, color: FEAT_COL, textTransform: "uppercase", margin: "0 0 8px" };
  const isPdf = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("pdf") === "true";

  /* Analytics: `<slug>_<event>`; the admin editor's preview isn't a reader */
  const trackFT = (event: string, props?: Record<string, any>) => {
    if (window.location.pathname.startsWith("/report-preview")) return;
    track(`${slug}_${event}`, { report: slug, ...props });
  };

  useEffect(() => { trackFT("page_view"); }, []);

  /* Track all external link clicks within the report */
  const reportContainerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = reportContainerRef.current;
    if (!el) return;
    const handler = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement).closest("a[href]") as HTMLAnchorElement | null;
      if (anchor && anchor.hostname !== window.location.hostname) {
        trackFT("external_link_click", { url: anchor.href, text: anchor.textContent?.slice(0, 60) });
      }
    };
    el.addEventListener("click", handler);
    return () => el.removeEventListener("click", handler);
  }, [ready, isPdf]);   // the container mounts once the document is in

  const lenisRef       = useRef<Lenis | null>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const heroContentRef = useRef<HTMLDivElement>(null);
  const navRef         = useRef<HTMLElement>(null);
  const skewWrapRef    = useRef<HTMLDivElement>(null);
  const navItemsRef    = useRef<{ href: string; label: string }[]>([]);
  navItemsRef.current  = L?.nav ?? [];

  /* The admin editor's preview aims at a part (`ftabr26:jump`); Lenis owns the
     scroll position, so the jump goes through it. */
  useEffect(() => {
    const onJump = (e: Event) => {
      openDfFor((e as CustomEvent<string>).detail);
      const el = document.querySelector((e as CustomEvent<string>).detail);
      if (!el) return;
      if (lenisRef.current) lenisRef.current.scrollTo(el as HTMLElement, { offset: -72, immediate: true });
      else (el as HTMLElement).scrollIntoView({ block: "start" });
    };
    window.addEventListener("ftabr26:jump", onJump);
    const onHash = () => openDfFor(window.location.hash);
    onHash();
    window.addEventListener("hashchange", onHash);
    return () => { window.removeEventListener("ftabr26:jump", onJump); window.removeEventListener("hashchange", onHash); };
  }, []);

  /* ── UI state ─────────────────────────────────────────────────────── */
  const [isDark, _setIsDark] = useState(false);
  const setIsDark = (v: boolean | ((d: boolean) => boolean)) => { _setIsDark(v); trackFT("theme_toggle"); };
  const [mobileMenuOpen, _setMobileMenuOpen] = useState(false);
  const setMobileMenuOpen = (v: boolean | ((o: boolean) => boolean)) => { _setMobileMenuOpen(v); trackFT("mobile_menu_toggle"); };

  /* null until the reader picks a tab: the first article */
  const [insightsTabPicked, _setInsightsTab] = useState<string | null>(null);
  const insightsTab = insightsTabPicked ?? FTABR26_INSIGHTS[0]?.key;
  const setInsightsTab = (v: string) => { _setInsightsTab(v); trackFT("tab_switch", { tab: "insights", value: v }); };
  /* World Cup tech is grouped into five category accordions, one open at a
     time. All start closed so the section opens as a compact five-row index of
     the categories rather than leading with one category's cards. */
  const [expandedWcCategory, _setExpandedWcCategory] = useState<string | null>(null);
  const setExpandedWcCategory = (v: string | null) => { _setExpandedWcCategory(v); if (v) trackFT("wc_category_expand", { category: v }); };


  const [ecoTab, _setEcoTab] = useState<"initiatives" | "accelerators">("initiatives");
  const setEcoTab = (v: "initiatives" | "accelerators") => { _setEcoTab(v); trackFT("tab_switch", { tab: "ecosystem", value: v }); };
  /* Continent picked on the ecosystem map; null is the whole world. */
  const [ecoRegion, _setEcoRegion] = useState<Ftabr26ContinentId | null>(null);
  const setEcoRegion = (v: Ftabr26ContinentId | null) => {
    _setEcoRegion(v);
    trackFT(v ? "ecomap_continent_click" : "ecomap_continent_clear", { continent: v ?? undefined });
  };

  const [dataTab, _setDataTab] = useState<"investment" | "leaderboards">("investment");
  const setDataTab = (v: "investment" | "leaderboards") => { _setDataTab(v); trackFT("tab_switch", { tab: "data_in_full", value: v }); };
  /* Dealflow sub-sections are accordions (same pattern as the WC26 recap).
     The first in each tab starts open; the PDF prints everything open. */
  const [dfOpen, setDfOpen] = useState<Record<string, boolean>>({ "df-year": true, "df-countries": true });
  function openDfFor(anchor?: string | null) {
    const id = (anchor ?? "").replace(/^#/, "");
    const tab = (Object.keys(DF_GROUPS) as (keyof typeof DF_GROUPS)[]).find(k => (DF_GROUPS[k] as readonly string[]).includes(id));
    if (!tab) return;
    _setDataTab(tab);
    setDfOpen(o => ({ ...o, [id]: true }));
  }
  const [leaderCat, _setLeaderCat] = useState<"only" | "also">("only");
  const setLeaderCat = (v: "only" | "also") => { _setLeaderCat(v); trackFT("filter", { filter: "category", value: v }); };
  const [leaderWindow, _setLeaderWindow] = useState<"allTime" | "recent">("allTime");
  const setLeaderWindow = (v: "allTime" | "recent") => { _setLeaderWindow(v); trackFT("filter", { filter: "window", value: v }); };
  /* Ranks 6-10 of the country and city boards start collapsed, keyed by board
     so the two sides open independently. The category and window toggles leave
     the state alone: a reader who opened the long list wants it to stay open
     while comparing 'Football Only' against 'Football Also'. */
  const [leaderExpanded, _setLeaderExpanded] = useState<Record<string, boolean>>({});
  const toggleLeaderExpanded = (board: string) => {
    _setLeaderExpanded(prev => {
      const next = !prev[board];
      if (next) trackFT("leaderboard_expand", { board, category: leaderCat, window: leaderWindow });
      return { ...prev, [board]: next };
    });
  };

  const [selectedInnovator, _setSelectedInnovator] = useState<FtabrInnovator | null>(null);
  const setSelectedInnovator = (v: FtabrInnovator | null) => {
    _setSelectedInnovator(v);
    if (v) trackFT("innovator_click", { name: v.name });
  };

  const [activeDot, setActiveDot] = useState(0);
  /* The print document is laid out at A4 width whatever the reader's window is */
  const viewportWidth = useWindowWidth();
  const windowWidth = isPdf ? 794 : viewportWidth;
  const isMobile = windowWidth < 640;
  const t: Theme = isDark ? DARK : LIGHT;

  /* Figures as published, stored with the report (complete, in reports.content) */
  const facts = ov?.facts;

  /* Ecosystem rows. Events show only when upcoming (dated today or later), soonest first. */
  const liveEco = ov?.ecosystem;
  const eco = useMemo(() => liveEco ? {
    initiatives: (liveEco.initiatives ?? []) as Ftabr26EcosystemEntry[],
    programs: (liveEco.programs ?? []) as Ftabr26EcosystemEntry[],
    events: (Array.isArray(liveEco.events) ? liveEco.events : [])
      .filter(e => e && e.name && (!e.startDate || new Date(e.startDate).getTime() >= Date.now() - 864e5))
      .sort((a, b) => String(a.startDate ?? "9999").localeCompare(String(b.startDate ?? "9999"))) as Ftabr26EcosystemEntry[],
  } : null, [liveEco]);

  /* What the tables show: the whole world, or one continent once the map is
     used. A row the master tables leave unplaceable matches no continent, so
     it appears only in the unfiltered view — the map footnotes how many. */
  const ecoShown = useMemo(() => {
    if (!eco || !ecoRegion) return eco;
    /* A row in several regions (PSG Labs: Europe & Asia) is listed under each */
    const only = (rows: Ftabr26EcosystemEntry[]) => rows.filter(r => ecoContinents(r).includes(ecoRegion));
    return {
      ...eco,
      initiatives: only(eco.initiatives),
      programs: only(eco.programs),
    };
  }, [eco, ecoRegion]);

  /* Land the reader on a tab that has rows. Set without tracking — the reader
     did not pick this. */
  useEffect(() => {
    if (!ecoRegion || !ecoShown) return;
    const sizes = {
      initiatives: ecoShown.initiatives.length,
      accelerators: ecoShown.programs.length,
    } as const;
    if (sizes[ecoTab] > 0) return;
    const next = (["initiatives", "accelerators"] as const).find(k => sizes[k] > 0);
    if (next) _setEcoTab(next);
  }, [ecoRegion, ecoShown, ecoTab]);

  /* Startups to Watch shows only the Playmakers companies, A–Z, joined to the
     startups feed for description, sector, logo and site. A company missing
     from the feed still renders, from the roster's own name and country. */
  const liveStartups = ov?.startups;
  const watchStartups = useMemo<Ftabr26Startup[]>(() => {
    if (!liveStartups || !FTABR26_PLAYMAKER_COMPANIES) return [];
    const index = indexFtabr26Startups(liveStartups.startups ?? []);
    return FTABR26_PLAYMAKER_COMPANIES.map(pc =>
      lookupFtabr26Startups(index, pc.startupKeys)[0] ??
        { name: pc.company, website: null, country: pc.country, description: null, sector: null, logoUrl: null },
    ).sort((a, b) => a.name.localeCompare(b.name, "en", { sensitivity: "base" }));
  }, [liveStartups, FTABR26_PLAYMAKER_COMPANIES]);
  /* Card location: the record's HQ city, else the edition's HQ city by match
     key (startupsCities.hq), shown under its English name (startupsCities.display). */
  const startupLocation = (c: { name: string; country?: string | null; city?: string | null }) => {
    const SC = ov?.startupsCities ?? { hq: {}, display: {} };
    const raw = c.city || SC.hq[startupMatchKey(c.name)] || null;
    return { city: raw ? (SC.display[raw] ?? raw) : null, country: c.country ?? null };
  };

  /* Dealflow prose, stored as published */
  const dealflowCopy = ov?.dataCopy;

  useReveal(`${isDark}-${insightsTab}-${watchStartups.length}-${ecoTab}-${dataTab}-${leaderCat}-${leaderWindow}-${ready}`);

  /* Freeze the page behind an open drawer. Lenis drives scrolling here, so a
     body overflow lock would not hold it. */
  useEffect(() => {
    if (!selectedInnovator) return;
    lenisRef.current?.stop();
    return () => { lenisRef.current?.start(); };
  }, [selectedInnovator]);

  /* ── Lenis + GSAP ScrollTrigger: smooth scroll + scroll-driven effects ── */
  useEffect(() => {
    if (isPdf) return; // skip animations in PDF mode
    const lenis = new Lenis({
      lerp: 0.08,
      smoothWheel: true,
      touchMultiplier: 1.2,
      wheelMultiplier: 0.85,
      overscroll: false,
    });
    lenisRef.current = lenis;

    const lenisRaf = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(lenisRaf);
    gsap.ticker.lagSmoothing(0);

    ScrollTrigger.scrollerProxy(document.body, {
      scrollTop(value?: number) {
        if (arguments.length && value !== undefined) lenis.scrollTo(value, { immediate: true });
        return lenis.animatedScroll;
      },
      getBoundingClientRect() {
        return { top: 0, left: 0, width: window.innerWidth, height: window.innerHeight };
      },
      pinType: "fixed",
    });
    const onSTRefresh = () => lenis.resize();
    ScrollTrigger.addEventListener("refresh", onSTRefresh);
    ScrollTrigger.refresh();

    const getSections = () =>
      navItemsRef.current.map(n => document.querySelector(n.href) as HTMLElement | null)
        .filter(Boolean) as HTMLElement[];

    const getActiveIdx = () => {
      const sections = getSections();
      let idx = 0;
      for (let i = 0; i < sections.length; i++) {
        const rect = sections[i].getBoundingClientRect();
        if (rect.top < window.innerHeight * 0.4) idx = i + 1;
      }
      return idx;
    };

    let lastDotIdx = -1;
    lenis.on("scroll", ({ progress }: { scroll: number; progress: number; direction: number }) => {
      if (progressBarRef.current) progressBarRef.current.style.transform = `scaleX(${progress})`;
      if (navRef.current) navRef.current.style.transform = "translateY(0)";
      const dotIdx = getActiveIdx();
      if (dotIdx !== lastDotIdx) { lastDotIdx = dotIdx; setActiveDot(dotIdx); }
      ScrollTrigger.update();
    });

    /* Horizontal swipe / trackpad pan → vertical section jump */
    let jumping = false;
    const jumpSection = (delta: number) => {
      if (jumping) return;
      jumping = true;
      const sections = getSections();
      const nextIdx = getActiveIdx() + delta;
      if (nextIdx <= 0) {
        lenis.scrollTo(0, { duration: 1.4, easing: (x: number) => Math.min(1, 1.001 - Math.pow(2, -10 * x)) });
      } else if (nextIdx <= sections.length) {
        lenis.scrollTo(sections[nextIdx - 1], { offset: -72, duration: 1.4, easing: (x: number) => Math.min(1, 1.001 - Math.pow(2, -10 * x)) });
      }
      setTimeout(() => { jumping = false; }, 1100);
    };

    let hAccum = 0;
    const onWheel = (e: WheelEvent) => {
      const absX = Math.abs(e.deltaX);
      const absY = Math.abs(e.deltaY);
      if (absX > absY && absX > 8) {
        e.preventDefault();
        hAccum += e.deltaX;
        if (Math.abs(hAccum) > 60) { jumpSection(hAccum > 0 ? 1 : -1); hAccum = 0; }
      } else { hAccum = 0; }
    };

    let touchX = 0, touchY = 0;
    const onTouchStart = (e: TouchEvent) => { touchX = e.touches[0].clientX; touchY = e.touches[0].clientY; };
    const onTouchEnd = (e: TouchEvent) => {
      const dx = touchX - e.changedTouches[0].clientX;
      const dy = touchY - e.changedTouches[0].clientY;
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 70) jumpSection(dx > 0 ? 1 : -1);
    };

    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });

    return () => {
      ScrollTrigger.removeEventListener("refresh", onSTRefresh);
      ScrollTrigger.getAll().forEach(st => st.kill());
      gsap.ticker.remove(lenisRaf);
      lenis.destroy();
      lenisRef.current = null;
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [isPdf]);

  /* Inject page-scoped animation styles */
  useEffect(() => {
    const style = document.createElement("style");
    style.id = "stx-report-styles";
    style.textContent = `
      .stx-reveal { opacity:1; transform:none; }
      .stx-visible { opacity:1!important; transform:none!important; }
      .stx-scroll-line { animation:stxPulse 2s infinite; }
      @keyframes stxPulse { 0%,100%{opacity:0.3} 50%{opacity:1} }
      .stx-trend-card:hover { border-color:${PITCH}!important; }
      .stx-nav-link:hover { color:${BRAND.pink}!important; }
      .stx-toggle { cursor:pointer; user-select:none; transition: opacity 0.2s; } .stx-toggle:hover { opacity: 0.7; } .stx-toggle:focus-visible { outline: 2px solid currentColor; outline-offset: 2px; border-radius: 6px; }
      @media (max-width: 639px) {
        .stx-nav-links { display:none!important; }
        .stx-nav-hub { display:none!important; }
      }
    `;
    document.head.appendChild(style);
    return () => document.getElementById("stx-report-styles")?.remove();
  }, []);

  /* Print document: scale any page whose content runs longer than one A4 page so it
     fits (down to 55%), widening it by the same factor so it still fills the width.
     Re-runs as images, fonts and the map load, and right before printing. */
  useEffect(() => {
    if (!isPdf || !PP) return;
    /* The saved PDF takes its Title from the document title */
    const PDF_TITLE = PP.title;
    document.title = PDF_TITLE;
    const fitPrintPages = () => {
      if (document.title !== PDF_TITLE) document.title = PDF_TITLE;
      document.querySelectorAll<HTMLElement>(".ft26-page[data-fit] .ft26-fit").forEach(el => {
        const body = el.parentElement as HTMLElement;
        const cs = getComputedStyle(body);
        const avail = body.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
        let z = 1;
        for (let k = 0; k < 3; k++) {
          el.style.transform = z < 1 ? `scale(${z})` : "";
          el.style.width = z < 1 ? `${100 / z}%` : "";
          const need = el.scrollHeight * z;
          if (need <= avail + 0.5) break;
          z = Math.max(0.55, Math.floor((z * avail / need) * 1000) / 1000);
        }
        el.dataset.scale = String(z);
      });
    };
    const timers = [150, 800, 2000, 4000, 8000].map(ms => window.setTimeout(fitPrintPages, ms));
    const onLoad = (e: Event) => { if ((e.target as HTMLElement)?.tagName === "IMG") fitPrintPages(); };
    document.addEventListener("load", onLoad, true);
    window.addEventListener("load", fitPrintPages);
    window.addEventListener("beforeprint", fitPrintPages);
    document.fonts?.ready.then(fitPrintPages).catch(() => {});
    return () => {
      timers.forEach(clearTimeout);
      document.removeEventListener("load", onLoad, true);
      window.removeEventListener("load", fitPrintPages);
      window.removeEventListener("beforeprint", fitPrintPages);
    };
  }, [isPdf, PP, facts, eco, watchStartups, ov?.insights, FTABR26_WORLDCUP]);

  /* No document yet, or one without the page keys: nothing to lay out */
  if (!ready) {
    if (content === undefined && isLoading) return <div style={{ minHeight: "100vh", background: LOADING_BG }} />;
    const failed = !!error && (error as { status?: number }).status !== 404;
    return (
      <div style={{ minHeight: "100vh", background: LOADING_BG, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, textAlign: "center", fontFamily: "'Open Sans','system-ui',sans-serif", fontSize: 16 }}>
        {failed ? "The report could not be loaded. Refresh the page to try again." : "This report is being published. Check back shortly."}
      </div>
    );
  }

  /* Headings and body copy sit in black on light, white on dark */
  const titleCol = isDark ? t.titleColor : BRAND.black;

  /* Hero/cover title (hero.titleLines): the first line and the last word of the last line in pink */
  const titleLines: string[] = FTABR26_HERO.titleLines ?? [];
  const lastLine = (line: string) => {
    const k = line.lastIndexOf(" ");
    return k < 0 ? { head: "", tail: line } : { head: line.slice(0, k), tail: line.slice(k + 1) };
  };

  /* ── Section header helpers ───────────────────────────────────────── */
  const sectionLabel = (text: string) => (
    <p style={{ display: "flex", alignItems: "center", gap: 12, fontFamily: "'DM Mono',monospace", fontSize: 15, letterSpacing: 5, color: BRAND.pink, textTransform: "uppercase", marginBottom: 14 }}
      className="text-[20px]">
      <span aria-hidden style={{ width: 26, height: 4, background: PITCH, borderRadius: 2, flexShrink: 0 }} />
      {text}
    </p>
  );
  /* Titles run the full text width and wrap only when they run out of room;
     the "\n" in older title strings is treated as a space. */
  const sectionTitle = (text: string, size = "clamp(42px,6vw,88px)") => (
    <h2 style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: size, lineHeight: 0.92, color: titleCol, width: "100%", maxWidth: "100%" }}>{text.replace(/\s*\n\s*/g, " ")}</h2>
  );
  const blockHeader = (text: string, size = "clamp(26px,3vw,40px)") => (
    <h3 style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: size, lineHeight: 0.92, color: titleCol, margin: 0 }}>{text}</h3>
  );
  /* Section break drawn as a halfway line with a centre spot */
  const pitchDivider = (
    <div aria-hidden style={{ position: "relative", height: 1, background: `linear-gradient(to right,transparent,${PITCH}66,transparent)` }}>
      <span style={{ position: "absolute", left: "50%", top: -4, width: 9, height: 9, borderRadius: "50%", border: `1px solid ${PITCH}99`, transform: "translateX(-50%)" }} />
    </div>
  );

  /* ── Insights: graphic column ── */
  /* Photo collage: the first image full width, the rest side by side under it. */
  const imageCollage = (images: { src: string; alt: string }[]) => {
    const [lead, ...rest] = images;
    const tile = (img: { src: string; alt: string }, ratio: string) => (
      <img key={img.src} src={img.src} alt={img.alt} loading="lazy"
        style={{ display: "block", width: "100%", aspectRatio: ratio, objectFit: "cover", borderRadius: 10, border: `1px solid ${t.border}` }} />
    );
    return (
      <div style={{ display: "grid", gap: isMobile ? 8 : 10 }}>
        {tile(lead, "16 / 9")}
        {rest.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${rest.length},minmax(0,1fr))`, gap: isMobile ? 8 : 10 }}>
            {rest.map(img => tile(img, "4 / 3"))}
          </div>
        )}
      </div>
    );
  };

  const creatorDeals = () => (
    <div style={{ background: t.bgSec, border: `1px solid ${t.border}`, borderRadius: 12, padding: isMobile ? "18px 16px" : "22px 24px" }}>
      <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 10.5, letterSpacing: 1.8, textTransform: "uppercase", color: BRAND.pink, marginBottom: 6 }}>
        {TL.creatorsHeading}
      </div>
      {FTABR26_CREATOR_DEALS.map((d, i) => (
        <div key={d.date + d.creator} style={{ display: "grid", gridTemplateColumns: "58px minmax(0,1fr)", columnGap: 12, padding: "10px 0", borderTop: i === 0 ? "none" : `1px solid ${t.border}` }}>
          <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, letterSpacing: 0.6, color: t.textMuted, paddingTop: 2 }}>{d.date}</span>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", columnGap: 8 }}>
              <span style={{ fontSize: 13.5, fontWeight: 700, color: titleCol }}>{d.creator}</span>
              <span style={{ fontSize: 11.5, color: PITCH, fontWeight: 600 }}>{d.event}</span>
            </div>
            <div style={{ marginTop: 2, fontSize: 12.5, lineHeight: 1.5, color: t.textMuted }}>{d.what}</div>
          </div>
        </div>
      ))}
    </div>
  );

  const insightGraphic = (a: InsightArticle) => {
    const g = a.graphic;
    if (!g) return null;
    if (g.kind === "collage") return imageCollage(g.images);
    if (g.kind === "creator-deals") return creatorDeals();
    if (g.kind === "mco") {
      return (
        <Ftabr26McoPanel dense
          groups={FTABR26_WOMENS_MCO_GROUPS}
          t={t} isDark={isDark} isMobile={isMobile} width={windowWidth} titleCol={titleCol}
        />
      );
    }
    return <img src={g.src} alt={g.alt} loading="lazy" style={{ display: "block", width: "100%", height: "auto", borderRadius: 12, border: `1px solid ${t.border}` }} />;
  };

  /* Insights copy: [text](https://…) becomes an inline source link (pink
     underline, new tab); a paragraph whose lines all start with "- " is a list. */
  const INLINE_LINK: React.CSSProperties = { color: "inherit", textDecoration: "underline", textDecorationColor: BRAND.pink, textDecorationThickness: 1.5, textUnderlineOffset: 3 };
  const richText = (text: string): React.ReactNode[] => {
    const out: React.ReactNode[] = [];
    const re = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
    let last = 0, m: RegExpExecArray | null;
    while ((m = re.exec(text))) {
      if (m.index > last) out.push(text.slice(last, m.index));
      out.push(<a key={m.index} href={m[2]} target="_blank" rel="noopener noreferrer" style={INLINE_LINK}>{m[1]}</a>);
      last = re.lastIndex;
    }
    if (last < text.length) out.push(text.slice(last));
    return out;
  };
  /* Body items render in order. Items (or lines) starting with "- " are bullets;
     consecutive bullets are grouped into one list. The admin stores one line per
     body item, so each bullet is its own item there. */
  const insightBody = (body: string[]) => {
    const lines = body.flatMap(p => String(p).split("\n")).map(l => l.trim()).filter(Boolean);
    const blocks: { kind: "p" | "ul"; items: string[] }[] = [];
    for (const l of lines) {
      const isBullet = l.startsWith("- ");
      const prev = blocks[blocks.length - 1];
      if (isBullet && prev?.kind === "ul") prev.items.push(l.slice(2));
      else blocks.push({ kind: isBullet ? "ul" : "p", items: [isBullet ? l.slice(2) : l] });
    }
    return blocks.map((b, i) => {
      const spacing = i === 0 ? 0 : "16px 0 0";
      if (b.kind === "ul") {
        return (
          <ul key={i} style={{ margin: spacing, paddingLeft: 22, listStyleType: "disc", display: "flex", flexDirection: "column", gap: 8 }}>
            {b.items.map((item, j) => <li key={j} style={{ display: "list-item", listStyleType: "disc", fontSize: 15, lineHeight: 1.75, color: t.text }}>{richText(item)}</li>)}
          </ul>
        );
      }
      return <p key={i} style={{ margin: spacing, fontSize: 15, lineHeight: 1.85, color: t.text }}>{richText(b.items[0])}</p>;
    });
  };

  /* One Insights article: copy left, graphic right, "Our take" underneath.
     Stacks on mobile; runs full width when the article has no graphic. */
  const insightArticle = (a: InsightArticle) => {
    const graphic = insightGraphic(a);
    return (
      <div key={a.key} style={{ marginBottom: isPdf ? 48 : 0 }}>
      <div className="stx-reveal" style={{ marginBottom: 32 }}>
        {blockHeader(a.heading)}
        <p style={{ margin: "12px 0 0", fontSize: 15, lineHeight: 1.7, color: t.text }}>{a.description}</p>
      </div>
      <article className="stx-reveal" style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 16, padding: isMobile ? "22px 18px" : "36px 38px" }}>
        {/* The title spans the box; the graphic then starts level with the
            first paragraph. */}
        {blockHeader(a.title, "clamp(24px,2.6vw,34px)")}
        <div style={{ display: "grid", gridTemplateColumns: isMobile || !graphic ? "1fr" : "minmax(0,1fr) minmax(0,1fr)", gap: isMobile ? 24 : 40, alignItems: "start", marginTop: isMobile ? 16 : 24 }}>
          <div>
            {insightBody(a.body)}
          </div>
          {graphic && <div>{graphic}</div>}
        </div>

        {a.take && (
          <div style={{ marginTop: isMobile ? 24 : 32, paddingTop: isMobile ? 20 : 26, borderTop: `1px solid ${t.border}` }}>
            <div style={{ borderLeft: `4px solid ${BRAND.pink}`, paddingLeft: isMobile ? 14 : 20 }}>
              <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 22, letterSpacing: 1, color: BRAND.pink, lineHeight: 1 }}>{TL.ourTake}</div>
              <p style={{ margin: "10px 0 0", fontSize: 15, lineHeight: 1.85, color: t.text }}>{richText(a.take)}</p>
            </div>
          </div>
        )}

        {/* Source lists removed: every source is an inline link in the copy. */}
      </article>
      </div>
    );
  };
  /* Closing returns focus to the tile that opened the drawer, so keyboard
     users are not dropped at the top of the document. */
  const closeDrawer = (tileId: string, clear: (v: null) => void) => {
    clear(null);
    requestAnimationFrame(() => document.getElementById(tileId)?.focus());
  };

  /* One roster tile — ringed photo, name, company. Both rosters share it. */
  const rosterTile = ({ id, name, company, photoUrl, ring, region, isSelected, onClick }: {
    id: string; name: string; company: string; photoUrl?: string; region?: string;
    ring: string; isSelected: boolean; onClick: () => void;
  }) => (
    <button key={id} id={id} type="button" className="stx-reveal" onClick={onClick}
      aria-haspopup="dialog" aria-expanded={isSelected}
      style={{
        background: "none", border: "none", padding: 0, cursor: "pointer", color: "inherit",
        display: "flex", flexDirection: "column", alignItems: "center", gap: 12, textAlign: "center",
      }}
      /* The glow belongs on the round ring — the avatar's outer wrapper is
         square, so lighting that up would halo the tile as a box. */
      onMouseEnter={e => { const r = e.currentTarget.querySelector("[data-ring]") as HTMLElement | null; if (r) { r.style.boxShadow = `0 0 30px ${ring}88`; r.style.transform = "scale(1.06)"; } }}
      onMouseLeave={e => { const r = e.currentTarget.querySelector("[data-ring]") as HTMLElement | null; if (r) { r.style.boxShadow = `0 0 18px ${ring}44`; r.style.transform = "scale(1)"; } }}>
      <Ftabr26PersonAvatar name={name} photoUrl={photoUrl} color={ring}
        size={isMobile ? 80 : 108} ringWidth={3} ringGap={3} glow />
      <div>
        <p style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: isMobile ? 13 : 15, color: t.text, lineHeight: 1.1, margin: "0 0 3px", letterSpacing: 0.4 }}>{name}</p>
        <p style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, letterSpacing: 1, color: t.textMuted, lineHeight: 1.3, textTransform: "uppercase", margin: 0 }}>{company}</p>
        {region && <p style={{ fontFamily: "'DM Mono',monospace", fontSize: 8.5, letterSpacing: 1.2, color: t.textMuted, opacity: 0.75, lineHeight: 1.3, textTransform: "uppercase", margin: "3px 0 0" }}>{region}</p>}
      </div>
    </button>
  );

  /* Table header: same small grey mono caps as the chart captions, 1px rule under it */
  const TABLE_HEAD: React.CSSProperties = { background: "transparent", borderBottom: `1px solid ${t.border}`, fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: 2, color: t.textMuted, textTransform: "uppercase" };

  /* Commentary block: paragraphs separated by a blank line render as separate <p>s */
  const noteText = (text: string) => {
    const paras = text.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
    return paras.map((para, i) => (
      <p key={i} style={{ fontSize: 15, color: t.text, lineHeight: 1.9, margin: `16px 0 ${i === paras.length - 1 ? 40 : 0}px` }}>{para}</p>
    ));
  };

  /* WC26 recap sources: an item or stat card takes `source` (one) or `sources` (several),
     shown as "Source: X ↗" or "Sources: X ↗ · Y ↗", each opening in a new tab. */
  type WcSource = { label: string; url: string };
  const wcSourceLinks = (x: { source?: WcSource | null; sources?: WcSource[] | null }, style?: React.CSSProperties) => {
    const list = (Array.isArray(x.sources) && x.sources.length ? x.sources : x.source ? [x.source] : [])
      .filter(src => src && src.url);
    if (list.length === 0) return null;
    const linkStyle: React.CSSProperties = { color: BRAND.pink, textDecoration: "none", borderBottom: `1px solid ${BRAND.pink}55`, paddingBottom: 2 };
    return (
      <div style={{ alignSelf: "flex-start", fontFamily: "'DM Mono',monospace", fontSize: 11, letterSpacing: 1.5, color: BRAND.pink, textTransform: "uppercase", lineHeight: 1.9, ...style }}>
        {list.length === 1 ? TL.source : TL.sources}
        {list.map((src, i) => (
          <span key={i}>
            {i > 0 && " · "}
            <a href={src.url} target="_blank" rel="noopener noreferrer" style={linkStyle}>{src.label} ↗</a>
          </span>
        ))}
      </div>
    );
  };

  /* Ecosystem location: [flag] City (same flags as Startups to Watch), or a globe and
     "Global" for a network with no single base. Null when the row has neither. */
  const ecoLocationNode = (r: { city?: string | null; country?: string | null; continent?: string | null }, fontSize: number, sep: string = "&") => {
    const isGlobal = /^global$/i.test((r.city ?? "").trim());
    const parts = isGlobal ? [] : ecoLocations({ city: r.city ?? null, country: r.country ?? null, continent: r.continent ?? null })
      .filter(l => l.city || l.country);
    if (!isGlobal && parts.length === 0) return null;
    const flag = (country: string | null) => {
      const code = ecoFlagCode(country);
      return code ? (
        <img src={`/reports/ftabr26/flags/${code}.svg`} alt={country ?? ""} title={country ?? undefined} width={16} height={12}
          style={{ width: 16, height: 12, objectFit: "cover", borderRadius: 2, flexShrink: 0 }} />
      ) : null;
    };
    return (
      <span style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0, flexWrap: "wrap", fontFamily: "'DM Mono',monospace", fontSize, color: t.textMuted }}>
        {isGlobal ? (<>
          <svg width={16} height={12} viewBox="0 0 16 12" aria-label={ECL.global} role="img" style={{ flexShrink: 0 }}>
            <g fill="none" stroke="currentColor" strokeWidth="1">
              <circle cx="8" cy="6" r="5.5" />
              <path d="M2.5 6h11M8 0.5c1.6 1.5 2.4 3.4 2.4 5.5S9.6 10 8 11.5M8 0.5C6.4 2 5.6 3.9 5.6 6S6.4 10 8 11.5" />
            </g>
          </svg>
          <span>{ECL.global}</span>
        </>) : parts.map((l, i) => (
          <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 6, minWidth: 0 }}>
            {i > 0 && <span aria-hidden style={{ margin: sep === "&" ? 0 : "0 2px" }}>{sep}</span>}
            {flag(l.country)}
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.city ?? l.country}</span>
          </span>
        ))}
      </span>
    );
  };

  /* Derived chart inputs */
  const yearSplitData: SplitDatum[] = (facts?.byYear ?? []).map(r => ({ label: r.year, only: r.footballOnly, also: r.footballAlso, roundsOnly: r.roundsOnly, roundsAlso: r.roundsAlso }));
  const regionSplitData: SplitDatum[] = (facts?.byRegion ?? []).map(r => ({ label: r.region, only: r.footballOnly, also: r.footballAlso, roundsOnly: r.roundsOnly, roundsAlso: r.roundsAlso }));

  const leaderKey = `${leaderCat}${leaderWindow === "allTime" ? "AllTime" : "Recent"}` as
    "onlyAllTime" | "onlyRecent" | "alsoAllTime" | "alsoRecent";
  const countryRows: LeaderRow[] = facts?.topCountries[leaderKey] ?? [];
  const cityRows: LeaderRow[] = facts?.topCities[leaderKey] ?? [];
  const companyRows: CompanyRow[] = (leaderCat === "only" ? facts?.topCompaniesOnly : facts?.topCompaniesAlso) ?? [];

  /* One key figure per collapsed Dealflow row: the investment ones as published
     (dataKeyFigures), the leaderboard ones follow the category/window picked. */
  const dfKeys = facts ? (() => {
    const lead = (r?: LeaderRow) => (r ? `${r.name} ${r.amount > 0 ? fmt(r.amount) : DL.undisclosed}` : null);
    const co = companyRows[0];
    return {
      ...ov.dataKeyFigures,
      countries: lead(countryRows[0]),
      cities: lead(cityRows[0]),
      companies: co ? `${co.name} ${fmt(co.funding)}` : null,
    };
  })() : null;
  const dfIsOpen = (id: string) => isPdf || !!dfOpen[id];
  const dfSetAll = (tab: keyof typeof DF_GROUPS, open: boolean) =>
    setDfOpen(o => { const n = { ...o }; DF_GROUPS[tab].forEach(id => { n[id] = open; }); return n; });
  const dfAllOpen = (tab: keyof typeof DF_GROUPS) => DF_GROUPS[tab].every(id => !!dfOpen[id]);
  const dfAccordion = (id: string, title: string, keyNumber: string | null, children: React.ReactNode) => {
    const isOpen = dfIsOpen(id);
    return (
      <div id={id} key={id} className="stx-reveal"
        style={{ marginTop: 14, background: t.bgCard, border: `1px solid ${isOpen ? PITCH : t.border}`, borderRadius: 14, overflow: "hidden", transition: "border-color 0.3s" }}>
        <button type="button" aria-expanded={isOpen}
          onClick={() => { if (!isPdf) setDfOpen(o => ({ ...o, [id]: !o[id] })); }}
          style={{ width: "100%", background: "none", border: "none", cursor: isPdf ? "default" : "pointer", textAlign: "left", padding: isMobile ? "18px 18px" : "22px 30px", display: "flex", alignItems: "center", gap: isMobile ? 12 : 18, color: "inherit" }}>
          <span style={{ width: 10, height: 10, borderRadius: "50%", background: PITCH, flexShrink: 0 }} />
          <span style={{ flex: 1, fontFamily: "'Bebas Neue',sans-serif", fontSize: isMobile ? 20 : 26, letterSpacing: 0.6, lineHeight: 1.1, color: titleCol }}>{title}</span>
          {keyNumber && <span style={{ flexShrink: 0, fontFamily: "'DM Mono',monospace", fontSize: isMobile ? 10 : 11.5, letterSpacing: 1, color: t.textMuted, textAlign: "right" }}>{keyNumber}</span>}
          {!isPdf && <span aria-hidden style={{ flexShrink: 0, fontSize: 22, color: PITCH, transform: isOpen ? "rotate(45deg)" : "none", transition: "transform 0.3s" }}>+</span>}
        </button>
        <AccordionBody isOpen={isOpen} windowWidth={windowWidth}>
          <div style={{ padding: isMobile ? "0 18px 24px" : "0 30px 32px" }}>
            <div style={{ height: 1, background: t.border, marginBottom: 8 }} />
            {children}
          </div>
        </AccordionBody>
      </div>
    );
  };

  const jumpTo = (href: string, label: string, mobile = false) => {
    trackFT("nav_click", { section: label, mobile });
    openDfFor(href);
    if (mobile) setMobileMenuOpen(false);
    const target = document.querySelector(href);
    if (target) lenisRef.current?.scrollTo(target as HTMLElement, { offset: -72, duration: 1.6, easing: (x: number) => Math.min(1, 1.001 - Math.pow(2, -10 * x)) });
  };

  // Page parts the admin can reorder (content.partOrder), with the divider drawn
  // between parts. Each is a thunk: a locked block's keys are absent, so it is
  // only evaluated when it is drawn.
  const PARTS: Record<string, (() => React.ReactNode) | null> = {
    trends: () => (<>
      {/* ── INSIGHTS: TOP TRENDS + FEATURE PANELS ───────────────────────── */}
      <div id="trends" style={{ background: t.bg, padding: isMobile ? "48px 0" : "88px 0", position: "relative", overflow: "hidden" }}>
        {/* Centre circle, cropped off the right edge — Business article only */}
        {(isPdf || INSIGHT_STYLE[insightsTab]?.circle) && (
          <div aria-hidden style={{ position: "absolute", top: "-20%", right: "-5%", width: "clamp(240px,32vw,420px)", height: "clamp(240px,32vw,420px)", borderRadius: "50%", border: `2px solid ${PITCH}22`, pointerEvents: "none" }} />
        )}
        <div style={{ position: "relative", zIndex: 1, maxWidth: 1280, margin: "0 auto", padding: isMobile ? "0 16px" : "0 40px" }}>
          <div className="stx-reveal">
            {sectionLabel(TL.label)}
            {sectionTitle(TL.title)}
          </div>

          {/* Tab switcher: three theme articles, then the bonus World Cup recap */}
          <TabStrip t={t} wrapStyle={{ marginTop: 40, marginBottom: 32 }} style={{ display: "flex", flexWrap: "nowrap", borderBottom: `2px solid ${t.border}` }}>
            {INSIGHT_TABS.map(tab => {
              const active = insightsTab === tab.key;
              return (
                <button key={tab.key} onClick={() => setInsightsTab(tab.key)}
                  style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: isMobile ? 20 : 26, letterSpacing: 2, padding: isMobile ? "8px 12px 10px" : "10px 22px 13px", background: "none", border: "none", borderBottom: active ? `3px solid ${BRAND.pink}` : "3px solid transparent", color: active ? BRAND.pink : t.textMuted, cursor: "pointer", transition: "color 0.2s, border-color 0.2s", marginBottom: -2, outline: "none", whiteSpace: "nowrap" }}>
                  {tab.bonus && (
                    <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: 1.6, fontWeight: 700, color: "#fff", background: BRAND.pink, borderRadius: 999, padding: "3px 8px 2px", marginRight: 10, verticalAlign: "middle", position: "relative", top: -2 }}>{TL.bonusTab.badge}</span>
                  )}
                  {tab.label}
                </button>
              );
            })}
          </TabStrip>

          {FTABR26_INSIGHTS.filter(a => isPdf || a.key === insightsTab).map(insightArticle)}

          {/* ── Feature panel: FIFA World Cup 2026 recap ──────────────────── */}
          {(isPdf || insightsTab === TL.bonusTab.key) && (
            <div>
              <div className="stx-reveal" style={{ marginBottom: 32 }}>
                {blockHeader(FTABR26_WORLDCUP.title)}
                <p style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: "clamp(16px,1.8vw,22px)", color: BRAND.pink, letterSpacing: 1, margin: "10px 0 0" }}>{FTABR26_WORLDCUP.standfirst}</p>
                {String(FTABR26_WORLDCUP.intro ?? "").split(/\n\s*\n/).filter(Boolean).map((para, i) => (
                  <p key={i} style={{ margin: "16px 0 0", fontSize: 15, lineHeight: 1.9, color: t.text }}>{richText(para.trim())}</p>
                ))}
              </div>

              {/* Headline + supporting stats */}
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1.4fr 1fr 1fr 1fr", gap: isMobile ? 14 : 18 }}>
                <div className="stx-reveal" style={{ background: isDark ? t.bgCard : PITCH_TINT, border: `1px solid ${PITCH}44`, borderLeft: `4px solid ${PITCH}`, borderRadius: 14, padding: "32px 28px", position: "relative", overflow: "hidden" }}>
                  <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: "clamp(48px,5vw,72px)", color: BRAND.pink, lineHeight: 1 }}>{FTABR26_WORLDCUP.headline.value}</div>
                  <div style={{ marginTop: 10, fontSize: 14, fontWeight: 700, color: t.text }}>{FTABR26_WORLDCUP.headline.label}</div>
                  <div style={{ marginTop: 8, fontSize: 12, color: t.textMuted, lineHeight: 1.6 }}>{FTABR26_WORLDCUP.headline.sublabel}</div>
                  {wcSourceLinks(FTABR26_WORLDCUP.headline, { marginTop: 12 })}
                </div>
                {FTABR26_WORLDCUP.stats.map(s => (
                  <StatCard key={s.label} num={s.value} label={s.label} subtitle={s.sublabel} t={t} style={{ padding: "32px 26px" }}
                    footer={wcSourceLinks(s, { marginTop: 12 })} />
                ))}
              </div>

              {/* Tech grid */}
              <div style={{ marginTop: 40 }} className="stx-reveal">
                <div style={{ marginBottom: 24 }}>
                  {blockHeader(FTABR26_WORLDCUP.techHeading.toUpperCase())}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {WORLDCUP_TECH_GROUPS.map(group => {
                    const col = WC_COLORS[group.category] ?? PITCH;
                    const isOpen = isPdf || expandedWcCategory === group.category;
                    return (
                      <div key={group.category} className="stx-reveal"
                        style={{ background: t.bgCard, border: `1px solid ${isOpen ? col : t.border}`, borderRadius: 14, overflow: "hidden", transition: "border-color 0.3s" }}>
                        <button
                          onClick={() => setExpandedWcCategory(isOpen && !isPdf ? null : group.category)}
                          style={{ width: "100%", background: "none", border: "none", cursor: "pointer", textAlign: "left", padding: isMobile ? "18px 18px" : "22px 30px", display: "flex", alignItems: "center", gap: isMobile ? 12 : 18, color: "inherit" }}>
                          <span style={{ width: 10, height: 10, borderRadius: "50%", background: col, flexShrink: 0 }} />
                          <span style={{ flex: 1, fontFamily: "'Bebas Neue',sans-serif", fontSize: isMobile ? 20 : 26, letterSpacing: 0.6, lineHeight: 1.1, color: titleCol }}>{group.category.toUpperCase()}</span>
                          <span style={{ flexShrink: 0, fontFamily: "'DM Mono',monospace", fontSize: 11, letterSpacing: 1.4, color: t.textMuted }}>{group.items.length}</span>
                          <span aria-hidden style={{ flexShrink: 0, fontSize: 22, color: col, transform: isOpen ? "rotate(45deg)" : "none", transition: "transform 0.3s" }}>+</span>
                        </button>
                        <AccordionBody isOpen={isOpen} windowWidth={windowWidth}>
                          <div style={{ padding: isMobile ? "0 18px 20px" : "0 30px 28px" }}>
                            <div style={{ height: 1, background: t.border, marginBottom: 20 }} />
                            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: isMobile ? 14 : 18 }}>
                              {group.items.map(item => (
                                <div key={item.id} id={`wc-tech-${item.id}`}
                                  style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 14, overflow: "hidden", display: "flex", flexDirection: "column" }}>
                                  <div style={{ height: 3, background: `linear-gradient(90deg,${col},${col}44)` }} />
                                  <div style={{ padding: isMobile ? "20px 18px" : "24px 24px", display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
                                    <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 21, letterSpacing: 0.5, lineHeight: 1.15, color: titleCol }}>{item.title}</span>
                                    <p style={{ fontSize: 13.5, lineHeight: 1.75, color: t.text, margin: 0 }}>{item.body}</p>
                                    {wcSourceLinks(item, { marginTop: "auto", paddingTop: 6 })}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </AccordionBody>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Our take: same treatment as the other Insights pieces */}
              {FTABR26_WORLDCUP.take && (
                <div className="stx-reveal" style={{ marginTop: isMobile ? 24 : 32, paddingTop: isMobile ? 20 : 26, borderTop: `1px solid ${t.border}` }}>
                  <div style={{ borderLeft: `4px solid ${BRAND.pink}`, paddingLeft: isMobile ? 14 : 20 }}>
                    <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 22, letterSpacing: 1, color: BRAND.pink, lineHeight: 1 }}>{TL.ourTake}</div>
                    <p style={{ margin: "10px 0 0", fontSize: 15, lineHeight: 1.85, color: t.text }}>{richText(FTABR26_WORLDCUP.take)}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>),
    featured: () => (<>
      {/* ── FEATURED COMPANY: PLAYERMAKER (mirrors the NGSC panel in GSTER26) ── */}
      <div style={{ background: t.bg, padding: isMobile ? "32px 0" : "56px 0" }}>
      <div style={{ background: `linear-gradient(135deg, transparent, ${FEAT_COL}, ${FEAT_COL}88, ${FEAT_COL}, transparent)`, padding: 2, margin: isMobile ? "0 8px" : "0 20px", borderRadius: 20 }}>
      <div id="featured" style={{ background: "#0a0a0a", padding: isMobile ? "28px 16px" : "32px 40px", borderRadius: 18 }}>
        <div style={{ maxWidth: 1280, margin: "0 auto" }}>

          {/* ── Row 1: logo + title, CTA + website ── */}
          <Ftabr26PartnerHeader
            className="stx-reveal" headline={FTABR26_FEATURED.title}
            subline={FL.subline} visit={FL.visit} websiteAria={FL.websiteAria}
            url={FTABR26_FEATURED.url} accent={FEAT_COL} print={isPdf}
            logo={<img src={FTABR26_FEATURED.logo} alt={FTABR26_FEATURED.name} onError={e => { e.currentTarget.style.display = "none"; }} />}
          />

          {/* ── Row 2: story on the left, image mosaic on the right ── */}
          <div className="stx-reveal" style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1.25fr", gap: isMobile ? 20 : 32, marginBottom: isMobile ? 20 : 24 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: isMobile ? 18 : 20 }}>
              <div>
                <p style={featLabel}>{FTABR26_FEATURED.aboutLabel}</p>
                {FTABR26_FEATURED.about.map((para, i) => (
                  <p key={i} style={{ fontSize: i === 0 ? 14 : 12.5, color: i === 0 ? "#fff" : "#c8c8c8", fontWeight: i === 0 ? 600 : 400, lineHeight: 1.65, margin: i === FTABR26_FEATURED.about.length - 1 ? 0 : "0 0 8px" }}>{para}</p>
                ))}
              </div>
              <div>
                <p style={featLabel}>{FTABR26_FEATURED.achievementsLabel}</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {FTABR26_FEATURED.achievements.map((text, i) => (
                    <div key={i} style={{ display: "flex", gap: 12, alignItems: "baseline" }}>
                      <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 22, color: FEAT_COL, lineHeight: 1, flexShrink: 0, width: 22 }}>{String(i + 1).padStart(2, "0")}</span>
                      <p style={{ fontSize: 12.5, color: "#c8c8c8", lineHeight: 1.5, margin: 0, fontWeight: 600 }}>{text}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Mosaic: lead photo + two shots on the left, product render as a tall tile on the right */}
            <div style={{
              display: "grid", gap: 10, height: isMobile ? undefined : 320,
              gridTemplateColumns: isMobile ? "1fr 1fr" : "1fr 1fr 0.95fr",
              gridTemplateRows: isMobile ? "190px 120px 220px" : "1.5fr 1fr",
            }}>
              {[FTABR26_FEATURED.images.lead, ...FTABR26_FEATURED.images.gallery].map((img, i) => (
                <div key={img.src} style={{ gridColumn: i === 0 ? "1 / 3" : undefined, gridRow: i === 0 ? "1" : "2", borderRadius: 10, overflow: "hidden", border: `1px solid ${FEAT_COL}20`, minHeight: 0 }}>
                  <img src={img.src} alt={img.alt} loading="lazy"
                    style={{ width: "100%", height: "100%", display: "block", objectFit: "cover", objectPosition: "position" in img ? img.position : "center 60%" }} />
                </div>
              ))}
              <div style={{ gridColumn: isMobile ? "1 / 3" : "3", gridRow: isMobile ? "3" : "1 / 3", borderRadius: 10, overflow: "hidden", border: `1px solid ${FEAT_COL}20`, minHeight: 0, background: `radial-gradient(circle at 50% 55%, ${FEAT_COL}55 0%, ${FEAT_COL}18 42%, #141414 75%)`, display: "flex", alignItems: "center", justifyContent: "center", padding: isMobile ? 16 : 18 }}>
                <img src={FTABR26_FEATURED.images.product.src} alt={FTABR26_FEATURED.images.product.alt} loading="lazy"
                  style={{ maxWidth: "100%", maxHeight: "100%", display: "block", objectFit: "contain", filter: "drop-shadow(0 18px 28px rgba(0,0,0,0.55))" }} />
              </div>
            </div>
          </div>

          {/* ── Row 3: tagline + founder | next 12–18 months (same column split as row 2) ── */}
          <div className="stx-reveal" style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1.25fr", gap: isMobile ? 20 : 32, alignItems: "start", padding: isMobile ? "20px 0 0" : "22px 0 0", borderTop: `1px solid ${FEAT_COL}22` }}>
            <div>
              <h3 style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: isMobile ? 22 : 26, lineHeight: 1, color: "#fff", margin: "0 0 12px" }}>
                {FTABR26_FEATURED.tagline}
              </h3>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <img src={FTABR26_FEATURED.founder.photo} alt={FL.founderAlt} loading="lazy"
                  style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover", objectPosition: "center 20%", border: `2px solid ${FEAT_COL}`, flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{FTABR26_FEATURED.founder.name}</div>
                  <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, letterSpacing: 1.5, color: FEAT_COL, textTransform: "uppercase", marginTop: 2 }}>{FTABR26_FEATURED.founder.role}</div>
                </div>
              </div>
            </div>
            <div>
              <p style={featLabel}>{FTABR26_FEATURED.nextLabel}</p>
              <p style={{ fontSize: 12.5, color: "#c8c8c8", lineHeight: 1.65, margin: 0 }}>{FTABR26_FEATURED.next}</p>
            </div>
          </div>

        </div>
      </div>
      </div>
      </div>
    </>),
    innovators: () => (<>
      {/* ── INNOVATORS + PLAYMAKERS ─────────────────────────────────────── */}
      <div id="innovators" style={{ background: t.bg, padding: isMobile ? "48px 0" : "88px 0" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: isMobile ? "0 16px" : "0 40px" }}>
          <div className="stx-reveal">
            {sectionLabel(IL.label)}
            {sectionTitle(IL.title)}
            <p style={{ fontSize: 15, color: t.text, lineHeight: 1.9, margin: "24px 0 0" }}>
              {IL.intro}
            </p>
            <p style={{ fontSize: 15, color: t.text, lineHeight: 1.9, margin: "6px 0 0" }}>
              {IL.note}
            </p>
          </div>


          {/* Desktop: 7 per row (14 innovators = 2 rows), with a slightly tighter gap so the
              avatars keep their size. Tablet keeps 6 per row, mobile 2. */}
          <div className="ft26-innov-grid" style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2,1fr)" : windowWidth >= 1120 ? "repeat(7,1fr)" : "repeat(6,1fr)", gap: isMobile ? 24 : windowWidth >= 1120 ? "36px 28px" : 36, marginTop: isMobile ? 28 : 40 }}>
            {FTABR26_INNOVATORS.map(p => rosterTile({
              id: `ftabr26-inn-${p.id}`,
              name: p.name, company: p.company, photoUrl: p.photoUrl,
              ring: INNOVATOR_RING, region: p.continent,
              isSelected: selectedInnovator?.id === p.id,
              onClick: () => setSelectedInnovator(selectedInnovator?.id === p.id ? null : p),
            }))}
          </div>
        </div>
      </div>

      {/* Innovator drawer — the two interview answers */}
      {selectedInnovator && (() => {
        const p = selectedInnovator;
        const accent = INNOVATOR_RING;
        const answers = ([["qTech", p.qTech], ["qUnderserved", p.qUnderserved]] as const)
          .filter(([, a]) => a.trim().length > 0);
        return (
          <Ftabr26PersonDrawer
            name={p.name} photoUrl={p.photoUrl} accent={accent}
            flag={getCountryFlag(p.country)}
            subtitle={`${p.designation} · ${p.company}`}
            linkedin={p.linkedin || undefined}
            reportLabel={FTABR26_HERO.hashtag} brand={IL.drawerBrand}
            onClose={() => closeDrawer(`ftabr26-inn-${p.id}`, setSelectedInnovator)}
            t={t} isDark={isDark} isMobile={isMobile}>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {answers.map(([key, answer]) => (
                <div key={key} style={drawerCardStyle(accent, isDark)}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: accent, margin: "0 0 10px" }}>{FTABR26_QUESTIONS[key]}</p>
                  <p style={{ fontSize: 14, color: t.text, lineHeight: 1.85, margin: 0 }}>{answer}</p>
                </div>
              ))}
            </div>
          </Ftabr26PersonDrawer>
        );
      })()}
    </>),
    startups: () => (<>
      {/* ── STARTUPS TO WATCH ───────────────────────────────────────────── */}
      <div id="ecosystem" style={{ background: t.bgSec, padding: isMobile ? "48px 0" : "88px 0" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: isMobile ? "0 16px" : "0 40px" }}>
          <div className="stx-reveal">
            {sectionLabel(SL.label)}
            {sectionTitle(SL.title)}
          </div>

          {/* Sector legend */}
          <div style={{ display: "flex", gap: 18, flexWrap: "wrap", marginTop: 40, marginBottom: 28 }}>
            {SECTORS.map(({ key: s }) => (
              <span key={s} style={{ display: "flex", alignItems: "center", gap: 7, fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: 1.5, color: t.textMuted, textTransform: "uppercase" }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: SECTOR_COLOR[s] }} />{SECTOR_LABEL[s]}
              </span>
            ))}
          </div>

          <p style={{ fontSize: 14, color: t.textMuted, lineHeight: 1.8, marginBottom: 32 }}>
            {FTABR26_STARTUPS_NOTE}
          </p>

          {(() => {
            return (
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: isMobile ? 16 : 20 }}>
                {watchStartups.map(c => {
                  /* Unmapped sectors get the brand pink rather than a bucket
                     they were never assigned to. */
                  /* Sector colour only for mapped sectors; unmapped cards stay neutral (pink is not a category). */
                  const sectorColor = c.sector ? SECTOR_COLOR[c.sector] : t.border;
                  const logoUrl = startupLogoUrl(c);
                  const href = ecoHref(c.website);
                  return (
                    <a key={c.name} href={href ?? undefined} target="_blank" rel="noopener noreferrer" className="stx-reveal" style={{
                      background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 14, padding: 0,
                      display: "flex", flexDirection: "column", overflow: "hidden",
                      transition: "transform 0.25s ease, box-shadow 0.25s ease",
                      position: "relative", textDecoration: "none", color: "inherit", cursor: href ? "pointer" : "default",
                    }}
                      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = `0 12px 40px ${isDark ? "rgba(0,0,0,0.5)" : "rgba(0,0,0,0.1)"}, 0 0 0 1px ${sectorColor}33`; }}
                      onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}
                    >
                      <div style={{ height: 3, background: sectorColor }} />
                      <div style={{ padding: isMobile ? "18px 16px 20px" : "22px 24px 24px", display: "flex", flexDirection: "column", gap: 12, flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <div style={{
                            width: 40, height: 40, borderRadius: 10,
                            background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.03)",
                            border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"}`,
                            position: "relative", flexShrink: 0, overflow: "hidden",
                            display: "flex", alignItems: "center", justifyContent: "center",
                          }}>
                            {logoUrl ? (
                              <img src={logoUrl} alt={c.name} style={{ width: 28, height: 28, objectFit: "contain", position: "relative", zIndex: 1 }} onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                            ) : (
                              <span style={{ fontSize: 16, fontWeight: 700, color: sectorColor, fontFamily: "'Bebas Neue',sans-serif" }}>{c.name.charAt(0)}</span>
                            )}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <span style={{ fontSize: 16, fontWeight: 700, color: t.text, fontFamily: "'Open Sans',sans-serif", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                              {c.name}
                            </span>
                            {(() => {
                              const loc = startupLocation(c);
                              if (!loc.city && !loc.country) return null;
                              const code = ecoFlagCode(loc.country);
                              return (
                                <span style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2, fontSize: 11, color: t.textMuted, fontFamily: "'DM Mono',monospace" }}>
                                  {code && <img src={`/reports/ftabr26/flags/${code}.svg`} alt={loc.country ?? ""} title={loc.country ?? undefined} width={16} height={12} style={{ width: 16, height: 12, objectFit: "cover", borderRadius: 2, flexShrink: 0 }} />}
                                  <span>{loc.city ?? loc.country}</span>
                                </span>
                              );
                            })()}
                          </div>
                        </div>
                        {c.description && (
                          <p style={{ fontSize: 13, color: t.text, lineHeight: 1.6, margin: 0, fontFamily: "'Open Sans',sans-serif" }}>{c.description}</p>
                        )}
                      </div>
                    </a>
                  );
                })}
              </div>
            );
          })()}
        </div>
      </div>
    </>),
    ecomap: () => (<>
      {/* ── ECOSYSTEM: INITIATIVES AND ACCELERATORS ────────────────────── */}
      <div id="ecomap" style={{ background: t.bg, padding: isMobile ? "48px 0" : "88px 0" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: isMobile ? "0 16px" : "0 40px" }}>
          <div className="stx-reveal">
            {sectionLabel(ECL.label)}
            {sectionTitle(ECL.title)}
            <p style={{ fontSize: 15, color: t.text, lineHeight: 1.9, margin: "24px 0 0" }}>
              {ECL.intro}
            </p>
          </div>

          {/* The map. Selecting a continent filters the two tables below;
              it hides itself when no row can be placed, which is what an API
              outage leaves behind — see ftabr26-ecosystem-map.tsx. */}
          <Suspense fallback={
            <div style={{ marginTop: 40, height: isMobile ? 220 : 460, background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: t.textMuted, letterSpacing: 3 }}>{ECL.loadingMap}</span>
            </div>
          }>
            <Ftabr26EcosystemMap
              t={t} isDark={isDark} isMobile={isMobile}
              eco={eco}
              selected={ecoRegion}
              onSelect={setEcoRegion}
              labels={ECL.map}
            />
          </Suspense>

          {!isPdf && (
          <TabStrip t={t} wrapStyle={{ marginTop: 40, marginBottom: 28 }} style={{ display: "flex", alignItems: "center", gap: 12, borderBottom: `2px solid ${t.border}` }}>
            {([
              ["initiatives",  `${ECL.tabs.initiatives} (${ecoShown.initiatives.length})`],
              ["accelerators", `${ECL.tabs.accelerators} (${ecoShown.programs.length})`],
            ] as const).map(([key, label]) => {
              const active = ecoTab === key;
              return (
                <button key={key} onClick={() => setEcoTab(key)}
                  style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: isMobile ? 18 : 24, letterSpacing: 2, padding: isMobile ? "8px 16px 10px" : "10px 32px 13px", background: "none", border: "none", borderBottom: active ? `3px solid ${BRAND.pink}` : "3px solid transparent", color: active ? BRAND.pink : t.textMuted, cursor: "pointer", transition: "color 0.2s, border-color 0.2s", marginBottom: -2, outline: "none", whiteSpace: "nowrap" }}>
                  {label}
                </button>
              );
            })}

            {/* Reading the filter off the tab strip, and the way back out of
                it, without scrolling back up to the map. */}
            {ecoRegion && (
              <button onClick={() => setEcoRegion(null)}
                style={{ marginLeft: "auto", marginBottom: 8, display: "inline-flex", alignItems: "center", gap: 8, flexShrink: 0, fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase", padding: "6px 12px", borderRadius: 20, border: `1px solid ${BRAND.pink}55`, background: `${BRAND.pink}12`, color: BRAND.pink, cursor: "pointer", whiteSpace: "nowrap" }}>
                {ecoRegion} <span style={{ fontSize: 12, lineHeight: 1 }}>✕</span>
              </button>
            )}
          </TabStrip>
          )}

          {/* The PDF has nothing to click, so it prints both tables, each under its own heading */}
          {(isPdf ? (["initiatives", "accelerators"] as const) : [ecoTab]).map(tab => (() => {
            const rows: Ftabr26EcosystemEntry[] = tab === "initiatives"
              ? ecoShown.initiatives : ecoShown.programs;
            /* Logo, name and city (which carries the country flag). */
            const cols = isMobile
              ? "34px 1fr"
              : "44px 1fr 240px";
            return (
              <div key={tab} style={{ marginTop: isPdf && tab === "accelerators" ? 40 : 0 }}>
              {isPdf && (
                <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 24, letterSpacing: 2, color: BRAND.pink, margin: "0 0 16px" }}>
                  {tab === "initiatives" ? `${ECL.tabs.initiatives} (${ecoShown.initiatives.length})` : `${ECL.tabs.accelerators} (${ecoShown.programs.length})`}
                </div>
              )}
              <div className="stx-reveal" style={{ border: `1px solid ${t.border}`, overflow: "hidden", borderRadius: 8 }}>
                <div style={{ display: "grid", gridTemplateColumns: cols, gap: "0 12px", padding: "12px 20px", ...TABLE_HEAD }}>
                  <span />
                  <span>{tab === "initiatives" ? ECL.headers.initiative : ECL.headers.program}</span>
                  {!isMobile && <span>{ECL.headers.location}</span>}
                </div>
                {rows.length === 0 && (
                  <div style={{ padding: "26px 20px", textAlign: "center", fontFamily: "'DM Mono',monospace", fontSize: 11, letterSpacing: 2, color: t.textMuted, borderTop: `1px solid ${t.border}` }}>
                    {ECL.empty[tab]}{ecoRegion ? `${ECL.emptyIn}${ecoRegion.toUpperCase()}` : ""}
                  </div>
                )}
                {rows.map((r, i) => {
                  const href = ecoHref(r.website);
                  const logoUrl = ECO_LOGOS[r.name] ?? ecoLogoUrl(r.website);
                  /* [flag] City, as on the Startups to Watch cards: the same SVG
                     flags, size, gap and mono style. A global network gets a globe. */
                  const loc = ecoLocationNode(r, isMobile ? 10.5 : 11.5);
                  const nameStyle: React.CSSProperties = { color: t.text, textDecoration: "none", borderBottom: href ? `1px solid ${BRAND.pink}44` : "none" };
                  return (
                    <div key={`${r.name}-${r.rank}`} style={{ display: "grid", gridTemplateColumns: cols, gap: "0 12px", padding: "12px 20px", alignItems: "center", background: "transparent", borderTop: `1px solid ${t.border}` }}>
                      {/* Logo — the master tables store no logo, so it is
                          resolved from the website and falls back to a
                          monogram when the lookup misses. */}
                      <div style={{ width: 30, height: 30, borderRadius: 5, flexShrink: 0, background: isDark ? "rgba(255,255,255,0.08)" : BRAND.white, border: `1px solid ${t.border}`, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                        {logoUrl && (
                          <img src={logoUrl} alt="" width={22} height={22} loading="lazy" style={{ objectFit: "contain" }}
                            onError={e => { const img = e.currentTarget; img.style.display = "none"; const sib = img.nextElementSibling as HTMLElement | null; if (sib) sib.style.display = "flex"; }} />
                        )}
                        <span style={{ display: logoUrl ? "none" : "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%", fontFamily: "'Bebas Neue',sans-serif", fontSize: 15, color: PITCH }}>
                          {(r.name || "?").charAt(0)}
                        </span>
                      </div>

                      <span style={{ fontSize: isMobile ? 12.5 : 13.5, fontWeight: 600, color: t.text, minWidth: 0, display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
                        {href
                          ? <a href={href} target="_blank" rel="noopener noreferrer" style={nameStyle}>{r.name}</a>
                          : <span>{r.name}</span>}
                        {isMobile && loc && (
                          <span style={{ width: "100%", fontWeight: 400, marginTop: 2 }}>{loc}</span>
                        )}
                      </span>

                      {!isMobile && (loc ?? (
                        <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11.5, color: t.textMuted }}>{ECL.notListed}</span>
                      ))}
                    </div>
                  );
                })}
              </div>
              </div>
            );
          })())}

          {/* Upcoming events: shown once the Ecosystem part's Events rows hold
              future-dated entries (admin → Ecosystem → Events). */}
          {eco.events.length > 0 && (
            <div className="stx-reveal" style={{ marginTop: 56 }}>
              {blockHeader(ECL.events.heading, "clamp(22px,2.4vw,32px)")}
              <div style={{ marginTop: 20, border: `1px solid ${t.border}`, borderRadius: 8, overflow: "hidden" }}>
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 84px" : "1fr 140px 220px", gap: "0 12px", padding: "12px 20px", ...TABLE_HEAD }}>
                  <span>{ECL.events.event}</span><span style={{ textAlign: isMobile ? "right" : "left" }}>{ECL.events.date}</span>{!isMobile && <span>{ECL.events.city}</span>}
                </div>
                {eco.events.map(ev => {
                  const href = ecoHref(ev.website);
                  return (
                    <div key={`${ev.name}-${ev.startDate}`} style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 84px" : "1fr 140px 220px", gap: "0 12px", padding: "12px 20px", alignItems: "center", borderTop: `1px solid ${t.border}` }}>
                      <span style={{ fontSize: 13.5, fontWeight: 600, color: t.text }}>
                        {href ? <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: t.text, textDecoration: "none", borderBottom: `1px solid ${BRAND.pink}44` }}>{ev.name}</a> : ev.name}
                        {isMobile && ev.city && <span style={{ display: "block", fontFamily: "'DM Mono',monospace", fontSize: 10.5, color: t.textMuted, fontWeight: 400, marginTop: 2 }}>{ev.city}</span>}
                      </span>
                      <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11.5, color: t.textMuted, textAlign: isMobile ? "right" : "left" }}>{formatEventDate(ev.startDate, ECL.events.tbc)}</span>
                      {!isMobile && <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11.5, color: t.textMuted }}>{[ev.city, ev.country].filter(Boolean).join(", ")}</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </>),
    soccerment: () => (<>
      {/* Generic Atlas CTA sits between the two partner features: it opens the
          Soccerment part, so Playermaker → CTA → Soccerment holds as long as
          Featured company comes straight before Soccerment in the page order. */}
      <Ftabr26AtlasCta {...ov.soccermentCta} isMobile={isMobile} />
      {/* Soccerment follows Ecosystem independently of legacy spotlight flags. */}
      <section id="soccerment" aria-label={SOL.sectionAria} style={{ background: t.bg, padding: isMobile ? "32px 0" : "56px 0" }}>
        <div style={{ margin: isMobile ? "0 8px" : "0 20px" }}>
          <Ftabr26SoccermentFeature data={FTABR26_SOCCERMENT} labels={SOL} print={isPdf} />
        </div>
      </section>
    </>),
    /* Partner spotlights: hidden unless partnersLabels.show */
    partners: PL?.show ? () => (<>
          {/* ── PARTNER SPOTLIGHTS ──────────────────────────────────────────── */}
          <div style={{ background: t.bgSec, padding: isMobile ? "48px 0" : "88px 0" }}>
            <div style={{ maxWidth: 1280, margin: "0 auto", padding: isMobile ? "0 16px" : "0 40px" }}>
              <div className="stx-reveal">
                {sectionLabel(PL.label)}
                {sectionTitle(PL.title)}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: isMobile ? 20 : 28, marginTop: 44 }}>
                {FTABR26_PARTNERS.map(p => {
                  const accent = ov.partnersAccent?.[p.id] ?? BRAND.pink;
                  return (
                    <div key={p.id} className="stx-reveal" style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 16, overflow: "hidden" }}>
                      <div style={{ height: 3, background: `linear-gradient(90deg,${accent},${accent}22)` }} />
                      <div style={{ padding: isMobile ? "24px 18px" : "34px 36px" }}>
                        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
                          <div>
                            <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 9.5, letterSpacing: 2, textTransform: "uppercase", color: accent, border: `1px solid ${accent}66`, borderRadius: 999, padding: "4px 12px" }}>{p.kind}</span>
                            <h3 style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: "clamp(30px,3.4vw,46px)", letterSpacing: 0.8, color: titleCol, margin: "14px 0 4px", lineHeight: 1 }}>{p.name}</h3>
                            <p style={{ fontSize: 14, color: accent, fontWeight: 600, margin: 0 }}>{p.tagline}</p>
                          </div>
                          <a href={p.url} target="_blank" rel="noopener noreferrer"
                            style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase", color: accent, border: `1px solid ${accent}`, borderRadius: 4, padding: "7px 16px", textDecoration: "none", whiteSpace: "nowrap" }}>{PL.visit}</a>
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: isMobile ? 20 : 32, marginTop: 26 }}>
                          {p.blocks.map(b => (
                            <div key={b.heading}>
                              <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: 1.6, textTransform: "uppercase", color: t.textMuted, marginBottom: 8 }}>{b.heading}</div>
                              <p style={{ fontSize: 13.5, lineHeight: 1.85, color: t.text, margin: 0 }}>{b.body}</p>
                            </div>
                          ))}
                        </div>

                        <div style={{ marginTop: 26, paddingTop: 18, borderTop: `1px solid ${t.border}`, display: "flex", alignItems: "center", gap: 12 }}>
                          <Ftabr26PersonAvatar name={p.contact.name} color={accent} size={40} />
                          <div>
                            <div style={{ fontSize: 13.5, fontWeight: 700, color: t.text }}>{p.contact.name}</div>
                            <div style={{ fontSize: 11.5, color: t.textMuted }}>{p.contact.role}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
    </>) : null,
    data: () => (<>
      {/* ── DATA IN FULL ────────────────────────────────────────────────── */}
      <div id="dealflow" style={{ background: t.bg, padding: isMobile ? "48px 0" : "88px 0" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: isMobile ? "0 16px" : "0 40px" }}>
          <div className="stx-reveal">
            {sectionLabel(DL.label)}
            {sectionTitle(DL.title)}
            <p style={{ fontSize: 15, color: t.text, lineHeight: 1.9, margin: "24px 0 0" }}>
              {DL.intro.lead}<strong style={{ color: PITCH }}> {DL.intro.only}</strong> {DL.intro.mid}<strong style={{ color: ALSO_COLOR }}> {DL.intro.also}</strong> {DL.intro.tail} {facts.period.label}{DL.intro.end}
            </p>
          </div>

          {/* Tab switcher */}
          <TabStrip t={t} wrapStyle={{ marginTop: 40, marginBottom: 32 }} style={{ display: "flex", borderBottom: `2px solid ${t.border}` }}>
            {([["investment", DL.tabs.investment], ["leaderboards", DL.tabs.leaderboards]] as const).map(([key, label]) => {
              const active = dataTab === key;
              return (
                <button key={key} onClick={() => setDataTab(key)}
                  style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: isMobile ? 20 : 26, letterSpacing: 2, padding: isMobile ? "8px 18px 10px" : "10px 36px 13px", background: "none", border: "none", borderBottom: active ? `3px solid ${BRAND.pink}` : "3px solid transparent", color: active ? BRAND.pink : t.textMuted, cursor: "pointer", transition: "color 0.2s, border-color 0.2s", marginBottom: -2, outline: "none", whiteSpace: "nowrap" }}>
                  {label}
                </button>
              );
            })}
            {!isPdf && (
              <button type="button" onClick={() => dfSetAll(dataTab, !dfAllOpen(dataTab))}
                style={{ marginLeft: "auto", alignSelf: "center", flexShrink: 0, background: "none", border: "none", cursor: "pointer", fontFamily: "'DM Mono',monospace", fontSize: 10.5, letterSpacing: 1.6, textTransform: "uppercase", color: t.textMuted, padding: "6px 4px", whiteSpace: "nowrap" }}>
                {dfAllOpen(dataTab) ? DL.collapseAll : DL.expandAll}
              </button>
            )}
          </TabStrip>

          {/* ══════════ INVESTMENT TAB ══════════ */}
          {(isPdf || dataTab === "investment") && (
            <div>
              {/* Legend */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16, marginBottom: 28 }}>
                <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
                  {([[DL.categories.only, ONLY_COLOR], [DL.categories.also, ALSO_COLOR]] as const).map(([lbl, col]) => (
                    <span key={lbl} style={{ display: "flex", alignItems: "center", gap: 7, fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: 1.5, color: t.textMuted, textTransform: "uppercase" }}>
                      <span style={{ width: 10, height: 10, borderRadius: 2, background: col }} />{lbl}
                    </span>
                  ))}
                </div>
              </div>

              {dfAccordion("df-year", DL.accordions.year, dfKeys.year, (<>
              <div>
                {noteText(dealflowCopy.byYear)}
              </div>
              <SplitBarChart data={yearSplitData} tip={DL.chartTip} t={t} isPdf={isPdf} />

              {/* Rounds table */}
              <div className="stx-reveal" style={{ marginTop: 28, border: `1px solid ${t.border}`, borderRadius: 8, overflow: "auto" }}>
                <div style={{ minWidth: 520 }}>
                  <div style={{ display: "grid", gridTemplateColumns: `160px repeat(${facts.byYear.length},1fr)`, padding: "12px 20px", ...TABLE_HEAD }}>
                    <span>{DL.roundsTable.heading}</span>
                    {facts.byYear.map(r => <span key={r.year} style={{ textAlign: "right" }}>{r.year}</span>)}
                  </div>
                  {([
                    [DL.roundsTable.only,  (r: YearRow) => r.roundsOnly, false],
                    [DL.roundsTable.also,  (r: YearRow) => r.roundsAlso, false],
                    [DL.roundsTable.total, (r: YearRow) => r.roundsOnly + r.roundsAlso, true],
                  ] as const).map(([label, pick, isTotal], i) => (
                    <div key={label} style={{ display: "grid", gridTemplateColumns: `160px repeat(${facts.byYear.length},1fr)`, padding: "12px 20px", borderTop: `1px solid ${t.border}`, background: "transparent" }}>
                      <span style={{ fontSize: 12.5, fontWeight: isTotal ? 700 : 500, color: t.text }}>{label}</span>
                      {facts.byYear.map(r => (
                        <span key={r.year} style={{ textAlign: "right", fontFamily: "'DM Mono',monospace", fontSize: 12, color: isTotal ? BRAND.pink : t.textMuted, fontWeight: isTotal ? 700 : 400 }}>{pick(r)}</span>
                      ))}
                    </div>
                  ))}
                </div>
              </div>

              </>))}

              {dfAccordion("df-region", DL.accordions.region, dfKeys.region, (<>
              <div>
                {noteText(dealflowCopy.byRegion)}
              </div>
              <SplitBarChart data={regionSplitData} tip={DL.chartTip} t={t} isPdf={isPdf} />

              <div className="stx-reveal" style={{ marginTop: 28 }}>
                {noteText(dealflowCopy.regionSplit)}
              </div>

              <div className="stx-reveal" style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: isMobile ? 24 : 40 }}>
                <div>
                  <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: 2, color: t.textMuted, textTransform: "uppercase", marginBottom: 16 }}>{DL.shareOfFunding}</div>
                  {facts.byRegion.map((r, i) => {
                    const total = facts.byRegion.reduce((s, x) => s + x.footballOnly + x.footballAlso, 0);
                    const amt = r.footballOnly + r.footballAlso;
                    return <ProgressRow key={r.region} label={r.region} value={fmt(amt)} pct={(amt / total) * 100} delay={i * 90} t={t} />;
                  })}
                </div>
                <div>
                  <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: 2, color: t.textMuted, textTransform: "uppercase", marginBottom: 16 }}>{DL.roundsByRegion}</div>
                  {facts.byRegion.map((r, i) => {
                    const totalRounds = facts.byRegion.reduce((s, x) => s + x.roundsOnly + x.roundsAlso, 0);
                    const n = r.roundsOnly + r.roundsAlso;
                    return <ProgressRow key={r.region} label={r.region} value={`${n}${DL.roundsSuffix}`} pct={(n / totalRounds) * 100} delay={i * 90} t={t} color={ALSO_COLOR} />;
                  })}
                </div>
              </div>

              </>))}

              {dfAccordion("df-sector", DL.accordions.sector, dfKeys.sector, (<>
              <div>
                <p style={{ fontSize: 15, color: t.text, lineHeight: 1.9, margin: "16px 0 0" }}>
                  {DL.framework.map((part: string, i: number) => (i % 2 ? <strong key={i}>{part}</strong> : part))}{" "}
                  <a href={DL.frameworkLink.url} target="_blank" rel="noopener noreferrer"
                    style={{ color: BRAND.pink, textDecoration: "none", borderBottom: `1px solid ${BRAND.pink}55`, whiteSpace: "nowrap" }}>
                    {DL.frameworkLink.label}
                  </a>
                </p>
                {noteText(dealflowCopy.sector)}
                {noteText(dealflowCopy.sectorMix)}
              </div>

              <div className="stx-reveal" style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: isMobile ? 40 : 32, alignItems: "start" }}>
                {/* Slices are named from SECTOR_LABEL, not the row's own
                    label — the feed carries the database's wording ("Fans &
                    Content"), and the report says "Fan Tech" everywhere else. */}
                <DonutChart t={t} isPdf={isPdf} title={`${DL.sectorDonut}${facts.period.label}`}
                  slices={facts.sectorShare.map(s => ({ label: SECTOR_LABEL[s.sector], pct: s.pct, color: SECTOR_COLOR[s.sector] }))} />
                <DonutChart t={t} isPdf={isPdf} title={`${DL.sectorDonut}${facts.period.recentLabel}`}
                  slices={facts.sectorShareRecent.map(s => ({ label: SECTOR_LABEL[s.sector], pct: s.pct, color: SECTOR_COLOR[s.sector] }))} />
              </div>

              <div className="stx-reveal" style={{ marginTop: 56 }}>
                <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: 2, color: t.textMuted, textTransform: "uppercase", marginBottom: 16 }}>{DL.subSector}{facts.period.label}</div>
                {facts.subSectorShare.map((s, i) => (
                  <ProgressRow key={s.label} label={s.label} value={formatFtabr26Percent(s.pct)} pct={(s.pct / facts.subSectorShare[0].pct) * 100} delay={i * 70} t={t}
                    color={SECTOR_COLOR[s.parent === "execs" ? "execs" : s.parent === "fans" ? "fans" : "athletes"]} />
                ))}
              </div>
              </>))}
            </div>
          )}

          {/* ══════════ LEADERBOARDS TAB ══════════ */}
          {(isPdf || dataTab === "leaderboards") && (
            <div>
              {!isPdf && (<>
              {/* Category + window filters, top right; they also set which
                  side the Top Funded Companies table shows. */}
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: isMobile ? "flex-start" : "flex-end", marginBottom: 32 }}>
                <div style={{ display: "inline-flex", background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 20, padding: 3, gap: 2 }}>
                  {(["only", "also"] as const).map(key => {
                    const active = leaderCat === key;
                    return (
                      <button key={key} onClick={() => setLeaderCat(key)} style={{
                        fontFamily: "'DM Mono',monospace", fontSize: 9, letterSpacing: 1,
                        padding: "5px 15px", borderRadius: 14, border: "none", cursor: "pointer",
                        background: active ? BRAND.pink : "transparent", color: active ? "#fff" : t.textMuted,
                        fontWeight: active ? 700 : 400, transition: "all 0.18s", outline: "none", textTransform: "uppercase",
                      }}>{DL.categories[key]}</button>
                    );
                  })}
                </div>
                <div style={{ display: "inline-flex", background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 20, padding: 3, gap: 2 }}>
                  {([["allTime", facts.period.label], ["recent", `${DL.recentPrefix}${facts.period.recentMonths}${DL.recentSuffix}`]] as const).map(([key, lbl]) => {
                    const active = leaderWindow === key;
                    return (
                      <button key={key} onClick={() => setLeaderWindow(key)} style={{
                        fontFamily: "'DM Mono',monospace", fontSize: 9, letterSpacing: 1,
                        padding: "5px 15px", borderRadius: 14, border: "none", cursor: "pointer",
                        background: active ? BRAND.pink : "transparent", color: active ? "#fff" : t.textMuted,
                        fontWeight: active ? 700 : 400, transition: "all 0.18s", outline: "none", textTransform: "uppercase",
                      }}>{lbl}</button>
                    );
                  })}
                </div>
              </div>
              </>)}

              {/* The web shows the category picked above; the PDF prints Football Only and
                  then Football Also (all-time), each under its own heading. */}
              {(isPdf ? (["only", "also"] as const) : [leaderCat]).map(cat => {
                const lk = `${cat}${isPdf || leaderWindow === "allTime" ? "AllTime" : "Recent"}` as
                  "onlyAllTime" | "onlyRecent" | "alsoAllTime" | "alsoRecent";
                const countryRows: LeaderRow[] = facts.topCountries[lk];
                const cityRows: LeaderRow[] = facts.topCities[lk];
                const companyRows: CompanyRow[] = cat === "only" ? facts.topCompaniesOnly : facts.topCompaniesAlso;
                const sfx = isPdf && cat === "also" ? "-also" : "";
                const showNotes = !isPdf || cat === "only";
                return (
                /* Web: one stable key, so switching category swaps the rows in place
                   (like the period toggle) instead of remounting and re-animating the board. */
                <div key={isPdf ? cat : "board"}>
              {/* Countries + cities. On desktop each column subgrids the
                  title / note / list rows, so the two charts start on the
                  same line however long either note runs. */}
              <>
                {([
                  [`df-countries${sfx}`, DL.accordions.countries, countryRows, dealflowCopy.countries, dfKeys.countries],
                  [`df-cities${sfx}`,    DL.accordions.cities,    cityRows,    dealflowCopy.cities,    dfKeys.cities],
                ] as const).map(([dfId, title, rows, note, keyNum]) => {
                  /* Every bar is scaled against rank 1, so the collapsed rows
                     share the scale of the visible ones. */
                  const max = Math.max(...rows.map(r => r.amount), 1);
                  const top = rows.slice(0, 5);
                  const rest = rows.slice(5);
                  /* A PDF render has nothing to click, so it prints all ten. */
                  const isOpen = isPdf || !!leaderExpanded[title];
                  const leaderRow = (r: LeaderRow, i: number) => (
                    <div key={r.name} style={{ marginBottom: 18 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6, gap: 10 }}>
                        <span style={{ color: t.text, fontSize: 13, fontWeight: 500, display: "flex", alignItems: "center", gap: 7, minWidth: 0 }}>
                          <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: BRAND.slate }}>#{r.rank}</span>
                          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name}</span>
                        </span>
                        <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 12, color: BRAND.pink, fontWeight: 600, flexShrink: 0 }}>
                          {r.amount > 0 ? fmt(r.amount) : <span style={{ color: t.textMuted, fontWeight: 400 }}>{DL.undisclosed}</span>} <span style={{ color: t.textMuted, fontWeight: 400 }}>· {r.rounds} {r.rounds === 1 ? DL.round : DL.rounds}</span>
                        </span>
                      </div>
                      <AnimatedBar pct={(r.amount / max) * 100} delay={i * 80} trackColor={t.border} color={cat === "only" ? ONLY_COLOR : ALSO_COLOR} isPdf={isPdf} />
                    </div>
                  );
                  return dfAccordion(dfId, title, keyNum, (
                    <div>
                      {showNotes && <p style={{ fontSize: 15, color: t.text, lineHeight: 1.9, margin: "16px 0 24px" }}>{note}</p>}
                      <div>
                        {top.map(leaderRow)}
                        {rest.length > 0 && (
                          <>
                            <AccordionBody isOpen={isOpen} windowWidth={windowWidth}>
                              {rest.map((r, i) => leaderRow(r, i + top.length))}
                            </AccordionBody>
                            {!isPdf && (
                              <button
                                onClick={() => toggleLeaderExpanded(title)}
                                aria-expanded={isOpen}
                                style={{
                                  fontFamily: "'DM Mono',monospace", fontSize: 9, letterSpacing: 1.4, textTransform: "uppercase",
                                  background: "transparent", border: `1px solid ${t.border}`, borderRadius: 14,
                                  padding: "6px 15px", cursor: "pointer", color: t.textMuted, transition: "all 0.18s", outline: "none",
                                }}
                                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = BRAND.pink; (e.currentTarget as HTMLElement).style.borderColor = BRAND.pink; }}
                                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = t.textMuted; (e.currentTarget as HTMLElement).style.borderColor = t.border; }}
                              >
                                {isOpen ? DL.showTop : `${DL.showMorePrefix}${rest.length}${DL.showMoreSuffix}`}
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  ));
                })}
              </>

              {/* Companies: all-time only (no 18-month company list exists yet),
                  so the period toggle above doesn't apply and the table says so. */}
              {dfAccordion(`df-companies${sfx}`, DL.accordions.companies, dfKeys.companies, (<>
              <div>
                <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: 2, color: t.textMuted, textTransform: "uppercase", margin: "16px 0 0" }}>
                  {facts.period.label}{DL.allTimeRanking}
                </div>
                {noteText(cat === "only" ? dealflowCopy.companiesOnly : dealflowCopy.companiesAlso)}
                {/* Rank, then a logo column matching the ecosystem tables,
                    then name — the logo is resolved from the company website,
                    so the committed fallback rows fall back to a monogram. */}
                <div style={{ border: `1px solid ${t.border}`, borderRadius: 8, overflow: "hidden" }}>
                  <div style={{ display: "grid", gridTemplateColumns: isMobile ? "28px 34px 1fr 84px" : "48px 44px 1.1fr 1.5fr 150px 110px", gap: "0 12px", padding: "12px 20px", ...TABLE_HEAD }}>
                    <span>{DL.companyHeaders.rank}</span><span /><span>{DL.companyHeaders.name}</span>{!isMobile && <span>{DL.companyHeaders.description}</span>}{!isMobile && <span>{DL.companyHeaders.city}</span>}
                    <span style={{ textAlign: "right" }}>{DL.companyHeaders.funding}</span>
                  </div>
                  {companyRows.map((c, i) => {
                    const logoUrl = ecoLogoUrl(c.website);
                    return (
                      <div key={c.name} style={{ display: "grid", gridTemplateColumns: isMobile ? "28px 34px 1fr 84px" : "48px 44px 1.1fr 1.5fr 150px 110px", gap: "0 12px", padding: "12px 20px", alignItems: "center", background: "transparent", borderTop: `1px solid ${t.border}` }}>
                        <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: BRAND.slate }}>{c.rank}</span>
                        <div style={{ width: 30, height: 30, borderRadius: 5, flexShrink: 0, background: isDark ? "rgba(255,255,255,0.08)" : BRAND.white, border: `1px solid ${t.border}`, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                          {logoUrl && (
                            <img src={logoUrl} alt="" width={22} height={22} loading="lazy" style={{ objectFit: "contain" }}
                              onError={e => { const img = e.currentTarget; img.style.display = "none"; const sib = img.nextElementSibling as HTMLElement | null; if (sib) sib.style.display = "flex"; }} />
                          )}
                          <span style={{ display: logoUrl ? "none" : "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%", fontFamily: "'Bebas Neue',sans-serif", fontSize: 15, color: PITCH }}>
                            {(c.name || "?").charAt(0)}
                          </span>
                        </div>
                        <span style={{ fontSize: isMobile ? 12.5 : 13.5, fontWeight: 600, color: t.text, minWidth: 0 }}>
                          {c.name}
                          {isMobile && <span style={{ display: "block", fontSize: 11, color: t.textMuted, fontWeight: 400, marginTop: 2, lineHeight: 1.4 }}>{c.description} · {getCountryFlag(c.country)} {c.city}</span>}
                        </span>
                        {!isMobile && <span style={{ fontSize: 12.5, color: t.textMuted, lineHeight: 1.5 }}>{c.description}</span>}
                        {!isMobile && <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11.5, color: t.textMuted }}>{getCountryFlag(c.country)} {c.city}</span>}
                        <span style={{ textAlign: "right", fontFamily: "'DM Mono',monospace", fontSize: 12.5, color: BRAND.pink, fontWeight: 700 }}>{fmt(c.funding)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
              </>))}
                </div>
                );
              })}
            </div>
          )}

        </div>
      </div>
    </>),
    /* Methodology reads the data block's keys, so it goes when that block is locked */
    methodology: isLocked("data") ? null : () => (<>
      {/* ── METHODOLOGY (split out of Data in Full so it can close the page) ── */}
      <div id="methodology" style={{ background: t.bg, padding: isMobile ? "0 0 48px" : "0 0 88px" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: isMobile ? "0 16px" : "0 40px" }}>
          {/* Methodology note */}
          <div className="stx-reveal" style={{ marginTop: isMobile ? 48 : 72, background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 14, padding: isMobile ? "22px 18px" : "30px 34px" }}>
            <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: 2, color: BRAND.pink, textTransform: "uppercase", marginBottom: 12 }}>{DL.methodology.heading}</div>
            <p style={{ fontSize: 13.5, lineHeight: 1.85, color: t.textMuted, margin: "0 0 22px" }}>{FTABR26_METHODOLOGY.intro}</p>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: isMobile ? 16 : 24 }}>
              {FTABR26_METHODOLOGY.categories.map(c => (
                <div key={c.name} style={{ borderLeft: `3px solid ${DL.methodology.colors[c.name] ?? ALSO_COLOR}`, paddingLeft: 16 }}>
                  <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 22, letterSpacing: 0.6, color: titleCol }}>{c.name}</div>
                  <p style={{ fontSize: 13, lineHeight: 1.75, color: t.textMuted, margin: "6px 0 6px" }}>{c.description}</p>
                  <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: t.textMuted }}>{DL.methodology.eg}{c.examples}</div>
                </div>
              ))}
            </div>
            <a href={DL.methodology.fullHref} target="_blank" rel="noopener noreferrer" style={{ display: "inline-block", marginTop: 20, fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: 2, color: BRAND.pink, textDecoration: "none", textTransform: "uppercase", borderBottom: `1px solid ${BRAND.pink}55`, paddingBottom: 2 }}>{DL.methodology.fullLink}</a>
          </div>
        </div>
      </div>
    </>),
    credits: () => (<>
      {/* ── THANK-YOU LINE + IMPRINT ───────────────────────────────────────── */}
      <div id="credits" style={{ background: t.bgSec, padding: isMobile ? "40px 0" : "64px 0" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: isMobile ? "0 16px" : "0 40px" }}>
          <p style={{ fontSize: 15, color: t.text, lineHeight: 1.9, margin: "0 0 28px", maxWidth: 900 }}>{FTABR26_CREDITS.thanks}</p>
          <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: 2, color: t.textMuted, textTransform: "uppercase", marginBottom: 10 }}>{L.imprintHeading}</div>
          <p style={{ fontSize: 13, color: t.textMuted, lineHeight: 1.8, margin: 0 }}>
            {imprintLine(t.textMuted)}
          </p>
          <p style={{ fontSize: 13, color: t.textMuted, lineHeight: 1.8, margin: "4px 0 0" }}>{FTABR26_CREDITS.imprint.copyright}</p>
        </div>
      </div>
    </>),
  };
  // Blocks the admin locked, for a reader below Raise: the heading and the unlock panel only
  // (also in the print layout, which reads PARTS).
  for (const id of locked) {
    const meta = L.locked?.[id];
    if (PARTS[id] != null) PARTS[id] = () => <LockedPart anchor={meta?.anchor} title={meta?.title ?? id} colors={{ bg: t.bg, card: t.bgCard, border: t.border, title: t.titleColor, muted: t.textMuted, accent: BRAND.pink }} />;
  }
  const partOrder = [...new Set(Array.isArray(ov.partOrder) ? (ov.partOrder as string[]) : [])].filter((id) => PARTS[id] != null);


  /* ══════════════════════════════════════════════════════════════════════
     PRINT DOCUMENT (/reports/<slug>?pdf=true)
     A dedicated A4 layout for the downloadable PDF, modelled on the 3 Nov 2026
     STX-generated PDF: a cover, then every section on its own page(s) under a
     running header with the page number, compact type and card grids. It reads
     the same content as the web page (admin content, facts, ecosystem, startups),
     so the PDF can't drift from it. Pages marked data-fit scale their content
     down to fit one A4 page if an edit makes them longer (see fitPrintPages).
     ══════════════════════════════════════════════════════════════════════ */
  const PR = {
    pageBg: "#F4F6F9", ink: "#111827", text: "#1F2933", muted: BRAND.slate,
    border: "#E2E6EB", card: "#FFFFFF", head: COVER_BG,
  };
  const prEyebrow = (text: string, color: string = BRAND.pink) => (
    <div style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: "'DM Mono',monospace", fontSize: 9.5, letterSpacing: 3, color, textTransform: "uppercase" }}>
      <span aria-hidden style={{ width: 18, height: 3, background: PITCH, borderRadius: 2 }} />{text}
    </div>
  );
  const prHead = (eyebrow: string, title: string, lead?: React.ReactNode) => (
    <div style={{ marginBottom: 18 }}>
      {prEyebrow(eyebrow)}
      <h2 style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 40, lineHeight: 0.95, color: PR.ink, margin: "8px 0 0", letterSpacing: 0.3 }}>{title.replace(/\s*\n\s*/g, " ")}</h2>
      {lead && <p style={{ fontSize: 11.5, lineHeight: 1.6, color: PR.muted, margin: "8px 0 0" }}>{lead}</p>}
    </div>
  );
  const prSub = (text: string, right?: React.ReactNode) => (
    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, margin: "18px 0 8px" }}>
      <h3 style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 21, color: PR.ink, margin: 0, letterSpacing: 0.4 }}>{text}</h3>
      {right && <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, letterSpacing: 1.5, color: PR.muted, textTransform: "uppercase" }}>{right}</span>}
    </div>
  );
  const prText = (text: string, size = 11) =>
    String(text ?? "").split(/\n\s*\n/).map(p => p.trim()).filter(Boolean).map((p, i) => (
      <p key={i} style={{ fontSize: size, lineHeight: 1.65, color: PR.text, margin: "0 0 8px" }}>{richText(p)}</p>
    ));
  const prCard: React.CSSProperties = { background: PR.card, border: `1px solid ${PR.border}`, borderRadius: 8 };
  const prTake = (text?: string) => text ? (
    <div style={{ marginTop: 14, ...prCard, borderLeft: `4px solid ${BRAND.pink}`, padding: "12px 16px" }}>
      <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 18, letterSpacing: 0.8, color: BRAND.pink, lineHeight: 1 }}>{TL.ourTake}</div>
      <p style={{ margin: "6px 0 0", fontSize: 11, lineHeight: 1.65, color: PR.text }}>{richText(text)}</p>
    </div>
  ) : null;
  const prMono: React.CSSProperties = { fontFamily: "'DM Mono',monospace", fontSize: 9, letterSpacing: 1.5, color: PR.muted, textTransform: "uppercase" };
  const prSrc: React.CSSProperties = { fontSize: 8.5, letterSpacing: 1.1, lineHeight: 1.7 };

  /* Leaderboard list (countries, cities): rank, name, amount · rounds, bar */
  const prLeaderList = (title: string, rows: LeaderRow[], color: string) => {
    const max = Math.max(...rows.map(r => r.amount), 1);
    return (
      <div style={{ ...prCard, padding: "12px 14px" }}>
        <div style={{ ...prMono, marginBottom: 8 }}>{title}</div>
        {rows.slice(0, 10).map(r => (
          <div key={r.name} style={{ marginBottom: 7 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 10.5, color: PR.text }}>
              <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: BRAND.slate, marginRight: 6 }}>#{r.rank}</span>{r.name}
              </span>
              <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 9.5, color: BRAND.pink, fontWeight: 600, flexShrink: 0 }}>
                {r.amount > 0 ? fmt(r.amount) : <span style={{ color: PR.muted, fontWeight: 400 }}>{DL.undisclosed}</span>}
                <span style={{ color: PR.muted, fontWeight: 400 }}> · {r.rounds} {r.rounds === 1 ? DL.round : DL.rounds}</span>
              </span>
            </div>
            <div style={{ height: 4, borderRadius: 2, background: PR.border, marginTop: 3 }}>
              <div style={{ width: `${(r.amount / max) * 100}%`, height: "100%", borderRadius: 2, background: color }} />
            </div>
          </div>
        ))}
      </div>
    );
  };
  /* Top funded companies table */
  const prCompanies = (title: string, rows: CompanyRow[]) => (
    <div style={{ ...prCard, overflow: "hidden", marginBottom: 14 }}>
      <div style={{ display: "grid", gridTemplateColumns: "26px 1.05fr 1.7fr 0.9fr 64px", gap: "0 10px", padding: "8px 12px", background: PR.head, color: "#fff", fontFamily: "'DM Mono',monospace", fontSize: 8.5, letterSpacing: 1.5, textTransform: "uppercase" }}>
        <span>{DL.companyHeaders.rank}</span><span>{title}</span><span>{DL.companyHeaders.description}</span><span>{DL.companyHeaders.city}</span><span style={{ textAlign: "right" }}>{DL.companyHeaders.funding}</span>
      </div>
      {rows.map((c, i) => (
        <div key={c.name} style={{ display: "grid", gridTemplateColumns: "26px 1.05fr 1.7fr 0.9fr 64px", gap: "0 10px", padding: "6px 12px", borderTop: i ? `1px solid ${PR.border}` : "none", fontSize: 10, alignItems: "center" }}>
          <span style={{ fontFamily: "'DM Mono',monospace", color: PR.muted }}>{c.rank ?? i + 1}</span>
          <span style={{ fontWeight: 700, color: PR.ink }}>{c.name}</span>
          <span style={{ color: PR.muted, lineHeight: 1.4 }}>{c.description}</span>
          <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: PR.muted }}>{c.city}</span>
          <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: BRAND.pink, fontWeight: 600, textAlign: "right" }}>{c.funding > 0 ? fmt(c.funding) : DL.undisclosed}</span>
        </div>
      ))}
    </div>
  );
  /* Ecosystem table (initiatives or accelerators) */
  const prEcoTable = (title: string, rows: Ftabr26EcosystemEntry[]) => (
    <div>
      <div style={{ ...prMono, color: BRAND.pink, marginBottom: 6 }}>{title}</div>
      <div style={{ ...prCard, overflow: "hidden" }}>
        {rows.map((r, i) => {
          const href = ecoHref(r.website);
          return (
            <div key={`${r.name}-${i}`} style={{ display: "grid", gridTemplateColumns: "18px minmax(0,1fr) auto", gap: "0 8px", alignItems: "center", padding: "5px 10px", borderTop: i ? `1px solid ${PR.border}` : "none", fontSize: 9.5 }}>
              <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 8.5, color: PR.muted }}>{i + 1}</span>
              <span style={{ fontWeight: 700, color: PR.ink, lineHeight: 1.3 }}>
                {href ? <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: "inherit", textDecoration: "none" }}>{r.name}</a> : r.name}
              </span>
              <span style={{ justifySelf: "end" }}>{ecoLocationNode(r, 8.5, "·")}</span>
            </div>
          );
        })}
      </div>
    </div>
  );

  /* The pages, in order. `contents` names the page in the table of contents. */
  type PrintPage = { id: string; contents?: string; kind?: "cover" | "white"; fit?: boolean; node: () => React.ReactNode };
  const printPages: PrintPage[] = [];
  const addPage = (p: PrintPage) => { printPages.push(p); };
  /* A block's pages, or — when the block is locked for this reader — one page with its locked panel */
  const addBlockPages = (block: string, add: () => void) => {
    if (isLocked(block)) addPage({ id: block, contents: L.locked?.[block]?.title, node: () => PARTS[block]?.() });
    else add();
  };

  /* 1 · Cover */
  addPage({ id: "cover", kind: "cover", fit: false, node: () => (
    <div style={{ position: "relative", height: "100%", background: COVER_BG, backgroundImage: COVER_STRIPES, color: "#fff", overflow: "hidden" }}>
      <svg aria-hidden viewBox="0 0 794 1123" preserveAspectRatio="xMidYMid slice" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
        <g fill="none" stroke={COVER_LINES} strokeWidth="1.5">
          <line x1="-20" y1="561" x2="814" y2="561" />
          <circle cx="397" cy="561" r="105" />
          <rect x="217" y="-2" width="360" height="150" /><rect x="307" y="-2" width="180" height="60" />
          <rect x="217" y="975" width="360" height="150" /><rect x="307" y="1065" width="180" height="60" />
        </g>
        <circle cx="397" cy="561" r="4" fill={COVER_LINES} />
      </svg>
      <div style={{ position: "relative", height: "100%", display: "flex", flexDirection: "column", padding: "56px 52px 44px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <img src="/stx_white_horizontal.png" alt="SportsTechX" style={{ height: 26, opacity: 0.9 }} />
          <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: 3, color: "rgba(255,255,255,0.6)" }}>{FTABR26_HERO.hashtag}</span>
        </div>
        <div style={{ marginTop: 150 }}>
          <h1 style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 92, lineHeight: 0.88, margin: 0, letterSpacing: 0.5 }}>
            {titleLines.map((line, i) => i === 0
              ? <span key={i} style={{ display: "block", color: BRAND.pink }}>{line}</span>
              : i === titleLines.length - 1
                ? <span key={i} style={{ display: "block" }}>{lastLine(line).head}{" "}<span style={{ color: BRAND.pink }}>{lastLine(line).tail}</span></span>
                : <span key={i} style={{ display: "block" }}>{line}</span>)}
          </h1>
          <div style={{ display: "flex", gap: 6, marginTop: 20 }}>
            <div style={{ width: 48, height: 3, background: BRAND.pink, borderRadius: 2 }} />
            <div style={{ width: 24, height: 3, background: PITCH_LIGHT, borderRadius: 2 }} />
          </div>
          <p style={{ fontSize: 15, lineHeight: 1.6, color: "rgba(255,255,255,0.88)", margin: "18px 0 0", maxWidth: 460 }}>{FTABR26_HERO.standfirst}</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginTop: 44 }}>
          {SUMMARY.map((card, i) => (
            <div key={i} style={{ background: "#fff", borderRadius: 10, borderTop: `3px solid ${BRAND.pink}`, padding: "16px 16px 14px", color: PR.ink }}>
              <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 38, lineHeight: 1, color: BRAND.pink }}>{card.num}</div>
              <div style={{ marginTop: 6, fontSize: 11.5, fontWeight: 700, lineHeight: 1.35 }}>{card.label}</div>
              {card.subtitle && <div style={{ marginTop: 4, fontSize: 9.5, lineHeight: 1.45, color: PR.muted }}>{card.subtitle}</div>}
            </div>
          ))}
        </div>
        <div style={{ marginTop: "auto", display: "flex", alignItems: "flex-end", gap: 26 }}>
          <div>
            <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 8.5, letterSpacing: 2, color: "rgba(190,208,227,0.6)", textTransform: "uppercase", marginBottom: 8 }}>{L.publishedBy}</div>
            <div style={{ height: 30, display: "flex", alignItems: "center" }}><img src="/stx_white_horizontal.png" alt="SportsTechX" style={{ height: 30 }} /></div>
          </div>
          <div style={{ width: 1, height: 44, background: "rgba(190,208,227,0.25)" }} />
          <div>
            <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 8.5, letterSpacing: 2, color: "rgba(190,208,227,0.6)", textTransform: "uppercase", marginBottom: 8 }}>{L.poweredBy}</div>
            <div style={{ height: 30, display: "flex", alignItems: "center" }}><img src="/landing/atlas-wordmark-white.svg" alt="Atlas" style={{ height: 23 }} /></div>
          </div>
          <div style={{ width: 1, height: 44, background: "rgba(190,208,227,0.25)" }} />
          <div>
            <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 8.5, letterSpacing: 2, color: "rgba(190,208,227,0.6)", textTransform: "uppercase", marginBottom: 8 }}>{FTABR26_HERO.edition}</div>
            <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 28, lineHeight: "30px" }}>{FTABR26_HERO.hashtag}</div>
          </div>
          <div style={{ width: 1, height: 44, background: "rgba(190,208,227,0.25)" }} />
          <div>
            <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 8.5, letterSpacing: 2, color: "rgba(190,208,227,0.6)", textTransform: "uppercase", marginBottom: 8 }}>{PP.dataPeriod}</div>
            <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 28, lineHeight: "30px" }}>{PP.periodLabel}</div>
          </div>
        </div>
      </div>
    </div>
  ) });

  /* 2 · About + contents */
  addPage({ id: "about", node: () => {
    const paras = String(FTABR26_ABOUT ?? "").split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
    const partners = L.partnerLogos;
    const toc = printPages.map((p, i) => ({ n: i + 1, id: p.id, label: p.contents })).filter(x => x.label);
    return (<>
      {prHead(PP.about.eyebrow, PP.about.title)}
      {paras.map((p, i) => (
        <p key={i} style={{ fontSize: 12.5, lineHeight: 1.75, color: PR.text, margin: "0 0 10px", fontWeight: i === paras.length - 1 && paras.length > 1 ? 700 : 400 }}>{p}</p>
      ))}
      <div style={{ display: "flex", alignItems: "center", gap: 22, marginTop: 18, paddingTop: 14, borderTop: `1px solid ${PR.border}` }}>
        <span style={prMono}>{PP.about.partners}</span>
        {partners.map(pt => (
          <span key={pt.name} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 130, height: 30 }}>
            <img src={pt.src} alt={pt.name} style={{ maxWidth: `${pt.scale * 100}%`, maxHeight: `${pt.scale * 100}%`, objectFit: "contain", filter: "brightness(0)" }} />
          </span>
        ))}
      </div>
      {/* Atlas banner 1: early, where a forwarded PDF first meets Atlas */}
      <div style={{ marginTop: 18 }}><Ftabr26AtlasCta {...PP.ctas.explore} compact /></div>
      <div style={{ marginTop: 20 }}>
        {prEyebrow(PP.about.toc)}
        <div style={{ ...prCard, marginTop: 10, padding: "2px 18px" }}>
          {/* Each entry links to its page (internal PDF link) */}
          {toc.map((x, i) => (
            <a key={x.n} href={`#pdf-${x.id}`} style={{ display: "flex", alignItems: "baseline", gap: 10, padding: "6px 0", borderTop: i ? `1px solid ${PR.border}` : "none", textDecoration: "none" }}>
              <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 16, color: PR.ink, letterSpacing: 0.4, flex: 1 }}>{x.label}</span>
              <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 10.5, color: BRAND.pink }}>{String(x.n).padStart(2, "0")}</span>
            </a>
          ))}
        </div>
      </div>
    </>);
  } });

  /* 3–5 · Insights, one page per piece */
  addBlockPages("trends", () => {
  FTABR26_INSIGHTS.forEach((a: InsightArticle) => addPage({ id: `insight-${a.key}`, contents: `${PP.insightsPrefix}${a.label}`, node: () => {
    const graphic = insightGraphic(a);
    return (<>
      {prHead(`${PP.insightsPrefix}${a.label}`, a.heading, a.description)}
      <h3 style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 22, color: PR.ink, margin: "6px 0 10px", letterSpacing: 0.3 }}>{a.title}</h3>
      <div style={{ display: "grid", gridTemplateColumns: graphic ? "minmax(0,1.15fr) minmax(0,1fr)" : "1fr", gap: 22, alignItems: "start" }}>
        <div className="ft26-pp">{insightBody(a.body)}</div>
        {graphic && <div className="ft26-pp-graphic">{graphic}</div>}
      </div>
      {prTake(a.take)}
    </>);
  } }));

  /* 6–7 · FIFA World Cup 26 recap, over two pages */
  const wcCard = (item: WorldCupTech, col: string) => (
    <div key={item.id} style={{ ...prCard, overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <div style={{ height: 3, background: col }} />
      <div style={{ padding: "10px 12px 10px", display: "flex", flexDirection: "column", gap: 5, flex: 1 }}>
        <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 15.5, letterSpacing: 0.3, lineHeight: 1.1, color: PR.ink }}>{item.title}</span>
        <p style={{ fontSize: 9.8, lineHeight: 1.55, color: PR.text, margin: 0 }}>{item.body}</p>
        {wcSourceLinks(item, { ...prSrc, marginTop: "auto", paddingTop: 2 })}
      </div>
    </div>
  );
  const wcGroup = (g: { category: string; items: WorldCupTech[] }) => {
    const col = WC_COLORS[g.category] ?? PITCH;
    return (
      <div key={g.category} style={{ marginTop: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: col }} />
          <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 17, letterSpacing: 0.6, color: PR.ink }}>{g.category.toUpperCase()}</span>
          <span style={{ ...prMono, fontSize: 8.5 }}>{g.items.length}</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>{g.items.map(it => wcCard(it, col))}</div>
      </div>
    );
  };
  const wcSplit = Math.min(2, WORLDCUP_TECH_GROUPS.length);
  addPage({ id: "wc-1", contents: PP.worldcup.contents, node: () => (<>
    {prHead(PP.worldcup.eyebrow, FTABR26_WORLDCUP.title)}
    <p style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 18, color: BRAND.pink, letterSpacing: 0.8, margin: "-8px 0 8px" }}>{FTABR26_WORLDCUP.standfirst}</p>
    {prText(FTABR26_WORLDCUP.intro, 11)}
    <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr 1fr 1fr", gap: 8, marginTop: 10 }}>
      {[FTABR26_WORLDCUP.headline, ...FTABR26_WORLDCUP.stats].map((s, i) => (
        <div key={s.value + i} style={{ ...prCard, padding: "12px 12px 10px", ...(i === 0 ? { background: PITCH_TINT, borderLeft: `4px solid ${PITCH}` } : { borderTop: `3px solid ${PITCH}` }) }}>
          <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: i === 0 ? 38 : 32, color: BRAND.pink, lineHeight: 1 }}>{s.value}</div>
          <div style={{ marginTop: 5, fontSize: 10, fontWeight: 700, color: PR.ink, lineHeight: 1.35 }}>{s.label}</div>
          <div style={{ marginTop: 4, fontSize: 9, color: PR.muted, lineHeight: 1.45 }}>{s.sublabel}</div>
          {wcSourceLinks(s, { ...prSrc, marginTop: 6 })}
        </div>
      ))}
    </div>
    {prSub(FTABR26_WORLDCUP.techHeading.toUpperCase())}
    {WORLDCUP_TECH_GROUPS.slice(0, wcSplit).map(wcGroup)}
  </>) });
  addPage({ id: "wc-2", node: () => (<>
    {prEyebrow(PP.worldcup.continued)}
    {WORLDCUP_TECH_GROUPS.slice(wcSplit).map(wcGroup)}
    {prTake(FTABR26_WORLDCUP.take)}
  </>) });
  });

  /* 8–12 · Dealflow */
  addBlockPages("data", () => {
  addPage({ id: "df-year", contents: PP.dealflow.contents, node: () => (<>
    {prHead(PP.dealflow.eyebrow, PP.dealflow.title, <>{DL.intro.lead} <strong style={{ color: PITCH }}>{DL.intro.only}</strong> {DL.intro.mid} <strong style={{ color: ALSO_COLOR }}>{DL.intro.also}</strong> {DL.intro.tail} {facts.period.label}{DL.intro.end}</>)}
    {prSub(PP.dealflow.year, dfKeys.year)}
    {prText(dealflowCopy.byYear)}
    <div style={{ ...prCard, padding: "14px 14px 6px", marginTop: 6 }}>
      <SplitBarChart data={yearSplitData} tip={DL.chartTip} t={LIGHT} isPdf />
    </div>
    <div style={{ ...prCard, overflow: "hidden", marginTop: 10 }}>
      <div style={{ display: "grid", gridTemplateColumns: `120px repeat(${facts.byYear.length},1fr)`, padding: "7px 12px", background: PR.head, color: "#fff", fontFamily: "'DM Mono',monospace", fontSize: 8.5, letterSpacing: 1.5, textTransform: "uppercase" }}>
        <span>{DL.roundsTable.heading}</span>{facts.byYear.map(r => <span key={r.year} style={{ textAlign: "right" }}>{r.year}</span>)}
      </div>
      {([[DL.roundsTable.only, (r: YearRow) => r.roundsOnly, false], [DL.roundsTable.also, (r: YearRow) => r.roundsAlso, false], [DL.roundsTable.total, (r: YearRow) => r.roundsOnly + r.roundsAlso, true]] as const).map(([label, val, isTotal]) => (
        <div key={label} style={{ display: "grid", gridTemplateColumns: `120px repeat(${facts.byYear.length},1fr)`, padding: "6px 12px", borderTop: `1px solid ${PR.border}`, fontSize: 10 }}>
          <span style={{ fontWeight: isTotal ? 700 : 500, color: PR.ink }}>{label}</span>
          {facts.byYear.map(r => <span key={r.year} style={{ textAlign: "right", fontFamily: "'DM Mono',monospace", color: isTotal ? BRAND.pink : PR.muted, fontWeight: isTotal ? 700 : 400 }}>{val(r)}</span>)}
        </div>
      ))}
    </div>
  </>) });
  addPage({ id: "df-region", node: () => {
    const total = facts.byRegion.reduce((s, x) => s + x.footballOnly + x.footballAlso, 0);
    const totalRounds = facts.byRegion.reduce((s, x) => s + x.roundsOnly + x.roundsAlso, 0);
    return (<>
      {prEyebrow(PP.dealflow.eyebrow)}
      {prSub(PP.dealflow.region, dfKeys.region)}
      {prText(dealflowCopy.byRegion)}
      <div style={{ ...prCard, padding: "14px 14px 6px" }}><SplitBarChart data={regionSplitData} tip={DL.chartTip} t={LIGHT} isPdf /></div>
      <div style={{ marginTop: 12 }}>{prText(dealflowCopy.regionSplit)}</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div style={{ ...prCard, padding: "12px 14px" }}>
          <div style={{ ...prMono, marginBottom: 10 }}>{DL.shareOfFunding}</div>
          {facts.byRegion.map(r => { const amt = r.footballOnly + r.footballAlso; return <ProgressRow key={r.region} label={r.region} value={fmt(amt)} pct={(amt / total) * 100} t={LIGHT} isPdf />; })}
        </div>
        <div style={{ ...prCard, padding: "12px 14px" }}>
          <div style={{ ...prMono, marginBottom: 10 }}>{DL.roundsByRegion}</div>
          {facts.byRegion.map(r => { const n = r.roundsOnly + r.roundsAlso; return <ProgressRow key={r.region} label={r.region} value={`${n}${DL.roundsSuffix}`} pct={(n / totalRounds) * 100} t={LIGHT} color={ALSO_COLOR} isPdf />; })}
        </div>
      </div>
    </>);
  } });
  addPage({ id: "df-sector", node: () => (<>
    {prEyebrow(PP.dealflow.eyebrow)}
    {prSub(PP.dealflow.sector, dfKeys.sector)}
    <p style={{ fontSize: 11, lineHeight: 1.65, color: PR.text, margin: "0 0 8px" }}>
      {DL.framework.map((part: string, i: number) => (i % 2 ? <strong key={i}>{part}</strong> : part))}{" "}
      <a href={PP.dealflow.frameworkUrl} target="_blank" rel="noopener noreferrer" style={{ color: BRAND.pink, textDecoration: "none", borderBottom: `1px solid ${BRAND.pink}55` }}>{DL.frameworkLink.label}</a>
    </p>
    {prText(dealflowCopy.sector)}
    {prText(dealflowCopy.sectorMix)}
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 6 }}>
      <div style={{ ...prCard, padding: 12 }}>
        <DonutChart t={LIGHT} isPdf title={`${DL.sectorDonut}${facts.period.label}`}
          slices={facts.sectorShare.map(s => ({ label: SECTOR_LABEL[s.sector], pct: s.pct, color: SECTOR_COLOR[s.sector] }))} />
      </div>
      <div style={{ ...prCard, padding: 12 }}>
        <DonutChart t={LIGHT} isPdf title={`${DL.sectorDonut}${facts.period.recentLabel}`}
          slices={facts.sectorShareRecent.map(s => ({ label: SECTOR_LABEL[s.sector], pct: s.pct, color: SECTOR_COLOR[s.sector] }))} />
      </div>
    </div>
    <div style={{ ...prCard, padding: "12px 14px", marginTop: 12 }}>
      <div style={{ ...prMono, marginBottom: 10 }}>{DL.subSector}{facts.period.label}</div>
      {facts.subSectorShare.map(s => (
        <ProgressRow key={s.label} label={s.label} value={formatFtabr26Percent(s.pct)} pct={(s.pct / facts.subSectorShare[0].pct) * 100} t={LIGHT} isPdf
          color={SECTOR_COLOR[s.parent === "execs" ? "execs" : s.parent === "fans" ? "fans" : "athletes"]} />
      ))}
    </div>
  </>) });
  addPage({ id: "df-places", contents: PP.leaderboards.contents, node: () => (<>
    {prHead(PP.leaderboards.eyebrow, PP.leaderboards.placesTitle, `${PP.leaderboards.placesLeadPrefix}${facts.period.label}${PP.leaderboards.placesLeadSuffix}`)}
    {prText(dealflowCopy.countries, 10.5)}
    {prText(dealflowCopy.cities, 10.5)}
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 6 }}>
      {prLeaderList(PP.leaderboards.lists.countriesOnly, facts.topCountries.onlyAllTime, ONLY_COLOR)}
      {prLeaderList(PP.leaderboards.lists.countriesAlso, facts.topCountries.alsoAllTime, ALSO_COLOR)}
      {prLeaderList(PP.leaderboards.lists.citiesOnly, facts.topCities.onlyAllTime, ONLY_COLOR)}
      {prLeaderList(PP.leaderboards.lists.citiesAlso, facts.topCities.alsoAllTime, ALSO_COLOR)}
    </div>
  </>) });
  addPage({ id: "df-companies", node: () => (<>
    {prHead(PP.leaderboards.eyebrow, PP.leaderboards.companiesTitle, `${facts.period.label}${DL.allTimeRanking}`)}
    {prText(dealflowCopy.companiesOnly, 10.5)}
    {prCompanies(DL.categories.only, facts.topCompaniesOnly)}
    {prText(dealflowCopy.companiesAlso, 10.5)}
    {prCompanies(DL.categories.also, facts.topCompaniesAlso)}
    {/* Atlas banner 2: founders have just read who raised what */}
    <div style={{ marginTop: 14 }}><Ftabr26AtlasCta {...PP.ctas.raise} compact /></div>
  </>) });
  });

  /* 13–14 · Partner features (the web panels, scaled to the page) */
  addBlockPages("featured", () => addPage({ id: "playermaker", contents: PP.playermaker.contents, kind: "white", node: () => PARTS.featured?.() }));
  /* Soccerment on its own: the Atlas banner that sits before it on the web closes the PDF instead */
  addBlockPages("soccerment", () => addPage({ id: "soccerment", contents: PP.soccerment.contents, kind: "white", node: () => (
    <div style={{ padding: "34px 14px" }}><Ftabr26SoccermentFeature data={FTABR26_SOCCERMENT} labels={SOL} print /></div>
  ) }));

  /* 15 · Ecosystem */
  addBlockPages("ecomap", () => addPage({ id: "ecosystem", contents: PP.ecosystem.contents, node: () => (<>
    {prHead(PP.ecosystem.eyebrow, PP.ecosystem.title, PP.ecosystem.lead)}
    <div className="ft26-pp-map" style={{ ...prCard, padding: 8 }}>
      <Suspense fallback={null}>
        <Ftabr26EcosystemMap t={LIGHT} isDark={false} isMobile={false} eco={eco} selected={null} onSelect={() => {}} print labels={ECL.map} />
      </Suspense>
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "1.15fr 1fr", gap: 14, marginTop: 14, alignItems: "start" }}>
      {prEcoTable(`${PP.ecosystem.initiatives} (${eco.initiatives.length})`, eco.initiatives)}
      {prEcoTable(`${PP.ecosystem.programs} (${eco.programs.length})`, eco.programs)}
    </div>
  </>) }));

  /* 16 · Startups to watch */
  addBlockPages("startups", () => addPage({ id: "startups", contents: PP.startups.contents, node: () => (<>
    {prHead(PP.startups.eyebrow, PP.startups.title, FTABR26_STARTUPS_NOTE)}
    <div style={{ display: "flex", gap: 16, marginBottom: 12 }}>
      {SECTORS.map(({ key: s }) => (
        <span key={s} style={{ display: "inline-flex", alignItems: "center", gap: 6, ...prMono }}>
          <span style={{ width: 9, height: 9, borderRadius: 2, background: SECTOR_COLOR[s] }} />{SECTOR_LABEL[s]}
        </span>
      ))}
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14 }}>
      {watchStartups.map(c => {
        const loc = startupLocation(c);
        const code = ecoFlagCode(loc.country);
        const logo = startupLogoUrl(c);
        const href = c.website ? (/^https?:/i.test(c.website) ? c.website : `https://${c.website}`) : null;
        const col = c.sector ? SECTOR_COLOR[c.sector] : PR.border;
        return (
          <div key={c.name} style={{ ...prCard, borderTop: `3px solid ${col}`, padding: "16px 16px 18px", minHeight: 150, display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 38, height: 38, borderRadius: 7, border: `1px solid ${PR.border}`, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0, background: "#fff" }}>
                {logo ? <img src={logo} alt="" style={{ width: 26, height: 26, objectFit: "contain" }} /> : <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 19, color: PITCH }}>{c.name.charAt(0)}</span>}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: PR.ink, lineHeight: 1.2 }}>
                  {href ? <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: "inherit", textDecoration: "none" }}>{c.name}</a> : c.name}
                </div>
                {(loc.city || loc.country) && (
                  <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 2, fontFamily: "'DM Mono',monospace", fontSize: 8.5, color: PR.muted }}>
                    {code && <img src={`/reports/ftabr26/flags/${code}.svg`} alt={loc.country ?? ""} width={14} height={10} style={{ width: 14, height: 10, objectFit: "cover", borderRadius: 1.5 }} />}
                    {loc.city ?? loc.country}
                  </div>
                )}
              </div>
            </div>
            {c.description && <p style={{ fontSize: 11, lineHeight: 1.55, color: PR.text, margin: 0 }}>{c.description}</p>}
          </div>
        );
      })}
    </div>
    {/* Atlas banner 3: under the grid, for investors and accelerators */}
    <div style={{ marginTop: 18 }}><Ftabr26AtlasCta {...PP.ctas.scout} compact /></div>
  </>) }));

  /* 17 · Innovators */
  addBlockPages("innovators", () => addPage({ id: "innovators", contents: PP.innovators.contents, node: () => (<>
    {prHead(PP.innovators.eyebrow, PP.innovators.title, <>{PP.innovators.lead}</>)}
    {/* Five per row, the last row centred (14 = 5 + 5 + 4) */}
    <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 10 }}>
      {FTABR26_INNOVATORS.map(p => (
        <div key={p.id} style={{ ...prCard, width: "calc((100% - 40px) / 5)", boxSizing: "border-box", padding: "16px 10px 14px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 10 }}>
          <Ftabr26PersonAvatar name={p.name} photoUrl={p.photoUrl} color={INNOVATOR_RING} size={78} ringWidth={2} ringGap={3} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 16, letterSpacing: 0.4, color: PR.ink, lineHeight: 1.1 }}>{p.name}</div>
            <div style={{ fontSize: 9.5, color: PR.muted, lineHeight: 1.35, marginTop: 3 }}>{p.company}</div>
            {p.continent && <div style={{ ...prMono, fontSize: 7.5, marginTop: 4, color: PITCH }}>{p.continent}</div>}
          </div>
        </div>
      ))}
    </div>
  </>) }));

  /* 18 · Methodology, credits, close */
  addPage({ id: "closing", contents: PP.closing.contents, node: () => (<>
    {!isLocked("data") && (<>
    {prHead(PP.closing.eyebrow, PP.closing.title)}
    {prText(FTABR26_METHODOLOGY.intro, 11)}
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 6 }}>
      {FTABR26_METHODOLOGY.categories.map((c: { name: string; description: string; examples?: string }) => (
        <div key={c.name} style={{ ...prCard, padding: "12px 14px", borderLeft: `3px solid ${DL.methodology.colors[c.name] ?? ALSO_COLOR}` }}>
          <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 17, color: PR.ink, letterSpacing: 0.4 }}>{c.name}</div>
          <p style={{ fontSize: 10.5, lineHeight: 1.55, color: PR.text, margin: "4px 0 0" }}>{c.description}</p>
          {c.examples && <div style={{ ...prMono, fontSize: 8, marginTop: 6, textTransform: "none", letterSpacing: 0.4 }}>{DL.methodology.eg}{c.examples}</div>}
        </div>
      ))}
    </div>
    </>)}
    <div style={{ marginTop: 26 }}>
      {prEyebrow(PP.closing.credits)}
      <p style={{ fontSize: 11.5, lineHeight: 1.7, color: PR.text, margin: "10px 0 0" }}>{FTABR26_CREDITS.thanks}</p>
      <div style={{ ...prCard, padding: "12px 14px", marginTop: 12, fontSize: 10.5, lineHeight: 1.7, color: PR.text }}>
        <div style={{ ...prMono, marginBottom: 4 }}>{L.imprintHeading}</div>
        <div>{imprintLine("inherit")}</div>
        <div>{FTABR26_CREDITS.imprint.copyright}</div>
      </div>
    </div>
    {/* Atlas banner 4: closing, pointing to all three solutions */}
    <div style={{ marginTop: 24 }}><Ftabr26AtlasCta {...PP.ctas.closing} compact /></div>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 24 }}>
      <img src="/stx_white_horizontal.png" alt="SportsTechX" style={{ height: 24, filter: "brightness(0)" }} />
      <a href={PP.closing.link.href} target="_blank" rel="noopener noreferrer" style={{ fontFamily: "'DM Mono',monospace", fontSize: 9.5, letterSpacing: 1.5, color: BRAND.pink, textDecoration: "none" }}>{PP.closing.link.label}</a>
    </div>
  </>) });

  const printDocument = isPdf ? (
    <div ref={reportContainerRef} className="ft26-root ft26-print">
      {printPages.map((p, i) => (
        <section key={p.id} id={`pdf-${p.id}`} className={`ft26-page${p.kind === "cover" ? " ft26-page--cover" : ""}`} data-fit={p.fit === false ? undefined : ""}
          style={{ background: p.kind === "white" ? "#fff" : p.kind === "cover" ? COVER_BG : PR.pageBg }}>
          {p.kind !== "cover" && (
            <header className="ft26-page-head" style={{ background: PR.head }}>
              <img src="/stx_white_horizontal.png" alt="SportsTechX" style={{ height: 14, opacity: 0.9 }} />
              <span>{PP.runningHead}{FTABR26_HERO.hashtag}</span>
              <span className="ft26-page-no">{String(i + 1).padStart(2, "0")}</span>
            </header>
          )}
          <div className="ft26-page-body" style={{ padding: p.kind === "cover" ? 0 : p.kind === "white" ? "6px 6px 6px" : "28px 40px 26px", ...(p.kind === "white" ? { display: "flex", flexDirection: "column", justifyContent: "center" } : {}) }}>
            <div className="ft26-fit">{p.node()}</div>
          </div>
        </section>
      ))}
    </div>
  ) : null;

  if (printDocument) return printDocument;

  return (
    <div ref={reportContainerRef} className="ft26-root" style={{ background: t.bg, color: t.text, fontFamily: "'Open Sans','system-ui',sans-serif", overflowX: "hidden", minHeight: "100vh", transition: "background 0.35s, color 0.35s" }}>
      {/* ── READING PROGRESS ────────────────────────────────────────────── */}
      <div style={{ position: "fixed", top: "var(--announce-vis, 0px)", left: 0, right: 0, height: 3, zIndex: 101, background: "transparent", display: isPdf ? "none" : "block" }}>
        <div ref={progressBarRef} style={{ height: "100%", background: BRAND.pink, transform: "scaleX(0)", transformOrigin: "left center" }} />
      </div>

      {/* ── NAV (shared with every custom report — only the section links differ) ── */}
      <ReportNav ref={navRef}
        items={L.nav} activeIndex={activeDot} isDark={isDark} isMobile={isMobile} hidden={isPdf} theme={t}
        pdf={L.pdf}
        mobileOpen={mobileMenuOpen} onToggleMobile={() => setMobileMenuOpen(o => !o)} onToggleDark={() => setIsDark((d: boolean) => !d)}
        onNavigate={(href, label, mobile) => jumpTo(href, label, mobile)}
        onDownload={(mobile) => { trackFT("nav_click", { section: "pdf_download", mobile }); if (mobile) setMobileMenuOpen(false); }}
      />

      {/* ── HERO ────────────────────────────────────────────────────────── */}
      <section id="stx-hero" style={{ minHeight: isPdf ? "auto" : "100vh", height: isPdf ? "auto" : (isMobile ? "100svh" : "100vh"), position: "relative", display: "flex", alignItems: "center", overflow: "hidden", background: COVER_BG, backgroundImage: COVER_STRIPES, margin: 0, padding: isPdf ? "60px 0" : 0, width: "100%" }}>
        <ParticleCanvas dark={isDark} />
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 25% 50%,transparent 0%,rgba(16,32,26,0.45) 100%)" }} />
        <div style={{ position: "absolute", top: 0, left: "38%", width: 2, height: "140%", background: "linear-gradient(to bottom, transparent 10%, rgba(237,26,94,0.15) 50%, transparent 90%)", transform: "rotate(15deg)", transformOrigin: "top center", pointerEvents: "none" }} />
        <div style={{ position: "absolute", top: 0, left: "42%", width: 1, height: "140%", background: "linear-gradient(to bottom, transparent 15%, rgba(237,26,94,0.08) 50%, transparent 85%)", transform: "rotate(12deg)", transformOrigin: "top center", pointerEvents: "none" }} />
        <div style={{ position: "absolute", inset: 0, opacity: isDark ? 0.06 : 0.08, backgroundImage: "radial-gradient(circle, currentColor 1px, transparent 1px)", backgroundSize: "32px 32px", color: "#fff", pointerEvents: "none" }} />
        <div style={{ position: "absolute", top: "20%", right: "10%", width: "50%", height: "60%", background: "radial-gradient(ellipse, rgba(237,26,94,0.08) 0%, transparent 70%)", pointerEvents: "none" }} />

        {/* Pitch markings — the football signature, drawn in pitch green */}
        <svg aria-hidden viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice"
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
          <g fill="none" stroke={COVER_LINES} strokeWidth="2">
            <line x1="600" y1="-40" x2="600" y2="840" />
            <circle cx="600" cy="400" r="150" />
            <rect x="-180" y="230" width="330" height="340" />
            <rect x="-180" y="320" width="150" height="160" />
            <rect x="1050" y="230" width="330" height="340" />
            <rect x="1230" y="320" width="150" height="160" />
          </g>
          <circle cx="600" cy="400" r="6" fill={COVER_LINES} />
        </svg>

        <div ref={heroContentRef} style={{
          position: "relative", zIndex: 2, width: "100%", maxWidth: 1360, margin: "0 auto",
          padding: isMobile ? "0px 20px" : "120px 48px 80px",
          display: "flex", alignItems: isMobile ? "center" : "flex-start", justifyContent: isMobile ? "center" : undefined, gap: isMobile ? 0 : 64,
          flexDirection: isMobile ? "column" : "row", willChange: "transform",
        }}>
          <div style={{ flex: isMobile ? "none" : "1 1 auto", maxWidth: isMobile ? "100%" : "50%" }}>
            <h1 style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: isMobile ? "clamp(56px,15vw,88px)" : "clamp(64px,7vw,118px)", lineHeight: 0.92, letterSpacing: -1, margin: 0 }}>
              {titleLines.map((line, i) => i === 0 ? (
                <span key={i} style={{ display: "block", background: `linear-gradient(135deg,${BRAND.pink},#ff6b9d)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                  {line}
                </span>
              ) : i === titleLines.length - 1 ? (
                <span key={i} style={{ display: "block", background: "linear-gradient(135deg,#fff 0%,rgba(255,255,255,0.7) 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                  {lastLine(line).head}{" "}
                  <span style={{ background: `linear-gradient(135deg,${BRAND.pink},#ff6b9d)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{lastLine(line).tail}</span>
                </span>
              ) : (
                <span key={i} style={{ display: "block", background: "linear-gradient(135deg,#fff 0%,rgba(255,255,255,0.7) 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                  {line}
                </span>
              ))}
            </h1>
            <div style={{ display: "flex", gap: 6, marginTop: 24 }}>
              <div style={{ width: 48, height: 3, background: `linear-gradient(to right,${BRAND.pink},#ff6b9d)`, borderRadius: 2 }} />
              <div style={{ width: 24, height: 3, background: PITCH_LIGHT, borderRadius: 2 }} />
            </div>
            <p style={{ fontSize: isMobile ? 12 : 13, fontWeight: 500, lineHeight: 1.7, color: "rgba(255,255,255,0.85)", marginTop: 16, maxWidth: 560 }}>
              {FTABR26_HERO.standfirst}
            </p>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 28, marginTop: 28, flexWrap: "wrap" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: "rgba(190,208,227,0.45)", letterSpacing: 2, textTransform: "uppercase" }}>{L.publishedBy}</span>
                <div style={{ height: 33, display: "flex", alignItems: "center" }}><img src="/stx_white_horizontal.png" alt="SportsTechX" style={{ height: 33, opacity: 0.9 }} /></div>
              </div>
              <div style={{ width: 1, alignSelf: "stretch", background: "rgba(190,208,227,0.2)" }} />
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: "rgba(190,208,227,0.45)", letterSpacing: 2, textTransform: "uppercase" }}>{L.poweredBy}</span>
                {/* The solid Atlas wordmark reads bigger than the SportsTechX logo at the same
                    height, so it sits ~25% smaller, centred on the same line. */}
                <div style={{ height: 33, display: "flex", alignItems: "center" }}><img src="/landing/atlas-wordmark-white.svg" alt="Atlas" style={{ height: 25, opacity: 0.9 }} /></div>
              </div>
              {!isMobile && <div style={{ width: 1, alignSelf: "stretch", background: "rgba(190,208,227,0.2)" }} />}
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: "rgba(190,208,227,0.45)", letterSpacing: 2, textTransform: "uppercase" }}>{FTABR26_HERO.edition}</span>
                <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 26, color: "#fff", letterSpacing: 1, lineHeight: 1.2 }}>{FTABR26_HERO.hashtag}</span>
              </div>
            </div>
          </div>

          {!isMobile && <div style={{ flex: "0 1 580px", display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 12, minWidth: 0 }}>
            {SUMMARY.map((card, i) => (
              <div key={i} style={{
                padding: "26px 24px 22px", borderRadius: 12,
                background: isDark ? t.bgCard : "#fff",
                border: isDark ? `1px solid ${t.border}` : "none",
                borderTop: `3px solid ${BRAND.pink}`,
                position: "relative", overflow: "hidden",
                boxShadow: isDark ? "0 4px 24px rgba(0,0,0,0.4)" : "0 4px 24px rgba(0,0,0,0.2)",
              }}>
                <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: "clamp(36px,3.5vw,50px)", color: BRAND.pink, lineHeight: 1 }}>{card.num}</div>
                <div style={{ marginTop: 10, fontSize: 13, fontWeight: 600, color: isDark ? t.titleColor : BRAND.black, lineHeight: 1.4 }}>{card.label}</div>
                {card.subtitle && <div style={{ marginTop: 6, fontSize: 11, color: isDark ? t.textMuted : BRAND.slate, lineHeight: 1.5 }}>{card.subtitle}</div>}
              </div>
            ))}
          </div>}
        </div>
      </section>

      {/* ── Mobile Summary Cards (separate section, horizontal rows) ────── */}
      {isMobile && (
        <section style={{ minHeight: "100svh", display: "flex", alignItems: "center", justifyContent: "center", background: COVER_BG, backgroundImage: COVER_STRIPES, padding: "40px 16px", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", inset: 0, opacity: isDark ? 0.04 : 0.06, backgroundImage: "radial-gradient(circle, currentColor 1px, transparent 1px)", backgroundSize: "32px 32px", color: "#fff", pointerEvents: "none" }} />
          <div style={{ position: "relative", zIndex: 1, width: "100%", minHeight: "calc(100svh - 140px)", display: "flex", flexDirection: "column", gap: 10 }}>
            {SUMMARY.map((card, i) => (
              <div key={i} style={{
                padding: "20px 18px", borderRadius: 10,
                background: isDark ? t.bgCard : "#fff",
                border: isDark ? `1px solid ${t.border}` : "none",
                borderLeft: `3px solid ${BRAND.pink}`,
                position: "relative", overflow: "hidden",
                boxShadow: isDark ? "0 4px 24px rgba(0,0,0,0.4)" : "0 4px 24px rgba(0,0,0,0.2)",
                display: "flex", alignItems: "center", gap: 14,
                flex: 1, minHeight: 0,
              }}>
                <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 24, color: BRAND.pink, lineHeight: 1, flexShrink: 0, minWidth: 62 }}>{card.num}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: isDark ? t.titleColor : BRAND.black, lineHeight: 1.4 }}>{card.label}</div>
                  {card.subtitle && <div style={{ fontSize: 10, color: isDark ? t.textMuted : BRAND.slate, lineHeight: 1.4, marginTop: 2 }}>{card.subtitle}</div>}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <div ref={skewWrapRef} style={{ willChange: "transform", transformOrigin: "center top", position: "relative", zIndex: 1 }}>

      {/* ── ABOUT THIS REPORT + REPORT PARTNERS ─────────────────────────────
         Paragraphs come from the admin "About paragraphs" field (Hero & about),
         split on blank lines; the last one renders bold. Partner logos share one
         height and a monochrome treatment so neither partner reads as bigger. */}
      {(() => {
        const paras = String(FTABR26_ABOUT ?? "").split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
        if (paras.length === 0) return null;
        /* Dark mode: every logo in white. Light mode: every logo in black. */
        const logoFilter = (kind: "light" | "dark") =>
          isDark ? (kind === "dark" ? "brightness(0) invert(1)" : "none") : "brightness(0)";
        /* `scale` evens out visual weight inside identical boxes; `kind` is light or dark artwork */
        const partners: { name: string; href: string; src: string; kind: "light" | "dark"; scale: number; aria: string }[] = L.partnerLogos;
        return (<>
          <div id="about" style={{ background: t.bgSec, padding: isMobile ? "48px 0" : "88px 0" }}>
            <div style={{ maxWidth: 1280, margin: "0 auto", padding: isMobile ? "0 16px" : "0 40px" }}>
              <div className="stx-reveal" style={{ maxWidth: 860 }}>
                {sectionLabel(L.aboutLabel)}
                {paras.map((p, i) => (
                  <p key={i} style={{ fontSize: 15, color: t.text, lineHeight: 1.9, margin: i === 0 ? "24px 0 0" : "16px 0 0", fontWeight: i === paras.length - 1 && paras.length > 1 ? 700 : 400 }}>{p}</p>
                ))}
              </div>
              <div className="stx-reveal" style={{ display: "flex", alignItems: "center", gap: isMobile ? 18 : 28, flexWrap: "wrap", marginTop: 40, paddingTop: 24, borderTop: `1px solid ${t.border}` }}>
                <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: 2, color: t.textMuted, textTransform: "uppercase" }}>{L.reportPartners}</span>
                {partners.map((pt, i) => (
                  <React.Fragment key={pt.name}>
                    {i > 0 && <span aria-hidden style={{ color: t.textMuted }}>·</span>}
                    <a href={pt.href} aria-label={pt.aria}
                      onClick={e => { e.preventDefault(); jumpTo(pt.href, pt.name, false); }}
                      style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: isMobile ? 120 : 140, height: isMobile ? 28 : 32 }}>
                      {/* Identical bounding boxes; each logo is contained, so the wide
                          Playermaker wordmark fills the width and Soccerment the height. */}
                      <img src={pt.src} alt={pt.name} style={{ maxWidth: `${pt.scale * 100}%`, maxHeight: `${pt.scale * 100}%`, width: "auto", height: "auto", objectFit: "contain", filter: logoFilter(pt.kind) }} />
                    </a>
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>
          {pitchDivider}
        </>);
      })()}

      {partOrder.map((id, i) => <React.Fragment key={id}>{i > 0 && pitchDivider}{PARTS[id]!()}</React.Fragment>)}

      {/* ── FOOTER (the exact Atlas landing footer) ─────────────────────── */}
      <div className={`lp ${lpDisplay.variable} ${lpMono.variable} ${lpSerif.variable}`}><LandingFooter /></div>

      </div>
      <style>{`
        html, body { overflow-x: hidden; }
        @keyframes fadeIn { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:none} }
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(237,26,94,0.3); border-radius: 3px; }
        .stx-trend-card { transition: border-color 0.3s, transform 0.3s; }
        .ft26-tabstrip::-webkit-scrollbar { display: none; }
      `}</style>

    </div>
  );
}
