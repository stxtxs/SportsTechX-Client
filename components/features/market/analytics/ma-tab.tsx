'use client';

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { Seg } from '@/components/atlas';
import { qk } from '@/lib/query-keys';
import {
	TabHead, Section, Tiles, Body, YearChart, SectorDrill, ModelBars, PlaceTables, CompanyTable, TimeToggle, RegionToggle, HubFilters,
	useHubOptions, sel, flag, asParams, isActive, byWindow, fmtB,
	type FilterState, type HubDeepDive, type Region, type Win, type WinOrCustom,
} from './kit';

type Perspective = 'acquiree' | 'acquirer';

/** Hub M&A Deep Dive (ma-analytics-tab.tsx). Every card follows the
 *  ACQUIREE / ACQUIRER switch; only the summary chart and the top-companies
 *  table have a time toggle — the rest cover the hub's 10-year window. */
export function MaTab() {
	const [filters, setFilters] = useState<FilterState>({});
	const [perspective, setPerspective] = useState<Perspective>('acquiree');
	const [summaryRange, setSummaryRange] = useState<WinOrCustom>('10y');
	const [companiesRange, setCompaniesRange] = useState<Win>('10y');
	const [region, setRegion] = useState<Region>('all');
	const active = isActive(filters);

	const key = (win: Win) => qk.analytics.hub.ma({ window: win, perspective, ...asParams(filters) });
	const base = useSWR<HubDeepDive>(key('10y'));
	const companies = useSWR<HubDeepDive>(key(companiesRange));

	const opts = useHubOptions();
	const groups = [
		{ label: 'Acquiree', filters: [
			sel(filters, setFilters, 'acquireeSector', 'Acquiree sector', [...opts.sector, ...opts.subSector, ...opts.subSubSector]),
			sel(filters, setFilters, 'acquireeBusinessModel', 'Acquiree business model', opts.businessModel),
			sel(filters, setFilters, 'acquireeCountry', 'Acquiree country', opts.country),
		] },
		{ label: 'Acquirer', filters: [
			sel(filters, setFilters, 'acquirerSector', 'Acquirer sector', [...opts.sector, ...opts.subSector, ...opts.subSubSector]),
			sel(filters, setFilters, 'acquirerBusinessModel', 'Acquirer business model', opts.businessModel),
			sel(filters, setFilters, 'acquirerCountry', 'Acquirer country', opts.country),
		] },
		{ label: 'Deal', filters: [
			sel(filters, setFilters, 'acquisitionYear', 'Acquisition year', opts.year),
			sel(filters, setFilters, 'acquisitionType', 'Acquisition type', [['acquisition', 'Acquisition'], ['merger', 'Merger'], ['asset_purchase', 'Asset purchase']]),
			flag(filters, setFilters, 'disclosed', 'Disclosed values only'),
		] },
	];

	const yearly = base.data?.yearly ?? [];
	const totalUsd = yearly.reduce((s, r) => s + r.total_usd, 0);
	const totalDeals = yearly.reduce((s, r) => s + r.count, 0);
	const chart = useMemo(() => byWindow(yearly, summaryRange).map((r) => ({ year: r.year, amt: r.total_usd, deals: r.count })), [yearly, summaryRange]);
	const side = perspective === 'acquiree' ? 'Acquiree' : 'Acquirer';
	const verb = perspective === 'acquiree' ? 'Acquired' : 'Acquiring';

	return (
		<>
			<TabHead title="M&A Deep Dive — 10 Years">
				<Seg<Perspective> ariaLabel="Perspective" value={perspective} onChange={setPerspective}
					options={[{ key: 'acquiree', label: 'Acquiree' }, { key: 'acquirer', label: 'Acquirer' }]} />
			</TabHead>
			<HubFilters groups={groups} active={active} onClear={() => setFilters({})} />

			<Tiles items={[
				{ k: 'Total Acquisitions', v: base.data ? fmtB(totalUsd) : '—', note: 'Across all tracked deals' },
				{ k: 'M&A Deals', v: base.data ? totalDeals.toLocaleString() : '—', note: 'Total deal count' },
				{ k: 'Countries', v: base.data ? String(base.data.summary.total_countries) : '—', note: `With ${verb.toLowerCase()} companies` },
			]} />

			<Section title="Acquisition Summary ($B)" note="Bars = total acquisition value ($B) · Line = deal count"
				right={<TimeToggle value={summaryRange} onChange={setSummaryRange} />}>
				<Body loading={base.isLoading} empty={chart.length === 0}><YearChart rows={chart} barLabel="Acquisitions ($B)" lineLabel="Deals" /></Body>
			</Section>

			<Section title={`${side} by Sector`} note="Drill down into sector, sub-sector, and sub-sub-sector">
				<Body loading={base.isLoading} empty={!base.data?.drill.length}><SectorDrill rows={base.data?.drill ?? []} /></Body>
			</Section>

			<Section title={`${side} by Business Model`}>
				<Body loading={base.isLoading} empty={!base.data?.models.length}><ModelBars rows={base.data?.models ?? []} /></Body>
			</Section>

			<Section title={`Top ${verb} Countries & Cities`}>
				<div className="ana-region"><RegionToggle value={region} onChange={setRegion} /></div>
				<Body loading={base.isLoading} empty={false}>
					<PlaceTables countries={base.data?.countries ?? []} cities={base.data?.cities ?? []} region={region} countLabel="Deals" />
				</Body>
			</Section>

			<Section title={`Top ${verb} Companies`} right={<TimeToggle value={companiesRange} onChange={(v) => setCompaniesRange(v === 'custom' ? '10y' : v)} />}>
				<Body loading={companies.isLoading} empty={false}>
					<CompanyTable rows={companies.data?.top ?? []} countLabel="Deals" />
				</Body>
			</Section>
		</>
	);
}
