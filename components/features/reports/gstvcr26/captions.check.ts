/**
 * Self-check for the GSTVCR26 "Data In Full" auto-captions. Run it with:
 *   node components/features/reports/gstvcr26/captions.check.ts
 *
 * The captions are prose built from numbers, so a wrong branch doesn't crash —
 * it quietly prints a false sentence into a published report (and its PDF).
 * Fixture numbers are Prod v2 figures ($M) taken on 2026-11-11.
 */
import { dataInFullCaptions, money, subSectorCaption, type CaptionInput } from './captions.ts';

let failures = 0;
const check = (ok: boolean, msg: string) => {
  console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${msg}`);
  if (!ok) failures++;
};

const yr = (year: number, total_m: number, deals: number) => ({ year, total_m, deals });

const base: CaptionInput = {
  fundingPeriod: 'last5', maPeriod: 'last5',
  fundingRegion: null, acquireeRegion: null, acquirerRegion: null,
  fundingByYear: [yr(2021, 12979, 710), yr(2022, 8710, 526), yr(2023, 2435, 265), yr(2024, 2696, 290), yr(2025, 8247, 230)],
  regionSplit: [
    { region: 'NA', total_m: 20340, deals: 1061 }, { region: 'EU', total_m: 8790, deals: 588 },
    { region: 'APAC', total_m: 5000, deals: 330 }, { region: 'ROW', total_m: 90, deals: 35 },
  ],
  topCountries: [{ country: 'United States', total_m: 19320, deals: 986 }, { country: 'United Kingdom', total_m: 3120, deals: 185 }],
  sectorFunding: [
    { sector: 'Fans & Content', total_m: 19230, deals: 677 },
    { sector: 'Activity & Performance', total_m: 11910, deals: 1034 },
    { sector: 'Management & Organisation', total_m: 3930, deals: 308 },
  ],
  periodGlobalFunding_m: 35070,
  context: {
    fundingTimeline: [yr(2021, 12979, 710), yr(2022, 8710, 526), yr(2023, 2435, 265), yr(2024, 2696, 290), yr(2025, 8247, 230), yr(2026, 2983, 204)],
    regionTimeline: [
      { year: 2025, region: 'NA', total_m: 4080, deals: 112 }, { year: 2025, region: 'EU', total_m: 3990, deals: 79 },
      { year: 2026, region: 'NA', total_m: 1790, deals: 90 }, { year: 2026, region: 'EU', total_m: 580, deals: 72 },
    ],
    sectorTimeline: [
      { year: 2021, sector: 'Fans & Content', total_m: 6400, deals: 246 }, { year: 2021, sector: 'Activity & Performance', total_m: 4930, deals: 369 },
      { year: 2021, sector: 'Management & Organisation', total_m: 1650, deals: 95 },
      { year: 2025, sector: 'Fans & Content', total_m: 5190, deals: 53 }, { year: 2025, sector: 'Activity & Performance', total_m: 2450, deals: 121 },
      { year: 2025, sector: 'Management & Organisation', total_m: 610, deals: 56 },
      { year: 2026, sector: 'Fans & Content', total_m: 1320, deals: 53 }, { year: 2026, sector: 'Activity & Performance', total_m: 1440, deals: 113 },
      { year: 2026, sector: 'Management & Organisation', total_m: 220, deals: 38 },
    ],
    maTimeline: [yr(2021, 9855, 73), yr(2022, 4504, 41), yr(2023, 7932, 71), yr(2024, 10111, 102), yr(2025, 4602, 90), yr(2026, 5450, 55)],
    fundingJanOct2025: { total_m: 8069, deals: 195 },
    maJanOct2025: { total_m: 4602, deals: 80 },
  },
};

const last5 = dataInFullCaptions(base);
const y2026 = dataInFullCaptions({ ...base, fundingPeriod: '2026', maPeriod: '2026' });
const europe = dataInFullCaptions({ ...base, fundingRegion: 'EU', acquireeRegion: 'EU' });

console.log('\nLast 5 years, all regions:');
Object.entries(last5).forEach(([k, v]) => console.log(`  ${k}: ${v}`));
console.log('\n2026 (Jan–Oct):');
Object.entries(y2026).forEach(([k, v]) => console.log(`  ${k}: ${v}`));
console.log('');

check(money(12979) === '$13.0B' && money(412) === '$412M' && money(3.4) === '$3.4M', 'money() matches the chart format');
check(last5.fundingByYear.startsWith('Funding peaked at $13.0B in 2021'), 'funding peak is the highest full year, not a hardcoded $13.3B');
check(last5.fundingByYear.includes('2025 closed at $8.2B, up 206% on 2024'), 'last full year compared with the one before');
check(last5.fundingByYear.includes('So far in 2026 (Jan–Oct): $3.0B'), 'last-5 view still explains 2026 is partial');
check(last5.fundingByYear.includes('down 63% on the same months of 2025'), '2026 compared like-for-like with Jan–Oct 2025, not full 2025');
check(y2026.fundingByYear.startsWith('2026 figures cover January–October only'), '2026 view says it is January–October');
check(last5.regionalShare.startsWith('North America leads with 58%'), 'regional lead share computed from live totals');
check(last5.regionalShare.includes('In 2025 the gap almost closed'), 'near-equal 2025 regions read as "gap almost closed"');
check(!y2026.regionalShare.includes('In 2025'), '2026 view does not talk about 2025 regions');
check(last5.topCountries.startsWith('United States accounts for 55%'), 'top country share uses the period total');
check(last5.sectorSplit.includes("'For Athletes' led on number of rounds"), 'deal-count leader called out when it differs');
check(last5.sectorSplit.includes('Its share was 49% in 2021 and 63% in 2025'), 'sector share trend from real years, not "growing" by default');
check(y2026.sectorSplit.includes('2026 (Jan–Oct)'), 'sector trend labels 2026 as partial');
check(last5.maByYear.startsWith('Disclosed M&A value peaked in 2024 at $10.1B'), 'M&A peak from live data, not "2023 at $10.9B"');
check(!last5.maByYear.includes('Deal count peaked in'), 'no separate count peak when value and count peak together');
check(last5.notableAcquisitions.includes('the acquirer or the acquiree is a SportsTech company'), 'notable deals wording matches the sportstech rule');
check(europe.regionalShare.startsWith('Europe raised $8.8B'), 'region filter switches the regional caption to that region');
check(europe.topCountries.includes(' in Europe in 2021–2025'), 'region filter named in the country caption');
check(europe.maByYear.includes('(acquirees in Europe)'), 'M&A filters named in the M&A caption');

const empty = dataInFullCaptions({
  ...base, fundingByYear: [], regionSplit: [], topCountries: [], sectorFunding: [],
  context: { ...base.context, fundingTimeline: [], maTimeline: [], sectorTimeline: [], regionTimeline: [] },
});
check(Object.values(empty).every((s) => s.length > 0 && !s.includes('undefined') && !s.includes('NaN')), 'empty selections give a sentence, never undefined/NaN');

// Sub-Sector Snapshot — For Activity Hardware (Prod v2, $M)
const hw = {
  subSector: 'For Activity Hardware', period: 'last5' as const, region: null,
  timeline: [yr(2021, 1613, 91), yr(2022, 931, 73), yr(2023, 744, 38), yr(2024, 381, 37), yr(2025, 92, 28), yr(2026, 60, 12)],
  janOct2025: { total_m: 80, deals: 24 },
  subSubSectors: [{ name: 'Equipment & Infrastructure', total_m: 3136, deals: 184 }, { name: 'Wearables', total_m: 625, deals: 83 }],
  businessModels: [{ name: 'B2C', total_m: 2633, deals: 208 }, { name: 'B2B', total_m: 918, deals: 37 }, { name: 'B2B2C', total_m: 210, deals: 21 }],
};
const hwLast5 = subSectorCaption(hw);
const hw2026 = subSectorCaption({ ...hw, period: '2026' });
console.log(`\n  snapshot last5: ${hwLast5}\n  snapshot 2026: ${hw2026}\n`);
check(hwLast5.startsWith('For Activity Hardware raised $3.8B across 267 rounds in 2021–2025, peaking in 2021 at $1.6B.'), 'snapshot total and peak from the 2021–2025 bars');
check(hwLast5.includes('Equipment & Infrastructure accounts for 83%') && hwLast5.includes('B2C companies for 70%'), 'snapshot mix from both donuts');
check(hwLast5.includes('So far in 2026 (Jan–Oct): $60.0M'), 'snapshot explains 2026 in the 5-year view');
check(hw2026.startsWith('2026 figures cover January–October only'), 'snapshot 2026 view says January–October');
check(subSectorCaption({ ...hw, timeline: [] }).startsWith('No For Activity Hardware rounds'), 'empty snapshot gives a sentence');

console.log(failures ? `\n${failures} check(s) failed` : '\nall checks passed');
process.exit(failures ? 1 : 0);
