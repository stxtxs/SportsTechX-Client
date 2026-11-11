/**
 * Auto-written captions for the GSTVCR26 "Data In Full" charts.
 *
 * Every sentence is built from the live numbers the chart shows, so captions
 * stay true for both periods ("last5" = 2021–2025, "2026" = Jan–Oct 2026),
 * every region filter, the PDF view, and any later change to the data.
 * 2026 is a partial year, so wherever it appears it is labelled Jan–Oct and
 * compared with the same months of 2025.
 */

export type Period = "last5" | "2026";
export type RegionCode = "NA" | "EU" | "APAC" | "ROW";

export interface YearTotal { year: number; total_m: number; deals: number }
export interface Total { total_m: number; deals: number }
export interface Named { total_m: number; deals: number }

export interface CaptionContext {
  fundingTimeline: YearTotal[];
  regionTimeline: (YearTotal & { region: RegionCode })[];
  sectorTimeline: (YearTotal & { sector: string })[];
  maTimeline: YearTotal[];
  fundingJanOct2025: Total;
  maJanOct2025: Total;
}

export interface CaptionInput {
  fundingPeriod: Period;
  maPeriod: Period;
  fundingRegion: RegionCode | null;
  acquireeRegion: RegionCode | null;
  acquirerRegion: RegionCode | null;
  fundingByYear: YearTotal[];
  regionSplit: (Named & { region: RegionCode })[];
  topCountries: (Named & { country: string })[];
  sectorFunding: (Named & { sector: string })[];
  periodGlobalFunding_m: number;
  context: CaptionContext;
}

export interface DataInFullCaptions {
  fundingByYear: string;
  regionalShare: string;
  topCountries: string;
  sectorSplit: string;
  topFunded: string;
  maByYear: string;
  notableAcquisitions: string;
}

const PARTIAL_YEAR = 2026;
const LAST_FULL_YEAR = 2025;
const FIRST_YEAR = 2021;

export const REGION_NAMES: Record<RegionCode, string> = {
  NA: "North America", EU: "Europe", APAC: "Asia Pacific", ROW: "Rest of World",
};
const SECTOR_NAMES: Record<string, string> = {
  "Fans & Content": "For Fans",
  "Activity & Performance": "For Athletes",
  "Management & Organisation": "For Executives",
};

/** Same money format as the charts ($13.0B · $412M · $3.4M). */
export function money(m: number): string {
  if (m >= 1000) return `$${(m / 1000).toFixed(1)}B`;
  if (m >= 100) return `$${m.toFixed(0)}M`;
  return `$${m.toFixed(1)}M`;
}
const pct = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : 0);
const plural = (n: number, word: string) => `${n.toLocaleString("en-US")} ${word}${n === 1 ? "" : "s"}`;
const sectorName = (s: string) => SECTOR_NAMES[s] ?? s;
const sum = (rows: Named[]) => rows.reduce((a, r) => ({ total_m: a.total_m + r.total_m, deals: a.deals + r.deals }), { total_m: 0, deals: 0 });
const byValue = <T extends Named>(rows: T[]) => [...rows].sort((a, b) => b.total_m - a.total_m);
const yearOf = (rows: YearTotal[], y: number) => rows.find((r) => Number(r.year) === y);

/** "up 23%" / "down 40%" / "level" vs a previous value. */
function change(now: number, before: number): string {
  if (before <= 0) return now > 0 ? "up from nothing" : "level";
  const d = Math.round(((now - before) / before) * 100);
  if (d === 0) return "level";
  return d > 0 ? `up ${d}%` : `down ${Math.abs(d)}%`;
}

function periodLabel(p: Period): string {
  return p === "2026" ? "January–October 2026" : `${FIRST_YEAR}–${LAST_FULL_YEAR}`;
}
function fundingScope(region: RegionCode | null): string {
  return region ? ` in ${REGION_NAMES[region]}` : "";
}
function maScope(acquiree: RegionCode | null, acquirer: RegionCode | null): string {
  const parts = [
    acquiree && `acquirees in ${REGION_NAMES[acquiree]}`,
    acquirer && `acquirers in ${REGION_NAMES[acquirer]}`,
  ].filter(Boolean);
  return parts.length ? ` (${parts.join(", ")})` : "";
}

/** Sentence explaining 2026 is Jan–Oct, compared like-for-like with Jan–Oct 2025. */
function partialYearNote(y2026: Total | undefined, janOct2025: Total, unit: "funding" | "ma", leadIn: string): string {
  if (!y2026 || (y2026.deals === 0 && y2026.total_m === 0)) return `${leadIn} no ${unit === "ma" ? "acquisitions" : "rounds"} recorded yet.`;
  const what = unit === "ma"
    ? `${plural(y2026.deals, "deal")} worth ${money(y2026.total_m)} (disclosed value)`
    : `${money(y2026.total_m)} across ${plural(y2026.deals, "round")}`;
  const vs = unit === "ma"
    ? `${plural(janOct2025.deals, "deal")} worth ${money(janOct2025.total_m)}`
    : `${money(janOct2025.total_m)} across ${plural(janOct2025.deals, "round")}`;
  return `${leadIn} ${what}, ${change(y2026.total_m, janOct2025.total_m)} on the same months of 2025 (${vs}).`;
}

// ── Funding ─────────────────────────────────────────────────────────────────

export function fundingByYearCaption(i: CaptionInput): string {
  const tl = i.context.fundingTimeline;
  const scope = fundingScope(i.fundingRegion);
  const y2026 = yearOf(tl, PARTIAL_YEAR);
  const y2025 = yearOf(tl, LAST_FULL_YEAR);

  if (i.fundingPeriod === "2026") {
    const note = partialYearNote(y2026, i.context.fundingJanOct2025, "funding", `2026 figures cover January–October only${scope}:`);
    return y2025 ? `${note} Full-year 2025 closed at ${money(y2025.total_m)}.` : note;
  }

  const full = tl.filter((r) => r.year >= FIRST_YEAR && r.year <= LAST_FULL_YEAR);
  if (full.length === 0) return `No funding rounds recorded${scope} in ${periodLabel("last5")}.`;
  const peak = byValue(full)[0];
  const y2024 = yearOf(tl, LAST_FULL_YEAR - 1);
  const parts = [`Funding${scope} peaked at ${money(peak.total_m)} in ${peak.year} across ${plural(peak.deals, "round")}.`];
  if (y2025 && y2024 && peak.year !== LAST_FULL_YEAR) {
    parts.push(`2025 closed at ${money(y2025.total_m)}, ${change(y2025.total_m, y2024.total_m)} on 2024.`);
  }
  parts.push(partialYearNote(y2026, i.context.fundingJanOct2025, "funding", "So far in 2026 (Jan–Oct):"));
  return parts.join(" ");
}

export function regionalShareCaption(i: CaptionInput): string {
  const period = periodLabel(i.fundingPeriod);
  if (i.fundingRegion) {
    const r = i.regionSplit.find((x) => x.region === i.fundingRegion);
    if (!r) return `No funding recorded in ${REGION_NAMES[i.fundingRegion]} in ${period}.`;
    return `${REGION_NAMES[r.region]} raised ${money(r.total_m)} across ${plural(r.deals, "round")} in ${period}, ${pct(r.total_m, i.periodGlobalFunding_m)}% of global funding.`;
  }
  const ranked = byValue(i.regionSplit);
  if (ranked.length === 0) return `No regional funding recorded in ${period}.`;
  const [lead, second] = ranked;
  const parts = [`${REGION_NAMES[lead.region]} leads with ${pct(lead.total_m, i.periodGlobalFunding_m)}% of funding in ${period} (${money(lead.total_m)})`
    + (second ? `, ahead of ${REGION_NAMES[second.region]} at ${pct(second.total_m, i.periodGlobalFunding_m)}% (${money(second.total_m)}).` : ".")];

  // Latest year in view: how the top two compared.
  const year = i.fundingPeriod === "2026" ? PARTIAL_YEAR : LAST_FULL_YEAR;
  const inYear = byValue(i.context.regionTimeline.filter((r) => r.year === year));
  if (i.fundingPeriod === "last5" && inYear.length >= 2) {
    const [a, b] = inYear;
    const gap = pct(a.total_m - b.total_m, a.total_m);
    parts.push(gap <= 10
      ? `In 2025 the gap almost closed: ${REGION_NAMES[a.region]} ${money(a.total_m)} vs ${REGION_NAMES[b.region]} ${money(b.total_m)}.`
      : `In 2025, ${REGION_NAMES[a.region]} raised ${money(a.total_m)} vs ${money(b.total_m)} for ${REGION_NAMES[b.region]}.`);
  }
  if (i.fundingPeriod === "2026") parts.push("2026 covers January–October only.");
  return parts.join(" ");
}

export function topCountriesCaption(i: CaptionInput): string {
  const period = periodLabel(i.fundingPeriod);
  const scope = fundingScope(i.fundingRegion);
  const total = sum(i.fundingByYear).total_m;
  const [first, second] = i.topCountries;
  if (!first) return `No country data recorded${scope} in ${period}.`;
  const lead = `${first.country} accounts for ${pct(first.total_m, total)}% of capital raised${scope} in ${period} (${money(first.total_m)} across ${plural(first.deals, "round")})`;
  const next = second ? `; ${second.country} follows with ${pct(second.total_m, total)}% (${money(second.total_m)}).` : ".";
  const partial = i.fundingPeriod === "2026" ? " 2026 covers January–October only." : "";
  return lead + next + partial;
}

export function sectorSplitCaption(i: CaptionInput): string {
  const period = periodLabel(i.fundingPeriod);
  const scope = fundingScope(i.fundingRegion);
  const ranked = byValue(i.sectorFunding);
  if (ranked.length === 0) return `No sector data recorded${scope} in ${period}.`;
  const total = sum(i.sectorFunding).total_m;
  const top = ranked[0];
  const parts = [`'${sectorName(top.sector)}' companies attracted the most capital${scope} in ${period}: ${money(top.total_m)}, ${pct(top.total_m, total)}% of the total.`];

  const byDeals = [...i.sectorFunding].sort((a, b) => b.deals - a.deals)[0];
  if (byDeals && byDeals.sector !== top.sector) {
    parts.push(`'${sectorName(byDeals.sector)}' led on number of rounds (${byDeals.deals.toLocaleString("en-US")}).`);
  }

  // How the leader's share moved: first vs last full year, or 2026 vs 2025.
  const shareIn = (year: number) => {
    const rows = i.context.sectorTimeline.filter((r) => r.year === year);
    const t = sum(rows).total_m;
    const s = rows.find((r) => r.sector === top.sector);
    return t > 0 && s ? pct(s.total_m, t) : null;
  };
  const [fromYear, toYear] = i.fundingPeriod === "2026" ? [LAST_FULL_YEAR, PARTIAL_YEAR] : [FIRST_YEAR, LAST_FULL_YEAR];
  const from = shareIn(fromYear);
  const to = shareIn(toYear);
  if (from !== null && to !== null) {
    const toLabel = toYear === PARTIAL_YEAR ? "2026 (Jan–Oct)" : String(toYear);
    parts.push(`Its share was ${from}% in ${fromYear} and ${to}% in ${toLabel}.`);
  }
  return parts.join(" ");
}

export function topFundedCaption(i: CaptionInput): string {
  return i.fundingPeriod === "2026"
    ? "The most-funded companies of 2026 so far (January–October), by region."
    : "The most-funded companies of the 2021–2025 cycle, by region.";
}

// ── M&A ─────────────────────────────────────────────────────────────────────

export function maByYearCaption(i: CaptionInput): string {
  const tl = i.context.maTimeline;
  const scope = maScope(i.acquireeRegion, i.acquirerRegion);
  const y2026 = yearOf(tl, PARTIAL_YEAR);

  if (i.maPeriod === "2026") {
    return partialYearNote(y2026, i.context.maJanOct2025, "ma", `2026 figures cover January–October only${scope}:`);
  }
  const full = tl.filter((r) => r.year >= FIRST_YEAR && r.year <= LAST_FULL_YEAR);
  if (full.length === 0) return `No acquisitions recorded${scope} in ${periodLabel("last5")}.`;
  const peakValue = byValue(full)[0];
  const peakCount = [...full].sort((a, b) => b.deals - a.deals)[0];
  const parts = [`Disclosed M&A value${scope} peaked in ${peakValue.year} at ${money(peakValue.total_m)} across ${plural(peakValue.deals, "deal")}.`];
  if (peakCount.year !== peakValue.year) parts.push(`Deal count peaked in ${peakCount.year} (${peakCount.deals}).`);
  parts.push(partialYearNote(y2026, i.context.maJanOct2025, "ma", "So far in 2026 (Jan–Oct):"));
  return parts.join(" ");
}

export function notableAcquisitionsCaption(i: CaptionInput): string {
  const scope = maScope(i.acquireeRegion, i.acquirerRegion);
  const when = i.maPeriod === "2026" ? "of 2026 so far (January–October)" : "of the 2021–2025 cycle";
  return `The largest disclosed acquisitions ${when}${scope} where the acquirer or the acquiree is a SportsTech company, ranked by deal value.`;
}

export function dataInFullCaptions(i: CaptionInput): DataInFullCaptions {
  return {
    fundingByYear: fundingByYearCaption(i),
    regionalShare: regionalShareCaption(i),
    topCountries: topCountriesCaption(i),
    sectorSplit: sectorSplitCaption(i),
    topFunded: topFundedCaption(i),
    maByYear: maByYearCaption(i),
    notableAcquisitions: notableAcquisitionsCaption(i),
  };
}

// ── Sub-Sector Snapshot ─────────────────────────────────────────────────────

export interface SnapshotCaptionInput {
  subSector: string;
  period: Period;
  region: RegionCode | null;
  timeline: YearTotal[];
  janOct2025: Total;
  subSubSectors: (Named & { name: string })[];
  businessModels: (Named & { name: string })[];
}

/** Years shown for a period: 2021–2025 for "last5", just 2026 for "2026". */
export function periodYears(p: Period): number[] {
  return p === "2026" ? [PARTIAL_YEAR] : [2021, 2022, 2023, 2024, 2025];
}

export function subSectorCaption(i: SnapshotCaptionInput): string {
  const scope = fundingScope(i.region);
  const years = periodYears(i.period);
  const inView = i.timeline.filter((r) => years.includes(Number(r.year)));
  const total = sum(inView);
  const y2026 = yearOf(i.timeline, PARTIAL_YEAR);

  const mix: string[] = [];
  const subTotal = sum(i.subSubSectors).total_m;
  const topSub = byValue(i.subSubSectors)[0];
  if (topSub && subTotal > 0 && i.subSubSectors.length > 1) mix.push(`${topSub.name} accounts for ${pct(topSub.total_m, subTotal)}% of it`);
  const modelTotal = sum(i.businessModels).total_m;
  const topModel = byValue(i.businessModels)[0];
  if (topModel && modelTotal > 0) mix.push(`${topModel.name} companies for ${pct(topModel.total_m, modelTotal)}%`);
  const mixSentence = mix.length ? ` ${mix.join(", and ")}.` : "";

  if (i.period === "2026") {
    if (!y2026 || y2026.deals === 0) return `No ${i.subSector} rounds recorded${scope} in January–October 2026 yet.`;
    return `2026 figures cover January–October only${scope}: ${i.subSector} raised ${money(y2026.total_m)} across ${plural(y2026.deals, "round")}, ${change(y2026.total_m, i.janOct2025.total_m)} on the same months of 2025 (${money(i.janOct2025.total_m)}).${mixSentence}`;
  }
  if (total.deals === 0) return `No ${i.subSector} rounds recorded${scope} in ${periodLabel("last5")}.`;
  const peak = byValue(inView)[0];
  return `${i.subSector} raised ${money(total.total_m)} across ${plural(total.deals, "round")}${scope} in ${periodLabel("last5")}, peaking in ${peak.year} at ${money(peak.total_m)}.${mixSentence} `
    + partialYearNote(y2026, i.janOct2025, "funding", "So far in 2026 (Jan–Oct):");
}
