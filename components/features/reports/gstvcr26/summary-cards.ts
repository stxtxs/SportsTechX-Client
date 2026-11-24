/**
 * GSTVCR26 · Summary (hero) cards: one highlight per section of the report,
 * each linking to that section. Nothing here is hand-typed:
 *   Data in Full ← live Prod v2 timelines (equity + M&A value since 2021)
 *   Trends       ← each trend's `highlight` (or headline stat) in ./trend-content
 *   Ecosystem    ← live ecosystem map lists
 *   Unicorns     ← ./unicorns-data
 */
import type { CaptionContext, YearTotal } from "./captions";
import { money } from "./format";
import type { TrendDeepDive } from "./trend-content";
import { UNICORNS } from "./unicorns-data";
import { billions, sumValue } from "./unicorns-stats";

export type SummaryIcon = "funding" | "unicorn" | "investors" | "globe" | "trending" | "ma";

export interface SummaryCard {
  id: string;
  icon: SummaryIcon;
  num: string;
  label: string;
  /** Anchor to jump to; `#trend-expanded-<id>` opens that trend's deep dive. */
  target: string;
}

export interface EcosystemCounts { investors: number; initiatives: number; programs: number }

const LOADING = "…";
const FIRST_YEAR = 2021;
const LAST_MONTH = "Oct 2026";

const sumFrom = (rows: YearTotal[]): number => rows.filter((r) => r.year >= FIRST_YEAR).reduce((s, r) => s + r.total_m, 0);

/** Equity funding + disclosed M&A value, 2021 to the end of the report's date range. */
export function fundingCard(ctx: CaptionContext | undefined): SummaryCard {
  return {
    id: "data",
    icon: "funding",
    num: ctx ? money(sumFrom(ctx.fundingTimeline) + sumFrom(ctx.maTimeline)) : LOADING,
    label: `Invested in SportsTech through equity and M&A from ${FIRST_YEAR} to ${LAST_MONTH}`,
    target: "#dealflow",
  };
}

export function trendCard(trend: TrendDeepDive, icon: SummaryIcon): SummaryCard {
  const h = trend.highlight ?? { num: trend.stat, label: trend.statLabel };
  return { id: trend.id, icon, num: h.num, label: h.label, target: `#trend-expanded-${trend.id}` };
}

export function ecosystemCard(counts: EcosystemCounts | undefined): SummaryCard {
  return {
    id: "ecosystem",
    icon: "investors",
    num: counts ? String(counts.investors + counts.initiatives + counts.programs) : LOADING,
    label: "Investors, initiatives & programs mapped across the global sports ecosystem",
    target: "#ecomap",
  };
}

export function unicornCard(): SummaryCard {
  return {
    id: "unicorns",
    icon: "unicorn",
    num: String(UNICORNS.length),
    label: `SportsTech unicorns with a combined ${billions(sumValue(UNICORNS))} valuation`,
    target: "#unicorns",
  };
}

/** The six cards: the funding headline first, then each section in report order. */
export function buildSummaryCards(ctx: CaptionContext | undefined, trends: TrendDeepDive[], eco: EcosystemCounts | undefined): SummaryCard[] {
  const trendIcons: SummaryIcon[] = ["ma", "trending", "globe"];
  return [
    fundingCard(ctx),
    ...trends.slice(0, 3).map((tr, i) => trendCard(tr, trendIcons[i] ?? "trending")),
    ecosystemCard(eco),
    unicornCard(),
  ];
}
