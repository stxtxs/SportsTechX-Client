// @ts-nocheck
/* eslint-disable */
/* ─────────────────────────────────────────────────────────────────────────
   FTABR26 — resolves live facts from /api/report/ftabr26/facts against the
   committed constants.

   Every field falls back independently, so a partial or malformed response
   degrades to the last known-good snapshot for that section instead of
   blanking it. Both the report page and the PDF page go through here, which
   is what keeps them rendering the same figures.
   ──────────────────────────────────────────────────────────────────────── */

import type { Ftabr26Facts, Ftabr26Period } from "./ftabr26-types";
import {
  FTABR26_PERIOD, FTABR26_SUMMARY,
  FTABR26_BY_YEAR, FTABR26_BY_REGION,
  FTABR26_SECTOR_BY_YEAR, FTABR26_SECTOR_SHARE, FTABR26_SECTOR_SHARE_RECENT,
  FTABR26_SUB_SECTOR_SHARE,
  FTABR26_TOP_COUNTRIES, FTABR26_TOP_CITIES,
  FTABR26_TOP_COMPANIES_ONLY, FTABR26_TOP_COMPANIES_ALSO,
  type SummaryStat, type YearRow, type RegionRow, type SectorYearRow,
  type SectorShare, type SubSectorShare, type LeaderRow, type CompanyRow,
} from "../data/ftabr26-facts-data";
import { formatFtabr26Percent } from "./ftabr26-format";
import { ftabr26DisplayCompany } from "./ftabr26-company-display";
import { FTABR26_INITIATIVES } from "../data/ftabr26-content-data";

export type Ftabr26Leaderboards = {
  onlyAllTime: LeaderRow[];
  onlyRecent: LeaderRow[];
  alsoAllTime: LeaderRow[];
  alsoRecent: LeaderRow[];
};

export type Ftabr26Resolved = {
  period: { label: string; recentLabel: string; recentMonths: number };
  summary: SummaryStat[];
  byYear: YearRow[];
  byRegion: RegionRow[];
  sectorByYear: SectorYearRow[];
  sectorShare: SectorShare[];
  sectorShareRecent: SectorShare[];
  subSectorShare: SubSectorShare[];
  topCountries: Ftabr26Leaderboards;
  topCities: Ftabr26Leaderboards;
  topCompaniesOnly: CompanyRow[];
  topCompaniesAlso: CompanyRow[];
  /** False when the constants are being served, so the UI can say so. */
  isLive: boolean;
  dataAsOf: string | null;
  excludesDebt: boolean;
};

const list = <T,>(live: T[] | undefined, fallback: T[]): T[] =>
  live && live.length > 0 ? live : fallback;

function board(live: Ftabr26Leaderboards | undefined, fallback: Ftabr26Leaderboards): Ftabr26Leaderboards {
  if (!live) return fallback;
  return {
    onlyAllTime: list(live.onlyAllTime, fallback.onlyAllTime),
    onlyRecent: list(live.onlyRecent, fallback.onlyRecent),
    alsoAllTime: list(live.alsoAllTime, fallback.alsoAllTime),
    alsoRecent: list(live.alsoRecent, fallback.alsoRecent),
  };
}

/* The last three summary cards count editorial content rather than deals, so
   they are derived from the content arrays and can't drift out of sync. The
   StatCard icon is chosen by array index, so all six must keep their order.

   The initiatives count now comes from the ecosystem table when the caller
   has it, so the card and the "Initiatives (N)" tab can't disagree. */
export type Ftabr26CardExtras = {
  /** Accelerator count from the ecosystem table (initiatives come in separately). */
  programCount?: number;
  /** The WC26 recap's headline value, e.g. "$20.0B" (admin → FIFA WC26 Recap). */
  wcHeadlineValue?: string;
};

/* Cards 4–6: the average football-only round (2025 vs 2021, from the deal
   data), the WC26 headline figure, and the innovation programmes count
   (initiatives + accelerators, from the ecosystem table). */
function editorialCards(
  byYear: { year: string; footballOnly: number; roundsOnly: number }[],
  fmt: (m: number) => string,
  initiativeCount?: number,
  extras: Ftabr26CardExtras = {},
): SummaryStat[] {
  const fallback = FTABR26_SUMMARY.slice(3);
  const avgOnly = (year: string) => {
    const r = byYear.find(y => y.year === year);
    return r && r.roundsOnly ? r.footballOnly / r.roundsOnly : null;
  };
  const a25 = avgOnly("2025"), a21 = avgOnly("2021");
  const initiatives = initiativeCount ?? FTABR26_INITIATIVES.length;
  const programs = extras.programCount ?? 0;
  return [
    a25 != null && a21 != null
      ? { num: fmt(a25), label: "Average football-only round in 2025", subtitle: `${a25 <= a21 ? "Down" : "Up"} from ${fmt(a21)} in 2021` }
      : fallback[0],
    { ...fallback[1], num: extras.wcHeadlineValue || fallback[1].num },
    {
      num: String(initiatives + programs),
      label: "Innovation programmes",
      subtitle: `${initiatives} initiatives by clubs, leagues and federations, plus ${programs} accelerators`,
    },
  ];
}

function liveSummaryCards(
  f: Ftabr26Facts,
  period: Ftabr26Period,
  fmt: (m: number) => string,
): SummaryStat[] {
  const s = f.summary;
  const startYear = period.windowStart.slice(0, 4);
  /* "Up from"/"Down from" rather than a hardcoded direction, and the
     runner-up region comes from the data — both claims would otherwise go
     quietly wrong the first time the ranking moves. */
  const direction = s.pctToFansRecent >= s.pctToFansAllTime ? "Up from" : "Down from";
  return [
    {
      num: fmt(s.totalMusd),
      label: "Global football tech dealflow",
      subtitle: `Since ${startYear}, incl. ${fmt(s.latestHalfMusd)} in ${s.latestHalfLabel} alone`,
    },
    {
      num: formatFtabr26Percent(s.pctToFansRecent),
      label: "Of funding to Fan Tech",
      subtitle: `Since ${period.recentStart.slice(0, 4)}, ${direction.toLowerCase()} ${formatFtabr26Percent(s.pctToFansAllTime)} across ${period.label.replace(/\s*–\s*/g, "–")}`,
    },
    {
      num: fmt(s.topRegionMusd),
      label: `Raised in ${s.topRegionName}`,
      subtitle: `${s.secondRegionName} next with ${fmt(s.secondRegionMusd)}`,
    },
  ];
}

export function resolveFtabr26Facts(
  live: Ftabr26Facts | undefined,
  fmt: (m: number) => string,
  /** Live initiative count, when the caller has already resolved the ecosystem. */
  initiativeCount?: number,
  /** Accelerator count and the WC26 headline value for cards 5 and 6. */
  extras: Ftabr26CardExtras = {},
): Ftabr26Resolved {
  const isLive = Boolean(live && live.byYear && live.byYear.length > 0);

  /* The summary cards need both halves of the payload. A response carrying
     figures but no period (or vice versa) still falls back for this section
     rather than throwing — every other section resolves independently. */
  const canBuildSummary = Boolean(live?.summary && live?.period);
  // The cover's published recent fans share is the authoritative displayed
  // figure. Reuse it in the detailed charts and prose in both report formats,
  // without rounding other shares, deal values or the underlying API data.
  const sectorShareRecent = list(live?.sectorShareRecent, FTABR26_SECTOR_SHARE_RECENT)
    .map(row => canBuildSummary && row.sector === "fans"
      ? { ...row, pct: live!.summary.pctToFansRecent }
      : row);

  return {
    period: live?.period
      ? {
          label: live.period.label,
          recentLabel: live.period.recentLabel,
          recentMonths: live.period.recentMonths,
        }
      : FTABR26_PERIOD,
    summary: canBuildSummary && live
      ? [...liveSummaryCards(live, live.period, fmt), ...editorialCards(list(live?.byYear, FTABR26_BY_YEAR), fmt, initiativeCount, extras)]
      : [...FTABR26_SUMMARY.slice(0, 3), ...editorialCards(list(live?.byYear, FTABR26_BY_YEAR), fmt, initiativeCount, extras)],
    byYear: list(live?.byYear, FTABR26_BY_YEAR),
    byRegion: list(live?.byRegion, FTABR26_BY_REGION),
    sectorByYear: list(live?.sectorByYear, FTABR26_SECTOR_BY_YEAR),
    sectorShare: list(live?.sectorShare, FTABR26_SECTOR_SHARE),
    sectorShareRecent,
    subSectorShare: list(live?.subSectorShare, FTABR26_SUB_SECTOR_SHARE),
    topCountries: board(live?.topCountries, FTABR26_TOP_COUNTRIES),
    topCities: board(live?.topCities, FTABR26_TOP_CITIES),
    topCompaniesOnly: list(live?.topCompaniesOnly, FTABR26_TOP_COMPANIES_ONLY).map(ftabr26DisplayCompany),
    topCompaniesAlso: list(live?.topCompaniesAlso, FTABR26_TOP_COMPANIES_ALSO).map(ftabr26DisplayCompany),
    isLive,
    dataAsOf: live?.dataAsOf ?? null,
    excludesDebt: live?.excludesDebt ?? true,
  };
}
