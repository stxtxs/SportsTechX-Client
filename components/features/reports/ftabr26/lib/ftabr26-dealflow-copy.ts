// @ts-nocheck
/* eslint-disable */
import type { Ftabr26Resolved } from "./ftabr26-live";
import { formatFtabr26Money, formatFtabr26Percent, formatFtabr26Share } from "./ftabr26-format";

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);
const money = formatFtabr26Money;
const percent = formatFtabr26Share;
const byName = <T extends { name: string }>(rows: T[], name: string) => rows.find(row => row.name === name);
const byLabel = <T extends { label: string }>(rows: T[], label: string) => rows.find(row => row.label === label);
/* Sector names as the page shows them (donut legends, hero cards) */
const SECTOR_NAME = { fans: "Fan Tech", athletes: "Athlete Tech", execs: "Executive Tech" } as const;
const fundingTotal = (rows: { funding: number }[]) => sum(rows.map(row => row.funding));

export function buildFtabr26DealflowCopy(f: Ftabr26Resolved) {
  const years = f.byYear;
  const year = (label: string) => years.find(row => row.year === label);
  const y21 = year("2021");
  const y25 = year("2025");
  const h1 = years.find(row => row.year.startsWith("H1"));
  const y23 = year("2023");
  const y24 = year("2024");
  const onlyTotal = sum(years.map(row => row.footballOnly));
  const alsoTotal = sum(years.map(row => row.footballAlso));
  const onlyRounds = sum(years.map(row => row.roundsOnly));
  const alsoRounds = sum(years.map(row => row.roundsAlso));
  const periodTotal = onlyTotal + alsoTotal;
  const allRounds = onlyRounds + alsoRounds;

  const regionTotals = f.byRegion
    .map(row => ({ ...row, total: row.footballOnly + row.footballAlso, rounds: row.roundsOnly + row.roundsAlso }))
    .sort((a, b) => b.total - a.total);
  const topRegion = regionTotals[0];
  const runnerUp = regionTotals[1];
  const asia = regionTotals.find(row => row.region === "Asia-Pacific");
  const southAmerica = regionTotals.find(row => row.region === "South America");
  const africa = regionTotals.find(row => row.region === "Africa");

  const fullFans = f.sectorShare.find(row => row.sector === "fans");
  const recentFans = f.sectorShareRecent.find(row => row.sector === "fans");
  const fullManagement = f.sectorShare.find(row => row.sector === "execs");
  const recentManagement = f.sectorShareRecent.find(row => row.sector === "execs");
  const fullAthletes = f.sectorShare.find(row => row.sector === "athletes");
  const recentAthletes = f.sectorShareRecent.find(row => row.sector === "athletes");
  const subSectors = [...f.subSectorShare].sort((a, b) => b.pct - a.pct);
  const topSubSector = subSectors[0];
  const dazn = byName(f.topCompaniesAlso, "DAZN");
  const company = (name: string) =>
    [...f.topCompaniesOnly, ...f.topCompaniesAlso].find(row => row.name === name);
  const contentPlatforms = byLabel(subSectors, "Content Platforms");
  const fanExperiences = byLabel(subSectors, "Fan Experiences");

  const countriesOnly = f.topCountries.onlyAllTime;
  const countriesAlso = f.topCountries.alsoAllTime;
  const countriesRecent = f.topCountries.alsoRecent;
  const citiesOnly = f.topCities.onlyAllTime;
  const citiesAlso = f.topCities.alsoAllTime;
  const citiesOnlyRecent = f.topCities.onlyRecent;
  const citiesAlsoRecent = f.topCities.alsoRecent;
  const citiesRecent = [...f.topCities.onlyRecent, ...f.topCities.alsoRecent]
    .sort((a, b) => b.amount - a.amount);
  const cityChicago = byName(citiesAlso, "Chicago");
  const cityDubai = byName(citiesAlsoRecent, "Dubai");
  const cityLisbon = byName(citiesOnlyRecent, "Lisbon");
  const cityBelfast = byName(citiesOnlyRecent, "Belfast");
  const countryUkRecent = byName(countriesRecent, "UK");
  const countryUsRecent = byName(countriesRecent, "USA");
  const recentOther = countriesRecent.filter(row => row.name !== "UK" && row.name !== "USA").sort((a, b) => b.amount - a.amount)[0];

  const companiesOnly = f.topCompaniesOnly;
  const companiesAlso = f.topCompaniesAlso;
  const onlyTopTen = fundingTotal(companiesOnly);
  const onlyTopTwo = fundingTotal(companiesOnly.slice(0, 2));
  const lowerOnlyNames = companiesOnly.slice(5).map(row => row.name);
  const daznShareTopTen = dazn?.funding ?? 0;
  const alsoTopTen = fundingTotal(companiesAlso);
  const tickpick = byName(companiesAlso, "TickPick");
  const seatGeek = byName(companiesAlso, "SeatGeek");
  const londonNames = companiesAlso.filter(company => company.city === "London").length;
  const nyNames = companiesAlso.filter(company => company.city === "New York City").length;
  const ticketingTotal = (tickpick?.funding ?? 0) + (seatGeek?.funding ?? 0);

  const fmtAmountRounds = (row?: { amount: number; rounds: number }) =>
    row ? `${money(row.amount)} across ${row.rounds} rounds` : "not listed";
  const avg = (amount: number, rounds: number) => rounds ? money(amount / rounds) : "$0.0M";
  const subSectorActivity =
    fanExperiences?.rounds != null && contentPlatforms?.rounds != null &&
    fanExperiences.funding != null && contentPlatforms.funding != null
      ? `Deal counts tell a different story. Fan Experiences is the busiest sub-sector, with ${fanExperiences.rounds} rounds for ${money(fanExperiences.funding)}, while Content Platforms needed only ${contentPlatforms.rounds} rounds to reach ${money(contentPlatforms.funding)}.`
      : `Deal counts tell a different story. Fan Experiences is the busiest sub-sector, while Content Platforms remains the largest funding pool.`;
  const contentLeaderNames = ["DAZN", "OneFootball", "theScore", "Minute Media"]
    .map(name => `${name} (${money(company(name)?.funding ?? 0)})`);
  const contentLeaders = `${contentLeaderNames.slice(0, -1).join(", ")} and ${contentLeaderNames.at(-1)}`;

  return {
    /* Paragraphs are separated by a blank line ("\n\n"); the page renders each as its own <p>. */
    byYear: [
      `Football-only funding has fallen every year since 2021, from ${money(y21?.footballOnly ?? 0)} to ${money(y25?.footballOnly ?? 0)} in 2025, with just ${money(h1?.footballOnly ?? 0)} in the first half of ${h1?.year.replace(/^H1 /, "") ?? "the latest year"}.`,
      `Deal activity held up far better than the money. Football-only startups closed ${y21?.roundsOnly ?? 0} rounds in 2021 and ${y25?.roundsOnly ?? 0} in 2025, but the average round shrank from ${avg(y21?.footballOnly ?? 0, y21?.roundsOnly ?? 0)} to ${avg(y25?.footballOnly ?? 0, y25?.roundsOnly ?? 0)}. Founders are still raising; the cheques got smaller.`,
      `Multisport platforms went the other way. After falling to ${money(y23?.footballAlso ?? 0)} in 2023, Football Also funding rebounded to ${money(y24?.footballAlso ?? 0)} in 2024 and ${money(y25?.footballAlso ?? 0)} in 2025, and 2025 alone brought in nearly a third of the period's money. Multisport startups now account for ${money(alsoTotal)} of the ${money(periodTotal)} total, from fewer rounds than football-only startups (${alsoRounds} against ${onlyRounds}).`,
    ].join("\n\n"),
    /* Above the region chart */
    byRegion:
      `${topRegion?.region ?? "Europe"} accounts for ${money(topRegion?.total ?? 0)} of the ${money(periodTotal)} total and is the only region with real depth on both sides: ${money(topRegion?.footballOnly ?? 0)} Football Only and ${money(topRegion?.footballAlso ?? 0)} Football Also. ` +
      `${runnerUp?.region ?? "North America"}'s ${money(runnerUp?.total ?? 0)} is overwhelmingly multisport, with just ${money(runnerUp?.footballOnly ?? 0)} going to football-only startups.`,
    /* Below the region chart, above the share and rounds bars */
    regionSplit: [
      `In both regions, money and deal activity move together. ${topRegion?.region ?? "Europe"} takes ${percent(topRegion?.total ?? 0, periodTotal)} of the money from ${percent(topRegion?.rounds ?? 0, allRounds)} of the rounds, ${runnerUp?.region ?? "North America"} ${percent(runnerUp?.total ?? 0, periodTotal)} from ${percent(runnerUp?.rounds ?? 0, allRounds)}. Average rounds are similar too: ${avg(topRegion?.total ?? 0, topRegion?.rounds ?? 0)} in ${topRegion?.region ?? "Europe"} and ${avg(runnerUp?.total ?? 0, runnerUp?.rounds ?? 0)} in ${runnerUp?.region ?? "North America"}.`,
      `${asia?.region ?? "Asia-Pacific"} is the opposite: ${percent(asia?.rounds ?? 0, allRounds)} of all rounds but ${percent(asia?.total ?? 0, periodTotal)} of the money, at ${avg(asia?.total ?? 0, asia?.rounds ?? 0)} a round. It is the most active region for its size and the least capitalised. South America (${money(southAmerica?.total ?? 0)} across ${southAmerica?.rounds ?? 0} rounds) and Africa (${money(africa?.total ?? 0)} across ${africa?.rounds ?? 0}) barely register.`,
    ].join("\n\n"),
    /* Below the framework line */
    sector:
      `${SECTOR_NAME.fans} took ${formatFtabr26Percent(fullFans?.pct ?? 0)} of football tech funding across the period, rising to ${formatFtabr26Percent(recentFans?.pct ?? 0)} over the last 18 months. ` +
      `${SECTOR_NAME.execs} drops from ${formatFtabr26Percent(fullManagement?.pct ?? 0)} to ${formatFtabr26Percent(recentManagement?.pct ?? 0)} over the same comparison, slipping behind ${SECTOR_NAME.athletes} (${formatFtabr26Percent(fullAthletes?.pct ?? 0)} to ${formatFtabr26Percent(recentAthletes?.pct ?? 0)}) for the first time.`,
    sectorMix: [
      `Most of that weight sits in one sub-sector. ${topSubSector?.label ?? "Content Platforms"} account for ${formatFtabr26Percent(topSubSector?.pct ?? 0)} of everything raised, almost all of it four companies: ${contentLeaders}. DAZN alone is ${percent(dazn?.funding ?? 0, periodTotal)} of every dollar in this report.`,
      subSectorActivity,
    ].join("\n\n"),
    countries:
      `${countriesOnly[0]?.name ?? "France"} leads football-only funding at ${money(countriesOnly[0]?.amount ?? 0)} from just ${countriesOnly[0]?.rounds ?? 0} rounds, almost entirely Sorare; ${countriesOnly[1]?.name ?? "Germany"}'s ${money(countriesOnly[1]?.amount ?? 0)} is similarly concentrated in OneFootball, and ${countriesOnly[3]?.name ?? "Spain"}'s ${money(countriesOnly[3]?.amount ?? 0)} is nearly all Barça Vision. ` +
      `The ${countriesOnly[2]?.name ?? "USA"} ranks third at ${money(countriesOnly[2]?.amount ?? 0)} but spreads it across ${countriesOnly[2]?.rounds ?? 0} rounds. The ${countriesOnly[4]?.name ?? "UK"} ranks fifth at ${money(countriesOnly[4]?.amount ?? 0)} from ${countriesOnly[4]?.rounds ?? 0} rounds, the most of any country, with an average of ${avg(countriesOnly[4]?.amount ?? 0, countriesOnly[4]?.rounds ?? 0)} a round. ` +
      `On the 'Football Also' side the ${countriesAlso[0]?.name ?? "UK"} dominates with ${money(countriesAlso[0]?.amount ?? 0)}, again on the strength of one company. Recent activity has narrowed further still: over the last 18 months the UK and USA took ${money((countryUkRecent?.amount ?? 0) + (countryUsRecent?.amount ?? 0))} of multisport funding between them, against ${money(recentOther?.amount ?? 0)} for the next-largest market.`,
    cities:
      `At city level almost every hub reduces to a single company. ${citiesOnly[0]?.name ?? "Paris"} is almost entirely Sorare (${money(company("Sorare")?.funding ?? citiesOnly[0]?.amount ?? 0)} of the city's ${money(citiesOnly[0]?.amount ?? 0)}), ${citiesOnly[1]?.name ?? "Berlin"} is OneFootball (${money(company("OneFootball")?.funding ?? citiesOnly[1]?.amount ?? 0)} from ${citiesOnly[1]?.rounds ?? 0} rounds), ${citiesOnly[2]?.name ?? "Costa Mesa"} is TOCA Football (${money(company("TOCA Football")?.funding ?? citiesOnly[2]?.amount ?? 0)}) and ${citiesOnly[3]?.name ?? "Barcelona"} is Barça Vision (${money(company("Barça Vision")?.funding ?? 0)} of the city's ${money(citiesOnly[3]?.amount ?? 0)}). ` +
      `${citiesAlso[0]?.name ?? "London"} is an outlier in scale rather than in kind, taking ${money(citiesAlso[0]?.amount ?? 0)} on the 'Football Also' side across ${citiesAlso[0]?.rounds ?? 0} rounds, while ${cityChicago?.name ?? "Chicago"}'s entire ${money(cityChicago?.amount ?? 0)} is one Stats Perform round. ` +
      `Recent standouts include Dubai, Lisbon and Belfast. None has raised more than ${money(Math.ceil(Math.max(cityDubai?.amount ?? 0, cityLisbon?.amount ?? 0, cityBelfast?.amount ?? 0)))}.`,
    companiesOnly:
      `The top ten football-only companies account for ${percent(onlyTopTen, onlyTotal)} of all football-only funding, and ${companiesOnly[0]?.name ?? "Sorare"} and ${companiesOnly[1]?.name ?? "OneFootball"} take ${percent(onlyTopTwo, onlyTopTen)} of that top ten between them. ${companiesOnly[0]?.name ?? "Sorare"} alone is ${percent(companiesOnly[0]?.funding ?? 0, onlyTotal)} of every dollar raised by a football-only startup since 2021. ` +
      `Below them the field diversifies: ${companiesOnly.slice(2, 5).map(row => `${row.name} (${money(row.funding)})`).join(", ")} across training hardware, club-owned fan technology and tracking data, then ${lowerOnlyNames.slice(0, -1).join(", ")} and ${lowerOnlyNames.at(-1)} across video, wearables, merchandise, fantasy and gaming. Barça Vision, SkillCorner and Draftea are all new to this ranking.`,
    companiesAlso:
      `DAZN's ${money(dazn?.funding ?? 0)} is ${percent(daznShareTopTen, alsoTopTen)} of the multisport top ten and ${percent(daznShareTopTen, alsoTotal)} of all 'Football Also' funding, close to the ${money(onlyTotal)} raised by every football-only startup in this report combined. ` +
      `Behind it sits a tight cluster: ${companiesAlso[1]?.name ?? "Teamworks"} and ${companiesAlso[2]?.name ?? "Cosm"} at ${money(companiesAlso[1]?.funding ?? 0)} each, ${companiesAlso[3]?.name ?? "Genius Sports"} at ${money(companiesAlso[3]?.funding ?? 0)} and ${companiesAlso[4]?.name ?? "StatsPerform"} at ${money(companiesAlso[4]?.funding ?? 0)}, spanning athlete operations, immersive venues and sports data. ` +
      `Ticketing adds a further ${money(ticketingTotal)} through TickPick and SeatGeek, and London and New York between them host ${londonNames + nyNames} of the ten.`,
  };
}
