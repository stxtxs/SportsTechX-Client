'use client';

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { qk } from '@/lib/query-keys';
import {
	TabHead, Section, Tiles, Body, YearChart, SectorDrill, ModelBars, PlaceTables, CompanyTable, TimeToggle, RegionToggle, HubFilters,
	useHubOptions, sel, flag, asParams, isActive, byWindow, fetchWin, fmtB,
	type FilterState, type HubDeepDive, type Region, type Win, type WinOrCustom,
} from './kit';

/** One deep-dive payload per window; SWR dedupes cards sharing a window. */
function useFunding(win: Win, filters: FilterState) {
	return useSWR<HubDeepDive>(qk.analytics.hub.funding({ window: win, ...asParams(filters) }));
}

/** Hub Funding Deep Dive (funding-analytics-tab.tsx): stats, summary chart,
 *  sector drill-down, business models, countries & cities, top companies. */
export function FundingTab() {
	const [filters, setFilters] = useState<FilterState>({});
	const active = isActive(filters);
	const [summaryRange, setSummaryRange] = useState<WinOrCustom>('10y');
	const [sectorRange, setSectorRange] = useState<WinOrCustom>('10y');
	const [bmRange, setBmRange] = useState<WinOrCustom>('10y');
	const [geoRange, setGeoRange] = useState<WinOrCustom>('10y');
	const [companiesRange, setCompaniesRange] = useState<WinOrCustom>('10y');
	const [region, setRegion] = useState<Region>('all');

	// The hub flipped the card toggles to CUSTOM while filters were on, and back.
	// Adjusted during render when `active` flips (no effect, no extra pass).
	const [wasActive, setWasActive] = useState(active);
	if (active !== wasActive) {
		setWasActive(active);
		const v: WinOrCustom = active ? 'custom' : '10y';
		setSummaryRange(v); setSectorRange(v); setBmRange(v); setGeoRange(v);
	}

	const base = useFunding('10y', filters);
	const sector = useFunding(fetchWin(sectorRange), filters);
	const bm = useFunding(fetchWin(bmRange), filters);
	const geo = useFunding(fetchWin(geoRange), filters);
	const companies = useFunding(fetchWin(companiesRange), filters);

	const opts = useHubOptions();
	const groups = [{
		label: 'Filters',
		filters: [
			sel(filters, setFilters, 'sector', 'Sector', opts.sector),
			sel(filters, setFilters, 'subSector', 'Sub-sector', opts.subSector),
			sel(filters, setFilters, 'subSubSector', 'Sub-sub-sector', opts.subSubSector),
			sel(filters, setFilters, 'businessModel', 'Business model', opts.businessModel),
			sel(filters, setFilters, 'country', 'Country', opts.country),
			sel(filters, setFilters, 'roundType', 'Funding round', opts.roundType),
			sel(filters, setFilters, 'dealYear', 'Deal year', opts.year),
			sel(filters, setFilters, 'dealQuarter', 'Deal quarter', opts.quarter),
			flag(filters, setFilters, 'disclosed', 'Disclosed amounts only'),
		],
	}];

	const yearly = useMemo(() => base.data?.yearly ?? [], [base.data]);
	const totalUsd = yearly.reduce((s, r) => s + r.total_usd, 0);
	const totalRounds = yearly.reduce((s, r) => s + r.count, 0);
	const chart = useMemo(() => byWindow(yearly, summaryRange).map((r) => ({ year: r.year, amt: r.total_usd, deals: r.count })), [yearly, summaryRange]);

	return (
		<>
			<TabHead title="Funding Deep Dive" />
			<HubFilters groups={groups} active={active} onClear={() => setFilters({})} />

			<Tiles items={[
				{ k: 'Total Funding', v: base.data ? fmtB(totalUsd) : '—', note: 'Across all tracked deals' },
				{ k: 'Funding Rounds', v: base.data ? totalRounds.toLocaleString() : '—', note: 'Total deal count' },
				{ k: 'Countries', v: base.data ? String(base.data.summary.total_countries) : '—', note: 'With funded companies' },
			]} />

			<Section title="Funding Summary ($B)" note="Bars = total funding ($B) · Line = funding rounds"
				right={<TimeToggle value={summaryRange} onChange={setSummaryRange} showCustom={active} />}>
				<Body loading={base.isLoading} empty={chart.length === 0}><YearChart rows={chart} barLabel="Funding ($B)" lineLabel="Rounds" /></Body>
			</Section>

			<Section title="Funding by Sector" note="Drill down into sector, sub-sector, and sub-sub-sector funding"
				right={<TimeToggle value={sectorRange} onChange={setSectorRange} showCustom={active} />}>
				<Body loading={sector.isLoading} empty={!sector.data?.drill.length}><SectorDrill rows={sector.data?.drill ?? []} /></Body>
			</Section>

			<Section title="Funding by Business Model" right={<TimeToggle value={bmRange} onChange={setBmRange} showCustom={active} />}>
				<Body loading={bm.isLoading} empty={!bm.data?.models.length}><ModelBars rows={bm.data?.models ?? []} /></Body>
			</Section>

			<Section title="Top Funded Countries & Cities" right={<TimeToggle value={geoRange} onChange={setGeoRange} showCustom={active} />}>
				<div className="ana-region"><RegionToggle value={region} onChange={setRegion} /></div>
				<Body loading={geo.isLoading} empty={false}>
					<PlaceTables countries={geo.data?.countries ?? []} cities={geo.data?.cities ?? []} region={region} countLabel="Rounds" />
				</Body>
			</Section>

			<Section title="Top Funded Companies" right={<TimeToggle value={companiesRange} onChange={setCompaniesRange} />}>
				<Body loading={companies.isLoading} empty={false}>
					<CompanyTable rows={companies.data?.top ?? []} countLabel="Rounds" pillarIcons />
				</Body>
			</Section>
		</>
	);
}
